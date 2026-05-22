export type StockSymbol =
  | "AAPL" | "GOOGL" | "TSLA" | "AMZN" | "NVDA" | "META"
  | "MSFT" | "NFLX" | "DIS"  | "MCD"  | "NKE"  | "KO"
  | "SBUX" | "V"    | "MA"   | "AMD"  | "INTC" | "BABA"
  | "SONY" | "ORCL" | "JPM";

export interface StockDef {
  symbol: StockSymbol;
  name: string;
  initialPrice: number;
  volatility: number;
  drift: number;
  tier: "stable" | "balanced" | "volatile";
  accent: string;
  glyph: string;
}

export const STOCKS: StockDef[] = [
  // ── Original 6 ───────────────────────────────────────────────────────────────
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    initialPrice: 195.42,
    volatility: 0.004,
    drift: 0.00008,
    tier: "stable",
    accent: "#dadada",
    glyph: "",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    initialPrice: 165.18,
    volatility: 0.005,
    drift: 0.00007,
    tier: "stable",
    accent: "#4285F4",
    glyph: "G",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    initialPrice: 242.7,
    volatility: 0.014,
    drift: 0.00005,
    tier: "volatile",
    accent: "#e82127",
    glyph: "T",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    initialPrice: 184.55,
    volatility: 0.007,
    drift: 0.00006,
    tier: "balanced",
    accent: "#ff9900",
    glyph: "a",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    initialPrice: 880.3,
    volatility: 0.018,
    drift: 0.00018,
    tier: "volatile",
    accent: "#76b900",
    glyph: "N",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    initialPrice: 511.6,
    volatility: 0.009,
    drift: 0.00008,
    tier: "balanced",
    accent: "#1877f2",
    glyph: "M",
  },

  // ── 15 New stocks ─────────────────────────────────────────────────────────────
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    initialPrice: 415.2,
    volatility: 0.004,
    drift: 0.00009,
    tier: "stable",
    accent: "#00a4ef",
    glyph: "M",
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    initialPrice: 628.4,
    volatility: 0.011,
    drift: 0.00007,
    tier: "balanced",
    accent: "#e50914",
    glyph: "N",
  },
  {
    symbol: "DIS",
    name: "Walt Disney Co.",
    initialPrice: 91.3,
    volatility: 0.006,
    drift: 0.00004,
    tier: "stable",
    accent: "#4fc3f7",
    glyph: "D",
  },
  {
    symbol: "MCD",
    name: "McDonald's Corp.",
    initialPrice: 273.8,
    volatility: 0.003,
    drift: 0.00006,
    tier: "stable",
    accent: "#ffbc0d",
    glyph: "M",
  },
  {
    symbol: "NKE",
    name: "Nike Inc.",
    initialPrice: 78.5,
    volatility: 0.006,
    drift: 0.00005,
    tier: "balanced",
    accent: "#e0e0e0",
    glyph: "N",
  },
  {
    symbol: "KO",
    name: "Coca-Cola Co.",
    initialPrice: 61.4,
    volatility: 0.003,
    drift: 0.00005,
    tier: "stable",
    accent: "#f40000",
    glyph: "K",
  },
  {
    symbol: "SBUX",
    name: "Starbucks Corp.",
    initialPrice: 78.9,
    volatility: 0.007,
    drift: 0.00004,
    tier: "stable",
    accent: "#00704a",
    glyph: "S",
  },
  {
    symbol: "V",
    name: "Visa Inc.",
    initialPrice: 277.3,
    volatility: 0.004,
    drift: 0.00007,
    tier: "stable",
    accent: "#1565c0",
    glyph: "V",
  },
  {
    symbol: "MA",
    name: "Mastercard Inc.",
    initialPrice: 462.1,
    volatility: 0.005,
    drift: 0.00008,
    tier: "stable",
    accent: "#eb001b",
    glyph: "M",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    initialPrice: 178.6,
    volatility: 0.016,
    drift: 0.00012,
    tier: "volatile",
    accent: "#ed1c24",
    glyph: "A",
  },
  {
    symbol: "INTC",
    name: "Intel Corp.",
    initialPrice: 30.4,
    volatility: 0.008,
    drift: 0.00002,
    tier: "balanced",
    accent: "#0071c5",
    glyph: "i",
  },
  {
    symbol: "BABA",
    name: "Alibaba Group",
    initialPrice: 82.1,
    volatility: 0.013,
    drift: 0.00004,
    tier: "volatile",
    accent: "#ff6a00",
    glyph: "A",
  },
  {
    symbol: "SONY",
    name: "Sony Group Corp.",
    initialPrice: 95.7,
    volatility: 0.007,
    drift: 0.00005,
    tier: "balanced",
    accent: "#90a4ae",
    glyph: "S",
  },
  {
    symbol: "ORCL",
    name: "Oracle Corp.",
    initialPrice: 128.3,
    volatility: 0.006,
    drift: 0.00006,
    tier: "balanced",
    accent: "#f80000",
    glyph: "O",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    initialPrice: 197.5,
    volatility: 0.005,
    drift: 0.00007,
    tier: "stable",
    accent: "#005eb8",
    glyph: "J",
  },
];

// 2-second tick; 150 ticks = 5-minute candle; 576 candles = 48H of price history
export const STOCK_TICK_MS        = 2000;
export const TICKS_PER_CANDLE    = 150;
export const HISTORY_CANDLES     = 576;   // 48h at 5-min resolution
export const CANDLE_HISTORY      = HISTORY_CANDLES; // legacy alias

// Keep for GameContext compat
export const PRICE_HISTORY_TICKS = HISTORY_CANDLES;

export const STARTING_CASH_USD       = 2_000;
export const DIVIDEND_INTERVAL_MS   = 10 * 60 * 1000;  // every 10 min (was 5)
export const DIVIDEND_RATE_PER_SHARE = 0.0003;          // was 0.0008
