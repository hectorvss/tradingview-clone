// /markets — mitad superior (Agent B1). Figma 25:223621 (sub-secciones 25:211232, 25:211245,
// 25:211891, 25:213463, 25:215082, 25:216464, 25:217304). Vanilla JS. Estilos en markets.css
// con prefijo .mkt-

// ---------- helpers ----------
const PCT_UP = '+';
const PCT_DN = '-';

function pct(v) {
  const s = v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
  return `<span class="mkt-pct ${v >= 0 ? 'mkt-up' : 'mkt-dn'}">${s.replace('.', ',')}</span>`;
}

function logoCircle(label, color) {
  return `<span class="mkt-logo" style="background:${color}">${label}</span>`;
}

// Mini sparkline SVG (a few wiggly lines based on direction)
function spark(up = true) {
  const stroke = up ? '#089981' : '#f23645';
  // 60x20 simple polyline
  const pts = up
    ? '0,16 8,14 16,15 24,11 32,13 40,8 48,10 56,5 60,4'
    : '0,4 8,6 16,5 24,9 32,7 40,12 48,10 56,15 60,16';
  return `<svg class="mkt-spark" viewBox="0 0 60 20" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="1.5"/></svg>`;
}

// Big main chart placeholder (SVG line area)
function bigChart(up = true) {
  const stroke = up ? '#089981' : '#f23645';
  const fill = up ? 'rgba(8,153,129,0.08)' : 'rgba(242,54,69,0.10)';
  // generate quasi-random walk
  const N = 80; let y = 60; const pts = [];
  const seed = up ? 17 : 31;
  for (let i = 0; i < N; i++) {
    // deterministic pseudo-random
    const r = Math.sin(i * seed) * 8 + Math.cos(i * 0.7) * 4;
    y += r * 0.25 + (up ? -0.2 : 0.2);
    if (y < 10) y = 10; if (y > 100) y = 100;
    pts.push(`${(i * (1200 / (N - 1))).toFixed(1)},${y.toFixed(1)}`);
  }
  const area = `0,110 ${pts.join(' ')} 1200,110`;
  return `<svg class="mkt-bigchart" viewBox="0 0 1200 110" preserveAspectRatio="none">
    <polygon points="${area}" fill="${fill}"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.4"/>
  </svg>`;
}

// ---------- section building blocks ----------

function sectionHeader(title) {
  return `<div class="mkt-sec-header"><a class="mkt-sec-title" href="#">${title}<span class="mkt-chev">›</span></a></div>`;
}

function subHeader(title) {
  return `<div class="mkt-sub-header"><a class="mkt-sub-title" href="#">${title}<span class="mkt-chev">›</span></a></div>`;
}

// Ticker card: small (used in horizontal scrollers)
function tickerCard({ logo, color, symbol, badge = 'D', name, value, unit, change, selected = false, sparkUp }) {
  const cls = `mkt-tcard${selected ? ' mkt-tcard--selected' : ''}`;
  const sp = (sparkUp === true || sparkUp === false) ? `<div class="mkt-tcard-spark">${spark(sparkUp)}</div>` : '';
  return `<div class="${cls}">
    <div class="mkt-tcard-row">
      ${logoCircle(logo, color)}
      <div class="mkt-tcard-meta">
        <div class="mkt-tcard-sym">${symbol}<sup>${badge}</sup></div>
        ${name ? `<div class="mkt-tcard-name">${name}</div>` : ''}
      </div>
      ${sp}
    </div>
    <div class="mkt-tcard-vals">
      <span class="mkt-tcard-val">${value}</span>
      ${unit ? `<span class="mkt-tcard-unit">${unit}</span>` : ''}
      ${pct(change)}
    </div>
  </div>`;
}

// World card style (vertical with bigger circle)
function worldCard({ logo, color, symbol, badge, name, value, unit, change }) {
  return `<div class="mkt-wcard">
    <div class="mkt-wcard-head">
      <span class="mkt-wcard-logo" style="background:${color}">${logo}</span>
      <div class="mkt-wcard-meta">
        <div class="mkt-wcard-sym">${symbol}<sup>${badge}</sup></div>
        <div class="mkt-wcard-name">${name}</div>
      </div>
    </div>
    <div class="mkt-wcard-vals">
      <div class="mkt-wcard-val">${value}<span class="mkt-wcard-unit">${unit}</span></div>
      ${pct(change)}
    </div>
  </div>`;
}

// Compact list row used inside tables (logo, symbol, %change/value, optional cap/emp)
function listRow({ logo, color, symbol, name, change, value, badgeColor, cap, emp }) {
  const bg = badgeColor || (change >= 0 ? '#089981' : '#f23645');
  const extra = cap || emp || '';
  return `<div class="mkt-row">
    <div class="mkt-row-left">
      ${logoCircle(logo, color)}
      <div class="mkt-row-meta">
        <div class="mkt-row-sym">${symbol}</div>
        ${name ? `<div class="mkt-row-name">${name}</div>` : ''}
      </div>
    </div>
    <div class="mkt-row-right">
      ${value ? `<span class="mkt-row-val">${value}</span>` : ''}
      <span class="mkt-row-pct" style="background:${bg}">${(change >= 0 ? '+' : '') + change.toFixed(2).replace('.', ',')}%</span>
      ${extra ? `<span class="mkt-row-extra">${extra}</span>` : ''}
    </div>
  </div>`;
}

function scrollBtn(dir = 'right') {
  return `<button class="mkt-scrollbtn mkt-scrollbtn--${dir}" aria-label="${dir === 'right' ? 'Siguiente' : 'Anterior'}">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${dir === 'right' ? '9 6 15 12 9 18' : '15 6 9 12 15 18'}"/></svg>
  </button>`;
}

// Chart toolbar (D/M/Y range + icons)
function chartToolbar() {
  return `<div class="mkt-chart-toolbar">
    <div class="mkt-ranges">
      <button class="mkt-range mkt-range--on">1D</button>
      <button class="mkt-range">1M</button>
      <button class="mkt-range">3M</button>
      <button class="mkt-range">1A</button>
      <button class="mkt-range">5A</button>
      <button class="mkt-range">Todos</button>
    </div>
    <div class="mkt-chart-actions">
      <button class="mkt-icon-btn" aria-label="Código"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
      <button class="mkt-icon-btn mkt-icon-btn--on" aria-label="Línea"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 17 9 11 13 15 21 7"/></svg></button>
      <button class="mkt-icon-btn" aria-label="Velas"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="4" y="6" width="3" height="12"/><rect x="11" y="3" width="3" height="18"/><rect x="18" y="8" width="3" height="9"/></svg></button>
      <button class="mkt-icon-btn" aria-label="Expandir"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>
    </div>
  </div>`;
}

// Chart axis right (price ticks)
function chartAxis(prices, highlight) {
  return `<div class="mkt-chart-axis">${prices.map(p => p === highlight ? `<div class="mkt-axis-tick mkt-axis-tick--hl">${p}</div>` : `<div class="mkt-axis-tick">${p}</div>`).join('')}</div>`;
}

function chartXAxis(times) {
  return `<div class="mkt-chart-xaxis">${times.map(t => `<span>${t}</span>`).join('')}</div>`;
}

// ---------- DATA ----------

// Figma 25:211262 — 9 indices + "Ver todos los índices" CTA
const INDICES_ES = [
  { logo: '35',  color: '#1e1e1e', symbol: 'IBEX 35',                 badge: 'D', value: '18.384,70', unit: 'POINT', change: -0.01, selected: true, sparkUp: false },
  { logo: 'LX',  color: '#1e4778', symbol: 'Latibex AS',              badge: 'D', value: '2.789,40',  unit: 'POINT', change: -1.07 },
  { logo: 'M',   color: '#1e4778', symbol: 'IBEX Mid Cap',            badge: 'D', value: '19.066,30', unit: 'POINT', change: -0.38 },
  { logo: 'S',   color: '#1e4778', symbol: 'IBEX Small Cap',          badge: 'D', value: '11.010,20', unit: 'POINT', change: -0.11 },
  { logo: 'V',   color: '#246d3f', symbol: 'VIBEX',                   badge: 'D', value: '22,00',     unit: 'POINT', change:  0.46 },
  { logo: 'IG',  color: '#1e1e1e', symbol: 'IGBM (base 1985)',        badge: 'D', value: '1.813,90',  unit: 'POINT', change:  0.01 },
  { logo: 'B',   color: '#c5392f', symbol: 'IBEX 35 bancos',          badge: 'D', value: '1.847,00',  unit: 'POINT', change: -0.27 },
  { logo: 'E',   color: '#cc7722', symbol: 'IBEX 35: energía',        badge: 'D', value: '2.210,90',  unit: 'POINT', change:  1.02 },
  { logo: 'P',   color: '#553300', symbol: 'IGBM: petróleo energía',  badge: 'D', value: '2.855,20',  unit: 'POINT', change:  1.34 },
];

// Figma 25:211563 — 12 world indices + "Ver los principales índices" CTA
const WORLD_INDICES = [
  { logo: '500',    color: '#c5392f', symbol: 'SPX',    badge: 'D', name: 'Índice S&P 500',                          value: '7.473,48',   unit: 'USD',   change:  0.37 },
  { logo: '100',    color: '#0e6cb5', symbol: 'NDX',    badge: 'D', name: 'Índice Nasdaq 100',                       value: '29.481,64',  unit: 'POINT', change:  0.42 },
  { logo: '30',     color: '#3aa1d5', symbol: 'DJI',    badge: 'D', name: 'Índice Dow Jones Industrial Average',     value: '50.579,71',  unit: 'USD',   change:  0.58 },
  { logo: '225',    color: '#3aa1d5', symbol: 'NI225',  badge: 'D', name: 'Índice Japan 225',                        value: '64.995,87',  unit: 'JPY',   change: -0.25 },
  { logo: '100',    color: '#1a4d77', symbol: 'UKX',    badge: 'D', name: 'FTSE 100 Index',                          value: '10.539,03',  unit: 'POINT', change:  0.70 },
  { logo: 'DAX',    color: '#000000', symbol: 'DAX',    badge: 'D', name: 'Índice DAX',                              value: '23.480,12',  unit: 'POINT', change: -0.72 },
  { logo: '40',     color: '#1e4778', symbol: 'PX1',    badge: 'D', name: 'Índice CAC 40',                           value: '8.188,62',   unit: 'POINT', change: -0.84 },
  { logo: 'FTSEMIB',color: '#0e6cb5', symbol: 'FTMIB',  badge: 'D', name: 'Índice Milano Italia Borsa',              value: '36.124,80',  unit: 'EUR',   change: -0.52 },
  { logo: 'SSE',    color: '#cc0000', symbol: '000001', badge: 'D', name: 'SSE Composite Index',                     value: '4.145,3730', unit: 'POINT', change: -0.17 },
  { logo: 'HSI',    color: '#cc0000', symbol: 'HSI',    badge: 'D', name: 'Índice Hang Seng',                        value: '25.599,45',  unit: 'POINT', change: -0.03 },
  { logo: '50',     color: '#1a8d4e', symbol: 'NIFTY',  badge: 'D', name: 'Índice Nifty 50',                         value: '23.921,35',  unit: 'POINT', change: -0.46 },
  { logo: 'BR',     color: '#f7c12e', symbol: 'IBOV',   badge: 'D', name: 'Índice Bovespa',                          value: '177.815,72', unit: 'POINT', change:  0.91 },
];

// Figma 25:211914 — 11 ES stocks featured + "Ver todas las acciones españolas" CTA
const ES_FEATURED = [
  { logo: 'S',    color: '#cc0000', symbol: 'Santander',      badge: 'D', value: '10,798',  unit: 'EUR', change: -0.50, selected: true, sparkUp: false },
  { logo: 'T',    color: '#1e1e1e', symbol: 'Telefónica',     badge: 'D', value: '4,018',   unit: 'EUR', change: -0.99 },
  { logo: 'BB',   color: '#004481', symbol: 'BBVA',           badge: 'D', value: '20,08',   unit: 'EUR', change: -0.05 },
  { logo: 'IB',   color: '#1a8d4e', symbol: 'Iberdrola',      badge: 'D', value: '20,070',  unit: 'EUR', change:  1.72 },
  { logo: 'R',    color: '#ff7f00', symbol: 'Repsol',         badge: 'D', value: '21,91',   unit: 'EUR', change:  0.74 },
  { logo: 'AM',   color: '#0066cc', symbol: 'Amadeus',        badge: 'D', value: '52,78',   unit: 'EUR', change: -0.57 },
  { logo: 'IT',   color: '#1e1e1e', symbol: 'Inditex',        badge: 'D', value: '51,30',   unit: 'EUR', change: -0.58 },
  { logo: 'SAB',  color: '#055093', symbol: 'Banco Sabadell', badge: 'D', value: '3,496',   unit: 'EUR', change:  0.32 },
  { logo: 'CB',   color: '#0072c6', symbol: 'CaixaBank',      badge: 'D', value: '11,655',  unit: 'EUR', change: -0.38 },
  { logo: 'FE',   color: '#003366', symbol: 'Ferrovial',      badge: 'D', value: '59,32',   unit: 'EUR', change: -0.50 },
  { logo: 'AE',   color: '#1e1e1e', symbol: 'Aena',           badge: 'D', value: '24,30',   unit: 'EUR', change: -0.25 },
];

// Figma 25:212259 — 10 community trend tickers
const ES_TENDENCIAS = [
  { logo: 'S',    color: '#cc0000', symbol: 'Banco Santander, S.A.',                  change: -0.50 },
  { logo: 'SAB',  color: '#055093', symbol: 'Banco de Sabadell SA',                   change:  0.32 },
  { logo: 'IB',   color: '#1a8d4e', symbol: 'Iberdrola SA',                           change:  1.72 },
  { logo: 'BB',   color: '#004481', symbol: 'Banco Bilbao Vizcaya Argentaria, S.A.',  change: -0.05 },
  { logo: 'ID',   color: '#000000', symbol: 'Indra Sistemas, S.A. Class A',           change: -0.59 },
  { logo: 'LG',   color: '#cc0000', symbol: 'Logista Integral, S.A.',                 change:  0.54 },
  { logo: 'OH',   color: '#1e1e1e', symbol: 'Obrascon Huarte Lain SA',                change:  1.94 },
  { logo: 'AM',   color: '#1e1e1e', symbol: 'Amper, S.A.',                            change:  0.20 },
  { logo: 'GR',   color: '#1a8d4e', symbol: 'Grifols, S.A. Class A',                  change: -0.91 },
  { logo: 'EN',   color: '#1a8d4e', symbol: 'ENCE Energia y Celulosa SA',             change: -1.77 },
];

// Figma 25:212517 — 6 most-traded stocks (left side of grid)
const ES_VOL = [
  { logo: 'S',    color: '#cc0000', symbol: 'SAN',  name: 'Banco Santander, S.A.',                 change: -0.50, value: '10,798' },
  { logo: 'SAB',  color: '#055093', symbol: 'SAB',  name: 'Banco de Sabadell SA',                  change:  0.32, value: '3,496' },
  { logo: 'IBE',  color: '#1a8d4e', symbol: 'IBE',  name: 'Iberdrola SA',                          change:  1.72, value: '20,070' },
  { logo: 'BBVA', color: '#004481', symbol: 'BBVA', name: 'Banco Bilbao Vizcaya Argentaria, S.A.', change: -0.05, value: '20,08' },
  { logo: 'IDR',  color: '#000000', symbol: 'IDR',  name: 'Indra Sistemas, S.A. Class A',          change: -0.59, value: '53,86' },
  { logo: 'REP',  color: '#ff7f00', symbol: 'REP',  name: 'Repsol SA',                             change:  0.74, value: '21,91' },
];

// Figma 25:212700 — 6 most volatile stocks (right side of grid)
const ES_VOLATILE = [
  { logo: 'CLR',  color: '#1e1e1e', symbol: 'CLR',  name: 'Clerhp Estructuras SA',           change: -1.38, value: '10,70' },
  { logo: 'AGIL', color: '#004481', symbol: 'AGIL', name: 'Agile Content SA',                change:  7.84, value: '2,20' },
  { logo: 'GGR',  color: '#1a8d4e', symbol: 'GGR',  name: 'Greening Group Global S.A.',      change:  0.31, value: '3,26' },
  { logo: 'ADZ',  color: '#1e1e1e', symbol: 'ADZ',  name: 'Adolfo Dominguez, S.A.',          change:  5.50, value: '5,75' },
  { logo: 'OHLA', color: '#1e1e1e', symbol: 'OHLA', name: 'Obrascon Huarte Lain SA',         change:  1.94, value: '0,4940' },
  { logo: 'CITY', color: '#1e1e1e', symbol: 'CITY', name: 'Club De Futbol Intercity SAD',    change: -2.99, value: '0,0324' },
];

// Figma 25:212886 — 6 daily gainers
const ES_GAIN = [
  { logo: 'AGIL', color: '#004481', symbol: 'AGIL', name: 'Agile Content SA',                          change: 7.84, value: '2,20€' },
  { logo: 'ADZ',  color: '#1e1e1e', symbol: 'ADZ',  name: 'Adolfo Dominguez, S.A.',                    change: 5.50, value: '5,75€' },
  { logo: 'ETC',  color: '#1a8d4e', symbol: 'ETC',  name: 'Energy Solar Tech, S.A.',                   change: 4.29, value: '2,19€' },
  { logo: 'VYT',  color: '#2e8ad6', symbol: 'VYT',  name: 'Vytrus Biotech SA',                         change: 3.09, value: '16,70€' },
  { logo: 'LLN',  color: '#1e1e1e', symbol: 'LLN',  name: 'LleidaNetworks Serveis Telematics SA',      change: 2.91, value: '1,060€' },
  { logo: 'GIGA', color: '#0070c0', symbol: 'GIGA', name: 'Gigas Hosting SA',                          change: 2.56, value: '3,20€' },
];

// Figma 25:213074 — 6 daily losers (data approximated, not fully extracted)
const ES_LOSE = [
  { logo: 'CLR',  color: '#1e1e1e', symbol: 'CLR',  name: 'Clerhp Estructuras SA',           change: -1.38, value: '10,70€' },
  { logo: 'GRF',  color: '#1a8d4e', symbol: 'GRF',  name: 'Grifols, S.A. Class A',           change: -0.91, value: '9,608€' },
  { logo: 'ENC',  color: '#1a8d4e', symbol: 'ENC',  name: 'ENCE Energia y Celulosa SA',      change: -1.77, value: '2,440€' },
  { logo: 'CITY', color: '#1e1e1e', symbol: 'CITY', name: 'Club De Futbol Intercity SAD',    change: -2.99, value: '0,0324€' },
  { logo: 'IDR',  color: '#000000', symbol: 'IDR',  name: 'Indra Sistemas, S.A. Class A',    change: -0.59, value: '53,86€' },
  { logo: 'TEF',  color: '#1e1e1e', symbol: 'TEF',  name: 'Telefónica SA',                   change: -0.99, value: '4,018€' },
];

// Figma 25:213267 — 4 earnings calendar cards
const ES_RESULTS = [
  { logo: 'GRE',   color: '#1a8d4e', symbol: 'Grenergy Renovables S.A',     date: 'Hoy',    estim: '−0,58', unit: 'EUR' },
  { logo: 'EDR',   color: '#cc0000', symbol: 'eDreams ODIGEO',              date: '28 may', estim: '0,17',  unit: 'EUR' },
  { logo: 'AEDAS', color: '#1e1e1e', symbol: 'AEDAS Homes SA',              date: '3 jun',  estim: '—',     unit: '' },
  { logo: 'ITX',   color: '#1e1e1e', symbol: 'Industria de Diseno Textil, S.A.', date: '3 jun',  estim: '0,44',  unit: 'EUR' },
];

// Figma 25:213481 — featured 11 stocks ticker carousel
const WORLD_FEATURED = [
  { logo: 'M',  color: '#0078d4', symbol: 'Microsoft',     badge: 'D', value: '418,57', unit: 'USD', change: -0.12, selected: true, sparkUp: false },
  { logo: 'NV', color: '#76b900', symbol: 'NVIDIA',        badge: 'D', value: '215,33', unit: 'USD', change: -1.90 },
  { logo: 'G',  color: '#4285f4', symbol: 'Alphabet',      badge: 'D', value: '379,38', unit: 'USD', change: -1.07 },
  { logo: 'A',  color: '#000000', symbol: 'Apple',         badge: 'D', value: '308,82', unit: 'USD', change:  1.26 },
  { logo: 'AZ', color: '#ff9900', symbol: 'Amazon',        badge: 'D', value: '266,32', unit: 'USD', change: -0.80 },
  { logo: 'AV', color: '#cc0000', symbol: 'Broadcom',      badge: 'D', value: '414,14', unit: 'USD', change: -0.10 },
  { logo: 'AR', color: '#1e1e1e', symbol: 'Saudi Aramco',  badge: 'D', value: '27,90',  unit: 'SAR', change:  0.14 },
  { logo: 'TS', color: '#cc0000', symbol: 'TSMC',          badge: 'D', value: '2.270',  unit: 'TWD', change: -1.73 },
  { logo: 'LV', color: '#000000', symbol: 'LVMH',          badge: 'D', value: '472,25', unit: 'EUR', change: -1.18 },
  { logo: 'TX', color: '#1f3a93', symbol: 'Tencent',       badge: 'D', value: '439,0',  unit: 'HKD', change: -0.54 },
  { logo: 'SS', color: '#1428a0', symbol: 'Samsung',       badge: 'D', value: '299.000',unit: 'KRW', change:  2.22 },
];

// Figma 25:213882 — Las mayores empresas (by market cap) — 6 rows w/ price+change+cap
const WORLD_BIG = [
  { logo: 'NVDA', color: '#76b900', symbol: 'NVDA', name: 'NVIDIA Corporation',     change: -1.90, value: '215,33$', cap: '5,21 T USD' },
  { logo: 'GOOG', color: '#4285f4', symbol: 'GOOG', name: 'Alphabet Inc. Class C',  change: -1.07, value: '379,38$', cap: '4,62 T USD' },
  { logo: 'AAPL', color: '#000000', symbol: 'AAPL', name: 'Apple Inc.',             change:  1.26, value: '308,82$', cap: '4,54 T USD' },
  { logo: 'MSFT', color: '#0078d4', symbol: 'MSFT', name: 'Microsoft Corporation',  change: -0.12, value: '418,57$', cap: '3,11 T USD' },
  { logo: 'AMZN', color: '#ff9900', symbol: 'AMZN', name: 'Amazon.com, Inc.',       change: -0.80, value: '266,32$', cap: '2,86 T USD' },
  { logo: 'AVGO', color: '#cc0000', symbol: 'AVGO', name: 'Broadcom Inc.',          change: -0.10, value: '414,14$', cap: '1,96 T USD' },
];

// Figma 25:214132 — Las mayores empleadoras — 6 rows w/ price+change+employees
const WORLD_EMPLOYERS = [
  { logo: 'WMT',    color: '#0071ce', symbol: 'WMT',    name: 'Walmart Inc.',                  change: -0.88, value: '120,27$', emp: '2,1 M' },
  { logo: 'AMZN',   color: '#ff9900', symbol: 'AMZN',   name: 'Amazon.com, Inc.',              change: -0.80, value: '266,32$', emp: '1,6 M' },
  { logo: 'BYD',    color: '#cc0000', symbol: '002594', name: 'BYD Company Limited Class A',   change:  0.61, value: '96,55¥',  emp: '869,6 K' },
  { logo: 'ACN',    color: '#a100ff', symbol: 'ACN',    name: 'Accenture Plc Class A',         change:  0.77, value: '179,24$', emp: '779 K' },
  { logo: 'JD',     color: '#e30613', symbol: 'JD',     name: 'JD.com, Inc. Sponsored ADR Class A', change: -3.02, value: '30,52$',  emp: '776,7 K' },
  { logo: '2618',   color: '#e30613', symbol: '2618',   name: 'JD Logistics, Inc.',            change: -2.24, value: '13,54 HK$', emp: '682,7 K' },
];

// Figma 25:214375 — Calendario de resultados mundial (data approximated)
const WORLD_RESULTS = [
  { logo: 'NVDA', color: '#76b900', symbol: 'NVIDIA Corporation' },
  { logo: 'CRM',  color: '#00a1e0', symbol: 'Salesforce, Inc.' },
  { logo: 'COST', color: '#005daa', symbol: 'Costco Wholesale Corporation' },
  { logo: 'MRVL', color: '#76b900', symbol: 'Marvell Technology, Inc.' },
];

// Figma 25:214724 — Calendario de OPV (IPO) — data approximated
const WORLD_IPO = [
  { logo: 'KLR',  color: '#1e88e5', symbol: 'KLR Acquisition Corp' },
  { logo: 'GRE',  color: '#1a8d4e', symbol: 'GreenTree Hospitality Group' },
  { logo: 'ASR',  color: '#cc0000', symbol: 'Aestus Resources Corp' },
  { logo: 'FTC',  color: '#003087', symbol: 'FinTech Capital Inc' },
];

// Figma 25:215100 — Cripto featured carousel (11 cards + Ver todas CTA), verbatim
const CRYPTO_FEATURED = [
  { logo: 'B',   color: '#f7931a', symbol: 'Bitcoin',                badge: 'D', value: '76.725,69', unit: 'USD', change: -0.64, selected: true, sparkUp: false },
  { logo: 'E',   color: '#627eea', symbol: 'Ethereum',               badge: 'D', value: '2.096,17',  unit: 'USD', change: -0.67 },
  { logo: 'T',   color: '#26a17b', symbol: 'Tether',                 badge: 'D', value: '0,99887',   unit: 'USD', change: -0.01 },
  { logo: 'BNB', color: '#f0b90b', symbol: 'Binance Coin',           badge: 'D', value: '656,56',    unit: 'USD', change: -0.86 },
  { logo: 'USDC',color: '#2775ca', symbol: 'USD Coin',               badge: 'D', value: '0,99980',   unit: 'USD', change:  0.05 },
  { logo: 'X',   color: '#1e1e1e', symbol: 'XRP',                    badge: 'D', value: '1,3406',    unit: 'USD', change: -0.59 },
  { logo: 'A',   color: '#0033ad', symbol: 'Cardano',                badge: 'D', value: '0,2418',    unit: 'USD', change: -0.62 },
  { logo: 'D',   color: '#c2a633', symbol: 'Dogecoin',               badge: 'D', value: '0,10110',   unit: 'USD', change: -0.91 },
  { logo: 'P',   color: '#8247e5', symbol: 'Polygon (prev. MATIC)',  badge: 'D', value: '0,092621',  unit: 'USD', change: -0.07 },
  { logo: 'S',   color: '#9945ff', symbol: 'Solana',                 badge: 'D', value: '84,407',    unit: 'USD', change: -0.63 },
  { logo: 'TRX', color: '#e50914', symbol: 'Tron',                   badge: 'D', value: '0,37416',   unit: 'USD', change:  0.79 },
];

// Figma 25:215444 — Tendencias de la comunidad (10 trending pairs), verbatim
const CRYPTO_TREND = [
  { logo: 'W',   color: '#000000', symbol: 'WLD / TetherUS',                            change: 10.89 },
  { logo: 'R',   color: '#ff5722', symbol: 'RENDER / TetherUS',                         change:  8.38 },
  { logo: 'E',   color: '#1e1e1e', symbol: 'ESPORTS / TetherUS PERPETUAL CONTRACT',     change: -7.37 },
  { logo: 'N',   color: '#00e599', symbol: 'NEAR / TetherUS',                           change: -1.59 },
  { logo: 'F',   color: '#1e1e1e', symbol: 'Fetch.AI / TetherUS',                       change:  5.57 },
  { logo: 'T',   color: '#0098ea', symbol: 'TON / TetherUS',                            change: -2.48 },
  { logo: 'T',   color: '#1e1e1e', symbol: 'TAO / TetherUS',                            change:  2.22 },
  { logo: 'I',   color: '#0082fa', symbol: 'INJ / TetherUS',                            change: -3.12 },
  { logo: 'U',   color: '#26a17b', symbol: 'Market Cap USDT Dominance, %',              change:  0.57 },
  { logo: 'TRX', color: '#e50914', symbol: 'TRON / TetherUS',                           change:  0.75 },
];

// Figma 25:215690 — Ranking de criptomonedas por cap. de mercado (6), verbatim
const CRYPTO_CAP = [
  { logo: 'B',   color: '#f7931a', symbol: 'BTCUSD', name: 'Bitcoin',     change: -0.65, value: '76.723,48 USD', cap: '1,54 T USD' },
  { logo: 'E',   color: '#627eea', symbol: 'ETHUSD', name: 'Ethereum',    change: -0.67, value: '2.096,17 USD',  cap: '253,01 B USD' },
  { logo: 'T',   color: '#26a17b', symbol: 'USDTUSD',name: 'Tether USDt', change: -0.01, value: '0,99887 USD',   cap: '189,42 B USD' },
  { logo: 'BNB', color: '#f0b90b', symbol: 'BNBUSD', name: 'BNB',         change: -0.86, value: '656,56 USD',    cap: '88,48 B USD' },
  { logo: 'X',   color: '#1e1e1e', symbol: 'XRPUSD', name: 'XRP',         change: -0.59, value: '1,3406 USD',    cap: '82,94 B USD' },
  { logo: 'USDC',color: '#2775ca', symbol: 'USDCUSD',name: 'USDC',        change:  0.05, value: '0,99980 USD',   cap: '76,32 B USD' },
];

// Figma 25:215897 — Clasificación TVL (6), verbatim (note: TVL en Figma, no Y2L)
const CRYPTO_Y2L = [
  { logo: 'M',   color: '#1e1e1e', symbol: 'COOKMUSD',  name: 'mETHProtocol', change:  0.64, value: '0,0028438 USD', cap: '478,47 M USD' },
  { logo: 'Q',   color: '#ff007a', symbol: 'QIUSD',     name: 'BENQI',        change: -3.45, value: '0,0014964 USD', cap: '325,8 M USD' },
  { logo: 'O',   color: '#708090', symbol: 'OHMUSD',    name: 'Olympus v2',   change: -0.09, value: '18,706 USD',    cap: '278,23 M USD' },
  { logo: 'B',   color: '#1e1e1e', symbol: 'BIFIBUSD',  name: 'Beefy',        change:-10.85, value: '38,979 USD',    cap: '127,75 M USD' },
  { logo: 'B',   color: '#1e1e1e', symbol: 'BALUSD',    name: 'Balancer',     change: -0.50, value: '0,14015 USD',   cap: '121,54 M USD' },
  { logo: 'XPR', color: '#9c27b0', symbol: 'XPRUSD',    name: 'XPR Network',  change: -1.99, value: '0,0027051 USD', cap: '96,34 M USD' },
];

// Figma 25:216104 — Criptomonedas ganadoras (6), verbatim
const CRYPTO_GAIN = [
  { logo: 'K',   color: '#1e1e1e', symbol: 'KTAUSD',    name: 'Keeta',                              change: 28.01, value: '0,21732 USD' },
  { logo: 'W',   color: '#000000', symbol: 'WLDWUSD',   name: 'Worldcoin',                          change: 20.67, value: '0,36618 USD' },
  { logo: 'R',   color: '#ff5722', symbol: 'RENDERUSD', name: 'Render',                             change: 18.64, value: '2,3651 USD' },
  { logo: 'F',   color: '#1e1e1e', symbol: 'FETUSD',    name: 'Artificial Superintelligence Alliance', change: 14.64, value: '0,24435 USD' },
  { logo: 'N',   color: '#00e599', symbol: 'NEARUSD',   name: 'NEAR Protocol',                      change: 13.71, value: '2,7251 USD' },
  { logo: 'OKB', color: '#1e1e1e', symbol: 'OKBUSD',    name: 'OKB',                                change: 12.89, value: '94,145 USD' },
];

// Figma 25:216275 — Criptomonedas perdedoras (6), verbatim
const CRYPTO_LOSE = [
  { logo: 'S',   color: '#1e1e1e', symbol: 'SKYAI2USD', name: 'SKYAI',     change: -16.11, value: '0,25660 USD' },
  { logo: 'N',   color: '#1e88e5', symbol: 'NEXUS5USD', name: 'Nexus',     change: -14.26, value: '0,38713e-5 USD' },
  { logo: 'V',   color: '#1e1e1e', symbol: 'VSNUSD',    name: 'Vision',    change: -10.81, value: '0,039349 USD' },
  { logo: 'R',   color: '#9c27b0', symbol: 'RAVEDUSD',  name: 'RaveDAO',   change:  -8.95, value: '0,53013 USD' },
  { logo: 'B',   color: '#cc0000', symbol: 'BEATAUSD',  name: 'Audiera',   change:  -8.03, value: '0,9672 USD' },
  { logo: 'B',   color: '#f0b90b', symbol: 'BUSD',      name: 'BUILDon',   change:  -7.87, value: '0,24053 USD' },
];

const FUT_FEATURED = [
  { logo: 'F', color: '#1e1e1e', symbol: 'Futuros de electricidad base', badge: '', value: '50,61', unit: 'EUR', change: -0.25, selected: true, sparkUp: false },
];

const FUT_ENERGY = [
  { logo: 'C', color: '#1e1e1e', symbol: 'CL', change: -0.04 },
  { logo: 'N', color: '#3aa1d5', symbol: 'NG', change: 4.75 },
  { logo: 'H', color: '#1e1e1e', symbol: 'HO', change: 3.96 },
  { logo: 'B', color: '#003087', symbol: 'BR', change: 1.56 },
  { logo: 'R', color: '#cc0000', symbol: 'RB', change: -1.85 },
  { logo: 'G', color: '#1a8d4e', symbol: 'GASOIL', change: 1.40 },
];

const FUT_AGRO = [
  { logo: 'C', color: '#cc7722', symbol: 'C', change: 0.34 },
  { logo: 'W', color: '#e8b923', symbol: 'W', change: -1.22 },
  { logo: 'S', color: '#1a8d4e', symbol: 'S', change: -0.65 },
  { logo: 'O', color: '#ff9900', symbol: 'O', change: 0.42 },
  { logo: 'C', color: '#4b1818', symbol: 'CC', change: -0.67 },
  { logo: 'L', color: '#c80f2e', symbol: 'LB', change: 0.20 },
];

const FUT_METAL = [
  { logo: 'G', color: '#d4af37', symbol: 'GC', change: 0.65 },
  { logo: 'S', color: '#bcc6cc', symbol: 'SI', change: -0.05 },
  { logo: 'C', color: '#b87333', symbol: 'HG', change: 1.18 },
  { logo: 'P', color: '#a0b0a0', symbol: 'PL', change: -1.85 },
  { logo: 'P', color: '#1e1e1e', symbol: 'PA', change: 0.42 },
  { logo: 'A', color: '#8b8b8b', symbol: 'AL', change: 0.61 },
];

const FUT_INDEX = [
  { logo: 'E', color: '#0e6cb5', symbol: 'ES', change: -0.55 },
  { logo: 'N', color: '#0e6cb5', symbol: 'NQ', change: -0.71 },
  { logo: 'Y', color: '#3aa1d5', symbol: 'YM', change: -0.41 },
  { logo: 'R', color: '#cc0000', symbol: 'RTY', change: -0.62 },
  { logo: 'D', color: '#1e1e1e', symbol: 'DAX', change: -0.43 },
  { logo: 'F', color: '#1f3a93', symbol: 'FTSE', change: -0.21 },
];

const FX_FEATURED = [
  { logo: 'U', color: '#1e1e1e', symbol: 'USD a EUR', badge: '', value: '0,8551', unit: '', change: -0.16, selected: true, sparkUp: false },
  { logo: 'E', color: '#1e4778', symbol: 'EUR/USD', badge: '', value: '1,1695', unit: '', change: 0.16 },
  { logo: 'G', color: '#1e1e1e', symbol: 'GBP/USD', badge: '', value: '1,3252', unit: '', change: -0.05 },
  { logo: 'J', color: '#cc0000', symbol: 'USD/JPY', badge: '', value: '156,72', unit: '', change: -0.05 },
];

const FX_MAIN = [
  { logo: 'E', color: '#1e4778', symbol: 'EURUSD', change: -0.16 },
  { logo: 'G', color: '#1e1e1e', symbol: 'GBPUSD', change: -0.05 },
  { logo: 'U', color: '#cc0000', symbol: 'USDJPY', change: -0.05 },
  { logo: 'U', color: '#1e4778', symbol: 'USDCHF', change: -0.17 },
  { logo: 'A', color: '#1e1e1e', symbol: 'AUDUSD', change: 0.34 },
  { logo: 'U', color: '#cc0000', symbol: 'USDCAD', change: -0.10 },
];

const FX_INDEX = [
  { logo: 'D', color: '#1e1e1e', symbol: 'DXY', change: 0.05 },
  { logo: 'E', color: '#1e4778', symbol: 'EUR', change: -0.13 },
  { logo: 'G', color: '#1e1e1e', symbol: 'GBP', change: -0.06 },
  { logo: 'J', color: '#cc0000', symbol: 'JPY', change: 0.05 },
  { logo: 'C', color: '#cc0000', symbol: 'CAD', change: -0.05 },
  { logo: 'A', color: '#1e1e1e', symbol: 'AUD', change: 0.05 },
];

// ---------- SECTION RENDERERS ----------

function renderPageTitle() {
  return `<div class="mkt-page-title">
    <h1>Mercados, en todas partes<span class="mkt-page-title-chev">›</span></h1>
  </div>`;
}

// Section 1: Índices (chart + carousel) + Índices mundiales (cards)
function renderSecIndices() {
  const cards = INDICES_ES.map(d => tickerCard(d)).join('');
  const ymTicks = ['18.410,00','18.400,00','18.390,00','18.384,90','18.380,00','18.370,00','18.360,00'];
  const xt = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','17:35'];
  const world = WORLD_INDICES.map(d => worldCard(d)).join('');
  return `<section class="mkt-sec">
    ${sectionHeader('Índices')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row">
        ${cards}
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '18.384,90')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>
    <div class="mkt-sub-block">
      ${subHeader('Índices mundiales')}
      <div class="mkt-wcards-row">
        ${world}
        ${scrollBtn('right')}
      </div>
    </div>
  </section>`;
}

// Section 2: Acciones españolas — large section with many tables
function renderSecAccionesES() {
  const featured = ES_FEATURED.map(d => tickerCard(d)).join('');
  const tend = ES_TENDENCIAS.map(d => `<div class="mkt-trend-cell">
    <div class="mkt-trend-head">${logoCircle(d.logo, d.color)}<span class="mkt-trend-name">${d.symbol}</span></div>
    ${pct(d.change)}
  </div>`).join('');
  const colVol = ES_VOL.map(d => listRow(d)).join('');
  const colVolat = ES_VOLATILE.map(d => listRow(d)).join('');
  const colGain = ES_GAIN.map(d => listRow(d)).join('');
  const colLose = ES_LOSE.map(d => listRow(d)).join('');
  const results = ES_RESULTS.map(d => `<div class="mkt-event-card">
    <div class="mkt-event-date">${d.date}</div>
    <div class="mkt-event-head">${logoCircle(d.logo, d.color)}<div class="mkt-event-meta-col"><span class="mkt-event-sym">${d.symbol.split(',')[0].split(' ').slice(0,2).join(' ')}</span><span class="mkt-event-name">${d.symbol}</span></div></div>
    <div class="mkt-event-stats"><div><span class="mkt-event-lbl">Real</span><span class="mkt-event-val">—</span></div><div><span class="mkt-event-lbl">Estimación</span><span class="mkt-event-val">${d.estim} <small>${d.unit}</small></span></div></div>
  </div>`).join('');
  const ymTicks = ['17,10','17,00','16,90','16,798','16,70','16,60','16,50'];
  const xt = ['12:00','13:00','14:00','15:00','16:00','17:00'];
  return `<section class="mkt-sec">
    ${sectionHeader('Acciones españolas')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row">
        ${featured}
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '16,798')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Tendencias de la comunidad')}
      <div class="mkt-trend-row">${tend}${scrollBtn('right')}</div>
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Acciones con el mayor volumen')}
        <div class="mkt-2col">${colVol.split('</div></div>').slice(0,3).join('</div></div>') + '</div></div>'}${colVol.split('</div></div>').slice(3).join('</div></div>')}</div>
        <a class="mkt-more-link" href="#">Ver todas las acciones más negociadas ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Acciones más volátiles')}
        <div class="mkt-2col">${colVolat.split('</div></div>').slice(0,3).join('</div></div>') + '</div></div>'}${colVolat.split('</div></div>').slice(3).join('</div></div>')}</div>
        <a class="mkt-more-link" href="#">Ver todas las acciones con mayores variaciones de precio ›</a>
      </div>
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Acciones ganadoras')}
        <div class="mkt-list">${colGain}</div>
        <a class="mkt-more-link" href="#">Ver todas las acciones con mayor crecimiento diario ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Acciones perdedoras')}
        <div class="mkt-list">${colLose}</div>
        <a class="mkt-more-link" href="#">Ver todas las acciones con mayor caída diaria ›</a>
      </div>
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Calendario de resultados')}
      <div class="mkt-events-row">${results}${scrollBtn('right')}</div>
      <a class="mkt-more-link" href="#">Ver todos los eventos ›</a>
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Calendario de las OPV')}
      <div class="mkt-empty">
        <div class="mkt-empty-icon">
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#3a3a3a" stroke-width="2"><circle cx="32" cy="32" r="18"/><circle cx="26" cy="28" r="2" fill="#3a3a3a"/><circle cx="38" cy="28" r="2" fill="#3a3a3a"/><path d="M24 40c2-2 6-2 8-2s6 0 8 2"/></svg>
        </div>
        <div class="mkt-empty-text">Aún no hay informes programados</div>
      </div>
      <a class="mkt-more-link" href="#">Ver todos los eventos ›</a>
    </div>
  </section>`;
}

// Section 3: Acciones mundiales
function renderSecAccionesWorld() {
  const featured = WORLD_FEATURED.map(d => tickerCard(d)).join('');
  const colBig = WORLD_BIG.map(d => listRow(d)).join('');
  const colEmp = WORLD_EMPLOYERS.map(d => listRow(d)).join('');
  const results = WORLD_RESULTS.map(d => `<div class="mkt-event-card">
    <div class="mkt-event-head">${logoCircle(d.logo, d.color)}<span class="mkt-event-sym">${d.symbol}</span></div>
    <div class="mkt-event-meta"><span>Real</span><span>Estimación</span></div>
  </div>`).join('');
  const ipos = WORLD_IPO.map(d => `<div class="mkt-event-card">
    <div class="mkt-event-head">${logoCircle(d.logo, d.color)}<span class="mkt-event-sym">${d.symbol}</span></div>
    <div class="mkt-event-meta"><span>Precio</span><span>Volumen</span></div>
  </div>`).join('');
  const ymTicks = ['640,00','630,00','620,00','618,57','610,00','600,00','590,00'];
  const xt = ['09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:00'];
  return `<section class="mkt-sec">
    ${sectionHeader('Acciones mundiales')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row">
        ${featured}
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '618,57')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Las mayores empresas del mundo')}
        <div class="mkt-list">${colBig}</div>
        <a class="mkt-more-link" href="#">Ver las principales empresas del mundo ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Las mayores empleadoras del mundo')}
        <div class="mkt-list">${colEmp}</div>
        <a class="mkt-more-link" href="#">Ver los mayores empleadores del mundo ›</a>
      </div>
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Calendario de resultados')}
      <div class="mkt-events-row">${results}${scrollBtn('right')}</div>
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Calendario de las OPV')}
      <div class="mkt-events-row">${ipos}${scrollBtn('right')}</div>
    </div>
  </section>`;
}

// Section 4: Cripto
function renderSecCrypto() {
  const featured = CRYPTO_FEATURED.map(d => tickerCard(d)).join('');
  const trend = CRYPTO_TREND.map(d => `<div class="mkt-trend-cell">
    <div class="mkt-trend-head">${logoCircle(d.logo, d.color)}<span class="mkt-trend-name">${d.symbol}</span></div>
    ${pct(d.change)}
  </div>`).join('');
  const colCap = CRYPTO_CAP.map(d => listRow(d)).join('');
  const colY2L = CRYPTO_Y2L.map(d => listRow(d)).join('');
  const colGain = CRYPTO_GAIN.map(d => listRow(d)).join('');
  const colLose = CRYPTO_LOSE.map(d => listRow(d)).join('');
  const ymTicks = ['94.000','93.500','93.000','92.518','92.000','91.500','91.000'];
  const xt = ['00:00','04:00','08:00','12:00','16:00','20:00'];
  return `<section class="mkt-sec">
    ${sectionHeader('Cripto')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row">
        ${featured}
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '92.518')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>

    <div class="mkt-sub-block">
      ${subHeader('Tendencias de la comunidad')}
      <div class="mkt-trend-row">${trend}${scrollBtn('right')}</div>
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Ranking de criptomonedas por cap. de mercado')}
        <div class="mkt-list">${colCap}</div>
        <a class="mkt-more-link" href="#">Ver todas las criptomonedas ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Clasificación Y2L')}
        <div class="mkt-list">${colY2L}</div>
        <a class="mkt-more-link" href="#">Ver todas las monedas con mejor rendimiento ›</a>
      </div>
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Criptomonedas ganadoras')}
        <div class="mkt-list">${colGain}</div>
        <a class="mkt-more-link" href="#">Ver todas las criptomonedas con mayor crecimiento ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Criptomonedas perdedoras')}
        <div class="mkt-list">${colLose}</div>
        <a class="mkt-more-link" href="#">Ver todas las criptomonedas con mayor caída ›</a>
      </div>
    </div>
  </section>`;
}

// Section 5: Futuros y materias primas
function renderSecFutures() {
  const featured = FUT_FEATURED.map(d => tickerCard(d)).join('');
  const colE = FUT_ENERGY.map(d => listRow(d)).join('');
  const colA = FUT_AGRO.map(d => listRow(d)).join('');
  const colM = FUT_METAL.map(d => listRow(d)).join('');
  const colI = FUT_INDEX.map(d => listRow(d)).join('');
  const ymTicks = ['52,00','51,50','51,00','50,61','50,00','49,50'];
  const xt = ['09:00','11:00','13:00','15:00','17:00'];
  return `<section class="mkt-sec">
    ${sectionHeader('Futuros y materias primas')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row mkt-tcards-row--sparse">
        ${featured}
        <button class="mkt-allfut-btn">Ver todos los futuros ›</button>
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '50,61')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Futuros de energía')}
        <div class="mkt-list">${colE}</div>
        <a class="mkt-more-link" href="#">Ver todos los futuros de energía ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Futuros agrícolas')}
        <div class="mkt-list">${colA}</div>
        <a class="mkt-more-link" href="#">Ver todos los futuros agrícolas ›</a>
      </div>
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Futuros de metales')}
        <div class="mkt-list">${colM}</div>
        <a class="mkt-more-link" href="#">Ver todos los futuros de metales ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Futuros sobre índices')}
        <div class="mkt-list">${colI}</div>
        <a class="mkt-more-link" href="#">Ver todos los futuros sobre índices ›</a>
      </div>
    </div>
  </section>`;
}

// Section 6: Forex y divisas
function renderSecForex() {
  const featured = FX_FEATURED.map(d => tickerCard(d)).join('');
  const colM = FX_MAIN.map(d => listRow(d)).join('');
  const colI = FX_INDEX.map(d => listRow(d)).join('');
  const ymTicks = ['0,860','0,857','0,855','0,8551','0,853','0,851'];
  const xt = ['00:00','04:00','08:00','12:00','16:00','20:00'];
  return `<section class="mkt-sec">
    ${sectionHeader('Forex y divisas')}
    <div class="mkt-chart-block">
      <div class="mkt-tcards-row">
        ${featured}
        ${scrollBtn('right')}
      </div>
      <div class="mkt-chart-area">
        ${bigChart(false)}
        ${chartAxis(ymTicks, '0,8551')}
      </div>
      ${chartXAxis(xt)}
      ${chartToolbar()}
    </div>

    <div class="mkt-grid-2">
      <div class="mkt-table-block">
        ${subHeader('Principales')}
        <div class="mkt-list">${colM}</div>
        <a class="mkt-more-link" href="#">Ver todos los índices de divisas ›</a>
      </div>
      <div class="mkt-table-block">
        ${subHeader('Índices de divisas')}
        <div class="mkt-list">${colI}</div>
        <a class="mkt-more-link" href="#">Ver todos los índices de divisas ›</a>
      </div>
    </div>
  </section>`;
}

// ---------- ENTRY ----------
export function renderMarketsTop(mount) {
  mount.innerHTML = `<div class="mkt-page">
    ${renderPageTitle()}
    <div class="mkt-sections">
      ${renderSecIndices()}
      ${renderSecAccionesES()}
      ${renderSecAccionesWorld()}
      ${renderSecCrypto()}
      ${renderSecFutures()}
      ${renderSecForex()}
    </div>
  </div>`;
}
