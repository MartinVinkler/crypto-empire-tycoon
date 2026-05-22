/**
 * LightningField — native implementation (react-native-svg)
 *
 * Matches the web SVG version as closely as possible:
 * - Inner solid ring
 * - Spinning dashed ring (Reanimated rotate)
 * - Outer solid ring
 * - N/E/S/W tick marks
 * - Diagonal corner arc segments
 * - Glow simulated via 2 overlapping strokes (blur blur layer + sharp layer)
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

export interface LightningFieldHandle {
  boost: () => void;
}

interface Props {
  color: string;
  size: number;
}

const NORMAL_DEG_PER_MS = 360 / 7000; // same 7s rotation as before

export const LightningField = forwardRef<LightningFieldHandle, Props>(
  ({ color, size }, ref) => {
    const cx = size / 2;
    const cy = size / 2;

    const r1 = size * 0.365;
    const r2 = size * 0.408;
    const r3 = size * 0.458;

    const rot      = useSharedValue(0);
    const flashSc  = useSharedValue(1);

    useEffect(() => {
      rot.value = withRepeat(
        withTiming(360, { duration: 7000, easing: Easing.linear }),
        -1,
        false,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      boost() {
        // Briefly spin faster then return
        rot.value = withRepeat(
          withTiming(rot.value + 360, { duration: 800, easing: Easing.linear }),
          1,
          false,
        );
        flashSc.value = withSequence(
          withTiming(1.10, { duration: 75 }),
          withTiming(1,    { duration: 450 }),
        );
      },
    }));

    const spinWrapStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rot.value}deg` }],
    }));

    const outerWrapStyle = useAnimatedStyle(() => ({
      transform: [{ scale: flashSc.value }],
    }));

    // Tick marks at N / E / S / W
    const tickLen = size * 0.044;
    const tickR   = r3 + size * 0.020;
    const ticks   = [0, 90, 180, 270].map((a) => {
      const rad = (a * Math.PI) / 180;
      return {
        key: a,
        x1: cx + Math.cos(rad) * tickR,
        y1: cy + Math.sin(rad) * tickR,
        x2: cx + Math.cos(rad) * (tickR + tickLen),
        y2: cy + Math.sin(rad) * (tickR + tickLen),
      };
    });

    // Corner arc segments at diagonals
    const arcSegs = [45, 135, 225, 315].map((a) => {
      const rad   = (a * Math.PI) / 180;
      const arcR  = r3 + size * 0.045;
      const sweep = (14 * Math.PI) / 180;
      const x1    = cx + Math.cos(rad - sweep) * arcR;
      const y1    = cy + Math.sin(rad - sweep) * arcR;
      const x2    = cx + Math.cos(rad + sweep) * arcR;
      const y2    = cy + Math.sin(rad + sweep) * arcR;
      return { key: a, d: `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}` };
    });

    const dashArray = `${size * 0.069} ${size * 0.028}`;

    return (
      <View
        pointerEvents="none"
        style={[styles.container, { width: size, height: size }]}
      >
        {/* Static rings — inner + outer + ticks + arcs */}
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
        >
          {/* Inner solid ring — glow: wide soft layer + sharp layer */}
          <Circle cx={cx} cy={cy} r={r1} stroke={color} strokeWidth={6}  fill="none" opacity={0.12} />
          <Circle cx={cx} cy={cy} r={r1} stroke={color} strokeWidth={2}  fill="none" opacity={0.75} />

          {/* Outer solid ring */}
          <Circle cx={cx} cy={cy} r={r3} stroke={color} strokeWidth={4}  fill="none" opacity={0.10} />
          <Circle cx={cx} cy={cy} r={r3} stroke={color} strokeWidth={1.5} fill="none" opacity={0.52} />

          {/* Tick marks */}
          {ticks.map(({ key, x1, y1, x2, y2 }) => (
            <G key={key}>
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={5}   opacity={0.18} />
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} opacity={0.88} />
            </G>
          ))}

          {/* Corner arc segments */}
          {arcSegs.map(({ key, d }) => (
            <G key={key}>
              <Path d={d} stroke={color} strokeWidth={5}   fill="none" opacity={0.14} />
              <Path d={d} stroke={color} strokeWidth={2}   fill="none" opacity={0.65} />
            </G>
          ))}
        </Svg>

        {/* Spinning dashed ring — strongest glow */}
        <Animated.View style={[StyleSheet.absoluteFill, spinWrapStyle]}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            {/* Glow layer (wide, soft) */}
            <Circle
              cx={cx} cy={cy} r={r2}
              stroke={color}
              strokeWidth={9}
              fill="none"
              strokeDasharray={dashArray}
              opacity={0.18}
            />
            {/* Sharp layer */}
            <Circle
              cx={cx} cy={cy} r={r2}
              stroke={color}
              strokeWidth={3}
              fill="none"
              strokeDasharray={dashArray}
              opacity={0.95}
            />
          </Svg>
        </Animated.View>

        {/* Scale flash on boost */}
        <Animated.View
          style={[StyleSheet.absoluteFill, outerWrapStyle]}
          pointerEvents="none"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { position: "absolute" },
});
