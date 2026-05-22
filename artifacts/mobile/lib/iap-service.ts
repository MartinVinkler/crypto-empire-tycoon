// ── In-App Purchase Service ───────────────────────────────────────────────────
//
// All configuration (product IDs, test switches) lives in monetization-config.ts.
//
// HOW TO GO LIVE:
//   1. Create each product in PLAY_PRODUCT_IDS in Google Play Console.
//   2. Set TEST_IAP_MODE = false in lib/monetization-config.ts.
//   3. Run a new EAS production build (native binary required).

import {
  PLAY_PRODUCT_IDS,
  PlayProductId,
  TEST_IAP_MODE,
} from "@/lib/monetization-config";

// ── Re-export for backward compatibility ──────────────────────────────────────
export { TEST_IAP_MODE };
export const PRODUCT_IDS = PLAY_PRODUCT_IDS;
export type ProductId = PlayProductId;

// ── Product catalogue types ───────────────────────────────────────────────────

export interface IAPProduct {
  id: ProductId;
  title: string;
  price: string;
  priceValue: number;
  description: string;
  icon: string;
  color: string;
  type: "consumable" | "non_consumable";
  category: "cash" | "property" | "upgrade";
  badge?: string;
  fixedCash?: number;
  hoursIncome?: number;
  minCash?: number;
}

// ── Cash packs — consumable, can be bought multiple times ─────────────────────

export const CASH_PACKS: IAPProduct[] = [
  {
    id: PRODUCT_IDS.STARTER_CASH,
    title: "Starter Pack",
    price: "$0.99",
    priceValue: 0.99,
    description: "Quick $25,000 injection to get your empire moving.",
    icon: "cash",
    color: "#39FF14",
    type: "consumable",
    category: "cash",
    fixedCash: 25_000,
  },
  {
    id: PRODUCT_IDS.NANO_PACK,
    title: "Nano Pack",
    price: "$1.49",
    priceValue: 1.49,
    description: "A clean $50,000 to push your early game forward.",
    icon: "alpha-n-circle-outline",
    color: "#00FFC8",
    type: "consumable",
    category: "cash",
    fixedCash: 50_000,
  },
  {
    id: PRODUCT_IDS.BIT_BOOST,
    title: "Bit Boost",
    price: "$1.99",
    priceValue: 1.99,
    description: "A solid $100,000 to accelerate your early empire.",
    icon: "currency-usd",
    color: "#00E5FF",
    type: "consumable",
    category: "cash",
    fixedCash: 100_000,
  },
  {
    id: PRODUCT_IDS.CIRCUIT_PACK,
    title: "Circuit Pack",
    price: "$2.49",
    priceValue: 2.49,
    description: "Straight $200,000 wired into your wallet.",
    icon: "chip",
    color: "#FF9500",
    type: "consumable",
    category: "cash",
    fixedCash: 200_000,
  },
  {
    id: PRODUCT_IDS.BLOCK_REWARD,
    title: "Block Reward",
    price: "$2.99",
    priceValue: 2.99,
    description: "Claim $250,000 — enough to unlock serious upgrades.",
    icon: "cube-outline",
    color: "#FFB800",
    type: "consumable",
    category: "cash",
    fixedCash: 250_000,
  },
  {
    id: PRODUCT_IDS.CRYPTO_WHALE,
    title: "Crypto Whale",
    price: "$4.99",
    priceValue: 4.99,
    description:
      "4 hours of your current passive mining income, minimum $500,000.",
    icon: "bitcoin",
    color: "#FF6B35",
    type: "consumable",
    category: "cash",
    badge: "POPULAR",
    hoursIncome: 4,
    minCash: 500_000,
  },
  {
    id: PRODUCT_IDS.VAULT_PACK,
    title: "Vault Pack",
    price: "$5.49",
    priceValue: 5.49,
    description: "Crack open the vault — $500,000 lands in your account instantly.",
    icon: "safe-square-outline",
    color: "#C0C0C0",
    type: "consumable",
    category: "cash",
    fixedCash: 500_000,
  },
  {
    id: PRODUCT_IDS.HASH_STORM,
    title: "Hash Storm",
    price: "$7.99",
    priceValue: 7.99,
    description:
      "8 hours of passive income hits your wallet in one burst — minimum $2,000,000.",
    icon: "weather-lightning",
    color: "#A855F7",
    type: "consumable",
    category: "cash",
    badge: "GREAT VALUE",
    hoursIncome: 8,
    minCash: 2_000_000,
  },
  {
    id: PRODUCT_IDS.MILLION_DROP,
    title: "Million Drop",
    price: "$10.00",
    priceValue: 10.00,
    description: "One million dollars, delivered straight to your empire. No strings attached.",
    icon: "numeric-1-circle-outline",
    color: "#FFD700",
    type: "consumable",
    category: "cash",
    badge: "1,000,000",
    fixedCash: 1_000_000,
  },
  {
    id: PRODUCT_IDS.GENESIS_BLOCK,
    title: "Genesis Block",
    price: "$14.99",
    priceValue: 14.99,
    description:
      "The legendary first block. 24 hours of income floods your empire — minimum $10,000,000.",
    icon: "hexagon-multiple",
    color: "#FF3B9A",
    type: "consumable",
    category: "cash",
    badge: "BEST VALUE",
    hoursIncome: 24,
    minCash: 10_000_000,
  },
];

// ── Permanent upgrades — non-consumable, purchased once ───────────────────────

export const UPGRADE_PACKS: IAPProduct[] = [
  {
    id: PRODUCT_IDS.REMOVE_ADS,
    title: "Remove Ads",
    price: "$2.99",
    priceValue: 2.99,
    description:
      "Permanently disable all automatic ads. Rewarded bonuses are granted instantly — no video required.",
    icon: "eye-off-outline",
    color: "#FF3B9A",
    type: "non_consumable",
    category: "upgrade",
    badge: "PERMANENT",
  },
  {
    id: PRODUCT_IDS.QUANTUM_RIG,
    title: "Quantum Mining Rig",
    price: "$3.99",
    priceValue: 3.99,
    description:
      "Permanent +20% boost to all mining earnings. Stacks with upgrades and ad boosts forever.",
    icon: "lightning-bolt",
    color: "#A855F7",
    type: "non_consumable",
    category: "upgrade",
    badge: "PERMANENT",
  },
  {
    id: PRODUCT_IDS.TRADING_EDGE,
    title: "Trading Edge",
    price: "$1.99",
    priceValue: 1.99,
    description:
      "Permanent +25% bonus on every stock sell profit. Every trade pays out more, forever.",
    icon: "chart-line-variant",
    color: "#FFD700",
    type: "non_consumable",
    category: "upgrade",
    badge: "PERMANENT",
  },
];

export const IAP_PRODUCTS: IAPProduct[] = [
  ...CASH_PACKS,
  ...UPGRADE_PACKS,
];

// ── Non-consumable product IDs (for restore logic) ────────────────────────────

const NON_CONSUMABLE_IDS: ProductId[] = [
  PRODUCT_IDS.REMOVE_ADS,
  PRODUCT_IDS.QUANTUM_RIG,
  PRODUCT_IDS.TRADING_EDGE,
];

// ── Purchase function ─────────────────────────────────────────────────────────
//
// TEST mode: resolves immediately with success (no real payment).
// LIVE mode: calls RevenueCat SDK (react-native-purchases).
//            RevenueCat handles both Google Play and App Store under the hood.

let Purchases: typeof import("react-native-purchases").default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = require("react-native-purchases").default;
} catch {
  // Not available in web or Expo Go without native build — safe to ignore.
}

const TEST_DELAY_MS = 1200;

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  if (TEST_IAP_MODE) {
    await new Promise((r) => setTimeout(r, TEST_DELAY_MS));
    return true;
  }

  // ── LIVE: RevenueCat ───────────────────────────────────────────────────────
  if (!Purchases) return false;
  try {
    const offerings = await Purchases.getOfferings();
    const allPackages = Object.values(offerings.all).flatMap(
      (o) => o.availablePackages,
    );
    const pkg = allPackages.find((p) => p.product.identifier === productId);
    if (!pkg) return false;
    await Purchases.purchasePackage(pkg);
    return true;
  } catch {
    return false;
  }
}

export async function restorePurchases(
  known: ProductId[],
): Promise<ProductId[]> {
  if (TEST_IAP_MODE) return known;

  // ── LIVE: RevenueCat ───────────────────────────────────────────────────────
  if (!Purchases) return known;
  try {
    const info = await Purchases.restorePurchases();
    const restored: ProductId[] = [];
    for (const id of NON_CONSUMABLE_IDS) {
      // RevenueCat entitlement ID matches the product ID by convention
      if (info.entitlements.active[id] !== undefined) {
        restored.push(id);
      }
    }
    return Array.from(new Set([...known, ...restored]));
  } catch {
    return known;
  }
}
