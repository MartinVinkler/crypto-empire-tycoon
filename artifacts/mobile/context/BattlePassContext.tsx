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

import { useGame } from "@/context/GameContext";
import { useIAP } from "@/context/IAPContext";
import {
  FREE_TIERS,
  PASS_TIERS,
  PassReward,
  PassTier,
  SEASON_DAYS,
  TOTAL_TIERS,
  xpCumulative,
  xpForTier,
} from "@/lib/battle-pass-data";
import { PRODUCT_IDS } from "@/lib/iap-service";

const STORAGE_KEY = "@crypto_empire_battle_pass_v1";
const SEASON_MS = SEASON_DAYS * 24 * 60 * 60 * 1000;

// XP rates:
//   Clicks  : 1 XP per 10 taps  (addClick each tap)
//   Ads     : 5 XP per ad watched
//   Mining  : computed from game.totalEarnedUSD — 1 XP per $5,000 mined

export const XP_PER_CLICK = 0.1;   // → 10 taps = 1 XP
export const XP_PER_AD   = 5;
export const USD_PER_MINING_XP = 5_000; // $5,000 = 1 XP

interface BPState {
  seasonStart: number;
  hasPremium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
  clickXP: number;   // fractional accumulator (floor for int XP)
  adXP: number;      // integer
}

const freshSeason = (): BPState => ({
  seasonStart: Date.now(),
  hasPremium: false,
  claimedFree: [],
  claimedPremium: [],
  clickXP: 0,
  adXP: 0,
});

export interface BattlePassContextValue {
  isPremium: boolean;
  currentTier: number;
  totalXP: number;
  xpInTier: number;
  xpForNextTier: number;
  seasonStart: number;
  seasonEnd: number;
  daysLeft: number;
  tiers: PassTier[];
  isFreeClaimed(tier: number): boolean;
  isPremiumClaimed(tier: number): boolean;
  claimFreeReward(tier: number): boolean;
  claimPremiumReward(tier: number): boolean;
  purchasePremium(): Promise<"success" | "already_owned" | "failed">;
  addClick(): void;
  addAd(): void;
}

const BattlePassContext = createContext<BattlePassContextValue | null>(null);

export function useBattlePass(): BattlePassContextValue {
  const ctx = useContext(BattlePassContext);
  if (!ctx) throw new Error("useBattlePass must be inside BattlePassProvider");
  return ctx;
}

export function BattlePassProvider({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const iap = useIAP();
  const [state, setState] = useState<BPState>(freshSeason());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<BPState>;
            const seasonStart = parsed.seasonStart ?? Date.now();
            if (Date.now() - seasonStart > SEASON_MS) {
              setState(freshSeason());
            } else {
              setState({
                seasonStart,
                hasPremium: parsed.hasPremium ?? false,
                claimedFree: parsed.claimedFree ?? [],
                claimedPremium: parsed.claimedPremium ?? [],
                clickXP: parsed.clickXP ?? 0,
                adXP: parsed.adXP ?? 0,
              });
            }
          } catch {}
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (Date.now() - state.seasonStart > SEASON_MS) {
      setState(freshSeason());
    }
  }, [hydrated]);

  // Mining XP: computed live from game.totalEarnedUSD (no storage needed)
  const miningXP = useMemo(
    () => Math.floor(game.totalEarnedUSD / USD_PER_MINING_XP),
    [game.totalEarnedUSD],
  );

  const totalXP = useMemo(
    () => Math.floor(state.clickXP) + state.adXP + miningXP,
    [state.clickXP, state.adXP, miningXP],
  );

  const currentTier = useMemo(() => {
    let t = 0;
    while (t < TOTAL_TIERS && xpCumulative(t + 1) <= totalXP) t++;
    return t;
  }, [totalXP]);

  const xpInTier = totalXP - xpCumulative(currentTier);
  const xpForNextTier = currentTier < TOTAL_TIERS ? xpForTier(currentTier + 1) : 0;
  const seasonEnd = state.seasonStart + SEASON_MS;
  const daysLeft = Math.max(
    0,
    Math.ceil((seasonEnd - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  const isFreeClaimed = useCallback(
    (tier: number) => stateRef.current.claimedFree.includes(tier),
    [],
  );

  const isPremiumClaimed = useCallback(
    (tier: number) => stateRef.current.claimedPremium.includes(tier),
    [],
  );

  const grantReward = useCallback(
    (reward: PassReward) => {
      if (reward.kind === "cash" && reward.amount !== undefined) {
        game.addCash(reward.amount);
      } else if (reward.kind === "crypto" && reward.amount !== undefined) {
        game.addCrypto(reward.amount);
      } else if (reward.kind === "upgrade" && reward.upgradeId) {
        game.claimFreeUpgrade(reward.upgradeId);
      }
    },
    [game],
  );

  const claimFreeReward = useCallback(
    (tier: number): boolean => {
      const tierDef = PASS_TIERS[tier - 1];
      if (!tierDef?.freeReward) return false;
      if (tier > FREE_TIERS) return false;
      if (currentTier < tier) return false;
      if (stateRef.current.claimedFree.includes(tier)) return false;
      grantReward(tierDef.freeReward);
      setState((prev) => ({ ...prev, claimedFree: [...prev.claimedFree, tier] }));
      return true;
    },
    [currentTier, grantReward],
  );

  const claimPremiumReward = useCallback(
    (tier: number): boolean => {
      if (!stateRef.current.hasPremium) return false;
      const tierDef = PASS_TIERS[tier - 1];
      if (!tierDef) return false;
      if (currentTier < tier) return false;
      if (stateRef.current.claimedPremium.includes(tier)) return false;
      grantReward(tierDef.premiumReward);
      setState((prev) => ({ ...prev, claimedPremium: [...prev.claimedPremium, tier] }));
      return true;
    },
    [currentTier, grantReward],
  );

  const purchasePremium = useCallback(async (): Promise<
    "success" | "already_owned" | "failed"
  > => {
    if (stateRef.current.hasPremium) return "already_owned";
    const result = await iap.purchase(PRODUCT_IDS.SEASON_PASS).catch(() => "failed" as const);
    if (result === "success") {
      setState((prev) => ({ ...prev, hasPremium: true }));
      return "success";
    }
    return result === "already_owned" ? "already_owned" : "failed";
  }, [iap]);

  const addClick = useCallback(() => {
    setState((prev) => ({ ...prev, clickXP: prev.clickXP + XP_PER_CLICK }));
  }, []);

  const addAd = useCallback(() => {
    setState((prev) => ({ ...prev, adXP: prev.adXP + XP_PER_AD }));
  }, []);

  const value: BattlePassContextValue = {
    isPremium: state.hasPremium,
    currentTier,
    totalXP,
    xpInTier,
    xpForNextTier,
    seasonStart: state.seasonStart,
    seasonEnd,
    daysLeft,
    tiers: PASS_TIERS,
    isFreeClaimed,
    isPremiumClaimed,
    claimFreeReward,
    claimPremiumReward,
    purchasePremium,
    addClick,
    addAd,
  };

  return (
    <BattlePassContext.Provider value={value}>
      {children}
    </BattlePassContext.Provider>
  );
}
