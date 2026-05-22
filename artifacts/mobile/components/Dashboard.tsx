import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";

import { PriceChart } from "@/components/PriceChart";
import {
  formatCrypto,
  formatRate,
  formatUSD,
  useGame,
} from "@/context/GameContext";
import {
  PRESTIGE_THRESHOLD_USD,
} from "@/data/constants";
import { useColors } from "@/hooks/useColors";

export function Dashboard() {
  const c = useColors();
  const game = useGame();
  const screenW = Dimensions.get("window").width;
  const chartW = screenW - 36 - 28;

  const change = useMemo(() => {
    const first = game.priceHistory[0] ?? game.cryptoPrice;
    const last = game.cryptoPrice;
    return ((last - first) / first) * 100;
  }, [game.priceHistory, game.cryptoPrice]);

  const isUp = change >= 0;
  const prestigePct = Math.min(100, (game.balanceUSD / PRESTIGE_THRESHOLD_USD) * 100);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { borderColor: c.borderBright, backgroundColor: c.card }]}>
        <LinearGradient
          colors={[c.neon + "12", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroHeader}>
          <View>
            <Text style={[styles.heroLabel, { color: c.textDim }]}>NET WORTH</Text>
            <Text style={[styles.heroValue, { color: c.neon }]}>
              {formatUSD(game.balanceUSD)}
            </Text>
            <Text style={[styles.heroSub, { color: c.textMuted }]}>
              {formatCrypto(game.balanceCrypto)} BTC  ·  {formatRate(game.miningPower * game.prestigeMultiplier * (game.isBoostActive ? 3 : 1))}
            </Text>
          </View>
          <View
            style={[
              styles.changePill,
              {
                borderColor: isUp ? c.neon : c.danger,
                backgroundColor: (isUp ? c.neon : c.danger) + "1a",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isUp ? "arrow-top-right" : "arrow-bottom-right"}
              size={14}
              color={isUp ? c.neon : c.danger}
            />
            <Text
              style={{
                color: isUp ? c.neon : c.danger,
                fontFamily: "Inter_700Bold",
                fontSize: 12,
              }}
            >
              {isUp ? "+" : ""}
              {change.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.chartCard, { borderColor: c.border, backgroundColor: c.card }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.bigTitle, { color: c.text }]}>BTC / USD</Text>
          <View style={[styles.livePill, { borderColor: c.neon, backgroundColor: c.neon + "1a" }]}>
            <View style={[styles.liveDot, { backgroundColor: c.neon, shadowColor: c.neon }]} />
            <Text style={[styles.liveText, { color: c.neon }]}>LIVE</Text>
          </View>
          <Text style={[styles.volatileTag, { color: Math.abs(change) > 4 ? c.amber : c.electric }]}>
            ({Math.abs(change) > 4 ? "VOLATILE" : "STABLE"})
          </Text>
        </View>
        <View style={styles.chartHeader}>
          <Text style={[styles.priceBig, { color: c.text }]}>
            {formatUSD(game.cryptoPrice)}
          </Text>
          <Text style={{ color: c.textDim, fontSize: 11, fontFamily: "Inter_500Medium" }}>
            30s window
          </Text>
        </View>
        <PriceChart data={game.priceHistory} width={chartW} height={170} />
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.gridCard, { borderColor: c.border, backgroundColor: c.card }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={c.amber} />
          <Text style={[styles.gridLabel, { color: c.textDim }]}>HASHRATE</Text>
          <Text style={[styles.gridValue, { color: c.text }]}>
            {formatRate(game.miningPower)}
          </Text>
          <Text style={[styles.gridSub, { color: c.textMuted }]}>
            base passive income
          </Text>
        </View>
        <View style={[styles.gridCard, { borderColor: c.border, backgroundColor: c.card }]}>
          <MaterialCommunityIcons name="cursor-default-click" size={20} color={c.electric} />
          <Text style={[styles.gridLabel, { color: c.textDim }]}>PER TAP</Text>
          <Text style={[styles.gridValue, { color: c.text }]}>
            {formatCrypto(game.clickValue)}
          </Text>
          <Text style={[styles.gridSub, { color: c.textMuted }]}>BTC per click</Text>
        </View>
      </View>

      <View style={[styles.prestigeCard, { borderColor: c.magenta + "55", backgroundColor: c.card }]}>
        <LinearGradient
          colors={[c.magenta + "18", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.prestigeHeader}>
          <MaterialCommunityIcons name="source-fork" size={20} color={c.magenta} />
          <Text style={[styles.prestigeTitle, { color: c.magenta }]}>HARD FORK PROGRESS</Text>
        </View>
        <Text style={[styles.gridValue, { color: c.text, marginTop: 4 }]}>
          {formatUSD(game.balanceUSD)} / {formatUSD(PRESTIGE_THRESHOLD_USD)}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: c.bgElevated }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${prestigePct}%`,
                backgroundColor: c.magenta,
                shadowColor: c.magenta,
              },
            ]}
          />
        </View>
        <Text style={[styles.gridSub, { color: c.textMuted, marginTop: 6 }]}>
          Forks performed: {game.prestigeCount}  ·  Permanent multiplier: x{game.prestigeMultiplier}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: "Inter_600SemiBold",
  },
  heroValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
  },
  priceBig: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  bigTitle: {
    fontSize: 16,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  liveText: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
  },
  volatileTag: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  gridLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
  },
  gridValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  gridSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  prestigeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
  },
  prestigeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prestigeTitle: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
