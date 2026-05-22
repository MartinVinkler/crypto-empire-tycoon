// Shared 3D map HTML used by both native WebView (GpsMap.tsx) and
// the API server route (/api/map3d) for the web iframe (GpsMap.web.tsx).
// CSCALE = 0.3  →  50 real meters = 15 scene units (ring radius)

function buildMap3dHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#040610;overflow:hidden;font-family:'Courier New',Courier,monospace;}
canvas{display:block;width:100vw;height:100vh;}
#ov{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;}
#hud{position:absolute;top:12px;left:0;right:0;display:flex;justify-content:center;gap:10px;}
.pill{background:rgba(4,6,16,0.92);border:1.5px solid rgba(0,217,255,0.5);border-radius:20px;padding:5px 16px;color:#00d9ff;font-size:12px;font-weight:700;letter-spacing:.5px;white-space:nowrap;}
.pill.g{border-color:rgba(0,255,65,0.55);color:#00ff41;}
#gps{position:absolute;top:50px;left:50%;transform:translateX(-50%);background:rgba(2,4,12,0.85);border:1px solid rgba(0,255,65,0.4);color:#00ff41;font-size:11px;letter-spacing:1px;padding:3px 12px;border-radius:20px;white-space:nowrap;}
#inst{position:absolute;top:80px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.7);font-size:12px;text-align:center;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);}
#lbls{position:absolute;top:0;left:0;width:100%;height:100%;}
.lbl{position:absolute;background:rgba(0,0,0,0.9);border:1px solid rgba(0,255,65,0.7);color:#fff;font-size:11px;padding:3px 7px;border-radius:4px;white-space:nowrap;transform:translate(-50%,-110%);box-shadow:0 0 8px rgba(0,255,65,0.3);display:none;pointer-events:none;}
#bp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(3,5,14,0.97);border:2px solid #00ff41;border-radius:14px;padding:18px 24px 16px;min-width:260px;max-width:86vw;text-align:center;pointer-events:all;box-shadow:0 0 32px rgba(0,255,65,0.55);display:none;z-index:50;}
#bp.open{display:block;animation:bpIn 180ms ease-out;}
@keyframes bpIn{from{opacity:0;transform:translate(-50%,-58%) scale(0.96);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
#bc{position:absolute;top:6px;right:8px;width:30px;height:30px;color:#7d8aa8;font-size:18px;cursor:pointer;background:rgba(255,255,255,0.04);border:1px solid rgba(125,138,168,0.3);border-radius:6px;pointer-events:all;display:flex;align-items:center;justify-content:center;line-height:1;}
#bc:hover{color:#fff;border-color:rgba(0,255,65,0.6);background:rgba(0,255,65,0.08);}
#bt{color:#00d9ff;font-size:11px;font-weight:700;letter-spacing:1.5px;margin-bottom:2px;}
#bpr{color:#fff;font-size:20px;font-weight:900;margin-bottom:2px;}
#brn{color:#00ff41;font-size:11px;margin-bottom:8px;}
#bds{color:#ff3b6b;font-size:11px;margin-bottom:6px;min-height:14px;}
#bbt{background:#00ff41;color:#000;border:none;padding:10px 0;font-size:13px;font-weight:900;letter-spacing:2px;border-radius:7px;cursor:pointer;box-shadow:0 0 16px rgba(0,255,65,0.6);font-family:'Courier New',monospace;width:100%;}
#bbt:disabled{background:#0b1e0b;color:#1a3a1a;cursor:not-allowed;box-shadow:none;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="ov">
  <div id="hud">
    <div class="pill" id="bpil">$10,000</div>
    <div class="pill g" id="ppil">0 PROPERTIES</div>
  </div>
  <div id="gps">&#9679; Initializing GPS...</div>
  <div id="inst">Move physically to view nearby properties in your 50m zone.</div>
  <div id="lbls"></div>
  <div id="bp">
    <button id="bc">&#10005;</button>
    <div id="bt">BUILDING</div>
    <div id="bpr">$0</div>
    <div id="brn">+$0/hr income</div>
    <div id="bds"></div>
    <button id="bbt">TAP TO BUY</button>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
// ============================================================
// CONSTANTS
// ============================================================
var CSCALE = 0.28;        // GPS metres → scene units (50m = 14 units)
var HSCALE = 0.55;        // height scale (9m floor = 5 units)
var RING_R = 50 * CSCALE; // 14 units visual radius for 50m
var AVT_S  = 4.2;         // avatar group scale factor

var DLat = 37.7749, DLng = -122.4194;

// ============================================================
// RENDERER
// ============================================================
var CV = document.getElementById('c');
var renderer = new THREE.WebGLRenderer({ canvas: CV, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x040610, 1);
renderer.shadowMap.enabled = false;

var W = window.innerWidth, H = window.innerHeight;
var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 600);
// Bird's-eye angled view — raised enough that the 14-unit ring never floods screen
camera.position.set(0, 38, 42);
camera.lookAt(0, 3, 0);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x040610);
scene.fog = new THREE.Fog(0x040610, 90, 380);

renderer.setSize(W, H);
window.addEventListener('resize', function () {
  W = window.innerWidth; H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
});

// ============================================================
// LIGHTING  —  NO green ambient; use cool blue-white
// ============================================================
scene.add(new THREE.AmbientLight(0x182030, 1.0));
var sunL = new THREE.DirectionalLight(0x8899cc, 0.6);
sunL.position.set(80, 200, 100);
scene.add(sunL);
var playerL = new THREE.PointLight(0x00ff66, 1.6, 55);
playerL.position.set(0, 12, 0);
scene.add(playerL);
scene.add(new THREE.HemisphereLight(0x0a1020, 0x060810, 0.5));

// ============================================================
// GROUND  —  dark charcoal, NOT green
// ============================================================
var gnd = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.MeshPhongMaterial({ color: 0x0c1220, shininess: 5 })
);
gnd.rotation.x = -Math.PI / 2;
gnd.position.y = -0.12;
scene.add(gnd);

// Subtle dark grid — no green tint
var grid = new THREE.GridHelper(500, 50, 0x182030, 0x101820);
grid.position.y = -0.05;
scene.add(grid);

// ============================================================
// PLAYER AVATAR  (scaled × AVT_S for screen visibility)
// ============================================================
var pg = new THREE.Group();
var skC = 0xd4a57a, hdC = 0x0b3012, dkC = 0x0a0a0a, nG = 0x00ff41;

var head = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 12, 12),
  new THREE.MeshPhongMaterial({ color: skC, shininess: 20 })
);
head.position.y = 1.74;
pg.add(head);

var body = new THREE.Mesh(
  new THREE.BoxGeometry(0.48, 0.72, 0.26),
  new THREE.MeshPhongMaterial({ color: hdC, emissive: 0x001500, shininess: 5 })
);
body.position.y = 1.14;
pg.add(body);

// Bitcoin ring on chest
var btcR = new THREE.Mesh(
  new THREE.TorusGeometry(0.11, 0.028, 8, 16),
  new THREE.MeshPhongMaterial({ color: nG, emissive: nG, emissiveIntensity: 1.0 })
);
btcR.position.set(0, 1.14, 0.14);
pg.add(btcR);

// Arms
var armG = new THREE.BoxGeometry(0.17, 0.62, 0.17);
var armM = new THREE.MeshPhongMaterial({ color: hdC, shininess: 5 });
var lA = new THREE.Mesh(armG, armM.clone());
lA.position.set(-0.33, 1.14, 0); lA.rotation.z = 0.2;
pg.add(lA);
var rA = new THREE.Mesh(armG, armM.clone());
rA.position.set(0.33, 1.14, 0); rA.rotation.z = -0.2;
pg.add(rA);

// Legs
var legG = new THREE.CylinderGeometry(0.10, 0.09, 0.70, 8);
var legM = new THREE.MeshPhongMaterial({ color: dkC, shininess: 5 });
var lL = new THREE.Mesh(legG, legM.clone());
lL.position.set(-0.13, 0.38, 0);
pg.add(lL);
var rL = new THREE.Mesh(legG, legM.clone());
rL.position.set(0.13, 0.38, 0);
pg.add(rL);

// Shoes
var shG = new THREE.BoxGeometry(0.20, 0.10, 0.32);
var shM = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 40 });
var lS = new THREE.Mesh(shG, shM.clone()); lS.position.set(-0.13, 0.04, 0.05); pg.add(lS);
var rS = new THREE.Mesh(shG, shM.clone()); rS.position.set(0.13, 0.04, 0.05);  pg.add(rS);

pg.scale.set(AVT_S, AVT_S, AVT_S);
pg.position.y = 0;
scene.add(pg);

// ============================================================
// 50m RING  —  ONLY outline, no filled disc
// ============================================================
var ringMat = new THREE.MeshBasicMaterial({
  color: nG, side: THREE.DoubleSide, transparent: true, opacity: 0.85
});
// 1-unit-wide ring at RING_R radius
var ringMesh = new THREE.Mesh(
  new THREE.RingGeometry(RING_R - 0.4, RING_R + 0.4, 96),
  ringMat
);
ringMesh.rotation.x = -Math.PI / 2;
ringMesh.position.y = 0.08;
scene.add(ringMesh);

// Tiny semi-transparent tint inside ring (very low opacity — NOT a solid plane)
var fillMat = new THREE.MeshBasicMaterial({
  color: nG, transparent: true, opacity: 0.018, side: THREE.DoubleSide
});
var fillMesh = new THREE.Mesh(new THREE.CircleGeometry(RING_R, 64), fillMat);
fillMesh.rotation.x = -Math.PI / 2;
fillMesh.position.y = 0.04;
scene.add(fillMesh);

// ============================================================
// GAME STATE
// ============================================================
var pLat = null, pLng = null, cash = 10000;
var ownedIds = new Set(), buildings = [], sel = null, virtualPins = [];
var fetchedKeys = new Set(), fetching = false;
var lastFLat = null, lastFLng = null;
var pendingFetches = {};

// ============================================================
// COORDINATE HELPERS
// ============================================================
function ll2xz(lat, lng) {
  if (pLat === null) return { x: 0, z: 0 };
  var R = 6371000;
  return {
    x: (lng - pLng) * Math.PI / 180 * R * Math.cos(pLat * Math.PI / 180) * CSCALE,
    z: -(lat - pLat) * Math.PI / 180 * R * CSCALE
  };
}
function ll2xzR(lat, lng, rl, rg) {
  var R = 6371000;
  return {
    x: (lng - rg) * Math.PI / 180 * R * Math.cos(rl * Math.PI / 180),
    z: -(lat - rl) * Math.PI / 180 * R
  };
}
function hav(a, b, c, d) {
  var R = 6371000, p1 = a * Math.PI / 180, p2 = c * Math.PI / 180;
  var dp = (c - a) * Math.PI / 180, dl = (d - b) * Math.PI / 180;
  var s = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function pArea(pts) {
  var R = 6371000, n = pts.length, a = 0;
  for (var i = 0; i < n; i++) {
    var j = (i + 1) % n, l1 = pts[i][0] * Math.PI/180, l2 = pts[j][0] * Math.PI/180;
    var dl = (pts[j][1] - pts[i][1]) * Math.PI / 180;
    a += dl * (2 + Math.sin(l1) + Math.sin(l2));
  }
  return Math.abs(a * R * R / 2);
}
function pCtr(pts) {
  var sl = 0, sg = 0;
  for (var i = 0; i < pts.length; i++) { sl += pts[i][0]; sg += pts[i][1]; }
  return [sl / pts.length, sg / pts.length];
}
function pBnds(pts, rl, rg) {
  var x0=1e9, x1=-1e9, z0=1e9, z1=-1e9;
  for (var i = 0; i < pts.length; i++) {
    var p = ll2xzR(pts[i][0], pts[i][1], rl, rg);
    if (p.x<x0) x0=p.x; if (p.x>x1) x1=p.x;
    if (p.z<z0) z0=p.z; if (p.z>z1) z1=p.z;
  }
  return { w: Math.max(x1-x0, 8), d: Math.max(z1-z0, 8) };
}
function fUSD(v) {
  if (v>=1e6) return '$'+(v/1e6).toFixed(2)+'M';
  if (v>=1e3) return '$'+(v/1e3).toFixed(1)+'K';
  return '$'+Math.round(v);
}
function bType(tags) {
  if (!tags) return 'Building';
  var amenityMap = {
    restaurant:'Restaurant', cafe:'Cafe', fast_food:'Fast Food', bar:'Bar', pub:'Pub',
    food_court:'Food Court', ice_cream:'Ice Cream Shop', biergarten:'Beer Garden',
    hospital:'Hospital', clinic:'Medical Clinic', pharmacy:'Pharmacy', dentist:'Dental Clinic',
    bank:'Bank', atm:'ATM', post_office:'Post Office', bureau_de_change:'Exchange Office',
    school:'School', university:'University', college:'College', library:'Library',
    kindergarten:'Kindergarten', driving_school:'Driving School',
    place_of_worship:'Church', cinema:'Cinema', theatre:'Theatre', nightclub:'Club',
    fuel:'Gas Station', parking:'Parking Block', car_wash:'Car Wash',
    police:'Police Station', fire_station:'Fire Station', townhall:'Town Hall',
    courthouse:'Courthouse', embassy:'Embassy', prison:'Prison',
    hotel:'Hotel', marketplace:'Market', community_centre:'Community Centre',
    arts_centre:'Arts Centre', social_centre:'Social Centre',
    veterinary:'Vet Clinic', charging_station:'Charging Station',
  };
  if (tags.amenity && amenityMap[tags.amenity]) return amenityMap[tags.amenity];
  var shopMap = {
    supermarket:'Supermarket', convenience:'Convenience Store', bakery:'Bakery',
    butcher:'Butcher', greengrocer:'Greengrocer', deli:'Deli',
    clothes:'Clothes Shop', shoes:'Shoe Store', jewelry:'Jewellery Store',
    electronics:'Electronics Store', computer:'Computer Store', mobile_phone:'Phone Store',
    hardware:'Hardware Store', furniture:'Furniture Store', florist:'Florist',
    hairdresser:'Hair Salon', beauty:'Beauty Salon', optician:'Optician',
    pharmacy:'Pharmacy', sports:'Sports Shop', books:'Bookshop', toys:'Toy Store',
    car:'Car Dealership', bicycle:'Bike Shop', car_parts:'Auto Parts',
    department_store:'Department Store', mall:'Shopping Mall', kiosk:'Kiosk',
    laundry:'Laundry', dry_cleaning:'Dry Cleaning', travel_agency:'Travel Agency',
    pet:'Pet Store', garden_centre:'Garden Centre', alcohol:'Liquor Store',
  };
  if (tags.shop && shopMap[tags.shop]) return shopMap[tags.shop];
  if (tags.shop) return 'Shop';
  var officeMap = {
    government:'Government Office', company:'Corporate Office', it:'Tech Office',
    financial:'Financial Office', insurance:'Insurance Office', lawyer:'Law Office',
    accountant:'Accounting Office', architect:'Architecture Office',
    estate_agent:'Real Estate Office', ngo:'NGO Office', diplomatic:'Diplomatic Office',
  };
  if (tags.office && officeMap[tags.office]) return officeMap[tags.office];
  if (tags.office) return 'Office Block';
  if (tags.tourism === 'hotel' || tags.tourism === 'motel') return 'Hotel';
  if (tags.tourism === 'hostel') return 'Hostel';
  if (tags.tourism === 'museum') return 'Museum';
  if (tags.tourism === 'gallery') return 'Art Gallery';
  if (tags.tourism === 'attraction') return 'Attraction';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'fitness_centre') return 'Gym';
  if (tags.leisure === 'swimming_pool') return 'Pool';
  if (tags.leisure === 'stadium') return 'Stadium';
  if (tags.leisure === 'theatre') return 'Theatre';
  var t = tags.building || '';
  var m = {
    apartments:'Apartment Block', residential:'Residential Block',
    office:'Office Block', commercial:'Commercial Block',
    retail:'Retail Block', shop:'Shop Block', hotel:'Hotel', motel:'Hotel',
    industrial:'Industrial Unit', warehouse:'Warehouse',
    school:'School', university:'University', dormitory:'Dormitory',
    house:'House', detached:'House', semidetached_house:'Semi-Detached',
    terrace:'Terrace House', bungalow:'Bungalow', cabin:'Cabin', farm:'Farm',
    church:'Church', cathedral:'Cathedral', chapel:'Chapel', mosque:'Mosque',
    synagogue:'Synagogue', temple:'Temple', shrine:'Shrine',
    hospital:'Hospital', clinic:'Clinic',
    parking:'Parking Block', garage:'Garage Block', carport:'Carport',
    stadium:'Stadium', sports_hall:'Sports Hall',
    supermarket:'Supermarket', kiosk:'Kiosk',
    civic:'Civic Building', government:'Government Building', public:'Public Building',
    transportation:'Transport Hub', train_station:'Train Station',
    tower:'Tower Block', skyscraper:'Skyscraper', bunker:'Bunker',
    yes:'Building', '':'Building'
  };
  return m[t] || (t ? t.charAt(0).toUpperCase()+t.slice(1).replace(/_/g,' ') : 'Building');
}

// ============================================================
// BUILDING MATERIALS
// ============================================================
function mkM(c, e, ei, op) {
  return new THREE.MeshPhongMaterial({
    color: c, emissive: e||0, emissiveIntensity: ei||0,
    shininess: 25, transparent: true, opacity: op||0.92
  });
}
var M_DK = mkM(0x161e2c, 0x040810);
var M_NR = mkM(0x0f2018, 0x001a06, 0.45);
var M_OW = mkM(0x00ff41, 0x00ff41, 0.35);
var M_SE = mkM(0x00ff41, 0x00ff41, 0.85);

function edgeMat(color, op) {
  return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: op });
}

function makeBldMesh(bld) {
  var geo = new THREE.BoxGeometry(bld.w, bld.h, bld.d);
  var mesh = new THREE.Mesh(geo, (bld.owned ? M_OW : M_DK).clone());
  mesh.userData.bid = bld.id;
  // Edge outline
  var eGeo = new THREE.EdgesGeometry(geo);
  var eLine = new THREE.LineSegments(eGeo, edgeMat(bld.owned ? 0x00ff41 : 0x2a3a50, bld.owned ? 0.85 : 0.4));
  mesh.add(eLine);
  bld.edge = eLine;
  return mesh;
}

// ============================================================
// ADD BUILDINGS FROM OSM DATA
// ============================================================
function addBuildings(els) {
  var nm = {};
  for (var i = 0; i < els.length; i++) {
    var e = els[i];
    if (e.type === 'node' && e.lat != null && e.lon != null) nm[e.id] = [e.lat, e.lon];
  }
  for (var i = 0; i < els.length && buildings.length < 200; i++) {
    var e = els[i];
    if (e.type !== 'way' || !e.tags || !e.tags.building) continue;
    // Unique ID — prefix with osm_ so it's clearly distinct from any other id namespace
    var id = 'osm_' + String(e.id);
    if (buildings.find(function(b){ return b.id===id; })) continue;
    var pts = (e.nodes||[]).map(function(n){ return nm[n]; }).filter(Boolean);
    if (pts.length < 3) continue;
    var area = pArea(pts);
    if (area < 4) continue;
    var ctr = pCtr(pts), lat = ctr[0], lng = ctr[1];
    var fl = parseInt((e.tags['building:levels']||e.tags['levels']||'3'),10)||3;
    var hM = Math.min(Math.max(fl * 3.2, 6), 80); // metres
    var bn = pBnds(pts, lat, lng);
    // Apply scales
    var w = Math.min(Math.max(bn.w, 8), 100) * CSCALE;
    var d = Math.min(Math.max(bn.d, 8), 100) * CSCALE;
    var h = hM * HSCALE;
    // Per-building deterministic price jitter so two same-sized buildings never share a price
    // Hash the OSM id into a stable [-25, +25] $ offset.
    var jit = 0;
    for (var ji = 0; ji < id.length; ji++) jit = (jit * 31 + id.charCodeAt(ji)) | 0;
    var jitter = ((jit % 51) + 51) % 51 - 25;     // stable in [-25, 25]
    var price = Math.round(500 + Math.min(area, 10000) * 0.8) + jitter;
    var rent  = Math.round(price * 0.05 + 176);
    var type  = bType(e.tags);
    var osmName = e.tags.name || e.tags.brand || e.tags.operator || null;
    var displayName = osmName || type;
    var bld = { id:id, lat:lat, lng:lng, w:w, d:d, h:h, area:Math.round(area), price:price, rent:rent, type:type, name:displayName, mesh:null, edge:null, owned:ownedIds.has(id) };
    var mesh = makeBldMesh(bld);
    var p = ll2xz(lat, lng);
    mesh.position.set(p.x, h/2, p.z);
    scene.add(mesh);
    bld.mesh = mesh;
    buildings.push(bld);
  }
}

function updatePositions() {
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i]; if (!b.mesh) continue;
    var p = ll2xz(b.lat, b.lng);
    b.mesh.position.set(p.x, b.h/2, p.z);
  }
}

function rMat(b) {
  if (!b.mesh || b === sel) return;
  var mat, ec, eo;
  if (b.owned) {
    mat = M_OW.clone(); ec = 0x00ff41; eo = 0.85;
  } else if (pLat !== null && hav(pLat, pLng, b.lat, b.lng) <= 52) {
    mat = M_NR.clone(); ec = 0x00cc33; eo = 0.6;
  } else {
    mat = M_DK.clone(); ec = 0x2a3a50; eo = 0.35;
  }
  b.mesh.material = mat;
  if (b.edge) b.edge.material = edgeMat(ec, eo);
}
function rAll() { for (var i = 0; i < buildings.length; i++) rMat(buildings[i]); }

// ============================================================
// OVERPASS FETCH (with parent-iframe proxy support)
// ============================================================
window.addEventListener('message', function(ev) {
  var msg; try { msg = JSON.parse(ev.data); } catch(_){ return; }
  if (msg.type === 'OVERPASS_RESPONSE' && pendingFetches[msg.reqId]) {
    pendingFetches[msg.reqId](msg.data); delete pendingFetches[msg.reqId];
  }
  if (msg.type === 'GPS_UPDATE') setLoc(msg.lat, msg.lng);
  if (msg.type === 'INIT_STATE') { window._setCash(msg.balance); window._setOwned(msg.ownedIds||[]); }
  if (msg.type === 'SET_CASH') window._setCash(msg.balance);
  if (msg.type === 'SET_OWNED') window._setOwned(msg.ownedIds||[]);
  if (msg.type === 'CLOSE_BUY') closeBuy();
  if (msg.type === 'NOTIFY_BOUGHT' && msg.id) window._notifyBought(msg.id);
  if (msg.type === 'FLY_TO' && msg.lat != null && pLat != null) {
    var ft = ll2xz(msg.lat, msg.lng); camera.position.set(ft.x, 38, ft.z+42); camera.lookAt(ft.x, 3, ft.z);
  }
});

async function doFetch(q) {
  if (window.parent !== window) {
    return new Promise(function(res) {
      var id = Date.now()+'_'+Math.random(); pendingFetches[id] = res;
      window.parent.postMessage(JSON.stringify({ type:'OVERPASS_FETCH', query:q, reqId:id }), '*');
      setTimeout(function(){ if (pendingFetches[id]){ delete pendingFetches[id]; res(null); } }, 15000);
    });
  }
  try {
    var r = await fetch('/api/overpass', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q}) });
    if (r.ok) return await r.json();
  } catch(_){}
  try {
    var r2 = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'data='+encodeURIComponent(q) });
    if (r2.ok) return await r2.json();
  } catch(_){}
  return null;
}

async function fetchB(lat, lng) {
  if (fetching) return;
  var k = Math.round(lat*100)+'_'+Math.round(lng*100);
  if (fetchedKeys.has(k)) return;
  fetching = true; fetchedKeys.add(k);
  setSt('&#9679; Loading buildings...');
  var R = 0.003;
  var q = '[out:json][timeout:25];(way["building"]('+((lat-R))+','+((lng-R*1.5))+','+((lat+R))+','+((lng+R*1.5))+'););out body;>;out skel qt;';
  var data = await doFetch(q);
  if (data && data.elements) {
    addBuildings(data.elements);
    setSt('&#9679; '+buildings.length+' properties nearby');
    rAll();
  } else {
    setSt('&#9679; GPS ready');
  }
  fetching = false;
}

// ============================================================
// GPS & STATE BRIDGE
// ============================================================
function setSt(t) { document.getElementById('gps').innerHTML = t; }
function setLoc(lat, lng) {
  pLat = lat; pLng = lng;
  setSt('&#9679; GPS Active');
  updatePositions(); rAll();
  if (!lastFLat || hav(lat, lng, lastFLat, lastFLng) > 180) {
    lastFLat = lat; lastFLng = lng; fetchB(lat, lng);
  }
}
window._setPlayerLocation = setLoc;
window._setCash = function(v) {
  cash = v; document.getElementById('bpil').textContent = fUSD(v);
};
window._setOwned = function(ids) {
  var idSet = new Set(), pins = [];
  for (var k = 0; k < ids.length; k++) {
    var it = ids[k];
    if (typeof it === 'string') { idSet.add(it); }
    else { idSet.add(it.id); if (it.lat != null && it.lng != null && String(it.id).indexOf('iap_') === 0) pins.push({id:it.id, lat:it.lat, lng:it.lng}); }
  }
  ownedIds = idSet; virtualPins = pins;
  for (var i = 0; i < buildings.length; i++) {
    buildings[i].owned = ownedIds.has(buildings[i].id); rMat(buildings[i]);
  }
  updCnt();
};
window._setOwnedIds = window._setOwned; // alias for native WebView
function updCnt() {
  var n = buildings.filter(function(b){ return b.owned; }).length;
  document.getElementById('ppil').textContent = n+' '+(n===1?'PROPERTY':'PROPERTIES');
}

// ============================================================
// BUY PANEL
// ============================================================
function showBuy(bld) {
  // Restore the previously selected (non-owned) building so its neon-green
  // selection paint doesn't leak across taps. Without this, every building the
  // user ever taps stays bright green even though only purchased buildings
  // should be highlighted.
  if (sel && sel !== bld && sel.mesh && !sel.owned) rMat(sel);
  sel = bld;
  var _smsg = JSON.stringify({type:'select',id:bld.id,name:bld.name||bld.type,cost:bld.price,rent:bld.rent,area:bld.area||Math.round((bld.w||0)*(bld.d||0)),lat:bld.lat,lng:bld.lng,owned:!!bld.owned});
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(_smsg);
  else window.parent.postMessage(_smsg,'*');
  if (bld.mesh) bld.mesh.material = M_SE.clone();
  if (bld.edge) bld.edge.material = edgeMat(0x00ff41, 1.0);
  document.getElementById('bt').textContent = (bld.name||bld.type).toUpperCase()+(bld.owned ? ' \u2014 OWNED' : ' \u2014 FOR SALE');
  document.getElementById('bpr').textContent = fUSD(bld.price);
  document.getElementById('brn').textContent = '+'+fUSD(bld.rent)+'/hr income';
  var dist = pLat ? hav(pLat, pLng, bld.lat, bld.lng) : 9999;
  var btn = document.getElementById('bbt'), dd = document.getElementById('bds');
  if (bld.owned) { dd.textContent=''; btn.textContent='OWNED \u2713'; btn.disabled=true; btn.style.background=''; btn.style.color=''; }
  else if (dist > 52) { dd.textContent='\u26a0 '+Math.round(dist)+'m \u2014 walk closer'; btn.textContent='OUT OF RANGE'; btn.disabled=true; btn.style.background=''; btn.style.color=''; }
  else if (cash < bld.price) { dd.textContent=''; btn.textContent='INSUFFICIENT FUNDS'; btn.disabled=true; btn.style.background=''; btn.style.color=''; }
  else { dd.textContent=''; btn.textContent='TAP TO BUY'; btn.disabled=false; btn.style.background=''; btn.style.color=''; }
  document.getElementById('bp').classList.add('open');
}
function closeBuy() {
  if (sel && sel.mesh && !sel.owned) rMat(sel);
  sel = null; document.getElementById('bp').classList.remove('open');
}
window._notifyBought = function(id) {
  var b = buildings.find(function(b){ return b.id === id; });
  if (b) { ownedIds.add(id); b.owned = true; if (b.mesh) b.mesh.material = M_OW.clone(); if (b.edge) b.edge.material = edgeMat(0x00ff41, 0.85); }
  updCnt(); closeBuy();
};
document.getElementById('bc').addEventListener('click', closeBuy);
document.getElementById('bbt').addEventListener('click', function() {
  if (!sel || sel.owned) return;
  if (cash < sel.price) return;
  var msg = JSON.stringify({ type:'buy', id:sel.id, name:sel.name||sel.type, cost:sel.price, rent:sel.rent, area:sel.area||Math.round(sel.w*sel.d) });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
  else window.parent.postMessage(msg, '*');
  ownedIds.add(sel.id); sel.owned=true;
  cash-=sel.price; document.getElementById('bpil').textContent = fUSD(cash);
  if (sel.mesh) sel.mesh.material = M_OW.clone();
  if (sel.edge) sel.edge.material = edgeMat(0x00ff41, 0.85);
  updCnt(); closeBuy();
});

// ============================================================
// RAYCASTING
// ============================================================
var ray = new THREE.Raycaster(), mv = new THREE.Vector2();
function onTap(cx, cy) {
  var rect = CV.getBoundingClientRect();
  mv.x = ((cx-rect.left)/rect.width)*2-1;
  mv.y = -((cy-rect.top)/rect.height)*2+1;
  ray.setFromCamera(mv, camera);
  var ms = buildings.map(function(b){ return b.mesh; }).filter(Boolean);
  var hits = ray.intersectObjects(ms, false);
  if (!hits.length) { closeBuy(); return; }
  var bld = buildings.find(function(b){ return b.mesh===hits[0].object; });
  if (bld) showBuy(bld);
}
CV.addEventListener('click', function(e){ onTap(e.clientX, e.clientY); });
CV.addEventListener('touchend', function(e){
  e.preventDefault();
  var t = e.changedTouches[0]; onTap(t.clientX, t.clientY);
}, { passive: false });

// ============================================================
// LABELS
// ============================================================
var LC = document.getElementById('lbls'), lp = [], li = 0;
function gL() {
  if (li < lp.length) { var el=lp[li++]; el.style.display='block'; return el; }
  var el = document.createElement('div'); el.className='lbl';
  LC.appendChild(el); lp.push(el); li++; return el;
}
function rL() { for (var i=li; i<lp.length; i++) lp[i].style.display='none'; li=0; }
function w2s(pos) {
  var v = pos.clone().project(camera);
  return { x:(v.x+1)/2*window.innerWidth, y:-(v.y-1)/2*window.innerHeight, ok:v.z<1 };
}

// ============================================================
// ANIMATION LOOP
// ============================================================
var tick = 0;
function animate() {
  requestAnimationFrame(animate);
  tick += 0.016;
  ringMesh.material.opacity = 0.6 + 0.3 * Math.sin(tick * 2.2);
  pg.position.y = Math.sin(tick * 1.6) * 0.18;
  rL();
  if (pLat !== null) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i]; if (!b.mesh) continue;
      if (hav(pLat, pLng, b.lat, b.lng) > 58) continue;
      var tp = b.mesh.position.clone(); tp.y += b.h/2 + 1.5;
      var s = w2s(tp); if (!s.ok) continue;
      var lbl = gL();
      lbl.style.left = s.x+'px'; lbl.style.top = s.y+'px';
      lbl.style.borderColor = b.owned ? '#00ff41' : 'rgba(0,255,65,0.6)';
      lbl.style.color = b.owned ? '#00ff41' : '#fff';
      lbl.textContent = b.owned ? ('\u2713 '+(b.name||b.type)) : ((b.name||b.type)+' \u2014 '+fUSD(b.price));
    }
    for (var pi = 0; pi < virtualPins.length; pi++) {
      var pin = virtualPins[pi];
      if (hav(pLat, pLng, pin.lat, pin.lng) > 400) continue;
      var pxy = ll2xz(pin.lat, pin.lng);
      var tp2 = new THREE.Vector3(pxy.x, 3.5, pxy.z);
      var sv = w2s(tp2); if (!sv.ok) continue;
      var vl = gL();
      vl.style.left = sv.x+'px'; vl.style.top = sv.y+'px';
      vl.style.borderColor = '#00ff41'; vl.style.color = '#00ff41';
      vl.textContent = '\u2713 PROPERTY';
    }
  }
  renderer.render(scene, camera);
}

// ============================================================
// BOOT
// ============================================================
(function init() {
  pLat = DLat; pLng = DLng;
  fetchB(DLat, DLng);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(p){ setLoc(p.coords.latitude, p.coords.longitude); },
      function(){ setSt('&#9679; Using SF default'); },
      { enableHighAccuracy:true, timeout:12000 }
    );
    navigator.geolocation.watchPosition(
      function(p){ setLoc(p.coords.latitude, p.coords.longitude); },
      function(){},
      { enableHighAccuracy:true, maximumAge:3000 }
    );
  } else {
    setSt('&#9679; Location unavailable');
  }
  setTimeout(function() {
    var m = JSON.stringify({ type:'ready' });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);
    else window.parent.postMessage(m, '*');
  }, 200);
  animate();
})();
<\/script>
</body>
</html>`;
}

export const MAP_3D_HTML: string = buildMap3dHtml();
export const LEAFLET_HTML: string = MAP_3D_HTML;
