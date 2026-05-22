/**
 * MiningZone — Bold Neon Terminal
 *
 * ✦ Glassmorphism cards: 2px neon border + neon box-shadow (web)
 * ✦ Coin: 20% larger, intense neon glow disc (pure CSS boxShadow)
 * ✦ All values in monospace, extra-bold, strong text-shadow glow
 * ✦ Tap path: zero React re-renders (Reanimated + imperative refs)
 */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { LightningField, LightningFieldHandle } from "@/components/LightningField";
import { MiniSparkline } from "@/components/MiniSparkline";
import {
  formatCrypto,
  formatRate,
  formatUSD,
  useGameDisplay,
} from "@/context/GameContext";
import { useAds } from "@/context/AdContext";
import { useBattlePass } from "@/context/BattlePassContext";
import { MineAdOffer } from "@/components/MineAdOffer";
import { useQuests } from "@/context/QuestContext";
import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";

// 20% larger than previous 200
const BUTTON_SIZE    = 240;
const LIGHTNING_SIZE = BUTTON_SIZE + 140;

const MONO = Platform.OS === "web"
  ? "'Courier New', Courier, monospace"
  : "monospace";

const NEON_HEX = "#39FF14";

// Cross-platform neon card glow — boxShadow on web, shadowColor+elevation on native.
// Native intensity ~3x higher than web because RN's shadowOpacity/Radius render
// far softer than CSS box-shadow for the same nominal value.
const cardGlow = (color: string, intensity: number): object => {
  if (Platform.OS === "web") {
    return {
      // @ts-ignore — web-only CSS property
      boxShadow: `0 0 ${12 * intensity}px ${color}80, 0 0 ${28 * intensity}px ${color}40, inset 0 0 ${16 * intensity}px ${color}10`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Math.min(1, 0.95 * intensity),
    shadowRadius: 22 * intensity,
    elevation: Math.round(14 * intensity),
  };
};

// ── Main component ────────────────────────────────────────────────────────────
// Props: stable callbacks passed from the parent so this component never needs
// to subscribe to GameContext (which changes every second). It re-renders only
// from useGameDisplay() at ≤8 fps and its own animation shared-values.

interface MiningZoneProps {
  onMine: () => number;
  onAddCrypto: (amount: number) => void;
}

export const MiningZone = React.memo(function MiningZone({ onMine, onAddCrypto }: MiningZoneProps) {
  const c       = useColors();
  const display = useGameDisplay();
  const { tapMultiplier } = useAds();
  const { recordTap } = useQuests();
  const bp = useBattlePass();
  const { playClick } = useSFX();

  const lightningRef = useRef<LightningFieldHandle>(null);
  // Sliding-window rate limiter — anti-auto-clicker protection.
  // Allows at most 15 taps per second (human maximum). Any tap that would
  // push the count above 15 within the last 1000ms is silently ignored.
  const tapWindowRef = useRef<number[]>([]);
  const RATE_LIMIT  = 15;
  const RATE_WINDOW = 1000;

  // ── Local balance state — zero global context re-renders on each tap ───
  // Instead of calling setDisplayState (which propagates through the whole
  // context tree), we maintain a local USD/BTC delta that accumulates tap
  // earnings and is added to the base display value.  The periodic 250ms
  // context flush catches up and resets the delta — no double-counting.
  const tapDeltaUSDRef = useRef(0);
  const tapDeltaBTCRef = useRef(0);
  const lastTapAtRef = useRef(0);
  const [localBal, setLocalBal] = useState(() => ({
    usd: display.balanceUSD,
    btc: display.balanceCrypto,
  }));

  // When context syncs (passive income flush, upgrade buy, etc.), reset delta
  // and accept the authoritative balance from displayState.
  useEffect(() => {
    const now = Date.now();
    const nextUSD = display.balanceUSD + tapDeltaUSDRef.current;
    const nextBTC = display.balanceCrypto + tapDeltaBTCRef.current;
    setLocalBal((prev) => ({
      usd: now - lastTapAtRef.current < 350 ? Math.max(prev.usd, nextUSD) : nextUSD,
      btc: now - lastTapAtRef.current < 350 ? Math.max(prev.btc, nextBTC) : nextBTC,
    }));
  }, [display.balanceUSD, display.balanceCrypto]);

  // Shared values
  const press        = useSharedValue(1);
  const tapFlash     = useSharedValue(0);
  const breathe      = useSharedValue(1);
  const floatY       = useSharedValue(0);
  const burstScale   = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const statPulse    = useSharedValue(0);

  useEffect(() => {
    // Reduced amplitude vs original (1.026→1.012, 9→5) to cut continuous GPU
    // work per frame while keeping the idle-breathing visual feel intact.
    breathe.value = withRepeat(
      withTiming(1.012, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    floatY.value = withRepeat(
      withTiming(5, { duration: 2700, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = useCallback(
    (_e: GestureResponderEvent) => {
      // ── 0. Sliding-window rate limit (15 taps/sec anti-auto-clicker) ──
      // Keeps a rolling list of tap timestamps for the past 1 000ms.
      // If the player (or a script) would exceed 15 taps in that window,
      // this tap is silently dropped.  Human physical max is ~12 taps/sec,
      // so legitimate players never see this barrier.
      const now = Date.now();
      tapWindowRef.current = tapWindowRef.current.filter(
        (t) => now - t < RATE_WINDOW,
      );
      if (tapWindowRef.current.length >= RATE_LIMIT) return;
      tapWindowRef.current.push(now);

      // ── 1. Haptic + sound FIRST — before any React work ─────────────
      // Firing these before setState calls gives the lowest perceived latency.
      playClick();

      // ── 2. Reanimated animations — run on UI thread, zero JS delay ──
      press.value = withSequence(
        withTiming(0.88, { duration: 65 }),
        withTiming(1, { duration: 230, easing: Easing.out(Easing.back(3)) }),
      );
      tapFlash.value = withSequence(
        withTiming(1, { duration: 70 }),
        withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }),
      );
      burstScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1.9, { duration: 650, easing: Easing.out(Easing.cubic) }),
      );
      burstOpacity.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }),
      );
      statPulse.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }),
      );
      lightningRef.current?.boost();

      // ── 3. React state updates ────────────────────────────────────────
      const earned = onMine();
      if (tapMultiplier > 1) onAddCrypto(earned * (tapMultiplier - 1));
      bp.addClick();
      const totalEarned = earned * tapMultiplier;
      const usdEarned   = totalEarned * display.cryptoPrice;
      recordTap(totalEarned, usdEarned);

      // Instantly update the LOCAL balance — ONLY MiningZone re-renders.
      // The global context tree stays completely still until the next 250ms
      // passive flush, giving true zero-latency feedback on every tap.
      tapDeltaUSDRef.current += usdEarned;
      tapDeltaBTCRef.current += totalEarned;
      lastTapAtRef.current = Date.now();
      setLocalBal((prev) => ({
        usd: prev.usd + usdEarned,
        btc: prev.btc + totalEarned,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMine, onAddCrypto, playClick, recordTap, tapMultiplier],
  );

  // ── Animated styles ───────────────────────────────────────────────────────
  const floatWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value - 4 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * breathe.value }],
  }));

  const coinGlowStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [{ scale: 1 + tapFlash.value * 0.1 }],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }));

  // Cards: bright border that intensifies on tap
  const statBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(57,255,20,${0.55 + statPulse.value * 0.45})`,
  }));

  // ── Derived display values ────────────────────────────────────────────────
  const boostActive    = display.isBoostActive;
  const boostRemaining = Math.max(0, Math.ceil((display.boostUntil - Date.now()) / 1000));
  const multiplier     = display.upgradeMultiplier * display.prestigeMultiplier * (boostActive ? 3 : 1);
  const hashrateFmt    = formatRate(display.miningPower * multiplier);
  const priceUp        =
    (display.priceHistory.at(-1) ?? 0) >= (display.priceHistory.at(-2) ?? 0);
  const priceColor     = priceUp ? c.neon : c.danger;

  // Reduced 30% from Trade's values — stable, not blurry
  const neonTextShadow = Platform.OS === "web"
    ? { textShadow: `0 0 5px ${NEON_HEX}, 0 0 10px rgba(57,255,20,0.45)` } as object
    : {
        textShadowColor: NEON_HEX,
        textShadowRadius: 10,
        textShadowOffset: { width: 0, height: 0 },
      };
  const electricTextShadow = Platform.OS === "web"
    ? { textShadow: `0 0 5px ${c.electric}, 0 0 10px ${c.electric}72` } as object
    : {
        textShadowColor: c.electric,
        textShadowRadius: 10,
        textShadowOffset: { width: 0, height: 0 },
      };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Stat cards — glassmorphism + neon box-shadow ──── */}
      <View style={styles.statsRow}>
        <Animated.View style={[styles.stat, statBorderStyle, cardGlow(NEON_HEX, 0.6), { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: c.textDim }]}>BALANCE</Text>
          <Text style={[styles.statValue, { color: c.neon }, neonTextShadow]}>
            {formatUSD(localBal.usd)}
          </Text>
          <Text style={[styles.statSub, { color: c.textDim }]}>
            {formatCrypto(localBal.btc)} BTC
          </Text>
        </Animated.View>

        <Animated.View style={[styles.stat, statBorderStyle, cardGlow(c.electric, 0.6), { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: c.textDim }]}>HASHRATE</Text>
          <Text style={[styles.statValue, { color: c.electric }, electricTextShadow]}>
            {hashrateFmt}
          </Text>
          <Text style={[styles.statSub, { color: c.textDim }]}>
            x{multiplier.toFixed(1)} mult
          </Text>
        </Animated.View>
      </View>

      {/* ── Boost banner ──────────────────────────────────────── */}
      {boostActive && (
        <View style={[styles.boostBanner, { borderColor: c.amber, backgroundColor: c.amber + "15" }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={c.amber} />
          <Text style={[styles.boostText, { color: c.amber, fontFamily: MONO }]}>
            3× BOOST · {boostRemaining}s REMAINING
          </Text>
        </View>
      )}

      {/* ── Neural Core ─────────────────────────────────────── */}
      <Animated.View style={[styles.buttonWrap, floatWrapStyle]}>

        {/* Tap shockwave — sharp expanding ring */}
        <Animated.View
          pointerEvents="none"
          style={[styles.burst, burstStyle, { borderColor: c.neon }]}
        />

        {/* SVG HUD rings (inner solid + spinning dashed + outer solid + ticks) */}
        <View pointerEvents="none" style={styles.lightningWrap}>
          <LightningField
            ref={lightningRef}
            color={c.neon}
            size={LIGHTNING_SIZE}
          />
        </View>

        {/* Ambient coin glow — boxShadow on web, shadowColor on iOS */}
        <View
          pointerEvents="none"
          style={[
            styles.coinGlowDisc,
            Platform.OS === "web"
              ? // @ts-ignore web-only
                { boxShadow: `0 0 40px 12px ${NEON_HEX}22, 0 0 80px 35px ${NEON_HEX}0e` }
              : {
                  backgroundColor: NEON_HEX + "0a",
                  shadowColor: NEON_HEX,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 36,
                },
          ]}
        />

        {/* Coin button — pitch-black disc, neon-green ₿ */}
        <Animated.View style={[styles.pressWrap, buttonStyle]}>
          <Pressable
            onPressIn={handlePress}
            style={[styles.pressable, { backgroundColor: c.background }]}
            testID="mine-button"
          >
            <Animated.View style={coinGlowStyle}>
              <MaterialCommunityIcons
                name="bitcoin"
                size={108}
                color={c.background}
                style={{
                  textShadowColor: NEON_HEX,
                  textShadowRadius: 16,
                  textShadowOffset: { width: 0, height: 0 },
                }}
              />
            </Animated.View>

            <Text style={[styles.buttonLabel, { color: c.neon }]}>
              TAP TO MINE
            </Text>
            <Text style={[styles.buttonSub, { color: c.neon + "99" }]}>
              CURRENT TAP VALUE: {formatUSD(display.clickValue * multiplier * display.cryptoPrice)}
            </Text>
          </Pressable>
        </Animated.View>

      </Animated.View>

      {/* ── BTC price card — glassmorphism + neon shadow ───── */}
      <Animated.View
        style={[
          styles.priceCard,
          { borderColor: priceColor + "88", backgroundColor: c.card },
          cardGlow(priceColor, 0.8),
        ]}
      >
        <View pointerEvents="none" style={styles.sparklineLayer}>
          <MiniSparkline
            data={display.priceHistory}
            width={220}
            height={48}
            color={c.electric + "aa"}
          />
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.priceLabel, { color: c.textDim }]}>BTC / USD</Text>
            <Text
              style={[
                styles.priceValue,
                { color: priceColor },
                priceUp ? neonTextShadow : {},
              ]}
            >
              {formatUSD(display.cryptoPrice)}
            </Text>
          </View>
          <View style={[styles.tickerPill, { backgroundColor: priceColor + "20", borderColor: priceColor }]}>
            <MaterialCommunityIcons
              name={priceUp ? "trending-up" : "trending-down"}
              size={14}
              color={priceColor}
            />
            <Text style={[styles.tickerText, { color: priceColor }]}>LIVE</Text>
          </View>
        </View>
      </Animated.View>

      <MineAdOffer />
    </View>
  );
});

const GLASS_BORDER = "rgba(57,255,20,0.55)";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },

  // ── Stat cards — exact Trade panel weight ───────────────
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderWidth: 2,                       // 2px solid — user-specified
    borderColor: GLASS_BORDER,
    borderRadius: 14,                     // match Trade's card radius
    padding: 14,
    gap: 5,
  },
  statLabel: {
    fontSize: 10,                         // posCardTitle: 10
    letterSpacing: 2,                     // posCardTitle: 2
    fontFamily: "Inter_700Bold",          // exact Trade font
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  statSub: {
    fontSize: 11,                         // Trade secondary text: 11-12
    fontFamily: "Inter_600SemiBold",      // semi-bold like Trade's cash labels
  },

  // ── Boost banner ────────────────────────────────────────
  boostBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
  },
  boostText: { fontSize: 12, letterSpacing: 1.8, fontWeight: "900" },

  // ── Neural Core / Coin area ──────────────────────────────
  buttonWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: BUTTON_SIZE + 90,
    position: "relative",
  },

  burst: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
  },

  lightningWrap: {
    position: "absolute",
    width: LIGHTNING_SIZE,
    height: LIGHTNING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  // Radial glow disc — web CSS boxShadow creates the "emitting light" effect
  coinGlowDisc: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  pressWrap: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },

  pressable: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },

  // ── Price card ──────────────────────────────────────────
  priceCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    // overflow:hidden clips shadow on Android — conditionally applied via style prop
    overflow: Platform.OS === "android" ? "visible" : "hidden",
  },
  sparklineLayer: {
    position: "absolute",
    right: 80,
    top: 14,
    bottom: 14,
    opacity: 0.55,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 10,                         // posCardTitle: 10
    letterSpacing: 2,                     // posCardTitle: 2
    fontFamily: "Inter_700Bold",          // exact Trade font
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
  },
  tickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,                    // pill shape like Trade's changePill
    borderWidth: 1,
  },
  tickerText: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  buttonLabel: {
    marginTop: 8,
    fontSize: 15,
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  buttonSub: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
});
