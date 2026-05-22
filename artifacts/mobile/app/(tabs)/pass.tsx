import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBattlePass } from "@/context/BattlePassContext";
import { FREE_TIERS, PassTier, TOTAL_TIERS } from "@/lib/battle-pass-data";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";

const CARD_W = 88;
const CARD_GAP = 10;

function RewardCell({
  reward,
  unlocked,
  claimed,
  isPremiumRow,
  onClaim,
}: {
  reward: { label: string; icon: string; color: string; kind: string } | null;
  unlocked: boolean;
  claimed: boolean;
  isPremiumRow: boolean;
  onClaim: () => void;
}) {
  const c = useColors();

  if (!reward) {
    return (
      <View style={[styles.rewardCell, { backgroundColor: c.card, opacity: 0.25 }]}>
        <MaterialCommunityIcons name="minus" size={18} color={c.textMuted} />
      </View>
    );
  }

  const borderColor = claimed
    ? "#39FF14"
    : unlocked
    ? reward.color
    : isPremiumRow
    ? "#A855F7"
    : c.border;

  return (
    <Pressable
      onPress={unlocked && !claimed ? onClaim : undefined}
      style={({ pressed }) => [
        styles.rewardCell,
        {
          backgroundColor: c.card,
          borderColor,
          borderWidth: claimed || unlocked ? 1.5 : 1,
          opacity: !unlocked ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {!unlocked && !claimed && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.lockOverlay, { backgroundColor: c.background }]}>
            <MaterialCommunityIcons name="lock" size={14} color={c.textMuted} />
          </View>
        </View>
      )}
      {claimed && (
        <View style={[styles.claimedBadge, { backgroundColor: "#39FF14" }]}>
          <MaterialCommunityIcons name="check" size={8} color="#000" />
        </View>
      )}
      <MaterialCommunityIcons
        name={reward.icon as any}
        size={20}
        color={claimed ? "#39FF14" : unlocked ? reward.color : c.textMuted}
      />
      <Text
        style={[
          styles.rewardLabel,
          { color: claimed ? "#39FF14" : unlocked ? reward.color : c.textMuted },
        ]}
        numberOfLines={2}
      >
        {reward.label}
      </Text>
      {unlocked && !claimed && (
        <View style={[styles.claimBtn, { backgroundColor: reward.color + "22", borderColor: reward.color }]}>
          <Text style={[styles.claimBtnTxt, { color: reward.color }]}>CLAIM</Text>
        </View>
      )}
      {claimed && (
        <View style={[styles.claimBtn, { backgroundColor: "#39FF1422", borderColor: "#39FF14" }]}>
          <Text style={[styles.claimBtnTxt, { color: "#39FF14" }]}>CLAIMED</Text>
        </View>
      )}
    </Pressable>
  );
}

function TierCard({
  tier,
  currentTier,
  isPremium,
  isFreeClaimed,
  isPremiumClaimed,
  onClaimFree,
  onClaimPremium,
  index,
}: {
  tier: PassTier;
  currentTier: number;
  isPremium: boolean;
  isFreeClaimed: (t: number) => boolean;
  isPremiumClaimed: (t: number) => boolean;
  onClaimFree: (t: number) => void;
  onClaimPremium: (t: number) => void;
  index: number;
}) {
  const c = useColors();
  const unlocked = currentTier >= tier.tier;
  const isCurrent = currentTier === tier.tier - 1;

  return (
    <View style={[styles.tierCard, isCurrent && { borderColor: "#39FF14", borderWidth: 1.5 }]}>
      {/* Premium row */}
      <RewardCell
        reward={tier.premiumReward}
        unlocked={unlocked && isPremium}
        claimed={isPremiumClaimed(tier.tier)}
        isPremiumRow
        onClaim={() => onClaimPremium(tier.tier)}
      />

      {/* Tier label */}
      <View
        style={[
          styles.tierNumWrap,
          {
            backgroundColor: unlocked ? "#39FF14" : c.card,
            borderColor: unlocked ? "#39FF14" : c.border,
          },
        ]}
      >
        <Text style={[styles.tierNum, { color: unlocked ? "#000" : c.textMuted }]}>
          {tier.tier}
        </Text>
      </View>

      {/* Free row */}
      <RewardCell
        reward={tier.freeReward}
        unlocked={unlocked && tier.freeReward !== null}
        claimed={isFreeClaimed(tier.tier)}
        isPremiumRow={false}
        onClaim={() => onClaimFree(tier.tier)}
      />
    </View>
  );
}

export default function PassScreen() {
  const c = useColors();
  const { isDark } = useSettings();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bp = useBattlePass();
  const headerGradient = isDark
    ? (["#0d0d1a", "#050505"] as const)
    : ([c.bgElevated, c.bg] as const);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const xpPct =
    bp.currentTier >= TOTAL_TIERS
      ? 1
      : bp.xpForNextTier > 0
        ? bp.xpInTier / bp.xpForNextTier
        : 0;

  // Auto-scroll to current tier on mount and when tier changes
  React.useEffect(() => {
    if (bp.currentTier <= 0) return;
    const timer = setTimeout(() => {
      const targetTier = Math.max(0, bp.currentTier - 2);
      scrollRef.current?.scrollTo({
        x: targetTier * (CARD_W + CARD_GAP),
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [bp.currentTier]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleBuyPass = async () => {
    if (buying || bp.isPremium) return;
    setBuying(true);
    try {
      const result = await bp.purchasePremium();
      if (result === "success") showToast("Premium Pass activated!");
      else if (result === "already_owned") showToast("Pass already owned this season.");
      else showToast("Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  const handleClaimFree = (tier: number) => {
    const ok = bp.claimFreeReward(tier);
    if (ok) showToast("Reward claimed!");
  };

  const handleClaimPremium = (tier: number) => {
    if (!bp.isPremium) {
      showToast("Buy Premium Pass to claim this reward.");
      return;
    }
    const ok = bp.claimPremiumReward(tier);
    if (ok) showToast("Premium reward claimed!");
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={headerGradient}
          style={[styles.header, { paddingTop: topPad + 12 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <View style={[styles.brandDot, { backgroundColor: "#A855F7", shadowColor: "#A855F7" }]} />
              <Text style={[styles.brandTxt, { color: c.text }]}>SEASON PASS</Text>
              <Text style={[styles.brandSub, { color: "#A855F7" }]}>// REWARDS</Text>
            </View>
            <View style={[styles.timerBadge, { backgroundColor: "#A855F722", borderColor: "#A855F7" }]}>
              <MaterialCommunityIcons name="clock-outline" size={11} color="#A855F7" />
              <Text style={[styles.timerTxt, { color: "#A855F7" }]}>{bp.daysLeft}d left</Text>
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpLabel, { color: c.textDim }]}>
                TIER {Math.min(bp.currentTier, TOTAL_TIERS)} / {TOTAL_TIERS}
              </Text>
              <Text style={[styles.xpLabel, { color: c.textDim }]}>
                {bp.currentTier < TOTAL_TIERS
                  ? `${bp.xpInTier} / ${bp.xpForNextTier} XP`
                  : "MAX"}
              </Text>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: c.card }]}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${xpPct * 100}%` as any,
                    backgroundColor: "#A855F7",
                  },
                ]}
              />
            </View>
            <Text style={[styles.xpHint, { color: c.textMuted }]}>
              Total XP: {bp.totalXP} · Next tier in {bp.xpForNextTier - bp.xpInTier} XP
            </Text>
          </View>

          {/* Premium CTA */}
          {!bp.isPremium ? (
            <Pressable
              onPress={handleBuyPass}
              style={({ pressed }) => [
                styles.buyBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <LinearGradient
                colors={["#7c3aed", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buyBtnGrad}
              >
                {buying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                    <Text style={styles.buyBtnTxt}>UPGRADE TO PREMIUM  $5.00</Text>
                    <Text style={styles.buyBtnSub}>60 rewards · All tiers</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.premiumBadge, { backgroundColor: "#A855F722", borderColor: "#A855F7" }]}>
              <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
              <Text style={[styles.premiumBadgeTxt, { color: "#A855F7" }]}>PREMIUM PASS ACTIVE</Text>
            </View>
          )}

          {/* Track labels */}
          <View style={styles.trackLabels}>
            <View style={styles.trackLabelRow}>
              <View style={[styles.trackDot, { backgroundColor: "#A855F7" }]} />
              <Text style={[styles.trackLabelTxt, { color: "#A855F7" }]}>
                PREMIUM — {TOTAL_TIERS} rewards
              </Text>
            </View>
            <View style={styles.trackLabelRow}>
              <View style={[styles.trackDot, { backgroundColor: "#39FF14" }]} />
              <Text style={[styles.trackLabelTxt, { color: "#39FF14" }]}>
                FREE — {FREE_TIERS} rewards
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tier scroll */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiersContent}
          style={styles.tiersScroll}
        >
          {bp.tiers.map((tier, i) => (
            <TierCard
              key={tier.tier}
              tier={tier}
              currentTier={bp.currentTier}
              isPremium={bp.isPremium}
              isFreeClaimed={bp.isFreeClaimed}
              isPremiumClaimed={bp.isPremiumClaimed}
              onClaimFree={handleClaimFree}
              onClaimPremium={handleClaimPremium}
              index={i}
            />
          ))}
        </ScrollView>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.legendTitle, { color: c.textDim }]}>HOW TO EARN XP</Text>
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="cursor-default-click-outline" size={14} color={c.neon} />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>10 taps on the mine button = <Text style={{ color: c.neon }}>1 XP</Text></Text>
          </View>
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="television-play" size={14} color="#FF6B35" />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>Watch 1 ad = <Text style={{ color: "#FF6B35" }}>5 XP</Text></Text>
          </View>
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="pickaxe" size={14} color="#FFD700" />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>$5,000 passively mined = <Text style={{ color: "#FFD700" }}>1 XP</Text></Text>
          </View>
          <View style={[styles.legendDivider, { backgroundColor: c.border }]} />
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="refresh" size={14} color="#A855F7" />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>Season resets every 30 days</Text>
          </View>
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="lock-open-outline" size={14} color="#A855F7" />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>Premium unlocks all 60 rewards</Text>
          </View>
          <View style={styles.legendRow}>
            <MaterialCommunityIcons name="chart-line" size={14} color="#A855F7" />
            <Text style={[styles.legendTxt, { color: c.textDim }]}>XP per tier increases with each tier</Text>
          </View>
        </View>
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <Text style={[styles.toastTxt, { color: c.text }]}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTxt: {
    fontSize: 13,
    letterSpacing: 2.5,
    fontFamily: "Inter_700Bold",
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontFamily: "Inter_600SemiBold",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerTxt: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  xpSection: {
    marginBottom: 14,
  },
  xpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  xpLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  xpFill: {
    height: 6,
    borderRadius: 3,
  },
  xpHint: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  buyBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  buyBtnGrad: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 2,
  },
  buyBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  buyBtnSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#ffffff99",
    letterSpacing: 0.5,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  premiumBadgeTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  trackLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  trackLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trackLabelTxt: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  tiersScroll: {
    marginTop: 14,
  },
  tiersContent: {
    paddingHorizontal: 14,
    gap: CARD_GAP,
    paddingBottom: 8,
  },
  tierCard: {
    width: CARD_W,
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: 6,
  },
  rewardCell: {
    width: CARD_W - 8,
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 6,
    overflow: "hidden",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  claimedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  claimBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 2,
  },
  claimBtnTxt: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  tierNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tierNum: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  legend: {
    marginHorizontal: 14,
    marginTop: 18,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  legendTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendTxt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  legendDivider: {
    height: 1,
    marginVertical: 6,
    opacity: 0.4,
  },
  toast: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  toastTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
