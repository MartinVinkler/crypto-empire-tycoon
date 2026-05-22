import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { useSettings } from "@/context/SettingsContext";

interface Props {
  hashrateFactor?: number;
}

const NEON = "#39FF14";

const VP = { x: 50, y: 40 };
const RADIALS = [0, 6, 13, 22, 33, 42, 50, 58, 67, 78, 87, 94, 100];
const H_COUNT = 10;
const HORIZONTALS = Array.from({ length: H_COUNT }, (_, i) => {
  const t = (i + 1) / H_COUNT;
  const y = VP.y + t * (100 - VP.y);
  const hw = t * 52;
  return { x1: VP.x - hw, y1: y, x2: VP.x + hw, y2: y };
});

export function DataHighway(_props: Props) {
  const { isDark } = useSettings();

  if (!isDark) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {RADIALS.map((bx, i) => (
          <Line
            key={`r${i}`}
            x1={VP.x}
            y1={VP.y}
            x2={bx}
            y2={100}
            stroke={NEON}
            strokeWidth={0.35}
            opacity={0.07}
          />
        ))}
        {HORIZONTALS.map((h, i) => (
          <Line
            key={`h${i}`}
            x1={h.x1}
            y1={h.y1}
            x2={h.x2}
            y2={h.y2}
            stroke={NEON}
            strokeWidth={0.35}
            opacity={0.065}
          />
        ))}
      </Svg>
      {/* MatrixRain intentionally omitted on native — it creates too many
          Reanimated animated views and looks poor on Android. The web version
          uses a canvas-based rain that is fast and crisp. */}
    </View>
  );
}
