import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useGame } from "@/context/GameContext";
import {
  IAP_PRODUCTS,
  PRODUCT_IDS,
  ProductId,
  purchaseProduct,
  restorePurchases,
} from "@/lib/iap-service";
import { useStartup, IAP_STORAGE_KEY } from "@/context/StartupContext";

const STORAGE_KEY = "@crypto_empire_iap_v2";

interface IAPState {
  purchasedIds: ProductId[];
  restoring: boolean;
}

const INITIAL: IAPState = {
  purchasedIds: [],
  restoring: false,
};

export interface IAPContextValue {
  hasPurchased(id: ProductId): boolean;
  purchase(id: ProductId): Promise<"success" | "already_owned" | "failed">;
  restore(): Promise<void>;
  restoring: boolean;
  purchasedIds: ProductId[];
  iapProfitMultiplier: number;
  iapMiningMultiplier: number;
  isHydrated: boolean;
}

const IAPContext = createContext<IAPContextValue | null>(null);

export function useIAP(): IAPContextValue {
  const ctx = useContext(IAPContext);
  if (!ctx) throw new Error("useIAP must be inside IAPProvider");
  return ctx;
}

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const { storage, isPreloaded } = useStartup();
  const [state, setState] = useState<IAPState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  // Use data preloaded in parallel by StartupContext — no extra AsyncStorage read.
  useEffect(() => {
    if (!isPreloaded) return;
    const raw = storage[IAP_STORAGE_KEY];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<IAPState>;
        setState((prev) => ({
          ...prev,
          purchasedIds: parsed.purchasedIds ?? [],
        }));
      } catch {}
    }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreloaded]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const iapMiningMultiplier = state.purchasedIds.includes(PRODUCT_IDS.QUANTUM_RIG) ? 1.2 : 1;
  const iapProfitMultiplier = state.purchasedIds.includes(PRODUCT_IDS.TRADING_EDGE) ? 1.25 : 1;

  useEffect(() => {
    if (!hydrated) return;
    game.setPremiumBonuses(1, iapMiningMultiplier);
  }, [hydrated, iapMiningMultiplier]);

  const hasPurchased = useCallback(
    (id: ProductId) => state.purchasedIds.includes(id),
    [state.purchasedIds],
  );

  const grantReward = useCallback(
    (id: ProductId) => {
      const product = IAP_PRODUCTS.find((p) => p.id === id);
      if (!product) return;

      if (product.fixedCash !== undefined) {
        game.addCash(product.fixedCash);
      } else if (product.hoursIncome !== undefined && product.minCash !== undefined) {
        const incomeAmount =
          game.miningPower *
          product.hoursIncome *
          3600 *
          game.prestigeMultiplier *
          game.cryptoPrice;
        game.addCash(Math.max(product.minCash, Math.round(incomeAmount)));
      }
    },
    [game],
  );

  const purchase = useCallback(
    async (id: ProductId): Promise<"success" | "already_owned" | "failed"> => {
      const product = IAP_PRODUCTS.find((p) => p.id === id);
      if (!product) return "failed";

      if (product.type === "non_consumable" && state.purchasedIds.includes(id)) {
        return "already_owned";
      }

      const ok = await purchaseProduct(id).catch(() => false);
      if (!ok) return "failed";

      if (product.type === "non_consumable") {
        setState((prev) => ({
          ...prev,
          purchasedIds: prev.purchasedIds.includes(id)
            ? prev.purchasedIds
            : [...prev.purchasedIds, id],
        }));
      }

      grantReward(id);
      return "success";
    },
    [state.purchasedIds, grantReward],
  );

  const restore = useCallback(async () => {
    setState((prev) => ({ ...prev, restoring: true }));
    try {
      const restored = await restorePurchases(state.purchasedIds);
      setState((prev) => ({
        ...prev,
        purchasedIds: Array.from(new Set([...prev.purchasedIds, ...restored])),
        restoring: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, restoring: false }));
    }
  }, [state.purchasedIds]);

  const value: IAPContextValue = {
    hasPurchased,
    purchase,
    restore,
    restoring: state.restoring,
    purchasedIds: state.purchasedIds,
    iapProfitMultiplier,
    iapMiningMultiplier,
    isHydrated: hydrated,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}
