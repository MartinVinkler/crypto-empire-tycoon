import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { MiniSparkline } from "@/components/MiniSparkline";
import { Holding, formatUSD } from "@/context/GameContext";
import { MarketState } from "@/data/market";
import { StockDef } from "@/data/stocks";
import { useColors } from "@/hooks/useColors";

interface Props {
  def: StockDef;
  state: MarketState;
  holding?: Holding;
  onPress: () => void;
}

export function StockListItem({ def, state, holding, onPress }: Props) {
  const c = useColors();
  const up = state.changePct >= 0;
  const color = up ? c.neon : c.danger;

  const pl = holding
    ? ((state.price - holding.totalCostUSD / Math.max(holding.shares, 1e-9)) /
        (holding.totalCostUSD / Math.max(holding.shares, 1e-9))) *
      100
    : 0;

  const tierColor =
    def.tier === "volatile" ? c.amber : def.tier === "stable" ? c.electric : c.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: c.border,
          backgroundColor: c.glass,
          opacity: pressed ? 0.85 : 1,
          shadowColor: color,
        },
      ]}
    >
      <View style={[styles.logo, { backgroundColor: def.accent + "22", borderColor: def.accent }]}>
        <Text style={[styles.glyph, { color: def.accent }]}>{def.glyph || def.symbol[0]}</Text>
      </View>

      <View style={styles.middle}>
        <View style={styles.middleTop}>
          <Text style={[styles.symbol, { color: c.text }]}>{def.symbol}</Text>
          <View style={[styles.tierPill, { borderColor: tierColor + "55" }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {def.tier === "volatile" ? "HIGH VOL" : def.tier === "stable" ? "STABLE" : "BALANCED"}
            </Text>
          </View>
        </View>
        <Text style={[styles.name, { color: c.textDim }]} numberOfLines={1}>
          {def.name}
        </Text>
        {holding ? (
          <Text style={[styles.held, { color: pl >= 0 ? c.neon : c.danger }]}>
            {holding.shares.toFixed(4)} sh  ·  {pl >= 0 ? "+" : ""}{pl.toFixed(2)}%
          </Text>
        ) : (
          <View style={styles.spark}>
            <MiniSparkline
              data={state.history.slice(-40)}
              width={120}
              height={18}
              color={color + "cc"}
            />
          </View>
        )}
      </View>

      <View style={styles.right}>
        <Text style={[styles.price, Platform.OS === "web" ? { color, textShadow: `0 0 8px ${color}` } as object : { color, textShadowColor: color, textShadowRadius: 8 }]}>
          {formatUSD(state.price)}
        </Text>
        <View style={styles.changeRow}>
          <MaterialCommunityIcons
            name={up ? "trending-up" : "trending-down"}
            size={12}
            color={color}
          />
          <Text style={[styles.change, { color }]}>
            {up ? "+" : ""}{state.changePct.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  glyph: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  middleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  symbol: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  name: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  held: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  spark: {
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  change: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
