import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiningZone } from "@/components/MiningZone";
import { QuestModal, QuestsButton } from "@/components/QuestModal";
import { useGame } from "@/context/GameContext";
import { useQuests } from "@/context/QuestContext";
import { useColors } from "@/hooks/useColors";

export default function MineScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [questsOpen, setQuestsOpen] = React.useState(false);
  const { quests } = useQuests();
  const hasClaimable = quests.some((q) => !q.claimed && q.progress >= q.target);

  const game = useGame();

  // Store callbacks in refs so MiningZone's React.memo never sees a new prop
  // reference even though the parent re-renders every second from GameContext.
  const manualMineRef = useRef(game.manualMine);
  manualMineRef.current = game.manualMine;
  const addCryptoRef = useRef(game.addCrypto);
  addCryptoRef.current = game.addCrypto;

  // Stable wrappers — identity never changes → MiningZone never re-renders due to callbacks
  const stableOnMine = useCallback(() => manualMineRef.current(), []);
  const stableOnAddCrypto = useCallback((a: number) => addCryptoRef.current(a), []);

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
      <Animated.View style={[styles.content, { paddingTop: topPad, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: c.neon, shadowColor: c.neon }]} />
          <Text style={[styles.brand, { color: c.text }]}>CRYPTO EMPIRE</Text>
          <Text style={[styles.brandSub, { color: c.electric }]}>// MINE</Text>
          <View style={styles.spacer} />
          <QuestsButton onPress={() => setQuestsOpen(true)} hasClaimable={hasClaimable} />
        </View>
        <MiningZone onMine={stableOnMine} onAddCrypto={stableOnAddCrypto} />
      </Animated.View>
      <QuestModal visible={questsOpen} onClose={() => setQuestsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  spacer: { flex: 1 },
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
