/**
 * DataHighway — web implementation
 * Layer 1: SVG perspective floor grid (pure vector, static)
 * Layer 2: Canvas data rain (sharp monospace chars, NO shadowBlur, native refresh rate)
 * GPU: will-change: transform promotes canvas to its own compositing layer.
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  hashrateFactor?: number;
}

const NEON       = "#39FF14";
const RAIN_CHARS = "01₿◆█";

// ── Perspective grid constants (percentage coords, vanishing point at 50%, 40%) ──
const VP = { x: 50, y: 40 };

// Radial lines: VP → bottom edge at various x positions
const RADIALS = [0, 6, 13, 22, 33, 42, 50, 58, 67, 78, 87, 94, 100];

// Horizontal lines: y from VP.y to 100%, width grows with depth
const H_COUNT = 10;
const HORIZONTALS = Array.from({ length: H_COUNT }, (_, i) => {
  const t   = (i + 1) / H_COUNT;
  const y   = VP.y + t * (100 - VP.y);
  const hw  = t * 52; // half-width grows with depth
  return { x1: VP.x - hw, y1: y, x2: VP.x + hw, y2: y };
});

type Drop = { x: number; y: number; speed: number; char: string; alpha: number };

export function DataHighway({ hashrateFactor = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef   = useRef<number>(0);
  const hrRef     = useRef(hashrateFactor);

  useEffect(() => { hrRef.current = Math.max(1, hashrateFactor); }, [hashrateFactor]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false }); // opaque = faster compositing
    if (!ctx) return;

    const W   = window.innerWidth;
    const H   = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× — no benefit beyond
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    const CELL = 20;
    const cols = Math.ceil(W / CELL);

    const drops: Drop[] = Array.from({ length: cols }, (_, i) => ({
      x:     i * CELL + CELL * 0.5,
      y:     Math.random() * H,
      speed: 45 + Math.random() * 70,
      char:  RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
      alpha: 0.18 + Math.random() * 0.38,
    }));

    // Set once — these never change between frames
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    ctx.font         = "bold 11px 'Courier New', Courier, monospace";
    ctx.shadowBlur   = 0;   // SHARP — absolutely no blur

    let last = performance.now();
    const frame = (now: number) => {
      const dt  = Math.min((now - last) / 1000, 0.05);
      last = now;
      const hr  = hrRef.current;

      // Subtle trail — deep black with low alpha so chars fade
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, W, H);

      // Reset font every frame in case the browser clobbers it — cheap
      ctx.fillStyle = NEON;

      for (const d of drops) {
        d.y += d.speed * dt * (1 + (hr - 1) * 0.18);
        if (d.y > H + 16) {
          d.y     = -16;
          d.char  = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
          d.alpha = 0.15 + Math.random() * 0.38;
          d.speed = 45 + Math.random() * 70;
        }
        ctx.globalAlpha = d.alpha;
        ctx.fillText(d.char, d.x, d.y);
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Layer 1: SVG perspective grid — static, zero JS overhead */}
      {/* @ts-ignore — SVG is valid in Expo web */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {RADIALS.map((bx, i) => (
          // @ts-ignore
          <line
            key={`r${i}`}
            x1={VP.x} y1={VP.y}
            x2={bx}   y2={100}
            stroke={NEON}
            strokeWidth="0.35"
            opacity="0.07"
          />
        ))}
        {HORIZONTALS.map((h, i) => (
          // @ts-ignore
          <line
            key={`h${i}`}
            x1={h.x1} y1={h.y1}
            x2={h.x2} y2={h.y2}
            stroke={NEON}
            strokeWidth="0.35"
            opacity="0.065"
          />
        ))}
      </svg>

      {/* Layer 2: canvas data rain — GPU compositing layer via will-change */}
      {/* @ts-ignore */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          // Promotes to GPU compositing layer — eliminates CPU repaint cost
          willChange: "transform",
        }}
      />
    </View>
  );
}
