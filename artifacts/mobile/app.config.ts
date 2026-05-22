import { ExpoConfig } from "expo/config";

const mapHost = process.env.REPLIT_DEV_DOMAIN ?? "localhost";

const config: ExpoConfig = {
  name: "Crypto Empire Tycoon",
  slug: "mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "mobile",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#050505",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.cryptoempire.tycoon",
  },
  android: {
    package: "com.cryptoempire.tycoon",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#000000",
    },
  },
  web: { favicon: "./assets/images/icon.png" },
  plugins: [
    ["expo-router", { origin: "https://replit.com/" }],
    "expo-font",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Crypto Empire Tycoon uses your location to show nearby buildings you can buy.",
        locationWhenInUsePermission:
          "Crypto Empire Tycoon uses your location to show nearby buildings you can buy.",
      },
    ],
    // ── Google AdMob ──────────────────────────────────────────────────────────
    // HOW TO GO LIVE: replace the IDs below with your real AdMob App IDs from
    //   https://admob.google.com → App settings → App ID
    //   Format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
    // After changing these values you MUST run a new EAS build.
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-3746303958850165~7283223095", // live Android App ID
        iosAppId:     "ca-app-pub-3940256099942544~1458002511", // ← replace with your live iOS App ID
      },
    ],
    // ─────────────────────────────────────────────────────────────────────────
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // Exposed to the app via Constants.expoConfig.extra.mapHost
    mapHost,
  },
};

export default config;
