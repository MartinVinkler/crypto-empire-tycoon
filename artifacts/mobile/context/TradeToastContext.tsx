import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export interface TradeToastData {
  symbol: string;
  shares: number;
  profitUSD: number;
  profitPct: number;
  id: number;
}

interface TradeToastCtx {
  toast: TradeToastData | null;
  showToast: (data: Omit<TradeToastData, "id">) => void;
}

const TradeToastContext = createContext<TradeToastCtx>({
  toast: null,
  showToast: () => {},
});

export function TradeToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<TradeToastData | null>(null);

  const showToast = useCallback((data: Omit<TradeToastData, "id">) => {
    setToast({ ...data, id: Date.now() });
  }, []);

  return (
    <TradeToastContext.Provider value={{ toast, showToast }}>
      {children}
    </TradeToastContext.Provider>
  );
}

export function useTradeToast() {
  return useContext(TradeToastContext);
}
