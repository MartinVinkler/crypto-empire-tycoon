import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { QuestState, useQuests } from "@/context/QuestContext";
import { useColors } from "@/hooks/useColors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function fmtProgress(q: QuestState): string {
  const { type, progress, target } = q;
  if (type === "taps" || type === "buy_stocks" || type === "sell_stocks" ||
      type === "buy_upgrades" || type === "buy_properties") {
    return `${Math.floor(progress)} / ${target}`;
  }
  if (type === "earn_usd" || type === "earn_trade_usd") {
    return `$${progress.toFixed(2)} / $${target}`;
  }
  if (type === "mine_btc") {
    const dp = target < 0.01 ? 4 : target < 0.1 ? 3 : 2;
    return `${progress.toFixed(dp)} / ${target} BTC`;
  }
  return "";
}

function questIcon(type: string): string {
  if (type === "taps")           return "⚡";
  if (type === "earn_usd")       return "💵";
  if (type === "mine_btc")       return "₿";
  if (type === "buy_stocks")     return "📈";
  if (type === "sell_stocks")    return "📉";
  if (type === "earn_trade_usd") return "💹";
  if (type === "buy_upgrades")   return "🔧";
  if (type === "buy_properties") return "🏢";
  return "•";
}

function fmtReward(r: number): string {
  if (r >= 1000) return `$${(r / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${r}`;
}

// ── QuestCard ─────────────────────────────────────────────────────────────────

function QuestCard({ quest, onClaim }: { quest: QuestState; onClaim: () => void }) {
  const c = useColors();
  const pct = Math.min(1, quest.progress / quest.target);
  const done = quest.progress >= quest.target;
  const textColor = quest.claimed ? c.textDim : done ? c.neon : c.text;
  const barColor = quest.claimed ? c.textDim + "66" : done ? c.neon : c.electric;

  const cardGlow =
    Platform.OS === "web" && done && !quest.claimed
      ? ({ boxShadow: `0 0 16px ${c.neon}44` } as object)
      : {};

  return (
    <View
      style={[
        styles.card,
        cardGlow,
        {
          backgroundColor: c.card,
          borderColor: done && !quest.claimed
            ? c.neon + "88"
            : quest.claimed
            ? c.textDim + "33"
            : c.electric + "44",
        },
      ]}
    >
      {/* Top row: icon + label + reward */}
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{questIcon(quest.type)}</Text>
        <Text style={[styles.cardLabel, { color: textColor }]} numberOfLines={1}>
          {quest.label}
        </Text>
        <Text style={[styles.cardReward, { color: c.neon }]}>
          {fmtReward(quest.reward)}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: c.electric + "20" }]}>
        <View style={[styles.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: barColor }]} />
      </View>

      {/* Bottom row: progress text + action */}
      <View style={styles.cardBottom}>
        <Text style={[styles.progressText, { color: c.textDim }]}>
          {fmtProgress(quest)}
        </Text>

        {quest.claimed ? (
          <View style={[styles.badge, { borderColor: c.textDim + "44" }]}>
            <Text style={[styles.badgeText, { color: c.textDim }]}>✓ CLAIMED</Text>
          </View>
        ) : done ? (
          <Pressable
            onPress={onClaim}
            style={({ pressed }) => [
              styles.claimBtn,
              {
                borderColor: c.neon,
                backgroundColor: pressed ? c.neon + "40" : c.neon + "20",
              },
            ]}
          >
            <Text style={[styles.claimText, { color: c.neon }]}>CLAIM</Text>
          </Pressable>
        ) : (
          <View style={[styles.badge, { borderColor: c.electric + "44" }]}>
            <Text style={[styles.badgeText, { color: c.electric + "99" }]}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── QuestModal ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuestModal({ visible, onClose }: Props) {
  const c = useColors();
  const { quests, claimReward, timeUntilResetMs } = useQuests();

  const claimable = quests.filter((q) => !q.claimed && q.progress >= q.target).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[styles.sheet, { backgroundColor: c.background, borderColor: c.electric + "55" }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: c.electric + "44" }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: c.electric }]}>DAILY QUESTS</Text>
            {claimable > 0 && (
              <View style={[styles.claimableBadge, { backgroundColor: c.neon, }]}>
                <Text style={styles.claimableBadgeText}>{claimable}</Text>
              </View>
            )}
          </View>
          <View style={[styles.countdown, { borderColor: c.electric + "55", backgroundColor: c.electric + "12" }]}>
            <Text style={[styles.countdownText, { color: c.electric }]}>
              ↺ {fmtCountdown(timeUntilResetMs)}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: c.electric + "55" }]}
            hitSlop={8}
          >
            <Text style={[styles.closeBtnText, { color: c.textDim }]}>✕</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: c.textDim }]}>
          3 QUESTS PER DAY · COMPLETE TO EARN CASH REWARDS
        </Text>

        {/* Quest cards */}
        <View style={styles.questList}>
          {quests.map((q) => (
            <QuestCard key={q.id} quest={q} onClaim={() => claimReward(q.id)} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ── QUESTS button (for use in header) ─────────────────────────────────────────

interface BtnProps {
  onPress: () => void;
  hasClaimable?: boolean;
}

export function QuestsButton({ onPress, hasClaimable }: BtnProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.questsBtn,
        {
          borderColor: hasClaimable ? c.neon : c.electric + "88",
          backgroundColor: hasClaimable
            ? c.neon + (pressed ? "30" : "18")
            : c.electric + (pressed ? "22" : "10"),
        },
      ]}
    >
      <Text style={[styles.questsBtnText, { color: hasClaimable ? c.neon : c.electric }]}>
        QUESTS {hasClaimable ? "✦" : ""}
      </Text>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    letterSpacing: 2.5,
    fontFamily: "Inter_700Bold",
  },
  claimableBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  claimableBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  countdown: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },

  // Quest cards
  questList: {
    gap: 10,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  cardReward: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  track: {
    height: 5,
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    height: 5,
    borderRadius: 5,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  claimBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  claimText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  // Header QUESTS button
  questsBtn: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  questsBtnText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
  },
});
