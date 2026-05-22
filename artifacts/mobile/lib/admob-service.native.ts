// ── AdMob Service — NATIVE (Android / iOS) ────────────────────────────────────
//
// HOW TO GO LIVE:
//   1. Sign up at https://admob.google.com and create your app.
//   2. In ADMOB_IDS (lib/monetization-config.ts) replace the placeholder iOS IDs
//      with your real unit IDs (format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX).
//   3. In app.config.ts replace androidAppId / iosAppId with your real AdMob App IDs
//      (found in AdMob: App settings → App ID, format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX).
//   4. Set TEST_AD_MODE = false in lib/monetization-config.ts.
//   5. Run a new EAS build — app.config changes require a new native binary.
//
// NOTE: All unit IDs are imported from lib/monetization-config.ts.
//       Edit them there, not here.
//
// NOTE: This file uses a try/catch around the native module require so the app
// works in Expo Go (which lacks the native binary). In that case both functions
// resolve immediately and AdContext falls back to its TEST_AD_MODE modal.

import { Platform } from "react-native";
import { ADMOB_IDS } from "@/lib/monetization-config";

const REWARDED_UNIT_ID =
  Platform.OS === "ios"
    ? ADMOB_IDS.REWARDED_IOS
    : ADMOB_IDS.REWARDED_ANDROID;

const INTERSTITIAL_UNIT_ID =
  Platform.OS === "ios"
    ? ADMOB_IDS.INTERSTITIAL_IOS
    : ADMOB_IDS.INTERSTITIAL_ANDROID;

// Lazily resolved — null when native binary is missing (Expo Go / web)
let Ads: {
  RewardedAd: any;
  RewardedAdEventType: any;
  AdEventType: any;
  InterstitialAd: any;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("react-native-google-mobile-ads");
  Ads = {
    RewardedAd:          mod.RewardedAd,
    RewardedAdEventType: mod.RewardedAdEventType,
    AdEventType:         mod.AdEventType,
    InterstitialAd:      mod.InterstitialAd,
  };
} catch {
  Ads = null;
}

/**
 * Load and show a rewarded ad.
 * Resolves to `true` if the user earned the reward, `false` otherwise.
 * Falls back to `false` when native module is unavailable (Expo Go).
 */
export function showRewardedAd(): Promise<boolean> {
  if (!Ads) return Promise.resolve(false);

  const { RewardedAd, RewardedAdEventType, AdEventType } = Ads;

  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    let rewardEarned = false;
    const unsubs: (() => void)[] = [];

    function cleanup() {
      unsubs.forEach((fn) => fn());
    }

    unsubs.push(
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show();
      }),
    );

    unsubs.push(
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarned = true;
      }),
    );

    unsubs.push(
      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        resolve(rewardEarned);
      }),
    );

    unsubs.push(
      rewarded.addAdEventListener(AdEventType.ERROR, (_error: any) => {
        cleanup();
        resolve(false);
      }),
    );

    rewarded.load();
  });
}

/**
 * Load and show an interstitial (automatic) ad.
 * Resolves when the ad closes or on error.
 * Falls back to no-op when native module is unavailable (Expo Go).
 * Never called when player owns crypto_empire_remove_ads — see AdContext.
 */
export function showInterstitialAd(): Promise<void> {
  if (!Ads) return Promise.resolve();

  const { InterstitialAd, AdEventType } = Ads;

  return new Promise((resolve) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubs: (() => void)[] = [];

    function cleanup() {
      unsubs.forEach((fn) => fn());
    }

    unsubs.push(
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show();
      }),
    );

    unsubs.push(
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        resolve();
      }),
    );

    unsubs.push(
      interstitial.addAdEventListener(AdEventType.ERROR, (_error: any) => {
        cleanup();
        resolve();
      }),
    );

    interstitial.load();
  });
}
