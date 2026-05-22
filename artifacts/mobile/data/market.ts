import { HISTORY_CANDLES, STOCKS, StockDef, StockSymbol, TICKS_PER_CANDLE } from "@/data/stocks";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MarketState {
  price: number;       // current live price (updates every STOCK_TICK_MS)
  dayOpen: number;     // price 24 h ago — basis for changePct
  history: number[];   // 5-min candle closing prices, up to HISTORY_CANDLES (48 h)
  momentum: number;    // –1…1, sustains bull / bear trends
  tickIdx: number;     // ticks elapsed within current 5-min candle
  changePct: number;   // % change vs dayOpen
  high24h: number;     // rolling 24 h high
  low24h: number;      // rolling 24 h low
}

// Legacy shim — CandleChart still references these types; will be removed
// once the new BezierChart component is wired up.
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export type StockMarket = Record<StockSymbol, MarketState>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Pre-seed 48 h of history ──────────────────────────────────────────────────

function seedHistory(def: StockDef): number[] {
  const candles: number[] = [];
  let price = def.initialPrice;
  let momentum = 0;
  for (let i = 0; i < HISTORY_CANDLES; i++) {
    // Several micro-steps per candle → realistic intra-candle movement
    for (let j = 0; j < 8; j++) {
      momentum = momentum * 0.97 + gaussian() * 0.09;
      const shock =
        momentum * def.volatility * 0.75 +
        def.drift +
        gaussian() * def.volatility * 0.35;
      price = Math.max(def.initialPrice * 0.15, price * (1 + shock));
    }
    candles.push(price);
  }
  return candles;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initMarket(): StockMarket {
  const out = {} as StockMarket;
  for (const s of STOCKS) {
    const history = seedHistory(s);
    const currentPrice = history[history.length - 1];
    // dayOpen = price exactly 24 h ago = candle at index (len - 288)
    const dayOpenIdx = Math.max(0, history.length - 288);
    const dayOpen = history[dayOpenIdx];
    const h24 = history.slice(-288);
    out[s.symbol] = {
      price: currentPrice,
      dayOpen,
      history,
      momentum: 0,
      tickIdx: 0,
      changePct: ((currentPrice - dayOpen) / dayOpen) * 100,
      high24h: Math.max(...h24),
      low24h: Math.min(...h24),
    };
  }
  return out;
}

// ── Tick (called every STOCK_TICK_MS = 2 s) ───────────────────────────────────

export function tickStock(state: MarketState, def: StockDef): MarketState {
  // Momentum decays slowly → sustained bull/bear trends
  const newMomentum = state.momentum * 0.97 + gaussian() * 0.09;

  const shock =
    newMomentum * def.volatility * 0.75 +
    def.drift +
    gaussian() * def.volatility * 0.35;

  const next = Math.max(def.initialPrice * 0.15, state.price * (1 + shock));

  // Commit a new 5-min candle every TICKS_PER_CANDLE ticks
  let history = state.history;
  let tickIdx = state.tickIdx + 1;
  if (tickIdx >= TICKS_PER_CANDLE) {
    history = [...state.history, next].slice(-HISTORY_CANDLES);
    tickIdx = 0;
  }

  // Rolling 24 h stats (last 288 candles × 5 min = 24 h)
  const h24 = history.slice(-288);
  const high24h = h24.length > 0 ? Math.max(...h24, next) : next;
  const low24h  = h24.length > 0 ? Math.min(...h24, next) : next;

  return {
    price: next,
    dayOpen: state.dayOpen,
    history,
    momentum: newMomentum,
    tickIdx,
    changePct: ((next - state.dayOpen) / state.dayOpen) * 100,
    high24h,
    low24h,
  };
}
