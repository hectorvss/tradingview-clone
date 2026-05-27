// =============================================================================
// Screener de acciones — TradingView ES clone
// Frame: Figma 2QhXqtb66hdeKvlZAZE4fS · node 9-116969 (1440w default)
// Implementación vanilla JS. Estructura DOM espejo del Figma:
//   div.tv-main
//     ├── div.tv-header                 (#9:97174)
//     ├── div#js-screener-container     (#9:97257)
//     │     ├── div.container-IVAhhNbf  (breadcrumb)
//     │     └── div.screenerContainer
//     │           ├── div.wrapper-D6yAuSLZ      (filtros + control panel + tabs)
//     │           │     ├── div.topbar          (título + acciones)
//     │           │     ├── div.header
//     │           │     │     └── div.filters (pillsContainer  →  3 filas, 24 pills)
//     │           │     └── div.controlPanel   (toggle + tabs)
//     │           ├── div.table-wrapper        (tabla scrollable)
//     │           └── div.ads-bottom-left      (banner publicitario)
//     └── div.widgetbar (sidebar iconos derecha, fuera del flujo, columna fija)
// Exporta: createScreener(mount, opts)  →  { render(), destroy() }
// =============================================================================

const NS = 'tvscr';      // prefijo CSS / DOM scoping
const STYLE_ID = `${NS}-styles`;

// ---------------------------------------------------------------------------
// Datos extraídos del Figma — fila por fila tal cual aparece en la maqueta
// (visible en el screenshot 9-116969). Los 10 primeros símbolos son los del
// Ibex que el usuario mencionó: ITX, SAN, IBE, BBVA, CABK, FER, ELE, AENA,
// ACS, AMS. Valores numéricos plausibles de mercado español; usados como
// dataset de demostración.
// ---------------------------------------------------------------------------
// Each row references a real logo PNG fetched from Google's favicon service
// (committed to public/assets/screener/logos/<SYM>.png). AENA has no available
// favicon so it falls back to a colored monogram badge — set `logo.fallback`
// (bg + tx) and leave `logo.src` null.
const LOGO_BASE = '/assets/screener/logos';
const ROWS = [
  { sym:'ITX',  name:'Industria de Diseño Textil, S.A.',  logo:{src:`${LOGO_BASE}/ITX.png`,  fallback:{bg:'#000',    tx:'I'}}, price:51.80, ccy:'EUR', chg:+2.01, vol:'321,15K',  vrel:0.42, mcap:'161,42 B', pb: 9.81, eps:2.34, epsg:+11.20, dy:3.18, sect:'Comercio minorista', rating:'Comprar' },
  { sym:'SAN',  name:'Banco Santander, S.A.',             logo:{src:`${LOGO_BASE}/SAN.png`,  fallback:{bg:'#ec0000', tx:'S'}}, price:8.082, ccy:'EUR', chg:+0.85, vol:'12,84M',   vrel:0.91, mcap:'124,86 B', pb: 0.94, eps:0.85, epsg:+8.40,  dy:3.65, sect:'Finanzas',            rating:'Comprar' },
  { sym:'IBE',  name:'Iberdrola, S.A.',                   logo:{src:`${LOGO_BASE}/IBE.png`,  fallback:{bg:'#5c8a3f', tx:'I'}}, price:16.245,ccy:'EUR', chg:-0.34, vol:'5,12M',    vrel:0.88, mcap:'104,73 B', pb: 1.78, eps:0.92, epsg:+5.10,  dy:4.62, sect:'Servicios públicos',  rating:'Comprar' },
  { sym:'BBVA', name:'Banco Bilbao Vizcaya Argentaria',   logo:{src:`${LOGO_BASE}/BBVA.png`, fallback:{bg:'#072146', tx:'B'}}, price:13.92, ccy:'EUR', chg:+1.27, vol:'9,42M',    vrel:1.04, mcap:'80,21 B',  pb: 1.21, eps:1.84, epsg:+24.60, dy:5.05, sect:'Finanzas',            rating:'Comprar fuerte' },
  { sym:'CABK', name:'CaixaBank, S.A.',                   logo:{src:`${LOGO_BASE}/CABK.png`, fallback:{bg:'#007eae', tx:'C'}}, price:7.420, ccy:'EUR', chg:+0.41, vol:'7,01M',    vrel:0.76, mcap:'55,84 B',  pb: 1.08, eps:0.71, epsg:+17.20, dy:6.10, sect:'Finanzas',            rating:'Comprar' },
  { sym:'FER',  name:'Ferrovial SE',                      logo:{src:`${LOGO_BASE}/FER.png`,  fallback:{bg:'#0067a5', tx:'F'}}, price:42.18, ccy:'EUR', chg:+0.18, vol:'612,40K',  vrel:0.55, mcap:'30,82 B',  pb: 6.71, eps:1.21, epsg:+9.30,  dy:1.85, sect:'Industrial',          rating:'Mantener' },
  { sym:'ELE',  name:'Endesa, S.A.',                      logo:{src:`${LOGO_BASE}/ELE.png`,  fallback:{bg:'#0080c8', tx:'E'}}, price:22.74, ccy:'EUR', chg:-0.61, vol:'1,02M',    vrel:0.71, mcap:'24,11 B',  pb: 2.04, eps:1.92, epsg:-3.40,  dy:6.85, sect:'Servicios públicos',  rating:'Mantener' },
  { sym:'AENA', name:'Aena S.M.E., S.A.',                 logo:{src:null,                    fallback:{bg:'#0a3372', tx:'A'}}, price:225.30,ccy:'EUR', chg:+1.05, vol:'168,42K',  vrel:0.62, mcap:'33,79 B',  pb: 4.92, eps:14.21,epsg:+13.80, dy:4.20, sect:'Transporte',          rating:'Comprar' },
  { sym:'ACS',  name:'ACS Actividades de Construcción',   logo:{src:`${LOGO_BASE}/ACS.png`,  fallback:{bg:'#e30613', tx:'A'}}, price:48.20, ccy:'EUR', chg:+0.74, vol:'480,21K',  vrel:0.68, mcap:'12,84 B',  pb: 3.21, eps:3.41, epsg:+6.10,  dy:4.05, sect:'Construcción',        rating:'Comprar' },
  { sym:'AMS',  name:'Amadeus IT Group, S.A.',            logo:{src:`${LOGO_BASE}/AMS.png`,  fallback:{bg:'#005eb8', tx:'A'}}, price:67.92, ccy:'EUR', chg:-0.22, vol:'612,18K',  vrel:0.49, mcap:'30,15 B',  pb: 5.91, eps:2.91, epsg:+12.10, dy:1.95, sect:'Tecnología',          rating:'Comprar' },
  { sym:'REP',  name:'Repsol, S.A.',                      logo:{src:`${LOGO_BASE}/REP.png`,  fallback:{bg:'#ff7300', tx:'R'}}, price:13.84, ccy:'EUR', chg:-1.12, vol:'4,72M',    vrel:0.94, mcap:'16,21 B',  pb: 0.71, eps:2.84, epsg:-15.20, dy:7.20, sect:'Energía',             rating:'Mantener' },
  { sym:'MAP',  name:'Mapfre, S.A.',                      logo:{src:`${LOGO_BASE}/MAP.png`,  fallback:{bg:'#c41230', tx:'M'}}, price:2.412, ccy:'EUR', chg:+0.42, vol:'2,18M',    vrel:0.71, mcap:'7,41 B',   pb: 0.84, eps:0.29, epsg:+5.20,  dy:6.10, sect:'Seguros',             rating:'Comprar' },
  { sym:'COL',  name:'Inmobiliaria Colonial SOCIMI',      logo:{src:`${LOGO_BASE}/COL.png`,  fallback:{bg:'#7e5a3c', tx:'C'}}, price:6.412, ccy:'EUR', chg:+0.95, vol:'420,18K',  vrel:0.45, mcap:'3,42 B',   pb: 0.61, eps:0.18, epsg:+2.40,  dy:3.85, sect:'Inmobiliario',        rating:'Mantener' },
  { sym:'IAG',  name:'International Consolidated Airlines',logo:{src:`${LOGO_BASE}/IAG.png`, fallback:{bg:'#003366', tx:'I'}}, price:3.612, ccy:'EUR', chg:+1.85, vol:'14,21M',   vrel:1.21, mcap:'17,84 B',  pb: 1.94, eps:0.61, epsg:+38.40, dy:0,    sect:'Aerolíneas',          rating:'Comprar fuerte' },
  { sym:'TEF',  name:'Telefónica, S.A.',                  logo:{src:`${LOGO_BASE}/TEF.png`,  fallback:{bg:'#0088ca', tx:'T'}}, price:4.281, ccy:'EUR', chg:-0.18, vol:'18,45M',   vrel:1.05, mcap:'24,18 B',  pb: 1.41, eps:0.34, epsg:-8.20,  dy:6.95, sect:'Comunicaciones',      rating:'Mantener' },
  { sym:'GRF',  name:'Grifols, S.A.',                     logo:{src:`${LOGO_BASE}/GRF.png`,  fallback:{bg:'#005a9c', tx:'G'}}, price:9.412, ccy:'EUR', chg:-2.34, vol:'1,84M',    vrel:1.42, mcap:'4,72 B',   pb: 0.94, eps:0.18, epsg:-42.10, dy:0,    sect:'Salud',               rating:'Mantener' },
  { sym:'NTGY', name:'Naturgy Energy Group, S.A.',        logo:{src:`${LOGO_BASE}/NTGY.png`, fallback:{bg:'#fece56', tx:'N'}}, price:24.12, ccy:'EUR', chg:+0.62, vol:'612,40K',  vrel:0.58, mcap:'23,42 B',  pb: 2.18, eps:1.45, epsg:+1.20,  dy:5.95, sect:'Servicios públicos',  rating:'Mantener' },
  { sym:'MTS',  name:'ArcelorMittal S.A.',                logo:{src:`${LOGO_BASE}/MTS.png`,  fallback:{bg:'#f7911f', tx:'M'}}, price:28.45, ccy:'EUR', chg:+1.62, vol:'1,42M',    vrel:0.92, mcap:'22,84 B',  pb: 0.58, eps:1.18, epsg:+22.40, dy:1.95, sect:'Materiales',          rating:'Comprar' },
  { sym:'RED',  name:'Red Eléctrica Corporación',         logo:{src:`${LOGO_BASE}/RED.png`,  fallback:{bg:'#0066b3', tx:'R'}}, price:17.12, ccy:'EUR', chg:-0.41, vol:'480,21K',  vrel:0.62, mcap:'9,32 B',   pb: 2.04, eps:1.05, epsg:-4.20,  dy:5.85, sect:'Servicios públicos',  rating:'Mantener' },
  { sym:'ANA',  name:'Acciona, S.A.',                     logo:{src:`${LOGO_BASE}/ANA.png`,  fallback:{bg:'#e30613', tx:'A'}}, price:118.20,ccy:'EUR', chg:-1.21, vol:'82,40K',   vrel:0.55, mcap:'6,45 B',   pb: 1.78, eps:3.84, epsg:-18.40, dy:3.85, sect:'Industrial',          rating:'Mantener' },
  { sym:'ENG',  name:'Enagás, S.A.',                      logo:{src:`${LOGO_BASE}/ENG.png`,  fallback:{bg:'#5d9732', tx:'E'}}, price:14.21, ccy:'EUR', chg:+0.21, vol:'320,18K',  vrel:0.48, mcap:'3,72 B',   pb: 1.42, eps:1.62, epsg:-12.40, dy:7.45, sect:'Energía',             rating:'Mantener' },
  { sym:'LOG',  name:'Logista Holdings, S.A.',            logo:{src:`${LOGO_BASE}/LOG.png`,  fallback:{bg:'#1b69bc', tx:'L'}}, price:28.62, ccy:'EUR', chg:+0.32, vol:'180,42K',  vrel:0.42, mcap:'3,82 B',   pb: 3.42, eps:1.82, epsg:+7.20,  dy:6.85, sect:'Distribución',        rating:'Comprar' },
];
// Figma muestra "438 resultados" en el counter, pero solo renderiza 22 filas
// reales. Mantenemos el dataset visible en 22 (los IBEX reales) y mostramos
// "Mostrando 22 de 438" — mucho más limpio que duplicar tickers con .A/.B/.C.
const TOTAL_REPORTED = 438;
function buildFullDataset() {
  return ROWS.map(r => ({ ...r }));
}

// ---------------------------------------------------------------------------
// Filtros — 22 pills repartidas en 3 filas (Figma frame div.pillsContainer).
// Layout exacto medido del Figma:
//   Fila 1 (y=0)  — 10 pills + watchlistDivider
//   Fila 2 (y=42) — 8 pills + controls (2 iconos al final)
//   Fila 3 (y=84) — 1 pill grande + 2 controles
// Labels son los canónicos del screener TradingView ES.
// ---------------------------------------------------------------------------
const FILTER_ROWS = [
  [
    { label:'España',                          kind:'country', flag:'spain', w:100 },
    { label:'Lista de seguimiento',            kind:'pill',    icon:'list',  star:true,   w:191 },
    { label:'Índice',                          kind:'pill',    arrow:true, w:86 },
    { label:'Precio',                          kind:'pill',    arrow:true, w:87 },
    { label:'Cbo %',                           kind:'pill',    arrow:true, w:84 },
    { label:'Cap. de mercado',                 kind:'pill',    arrow:true, w:165 },
    { label:'P/B',                             kind:'pill',    arrow:true, w:69 },
    { label:'Rendimiento del dividendo % TTM', kind:'pill',    arrow:true, w:188 },
    { label:'Crecimiento de los ingresos % YoY',kind:'pill',   arrow:true, w:249 },
  ],
  [
    { label:'P/B',                             kind:'pill',    arrow:true, w:88 },
    { label:'Calificación de los analistas',   kind:'pill',    arrow:true, w:241 },
    { label:'BPA dil.',                        kind:'pill',    arrow:true, w:98 },
    { label:'Crecimiento BPA dil. TTM YoY',    kind:'pill',    arrow:true, w:240 },
    { label:'EV / EBITDA',                     kind:'pill',    arrow:true, w:71 },
    { label:'ROE %',                           kind:'pill',    arrow:true, w:71 },
    { label:'Sector',                          kind:'pill',    arrow:true, w:75 },
    { label:'Fecha de los próximos beneficios',kind:'pill',    arrow:true, w:267 },
  ],
  [
    { label:'Próxima fecha ex-dividendo',      kind:'pill',    arrow:true, w:245 },
  ],
];

// ---------------------------------------------------------------------------
// Tabs (botones #overview, #performance, #extended, #valuation, #dividends,
// #profitability, #income, #balance, #more) — orden y labels del Figma.
// ---------------------------------------------------------------------------
const TABS = [
  { id:'overview',       label:'Resumen' },
  { id:'performance',    label:'Rendimiento' },
  { id:'extended',       label:'Horario ampliado' },
  { id:'valuation',      label:'Valoración' },
  { id:'dividends',      label:'Dividendos' },
  { id:'profitability',  label:'Rentabilidad' },
  { id:'income',         label:'Cuenta de resultados' },
  { id:'balance',        label:'Balance de situación' },
  { id:'more',           label:'Más' },
];

// Columnas del tab "Resumen" — extraídas de los text nodes del Figma
// (text id=9:97772 Símbolo, 9:97661 Precio, 9:97671 Cbo %, 9:97679 Vol.,
//  9:97687 Vol. rel., 9:97700 Cap. de mercado, 9:97708 P/B, 9:97716 BPA dil. TTM,
//  9:97726 Crecimiento BPA dil. TTM YoY, 9:97736 Rendimiento del dividendo % TTM,
//  9:97747 Sector, 9:97755 Calificación de los analistas)
const COLUMNS = [
  { key:'sym',   label:'Símbolo',                                   sticky:true,  align:'left',  w:280 },
  { key:'price', label:'Precio',                                    sticky:false, align:'right', w:100 },
  { key:'chg',   label:'Cbo %',                                     sticky:false, align:'right', w:90 },
  { key:'vol',   label:'Vol.',                                      sticky:false, align:'right', w:100 },
  { key:'vrel',  label:'Vol. rel.',                                 sticky:false, align:'right', w:90 },
  { key:'mcap',  label:'Cap. de mercado',                           sticky:false, align:'right', w:130 },
  { key:'pb',    label:'P/B',                                       sticky:false, align:'right', w:80 },
  { key:'eps',   label:'BPA dil. TTM',                              sticky:false, align:'right', w:110 },
  { key:'epsg',  label:'Crecimiento BPA dil. TTM YoY',              sticky:false, align:'right', w:180 },
  { key:'dy',    label:'Rendimiento del dividendo % TTM',           sticky:false, align:'right', w:170 },
  { key:'sect',  label:'Sector',                                    sticky:false, align:'left',  w:170 },
  { key:'rating',label:'Calificación de los analistas',             sticky:false, align:'left',  w:150 },
];

const RATING_COLOR = {
  'Comprar fuerte': '#089981',
  'Comprar':        '#22ab94',
  'Mantener':       '#e0a92a',
  'Vender':         '#f7525f',
  'Vender fuerte':  '#e0341e',
};

// ---------------------------------------------------------------------------
// CSS scoped al módulo. Se inyecta una sola vez y se elimina en destroy().
// ---------------------------------------------------------------------------
const STYLE_TEXT = `
.${NS}-root {
  --bg-0:#0f0f0f; --bg-1:#131722; --bg-2:#1e222d; --bg-3:#2a2e39; --bg-4:#363a45;
  --bd:#2a2e39; --bd-soft:#22262f;
  --tx:#d1d4dc; --tx-mute:#9598a1; --tx-dim:#787b86;
  --up:#089981; --down:#f23645;
  --accent:#2962ff; --accent-h:#1e88e5;
  background:var(--bg-0); color:var(--tx); font-family: 'Trebuchet MS', Inter, system-ui, -apple-system, sans-serif;
  display:flex; width:100%;
  /* Cap the screener at the visible viewport so only the table scrolls, not
   * the whole page. When the global site header (48px) is mounted, subtract
   * that. min-height removed so the layout doesn't push beyond the viewport. */
  height: 100vh;
  overflow: hidden;
}
body.has-global-header  .${NS}-root {
  height: calc(100vh - 48px);
  /* Force the screener to start BELOW the fixed global header AND give the
   * page a clean 12px breathing margin between the header bottom edge and
   * the breadcrumb + title row. Total reserved space at top = 48 + 12 = 60. */
  position: fixed;
  top: 48px; left: 0; right: 45px; bottom: 0;
  width: auto;
  padding-top: 12px;
}
body.has-global-header:not(.has-global-rightbar) .${NS}-root { right: 0; }
/* Force ensureStyles to re-inject by changing the rule. Bumping the version
 * comment forces the cached style element to be replaced.
 * screener-style-v3 */
/* Always hide the screener's own duplicated chrome — the global site header
 * and right sidebar are mounted by main.js for every page. Also remove the
 * energy-ad banner at the bottom so the symbols table reclaims that space. */
.${NS}-root .${NS}-hdr,
.${NS}-root .${NS}-side,
.${NS}-root .${NS}-banner { display: none !important; }
.${NS}-root *, .${NS}-root *::before, .${NS}-root *::after { box-sizing:border-box; }

/* ----- Layout main + right sidebar ----- */
.${NS}-main   { flex:1; min-width:0; display:flex; flex-direction:column; }
.${NS}-side   { width:45px; background:var(--bg-1); border-left:1px solid var(--bd); display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 0; }
.${NS}-side button { width:34px; height:34px; border:none; border-radius:6px; background:transparent; color:var(--tx-mute); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .12s, color .12s; }
.${NS}-side button:hover { background:var(--bg-2); color:var(--tx); }
.${NS}-side .${NS}-side-sep { width:24px; height:1px; background:var(--bd); margin:6px 0; }

/* ----- Header tv-header ----- */
.${NS}-hdr { height:64px; background:var(--bg-1); border-bottom:1px solid var(--bd); display:flex; align-items:center; padding:0 20px; flex-shrink:0; }
.${NS}-hdr-logo { display:flex; align-items:center; gap:6px; margin-right:31px; }
.${NS}-hdr-logo svg { width:36px; height:28px; }
.${NS}-hdr-logo .${NS}-hdr-logo-tx { font-family:'Trebuchet MS', sans-serif; font-weight:700; font-size:18px; letter-spacing:0.3px; color:#fff; }
.${NS}-hdr-search { width:200px; height:40px; background:var(--bg-2); border:1px solid var(--bd); border-radius:6px; display:flex; align-items:center; padding:0 12px; gap:8px; color:var(--tx-dim); font-size:14px; cursor:text; }
.${NS}-hdr-search input { background:transparent; border:none; color:var(--tx); outline:none; flex:1; font-size:14px; font-family:inherit; }
.${NS}-hdr-search .${NS}-kbd { font-size:11px; color:var(--tx-dim); border:1px solid var(--bd); padding:1px 5px; border-radius:3px; }
.${NS}-hdr-menu { display:flex; align-items:center; margin-left:24px; gap:0; }
.${NS}-hdr-menu a { color:var(--tx); padding:0 16px; height:64px; line-height:64px; font-size:14px; font-weight:400; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
.${NS}-hdr-menu a:hover { color:#fff; }
.${NS}-hdr-spacer { flex:1; }
.${NS}-hdr-icon { width:40px; height:40px; border:none; background:transparent; color:var(--tx); border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.${NS}-hdr-icon:hover { background:var(--bg-2); }
.${NS}-hdr-avatar { width:32px; height:32px; border-radius:50%; background:#5b9cf6; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; margin-right:8px; }
.${NS}-hdr-cta { height:34px; padding:0 14px; background:#96609f; border:none; color:#fff; border-radius:6px; cursor:pointer; font-weight:700; font-size:13px; font-family:inherit; }
.${NS}-hdr-cta:hover { background:#a26bab; }

/* ----- Breadcrumb ----- */
.${NS}-crumb { height:30px; padding:0 20px; display:flex; align-items:center; gap:6px; font-size:12px; color:var(--tx-mute); border-bottom:1px solid var(--bd-soft); }
.${NS}-crumb a { color:var(--tx-mute); text-decoration:none; cursor:pointer; }
.${NS}-crumb a:hover { color:var(--tx); }
.${NS}-crumb .${NS}-crumb-sep { color:var(--tx-dim); }

/* ----- Topbar (título + acciones) ----- */
.${NS}-topbar { display:flex; align-items:center; padding:8px 20px; min-height:54px; flex-shrink:0; }
.${NS}-title { font-size:24px; line-height:28px; font-weight:700; color:#fff; margin-right:8px; font-family: 'Trebuchet MS', sans-serif; }
.${NS}-title-caret { color:var(--tx-mute); font-size:18px; cursor:pointer; }
.${NS}-topbar-spacer { flex:1; }
.${NS}-topbar-actions { display:flex; gap:8px; align-items:center; }
.${NS}-icon-btn { width:34px; height:34px; background:transparent; border:1px solid var(--bd); color:var(--tx-mute); border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.${NS}-icon-btn:hover { background:var(--bg-2); color:var(--tx); }
.${NS}-icon-btn.${NS}-icon-btn-flush { border-color:transparent; }
.${NS}-icon-btn-group { display:flex; }
.${NS}-icon-btn-group .${NS}-icon-btn:first-child { border-top-right-radius:0; border-bottom-right-radius:0; border-right:none; }
.${NS}-icon-btn-group .${NS}-icon-btn:last-child  { border-top-left-radius:0;  border-bottom-left-radius:0; }

/* ----- Pills row (filters) ----- */
.${NS}-filters { padding:4px 20px 0 20px; display:flex; flex-direction:column; gap:8px; padding-bottom:12px; }
.${NS}-filter-row { display:flex; gap:8px; flex-wrap:wrap; }
.${NS}-pill { height:34px; padding:0 12px; background:var(--bg-2); border:1px solid var(--bd); border-radius:6px; display:inline-flex; align-items:center; gap:6px; color:var(--tx); font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; }
.${NS}-pill:hover { background:var(--bg-3); }
.${NS}-pill .${NS}-pill-flag { font-size:14px; }
.${NS}-pill .${NS}-pill-caret { color:var(--tx-mute); font-size:9px; margin-left:2px; }
.${NS}-pill .${NS}-pill-star { color:#e0a92a; font-size:13px; }
.${NS}-pill .${NS}-pill-list-icon { color:var(--tx-mute); font-size:12px; }
.${NS}-pill-divider { width:1px; height:20px; background:var(--bd); margin:0 4px; align-self:center; }
.${NS}-filter-row .${NS}-row-controls { margin-left:auto; display:flex; gap:8px; }

/* ----- Control panel (toggle list/cards + tabs row) ----- */
.${NS}-ctrlpanel { display:flex; align-items:center; gap:0; padding:0 20px; height:58px; border-top:1px solid var(--bd-soft); border-bottom:1px solid var(--bd); flex-shrink:0; }
.${NS}-seg { display:inline-flex; background:var(--bg-2); border:1px solid var(--bd); border-radius:6px; padding:3px; gap:3px; }
.${NS}-seg button { width:28px; height:28px; border:none; background:transparent; color:var(--tx-mute); border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.${NS}-seg button.${NS}-seg-on { background:var(--bg-3); color:var(--tx); }
.${NS}-vsep { width:1px; height:28px; background:var(--bd); margin:0 16px; }
.${NS}-tabs { display:flex; gap:0; flex:1; overflow-x:auto; scrollbar-width:none; }
.${NS}-tabs::-webkit-scrollbar { display:none; }
.${NS}-tab { padding:0 14px; height:34px; background:transparent; border:none; color:var(--tx-mute); font-size:13px; cursor:pointer; font-family:inherit; white-space:nowrap; border-radius:6px; display:inline-flex; align-items:center; }
.${NS}-tab:hover { color:var(--tx); background:var(--bg-2); }
.${NS}-tab.${NS}-tab-on { color:var(--tx); background:var(--bg-2); font-weight:700; }

/* ----- Table ----- */
.${NS}-twrap { flex:1; min-height:0; overflow:auto; background:var(--bg-0); }
/* Custom scrollbars so the visual scroll edge sits right next to the global
 * right sidebar — no fat browser-default scrollbar leaving an apparent gap. */
.${NS}-twrap::-webkit-scrollbar { width:8px; height:8px; }
.${NS}-twrap::-webkit-scrollbar-thumb { background:var(--bd); border-radius:4px; }
.${NS}-twrap::-webkit-scrollbar-thumb:hover { background:var(--bd-soft); }
.${NS}-table { width:100%; border-collapse:collapse; font-size:13px; min-width:1380px; }
/* Filler column eats the leftover horizontal space so the table fills 100% of
 * .tvscr-twrap when the viewport is wider than the sum of fixed column widths.
 * Without it there's a dark dead-zone between the last "Rating" column and
 * the global right sidebar. */
.${NS}-filler { width:auto; min-width:0; padding:0; border-bottom:1px solid var(--bd-soft); background:inherit; }
.${NS}-table thead .${NS}-filler { background:var(--bg-1); border-bottom:1px solid var(--bd); }
.${NS}-table thead th { position:sticky; top:0; z-index:2; background:var(--bg-1); color:var(--tx-mute); font-weight:400; font-size:12px; text-align:right; padding:8px 12px; border-bottom:1px solid var(--bd); white-space:nowrap; cursor:pointer; user-select:none; }
.${NS}-table thead th[data-align="left"]  { text-align:left; }
.${NS}-table thead th[data-sticky]        { left:0; z-index:3; background:var(--bg-1); }
.${NS}-table thead th:hover { color:var(--tx); }
.${NS}-table thead th .${NS}-th-arrow { color:var(--tx-dim); font-size:9px; margin-left:4px; }
.${NS}-table tbody td { padding:8px 12px; border-bottom:1px solid var(--bd-soft); white-space:nowrap; text-align:right; }
.${NS}-table tbody td[data-align="left"] { text-align:left; }
.${NS}-table tbody td[data-sticky] { position:sticky; left:0; background:var(--bg-0); z-index:1; }
.${NS}-table tbody tr:hover td { background:var(--bg-2); }
.${NS}-table tbody tr:hover td[data-sticky] { background:var(--bg-2); }

.${NS}-sym-cell { display:inline-flex; align-items:center; gap:10px; cursor:pointer; }
.${NS}-sym-cell:hover .${NS}-sym-code { color:var(--accent); }
.${NS}-logo,
.${NS}-logo-img { width:24px; height:24px; border-radius:50%; flex-shrink:0; object-fit:contain; background:#fff; display:inline-block; vertical-align:middle; }
.${NS}-logo-fallback { display:inline-flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:11px; font-family:Inter, sans-serif; background:#444; }
.${NS}-sym-code { font-weight:700; color:var(--tx); font-family:'Trebuchet MS', sans-serif; font-size:13px; }
.${NS}-sym-name { color:var(--tx-mute); font-size:12px; margin-left:8px; overflow:hidden; text-overflow:ellipsis; max-width:170px; display:inline-block; vertical-align:middle; }
.${NS}-up   { color:var(--up); }
.${NS}-down { color:var(--down); }
.${NS}-pos-bg { background:rgba(8,153,129,0.18); padding:2px 6px; border-radius:3px; color:var(--up); }
.${NS}-neg-bg { background:rgba(242,54,69,0.18); padding:2px 6px; border-radius:3px; color:var(--down); }

.${NS}-rating { display:inline-block; padding:3px 10px; border-radius:3px; font-size:12px; font-weight:400; color:#fff; }

/* ----- Banner (Figma: 450.4x123, anuncio Google AMP) ----- */
.${NS}-banner { position:relative; margin:12px 20px 20px 20px; width:450px; height:123px; background:var(--bg-1); border:1px solid var(--bd); border-radius:6px; overflow:hidden; }
.${NS}-banner-bg { position:absolute; right:0; top:0; width:300px; height:123px; background-image:url('/assets/screener/banner-bg.png'); background-repeat:repeat; background-size:43px 22px; background-position:top left; opacity:.55; pointer-events:none; }
.${NS}-banner-inner { position:relative; height:100%; }
.${NS}-banner-img { position:absolute; left:350px; top:0; width:100px; height:100px; border-top-right-radius:6px; object-fit:cover; background:#1e222d; }
.${NS}-banner-title { position:absolute; left:12px; top:11.5px; font-family:'Trebuchet MS', sans-serif; font-weight:700; font-size:15.4px; line-height:21px; color:#d1d4dc; text-decoration:none; cursor:pointer; }
.${NS}-banner-title:hover { text-decoration:underline; }
.${NS}-banner-body { position:absolute; left:12px; top:41.9px; width:328px; font-family:'Trebuchet MS', sans-serif; font-weight:400; font-size:14px; line-height:19px; color:#d1d4dc; cursor:pointer; }
.${NS}-banner-cta { position:absolute; left:12px; top:88.6px; background:#fff; color:#131722; font-family:'Trebuchet MS', sans-serif; font-weight:400; font-size:14px; line-height:24px; padding:5px 16px; border-radius:6px; border:none; cursor:pointer; }
.${NS}-banner-cta:hover { background:#e0e3eb; }
.${NS}-banner-tag { position:absolute; right:0; bottom:0; background:#434651; color:#9598a1; font-family:'Trebuchet MS', sans-serif; font-size:11px; line-height:16px; letter-spacing:0.22px; padding:0 6px; border-radius:3px 0 0 0; text-transform:uppercase; }

/* ----- Result count + footer ----- */
.${NS}-rescount { padding:8px 20px; color:var(--tx-mute); font-size:12px; }

/* ----- Light theme overrides ----- */
html.light-theme .${NS}-root {
  --bg-0:#ffffff; --bg-1:#f8f9fd; --bg-2:#eef0f3; --bg-3:#e0e3eb; --bg-4:#d1d4dc;
  --bd:#d1d4dc; --bd-soft:#e0e3eb;
  --tx:#131722; --tx-mute:#50535e; --tx-dim:#787b86;
}
html.light-theme .${NS}-hdr-logo .${NS}-hdr-logo-tx { color:#131722; }
`;

function ensureStyles() {
  // Re-inject every mount so layout fixes (and HMR edits) propagate without
  // a hard refresh.
  let s = document.getElementById(STYLE_ID);
  if (!s) {
    s = document.createElement('style');
    s.id = STYLE_ID;
    document.head.appendChild(s);
  }
  s.textContent = STYLE_TEXT;
}

// ---------------------------------------------------------------------------
// SVG helpers — iconos planos para sidebar / header / pills
// ---------------------------------------------------------------------------
const ICON = {
  search:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  caret: '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
  star:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 7.6L22 10l-6 4.6L18 22l-6-4-6 4 2-7.4L2 10l7.4-.4z"/></svg>',
  list:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  download:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></svg>',
  cog:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  layout:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  cards: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  watchlist:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  alerts:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  calendar:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  data:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6a9 3 0 0 0 18 0V5M3 11v6a9 3 0 0 0 18 0v-6"/></svg>',
  news:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2 2 2 0 0 1-2-2V11h3"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>',
  ideas: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.4 1 1 1 1.7V18h6v-1.6c0-.7.4-1.3 1-1.7A7 7 0 0 0 12 2z"/></svg>',
  chat:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>',
  spread:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>',
  pin:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5M9 11l-4 4 5 1 4-4 1-5-2-2-5 1-4 4 1 5z"/></svg>',
  hot:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a7 7 0 0 0 7-7c0-3-3-7-7-7-2 0-4 1-4 1s1-3 1-4-1-1-1-1S2 4 2 11a7 7 0 0 0 7 7 2.5 2.5 0 0 0-.5-3.5z"/></svg>',
  more:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
  arrowExpand:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  share: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  plug:  '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7V3M15 7V3M5 11h14v2a7 7 0 0 1-7 7 7 7 0 0 1-7-7zM12 20v3"/></svg>',
  // 3-stripe Spain flag (red-yellow-red) — exact pill flag used by TradingView
  flagES:'<svg width="18" height="12" viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px; overflow:hidden;"><rect width="18" height="3" fill="#c60b1e"/><rect y="3" width="18" height="6" fill="#ffc400"/><rect y="9" width="18" height="3" fill="#c60b1e"/></svg>',
};

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fmtChg(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2).replace('.', ',')}%`;
}
function fmtNum(n, dec=2) {
  if (n === 0) return '—';
  return n.toFixed(dec).replace('.', ',');
}
function fmtPct(n) {
  if (n === 0) return '—';
  return n.toFixed(2).replace('.', ',') + '%';
}

function renderHeader() {
  return `
    <div class="${NS}-hdr" role="banner">
      <div class="${NS}-hdr-logo" data-action="home">
        <svg viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="21.5" r="4.5" fill="#22ab94"/><path d="M0 0h14v6H8v22H6V6H0z" fill="#fff"/><path d="M16 0l8 18 4-9 8 19h-2.5l-5.5-13-3.5 8-7-17z" fill="#5b9cf6"/></svg>
        <span class="${NS}-hdr-logo-tx">TradingView</span>
      </div>
      <div class="${NS}-hdr-search" data-action="search">
        ${ICON.search}
        <input type="text" placeholder="Buscar (Ctrl+K)" aria-label="Buscar" />
        <span class="${NS}-kbd">Ctrl+K</span>
      </div>
      <nav class="${NS}-hdr-menu" aria-label="Main menu">
        <a data-nav="products">Productos ${ICON.caret}</a>
        <a data-nav="community">Comunidad ${ICON.caret}</a>
        <a data-nav="markets">Mercados ${ICON.caret}</a>
        <a data-nav="brokers">Brokers ${ICON.caret}</a>
        <a data-nav="more">Más ${ICON.caret}</a>
      </nav>
      <span class="${NS}-hdr-spacer"></span>
      <span class="${NS}-hdr-avatar" title="Perfil">H</span>
      <button class="${NS}-hdr-cta" type="button">Ampliar</button>
    </div>`;
}

function renderBreadcrumb() {
  return `
    <div class="${NS}-crumb" aria-label="Breadcrumb">
      <a data-nav="home">Inicio</a>
      <span class="${NS}-crumb-sep">›</span>
      <a data-nav="screener-list">Analizador de acciones</a>
      <span class="${NS}-crumb-sep">›</span>
      <span>Todas las acciones</span>
    </div>`;
}

function renderTopbar() {
  return `
    <div class="${NS}-topbar">
      <h1 class="${NS}-title">Todas las acciones</h1>
      <span class="${NS}-title-caret">${ICON.caret}</span>
      <span class="${NS}-topbar-spacer"></span>
      <div class="${NS}-topbar-actions">
        <div class="${NS}-icon-btn-group">
          <button class="${NS}-icon-btn" title="Refrescar" type="button">↻</button>
          <button class="${NS}-icon-btn" title="Compartir" type="button">${ICON.share}</button>
        </div>
        <button class="${NS}-icon-btn" title="Descargar" type="button">${ICON.download}</button>
      </div>
    </div>`;
}

function renderPill(p) {
  const flag = p.flag === 'spain' ? `<span class="${NS}-pill-flag">${ICON.flagES}</span>`
             : p.flag           ? `<span class="${NS}-pill-flag">${p.flag}</span>`
             : '';
  const star = p.star ? `<span class="${NS}-pill-star">${ICON.star}</span>` : '';
  const list = p.icon === 'list' ? `<span class="${NS}-pill-list-icon">${ICON.list}</span>` : '';
  const arrow = p.arrow ? `<span class="${NS}-pill-caret">${ICON.caret}</span>` : '';
  return `<button class="${NS}-pill" type="button" data-filter="${escapeHtml(p.label)}" style="${p.w?`min-width:${p.w}px`:''}">${flag}${list}${star}<span>${escapeHtml(p.label)}</span>${arrow}</button>`;
}

function renderFilters() {
  const rows = FILTER_ROWS.map((row, idx) => {
    const pills = row.map(renderPill).join('');
    if (idx === 0) {
      // Insert watchlist divider after the watchlist pill (index 1 in row 0)
      const before = row.slice(0,2).map(renderPill).join('');
      const after  = row.slice(2).map(renderPill).join('');
      return `<div class="${NS}-filter-row">${before}<span class="${NS}-pill-divider"></span>${after}</div>`;
    }
    if (idx === 1) {
      // Row 2 has the controls (cards/list toggle) at the end
      return `<div class="${NS}-filter-row">${pills}<div class="${NS}-row-controls"><button class="${NS}-icon-btn" title="Filtros" type="button">${ICON.layout}</button><button class="${NS}-icon-btn" title="Más opciones" type="button">${ICON.more}</button></div></div>`;
    }
    return `<div class="${NS}-filter-row">${pills}</div>`;
  }).join('');
  return `<div class="${NS}-filters">${rows}</div>`;
}

function renderControlPanel(activeTab) {
  const tabs = TABS.map(t => `<button class="${NS}-tab ${t.id===activeTab?`${NS}-tab-on`:''}" data-tab="${t.id}" type="button">${escapeHtml(t.label)}</button>`).join('');
  return `
    <div class="${NS}-ctrlpanel">
      <div class="${NS}-seg" role="group" aria-label="Vista">
        <button class="${NS}-seg-on" title="Tabla" type="button" data-view="table">${ICON.layout}</button>
        <button title="Tarjetas" type="button" data-view="cards">${ICON.cards}</button>
      </div>
      <span class="${NS}-vsep"></span>
      <div class="${NS}-tabs" role="tablist">${tabs}</div>
    </div>`;
}

function renderTable(rows, sortKey, sortDir) {
  const head = COLUMNS.map(c => {
    const arrow = c.key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '';
    return `<th data-key="${c.key}" data-align="${c.align}" ${c.sticky?'data-sticky':''} style="width:${c.w}px; min-width:${c.w}px;">${escapeHtml(c.label)} <span class="${NS}-th-arrow">${arrow}</span></th>`;
  }).join('') + `<th class="${NS}-filler"></th>`;

  const body = rows.map(r => {
    const cls = r.chg >= 0 ? `${NS}-up` : `${NS}-down`;
    const ratingColor = RATING_COLOR[r.rating] || '#787b86';
    const fb = r.logo.fallback || { bg:'#444', tx:r.sym[0] };
    // Inline <img> with onerror that swaps to the monogram badge if the PNG
    // 404s. AENA has src=null → render the badge directly.
    const logoHtml = r.logo.src
      ? `<img class="${NS}-logo-img" src="${r.logo.src}" alt="" width="24" height="24" loading="lazy" data-fb-bg="${fb.bg}" data-fb-tx="${escapeHtml(fb.tx)}" />`
      : `<span class="${NS}-logo ${NS}-logo-fallback" style="background:${fb.bg}">${escapeHtml(fb.tx)}</span>`;
    return `<tr data-sym="${escapeHtml(r.sym)}">
      <td data-align="left" data-sticky>
        <span class="${NS}-sym-cell" data-sym="${escapeHtml(r.sym)}">
          ${logoHtml}
          <span class="${NS}-sym-code">${escapeHtml(r.sym)}</span>
          <span class="${NS}-sym-name">${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td>${fmtNum(r.price, r.price<10?3:2)} <span style="color:var(--tx-dim); font-size:11px;">${escapeHtml(r.ccy)}</span></td>
      <td><span class="${r.chg>=0?NS+'-pos-bg':NS+'-neg-bg'}">${fmtChg(r.chg)}</span></td>
      <td>${escapeHtml(r.vol)}</td>
      <td>${fmtNum(r.vrel, 2)}</td>
      <td>${escapeHtml(r.mcap)}</td>
      <td>${fmtNum(r.pb, 2)}</td>
      <td>${fmtNum(r.eps, 2)}</td>
      <td class="${r.epsg>=0?NS+'-up':NS+'-down'}">${fmtChg(r.epsg)}</td>
      <td>${fmtPct(r.dy)}</td>
      <td data-align="left">${escapeHtml(r.sect)}</td>
      <td data-align="left"><span class="${NS}-rating" style="background:${ratingColor}">${escapeHtml(r.rating)}</span></td>
      <td class="${NS}-filler"></td>
    </tr>`;
  }).join('');

  return `
    <div class="${NS}-twrap">
      <table class="${NS}-table" role="table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function renderBanner() {
  // Texto exacto del Figma (nodo 9:116885 "Anuncio")
  return `
    <aside class="${NS}-banner" role="complementary" aria-label="Anuncio">
      <div class="${NS}-banner-bg"></div>
      <div class="${NS}-banner-inner">
        <img class="${NS}-banner-img" src="/assets/screener/banner-energy.jpg" alt="" loading="lazy" />
        <a class="${NS}-banner-title" href="#" target="_blank" rel="nofollow">Luz desde 0,05€/kWh</a>
        <div class="${NS}-banner-body">Usa nuestro comparador de tarifas de luz y gas. Haz una comparativa luz y gas y ahorra hoy</div>
        <button class="${NS}-banner-cta" type="button">Abrir</button>
        <span class="${NS}-banner-tag">Anuncio</span>
      </div>
    </aside>`;
}

function renderSidebar() {
  const items = [
    { icon:ICON.watchlist,    title:'Lista de seguimiento' },
    { icon:ICON.alerts,       title:'Alertas' },
    { icon:ICON.calendar,     title:'Calendario económico' },
    { icon:ICON.data,         title:'Ventana de datos' },
    null,
    { icon:ICON.news,         title:'Noticias' },
    { icon:ICON.ideas,        title:'Ideas' },
    { icon:ICON.chat,         title:'Chat' },
    null,
    { icon:ICON.spread,       title:'Spread' },
    { icon:ICON.pin,          title:'Pin' },
    { icon:ICON.hot,          title:'Tendencias' },
    null,
    { icon:ICON.more,         title:'Más' },
  ];
  const html = items.map(it => it === null
    ? `<span class="${NS}-side-sep"></span>`
    : `<button type="button" title="${escapeHtml(it.title)}">${it.icon}</button>`
  ).join('');
  return `<aside class="${NS}-side" role="complementary" aria-label="Herramientas">${html}</aside>`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createScreener(mountEl, opts = {}) {
  if (!mountEl) throw new Error('createScreener: mountEl is required');
  ensureStyles();

  const state = {
    rows: buildFullDataset(),
    sortKey: 'mcap',
    sortDir: 'desc',
    activeTab: 'overview',
    visibleCount: 100, // > 22 rows actuales; deja crecer si en el futuro se amplía
  };

  const root = document.createElement('div');
  root.className = `${NS}-root`;

  function html() {
    // Sort rows
    const sorted = sortRows(state.rows, state.sortKey, state.sortDir).slice(0, state.visibleCount);
    return `
      <div class="${NS}-main">
        ${renderHeader()}
        ${renderBreadcrumb()}
        ${renderTopbar()}
        ${renderFilters()}
        ${renderControlPanel(state.activeTab)}
        <div class="${NS}-rescount">Mostrando ${state.rows.length} de ${TOTAL_REPORTED} resultados</div>
        ${renderTable(sorted, state.sortKey, state.sortDir)}
        ${renderBanner()}
      </div>
      ${renderSidebar()}
    `;
  }

  function sortRows(arr, key, dir) {
    const mult = dir === 'asc' ? 1 : -1;
    const numeric = ['price','chg','vrel','pb','eps','epsg','dy'].includes(key);
    const mcapVal = (v) => {
      const n = parseFloat(String(v.mcap).replace(/[^\d,.-]/g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    return [...arr].sort((a, b) => {
      let av, bv;
      if (key === 'mcap') { av = mcapVal(a); bv = mcapVal(b); }
      else if (numeric)   { av = a[key]; bv = b[key]; }
      else                { av = String(a[key] ?? '').toLowerCase(); bv = String(b[key] ?? '').toLowerCase(); }
      if (av < bv) return -1 * mult;
      if (av > bv) return  1 * mult;
      return 0;
    });
  }

  // ---- listeners ----
  const listeners = [];
  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    listeners.push(() => el.removeEventListener(ev, fn));
  }

  function bind() {
    // Logo <img> → fallback monogram if PNG 404s
    root.querySelectorAll(`img.${NS}-logo-img`).forEach(img => {
      on(img, 'error', () => {
        const bg = img.dataset.fbBg || '#444';
        const tx = img.dataset.fbTx || '?';
        const span = document.createElement('span');
        span.className = `${NS}-logo ${NS}-logo-fallback`;
        span.style.background = bg;
        span.textContent = tx;
        if (img.parentNode) img.parentNode.replaceChild(span, img);
      });
    });
    // Sort by header
    root.querySelectorAll(`thead th[data-key]`).forEach(th => {
      on(th, 'click', () => {
        const key = th.dataset.key;
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'desc'; }
        render();
      });
    });
    // Tab switch
    root.querySelectorAll(`[data-tab]`).forEach(b => {
      on(b, 'click', () => { state.activeTab = b.dataset.tab; render(); });
    });
    // Row click → onSelectSymbol
    root.querySelectorAll(`tbody tr[data-sym]`).forEach(tr => {
      on(tr, 'click', () => {
        const sym = tr.dataset.sym;
        if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(sym);
        else if (window && window.location) window.location.hash = `#/symbol/${encodeURIComponent(sym)}`;
      });
    });
    // Infinite scroll fallback — load more rows when scrolling near bottom
    const wrap = root.querySelector(`.${NS}-twrap`);
    if (wrap) {
      on(wrap, 'scroll', () => {
        if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 200 && state.visibleCount < state.rows.length) {
          state.visibleCount = Math.min(state.visibleCount + 25, state.rows.length);
          render();
        }
      });
    }
  }

  function render() {
    // Detach existing listeners before rerender
    while (listeners.length) { try { listeners.pop()(); } catch (_) {} }
    root.innerHTML = html();
    bind();
  }

  function destroy() {
    while (listeners.length) { try { listeners.pop()(); } catch (_) {} }
    if (root.parentNode) root.parentNode.removeChild(root);
    // styles persist (cheap, shared across re-mount); could remove if needed
  }

  // Mount + initial render
  mountEl.innerHTML = '';
  mountEl.appendChild(root);

  // INLINE STYLES — guarantee the screener never gets clipped under the global
  // header regardless of cached CSS. Inline `style` always wins specificity.
  // 48px global header + 12px breathing margin = 60px from top.
  // 45px global right sidebar offset.
  root.style.position = 'fixed';
  root.style.top = '48px';
  root.style.left = '0';
  root.style.right = '45px';
  root.style.bottom = '0';
  root.style.width = 'auto';
  root.style.height = 'auto';
  root.style.paddingTop = '12px';
  root.style.zIndex = '1';

  render();

  return { render, destroy, root };
}

export default createScreener;
