// /screeners/bonds — Analizador de bonos. Plantilla idéntica al Analizador
// de acciones de TradingView, con 32 bonos reales (gubernamentales + corporativos).
// CSS compartido en ./screeners.css (prefijo .sc-). No editar ese archivo.
import './screeners.css';

// ---------------------------------------------------------------------------
// Banderas (circulares, estilo TradingView). Reutilizan el mismo patrón que
// markets-spain.js: SVG con clipPath circular. Sólo las que necesitamos aquí.
// ---------------------------------------------------------------------------
const FLAG_SVG = {
  US: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfUS"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfUS)"><rect width="16" height="16" fill="#b22234"/><g fill="#fff"><rect y="1.2" width="16" height="1.2"/><rect y="3.7" width="16" height="1.2"/><rect y="6.2" width="16" height="1.2"/><rect y="8.7" width="16" height="1.2"/><rect y="11.2" width="16" height="1.2"/><rect y="13.7" width="16" height="1.2"/></g><rect width="7" height="8" fill="#3c3b6e"/></g></svg>`,
  DE: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfDE"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfDE)"><rect width="16" height="5.33" fill="#000"/><rect y="5.33" width="16" height="5.33" fill="#dd0000"/><rect y="10.66" width="16" height="5.34" fill="#ffce00"/></g></svg>`,
  FR: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfFR"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfFR)"><rect width="5.33" height="16" fill="#002654"/><rect x="5.33" width="5.33" height="16" fill="#fff"/><rect x="10.66" width="5.34" height="16" fill="#ed2939"/></g></svg>`,
  ES: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfES"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfES)"><rect width="16" height="16" fill="#c60b1e"/><rect y="4" width="16" height="8" fill="#ffc400"/></g></svg>`,
  IT: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfIT"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfIT)"><rect width="5.33" height="16" fill="#009246"/><rect x="5.33" width="5.33" height="16" fill="#fff"/><rect x="10.66" width="5.34" height="16" fill="#ce2b37"/></g></svg>`,
  GB: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfGB"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfGB)"><rect width="16" height="16" fill="#012169"/><path d="M0 0L16 16M16 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0L16 16M16 0L0 16" stroke="#c8102e" stroke-width="1.6"/><path d="M8 0V16M0 8H16" stroke="#fff" stroke-width="4"/><path d="M8 0V16M0 8H16" stroke="#c8102e" stroke-width="2.4"/></g></svg>`,
  JP: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfJP"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfJP)"><rect width="16" height="16" fill="#fff"/><circle cx="8" cy="8" r="4" fill="#bc002d"/></g></svg>`,
  AU: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfAU"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfAU)"><rect width="16" height="16" fill="#012169"/><rect width="8" height="8" fill="#012169"/><path d="M0 0L8 8M8 0L0 8" stroke="#fff" stroke-width="1.4"/><path d="M0 0L8 8M8 0L0 8" stroke="#e4002b" stroke-width="0.7"/><path d="M4 0V8M0 4H8" stroke="#fff" stroke-width="2"/><path d="M4 0V8M0 4H8" stroke="#e4002b" stroke-width="1.1"/><circle cx="11.5" cy="11.5" r="0.9" fill="#fff"/></g></svg>`,
  CA: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfCA"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfCA)"><rect width="16" height="16" fill="#fff"/><rect width="4" height="16" fill="#d52b1e"/><rect x="12" width="4" height="16" fill="#d52b1e"/><path d="M8 4 L9 7 L11 6.5 L10 9 L11.5 10 L9 10.5 L9.2 12 L8 11 L6.8 12 L7 10.5 L4.5 10 L6 9 L5 6.5 L7 7 Z" fill="#d52b1e"/></g></svg>`,
  CN: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfCN"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfCN)"><rect width="16" height="16" fill="#de2910"/><g fill="#ffde00"><polygon points="3.4,1.6 4,3.4 5.7,3.4 4.3,4.4 4.8,6.1 3.4,5.1 2,6.1 2.5,4.4 1.1,3.4 2.8,3.4"/><circle cx="6.5" cy="1.5" r="0.5"/><circle cx="7.2" cy="3" r="0.5"/><circle cx="7.2" cy="5" r="0.5"/><circle cx="6.5" cy="6.4" r="0.5"/></g></g></svg>`,
  IN: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfIN"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfIN)"><rect width="16" height="5.33" fill="#ff9933"/><rect y="5.33" width="16" height="5.33" fill="#fff"/><rect y="10.66" width="16" height="5.34" fill="#138808"/><circle cx="8" cy="8" r="1.5" fill="none" stroke="#000080" stroke-width="0.3"/></g></svg>`,
  BR: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfBR"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfBR)"><rect width="16" height="16" fill="#009b3a"/><polygon points="8,2 14,8 8,14 2,8" fill="#ffdf00"/><circle cx="8" cy="8" r="2.4" fill="#002776"/></g></svg>`,
  MX: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfMX"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfMX)"><rect width="5.33" height="16" fill="#006847"/><rect x="5.33" width="5.33" height="16" fill="#fff"/><rect x="10.66" width="5.34" height="16" fill="#ce1126"/></g></svg>`,
  CH: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="bfCH"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#bfCH)"><rect width="16" height="16" fill="#d52b1e"/><rect x="6.8" y="3.6" width="2.4" height="8.8" fill="#fff"/><rect x="3.6" y="6.8" width="8.8" height="2.4" fill="#fff"/></g></svg>`,
};

function flagSvg(cc) {
  return `<span class="sc-pill-flag">${FLAG_SVG[cc] || ''}</span>`;
}

// ---------------------------------------------------------------------------
// Dataset — 32 bonos reales (18 gubernamentales + 14 corporativos)
//   Yields y precios plausibles a fecha 2026-05. Calificaciones según S&P/Moody's.
//   tipo: 'gov' | 'corp'  ·  rating tier 'ig' (investment grade) | 'hy' (high yield)
// ---------------------------------------------------------------------------
const ROWS = [
  // ---------- Gubernamentales ----------
  { sym:'US02Y',  issuer:'US 2 Year Treasury',     cc:'US', tipo:'gov', cupon:4.50, yld:4.32, price: 99.82, mat:'15 may 2028', dur: 1.94, plazo:'2A',  rating:'AA+',  ratingTier:'ig', ccy:'USD' },
  { sym:'US05Y',  issuer:'US 5 Year Treasury',     cc:'US', tipo:'gov', cupon:4.25, yld:4.18, price: 99.40, mat:'15 may 2031', dur: 4.51, plazo:'5A',  rating:'AA+',  ratingTier:'ig', ccy:'USD' },
  { sym:'US10Y',  issuer:'US 10 Year Treasury',    cc:'US', tipo:'gov', cupon:4.25, yld:4.45, price: 98.20, mat:'15 may 2036', dur: 8.12, plazo:'10A', rating:'AA+',  ratingTier:'ig', ccy:'USD' },
  { sym:'US30Y',  issuer:'US 30 Year Treasury',    cc:'US', tipo:'gov', cupon:4.50, yld:4.78, price: 95.62, mat:'15 may 2056', dur:16.45, plazo:'30A', rating:'AA+',  ratingTier:'ig', ccy:'USD' },
  { sym:'DE10Y',  issuer:'Bund 10Y Alemania',      cc:'DE', tipo:'gov', cupon:2.50, yld:2.62, price: 98.94, mat:'15 ago 2035', dur: 8.42, plazo:'10A', rating:'AAA',  ratingTier:'ig', ccy:'EUR' },
  { sym:'DE02Y',  issuer:'Schatz 2Y Alemania',     cc:'DE', tipo:'gov', cupon:2.10, yld:2.04, price:100.12, mat:'12 jun 2028', dur: 1.96, plazo:'2A',  rating:'AAA',  ratingTier:'ig', ccy:'EUR' },
  { sym:'FR10Y',  issuer:'OAT 10Y Francia',        cc:'FR', tipo:'gov', cupon:3.00, yld:3.18, price: 98.50, mat:'25 nov 2035', dur: 8.30, plazo:'10A', rating:'AA-',  ratingTier:'ig', ccy:'EUR' },
  { sym:'ES10Y',  issuer:'Bono 10Y España',        cc:'ES', tipo:'gov', cupon:3.25, yld:3.42, price: 98.62, mat:'30 abr 2036', dur: 8.18, plazo:'10A', rating:'A',    ratingTier:'ig', ccy:'EUR' },
  { sym:'ES30Y',  issuer:'Obligación 30Y España',  cc:'ES', tipo:'gov', cupon:3.90, yld:4.05, price: 97.10, mat:'31 oct 2056', dur:17.20, plazo:'30A', rating:'A',    ratingTier:'ig', ccy:'EUR' },
  { sym:'IT10Y',  issuer:'BTP 10Y Italia',         cc:'IT', tipo:'gov', cupon:3.85, yld:3.92, price: 99.34, mat:'01 sep 2035', dur: 8.05, plazo:'10A', rating:'BBB',  ratingTier:'ig', ccy:'EUR' },
  { sym:'IT05Y',  issuer:'BTP 5Y Italia',          cc:'IT', tipo:'gov', cupon:3.25, yld:3.18, price:100.30, mat:'15 abr 2031', dur: 4.65, plazo:'5A',  rating:'BBB',  ratingTier:'ig', ccy:'EUR' },
  { sym:'UK10Y',  issuer:'Gilt 10Y Reino Unido',   cc:'GB', tipo:'gov', cupon:4.00, yld:4.21, price: 98.21, mat:'07 jun 2035', dur: 8.10, plazo:'10A', rating:'AA',   ratingTier:'ig', ccy:'GBP' },
  { sym:'UK30Y',  issuer:'Gilt 30Y Reino Unido',   cc:'GB', tipo:'gov', cupon:4.25, yld:4.62, price: 94.80, mat:'07 dic 2055', dur:16.92, plazo:'30A', rating:'AA',   ratingTier:'ig', ccy:'GBP' },
  { sym:'JP10Y',  issuer:'JGB 10Y Japón',          cc:'JP', tipo:'gov', cupon:1.20, yld:1.34, price: 98.71, mat:'20 mar 2035', dur: 8.85, plazo:'10A', rating:'A+',   ratingTier:'ig', ccy:'JPY' },
  { sym:'AU10Y',  issuer:'ACGB 10Y Australia',     cc:'AU', tipo:'gov', cupon:4.25, yld:4.18, price:100.62, mat:'21 abr 2035', dur: 8.14, plazo:'10A', rating:'AAA',  ratingTier:'ig', ccy:'AUD' },
  { sym:'CA10Y',  issuer:'GoC 10Y Canadá',         cc:'CA', tipo:'gov', cupon:3.50, yld:3.62, price: 99.05, mat:'01 jun 2035', dur: 8.22, plazo:'10A', rating:'AAA',  ratingTier:'ig', ccy:'CAD' },
  { sym:'CN10Y',  issuer:'CGB 10Y China',          cc:'CN', tipo:'gov', cupon:2.40, yld:2.18, price:101.92, mat:'25 nov 2035', dur: 8.65, plazo:'10A', rating:'A+',   ratingTier:'ig', ccy:'CNY' },
  { sym:'IN10Y',  issuer:'GSec 10Y India',         cc:'IN', tipo:'gov', cupon:6.85, yld:6.92, price: 99.40, mat:'17 abr 2035', dur: 7.62, plazo:'10A', rating:'BBB-', ratingTier:'ig', ccy:'INR' },
  { sym:'BR10Y',  issuer:'NTN-F 10Y Brasil',       cc:'BR', tipo:'gov', cupon:10.00,yld:13.84, price: 78.45, mat:'01 ene 2035', dur: 5.92, plazo:'10A', rating:'BB',   ratingTier:'hy', ccy:'BRL' },
  { sym:'MX10Y',  issuer:'Mbono 10Y México',       cc:'MX', tipo:'gov', cupon:9.50, yld:9.68, price: 98.84, mat:'30 may 2035', dur: 6.84, plazo:'10A', rating:'BBB-', ratingTier:'ig', ccy:'MXN' },

  // ---------- Corporativos ----------
  { sym:'037833DT3', issuer:'Apple Inc. 3,85% 2036',           cc:'US', tipo:'corp', cupon:3.85, yld:4.62, price: 93.40, mat:'04 may 2036', dur: 8.95, plazo:'10A', rating:'AA+',  ratingTier:'ig', ccy:'USD' },
  { sym:'594918BS5', issuer:'Microsoft Corp 2,92% 2052',       cc:'US', tipo:'corp', cupon:2.92, yld:5.18, price: 71.20, mat:'17 mar 2052', dur:17.40, plazo:'30A', rating:'AAA',  ratingTier:'ig', ccy:'USD' },
  { sym:'00206RKN5', issuer:'AT&T Inc. 4,30% 2034',            cc:'US', tipo:'corp', cupon:4.30, yld:5.42, price: 91.85, mat:'15 feb 2034', dur: 7.32, plazo:'10A', rating:'BBB',  ratingTier:'ig', ccy:'USD' },
  { sym:'345370CR9', issuer:'Ford Motor Co 6,10% 2032',        cc:'US', tipo:'corp', cupon:6.10, yld:7.84, price: 89.20, mat:'19 ago 2032', dur: 5.85, plazo:'10A', rating:'BB+',  ratingTier:'hy', ccy:'USD' },
  { sym:'38141GZH8', issuer:'Goldman Sachs 4,48% 2033',        cc:'US', tipo:'corp', cupon:4.48, yld:5.21, price: 94.62, mat:'23 ago 2033', dur: 6.62, plazo:'10A', rating:'BBB+', ratingTier:'ig', ccy:'USD' },
  { sym:'46647PCV2', issuer:'JPMorgan Chase 5,04% 2034',       cc:'US', tipo:'corp', cupon:5.04, yld:5.32, price: 98.10, mat:'23 ene 2034', dur: 6.92, plazo:'10A', rating:'A-',   ratingTier:'ig', ccy:'USD' },
  { sym:'06051GJZ5', issuer:'Bank of America 4,57% 2035',      cc:'US', tipo:'corp', cupon:4.57, yld:5.18, price: 95.40, mat:'27 abr 2035', dur: 7.42, plazo:'10A', rating:'A-',   ratingTier:'ig', ccy:'USD' },
  { sym:'30231GBH4', issuer:'Exxon Mobil 3,45% 2051',          cc:'US', tipo:'corp', cupon:3.45, yld:5.34, price: 74.85, mat:'15 abr 2051', dur:16.20, plazo:'30A', rating:'AA-',  ratingTier:'ig', ccy:'USD' },
  { sym:'XS2434377110', issuer:'Volkswagen Fin 2,75% 2033',    cc:'DE', tipo:'corp', cupon:2.75, yld:4.18, price: 88.92, mat:'12 ene 2033', dur: 6.40, plazo:'10A', rating:'BBB+', ratingTier:'ig', ccy:'EUR' },
  { sym:'XS2531164708', issuer:'Telefónica 3,95% 2031',        cc:'ES', tipo:'corp', cupon:3.95, yld:4.42, price: 97.10, mat:'18 sep 2031', dur: 5.18, plazo:'5A',  rating:'BBB-', ratingTier:'ig', ccy:'EUR' },
  { sym:'XS2487643923', issuer:'BBVA Senior 4,50% 2030',       cc:'ES', tipo:'corp', cupon:4.50, yld:4.62, price: 99.45, mat:'24 mar 2030', dur: 3.92, plazo:'5A',  rating:'A-',   ratingTier:'ig', ccy:'EUR' },
  { sym:'XS2364001078', issuer:'Iberdrola Verde 1,45% 2033',   cc:'ES', tipo:'corp', cupon:1.45, yld:3.85, price: 82.40, mat:'06 sep 2033', dur: 6.85, plazo:'10A', rating:'BBB+', ratingTier:'ig', ccy:'EUR' },
  { sym:'XS2010039977', issuer:'Repsol Híbrido 4,25% PERP',    cc:'ES', tipo:'corp', cupon:4.25, yld:6.84, price: 92.10, mat:'Perpetuo',    dur: 4.20, plazo:'PERP',rating:'BB+',  ratingTier:'hy', ccy:'EUR' },
  { sym:'XS2723891044', issuer:'Tesla Inc. 5,30% 2032',        cc:'US', tipo:'corp', cupon:5.30, yld:6.45, price: 93.20, mat:'15 ago 2032', dur: 5.45, plazo:'10A', rating:'BB+',  ratingTier:'hy', ccy:'USD' },
];

const TOTAL_REPORTED = 12450;

// ---------------------------------------------------------------------------
// Filtros (pills) — replican el set de Acciones, adaptado a bonos.
// ---------------------------------------------------------------------------
const FILTERS = [
  { label:'Mercado: Global', flag:'globe',   chev:true },
  { label:'Tipo: Todos',                    chev:true },
  { label:'Plazo: Todos',                   chev:true },
  { label:'Calificación crediticia',        chev:true },
  { label:'Yield al vencimiento',           chev:true },
  { label:'Cupón',                          chev:true },
  { label:'Precio',                         chev:true },
  { label:'Duración',                       chev:true },
  { label:'Próxima fecha cupón',            chev:true },
  { label:'Divisa',                         chev:true },
];

const TABS = [
  { id:'overview',  label:'Resumen',           active:true },
  { id:'yields',    label:'Rendimientos' },
  { id:'price',     label:'Precio' },
  { id:'calendar',  label:'Calendario cupones' },
  { id:'liquidity', label:'Liquidez' },
  { id:'more',      label:'Más' },
];

const COLUMNS = [
  { key:'sym',    label:'Símbolo' },
  { key:'tipo',   label:'Tipo' },
  { key:'cupon',  label:'Cupón' },
  { key:'yld',    label:'Yield al vto.' },
  { key:'price',  label:'Precio' },
  { key:'mat',    label:'Fecha vto.' },
  { key:'dur',    label:'Duración' },
  { key:'plazo',  label:'Plazo' },
  { key:'rating', label:'Calificación' },
  { key:'ccy',    label:'Divisa' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (n, d=2) => n.toFixed(d).replace('.', ',');

// SVG icons
const I = {
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
  share:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  chev:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
  grid:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  dots:   '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
  table:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  cards:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  globe:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
};

// Iniciales del emisor corporativo (primeras letras significativas)
function corpInitials(issuer) {
  const w = issuer.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim().split(/\s+/);
  return (w[0]?.[0] || '?').toUpperCase() + (w[1]?.[0] || '').toUpperCase();
}
// Color de fondo derivado del nombre (estable por emisor)
function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const palette = ['#2962ff','#9c27b0','#e91e63','#f57c00','#00897b','#5d4037','#455a64','#7b1fa2','#c2185b','#388e3c','#1565c0','#ef6c00'];
  return palette[h % palette.length];
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderBreadcrumb() {
  return `
    <nav class="sc-breadcrumb" aria-label="Breadcrumb">
      <a href="#/">Inicio</a><span class="sc-bc-sep">›</span>
      <a href="#/screeners/bonds">Analizador de bonos</a><span class="sc-bc-sep">›</span>
      <span class="sc-bc-current">Todos los bonos</span>
    </nav>`;
}

function renderTitleBar() {
  return `
    <div class="sc-title-bar">
      <h1 class="sc-title">Todos los bonos <span class="sc-title-chev">▾</span></h1>
      <div class="sc-title-actions">
        <button class="sc-action-btn" type="button" title="Refrescar" aria-label="Refrescar">${I.refresh}</button>
        <button class="sc-action-btn" type="button" title="Compartir" aria-label="Compartir">${I.share}</button>
        <button class="sc-action-btn" type="button" title="Descargar" aria-label="Descargar">${I.download}</button>
      </div>
    </div>`;
}

function renderPills() {
  const pills = FILTERS.map(p => {
    const flag = p.flag === 'globe'
      ? `<span class="sc-pill-icon" style="color:#b8b8b8">${I.globe}</span>`
      : '';
    const chev = p.chev ? `<span class="sc-pill-chev">▾</span>` : '';
    return `<button class="sc-pill" type="button" data-filter="${esc(p.label)}">${flag}<span>${esc(p.label)}</span>${chev}</button>`;
  }).join('');
  return `
    <div class="sc-pills">
      ${pills}
      <button class="sc-pill sc-pill-square" type="button" title="Columnas" aria-label="Columnas">${I.grid}</button>
      <button class="sc-pill sc-pill-square" type="button" title="Más opciones" aria-label="Más opciones">${I.dots}</button>
    </div>`;
}

function renderTabs() {
  const tabs = TABS.map(t =>
    `<button class="sc-tab ${t.active?'is-active':''}" type="button" data-tab="${t.id}">${esc(t.label)}</button>`
  ).join('');
  return `
    <div class="sc-tabs-wrap">
      <div class="sc-view-toggle" role="group" aria-label="Vista">
        <button type="button" class="is-active" title="Tabla" aria-label="Tabla">${I.table}</button>
        <button type="button" title="Tarjetas" aria-label="Tarjetas">${I.cards}</button>
      </div>
      <div class="sc-tabs" role="tablist">${tabs}</div>
    </div>`;
}

function renderResultCount() {
  const fmt = new Intl.NumberFormat('es-ES').format(TOTAL_REPORTED);
  return `<div class="sc-result-count">Mostrando ${ROWS.length} de ${fmt} resultados</div>`;
}

function renderSymCell(r) {
  // Gubernamentales → bandera del país. Corporativos → iniciales sobre color.
  const logo = r.tipo === 'gov'
    ? `<span class="sc-sym-logo" style="background:transparent">${FLAG_SVG[r.cc] || ''}</span>`
    : `<span class="sc-sym-logo" style="background:${hashColor(r.issuer)}">${esc(corpInitials(r.issuer))}</span>`;
  return `
    <span class="sc-sym">
      ${logo}
      <span class="sc-sym-ticker">${esc(r.sym)}</span>
      <span class="sc-sym-name">${esc(r.issuer)}</span>
    </span>`;
}

function renderTable() {
  const head = COLUMNS.map((c, i) => {
    const sorted = i === 3 ? 'sc-th-sorted' : '';
    const arrow  = i === 3 ? '<span class="sc-sort-arrow">▼</span>' : '';
    return `<th class="${sorted}" data-key="${c.key}">${esc(c.label)} ${arrow}</th>`;
  }).join('');

  const body = ROWS.map(r => {
    const tipoLabel = r.tipo === 'gov' ? 'Gubernamental' : 'Corporativo';
    const ratingCls = r.ratingTier === 'ig' ? 'sc-pos' : 'sc-neg';
    return `
      <tr data-sym="${esc(r.sym)}">
        <td>${renderSymCell(r)}</td>
        <td style="text-align:left;color:#b8b8b8">${tipoLabel}</td>
        <td>${num(r.cupon, 2)}%</td>
        <td><span class="sc-pos-text">${num(r.yld, 2)}%</span></td>
        <td>
          <span class="sc-price-cell">
            <span>${num(r.price, 2)}</span>
            <span class="sc-price-cur">${esc(r.ccy)}</span>
          </span>
        </td>
        <td style="text-align:left">${esc(r.mat)}</td>
        <td>${num(r.dur, 2)}</td>
        <td>${esc(r.plazo)}</td>
        <td style="text-align:left"><span class="sc-chg ${ratingCls}">${esc(r.rating)}</span></td>
        <td>${esc(r.ccy)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="sc-table-wrap">
      <table class="sc-table" role="table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------
export function renderScreenerBonds(mount) {
  if (!mount) throw new Error('renderScreenerBonds: mount is required');

  mount.innerHTML = `
    <div class="sc-root">
      <div class="sc-container">
        ${renderBreadcrumb()}
        ${renderTitleBar()}
        ${renderPills()}
        ${renderTabs()}
        ${renderResultCount()}
        ${renderTable()}
      </div>
    </div>`;

  // Wiring básico — tabs (sólo cambian estado visual; no hay vistas separadas)
  const root = mount.querySelector('.sc-root');
  const onClick = (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      root.querySelectorAll('.sc-tab').forEach(t => t.classList.remove('is-active'));
      tabBtn.classList.add('is-active');
      return;
    }
    const viewBtn = e.target.closest('.sc-view-toggle button');
    if (viewBtn) {
      root.querySelectorAll('.sc-view-toggle button').forEach(b => b.classList.remove('is-active'));
      viewBtn.classList.add('is-active');
      return;
    }
    const row = e.target.closest('tbody tr[data-sym]');
    if (row && window?.location) {
      window.location.hash = `#/symbol/${encodeURIComponent(row.dataset.sym)}`;
    }
  };
  root.addEventListener('click', onClick);

  return {
    destroy() {
      root.removeEventListener('click', onClick);
      mount.innerHTML = '';
    }
  };
}

export default renderScreenerBonds;
