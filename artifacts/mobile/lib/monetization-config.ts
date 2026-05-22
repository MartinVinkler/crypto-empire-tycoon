// ── Monetization Configuration ────────────────────────────────────────────────
//
// Single source of truth for every IAP and AdMob setting.
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  GOING LIVE CHECKLIST (flip switches, build, ship)                       │
// │                                                                          │
// │  1. Set TEST_IAP_MODE = false  → real Google Play billing                │
// │  2. Set TEST_AD_MODE  = false  → real AdMob SDK ads                      │
// │  3. Create each product from PLAY_PRODUCT_IDS in Google Play Console:    │
// │       Monetize → Products → In-app products                              │
// │       Use the EXACT string values below as the product ID.               │
// │  4. Create ad units in AdMob, paste IDs into ADMOB_IDS below.            │
// │  5. Run a new EAS production build (native rebuild required).            │
// └──────────────────────────────────────────────────────────────────────────┘

// ── Master test switches ──────────────────────────────────────────────────────
//
// TEST_IAP_MODE = true  → simulates purchase instantly, no real payment charged
// TEST_IAP_MODE = false → calls real RevenueCat / Google Play billing
//
// TEST_AD_MODE  = true  → shows a fullscreen countdown placeholder
//                         (works on web and Expo Go — no native binary needed)
// TEST_AD_MODE  = false → calls real Google AdMob SDK
//                         (requires an EAS native build targeting the Play Store)
//
export const TEST_IAP_MODE = true;
export const TEST_AD_MODE  = true;

// ── Automatic interstitial interval ──────────────────────────────────────────
// How often an automatic (non-rewarded) interstitial ad fires.
// Completely skipped when the player owns PLAY_PRODUCT_IDS.REMOVE_ADS.
export const INTERSTITIAL_INTERVAL_MS = 10 * 60_000; // 10 minutes

// ── Google Play Product IDs ───────────────────────────────────────────────────
//
// Rules for Google Play product IDs:
//   • Lowercase letters, numbers, and underscores only
//   • Cannot be changed after a product is published
//   • Must be registered in Google Play Console before going live
//
// Register consumables under:  Monetize → Products → In-app products
// Register non-consumables under the same section (mark as "Managed product")
//
export const PLAY_PRODUCT_IDS = {

  // ── Consumable cash packs — can be purchased any number of times ────────────
  STARTER_CASH:   "crypto_empire_starter_cash",   // $0.99   →  $25,000 cash
  NANO_PACK:      "crypto_empire_nano_pack",       // $1.49   →  $50,000 cash
  BIT_BOOST:      "crypto_empire_bit_boost",       // $1.99   →  $100,000 cash
  CIRCUIT_PACK:   "crypto_empire_circuit_pack",    // $2.49   →  $200,000 cash
  BLOCK_REWARD:   "crypto_empire_block_reward",    // $2.99   →  $250,000 cash
  CRYPTO_WHALE:   "crypto_empire_crypto_whale",    // $4.99   →  4h income (min $500K)
  VAULT_PACK:     "crypto_empire_vault_pack",      // $5.49   →  $500,000 cash
  HASH_STORM:     "crypto_empire_hash_storm",      // $7.99   →  8h income (min $2M)
  MILLION_DROP:   "crypto_empire_million_drop",    // $10.00  →  $1,000,000 cash
  GENESIS_BLOCK:  "crypto_empire_genesis_block",   // $14.99  →  24h income (min $10M)

  // ── Non-consumable permanent upgrades — purchased once, always restorable ──
  REMOVE_ADS:     "crypto_empire_remove_ads",      // $2.99   →  disables all auto-interstitials
  QUANTUM_RIG:    "crypto_empire_quantum_rig",     // $3.99   →  +20% mining income, forever
  TRADING_EDGE:   "crypto_empire_trading_edge",    // $1.99   →  +25% stock sell profit, forever
  SEASON_PASS:    "crypto_empire_season_pass",     // $5.00   →  unlocks all 60 Battle Pass tiers

} as const;

export type PlayProductId = (typeof PLAY_PRODUCT_IDS)[keyof typeof PLAY_PRODUCT_IDS];

// ── AdMob Unit IDs ────────────────────────────────────────────────────────────
//
// Create ad units at: https://admob.google.com → Monetize → Ad units
// Format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
//
// Android rewarded + interstitial IDs are already registered for your AdMob account.
// iOS IDs use Google's official public test IDs — replace them before launching on iOS.
//
export const ADMOB_IDS = {
  // Rewarded ads — player voluntarily watches for a bonus (XP, boosts, upgrades)
  REWARDED_ANDROID:     "ca-app-pub-3746303958850165/6767988863",
  REWARDED_IOS:         "ca-app-pub-3940256099942544/1712485313",  // ← replace before iOS launch

  // Interstitial ads — fires automatically every INTERSTITIAL_INTERVAL_MS
  //                    suppressed when player owns crypto_empire_remove_ads
  INTERSTITIAL_ANDROID: "ca-app-pub-3746303958850165/1926954638",
  INTERSTITIAL_IOS:     "ca-app-pub-3940256099942544/4411468910",  // ← replace before iOS launch
} as const;
