import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { useTradeToast } from "@/context/TradeToastContext";
import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";

const HOLD_MS = 3500;
const ENTER_MS = 320;
const EXIT_MS = 380;

function getLabel(profitPct: number): {
  text: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
} {
  if (profitPct >= 10) return { text: "Legendary Trade! 🚀", icon: "rocket-launch" };
  if (profitPct > 0)   return { text: "Good Profit! 💰",     icon: "trending-up"    };
  return                      { text: "Paper Hands! 📉",     icon: "trending-down"  };
}

function getColors(profitPct: number, c: ReturnType<typeof useColors>) {
  if (profitPct >= 10) return { primary: "#00ffaa", glow: "#00ffaa" };
  if (profitPct > 0)   return { primary: c.neon,    glow: c.neon    };
  return                     { primary: "#ff6b3d",  glow: "#ff4400" };
}

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(2)}K`;
  return `$${abs.toFixed(2)}`;
}

export function TradeToastBanner() {
  const c = useColors();
  const { toast } = useTradeToast();
  const { playChaChingProfit, playLossSound } = useSFX();

  const slideY  = useRef(new Animated.Value(-140)).current;
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(toast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!toast) return;

    // Clear any running exit timer
    if (timerRef.current) clearTimeout(timerRef.current);
    animRef.current?.stop();

    setCurrent(toast);
    setVisible(true);

    // Play SFX
    if (toast.profitPct >= 10) {
      playChaChingProfit(true);
    } else if (toast.profitPct > 0) {
      playChaChingProfit(false);
    } else {
      playLossSound();
    }

    // Reset to off-screen
    slideY.setValue(-140);
    scale.setValue(0.88);
    opacity.setValue(0);

    // Enter animation — spring slide + scale pop
    const enter = Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_MS,
        useNativeDriver: true,
      }),
    ]);

    // Exit animation — slide back up + fade
    const exit = Animated.parallel([
      Animated.timing(slideY, {
        toValue: -140,
        duration: EXIT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }),
    ]);

    enter.start();

    timerRef.current = setTimeout(() => {
      animRef.current = exit;
      exit.start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, HOLD_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!visible || !current) return null;

  const { text: labelText, icon } = getLabel(current.profitPct);
  const { primary, glow } = getColors(current.profitPct, c);
  const isProfit = current.profitPct > 0;
  const sign = isProfit ? "+" : "-";
  const pctSign = current.profitPct >= 0 ? "+" : "";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: c.bgElevated,
            borderColor: primary + "66",
            shadowColor: glow,
          },
        ]}
      >
        <LinearGradient
          colors={[primary + "28", primary + "08", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: primary }]} />

        <View style={styles.content}>
          {/* Top row: icon + label + symbol badge */}
          <View style={styles.topRow}>
            <MaterialCommunityIcons
              name={icon}
              size={16}
              color={primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.label, { color: primary }, Platform.OS === "web" ? { textShadow: `0 0 8px ${glow}` } as object : { textShadowColor: glow }]}
            >
              {labelText}
            </Text>
            <View
              style={[
                styles.symbolBadge,
                { borderColor: primary + "55", backgroundColor: primary + "18" },
              ]}
            >
              <Text style={[styles.symbolTxt, { color: primary }]}>
                {current.symbol}
              </Text>
            </View>
          </View>

          {/* Bottom row: shares + profit */}
          <View style={styles.bottomRow}>
            <Text style={[styles.detailTxt, { color: c.textDim }]}>
              {current.shares < 0.01
                ? current.shares.toFixed(6)
                : current.shares.toFixed(4)}{" "}
              shares sold
            </Text>
            <View style={styles.profitPill}>
              <Text
                style={[
                  styles.profitAmt,
                  { color: primary },
                  Platform.OS === "web" ? { textShadow: `0 0 8px ${glow}` } as object : { textShadowColor: glow },
                ]}
              >
                {sign}{fmt(current.profitUSD)}
              </Text>
              <Text style={[styles.profitPct, { color: primary + "cc" }]}>
                {"  "}{pctSign}{current.profitPct.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 52,
    left: 14,
    right: 14,
    zIndex: 99999,
  },
  banner: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 18,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    flex: 1,
    ...Platform.select({
      default: { textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
      web: {},
    }),
  },
  symbolBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  symbolTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTxt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  profitPill: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  profitAmt: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    ...Platform.select({
      default: { textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
      web: {},
    }),
  },
  profitPct: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
