// /screeners/forex — Analizador de Forex.
// UI 1:1 con el Analizador de acciones de TradingView. Datos: 30+ pares mayores, menores y exóticos.
import './screeners.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------ Flag SVGs (16x16 circular, canónicas simplificadas) ------------------
// Cubre todas las divisas presentes en los 32 pares listados.
const FLAG_SVG = {
  EU: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fEU"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fEU)"><rect width="16" height="16" fill="#003399"/><g fill="#ffcc00"><circle cx="8" cy="3" r="0.6"/><circle cx="10.5" cy="3.7" r="0.6"/><circle cx="12.3" cy="5.5" r="0.6"/><circle cx="13" cy="8" r="0.6"/><circle cx="12.3" cy="10.5" r="0.6"/><circle cx="10.5" cy="12.3" r="0.6"/><circle cx="8" cy="13" r="0.6"/><circle cx="5.5" cy="12.3" r="0.6"/><circle cx="3.7" cy="10.5" r="0.6"/><circle cx="3" cy="8" r="0.6"/><circle cx="3.7" cy="5.5" r="0.6"/><circle cx="5.5" cy="3.7" r="0.6"/></g></g></svg>`,
  US: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxUS"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxUS)"><rect width="16" height="16" fill="#b22234"/><g fill="#fff"><rect y="1.2" width="16" height="1.2"/><rect y="3.7" width="16" height="1.2"/><rect y="6.2" width="16" height="1.2"/><rect y="8.7" width="16" height="1.2"/><rect y="11.2" width="16" height="1.2"/><rect y="13.7" width="16" height="1.2"/></g><rect width="7" height="8" fill="#3c3b6e"/></g></svg>`,
  GB: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxGB"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxGB)"><rect width="16" height="16" fill="#012169"/><path d="M0 0L16 16M16 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0L16 16M16 0L0 16" stroke="#c8102e" stroke-width="1.6"/><path d="M8 0V16M0 8H16" stroke="#fff" stroke-width="4"/><path d="M8 0V16M0 8H16" stroke="#c8102e" stroke-width="2.4"/></g></svg>`,
  JP: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxJP"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxJP)"><rect width="16" height="16" fill="#fff"/><circle cx="8" cy="8" r="4" fill="#bc002d"/></g></svg>`,
  CH: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxCH"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxCH)"><rect width="16" height="16" fill="#d52b1e"/><rect x="6.8" y="3.6" width="2.4" height="8.8" fill="#fff"/><rect x="3.6" y="6.8" width="8.8" height="2.4" fill="#fff"/></g></svg>`,
  AU: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxAU"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxAU)"><rect width="16" height="16" fill="#012169"/><rect width="8" height="8" fill="#012169"/><path d="M0 0L8 8M8 0L0 8" stroke="#fff" stroke-width="1.4"/><path d="M0 0L8 8M8 0L0 8" stroke="#e4002b" stroke-width="0.7"/><path d="M4 0V8M0 4H8" stroke="#fff" stroke-width="2"/><path d="M4 0V8M0 4H8" stroke="#e4002b" stroke-width="1.1"/><circle cx="11.5" cy="11.5" r="0.9" fill="#fff"/><circle cx="13" cy="6" r="0.6" fill="#fff"/><circle cx="14" cy="9.5" r="0.6" fill="#fff"/><circle cx="11" cy="14" r="0.5" fill="#fff"/></g></svg>`,
  CA: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxCA"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxCA)"><rect width="16" height="16" fill="#fff"/><rect width="4" height="16" fill="#d52b1e"/><rect x="12" width="4" height="16" fill="#d52b1e"/><path d="M8 4L8.7 6.2L10.8 5.8L9.7 7.6L11 8.4L9.5 9L9.8 10.2L8.5 9.7L8 11.5L7.5 9.7L6.2 10.2L6.5 9L5 8.4L6.3 7.6L5.2 5.8L7.3 6.2Z" fill="#d52b1e"/></g></svg>`,
  NZ: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxNZ"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxNZ)"><rect width="16" height="16" fill="#012169"/><rect width="8" height="8" fill="#012169"/><path d="M0 0L8 8M8 0L0 8" stroke="#fff" stroke-width="1.4"/><path d="M0 0L8 8M8 0L0 8" stroke="#c8102e" stroke-width="0.7"/><path d="M4 0V8M0 4H8" stroke="#fff" stroke-width="2"/><path d="M4 0V8M0 4H8" stroke="#c8102e" stroke-width="1.1"/><circle cx="12" cy="5" r="0.7" fill="#c8102e" stroke="#fff" stroke-width="0.3"/><circle cx="13.5" cy="9" r="0.7" fill="#c8102e" stroke="#fff" stroke-width="0.3"/><circle cx="11" cy="11" r="0.7" fill="#c8102e" stroke="#fff" stroke-width="0.3"/><circle cx="13" cy="12" r="0.7" fill="#c8102e" stroke="#fff" stroke-width="0.3"/></g></svg>`,
  CN: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxCN"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxCN)"><rect width="16" height="16" fill="#de2910"/><g fill="#ffde00"><polygon points="3.4,1.6 4,3.4 5.7,3.4 4.3,4.4 4.8,6.1 3.4,5.1 2,6.1 2.5,4.4 1.1,3.4 2.8,3.4"/><circle cx="6.5" cy="1.5" r="0.5"/><circle cx="7.2" cy="3" r="0.5"/><circle cx="7.2" cy="5" r="0.5"/><circle cx="6.5" cy="6.4" r="0.5"/></g></g></svg>`,
  MX: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxMX"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxMX)"><rect width="5.33" height="16" fill="#006847"/><rect x="5.33" width="5.34" height="16" fill="#fff"/><rect x="10.67" width="5.33" height="16" fill="#ce1126"/><circle cx="8" cy="8" r="1.6" fill="#a0522d"/></g></svg>`,
  ZA: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxZA"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxZA)"><rect width="16" height="6" fill="#de3831"/><rect y="10" width="16" height="6" fill="#002395"/><rect y="6" width="16" height="4" fill="#fff"/><polygon points="0,0 7,8 0,16" fill="#007a4d"/><polygon points="0,2 4.5,8 0,14" fill="#000"/></g></svg>`,
  TR: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxTR"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxTR)"><rect width="16" height="16" fill="#e30a17"/><circle cx="6.5" cy="8" r="2.6" fill="#fff"/><circle cx="7.2" cy="8" r="2.1" fill="#e30a17"/><polygon points="9.5,8 11.4,7.4 10.2,9 11.4,10.6" fill="#fff"/></g></svg>`,
  BR: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxBR"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxBR)"><rect width="16" height="16" fill="#009c3b"/><polygon points="8,2 14,8 8,14 2,8" fill="#ffdf00"/><circle cx="8" cy="8" r="2.6" fill="#002776"/><path d="M5.6 7.4 Q8 6.5 10.4 7.4" stroke="#fff" stroke-width="0.4" fill="none"/></g></svg>`,
  IN: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxIN"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxIN)"><rect width="16" height="5.33" fill="#ff9933"/><rect y="5.33" width="16" height="5.34" fill="#fff"/><rect y="10.67" width="16" height="5.33" fill="#138808"/><circle cx="8" cy="8" r="1.6" fill="none" stroke="#000080" stroke-width="0.3"/></g></svg>`,
  SG: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxSG"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxSG)"><rect width="16" height="8" fill="#ed2939"/><rect y="8" width="16" height="8" fill="#fff"/><circle cx="4.5" cy="4" r="2" fill="#fff"/><circle cx="5.4" cy="4" r="1.8" fill="#ed2939"/></g></svg>`,
  HK: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxHK"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxHK)"><rect width="16" height="16" fill="#de2910"/><g fill="#fff" transform="translate(8 8)"><circle r="0.5"/><path d="M0 -3 L0.5 -1 L-0.5 -1 Z"/><path d="M3 0 L1 0.5 L1 -0.5 Z"/><path d="M0 3 L-0.5 1 L0.5 1 Z"/><path d="M-3 0 L-1 -0.5 L-1 0.5 Z"/></g></g></svg>`,
  NO: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxNO"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxNO)"><rect width="16" height="16" fill="#ef2b2d"/><rect x="5" width="2" height="16" fill="#fff"/><rect y="7" width="16" height="2" fill="#fff"/><rect x="5.5" width="1" height="16" fill="#002868"/><rect y="7.5" width="16" height="1" fill="#002868"/></g></svg>`,
  SE: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxSE"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxSE)"><rect width="16" height="16" fill="#006aa7"/><rect x="5" width="2" height="16" fill="#fecc00"/><rect y="7" width="16" height="2" fill="#fecc00"/></g></svg>`,
  DK: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxDK"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxDK)"><rect width="16" height="16" fill="#c8102e"/><rect x="5" width="2" height="16" fill="#fff"/><rect y="7" width="16" height="2" fill="#fff"/></g></svg>`,
  PL: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxPL"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxPL)"><rect width="16" height="8" fill="#fff"/><rect y="8" width="16" height="8" fill="#dc143c"/></g></svg>`,
  HU: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxHU"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxHU)"><rect width="16" height="5.33" fill="#cd2a3e"/><rect y="5.33" width="16" height="5.34" fill="#fff"/><rect y="10.67" width="16" height="5.33" fill="#436f4d"/></g></svg>`,
  CZ: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxCZ"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxCZ)"><rect width="16" height="8" fill="#fff"/><rect y="8" width="16" height="8" fill="#d7141a"/><polygon points="0,0 8,8 0,16" fill="#11457e"/></g></svg>`,
  ID: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxID"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxID)"><rect width="16" height="8" fill="#ce1126"/><rect y="8" width="16" height="8" fill="#fff"/></g></svg>`,
  KR: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxKR"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxKR)"><rect width="16" height="16" fill="#fff"/><path d="M5 8 a3 3 0 0 1 6 0 a3 3 0 0 0 -3 0 z" fill="#cd2e3a"/><path d="M5 8 a3 3 0 0 1 3 0 a3 3 0 0 0 3 0 z" fill="#0047a0" transform="rotate(180 8 8)"/></g></svg>`,
  TH: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fxTH"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fxTH)"><rect width="16" height="16" fill="#ed1c24"/><rect y="2.5" width="16" height="11" fill="#fff"/><rect y="5.5" width="16" height="5" fill="#241d4f"/></g></svg>`,
};

const flagSvg = (cc) =>
  `<span class="sc-fx-flag" aria-label="${esc(cc)}">${FLAG_SVG[cc] || '<span style="width:100%;height:100%;background:#2a2e39;display:block;border-radius:50%"></span>'}</span>`;

// Mapeo divisa ISO -> país/zona para banderas
const CCY_FLAG = {
  EUR: 'EU', USD: 'US', GBP: 'GB', JPY: 'JP', CHF: 'CH', AUD: 'AU', CAD: 'CA', NZD: 'NZ',
  CNH: 'CN', CNY: 'CN', MXN: 'MX', ZAR: 'ZA', TRY: 'TR', BRL: 'BR', INR: 'IN', SGD: 'SG',
  HKD: 'HK', NOK: 'NO', SEK: 'SE', DKK: 'DK', PLN: 'PL', HUF: 'HU', CZK: 'CZ',
  IDR: 'ID', KRW: 'KR', THB: 'TH',
};

const CCY_NAME = {
  EUR: 'Euro', USD: 'Dólar estadounidense', GBP: 'Libra esterlina', JPY: 'Yen japonés',
  CHF: 'Franco suizo', AUD: 'Dólar australiano', CAD: 'Dólar canadiense', NZD: 'Dólar neozelandés',
  CNH: 'Yuan offshore', MXN: 'Peso mexicano', ZAR: 'Rand sudafricano', TRY: 'Lira turca',
  BRL: 'Real brasileño', INR: 'Rupia india', SGD: 'Dólar de Singapur', HKD: 'Dólar de Hong Kong',
  NOK: 'Corona noruega', SEK: 'Corona sueca', DKK: 'Corona danesa', PLN: 'Złoty polaco',
  HUF: 'Forinto húngaro', CZK: 'Corona checa', IDR: 'Rupia indonesia', KRW: 'Won surcoreano',
  THB: 'Baht tailandés',
};

// pairFlags: dos banderas circulares 22px solapadas -8px (la primera tapa parcialmente la segunda).
function pairFlags(base, quote) {
  const a = CCY_FLAG[base] || base.slice(0, 2);
  const b = CCY_FLAG[quote] || quote.slice(0, 2);
  return `
    <span class="sc-fx-pair">
      <span class="sc-fx-flag sc-fx-flag-a">${FLAG_SVG[b] || ''}</span>
      <span class="sc-fx-flag sc-fx-flag-b">${FLAG_SVG[a] || ''}</span>
    </span>`;
}

// ------------------ Datos: 32 pares (Mayors + Minors + Exotics) con cotizaciones plausibles ------------------
// chg = % 24h, pip = cambio en pips 24h, hi/lo = max/min 24h, w/m/y = % 1S/1M/1A, vol = volatilidad ATR(14) %
const PAIRS = [
  // ---------- 7 MAYORS ----------
  { base: 'EUR', quote: 'USD', tier: 'Mayor', px: 1.08453, chg:  0.34, pip:  +37, hi: 1.08612, lo: 1.08079, w:  0.62, m:  1.12, y: -0.84, vol: 0.42 },
  { base: 'GBP', quote: 'USD', tier: 'Mayor', px: 1.27185, chg:  0.21, pip:  +27, hi: 1.27340, lo: 1.26840, w:  0.38, m:  0.95, y:  2.14, vol: 0.51 },
  { base: 'USD', quote: 'JPY', tier: 'Mayor', px: 157.412, chg: -0.18, pip:  -28, hi: 157.890, lo: 157.180, w: -0.42, m:  1.83, y:  9.62, vol: 0.66 },
  { base: 'USD', quote: 'CHF', tier: 'Mayor', px: 0.89542, chg:  0.07, pip:   +6, hi: 0.89720, lo: 0.89380, w:  0.18, m: -0.74, y:  3.12, vol: 0.37 },
  { base: 'AUD', quote: 'USD', tier: 'Mayor', px: 0.65840, chg: -0.42, pip:  -28, hi: 0.66120, lo: 0.65730, w: -0.18, m: -1.24, y: -2.31, vol: 0.55 },
  { base: 'USD', quote: 'CAD', tier: 'Mayor', px: 1.37214, chg:  0.15, pip:  +21, hi: 1.37380, lo: 1.36940, w:  0.27, m:  0.43, y:  1.27, vol: 0.39 },
  { base: 'NZD', quote: 'USD', tier: 'Mayor', px: 0.60125, chg: -0.27, pip:  -16, hi: 0.60310, lo: 0.60030, w: -0.41, m: -1.92, y: -3.85, vol: 0.58 },

  // ---------- 10 MINORS (cruzados sin USD) ----------
  { base: 'EUR', quote: 'GBP', tier: 'Minor', px: 0.85271, chg:  0.13, pip:  +11, hi: 0.85410, lo: 0.85120, w:  0.24, m:  0.18, y: -2.93, vol: 0.33 },
  { base: 'EUR', quote: 'JPY', tier: 'Minor', px: 170.745, chg:  0.16, pip:  +27, hi: 171.030, lo: 170.380, w:  0.18, m:  2.97, y:  8.71, vol: 0.71 },
  { base: 'GBP', quote: 'JPY', tier: 'Minor', px: 200.314, chg:  0.04, pip:   +8, hi: 200.620, lo: 199.840, w: -0.07, m:  2.83, y: 11.95, vol: 0.82 },
  { base: 'EUR', quote: 'CHF', tier: 'Minor', px: 0.97082, chg:  0.41, pip:  +40, hi: 0.97180, lo: 0.96620, w:  0.81, m:  0.36, y:  2.27, vol: 0.40 },
  { base: 'AUD', quote: 'JPY', tier: 'Minor', px: 103.652, chg: -0.59, pip:  -61, hi: 104.310, lo: 103.510, w: -0.59, m:  0.55, y:  7.14, vol: 0.84 },
  { base: 'EUR', quote: 'AUD', tier: 'Minor', px: 1.64720, chg:  0.78, pip:  +128, hi: 1.64910, lo: 1.63360, w:  0.83, m:  2.39, y:  1.49, vol: 0.62 },
  { base: 'EUR', quote: 'CAD', tier: 'Minor', px: 1.48852, chg:  0.50, pip:  +74, hi: 1.49010, lo: 1.48070, w:  0.91, m:  1.56, y: -0.41, vol: 0.45 },
  { base: 'GBP', quote: 'AUD', tier: 'Minor', px: 1.93181, chg:  0.63, pip: +121, hi: 1.93420, lo: 1.91920, w:  0.58, m:  2.21, y:  4.51, vol: 0.68 },
  { base: 'GBP', quote: 'CAD', tier: 'Minor', px: 1.74570, chg:  0.36, pip:  +63, hi: 1.74810, lo: 1.73810, w:  0.66, m:  1.39, y:  0.85, vol: 0.47 },
  { base: 'AUD', quote: 'NZD', tier: 'Minor', px: 1.09502, chg: -0.15, pip:  -16, hi: 1.09680, lo: 1.09380, w:  0.24, m:  0.70, y:  1.55, vol: 0.36 },

  // ---------- 15 EXOTICS ----------
  { base: 'USD', quote: 'CNH', tier: 'Exótico', px: 7.24180, chg:  0.09, pip:   +6, hi: 7.24530, lo: 7.23210, w:  0.21, m:  0.43, y:  2.08, vol: 0.28 },
  { base: 'USD', quote: 'MXN', tier: 'Exótico', px: 18.2417, chg:  0.84, pip: +152, hi: 18.2980, lo: 18.0590, w:  1.42, m:  6.91, y:  2.16, vol: 1.07 },
  { base: 'USD', quote: 'ZAR', tier: 'Exótico', px: 18.5320, chg: -0.61, pip: -114, hi: 18.6720, lo: 18.4810, w: -0.92, m: -2.18, y: -1.36, vol: 0.94 },
  { base: 'USD', quote: 'TRY', tier: 'Exótico', px: 32.1840, chg:  0.18, pip:  +58, hi: 32.2410, lo: 32.0820, w:  1.04, m:  3.92, y: 65.31, vol: 0.71 },
  { base: 'USD', quote: 'BRL', tier: 'Exótico', px:  5.1180, chg:  0.42, pip:  +21, hi:  5.1320, lo:  5.0810, w:  0.93, m:  3.18, y:  4.62, vol: 0.83 },
  { base: 'USD', quote: 'INR', tier: 'Exótico', px: 83.4120, chg:  0.06, pip:   +5, hi: 83.4710, lo: 83.3380, w:  0.18, m:  0.31, y:  1.91, vol: 0.21 },
  { base: 'USD', quote: 'SGD', tier: 'Exótico', px: 1.34620, chg:  0.12, pip:  +16, hi: 1.34780, lo: 1.34390, w:  0.27, m:  0.61, y: -0.42, vol: 0.31 },
  { base: 'USD', quote: 'HKD', tier: 'Exótico', px: 7.82185, chg:  0.01, pip:   +1, hi: 7.82310, lo: 7.81920, w:  0.04, m:  0.08, y: -0.18, vol: 0.04 },
  { base: 'USD', quote: 'NOK', tier: 'Exótico', px: 10.6420, chg:  0.51, pip:  +54, hi: 10.6810, lo: 10.5820, w:  0.62, m:  1.84, y:  3.92, vol: 0.69 },
  { base: 'USD', quote: 'SEK', tier: 'Exótico', px: 10.7185, chg:  0.46, pip:  +49, hi: 10.7480, lo: 10.6610, w:  0.71, m:  2.13, y:  4.21, vol: 0.66 },
  { base: 'USD', quote: 'DKK', tier: 'Exótico', px:  6.8740, chg: -0.34, pip:  -23, hi:  6.8920, lo:  6.8590, w: -0.62, m: -1.12, y:  0.82, vol: 0.41 },
  { base: 'USD', quote: 'PLN', tier: 'Exótico', px:  3.9420, chg:  0.27, pip:  +11, hi:  3.9510, lo:  3.9290, w:  0.41, m:  1.34, y: -3.18, vol: 0.55 },
  { base: 'USD', quote: 'HUF', tier: 'Exótico', px: 354.180, chg:  0.32, pip: +112, hi: 354.820, lo: 352.910, w:  0.81, m:  2.18, y:  0.94, vol: 0.78 },
  { base: 'USD', quote: 'CZK', tier: 'Exótico', px: 22.8240, chg:  0.21, pip:  +47, hi: 22.8610, lo: 22.7510, w:  0.43, m:  1.05, y:  1.83, vol: 0.44 },
  { base: 'USD', quote: 'IDR', tier: 'Exótico', px: 16205.4, chg:  0.08, pip:  +14, hi: 16241.0, lo: 16187.2, w:  0.31, m:  1.18, y:  2.46, vol: 0.36 },
];

// ------------------ Formato ------------------
// pares JPY/HUF/IDR cotizan con 3 decimales, IDR con 1; HKD/CNH ~5 dec; resto mayors 5 dec.
function fmtPrice(p) {
  if (p.quote === 'JPY') return p.px.toFixed(3).replace('.', ',');
  if (p.quote === 'HUF') return p.px.toFixed(3).replace('.', ',');
  if (p.quote === 'IDR') return p.px.toFixed(1).replace('.', ',');
  if (p.quote === 'TRY' || p.quote === 'MXN' || p.quote === 'ZAR' || p.quote === 'INR' ||
      p.quote === 'BRL' || p.quote === 'NOK' || p.quote === 'SEK' || p.quote === 'DKK' ||
      p.quote === 'PLN' || p.quote === 'CZK' || p.quote === 'CNH') {
    return p.px.toFixed(4).replace('.', ',');
  }
  return p.px.toFixed(5).replace('.', ',');
}
function fmtHL(p, v) {
  // mismo formato que precio
  const tmp = { ...p, px: v };
  return fmtPrice(tmp);
}
const fmtPct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2).replace('.', ',')}%`;
const fmtPip = (n) => `${n > 0 ? '+' : ''}${n} pips`;
const cls = (n) => (n > 0 ? 'sc-pos' : n < 0 ? 'sc-neg' : 'sc-flat');
const txtCls = (n) => (n > 0 ? 'sc-pos-text' : n < 0 ? 'sc-neg-text' : 'sc-muted');

// ------------------ Iconos SVG ------------------
const icons = {
  share:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>`,
  star:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  more:   `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
  globe:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>`,
  grid:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  list:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  cols:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  arrow:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
};

// ------------------ Pills ------------------
const PILLS = [
  { icon: 'globe', label: 'Tipo', value: 'Todos los pares', chev: true },
  { label: 'Divisa base', chev: true },
  { label: 'Divisa cotización', chev: true },
  { label: 'Cbo % 24h', chev: true },
  { label: 'Cbo % 1S', chev: true },
  { label: 'Cbo % 1M', chev: true },
  { label: 'Cbo % 1A', chev: true },
  { label: 'ATR (14)', chev: true },
  { label: 'Volatilidad', chev: true },
  { label: 'Spread típico', chev: true },
  { label: 'Volumen', chev: true },
];

const TABS = ['Resumen', 'Rendimiento', 'Oscilador', 'Tendencias', 'Volatilidad', 'Cambios % período', 'Más'];

// ------------------ Render ------------------
function pillHtml(p) {
  const iconHtml = p.icon ? `<span class="sc-pill-icon">${icons[p.icon]}</span>` : '';
  const valHtml = p.value ? `: <span class="sc-muted" style="margin-left:2px">${esc(p.value)}</span>` : '';
  const chev = p.chev ? `<span class="sc-pill-chev">▾</span>` : '';
  return `<button class="sc-pill">${iconHtml}<span>${esc(p.label)}${valHtml}</span>${chev}</button>`;
}

function rowHtml(p) {
  const symbol = `${p.base}${p.quote}`;
  const longName = `${CCY_NAME[p.base] || p.base} / ${CCY_NAME[p.quote] || p.quote}`;
  return `
    <tr>
      <td>
        <div class="sc-sym">
          ${pairFlags(p.base, p.quote)}
          <span class="sc-sym-ticker">${esc(symbol)}</span>
          <span class="sc-sym-name">${esc(longName)}</span>
        </div>
      </td>
      <td><span class="sc-price-cell">${fmtPrice(p)} <span class="sc-price-cur">${esc(p.quote)}</span></span></td>
      <td><span class="sc-chg ${cls(p.chg)}">${fmtPct(p.chg)}</span></td>
      <td><span class="${txtCls(p.pip)}">${fmtPip(p.pip)}</span></td>
      <td>${fmtHL(p, p.hi)}</td>
      <td>${fmtHL(p, p.lo)}</td>
      <td><span class="sc-chg ${cls(p.w)}">${fmtPct(p.w)}</span></td>
      <td><span class="sc-chg ${cls(p.m)}">${fmtPct(p.m)}</span></td>
      <td><span class="sc-chg ${cls(p.y)}">${fmtPct(p.y)}</span></td>
      <td>${p.vol.toFixed(2).replace('.', ',')}%</td>
    </tr>`;
}

export function renderScreenerForex(mount) {
  // Estilos puntuales: par de banderas solapadas y forma de la bandera única usada en pills.
  const localCss = `
    <style>
      .sc-fx-pair { position: relative; display: inline-flex; align-items: center; width: 36px; height: 22px; flex-shrink: 0; }
      .sc-fx-pair .sc-fx-flag { position: absolute; top: 0; width: 22px; height: 22px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1.5px #0f0f0f; }
      .sc-fx-pair .sc-fx-flag-a { left: 0; z-index: 1; }
      .sc-fx-pair .sc-fx-flag-b { left: 14px; z-index: 2; }
      .sc-fx-pair .sc-fx-flag svg { width: 100%; height: 100%; display: block; }
      .sc-fx-flag svg { width: 100%; height: 100%; display: block; }
    </style>`;

  mount.innerHTML = `
    <div class="sc-root">
      ${localCss}
      <div class="sc-container">
        <!-- Breadcrumb -->
        <nav class="sc-breadcrumb">
          <a href="#/">Inicio</a>
          <span class="sc-bc-sep">›</span>
          <a href="#/screeners/forex">Analizador de Forex</a>
          <span class="sc-bc-sep">›</span>
          <span class="sc-bc-current">Todos los pares</span>
        </nav>

        <!-- Title bar -->
        <div class="sc-title-bar">
          <h1 class="sc-title">Todos los pares <span class="sc-title-chev">▾</span></h1>
          <div class="sc-title-actions">
            <button class="sc-action-btn" title="Compartir">${icons.share}</button>
            <button class="sc-action-btn" title="Favorito">${icons.star}</button>
            <button class="sc-action-btn" title="Más">${icons.more}</button>
          </div>
        </div>

        <!-- Filter pills -->
        <div class="sc-pills">
          ${PILLS.map(pillHtml).join('')}
          <button class="sc-pill sc-pill-square" title="Columnas">${icons.cols}</button>
          <button class="sc-pill sc-pill-square" title="Más">${icons.more}</button>
        </div>

        <!-- Tabs -->
        <div class="sc-tabs-wrap">
          <div class="sc-view-toggle">
            <button class="is-active" title="Tabla">${icons.list}</button>
            <button title="Cuadrícula">${icons.grid}</button>
          </div>
          <div class="sc-tabs">
            ${TABS.map((t, i) => `<button class="sc-tab ${i === 0 ? 'is-active' : ''}">${esc(t)}</button>`).join('')}
          </div>
        </div>

        <!-- Result count -->
        <div class="sc-result-count">Mostrando ${PAIRS.length} de 240 resultados</div>

        <!-- Table -->
        <div class="sc-table-wrap">
          <table class="sc-table">
            <thead>
              <tr>
                <th class="sc-th-sorted">Símbolo <span class="sc-sort-arrow">▾</span></th>
                <th>Precio</th>
                <th>Cbo %</th>
                <th>Pip change</th>
                <th>Máx 24h</th>
                <th>Mín 24h</th>
                <th>Cbo % 1S</th>
                <th>Cbo % 1M</th>
                <th>Cbo % 1A</th>
                <th>Volatilidad</th>
              </tr>
            </thead>
            <tbody>
              ${PAIRS.map(rowHtml).join('')}
            </tbody>
          </table>
        </div>

        <a href="#" class="sc-footer-cta">Cargar más pares ${icons.arrow}</a>
      </div>
    </div>`;

  return { destroy() { mount.innerHTML = ''; } };
}
