import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  ListRenderItem,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAds } from "@/context/AdContext";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { Property, useProperties } from "@/hooks/useProperties";

const GOLD = "#ffd700";

function fmtUSD(v: number): string {
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + v.toFixed(v < 10 ? 2 : 0);
}

// Derive building footprint from purchase price — scales realistically with cost.
// Formula: ~0.25 m² per $1, clamped to sane range [50, 50000] m².
function buildingAreaM2(price: number): string {
  const safe = typeof price === "number" && isFinite(price) && price > 0 ? price : 200;
  const m2 = Math.round(Math.max(50, Math.min(50_000, safe * 0.25)));
  if (m2 >= 10_000) return (m2 / 1000).toFixed(0) + "k m²";
  if (m2 >= 1_000)  return (m2 / 1000).toFixed(1) + "k m²";
  return m2 + " m²";
}

function fmtAge(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function PropertyCard({ item, onSell, onSee }: { item: Property; onSell: () => void; onSee: () => void }) {
  const c = useColors();
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFirstPress() {
    setConfirming(true);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  }

  function handleConfirm() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onSell();
  }

  function handleCancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: confirming ? c.danger + "88" : c.neon + "44",
          ...(Platform.OS === "ios"
            ? {
                shadowColor: confirming ? c.danger : c.neon,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }
            : { elevation: 6 }),
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: c.neon + "1a", borderColor: c.neon + "70" }]}>
        <MaterialCommunityIcons name="city-variant" size={28} color={c.neon} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.chip, { borderColor: c.border }]}>
            <Text style={[styles.chipLabel, { color: c.textDim }]}>SIZE</Text>
            <Text style={[styles.chipValue, { color: c.text }]}>{buildingAreaM2(item.price)}</Text>
          </View>
          <View style={[styles.chip, { borderColor: c.border }]}>
            <Text style={[styles.chipLabel, { color: c.textDim }]}>PAID</Text>
            <Text style={[styles.chipValue, { color: c.electric }]}>{fmtUSD(item.price)}</Text>
          </View>
        </View>
        {confirming ? (
          <Text style={[styles.cardAge, { color: c.danger }]}>
            Get back {fmtUSD(Math.round(item.price * 0.5))}
          </Text>
        ) : (
          <Text style={[styles.cardAge, { color: c.textDim }]}>{fmtAge(item.boughtAt)}</Text>
        )}
      </View>

      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.cardIncome, { color: c.neon }]}>+{fmtUSD(item.rent)}</Text>
          <Text style={[styles.cardIncomeUnit, { color: c.textDim }]}>per hour</Text>
        </View>

        {confirming ? (
          <View style={{ flexDirection: "row", gap: 5 }}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: c.border + "44", borderColor: c.border }]}
              onPress={handleCancel}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelBtnText, { color: c.textDim }]}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: c.danger + "28", borderColor: c.danger }]}
              onPress={handleConfirm}
              activeOpacity={0.75}
            >
              <Text style={[styles.confirmBtnText, { color: c.danger }]}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 5 }}>
            <TouchableOpacity
              style={[styles.seeBtn, { backgroundColor: c.electric + "15", borderColor: c.electric + "99" }]}
              onPress={onSee}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="map-marker-radius" size={13} color={c.electric} />
              <Text style={[styles.seeBtnText, { color: c.electric }]}>SEE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sellBtn, { backgroundColor: c.danger + "18", borderColor: c.danger + "99" }]}
              onPress={handleFirstPress}
              activeOpacity={0.75}
            >
              <Text style={[styles.sellBtnText, { color: c.danger }]}>SELL</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Wallet Boost Row (2× collect) ────────────────────────────────────────────

function WalletBoostRow({
  balance,
  onBoostCollect,
}: {
  balance: number;
  onBoostCollect: () => void;
}) {
  const c = useColors();
  const ads = useAds();

  const hasBalance = balance >= 0.01;
  const adsReq = ads.adsForWalletBoost(balance);
  const watched = ads.walletBoostAdsWatched;
  const ready = ads.isWalletBoostReady(balance);
  const pct = adsReq > 0 ? Math.min(1, watched / adsReq) : 0;

  const handlePress = async () => {
    if (ready) {
      onBoostCollect();
      ads.claimWalletBoost();
    } else if (hasBalance) {
      await ads.watchAdForWalletBoost();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!hasBalance && !ready}
      style={({ pressed }) => [
        wbStyles.row,
        {
          backgroundColor: ready ? GOLD + "15" : c.bgElevated,
          borderColor: ready ? GOLD : c.border,
          opacity: !hasBalance && !ready ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons
            name={ready ? "gift-outline" : "television-play"}
            size={12}
            color={ready ? GOLD : GOLD + "99"}
          />
          <Text style={[wbStyles.label, { color: ready ? GOLD : GOLD + "aa" }]}>
            {ready ? "READY TO CLAIM — 2× COLLECT" : `2× BOOST · ${watched}/${adsReq} ads watched`}
          </Text>
        </View>
        <View style={[wbStyles.track, { backgroundColor: c.border }]}>
          <View
            style={[
              wbStyles.fill,
              {
                width: `${pct * 100}%`,
                backgroundColor: ready ? GOLD : GOLD + "77",
              },
            ]}
          />
        </View>
      </View>
      <View
        style={[
          wbStyles.btn,
          {
            borderColor: ready ? GOLD : GOLD + "55",
            backgroundColor: ready ? GOLD + "22" : "transparent",
          },
        ]}
      >
        <Text style={[wbStyles.btnText, { color: ready ? GOLD : GOLD + "88" }]}>
          {ready ? `CLAIM\n${fmtUSD(balance * 2)}` : "WATCH\nAD"}
        </Text>
      </View>
    </Pressable>
  );
}

const wbStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  btn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  btnText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textAlign: "center",
  },
});

// ── Property Wallet Card ─────────────────────────────────────────────────────

function PropertyWalletCard({
  balance,
  onCollect,
}: {
  balance: number;
  onCollect: () => void;
}) {
  const c = useColors();
  const hasBalance = balance >= 0.01;

  const glowAnim = useRef(new Animated.Value(0)).current;
  const [collected, setCollected] = useState<number | null>(null);
  const collectFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasBalance) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hasBalance, glowAnim]);

  function handleCollect() {
    if (!hasBalance) return;
    const amount = balance;
    onCollect();
    setCollected(amount);
    Animated.sequence([
      Animated.timing(collectFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(collectFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setCollected(null));
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View
      style={[
        styles.walletCard,
        {
          backgroundColor: c.card,
          borderColor: hasBalance ? GOLD + "88" : GOLD + "30",
          ...(Platform.OS === "ios"
            ? {
                shadowColor: GOLD,
                shadowOpacity: hasBalance ? 0.55 : 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
              }
            : { elevation: hasBalance ? 12 : 3 }),
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <MaterialCommunityIcons name="bank-outline" size={14} color={GOLD} />
          <Text style={[styles.walletLabel, { color: GOLD }]}>PROPERTY WALLET</Text>
        </View>
        <Text style={[styles.walletBalance, { color: hasBalance ? GOLD : c.textDim }]}>
          {fmtUSD(balance)}
        </Text>
        <Text style={[styles.walletSub, { color: c.textDim }]}>
          {hasBalance ? "Rent income ready to collect" : "Income accumulates here automatically"}
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <Animated.View style={{ opacity: hasBalance ? glowOpacity : 0.35 }}>
          <TouchableOpacity
            style={[
              styles.collectBtn,
              {
                backgroundColor: hasBalance ? GOLD + "22" : c.border + "22",
                borderColor: hasBalance ? GOLD : GOLD + "40",
              },
            ]}
            onPress={handleCollect}
            activeOpacity={0.7}
            disabled={!hasBalance}
          >
            <MaterialCommunityIcons name="arrow-down-circle" size={14} color={hasBalance ? GOLD : GOLD + "60"} />
            <Text style={[styles.collectBtnText, { color: hasBalance ? GOLD : GOLD + "60" }]}>
              COLLECT
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {collected !== null && (
          <Animated.Text style={[styles.collectToast, { opacity: collectFadeAnim }]}>
            +{fmtUSD(collected)} added!
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const keyExtractor = (p: Property) => p.id;

export default function PortfolioScreen() {
  const c = useColors();
  const game = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const {
    properties,
    totalPassiveIncomePerHour,
    totalInvested,
    propertyWallet,
    collectPropertyIncome,
    sellProperty,
    setFocus,
  } = useProperties();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const count = properties.length;

  const data = React.useMemo(
    () => [...properties].sort((a, b) => b.boughtAt - a.boughtAt),
    [properties],
  );

  const handleSee = useCallback(
    (item: Property) => {
      if (item.lat != null && item.lng != null) {
        setFocus(item.lat, item.lng, item.id, item.name);
      }
      router.push("/(tabs)/map");
    },
    [setFocus, router],
  );

  const renderItem = useCallback<ListRenderItem<Property>>(
    ({ item }) => (
      <PropertyCard
        item={item}
        onSell={() => sellProperty(item.id)}
        onSee={() => handleSee(item)}
      />
    ),
    [sellProperty, handleSee],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Animated.View style={[styles.content, { paddingTop: topPad, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: c.neon, shadowColor: c.neon }]} />
          <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
          <Text style={[styles.brandSub, { color: c.electric }]}>// PORTFOLIO</Text>
        </View>

        <View style={styles.walletWrap}>
          <PropertyWalletCard balance={propertyWallet} onCollect={collectPropertyIncome} />
        </View>

        <WalletBoostRow
          balance={propertyWallet}
          onBoostCollect={() => {
            game.addCash(propertyWallet);
            collectPropertyIncome();
          }}
        />

        <View style={styles.summaryWrap}>
          <View
            style={[
              styles.summaryCard,
              styles.summaryCardLeft,
              {
                backgroundColor: c.card,
                borderColor: c.neon + "55",
                ...(Platform.OS === "ios"
                  ? {
                      shadowColor: c.neon,
                      shadowOpacity: 0.5,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 0 },
                    }
                  : { elevation: 10 }),
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: c.textDim }]}>TOTAL PASSIVE INCOME</Text>
            <Text style={[styles.summaryHero, { color: c.neon }]}>
              +{fmtUSD(totalPassiveIncomePerHour)}
              <Text style={[styles.summaryUnit, { color: c.textDim }]}>/hr</Text>
            </Text>
            <Text style={[styles.summarySub, { color: c.textDim }]}>
              {fmtUSD(totalPassiveIncomePerHour / 3600)}/sec drip rate
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: c.card,
                borderColor: c.electric + "55",
                ...(Platform.OS === "ios"
                  ? {
                      shadowColor: c.electric,
                      shadowOpacity: 0.45,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 0 },
                    }
                  : { elevation: 8 }),
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: c.textDim }]}>TOTAL ASSETS</Text>
            <Text style={[styles.summaryHero, { color: c.electric }]}>
              {count}
              <Text style={[styles.summaryUnit, { color: c.textDim }]}>
                {" "}{count === 1 ? "PROP" : "PROPS"}
              </Text>
            </Text>
            <Text style={[styles.summarySub, { color: c.textDim }]}>
              invested {fmtUSD(totalInvested)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: c.neon, shadowColor: c.neon }]} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>OWNED PROPERTIES</Text>
        </View>

        {count === 0 ? (
          <View style={styles.emptyWrap}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: c.neon + "12", borderColor: c.neon + "55" },
              ]}
            >
              <MaterialCommunityIcons name="home-search-outline" size={42} color={c.neon} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No properties yet</Text>
            <Text style={[styles.emptyText, { color: c.textDim }]}>
              Head to the PROPERTY tab and tap a building on the map to start your empire.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialNumToRender={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS !== "web"}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
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
  brand: {
    fontSize: 13,
    letterSpacing: 2.5,
    fontFamily: "Inter_700Bold",
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontFamily: "Inter_600SemiBold",
  },
  walletWrap: {
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  walletLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: "Inter_700Bold",
  },
  walletBalance: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
    marginBottom: 2,
  },
  walletSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  collectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  collectToast: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: GOLD,
    letterSpacing: 0.5,
  },
  summaryWrap: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryCardLeft: {},
  summaryLabel: {
    fontSize: 9,
    letterSpacing: 1.6,
    fontFamily: "Inter_700Bold",
  },
  summaryHero: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  summaryUnit: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  summarySub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
    letterSpacing: 0.4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 8,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 8,
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
  },
  chipValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  cardAge: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
  },
  cardIncome: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  cardIncomeUnit: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  seeBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  seeBtnText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  sellBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sellBtnText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  confirmBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmBtnText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cancelBtnText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
});
