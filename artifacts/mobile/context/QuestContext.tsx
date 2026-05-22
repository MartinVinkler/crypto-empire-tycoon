import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useGame } from "@/context/GameContext";

// ── Quest types ──────────────────────────────────────────────────────────────

export type QuestType =
  | "taps"
  | "earn_usd"
  | "mine_btc"
  | "buy_stocks"
  | "sell_stocks"
  | "earn_trade_usd"
  | "buy_upgrades"
  | "buy_properties";

interface QuestTemplate {
  id: string;
  type: QuestType;
  label: string;
  target: number;
  reward: number;
}

// 3 categories — one quest drawn from each per session for guaranteed variety.
// Pools include easy → brutal tiers; harder quests pay proportionally more.

const MINING_POOL: QuestTemplate[] = [
  { id: "tap10",    type: "taps",     label: "Tap 10 times",       target: 10,    reward: 50 },
  { id: "tap50",    type: "taps",     label: "Tap 50 times",       target: 50,    reward: 200 },
  { id: "tap200",   type: "taps",     label: "Tap 200 times",      target: 200,   reward: 600 },
  { id: "tap500",   type: "taps",     label: "Tap 500 times",      target: 500,   reward: 1_200 },
  { id: "tap1000",  type: "taps",     label: "Tap 1 000 times",    target: 1_000, reward: 2_500 },
  { id: "tap2500",  type: "taps",     label: "Tap 2 500 times",    target: 2_500, reward: 5_000 },
  { id: "earn10",   type: "earn_usd", label: "Earn $10 mining",    target: 10,    reward: 200 },
  { id: "earn100",  type: "earn_usd", label: "Earn $100 mining",   target: 100,   reward: 800 },
  { id: "earn500",  type: "earn_usd", label: "Earn $500 mining",   target: 500,   reward: 2_500 },
  { id: "earn2k",   type: "earn_usd", label: "Earn $2 000 mining", target: 2_000, reward: 6_000 },
  { id: "btc0001",  type: "mine_btc", label: "Mine 0.001 BTC",     target: 0.001, reward: 100 },
  { id: "btc001",   type: "mine_btc", label: "Mine 0.01 BTC",      target: 0.01,  reward: 500 },
  { id: "btc01",    type: "mine_btc", label: "Mine 0.1 BTC",       target: 0.1,   reward: 2_000 },
  { id: "btc05",    type: "mine_btc", label: "Mine 0.5 BTC",       target: 0.5,   reward: 6_000 },
  { id: "btc2",     type: "mine_btc", label: "Mine 2 BTC",         target: 2,     reward: 12_000 },
];

const TRADING_POOL: QuestTemplate[] = [
  { id: "stk1",    type: "buy_stocks",     label: "Buy stocks 1×",        target: 1,     reward: 80 },
  { id: "stk5",    type: "buy_stocks",     label: "Buy stocks 5×",        target: 5,     reward: 350 },
  { id: "stk10",   type: "buy_stocks",     label: "Buy stocks 10×",       target: 10,    reward: 700 },
  { id: "stk25",   type: "buy_stocks",     label: "Buy stocks 25×",       target: 25,    reward: 1_800 },
  { id: "stk50",   type: "buy_stocks",     label: "Buy stocks 50×",       target: 50,    reward: 4_000 },
  { id: "sell1",   type: "sell_stocks",    label: "Sell stocks 1×",       target: 1,     reward: 80 },
  { id: "sell5",   type: "sell_stocks",    label: "Sell stocks 5×",       target: 5,     reward: 350 },
  { id: "sell15",  type: "sell_stocks",    label: "Sell stocks 15×",      target: 15,    reward: 1_000 },
  { id: "sell30",  type: "sell_stocks",    label: "Sell stocks 30×",      target: 30,    reward: 2_500 },
  { id: "trd100",  type: "earn_trade_usd", label: "Earn $100 trading",    target: 100,   reward: 500 },
  { id: "trd500",  type: "earn_trade_usd", label: "Earn $500 trading",    target: 500,   reward: 2_000 },
  { id: "trd2k",   type: "earn_trade_usd", label: "Earn $2 000 trading",  target: 2_000, reward: 6_000 },
  { id: "trd10k",  type: "earn_trade_usd", label: "Earn $10 000 trading", target: 10_000,reward: 15_000 },
];

const INFRA_POOL: QuestTemplate[] = [
  { id: "upg1",    type: "buy_upgrades",   label: "Buy 1 upgrade",         target: 1,  reward: 80 },
  { id: "upg3",    type: "buy_upgrades",   label: "Buy 3 upgrades",        target: 3,  reward: 300 },
  { id: "upg10",   type: "buy_upgrades",   label: "Buy 10 upgrades",       target: 10, reward: 900 },
  { id: "upg25",   type: "buy_upgrades",   label: "Buy 25 upgrades",       target: 25, reward: 3_000 },
  { id: "prop1",   type: "buy_properties", label: "Buy 1 property",        target: 1,  reward: 300 },
  { id: "prop3",   type: "buy_properties", label: "Buy 3 properties",      target: 3,  reward: 1_000 },
  { id: "prop5",   type: "buy_properties", label: "Buy 5 properties",      target: 5,  reward: 2_500 },
  { id: "prop10",  type: "buy_properties", label: "Buy 10 properties",     target: 10, reward: 6_000 },
];

// ── Wealth multiplier ─────────────────────────────────────────────────────────
// Scales quest rewards so they stay relevant at any wealth level.
// $0–1K: base  |  $1K–10K: 2×  |  $10K–100K: 4×
// $100K–1M: 10×  |  $1M–10M: 30×  |  $10M+: 100×
export function wealthMultiplier(cashUSD: number): number {
  if (cashUSD >= 10_000_000) return 100;
  if (cashUSD >= 1_000_000)  return 30;
  if (cashUSD >= 100_000)    return 10;
  if (cashUSD >= 10_000)     return 4;
  if (cashUSD >= 1_000)      return 2;
  return 1;
}

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// New random seed on every session — quests are always different after refresh.
// Rewards are scaled by the player's current wealth so they stay meaningful.
function generateQuests(cashUSD: number): QuestTemplate[] {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const rng = seededRng(seed);
  const mult = wealthMultiplier(cashUSD);
  const categories = [MINING_POOL, TRADING_POOL, INFRA_POOL];
  return categories.map((cat) => {
    const idx = Math.floor(rng() * cat.length);
    const tpl = cat[idx];
    return { ...tpl, reward: Math.round(tpl.reward * mult) };
  });
}

// ── State types ───────────────────────────────────────────────────────────────

export interface QuestState {
  id: string;
  type: QuestType;
  label: string;
  target: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

interface QuestSave {
  dateStr: string;
  quests: QuestState[];
}

interface QuestContextValue {
  quests: QuestState[];
  recordTap: (btcEarned: number, usdEarned: number) => void;
  recordUpgrade: () => void;
  recordStockBuy: (usdAmount: number) => void;
  recordStockSell: (profitUsd: number) => void;
  recordPropertyBuy: () => void;
  claimReward: (questId: string) => void;
  timeUntilResetMs: number;
}

const QuestContext = createContext<QuestContextValue | null>(null);

const STORAGE_KEY = "@crypto_empire_daily_quests_v2";

// ── Provider ──────────────────────────────────────────────────────────────────

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const [quests, setQuests] = useState<QuestState[]>([]);
  const [timeUntilResetMs, setTimeUntilResetMs] = useState(0);
  const dateRef = useRef(todayUTC());
  const questsRef = useRef(quests);
  questsRef.current = quests;

  const persist = useCallback(async (qs: QuestState[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dateStr: dateRef.current, quests: qs } satisfies QuestSave),
      );
    } catch {}
  }, []);

  // Snapshot wealth at call time so rewards match the player's current tier.
  const cashRef = useRef(game.cashUSD);
  cashRef.current = game.cashUSD;

  const freshQuests = useCallback((): QuestState[] =>
    generateQuests(cashRef.current).map((t) => ({ ...t, progress: 0, claimed: false })),
  []);

  // Always generate new random quests on startup — different every refresh.
  useEffect(() => {
    const today = todayUTC();
    dateRef.current = today;
    const fresh = freshQuests();
    setQuests(fresh);
    persist(fresh);
  }, [freshQuests, persist]);

  // Day-rollover check every minute — also regenerates on new day
  useEffect(() => {
    const iv = setInterval(() => {
      const today = todayUTC();
      if (today !== dateRef.current) {
        dateRef.current = today;
        const fresh = freshQuests();
        setQuests(fresh);
        persist(fresh);
      }
    }, 60_000);
    return () => clearInterval(iv);
  }, [freshQuests, persist]);

  // Countdown to next midnight UTC
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      setTimeUntilResetMs(tomorrow.getTime() - now.getTime());
    };
    tick();
    const iv = setInterval(tick, 1_000);
    return () => clearInterval(iv);
  }, []);

  // ── Generic updater ────────────────────────────────────────────────────────

  const bump = useCallback(
    (types: QuestType[], delta: number | ((t: QuestType) => number)) => {
      setQuests((prev) => {
        const updated = prev.map((q) => {
          if (q.claimed || q.progress >= q.target) return q;
          if (!types.includes(q.type)) return q;
          const d = typeof delta === "function" ? delta(q.type) : delta;
          return { ...q, progress: Math.min(q.target, q.progress + d) };
        });
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  // ── Public record methods ─────────────────────────────────────────────────

  const recordTap = useCallback(
    (btcEarned: number, usdEarned: number) => {
      setQuests((prev) => {
        const updated = prev.map((q) => {
          if (q.claimed || q.progress >= q.target) return q;
          let d = 0;
          if (q.type === "taps")     d = 1;
          if (q.type === "earn_usd") d = usdEarned;
          if (q.type === "mine_btc") d = btcEarned;
          if (d === 0) return q;
          return { ...q, progress: Math.min(q.target, q.progress + d) };
        });
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const recordUpgrade = useCallback(() => {
    bump(["buy_upgrades"], 1);
  }, [bump]);

  const recordStockBuy = useCallback(
    (usdAmount: number) => {
      bump(["buy_stocks"], 1);
      void usdAmount; // reserved for future earn_buy_usd quest type
    },
    [bump],
  );

  const recordStockSell = useCallback(
    (profitUsd: number) => {
      setQuests((prev) => {
        const updated = prev.map((q) => {
          if (q.claimed || q.progress >= q.target) return q;
          if (q.type === "sell_stocks") {
            return { ...q, progress: Math.min(q.target, q.progress + 1) };
          }
          if (q.type === "earn_trade_usd" && profitUsd > 0) {
            return { ...q, progress: Math.min(q.target, q.progress + profitUsd) };
          }
          return q;
        });
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const recordPropertyBuy = useCallback(() => {
    bump(["buy_properties"], 1);
  }, [bump]);

  const claimReward = useCallback(
    (questId: string) => {
      const quest = questsRef.current.find((q) => q.id === questId);
      if (!quest || quest.claimed || quest.progress < quest.target) return;
      game.addCash(quest.reward);
      setQuests((prev) => {
        const updated = prev.map((q) => (q.id === questId ? { ...q, claimed: true } : q));
        persist(updated);
        return updated;
      });
    },
    [game, persist],
  );

  return (
    <QuestContext.Provider
      value={{
        quests,
        recordTap,
        recordUpgrade,
        recordStockBuy,
        recordStockSell,
        recordPropertyBuy,
        claimReward,
        timeUntilResetMs,
      }}
    >
      {children}
    </QuestContext.Provider>
  );
}

export function useQuests(): QuestContextValue {
  const ctx = useContext(QuestContext);
  if (!ctx) throw new Error("useQuests must be used inside QuestProvider");
  return ctx;
}
