// ── Dark palette (default) ─────────────────────────────────────────────────
const dark = {
  bg: "#050505",
  bgElevated: "#0d0d12",
  bgCard: "#11141c",
  border: "#1f2330",
  borderBright: "#2a3146",
  text: "#e8f1ff",
  textDim: "#7d8aa8",
  textMuted: "#4a5470",
  neon: "#39FF14",
  neonDim: "#1a8c0a",
  electric: "#00d9ff",
  electricDim: "#0a6b85",
  magenta: "#ff2bd6",
  amber: "#ffb800",
  danger: "#ff3b6b",
  glass: "rgba(15, 20, 30, 0.55)",
};

// ── Light palette ──────────────────────────────────────────────────────────
const light = {
  bg: "#f5f7fa",
  bgElevated: "#ffffff",
  bgCard: "#edf0f7",
  border: "#dde3ee",
  borderBright: "#c8d1e0",
  text: "#1a1f2e",
  textDim: "#5a6680",
  textMuted: "#8891a8",
  neon: "#15803d",       // darker green — readable on white
  neonDim: "#14532d",
  electric: "#0891b2",   // darker cyan
  electricDim: "#0e7490",
  magenta: "#a21caf",
  amber: "#b45309",
  danger: "#dc2626",
  glass: "rgba(245, 247, 250, 0.90)",
};

function makeTokens(p: typeof dark) {
  return {
    text: p.text,
    tint: p.neon,
    background: p.bg,
    foreground: p.text,
    card: p.bgCard,
    cardForeground: p.text,
    primary: p.neon,
    primaryForeground: "#000000",
    secondary: p.bgElevated,
    secondaryForeground: p.text,
    muted: p.bgElevated,
    mutedForeground: p.textDim,
    accent: p.electric,
    accentForeground: "#000000",
    destructive: p.danger,
    destructiveForeground: "#ffffff",
    border: p.border,
    input: p.borderBright,
    neon: p.neon,
    neonDim: p.neonDim,
    electric: p.electric,
    electricDim: p.electricDim,
    magenta: p.magenta,
    amber: p.amber,
    danger: p.danger,
    bgElevated: p.bgElevated,
    textDim: p.textDim,
    textMuted: p.textMuted,
    borderBright: p.borderBright,
    glass: p.glass,
    // raw bg for root background
    bg: p.bg,
  };
}

const colors = {
  dark: makeTokens(dark),
  light: makeTokens(light),
  radius: 14,
};

export default colors;
