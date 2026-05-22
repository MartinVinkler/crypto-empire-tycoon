import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

import { useGame } from "@/context/GameContext";
import { useQuests } from "@/context/QuestContext";
import { useSettings } from "@/context/SettingsContext";
import { useProperties } from "@/hooks/useProperties";
import { MapAdOverlay } from "./MapAdOverlay";

// Resolve the map URL. The Replit dev domain is baked in via app.config.ts
// (REPLIT_DEV_DOMAIN env var). Falls back cleanly to localhost only as a last
// resort. The broken manifest2 fallback (which yielded "[object Object]") is
// removed — Constants.expoConfig.extra is always populated by app.config.ts.
const mapHost: string =
  (Constants.expoConfig?.extra?.mapHost as string | undefined) ?? "localhost";

interface Props {
  style?: object;
}

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

export function GpsMap({ style }: Props) {
  const game = useGame();
  const { isDark } = useSettings();
  const { recordPropertyBuy } = useQuests();
  const { ownedItems, buyProperty, buyPropertyFree, pendingFocus, clearFocus } = useProperties();
  const mapUrl = `https://${mapHost}/api/map3d?theme=${isDark ? "dark" : "light"}`;
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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

  const injectFn = useCallback((js: string) => {
    if (!readyRef.current || !webRef.current) return;
    webRef.current.injectJavaScript(js + ";true;");
  }, []);

  // GPS watcher — single source via expo-location only.
  // geolocationEnabled is NOT set on the WebView so the map page does NOT
  // run its own navigator.geolocation internally — that would create two
  // competing location streams racing to call setLoc inside the WebView.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 3 },
        (loc) => {
          injectFn(
            `window._setPlayerLocation(${loc.coords.latitude},${loc.coords.longitude})`,
          );
        },
      );
      cleanup = () => sub.remove();
    })();
    return () => cleanup?.();
  }, [injectFn]);

  // Sync owned properties into the WebView when the list changes
  useEffect(() => {
    if (!readyRef.current) return;
    injectFn(`window._setOwnedIds(${JSON.stringify(ownedItems)})`);
  }, [ownedItems, injectFn]);

  // Sync balance into the WebView when cash changes
  useEffect(() => {
    if (!readyRef.current) return;
    injectFn(`window._setCash(${game.cashUSD})`);
  }, [game.cashUSD, injectFn]);

  // Fly to a property when requested from portfolio SEE button (native)
  useEffect(() => {
    if (!pendingFocus || !readyRef.current) return;
    injectFn(`window._flyTo(${pendingFocus.lat},${pendingFocus.lng},${JSON.stringify(pendingFocus.name ?? "")})`);
    clearFocus();
  }, [pendingFocus, injectFn, clearFocus]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type: string;
        id?: string;
        lat?: number;
        lng?: number;
        name?: string;
        cost?: number;
        rent?: number;
        area?: number;
        rh?: number;
        rmh?: number;
        owned?: boolean;
      };
      switch (msg.type) {
        case "ready": {
          readyRef.current = true;
          setLoadError(false);
          webRef.current?.injectJavaScript(
            `window._setOwnedIds(${JSON.stringify(ownedItemsRef.current)});window._setCash(${cashRef.current});true;`,
          );
          break;
        }
        case "select": {
          if (!msg.id) break;
          setPendingSelect({
            id: msg.id,
            name: msg.name ?? "Building",
            cost: msg.cost ?? 0,
            rent: msg.rent ?? 0,
            area: msg.area ?? 0,
            lat: msg.lat,
            lng: msg.lng,
            owned: !!msg.owned,
          });
          break;
        }
        case "buy": {
          if (!msg.id || !msg.cost) break;
          buyRef.current({
            id: msg.id,
            lat: msg.lat,
            lng: msg.lng,
            name: msg.name ?? "Building",
            area: msg.area ?? 0,
            price: msg.cost,
            rent: msg.rent ?? 0,
            rh: msg.rh,
            rmh: msg.rmh,
          });
          recordPropertyBuyRef.current();
          break;
        }
      }
    } catch (_) {}
  }, []);

  const handleError = useCallback(() => {
    readyRef.current = false;
    setLoadError(true);
  }, []);

  const handleRetry = useCallback(() => {
    readyRef.current = false;
    setLoadError(false);
    setReloadKey((k) => k + 1);
  }, []);

  if (loadError) {
    return (
      <View style={[styles.errorWrap, style]}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Map failed to load</Text>
        <Text style={styles.errorSub}>Check your connection and try again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri: mapUrl }}
        style={styles.web}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        mixedContentMode="always"
        allowsBackForwardNavigationGestures={false}
        onMessage={onMessage}
        onError={handleError}
        onHttpError={handleError}
        onShouldStartLoadWithRequest={() => true}
      />
      {pendingSelect && !pendingSelect.owned && (
        <MapAdOverlay
          id={pendingSelect.id}
          name={pendingSelect.name}
          cost={pendingSelect.cost}
          rent={pendingSelect.rent}
          onClose={() => {
            setPendingSelect(null);
            injectFn("closeBuy()");
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
            injectFn(`window._notifyBought(${JSON.stringify(id)})`);
            recordPropertyBuyRef.current();
            setPendingSelect(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: "#040610" },
  errorWrap: {
    flex: 1,
    backgroundColor: "#040610",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  errorIcon: { fontSize: 40, color: "#ff3b6b" },
  errorTitle: {
    color: "#ff3b6b",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  errorSub: {
    color: "#3a5575",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#00ff41",
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  retryText: {
    color: "#00ff41",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
