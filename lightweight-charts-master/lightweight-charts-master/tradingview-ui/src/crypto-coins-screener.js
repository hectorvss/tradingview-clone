// crypto-coins-screener.js — Analizador de CEX / Todos los pares (cripto)
// Réplica del frame Figma 11:121572 (https://es.tradingview.com/cex-screener/).
//
// Public API:
//   createCryptoCoinsScreener(mountEl, opts = {}) -> { destroy() }
//
// opts.onSelectSymbol(ticker) — callback al hacer clic en una fila / ticker.
//
// Datos hardcodeados desde el Figma (sin aleatorios).

const STYLE_ATTR = 'data-tvcryp-styles';

// ---------------------------------------------------------------------------
// CSS (scope .tvcryp-*)
// ---------------------------------------------------------------------------
const CSS = `
.tvcryp-root {
  font-family: 'Trebuchet MS', Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #dbdbdb;
  background: #0f0f0f;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.tvcryp-root *, .tvcryp-root *::before, .tvcryp-root *::after { box-sizing: border-box; }

/* ---------- Header (TradingView top bar) ---------- */
.tvcryp-header {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #0f0f0f;
  border-bottom: 1px solid #2e2e2e;
}
.tvcryp-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
}
.tvcryp-logo-mark {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #2962ff;
}
.tvcryp-search {
  margin-left: 32px;
  width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e1e1e;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  padding: 0 12px;
  color: #8c8c8c;
  font-size: 13px;
  cursor: text;
}
.tvcryp-search .tvcryp-kbd {
  margin-left: auto;
  font-size: 11px;
  color: #636363;
  border: 1px solid #2e2e2e;
  border-radius: 3px;
  padding: 1px 5px;
}
.tvcryp-mainmenu {
  display: flex;
  align-items: center;
  margin-left: 12px;
  gap: 0;
}
.tvcryp-mainmenu-item {
  padding: 0 12px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: #dbdbdb;
  cursor: pointer;
  border-radius: 6px;
}
.tvcryp-mainmenu-item.is-active { color: #2962ff; }
.tvcryp-mainmenu-item:hover { background: #1e1e1e; }
.tvcryp-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tvcryp-icon-btn {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: #b8b8b8;
  border-radius: 6px;
  cursor: pointer;
}
.tvcryp-icon-btn:hover { background: #1e1e1e; }
.tvcryp-cta {
  height: 40px;
  padding: 0 14px;
  background: #2962ff;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.tvcryp-cta:hover { background: #1e53e5; }

/* ---------- Page wrap ---------- */
.tvcryp-page {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---------- Breadcrumb ---------- */
.tvcryp-breadcrumb {
  height: 30px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #8c8c8c;
}

/* ---------- Topbar (title + right controls) ---------- */
.tvcryp-topbar {
  height: 54px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tvcryp-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
}
.tvcryp-title {
  font-size: 24px;
  line-height: 28px;
  font-weight: 700;
  color: #dbdbdb;
}
.tvcryp-title .tvcryp-caret {
  margin-left: 6px;
  color: #8c8c8c;
  font-size: 14px;
}
.tvcryp-topbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tvcryp-ctrl-btn {
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #b8b8b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.tvcryp-ctrl-btn:hover { background: #1e1e1e; }
.tvcryp-ctrl-group {
  display: flex;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  overflow: hidden;
}
.tvcryp-ctrl-group .tvcryp-ctrl-btn {
  border-radius: 0;
  border: none;
}
.tvcryp-ctrl-group .tvcryp-ctrl-btn + .tvcryp-ctrl-btn {
  border-left: 1px solid #2e2e2e;
}

/* ---------- Filters (pills) ---------- */
.tvcryp-filters {
  padding: 4px 20px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 7px;
}
.tvcryp-pill {
  height: 34px;
  padding: 0 12px;
  background: #1e1e1e;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  color: #dbdbdb;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.tvcryp-pill:hover { background: #252525; border-color: #3d3d3d; }
.tvcryp-pill .tvcryp-pill-label { color: #8c8c8c; }
.tvcryp-pill .tvcryp-pill-value { color: #dbdbdb; }
.tvcryp-pill .tvcryp-pill-caret { color: #8c8c8c; margin-left: 2px; }
.tvcryp-pill-icon {
  display: inline-flex;
  width: 16px; height: 16px;
  color: #b8b8b8;
}
.tvcryp-pill-star { color: #f0b90a; }

.tvcryp-filters-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

/* ---------- Control panel (tabs + segmented) ---------- */
.tvcryp-controlpanel {
  height: 58px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tvcryp-segmented {
  display: inline-flex;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  height: 34px;
  padding: 3px;
  gap: 0;
}
.tvcryp-segmented button {
  width: 28px; height: 28px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #8c8c8c;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.tvcryp-segmented button.is-active {
  background: #2e2e2e;
  color: #dbdbdb;
}
.tvcryp-vsep {
  width: 1px;
  height: 28px;
  background: #2e2e2e;
  margin: 0 4px;
}
.tvcryp-tabs {
  display: inline-flex;
  height: 34px;
  gap: 0;
  align-items: stretch;
}
.tvcryp-tab {
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  height: 34px;
  font-size: 14px;
  color: #8c8c8c;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.tvcryp-tab.is-active {
  background: #2e2e2e;
  color: #dbdbdb;
  font-weight: 700;
}
.tvcryp-tab:hover:not(.is-active) { color: #dbdbdb; }
.tvcryp-headercontrols {
  margin-left: auto;
}

/* ---------- Table ---------- */
.tvcryp-tablewrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border-top: 1px solid #2e2e2e;
}
.tvcryp-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  min-width: 1395px;
}
.tvcryp-table th, .tvcryp-table td {
  border-bottom: 0.8px solid #2e2e2e;
  padding: 8px 12px;
  font-size: 14px;
  color: #dbdbdb;
  vertical-align: middle;
  white-space: nowrap;
}
.tvcryp-table thead th {
  position: sticky;
  top: 0;
  background: #0f0f0f;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 400;
  text-align: right;
  height: 50px;
  padding: 8px 12px;
  z-index: 2;
}
.tvcryp-table th.tvcryp-th-symbol {
  text-align: left;
  position: sticky; left: 0; z-index: 3;
  background: #0f0f0f;
  padding-left: 20px;
}
.tvcryp-th-inner {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  line-height: 14px;
}
.tvcryp-th-symbol .tvcryp-th-inner {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.tvcryp-th-sub {
  font-size: 10px;
  text-transform: uppercase;
  color: #636363;
  letter-spacing: 0.3px;
}
.tvcryp-th-sort-icon {
  color: #b8b8b8;
  display: inline-flex;
}

/* col widths */
.tvcryp-table col.tvcryp-col-symbol     { width: 422.71px; }
.tvcryp-table col.tvcryp-col-market     { width: 176.51px; }
.tvcryp-table col.tvcryp-col-price      { width: 166.03px; }
.tvcryp-table col.tvcryp-col-change     { width: 95.7px;   }
.tvcryp-table col.tvcryp-col-vol        { width: 131.84px; }
.tvcryp-table col.tvcryp-col-volch      { width: 179.34px; }
.tvcryp-table col.tvcryp-col-tech       { width: 178.07px; }
.tvcryp-table col.tvcryp-col-plus       { width: 44.8px;   }

.tvcryp-table tbody tr { height: 40.8px; }
.tvcryp-table tbody tr:hover td { background: #161616; }
.tvcryp-table tbody tr:hover td.tvcryp-td-symbol { background: #161616; }

.tvcryp-td-symbol {
  position: sticky;
  left: 0;
  background: #000000;
  padding-left: 20px !important;
  z-index: 1;
}
.tvcryp-symbol-inner {
  display: flex;
  align-items: center;
  gap: 0;
}
.tvcryp-coin-icon {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 24px;
  margin-right: 12px;
  overflow: hidden;
}
.tvcryp-coin-icon img { width: 24px; height: 24px; display: block; }
.tvcryp-ticker {
  background: #2e2e2e;
  color: #dbdbdb;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  line-height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  min-width: 56px;
  max-width: 120px;
  text-align: center;
  display: inline-block;
  cursor: pointer;
}
.tvcryp-ticker:hover { background: #3a3a3a; }
.tvcryp-symname {
  margin-left: 12px;
  font-size: 14px;
  line-height: 18px;
  color: #dbdbdb;
  cursor: pointer;
}
.tvcryp-symname:hover { color: #ffffff; text-decoration: underline; }

.tvcryp-td-market {
  text-align: left;
}
.tvcryp-market-inner {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.tvcryp-ex-icon {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 24px;
  overflow: hidden;
}
.tvcryp-ex-icon img { width: 24px; height: 24px; display: block; border-radius: 50%; }

.tvcryp-td-price {
  text-align: right;
}
.tvcryp-td-price .tvcryp-price-value { display: inline-block; }
.tvcryp-td-price .tvcryp-price-ccy {
  font-size: 10px;
  text-transform: uppercase;
  color: #636363;
  margin-left: 3px;
}
.tvcryp-td-change, .tvcryp-td-vol, .tvcryp-td-volch { text-align: right; }
.tvcryp-up   { color: #22ab94; }
.tvcryp-down { color: #f7525f; }
.tvcryp-neutral { color: #8c8c8c; }

.tvcryp-td-tech {
  text-align: left;
}
.tvcryp-tech-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tvcryp-tech-icon { width: 18px; height: 18px; display: inline-flex; }

.tvcryp-td-plus {
  text-align: center;
}
.tvcryp-plus-btn {
  width: 40px; height: 40px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #8c8c8c;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.tvcryp-plus-btn:hover { background: #1e1e1e; color: #dbdbdb; }

/* ---------- Right sidebar (icons) ---------- */
.tvcryp-shell {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.tvcryp-content { flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.tvcryp-sidebar {
  flex: 0 0 45px;
  background: #0f0f0f;
  border-left: 1px solid #2e2e2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  gap: 4px;
}
.tvcryp-sidebar button {
  width: 34px; height: 34px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #b8b8b8;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.tvcryp-sidebar button:hover { background: #1e1e1e; color: #dbdbdb; }
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`style[${STYLE_ATTR}]`)) return;
  const s = document.createElement('style');
  s.setAttribute(STYLE_ATTR, '');
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Iconos SVG inline
// ---------------------------------------------------------------------------
const ICON = {
  search:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  bell:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  caret:   '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 4l3 3 3-3z"/></svg>',
  star:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  filter:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>',
  plus:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  more:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  fs:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></svg>',
  grid:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  list:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  cog:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.39 17l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  arrowDn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  techNeutral: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#8c8c8c" stroke-width="2"><line x1="4" y1="7" x2="14" y2="7"/><line x1="4" y1="11" x2="14" y2="11"/></svg>',
  techSell: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f7525f" stroke-width="2"><path d="M5 7l4 4 4-4"/></svg>',
  techBuy: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#22ab94" stroke-width="2"><path d="M5 11l4-4 4 4"/></svg>',
  brand:   '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 6h10v4h-3v12h-4V10h-3V6z" fill="#ffffff"/><circle cx="6" cy="10" r="4" fill="#2962ff"/><path d="M2 18h8v4H2z" fill="#22ab94"/></svg>',
};

// Crypto coin icons (official SVG logos)
const COIN_ASSETS = {
  BTC: '/assets/crypto-screener/coins/btc.svg',
  ETH: '/assets/crypto-screener/coins/eth.svg',
};
function coinIconHTML(symbol) {
  let key = null;
  if (symbol.startsWith('BTC')) key = 'BTC';
  else if (symbol.startsWith('ETH')) key = 'ETH';
  const src = key ? COIN_ASSETS[key] : null;
  if (src) return `<span class="tvcryp-coin-icon"><img src="${src}" alt="${key}" loading="lazy"></span>`;
  return `<span class="tvcryp-coin-icon" style="background:#4a4a4a;color:#fff;font-weight:700;font-size:12px;">${symbol[0]}</span>`;
}

// Exchange icons — favicons oficiales descargados de cada exchange (PNG via
// DuckDuckGo icon proxy / favicon oficial) + SVG Simple Icons para
// Binance/Coinbase. Cobertura 10/10 con assets reales.
const EXCHANGE_ASSETS = {
  'Binance':  '/assets/crypto-screener/exchanges/binance.svg',
  'Toobit':   '/assets/crypto-screener/exchanges/toobit.png',
  'OKX':      '/assets/crypto-screener/exchanges/okx.png',
  'WhiteBIT': '/assets/crypto-screener/exchanges/whitebit.png',
  'CoinW':    '/assets/crypto-screener/exchanges/coinw.png',
  'Bybit':    '/assets/crypto-screener/exchanges/bybit.png',
  'Pionex':   '/assets/crypto-screener/exchanges/pionex.png',
  'KCEX':     '/assets/crypto-screener/exchanges/kcex.png',
  'Coinbase': '/assets/crypto-screener/exchanges/coinbase.png',
  'Bitget':   '/assets/crypto-screener/exchanges/bitget.png',
};

function exchangeIconHTML(name) {
  const src = EXCHANGE_ASSETS[name];
  if (src) return `<span class="tvcryp-ex-icon"><img src="${src}" alt="${name}" loading="lazy"></span>`;
  return `<span class="tvcryp-ex-icon" style="background:#4a4a4a;color:#fff;font-size:11px;font-weight:700;">${name[0]}</span>`;
}

// ---------------------------------------------------------------------------
// Datos exactos del Figma (14 filas visibles)
// ---------------------------------------------------------------------------
const ROWS = [
  { ticker: 'BTCUSDT.P',  name: 'Bitcoin / TetherUS PERPETUAL CONTRACT',  ex: 'Binance',  price: '77.478,2', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '6,62 B', volch: '−31,08%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'ETHUSDT.P',  name: 'Ethereum / TetherUS PERPETUAL CONTRACT', ex: 'Binance',  price: '2.120,46', ccy: 'USDT', chg: '+1,69%', chgDir: 'up',   vol: '5,33 B', volch: '−35,10%', volchDir: 'down', tech: 'Venta',   techDir: 'sell' },
  { ticker: 'BTCUSDT.P',  name: 'Bitcoin/TetherUS',                       ex: 'Toobit',   price: '77.485,0', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '4,79 B', volch: '−5,66%',  volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'ETHUSDT.P',  name: 'ETHUSDT Perpetual Swap Contract',        ex: 'OKX',      price: '2.120,31', ccy: 'USDT', chg: '+1,68%', chgDir: 'up',   vol: '4,63 B', volch: '−30,66%', volchDir: 'down', tech: 'Venta',   techDir: 'sell' },
  { ticker: 'BTCUSDT.P',  name: 'BTCUSDT Perpetual Swap Contract',        ex: 'OKX',      price: '77.477,0', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '4,31 B', volch: '−25,71%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDT.P',  name: 'Bitcoin perpetual contract',             ex: 'WhiteBIT', price: '77.494,5', ccy: 'USDT', chg: '+1,62%', chgDir: 'up',   vol: '3,55 B', volch: '−14,61%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDT.P',  name: 'BTC/USD PERPETUAL SWAP CONTRACT',        ex: 'CoinW',    price: '77.485,0', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '3,53 B', volch: '−23,50%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDT.P',  name: 'BTCUSDT Perpetual Contract',             ex: 'Bybit',    price: '77.485,5', ccy: 'USDT', chg: '+1,66%', chgDir: 'up',   vol: '3,22 B', volch: '−28,21%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'ETHUSDT.P',  name: 'Ethereum/TetherUS',                      ex: 'Toobit',   price: '2.120,25', ccy: 'USDT', chg: '+1,69%', chgDir: 'up',   vol: '3,11 B', volch: '−8,79%',  volchDir: 'down', tech: 'Venta',   techDir: 'sell' },
  { ticker: 'BTCUSDT.P',  name: 'BTC USDT PERPETUAL',                     ex: 'Pionex',   price: '77.485,0', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '2,87 B', volch: '−23,52%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDT.P',  name: 'BITCOIN / USDT PERPETUAL SWAP CONTRACT', ex: 'KCEX',     price: '77.481,3', ccy: 'USDT', chg: '+1,64%', chgDir: 'up',   vol: '2,79 B', volch: '−16,80%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDC.P',  name: 'BTC / USDC PERPETUAL CONTRACT',          ex: 'Coinbase', price: '77.443,0', ccy: 'USDC', chg: '+1,69%', chgDir: 'up',   vol: '2,75 B', volch: '−4,98%',  volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'BTCUSDT.P',  name: 'BTCUSDTPERP PERPETUAL MIX CONTRACT',     ex: 'Bitget',   price: '77.484,4', ccy: 'USDT', chg: '+1,63%', chgDir: 'up',   vol: '2,4 B',  volch: '−25,80%', volchDir: 'down', tech: 'Neutral', techDir: 'neutral' },
  { ticker: 'ETHUSDC.P',  name: 'ETH / USDC PERPETUAL CONTRACT',          ex: 'Coinbase', price: '2.119,84', ccy: 'USDC', chg: '+1,72%', chgDir: 'up',   vol: '2,36 B', volch: '+2,24%',  volchDir: 'up',   tech: 'Venta',   techDir: 'sell' },
];

// Filtros (fila 1 + fila 2). Etiqueta + valor.
const FILTERS_R1 = [
  { icon: 'star', label: 'Lista de seguimiento', value: '' },
  { label: 'Mercado bursátil',     value: '' },
  { label: 'Tipo de símbolo',      value: '' },
  { label: 'Divisa de referencia', value: '' },
  { label: 'Moneda de cotización', value: '' },
  { label: 'Cbo %',                value: '' },
  { label: 'Rend. %',              value: '' },
];
const FILTERS_R2 = [
  { label: 'Vol en USD',          value: '' },
  { label: 'Cambio de vol. %',    value: '' },
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function techIcon(dir) {
  if (dir === 'sell')    return ICON.techSell;
  if (dir === 'buy')     return ICON.techBuy;
  return ICON.techNeutral;
}
function techCls(dir) {
  if (dir === 'sell') return 'tvcryp-down';
  if (dir === 'buy')  return 'tvcryp-up';
  return 'tvcryp-neutral';
}

function renderHeader() {
  return `
<div class="tvcryp-header">
  <div class="tvcryp-logo">
    <span class="tvcryp-logo-mark">${ICON.brand}</span>
    <span>TradingView</span>
  </div>
  <div class="tvcryp-search">
    ${ICON.search}
    <span>Buscar (Ctrl+K)</span>
  </div>
  <nav class="tvcryp-mainmenu">
    <span class="tvcryp-mainmenu-item is-active">Productos</span>
    <span class="tvcryp-mainmenu-item">Comunidad</span>
    <span class="tvcryp-mainmenu-item">Mercados</span>
    <span class="tvcryp-mainmenu-item">Brokers</span>
    <span class="tvcryp-mainmenu-item">Más</span>
  </nav>
  <div class="tvcryp-header-right">
    <button class="tvcryp-icon-btn" aria-label="Notificaciones">${ICON.bell}</button>
    <button class="tvcryp-cta">¡Empieza!</button>
  </div>
</div>`;
}

function renderPill(p) {
  return `<button class="tvcryp-pill" type="button">
    ${p.icon === 'star' ? `<span class="tvcryp-pill-icon tvcryp-pill-star">${ICON.star}</span>` : ''}
    <span class="tvcryp-pill-label">${p.label}</span>
    <span class="tvcryp-pill-caret">${ICON.caret}</span>
  </button>`;
}

function renderFilters() {
  return `
<div class="tvcryp-filters">
  ${FILTERS_R1.map(renderPill).join('')}
</div>
<div class="tvcryp-filters">
  ${FILTERS_R2.map(renderPill).join('')}
  <div class="tvcryp-filters-controls">
    <button class="tvcryp-ctrl-btn" aria-label="Filtrar">${ICON.filter}</button>
    <button class="tvcryp-ctrl-btn" aria-label="Más">${ICON.more}</button>
  </div>
</div>`;
}

function renderControlPanel() {
  return `
<div class="tvcryp-controlpanel">
  <div class="tvcryp-segmented" role="tablist">
    <button class="is-active" aria-label="Vista de tabla">${ICON.list}</button>
    <button aria-label="Vista de cuadrícula">${ICON.grid}</button>
  </div>
  <div class="tvcryp-vsep"></div>
  <div class="tvcryp-tabs" role="tablist">
    <button class="tvcryp-tab is-active" data-tab="summary">Resumen</button>
    <button class="tvcryp-tab" data-tab="performance">Rendimiento</button>
    <button class="tvcryp-tab" data-tab="technicals">Datos técnicos</button>
  </div>
  <div class="tvcryp-headercontrols">
    <button class="tvcryp-ctrl-btn" aria-label="Configuración">${ICON.cog}</button>
  </div>
</div>`;
}

function renderTopbar() {
  return `
<div class="tvcryp-topbar">
  <div class="tvcryp-title-wrap">
    <span class="tvcryp-title">Todos los pares</span>
    <span class="tvcryp-caret">${ICON.caret}</span>
  </div>
  <div class="tvcryp-topbar-controls">
    <div class="tvcryp-ctrl-group">
      <button class="tvcryp-ctrl-btn" aria-label="Ajustes">${ICON.cog}</button>
      <button class="tvcryp-ctrl-btn" aria-label="Más">${ICON.more}</button>
    </div>
    <button class="tvcryp-ctrl-btn" aria-label="Pantalla completa">${ICON.fs}</button>
  </div>
</div>`;
}

function renderTable() {
  const headers = [
    { key: 'symbol',  label: 'Símbolo',           sub: '40730',    cls: 'tvcryp-th-symbol' },
    { key: 'market',  label: 'Mercado bursátil',  sub: '',         cls: '' },
    { key: 'price',   label: 'Precio',            sub: '',         cls: '' },
    { key: 'chg',     label: 'Cbo %',             sub: '24h',      cls: '' },
    { key: 'vol',     label: 'Vol en USD',        sub: '24h',      cls: '', sort: true },
    { key: 'volch',   label: 'Cambio de vol. %',  sub: '24h',      cls: '' },
    { key: 'tech',    label: 'Val. técnica',      sub: '',         cls: '' },
  ];

  const headHTML = headers.map(h => `
    <th class="${h.cls}">
      <span class="tvcryp-th-inner">
        ${h.sort ? `<span class="tvcryp-th-sort-icon">${ICON.arrowDn}</span>` : ''}
        <span>${h.label}</span>
        ${h.sub ? `<span class="tvcryp-th-sub">${h.sub}</span>` : ''}
      </span>
    </th>`).join('');

  const bodyHTML = ROWS.map((r, i) => `
    <tr data-row="${i}" data-ticker="${r.ticker}">
      <td class="tvcryp-td-symbol">
        <div class="tvcryp-symbol-inner">
          ${coinIconHTML(r.ticker)}
          <span class="tvcryp-ticker">${r.ticker}</span>
          <span class="tvcryp-symname">${r.name}</span>
        </div>
      </td>
      <td class="tvcryp-td-market">
        <span class="tvcryp-market-inner">
          ${exchangeIconHTML(r.ex)}
          <span>${r.ex}</span>
        </span>
      </td>
      <td class="tvcryp-td-price">
        <span class="tvcryp-price-value">${r.price}</span><span class="tvcryp-price-ccy">${r.ccy}</span>
      </td>
      <td class="tvcryp-td-change tvcryp-${r.chgDir}">${r.chg}</td>
      <td class="tvcryp-td-vol">${r.vol}</td>
      <td class="tvcryp-td-volch tvcryp-${r.volchDir}">${r.volch}</td>
      <td class="tvcryp-td-tech">
        <span class="tvcryp-tech-inner">
          <span class="tvcryp-tech-icon">${techIcon(r.techDir)}</span>
          <span class="${techCls(r.techDir)}">${r.tech}</span>
        </span>
      </td>
    </tr>`).join('');

  return `
<div class="tvcryp-tablewrap">
  <table class="tvcryp-table">
    <colgroup>
      <col class="tvcryp-col-symbol">
      <col class="tvcryp-col-market">
      <col class="tvcryp-col-price">
      <col class="tvcryp-col-change">
      <col class="tvcryp-col-vol">
      <col class="tvcryp-col-volch">
      <col class="tvcryp-col-tech">
      <col class="tvcryp-col-plus">
    </colgroup>
    <thead>
      <tr>
        ${headHTML}
        <th class="tvcryp-td-plus"><button class="tvcryp-plus-btn" aria-label="Añadir columna">${ICON.plus}</button></th>
      </tr>
    </thead>
    <tbody>
      ${bodyHTML}
    </tbody>
  </table>
</div>`;
}

function renderSidebar() {
  // 8 small icons in a column, taken from Figma right rail
  const items = ['list', 'star', 'bell', 'cog', 'grid', 'more', 'filter', 'fs'];
  return `<aside class="tvcryp-sidebar">
    ${items.map(k => `<button aria-label="${k}">${ICON[k]}</button>`).join('')}
  </aside>`;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------
export function createCryptoCoinsScreener(mountEl, opts = {}) {
  if (!mountEl) throw new Error('createCryptoCoinsScreener: mountEl is required');
  ensureStyles();

  const onSelectSymbol = typeof opts.onSelectSymbol === 'function' ? opts.onSelectSymbol : null;

  const root = document.createElement('div');
  root.className = 'tvcryp-root';
  root.innerHTML = `
    ${renderHeader()}
    <div class="tvcryp-shell">
      <div class="tvcryp-content">
        <div class="tvcryp-page">
          <div class="tvcryp-breadcrumb">Analizador de CEX</div>
          ${renderTopbar()}
          ${renderFilters()}
          ${renderControlPanel()}
          ${renderTable()}
        </div>
      </div>
      ${renderSidebar()}
    </div>
  `;

  // Clear and mount
  while (mountEl.firstChild) mountEl.removeChild(mountEl.firstChild);
  mountEl.appendChild(root);

  // Event delegation
  const onClick = (ev) => {
    // Tabs
    const tab = ev.target.closest('.tvcryp-tab');
    if (tab && root.contains(tab)) {
      root.querySelectorAll('.tvcryp-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      return;
    }
    // Segmented
    const seg = ev.target.closest('.tvcryp-segmented button');
    if (seg && root.contains(seg)) {
      seg.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
      seg.classList.add('is-active');
      return;
    }
    // Row / ticker selection
    const row = ev.target.closest('tr[data-ticker]');
    if (row && root.contains(row) && onSelectSymbol) {
      onSelectSymbol(row.getAttribute('data-ticker'));
    }
  };
  root.addEventListener('click', onClick);

  return {
    destroy() {
      root.removeEventListener('click', onClick);
      if (root.parentNode === mountEl) mountEl.removeChild(root);
      // Note: shared <style> is kept across instances by design.
    },
  };
}

export default createCryptoCoinsScreener;
