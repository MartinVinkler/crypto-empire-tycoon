import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameLoadingScreen } from "@/components/GameLoadingScreen";
import { TradeToastBanner } from "@/components/TradeToastBanner";
import { Tutorial } from "@/components/Tutorial";
import { AdProvider } from "@/context/AdContext";
import { BattlePassProvider } from "@/context/BattlePassContext";
import { GameProvider } from "@/context/GameContext";
import { IAPProvider } from "@/context/IAPContext";
import { QuestProvider } from "@/context/QuestContext";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { StartupProvider, useStartup } from "@/context/StartupContext";
import { TradeToastProvider } from "@/context/TradeToastContext";
import { PropertiesProvider } from "@/hooks/useProperties";
import {
  initializeRevenueCat,
  SubscriptionProvider,
} from "@/lib/revenuecat";
import { useAds } from "@/context/AdContext";
import { useGame } from "@/context/GameContext";
import { useIAP } from "@/context/IAPContext";
import { preWarmAudio } from "@/hooks/useSFX";

SplashScreen.preventAutoHideAsync();

try {
  initializeRevenueCat();
} catch {
  // RevenueCat unavailable in this environment — app continues without it
}

const queryClient = new QueryClient();

const LOADING_TIMEOUT_MS = 5_000;

function AppLoader() {
  const game = useGame();
  const iap  = useIAP();
  const ads  = useAds();
  const { markGameReady } = useStartup();

  const [timedOut, setTimedOut]   = useState(false);
  const [ready, setReady]         = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 5-second safety timeout — always let the player through
  useEffect(() => {
    timerRef.current = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const allHydrated = game.isHydrated && iap.isHydrated && ads.isHydrated;

  useEffect(() => {
    if (allHydrated || timedOut) {
      // Pre-warm audio pools while the loading screen is still visible so the
      // first tap fires instantly with no sound-loading latency.
      preWarmAudio();
      // Small grace period so first frame of game UI renders before fade starts
      const t = setTimeout(() => setReady(true), 120);
      return () => clearTimeout(t);
    }
  }, [allHydrated, timedOut]);

  // onHidden fires after the 480ms fade-out animation completes.
  // Only then do we start game timers — zero CPU wasted on the splash screen.
  return (
    <GameLoadingScreen
      visible={!ready}
      onHidden={markGameReady}
    />
  );
}

function ThemedApp() {
  const { isDark } = useSettings();
  const bg = isDark ? "#050505" : "#f5f7fa";

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardProvider>
        <TradeToastProvider>
          <GameProvider>
            <IAPProvider>
            <BattlePassProvider>
            <AdProvider>
            <QuestProvider>
            <SubscriptionProvider>
            <PropertiesProvider>
              <StatusBar style={isDark ? "light" : "dark"} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: bg },
                }}
              >
                <Stack.Screen name="(tabs)" />
              </Stack>
              <Tutorial />
              {/* Loading screen sits above all game UI, fades out once ready */}
              <AppLoader />
            </PropertiesProvider>
            </SubscriptionProvider>
            </QuestProvider>
            </AdProvider>
            </BattlePassProvider>
            </IAPProvider>
          </GameProvider>
          {/* Banner renders above everything — absolute positioned, z-index 99999 */}
          <TradeToastBanner />
        </TradeToastProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("../assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("../assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("../assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("../assets/fonts/Inter_700Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/*
         * StartupProvider sits at the very top so it begins the parallel
         * Promise.all storage read before any game context mounts.
         * By the time GameProvider / IAPProvider / AdProvider render,
         * the data is already in flight (or complete).
         */}
        <StartupProvider>
          <SettingsProvider>
            <ErrorBoundary>
              <ThemedApp />
            </ErrorBoundary>
          </SettingsProvider>
        </StartupProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
