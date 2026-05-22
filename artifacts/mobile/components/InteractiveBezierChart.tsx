/**
 * InteractiveBezierChart
 *
 * Drop-in replacement for BezierChart with a crosshair scrubber:
 * - drag/touch → vertical + horizontal dashed lines + price pill
 * - release → crosshair fades and disappears
 * - same Catmull-Rom → cubic Bézier rendering as BezierChart
 */
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

interface Props {
  data: number[];
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
  showFill?: boolean;
}

// ── Catmull-Rom → cubic Bézier (identical to BezierChart) ────────────────
function buildPath(
  pts: [number, number][],
  w: number,
  h: number,
  fill: boolean,
): { line: string; area: string } {
  if (pts.length < 2) return { line: "", area: "" };
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  const lastPt = pts[pts.length - 1];
  const area = fill
    ? `${d} L${lastPt[0].toFixed(2)},${h} L${pts[0][0].toFixed(2)},${h} Z`
    : "";
  return { line: d, area };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (v >= 1)         return `$${v.toFixed(3)}`;
  if (v >= 0.01)      return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

// Interpolate data value at a fractional index
function interpolateValue(data: number[], frac: number): number {
  const idx = frac * (data.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(data.length - 1, lo + 1);
  const t = idx - lo;
  return data[lo] * (1 - t) + data[hi] * t;
}

// ── Component ─────────────────────────────────────────────────────────────
interface Crosshair {
  x: number;   // SVG x coord
  y: number;   // SVG y coord
  price: number;
}

export const InteractiveBezierChart = memo(function InteractiveBezierChart({
  data,
  width,
  height,
  color,
  strokeWidth = 2,
  showFill = true,
}: Props) {
  const [cross, setCross] = useState<Crosshair | null>(null);
  const activeRef = useRef(false);

  // ── Build chart geometry ────────────────────────────────────────────────
  const { linePath, areaPath, pts, min, range } = useMemo(() => {
    if (data.length < 2) return { linePath: "", areaPath: "", pts: [] as [number,number][], min: 0, range: 1 };
    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rng = maxV - minV || Math.abs(minV) * 0.01 || 1;
    const padY = 4;
    const usableH = height - 2 * padY;
    const points: [number, number][] = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      height - padY - ((v - minV) / rng) * usableH,
    ]);
    const { line, area } = buildPath(points, width, height, showFill);
    return { linePath: line, areaPath: area, pts: points, min: minV, range: rng };
  }, [data, width, height, showFill]);

  // ── Map touch X → crosshair ─────────────────────────────────────────────
  const updateCross = useCallback((touchX: number) => {
    const clamped = Math.max(0, Math.min(width, touchX));
    const frac = clamped / width;
    const price = interpolateValue(data, frac);

    // Compute Y from the same formula used for pts
    const padY = 4;
    const usableH = height - 2 * padY;
    const y = height - padY - ((price - min) / range) * usableH;

    setCross({ x: clamped, y, price });
  }, [data, width, height, min, range]);

  // ── PanResponder ────────────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      activeRef.current = true;
      updateCross(e.nativeEvent.locationX);
    },
    onPanResponderMove: (e) => {
      if (activeRef.current) updateCross(e.nativeEvent.locationX);
    },
    onPanResponderRelease: () => {
      activeRef.current = false;
      setCross(null);
    },
    onPanResponderTerminate: () => {
      activeRef.current = false;
      setCross(null);
    },
  }), [updateCross]);

  if (!linePath) return null;

  const gradId = `grad_${color.replace(/[^a-z0-9]/gi, "")}`;

  // Pill label: show on left when scrubber is in right 40% of chart
  const labelW = 72;
  const labelH = 22;
  const labelX = cross
    ? cross.x > width * 0.6
      ? cross.x - labelW - 8
      : cross.x + 8
    : 0;
  const labelY = cross ? Math.max(2, Math.min(height - labelH - 2, cross.y - labelH / 2)) : 0;

  return (
    <View
      style={{ width, height }}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height} style={{ overflow: "visible" }}>
        {/* Gradient fill */}
        {showFill && (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={cross ? 0.15 : 0.28} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
        )}
        {showFill && areaPath && (
          <Path d={areaPath} fill={`url(#${gradId})`} />
        )}

        {/* Main line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={cross ? 0.55 : 1}
        />

        {/* ── Crosshair ─────────────────────────────────────────────── */}
        {cross && (
          <>
            {/* Vertical dashed line */}
            <Line
              x1={cross.x} y1={0}
              x2={cross.x} y2={height}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />

            {/* Horizontal dashed line */}
            <Line
              x1={0} y1={cross.y}
              x2={width} y2={cross.y}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.55}
            />

            {/* Dot at intersection */}
            <Circle
              cx={cross.x}
              cy={cross.y}
              r={4}
              fill={color}
              opacity={0.9}
            />
            <Circle
              cx={cross.x}
              cy={cross.y}
              r={8}
              fill={color}
              opacity={0.2}
            />

            {/* Price pill */}
            <Rect
              x={labelX}
              y={labelY}
              width={labelW}
              height={labelH}
              rx={5}
              fill={color}
              opacity={0.92}
            />
            <SvgText
              x={labelX + labelW / 2}
              y={labelY + labelH / 2 + 1}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={11}
              fontWeight="bold"
              fill="#000"
            >
              {fmtPrice(cross.price)}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
});
