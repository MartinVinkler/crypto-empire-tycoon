/**
 * Tutorial overlay — auto-navigates to the right tab each step
 * and shows animated arrows pointing at the exact element to tap.
 *
 * 26 steps covering every mechanic and tab in the game.
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
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
  withTiming,
} from "react-native-reanimated";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

// ── Tab layout: 9 tabs, 0-indexed ─────────────────────────────────────────────
// MINE(0) TRADE(1) UPGRADES(2) PROPERTY(3) PORTFOLIO(4) AI(5) PASS(6) SHOP(7) SETTINGS(8)
const TAB_COUNT = 9;
const tabCenterX = (idx: number) => {
  const w = Dimensions.get("window").width;
  return (w / TAB_COUNT) * (idx + 0.5);
};

// ── Route for each step ────────────────────────────────────────────────────────
const STEP_ROUTE: Record<number, string> = {
  1:  "/(tabs)/",
  2:  "/(tabs)/",
  3:  "/(tabs)/",
  4:  "/(tabs)/",
  5:  "/(tabs)/upgrades",
  6:  "/(tabs)/upgrades",
  7:  "/(tabs)/upgrades",
  8:  "/(tabs)/trade",
  9:  "/(tabs)/trade",
  10: "/(tabs)/trade",
  11: "/(tabs)/map",
  12: "/(tabs)/map",
  13: "/(tabs)/portfolio",
  14: "/(tabs)/portfolio",
  15: "/(tabs)/ai",
  16: "/(tabs)/ai",
  17: "/(tabs)/",
  18: "/(tabs)/pass",
  19: "/(tabs)/pass",
  20: "/(tabs)/shop",
  21: "/(tabs)/shop",
  22: "/(tabs)/settings",
  23: "/(tabs)/",
  24: "/(tabs)/",
  25: "/(tabs)/",
  26: "/(tabs)/",
};

// ── Arrows config per step ─────────────────────────────────────────────────────
type ArrowKind =
  | { dir: "up";   fixed: true }          // pointing up at coin (step 1)
  | { dir: "down"; tabIdx: number }        // pointing down at a tab icon
  | { dir: "none" };

const STEP_ARROW: Record<number, ArrowKind> = {
  1:  { dir: "up",   fixed: true },
  2:  { dir: "none" },
  3:  { dir: "none" },
  4:  { dir: "none" },
  5:  { dir: "down", tabIdx: 2 },   // → UPGRADES tab
  6:  { dir: "none" },
  7:  { dir: "none" },
  8:  { dir: "down", tabIdx: 1 },   // → TRADE tab
  9:  { dir: "none" },
  10: { dir: "none" },
  11: { dir: "down", tabIdx: 3 },   // → PROPERTY tab
  12: { dir: "none" },
  13: { dir: "down", tabIdx: 4 },   // → PORTFOLIO tab
  14: { dir: "none" },
  15: { dir: "down", tabIdx: 5 },   // → AI tab
  16: { dir: "none" },
  17: { dir: "none" },
  18: { dir: "down", tabIdx: 6 },   // → PASS tab
  19: { dir: "none" },
  20: { dir: "down", tabIdx: 7 },   // → SHOP tab
  21: { dir: "none" },
  22: { dir: "down", tabIdx: 8 },   // → SETTINGS tab
  23: { dir: "none" },
  24: { dir: "none" },
  25: { dir: "none" },
  26: { dir: "none" },
};

// ── Step content ───────────────────────────────────────────────────────────────
interface StepCfg {
  position: "top" | "center" | "bottom";
  badge: string;
  accentColor?: string;
  title: string;
  body: string;
  icon: string;   // MaterialCommunityIcons name
  cta?: string;
  hint?: string;
}

const TOTAL = 26;

export function Tutorial() {
  const c = useColors();
  const game = useGame();
  const step = game.tutorialStep;
  const router = useRouter();

  // ── Bounce animation ────────────────────────────────────────────────────────
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withTiming(10, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bounce]);

  const bounceDown = useAnimatedStyle(() => ({ transform: [{ translateY:  bounce.value }] }));
  const bounceUp   = useAnimatedStyle(() => ({ transform: [{ translateY: -bounce.value }] }));

  // ── Auto-navigate when step changes ────────────────────────────────────────
  useEffect(() => {
    if (step === 0) return;
    const route = STEP_ROUTE[step];
    if (route) {
      router.replace(route as Parameters<typeof router.replace>[0]);
    }
  }, [step, router]);

  if (step === 0) return null;

  // ── Step configs ────────────────────────────────────────────────────────────
  const steps: Record<number, StepCfg> = {

    // ── MINE tab ──────────────────────────────────────────────────────────────
    1: {
      position:    "bottom",
      badge:       `STEP 1 / ${TOTAL}`,
      accentColor: c.neon,
      icon:        "bitcoin",
      title:       "Welcome, Tycoon!",
      body:        "Tap the glowing Bitcoin coin to mine your first coins. Each tap earns cash and BTC. Start tapping — 5 taps to unlock your dashboard!",
      hint:        `${game.tutorialClicks} / 5 taps`,
    },
    2: {
      position:    "top",
      badge:       `STEP 2 / ${TOTAL}`,
      accentColor: c.electric,
      icon:        "chart-bar",
      title:       "Your Dashboard",
      body:        "The two cards at the top show your Balance (USD) and Hashrate (H/s). Balance is your spendable cash — Hashrate is how fast your rigs auto-mine every second.",
      cta:         "Got it →",
    },
    3: {
      position:    "bottom",
      badge:       `STEP 3 / ${TOTAL}`,
      accentColor: c.neon,
      icon:        "hand-coin",
      title:       "Tap Value & BTC",
      body:        "See the label below the coin — that's your tap value. As you buy more rigs, each tap earns more. BTC auto-converts to USD at the live market price.",
      cta:         "Next →",
    },
    4: {
      position:    "bottom",
      badge:       `STEP 4 / ${TOTAL}`,
      accentColor: c.magenta,
      icon:        "cpu-64-bit",
      title:       "Passive Mining",
      body:        "Your Hashrate mines automatically — even when the app is in the background. The higher your Hashrate, the faster cash accumulates without any tapping.",
      cta:         "Next →",
    },

    // ── UPGRADES tab ─────────────────────────────────────────────────────────
    5: {
      position:    "center",
      badge:       `STEP 5 / ${TOTAL}`,
      accentColor: "#FF6B35",
      icon:        "chip",
      title:       "Buy Your First Rig",
      body:        "Rigs are your core income engine. Head to the UPGRADES tab and buy a GPU Cluster — it will mine for you 24/7, even while you sleep.",
      cta:         "Show Upgrades →",
    },
    6: {
      position:    "center",
      badge:       `STEP 6 / ${TOTAL}`,
      accentColor: "#FF6B35",
      icon:        "layers-triple",
      title:       "Upgrade Tiers",
      body:        "Rigs come in tiers: GPU Cluster → ASIC Farm → Quantum Core. Each tier multiplies your passive hashrate. Unlock higher tiers by hitting cash milestones.",
      cta:         "Got it →",
    },
    7: {
      position:    "center",
      badge:       `STEP 7 / ${TOTAL}`,
      accentColor: c.amber,
      icon:        "television-play",
      title:       "Watch Ads for Free Boosts",
      body:        "Some upgrades can be unlocked free by watching a short ad. Look for the 📺 WATCH AD button on any locked rig. Ads also give you 2× mining speed for 30 minutes — and earn Battle Pass XP!",
      cta:         "Next →",
    },

    // ── TRADE tab ────────────────────────────────────────────────────────────
    8: {
      position:    "center",
      badge:       `STEP 8 / ${TOTAL}`,
      accentColor: "#00E5FF",
      icon:        "trending-up",
      title:       "Live Stock Market",
      body:        "The TRADE tab shows 6 stocks powered by a momentum AI engine — prices move in real trends, not random noise. Tap any card to open the full chart and trade.",
      cta:         "Next →",
    },
    9: {
      position:    "center",
      badge:       `STEP 9 / ${TOTAL}`,
      accentColor: "#00E5FF",
      icon:        "swap-horizontal",
      title:       "Buying & Selling",
      body:        "Inside a stock card: pick BUY or SELL, enter a USD amount, and confirm. You can sell fractions (25%, 50%, 75%, 100%) of your position at any time. Profit goes straight to your balance.",
      cta:         "Got it →",
    },
    10: {
      position:    "center",
      badge:       `STEP 10 / ${TOTAL}`,
      accentColor: "#00E5FF",
      icon:        "chart-timeline-variant",
      title:       "Chart Timeframes",
      body:        "Use the 1H / 24H / 2D toggle above the chart to zoom in or out. The 24H view shows the rolling high and low — great for spotting entry and exit points.",
      cta:         "Next →",
    },

    // ── PROPERTY tab ─────────────────────────────────────────────────────────
    11: {
      position:    "center",
      badge:       `STEP 11 / ${TOTAL}`,
      accentColor: "#3B82F6",
      icon:        "map-marker-radius",
      title:       "3D Property Map",
      body:        "The PROPERTY tab shows a live 3D GPS map of your real surroundings. Buildings around you are for sale — buy them to earn passive rent every minute.",
      cta:         "Next →",
    },
    12: {
      position:    "center",
      badge:       `STEP 12 / ${TOTAL}`,
      accentColor: "#3B82F6",
      icon:        "home-city",
      title:       "Buy a Building",
      body:        "Walk up to a building on the map and tap it to see its price and projected rent. Tap BUY to purchase it. Bigger buildings cost more but earn higher rent income.",
      cta:         "Got it →",
    },

    // ── PORTFOLIO tab ────────────────────────────────────────────────────────
    13: {
      position:    "center",
      badge:       `STEP 13 / ${TOTAL}`,
      accentColor: "#F59E0B",
      icon:        "office-building-cog",
      title:       "Your Portfolio",
      body:        "The PORTFOLIO tab lists every building you own with its size, rent rate, and total earnings so far. Your property empire is built one building at a time.",
      cta:         "Next →",
    },
    14: {
      position:    "center",
      badge:       `STEP 14 / ${TOTAL}`,
      accentColor: "#F59E0B",
      icon:        "cash-clock",
      title:       "Rent Income",
      body:        "Rent is paid automatically every 60 seconds per building. The more buildings you own — and the larger they are — the faster your passive income grows.",
      cta:         "Got it →",
    },

    // ── AI tab ───────────────────────────────────────────────────────────────
    15: {
      position:    "center",
      badge:       `STEP 15 / ${TOTAL}`,
      accentColor: "#EC4899",
      icon:        "robot",
      title:       "CIPHER — Your AI Advisor",
      body:        "The AI tab gives you CIPHER, your cyberpunk market analyst. It sees your live balance, BTC holdings, stock positions, and market momentum in real time.",
      cta:         "Next →",
    },
    16: {
      position:    "center",
      badge:       `STEP 16 / ${TOTAL}`,
      accentColor: "#EC4899",
      icon:        "lightning-bolt-circle",
      title:       "AI Boosts & Sponsor Offer",
      body:        "CIPHER offers quick boosts you can activate by watching a short ad: 2× Mining, 2× Wallet, 2× BTC Bonus and more. Once per day a special Sponsor combo gives all boosts at once.",
      cta:         "Got it →",
    },

    // ── QUESTS ────────────────────────────────────────────────────────────────
    17: {
      position:    "top",
      badge:       `STEP 17 / ${TOTAL}`,
      accentColor: c.neon,
      icon:        "trophy",
      title:       "Daily Quests",
      body:        "See the QUESTS button in the top-right of the MINE screen. Tap it to view today's missions — tap goals, mining targets, trade counts. Complete them for bonus cash that scales with your wealth.",
      cta:         "Got it →",
    },

    // ── PASS tab ──────────────────────────────────────────────────────────────
    18: {
      position:    "center",
      badge:       `STEP 18 / ${TOTAL}`,
      accentColor: "#A855F7",
      icon:        "crown",
      title:       "Season Pass",
      body:        "The PASS tab is your Battle Pass — 60 tiers of rewards refreshing every 30 days. Free track gives 30 rewards; Premium unlocks all 60, including massive BTC and cash drops.",
      cta:         "Next →",
    },
    19: {
      position:    "center",
      badge:       `STEP 19 / ${TOTAL}`,
      accentColor: "#A855F7",
      icon:        "star-shooting",
      title:       "Earning XP",
      body:        "Every action earns Pass XP: 10 taps on the mine = 1 XP, watching 1 ad = 5 XP, $5,000 passively mined = 1 XP. XP requirements grow each tier — the rewards grow too.",
      cta:         "Got it →",
    },

    // ── SHOP tab ──────────────────────────────────────────────────────────────
    20: {
      position:    "center",
      badge:       `STEP 20 / ${TOTAL}`,
      accentColor: "#FFD700",
      icon:        "cart",
      title:       "The Shop",
      body:        "The SHOP tab has one-time purchases that upgrade your empire: Remove Ads eliminates all automatic popups, Quantum Mining Rig multiplies your passive output, and Trading Edge boosts your profit on every stock sell.",
      cta:         "Next →",
    },
    21: {
      position:    "center",
      badge:       `STEP 21 / ${TOTAL}`,
      accentColor: "#FFD700",
      icon:        "tag-heart",
      title:       "Premium Season Pass",
      body:        "You can also buy the Premium Season Pass directly from the SHOP or from the PASS tab — $5.00 unlocks all 60 tiers of rewards for the current season.",
      cta:         "Got it →",
    },

    // ── SETTINGS ─────────────────────────────────────────────────────────────
    22: {
      position:    "center",
      badge:       `STEP 22 / ${TOTAL}`,
      accentColor: "#94A3B8",
      icon:        "cog",
      title:       "Settings & Preferences",
      body:        "The SETTINGS tab lets you toggle Dark Mode and sound effects. You can also replay this tutorial any time, reset progress, or redeem promo codes from here.",
      cta:         "Next →",
    },

    // ── Strategy & Final ─────────────────────────────────────────────────────
    23: {
      position:    "center",
      badge:       `STEP 23 / ${TOTAL}`,
      accentColor: c.magenta,
      icon:        "lightning-bolt",
      title:       "Stack Your Income Streams",
      body:        "The fastest path to your first million: mine + trade + buy properties at the same time. Each stream funds the next — watch for stock momentum and go all in when a trend starts.",
      cta:         "Next →",
    },
    24: {
      position:    "center",
      badge:       `STEP 24 / ${TOTAL}`,
      accentColor: c.electric,
      icon:        "chart-areaspline",
      title:       "Market Momentum",
      body:        "Every stock runs on a momentum algorithm — trends sustain themselves for minutes at a time. Buy early in a bull run, sell before it reverses. CIPHER can help you spot the turning points.",
      cta:         "Next →",
    },
    25: {
      position:    "center",
      badge:       `STEP 25 / ${TOTAL}`,
      accentColor: "#A855F7",
      icon:        "trophy-award",
      title:       "Season Pass Strategy",
      body:        "Maximize Pass XP by combining all sources: tap actively, watch every available ad, and let passive mining run. Hit Tier 60 before the season ends to claim the legendary BTC reward.",
      cta:         "Next →",
    },
    26: {
      position:    "center",
      badge:       `STEP 26 / ${TOTAL}`,
      accentColor: c.neon,
      icon:        "crown",
      title:       "You're Ready, Tycoon!",
      body:        "Mine Bitcoin, trade stocks, own real estate, power up with AI, grind the Season Pass, and unlock premium upgrades in the Shop. Many paths lead to empire — go build yours.",
      cta:         "Let's Play! 🚀",
    },
  };

  const cfg = steps[step] ?? steps[1];
  const accent = cfg.accentColor ?? c.neon;
  const arrow = STEP_ARROW[step] ?? { dir: "none" as const };

  const tooltipPos =
    cfg.position === "top"    ? styles.tipTop
    : cfg.position === "bottom" ? styles.tipBottom
    : styles.tipCenter;

  const screenW = Dimensions.get("window").width;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>

      {/* ── Semi-transparent backdrop ─────────────────────────────────────── */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(2,5,10,0.72)" }]}
      />

      {/* ── Arrow UP — fixed at coin (step 1) ─────────────────────────────── */}
      {arrow.dir === "up" && "fixed" in arrow && (
        <Animated.View pointerEvents="none" style={[styles.arrowUpFixed, bounceUp]}>
          <Ionicons name="chevron-up" size={40} color={accent} />
          <Ionicons name="chevron-up" size={30} color={accent} style={{ marginTop: -20, opacity: 0.55 }} />
        </Animated.View>
      )}

      {/* ── Arrow DOWN — pointing at a specific tab icon ───────────────────── */}
      {arrow.dir === "down" && "tabIdx" in arrow && (() => {
        const cx = tabCenterX(arrow.tabIdx);
        return (
          <Animated.View
            pointerEvents="none"
            style={[styles.arrowTabWrap, { left: cx - 20 }, bounceDown]}
          >
            <Ionicons name="chevron-down" size={30} color={accent} style={{ marginBottom: -14, opacity: 0.55 }} />
            <Ionicons name="chevron-down" size={40} color={accent} />
            {/* Neon glow dot below the arrow, just above tab icon */}
            <View style={[styles.tabDot, { backgroundColor: accent, shadowColor: accent }]} />
          </Animated.View>
        );
      })()}

      {/* ── Spotlight ring around the tab icon ────────────────────────────── */}
      {arrow.dir === "down" && "tabIdx" in arrow && (() => {
        const cx = tabCenterX(arrow.tabIdx);
        return (
          <View
            pointerEvents="none"
            style={[
              styles.spotlight,
              {
                left: cx - 24,
                bottom: 48,
                borderColor: accent,
                shadowColor: accent,
              },
            ]}
          />
        );
      })()}

      {/* ── Tooltip card ──────────────────────────────────────────────────── */}
      <View pointerEvents="box-none" style={[styles.tipWrap, tooltipPos]}>
        <View style={[styles.tooltip, { borderColor: accent, backgroundColor: c.card, shadowColor: accent }]}>
          <LinearGradient colors={[accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />

          {/* Badge + skip */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: accent, backgroundColor: accent + "18" }]}>
              <MaterialCommunityIcons
                name={cfg.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
                size={16}
                color={accent}
              />
              <Text style={[styles.badgeText, { color: accent }]}>{cfg.badge}</Text>
            </View>
            <Pressable onPress={game.skipTutorial} hitSlop={12}>
              <Text style={[styles.skip, { color: c.textDim }]}>Skip</Text>
            </Pressable>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: accent + "22" }]}>
            <View
              style={[styles.progressFill, { backgroundColor: accent, width: `${(step / TOTAL) * 100}%` as `${number}%` }]}
            />
          </View>

          <Text style={[styles.title, { color: c.text }]}>{cfg.title}</Text>
          <Text style={[styles.body,  { color: c.textDim }]}>{cfg.body}</Text>

          {/* Tap hint (step 1) */}
          {cfg.hint && (
            <View style={[styles.hintPill, { borderColor: accent + "55" }]}>
              <MaterialCommunityIcons name="gesture-tap" size={14} color={accent} />
              <Text style={[styles.hintText, { color: accent }]}>{cfg.hint}</Text>
            </View>
          )}

          {/* CTA */}
          {cfg.cta && (
            <Pressable
              onPress={game.advanceTutorial}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: accent, opacity: pressed ? 0.85 : 1, shadowColor: accent },
              ]}
            >
              <Text style={styles.ctaTxt}>{cfg.cta}</Text>
            </Pressable>
          )}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  tipWrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  tipTop:    { top: 86 },
  tipCenter: { top: "30%" },
  tipBottom: { bottom: 105 },

  tooltip: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    gap: 8,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  skip: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },

  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },

  hintPill: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  cta: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaTxt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    color: "#000",
  },

  // Arrow pointing UP at coin (step 1)
  arrowUpFixed: {
    position: "absolute",
    bottom: 265,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  // Arrow pointing DOWN at a tab icon
  arrowTabWrap: {
    position: "absolute",
    bottom: 86,
    width: 40,
    alignItems: "center",
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  // Glowing ring around the target tab icon
  spotlight: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
