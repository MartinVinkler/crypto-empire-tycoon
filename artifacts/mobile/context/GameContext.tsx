import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { decryptSave, encryptSave } from "@/lib/saveEncrypt";

import {
  BASE_CLICK_VALUE,
  BOOST_COOLDOWN_MS,
  BOOST_DURATION_MS,
  BOOST_MULTIPLIER,
  BTC_BASELINE_PRICE,
  ECONOMY_VERSION,
  GROWTH_RATE,
  MAX_CRYPTO_PRICE,
  MIN_CRYPTO_PRICE,
  PRESTIGE_MULTIPLIER,
  PRESTIGE_THRESHOLD_USD,
  PRICE_DRIFT_PER_TICK,
  PRICE_HISTORY_LENGTH,
  PRICE_MEAN_REVERSION,
  PRICE_TICK_MS,
  PRICE_VOLATILITY_MAX,
  PRICE_VOLATILITY_MIN,
  SAVE_KEY,
  SPIKE_CHANCE,
  SPIKE_MAGNITUDE_MAX,
  SPIKE_MAGNITUDE_MIN,
  STARTING_CRYPTO_PRICE,
  TUTORIAL_KEY,
  TUTORIAL_TAPS_REQUIRED,
  UPGRADES,
  UpgradeDef,
} from "@/data/constants";
import { useStartup } from "@/context/StartupContext";
import {
  DIVIDEND_INTERVAL_MS,
  DIVIDEND_RATE_PER_SHARE,
  STARTING_CASH_USD,
  STOCK_TICK_MS,
  STOCKS,
  StockSymbol,
} from "@/data/stocks";
import { initMarket, StockMarket, tickStock } from "@/data/market";

export interface OwnedUpgrades {
  [id: string]: number;
}

export interface Holding {
  shares: number;
  totalCostUSD: number;
}

export type Holdings = Partial<Record<StockSymbol, Holding>>;

interface SaveState {
  balanceCrypto: number;
  /** Mining earnings locked in USD at the price when each BTC was earned.
   *  This never changes due to price fluctuations — only increases when you mine
   *  or decreases when you spend on upgrades. */
  miningBalanceUSD: number;
  ownedUpgrades: OwnedUpgrades;
  cryptoPrice: number;
  priceHistory: number[];
  prestigeMultiplier: number;
  prestigeCount: number;
  totalEarnedUSD: number;
  lastSeenAt: number;
  cashUSD: number;
  holdings: Holdings;
  lastDividendAt: number;
  dividendsEarnedUSD: number;
  economyVersion: number;
  /** Wall-clock ms when this save was first created — drives the BTC price drift. */
  gameStartedAt: number;
}

interface GameState extends SaveState {
  miningPower: number;
  clickValue: number;
  upgradeMultiplier: number;
  balanceUSD: number;
  boostUntil: number;
  boostCooldownUntil: number;
  isBoostActive: boolean;
  canPrestige: boolean;
  /** True when a backward clock anomaly was detected — passive income paused. */
  timeAnomaly: boolean;
  upgrades: UpgradeDef[];
  upgradeCost: (id: string) => number;
  buyUpgrade: (id: string) => boolean;
  manualMine: () => number;
  activateBoost: () => boolean;
  hardFork: () => boolean;
  resetGame: () => void;
  tutorialStep: number;
  tutorialClicks: number;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  startTutorial: () => void;
  notifyUpgradesVisited: () => void;
  market: StockMarket;
  buyStock: (symbol: StockSymbol, usdAmount: number) => boolean;
  sellStock: (symbol: StockSymbol, shares: number, multiplier?: number) => boolean;
  sellBTC: (cryptoAmount: number) => boolean;
  portfolioValueUSD: number;
  lastDividendPaidUSD: number;
  spendCash: (amount: number) => boolean;
  addCash: (amount: number) => void;
  addCrypto: (amount: number) => void;
  claimFreeUpgrade: (id: string) => boolean;
  premiumIncomeMultiplier: number;
  premiumMiningMultiplier: number;
  setPremiumBonuses: (income: number, mining: number) => void;
  isHydrated: boolean;
}

// --- Throttled display context (max 8 fps) ------------------------------------
// Components that only render numbers subscribe here instead of GameContext so
// they re-render at most 8× per second, not on every game-engine tick.
export interface GameDisplayState {
  balanceCrypto: number;
  miningBalanceUSD: number;
  balanceUSD: number;
  cashUSD: number;
  cryptoPrice: number;
  priceHistory: number[];
  miningPower: number;
  clickValue: number;
  upgradeMultiplier: number;
  portfolioValueUSD: number;
  totalEarnedUSD: number;
  dividendsEarnedUSD: number;
  canPrestige: boolean;
  isBoostActive: boolean;
  boostUntil: number;
  boostCooldownUntil: number;
  prestigeMultiplier: number;
  lastDividendPaidUSD: number;
}

const INITIAL_DISPLAY: GameDisplayState = {
  balanceCrypto: 0,
  miningBalanceUSD: 0,
  balanceUSD: 0,
  cashUSD: 0,
  cryptoPrice: STARTING_CRYPTO_PRICE,
  priceHistory: Array(PRICE_HISTORY_LENGTH).fill(STARTING_CRYPTO_PRICE),
  miningPower: 0,
  clickValue: BASE_CLICK_VALUE,
  upgradeMultiplier: 1,
  portfolioValueUSD: 0,
  totalEarnedUSD: 0,
  dividendsEarnedUSD: 0,
  canPrestige: false,
  isBoostActive: false,
  boostUntil: 0,
  boostCooldownUntil: 0,
  prestigeMultiplier: 1,
  lastDividendPaidUSD: 0,
};

const GameDisplayContext = createContext<GameDisplayState | null>(null);

export function useGameDisplay(): GameDisplayState {
  const ctx = useContext(GameDisplayContext);
  if (!ctx) throw new Error("useGameDisplay must be used within GameProvider");
  return ctx;
}
// ------------------------------------------------------------------------------

const GameContext = createContext<GameState | null>(null);

export function upgradeCostFor(baseCost: number, owned: number): number {
  return baseCost * Math.pow(GROWTH_RATE, owned);
}

function computePassivePerSec(owned: OwnedUpgrades): number {
  let total = 0;
  for (const u of UPGRADES) {
    if (u.kind !== "passive") continue;
    total += (owned[u.id] ?? 0) * u.baseValue;
  }
  return total;
}

function computeClickValue(owned: OwnedUpgrades): number {
  let base = BASE_CLICK_VALUE;
  let mult = 1;
  for (const u of UPGRADES) {
    const lvl = owned[u.id] ?? 0;
    if (lvl <= 0) continue;
    if (u.kind === "click") {
      base += lvl * u.baseValue;
    } else if (u.kind === "click_mult") {
      // Each level applies the multiplier again: ×1.2 owned 3× → ×1.728
      mult *= Math.pow(u.baseValue, lvl);
    }
  }
  return base * mult;
}

function computeUpgradeMultiplier(owned: OwnedUpgrades): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.kind !== "click_mult") continue;
    const lvl = owned[u.id] ?? 0;
    if (lvl > 0) mult *= Math.pow(u.baseValue, lvl);
  }
  return mult;
}

/**
 * Advance BTC price one tick.
 * - Random walk with ±4–40% magnitude (spikes included)
 * - Mean-reversion toward BTC_BASELINE_PRICE keeps price within $10–$1 000.
 * - Hard floor at MIN_CRYPTO_PRICE ($10), hard ceiling at MAX_CRYPTO_PRICE ($1 000).
 */
function newPrice(prev: number): number {
  const baseline = BTC_BASELINE_PRICE;
  const isSpike = Math.random() < SPIKE_CHANCE;
  const min = isSpike ? SPIKE_MAGNITUDE_MIN : PRICE_VOLATILITY_MIN;
  const max = isSpike ? SPIKE_MAGNITUDE_MAX : PRICE_VOLATILITY_MAX;
  const magnitude = min + Math.random() * (max - min);
  const direction = Math.random() < 0.5 ? -1 : 1;
  // Pull price toward baseline — gentle when close, stronger when far.
  const meanRev = ((baseline - prev) / Math.max(baseline, 1)) * PRICE_MEAN_REVERSION;
  const next = prev * (1 + direction * magnitude + meanRev);
  return Math.min(MAX_CRYPTO_PRICE, Math.max(MIN_CRYPTO_PRICE, next));
}

const INITIAL_SAVE: SaveState = {
  balanceCrypto: 0,
  miningBalanceUSD: 0,
  ownedUpgrades: {},
  cryptoPrice: STARTING_CRYPTO_PRICE,
  priceHistory: Array(PRICE_HISTORY_LENGTH).fill(STARTING_CRYPTO_PRICE),
  prestigeMultiplier: 1,
  prestigeCount: 0,
  totalEarnedUSD: 0,
  lastSeenAt: Date.now(),
  cashUSD: STARTING_CASH_USD,
  holdings: {},
  lastDividendAt: Date.now(),
  dividendsEarnedUSD: 0,
  economyVersion: ECONOMY_VERSION,
  gameStartedAt: Date.now(),
};

// Reset only the mining/upgrade economy when ECONOMY_VERSION bumps —
// preserves cash, stock holdings, dividends, and other non-mining progress.
function migrateEconomy(s: SaveState): SaveState {
  if (s.economyVersion === ECONOMY_VERSION) return s;
  return {
    ...s,
    balanceCrypto: 0,
    miningBalanceUSD: 0,
    ownedUpgrades: {},
    cryptoPrice: STARTING_CRYPTO_PRICE,
    priceHistory: Array(PRICE_HISTORY_LENGTH).fill(STARTING_CRYPTO_PRICE),
    prestigeMultiplier: 1,
    prestigeCount: 0,
    totalEarnedUSD: 0,
    economyVersion: ECONOMY_VERSION,
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { storage, isPreloaded, isGameReady } = useStartup();
  const [hydrated, setHydrated] = useState(false);
  const [timeAnomaly, setTimeAnomaly] = useState(false);
  const timeAnomalyRef = useRef(false);
  const [save, setSave] = useState<SaveState>(INITIAL_SAVE);
  const [boostUntil, setBoostUntil] = useState(0);
  const [boostCooldownUntil, setBoostCooldownUntil] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialClicks, setTutorialClicks] = useState(0);
  const tutorialStepRef = useRef(0);
  tutorialStepRef.current = tutorialStep;
  const [market, setMarket] = useState<StockMarket>(() => initMarket());
  const marketRef = useRef(market);
  marketRef.current = market;
  const [lastDividendPaidUSD, setLastDividendPaidUSD] = useState(0);
  const [premiumIncome, setPremiumIncome] = useState(1);
  const [premiumMining, setPremiumMining] = useState(1);
  const premiumIncomeRef = useRef(1);
  const premiumMiningRef = useRef(1);

  const saveRef = useRef(save);
  saveRef.current = save;
  const boostRef = useRef(boostUntil);
  boostRef.current = boostUntil;

  // Passive income accumulator — earns every 1s but only flushes to React
  // state every 4s (PASSIVE_FLUSH_TICKS). Between flushes, displayRef adds
  // the pending amount so the displayed balance is always up to date.
  const passiveAccumRef = useRef({ btc: 0, usd: 0 });

  // Tap epoch — used to suppress the 250ms display interval briefly after each
  // tap so the optimistic display update isn't overwritten with stale data
  // before the setSave batch commits.
  const lastTapEpochRef = useRef(0);

  // Reactive boost-active flag — fires ONLY when boost starts or expires.
  // Replaces the old `setNow(Date.now())` every second which forced a full
  // context re-render cascade across all 20 useGame() consumers.
  const [isBoostActive, setIsBoostActive] = useState(false);
  useEffect(() => {
    if (boostUntil <= Date.now()) {
      setIsBoostActive(false);
      return;
    }
    setIsBoostActive(true);
    const remaining = boostUntil - Date.now();
    const t = setTimeout(() => setIsBoostActive(false), remaining);
    return () => clearTimeout(t);
  }, [boostUntil]);

  // Display ref — always holds the latest volatile game values but updated
  // synchronously via useEffect (no setState → zero extra re-renders).
  const displayRef = useRef<GameDisplayState>({ ...INITIAL_DISPLAY });

  // Runs after every render — cheap ref mutation, no setState.
  // Includes pending passive income from passiveAccumRef so the displayed
  // balance is always up to date between 4-second state flushes.
  useEffect(() => {
    const mp = computePassivePerSec(save.ownedUpgrades) * premiumMiningRef.current;
    const cv = computeClickValue(save.ownedUpgrades);
    const um = computeUpgradeMultiplier(save.ownedUpgrades);
    let portfolioUSD = 0;
    for (const sym of Object.keys(save.holdings) as StockSymbol[]) {
      const h = save.holdings[sym];
      if (!h) continue;
      portfolioUSD += h.shares * (marketRef.current[sym]?.price ?? 0);
    }
    const pendingBTC = passiveAccumRef.current.btc;
    const pendingUSD = passiveAccumRef.current.usd;
    const effectiveBalanceUSD = save.miningBalanceUSD + pendingUSD;
    displayRef.current = {
      balanceCrypto: save.balanceCrypto + pendingBTC,
      miningBalanceUSD: effectiveBalanceUSD,
      // balanceUSD = locked mining earnings — stable, never repriced by market
      balanceUSD: effectiveBalanceUSD,
      cashUSD: save.cashUSD,
      cryptoPrice: save.cryptoPrice,
      priceHistory: save.priceHistory,
      miningPower: mp,
      clickValue: cv,
      upgradeMultiplier: um,
      portfolioValueUSD: portfolioUSD,
      totalEarnedUSD: save.totalEarnedUSD,
      dividendsEarnedUSD: save.dividendsEarnedUSD,
      canPrestige: effectiveBalanceUSD >= PRESTIGE_THRESHOLD_USD,
      isBoostActive,
      boostUntil,
      boostCooldownUntil,
      prestigeMultiplier: save.prestigeMultiplier,
      lastDividendPaidUSD,
    };
  }); // no deps — always current

  // Throttled display state — limits display re-renders to ≤4 fps (250 ms).
  // Lower rate than before (was 125ms / 8fps) to halve display CPU load and
  // reduce battery draw on mobile, while still feeling smooth to the user.
  // Any component that only needs numbers should call useGameDisplay() instead
  // of useGame() to avoid the passive-tick cascade.
  const [displayState, setDisplayState] = useState<GameDisplayState>(
    () => displayRef.current,
  );
  useEffect(() => {
    if (!isGameReady) return;
    setDisplayState({ ...displayRef.current });
    const iv = setInterval(() => {
      setDisplayState({ ...displayRef.current });
    }, 250);
    return () => clearInterval(iv);
  }, [isGameReady]);

  // Hydrate from preloaded storage — decrypts save, detects time anomalies,
  // and calculates honest offline income.  Runs once after Promise.all read.
  useEffect(() => {
    if (!isPreloaded) return;
    try {
      const tutDone = storage[TUTORIAL_KEY];
      if (tutDone !== "done") {
        setTutorialStep(1);
      }
      const raw = storage[SAVE_KEY];
      if (raw) {
        // ── Decrypt with double-try fallback ────────────────────────────
        // 1st attempt: decrypt then parse. 2nd attempt: parse raw directly
        // (handles saves written as plain JSON when btoa was unavailable).
        // If both fail the catch below fires and the game starts fresh.
        let parsed: Partial<SaveState>;
        try {
          parsed = JSON.parse(decryptSave(raw)) as Partial<SaveState>;
        } catch {
          parsed = JSON.parse(raw) as Partial<SaveState>;
        }

        // Sanitize numeric fields — a corrupted/null value crashes formatUSD.
        const safeNum = (v: unknown, fallback: number) => {
          const n = Number(v);
          return isFinite(n) && !isNaN(n) && n >= 0 ? n : fallback;
        };
        const merged: SaveState = migrateEconomy({
          ...INITIAL_SAVE,
          ...parsed,
          ownedUpgrades: parsed.ownedUpgrades ?? {},
          priceHistory:
            parsed.priceHistory && parsed.priceHistory.length > 0
              ? parsed.priceHistory
              : INITIAL_SAVE.priceHistory,
          economyVersion: parsed.economyVersion ?? 1,
          cryptoPrice:      safeNum(parsed.cryptoPrice,      STARTING_CRYPTO_PRICE),
          balanceCrypto:    safeNum(parsed.balanceCrypto,    0),
          cashUSD:          safeNum(parsed.cashUSD,          STARTING_CASH_USD),
          gameStartedAt:    safeNum(parsed.gameStartedAt,    Date.now()),
          miningBalanceUSD: safeNum(parsed.miningBalanceUSD,
            safeNum(parsed.balanceCrypto, 0) * safeNum(parsed.cryptoPrice, STARTING_CRYPTO_PRICE)),
        });

        // ── Anti-time-travel + offline income ───────────────────────────
        const now = Date.now();
        const lastSeen = merged.lastSeenAt ?? now;
        const elapsed = now - lastSeen;

        if (elapsed < -10_000) {
          // Clock rolled backward — block offline income, flag anomaly.
          // Player's progress is NEVER deleted; only passive income is paused.
          timeAnomalyRef.current = true;
          setTimeAnomaly(true);
        } else if (elapsed > 0) {
          // Legitimate offline gap — award honest passive income.
          // Cap at 7 days (604 800s) so economy isn't broken by very long absences.
          const cappedMs = Math.min(elapsed, 7 * 24 * 60 * 60 * 1000);
          const passive = computePassivePerSec(merged.ownedUpgrades);
          const offline = passive * (cappedMs / 1000) * merged.prestigeMultiplier;
          merged.balanceCrypto    += offline;
          merged.miningBalanceUSD += offline * merged.cryptoPrice;
        }
        setSave(merged);
      }
    } catch {
      // Truly corrupted or missing save — game starts from scratch.
    } finally {
      setHydrated(true);
    }
  // storage reference is stable after isPreloaded flips — only run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreloaded]);

  // ── Auto-save every 2 seconds + on unmount ──────────────────────────────
  // Short interval (2s) ensures progress is written well before Expo Go can
  // close the JS runtime.  The cleanup also fires doSave() so the final state
  // is committed even when the effect tears down during an in-flight session.
  // passiveAccumRef carries pending passive income not yet flushed to saveRef,
  // so including it here prevents losing the last few seconds of idle earnings.
  useEffect(() => {
    if (!hydrated) return;
    const doSave = () => {
      const snap = saveRef.current;
      const pa   = passiveAccumRef.current;
      const payload = JSON.stringify({
        ...snap,
        balanceCrypto:    snap.balanceCrypto    + pa.btc,
        miningBalanceUSD: snap.miningBalanceUSD + pa.usd,
        totalEarnedUSD:   snap.totalEarnedUSD   + pa.usd,
        lastSeenAt: Date.now(),
      });
      AsyncStorage.setItem(SAVE_KEY, encryptSave(payload)).catch(() => {});
    };
    const interval = setInterval(doSave, 2_000);
    return () => {
      clearInterval(interval);
      doSave();
    };
  }, [hydrated]);

  // ── Save on app background / close ──────────────────────────────────────
  // AppState "background" fires when the player hits Home, switches apps, or
  // the screen locks.  We flush passiveAccumRef here too so no idle earnings
  // are lost when the OS suspends the runtime immediately after this event.
  useEffect(() => {
    if (!hydrated) return;
    const doSave = () => {
      const snap = saveRef.current;
      const pa   = passiveAccumRef.current;
      const payload = JSON.stringify({
        ...snap,
        balanceCrypto:    snap.balanceCrypto    + pa.btc,
        miningBalanceUSD: snap.miningBalanceUSD + pa.usd,
        totalEarnedUSD:   snap.totalEarnedUSD   + pa.usd,
        lastSeenAt: Date.now(),
      });
      AsyncStorage.setItem(SAVE_KEY, encryptSave(payload)).catch(() => {});
    };
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        doSave();
      }
    });
    return () => {
      sub.remove();
      doSave();
    };
  }, [hydrated]);

  // ─── Single master game loop ──────────────────────────────────────────────
  // Replaces 4 separate setInterval timers with 1 × 1000ms interval.
  // Sub-systems run at their original cadences via tick counters:
  //   • Passive income  : every tick   (1 000ms) — accumulated in ref
  //   • Passive flush   : every 4 ticks (4 000ms) — single setSave instead of 4
  //   • Stock prices    : every 2 ticks (2 000ms) = STOCK_TICK_MS
  //   • Crypto price    : every 3 ticks (3 000ms) = PRICE_TICK_MS
  //   • Dividends       : every 5 ticks (5 000ms)
  // One interval = one JS-thread wake-up per second instead of 4 overlapping
  // wake-ups, which lowers CPU scheduling overhead and reduces battery draw.
  useEffect(() => {
    if (!isGameReady) return;
    const PASSIVE_FLUSH = 4;
    const PRICE_EVERY   = 3;   // PRICE_TICK_MS / 1000
    const STOCK_EVERY   = 2;   // STOCK_TICK_MS / 1000
    const DIVID_EVERY   = 5;
    let passiveTick = 0;
    let priceTick   = 0;
    let stockTick   = 0;
    let dividTick   = 0;

    let lastTickWall = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const cur = saveRef.current;

      // ── Runtime anti-time-travel: detect backward clock jump ─────────
      // If the system clock moves backward by more than 5 s between ticks
      // (e.g. the player sets their device clock back while the app runs),
      // flag the anomaly and skip passive income for this tick.
      const elapsed = now - lastTickWall;
      lastTickWall = now;
      if (elapsed < -5_000) {
        timeAnomalyRef.current = true;
        setTimeAnomaly(true);
      }

      // ── Passive income: accumulate every tick (no setState yet)
      // Skipped when a time anomaly is active (clock manipulation detected).
      const passive = computePassivePerSec(cur.ownedUpgrades);
      const boostActive = boostRef.current > now;
      const mult =
        cur.prestigeMultiplier *
        (boostActive ? BOOST_MULTIPLIER : 1) *
        premiumIncomeRef.current *
        premiumMiningRef.current;
      const earnedBTC = timeAnomalyRef.current ? 0 : passive * mult;
      if (earnedBTC > 0) {
        passiveAccumRef.current.btc += earnedBTC;
        passiveAccumRef.current.usd += earnedBTC * cur.cryptoPrice;
      }

      // ── Flush passive income to React state every PASSIVE_FLUSH seconds
      passiveTick++;
      if (passiveTick >= PASSIVE_FLUSH) {
        passiveTick = 0;
        const { btc, usd } = passiveAccumRef.current;
        if (btc > 0) {
          passiveAccumRef.current = { btc: 0, usd: 0 };
          setSave((s) => ({
            ...s,
            balanceCrypto: s.balanceCrypto + btc,
            miningBalanceUSD: s.miningBalanceUSD + usd,
            totalEarnedUSD: s.totalEarnedUSD + usd,
          }));
        }
      }

      // ── Crypto price ticker (every PRICE_EVERY ticks)
      priceTick++;
      if (priceTick >= PRICE_EVERY) {
        priceTick = 0;
        setSave((s) => {
          const next = newPrice(s.cryptoPrice);
          return { ...s, cryptoPrice: next, priceHistory: [...s.priceHistory.slice(1), next] };
        });
      }

      // ── Stock market ticker (every STOCK_EVERY ticks)
      stockTick++;
      if (stockTick >= STOCK_EVERY) {
        stockTick = 0;
        setMarket((m) => {
          const next = { ...m };
          for (const def of STOCKS) {
            next[def.symbol] = tickStock(m[def.symbol], def);
          }
          return next;
        });
      }

      // ── Dividend payouts (every DIVID_EVERY ticks)
      dividTick++;
      if (dividTick >= DIVID_EVERY) {
        dividTick = 0;
        if (now - cur.lastDividendAt >= DIVIDEND_INTERVAL_MS) {
          let payout = 0;
          const m = marketRef.current;
          for (const sym of Object.keys(cur.holdings) as StockSymbol[]) {
            const h = cur.holdings[sym];
            if (!h || h.shares <= 0) continue;
            payout += h.shares * (m[sym]?.price ?? 0) * DIVIDEND_RATE_PER_SHARE;
          }
          if (payout > 0) {
            setLastDividendPaidUSD(payout);
            setSave((p) => ({
              ...p,
              cashUSD: p.cashUSD + payout,
              dividendsEarnedUSD: p.dividendsEarnedUSD + payout,
              lastDividendAt: now,
            }));
          } else {
            setSave((p) => ({ ...p, lastDividendAt: now }));
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameReady]);

  const manualMine = useCallback(() => {
    // ── Pre-compute earned values synchronously from saveRef ──────────────
    // We read saveRef.current (always up-to-date) BEFORE calling setSave so
    // that the earned amounts are available synchronously for the immediate
    // display flush below — without waiting for setSave's functional update
    // to execute during the React render phase.
    const cur = saveRef.current;
    const click = computeClickValue(cur.ownedUpgrades);
    const boostActive = boostRef.current > Date.now();
    const mult =
      cur.prestigeMultiplier *
      (boostActive ? BOOST_MULTIPLIER : 1) *
      premiumIncomeRef.current *
      premiumMiningRef.current;
    const earnedBTC = click * mult;
    const earnedUSD = earnedBTC * cur.cryptoPrice;

    // ── Queue the actual state update (async React batch) ─────────────────
    setSave((prev) => {
      // Recompute inside the functional update so it uses the correct `prev`
      // even if multiple setSave calls are batched (concurrent taps).
      const c2  = computeClickValue(prev.ownedUpgrades);
      const b2  = boostRef.current > Date.now();
      const m2  =
        prev.prestigeMultiplier *
        (b2 ? BOOST_MULTIPLIER : 1) *
        premiumIncomeRef.current *
        premiumMiningRef.current;
      const btc2 = c2 * m2;
      const usd2 = btc2 * prev.cryptoPrice;
      return {
        ...prev,
        balanceCrypto:    prev.balanceCrypto    + btc2,
        miningBalanceUSD: prev.miningBalanceUSD + usd2,
        totalEarnedUSD:   prev.totalEarnedUSD   + usd2,
      };
    });

    if (tutorialStepRef.current === 1) {
      setTutorialClicks((n) => {
        const next = n + 1;
        if (next >= TUTORIAL_TAPS_REQUIRED) {
          setTutorialStep(2);
        }
        return next;
      });
    }
    return earnedBTC;
  }, []);

  const upgradeCost = useCallback(
    (id: string) => {
      const def = UPGRADES.find((u) => u.id === id);
      if (!def) return Infinity;
      const owned = save.ownedUpgrades[id] ?? 0;
      return upgradeCostFor(def.baseCost, owned);
    },
    [save.ownedUpgrades],
  );

  const buyUpgrade = useCallback((id: string) => {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    let success = false;
    // Capture any pending passive income so the affordability check reflects
    // what the player actually has (including income earned since last flush).
    const pendingBTC = passiveAccumRef.current.btc;
    const pendingUSD = passiveAccumRef.current.usd;
    setSave((prev) => {
      const owned = prev.ownedUpgrades[id] ?? 0;
      const cost = upgradeCostFor(def.baseCost, owned);
      if (prev.miningBalanceUSD + pendingUSD < cost) return prev;
      success = true;
      return {
        ...prev,
        balanceCrypto:    prev.balanceCrypto    + pendingBTC,
        miningBalanceUSD: prev.miningBalanceUSD + pendingUSD - cost,
        totalEarnedUSD:   prev.totalEarnedUSD   + pendingUSD,
        ownedUpgrades: { ...prev.ownedUpgrades, [id]: owned + 1 },
      };
    });
    // Clear the accumulator only when the purchase succeeded (functional update
    // runs synchronously in React 18 batching, so success is set before this).
    if (success) passiveAccumRef.current = { btc: 0, usd: 0 };
    return success;
  }, []);

  const activateBoost = useCallback(() => {
    if (Date.now() < boostCooldownUntil) return false;
    const until = Date.now() + BOOST_DURATION_MS;
    setBoostUntil(until);
    setBoostCooldownUntil(until + BOOST_COOLDOWN_MS);
    return true;
  }, [boostCooldownUntil]);

  const hardFork = useCallback(() => {
    let success = false;
    const pendingUSD = passiveAccumRef.current.usd;
    setSave((prev) => {
      if (prev.miningBalanceUSD + pendingUSD < PRESTIGE_THRESHOLD_USD) return prev;
      success = true;
      return {
        ...INITIAL_SAVE,
        cryptoPrice: prev.cryptoPrice,
        priceHistory: prev.priceHistory,
        prestigeMultiplier: prev.prestigeMultiplier * PRESTIGE_MULTIPLIER,
        prestigeCount: prev.prestigeCount + 1,
        totalEarnedUSD: prev.totalEarnedUSD,
        lastSeenAt: Date.now(),
      };
    });
    if (success) passiveAccumRef.current = { btc: 0, usd: 0 };
    return success;
  }, []);

  const resetGame = useCallback(() => {
    setSave({ ...INITIAL_SAVE, lastSeenAt: Date.now() });
    setBoostUntil(0);
    setBoostCooldownUntil(0);
    passiveAccumRef.current = { btc: 0, usd: 0 };
  }, []);

  const TUTORIAL_STEPS = 26;

  const advanceTutorial = useCallback(() => {
    setTutorialStep((s) => {
      const next = s < TUTORIAL_STEPS ? s + 1 : 0;
      if (next === 0) {
        AsyncStorage.setItem(TUTORIAL_KEY, "done").catch(() => {});
      }
      return next;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialStep(0);
    AsyncStorage.setItem(TUTORIAL_KEY, "done").catch(() => {});
  }, []);

  const startTutorial = useCallback(() => {
    AsyncStorage.removeItem(TUTORIAL_KEY).catch(() => {});
    setTutorialStep(1);
    setTutorialClicks(0);
  }, []);

  const buyStock = useCallback((symbol: StockSymbol, usdAmount: number) => {
    if (!isFinite(usdAmount) || usdAmount <= 0) return false;
    const price = marketRef.current[symbol]?.price ?? 0;
    if (price <= 0) return false;
    let success = false;
    setSave((prev) => {
      const spend = Math.min(usdAmount, prev.cashUSD);
      if (spend <= 0) return prev;
      const shares = spend / price;
      success = true;
      const existing = prev.holdings[symbol] ?? { shares: 0, totalCostUSD: 0 };
      return {
        ...prev,
        cashUSD: prev.cashUSD - spend,
        holdings: {
          ...prev.holdings,
          [symbol]: {
            shares: existing.shares + shares,
            totalCostUSD: existing.totalCostUSD + spend,
          },
        },
      };
    });
    return success;
  }, []);

  const sellStock = useCallback((symbol: StockSymbol, shares: number, multiplier = 1) => {
    const price = marketRef.current[symbol]?.price ?? 0;
    if (price <= 0 || !isFinite(shares) || shares <= 0) return false;
    let success = false;
    setSave((prev) => {
      const existing = prev.holdings[symbol];
      if (!existing || existing.shares <= 0) return prev;
      const sellShares = Math.min(shares, existing.shares);
      const proceeds = sellShares * price * Math.max(1, multiplier);
      const fraction = sellShares / existing.shares;
      const remainShares = existing.shares - sellShares;
      const remainCost = existing.totalCostUSD * (1 - fraction);
      success = true;
      const nextHoldings = { ...prev.holdings };
      if (remainShares < 1e-9) {
        delete nextHoldings[symbol];
      } else {
        nextHoldings[symbol] = {
          shares: remainShares,
          totalCostUSD: remainCost,
        };
      }
      return {
        ...prev,
        cashUSD: prev.cashUSD + proceeds,
        holdings: nextHoldings,
      };
    });
    return success;
  }, []);

  const sellBTC = useCallback((cryptoAmount: number) => {
    if (!isFinite(cryptoAmount) || cryptoAmount <= 0) return false;
    let success = false;
    setSave((prev) => {
      const sell = Math.min(cryptoAmount, prev.balanceCrypto);
      if (sell <= 0) return prev;
      const usdPerBtc = prev.balanceCrypto > 0
        ? prev.miningBalanceUSD / prev.balanceCrypto
        : prev.cryptoPrice;
      const minedUsd = sell * usdPerBtc;
      success = true;
      return {
        ...prev,
        balanceCrypto: prev.balanceCrypto - sell,
        miningBalanceUSD: Math.max(0, prev.miningBalanceUSD - minedUsd),
        totalEarnedUSD: Math.max(0, prev.totalEarnedUSD - minedUsd),
        cashUSD: prev.cashUSD + sell * prev.cryptoPrice,
      };
    });
    return success;
  }, []);

  const spendCash = useCallback((amount: number): boolean => {
    if (!isFinite(amount) || amount <= 0) return false;
    // Pre-check via ref (always current) — avoids relying on the updater
    // being called synchronously (not guaranteed in React 18 concurrent mode).
    if (saveRef.current.cashUSD < amount) return false;
    setSave((prev) => {
      if (prev.cashUSD < amount) return prev;
      return { ...prev, cashUSD: prev.cashUSD - amount };
    });
    return true;
  }, []);

  const addCash = useCallback((amount: number): void => {
    if (!isFinite(amount) || amount <= 0) return;
    setSave((prev) => ({ ...prev, cashUSD: prev.cashUSD + amount }));
  }, []);

  const addCrypto = useCallback((amount: number): void => {
    if (!isFinite(amount) || amount <= 0) return;
    setSave((prev) => {
      const earnedUSD = amount * prev.cryptoPrice;
      return {
        ...prev,
        balanceCrypto: prev.balanceCrypto + amount,
        miningBalanceUSD: prev.miningBalanceUSD + earnedUSD,
        totalEarnedUSD: prev.totalEarnedUSD + earnedUSD,
      };
    });
  }, []);

  const claimFreeUpgrade = useCallback((id: string): boolean => {
    if (!UPGRADES.find((u) => u.id === id)) return false;
    setSave((prev) => ({
      ...prev,
      ownedUpgrades: { ...prev.ownedUpgrades, [id]: (prev.ownedUpgrades[id] ?? 0) + 1 },
    }));
    return true;
  }, []);

  const notifyUpgradesVisited = useCallback(() => {
    // Step 5 = "Buy Your First Rig" — auto-advance to step 6 when upgrades tab opens.
    if (tutorialStepRef.current === 5) {
      setTutorialStep(6);
    }
  }, []);

  const setPremiumBonuses = useCallback((income: number, mining: number) => {
    premiumIncomeRef.current = income;
    premiumMiningRef.current = mining;
    setPremiumIncome(income);
    setPremiumMining(mining);
  }, []);

  const value = useMemo<GameState>(() => {
    const miningPower = computePassivePerSec(save.ownedUpgrades) * premiumMining;
    const clickValue = computeClickValue(save.ownedUpgrades);
    const upgradeMultiplier = computeUpgradeMultiplier(save.ownedUpgrades);
    // miningBalanceUSD is locked-in USD — does NOT fluctuate with cryptoPrice.
    // balanceCrypto remains a cosmetic counter (total BTC mined, shown as subtitle).
    const balanceUSD = save.miningBalanceUSD;
    const canPrestige = balanceUSD >= PRESTIGE_THRESHOLD_USD;
    let portfolioValueUSD = 0;
    for (const sym of Object.keys(save.holdings) as StockSymbol[]) {
      const h = save.holdings[sym];
      if (!h) continue;
      portfolioValueUSD += h.shares * (market[sym]?.price ?? 0);
    }
    return {
      ...save,
      miningPower,
      clickValue,
      upgradeMultiplier,
      balanceUSD,
      boostUntil,
      boostCooldownUntil,
      isBoostActive,
      canPrestige,
      timeAnomaly,
      upgrades: UPGRADES,
      upgradeCost,
      buyUpgrade,
      manualMine,
      activateBoost,
      hardFork,
      resetGame,
      tutorialStep,
      tutorialClicks,
      advanceTutorial,
      skipTutorial,
      startTutorial,
      notifyUpgradesVisited,
      market,
      buyStock,
      sellStock,
      sellBTC,
      portfolioValueUSD,
      lastDividendPaidUSD,
      spendCash,
      addCash,
      addCrypto,
      claimFreeUpgrade,
      premiumIncomeMultiplier: premiumIncome,
      premiumMiningMultiplier: premiumMining,
      setPremiumBonuses,
      isHydrated: hydrated,
    };
  }, [
    save,
    boostUntil,
    boostCooldownUntil,
    isBoostActive,
    upgradeCost,
    buyUpgrade,
    manualMine,
    activateBoost,
    hardFork,
    resetGame,
    tutorialStep,
    tutorialClicks,
    advanceTutorial,
    skipTutorial,
    startTutorial,
    notifyUpgradesVisited,
    market,
    buyStock,
    sellStock,
    sellBTC,
    lastDividendPaidUSD,
    spendCash,
    addCash,
    premiumIncome,
    premiumMining,
    setPremiumBonuses,
    hydrated,
    timeAnomaly,
  ]);

  return (
    <GameContext.Provider value={value}>
      <GameDisplayContext.Provider value={displayState}>
        {children}
      </GameDisplayContext.Provider>
    </GameContext.Provider>
  );
}

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function formatUSD(value: number): string {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return "$0";
  if (n >= 1e15) return `$${(n / 1e15).toFixed(2)}Qa`;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function formatCrypto(value: number): string {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n) || n === 0) return "0";
  if (n >= 1e15) return `${(n / 1e15).toFixed(2)}Qa`;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `${(n / 1e3).toFixed(2)}K`;
  if (n >= 1)    return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
}

export function formatRate(perSec: number): string {
  return `${formatCrypto(perSec)}/s`;
}
