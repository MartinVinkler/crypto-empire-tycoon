import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  ListRenderItem,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StockCard } from "@/components/StockCard";
import { TradeView } from "@/components/TradeView";
import { useAds, adsForWalletBoost } from "@/context/AdContext";
import { formatCrypto, formatUSD, useGame } from "@/context/GameContext";
import { STOCKS, StockDef } from "@/data/stocks";
import { useColors } from "@/hooks/useColors";

// Cubic-bezier ease-in-out-sine: smooth pulse
const EASE_SINE = Easing.bezier(0.45, 0, 0.55, 1);

export function TradeFloor() {
  const c = useColors();
  const game = useGame();
  const ads = useAds();
  const [active, setActive] = useState<StockDef | null>(null);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [showBtcPanel, setShowBtcPanel] = useState(false);
  const [btcBoostLoading, setBtcBoostLoading] = useState(false);

  const totalEquity = game.cashUSD + game.portfolioValueUSD;

  // ── Pulsing LIVE dot — useNativeDriver: true (opacity only) ──────────────
  const dotPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.15, duration: 700, easing: EASE_SINE, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,    duration: 700, easing: EASE_SINE, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const sortedStocks = useMemo(() => {
    return [...STOCKS].sort((a, b) => {
      const ah = game.holdings[a.symbol] ? 1 : 0;
      const bh = game.holdings[b.symbol] ? 1 : 0;
      if (ah !== bh) return bh - ah;
      return (
        Math.abs(game.market[b.symbol].changePct) -
        Math.abs(game.market[a.symbol].changePct)
      );
    });
  }, [game.holdings, game.market]);

  const handleBtcBoost = useCallback(async () => {
    if (btcBoostLoading) return;
    const ready = ads.isBtcBoostReady(game.balanceUSD);
    if (ready) {
      game.addCash(game.balanceUSD);
      ads.claimBtcBoost();
    } else {
      setBtcBoostLoading(true);
      await ads.watchAdForBtcBoost();
      setBtcBoostLoading(false);
    }
  }, [ads, game, btcBoostLoading]);

  const handleSellBtc = useCallback((fraction: number) => {
    const amount = game.balanceCrypto * fraction;
    if (amount > 0) game.sellBTC(amount);
  }, [game.balanceCrypto, game.sellBTC]);

  const openBuy  = useCallback((def: StockDef) => { setTradeMode("buy");  setActive(def); }, []);
  const openSell = useCallback((def: StockDef) => { setTradeMode("sell"); setActive(def); }, []);

  // ── FlatList render item — memo-stable callback ───────────────────────────
  const renderItem: ListRenderItem<StockDef> = useCallback(({ item: def }) => (
    <StockCard
      key={def.symbol}
      def={def}
      state={game.market[def.symbol]}
      holding={game.holdings[def.symbol]}
      onBuy={() => openBuy(def)}
      onSell={() => openSell(def)}
    />
  ), [game.market, game.holdings, openBuy, openSell]);

  const keyExtractor = useCallback((item: StockDef) => item.symbol, []);

  // ── List header — static sections above the stock list ───────────────────
  const ListHeader = useMemo(() => (
    <>
      {/* ── Equity card ─────────────────────────────────────────── */}
      <View style={[styles.equityCard, { borderColor: c.electric, backgroundColor: c.glass, shadowColor: c.electric }]}>
        <LinearGradient
          colors={[c.electric + "1c", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.eqLabel, { color: c.textDim }]}>TOTAL EQUITY · LIVE</Text>
        <Text
          style={[
            styles.eqValue,
            Platform.OS === "web"
              ? { color: c.neon, textShadow: `0 0 12px ${c.neon}` } as object
              : { color: c.neon, textShadowColor: c.neon, textShadowRadius: 12 },
          ]}
        >
          {formatUSD(totalEquity)}
        </Text>
        <View style={styles.eqRow}>
          <View style={styles.eqCell}>
            <Text style={[styles.eqCellLabel, { color: c.textDim }]}>CASH</Text>
            <Text style={[styles.eqCellValue, { color: c.text }]}>{formatUSD(game.cashUSD)}</Text>
          </View>
          <View style={styles.eqCell}>
            <Text style={[styles.eqCellLabel, { color: c.textDim }]}>STOCKS</Text>
            <Text style={[styles.eqCellValue, { color: c.text }]}>{formatUSD(game.portfolioValueUSD)}</Text>
          </View>
          <View style={styles.eqCell}>
            <Text style={[styles.eqCellLabel, { color: c.textDim }]}>DIVIDENDS</Text>
            <Text style={[styles.eqCellValue, { color: c.amber }]}>{formatUSD(game.dividendsEarnedUSD)}</Text>
          </View>
        </View>
      </View>

      {/* ── BTC wallet card ─────────────────────────────────────── */}
      <Pressable
        onPress={() => setShowBtcPanel((s) => !s)}
        style={[styles.btcCard, { borderColor: c.border, backgroundColor: c.glass }]}
      >
        <View style={styles.btcRow}>
          <MaterialCommunityIcons name="bitcoin" size={22} color={c.neon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.btcLabel, { color: c.textDim }]}>BTC WALLET</Text>
            <Text style={[styles.btcValue, { color: c.text }]}>
              {formatCrypto(game.balanceCrypto)} BTC  ·  {formatUSD(game.balanceUSD)}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={showBtcPanel ? "chevron-up" : "chevron-down"}
            size={20}
            color={c.textDim}
          />
        </View>
        {showBtcPanel && (
          <>
            <View style={styles.btcActions}>
              {[0.25, 0.5, 1].map((frac) => (
                <Pressable
                  key={frac}
                  onPress={() => handleSellBtc(frac)}
                  disabled={game.balanceCrypto <= 0}
                  style={({ pressed }) => [
                    styles.btcBtn,
                    {
                      borderColor: c.neon,
                      backgroundColor: c.neon + "18",
                      opacity: game.balanceCrypto <= 0 ? 0.35 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.btcBtnText, { color: c.neon }]}>
                    SELL {frac === 1 ? "ALL" : `${frac * 100}%`}
                  </Text>
                  <Text style={[styles.btcBtnSub, { color: c.textDim }]}>
                    +{formatUSD(game.balanceCrypto * frac * game.cryptoPrice)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* ── BTC ad boost row ───────────────────────────────── */}
            {game.balanceCrypto > 0 && (() => {
              const needed = adsForWalletBoost(game.balanceUSD);
              const watched = ads.btcBoostAdsWatched;
              const ready = ads.isBtcBoostReady(game.balanceUSD);
              const progress = Math.min(watched, needed);
              return (
                <View style={[styles.btcBoostRow, { borderTopColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.btcBoostLabel, { color: c.textDim }]}>
                      {ready ? "🎉 BONUS READY" : `ADS ${progress}/${needed} · 2× BTC CASH BONUS`}
                    </Text>
                    <View style={[styles.btcBoostBar, { backgroundColor: c.border }]}>
                      <View
                        style={[
                          styles.btcBoostFill,
                          {
                            backgroundColor: ready ? c.amber : c.electric,
                            width: `${(progress / needed) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Pressable
                    onPress={handleBtcBoost}
                    disabled={btcBoostLoading}
                    style={({ pressed }) => [
                      styles.btcBoostBtn,
                      {
                        borderColor: ready ? c.amber : c.electric,
                        backgroundColor: ready
                          ? c.amber + "28"
                          : c.electric + "18",
                        opacity: btcBoostLoading ? 0.5 : pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.btcBoostBtnText, { color: ready ? c.amber : c.electric }]}>
                      {ready ? `CLAIM +${formatUSD(game.balanceUSD)}` : btcBoostLoading ? "..." : "WATCH AD"}
                    </Text>
                  </Pressable>
                </View>
              );
            })()}
          </>
        )}
      </Pressable>

      {/* ── Section header ──────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>BIG TECH MARKET</Text>
        <View style={[styles.livePill, { borderColor: c.neon, backgroundColor: c.neon + "1a" }]}>
          <Animated.View
            style={[
              styles.liveDot,
              { backgroundColor: c.neon, shadowColor: c.neon, opacity: dotPulse },
            ]}
          />
          <Text style={[styles.liveText, { color: c.neon }]}>LIVE · 1 SEC</Text>
        </View>
      </View>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [c, totalEquity, game.cashUSD, game.portfolioValueUSD, game.dividendsEarnedUSD,
      game.balanceCrypto, game.balanceUSD, game.cryptoPrice, showBtcPanel, dotPulse, handleSellBtc,
      ads.btcBoostAdsWatched, handleBtcBoost, btcBoostLoading]);

  const ListFooter = useMemo(() => (
    <Text style={[styles.footnote, { color: c.textMuted }]}>
      Dividends pay every 5 min  ·  Momentum drives sustained bull/bear runs
    </Text>
  ), [c.textMuted]);

  return (
    <>
      <FlatList
        data={sortedStocks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // Windowing — only render visible cards + small buffer
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        // Smooth momentum scrolling
        decelerationRate="fast"
        scrollEventThrottle={16}
      />

      <TradeView
        def={active}
        initialMode={tradeMode}
        onClose={() => setActive(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  equityCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,            // Android depth shadow
  },
  eqLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: "Inter_600SemiBold",
  },
  eqValue: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  eqRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  eqCell: { flex: 1 },
  eqCellLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
  },
  eqCellValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  btcCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  btcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btcLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: "Inter_600SemiBold",
  },
  btcValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginTop: 1,
  },
  btcActions: {
    flexDirection: "row",
    gap: 8,
  },
  btcBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  btcBtnText: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  btcBtnSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  btcBoostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  btcBoostLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  btcBoostBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  btcBoostFill: {
    height: 3,
    borderRadius: 2,
  },
  btcBoostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 110,
  },
  btcBoostBtnText: {
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.8,
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
  footnote: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 8,
  },
});
