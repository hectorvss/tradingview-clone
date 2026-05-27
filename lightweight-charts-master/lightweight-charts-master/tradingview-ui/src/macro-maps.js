// macro-maps.js — Pantalla "Mapas macro"
// Replica de Figma nodos 25-151876 (Tipo de interés), 25-155064 (PIB),
// 25-158174 (Tasa de desempleo), 25-161248 (Deuda pública/PIB).
//
// Export:
//   createMacroMaps(mountEl, opts) -> { render, destroy, setTab(tabId) }
//
// tabId ∈ { 'inflation', 'rates', 'gdp', 'unemployment', 'debt' }
//
// Assets:
//   /assets/macro-maps/world-map.svg        — SVG real con ~174 paths por país (data-iso)
//   /assets/macro-maps/flags/<ISO>.svg      — banderas 4x3 (lipis/flag-icons)

const ASSET_BASE = '/assets/macro-maps';
const WORLD_MAP_URL = `${ASSET_BASE}/world-map.svg`;
const FLAG_URL = (iso) => `${ASSET_BASE}/flags/${iso}.svg`;

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const STYLE_ID = 'tvmm-styles-v2';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
.tvmm-root{
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background:#0f0f0f; color:#d1d4dc; box-sizing:border-box;
  width:100%; height:100%; min-height:780px;
  padding:12px 40px; overflow:auto; position:relative;
}
.tvmm-root *{box-sizing:border-box;}
.tvmm-titlebar{display:flex; align-items:center; justify-content:space-between; height:34px; margin-bottom:8px;}
.tvmm-title{font-size:22px; font-weight:700; color:#f8f9fd; margin:0; letter-spacing:.1px;}
.tvmm-titlebar .tvmm-iconbtn{margin-left:8px;}
.tvmm-iconbtn{
  width:34px; height:34px; border-radius:50%; background:transparent; border:none;
  color:#b8b8b8; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
  transition:background .15s, color .15s;
}
.tvmm-iconbtn:hover{background:#1e222d; color:#f0f3fa;}
.tvmm-iconbtn svg{width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round;}
.tvmm-iconbtn.small{width:28px; height:28px;}
.tvmm-iconbtn.small svg{width:13px; height:13px;}

.tvmm-tabs-row{
  display:flex; align-items:center; height:42px; padding:4px 0;
  margin: 4px 0 12px 0;
  border-bottom:1px solid #1e222d;
}
.tvmm-tabs{display:flex; align-items:center; gap:8px; overflow-x:auto; flex:1;}
.tvmm-tabs::-webkit-scrollbar{display:none;}
.tvmm-tab{
  height:34px; padding:0 14px; border-radius:17px; border:none; cursor:pointer;
  background:transparent; color:#b8b8b8; font-size:13px; font-weight:500;
  white-space:nowrap; display:inline-flex; align-items:center; gap:6px;
  transition:background .15s, color .15s;
}
.tvmm-tab:hover{background:#1e222d; color:#f0f3fa;}
.tvmm-tab.active{background:#f0f3fa; color:#0f0f0f;}
.tvmm-tabs-row .tvmm-search-btn{margin-right:8px;}

.tvmm-body{display:grid; grid-template-columns: 1fr 300px; gap:20px; min-height:700px;}
.tvmm-map-col{
  position:relative; background:#0f0f0f; border:1px solid #1e222d; border-radius:8px;
  padding:12px; display:flex; flex-direction:column; min-height:700px;
}
.tvmm-map-wrap{position:relative; flex:1; min-height:520px; overflow:hidden;}
.tvmm-map-host{width:100%; height:100%;}
.tvmm-map-host svg{display:block; width:100%; height:100%; min-height:520px;}
.tvmm-map-host svg path{fill:#1a1d24; stroke:#0f0f0f; stroke-width:.4; transition:fill .25s, stroke .15s;}
.tvmm-map-host svg path[data-iso]{cursor:default;}
.tvmm-map-host svg path.has-data{cursor:pointer;}
.tvmm-map-host svg path.has-data:hover{stroke:#f0f3fa; stroke-width:1;}

.tvmm-zoomctl{
  position:absolute; top:50%; right:6px; transform:translateY(-50%);
  display:flex; flex-direction:column; gap:6px; z-index:5;
}
.tvmm-zoomctl .tvmm-iconbtn{background:#1a1d24;}
.tvmm-zoomctl .tvmm-iconbtn:hover{background:#2a2e39;}
.tvmm-fullscreen{position:absolute; bottom:6px; right:6px; z-index:5;}

.tvmm-legend{
  display:flex; align-items:center; justify-content:center;
  margin-top:12px; padding:0 24px; min-height:40px;
}
.tvmm-legend-track{
  width:600px; max-width:100%; height:8px; border-radius:4px; position:relative;
}
.tvmm-legend-marks{position:absolute; left:0; right:0; top:14px; font-size:11px; color:#8c8c8c;}
.tvmm-legend-mark{position:absolute; transform:translateX(-50%); white-space:nowrap;}

.tvmm-timeline{padding:18px 0 4px 0;}
.tvmm-timeline-marks{display:flex; justify-content:space-between; font-size:12px; color:#8c8c8c; margin-bottom:8px;}
.tvmm-timeline-track{position:relative; height:6px; background:#1e222d; border-radius:3px;}
.tvmm-timeline-fill{position:absolute; left:0; top:0; bottom:0; background:#2962ff; border-radius:3px;}
.tvmm-timeline-thumb{
  position:absolute; top:50%; transform:translate(-50%,-50%);
  width:14px; height:14px; border-radius:50%; background:#2962ff;
  border:2px solid #f0f3fa; box-shadow:0 0 0 2px rgba(41,98,255,.25);
}

.tvmm-tooltip{
  position:absolute; background:#1e222d; border:1px solid #2a2e39; border-radius:4px;
  padding:8px 12px; pointer-events:none; z-index:20; min-width:180px;
  box-shadow:0 4px 12px rgba(0,0,0,.4); font-size:13px;
}
.tvmm-tooltip-title{font-weight:600; color:#f0f3fa; margin-bottom:4px; display:flex; align-items:center; gap:6px;}
.tvmm-tooltip-title img{width:16px; height:12px; border-radius:2px; object-fit:cover;}
.tvmm-tooltip-val{color:#b8b8b8;}
.tvmm-tooltip-val b{color:#f0f3fa;}

.tvmm-sidebar{
  background:#0f0f0f; border:1px solid #1e222d; border-radius:8px; padding:12px;
  display:flex; flex-direction:column; min-height:700px;
}
.tvmm-sb-head{
  display:flex; align-items:center; gap:4px; font-size:14px; font-weight:600;
  color:#f0f3fa; cursor:pointer; padding:4px 0; margin-bottom:8px;
}
.tvmm-sb-head svg{width:12px; height:12px; fill:currentColor;}
.tvmm-sb-colhead{
  display:flex; justify-content:space-between; font-size:11px; color:#8c8c8c;
  text-transform:uppercase; letter-spacing:.5px; padding:4px 0 8px;
  border-bottom:1px solid #1e222d; margin-bottom:4px;
}
.tvmm-sb-list{flex:1; overflow-y:auto; min-height:0;}
.tvmm-sb-list::-webkit-scrollbar{width:6px;}
.tvmm-sb-list::-webkit-scrollbar-thumb{background:#2a2e39; border-radius:3px;}

.tvmm-row{
  display:grid; grid-template-columns: 32px 1fr auto;
  gap:10px; align-items:center; padding:10px 4px;
  border-bottom:1px solid #1a1d24;
  cursor:pointer; transition:background .15s;
}
.tvmm-row:hover{background:#1a1d24;}
.tvmm-flag{
  width:28px; height:28px; border-radius:50%; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:#1e222d; flex-shrink:0;
}
.tvmm-flag img{width:100%; height:100%; object-fit:cover;}
.tvmm-row-mid{display:flex; flex-direction:column; gap:4px; min-width:0;}
.tvmm-row-country{
  font-size:14px; color:#f0f3fa; font-weight:500; line-height:1.2;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.tvmm-ticker{
  display:inline-block; font-size:10px; font-weight:700;
  color:#dbdbdb; background:#2a2e39; padding:2px 6px; border-radius:3px;
  letter-spacing:.4px; align-self:flex-start;
}
.tvmm-row-right{text-align:right;}
.tvmm-row-val{font-size:14px; color:#f0f3fa; font-weight:500; line-height:1.2;}
.tvmm-row-date{font-size:11px; color:#8c8c8c; margin-top:4px;}

.tvmm-map-loading{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#8c8c8c; font-size:13px;
}

@media (max-width: 1100px){
  .tvmm-body{grid-template-columns: 1fr;}
  .tvmm-sidebar{min-height:auto; max-height:560px;}
}
`;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = css;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Iconos SVG (línea fina, 16px, estilo Figma)
// ---------------------------------------------------------------------------
const I = {
  search:  '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  cog:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  camera:  '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  plus:    '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus:   '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  reset:   '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  expand:  '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 10l5 5 5-5z"/></svg>',
};

// ---------------------------------------------------------------------------
// Configuración por tab
// ---------------------------------------------------------------------------
const TABS = [
  { id:'inflation',   label:'Tasa de inflación' },
  { id:'rates',       label:'Tipo de interés' },
  { id:'gdp',         label:'PIB' },
  { id:'unemployment',label:'Tasa de desempleo' },
  { id:'debt',        label:'Deuda pública/PIB' },
];

// Paletas (rampas low->high) — alineadas con Figma
const PALETTES = {
  inflation:   ['#3a1208','#7a1f0e','#c1390f','#ed6b1f','#f59e3a','#fcd34d'],
  rates:       ['#003b1f','#005a30','#067a42','#089950','#42bd7f','#70cc9e'],
  gdp:         ['#0a2540','#0d3a6b','#1565c0','#1e88e5','#5b9cf6','#9bc4f7'],
  unemployment:['#2a0e3d','#451664','#5b1c8a','#7b30b3','#9c4dd6','#bd80e6'],
  debt:        ['#3a0a24','#6b0e3f','#a31760','#d52186','#ef58a8','#f794c6'],
};

const LEGENDS = {
  inflation:   ['1%','3%','5%','8%','15%','30%'],
  rates:       ['1%','5%','7%','10%','15%','30%'],
  gdp:         ['20 B USD','50 B USD','100 B USD','400 B USD','1 T USD','2 T USD'],
  unemployment:['2%','5%','10%','15%','20%','30%'],
  debt:        ['10%','45%','75%','105%','135%','165%'],
};

const SCALES = {
  inflation:   [0, 30],
  rates:       [0, 40],
  gdp:         [0, 30000],
  unemployment:[0, 35],
  debt:        [0, 250],
};

const TIMELINES = {
  inflation:   ['1 mar 1954','22 mar 1972','13 abr 1990','4 may 2008','26 may 2026'],
  rates:       ['1 mar 1954','22 mar 1972','13 abr 1990','4 may 2008','26 may 2026'],
  gdp:         ['1960','1976','1992','2008','2024'],
  unemployment:['Ene 1948','Ago 1967','Mar 1987','Oct 2006','Mayo 2026'],
  debt:        ['1940','1962','1983','2005','2026'],
};

// ---------------------------------------------------------------------------
// Catálogo G20 — bandera ahora viene de SVG (lipis/flag-icons)
// ---------------------------------------------------------------------------
const COUNTRIES = {
  US: { name:'EE. UU.' },          CN: { name:'China continental' },
  JP: { name:'Japón' },            DE: { name:'Alemania' },
  IN: { name:'India' },            GB: { name:'Reino Unido' },
  FR: { name:'Francia' },          IT: { name:'Italia' },
  CA: { name:'Canadá' },           BR: { name:'Brasil' },
  RU: { name:'Rusia' },            KR: { name:'Corea del Sur' },
  MX: { name:'México' },           AU: { name:'Australia' },
  ID: { name:'Indonesia' },        TR: { name:'Turquía' },
  SA: { name:'Arabia Saudí' },     AR: { name:'Argentina' },
  ZA: { name:'Sudáfrica' },
};

const TICKER_SUFFIX = {
  rates: 'INTR', gdp: 'GDP', unemployment: 'UR', debt: 'GDG', inflation: 'IR',
};
function makeTicker(iso, tab) { return iso + (TICKER_SUFFIX[tab] || ''); }

// ---------------------------------------------------------------------------
// Datos por tab
// ---------------------------------------------------------------------------
const DATA = {
  rates: [
    ['TR', 37,    '22 abr 2026'], ['AR', 29,    '30 abr 2026'],
    ['BR', 14.5,  '29 abr 2026'], ['RU', 14.5,  '24 abr 2026'],
    ['ZA', 6.75,  '30 abr 2026'], ['MX', 6.5,   '7 may 2026'],
    ['IN', 5.25,  '8 abr 2026'],  ['ID', 5.25,  '20 may 2026'],
    ['AU', 4.35,  '5 may 2026'],  ['SA', 4.25,  '29 abr 2026'],
    ['GB', 3.75,  '30 abr 2026'], ['US', 3.75,  '29 abr 2026'],
    ['CN', 3,     '20 may 2026'], ['KR', 2.5,   '10 abr 2026'],
    ['CA', 2.25,  '29 abr 2026'], ['FR', 2.15,  '11 sept 2025'],
    ['DE', 2.15,  '11 sept 2025'],['IT', 2.15,  '11 sept 2025'],
    ['JP', 0.75,  '28 abr 2026'],
  ],
  gdp: [
    ['US', 29100, '2024'], ['CN', 18700, '2024'], ['DE', 4600,  '2024'],
    ['JP', 4000,  '2024'], ['IN', 3900,  '2024'], ['GB', 3600,  '2024'],
    ['FR', 3100,  '2024'], ['IT', 2300,  '2024'], ['CA', 2200,  '2024'],
    ['BR', 2100,  '2024'], ['RU', 2100,  '2024'], ['KR', 1900,  '2024'],
    ['MX', 1800,  '2024'], ['AU', 1700,  '2024'], ['ID', 1300,  '2024'],
    ['TR', 1300,  '2024'], ['SA', 1200,  '2024'], ['AR', 633.2, '2024'],
    ['ZA', 400.2, '2024'],
  ],
  unemployment: [
    ['ZA', 32.7, 'Mar 2026'], ['FR', 8.1,  'Mar 2026'], ['TR', 8.1,  'Mar 2026'],
    ['AR', 7.5,  'Dic 2025'], ['CA', 6.9,  'Abr 2026'], ['DE', 6.4,  'Abr 2026'],
    ['BR', 6.1,  'Mar 2026'], ['CN', 5.2,  'Abr 2026'], ['IN', 5.2,  'Abr 2026'],
    ['IT', 5.2,  'Mar 2026'], ['GB', 5,    'Mar 2026'], ['ID', 4.68, 'Abr 2026'],
    ['AU', 4.5,  'Abr 2026'], ['US', 4.3,  'Abr 2026'], ['SA', 3.5,  'Dic 2025'],
    ['KR', 2.8,  'Abr 2026'], ['JP', 2.7,  'Mar 2026'], ['MX', 2.4,  'Mar 2026'],
    ['RU', 2.2,  'Mar 2026'],
  ],
  debt: [
    ['JP', 248.7, '2025'], ['IT', 137.1, '2025'], ['US', 123.3, '2025'],
    ['FR', 115.6, '2025'], ['CA', 113.5, '2025'], ['CN', 99.2,  '2025'],
    ['GB', 94.3,  '2025'], ['IN', 81.92, '2024'], ['ZA', 78.9,  '2025'],
    ['BR', 78.64, '2025'], ['AR', 78.4,  '2025'], ['DE', 63.5,  '2025'],
    ['KR', 49,    '2025'], ['MX', 45.4,  '2025'], ['ID', 41,    '2025'],
    ['SA', 31.7,  '2025'], ['TR', 24.7,  '2024'], ['AU', 18.8,  '2025'],
    ['RU', 18.3,  '2025'],
  ],
  inflation: [
    ['AR', 24.5,  'Abr 2026'], ['TR', 19.2,  'Abr 2026'], ['RU', 8.1,   'Abr 2026'],
    ['BR', 5.3,   'Abr 2026'], ['ZA', 4.2,   'Mar 2026'], ['IN', 4.1,   'Abr 2026'],
    ['MX', 3.9,   'Abr 2026'], ['GB', 3.5,   'Mar 2026'], ['ID', 3.0,   'Abr 2026'],
    ['US', 2.8,   'Mar 2026'], ['AU', 2.7,   'Mar 2026'], ['DE', 2.4,   'Mar 2026'],
    ['CA', 2.3,   'Mar 2026'], ['IT', 2.1,   'Mar 2026'], ['KR', 2.1,   'Abr 2026'],
    ['FR', 1.9,   'Mar 2026'], ['JP', 1.8,   'Mar 2026'], ['SA', 1.6,   'Mar 2026'],
    ['CN', 0.3,   'Abr 2026'],
  ],
};

// ---------------------------------------------------------------------------
// Datos extra para tooltips contextuales (clave: tab+iso)
// ---------------------------------------------------------------------------
const TOOLTIP_EXTRAS = {
  // Mongolia (MN) en pestaña desempleo: 5.7% Mar 2026 (Figma node 25-158174).
  'unemployment:MN': { name:'Mongolia', value:'5.7%', date:'Mar 2026' },
};

// ---------------------------------------------------------------------------
// Helpers de color
// ---------------------------------------------------------------------------
function rampColor(palette, t) {
  t = Math.max(0, Math.min(1, t));
  const n = palette.length;
  const i = Math.min(n - 2, Math.floor(t * (n - 1)));
  const f = t * (n - 1) - i;
  const hex2rgb = (h) => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const a = hex2rgb(palette[i]), b = hex2rgb(palette[i+1]);
  const r = Math.round(a[0]+(b[0]-a[0])*f);
  const g = Math.round(a[1]+(b[1]-a[1])*f);
  const bb= Math.round(a[2]+(b[2]-a[2])*f);
  return `rgb(${r},${g},${bb})`;
}

function normalize(value, tab) {
  const [lo, hi] = SCALES[tab];
  if (tab === 'gdp') {
    const v = Math.max(1, value);
    return Math.log10(v) / Math.log10(hi);
  }
  return (value - lo) / (hi - lo);
}

function fmtValue(v, tab) {
  if (tab === 'gdp') {
    if (v >= 1000) return (v/1000).toFixed(1) + ' T USD';
    return v.toFixed(1) + ' B USD';
  }
  return (Math.round(v*100)/100) + '%';
}

// ---------------------------------------------------------------------------
// Carga del mapa SVG (cache de promesa global)
// ---------------------------------------------------------------------------
let _worldSvgPromise = null;
function loadWorldSVG() {
  if (_worldSvgPromise) return _worldSvgPromise;
  _worldSvgPromise = fetch(WORLD_MAP_URL)
    .then(r => r.ok ? r.text() : Promise.reject(new Error('Mapa no disponible')))
    .catch(err => { _worldSvgPromise = null; throw err; });
  return _worldSvgPromise;
}

// ---------------------------------------------------------------------------
// Renderizado principal
// ---------------------------------------------------------------------------
export function createMacroMaps(mountEl, opts = {}) {
  ensureStyles();
  if (!mountEl) throw new Error('createMacroMaps: mountEl requerido');

  let state = { tab: opts.initialTab || 'rates', destroyed: false };

  const root = document.createElement('div');
  root.className = 'tvmm-root';
  root.innerHTML = `
    <div class="tvmm-titlebar">
      <h1 class="tvmm-title">Mapas macro</h1>
      <div>
        <button class="tvmm-iconbtn" title="Captura de pantalla">${I.camera}</button>
        <button class="tvmm-iconbtn" title="Ajustes">${I.cog}</button>
      </div>
    </div>
    <div class="tvmm-tabs-row">
      <button class="tvmm-iconbtn tvmm-search-btn" title="Buscar">${I.search}</button>
      <div class="tvmm-tabs" role="tablist"></div>
    </div>
    <div class="tvmm-body">
      <div class="tvmm-map-col">
        <div class="tvmm-map-wrap">
          <div class="tvmm-map-host"><div class="tvmm-map-loading">Cargando mapa…</div></div>
          <div class="tvmm-zoomctl">
            <button class="tvmm-iconbtn small" title="Aumentar">${I.plus}</button>
            <button class="tvmm-iconbtn small" title="Alejar">${I.minus}</button>
            <button class="tvmm-iconbtn small" title="Resetear">${I.reset}</button>
          </div>
          <button class="tvmm-iconbtn small tvmm-fullscreen" title="Pantalla completa">${I.expand}</button>
          <div class="tvmm-tooltip" style="display:none;"></div>
        </div>
        <div class="tvmm-legend">
          <div class="tvmm-legend-track">
            <div class="tvmm-legend-marks"></div>
          </div>
        </div>
        <div class="tvmm-timeline">
          <div class="tvmm-timeline-marks"></div>
          <div class="tvmm-timeline-track">
            <div class="tvmm-timeline-fill" style="width:97%;"></div>
            <div class="tvmm-timeline-thumb" style="left:97%;"></div>
          </div>
        </div>
      </div>
      <div class="tvmm-sidebar">
        <div class="tvmm-sb-head">G20 ${I.chevron}</div>
        <div class="tvmm-sb-colhead"><span>País</span><span>Valor / Observación</span></div>
        <div class="tvmm-sb-list"></div>
      </div>
    </div>
  `;
  mountEl.innerHTML = '';
  mountEl.appendChild(root);

  // Tabs
  const tabsEl = root.querySelector('.tvmm-tabs');
  TABS.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tvmm-tab' + (t.id === state.tab ? ' active' : '');
    b.dataset.tab = t.id;
    b.textContent = t.label;
    b.addEventListener('click', () => setTab(t.id));
    tabsEl.appendChild(b);
  });

  const mapHost = root.querySelector('.tvmm-map-host');
  const tooltip = root.querySelector('.tvmm-tooltip');
  const mapWrap = root.querySelector('.tvmm-map-wrap');

  let svgEl = null;

  // Zoom/pan simple via viewBox transform de un wrapper <g>
  let zoomLevel = 1;
  function applyZoom() {
    if (!svgEl) return;
    const g = svgEl.querySelector('#countries');
    if (!g) return;
    g.setAttribute('transform', `translate(${(1-zoomLevel) * 500}, ${(1-zoomLevel) * 250}) scale(${zoomLevel})`);
    g.setAttribute('transform-origin', '500 250');
  }
  root.querySelector('.tvmm-zoomctl .tvmm-iconbtn[title="Aumentar"]').addEventListener('click', () => {
    zoomLevel = Math.min(4, zoomLevel * 1.3); applyZoom();
  });
  root.querySelector('.tvmm-zoomctl .tvmm-iconbtn[title="Alejar"]').addEventListener('click', () => {
    zoomLevel = Math.max(1, zoomLevel / 1.3); applyZoom();
  });
  root.querySelector('.tvmm-zoomctl .tvmm-iconbtn[title="Resetear"]').addEventListener('click', () => {
    zoomLevel = 1; applyZoom();
  });

  function attachTooltip() {
    if (!svgEl) return;
    svgEl.addEventListener('mousemove', (e) => {
      const tgt = e.target.closest('path[data-iso]');
      if (!tgt) { tooltip.style.display = 'none'; return; }
      const iso = tgt.dataset.iso;
      const dataset = DATA[state.tab] || [];
      const row = dataset.find(r => r[0] === iso);
      const c = COUNTRIES[iso];

      let title, valTxt, dateTxt;
      if (c && row) {
        title = c.name;
        valTxt = fmtValue(row[1], state.tab);
        dateTxt = row[2];
      } else if (TOOLTIP_EXTRAS[`${state.tab}:${iso}`]) {
        const ex = TOOLTIP_EXTRAS[`${state.tab}:${iso}`];
        title = ex.name; valTxt = ex.value; dateTxt = ex.date;
      } else {
        title = tgt.dataset.name || iso;
        valTxt = '—'; dateTxt = '';
      }

      const flagSrc = (COUNTRIES[iso] || TOOLTIP_EXTRAS[`${state.tab}:${iso}`]) ? FLAG_URL(iso) : null;
      tooltip.innerHTML = `
        <div class="tvmm-tooltip-title">${flagSrc ? `<img src="${flagSrc}" alt="">` : ''}${title}</div>
        <div class="tvmm-tooltip-val"><b>${valTxt}</b>${dateTxt ? ' · ' + dateTxt : ''}</div>
      `;
      const rect = mapWrap.getBoundingClientRect();
      tooltip.style.display = 'block';
      let x = e.clientX - rect.left + 12;
      let y = e.clientY - rect.top + 12;
      if (x + 220 > rect.width) x = e.clientX - rect.left - 232;
      if (y + 70 > rect.height) y = e.clientY - rect.top - 70;
      tooltip.style.left = x + 'px';
      tooltip.style.top  = y + 'px';
    });
    svgEl.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  }

  function paintMap() {
    if (!svgEl) return;
    const palette = PALETTES[state.tab];
    const dataset = DATA[state.tab] || [];
    const byIso = Object.fromEntries(dataset.map(r => [r[0], r[1]]));
    svgEl.querySelectorAll('path[data-iso]').forEach(el => {
      const iso = el.dataset.iso;
      const v = byIso[iso];
      if (v == null) {
        el.setAttribute('fill', '#1a1d24');
        el.classList.remove('has-data');
      } else {
        el.setAttribute('fill', rampColor(palette, normalize(v, state.tab)));
        el.classList.add('has-data');
      }
    });
  }

  function paintLegend() {
    const palette = PALETTES[state.tab];
    const marks = LEGENDS[state.tab];
    const track = root.querySelector('.tvmm-legend-track');
    track.style.background = `linear-gradient(90deg, ${palette.join(',')})`;
    const marksEl = track.querySelector('.tvmm-legend-marks');
    marksEl.innerHTML = marks.map((m, i) => {
      const pct = (i / (marks.length - 1)) * 100;
      return `<span class="tvmm-legend-mark" style="left:${pct}%;">${m}</span>`;
    }).join('');
  }

  function paintTimeline() {
    const marks = TIMELINES[state.tab];
    const el = root.querySelector('.tvmm-timeline-marks');
    el.innerHTML = marks.map(m => `<span>${m}</span>`).join('');
  }

  function paintSidebar() {
    const list = root.querySelector('.tvmm-sb-list');
    const dataset = DATA[state.tab] || [];
    list.innerHTML = dataset.map(([iso, value, date]) => {
      const c = COUNTRIES[iso] || { name: iso };
      const ticker = makeTicker(iso, state.tab);
      return `
        <div class="tvmm-row" data-iso="${iso}">
          <div class="tvmm-flag"><img src="${FLAG_URL(iso)}" alt="${c.name}" loading="lazy"></div>
          <div class="tvmm-row-mid">
            <div class="tvmm-row-country">${c.name}</div>
            <span class="tvmm-ticker">${ticker}</span>
          </div>
          <div class="tvmm-row-right">
            <div class="tvmm-row-val">${fmtValue(value, state.tab)}</div>
            <div class="tvmm-row-date">${date}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function setTab(id) {
    if (!DATA[id]) return;
    state.tab = id;
    root.querySelectorAll('.tvmm-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id);
    });
    paintMap();
    paintLegend();
    paintTimeline();
    paintSidebar();
  }

  function render() {
    paintLegend();
    paintTimeline();
    paintSidebar();
    // Mapa se pinta tras cargar el SVG real (asíncrono)
    loadWorldSVG().then(svgText => {
      if (state.destroyed) return;
      mapHost.innerHTML = svgText;
      svgEl = mapHost.querySelector('svg');
      if (svgEl) {
        // Garantiza buen escalado responsive
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      attachTooltip();
      paintMap();
      applyZoom();
    }).catch(err => {
      mapHost.innerHTML = `<div class="tvmm-map-loading">Error cargando mapa: ${err.message}</div>`;
    });
  }

  function destroy() {
    state.destroyed = true;
    if (mountEl && mountEl.contains(root)) mountEl.removeChild(root);
    const s = document.getElementById(STYLE_ID);
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  render();

  return { render, destroy, setTab };
}

export default createMacroMaps;
