import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SETTINGS_KEY = "@crypto_empire_settings_v1";

interface SettingsState {
  isDark: boolean;
  sfxEnabled: boolean;
  hapticEnabled: boolean;
  setDark: (v: boolean) => void;
  setSfx: (v: boolean) => void;
  setHaptic: (v: boolean) => void;
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

interface Prefs {
  isDark: boolean;
  sfxEnabled: boolean;
  hapticEnabled: boolean;
}

const DEFAULTS: Prefs = {
  isDark: true,
  sfxEnabled: true,
  hapticEnabled: true,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [isDark, setIsDarkRaw] = useState(true);
  const [sfxEnabled, setSfxRaw] = useState(true);
  const [hapticEnabled, setHapticRaw] = useState(true);

  // Load persisted preferences
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const saved: Partial<Prefs> = JSON.parse(raw);
          if (typeof saved.isDark === "boolean") setIsDarkRaw(saved.isDark);
          if (typeof saved.sfxEnabled === "boolean") setSfxRaw(saved.sfxEnabled);
          if (typeof saved.hapticEnabled === "boolean") setHapticRaw(saved.hapticEnabled);
        }
      } catch (_) {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const persist = useCallback((patch: Partial<Prefs>) => {
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ isDark, sfxEnabled, hapticEnabled, ...patch })
    ).catch(() => {});
  }, [isDark, sfxEnabled, hapticEnabled]);

  const setDark = useCallback((v: boolean) => {
    setIsDarkRaw(v);
    persist({ isDark: v });
  }, [persist]);

  const setSfx = useCallback((v: boolean) => {
    setSfxRaw(v);
    persist({ sfxEnabled: v });
  }, [persist]);

  const setHaptic = useCallback((v: boolean) => {
    setHapticRaw(v);
    persist({ hapticEnabled: v });
  }, [persist]);

  return (
    <SettingsContext.Provider
      value={{ isDark, sfxEnabled, hapticEnabled, setDark, setSfx, setHaptic, hydrated }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
