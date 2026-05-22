import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAds } from "@/context/AdContext";
import { useColors } from "@/hooks/useColors";

const GOLD = "#ffd700";
const GREEN = "#00ff41";

function fmtUSD(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

interface Props {
  id: string;
  name: string;
  cost: number;
  rent: number;
  onClose: () => void;
  onClaimFree: (id: string) => void;
}

export function MapAdOverlay({ id, name, cost, rent, onClose, onClaimFree }: Props) {
  const c = useColors();
  const ads = useAds();
  const [watching, setWatching] = useState(false);

  const adsWatched = ads.propertyAdsWatched(id);
  const adsReq = ads.adsForProperty(cost);
  const unlocked = ads.isPropertyUnlocked(id, cost);
  const progress = adsReq > 0 ? Math.min(1, adsWatched / adsReq) : 0;

  const handleWatchAd = async () => {
    if (watching || unlocked) return;
    setWatching(true);
    await ads.watchAdForProperty(id, cost);
    setWatching(false);
  };

  const handleClaim = () => {
    ads.resetPropertyAds(id);
    onClaimFree(id);
  };

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={[styles.panel, { backgroundColor: c.bgElevated, borderColor: GREEN + "44" }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.buildingName, { color: GREEN }]}>{name.toUpperCase()}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: c.text }]}>{fmtUSD(cost)}</Text>
              <Text style={[styles.rentText, { color: GOLD }]}>  +{fmtUSD(rent)}/hr</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={16} color={c.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.adSection}>
          <View style={styles.adHeader}>
            <MaterialCommunityIcons name="television-play" size={13} color={GOLD} />
            <Text style={[styles.adTitle, { color: GOLD }]}>WATCH ADS TO CLAIM FREE</Text>
          </View>
          <Text style={[styles.adProgress, { color: c.textMuted }]}>
            {adsWatched} / {adsReq} ads watched
          </Text>
          <View style={[styles.track, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progress * 100}%` as `${number}%`,
                  backgroundColor: unlocked ? GREEN : GOLD,
                },
              ]}
            />
          </View>

          {unlocked ? (
            <Pressable onPress={handleClaim} style={[styles.btn, styles.claimBtn]}>
              <MaterialCommunityIcons name="gift-outline" size={14} color={GREEN} />
              <Text style={[styles.btnText, { color: GREEN }]}>CLAIM FREE PROPERTY</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleWatchAd}
              disabled={watching}
              style={({ pressed }) => [
                styles.btn,
                styles.watchBtn,
                { opacity: watching ? 0.5 : pressed ? 0.7 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={14} color={GOLD} />
              <Text style={[styles.btnText, { color: GOLD }]}>
                {watching ? "WATCHING…" : `WATCH AD  (${adsWatched}/${adsReq})`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 20,
    zIndex: 999,
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  buildingName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  price: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  rentText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
  },
  adSection: {
    gap: 8,
  },
  adHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  adProgress: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 2,
  },
  watchBtn: {
    borderColor: GOLD + "88",
    backgroundColor: GOLD + "18",
  },
  claimBtn: {
    borderColor: GREEN,
    backgroundColor: GREEN + "22",
  },
  btnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
