import React, { useMemo } from "react";
import Svg, { Line, Rect } from "react-native-svg";

import { Candle } from "@/data/market";
import { useColors } from "@/hooks/useColors";

interface Props {
  candles: Candle[];
  current: Candle;
  width: number;
  height: number;
}

export function CandleChart({ candles, current, width, height }: Props) {
  const c = useColors();
  const all = useMemo(() => [...candles, current], [candles, current]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (all.length === 0) return { minPrice: 0, maxPrice: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    for (const ca of all) {
      if (ca.low < lo) lo = ca.low;
      if (ca.high > hi) hi = ca.high;
    }
    if (lo === hi) {
      lo = lo * 0.999;
      hi = hi * 1.001;
    }
    const pad = (hi - lo) * 0.08;
    return { minPrice: lo - pad, maxPrice: hi + pad };
  }, [all]);

  const range = maxPrice - minPrice || 1;
  const slot = width / Math.max(all.length, 1);
  const bodyW = Math.max(2, slot - 3);
  const yFor = (v: number) => height - ((v - minPrice) / range) * (height - 6) - 3;

  return (
    <Svg width={width} height={height}>
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
      {all.map((ca, i) => {
        const up = ca.close >= ca.open;
        const color = up ? c.neon : c.danger;
        const xCenter = i * slot + slot / 2;
        const xBody = xCenter - bodyW / 2;
        const yOpen = yFor(ca.open);
        const yClose = yFor(ca.close);
        const yHigh = yFor(ca.high);
        const yLow = yFor(ca.low);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
        return (
          <React.Fragment key={i}>
            <Line
              x1={xCenter}
              x2={xCenter}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth={1.2}
              opacity={0.9}
            />
            <Rect
              x={xBody}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              opacity={up ? 0.95 : 0.85}
              rx={1}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
