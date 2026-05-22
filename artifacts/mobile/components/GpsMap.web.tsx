import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useGame } from "@/context/GameContext";
import { useQuests } from "@/context/QuestContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { useProperties } from "@/hooks/useProperties";
import { MapAdOverlay } from "./MapAdOverlay";

interface PendingSelect {
  id: string;
  name: string;
  cost: number;
  rent: number;
  area: number;
  lat?: number;
  lng?: number;
  owned: boolean;
}

export function GpsMap({ style }: { style?: object }) {
  const game = useGame();
  const c = useColors();
  const { isDark } = useSettings();
  const { recordPropertyBuy } = useQuests();
  const { ownedItems, buyProperty, buyPropertyFree, pendingFocus, clearFocus } = useProperties();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [pendingSelect, setPendingSelect] = useState<PendingSelect | null>(null);

  const ownedItemsRef = useRef(ownedItems);
  ownedItemsRef.current = ownedItems;
  const cashRef = useRef(game.cashUSD);
  cashRef.current = game.cashUSD;
  const buyRef = useRef(buyProperty);
  buyRef.current = buyProperty;
  const buyFreeRef = useRef(buyPropertyFree);
  buyFreeRef.current = buyPropertyFree;
  const recordPropertyBuyRef = useRef(recordPropertyBuy);
  recordPropertyBuyRef.current = recordPropertyBuy;

  const sendToIframe = useCallback((msg: object) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msg), "*");
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    sendToIframe({ type: "SET_CASH", balance: game.cashUSD });
  }, [game.cashUSD, sendToIframe]);

  useEffect(() => {
    if (!readyRef.current) return;
    sendToIframe({ type: "SET_OWNED", ownedIds: ownedItems });
  }, [ownedItems, sendToIframe]);

  // Fly to + highlight building when portfolio SEE is pressed (web)
  useEffect(() => {
    if (!pendingFocus || !readyRef.current) return;
    sendToIframe({ type: "FLY_TO", lat: pendingFocus.lat, lng: pendingFocus.lng, name: pendingFocus.name ?? "" });
    clearFocus();
  }, [pendingFocus, sendToIframe, clearFocus]);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      // Only accept messages from our map iframe — ignore Replit workspace messages
      // and any other third-party postMessage traffic on the same window.
      if (iframeRef.current && evt.source !== iframeRef.current.contentWindow) return;

      let msg: { type: string; [k: string]: unknown };
      try { msg = JSON.parse(evt.data as string); } catch (_) { return; }

      switch (msg.type) {
        case "ready": {
          readyRef.current = true;
          sendToIframe({
            type: "INIT_STATE",
            balance: cashRef.current,
            ownedIds: ownedItemsRef.current,
          });
          break;
        }

        case "select": {
          if (!msg.id) break;
          setPendingSelect({
            id: msg.id as string,
            name: (msg.name as string | undefined) ?? "Building",
            cost: (msg.cost as number | undefined) ?? 0,
            rent: (msg.rent as number | undefined) ?? 0,
            area: (msg.area as number | undefined) ?? 0,
            lat: msg.lat as number | undefined,
            lng: msg.lng as number | undefined,
            owned: !!(msg.owned as boolean | undefined),
          });
          break;
        }

        case "buy": {
          const { id, lat, lng, name, cost, rent, area, rh, rmh } = msg as {
            type: string; id: string; lat?: number; lng?: number;
            name?: string; cost: number; rent: number; area: number;
            rh?: number; rmh?: number;
          };
          if (!id || !cost) break;
          buyRef.current({
            id,
            lat,
            lng,
            name: name ?? "Building",
            area: area ?? 0,
            price: cost,
            rent: rent ?? 0,
            rh,
            rmh,
          });
          recordPropertyBuyRef.current();
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [sendToIframe]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        sendToIframe({ type: "GPS_UPDATE", lat, lng });
        AsyncStorage.setItem("@crypto_empire_last_gps_v1", JSON.stringify({ lat, lng })).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sendToIframe]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }, style]}>
      <iframe
        ref={iframeRef}
        src={`/api/map3d?theme=${isDark ? "dark" : "light"}`}
        style={{ ...styles.iframe as React.CSSProperties, backgroundColor: c.bg }}
        title="CryptoEmpireMap"
      />
      {pendingSelect && !pendingSelect.owned && (
        <MapAdOverlay
          id={pendingSelect.id}
          name={pendingSelect.name}
          cost={pendingSelect.cost}
          rent={pendingSelect.rent}
          onClose={() => {
            setPendingSelect(null);
            sendToIframe({ type: "CLOSE_BUY" });
          }}
          onClaimFree={(id) => {
            buyFreeRef.current({
              id,
              name: pendingSelect.name,
              area: pendingSelect.area,
              price: pendingSelect.cost,
              rent: pendingSelect.rent,
              lat: pendingSelect.lat,
              lng: pendingSelect.lng,
            });
            sendToIframe({ type: "NOTIFY_BOUGHT", id });
            recordPropertyBuyRef.current();
            setPendingSelect(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  } as object,
});
