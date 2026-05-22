import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CandlestickChart } from "@/components/CandlestickChart";
import { Holding, formatUSD, useGame } from "@/context/GameContext";
import { MarketState } from "@/data/market";
import { StockDef } from "@/data/stocks";
import { useColors } from "@/hooks/useColors";

type Timeframe = "1H" | "24H" | "2D";

const TF_CANDLES: Record<Timeframe, number> = {
  "1H":  12,
  "24H": 288,
  "2D":  576,
};

interface Props {
  def: StockDef;
  state: MarketState;
  holding?: Holding;
  onBuy: () => void;
  onSell: () => void;
}

const CARD_W = Math.min(Dimensions.get("window").width - 32, 460);
const CHART_H = 88;

// Cubic-bezier ease-out-quart: premium fluid deceleration
const EASE_OUT_QUART = Easing.bezier(0.25, 1, 0.5, 1);

export const StockCard = memo(function StockCard({
  def,
  state,
  holding,
  onBuy,
  onSell,
}: Props) {
  const c = useColors();
  const [tf, setTf] = useState<Timeframe>("24H");

  const up = state.changePct >= 0;
  const trendColor = up ? c.neon : c.danger;
  const tierColor =
    def.tier === "volatile" ? c.amber
    : def.tier === "stable"   ? c.electric
    : c.text;

  // ── Live price pulse — native driver via opacity-only overlays ────────────
  // Two separate values so we never interpolate color on the JS thread.
  const prevPriceRef = useRef(state.price);
  const flashUp   = useRef(new Animated.Value(0)).current;
  const flashDown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prev = prevPriceRef.current;
    if (prev !== state.price) {
      const isUp = state.price >= prev;
      const target = isUp ? flashUp : flashDown;
      target.setValue(0.2);
      Animated.timing(target, {
        toValue: 0,
        duration: 500,
        easing: EASE_OUT_QUART,
        useNativeDriver: true,   // opacity only — runs entirely off the JS thread
      }).start();
    }
    prevPriceRef.current = state.price;
  }, [state.price]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const slice = state.history.slice(-TF_CANDLES[tf]);
    return [...slice, state.price];
  }, [state.history, state.price, tf]);

  const { tfHigh, tfLow } = useMemo(() => {
    if (chartData.length === 0) return { tfHigh: state.price, tfLow: state.price };
    return { tfHigh: Math.max(...chartData), tfLow: Math.min(...chartData) };
  }, [chartData, state.price]);

  // ── Holdings P/L ──────────────────────────────────────────────────────────
  const avgEntry  = holding && holding.shares > 0 ? holding.totalCostUSD / holding.shares : 0;
  const plPct     = avgEntry > 0 ? ((state.price - avgEntry) / avgEntry) * 100 : 0;
  const plUSD     = holding ? holding.shares * state.price - holding.totalCostUSD : 0;
  const hasPosition = !!holding && holding.shares > 0.0001;

  const setTf1H  = useCallback(() => setTf("1H"),  []);
  const setTf24H = useCallback(() => setTf("24H"), []);
  const setTf2D  = useCallback(() => setTf("2D"),  []);
  const TF_HANDLERS: Record<Timeframe, () => void> = { "1H": setTf1H, "24H": setTf24H, "2D": setTf2D };

  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.glass, shadowColor: trendColor }]}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: def.accent + "22", borderColor: def.accent }]}>
          <Text style={[styles.glyph, { color: def.accent }]}>{def.glyph || def.symbol[0]}</Text>
        </View>

        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.symbol, { color: c.text }]}>{def.symbol}</Text>
            <View style={[styles.pill, { borderColor: tierColor + "55" }]}>
              <Text style={[styles.pillTxt, { color: tierColor }]}>
                {def.tier === "volatile" ? "HIGH VOL" : def.tier === "stable" ? "STABLE" : "BALANCED"}
              </Text>
            </View>
          </View>
          <Text style={[styles.name, { color: c.textDim }]} numberOfLines={1}>{def.name}</Text>
        </View>

        {/* Live price — two stacked opacity-only overlays, native driver */}
        <View style={[styles.priceFlashWrap, { borderRadius: 8 }]}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { borderRadius: 8, backgroundColor: c.neon, opacity: flashUp }]}
            pointerEvents="none"
          />
          <Animated.View
            style={[StyleSheet.absoluteFill, { borderRadius: 8, backgroundColor: c.danger, opacity: flashDown }]}
            pointerEvents="none"
          />
          <Text style={[styles.price, Platform.OS === "web" ? { color: trendColor, textShadow: `0 0 8px ${trendColor}` } as object : { color: trendColor, textShadowColor: trendColor, textShadowRadius: 8 }]}>
            {formatUSD(state.price)}
          </Text>
          <View style={styles.changeRow}>
            <MaterialCommunityIcons
              name={up ? "trending-up" : "trending-down"}
              size={12}
              color={trendColor}
            />
            <Text style={[styles.changeTxt, { color: trendColor }]}>
              {up ? "+" : ""}{state.changePct.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ── Live candlestick chart ────────────────────────────────────── */}
      <View style={styles.chartWrap}>
        <CandlestickChart
          data={chartData}
          width={CARD_W - 24}
          height={CHART_H}
          color={trendColor}
          showAxis={false}
          candleCount={12}
        />
      </View>

      {/* ── Timeframe toggles + H/L ──────────────────────────────────── */}
      <View style={styles.tfRow}>
        {(["1H", "24H", "2D"] as Timeframe[]).map((t) => (
          <Pressable
            key={t}
            onPress={TF_HANDLERS[t]}
            style={[
              styles.tfBtn,
              {
                borderColor: tf === t ? trendColor : c.border,
                backgroundColor: tf === t ? trendColor + "22" : "transparent",
              },
            ]}
          >
            <Text style={[styles.tfTxt, { color: tf === t ? trendColor : c.textDim }]}>{t}</Text>
          </Pressable>
        ))}
        <View style={styles.tfSpacer} />
        <Text style={[styles.statLabel, { color: c.textDim }]}>H </Text>
        <Text style={[styles.statVal, { color: c.neon }]}>{formatUSD(tfHigh)}</Text>
        <Text style={[styles.statSep, { color: c.textDim }]}> · </Text>
        <Text style={[styles.statLabel, { color: c.textDim }]}>L </Text>
        <Text style={[styles.statVal, { color: c.danger }]}>{formatUSD(tfLow)}</Text>
      </View>

      {/* ── Position row ─────────────────────────────────────────────── */}
      {hasPosition && (
        <View style={[styles.posRow, { borderColor: c.border + "55", backgroundColor: c.card + "88" }]}>
          <Text style={[styles.posLabel, { color: c.textDim }]}>
            {holding!.shares.toFixed(4)} sh
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.posPL, { color: plPct >= 0 ? c.neon : c.danger }]}>
            {plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%{"  "}
            {plUSD >= 0 ? "+" : ""}{formatUSD(Math.abs(plUSD))}
          </Text>
        </View>
      )}

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={onBuy}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: c.neon,
              backgroundColor: pressed ? c.neon + "55" : c.neon + "18",
              flex: 1,
            },
          ]}
        >
          <Text style={[styles.actionTxt, { color: c.neon }]}>BUY</Text>
        </Pressable>

        <Pressable
          onPress={onSell}
          disabled={!hasPosition}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: hasPosition ? c.danger : c.border,
              backgroundColor: pressed
                ? c.danger + "55"
                : hasPosition
                  ? c.danger + "18"
                  : c.border + "11",
              flex: 1,
              opacity: hasPosition ? 1 : 0.4,
            },
          ]}
        >
          <Text style={[styles.actionTxt, { color: hasPosition ? c.danger : c.textDim }]}>
            SELL
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,             // Android depth shadow
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  symbol: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillTxt: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  name: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  priceFlashWrap: {
    alignItems: "flex-end",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: "hidden",
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  changeTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  chartWrap: {
    marginHorizontal: -12,
    marginVertical: -2,
    paddingHorizontal: 12,
  },
  tfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tfTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  tfSpacer: { flex: 1 },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  statVal: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  statSep: { fontSize: 10 },
  posRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  posLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  posPL: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTxt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
