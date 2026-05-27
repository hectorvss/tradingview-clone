// /screeners/etf — Analizador de ETFs. Plantilla idéntica a la del Analizador de
// acciones de TradingView, con 30+ ETFs reales bien conocidos.
import './screeners.css';

/* ---------- Static asset registry (logo fallback to colored initials) ----------
   We attempted to mirror logos from s3-symbol-logo.tradingview.com but the CDN
   returns 403 to unauthenticated origins. So every ETF uses the deterministic
   colored-initials fallback rendered below. */

const PALETTE = [
  '#2962ff', '#089981', '#ff6d00', '#9c27b0', '#e91e63',
  '#00acc1', '#f44336', '#43a047', '#5e35b1', '#fb8c00',
  '#1e88e5', '#d81b60', '#00897b', '#6d4c41', '#3949ab',
];
function colorFor(ticker) {
  let h = 0;
  for (let i = 0; i < ticker.length; i += 1) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/* ---------- Data: 36 well-known ETFs with plausible real-world magnitudes ---- */

const ETFS = [
  { tk: 'SPY',  name: 'SPDR S&P 500 ETF Trust',                price: 594.80, chg:  0.42, vol: '52,1 M', aum: '634,5 B', exp: 0.09, r1: 24.18, r3: 11.42, r5: 15.71, yld: 1.21 },
  { tk: 'IVV',  name: 'iShares Core S&P 500 ETF',              price: 597.32, chg:  0.41, vol: '5,8 M',  aum: '598,2 B', exp: 0.03, r1: 24.22, r3: 11.47, r5: 15.74, yld: 1.24 },
  { tk: 'VOO',  name: 'Vanguard S&P 500 ETF',                  price: 547.91, chg:  0.43, vol: '6,2 M',  aum: '548,7 B', exp: 0.03, r1: 24.21, r3: 11.46, r5: 15.73, yld: 1.27 },
  { tk: 'VTI',  name: 'Vanguard Total Stock Market ETF',       price: 296.45, chg:  0.38, vol: '3,9 M',  aum: '442,1 B', exp: 0.03, r1: 23.65, r3: 10.92, r5: 15.41, yld: 1.32 },
  { tk: 'QQQ',  name: 'Invesco QQQ Trust',                     price: 511.27, chg:  0.71, vol: '42,7 M', aum: '321,6 B', exp: 0.20, r1: 28.94, r3: 15.83, r5: 21.04, yld: 0.56 },
  { tk: 'VEA',  name: 'Vanguard FTSE Developed Markets ETF',   price:  52.18, chg: -0.12, vol: '8,4 M',  aum: '142,9 B', exp: 0.06, r1:  9.82, r3:  4.51, r5:  6.78, yld: 3.11 },
  { tk: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',    price:  46.93, chg: -0.31, vol: '9,1 M',  aum: '118,4 B', exp: 0.08, r1: 10.41, r3: -0.62, r5:  3.94, yld: 2.84 },
  { tk: 'IEFA', name: 'iShares Core MSCI EAFE ETF',            price:  78.42, chg: -0.18, vol: '7,2 M',  aum: '129,7 B', exp: 0.07, r1:  9.65, r3:  4.32, r5:  6.71, yld: 3.02 },
  { tk: 'AGG',  name: 'iShares Core U.S. Aggregate Bond ETF',  price:  98.74, chg:  0.11, vol: '6,5 M',  aum: '120,3 B', exp: 0.03, r1:  3.12, r3: -1.84, r5:  0.42, yld: 4.18 },
  { tk: 'BND',  name: 'Vanguard Total Bond Market ETF',        price:  73.42, chg:  0.12, vol: '5,9 M',  aum: '118,7 B', exp: 0.03, r1:  3.21, r3: -1.78, r5:  0.49, yld: 4.21 },
  { tk: 'IWM',  name: 'iShares Russell 2000 ETF',              price: 226.18, chg: -0.84, vol: '28,4 M', aum:  '71,8 B', exp: 0.19, r1: 18.94, r3:  3.21, r5:  8.12, yld: 1.28 },
  { tk: 'IJH',  name: 'iShares Core S&P Mid-Cap ETF',          price:  64.27, chg: -0.52, vol: '4,1 M',  aum:  '92,4 B', exp: 0.05, r1: 19.41, r3:  6.84, r5: 10.92, yld: 1.42 },
  { tk: 'IJR',  name: 'iShares Core S&P Small-Cap ETF',        price: 121.84, chg: -0.91, vol: '3,8 M',  aum:  '85,2 B', exp: 0.06, r1: 17.32, r3:  4.71, r5:  9.84, yld: 1.51 },
  { tk: 'EFA',  name: 'iShares MSCI EAFE ETF',                 price:  84.27, chg: -0.15, vol: '15,3 M', aum:  '54,8 B', exp: 0.33, r1:  9.42, r3:  4.18, r5:  6.54, yld: 2.94 },
  { tk: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',     price:  44.61, chg: -0.34, vol: '32,7 M', aum:  '18,9 B', exp: 0.70, r1: 10.18, r3: -0.84, r5:  3.71, yld: 2.62 },
  { tk: 'GLD',  name: 'SPDR Gold Shares',                      price: 248.94, chg:  0.62, vol: '7,8 M',  aum:  '78,4 B', exp: 0.40, r1: 31.42, r3: 14.18, r5: 10.94, yld: 0.00 },
  { tk: 'SLV',  name: 'iShares Silver Trust',                  price:  30.87, chg:  1.14, vol: '18,4 M', aum:  '14,2 B', exp: 0.50, r1: 38.71, r3: 12.94, r5:  8.42, yld: 0.00 },
  { tk: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',    price:  88.42, chg:  0.34, vol: '34,1 M', aum:  '58,1 B', exp: 0.15, r1: -0.84, r3: -8.42, r5: -2.18, yld: 4.42 },
  { tk: 'LQD',  name: 'iShares iBoxx $ Inv Grade Corp Bond',   price: 108.74, chg:  0.21, vol: '11,2 M', aum:  '32,8 B', exp: 0.14, r1:  4.18, r3: -1.41, r5:  1.32, yld: 4.61 },
  { tk: 'HYG',  name: 'iShares iBoxx $ High Yield Corp Bond',  price:  79.41, chg:  0.18, vol: '38,9 M', aum:  '17,2 B', exp: 0.49, r1:  9.84, r3:  2.18, r5:  3.74, yld: 6.84 },
  { tk: 'BNDX', name: 'Vanguard Total International Bond ETF', price:  48.92, chg:  0.08, vol: '2,1 M',  aum:  '62,4 B', exp: 0.07, r1:  4.21, r3: -1.18, r5:  0.84, yld: 3.18 },
  { tk: 'VXUS', name: 'Vanguard Total International Stock ETF',price:  62.18, chg: -0.21, vol: '4,2 M',  aum:  '76,3 B', exp: 0.07, r1:  9.94, r3:  3.42, r5:  6.18, yld: 3.21 },
  { tk: 'VTV',  name: 'Vanguard Value ETF',                    price: 174.92, chg:  0.22, vol: '2,4 M',  aum: '129,4 B', exp: 0.04, r1: 19.84, r3: 10.12, r5: 12.41, yld: 2.14 },
  { tk: 'VUG',  name: 'Vanguard Growth ETF',                   price: 415.27, chg:  0.61, vol: '1,8 M',  aum: '162,8 B', exp: 0.04, r1: 28.42, r3: 12.94, r5: 18.71, yld: 0.42 },
  { tk: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF',       price:  28.94, chg:  0.31, vol: '14,8 M', aum:  '69,2 B', exp: 0.06, r1: 14.18, r3:  6.71, r5: 12.84, yld: 3.42 },
  { tk: 'SCHX', name: 'Schwab U.S. Large-Cap ETF',             price:  24.87, chg:  0.41, vol: '4,1 M',  aum:  '47,8 B', exp: 0.03, r1: 23.84, r3: 11.21, r5: 15.42, yld: 1.31 },
  { tk: 'XLK',  name: 'Technology Select Sector SPDR Fund',    price: 231.42, chg:  0.84, vol: '6,2 M',  aum:  '74,1 B', exp: 0.09, r1: 32.41, r3: 16.74, r5: 22.18, yld: 0.62 },
  { tk: 'XLF',  name: 'Financial Select Sector SPDR Fund',     price:  52.18, chg:  0.51, vol: '34,1 M', aum:  '52,4 B', exp: 0.09, r1: 31.84, r3: 12.18, r5: 14.71, yld: 1.41 },
  { tk: 'XLE',  name: 'Energy Select Sector SPDR Fund',        price:  92.74, chg: -0.42, vol: '15,8 M', aum:  '37,2 B', exp: 0.09, r1:  8.21, r3: 14.84, r5: 18.74, yld: 3.21 },
  { tk: 'XLV',  name: 'Health Care Select Sector SPDR Fund',   price: 142.87, chg: -0.18, vol: '8,4 M',  aum:  '38,4 B', exp: 0.09, r1:  5.42, r3:  4.18, r5:  9.71, yld: 1.62 },
  { tk: 'XLI',  name: 'Industrial Select Sector SPDR Fund',    price: 142.18, chg:  0.32, vol: '11,2 M', aum:  '21,4 B', exp: 0.09, r1: 22.84, r3: 10.41, r5: 13.18, yld: 1.34 },
  { tk: 'XLP',  name: 'Consumer Staples Select Sector SPDR',   price:  82.41, chg:  0.14, vol: '9,4 M',  aum:  '16,8 B', exp: 0.09, r1: 11.42, r3:  5.18, r5:  8.74, yld: 2.42 },
  { tk: 'XLY',  name: 'Consumer Discretionary Select SPDR',    price: 224.18, chg:  0.42, vol: '4,8 M',  aum:  '23,1 B', exp: 0.09, r1: 25.18, r3:  7.42, r5: 12.84, yld: 0.84 },
  { tk: 'XLU',  name: 'Utilities Select Sector SPDR Fund',     price:  82.94, chg:  0.21, vol: '13,2 M', aum:  '18,4 B', exp: 0.09, r1: 22.41, r3:  7.84, r5:  8.41, yld: 2.81 },
  { tk: 'XLB',  name: 'Materials Select Sector SPDR Fund',     price:  91.42, chg: -0.28, vol: '5,4 M',  aum:   '6,8 B', exp: 0.09, r1: 12.84, r3:  4.21, r5:  9.42, yld: 1.84 },
  { tk: 'XLRE', name: 'Real Estate Select Sector SPDR Fund',   price:  41.84, chg:  0.18, vol: '6,2 M',  aum:   '7,9 B', exp: 0.09, r1: 12.41, r3:  0.84, r5:  4.71, yld: 3.41 },
  { tk: 'ARKK', name: 'ARK Innovation ETF',                    price:  58.42, chg:  1.84, vol: '12,4 M', aum:   '5,8 B', exp: 0.75, r1: 32.18, r3: -8.42, r5:  2.18, yld: 0.00 },
];

/* ---------- Render helpers ---------- */

const fmtPrice = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const fmtExp = (n) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function symCell(etf) {
  const initials = etf.tk.slice(0, 2);
  const bg = colorFor(etf.tk);
  return `
    <div class="sc-sym">
      <span class="sc-sym-logo" style="background:${bg}">${initials}</span>
      <span class="sc-sym-ticker">${etf.tk}</span>
      <span class="sc-sym-name">${etf.name}</span>
    </div>`;
}

function chgCell(n) {
  const cls = n > 0 ? 'sc-pos' : n < 0 ? 'sc-neg' : 'sc-flat';
  return `<span class="sc-chg ${cls}">${fmtPct(n)}</span>`;
}
function colorText(n) {
  const cls = n > 0 ? 'sc-pos-text' : n < 0 ? 'sc-neg-text' : 'sc-muted';
  return `<span class="${cls}">${fmtPct(n)}</span>`;
}

function row(etf) {
  return `
    <tr>
      <td>${symCell(etf)}</td>
      <td><span class="sc-price-cell">${fmtPrice(etf.price)} <span class="sc-price-cur">USD</span></span></td>
      <td>${chgCell(etf.chg)}</td>
      <td>${etf.vol}</td>
      <td>${etf.aum}</td>
      <td>${fmtExp(etf.exp)}</td>
      <td>${colorText(etf.r1)}</td>
      <td>${colorText(etf.r3)}</td>
      <td>${colorText(etf.r5)}</td>
      <td>${etf.yld.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
    </tr>`;
}

/* ---------- Inline SVG icons ---------- */

const ICON_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
const ICON_SHARE   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const ICON_DOWNLOAD= `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_STAR    = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const ICON_GRID    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
const ICON_DOTS    = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`;
const ICON_LIST    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_GRID2   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>`;
const FLAG_US = `<svg viewBox="0 0 18 18"><rect width="18" height="18" fill="#3c3b6e"/><rect y="2" width="18" height="2" fill="#fff"/><rect y="6" width="18" height="2" fill="#fff"/><rect y="10" width="18" height="2" fill="#fff"/><rect y="14" width="18" height="2" fill="#fff"/><rect y="2" width="18" height="2" fill="#b22234"/><rect y="6" width="18" height="2" fill="#b22234"/><rect y="10" width="18" height="2" fill="#b22234"/></svg>`;

/* ---------- Page HTML ---------- */

function pillsHtml() {
  const pills = [
    `<button class="sc-pill"><span class="sc-pill-flag">${FLAG_US}</span>Mercado: EE.UU.<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill"><span class="sc-pill-icon">${ICON_STAR}</span>Lista de seguimiento<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Tipo de activo<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill sc-pill-active">AUM<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Cbo %<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Volumen<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Expense ratio<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Rentabilidad 1A<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Rentabilidad 3A<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Rentabilidad 5A<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Yield del dividendo %<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Tracking Index<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">Categoría<span class="sc-pill-chev">▾</span></button>`,
    `<button class="sc-pill">+ Próximos dividendos</button>`,
    `<button class="sc-pill sc-pill-square">${ICON_GRID}</button>`,
    `<button class="sc-pill sc-pill-square">${ICON_DOTS}</button>`,
  ];
  return pills.join('');
}

const TABS = ['Resumen', 'Rendimiento', 'Rentabilidad', 'Dividendos', 'Margen', 'Activos', 'Sectores', 'Más'];

function pageHtml() {
  return `
    <div class="sc-root">
      <div class="sc-container">

        <nav class="sc-breadcrumb">
          <a href="/">Inicio</a><span class="sc-bc-sep">›</span>
          <a href="/screeners/etf">Analizador de ETFs</a><span class="sc-bc-sep">›</span>
          <span class="sc-bc-current">Todos los ETFs</span>
        </nav>

        <div class="sc-title-bar">
          <h1 class="sc-title">Todos los ETFs <span class="sc-title-chev">▾</span></h1>
          <div class="sc-title-actions">
            <button class="sc-action-btn" title="Actualizar">${ICON_REFRESH}</button>
            <button class="sc-action-btn" title="Compartir">${ICON_SHARE}</button>
            <button class="sc-action-btn" title="Descargar">${ICON_DOWNLOAD}</button>
          </div>
        </div>

        <div class="sc-pills">${pillsHtml()}</div>

        <div class="sc-tabs-wrap">
          <div class="sc-view-toggle">
            <button class="is-active" title="Vista tabla">${ICON_LIST}</button>
            <button title="Vista cuadrícula">${ICON_GRID2}</button>
          </div>
          <div class="sc-tabs">
            ${TABS.map((t, i) => `<button class="sc-tab${i === 0 ? ' is-active' : ''}">${t}</button>`).join('')}
          </div>
        </div>

        <div class="sc-result-count">Mostrando ${ETFS.length} de 3.142 resultados</div>

        <div class="sc-table-wrap">
          <table class="sc-table">
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Precio</th>
                <th>Cbo %</th>
                <th>Vol.</th>
                <th class="sc-th-sorted">AUM <span class="sc-sort-arrow">▼</span></th>
                <th>Expense ratio</th>
                <th>Rentabilidad 1A</th>
                <th>Rentabilidad 3A</th>
                <th>Rentabilidad 5A</th>
                <th>Yield TTM</th>
              </tr>
            </thead>
            <tbody>
              ${ETFS.map(row).join('')}
            </tbody>
          </table>
        </div>

        <a class="sc-footer-cta" href="#">Cargar más resultados →</a>
      </div>
    </div>`;
}

export function renderScreenerETF(mount) {
  mount.innerHTML = pageHtml();
  return { destroy() { mount.innerHTML = ''; } };
}
