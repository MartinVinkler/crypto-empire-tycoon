import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GpsMap } from "@/components/GpsMap";
import { useColors } from "@/hooks/useColors";

export default function MapScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={[styles.brandDot, { backgroundColor: c.electric, shadowColor: c.electric }]} />
        <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
        <Text style={[styles.brandSub, { color: c.electric }]}>// PROPERTY</Text>
      </View>
      <GpsMap style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 8,
    zIndex: 10,
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
  map: { flex: 1 },
});
