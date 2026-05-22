import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatrixRain } from "@/components/MatrixRain";
import { useIAP } from "@/context/IAPContext";
import { useColors } from "@/hooks/useColors";
import {
  CASH_PACKS,
  IAPProduct,
  PRODUCT_IDS,
  TEST_IAP_MODE,
  UPGRADE_PACKS,
} from "@/lib/iap-service";

const GOLD = "#FFD700";

// ── Reusable modals ───────────────────────────────────────────────────────────

function AppModal({
  visible,
  title,
  body,
  accent,
  primaryLabel,
  onPrimary,
  onCancel,
  loading,
}: {
  visible: boolean;
  title: string;
  body: string;
  accent: string;
  primaryLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={dlg.overlay}>
        <View style={[dlg.card, { backgroundColor: c.bgElevated, borderColor: accent, shadowColor: accent }]}>
          <View style={[dlg.header, { borderBottomColor: accent + "33" }]}>
            <Text style={[dlg.title, { color: c.text }]}>{title}</Text>
          </View>
          <Text style={[dlg.body, { color: c.textMuted }]}>{body}</Text>
          {loading ? (
            <View style={dlg.loadingRow}>
              <ActivityIndicator color={accent} />
              <Text style={[dlg.loadingText, { color: accent }]}>Processing…</Text>
            </View>
          ) : (
            <View style={dlg.btnRow}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [dlg.btn, { borderColor: c.border, backgroundColor: pressed ? c.border + "40" : "transparent" }]}
              >
                <Text style={[dlg.btnText, { color: c.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onPrimary}
                style={({ pressed }) => [dlg.btn, { borderColor: accent, backgroundColor: pressed ? accent + "50" : accent + "25" }]}
              >
                <Text style={[dlg.btnText, { color: accent }]}>{primaryLabel}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ResultModal({
  visible,
  title,
  body,
  accent,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  accent: string;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={dlg.overlay}>
        <View style={[dlg.card, { backgroundColor: c.bgElevated, borderColor: accent, shadowColor: accent }]}>
          <View style={[dlg.header, { borderBottomColor: accent + "33" }]}>
            <Text style={[dlg.title, { color: c.text }]}>{title}</Text>
          </View>
          <Text style={[dlg.body, { color: c.textMuted }]}>{body}</Text>
          <View style={dlg.btnRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [dlg.btn, { flex: 1, borderColor: accent, backgroundColor: pressed ? accent + "50" : accent + "25" }]}
            >
              <Text style={[dlg.btnText, { color: accent }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dlg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000cc", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1.5, overflow: "hidden", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 20, paddingVertical: 14 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 18 },
  loadingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  btnRow: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 4 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, compact }: { product: IAPProduct; compact?: boolean }) {
  const c = useColors();
  const iap = useIAP();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [resultBody, setResultBody] = useState("");
  const [resultAccent, setResultAccent] = useState(product.color);

  const owned = product.type === "non_consumable" && iap.hasPurchased(product.id);
  const acc = product.color;

  const showResult = (t: string, b: string, a: string) => {
    setResultTitle(t); setResultBody(b); setResultAccent(a); setResultVisible(true);
  };

  const doPurchase = async () => {
    setLoading(true);
    const result = await iap.purchase(product.id);
    setLoading(false);
    setConfirmVisible(false);

    if (result === "success") {
      let msg = "Your purchase was successful!";
      if      (product.id === PRODUCT_IDS.STARTER_CASH)   msg = "$25,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.NANO_PACK)      msg = "$50,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.BIT_BOOST)      msg = "$100,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.CIRCUIT_PACK)   msg = "$200,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.BLOCK_REWARD)   msg = "$250,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.CRYPTO_WHALE)   msg = "4-hour income surge added to your wallet!";
      else if (product.id === PRODUCT_IDS.VAULT_PACK)     msg = "$500,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.HASH_STORM)     msg = "8-hour income storm added to your wallet!";
      else if (product.id === PRODUCT_IDS.MILLION_DROP)   msg = "$1,000,000 added to your wallet!";
      else if (product.id === PRODUCT_IDS.GENESIS_BLOCK)     msg = "24-hour legendary income drop added to your wallet!";
      else if (product.id === PRODUCT_IDS.REMOVE_ADS)        msg = "All ads permanently disabled! Rewarded bonuses are now instant.";
      else if (product.id === PRODUCT_IDS.QUANTUM_RIG)       msg = "+20% mining boost permanently active!";
      else if (product.id === PRODUCT_IDS.TRADING_EDGE)      msg = "+25% trade profit bonus permanently active!";
      showResult("Purchase Complete", msg, "#39FF14");
    } else if (result === "already_owned") {
      showResult("Already Owned", "You already own this item.", acc);
    } else {
      showResult("Purchase Failed", "The purchase could not be completed. Please try again.", "#FF3B3B");
    }
  };

  return (
    <>
      <AppModal
        visible={confirmVisible}
        title={product.title}
        body={`${product.description}\n\nPrice: ${product.price}${TEST_IAP_MODE ? "\n\n[TEST MODE — no real payment]" : ""}`}
        accent={acc}
        primaryLabel={`Buy ${product.price}`}
        onPrimary={doPurchase}
        onCancel={() => !loading && setConfirmVisible(false)}
        loading={loading}
      />
      <ResultModal
        visible={resultVisible}
        title={resultTitle}
        body={resultBody}
        accent={resultAccent}
        onClose={() => setResultVisible(false)}
      />

      <View style={[styles.card, { borderColor: owned ? acc + "44" : acc, backgroundColor: c.bgElevated, shadowColor: acc }]}>
        {product.badge && !owned && (
          <View style={[styles.badge, { backgroundColor: acc + "22", borderColor: acc + "55" }]}>
            <Text style={[styles.badgeText, { color: acc }]}>{product.badge}</Text>
          </View>
        )}
        {owned && (
          <View style={[styles.badge, { backgroundColor: "#39FF1422", borderColor: "#39FF1455" }]}>
            <Text style={[styles.badgeText, { color: "#39FF14" }]}>OWNED</Text>
          </View>
        )}

        <View style={[styles.cardInner, compact && styles.cardInnerCompact]}>
          <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: acc + "18" }]}>
            <MaterialCommunityIcons
              name={product.icon as any}
              size={compact ? 22 : 28}
              color={owned ? acc + "66" : acc}
            />
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, compact && styles.cardTitleCompact, { color: owned ? c.textMuted : c.text }]}>
              {product.title}
            </Text>
            <Text style={[styles.cardDesc, { color: c.textDim }]} numberOfLines={compact ? 2 : 3}>
              {product.description}
            </Text>
          </View>

          <Pressable
            onPress={() => !owned && setConfirmVisible(true)}
            disabled={owned}
            style={({ pressed }) => [
              styles.buyBtn,
              {
                borderColor: owned ? acc + "33" : acc,
                backgroundColor: owned ? acc + "11" : pressed ? acc + "33" : acc + "1A",
                opacity: owned ? 0.45 : 1,
              },
            ]}
          >
            {owned ? (
              <MaterialCommunityIcons name="check-circle" size={18} color={acc + "88"} />
            ) : (
              <Text style={[styles.buyText, { color: acc }]}>{product.price}</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.cardAccentBar, { backgroundColor: owned ? acc + "22" : acc + "55" }]} />
      </View>
    </>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  sub,
  color,
}: {
  icon: string;
  label: string;
  sub: string;
  color: string;
}) {
  const c = useColors();
  return (
    <View style={[sh.row, { borderBottomColor: color + "30" }]}>
      <View style={[sh.iconBox, { backgroundColor: color + "18" }]}>
        <MaterialCommunityIcons name={icon as any} size={15} color={color} />
      </View>
      <View>
        <Text style={[sh.label, { color: c.text }]}>{label}</Text>
        <Text style={[sh.sub, { color: c.textMuted }]}>{sub}</Text>
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  sub: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginTop: 1 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const iap = useIAP();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [restoreResultVisible, setRestoreResultVisible] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const adsRemoved     = iap.hasPurchased(PRODUCT_IDS.REMOVE_ADS);
  const quantumActive  = iap.hasPurchased(PRODUCT_IDS.QUANTUM_RIG);
  const tradingActive  = iap.hasPurchased(PRODUCT_IDS.TRADING_EDGE);

  const activeBonuses = [
    adsRemoved   && "Ads Removed",
    quantumActive && "+20% Mining",
    tradingActive && "+25% Trade Profit",
  ].filter(Boolean) as string[];

  const handleRestore = async () => {
    setRestoring(true);
    await iap.restore();
    setRestoring(false);
    setRestoreResultVisible(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <MatrixRain />

      <ResultModal
        visible={restoreResultVisible}
        title="Purchases Restored"
        body="Your previous purchases have been restored successfully."
        accent={GOLD}
        onClose={() => setRestoreResultVisible(false)}
      />

      <View style={[styles.content, { paddingTop: topPad }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: GOLD, shadowColor: GOLD }]} />
          <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
          <Text style={[styles.brandSub, { color: GOLD }]}>// SHOP</Text>
        </View>

        {/* Test mode banner */}
        {TEST_IAP_MODE && (
          <View style={styles.testBanner}>
            <MaterialCommunityIcons name="flask-outline" size={13} color="#FF6B00" />
            <Text style={styles.testBannerText}>
              TEST MODE — purchases are simulated, no real payment
            </Text>
          </View>
        )}

        {/* Active bonuses */}
        {activeBonuses.length > 0 && (
          <View style={[styles.bonusStrip, { backgroundColor: "#39FF1411", borderColor: "#39FF1433" }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={13} color="#39FF14" />
            <Text style={[styles.bonusText, { color: "#39FF14" }]}>
              Active: {activeBonuses.join(" · ")}
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>

          {/* ── SECTION: Cash Packs ──────────────────────────────────────── */}
          <SectionHeader
            icon="cash-multiple"
            label="CASH PACKS"
            sub="Instant money drops — buy as many times as you like"
            color="#39FF14"
          />
          {CASH_PACKS.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* ── SECTION: Permanent Upgrades ──────────────────────────────── */}
          <SectionHeader
            icon="shield-star-outline"
            label="PERMANENT UPGRADES"
            sub="One-time purchase, lifetime benefit"
            color={GOLD}
          />
          {UPGRADE_PACKS.filter((p) => p.id !== PRODUCT_IDS.SEASON_PASS).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}

          {/* Restore & Legal */}
          <Pressable
            onPress={handleRestore}
            style={({ pressed }) => [styles.restoreBtn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              <>
                <MaterialCommunityIcons name="restore" size={14} color={c.textMuted} />
                <Text style={[styles.restoreText, { color: c.textMuted }]}>Restore Purchases</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.legalNote, { color: c.textDim }]}>
            Permanent items are linked to your Google Play account and can be restored at any time.
            Cash packs are consumable and delivered immediately upon purchase.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  brand: { fontSize: 13, letterSpacing: 2.5, fontFamily: "Inter_700Bold" },
  brandSub: { fontSize: 11, letterSpacing: 1.8, fontFamily: "Inter_700Bold" },
  testBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#FF6B0018", borderWidth: 1, borderColor: "#FF6B0040" },
  testBannerText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#FF6B00", letterSpacing: 0.5 },
  bonusStrip: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  bonusText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  list: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32, gap: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  card: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  cardInnerCompact: { padding: 11, gap: 10 },
  badge: { alignSelf: "flex-start", marginTop: 8, marginLeft: 11, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconWrapCompact: { width: 42, height: 42, borderRadius: 11 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  cardTitleCompact: { fontSize: 13 },
  cardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  buyBtn: { minWidth: 58, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, flexShrink: 0 },
  buyText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  cardAccentBar: { height: 2 },
  restoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  restoreText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  legalNote: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 14, marginTop: 8, paddingHorizontal: 8 },
});
