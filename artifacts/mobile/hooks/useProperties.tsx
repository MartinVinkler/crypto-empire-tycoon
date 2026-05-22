import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useGame } from "@/context/GameContext";

const PROPERTIES_KEY = "@crypto_empire_properties_v1";
const WALLET_KEY = "@crypto_empire_property_wallet_v1";

export interface Property {
  id: string;            // "tap_<lat5>_<lng5>" — unique per purchase location
  name: string;          // building type, e.g. "Apartment"
  area: number;          // m²
  price: number;         // purchase cost in USD
  rent: number;          // hourly passive income in USD
  boughtAt: number;      // epoch ms
  // Tap coordinates stored so the "ALREADY BOUGHT" label can be recreated
  // on the map after a reload without needing GeoJSON polygon geometry.
  lat?: number;
  lng?: number;
  rh?: number;
  rmh?: number;
}

// Rich item passed to the map WebView to recreate "ALREADY BOUGHT" labels.
export interface OwnedItem {
  id: string;
  lat?: number;
  lng?: number;
}

export interface MapFocus {
  lat: number;
  lng: number;
  id?: string;
  name?: string;
}

interface PropertiesContextValue {
  properties: Property[];
  ownedIds: string[];
  ownedItems: OwnedItem[];
  totalPassiveIncomePerHour: number;
  totalInvested: number;
  propertyWallet: number;
  collectPropertyIncome: () => number;
  buyProperty: (raw: Omit<Property, "boughtAt">) => boolean;
  buyPropertyFree: (raw: Omit<Property, "boughtAt">) => boolean;
  sellProperty: (id: string) => void;
  pendingFocus: MapFocus | null;
  setFocus: (lat: number, lng: number, id?: string, name?: string) => void;
  clearFocus: () => void;
}

const PropertiesContext = createContext<PropertiesContextValue | null>(null);

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const { addCash, spendCash } = useGame();

  const [properties, setProperties] = useState<Property[]>([]);
  const [pendingFocus, setPendingFocus] = useState<MapFocus | null>(null);
  const [propertyWallet, setPropertyWallet] = useState(0);
  const propertyWalletRef = useRef(0);
  propertyWalletRef.current = propertyWallet;

  const setFocus = useCallback((lat: number, lng: number, id?: string, name?: string) => {
    setPendingFocus({ lat, lng, id, name });
  }, []);

  const clearFocus = useCallback(() => {
    setPendingFocus(null);
  }, []);

  function normaliseId(id: string): string {
    return id;
  }

  // Load persisted properties on mount
  useEffect(() => {
    AsyncStorage.getItem(PROPERTIES_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as Property[];
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            const clean = parsed
              .filter((p) => p && typeof p.id === "string")
              .map((p) => {
                const id = normaliseId(p.id);
                const rent = p.price > 0
                  ? Math.round(p.price * 0.05 + 176)
                  : (p.rent ?? 0);
                return { ...p, id, rent };
              })
              .filter((p) => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
              });
            setProperties(clean);
          }
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  // Load persisted property wallet balance on mount
  useEffect(() => {
    AsyncStorage.getItem(WALLET_KEY)
      .then((raw) => {
        if (!raw) return;
        const v = parseFloat(raw);
        if (isFinite(v) && v > 0) setPropertyWallet(v);
      })
      .catch(() => {});
  }, []);

  // Persist properties on change
  useEffect(() => {
    AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties)).catch(() => {});
  }, [properties]);

  // Persist wallet balance — debounced to 5 s to avoid thrashing storage every tick
  const walletSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (walletSaveTimer.current) clearTimeout(walletSaveTimer.current);
    walletSaveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(WALLET_KEY, String(propertyWallet)).catch(() => {});
    }, 5000);
    return () => {
      if (walletSaveTimer.current) clearTimeout(walletSaveTimer.current);
    };
  }, [propertyWallet]);

  const propsRef = useRef(properties);
  propsRef.current = properties;

  // ── Rent accrual ─────────────────────────────────────────────────────────────
  const addCashRef = useRef(addCash);
  addCashRef.current = addCash;
  const lastTickRef = useRef(Date.now());
  const isActiveRef = useRef(AppState.currentState !== "background");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      isActiveRef.current = active;
      if (active) {
        lastTickRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (!isActiveRef.current) return;
      const now = Date.now();
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;
      let perMs = 0;
      for (const p of propsRef.current) perMs += p.rent / 3_600_000;
      if (perMs > 0) {
        setPropertyWallet((w) => w + perMs * elapsedMs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // In-flight set: prevent rapid double-taps from buying the same building twice
  const inFlightRef = useRef(new Set<string>());

  const buyProperty = useCallback(
    (raw: Omit<Property, "boughtAt">): boolean => {
      const id = normaliseId(raw.id);
      const normRaw = { ...raw, id };
      if (propsRef.current.some((p) => p.id === id)) return false;
      if (inFlightRef.current.has(id)) return false;
      inFlightRef.current.add(id);

      const ok = spendCash(normRaw.price);
      if (!ok) { inFlightRef.current.delete(id); return false; }
      const prop: Property = { ...normRaw, boughtAt: Date.now() };
      setProperties((prev) => [...prev.filter((p) => p.id !== id), prop]);
      setTimeout(() => inFlightRef.current.delete(id), 3000);
      return true;
    },
    [spendCash],
  );

  const buyPropertyFree = useCallback(
    (raw: Omit<Property, "boughtAt">): boolean => {
      const id = normaliseId(raw.id);
      const normRaw = { ...raw, id };
      if (propsRef.current.some((p) => p.id === id)) return false;
      if (inFlightRef.current.has(id)) return false;
      inFlightRef.current.add(id);
      const prop: Property = { ...normRaw, boughtAt: Date.now() };
      setProperties((prev) => [...prev.filter((p) => p.id !== id), prop]);
      setTimeout(() => inFlightRef.current.delete(id), 3000);
      return true;
    },
    [],
  );

  const sellProperty = useCallback((id: string) => {
    const prop = propsRef.current.find((p) => p.id === id);
    if (prop) addCashRef.current(Math.round(prop.price * 0.5));
    setProperties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Transfer accumulated rent into player's cashUSD
  const collectPropertyIncome = useCallback((): number => {
    const amount = propertyWalletRef.current;
    if (amount <= 0) return 0;
    setPropertyWallet(0);
    addCashRef.current(amount);
    return amount;
  }, []);

  const value = useMemo<PropertiesContextValue>(() => {
    const totalPassiveIncomePerHour = properties.reduce((s, p) => s + p.rent, 0);
    const totalInvested = properties.reduce((s, p) => s + p.price, 0);
    return {
      properties,
      ownedIds: properties.map((p) => p.id),
      ownedItems: properties.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
      })),
      totalPassiveIncomePerHour,
      totalInvested,
      propertyWallet,
      collectPropertyIncome,
      buyProperty,
      buyPropertyFree,
      sellProperty,
      pendingFocus,
      setFocus,
      clearFocus,
    };
  }, [properties, propertyWallet, collectPropertyIncome, buyProperty, sellProperty, pendingFocus, setFocus, clearFocus]);

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  );
}

export function useProperties(): PropertiesContextValue {
  const ctx = useContext(PropertiesContext);
  if (!ctx) {
    throw new Error("useProperties must be used inside PropertiesProvider");
  }
  return ctx;
}
