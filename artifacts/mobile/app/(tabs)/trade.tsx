import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatrixRain } from "@/components/MatrixRain";
import { TradeFloor } from "@/components/TradeFloor";
import { useColors } from "@/hooks/useColors";

export default function TradeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // Smooth fade-in on mount / tab focus
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <MatrixRain />
      <Animated.View style={[styles.content, { paddingTop: topPad, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: c.neon, shadowColor: c.neon }]} />
          <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
          <Text style={[styles.brandSub, { color: c.electric }]}>// TRADE</Text>
        </View>
        <TradeFloor />
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
});
