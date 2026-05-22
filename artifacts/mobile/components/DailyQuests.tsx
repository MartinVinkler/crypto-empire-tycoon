import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useQuests } from "@/context/QuestContext";
import { useColors } from "@/hooks/useColors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function fmtProgress(type: string, progress: number, target: number): string {
  if (type === "taps") return `${Math.floor(progress)} / ${target}`;
  if (type === "earn_usd") return `$${progress.toFixed(2)} / $${target}`;
  if (type === "mine_btc") {
    const dp = target < 0.01 ? 4 : target < 0.1 ? 3 : 2;
    return `${progress.toFixed(dp)} / ${target} BTC`;
  }
  return "";
}

function fmtReward(r: number): string {
  if (r >= 1000) return `$${(r / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${r}`;
}

function questIcon(type: string): string {
  if (type === "taps")     return "⚡";
  if (type === "earn_usd") return "💵";
  if (type === "mine_btc") return "₿";
  return "•";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyQuests() {
  const c = useColors();
  const { quests, claimReward, timeUntilResetMs } = useQuests();

  const cardGlow = useMemo(() => {
    if (Platform.OS !== "web") return {};
    return {
      // @ts-ignore web-only
      boxShadow: `0 0 12px ${c.electric}40, 0 0 28px ${c.electric}20`,
    };
  }, [c.electric]);

  if (quests.length === 0) return null;

  return (
    <View style={[styles.card, cardGlow, { backgroundColor: c.card, borderColor: c.electric + "66" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.electric }]}>DAILY QUESTS</Text>
        <View style={[styles.countdownPill, { borderColor: c.electric + "55", backgroundColor: c.electric + "12" }]}>
          <Text style={[styles.countdown, { color: c.electric }]}>
            ↺ {fmtCountdown(timeUntilResetMs)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: c.electric + "30" }]} />

      {/* Quest rows */}
      {quests.map((q) => {
        const pct = Math.min(1, q.progress / q.target);
        const done = q.progress >= q.target;
        const rowColor = q.claimed ? c.textDim : done ? c.neon : c.text;
        const barColor = q.claimed ? c.textDim : done ? c.neon : c.electric;

        return (
          <View key={q.id} style={styles.questRow}>
            {/* Left: icon + label + progress */}
            <View style={styles.questLeft}>
              <View style={styles.labelRow}>
                <Text style={[styles.icon, { color: rowColor }]}>{questIcon(q.type)}</Text>
                <Text style={[styles.label, { color: rowColor }]} numberOfLines={1}>
                  {q.label}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.track, { backgroundColor: c.electric + "20" }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct * 100}%` as `${number}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.progressText, { color: c.textDim }]}>
                {fmtProgress(q.type, q.progress, q.target)}
              </Text>
            </View>

            {/* Right: reward + claim button */}
            <View style={styles.questRight}>
              <Text style={[styles.reward, { color: c.neon }]}>{fmtReward(q.reward)}</Text>
              {q.claimed ? (
                <View style={[styles.claimedBadge, { borderColor: c.textDim + "55" }]}>
                  <Text style={[styles.claimedText, { color: c.textDim }]}>✓ DONE</Text>
                </View>
              ) : done ? (
                <Pressable
                  onPress={() => claimReward(q.id)}
                  style={({ pressed }) => [
                    styles.claimBtn,
                    { borderColor: c.neon, backgroundColor: c.neon + (pressed ? "33" : "18") },
                  ]}
                >
                  <Text style={[styles.claimText, { color: c.neon }]}>CLAIM</Text>
                </Pressable>
              ) : (
                <View style={[styles.claimedBadge, { borderColor: c.electric + "33" }]}>
                  <Text style={[styles.claimedText, { color: c.electric + "88" }]}>
                    {Math.round(pct * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 12,
    gap: 0,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontFamily: "Inter_700Bold",
  },
  countdownPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdown: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },

  divider: {
    height: 1,
    marginBottom: 10,
  },

  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  questLeft: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  icon: {
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    flex: 1,
  },

  track: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 4,
  },

  progressText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },

  questRight: {
    alignItems: "center",
    gap: 5,
    minWidth: 64,
  },
  reward: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  claimBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  claimText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  claimedBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimedText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
