import React, { memo, useMemo } from "react";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface Props {
  data: number[];
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
  showFill?: boolean;
}

// Catmull-Rom → cubic Bézier conversion for silky-smooth lines
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

export const BezierChart = memo(function BezierChart({
  data,
  width,
  height,
  color,
  strokeWidth = 2,
  showFill = true,
}: Props) {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: "", areaPath: "" };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || Math.abs(min) * 0.01 || 1;
    const padY = 4;
    const usableH = height - 2 * padY;

    const pts: [number, number][] = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      height - padY - ((v - min) / range) * usableH,
    ]);

    const { line, area } = buildPath(pts, width, height, showFill);
    return { linePath: line, areaPath: area };
  }, [data, width, height, showFill]);

  if (!linePath) return null;

  const gradId = `grad_${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <Svg width={width} height={height}>
      {showFill && (
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
      )}
      {showFill && areaPath ? (
        <Path d={areaPath} fill={`url(#${gradId})`} />
      ) : null}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
