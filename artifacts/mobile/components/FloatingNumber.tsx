import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export interface FloatingNumberItem {
  id: number;
  x: number;
  y: number;
  value: string;
}

interface Props {
  item: FloatingNumberItem;
  onDone: (id: number) => void;
}

export function FloatingNumber({ item, onDone }: Props) {
  const c = useColors();
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale      = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 900 }),
      withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onDone)(item.id);
      }),
    );
    scale.value = withSequence(
      withTiming(1.25, { duration: 160, easing: Easing.out(Easing.back(3)) }),
      withTiming(1.05, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withTiming(-140, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [item.id, opacity, scale, translateY, onDone]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const neonGlow = Platform.OS === "web"
    ? ({ textShadow: `0 0 10px ${c.neon}, 0 0 24px ${c.neon}99, 0 0 40px ${c.neon}44` } as object)
    : {
        textShadowColor: c.neon,
        textShadowRadius: 18,
        textShadowOffset: { width: 0, height: 0 },
      };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { left: item.x - 80, top: item.y - 30 }, animatedStyle]}
    >
      <View style={[styles.pill, { backgroundColor: c.background + "f0", borderColor: c.neon }]}>
        <Text style={[styles.text, { color: c.neon }, neonGlow]}>
          +{item.value}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    width: 160,
    alignItems: "center",
    zIndex: 200,
  },
  pill: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  text: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
