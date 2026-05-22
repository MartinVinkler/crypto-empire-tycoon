// ── AdMob Service — WEB STUB ──────────────────────────────────────────────────
// This file is the web/default fallback. The native implementation lives in
// admob-service.native.ts and is selected automatically by Metro/Expo bundler
// on Android and iOS builds.
//
// On web there is no AdMob SDK, so we always return false (no reward).

export async function showRewardedAd(): Promise<boolean> {
  return false;
}

export async function showInterstitialAd(): Promise<void> {
  // no-op on web
}
