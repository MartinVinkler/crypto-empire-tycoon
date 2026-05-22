/**
 * CandlestickChart — shared for TradeView (full) and StockCard (compact)
 *
 * Props:
 *   interactive  — drag scrubber + OHLC tooltip   (TradeView)
 *   zoomable     — pinch-to-zoom gesture          (TradeView)
 *   showAxis     — right-side price labels + pill (TradeView)
 *   compact      — hides price line pill, keeps line (StockCard)
 */
import React, { memo, useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MAX = 48;      // candles shown at zoom 1× (TradeView)
const MIN_CANDLES = 6;       // max zoom-in
const MAX_CANDLES_HARD = 120;
const PAD_T = 6;
const PAD_B = 6;
const PILL_W  = 76;
const PILL_H  = 20;
const GRID_N  = 4;

// ── OHLC helpers ──────────────────────────────────────────────────────────────
interface OHLC { open: number; high: number; low: number; close: number }

function groupToCandles(data: number[], count: number): OHLC[] {
  if (data.length < 2) return [];
  const n    = Math.min(count, data.length);
  const step = data.length / n;
  const out: OHLC[] = [];
  for (let i = 0; i < n; i++) {
    const s     = Math.floor(i * step);
    const e     = Math.min(data.length - 1, Math.floor((i + 1) * step));
    const chunk = data.slice(s, e + 1);
    if (!chunk.length) continue;
    out.push({
      open:  chunk[0],
      close: chunk[chunk.length - 1],
      high:  Math.max(...chunk),
      low:   Math.min(...chunk),
    });
  }
  return out;
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (v >= 1)         return `$${v.toFixed(3)}`;
  if (v >= 0.01)      return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  data:         number[];
  width:        number;
  height:       number;
  color:        string;
  interactive?:  boolean;  // scrubber + OHLC tooltip
  zoomable?:    boolean;   // pinch-to-zoom
  showAxis?:    boolean;   // right-side labels + price pill
  candleCount?: number;    // override default visible candle count
  strokeWidth?: number;
  showFill?:    boolean;
}

interface Scrubber { x: number; idx: number }

export const CandlestickChart = memo(function CandlestickChart({
  data, width, height, color,
  interactive  = false,
  zoomable     = false,
  showAxis     = true,
  candleCount,
}: Props) {
  const [scrubber, setScrubber] = useState<Scrubber | null>(null);

  // ── Zoom state ───────────────────────────────────────────────────────────
  const zoomRef          = useRef(1);
  const [zoom, setZoom]  = useState(1);
  const pinchRef         = useRef<{ initDist: number; initZoom: number } | null>(null);
  const activeRef        = useRef(false);

  // Visible candle count: prop overrides default, then zoom scales it
  const baseCount = candleCount ?? DEFAULT_MAX;
  const visibleCount = Math.max(
    MIN_CANDLES,
    Math.min(MAX_CANDLES_HARD, Math.round(baseCount / Math.max(1, zoom))),
  );

  // ── Layout ───────────────────────────────────────────────────────────────
  const axisW       = showAxis ? PILL_W + 2 : 0;
  const candleAreaW = width - axisW;
  const usableH     = height - PAD_T - PAD_B;

  // ── Candle data ──────────────────────────────────────────────────────────
  const { candles, minP, maxP, range } = useMemo(() => {
    // Show only the last N data points proportional to zoom
    const slice = data.slice(-Math.round(data.length * (baseCount / visibleCount)));
    const cs    = groupToCandles(slice.length < 2 ? data : slice, visibleCount);
    if (!cs.length) return { candles: cs, minP: 0, maxP: 1, range: 1 };
    const lo  = Math.min(...cs.map(c => c.low));
    const hi  = Math.max(...cs.map(c => c.high));
    const rng = hi - lo || hi * 0.01 || 1;
    const m   = rng * 0.10;
    return { candles: cs, minP: lo - m, maxP: hi + m, range: rng + 2 * m };
  }, [data, visibleCount]);

  const priceToY = (p: number) =>
    PAD_T + usableH - ((p - minP) / range) * usableH;

  const currentPrice = data[data.length - 1] ?? 0;
  const currentY     = priceToY(currentPrice);

  const candleW = candles.length > 0 ? candleAreaW / candles.length : 8;
  const bodyW   = Math.max(1.5, candleW * 0.58);

  // ── PanResponder ─────────────────────────────────────────────────────────
  const updateScrubber = (tx: number) => {
    const x   = Math.max(0, Math.min(candleAreaW, tx));
    const idx = Math.min(candles.length - 1, Math.floor((x / candleAreaW) * candles.length));
    setScrubber({ x: (idx + 0.5) * candleW, idx });
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => interactive || zoomable,
    onMoveShouldSetPanResponder:  () => interactive || zoomable,

    onPanResponderGrant: (e) => {
      const touches = e.nativeEvent.touches;
      if (zoomable && touches.length >= 2) {
        const dx = touches[1].pageX - touches[0].pageX;
        const dy = touches[1].pageY - touches[0].pageY;
        pinchRef.current = {
          initDist: Math.sqrt(dx * dx + dy * dy),
          initZoom: zoomRef.current,
        };
        return;
      }
      if (interactive) {
        activeRef.current = true;
        updateScrubber(e.nativeEvent.locationX);
      }
    },

    onPanResponderMove: (e) => {
      const touches = e.nativeEvent.touches;
      if (zoomable && touches.length >= 2 && pinchRef.current) {
        const dx   = touches[1].pageX - touches[0].pageX;
        const dy   = touches[1].pageY - touches[0].pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const next = Math.max(0.5, Math.min(6,
          pinchRef.current.initZoom * (dist / pinchRef.current.initDist),
        ));
        zoomRef.current = next;
        setZoom(next);
        return;
      }
      if (interactive && activeRef.current && touches.length <= 1) {
        updateScrubber(e.nativeEvent.locationX);
      }
    },

    onPanResponderRelease:   () => {
      pinchRef.current  = null;
      activeRef.current = false;
      setScrubber(null);
    },
    onPanResponderTerminate: () => {
      pinchRef.current  = null;
      activeRef.current = false;
      setScrubber(null);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [interactive, zoomable, candles, candleAreaW, candleW]);

  if (!candles.length) return null;

  const sc = scrubber ? candles[scrubber.idx] : null;

  // Grid price levels
  const gridPrices = Array.from({ length: GRID_N + 1 }, (_, i) =>
    minP + (range * i) / GRID_N,
  );

  // OHLC tooltip placement
  const ttW = 118;
  const ttH = 54;
  const ttX = scrubber
    ? (scrubber.x > candleAreaW / 2 ? scrubber.x - ttW - 4 : scrubber.x + 8)
    : 0;

  return (
    <View style={{ width, height }} {...pan.panHandlers}>
      <Svg width={width} height={height}>

        {/* ── Y-axis grid ────────────────────────────────────────────── */}
        {showAxis && gridPrices.map((price, i) => {
          const y = priceToY(price);
          return (
            <React.Fragment key={i}>
              <Line
                x1={0} y1={y} x2={candleAreaW} y2={y}
                stroke="#888" strokeWidth={0.4} opacity={0.2}
              />
              <SvgText
                x={candleAreaW + 5} y={y + 3}
                fontSize={8.5} fill="#6b7280" textAnchor="start"
              >
                {fmt(price)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* ── Candles ────────────────────────────────────────────────── */}
        {candles.map((c, i) => {
          const cx    = i * candleW + candleW / 2;
          const isUp  = c.close >= c.open;
          const cc    = isUp ? "#22c55e" : "#ef4444";
          const yH    = priceToY(c.high);
          const yL    = priceToY(c.low);
          const yTop  = priceToY(Math.max(c.open, c.close));
          const yBot  = priceToY(Math.min(c.open, c.close));
          const bodyH = Math.max(1.5, yBot - yTop);
          const dimmed = scrubber && scrubber.idx !== i;

          return (
            <React.Fragment key={i}>
              <Line
                x1={cx} y1={yH} x2={cx} y2={yL}
                stroke={cc} strokeWidth={1}
                opacity={dimmed ? 0.22 : 0.85}
              />
              <Rect
                x={cx - bodyW / 2} y={yTop}
                width={bodyW} height={bodyH}
                fill={cc} rx={0.5}
                opacity={dimmed ? 0.22 : 0.88}
              />
            </React.Fragment>
          );
        })}


        {/* ── Current price dashed line (TradeView only) ─────────────── */}
        {showAxis && (
          <Line
            x1={0} y1={currentY} x2={candleAreaW} y2={currentY}
            stroke={color} strokeWidth={1}
            strokeDasharray="5 4" opacity={0.7}
          />
        )}

        {/* ── Price pill (showAxis only) ──────────────────────────────── */}
        {showAxis && (
          <>
            <Rect
              x={candleAreaW + 2} y={currentY - PILL_H / 2}
              width={PILL_W - 4}  height={PILL_H}
              rx={5} fill={color} opacity={0.92}
            />
            <SvgText
              x={candleAreaW + 2 + (PILL_W - 4) / 2}
              y={currentY + 1}
              textAnchor="middle" alignmentBaseline="middle"
              fontSize={10} fontWeight="bold" fill="#000"
            >
              {fmt(currentPrice)}
            </SvgText>
          </>
        )}

        {/* ── Scrubber vertical line ──────────────────────────────────── */}
        {interactive && scrubber && (
          <Line
            x1={scrubber.x} y1={0} x2={scrubber.x} y2={height}
            stroke="#fff" strokeWidth={0.8}
            strokeDasharray="4 4" opacity={0.3}
          />
        )}

        {/* ── OHLC tooltip ────────────────────────────────────────────── */}
        {interactive && scrubber && sc && (
          <>
            <Rect
              x={ttX} y={PAD_T}
              width={ttW} height={ttH}
              rx={6} fill="#111827" opacity={0.93}
            />
            {([ ["O", sc.open], ["H", sc.high], ["L", sc.low], ["C", sc.close] ] as [string, number][]).map(
              ([lbl, val], i) => {
                const isUp = sc.close >= sc.open;
                const col  = lbl === "O" ? "#9ca3af"
                           : lbl === "H" ? "#22c55e"
                           : lbl === "L" ? "#ef4444"
                           : isUp ? "#22c55e" : "#ef4444";
                return (
                  <React.Fragment key={lbl}>
                    <SvgText
                      x={ttX + 8 + (i % 2) * 58} y={PAD_T + 18 + Math.floor(i / 2) * 22}
                      fontSize={9} fill="#6b7280"
                    >{lbl}</SvgText>
                    <SvgText
                      x={ttX + 19 + (i % 2) * 58} y={PAD_T + 18 + Math.floor(i / 2) * 22}
                      fontSize={9} fontWeight="bold" fill={col}
                    >{fmt(val)}</SvgText>
                  </React.Fragment>
                );
              },
            )}
          </>
        )}

        {/* ── Zoom hint (shown briefly at first pinch-zoom use) ──────── */}
        {zoomable && zoom !== 1 && (
          <>
            <Rect x={4} y={4} width={50} height={16} rx={4} fill="#111" opacity={0.7} />
            <SvgText x={29} y={13} textAnchor="middle" alignmentBaseline="middle"
              fontSize={9} fill="#aaa">
              {zoom.toFixed(1)}×
            </SvgText>
          </>
        )}

      </Svg>
    </View>
  );
});
