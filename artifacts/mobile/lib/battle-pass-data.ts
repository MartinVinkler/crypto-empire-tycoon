export type RewardKind = "cash" | "crypto" | "upgrade";

export interface PassReward {
  kind: RewardKind;
  amount?: number;
  upgradeId?: string;
  label: string;
  icon: string;
  color: string;
}

export interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward: PassReward | null;
  premiumReward: PassReward;
}

export const TOTAL_TIERS = 60;
export const FREE_TIERS = 30;
export const SEASON_DAYS = 30;

/**
 * XP required to complete tier `n` (1-indexed).
 * Tier 1 = 50 XP, Tier 60 = 345 XP.
 * Formula: 50 + (n-1) * 5
 */
export function xpForTier(n: number): number {
  return 50 + (n - 1) * 5;
}

/**
 * Cumulative XP required to have fully unlocked tier `n`.
 * = sum of xpForTier(1..n) = n*50 + 5*n*(n-1)/2
 */
export function xpCumulative(n: number): number {
  return n * 50 + (5 * n * (n - 1)) / 2;
}

const cash = (amount: number): PassReward => ({
  kind: "cash",
  amount,
  label: fmtCash(amount),
  icon: "cash-multiple",
  color: "#39FF14",
});

const crypto = (btc: number): PassReward => ({
  kind: "crypto",
  amount: btc,
  label: `${btc >= 1 ? btc : btc} BTC`,
  icon: "bitcoin",
  color: "#FFD700",
});

const upgrade = (id: string, name: string): PassReward => ({
  kind: "upgrade",
  upgradeId: id,
  label: name,
  icon: "gift-outline",
  color: "#A855F7",
});

function fmtCash(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const FREE: (PassReward | null)[] = [
  cash(5_000),          // 1
  cash(10_000),         // 2
  cash(15_000),         // 3
  cash(25_000),         // 4
  cash(50_000),         // 5
  cash(75_000),         // 6
  crypto(0.001),        // 7
  cash(100_000),        // 8
  cash(150_000),        // 9
  upgrade("gpu", "Gaming GPU"), // 10
  cash(200_000),        // 11
  cash(300_000),        // 12
  crypto(0.005),        // 13
  cash(400_000),        // 14
  cash(500_000),        // 15
  cash(750_000),        // 16
  crypto(0.01),         // 17
  cash(1_000_000),      // 18
  cash(1_500_000),      // 19
  upgrade("rig", "Mining Rig"), // 20
  cash(2_000_000),      // 21
  crypto(0.02),         // 22
  cash(2_500_000),      // 23
  cash(3_000_000),      // 24
  cash(4_000_000),      // 25
  cash(5_000_000),      // 26
  crypto(0.05),         // 27
  cash(7_500_000),      // 28
  cash(8_000_000),      // 29
  cash(10_000_000),     // 30
];

const PREMIUM: PassReward[] = [
  cash(25_000),              // 1
  cash(50_000),              // 2
  cash(100_000),             // 3
  cash(150_000),             // 4
  crypto(0.005),             // 5
  cash(250_000),             // 6
  cash(350_000),             // 7
  upgrade("click_overclock", "Overclock"), // 8
  cash(500_000),             // 9
  crypto(0.01),              // 10
  cash(750_000),             // 11
  cash(1_000_000),           // 12
  cash(1_500_000),           // 13
  crypto(0.02),              // 14
  upgrade("asic", "ASIC Miner"), // 15
  cash(2_000_000),           // 16
  cash(2_500_000),           // 17
  crypto(0.05),              // 18
  cash(3_000_000),           // 19
  cash(4_000_000),           // 20
  crypto(0.1),               // 21
  cash(5_000_000),           // 22
  cash(6_000_000),           // 23
  upgrade("click_neural", "Neural Link"), // 24
  crypto(0.2),               // 25
  cash(8_000_000),           // 26
  cash(10_000_000),          // 27
  crypto(0.5),               // 28
  cash(15_000_000),          // 29
  cash(20_000_000),          // 30
  cash(25_000_000),          // 31
  crypto(1),                 // 32
  cash(30_000_000),          // 33
  cash(40_000_000),          // 34
  crypto(2),                 // 35
  cash(50_000_000),          // 36
  cash(60_000_000),          // 37
  crypto(3),                 // 38
  cash(75_000_000),          // 39
  upgrade("warehouse", "Server Farm"), // 40
  cash(100_000_000),         // 41
  crypto(5),                 // 42
  cash(120_000_000),         // 43
  cash(150_000_000),         // 44
  crypto(10),                // 45
  cash(200_000_000),         // 46
  cash(250_000_000),         // 47
  crypto(20),                // 48
  cash(300_000_000),         // 49
  cash(400_000_000),         // 50
  crypto(30),                // 51
  cash(500_000_000),         // 52
  cash(600_000_000),         // 53
  crypto(50),                // 54
  cash(750_000_000),         // 55
  cash(900_000_000),         // 56
  crypto(75),                // 57
  cash(1_000_000_000),       // 58
  cash(1_500_000_000),       // 59
  crypto(100),               // 60
];

export const PASS_TIERS: PassTier[] = Array.from({ length: TOTAL_TIERS }, (_, i) => ({
  tier: i + 1,
  xpRequired: xpCumulative(i + 1),
  freeReward: i < FREE_TIERS ? (FREE[i] ?? null) : null,
  premiumReward: PREMIUM[i]!,
}));
