import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AssetImage } from "@/components/AssetImage";
import { useAds } from "@/context/AdContext";
import {
  formatCrypto,
  formatRate,
  formatUSD,
  useGame,
  useGameDisplay,
} from "@/context/GameContext";
import {
  BOOST_DURATION_MS,
  PRESTIGE_THRESHOLD_USD,
  UpgradeDef,
} from "@/data/constants";
import { useQuests } from "@/context/QuestContext";
import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";

// ─── Memoised upgrade card ───────────────────────────────────────────────────
// Props are all primitives / stable refs — React.memo does a fast shallow
// comparison and skips re-rendering unless affordable/owned actually changes.
// In late-game this means the cards are essentially static (all affordable).
interface UpgradeCardProps {
  def: UpgradeDef;
  owned: number;
  cost: number;
  affordable: boolean;
  adsWatched: number;
  adsReq: number;
  adUnlocked: boolean;
  onBuy: (id: string) => void;
  onWatchAd: (id: string, cost: number) => void;
  onClaimAd: (id: string) => void;
}

const UpgradeCard = React.memo(function UpgradeCard({
  def,
  owned,
  cost,
  affordable,
  adsWatched,
  adsReq,
  adUnlocked,
  onBuy,
  onWatchAd,
  onClaimAd,
}: UpgradeCardProps) {
  const c = useColors();

  const valueText =
    def.kind === "passive"
      ? `+${formatRate(def.baseValue)}`
      : def.kind === "click_mult"
        ? `×${def.baseValue.toFixed(1)} TAP MULT`
        : `+${formatCrypto(def.baseValue)} BTC/tap`;

  return (
    <React.Fragment>
      <Pressable
        onPress={() => onBuy(def.id)}
        disabled={!affordable}
        style={({ pressed }) => [
          styles.upgrade,
          {
            borderColor: affordable ? def.color + "88" : c.border,
            backgroundColor: c.card,
            opacity: pressed ? 0.85 : 1,
            shadowColor: def.color,
            shadowOpacity: affordable ? 0.35 : 0,
          },
        ]}
      >
        <AssetImage
          iconLib={def.iconLib}
          icon={def.icon}
          color={affordable ? def.color : c.textMuted}
          size={56}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.upgradeHeader}>
            <Text style={[styles.upgradeName, { color: c.text }]}>{def.name}</Text>
            <View
              style={[
                styles.ownedPill,
                { backgroundColor: c.bgElevated, borderColor: c.border },
              ]}
            >
              <Text style={[styles.ownedText, { color: c.textDim }]}>x{owned}</Text>
            </View>
          </View>
          <Text style={[styles.upgradeTagline, { color: c.textMuted }]}>
            {def.tagline}
          </Text>
          <View style={styles.upgradeFooter}>
            <Text style={[styles.upgradeValue, { color: def.color }]}>
              {valueText}
            </Text>
            <Text
              style={[
                styles.upgradeCost,
                { color: affordable ? c.neon : c.textMuted },
              ]}
            >
              {formatUSD(cost)}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={[styles.adRow, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.adRowLabel, { color: c.textMuted }]}>
            AD UNLOCK · {adsWatched}/{adsReq} watched
          </Text>
          <View style={[styles.adProgressTrack, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.adProgressFill,
                {
                  backgroundColor: adUnlocked ? "#39FF14" : def.color,
                  width: `${Math.min(100, adsReq > 0 ? (adsWatched / adsReq) * 100 : 0)}%`,
                },
              ]}
            />
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (adUnlocked) {
              onClaimAd(def.id);
            } else {
              onWatchAd(def.id, cost);
            }
          }}
          style={({ pressed }) => [
            styles.adBtn,
            {
              borderColor: adUnlocked ? "#39FF14" : def.color + "66",
              backgroundColor: adUnlocked
                ? "#39FF1422"
                : pressed
                  ? def.color + "22"
                  : def.color + "0f",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={adUnlocked ? "gift-outline" : "television-play"}
            size={11}
            color={adUnlocked ? "#39FF14" : def.color}
          />
          <Text style={[styles.adBtnText, { color: adUnlocked ? "#39FF14" : def.color }]}>
            {adUnlocked ? "CLAIM FREE" : "WATCH AD"}
          </Text>
        </Pressable>
      </View>
    </React.Fragment>
  );
});

// ─── Balance header — reads only from throttled display context ───────────────
function ShopBalanceHeader() {
  const c = useColors();
  const display = useGameDisplay();
  const { isBoostActive, boostUntil, boostCooldownUntil, miningPower, prestigeMultiplier, upgradeMultiplier } = display;

  const boostCdRemaining = Math.max(
    0,
    Math.ceil((boostCooldownUntil - Date.now()) / 1000),
  );
  const boostReady = !isBoostActive && boostCdRemaining === 0;

  return (
    <View style={styles.balanceRow}>
      <View>
        <Text style={[styles.label, { color: c.textDim }]}>WALLET</Text>
        <Text style={[styles.balance, { color: c.neon }]}>
          {formatUSD(display.balanceUSD)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.label, { color: c.textDim }]}>RATE</Text>
        <Text style={[styles.balanceSm, { color: c.electric }]}>
          {formatRate(miningPower * upgradeMultiplier * prestigeMultiplier * (isBoostActive ? 3 : 1))}
        </Text>
      </View>
    </View>
  );
}

// ─── Boost + prestige action cards ────────────────────────────────────────────
interface ActionCardsProps {
  onBoost: () => void;
  onFork: () => void;
}

function ShopActionCards({ onBoost, onFork }: ActionCardsProps) {
  const c = useColors();
  const display = useGameDisplay();
  const { isBoostActive, boostUntil, boostCooldownUntil, canPrestige, prestigeMultiplier } = display;

  const boostCdRemaining = Math.max(
    0,
    Math.ceil((boostCooldownUntil - Date.now()) / 1000),
  );
  const boostReady = !isBoostActive && boostCdRemaining === 0;

  return (
    <View style={styles.actionsRow}>
      <Pressable
        onPress={onBoost}
        disabled={!boostReady}
        style={({ pressed }) => [
          styles.actionCard,
          {
            borderColor: boostReady ? c.amber : c.border,
            backgroundColor: c.card,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={[c.amber + (boostReady ? "22" : "08"), "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <MaterialCommunityIcons
          name="rocket-launch"
          size={22}
          color={boostReady ? c.amber : c.textMuted}
        />
        <Text
          style={[
            styles.actionTitle,
            { color: boostReady ? c.amber : c.textDim },
          ]}
        >
          BOOST
        </Text>
        <Text style={[styles.actionSub, { color: c.textMuted }]}>
          {isBoostActive
            ? `Active · ${Math.max(0, Math.ceil((boostUntil - Date.now()) / 1000))}s`
            : boostReady
              ? `3x for ${BOOST_DURATION_MS / 1000}s`
              : `Cooldown ${boostCdRemaining}s`}
        </Text>
      </Pressable>

      <Pressable
        onPress={onFork}
        disabled={!canPrestige}
        style={({ pressed }) => [
          styles.actionCard,
          {
            borderColor: canPrestige ? c.magenta : c.border,
            backgroundColor: c.card,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={[c.magenta + (canPrestige ? "22" : "08"), "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <MaterialCommunityIcons
          name="source-fork"
          size={22}
          color={canPrestige ? c.magenta : c.textMuted}
        />
        <Text
          style={[
            styles.actionTitle,
            { color: canPrestige ? c.magenta : c.textDim },
          ]}
        >
          HARD FORK
        </Text>
        <Text style={[styles.actionSub, { color: c.textMuted }]}>
          {canPrestige
            ? `Reset for x${prestigeMultiplier * 2}`
            : `Need ${formatUSD(PRESTIGE_THRESHOLD_USD)}`}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main Shop component ──────────────────────────────────────────────────────
export function Shop() {
  const c = useColors();
  const game = useGame();
  const display = useGameDisplay();
  const { playClick, playPurchase, playError } = useSFX();
  const { recordUpgrade } = useQuests();
  const ads = useAds();

  // Stable callbacks — buyUpgrade/claimFreeUpgrade are useCallback([]) in context
  const handleBuy = useCallback(
    (id: string) => {
      const ok = game.buyUpgrade(id);
      if (ok) {
        playPurchase();
        recordUpgrade();
      } else {
        playError();
      }
    },
    [game.buyUpgrade, playPurchase, playError, recordUpgrade],
  );

  const handleWatchAd = useCallback(
    (id: string, cost: number) => {
      ads.watchAdForUpgrade(id, cost);
    },
    [ads],
  );

  const handleClaimAd = useCallback(
    (id: string) => {
      if (game.claimFreeUpgrade(id)) {
        recordUpgrade();
        ads.resetUpgradeAds(id);
      }
    },
    [game.claimFreeUpgrade, recordUpgrade, ads],
  );

  const handleBoost = useCallback(() => {
    const ok = game.activateBoost();
    if (ok) playPurchase();
    else playError();
  }, [game.activateBoost, playPurchase, playError]);

  const handleFork = useCallback(() => {
    if (!display.canPrestige) return;
    Alert.alert(
      "Hard Fork the Chain?",
      `Reset all crypto and hardware in exchange for a permanent x${
        display.prestigeMultiplier * 2
      } income multiplier.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => playClick() },
        {
          text: "Fork",
          style: "destructive",
          onPress: () => {
            game.hardFork();
            playPurchase();
          },
        },
      ],
    );
  }, [display.canPrestige, display.prestigeMultiplier, game.hardFork, playClick, playPurchase]);

  // Pre-compute per-upgrade state — React.memo on UpgradeCard means cards only
  // re-render when affordable or owned flips (usually never in late game).
  const upgradeRows = useMemo(() => {
    return game.upgrades.map((u) => {
      const owned = game.ownedUpgrades[u.id] ?? 0;
      const cost = game.upgradeCost(u.id);
      const affordable = game.balanceUSD >= cost;
      const adsWatched = ads.upgradeAdsWatched(u.id);
      const adsReq = ads.adsForUpgrade(cost, owned);
      const adUnlocked = ads.isUpgradeUnlocked(u.id, cost, owned);
      return { u, owned, cost, affordable, adsWatched, adsReq, adUnlocked };
    });
  }, [
    game.upgrades,
    game.ownedUpgrades,
    game.upgradeCost,
    game.balanceUSD,
    ads,
  ]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <ShopBalanceHeader />
      <ShopActionCards onBoost={handleBoost} onFork={handleFork} />

      <Text style={[styles.sectionTitle, { color: c.textDim }]}>HARDWARE</Text>

      {upgradeRows.map(({ u, owned, cost, affordable, adsWatched, adsReq, adUnlocked }) => (
        <UpgradeCard
          key={u.id}
          def={u}
          owned={owned}
          cost={cost}
          affordable={affordable}
          adsWatched={adsWatched}
          adsReq={adsReq}
          adUnlocked={adUnlocked}
          onBuy={handleBuy}
          onWatchAd={handleWatchAd}
          onClaimAd={handleClaimAd}
        />
      ))}

      <View style={{ height: 20 }} />
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
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: "Inter_600SemiBold",
  },
  balance: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  balanceSm: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    overflow: "hidden",
  },
  actionTitle: {
    fontSize: 13,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  actionSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  upgrade: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  upgradeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upgradeName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  ownedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  ownedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeTagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  upgradeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  upgradeValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeCost: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  adRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginTop: -6,
  },
  adRowLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  adProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  adProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  adBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  adBtnText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
