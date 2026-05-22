import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStartup, ADS_STORAGE_KEY } from "@/context/StartupContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBattlePass } from "@/context/BattlePassContext";
import { useGame } from "@/context/GameContext";
import { useIAP } from "@/context/IAPContext";
import { showRewardedAd, showInterstitialAd } from "@/lib/admob-service";
import { PRODUCT_IDS } from "@/lib/iap-service";
import {
  TEST_AD_MODE,
  INTERSTITIAL_INTERVAL_MS,
} from "@/lib/monetization-config";

const STORAGE_KEY = "@crypto_empire_ads_v1";
const AD_DURATION_MS = 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ── Boost definitions ─────────────────────────────────────────────────────────

export type BoostType =
  | "2x_mine"
  | "3x_mine"
  | "double_wallet"
  | "profit_mult"
  | "auto_collect";

export interface BoostDef {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  multiplier: number;
  durationMs: number;
  description: string;
}

export const BOOST_DEFS: Record<BoostType, BoostDef> = {
  "2x_mine": {
    label: "2× Mine Boost",
    icon: "lightning-bolt",
    color: "#39FF14",
    multiplier: 2,
    durationMs: 5 * 60_000,
    description: "Double tap earnings for 5 min",
  },
  "3x_mine": {
    label: "3× Mine Boost",
    icon: "rocket",
    color: "#FF6B00",
    multiplier: 3,
    durationMs: 3 * 60_000,
    description: "Triple tap earnings for 3 min",
  },
  "double_wallet": {
    label: "2× Wallet Income",
    icon: "wallet",
    color: "#00D4FF",
    multiplier: 2,
    durationMs: 5 * 60_000,
    description: "Double passive income for 5 min",
  },
  "profit_mult": {
    label: "1.5× Trade Profit",
    icon: "trending-up",
    color: "#FF3B9A",
    multiplier: 1.5,
    durationMs: 10 * 60_000,
    description: "50% bonus on stock sell profit for 10 min",
  },
  "auto_collect": {
    label: "Auto Collect",
    icon: "robot",
    color: "#A855F7",
    multiplier: 1,
    durationMs: 3 * 60_000,
    description: "Auto-mines every second for 3 min",
  },
};

// ── Ad-count formulas ─────────────────────────────────────────────────────────

export function adsForUpgrade(price: number, owned = 0): number {
  let base: number;
  if      (price < 100)           base = 1;
  else if (price < 500)           base = 2;
  else if (price < 1_000)         base = 3;
  else if (price < 5_000)         base = 5;
  else if (price < 10_000)        base = 8;
  else if (price < 50_000)        base = 12;
  else if (price < 100_000)       base = 16;
  else if (price < 1_000_000)     base = 22;
  else if (price < 10_000_000)    base = 30;
  else if (price < 100_000_000)   base = 40;
  else if (price < 1_000_000_000) base = 55;
  else                            base = 75;
  // Each copy already owned adds one full cycle of the base requirement
  return base * (owned + 1);
}

export function adsForProperty(price: number): number {
  if (price < 500)    return 1;
  if (price < 1_000)  return 2;
  if (price < 2_000)  return 3;
  if (price < 5_000)  return 4;
  if (price < 10_000) return 5;
  if (price < 20_000) return 6;
  return 8;
}

export function adsForWalletBoost(balance: number): number {
  if (balance < 100)    return 1;
  if (balance < 1_000)  return 2;
  if (balance < 10_000) return 3;
  if (balance < 50_000) return 4;
  return 5;
}

// ── Offer pool ────────────────────────────────────────────────────────────────

const ALL_OFFER_TYPES: BoostType[] = ["2x_mine", "3x_mine", "double_wallet", "profit_mult"];

function pickRandomOffers(current: BoostType[] = []): BoostType[] {
  let result: BoostType[];
  let attempts = 0;
  do {
    result = [...ALL_OFFER_TYPES].sort(() => Math.random() - 0.5).slice(0, 3);
    attempts++;
  } while (
    attempts < 20 &&
    result.length === current.length &&
    result.every((t) => current.includes(t))
  );
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdBoost {
  id: string;
  type: BoostType;
  expiresAt: number;
}

interface PersistedAdState {
  upgradeAds: Record<string, number>;
  propertyAds: Record<string, number>;
  activeBoosts: AdBoost[];
  dailySponsorClaimedAt: number;
  adNotificationsEnabled: boolean;
  totalAdsWatched: number;
  walletBoostAds: number;
  btcBoostAds: number;
  boostCooldowns: Record<string, number>;
  currentOffers: BoostType[];
  rotateOffersAt: number;
}

const INITIAL: PersistedAdState = {
  upgradeAds: {},
  propertyAds: {},
  activeBoosts: [],
  dailySponsorClaimedAt: 0,
  adNotificationsEnabled: true,
  totalAdsWatched: 0,
  walletBoostAds: 0,
  btcBoostAds: 0,
  boostCooldowns: {},
  currentOffers: pickRandomOffers(),
  rotateOffersAt: 0,
};

// ── Context shape ─────────────────────────────────────────────────────────────

export interface AdContextValue {
  watchAd(label: string): Promise<boolean>;
  totalAdsWatched: number;
  adNotificationsEnabled: boolean;
  setAdNotifications(v: boolean): void;

  activeBoosts: AdBoost[];
  tapMultiplier: number;
  profitMultiplier: number;

  watchAdOnly(): Promise<boolean>;

  upgradeAdsWatched(id: string): number;
  adsForUpgrade(price: number, owned?: number): number;
  watchAdForUpgrade(id: string, price: number): Promise<boolean>;
  isUpgradeUnlocked(id: string, price: number, owned?: number): boolean;

  propertyAdsWatched(id: string): number;
  adsForProperty(price: number): number;
  watchAdForProperty(id: string, price: number): Promise<boolean>;
  isPropertyUnlocked(id: string, price: number): boolean;

  resetUpgradeAds(id: string): void;
  resetPropertyAds(id: string): void;

  walletBoostAdsWatched: number;
  adsForWalletBoost(balance: number): number;
  watchAdForWalletBoost(): Promise<boolean>;
  isWalletBoostReady(balance: number): boolean;
  claimWalletBoost(): void;

  btcBoostAdsWatched: number;
  watchAdForBtcBoost(): Promise<boolean>;
  isBtcBoostReady(balanceUSD: number): boolean;
  claimBtcBoost(): void;

  watchAdForBoost(type: BoostType): Promise<boolean>;
  hasBoost(type: BoostType): boolean;
  boostTimeLeft(type: BoostType): number;
  canClaimBoost(type: BoostType): boolean;
  boostCooldownLeft(type: BoostType): number;
  currentOffers: BoostType[];

  canClaimDailySponsor: boolean;
  claimDailySponsor(): Promise<boolean>;
  isHydrated: boolean;
}

const AdContext = createContext<AdContextValue | null>(null);

export function useAds(): AdContextValue {
  const ctx = useContext(AdContext);
  if (!ctx) throw new Error("useAds must be used within AdProvider");
  return ctx;
}

// ── Internal modal ────────────────────────────────────────────────────────────
//
// HOW TO SWAP IN REAL ADS:
//   1. Set TEST_AD_MODE = false (top of file)
//   2. In AdWatchModal, replace the TEST block below with your real ad SDK call
//      e.g. await AdMob.showRewardedAd(adUnitId)
//   3. Call onComplete() when the SDK signals the reward was earned
//

function AdWatchModal({
  visible,
  label,
  onComplete,
}: {
  visible: boolean;
  label: string;
  onComplete(): void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [remaining, setRemaining] = useState(Math.round(AD_DURATION_MS / 1000));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      setRemaining(Math.round(AD_DURATION_MS / 1000));
      return;
    }
    progress.setValue(0);
    const totalSecs = Math.round(AD_DURATION_MS / 1000);
    setRemaining(totalSecs);

    if (TEST_AD_MODE) {
      // ── TEST AD ── replace this block with real ad SDK integration ──────────
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: AD_DURATION_MS,
        useNativeDriver: false,
      });
      anim.start(({ finished }) => {
        if (finished) onComplete();
      });

      let t = totalSecs;
      const tick = setInterval(() => {
        t -= 1;
        setRemaining(Math.max(0, t));
      }, 1000);

      return () => {
        anim.stop();
        clearInterval(tick);
      };
      // ── END TEST AD ──────────────────────────────────────────────────────────
    } else {
      // ── REAL AD INTEGRATION POINT ────────────────────────────────────────────
      // Example (AdMob):
      //   AdMob.showRewardedAd(AD_UNIT_ID).then(() => onComplete()).catch(() => {});
      // Call onComplete() when the SDK confirms the reward was earned.
      // ─────────────────────────────────────────────────────────────────────────
    }
  }, [visible]);

  if (!TEST_AD_MODE) return null;

  const AD_ACCENT = "#39FF14";
  const AD_DIM = "#1a1a1a";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={ms.fullscreen}>
        {/* ── Header bar ── */}
        <View style={ms.headerBar}>
          <MaterialCommunityIcons name="television-play" size={15} color={AD_ACCENT} />
          <Text style={ms.headerText}>AD PLACEMENT PLACEHOLDER</Text>
          <View style={ms.timerChip}>
            <Text style={ms.timerChipText}>
              {remaining > 0 ? `${remaining}s` : "✓"}
            </Text>
          </View>
        </View>

        {/* ── Main ad area ── */}
        <View style={ms.adArea}>
          <MaterialCommunityIcons name="play-circle-outline" size={72} color={AD_ACCENT} style={ms.playIcon} />
          <Text style={ms.testAdText}>[TEST AD PLAYING]</Text>
          <Text style={ms.countdownNumber}>
            {remaining > 0 ? remaining : "✓"}
          </Text>
          <Text style={ms.adRewardLabel} numberOfLines={2}>{label}</Text>
        </View>

        {/* ── Progress bar ── */}
        <View style={[ms.track, { backgroundColor: AD_DIM }]}>
          <Animated.View
            style={[
              ms.fill,
              {
                backgroundColor: AD_ACCENT,
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {/* ── Footer ── */}
        <View style={ms.footer}>
          <Text style={ms.footerText}>
            {remaining > 0
              ? `Your reward unlocks in ${remaining}s…`
              : "Reward claimed! Closing…"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    gap: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    color: "#39FF14",
  },
  timerChip: {
    backgroundColor: "#39FF1422",
    borderWidth: 1,
    borderColor: "#39FF1455",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timerChipText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#39FF14",
    letterSpacing: 1,
  },
  adArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  playIcon: {
    opacity: 0.6,
    marginBottom: 8,
  },
  testAdText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 3,
    textAlign: "center",
  },
  countdownNumber: {
    fontSize: 80,
    fontFamily: "Inter_700Bold",
    color: "#39FF14",
    lineHeight: 88,
    textAlign: "center",
  },
  adRewardLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  track: {
    height: 4,
    marginHorizontal: 0,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
    letterSpacing: 1,
    textAlign: "center",
  },
});

// ── Automatic interstitial ad (test modal) ────────────────────────────────────

function AutoInterstitialModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose(): void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [remaining, setRemaining] = useState(Math.round(AD_DURATION_MS / 1000));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      setRemaining(Math.round(AD_DURATION_MS / 1000));
      return;
    }
    progress.setValue(0);
    const totalSecs = Math.round(AD_DURATION_MS / 1000);
    setRemaining(totalSecs);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: AD_DURATION_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) onClose();
    });

    let t = totalSecs;
    const tick = setInterval(() => {
      t -= 1;
      setRemaining(Math.max(0, t));
    }, 1000);

    return () => {
      anim.stop();
      clearInterval(tick);
    };
  }, [visible]);

  if (!TEST_AD_MODE) return null;

  const ACCENT = "#FF6B00";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={ams.fullscreen}>
        <View style={ams.headerBar}>
          <MaterialCommunityIcons name="television-play" size={15} color={ACCENT} />
          <Text style={[ams.headerText, { color: ACCENT }]}>AUTOMATIC AD</Text>
          <View style={[ams.timerChip, { backgroundColor: ACCENT + "22", borderColor: ACCENT + "55" }]}>
            <Text style={[ams.timerChipText, { color: ACCENT }]}>
              {remaining > 0 ? `${remaining}s` : "✓"}
            </Text>
          </View>
        </View>

        <View style={ams.adArea}>
          <MaterialCommunityIcons name="television-play" size={72} color={ACCENT} style={ams.playIcon} />
          <Text style={ams.testAdText}>[AUTOMATIC TEST AD]</Text>
          <Text style={[ams.countdownNumber, { color: ACCENT }]}>
            {remaining > 0 ? remaining : "✓"}
          </Text>
          <Text style={ams.adSub}>Ad will close automatically when the countdown ends</Text>
        </View>

        <View style={[ams.track, { backgroundColor: "#1a1a1a" }]}>
          <Animated.View
            style={[
              ams.fill,
              {
                backgroundColor: ACCENT,
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        <View style={ams.footer}>
          <Text style={ams.footerText}>
            {remaining > 0
              ? `Ad closing in ${remaining}s…`
              : "Closing…"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const ams = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    gap: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
  },
  timerChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timerChipText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  adArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  playIcon: {
    opacity: 0.6,
    marginBottom: 8,
  },
  testAdText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 3,
    textAlign: "center",
  },
  countdownNumber: {
    fontSize: 80,
    fontFamily: "Inter_700Bold",
    lineHeight: 88,
    textAlign: "center",
  },
  adSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },
  track: {
    height: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#555555",
    letterSpacing: 1,
    textAlign: "center",
  },
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function AdProvider({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const iap = useIAP();
  const bp = useBattlePass();
  const { storage, isPreloaded } = useStartup();
  const [state, setState] = useState<PersistedAdState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  // Use data preloaded in parallel by StartupContext — no extra AsyncStorage read.
  useEffect(() => {
    if (!isPreloaded) return;
    const raw = storage[ADS_STORAGE_KEY];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PersistedAdState>;
        setState((prev) => ({
          ...prev,
          ...parsed,
          activeBoosts: (parsed.activeBoosts ?? []).filter(
            (b) => b.expiresAt > Date.now()
          ),
          currentOffers: (parsed.currentOffers && parsed.currentOffers.length === 3)
            ? parsed.currentOffers
            : pickRandomOffers(),
        }));
      } catch {}
    }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreloaded]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  // ── Automatic interstitial ad — timer ─────────────────────────────────────
  const [autoAdVisible, setAutoAdVisible] = useState(false);
  const autoAdRunning = useRef(false);

  // Track Remove Ads ownership via ref so the interval never needs to restart
  // when the purchase state changes — avoids resetting the 10-minute countdown.
  const removeAdsRef = useRef(false);
  useEffect(() => {
    removeAdsRef.current = iap.hasPurchased(PRODUCT_IDS.REMOVE_ADS);
  }, [iap.purchasedIds, iap]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setInterval(async () => {
      // Skip interstitials immediately when player owns Remove Ads
      if (removeAdsRef.current) return;
      if (autoAdRunning.current) return;
      autoAdRunning.current = true;
      if (TEST_AD_MODE) {
        setAutoAdVisible(true);
        // modal closes itself via onClose, which resets autoAdRunning
      } else {
        await showInterstitialAd().catch(() => {});
        autoAdRunning.current = false;
      }
    }, INTERSTITIAL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hydrated]);

  const onAutoAdClose = useCallback(() => {
    setAutoAdVisible(false);
    autoAdRunning.current = false;
  }, []);

  // ── Ad watching ────────────────────────────────────────────────────────────
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  const [pendingAd, setPendingAd] = useState<{ label: string } | null>(null);

  const watchAd = useCallback((label: string): Promise<boolean> => {
    // NOTE: REMOVE_ADS only suppresses automatic interstitials.
    // Rewarded ads are always shown — player chooses to watch them for bonuses.
    const adPromise = !TEST_AD_MODE
      ? // ── REAL AD PATH ───────────────────────────────────────────────────────
        // showRewardedAd() loads & shows a Google AdMob rewarded ad natively.
        // Resolves true when the user earns the reward, false on dismiss/error.
        showRewardedAd()
      : // ── TEST AD PATH (fullscreen placeholder shown in AdWatchModal below) ──
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setPendingAd({ label });
        });
    return adPromise.then((ok) => {
      if (ok) {
        bp.addAd();
      }
      return ok;
    });
  }, [bp]);

  const onAdComplete = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setPendingAd(null);
  }, []);

  const watchAdOnly = useCallback((): Promise<boolean> => {
    return watchAd("Ad Reward").then((ok) => {
      if (ok) {
        setState((prev) => ({
          ...prev,
          totalAdsWatched: prev.totalAdsWatched + 1,
        }));
        // bp.addAd() is already called inside watchAd for all ad types
      }
      return ok;
    });
  }, [watchAd]);

  // ── Active boosts ──────────────────────────────────────────────────────────
  const activeBoosts = state.activeBoosts.filter((b) => b.expiresAt > Date.now());

  const tapMultiplier = activeBoosts
    .filter((b) => b.type === "2x_mine" || b.type === "3x_mine")
    .reduce((best, b) => Math.max(best, BOOST_DEFS[b.type].multiplier), 1);

  const profitMultiplier =
    activeBoosts
      .filter((b) => b.type === "profit_mult")
      .reduce((best, b) => Math.max(best, BOOST_DEFS[b.type].multiplier), 1) *
    iap.iapProfitMultiplier;

  // ── Boost expiry + passive effects ─────────────────────────────────────────
  const activeBoostsRef = useRef(activeBoosts);
  activeBoostsRef.current = activeBoosts;

  // Use a ref so the interval never needs to restart when game changes reference
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        const still = prev.activeBoosts.filter((b) => b.expiresAt > now);
        const shouldRotate = prev.rotateOffersAt > 0 && now >= prev.rotateOffersAt;
        const updated: typeof prev = {
          ...prev,
          activeBoosts: still.length !== prev.activeBoosts.length ? still : prev.activeBoosts,
          currentOffers: shouldRotate ? pickRandomOffers(prev.currentOffers) : prev.currentOffers,
          rotateOffersAt: shouldRotate ? 0 : prev.rotateOffersAt,
        };
        const changed =
          updated.activeBoosts !== prev.activeBoosts ||
          updated.currentOffers !== prev.currentOffers ||
          updated.rotateOffersAt !== prev.rotateOffersAt;
        return changed ? updated : prev;
      });

      const boosts = activeBoostsRef.current;
      const g = gameRef.current;

      if (boosts.some((b) => b.type === "double_wallet") && g.miningPower > 0) {
        g.addCash(g.miningPower * g.prestigeMultiplier * g.cryptoPrice);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hydrated]); // game intentionally omitted — accessed via gameRef

  const addBoost = useCallback((type: BoostType) => {
    const boost: AdBoost = {
      id: `${type}_${Date.now()}`,
      type,
      expiresAt: Date.now() + BOOST_DEFS[type].durationMs,
    };
    setState((prev) => ({
      ...prev,
      activeBoosts: [
        ...prev.activeBoosts.filter((b) => b.type !== type),
        boost,
      ],
    }));
  }, []);

  // ── Upgrade ads ────────────────────────────────────────────────────────────
  const upgradeAdsWatched = useCallback(
    (id: string) => state.upgradeAds[id] ?? 0,
    [state.upgradeAds]
  );

  const isUpgradeUnlocked = useCallback(
    (id: string, price: number, owned = 0) =>
      (state.upgradeAds[id] ?? 0) >= adsForUpgrade(price, owned),
    [state.upgradeAds]
  );

  const watchAdForUpgrade = useCallback(
    async (id: string, price: number): Promise<boolean> => {
      const ok = await watchAd(`Unlock upgrade`);
      if (!ok) return false;
      setState((prev) => ({
        ...prev,
        upgradeAds: { ...prev.upgradeAds, [id]: (prev.upgradeAds[id] ?? 0) + 1 },
        totalAdsWatched: prev.totalAdsWatched + 1,
      }));
      return true;
    },
    [watchAd]
  );

  const resetUpgradeAds = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        upgradeAds: { ...prev.upgradeAds, [id]: 0 },
      }));
    },
    []
  );

  // ── Property ads ───────────────────────────────────────────────────────────
  const propertyAdsWatched = useCallback(
    (id: string) => state.propertyAds[id] ?? 0,
    [state.propertyAds]
  );

  const isPropertyUnlocked = useCallback(
    (id: string, price: number) =>
      (state.propertyAds[id] ?? 0) >= adsForProperty(price),
    [state.propertyAds]
  );

  const watchAdForProperty = useCallback(
    async (id: string, price: number): Promise<boolean> => {
      const ok = await watchAd(`Unlock property`);
      if (!ok) return false;
      setState((prev) => ({
        ...prev,
        propertyAds: {
          ...prev.propertyAds,
          [id]: (prev.propertyAds[id] ?? 0) + 1,
        },
        totalAdsWatched: prev.totalAdsWatched + 1,
      }));
      return true;
    },
    [watchAd]
  );

  const resetPropertyAds = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        propertyAds: { ...prev.propertyAds, [id]: 0 },
      }));
    },
    []
  );

  // ── Wallet boost (2× collect) ───────────────────────────────────────────────
  const walletBoostAdsWatched = state.walletBoostAds;

  const isWalletBoostReady = useCallback(
    (balance: number) => state.walletBoostAds >= adsForWalletBoost(balance),
    [state.walletBoostAds]
  );

  const watchAdForWalletBoost = useCallback(
    async (): Promise<boolean> => {
      const ok = await watchAd("2× Wallet Boost");
      if (!ok) return false;
      setState((prev) => ({
        ...prev,
        walletBoostAds: prev.walletBoostAds + 1,
        totalAdsWatched: prev.totalAdsWatched + 1,
      }));
      return true;
    },
    [watchAd]
  );

  const claimWalletBoost = useCallback(() => {
    setState((prev) => ({ ...prev, walletBoostAds: 0 }));
  }, []);

  // ── BTC boost (2× BTC value cash bonus) ────────────────────────────────────
  const btcBoostAdsWatched = state.btcBoostAds;

  const isBtcBoostReady = useCallback(
    (balanceUSD: number) => state.btcBoostAds >= adsForWalletBoost(balanceUSD),
    [state.btcBoostAds]
  );

  const watchAdForBtcBoost = useCallback(
    async (): Promise<boolean> => {
      const ok = await watchAd("2× BTC Bonus");
      if (!ok) return false;
      setState((prev) => ({
        ...prev,
        btcBoostAds: prev.btcBoostAds + 1,
        totalAdsWatched: prev.totalAdsWatched + 1,
      }));
      return true;
    },
    [watchAd]
  );

  const claimBtcBoost = useCallback(() => {
    setState((prev) => ({ ...prev, btcBoostAds: 0 }));
  }, []);

  // ── Portfolio boosts ───────────────────────────────────────────────────────
  const ONE_HOUR_MS = 60 * 60 * 1000;

  const canClaimBoost = useCallback(
    (type: BoostType) => {
      const last = state.boostCooldowns[type] ?? 0;
      return Date.now() - last >= ONE_HOUR_MS;
    },
    [state.boostCooldowns]
  );

  const boostCooldownLeft = useCallback(
    (type: BoostType) => {
      const last = state.boostCooldowns[type] ?? 0;
      const remaining = ONE_HOUR_MS - (Date.now() - last);
      return Math.max(0, Math.ceil(remaining / 1000));
    },
    [state.boostCooldowns]
  );

  const watchAdForBoost = useCallback(
    async (type: BoostType): Promise<boolean> => {
      const def = BOOST_DEFS[type];
      const ok = await watchAd(def.label);
      if (!ok) return false;
      addBoost(type);
      const now = Date.now();
      setState((prev) => ({
        ...prev,
        totalAdsWatched: prev.totalAdsWatched + 1,
        boostCooldowns: { ...prev.boostCooldowns, [type]: now },
        rotateOffersAt: now + ONE_HOUR_MS,
      }));
      return true;
    },
    [watchAd, addBoost]
  );

  const hasBoost = useCallback(
    (type: BoostType) => activeBoosts.some((b) => b.type === type),
    [activeBoosts]
  );

  const boostTimeLeft = useCallback(
    (type: BoostType) => {
      const b = activeBoosts.find((ab) => ab.type === type);
      if (!b) return 0;
      return Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 1000));
    },
    [activeBoosts]
  );

  // ── Daily sponsor ──────────────────────────────────────────────────────────
  const canClaimDailySponsor =
    Date.now() - state.dailySponsorClaimedAt >= ONE_DAY_MS;

  const claimDailySponsor = useCallback(async (): Promise<boolean> => {
    if (!canClaimDailySponsor) return false;
    const ok = await watchAd("Daily Sponsor Reward — Big Combo");
    if (!ok) return false;
    addBoost("2x_mine");
    addBoost("double_wallet");
    // Scale sponsor bonus with player wealth so it stays meaningful.
    const mult = game.cashUSD >= 10_000_000 ? 100
      : game.cashUSD >= 1_000_000 ? 30
      : game.cashUSD >= 100_000   ? 10
      : game.cashUSD >= 10_000    ? 4
      : game.cashUSD >= 1_000     ? 2
      : 1;
    game.addCash(Math.round(100 * mult));
    setState((prev) => ({
      ...prev,
      dailySponsorClaimedAt: Date.now(),
      totalAdsWatched: prev.totalAdsWatched + 1,
    }));
    return true;
  }, [canClaimDailySponsor, watchAd, addBoost, game]);

  // ── Settings ───────────────────────────────────────────────────────────────
  const setAdNotifications = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, adNotificationsEnabled: v }));
  }, []);

  const value: AdContextValue = {
    watchAd,
    totalAdsWatched: state.totalAdsWatched,
    adNotificationsEnabled: state.adNotificationsEnabled,
    setAdNotifications,
    activeBoosts,
    tapMultiplier,
    profitMultiplier,
    watchAdOnly,
    upgradeAdsWatched,
    adsForUpgrade,
    watchAdForUpgrade,
    isUpgradeUnlocked,
    resetUpgradeAds,
    propertyAdsWatched,
    adsForProperty,
    watchAdForProperty,
    isPropertyUnlocked,
    resetPropertyAds,
    walletBoostAdsWatched,
    adsForWalletBoost,
    watchAdForWalletBoost,
    isWalletBoostReady,
    claimWalletBoost,
    btcBoostAdsWatched,
    watchAdForBtcBoost,
    isBtcBoostReady,
    claimBtcBoost,
    canClaimBoost,
    boostCooldownLeft,
    currentOffers: state.currentOffers,
    watchAdForBoost,
    hasBoost,
    boostTimeLeft,
    canClaimDailySponsor,
    claimDailySponsor,
    isHydrated: hydrated,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
      <AdWatchModal
        visible={!!pendingAd}
        label={pendingAd?.label ?? ""}
        onComplete={onAdComplete}
      />
      <AutoInterstitialModal
        visible={autoAdVisible}
        onClose={onAutoAdClose}
      />
    </AdContext.Provider>
  );
}
