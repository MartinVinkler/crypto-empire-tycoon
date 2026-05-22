import React, { useEffect, useMemo } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const CHARS = "01ABCDEF₿$Ξ◊∆▓◆◇▒░♦♢";

interface ColumnSpec {
  x: number;
  duration: number;
  delay: number;
  text: string;
  fontSize: number;
  opacity: number;
}

function buildColumns(width: number, height: number): ColumnSpec[] {
  const colWidth = 22;
  const count = Math.max(6, Math.floor(width / colWidth));
  const cols: ColumnSpec[] = [];
  for (let i = 0; i < count; i++) {
    const len = 8 + Math.floor(Math.random() * 14);
    let text = "";
    for (let j = 0; j < len; j++) {
      text += CHARS[Math.floor(Math.random() * CHARS.length)] + "\n";
    }
    cols.push({
      x: i * colWidth + Math.random() * 4,
      duration: 6000 + Math.random() * 9000,
      delay: -Math.random() * 8000,
      text,
      fontSize: 12 + Math.floor(Math.random() * 4),
      opacity: 0.06 + Math.random() * 0.08,
    });
  }
  return cols;
}

function RainColumn({ col, height }: { col: ColumnSpec; height: number }) {
  const c = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: col.duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [col.duration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const startY = -height;
    const endY = height + 200;
    const y = startY + (endY - startY) * progress.value;
    return { transform: [{ translateY: y }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.col,
        { left: col.x, opacity: col.opacity },
        animatedStyle,
      ]}
    >
      <Text
        style={{
          color: c.neon,
          fontSize: col.fontSize,
          lineHeight: col.fontSize + 4,
          fontFamily: "Inter_500Medium",
          ...(Platform.OS === "web"
            ? { textShadow: `0 0 3px ${c.neon}` } as object
            : { textShadowColor: c.neon, textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } }),
        }}
      >
        {col.text}
      </Text>
    </Animated.View>
  );
}

export function MatrixRain() {
  const { width, height } = Dimensions.get("window");
  const cols = useMemo(() => buildColumns(width, height), [width, height]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cols.map((col, i) => (
        <RainColumn key={i} col={col} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    position: "absolute",
    top: 0,
  },
});
