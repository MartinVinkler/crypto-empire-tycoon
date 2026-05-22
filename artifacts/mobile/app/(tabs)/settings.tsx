import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAds } from "@/context/AdContext";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

// ── Redeem codes ─────────────────────────────────────────────────────────────

type RedeemReward = { cash?: number; btc?: number; label: string };

const REDEEM_CODES: Record<string, RedeemReward> = {
  bitcoin10k:  { btc: 10_000,            label: "+10,000 BTC"              },
  btcwhale:    { btc: 50_000,            label: "+50,000 BTC"              },
  moonshot:    { btc: 200,               label: "+200 BTC"                 },
  genesis:     { btc: 100, cash: 1_000,  label: "+100 BTC  +$1,000"       },
  cryptoking:  { btc: 1_000, cash: 10_000, label: "+1,000 BTC  +$10,000"  },
  free5k:      { cash: 5_000,            label: "+$5,000 cash"             },
  free50k:     { cash: 50_000,           label: "+$50,000 cash"            },
  empire2025:  { cash: 25_000,           label: "+$25,000 cash"            },
  ciphervip:   { cash: 100_000,          label: "+$100,000 cash"           },
  hashboost:   { btc: 500,              label: "+500 BTC"                  },
};

const REDEEM_KEY = "@crypto_empire_redeemed_v1";

// ── Setting row ─────────────────────────────────────────────────────────────

interface RowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function SettingRow({ icon, iconColor, label, subtitle, value, onToggle }: RowProps) {
  const c = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: c.border + "66" }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "22" }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: c.textDim }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: c.border, true: c.neon + "55" }}
        thumbColor={value ? c.neon : c.textMuted}
        ios_backgroundColor={c.border}
      />
    </View>
  );
}

// ── Section heading ─────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  const c = useColors();
  return (
    <Text style={[styles.sectionHead, { color: c.textDim }]}>{label}</Text>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const c = useColors();
  const { isDark, sfxEnabled, setDark, setSfx } = useSettings();
  const { startTutorial, addCash, addCrypto, resetGame } = useGame();
  const ads = useAds();

  // ── Reset state ───────────────────────────────────────────────────────────
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);

  const ALL_STORAGE_KEYS = [
    "@crypto_empire_save_v1",
    "@crypto_empire_tutorial_v1",
    "@crypto_empire_settings_v1",
    "@crypto_empire_daily_quests_v2",
    "@crypto_empire_iap_v2",
    "@crypto_empire_battle_pass_v1",
    "@crypto_empire_ads_v1",
    "@crypto_empire_redeemed_v1",
    "@crypto_empire_properties_v1",
    "@crypto_empire_property_wallet_v1",
    "@crypto_empire_last_gps_v1",
  ];

  const handleResetAll = useCallback(async () => {
    setResetConfirmVisible(false);
    resetGame();
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS);
    startTutorial();
  }, [resetGame, startTutorial]);

  // ── Redeem state ──────────────────────────────────────────────────────────
  const [codeInput, setCodeInput] = useState("");
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  const [redeemStatus, setRedeemStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(REDEEM_KEY).then((raw) => {
      if (raw) {
        try { setUsedCodes(JSON.parse(raw) as string[]); } catch {}
      }
    });
  }, []);

  const handleRedeem = useCallback(() => {
    const key = codeInput.trim().toLowerCase();
    const reward = REDEEM_CODES[key];
    if (!reward) {
      setRedeemStatus({ ok: false, msg: "Invalid code" });
    } else if (usedCodes.includes(key)) {
      setRedeemStatus({ ok: false, msg: "Code already used" });
    } else {
      if (reward.cash) addCash(reward.cash);
      if (reward.btc)  addCrypto(reward.btc);
      const next = [...usedCodes, key];
      setUsedCodes(next);
      AsyncStorage.setItem(REDEEM_KEY, JSON.stringify(next));
      setCodeInput("");
      setRedeemStatus({ ok: true, msg: `Claimed: ${reward.label}` });
    }
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setRedeemStatus(null), 3500);
  }, [codeInput, usedCodes, addCash, addCrypto]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <LinearGradient
          colors={[c.electric + "18", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerInner}>
          <MaterialCommunityIcons name="cog" size={22} color={c.electric} />
          <Text style={[styles.headerTitle, { color: c.text }]}>SETTINGS</Text>
        </View>
        {/* Live theme preview pill */}
        <View
          style={[
            styles.themePill,
            {
              borderColor: isDark ? c.neon : c.electric,
              backgroundColor: isDark ? c.neon + "18" : c.electric + "18",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isDark ? "moon-waning-crescent" : "white-balance-sunny"}
            size={12}
            color={isDark ? c.neon : c.electric}
          />
          <Text
            style={[
              styles.themePillTxt,
              { color: isDark ? c.neon : c.electric },
            ]}
          >
            {isDark ? "DARK" : "LIGHT"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: c.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── APPEARANCE ─────────────────────────────────────── */}
        <SectionHead label="APPEARANCE" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <SettingRow
            icon="moon-waning-crescent"
            iconColor={c.electric}
            label="Dark Mode"
            subtitle="Charcoal background with neon accents"
            value={isDark}
            onToggle={setDark}
          />
          <View style={[styles.themePreview, { borderTopColor: c.border }]}>
            {/* Mini live preview of both themes */}
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewChip,
                  {
                    backgroundColor: "#050505",
                    borderColor: isDark ? c.neon : c.border,
                    borderWidth: isDark ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.previewDot, { backgroundColor: "#39FF14" }]} />
                <Text style={[styles.previewLabel, { color: "#e8f1ff" }]}>Dark</Text>
              </View>
              <View
                style={[
                  styles.previewChip,
                  {
                    backgroundColor: "#f5f7fa",
                    borderColor: !isDark ? "#0891b2" : c.border,
                    borderWidth: !isDark ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.previewDot, { backgroundColor: "#15803d" }]} />
                <Text style={[styles.previewLabel, { color: "#1a1f2e" }]}>Light</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── AUDIO ──────────────────────────────────────────── */}
        <SectionHead label="AUDIO" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <SettingRow
            icon="volume-high"
            iconColor={c.amber}
            label="Sound Effects"
            subtitle={
              Platform.OS === "web"
                ? "Synthetic blips & chords via Web Audio"
                : "UI audio (web only in this build)"
            }
            value={sfxEnabled}
            onToggle={setSfx}
          />
        </View>

        {/* ── TUTORIAL ───────────────────────────────────────── */}
        <SectionHead label="TUTORIAL" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <Pressable
            onPress={startTutorial}
            style={({ pressed }) => [
              styles.tutorialBtn,
              {
                borderColor: c.electric,
                backgroundColor: pressed ? c.electric + "33" : c.electric + "11",
              },
            ]}
          >
            <View style={[styles.tutorialIcon, { backgroundColor: c.electric + "22" }]}>
              <MaterialCommunityIcons name="school" size={22} color={c.electric} />
            </View>
            <View style={styles.tutorialText}>
              <Text style={[styles.tutorialLabel, { color: c.text }]}>Replay Tutorial</Text>
              <Text style={[styles.tutorialSub, { color: c.textDim }]}>
                Walk through the full game step by step
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.electric} />
          </Pressable>
        </View>

        {/* ── REWARD ADS ─────────────────────────────────────── */}
        <SectionHead label="REWARD ADS" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <Pressable
            onPress={ads.claimDailySponsor}
            disabled={!ads.canClaimDailySponsor}
            style={({ pressed }) => [
              styles.tutorialBtn,
              {
                borderColor: ads.canClaimDailySponsor ? "#FFD700" : c.border,
                backgroundColor: pressed
                  ? "#FFD70033"
                  : ads.canClaimDailySponsor
                    ? "#FFD70011"
                    : "transparent",
                opacity: ads.canClaimDailySponsor ? 1 : 0.5,
              },
            ]}
          >
            <View style={[styles.tutorialIcon, { backgroundColor: "#FFD70022" }]}>
              <MaterialCommunityIcons
                name="gift"
                size={22}
                color={ads.canClaimDailySponsor ? "#FFD700" : c.textMuted}
              />
            </View>
            <View style={styles.tutorialText}>
              <Text style={[styles.tutorialLabel, { color: c.text }]}>
                Daily Sponsor Reward
              </Text>
              <Text style={[styles.tutorialSub, { color: c.textDim }]}>
                {ads.canClaimDailySponsor
                  ? "Watch ad → 2× Mine + 2× Wallet + $100 cash"
                  : "Check back tomorrow for your next reward"}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={ads.canClaimDailySponsor ? "chevron-right" : "lock-clock"}
              size={20}
              color={ads.canClaimDailySponsor ? "#FFD700" : c.textMuted}
            />
          </Pressable>
          <View style={[styles.rewardInfo, { borderTopColor: c.border + "55" }]}>
            <MaterialCommunityIcons name="shield-check" size={12} color={c.textMuted} />
            <Text style={[styles.rewardInfoText, { color: c.textMuted }]}>
              {ads.totalAdsWatched} ads watched · All rewards are optional
            </Text>
          </View>
        </View>

        {/* ── REDEEM CODE ────────────────────────────────────── */}
        <SectionHead label="REDEEM CODE" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <View style={styles.redeemBody}>
            <View style={[styles.redeemIconWrap, { backgroundColor: c.amber + "22" }]}>
              <MaterialCommunityIcons name="ticket-percent" size={22} color={c.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.redeemTitle, { color: c.text }]}>Enter Promo Code</Text>
              <Text style={[styles.redeemSub, { color: c.textDim }]}>
                Claim free BTC or cash rewards
              </Text>
            </View>
          </View>
          <View style={[styles.redeemInputRow, { borderTopColor: c.border + "55" }]}>
            <TextInput
              style={[
                styles.redeemInput,
                {
                  borderColor: redeemStatus
                    ? redeemStatus.ok ? c.neon : "#ff4444"
                    : c.border,
                  backgroundColor: c.bg,
                  color: c.text,
                },
              ]}
              placeholder="e.g. free5k"
              placeholderTextColor={c.textMuted}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleRedeem}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleRedeem}
              disabled={codeInput.trim().length === 0}
              style={({ pressed }) => [
                styles.redeemBtn,
                {
                  backgroundColor:
                    codeInput.trim().length === 0
                      ? c.border
                      : pressed
                        ? c.amber + "cc"
                        : c.amber,
                  opacity: codeInput.trim().length === 0 ? 0.45 : 1,
                },
              ]}
            >
              <Text style={styles.redeemBtnText}>REDEEM</Text>
            </Pressable>
          </View>
          {redeemStatus && (
            <View
              style={[
                styles.redeemStatus,
                {
                  borderTopColor: c.border + "44",
                  backgroundColor: redeemStatus.ok
                    ? c.neon + "12"
                    : "#ff444412",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={redeemStatus.ok ? "check-circle" : "alert-circle"}
                size={14}
                color={redeemStatus.ok ? c.neon : "#ff4444"}
              />
              <Text
                style={[
                  styles.redeemStatusText,
                  { color: redeemStatus.ok ? c.neon : "#ff4444" },
                ]}
              >
                {redeemStatus.msg}
              </Text>
            </View>
          )}
        </View>

        {/* ── RESET PROGRESS ─────────────────────────────────── */}
        <SectionHead label="DANGER ZONE" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: "#FF3B3B44" }]}>
          <Pressable
            onPress={() => setResetConfirmVisible(true)}
            style={({ pressed }) => [
              styles.tutorialBtn,
              {
                borderColor: "#FF3B3B",
                backgroundColor: pressed ? "#FF3B3B33" : "#FF3B3B11",
              },
            ]}
          >
            <View style={[styles.tutorialIcon, { backgroundColor: "#FF3B3B22" }]}>
              <MaterialCommunityIcons name="delete-forever" size={22} color="#FF3B3B" />
            </View>
            <View style={styles.tutorialText}>
              <Text style={[styles.tutorialLabel, { color: "#FF3B3B" }]}>Reset All Progress</Text>
              <Text style={[styles.tutorialSub, { color: c.textDim }]}>
                Wipes all data and restarts from zero
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#FF3B3B" />
          </Pressable>
        </View>

        {/* ── Reset confirmation modal ────────────────────────── */}
        <Modal
          visible={resetConfirmVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: c.bgElevated, borderColor: "#FF3B3B" }]}>
              <View style={[styles.modalHeader, { borderBottomColor: "#FF3B3B33" }]}>
                <MaterialCommunityIcons name="alert" size={22} color="#FF3B3B" />
                <Text style={[styles.modalTitle, { color: c.text }]}>Reset All Progress?</Text>
              </View>
              <Text style={[styles.modalBody, { color: c.textMuted }]}>
                This will permanently erase your balance, BTC, upgrades, properties, Battle Pass progress, and all purchases. This cannot be undone.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setResetConfirmVisible(false)}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { borderColor: c.border, backgroundColor: pressed ? c.border + "40" : "transparent" },
                  ]}
                >
                  <Text style={[styles.modalBtnText, { color: c.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleResetAll}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { borderColor: "#FF3B3B", backgroundColor: pressed ? "#FF3B3B50" : "#FF3B3B25" },
                  ]}
                >
                  <Text style={[styles.modalBtnText, { color: "#FF3B3B" }]}>Reset</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── ABOUT ──────────────────────────────────────────── */}
        <SectionHead label="ABOUT" />
        <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <View style={styles.aboutRow}>
            <View style={[styles.aboutIcon, { backgroundColor: c.neon + "18", borderColor: c.neon + "44" }]}>
              <MaterialCommunityIcons name="bitcoin" size={28} color={c.neon} />
            </View>
            <View style={styles.aboutText}>
              <Text style={[styles.aboutTitle, { color: c.text }]}>Crypto Empire Tycoon</Text>
              <Text style={[styles.aboutSub, { color: c.textDim }]}>Build your cyberpunk fortune</Text>
              <Text style={[styles.aboutVersion, { color: c.textMuted }]}>v1.0.0 · Momentum Market Engine</Text>
            </View>
          </View>

          <View style={[styles.statGrid, { borderTopColor: c.border }]}>
            {[
              { label: "STOCKS", value: "6 LIVE" },
              { label: "CHART DATA", value: "48H HISTORY" },
              { label: "TICK RATE", value: "1 SEC" },
              { label: "PHYSICS", value: "MOMENTUM AI" },
            ].map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={[styles.statValue, { color: c.neon }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  themePill: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  themePillTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionHead: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  rowSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  themePreview: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
  },
  previewChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  aboutIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  aboutText: {
    flex: 1,
    gap: 3,
  },
  aboutTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  aboutSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  aboutVersion: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  statCell: {
    width: "50%",
    padding: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    marginTop: 2,
  },
  tutorialBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  tutorialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialText: {
    flex: 1,
    gap: 3,
  },
  tutorialLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tutorialSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rewardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rewardInfoText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  redeemBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  redeemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  redeemSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  redeemInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  redeemInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  redeemBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    color: "#000",
  },
  redeemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  redeemStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000cc",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  modalBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
