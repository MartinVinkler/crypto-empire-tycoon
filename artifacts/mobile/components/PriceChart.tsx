import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Line,
} from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface PriceChartProps {
  data: number[];
  width: number;
  height: number;
}

export function PriceChart({ data, width, height }: PriceChartProps) {
  const c = useColors();
  const { linePath, areaPath, isUp } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: "", areaPath: "", isUp: true };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return [x, y] as const;
    });
    const line = points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    const area =
      `${line} L${(points[points.length - 1]?.[0] ?? 0).toFixed(2)},${height} ` +
      `L0,${height} Z`;
    const up = (data[data.length - 1] ?? 0) >= (data[0] ?? 0);
    return { linePath: line, areaPath: area, isUp: up };
  }, [data, width, height]);

  const stroke = isUp ? c.neon : c.danger;
  const fill = isUp ? c.neon : c.danger;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fill} stopOpacity="0.35" />
            <Stop offset="1" stopColor={fill} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <Line
            key={p}
            x1={0}
            x2={width}
            y1={height * p}
            y2={height * p}
            stroke={c.border}
            strokeWidth={1}
            strokeDasharray="3,5"
          />
        ))}
        {areaPath ? <Path d={areaPath} fill="url(#chartFill)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            stroke={stroke}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
