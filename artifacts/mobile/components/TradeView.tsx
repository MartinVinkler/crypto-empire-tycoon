import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CandlestickChart } from "@/components/CandlestickChart";
import { useAds } from "@/context/AdContext";
import { Holding, formatUSD, useGame } from "@/context/GameContext";
import { useQuests } from "@/context/QuestContext";
import { useTradeToast } from "@/context/TradeToastContext";
import { StockDef } from "@/data/stocks";
import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";

type Timeframe = "LIVE" | "1H" | "24H" | "3D";

// Candle counts: 24H=288 means each candle ≈ 5 min.
// LIVE = last 60 ticks (~5 min of 5-sec updates), 3D = 3 × 288 = 864
const TF_CANDLES: Record<Timeframe, number> = {
  LIVE: 60,
  "1H": 12,
  "24H": 288,
  "3D": 864,
};

interface Props {
  def: StockDef | null;
  initialMode?: "buy" | "sell";
  onClose: () => void;
}

function fmtShares(n: number): string {
  if (n === 0) return "0";
  if (n >= 100) return n.toFixed(2);
  if (n >= 1)   return n.toFixed(3);
  return n.toFixed(4);
}

export function TradeView({ def, initialMode = "buy", onClose }: Props) {
  const c = useColors();
  const game = useGame();
  const ads = useAds();
  const { playPurchase, playError } = useSFX();
  const { showToast } = useTradeToast();
  const { recordStockBuy, recordStockSell } = useQuests();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const [tf, setTf] = useState<Timeframe>("24H");

  const state = def ? game.market[def.symbol] : null;
  const holding: Holding | undefined = def ? game.holdings[def.symbol] : undefined;
  const visible = !!def && !!state;

  const screenW = Dimensions.get("window").width;
  const chartW = Math.min(screenW, 460) - 36;

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setAmount("");
    }
  }, [visible, initialMode]);

  // ── Derived values ────────────────────────────────────────────────────────

  const avgEntry = holding && holding.shares > 0
    ? holding.totalCostUSD / holding.shares : 0;
  const positionValue = holding && state ? holding.shares * state.price : 0;
  const unrealizedUSD = holding ? positionValue - holding.totalCostUSD : 0;
  const unrealizedPct = avgEntry > 0
    ? ((( state?.price ?? avgEntry) - avgEntry) / avgEntry) * 100 : 0;

  const hasPosition = !!holding && holding.shares > 0;
  const plPositive = unrealizedUSD >= 0;
  const plColor = plPositive ? c.neon : c.danger;

  const up = (state?.changePct ?? 0) >= 0;
  const priceColor = up ? c.neon : c.danger;

  const usdAmount = useMemo(() => {
    const n = parseFloat(amount);
    return isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const sharesEstimate = useMemo(() => {
    if (!state || state.price <= 0) return 0;
    return usdAmount / state.price;
  }, [state, usdAmount]);

  // Chart data — timeframe slice + live price appended
  const chartData = useMemo(() => {
    if (!state) return [];
    const slice = state.history.slice(-TF_CANDLES[tf]);
    return [...slice, state.price];
  }, [state, tf]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onMax = () => {
    if (mode === "buy") {
      setAmount(game.cashUSD.toFixed(2));
    } else if (holding) {
      setAmount((holding.shares * (state?.price ?? 1)).toFixed(2));
    }
  };

  const onConfirm = () => {
    if (!def) return;
    let ok = false;
    if (mode === "buy" && usdAmount > 0) {
      ok = game.buyStock(def.symbol, usdAmount);
      if (ok) { setAmount(""); recordStockBuy(usdAmount); }
    } else if (mode === "sell") {
      if (usdAmount > 0 && state) {
        const sharesSold = usdAmount / state.price;
        ok = game.sellStock(def.symbol, sharesSold, ads.profitMultiplier);
        if (ok) {
          setAmount("");
          const avgCost = holding && holding.shares > 0
            ? holding.totalCostUSD / holding.shares : 0;
          const profitPct = avgCost > 0
            ? ((state.price - avgCost) / avgCost) * 100 : 0;
          const profitUSD = (state.price - avgCost) * sharesSold;
          recordStockSell(profitUSD);
          showToast({ symbol: def.symbol, shares: sharesSold, profitUSD, profitPct });
        }
      } else if (holding) {
        const sharesSold = holding.shares;
        const avgCost = holding.shares > 0
          ? holding.totalCostUSD / holding.shares : 0;
        ok = game.sellStock(def.symbol, sharesSold, ads.profitMultiplier);
        if (ok) {
          setAmount("");
          const profitPct = avgCost > 0 && state
            ? ((state.price - avgCost) / avgCost) * 100 : 0;
          const profitUSD = state ? (state.price - avgCost) * sharesSold : 0;
          recordStockSell(profitUSD);
          showToast({ symbol: def.symbol, shares: sharesSold, profitUSD, profitPct });
        }
      }
    }
    if (ok) playPurchase(); else playError();
  };

  const onSellAll = () => {
    if (!def || !holding) return;
    const sharesSold = holding.shares;
    const avgCost = holding.shares > 0
      ? holding.totalCostUSD / holding.shares : 0;
    const ok = game.sellStock(def.symbol, sharesSold, ads.profitMultiplier);
    if (ok) {
      setAmount("");
      playPurchase();
      const profitPct = avgCost > 0 && state
        ? ((state.price - avgCost) / avgCost) * 100 : 0;
      const profitUSD = state ? (state.price - avgCost) * sharesSold : 0;
      recordStockSell(profitUSD);
      showToast({ symbol: def.symbol, shares: sharesSold, profitUSD, profitPct });
    } else {
      playError();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: "rgba(2,5,10,0.78)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <LinearGradient
            colors={[priceColor + "16", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Header ──────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.logo, { backgroundColor: def?.accent + "22", borderColor: def?.accent ?? c.border }]}>
                  <Text style={[styles.glyph, { color: def?.accent ?? c.text }]}>
                    {def?.glyph || def?.symbol[0]}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.symbol, { color: c.text }]}>{def?.symbol}</Text>
                  <Text style={[styles.name, { color: c.textDim }]}>{def?.name}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                <Ionicons name="close" size={22} color={c.textDim} />
              </Pressable>
            </View>

            {/* ── Live price ──────────────────────────────────── */}
            <View style={styles.priceRow}>
              <Text
                style={[
                  styles.priceBig,
                  Platform.OS === "web"
                    ? { color: priceColor, textShadow: `0 0 14px ${priceColor}` } as object
                    : { color: priceColor, textShadowColor: priceColor, textShadowRadius: 14 },
                ]}
              >
                {state ? formatUSD(state.price) : "—"}
              </Text>
              <View
                style={[
                  styles.changePill,
                  { borderColor: priceColor, backgroundColor: priceColor + "1f" },
                ]}
              >
                <MaterialCommunityIcons
                  name={up ? "trending-up" : "trending-down"}
                  size={14}
                  color={priceColor}
                />
                <Text style={[styles.changeText, { color: priceColor }]}>
                  {up ? "+" : ""}{state?.changePct.toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* ── Chart ───────────────────────────────────────── */}
            {state && chartData.length >= 2 && (
              <View style={[styles.chartCard, { borderColor: c.border, backgroundColor: c.card }]}>
                <CandlestickChart
                  data={chartData}
                  width={chartW}
                  height={170}
                  color={priceColor}
                  interactive
                  zoomable
                  showAxis
                  candleCount={12}
                />
                {/* Timeframe toggles */}
                <View style={styles.tfRow}>
                  {(["LIVE", "1H", "24H", "3D"] as Timeframe[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setTf(t)}
                      style={[
                        styles.tfBtn,
                        {
                          borderColor: tf === t ? priceColor : c.border,
                          backgroundColor: tf === t ? priceColor + "22" : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tfTxt,
                          { color: tf === t ? priceColor : c.textDim },
                        ]}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ── YOUR POSITION card ──────────────────────────── */}
            {hasPosition && (
              <View
                style={[
                  styles.positionCard,
                  { borderColor: plColor + "44", backgroundColor: c.glass },
                ]}
              >
                <LinearGradient
                  colors={[plColor + "14", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />

                {/* Card header */}
                <View style={styles.posCardHeader}>
                  <Text style={[styles.posCardTitle, { color: c.textDim }]}>
                    YOUR POSITION
                  </Text>
                  <Text style={[styles.posCardShares, { color: c.textDim }]}>
                    {fmtShares(holding?.shares ?? 0)} shares
                  </Text>
                </View>

                {/* P/L — hero stat */}
                <View style={styles.plHeroRow}>
                  <Text
                    style={[
                      styles.plHeroAmt,
                      {
                        ...(Platform.OS === "web"
                          ? { color: plColor, textShadow: `0 0 16px ${plColor}` } as object
                          : { color: plColor, textShadowColor: plColor, textShadowRadius: 16 }),
                      },
                    ]}
                  >
                    {plPositive ? "+" : "−"}{formatUSD(Math.abs(unrealizedUSD))}
                  </Text>
                  <View
                    style={[
                      styles.plPctBadge,
                      { borderColor: plColor + "55", backgroundColor: plColor + "18" },
                    ]}
                  >
                    <Text style={[styles.plPctTxt, { color: plColor }]}>
                      {unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(2)}%
                    </Text>
                  </View>
                </View>

                {/* Value + Avg Entry row */}
                <View style={styles.posStatRow}>
                  <View style={styles.posStat}>
                    <Text style={[styles.posStatLabel, { color: c.textDim }]}>VALUE</Text>
                    <Text style={[styles.posStatValue, { color: c.text }]}>
                      {formatUSD(positionValue)}
                    </Text>
                  </View>
                  <View style={[styles.posStatDivider, { backgroundColor: c.border }]} />
                  <View style={styles.posStat}>
                    <Text style={[styles.posStatLabel, { color: c.textDim }]}>AVG ENTRY</Text>
                    <Text style={[styles.posStatValue, { color: c.text }]}>
                      {avgEntry > 0 ? formatUSD(avgEntry) : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Trade panel ─────────────────────────────────── */}
            <View style={styles.tradePanel}>
              {/* BUY / SELL tabs */}
              <View style={[styles.modeTabs, { backgroundColor: c.card, borderColor: c.border }]}>
                <Pressable
                  onPress={() => setMode("buy")}
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: mode === "buy" ? c.neon + "22" : "transparent",
                      borderColor: mode === "buy" ? c.neon : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.modeTxt, { color: mode === "buy" ? c.neon : c.textDim }]}>
                    BUY
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("sell")}
                  disabled={!holding}
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: mode === "sell" ? c.danger + "22" : "transparent",
                      borderColor: mode === "sell" ? c.danger : "transparent",
                      opacity: holding ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={[styles.modeTxt, { color: mode === "sell" ? c.danger : c.textDim }]}>
                    SELL
                  </Text>
                </Pressable>
              </View>

              {/* Cash / position info */}
              <View style={styles.cashRow}>
                {mode === "buy" ? (
                  <>
                    <Text style={[styles.cashLabel, { color: c.textDim }]}>AVAILABLE CASH</Text>
                    <Text style={[styles.cashValue, { color: c.neon }]}>{formatUSD(game.cashUSD)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.cashLabel, { color: c.textDim }]}>POSITION VALUE</Text>
                    <Text style={[styles.cashValue, { color: c.danger }]}>{formatUSD(positionValue)}</Text>
                  </>
                )}
              </View>

              {/* Amount input */}
              <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.card }]}>
                <Text style={[styles.dollar, { color: c.textDim }]}>$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={c.textMuted}
                  style={[styles.input, { color: c.text }]}
                />
                <Pressable
                  onPress={onMax}
                  style={({ pressed }) => [
                    styles.maxBtn,
                    { borderColor: c.electric, backgroundColor: c.electric + "1a", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.maxText, { color: c.electric }]}>MAX</Text>
                </Pressable>
              </View>

              {sharesEstimate > 0 && (
                <Text style={[styles.estimate, { color: c.textDim }]}>
                  ≈ {fmtShares(sharesEstimate)} shares @ {state ? formatUSD(state.price) : "—"}
                </Text>
              )}

              {/* Quick sell fractions */}
              {mode === "sell" && holding && holding.shares > 0 && (
                <View style={styles.fracRow}>
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <Pressable
                      key={f}
                      onPress={() =>
                        setAmount(((holding.shares * f) * (state?.price ?? 1)).toFixed(2))
                      }
                      style={[styles.fracBtn, { borderColor: c.danger + "66" }]}
                    >
                      <Text style={[styles.fracTxt, { color: c.danger }]}>
                        {f === 1 ? "ALL" : `${f * 100}%`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Confirm button */}
              <Pressable
                onPress={onConfirm}
                disabled={
                  mode === "buy"
                    ? usdAmount <= 0 || usdAmount > game.cashUSD
                    : !holding || (usdAmount > 0 && (!state || usdAmount > positionValue))
                }
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    backgroundColor: mode === "buy" ? c.neon : c.danger,
                    shadowColor: mode === "buy" ? c.neon : c.danger,
                    opacity:
                      (mode === "buy"
                        ? usdAmount <= 0 || usdAmount > game.cashUSD
                        : !holding)
                        ? 0.4
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={mode === "buy" ? "arrow-up-bold" : "arrow-down-bold"}
                  size={16}
                  color={mode === "buy" ? "#021403" : "#fff"}
                />
                <Text
                  style={[
                    styles.confirmTxt,
                    { color: mode === "buy" ? "#021403" : "#fff" },
                  ]}
                >
                  {mode === "buy" ? "CONFIRM BUY" : "CONFIRM SELL"}
                </Text>
              </Pressable>

              {/* Close entire position */}
              {mode === "sell" && holding && holding.shares > 0 && (
                <Pressable
                  onPress={onSellAll}
                  style={({ pressed }) => [
                    styles.sellAllBtn,
                    { borderColor: c.danger + "55", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.sellAllText, { color: c.danger }]}>
                    Close Entire Position ({fmtShares(holding.shares)} sh)
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "94%",
    overflow: "hidden",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  symbol: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  name: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // Price row
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceBig: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  changeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  // Chart
  chartCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 10,
  },
  tfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  tfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tfTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  // Position card
  positionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  posCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  posCardTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  posCardShares: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  plHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plHeroAmt: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  plPctBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  plPctTxt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  posStatRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  posStat: {
    flex: 1,
    gap: 3,
  },
  posStatDivider: {
    width: 1,
    marginHorizontal: 14,
    alignSelf: "stretch",
  },
  posStatLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: "Inter_700Bold",
  },
  posStatValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },

  // Trade panel
  tradePanel: {
    gap: 10,
  },
  modeTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  modeTxt: {
    fontSize: 13,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  cashRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cashLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: "Inter_600SemiBold",
  },
  cashValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    gap: 8,
  },
  dollar: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  maxBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  maxText: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: "Inter_700Bold",
  },
  estimate: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  fracRow: {
    flexDirection: "row",
    gap: 6,
  },
  fracBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  fracTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  confirmTxt: {
    fontSize: 15,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  sellAllBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sellAllText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: "Inter_600SemiBold",
  },
});
