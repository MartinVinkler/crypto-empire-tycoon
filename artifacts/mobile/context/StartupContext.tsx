/**
 * StartupContext — parallel storage preloader + game-ready gate
 *
 * All four AsyncStorage keys are read in a single Promise.all BEFORE any
 * game context initialises. Each context pulls its raw JSON string from here
 * instead of doing its own separate AsyncStorage.getItem call.
 *
 * `isGameReady` is false until the loading screen fade-out completes.
 * GameContext gates its background timers on this flag so no CPU is burned
 * while the player is still looking at the splash.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  SAVE_KEY,
  TUTORIAL_KEY,
} from "@/data/constants";

export const IAP_STORAGE_KEY = "@crypto_empire_iap_v2";
export const ADS_STORAGE_KEY = "@crypto_empire_ads_v1";

const ALL_KEYS = [SAVE_KEY, TUTORIAL_KEY, IAP_STORAGE_KEY, ADS_STORAGE_KEY] as const;

export type StorageMap = Record<(typeof ALL_KEYS)[number], string | null>;

interface StartupCtx {
  /** Raw JSON strings loaded in parallel — null if the key didn't exist yet. */
  storage: StorageMap;
  /** True once the Promise.all has resolved (even if some values are null). */
  isPreloaded: boolean;
  /**
   * True after the loading screen has fully faded out.
   * GameContext starts its background timers only when this is true.
   */
  isGameReady: boolean;
  /** Called by AppLoader after the fade-out animation completes. */
  markGameReady: () => void;
}

const StartupContext = createContext<StartupCtx | null>(null);

export function useStartup(): StartupCtx {
  const ctx = useContext(StartupContext);
  if (!ctx) throw new Error("useStartup must be used inside StartupProvider");
  return ctx;
}

const EMPTY_MAP: StorageMap = {
  [SAVE_KEY]: null,
  [TUTORIAL_KEY]: null,
  [IAP_STORAGE_KEY]: null,
  [ADS_STORAGE_KEY]: null,
};

export function StartupProvider({ children }: { children: React.ReactNode }) {
  const [storage, setStorage] = useState<StorageMap>(EMPTY_MAP);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isGameReady, setIsGameReady] = useState(false);

  useEffect(() => {
    Promise.all(ALL_KEYS.map((k) => AsyncStorage.getItem(k)))
      .then((values) => {
        const map = { ...EMPTY_MAP };
        ALL_KEYS.forEach((k, i) => {
          map[k] = values[i];
        });
        setStorage(map);
      })
      .catch(() => {})
      .finally(() => setIsPreloaded(true));
  }, []);

  const markGameReady = useCallback(() => {
    setIsGameReady(true);
  }, []);

  return (
    <StartupContext.Provider
      value={{ storage, isPreloaded, isGameReady, markGameReady }}
    >
      {children}
    </StartupContext.Provider>
  );
}
