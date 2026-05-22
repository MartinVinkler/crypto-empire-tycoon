import { Router } from "express";

const router = Router();

// MapLibre GL JS + OpenFreeMap vector tiles
// ✅ No API key required — OpenFreeMap is free & open-source global vector tile service
// ✅ Real building footprints + heights from OSM (not bounding-box cubes)
// ✅ Real roads, parks, water rendered from the same vector tiles
// ✅ Works anywhere on Earth

const MAP3D_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{overflow:hidden;font-family:'Courier New',Courier,monospace;background:#040610;}
#map{width:100vw;height:100vh;}
.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{display:none!important;}
/* HUD overlay */
#ov{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;}
#hud{position:absolute;top:12px;left:0;right:0;display:flex;justify-content:center;gap:10px;z-index:10;}
.pill{background:rgba(4,6,16,0.92);border:1.5px solid rgba(0,217,255,0.5);border-radius:20px;padding:5px 16px;color:#00d9ff;font-size:12px;font-weight:700;letter-spacing:.5px;white-space:nowrap;backdrop-filter:blur(6px);}
.pill.g{border-color:rgba(0,255,65,0.6);color:#00ff41;}
#gps{position:absolute;top:50px;left:50%;transform:translateX(-50%);background:rgba(2,4,12,0.88);border:1px solid rgba(0,255,65,0.45);color:#00ff41;font-size:11px;letter-spacing:1px;padding:3px 14px;border-radius:20px;white-space:nowrap;z-index:10;}
/* Player marker — kept above all map layers + neon "active" pulse */
.pm{width:40px;height:40px;cursor:default;z-index:9999;position:relative;}
.pm svg{filter:drop-shadow(0 0 10px rgba(0,255,65,0.9));animation:pmPulse 1.6s ease-in-out infinite;}
@keyframes pmPulse{
  0%,100%{filter:drop-shadow(0 0 8px rgba(0,255,65,0.7)) drop-shadow(0 0 14px rgba(0,255,65,0.35));transform:scale(1);}
  50%{filter:drop-shadow(0 0 14px rgba(0,255,65,1)) drop-shadow(0 0 26px rgba(0,255,65,0.6));transform:scale(1.08);}
}
/* MapLibre marker container — keep above the WebGL canvas + extruded buildings */
.maplibregl-marker{z-index:1000!important;}
/* Already-Bought label — floats above the purchased building */
.ob-label{pointer-events:none;transform:translate(-50%,-6px);}
.ob-label span{display:block;background:rgba(2,8,2,0.96);border:1.5px solid #00e676;color:#00e676;font-size:9px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:1.5px;padding:3px 10px;border-radius:3px;white-space:nowrap;box-shadow:0 0 10px rgba(0,230,118,0.65),0 2px 8px rgba(0,0,0,0.85);text-transform:uppercase;}
/* SEE highlight beacon — pulsing ripple rings shown when player taps SEE in portfolio */
@keyframes hlRipple{0%{transform:scale(0.5);opacity:1;}100%{transform:scale(3.5);opacity:0;}}
.hl-r{position:absolute;width:36px;height:36px;top:-18px;left:-18px;border:2.5px solid #00ff41;border-radius:50%;animation:hlRipple 1.6s ease-out infinite;pointer-events:none;}
.hl-r:nth-child(2){animation-delay:0.55s;border-color:#00d9ff;}
.hl-r:nth-child(3){animation-delay:1.1s;}
.hl-dot{position:absolute;width:10px;height:10px;top:-5px;left:-5px;background:#00ff41;border-radius:50%;box-shadow:0 0 14px 4px rgba(0,255,65,0.9);pointer-events:none;}
.hl-lbl{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);background:rgba(2,8,2,0.97);border:2px solid #00ff41;color:#00ff41;font-family:'Courier New',monospace;font-size:10px;font-weight:900;letter-spacing:1.5px;padding:4px 12px;border-radius:4px;white-space:nowrap;pointer-events:none;box-shadow:0 0 18px rgba(0,255,65,0.75),0 2px 10px rgba(0,0,0,0.9);animation:hlBlink 1s ease-in-out 3;}
/* Buy panel */
#bp{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(3,5,14,0.97);border:2px solid #00ff41;border-radius:14px;padding:16px 22px 14px;min-width:230px;text-align:center;pointer-events:all;box-shadow:0 0 32px rgba(0,255,65,0.35),0 8px 40px rgba(0,0,0,0.8);display:none;z-index:20;backdrop-filter:blur(10px);}
#bp.open{display:block;}
#bc{position:absolute;top:8px;right:12px;color:#555;font-size:16px;cursor:pointer;background:none;border:none;pointer-events:all;}
#bc:hover{color:#00ff41;}
#bt{color:#00d9ff;font-size:11px;font-weight:700;letter-spacing:1.5px;margin-bottom:3px;text-transform:uppercase;}
#bpr{color:#fff;font-size:22px;font-weight:900;margin-bottom:2px;letter-spacing:-0.5px;}
#brn{color:#00ff41;font-size:11px;margin-bottom:8px;}
#bds{color:#ff3b6b;font-size:11px;margin-bottom:6px;min-height:14px;}
#bbt{background:#00ff41;color:#000;border:none;padding:11px 0;font-size:13px;font-weight:900;letter-spacing:2px;border-radius:7px;cursor:pointer;box-shadow:0 0 18px rgba(0,255,65,0.55);font-family:'Courier New',monospace;width:100%;transition:opacity 0.15s;}
#bbt:hover:not(:disabled){opacity:0.85;}
#bbt:disabled{background:#0b1e0b;color:#1a3a1a;cursor:not-allowed;box-shadow:none;}
/* 2D / 3D view toggle */
#vtog{display:flex;background:rgba(4,6,16,0.92);border:1.5px solid rgba(0,217,255,0.5);border-radius:20px;overflow:hidden;pointer-events:all;backdrop-filter:blur(6px);}
#vtog button{background:none;border:none;color:#00d9ff;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:5px 15px;cursor:pointer;font-family:'Courier New',monospace;transition:background 0.18s,color 0.18s;}
#vtog button.active{background:#00d9ff;color:#040610;}
#vtog button:first-child{border-right:1px solid rgba(0,217,255,0.35);}
/* Center-View FAB — bottom-right, sits above buy panel, neon green */
#fab{position:absolute;right:18px;bottom:24px;width:56px;height:56px;border-radius:50%;background:#040610;border:2px solid #00ff41;color:#00ff41;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:all;box-shadow:0 0 18px rgba(0,255,65,0.55),0 6px 24px rgba(0,0,0,0.7);transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease;z-index:30;padding:0;}
#fab:hover{background:#0a1a0a;box-shadow:0 0 26px rgba(0,255,65,0.85),0 6px 24px rgba(0,0,0,0.7);}
#fab:active{transform:scale(0.92);}
#fab svg{width:26px;height:26px;display:block;filter:drop-shadow(0 0 4px rgba(0,255,65,0.8));}
#fab.locked{background:#062209;box-shadow:0 0 22px rgba(0,255,65,0.95),inset 0 0 12px rgba(0,255,65,0.35);}
/* Marker-lock FAB — sits above the center FAB */
#mlock{position:absolute;right:18px;bottom:90px;width:48px;height:48px;border-radius:50%;background:#040610;border:2px solid #555;color:#555;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:all;box-shadow:0 4px 16px rgba(0,0,0,0.6);transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease,border-color 0.15s ease,color 0.15s ease;z-index:30;padding:0;}
#mlock:active{transform:scale(0.9);}
#mlock svg{width:22px;height:22px;display:block;}
#mlock.on{border-color:#00ff41;color:#00ff41;background:#062209;box-shadow:0 0 18px rgba(0,255,65,0.65),0 4px 16px rgba(0,0,0,0.6);}
#mlock.on svg{filter:drop-shadow(0 0 4px rgba(0,255,65,0.9));}
</style>
</head>
<body>
<div id="map"></div>
<div id="ov">
  <div id="hud">
    <div class="pill" id="bpil">$10,000</div>
    <div class="pill g" id="ppil">0 PROPERTIES</div>
    <div id="vtog">
      <button id="vt2d" onclick="setViewMode('2D')">2D</button>
      <button id="vt3d" class="active" onclick="setViewMode('3D')">3D</button>
    </div>
  </div>
  <div id="gps">&#9679; Loading map...</div>
  <div id="bp">
    <button id="bc">&#10005;</button>
    <div id="bt">BUILDING</div>
    <div id="bpr">$0</div>
    <div id="brn">+$0/hr income</div>
    <div id="bds"></div>
    <button id="bbt">TAP TO BUY</button>
    <div id="bdbg" style="font-size:9px;color:#888;margin-top:4px;word-break:break-all;"></div>
  </div>
  <button id="mlock" aria-label="Toggle all markers visible">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </button>
  <button id="fab" aria-label="Center view on player">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <circle cx="12" cy="12" r="8"/>
      <line x1="12" y1="1" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="23"/>
      <line x1="1" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="23" y2="12"/>
    </svg>
  </button>
</div>

<script>
// ── STATE ────────────────────────────────────────────────────
var pLat=37.7749,pLng=-122.4194;
var cash=10000;
var ownedIds=new Set();       // string keys — "tap_<lat5>_<lng5>", one per purchase
var ownedMarkers={};          // sid -> maplibregl.Marker (only for items within MARKER_RANGE)
var allOwnedItems=[];         // full list: {id,lat,lng} — master truth regardless of proximity
var MARKER_RANGE=55;          // metres — only render "Bought" labels within the buy ring (~50m)
var REFRESH_DIST=5;           // metres — re-render markers if player moved at least this far
var showAllMarkers=true;      // when true: all "Bought" labels visible; false = hidden
var lastRefreshLat=null;
var lastRefreshLng=null;
var sel=null;
var bldSrc=null;              // discovered source name
var mapReady=false;
var pendingFetches={};
// True once a real GPS fix arrives. Until then the distance check is skipped so
// the user can still interact with the map in sandboxed web previews where
// navigator.geolocation is blocked, or while GPS is still locking.
var gpsResolved=false;

// ── OSM BUILDING ID CACHE ─────────────────────────────────────
// Pre-fetches real OSM way IDs (globally unique, stable across tiles/zooms) for
// buildings near the player via the Overpass proxy. When the user taps a
// building we look up the closest cached entry and use its stable OSM ID as SID.
// Without this, SID is derived from the tile-clipped polygon centroid which can
// differ between tiles for the same physical building.
var osmBldCache=[];          // [{id:'osm_<wayId>', lat, lng}] from Overpass
var osmFetchedKeys=new Set();// grid keys already fetched (prevents duplicate requests)
var osmFetching=false;       // simple mutex — only one Overpass request at a time
var OSM_FETCH_RADIUS=0.004;  // ~440 m bbox half-side (degrees)

// ── HELPERS ──────────────────────────────────────────────────
function fUSD(v){if(v>=1e6)return'$'+(v/1e6).toFixed(2)+'M';if(v>=1e3)return'$'+(v/1e3).toFixed(1)+'K';return'$'+Math.round(v);}
function setSt(t){document.getElementById('gps').innerHTML=t;}
function hav(a,b,c,d){
  var R=6371000,p1=a*Math.PI/180,p2=c*Math.PI/180,dp=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;
  var s=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}
function makeCircle(lat,lng,r){
  var pts=[];
  for(var i=0;i<=64;i++){
    var a=(i/64)*2*Math.PI;
    pts.push([lng+(r/(111320*Math.cos(lat*Math.PI/180)))*Math.cos(a),lat+(r/111320)*Math.sin(a)]);
  }
  return{type:'Feature',geometry:{type:'Polygon',coordinates:[pts]},properties:{}};
}
function classToType(props){
  var c=(props.class||props.building||'').toLowerCase();
  var m={apartments:'Apartment',residential:'Apartment',office:'Office Block',commercial:'Commercial',retail:'Shop',shop:'Shop',hotel:'Hotel',motel:'Hotel',industrial:'Warehouse',warehouse:'Warehouse',school:'School',university:'University',house:'House',detached:'House',church:'Church',hospital:'Hospital',supermarket:'Supermarket',civic:'Civic',government:'Government'};
  return m[c]||(c&&c!=='yes'?c.charAt(0).toUpperCase()+c.slice(1):'Building');
}
// Compute polygon footprint area in m² using the Shoelace formula.
// ring: array of [lng, lat] pairs; refLat: reference latitude for lng→m scaling.
function polygonAreaM2(ring,refLat){
  if(!ring||ring.length<3)return 0;
  var latM=111319;
  var lngM=111319*Math.cos(refLat*Math.PI/180);
  var area=0,n=ring.length;
  for(var i=0,j=n-1;i<n;j=i++){
    area+=(ring[j][0]-ring[i][0])*(ring[j][1]+ring[i][1]);
  }
  // |area|/2 is in degree² — convert to m²
  return Math.abs(area)*0.5*lngM*latM;
}
// Price = footprint area × height factor + base + deterministic per-building jitter.
// Small house (~50m², 6m) → ~$4 500; Large block (~2000m², 30m) → ~$50 000
function priceFn(h,floors,areaM2,sid){
  var a=areaM2||200;   // fallback 200 m² if geometry missing
  var base=Math.round(2000+a*10+h*150+floors*200);
  // Derive stable ±150 jitter from the SID string hash.
  if(sid){
    var hv=0;
    for(var ci=0;ci<sid.length;ci++)hv=(hv*31+sid.charCodeAt(ci))|0;
    var jit=((hv%301)+301)%301-150;
    base+=jit;
  }
  return Math.max(1000,base);
}
function rentFn(p){return parseFloat((p*0.012).toFixed(2));}
// Stable per-building unique id — polygon centroid at 4 decimal places (~11 m).
//
// WHY 4dp instead of 6dp:
// MapLibre GL JS clips building polygons at tile boundaries. The clipped polygon
// centroid can shift by 1–5 m vs the full polygon centroid (larger at low zoom).
// 4 decimal places = 11 m precision, so shifts < 11 m → same SID. 6dp = 0.11 m,
// too fine-grained for clipped centroids which may differ by several metres.
//
// WHY NOT f.id:
// In vector tiles, f.id is a tile-local sequential integer (not the global OSM
// way ID). Different buildings in different tiles can share the same f.id value,
// which would cause them to share a SID and appear "owned" together.
//
// Adjacent buildings are always > 1 m apart, so 4dp gives unique IDs in practice.
function buildingSid(f,tapLat,tapLng){
  try{
    var g=f&&f.geometry;
    var ring=null;
    if(g&&g.type==='Polygon')ring=g.coordinates[0];
    else if(g&&g.type==='MultiPolygon')ring=g.coordinates[0][0];
    if(ring&&ring.length){
      var sLat=0,sLng=0,n=ring.length;
      for(var i=0;i<n;i++){sLat+=ring[i][1];sLng+=ring[i][0];}
      // 4 decimal places (~11 m) — tolerant of tile-clipping centroid drift
      return 'cen_'+(sLat/n).toFixed(4)+'_'+(sLng/n).toFixed(4);
    }
  }catch(_){}
  return 'tap_'+tapLat.toFixed(4)+'_'+tapLng.toFixed(4);
}
// Fetch OSM building IDs+centers for the area around (lat, lng) via the
// Overpass proxy. Results are stored in osmBldCache for fast SID lookup.
// Uses a coarse grid key so the same area isn't re-fetched on every GPS tick.
function fetchOsmBuildings(lat,lng){
  if(osmFetching)return;
  // Snap to a ~440 m grid (OSM_FETCH_RADIUS in degrees) to deduplicate requests
  var gk=Math.round(lat/OSM_FETCH_RADIUS)+'_'+Math.round(lng/OSM_FETCH_RADIUS);
  if(osmFetchedKeys.has(gk))return;
  osmFetchedKeys.add(gk);
  osmFetching=true;
  var R=OSM_FETCH_RADIUS;
  // out ids center — only IDs and bounding-box centers, no full geometry (fast)
  var q='[out:json][timeout:20];way["building"]('+(lat-R)+','+(lng-R*1.5)+','+(lat+R)+','+(lng+R*1.5)+');out ids center;';
  fetch('/api/overpass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(data){
      osmFetching=false;
      if(!data||!data.elements)return;
      var els=data.elements;
      for(var i=0;i<els.length;i++){
        var e=els[i];
        if(e.type==='way'&&e.center){
          // Avoid duplicates if the same OSM ID is already cached
          var eid='osm_'+e.id;
          var dup=false;
          for(var j=0;j<osmBldCache.length;j++){if(osmBldCache[j].id===eid){dup=true;break;}}
          if(!dup)osmBldCache.push({id:eid,lat:e.center.lat,lng:e.center.lon});
        }
      }
    })
    .catch(function(){osmFetching=false;});
}
// Find the best SID for a building the player tapped at (tapLat, tapLng).
// Searches osmBldCache for the closest building whose Overpass center is within
// 60 m of the tap. Returns null if no match (triggers centroid fallback).
function getOsmSid(tapLat,tapLng){
  var best=null,bestD=Infinity;
  for(var i=0;i<osmBldCache.length;i++){
    var d=hav(tapLat,tapLng,osmBldCache[i].lat,osmBldCache[i].lng);
    if(d<bestD&&d<60){bestD=d;best=osmBldCache[i];}
  }
  return best?best.id:null;
}

// Compute the centroid of a GeoJSON Polygon/MultiPolygon feature.
// Used only for the area/price calculation reference latitude — NOT for SID.
function featureCentroid(f,fallbackLat,fallbackLng){
  try{
    var g=f.geometry;
    if(!g)return{lat:fallbackLat,lng:fallbackLng};
    var ring=null;
    if(g.type==='Polygon'){ring=g.coordinates[0];}
    else if(g.type==='MultiPolygon'){ring=g.coordinates[0][0];}
    if(!ring||!ring.length)return{lat:fallbackLat,lng:fallbackLng};
    var sumLng=0,sumLat=0,n=ring.length;
    for(var i=0;i<n;i++){sumLng+=ring[i][0];sumLat+=ring[i][1];}
    return{lat:sumLat/n,lng:sumLng/n};
  }catch(e){return{lat:fallbackLat,lng:fallbackLng};}
}
// Returns true if any purchased building is within 35 m of the given centroid.
// Uses allOwnedItems (not ownedMarkers) so off-screen properties are still
// recognised as owned even when their marker has been culled for performance.
function isOwnedNear(lat,lng){
  for(var i=0;i<allOwnedItems.length;i++){
    var it=allOwnedItems[i];
    if(it.lat!=null&&hav(lat,lng,it.lat,it.lng)<=35)return true;
  }
  return false;
}
// Rebuild the visible "✓ Bought" markers: remove all current DOM markers and
// recreate only those within MARKER_RANGE of the player. When gpsResolved is
// false (web preview / GPS still locking) show everything so the UI is fully
// interactive without a real location fix.
function refreshOwnedMarkers(){
  if(!mapReady||!map)return;
  for(var k in ownedMarkers){ownedMarkers[k].remove();}
  ownedMarkers={};
  // When showAllMarkers=false: markers are completely hidden.
  // When showAllMarkers=true: show all owned markers regardless of range.
  if(!showAllMarkers){lastRefreshLat=pLat;lastRefreshLng=pLng;return;}
  for(var i=0;i<allOwnedItems.length;i++){
    var it=allOwnedItems[i];
    if(it.lat==null||it.lng==null)continue;
    ownedMarkers[it.id]=makeOwnedMarker(it.lat,it.lng);
  }
  lastRefreshLat=pLat;lastRefreshLng=pLng;
}
function toggleMarkerLock(){
  showAllMarkers=!showAllMarkers;
  var btn=document.getElementById('mlock');
  if(btn)btn.classList.toggle('on',showAllMarkers);
  refreshOwnedMarkers();
}
// Place a floating "✓ ALREADY BOUGHT" label above the purchased building.
// The label is a plain HTML element rendered by MapLibre on top of the WebGL canvas.
function makeOwnedMarker(lat,lng){
  var el=document.createElement('div');
  el.className='ob-label';
  el.innerHTML='<span>\u2713 Bought</span>';
  return new maplibregl.Marker({element:el,anchor:'bottom'})
    .setLngLat([lng,lat]).addTo(map);
}

// ── PLAYER MARKER ────────────────────────────────────────────
var pmEl=document.createElement('div');
pmEl.className='pm';
pmEl.innerHTML='<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">'+
  '<circle cx="20" cy="20" r="17" fill="#0b3012" stroke="#00ff41" stroke-width="2.5"/>'+
  '<circle cx="20" cy="20" r="10" fill="none" stroke="#00ff41" stroke-width="1" opacity="0.4"/>'+
  '<text x="20" y="26" text-anchor="middle" font-size="17" font-weight="900" fill="#00ff41" font-family="Arial">\\u20bf<\/text>'+
  '<\/svg>';

// ── MAP INIT ─────────────────────────────────────────────────
var map=new maplibregl.Map({
  container:'map',
  // OpenFreeMap liberty style — global OSM vector tiles, no API key
  style:'https://tiles.openfreemap.org/styles/liberty',
  center:[pLng,pLat],
  zoom:17.5,
  // Vertical cyberpunk skyline from frame 0 — 75° is MapLibre's hard cap and
  // delivers the most extreme low-angle "buildings as towers" look.
  pitch:75,
  maxPitch:75,
  bearing:0,
  antialias:true,
  attributionControl:false,
  // fadeDuration:0 makes tiles pop in instantly instead of cross-fading over
  // 300ms — on first load this means the 3D buildings appear the moment their
  // tile arrives, not a third of a second later. Combined with once('idle')
  // dropping the "Loading map..." pill, the skyline feels immediate.
  fadeDuration:0
});

var playerMarker=new maplibregl.Marker({element:pmEl,anchor:'center'})
  .setLngLat([pLng,pLat]).addTo(map);

// ── STYLE LOADED ─────────────────────────────────────────────
map.on('load',function(){
  applyDark();
  addBuildingLayers();
  addRing();
  setupInteraction();
  mapReady=true;
  setSt('&#9679; GPS Locating...');
  // Pre-fetch OSM building IDs for the initial/default location immediately so
  // that users who haven't moved yet can already get stable SIDs on first tap.
  fetchOsmBuildings(pLat,pLng);
  // Notify native / parent that the map is ready
  setTimeout(function(){
    var m=JSON.stringify({type:'ready'});
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);
    else window.parent.postMessage(m,'*');
  },400);
  // Start own geolocation only on web. On native the app uses expo-location
  // and injects position via window._setPlayerLocation — running startGeo()
  // there would create a second competing GPS stream.
  if(!window.ReactNativeWebView) startGeo();
});

// First paint signal — fires when the initial tile batch has rendered. We use
// this to drop the "Loading map..." pill so the user gets a clear "world is
// live" cue, and to trigger a one-time cinematic 3D swoop that showcases the
// extruded buildings even before GPS resolves.
var firstPaintDone=false;
map.once('idle',function(){
  firstPaintDone=true;
  if(pLat!=null&&pLng!=null)setSt('&#9679; '+(navigator.geolocation?'GPS Active':'Default: SF'));
});

// Surface tile/style errors so silent CDN failures aren't invisible — the
// previous black-canvas symptom would have been obvious here.
map.on('error',function(e){
  if(e&&e.error&&e.error.message)setSt('&#9679; Map error: '+e.error.message.slice(0,40));
});

// ── DARK CYBERPUNK THEME ─────────────────────────────────────
function applyDark(){
  var layers=map.getStyle().layers||[];
  layers.forEach(function(l){
    try{
      switch(l.type){
        case 'background':
          map.setPaintProperty(l.id,'background-color','#040610'); break;
        case 'fill':
          if(/water|ocean|sea|lake|river/.test(l.id)){
            map.setPaintProperty(l.id,'fill-color','#05111e');
            map.setPaintProperty(l.id,'fill-opacity',1);
          } else if(/park|green|grass|wood|forest|meadow|scrub|farmland|sand/.test(l.id)){
            map.setPaintProperty(l.id,'fill-color','#08150e');
            map.setPaintProperty(l.id,'fill-opacity',1);
          } else if(/building/.test(l.id)){
            // Will be replaced by custom layers
            map.setLayoutProperty(l.id,'visibility','none');
          } else {
            map.setPaintProperty(l.id,'fill-color','#0c1220');
            try{map.setPaintProperty(l.id,'fill-opacity',1);}catch(e){}
          }
          break;
        case 'line':
          if(/motorway|trunk|primary/.test(l.id)){
            map.setPaintProperty(l.id,'line-color','#28374e');
            try{map.setPaintProperty(l.id,'line-opacity',1);}catch(e){}
          } else if(/road|street|highway|transport|link/.test(l.id)){
            map.setPaintProperty(l.id,'line-color','#182537');
            try{map.setPaintProperty(l.id,'line-opacity',1);}catch(e){}
          } else if(/rail|transit/.test(l.id)){
            map.setPaintProperty(l.id,'line-color','#1a2040');
            try{map.setPaintProperty(l.id,'line-opacity',0.7);}catch(e){}
          } else {
            map.setPaintProperty(l.id,'line-color','#0e1828');
            try{map.setPaintProperty(l.id,'line-opacity',0.8);}catch(e){}
          }
          break;
        case 'symbol':
          try{map.setPaintProperty(l.id,'text-color','#3a5575');}catch(e){}
          try{map.setPaintProperty(l.id,'text-halo-color','#040610');}catch(e){}
          try{map.setPaintProperty(l.id,'text-halo-width',1);}catch(e){}
          try{map.setPaintProperty(l.id,'icon-opacity',0);}catch(e){}
          break;
      }
    }catch(e){}
  });
}

// ── 3D BUILDING LAYERS ───────────────────────────────────────
function addBuildingLayers(){
  // Discover which source the liberty style uses for buildings
  var layers=map.getStyle().layers||[];
  layers.forEach(function(l){
    if(l['source-layer']==='building'){
      if(!bldSrc)bldSrc=l.source;
      try{map.setLayoutProperty(l.id,'visibility','none');}catch(e){}
    }
  });
  if(!bldSrc)bldSrc='openmaptiles';

  // ① Dark base buildings — real footprints & heights from OSM
  map.addLayer({
    id:'bld-base',
    type:'fill-extrusion',
    source:bldSrc,
    'source-layer':'building',
    minzoom:13,
    paint:{
      'fill-extrusion-color':'#161e2c',
      'fill-extrusion-height':[
        'interpolate',['linear'],['zoom'],
        13,0,
        16,['coalesce',['get','render_height'],6]
      ],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
      'fill-extrusion-opacity':0.9
    }
  });

  // ② Subtle blue edge shimmer — gives depth without mimicking owned (green).
  // Previously this used '#00ff41' (same colour as purchased buildings) at 5%,
  // which made every building look slightly green and confused users into
  // thinking they had bought all same-priced buildings around them.
  map.addLayer({
    id:'bld-glow',
    type:'fill-extrusion',
    source:bldSrc,
    'source-layer':'building',
    minzoom:15,
    paint:{
      'fill-extrusion-color':'#1e90ff',
      'fill-extrusion-height':['coalesce',['get','render_height'],6],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
      'fill-extrusion-opacity':0.04
    }
  });

}

// ── 50m GPS RING ─────────────────────────────────────────────
function addRing(){
  var geo=makeCircle(pLat,pLng,50);
  if(map.getSource('ring')){
    map.getSource('ring').setData(geo);
  }else{
    map.addSource('ring',{type:'geojson',data:geo});
    map.addLayer({
      id:'ring-fill',type:'fill',source:'ring',
      paint:{'fill-color':'#00ff41','fill-opacity':0.025}
    });
    map.addLayer({
      id:'ring-line',type:'line',source:'ring',
      paint:{'line-color':'#00ff41','line-width':2.5,'line-opacity':0.9,'line-dasharray':[1,0]}
    });
  }
}

// ── BUILDING CLICK ───────────────────────────────────────────
// Register only on bld-base. The "ALREADY BOUGHT" labels are HTML markers,
// not map layers, so there is no separate owned layer to worry about.
var _lastClickMs=0;
function setupInteraction(){
  map.on('click','bld-base',handleBldClick);
  // Click on empty area: close panel
  map.on('click',function(e){
    var fs=map.queryRenderedFeatures(e.point,{layers:['bld-base']});
    if(!fs.length)closeBuy();
  });
  map.getCanvas().style.cursor='';
  map.on('mouseenter','bld-base',function(){map.getCanvas().style.cursor='pointer';});
  map.on('mouseleave','bld-base',function(){map.getCanvas().style.cursor='';});
}


function handleBldClick(e){
  if(e.stopPropagation)e.stopPropagation();
  // Debounce: MapLibre can fire layer click handlers several times per physical
  // tap on some devices. Drop any duplicate within 300 ms.
  var now=Date.now();
  if(now-_lastClickMs<300){_lastClickMs=now;return;}
  _lastClickMs=now;
  var f=e.features&&e.features[0];
  if(!f)return;
  var tapLat=e.lngLat.lat,tapLng=e.lngLat.lng;
  var cen=featureCentroid(f,tapLat,tapLng);
  // PRIMARY: look up the globally-unique OSM way ID from our pre-fetched cache.
  // This is stable across all tiles, zooms, and tap positions on the same building.
  // FALLBACK: polygon centroid at 4 dp (if Overpass hasn't returned yet for this area).
  var sid=getOsmSid(tapLat,tapLng)||buildingSid(f,tapLat,tapLng);
  var h=parseFloat(String(f.properties.render_height||'6'))||6;
  var mh=parseFloat(String(f.properties.render_min_height||'0'))||0;
  var floors=Math.max(1,Math.round(h/3.2));
  var type=classToType(f.properties);
  // Compute footprint area from polygon geometry for size-based pricing.
  var areaM2=0;
  try{
    var g=f.geometry;
    var ring=g&&g.type==='Polygon'?g.coordinates[0]:(g&&g.type==='MultiPolygon'?g.coordinates[0][0]:null);
    areaM2=ring?polygonAreaM2(ring,cen.lat):0;
  }catch(e){areaM2=0;}
  var price=priceFn(h,floors,areaM2,sid);
  var rent=rentFn(price);
  var owned=ownedIds.has(sid);
  var dist=hav(pLat,pLng,tapLat,tapLng);
  sel={sid:sid,lat:tapLat,lng:tapLng,rh:h,rmh:mh,price:price,rent:rent,type:type,owned:owned,dist:dist};
  renderPanel(sel);
}

// ── BUY PANEL ────────────────────────────────────────────────
function renderPanel(b){
  document.getElementById('bt').textContent=b.type.toUpperCase()+(b.owned?' \u2014 OWNED':' \u2014 FOR SALE');
  document.getElementById('bpr').textContent=fUSD(b.price);
  document.getElementById('brn').textContent='+'+fUSD(b.rent)+'/hr income';
  var btn=document.getElementById('bbt'),dd=document.getElementById('bds');
  dd.textContent='';btn.disabled=false;
  if(b.owned){
    btn.textContent='OWNED \u2713';btn.disabled=true;
  }else if(b.dist>52){
    dd.textContent='\u26a0 '+Math.round(b.dist)+'m away \u2014 walk closer';
    btn.textContent='OUT OF RANGE';btn.disabled=true;
  }else if(cash<b.price){
    btn.textContent='INSUFFICIENT FUNDS';btn.disabled=true;
  }else{
    btn.textContent='TAP TO BUY';
  }
  var dbg=document.getElementById('bdbg');
  if(dbg)dbg.textContent='SID: '+b.sid+' | owned set: '+ownedIds.size;
  console.log('[map] tap sid='+b.sid+' owned='+b.owned+' ownedSet='+JSON.stringify(Array.from(ownedIds)));
  document.getElementById('bp').classList.add('open');
}

function closeBuy(){
  sel=null;
  document.getElementById('bp').classList.remove('open');
}
document.getElementById('bc').addEventListener('click',closeBuy);

document.getElementById('bbt').addEventListener('click',function(){
  if(!sel||sel.owned||cash<sel.price||sel.dist>52)return;
  sel.owned=true;
  // Register in master list and ownedIds.
  ownedIds.add(sel.sid);
  allOwnedItems.push({id:sel.sid,lat:sel.lat,lng:sel.lng});
  // Player is within 52 m so always within MARKER_RANGE — create marker directly.
  ownedMarkers[sel.sid]=makeOwnedMarker(sel.lat,sel.lng);
  // Notify React Native — tap coords stored so the label can be recreated
  // after a reload without needing any GeoJSON polygon geometry.
  var msg=JSON.stringify({
    type:'buy',id:sel.sid,lat:sel.lat,lng:sel.lng,
    name:sel.type,cost:sel.price,rent:sel.rent,area:100,
    rh:sel.rh,rmh:sel.rmh
  });
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
  else window.parent.postMessage(msg,'*');
  cash-=sel.price;
  document.getElementById('bpil').textContent=fUSD(cash);
  updCnt();
  closeBuy();
});

function updCnt(){
  var n=allOwnedItems.length||ownedIds.size;
  document.getElementById('ppil').textContent=n+' '+(n===1?'PROPERTY':'PROPERTIES');
}

// ── LOCATION ──────────────────────────────────────────────────
// Track player heading derived from successive GPS samples (fallback when the
// device doesn't report coords.heading). Used to orient the camera in
// "Pokemon GO" centered mode so the player always faces forward.
var pHeading=0,lastHLat=null,lastHLng=null;
function bearingDeg(lat1,lng1,lat2,lng2){
  var toR=Math.PI/180;
  var y=Math.sin((lng2-lng1)*toR)*Math.cos(lat2*toR);
  var x=Math.cos(lat1*toR)*Math.sin(lat2*toR)-Math.sin(lat1*toR)*Math.cos(lat2*toR)*Math.cos((lng2-lng1)*toR);
  return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
}
function setLoc(lat,lng,opts){
  // Update heading from the GPS delta if we've moved >2 m (filters out jitter).
  if(lastHLat!=null&&hav(lastHLat,lastHLng,lat,lng)>2){
    pHeading=bearingDeg(lastHLat,lastHLng,lat,lng);
    lastHLat=lat;lastHLng=lng;
  }else if(lastHLat==null){
    lastHLat=lat;lastHLng=lng;
  }
  // Allow the device to push an explicit heading (overrides the derived one).
  if(opts&&typeof opts.heading==='number'&&isFinite(opts.heading))pHeading=opts.heading;
  pLat=lat;pLng=lng;
  gpsResolved=true;
  playerMarker.setLngLat([lng,lat]);
  // Pre-fetch OSM building IDs for this area so taps can resolve to stable SIDs
  fetchOsmBuildings(lat,lng);
  // STICKY CAMERA: while following, every GPS tick smoothly interpolates the
  // camera toward the new position AND re-asserts the locked pitch/zoom/
  // bearing so the 3D perspective can never silently drift back to flat.
  // duration:600ms with linear easing chains GPS samples (typically ~1/sec)
  // into one continuous motion — the easeTo from the previous tick is still
  // running when the next one starts, so MapLibre's animation system
  // interpolates between them on requestAnimationFrame at the device's
  // native refresh rate (60/90/120 Hz). The result is a fluid scroll, not
  // discrete jumps.
  if(isFollowing&&viewMode==='3D'){
    map.easeTo({
      center:[lng,lat],
      pitch:75,
      zoom:20,
      bearing:pHeading||0,
      duration:600,
      easing:function(t){return t;},
      essential:true
    });
  }
  if(mapReady)addRing();
  // Refresh "Bought" markers when player moves significantly — culls distant
  // markers and adds newly-in-range ones without re-rendering every GPS tick.
  if(lastRefreshLat==null||hav(pLat,pLng,lastRefreshLat,lastRefreshLng)>=REFRESH_DIST){
    refreshOwnedMarkers();
  }
  setSt('&#9679; GPS Active');
}

// ── CENTER-VIEW FAB (Pokemon GO style 3D snap) ────────────────
// Explicit follow-state machine. isFollowing is the single source of truth:
// FAB tap -> true, manual drag/zoom/rotate -> false. Both the GPS-tick
// recenter (in setLoc) and the FAB's neon glow are derived from it, so visual
// state can never desync from behavior.
var isFollowing=false;
function setFollowing(on){
  isFollowing=!!on;
  var fab=document.getElementById('fab');
  if(fab)fab.classList.toggle('locked',isFollowing);
}
function centerOnPlayer(){
  if(!mapReady)return;
  // If the real GPS fix hasn't arrived yet from the device, flash the status
  // pill to let the user know we're still waiting — don't fly to the SF default.
  if(!gpsResolved){
    setSt('&#9679; GPS locating\u2026');
    setTimeout(function(){setSt('&#9679; GPS Locating\u2026');},600);
    return;
  }
  setFollowing(true);
  // Snap immediately to where the player actually is right now, then let the
  // continuous GPS-tick easeTo keep the camera locked from there on.
  // jumpTo is instant (no animation latency) so the player sees their true
  // position straight away; subsequent GPS updates smooth out via easeTo.
  map.jumpTo({
    center:[pLng,pLat],
    pitch:viewMode==='2D'?0:75,
    zoom:viewMode==='2D'?17:20,
    bearing:viewMode==='2D'?0:(pHeading||0)
  });
}
// Hook the FAB and the manual-gesture listeners. The script tag sits at the
// bottom of <body>, so the FAB element is already in the DOM here.
(function(){
  var fab=document.getElementById('fab');
  if(fab)fab.addEventListener('click',function(ev){ev.stopPropagation();centerOnPlayer();});
  var mlock=document.getElementById('mlock');
  if(mlock){mlock.classList.add('on');mlock.addEventListener('click',function(ev){ev.stopPropagation();toggleMarkerLock();});}
  // Any deliberate user gesture exits follow mode. We listen for the user-
  // originated variants of each event so programmatic flyTo / easeTo from
  // setLoc / centerOnPlayer don't accidentally toggle it off.
  function onUserGesture(e){if(e&&e.originalEvent)setFollowing(false);}
  map.on('dragstart',onUserGesture);
  map.on('zoomstart',onUserGesture);
  map.on('rotatestart',onUserGesture);
  map.on('pitchstart',onUserGesture);
})();

// Exposed to React Native via injectJavaScript — flies the camera to a
// specific lat/lng and shows a pulsing beacon so the player knows which
// building they're looking at. Optional name param labels the beacon.
var _hlMarker=null;
window._flyTo=function(lat,lng,name){
  if(!mapReady)return;
  var zoom=viewMode==='2D'?18:20;
  var pitch=viewMode==='2D'?0:65;
  map.flyTo({center:[lng,lat],zoom:zoom,pitch:pitch,bearing:0,duration:1200,essential:true});
  // Remove any existing highlight beacon
  if(_hlMarker){_hlMarker.remove();_hlMarker=null;}
  // Build the beacon DOM element — 0×0 anchor at coordinate centre
  var el=document.createElement('div');
  // margin-top shifts the entire beacon below the existing "✓ BOUGHT" label
  // so the rings don't overlap with the label already floating above the building.
  el.style.cssText='position:relative;width:0;height:0;margin-top:34px;';
  var lbl=name?('<div class="hl-lbl">&#9658; '+(name)+'</div>'):'';
  el.innerHTML='<div class="hl-dot"></div><div class="hl-r"></div><div class="hl-r"></div><div class="hl-r"></div>'+lbl;
  _hlMarker=new maplibregl.Marker({element:el,anchor:'top'}).setLngLat([lng,lat]).addTo(map);
  // Auto-remove after 7 seconds
  var m=_hlMarker;
  setTimeout(function(){if(_hlMarker===m){m.remove();_hlMarker=null;}},7000);
};

// ── 2D / 3D VIEW MODE ─────────────────────────────────────────
// 2D: flat bird's-eye, north-up, zoom out — great for overview & navigation.
// 3D: ultra-close street-level, player heading locked, immersive city feel.
var viewMode='3D';
function setViewMode(m){
  viewMode=m;
  document.getElementById('vt2d').classList.toggle('active',m==='2D');
  document.getElementById('vt3d').classList.toggle('active',m==='3D');
  var ease={duration:700,easing:function(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}};
  if(m==='2D'){
    setFollowing(false);
    map.easeTo(Object.assign({pitch:0,zoom:17,bearing:0},ease));
  }else{
    // 3D street mode: snap close to the player, lock follow.
    if(gpsResolved){
      setFollowing(true);
      map.easeTo(Object.assign({center:[pLng,pLat],pitch:75,zoom:20,bearing:pHeading||0},ease));
    }else{
      map.easeTo(Object.assign({pitch:75,zoom:20},ease));
    }
  }
}

function startGeo(){
  if(!navigator.geolocation){
    // No geolocation API at all — fall back to SF immediately so the player
    // still sees a fully-populated 3D world instead of a blank loading state.
    setSt('&#9679; Default: San Francisco');
    return;
  }
  // Tighter 4s timeout (was 12s) — in sandboxed iframes / blocked-permission
  // browsers the call hangs the entire timeout, leaving the user staring at
  // "GPS Locating..." for 12 seconds. 4s is plenty for a real GPS lock and
  // fails fast when permission is denied.
  navigator.geolocation.getCurrentPosition(
    function(p){setLoc(p.coords.latitude,p.coords.longitude);},
    function(){setSt('&#9679; Default: San Francisco');},
    {enableHighAccuracy:true,timeout:4000,maximumAge:0}
  );
  navigator.geolocation.watchPosition(
    function(p){setLoc(p.coords.latitude,p.coords.longitude);},
    function(){},
    {enableHighAccuracy:true,maximumAge:3000}
  );
}

// ── PUBLIC API (injected by native / parent) ──────────────────
window._setPlayerLocation=setLoc;
window._setCash=function(v){cash=v;document.getElementById('bpil').textContent=fUSD(v);};
window._setOwned=function(items){
  ownedIds=new Set();
  allOwnedItems=[];
  console.log('[map] _setOwned called with '+( Array.isArray(items)?items.length:0)+' items: '+JSON.stringify(items));
  if(Array.isArray(items)){
    for(var i=0;i<items.length;i++){
      var it=items[i];
      if(!it)continue;
      var id,lat,lng;
      if(typeof it==='string'){
        id=it;lat=null;lng=null;
      }else if(it.id){
        id=String(it.id);
        lat=(it.lat!=null)?Number(it.lat):null;
        lng=(it.lng!=null)?Number(it.lng):null;
        // Back-compat: extract coords from "tap_<lat>_<lng>" SID format.
        if((lat==null||lng==null)&&id.startsWith('tap_')){
          var parts=id.slice(4).split('_');
          if(parts.length>=2){lat=parseFloat(parts[0]);lng=parseFloat(parts[1]);}
        }
      }else{continue;}
      if(!id)continue;
      ownedIds.add(id);
      if(lat!=null&&!isNaN(lat)&&lng!=null&&!isNaN(lng)){
        allOwnedItems.push({id:id,lat:lat,lng:lng});
      }
    }
  }
  // Rebuild visible markers filtered by player proximity.
  refreshOwnedMarkers();
  updCnt();
};
window._setOwnedIds=window._setOwned;

// ── POSTMESSAGE BRIDGE ───────────────────────────────────────
window.addEventListener('message',function(ev){
  var msg;try{msg=JSON.parse(ev.data);}catch(_){return;}
  if(msg.type==='GPS_UPDATE')setLoc(msg.lat,msg.lng);
  if(msg.type==='SET_CASH'){
    if(msg.balance!=null)window._setCash(msg.balance);
  }
  if(msg.type==='SET_OWNED'){
    if(msg.ownedIds)window._setOwned(msg.ownedIds);
  }
  if(msg.type==='INIT_STATE'){
    if(msg.balance!=null)window._setCash(msg.balance);
    if(msg.ownedIds)window._setOwned(msg.ownedIds);
  }
  if(msg.type==='FLY_TO'){
    if(msg.lat!=null&&msg.lng!=null)window._flyTo(msg.lat,msg.lng,msg.name||'');
  }
});

// ── DEVICE COMPASS / HEADING SYNC ────────────────────────────
// Mirrors the device's physical compass into the map bearing while following,
// so the world rotates around the player like a turn-by-turn nav app.
// Throttled to ~10Hz of map updates (the sensor itself fires far faster on
// most devices) — the cap protects battery without making rotation feel
// laggy, because each easeTo with duration:200 keeps the bearing animating
// smoothly between samples on requestAnimationFrame.
var lastHeadingApplyMs=0;
function onDeviceHeading(ev){
  var h=null;
  // iOS Safari exposes a true compass heading directly. Android / desktop
  // expose alpha (rotation around Z, 0=device-top-faces-north) on the
  // 'deviceorientationabsolute' event when absolute:true is supplied.
  if(typeof ev.webkitCompassHeading==='number')h=ev.webkitCompassHeading;
  else if(ev.absolute&&typeof ev.alpha==='number')h=360-ev.alpha;
  if(h==null||!isFinite(h))return;
  pHeading=((h%360)+360)%360;
  if(!isFollowing||!mapReady)return;
  var now=Date.now();
  if(now-lastHeadingApplyMs<100)return; // ~10 Hz cap
  lastHeadingApplyMs=now;
  map.easeTo({bearing:pHeading,duration:200,easing:function(t){return t;},essential:true});
}
function startCompass(){
  // iOS 13+ requires an explicit user-gesture-triggered permission grant.
  // Request lazily on first FAB tap so we don't prompt on cold load.
  var DOE=window.DeviceOrientationEvent;
  if(!DOE)return;
  function attach(){
    window.addEventListener('deviceorientationabsolute',onDeviceHeading,true);
    window.addEventListener('deviceorientation',onDeviceHeading,true);
  }
  if(typeof DOE.requestPermission==='function'){
    DOE.requestPermission().then(function(s){if(s==='granted')attach();}).catch(function(){});
  }else{
    attach();
  }
}
// Wire compass-permission request to the FAB tap (which is already a
// user-gesture, satisfying iOS's requirement). Safe to call repeatedly.
var compassStarted=false;
(function(){
  var fab=document.getElementById('fab');
  if(!fab)return;
  fab.addEventListener('click',function(){
    if(compassStarted)return;
    compassStarted=true;
    startCompass();
  });
})();

// ── RING PULSE ───────────────────────────────────────────────
// Use wall-clock time so the pulse runs at the same visual speed on 60 Hz,
// 90 Hz, and 120 Hz displays (previously tick+=0.016 assumed exactly 60 fps).
var pulseStart=performance.now();
(function pulse(now){
  requestAnimationFrame(pulse);
  if(mapReady&&map.isStyleLoaded()&&map.getLayer('ring-line')){
    var t=(now-pulseStart)/1000;
    try{map.setPaintProperty('ring-line','line-opacity',0.55+0.4*Math.sin(t*2.2));}catch(e){}
  }
})(performance.now());
<\/script>
</body>
</html>`;

const LIGHT_CSS = `<style id="lt">
body{background:#f0f4f8!important;}
#map{background:#f0f4f8!important;}
.pill{background:rgba(245,247,250,0.97)!important;color:#0891b2!important;border-color:rgba(8,145,178,0.5)!important;}
.pill.g{border-color:rgba(21,128,61,0.6)!important;color:#15803d!important;}
#gps{background:rgba(237,240,247,0.95)!important;border-color:rgba(21,128,61,0.45)!important;color:#15803d!important;}
#bp{background:rgba(245,247,250,0.99)!important;border-color:#15803d!important;box-shadow:0 0 24px rgba(21,128,61,0.25),0 8px 40px rgba(0,0,0,0.15)!important;}
#bt{color:#0891b2!important;}
#bpr{color:#1a1f2e!important;}
#brn{color:#15803d!important;}
#bds{color:#dc2626!important;}
#bc{color:#888!important;}
#bc:hover{color:#15803d!important;}
#vtog{background:rgba(245,247,250,0.97)!important;border-color:rgba(8,145,178,0.5)!important;}
#vtog button{color:#0891b2!important;}
#vtog button.active{background:#0891b2!important;color:#ffffff!important;}
#vtog button:first-child{border-right-color:rgba(8,145,178,0.35)!important;}
#fab{background:#edf0f7!important;border-color:#15803d!important;color:#15803d!important;box-shadow:0 0 18px rgba(21,128,61,0.4),0 6px 24px rgba(0,0,0,0.15)!important;}
#fab:hover{background:#d8edde!important;box-shadow:0 0 26px rgba(21,128,61,0.7),0 6px 24px rgba(0,0,0,0.15)!important;}
#fab.locked{background:#d0ead8!important;box-shadow:0 0 22px rgba(21,128,61,0.7),inset 0 0 12px rgba(21,128,61,0.2)!important;}
#mlock{background:#edf0f7!important;border-color:#aab0c0!important;color:#6b7280!important;}
#mlock.on{border-color:#15803d!important;color:#15803d!important;background:#d8edde!important;box-shadow:0 0 18px rgba(21,128,61,0.45),0 4px 16px rgba(0,0,0,0.1)!important;}
.ob-label span{background:rgba(240,248,242,0.98)!important;border-color:#15803d!important;color:#15803d!important;}
#bbt:disabled{background:#ffffff!important;color:#9ca3af!important;border:1.5px solid #d1d5db!important;box-shadow:none!important;}
</style>`;

// Injected at end of <body> — overrides applyDark() so light colours are used when map loads
const LIGHT_JS = `<script id="lt-js">
(function(){
  var _orig=window.applyDark;
  window.applyDark=function(){
    if(!window.map)return;
    var layers=map.getStyle().layers||[];
    layers.forEach(function(l){
      try{
        switch(l.type){
          case 'background':
            map.setPaintProperty(l.id,'background-color','#f0f4f8');break;
          case 'fill':
            if(/water|ocean|sea|lake|river/.test(l.id)){
              map.setPaintProperty(l.id,'fill-color','#a8cce0');
              try{map.setPaintProperty(l.id,'fill-opacity',1);}catch(e){}
            }else if(/park|green|grass|wood|forest|meadow|scrub|farmland|sand/.test(l.id)){
              map.setPaintProperty(l.id,'fill-color','#c0ddb0');
              try{map.setPaintProperty(l.id,'fill-opacity',1);}catch(e){}
            }else if(/building/.test(l.id)){
              map.setLayoutProperty(l.id,'visibility','none');
            }else{
              map.setPaintProperty(l.id,'fill-color','#e4e8ef');
              try{map.setPaintProperty(l.id,'fill-opacity',1);}catch(e){}
            }
            break;
          case 'line':
            if(/motorway|trunk|primary/.test(l.id)){
              map.setPaintProperty(l.id,'line-color','#b8c8d8');
              try{map.setPaintProperty(l.id,'line-opacity',1);}catch(e){}
            }else if(/road|street|highway|transport|link/.test(l.id)){
              map.setPaintProperty(l.id,'line-color','#ffffff');
              try{map.setPaintProperty(l.id,'line-opacity',1);}catch(e){}
            }else if(/rail|transit/.test(l.id)){
              map.setPaintProperty(l.id,'line-color','#c0c8d4');
              try{map.setPaintProperty(l.id,'line-opacity',0.8);}catch(e){}
            }else{
              map.setPaintProperty(l.id,'line-color','#d0d8e4');
              try{map.setPaintProperty(l.id,'line-opacity',0.7);}catch(e){}
            }
            break;
          case 'symbol':
            try{map.setPaintProperty(l.id,'text-color','#334455');}catch(e){}
            try{map.setPaintProperty(l.id,'text-halo-color','#f8fafc');}catch(e){}
            try{map.setPaintProperty(l.id,'text-halo-width',1.5);}catch(e){}
            try{map.setPaintProperty(l.id,'icon-opacity',0.9);}catch(e){}
            break;
        }
      }catch(e){}
    });
    // Fix 3D building extrusion colors after addBuildingLayers() runs
    setTimeout(function(){
      try{map.setPaintProperty('bld-base','fill-extrusion-color','#c8d4e4');}catch(e){}
      try{map.setPaintProperty('bld-base','fill-extrusion-opacity',0.9);}catch(e){}
      try{map.setPaintProperty('bld-glow','fill-extrusion-color','#4a90d9');}catch(e){}
      try{map.setPaintProperty('bld-glow','fill-extrusion-opacity',0.08);}catch(e){}
    },300);
  };
})();
<\/script>`;

router.get("/map3d", (req, res) => {
  const theme = (req.query as Record<string, string>).theme;
  let html = MAP3D_HTML;
  if (theme === "light") {
    html = html
      .replace("</head>", LIGHT_CSS + "</head>")
      .replace("</body>", LIGHT_JS + "</body>");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
});

export default router;
