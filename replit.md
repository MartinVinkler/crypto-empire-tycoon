# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Crypto Empire Tycoon (artifacts/mobile)
Cyberpunk idle tycoon Expo + React Native game.

**Tabs**: MINE (Bitcoin mining), TRADE (6-stock trading floor), UPGRADES, PROPERTY (GPS map), AI (CIPHER advisor), SETTINGS

**AI Advisor (CIPHER)**:
- `app/(tabs)/ai.tsx` — chat screen; streams responses via SSE from `/api/openai/chat`
- Game context snapshot (cashUSD, BTC balance, stock holdings, 24h market data with momentum) sent on each message so AI always sees live data
- Streaming via `fetch` + `ReadableStream` reader; `▌` cursor shown mid-stream
- Typing dots animation while waiting for first token
- 6 suggested quick-question chips visible until first user message
- Session memory: last 10 turns passed to the API (no DB — in-component state)
- `artifacts/api-server/src/routes/openai.ts` — SSE streaming endpoint; builds rich system prompt from game context; uses `gpt-5-mini`; lib: `@workspace/integrations-openai-ai-server`

**Settings system**:
- `context/SettingsContext.tsx` — isDark, sfxEnabled, hapticEnabled; persisted to AsyncStorage (`@crypto_empire_settings_v1`)
- `constants/colors.ts` — dual palettes: `dark` (neon-on-black cyberpunk) and `light` (green/cyan-on-white)
- `hooks/useColors.ts` — reads isDark from SettingsContext to pick palette; all components use this
- `hooks/useSFX.ts` — Web Audio API blips/chords on web; expo-haptics impact/notification on native; respects sfxEnabled/hapticEnabled
- `app/(tabs)/settings.tsx` — SETTINGS tab: Dark Mode toggle + theme preview, SFX toggle, Haptics toggle, About section
- SFX wired into: tab navigation (click), mine button (click), upgrades buy/boost/fork (purchase/error), TradeView confirm (purchase)

**Key components**:
- `context/GameContext.tsx` — global state (cashUSD, BTC, holdings, spendCash/addCash)
- `components/GpsMap.tsx` — native WebView map using Three.js 3D scene (MAP_3D_HTML from data/mapHtml.ts)
- `components/GpsMap.web.tsx` — web map using iframe pointing to `/api/map3d` (same-origin, WebGL-capable); postMessage proxy handles Overpass fetch + GPS + buy events
- `components/TradeFloor.tsx` — stock list using StockCard + equity/BTC header cards
- `components/StockCard.tsx` — per-stock card: Bézier chart, [1H/24H/2D] timeframe toggle, H/L stats, BUY/SELL buttons
- `components/TradeView.tsx` — full-screen trade modal: Bézier chart with TF toggle, BUY/SELL tab switcher, fractional sell buttons, position P/L stats
- `components/BezierChart.tsx` — smooth Catmull-Rom → cubic Bézier area chart with gradient fill (react-native-svg)
- `data/market.ts` — momentum-based random walk (MarketState with history[], high24h, low24h, momentum); 48h pre-seeded via seedHistory()
- `data/stocks.ts` — 6 stocks; TICKS_PER_CANDLE=150 (5-min candles), HISTORY_CANDLES=576 (48h)
- `data/mapHtml.ts` — Three.js 3D scene HTML (MAP_3D_HTML) for native WebView; LEAFLET_HTML alias points to same

**Trade system**:
- 48h of price history pre-seeded at startup; chart always shows data from day 1
- Candles: 5-min intervals (150 × 2s ticks each); 576 candles total
- Momentum algorithm: `momentum = momentum * 0.97 + gaussian() * 0.09` → sustains bull/bear trends
- 1H = 12 candles, 24H = 288 candles, 2D = 576 candles (full history)
- Rolling 24h high/low computed from last 288 candle closes

**Map architecture (3D Pokémon Go style)**:
- Native (`GpsMap.tsx`): react-native-webview wraps MAP_3D_HTML (Three.js bird's-eye 3D scene); GPS via expo-location; buy/ready events via postMessage bridge
- Web (`GpsMap.web.tsx`): iframe loading `/api/map3d` (same-origin URL, WebGL-capable); parent proxies Overpass fetch + GPS via postMessage; handles buy events
- `/api/map3d` route: serves the same Three.js 3D scene HTML as a full page
- API proxy: `artifacts/api-server/src/routes/overpass.ts` → `POST /api/overpass` relays to overpass-api.de
- 3D scene: Three.js r128 CDN; 3D avatar, 50m neon ring, OSM building boxes, building labels, TAP TO BUY panel
- Buildings: OSM Overpass API → BoxGeometry extruded by building:levels; price = area×0.8+500
- Property persistence: AsyncStorage `@crypto_empire_properties_v1`
- Economy: rent ticks every 60s (1/60th of hourly rate), integrated with cashUSD

### API Server (artifacts/api-server)
Express 5 server, mounted at `/api`.
Routes: `GET /api/healthz`, `POST /api/overpass` (Overpass proxy), `GET /api/map3d` (3D map HTML page)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
