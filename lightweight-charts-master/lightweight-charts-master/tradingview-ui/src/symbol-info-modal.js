// symbol-info-modal.js
// Self-contained TradingView-style symbol info modal.
// Public API: openSymbolInfoModal(symbol, opts = {}) -> { close() }
//
// - Dark themed full-overlay modal with 8 tabs (5 alt tabs for crypto).
// - Mini 1Y chart via lightweight-charts area series.
// - CSS injected once via <style data-symbol-info-modal>.
// - Closes on backdrop click and Escape key.

import { createChart, AreaSeries } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// CSS (injected once)
// ---------------------------------------------------------------------------
const CSS = `
.sim-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #d1d4dc;
  animation: sim-fade-in .15s ease-out;
}
@keyframes sim-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sim-pop-in {
  from { opacity: 0; transform: scale(.96); }
  to   { opacity: 1; transform: scale(1); }
}
.sim-modal {
  width: min(1080px, 94vw);
  max-width: 1080px;
  height: min(760px, 90vh);
  max-height: 90vh;
  background: #131722;
  border: 1px solid #2a2e39;
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0,0,0,.6);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: sim-pop-in .15s ease-out;
}
.sim-modal:focus { outline: none; }
.sim-header {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2e39;
  background: linear-gradient(180deg, #1a1f2c 0%, #131722 100%);
}
.sim-logo {
  width: 44px; height: 44px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; color: #fff;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}
.sim-title { flex: 1; min-width: 0; }
.sim-title h2 {
  margin: 0; font-size: 18px; font-weight: 600; color: #fff;
  display: flex; align-items: center; gap: 10px;
}
.sim-title .sim-exch {
  font-size: 11px; padding: 2px 8px;
  background: #2a2e39; border-radius: 4px; color: #b2b5be;
  font-weight: 500;
}
.sim-title .sim-fullname {
  font-size: 13px; color: #787b86; margin-top: 3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sim-price-block { text-align: right; }
.sim-price-block .sim-price {
  font-size: 22px; font-weight: 600; color: #fff;
  font-variant-numeric: tabular-nums;
}
.sim-price-block .sim-change {
  font-size: 12px; margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.sim-pos { color: #26a69a; }
.sim-neg { color: #ef5350; }
.sim-close-btn {
  width: 32px; height: 32px;
  background: transparent; border: none; color: #787b86;
  font-size: 20px; cursor: pointer; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background .12s, color .12s;
}
.sim-close-btn:hover { background: #2a2e39; color: #fff; }

.sim-tabs {
  display: flex; gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid #2a2e39;
  background: #131722;
  overflow-x: auto;
  scrollbar-width: none;
}
.sim-tabs::-webkit-scrollbar { display: none; }
.sim-tab {
  padding: 12px 14px;
  background: transparent; border: none;
  color: #b2b5be; font-size: 13px; font-weight: 500;
  cursor: pointer; border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color .12s, border-color .12s;
}
.sim-tab:hover { color: #fff; }
.sim-tab.active { color: #2962ff; border-bottom-color: #2962ff; }

.sim-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: #2a2e39 transparent;
}
.sim-body::-webkit-scrollbar { width: 10px; }
.sim-body::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 6px; }
.sim-body::-webkit-scrollbar-thumb:hover { background: #363a45; }

.sim-section-title {
  font-size: 11px; font-weight: 600; letter-spacing: .08em;
  text-transform: uppercase; color: #787b86;
  margin: 18px 0 10px;
}
.sim-section-title:first-child { margin-top: 0; }

.sim-desc {
  font-size: 13px; line-height: 1.6; color: #b2b5be;
}
.sim-desc p { margin: 0 0 10px; }
.sim-desc p:last-child { margin-bottom: 0; }

.sim-grid {
  display: grid; gap: 10px;
}
.sim-grid-4 { grid-template-columns: repeat(4, 1fr); }
.sim-grid-3 { grid-template-columns: repeat(3, 1fr); }
.sim-grid-2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 720px) {
  .sim-grid-4, .sim-grid-3 { grid-template-columns: repeat(2, 1fr); }
}

.sim-metric {
  background: #1a1f2c;
  border: 1px solid #2a2e39;
  border-radius: 8px;
  padding: 12px;
}
.sim-metric .sim-mlabel {
  font-size: 11px; color: #787b86;
  text-transform: uppercase; letter-spacing: .05em;
}
.sim-metric .sim-mvalue {
  font-size: 15px; font-weight: 600; color: #fff;
  margin-top: 4px; font-variant-numeric: tabular-nums;
}
.sim-metric .sim-msub {
  font-size: 11px; color: #787b86; margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.sim-table {
  width: 100%; border-collapse: collapse;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.sim-table th, .sim-table td {
  padding: 8px 10px; text-align: right;
  border-bottom: 1px solid #20242f;
}
.sim-table th:first-child, .sim-table td:first-child { text-align: left; }
.sim-table th {
  color: #787b86; font-weight: 500; font-size: 11px;
  text-transform: uppercase; letter-spacing: .04em;
  background: #1a1f2c;
  position: sticky; top: 0;
}
.sim-table td { color: #d1d4dc; }
.sim-table tr:hover td { background: #1a1f2c; }

.sim-chart-wrap {
  background: #1a1f2c;
  border: 1px solid #2a2e39;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
}
.sim-chart { width: 100%; height: 240px; }

.sim-rec-bars { display: flex; flex-direction: column; gap: 8px; }
.sim-rec-row {
  display: grid;
  grid-template-columns: 110px 1fr 50px;
  align-items: center; gap: 10px;
  font-size: 12px;
}
.sim-rec-row .sim-rec-name { color: #b2b5be; }
.sim-rec-row .sim-rec-bar-wrap {
  background: #20242f; height: 10px; border-radius: 5px; overflow: hidden;
}
.sim-rec-row .sim-rec-bar { height: 100%; border-radius: 5px; }
.sim-rec-row .sim-rec-val { color: #d1d4dc; text-align: right; font-variant-numeric: tabular-nums; }

.sim-pt-block {
  background: #1a1f2c; border: 1px solid #2a2e39;
  border-radius: 8px; padding: 16px;
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 12px; text-align: center;
}
.sim-pt-block > div { padding: 6px; }
.sim-pt-block .sim-pt-label { font-size: 11px; color: #787b86; text-transform: uppercase; }
.sim-pt-block .sim-pt-val   { font-size: 18px; font-weight: 600; margin-top: 6px; font-variant-numeric: tabular-nums; }

.sim-badge {
  display: inline-block;
  font-size: 11px; font-weight: 600;
  padding: 2px 7px; border-radius: 4px;
}
.sim-badge-buy  { background: rgba(38,166,154,.18); color: #26a69a; }
.sim-badge-sell { background: rgba(239,83,80,.18);  color: #ef5350; }
.sim-badge-hold { background: rgba(255,167,38,.18); color: #ffa726; }

.sim-range-bar {
  position: relative;
  height: 6px; background: #20242f; border-radius: 3px;
  margin-top: 14px;
}
.sim-range-bar .sim-range-fill {
  position: absolute; left: 0; height: 100%;
  background: linear-gradient(90deg, #ef5350, #ffa726, #26a69a);
  border-radius: 3px;
}
.sim-range-bar .sim-range-marker {
  position: absolute; top: -4px; width: 2px; height: 14px;
  background: #fff; border-radius: 1px;
  box-shadow: 0 0 0 3px rgba(255,255,255,.12);
}
.sim-range-labels {
  display: flex; justify-content: space-between;
  font-size: 11px; color: #787b86; margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

.sim-event {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: #1a1f2c; border: 1px solid #2a2e39;
  border-radius: 8px; margin-bottom: 8px;
}
.sim-event-date {
  flex-shrink: 0; width: 56px; text-align: center;
  padding: 6px; background: #20242f; border-radius: 6px;
}
.sim-event-date .sim-evd-m { font-size: 10px; color: #787b86; text-transform: uppercase; }
.sim-event-date .sim-evd-d { font-size: 18px; font-weight: 600; color: #fff; }
.sim-event-body { flex: 1; min-width: 0; }
.sim-event-body .sim-ev-title { font-size: 13px; color: #fff; font-weight: 500; }
.sim-event-body .sim-ev-sub   { font-size: 11px; color: #787b86; margin-top: 2px; }

.sim-empty {
  text-align: center; padding: 40px; color: #787b86; font-size: 13px;
}
`;

function ensureStyles() {
  if (document.querySelector('style[data-symbol-info-modal]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-symbol-info-modal', '');
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Deterministic PRNG seeded by symbol so each ticker has stable synthetic data
// ---------------------------------------------------------------------------
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Symbol metadata + classification
// ---------------------------------------------------------------------------
const KNOWN = {
  AAPL:  { name: 'Apple Inc.',                 exch: 'NASDAQ', sector: 'Tecnología',         industry: 'Hardware de consumo',     price: 189.84, color: '#a2aaad' },
  MSFT:  { name: 'Microsoft Corporation',      exch: 'NASDAQ', sector: 'Tecnología',         industry: 'Software de sistemas',    price: 415.32, color: '#00a4ef' },
  GOOGL: { name: 'Alphabet Inc. Class A',      exch: 'NASDAQ', sector: 'Comunicaciones',     industry: 'Servicios de Internet',   price: 174.21, color: '#4285f4' },
  AMZN:  { name: 'Amazon.com Inc.',            exch: 'NASDAQ', sector: 'Consumo discrec.',   industry: 'E-commerce',              price: 188.45, color: '#ff9900' },
  NVDA:  { name: 'NVIDIA Corporation',         exch: 'NASDAQ', sector: 'Tecnología',         industry: 'Semiconductores',         price: 138.07, color: '#76b900' },
  TSLA:  { name: 'Tesla, Inc.',                exch: 'NASDAQ', sector: 'Consumo discrec.',   industry: 'Vehículos eléctricos',    price: 248.50, color: '#cc0000' },
  META:  { name: 'Meta Platforms, Inc.',       exch: 'NASDAQ', sector: 'Comunicaciones',     industry: 'Redes sociales',          price: 564.15, color: '#1877f2' },
  NFLX:  { name: 'Netflix, Inc.',              exch: 'NASDAQ', sector: 'Comunicaciones',     industry: 'Streaming',               price: 712.40, color: '#e50914' },
  JPM:   { name: 'JPMorgan Chase & Co.',       exch: 'NYSE',   sector: 'Financiero',         industry: 'Banca diversificada',     price: 219.30, color: '#0066b2' },
  V:     { name: 'Visa Inc.',                  exch: 'NYSE',   sector: 'Financiero',         industry: 'Servicios de pago',       price: 295.80, color: '#1a1f71' },
  BTCUSD:{ name: 'Bitcoin / Dólar',            exch: 'CRYPTO', sector: 'Criptomonedas',      industry: 'Store of value',          price: 67250,  color: '#f7931a', crypto: true },
  ETHUSD:{ name: 'Ethereum / Dólar',           exch: 'CRYPTO', sector: 'Criptomonedas',      industry: 'Smart contracts',         price: 3420,   color: '#627eea', crypto: true },
  SOLUSD:{ name: 'Solana / Dólar',             exch: 'CRYPTO', sector: 'Criptomonedas',      industry: 'L1 blockchain',           price: 168,    color: '#9945ff', crypto: true },
};

const CRYPTO_HINTS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'ATOM', 'USDT', 'USDC', 'DOGE', 'XRP'];

function resolveSymbol(symbol) {
  const sym = String(symbol || '').toUpperCase();
  if (KNOWN[sym]) return { ticker: sym, ...KNOWN[sym] };
  const isCrypto = CRYPTO_HINTS.some(c => sym.includes(c));
  const seed = hashString(sym);
  const rnd = mulberry32(seed);
  return {
    ticker: sym || 'SYMBOL',
    name: sym ? `${sym} ${isCrypto ? 'Token' : 'Corporation'}` : 'Símbolo desconocido',
    exch: isCrypto ? 'CRYPTO' : 'NASDAQ',
    sector: isCrypto ? 'Criptomonedas' : 'Tecnología',
    industry: isCrypto ? 'Activo digital' : 'Software',
    price: isCrypto ? 10 + rnd() * 500 : 20 + rnd() * 400,
    color: `hsl(${Math.floor(rnd() * 360)}, 65%, 55%)`,
    crypto: isCrypto,
  };
}

// ---------------------------------------------------------------------------
// Synthetic data generators (deterministic per symbol)
// ---------------------------------------------------------------------------
function fmtMoney(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (abs >= 1e3)  return (n / 1e3).toFixed(2)  + 'K';
  return n.toFixed(decimals);
}
function fmtPct(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}
function fmtNum(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function buildSeries1Y(meta, rnd) {
  // Daily closes for ~252 trading sessions ending today
  const today = new Date();
  const out = [];
  let price = meta.price * (0.7 + rnd() * 0.2); // start at ~70-90% of current
  const drift = (meta.price - price) / 252;
  for (let i = 251; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const vol = (meta.crypto ? 0.04 : 0.018) * price;
    const shock = (rnd() - 0.5) * 2 * vol;
    price = Math.max(0.01, price + drift + shock);
    out.push({
      time: d.toISOString().slice(0, 10),
      value: +price.toFixed(2),
    });
  }
  // Anchor last close to meta.price
  if (out.length) out[out.length - 1].value = meta.price;
  return out;
}

function buildOHLC(series, count = 10) {
  // Take last `count` points; synthesize O/H/L/V around the close.
  const slice = series.slice(-count);
  return slice.map((p, i) => {
    const prev = i > 0 ? slice[i - 1].value : p.value;
    const open = prev;
    const close = p.value;
    const hi = Math.max(open, close) * (1 + Math.random() * 0.008);
    const lo = Math.min(open, close) * (1 - Math.random() * 0.008);
    const vol = Math.floor(2_000_000 + Math.random() * 8_000_000);
    return { time: p.time, open, high: hi, low: lo, close, volume: vol };
  });
}

function buildFinancials(meta, rnd) {
  const baseRev = meta.crypto ? 0 : (meta.price * 1e8) * (0.5 + rnd() * 2);
  const quarters = ['Q4 24', 'Q1 25', 'Q2 25', 'Q3 25'];
  const rows = quarters.map((q, i) => {
    const growth = 1 + (i * 0.03) + (rnd() - 0.5) * 0.04;
    const rev = baseRev * growth;
    const gross = rev * (0.40 + rnd() * 0.25);
    const op   = rev * (0.18 + rnd() * 0.15);
    const net  = op  * (0.70 + rnd() * 0.15);
    const eps  = net / (5e8 + rnd() * 5e9);
    return { q, rev, gross, op, net, eps };
  });
  const balance = quarters.map((q, i) => {
    const assets = baseRev * (2.5 + i * 0.05);
    const liab   = assets * (0.4 + rnd() * 0.15);
    const equity = assets - liab;
    const cash   = assets * (0.12 + rnd() * 0.08);
    const debt   = liab * (0.45 + rnd() * 0.2);
    return { q, assets, liab, equity, cash, debt };
  });
  const cashflow = quarters.map((q, i) => {
    const op = baseRev * (0.22 + rnd() * 0.06);
    const inv = -baseRev * (0.08 + rnd() * 0.05);
    const fin = -baseRev * (0.06 + rnd() * 0.04);
    const free = op + inv;
    return { q, op, inv, fin, free };
  });
  return { income: rows, balance, cashflow };
}

function buildDividends(meta, rnd) {
  if (meta.crypto) return null;
  const quarters = ['Q4 23', 'Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25'];
  let div = 0.22 + rnd() * 0.6;
  return quarters.map((q, i) => {
    div = div * (1 + (rnd() - 0.3) * 0.04);
    const exDate = new Date(2024, i, 8 + Math.floor(rnd() * 14));
    return {
      q,
      amount: +div.toFixed(4),
      exDate: exDate.toISOString().slice(0, 10),
      payDate: new Date(exDate.getTime() + 14 * 86400000).toISOString().slice(0, 10),
    };
  });
}

function buildRecommendations(meta, rnd) {
  // Slight positive bias
  const total = 28 + Math.floor(rnd() * 20);
  const sb = Math.floor(total * (0.20 + rnd() * 0.18));
  const b  = Math.floor(total * (0.30 + rnd() * 0.12));
  const h  = Math.floor(total * (0.20 + rnd() * 0.10));
  const s  = Math.max(1, Math.floor(total * (0.05 + rnd() * 0.06)));
  const ss = Math.max(0, total - sb - b - h - s);
  return [
    { name: 'Strong Buy',  count: sb, color: '#1b8e7a' },
    { name: 'Buy',         count: b,  color: '#26a69a' },
    { name: 'Hold',        count: h,  color: '#ffa726' },
    { name: 'Sell',        count: s,  color: '#ef5350' },
    { name: 'Strong Sell', count: ss, color: '#b71c1c' },
  ];
}

function buildInsiders(meta, rnd) {
  const names = [
    'Tim Cook',       'Luca Maestri',   'Katherine Adams',
    'Jeff Williams',  'Deirdre O\'Brien', 'Chris Kondo',
    'Arthur Levinson', 'Al Gore',
  ];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(rnd() * 180));
    const shares = Math.floor(1000 + rnd() * 80000);
    const side = rnd() > 0.55 ? 'Venta' : 'Compra';
    return {
      date: d.toISOString().slice(0, 10),
      name: names[i % names.length],
      role: ['CEO', 'CFO', 'General Counsel', 'COO', 'SVP', 'Director', 'Chairman'][i % 7],
      side,
      shares,
      value: shares * meta.price * (0.95 + rnd() * 0.1),
      pct: (rnd() * 2) * (side === 'Venta' ? -1 : 1),
    };
  }).sort((a, b) => a.date < b.date ? 1 : -1);
}

function buildEvents(meta, rnd) {
  const today = new Date();
  const events = [
    { offset: 12 + Math.floor(rnd() * 8),  title: `Earnings Q4 ${today.getFullYear()}`, sub: 'Después del cierre · EPS est. ' + (0.5 + rnd() * 3).toFixed(2) },
    { offset: 25 + Math.floor(rnd() * 10), title: 'Fecha ex-dividendo',                  sub: 'Dividendo trimestral · $' + (0.2 + rnd() * 0.8).toFixed(2) },
    { offset: 45 + Math.floor(rnd() * 15), title: 'Investor Day',                        sub: 'Conferencia anual de inversores' },
    { offset: 68 + Math.floor(rnd() * 15), title: 'Conferencia anual',                   sub: 'Goldman Sachs Tech Conf.' },
    { offset: 95 + Math.floor(rnd() * 20), title: `Earnings Q1 ${today.getFullYear() + 1}`, sub: 'Antes de la apertura' },
  ];
  if (meta.crypto) {
    return [
      { offset: 7,  title: 'Próximo halving / upgrade', sub: 'Actualización planificada de la red' },
      { offset: 21, title: 'Conferencia DevConnect',    sub: 'Evento global de desarrolladores' },
      { offset: 45, title: 'Listing en nuevos exchanges', sub: 'Anuncio de nuevos pares de trading' },
    ].map(e => ({ ...e, date: addDays(today, e.offset) }));
  }
  return events.map(e => ({ ...e, date: addDays(today, e.offset) }));
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// ---------------------------------------------------------------------------
// Renderers per tab
// ---------------------------------------------------------------------------
function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class)  node.className = opts.class;
  if (opts.html)   node.innerHTML = opts.html;
  if (opts.text)   node.textContent = opts.text;
  if (opts.style)  Object.assign(node.style, opts.style);
  if (opts.attrs)  for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
  if (opts.on)     for (const k in opts.on)    node.addEventListener(k, opts.on[k]);
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function metricCard(label, value, sub) {
  return el('div', { class: 'sim-metric' }, [
    el('div', { class: 'sim-mlabel', text: label }),
    el('div', { class: 'sim-mvalue', text: value }),
    sub ? el('div', { class: 'sim-msub', text: sub }) : null,
  ]);
}

function renderResumen(ctx) {
  const { meta, stats, rnd } = ctx;
  const desc = meta.crypto
    ? [
        `${meta.name} es un activo digital del sector ${meta.sector.toLowerCase()} con foco en ${meta.industry.toLowerCase()}. Su capitalización de mercado supera los ${fmtMoney(stats.marketCap)} y se negocia 24/7 en exchanges globales.`,
        `El protocolo ha visto un crecimiento sostenido en adopción institucional, volumen on-chain y direcciones activas. Su volatilidad implícita continúa por encima de los activos tradicionales, ofreciendo oportunidades de trading y de inversión a largo plazo.`,
        `La tesis de inversión combina escasez programada, utilidad en aplicaciones descentralizadas y posicionamiento como reserva de valor digital frente a la depreciación de monedas fiat.`,
      ]
    : [
        `${meta.name} (${meta.ticker}) es una compañía del sector ${meta.sector} dedicada principalmente a la ${meta.industry.toLowerCase()}. Cotiza en ${meta.exch} y figura entre los principales constituyentes de los índices de referencia globales.`,
        `La compañía mantiene un crecimiento sólido en ingresos y márgenes operativos, con una posición de liderazgo en sus segmentos clave. Su estrategia combina inversión en I+D, expansión internacional y retorno de capital a accionistas vía dividendos y recompras.`,
        `Los analistas destacan la diversificación de ingresos, la generación recurrente de flujo de caja libre y un balance saneado con ratio deuda/equity controlado. Los principales riesgos incluyen la presión regulatoria, la competencia y la sensibilidad al ciclo macroeconómico.`,
      ];

  const body = el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Descripción' }),
    el('div', { class: 'sim-desc' }, desc.map(p => el('p', { text: p }))),

    el('div', { class: 'sim-section-title', text: 'Métricas clave' }),
    el('div', { class: 'sim-grid sim-grid-4' }, [
      metricCard('Precio',         '$' + fmtNum(meta.price)),
      metricCard('Cap. mercado',   fmtMoney(stats.marketCap)),
      metricCard(meta.crypto ? 'Volumen 24h' : 'P/E (TTM)',
                 meta.crypto ? fmtMoney(stats.vol24h) : fmtNum(stats.pe)),
      metricCard(meta.crypto ? 'Supply circulante' : 'EPS (TTM)',
                 meta.crypto ? fmtMoney(stats.circulating) : '$' + fmtNum(stats.eps)),
      metricCard(meta.crypto ? 'Supply máximo' : 'Dividendo',
                 meta.crypto ? (stats.maxSupply ? fmtMoney(stats.maxSupply) : '∞')
                             : ('$' + fmtNum(stats.div) + ' (' + fmtNum(stats.divYield, 2) + '%)')),
      metricCard('Beta',           fmtNum(stats.beta)),
      metricCard('52w bajo',       '$' + fmtNum(stats.low52)),
      metricCard('52w alto',       '$' + fmtNum(stats.high52)),
    ]),

    el('div', { class: 'sim-section-title', text: 'Rango 52 semanas' }),
    (function () {
      const pct = Math.min(100, Math.max(0, ((meta.price - stats.low52) / (stats.high52 - stats.low52)) * 100));
      const wrap = el('div', {}, [
        el('div', { class: 'sim-range-bar' }, [
          el('div', { class: 'sim-range-fill',   style: { width: '100%' } }),
          el('div', { class: 'sim-range-marker', style: { left: pct + '%' } }),
        ]),
        el('div', { class: 'sim-range-labels' }, [
          el('span', { text: '$' + fmtNum(stats.low52) }),
          el('span', { text: '$' + fmtNum(meta.price) + ' actual' }),
          el('span', { text: '$' + fmtNum(stats.high52) }),
        ]),
      ]);
      return wrap;
    })(),
  ]);
  return body;
}

function renderCotizacion(ctx) {
  const { series, ohlc } = ctx;
  const chartWrap = el('div', { class: 'sim-chart-wrap' }, [
    el('div', { class: 'sim-chart' }),
  ]);

  // Defer chart creation until inserted into DOM
  setTimeout(() => {
    const host = chartWrap.querySelector('.sim-chart');
    if (!host || !host.isConnected) return;
    const chart = createChart(host, {
      layout: { background: { color: 'transparent' }, textColor: '#b2b5be' },
      grid:   { vertLines: { color: '#1f2330' }, horzLines: { color: '#1f2330' } },
      rightPriceScale: { borderColor: '#2a2e39' },
      timeScale:       { borderColor: '#2a2e39', timeVisible: false },
      crosshair: { mode: 0 },
      width: host.clientWidth,
      height: 240,
    });
    const s = chart.addSeries(AreaSeries, {
      lineColor:   '#2962ff',
      topColor:    'rgba(41,98,255,0.35)',
      bottomColor: 'rgba(41,98,255,0.02)',
      lineWidth: 2,
    });
    s.setData(series);
    chart.timeScale().fitContent();
    ctx._chartCleanup = () => { try { chart.remove(); } catch (_) {} };

    // resize observer
    const ro = new ResizeObserver(() => {
      if (!host.isConnected) return;
      chart.applyOptions({ width: host.clientWidth });
    });
    ro.observe(host);
    const prev = ctx._chartCleanup;
    ctx._chartCleanup = () => { ro.disconnect(); prev && prev(); };
  }, 0);

  const table = el('table', { class: 'sim-table' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { text: 'Fecha' }),
      el('th', { text: 'Open' }),
      el('th', { text: 'High' }),
      el('th', { text: 'Low' }),
      el('th', { text: 'Close' }),
      el('th', { text: '% Cambio' }),
      el('th', { text: 'Volumen' }),
    ])),
    el('tbody', {}, [...ohlc].reverse().map(r => {
      const chg = ((r.close - r.open) / r.open) * 100;
      return el('tr', {}, [
        el('td', { text: r.time }),
        el('td', { text: fmtNum(r.open) }),
        el('td', { text: fmtNum(r.high) }),
        el('td', { text: fmtNum(r.low) }),
        el('td', { text: fmtNum(r.close) }),
        el('td', { class: chg >= 0 ? 'sim-pos' : 'sim-neg', text: fmtPct(chg) }),
        el('td', { text: fmtMoney(r.volume, 0) }),
      ]);
    })),
  ]);

  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Gráfico 1 año' }),
    chartWrap,
    el('div', { class: 'sim-section-title', text: 'Últimas 10 sesiones' }),
    table,
  ]);
}

function renderFinancieros(ctx) {
  const { fin } = ctx;
  const incomeHead = ['Concepto', ...fin.income.map(r => r.q)];
  function tbl(title, head, rows) {
    return el('div', {}, [
      el('div', { class: 'sim-section-title', text: title }),
      el('table', { class: 'sim-table' }, [
        el('thead', {}, el('tr', {}, head.map(h => el('th', { text: h })))),
        el('tbody', {}, rows.map(r => el('tr', {}, r.map((c, i) =>
          el('td', { text: i === 0 ? c : (typeof c === 'number' ? fmtMoney(c) : c) })
        )))),
      ]),
    ]);
  }

  const income = tbl('Income Statement', incomeHead, [
    ['Ingresos',           ...fin.income.map(r => r.rev)],
    ['Beneficio bruto',    ...fin.income.map(r => r.gross)],
    ['Beneficio operativo',...fin.income.map(r => r.op)],
    ['Beneficio neto',     ...fin.income.map(r => r.net)],
    ['EPS',                ...fin.income.map(r => '$' + r.eps.toFixed(2))],
  ]);

  const balance = tbl('Balance Sheet', incomeHead, [
    ['Activo total',    ...fin.balance.map(r => r.assets)],
    ['Pasivo total',    ...fin.balance.map(r => r.liab)],
    ['Equity',          ...fin.balance.map(r => r.equity)],
    ['Caja & equiv.',   ...fin.balance.map(r => r.cash)],
    ['Deuda total',     ...fin.balance.map(r => r.debt)],
  ]);

  const cash = tbl('Cash Flow', incomeHead, [
    ['Flujo operativo',  ...fin.cashflow.map(r => r.op)],
    ['Flujo inversión',  ...fin.cashflow.map(r => r.inv)],
    ['Flujo financiero', ...fin.cashflow.map(r => r.fin)],
    ['Flujo de caja libre', ...fin.cashflow.map(r => r.free)],
  ]);

  return el('div', {}, [income, balance, cash]);
}

function renderEstadisticas(ctx) {
  const { stats } = ctx;
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Valoración' }),
    el('div', { class: 'sim-grid sim-grid-4' }, [
      metricCard('P/E',       fmtNum(stats.pe)),
      metricCard('P/B',       fmtNum(stats.pb)),
      metricCard('P/S',       fmtNum(stats.ps)),
      metricCard('EV/EBITDA', fmtNum(stats.evEbitda)),
    ]),
    el('div', { class: 'sim-section-title', text: 'Rentabilidad' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('ROE',           fmtNum(stats.roe) + '%'),
      metricCard('ROA',           fmtNum(stats.roa) + '%'),
      metricCard('Margen neto',   fmtNum(stats.profitMargin) + '%'),
    ]),
    el('div', { class: 'sim-section-title', text: 'Crecimiento (YoY)' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('Ingresos',      fmtPct(stats.revGrowth)),
      metricCard('Beneficios',    fmtPct(stats.epsGrowth)),
      metricCard('Flujo de caja', fmtPct(stats.fcfGrowth)),
    ]),
    el('div', { class: 'sim-section-title', text: 'Acciones' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('Shares outstanding', fmtMoney(stats.sharesOut, 0)),
      metricCard('Float',              fmtMoney(stats.float, 0)),
      metricCard('Insider ownership',  fmtNum(stats.insiderOwn) + '%'),
    ]),
  ]);
}

function renderDividendos(ctx) {
  const { stats, dividends } = ctx;
  if (!dividends) {
    return el('div', { class: 'sim-empty', text: 'Este activo no distribuye dividendos.' });
  }
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Resumen' }),
    el('div', { class: 'sim-grid sim-grid-4' }, [
      metricCard('Dividendo anual', '$' + fmtNum(stats.div)),
      metricCard('Yield',           fmtNum(stats.divYield) + '%'),
      metricCard('Payout ratio',    fmtNum(stats.payout) + '%'),
      metricCard('Próx. ex-date',   dividends[dividends.length - 1].exDate),
    ]),
    el('div', { class: 'sim-section-title', text: 'Historial de pagos' }),
    el('table', { class: 'sim-table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: 'Trimestre' }),
        el('th', { text: 'Importe' }),
        el('th', { text: 'Ex-date' }),
        el('th', { text: 'Fecha de pago' }),
      ])),
      el('tbody', {}, [...dividends].reverse().map(d => el('tr', {}, [
        el('td', { text: d.q }),
        el('td', { text: '$' + fmtNum(d.amount, 4) }),
        el('td', { text: d.exDate }),
        el('td', { text: d.payDate }),
      ]))),
    ]),
  ]);
}

function renderAnalisis(ctx) {
  const { stats, recs, meta } = ctx;
  const total = recs.reduce((s, r) => s + r.count, 0) || 1;
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Recomendaciones de analistas' }),
    el('div', { class: 'sim-rec-bars' }, recs.map(r => el('div', { class: 'sim-rec-row' }, [
      el('div', { class: 'sim-rec-name', text: r.name }),
      el('div', { class: 'sim-rec-bar-wrap' }, [
        el('div', { class: 'sim-rec-bar', style: {
          width: ((r.count / total) * 100) + '%',
          background: r.color,
        } }),
      ]),
      el('div', { class: 'sim-rec-val', text: String(r.count) }),
    ]))),
    el('div', { class: 'sim-section-title', text: 'Price targets (12 meses)' }),
    el('div', { class: 'sim-pt-block' }, [
      el('div', {}, [
        el('div', { class: 'sim-pt-label', text: 'Mínimo' }),
        el('div', { class: 'sim-pt-val sim-neg', text: '$' + fmtNum(stats.ptLow) }),
      ]),
      el('div', {}, [
        el('div', { class: 'sim-pt-label', text: 'Promedio' }),
        el('div', { class: 'sim-pt-val', text: '$' + fmtNum(stats.ptAvg) }),
      ]),
      el('div', {}, [
        el('div', { class: 'sim-pt-label', text: 'Máximo' }),
        el('div', { class: 'sim-pt-val sim-pos', text: '$' + fmtNum(stats.ptHigh) }),
      ]),
    ]),
    el('div', { class: 'sim-section-title', text: 'Upside potencial' }),
    el('div', { class: 'sim-desc' }, [
      el('p', { text:
        `Precio actual: $${fmtNum(meta.price)} · Objetivo medio: $${fmtNum(stats.ptAvg)} · ` +
        `Upside implícito: ${fmtPct(((stats.ptAvg - meta.price) / meta.price) * 100)}.`
      }),
    ]),
  ]);
}

function renderInsiders(ctx) {
  const { insiders } = ctx;
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Operaciones insiders (últimos 6 meses)' }),
    el('table', { class: 'sim-table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: 'Fecha' }),
        el('th', { text: 'Insider' }),
        el('th', { text: 'Cargo' }),
        el('th', { text: 'Tipo' }),
        el('th', { text: 'Acciones' }),
        el('th', { text: 'Valor' }),
        el('th', { text: '% cambio' }),
      ])),
      el('tbody', {}, insiders.map(r => el('tr', {}, [
        el('td', { text: r.date }),
        el('td', { text: r.name }),
        el('td', { text: r.role }),
        el('td', {}, [el('span', {
          class: 'sim-badge ' + (r.side === 'Compra' ? 'sim-badge-buy' : 'sim-badge-sell'),
          text: r.side,
        })]),
        el('td', { text: fmtNum(r.shares, 0) }),
        el('td', { text: '$' + fmtMoney(r.value, 0) }),
        el('td', { class: r.pct >= 0 ? 'sim-pos' : 'sim-neg', text: fmtPct(r.pct) }),
      ]))),
    ]),
  ]);
}

function renderEventos(ctx) {
  const { events } = ctx;
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Próximos eventos' }),
    el('div', {}, events.map(ev => el('div', { class: 'sim-event' }, [
      el('div', { class: 'sim-event-date' }, [
        el('div', { class: 'sim-evd-m', text: months[ev.date.getMonth()] }),
        el('div', { class: 'sim-evd-d', text: String(ev.date.getDate()) }),
      ]),
      el('div', { class: 'sim-event-body' }, [
        el('div', { class: 'sim-ev-title', text: ev.title }),
        el('div', { class: 'sim-ev-sub',   text: ev.sub }),
      ]),
    ]))),
  ]);
}

// ---------- Crypto-only tabs ----------
function renderTokenomics(ctx) {
  const { stats, meta } = ctx;
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Supply' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('Circulating',  fmtMoney(stats.circulating, 0)),
      metricCard('Max supply',   stats.maxSupply ? fmtMoney(stats.maxSupply, 0) : 'Sin límite'),
      metricCard('Inflación',    fmtNum(stats.inflation) + '%'),
    ]),
    el('div', { class: 'sim-section-title', text: 'Distribución estimada' }),
    el('div', { class: 'sim-grid sim-grid-2' }, [
      metricCard('Fundación / Tesoro', fmtNum(stats.distFoundation) + '%'),
      metricCard('Holders públicos',   fmtNum(stats.distPublic) + '%'),
      metricCard('Validators / Mineros', fmtNum(stats.distValidators) + '%'),
      metricCard('Ecosistema',         fmtNum(stats.distEcosystem) + '%'),
    ]),
  ]);
}

function renderMercados(ctx) {
  const { meta } = ctx;
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Bitfinex', 'OKX', 'Bybit', 'Kucoin', 'Bitstamp'];
  const rnd = mulberry32(hashString(meta.ticker + '_mkt'));
  const rows = exchanges.map(e => {
    const px = meta.price * (1 + (rnd() - 0.5) * 0.005);
    const vol = 5e6 + rnd() * 8e8;
    return { exch: e, pair: meta.ticker, price: px, vol, share: 0 };
  });
  const totalVol = rows.reduce((s, r) => s + r.vol, 0);
  rows.forEach(r => r.share = (r.vol / totalVol) * 100);
  rows.sort((a, b) => b.vol - a.vol);
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Pares de trading por exchange' }),
    el('table', { class: 'sim-table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: 'Exchange' }),
        el('th', { text: 'Par' }),
        el('th', { text: 'Precio' }),
        el('th', { text: 'Volumen 24h' }),
        el('th', { text: '% Vol' }),
      ])),
      el('tbody', {}, rows.map(r => el('tr', {}, [
        el('td', { text: r.exch }),
        el('td', { text: r.pair }),
        el('td', { text: '$' + fmtNum(r.price) }),
        el('td', { text: '$' + fmtMoney(r.vol, 0) }),
        el('td', { text: fmtNum(r.share) + '%' }),
      ]))),
    ]),
  ]);
}

function renderOnchain(ctx) {
  const { stats } = ctx;
  return el('div', {}, [
    el('div', { class: 'sim-section-title', text: 'Actividad de red' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('Direcciones activas 24h', fmtMoney(stats.activeAddr, 0)),
      metricCard('Transacciones 24h',       fmtMoney(stats.txCount, 0)),
      metricCard('Hashrate / TPS',          fmtNum(stats.hashrate)),
    ]),
    el('div', { class: 'sim-section-title', text: 'Holders' }),
    el('div', { class: 'sim-grid sim-grid-3' }, [
      metricCard('Total holders',     fmtMoney(stats.holders, 0)),
      metricCard('Top 100 holdings',  fmtNum(stats.top100) + '%'),
      metricCard('Whales (>1k)',      fmtMoney(stats.whales, 0)),
    ]),
    el('div', { class: 'sim-section-title', text: 'Otros' }),
    el('div', { class: 'sim-grid sim-grid-2' }, [
      metricCard('Comisión media', '$' + fmtNum(stats.avgFee, 3)),
      metricCard('TVL en DeFi',    '$' + fmtMoney(stats.tvl)),
    ]),
  ]);
}

// ---------------------------------------------------------------------------
// Stats builder
// ---------------------------------------------------------------------------
function buildStats(meta, series, rnd) {
  const closes = series.map(p => p.value);
  const high52 = Math.max(...closes);
  const low52  = Math.min(...closes);

  if (meta.crypto) {
    const circulating = 19_500_000 + rnd() * 1e9;
    return {
      marketCap: meta.price * circulating,
      vol24h:    meta.price * circulating * (0.02 + rnd() * 0.04),
      circulating,
      maxSupply: rnd() > 0.5 ? circulating * (1 + rnd() * 0.6) : null,
      pe: NaN, eps: NaN, div: NaN, divYield: NaN, beta: 1.4 + rnd() * 0.8,
      high52, low52,
      inflation: 1 + rnd() * 4,
      distFoundation: 8 + rnd() * 10,
      distPublic:     50 + rnd() * 15,
      distValidators: 12 + rnd() * 8,
      distEcosystem:  10 + rnd() * 10,
      activeAddr: 200_000 + rnd() * 800_000,
      txCount:    300_000 + rnd() * 1_500_000,
      hashrate:   100 + rnd() * 600,
      holders:    1_000_000 + rnd() * 50_000_000,
      top100:     15 + rnd() * 20,
      whales:     1500 + rnd() * 6000,
      avgFee:     0.1 + rnd() * 3,
      tvl:        1e9 + rnd() * 50e9,
    };
  }

  const sharesOut  = 1e9 + rnd() * 15e9;
  const marketCap  = meta.price * sharesOut;
  const eps        = 1 + rnd() * 8;
  const pe         = meta.price / eps;
  const div        = 0.5 + rnd() * 4;
  const divYield   = (div / meta.price) * 100;
  return {
    marketCap, sharesOut,
    float: sharesOut * (0.85 + rnd() * 0.12),
    insiderOwn: 0.5 + rnd() * 8,
    pe, eps, div, divYield,
    payout: 20 + rnd() * 45,
    pb: 3 + rnd() * 12,
    ps: 2 + rnd() * 10,
    evEbitda: 12 + rnd() * 18,
    roe: 12 + rnd() * 35,
    roa: 6 + rnd() * 18,
    profitMargin: 8 + rnd() * 25,
    revGrowth: -2 + rnd() * 25,
    epsGrowth: -3 + rnd() * 35,
    fcfGrowth: -5 + rnd() * 30,
    beta: 0.6 + rnd() * 1.3,
    high52, low52,
    ptLow:  meta.price * (0.78 + rnd() * 0.1),
    ptAvg:  meta.price * (1.05 + rnd() * 0.15),
    ptHigh: meta.price * (1.30 + rnd() * 0.25),
  };
}

// ---------------------------------------------------------------------------
// Main: build modal
// ---------------------------------------------------------------------------
const STOCK_TABS = [
  { id: 'resumen',      label: 'Resumen',      render: renderResumen },
  { id: 'cotizacion',   label: 'Cotización',   render: renderCotizacion },
  { id: 'financieros',  label: 'Financieros',  render: renderFinancieros },
  { id: 'estadisticas', label: 'Estadísticas', render: renderEstadisticas },
  { id: 'dividendos',   label: 'Dividendos',   render: renderDividendos },
  { id: 'analisis',     label: 'Análisis',     render: renderAnalisis },
  { id: 'insiders',     label: 'Insiders',     render: renderInsiders },
  { id: 'eventos',      label: 'Eventos',      render: renderEventos },
];
const CRYPTO_TABS = [
  { id: 'resumen',    label: 'Resumen',    render: renderResumen },
  { id: 'cotizacion', label: 'Cotización', render: renderCotizacion },
  { id: 'tokenomics', label: 'Tokenomics', render: renderTokenomics },
  { id: 'mercados',   label: 'Mercados',   render: renderMercados },
  { id: 'onchain',    label: 'Onchain',    render: renderOnchain },
];

export function openSymbolInfoModal(symbol, opts = {}) {
  ensureStyles();

  const meta = resolveSymbol(symbol);
  const seed = hashString(meta.ticker + '|v1');
  const rnd  = mulberry32(seed);

  const series = buildSeries1Y(meta, rnd);
  const ohlc   = buildOHLC(series, 10);
  const stats  = buildStats(meta, series, rnd);
  const fin    = buildFinancials(meta, rnd);
  const dividends = buildDividends(meta, rnd);
  const recs   = buildRecommendations(meta, rnd);
  const insiders = buildInsiders(meta, rnd);
  const events = buildEvents(meta, rnd);

  const ctx = { meta, stats, fin, dividends, recs, insiders, events, series, ohlc, rnd };

  // ---------- Header ----------
  const prevClose = series.length > 1 ? series[series.length - 2].value : meta.price;
  const chgAbs = meta.price - prevClose;
  const chgPct = (chgAbs / prevClose) * 100;
  const chgCls = chgAbs >= 0 ? 'sim-pos' : 'sim-neg';

  const header = el('div', { class: 'sim-header' }, [
    el('div', { class: 'sim-logo', style: { background: meta.color }, text: meta.ticker.slice(0, 3) }),
    el('div', { class: 'sim-title' }, [
      el('h2', {}, [
        document.createTextNode(meta.ticker),
        el('span', { class: 'sim-exch', text: meta.exch }),
      ]),
      el('div', { class: 'sim-fullname', text: meta.name + ' · ' + meta.sector + ' / ' + meta.industry }),
    ]),
    el('div', { class: 'sim-price-block' }, [
      el('div', { class: 'sim-price', text: '$' + fmtNum(meta.price) }),
      el('div', { class: 'sim-change ' + chgCls,
        text: (chgAbs >= 0 ? '+' : '') + fmtNum(chgAbs) + '  (' + fmtPct(chgPct) + ')' }),
    ]),
    el('button', { class: 'sim-close-btn', attrs: { 'aria-label': 'Cerrar' }, text: '×' }),
  ]);

  // ---------- Tabs ----------
  const tabs = meta.crypto ? CRYPTO_TABS : STOCK_TABS;
  const tabBar = el('div', { class: 'sim-tabs' });
  const body   = el('div', { class: 'sim-body' });

  let activeId = (opts.initialTab && tabs.find(t => t.id === opts.initialTab)) ? opts.initialTab : tabs[0].id;

  function renderTab(id) {
    activeId = id;
    // cleanup any previous chart
    if (ctx._chartCleanup) { ctx._chartCleanup(); ctx._chartCleanup = null; }
    body.innerHTML = '';
    const tab = tabs.find(t => t.id === id) || tabs[0];
    body.appendChild(tab.render(ctx));
    for (const btn of tabBar.children) {
      btn.classList.toggle('active', btn.dataset.id === id);
    }
    body.scrollTop = 0;
  }

  tabs.forEach(t => {
    const btn = el('button', { class: 'sim-tab', text: t.label, attrs: { 'data-id': t.id } });
    btn.addEventListener('click', () => renderTab(t.id));
    tabBar.appendChild(btn);
  });

  // ---------- Modal shell ----------
  const modal = el('div', { class: 'sim-modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': meta.ticker + ' información' } },
    [header, tabBar, body]);

  const backdrop = el('div', { class: 'sim-backdrop' }, [modal]);

  // ---------- Wiring & close ----------
  let isOpen = true;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const prevFocus = document.activeElement;

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (ctx._chartCleanup) { try { ctx._chartCleanup(); } catch (_) {} ctx._chartCleanup = null; }
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    document.body.style.overflow = prevOverflow;
    try { if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus(); } catch (_) {}
    if (typeof opts.onClose === 'function') {
      try { opts.onClose(); } catch (_) {}
    }
  }
  function focusableEls() {
    return Array.from(modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(n => n.offsetParent !== null);
  }
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const f = focusableEls();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey);

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  // Prevent click-through from modal interior
  modal.addEventListener('mousedown', (e) => e.stopPropagation());

  header.querySelector('.sim-close-btn').addEventListener('click', close);

  // Mount + initial render
  (opts.container || document.body).appendChild(backdrop);
  renderTab(activeId);

  // Initial focus -> close button (first interactive element)
  setTimeout(() => {
    try {
      const closeBtn = header.querySelector('.sim-close-btn');
      if (closeBtn) closeBtn.focus();
    } catch (_) {}
  }, 0);

  return { close };
}

export default openSymbolInfoModal;
