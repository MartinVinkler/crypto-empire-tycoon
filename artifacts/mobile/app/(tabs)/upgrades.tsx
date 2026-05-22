import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { MatrixRain } from "@/components/MatrixRain";
import { Shop } from "@/components/Shop";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function UpgradesScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const game = useGame();
  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // Gate MatrixRain on tab focus — saves Reanimated worklet CPU when on other tabs.
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    game.notifyUpgradesVisited();
  }, [game]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {isFocused && <MatrixRain />}
      <View style={[styles.content, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: c.neon, shadowColor: c.neon }]} />
          <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
          <Text style={[styles.brandSub, { color: c.electric }]}>// UPGRADES</Text>
        </View>
        <Shop />
      </View>
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
});
