export type UpgradeKind = "click" | "passive" | "click_mult";

export interface UpgradeDef {
  id: string;
  name: string;
  tagline: string;
  kind: UpgradeKind;
  baseCost: number;
  baseValue: number;
  icon: string;
  iconLib: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome5";
  color: string;
  asset: string;
}

// Exponential scaling — each purchase costs 12% more than the last.
export const GROWTH_RATE = 1.12;

export const UPGRADES: UpgradeDef[] = [
  // ── TIER 1 — Early game ($10 – $1K) ────────────────────────────────────
  {
    id: "cpu",
    name: "Old CPU",
    tagline: "+0.005 BTC/sec passive",
    kind: "passive",
    baseCost: 10,
    baseValue: 0.005,
    icon: "chip",
    iconLib: "MaterialCommunityIcons",
    color: "#7d8aa8",
    asset: "cpu.png",
  },
  {
    id: "click_overclock",
    name: "Overclock",
    tagline: "+0.05 BTC per tap",
    kind: "click",
    baseCost: 25,
    baseValue: 0.05,
    icon: "flash",
    iconLib: "Ionicons",
    color: "#ffb800",
    asset: "overclock.png",
  },
  {
    id: "gpu",
    name: "Gaming GPU",
    tagline: "+0.05 BTC/sec passive",
    kind: "passive",
    baseCost: 100,
    baseValue: 0.05,
    icon: "expansion-card",
    iconLib: "MaterialCommunityIcons",
    color: "#00d9ff",
    asset: "gpu.png",
  },
  {
    id: "click_gpu_boost",
    name: "GPU Boost",
    tagline: "×1.2 tap value multiplier",
    kind: "click_mult",
    baseCost: 500,
    baseValue: 1.2,
    icon: "rocket-launch",
    iconLib: "MaterialCommunityIcons",
    color: "#ff2bd6",
    asset: "overclock.png",
  },

  // ── TIER 2 — Mid game ($1K – $1M) ──────────────────────────────────────
  {
    id: "rig",
    name: "Mining Rig",
    tagline: "+0.5 BTC/sec passive",
    kind: "passive",
    baseCost: 2_000,
    baseValue: 0.5,
    icon: "server",
    iconLib: "MaterialCommunityIcons",
    color: "#39FF14",
    asset: "rig.png",
  },
  {
    id: "click_finger",
    name: "Bionic Finger",
    tagline: "+1 BTC per tap",
    kind: "click",
    baseCost: 10_000,
    baseValue: 1,
    icon: "hand-back-right",
    iconLib: "MaterialCommunityIcons",
    color: "#ff2bd6",
    asset: "finger.png",
  },
  {
    id: "click_neural",
    name: "Neural Link",
    tagline: "×1.5 tap value multiplier",
    kind: "click_mult",
    baseCost: 50_000,
    baseValue: 1.5,
    icon: "brain",
    iconLib: "MaterialCommunityIcons",
    color: "#00d9ff",
    asset: "finger.png",
  },
  {
    id: "asic",
    name: "ASIC Miner",
    tagline: "+10 BTC/sec passive",
    kind: "passive",
    baseCost: 200_000,
    baseValue: 10,
    icon: "harddisk",
    iconLib: "MaterialCommunityIcons",
    color: "#ffb800",
    asset: "asic.png",
  },

  // ── TIER 3 — Late game ($1M – $1B) ─────────────────────────────────────
  {
    id: "click_quantum_cpu",
    name: "Quantum CPU",
    tagline: "×2.0 tap value multiplier",
    kind: "click_mult",
    baseCost: 2_000_000,
    baseValue: 2.0,
    icon: "atom-variant",
    iconLib: "MaterialCommunityIcons",
    color: "#39FF14",
    asset: "quantum.png",
  },
  {
    id: "warehouse",
    name: "Server Farm",
    tagline: "+200 BTC/sec passive",
    kind: "passive",
    baseCost: 10_000_000,
    baseValue: 200,
    icon: "warehouse",
    iconLib: "MaterialCommunityIcons",
    color: "#00d9ff",
    asset: "warehouse.png",
  },
  {
    id: "datacenter",
    name: "Data Center",
    tagline: "+2,500 BTC/sec passive",
    kind: "passive",
    baseCost: 200_000_000,
    baseValue: 2_500,
    icon: "office-building",
    iconLib: "MaterialCommunityIcons",
    color: "#39FF14",
    asset: "datacenter.png",
  },

  // ── TIER 4 — End game ($1B+) ───────────────────────────────────────────
  {
    id: "click_singularity",
    name: "Singularity Core",
    tagline: "×3.0 tap value multiplier",
    kind: "click_mult",
    baseCost: 5_000_000_000,
    baseValue: 3.0,
    icon: "shimmer",
    iconLib: "MaterialCommunityIcons",
    color: "#ff2bd6",
    asset: "quantum.png",
  },
  {
    id: "quantum",
    name: "Quantum Mine",
    tagline: "+50K BTC/sec passive",
    kind: "passive",
    baseCost: 50_000_000_000,
    baseValue: 50_000,
    icon: "atom",
    iconLib: "MaterialCommunityIcons",
    color: "#ff2bd6",
    asset: "quantum.png",
  },
  {
    id: "moon_colony",
    name: "Moon Colony",
    tagline: "+1M BTC/sec passive",
    kind: "passive",
    baseCost: 1_000_000_000_000,
    baseValue: 1_000_000,
    icon: "moon-waning-crescent",
    iconLib: "MaterialCommunityIcons",
    color: "#00d9ff",
    asset: "datacenter.png",
  },
  {
    id: "global_bank",
    name: "Global Bank",
    tagline: "+25M BTC/sec passive",
    kind: "passive",
    baseCost: 50_000_000_000_000,
    baseValue: 25_000_000,
    icon: "bank",
    iconLib: "MaterialCommunityIcons",
    color: "#39FF14",
    asset: "warehouse.png",
  },
];

// ── Market — bounded random walk between $0.01 and $1.00 ────────────────
export const STARTING_CRYPTO_PRICE = 0.50;
export const PRICE_TICK_MS = 3000;
export const PRICE_VOLATILITY_MIN = 0.04;
export const PRICE_VOLATILITY_MAX = 0.10;
// Spike event: small chance of a much larger swing per tick (the "moon shot")
export const SPIKE_CHANCE = 0.10;
export const SPIKE_MAGNITUDE_MIN = 0.15;
export const SPIKE_MAGNITUDE_MAX = 0.40;
export const PRICE_HISTORY_LENGTH = 30;
// Hard floor and ceiling — price is always clamped to this range.
export const MIN_CRYPTO_PRICE = 0.01;
export const MAX_CRYPTO_PRICE = 1.00;
// Baseline the mean-reversion pulls toward — midpoint of the range.
export const BTC_BASELINE_PRICE = 0.50;
// No linear drift — price stays bounded via mean-reversion + hard clamp.
export const PRICE_DRIFT_PER_TICK = 0;
// Mean-reversion strength: how hard price is pulled back toward the baseline.
export const PRICE_MEAN_REVERSION = 0.12;

// 1 BTC per tap — tap value = exactly the live BTC price in USD
export const BASE_CLICK_VALUE = 1.0;

// Prestige requires $5M in BTC value (was $1M) — much harder first reset
export const PRESTIGE_THRESHOLD_USD = 5_000_000;
export const PRESTIGE_MULTIPLIER = 2;

export const BOOST_DURATION_MS = 30_000;
export const BOOST_MULTIPLIER = 2;        // was 3 — less overpowered
export const BOOST_COOLDOWN_MS = 120_000; // was 90 s — 2 min cooldown

export const SAVE_KEY = "@crypto_empire_save_v1";
// Bump when the mining economy changes — only mining fields reset, cash/holdings preserved.
export const ECONOMY_VERSION = 6;
export const TUTORIAL_KEY = "@crypto_empire_tutorial_v1";
export const TUTORIAL_TAPS_REQUIRED = 5;
