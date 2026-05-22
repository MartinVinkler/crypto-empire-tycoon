/**
 * MineAdOffer — random sponsor offer card that appears periodically on Mine screen.
 * Picks a random reward, shows a countdown badge, disappears after timeout.
 */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BOOST_DEFS, BoostType, useAds } from "@/context/AdContext";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

const OFFER_VISIBLE_MS = 22_000;
const MIN_APPEAR_MS   = 45_000;
const MAX_APPEAR_MS   = 90_000;

type MineReward =
  | { kind: "boost"; type: BoostType }
  | { kind: "cash"; multiplier: number };

const MINE_REWARDS: MineReward[] = [
  { kind: "boost", type: "2x_mine" },
  { kind: "boost", type: "3x_mine" },
  { kind: "cash",  multiplier: 50 },
];

function pickReward(): MineReward {
  return MINE_REWARDS[Math.floor(Math.random() * MINE_REWARDS.length)];
}

function rewardLabel(r: MineReward, btcPrice: number): string {
  if (r.kind === "boost") return BOOST_DEFS[r.type].label;
  return `Free $${(r.multiplier * btcPrice).toFixed(2)} Cash`;
}

function rewardIcon(r: MineReward): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  if (r.kind === "boost") return BOOST_DEFS[r.type].icon;
  return "cash-multiple";
}

function rewardColor(r: MineReward): string {
  if (r.kind === "boost") return BOOST_DEFS[r.type].color;
  return "#FFD700";
}

function rewardDesc(r: MineReward, btcPrice: number): string {
  if (r.kind === "boost") return BOOST_DEFS[r.type].description;
  return `Instant $${(r.multiplier * btcPrice).toFixed(2)} reward`;
}

export function MineAdOffer() {
  const c = useColors();
  const ads = useAds();
  const game = useGame();

  const [visible, setVisible] = useState(false);
  const [reward, setReward] = useState<MineReward>(MINE_REWARDS[0]);
  const [timeLeft, setTimeLeft] = useState(OFFER_VISIBLE_MS / 1000);
  const [watching, setWatching] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const slideY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  const dismissOffer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.current?.stop();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 80, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setClaimed(false);
      setWatching(false);
    });
  }, [opacity, slideY]);

  const showOffer = useCallback(() => {
    const r = pickReward();
    setReward(r);
    setTimeLeft(OFFER_VISIBLE_MS / 1000);
    setClaimed(false);
    setWatching(false);
    progressWidth.setValue(1);
    setVisible(true);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();

    const anim = Animated.timing(progressWidth, {
      toValue: 0,
      duration: OFFER_VISIBLE_MS,
      useNativeDriver: false,
    });
    progressAnim.current = anim;
    anim.start(({ finished }) => { if (finished) dismissOffer(); });

    let t = OFFER_VISIBLE_MS / 1000;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(Math.max(0, t));
    }, 1000);
  }, [opacity, slideY, progressWidth, dismissOffer]);

  // Schedule recurring offers
  useEffect(() => {
    const scheduleNext = () => {
      const delay = MIN_APPEAR_MS + Math.random() * (MAX_APPEAR_MS - MIN_APPEAR_MS);
      return setTimeout(() => {
        if (!ads.adNotificationsEnabled) {
          scheduleNext();
          return;
        }
        showOffer();
        // Schedule next offer after current one ends (+ random gap)
        setTimeout(() => {
          scheduleNext();
        }, OFFER_VISIBLE_MS + MIN_APPEAR_MS);
      }, delay);
    };
    const t = scheduleNext();
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showOffer, ads.adNotificationsEnabled]);

  const handleClaim = useCallback(async () => {
    if (watching || claimed) return;
    setWatching(true);
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.current?.stop();

    let ok: boolean;
    if (reward.kind === "boost") {
      ok = await ads.watchAdForBoost(reward.type).catch(() => false) as boolean;
    } else {
      ok = await ads.watchAdOnly().catch(() => false) as boolean;
      if (ok) {
        game.addCash(reward.multiplier * game.cryptoPrice);
      }
    }

    setClaimed(true);
    setWatching(false);
    setTimeout(dismissOffer, 1800);
  }, [watching, claimed, reward, ads, game, dismissOffer]);

  if (!visible) return null;

  const color = rewardColor(reward);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY: slideY }],
          borderColor: color,
          backgroundColor: c.bgElevated,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.inner}>
        {/* Sponsor tag + timer */}
        <View style={styles.topRow}>
          <View style={styles.sponsorChip}>
            <MaterialCommunityIcons name="television-play" size={10} color={color} />
            <Text style={[styles.sponsorText, { color }]}>SPONSOR OFFER</Text>
          </View>
          <Text style={[styles.timerText, { color: c.textMuted }]}>{timeLeft}s</Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: color,
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {/* Reward row + CTA */}
        <View style={styles.rewardRow}>
          <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
            <MaterialCommunityIcons name={rewardIcon(reward)} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rewardLabel, { color: c.text }]}>
              {rewardLabel(reward, game.cryptoPrice)}
            </Text>
            <Text style={[styles.rewardDesc, { color: c.textDim }]}>
              {rewardDesc(reward, game.cryptoPrice)}
            </Text>
          </View>
          <Pressable
            onPress={claimed ? undefined : handleClaim}
            style={({ pressed }) => [
              styles.claimBtn,
              {
                borderColor: color,
                backgroundColor: claimed
                  ? color + "33"
                  : pressed
                    ? color + "44"
                    : color + "22",
                opacity: watching ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.claimText, { color }]}>
              {claimed ? "✓ CLAIMED" : watching ? "..." : "WATCH AD"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    zIndex: 100,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  inner: {
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sponsorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sponsorText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  timerText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  rewardDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  claimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  claimText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
