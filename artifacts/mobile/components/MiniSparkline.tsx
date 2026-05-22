import React, { useMemo } from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  data: number[];
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
}

export function MiniSparkline({ data, width, height, color, strokeWidth = 1.6 }: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (!path) return null;

  return (
    <Svg width={width} height={height}>
      <Path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  );
}
