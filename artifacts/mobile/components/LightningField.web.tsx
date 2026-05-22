/**
 * LightningField — web implementation
 *
 * Bold SVG rings with neon SVG filter glow + RAF-based 60fps spinning.
 * Direct DOM setAttribute — zero React re-renders per frame.
 * boost() spikes rotation speed then decays back to normal.
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";

export interface LightningFieldHandle {
  boost: () => void;
}

interface Props {
  color: string;
  size: number;
}

const NORMAL_SPEED = 0.28;
const BOOST_SPEED  = 3.5;
const BOOST_FRAMES = 38;

export const LightningField = forwardRef<LightningFieldHandle, Props>(
  ({ color, size }, ref) => {
    const cx = size / 2;
    const cy = size / 2;

    const r1 = size * 0.365;  // inner solid ring
    const r2 = size * 0.408;  // spinning dashed ring
    const r3 = size * 0.458;  // outer solid ring

    const spinRef     = useRef<Element | null>(null);
    const rafRef      = useRef<number>(0);
    const angleRef    = useRef(0);
    const speedRef    = useRef(NORMAL_SPEED);
    const boostFrames = useRef(0);

    useEffect(() => {
      const tick = () => {
        if (boostFrames.current > 0) {
          boostFrames.current--;
          const t = boostFrames.current / BOOST_FRAMES;
          speedRef.current = NORMAL_SPEED + (BOOST_SPEED - NORMAL_SPEED) * t;
        } else {
          speedRef.current = NORMAL_SPEED;
        }

        angleRef.current = (angleRef.current + speedRef.current) % 360;
        const el = spinRef.current;
        if (el) {
          el.setAttribute("transform", `rotate(${angleRef.current.toFixed(2)} ${cx} ${cy})`);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [cx, cy]);

    useImperativeHandle(ref, () => ({
      boost() {
        speedRef.current    = BOOST_SPEED;
        boostFrames.current = BOOST_FRAMES;
      },
    }));

    // HUD tick marks at N / E / S / W
    const tickLen = size * 0.044;
    const tickR   = r3 + size * 0.020;
    const ticks   = [0, 90, 180, 270].map((a) => {
      const rad = (a * Math.PI) / 180;
      const x1  = cx + Math.cos(rad) * tickR;
      const y1  = cy + Math.sin(rad) * tickR;
      const x2  = cx + Math.cos(rad) * (tickR + tickLen);
      const y2  = cy + Math.sin(rad) * (tickR + tickLen);
      return { x1, y1, x2, y2, key: a };
    });

    return (
      <View
        pointerEvents="none"
        style={[styles.container, { width: size, height: size }]}
      >
        {/* @ts-ignore — SVG in Expo web */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* SVG filter: neon glow (Gaussian blur blended with source) */}
          {/* @ts-ignore */}
          <defs>
            {/* @ts-ignore */}
            <filter id="neon" x="-40%" y="-40%" width="180%" height="180%">
              {/* @ts-ignore */}
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              {/* @ts-ignore */}
              <feMerge>
                {/* @ts-ignore */}
                <feMergeNode in="blur" />
                {/* @ts-ignore */}
                <feMergeNode in="blur" />
                {/* @ts-ignore */}
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Subtler glow for outer / static rings */}
            {/* @ts-ignore */}
            <filter id="neonSoft" x="-30%" y="-30%" width="160%" height="160%">
              {/* @ts-ignore */}
              <feGaussianBlur stdDeviation="2" result="blur" />
              {/* @ts-ignore */}
              <feMerge>
                {/* @ts-ignore */}
                <feMergeNode in="blur" />
                {/* @ts-ignore */}
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Inner solid ring */}
          {/* @ts-ignore */}
          <circle
            cx={cx} cy={cy} r={r1}
            stroke={color}
            strokeWidth="2"
            fill="none"
            opacity="0.75"
            filter="url(#neonSoft)"
          />

          {/* Spinning dashed ring — rotated by RAF, has strongest glow */}
          {/* @ts-ignore */}
          <circle
            ref={spinRef as React.RefObject<SVGCircleElement>}
            cx={cx} cy={cy} r={r2}
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeDasharray="26 10"
            opacity="0.95"
            filter="url(#neon)"
          />

          {/* Outer solid ring */}
          {/* @ts-ignore */}
          <circle
            cx={cx} cy={cy} r={r3}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            opacity="0.52"
            filter="url(#neonSoft)"
          />

          {/* HUD tick marks */}
          {ticks.map(({ x1, y1, x2, y2, key }) => (
            // @ts-ignore
            <line
              key={key}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="2.5"
              opacity="0.88"
              filter="url(#neonSoft)"
            />
          ))}

          {/* Corner arc segments at diagonals */}
          {[45, 135, 225, 315].map((a) => {
            const rad   = (a * Math.PI) / 180;
            const arcR  = r3 + size * 0.045;
            const sweep = (14 * Math.PI) / 180;
            const x1    = cx + Math.cos(rad - sweep) * arcR;
            const y1    = cy + Math.sin(rad - sweep) * arcR;
            const x2    = cx + Math.cos(rad + sweep) * arcR;
            const y2    = cy + Math.sin(rad + sweep) * arcR;
            return (
              // @ts-ignore
              <path
                key={a}
                d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
                opacity="0.65"
                filter="url(#neonSoft)"
              />
            );
          })}
        </svg>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { position: "absolute" },
});
