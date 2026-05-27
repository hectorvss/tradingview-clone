// forex-crypto-matrix.js — Two self-contained TradingView-style widgets.
//
// Exports:
//   createCrossRatesMatrix(container, opts)       -> { destroy, refresh, setRates }
//   createCryptoMarketCapHeatmap(container, opts) -> { destroy, refresh, setCoins }
//
// No external runtime deps. CSS is injected once. Styling mirrors the rest of
// the tradingview-ui shell (dark theme, grey/green/red tokens).

// ---------------------------------------------------------------------------
// One-time style injection
// ---------------------------------------------------------------------------
let _stylesInjected = false;

function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const css = `
.fxm-root, .cmh-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  color: #d1d4dc;
  background: var(--grey-6, #0f0f0f);
  padding: 12px;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}
.fxm-title, .cmh-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0 0 10px 0;
  letter-spacing: 0.2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fxm-title .fxm-sub, .cmh-title .cmh-sub {
  font-size: 11px;
  font-weight: 400;
  color: #787b86;
}

/* ---- Cross rates matrix ------------------------------------------------ */
.fxm-table {
  border-collapse: separate;
  border-spacing: 2px;
  width: 100%;
  table-layout: fixed;
}
.fxm-table th, .fxm-table td {
  padding: 0;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  height: 56px;
  border-radius: 3px;
  user-select: none;
}
.fxm-table th {
  background: #0f0f0f;
  color: #787b86;
  font-weight: 600;
  height: 28px;
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 3;
}
.fxm-table tbody th {
  position: sticky;
  left: 0;
  z-index: 2;
}
.fxm-table th.fxm-corner {
  background: #0f0f0f;
  z-index: 4;
  left: 0;
}
.fxm-cell {
  background: #1e222d;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.1s ease, box-shadow 0.1s ease, outline-color 0.1s ease;
  position: relative;
  outline: 1px solid transparent;
  outline-offset: -1px;
}
.fxm-cell:hover {
  filter: brightness(1.18);
  transform: translateY(-1px) scale(1.03);
  outline-color: #2962ff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 2;
}
.fxm-cell.fxm-diag {
  background: #131722;
  color: #4a4e5a;
  cursor: default;
}
.fxm-cell.fxm-diag:hover {
  filter: none;
  transform: none;
  outline-color: transparent;
  box-shadow: none;
}
.fxm-cell.fxm-up   { color: #b6f0c8; }
.fxm-cell.fxm-down { color: #ffd0d0; }
.fxm-cell.fxm-flat { background: #1e222d; color: #d1d4dc; }
.fxm-cell.fxm-strong-up   { color: #fff; }
.fxm-cell.fxm-strong-down { color: #fff; }
.fxm-cell .fxm-rate {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}
.fxm-cell .fxm-chg {
  display: block;
  font-size: 10px;
  opacity: 0.85;
  margin-top: 3px;
}

.fxm-tooltip, .cmh-tooltip {
  position: fixed;
  z-index: 9999;
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 11px;
  color: #d1d4dc;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fxm-tooltip .fxm-tt-pair, .cmh-tooltip .cmh-tt-sym {
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 4px;
  color: #fff;
}
.fxm-tooltip .fxm-tt-row, .cmh-tooltip .cmh-tt-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  line-height: 1.5;
}
.fxm-tooltip .fxm-tt-row span:first-child,
.cmh-tooltip .cmh-tt-row span:first-child {
  color: #787b86;
}

/* ---- Crypto market-cap heatmap ---------------------------------------- */
.cmh-canvas-wrap {
  position: relative;
  width: 100%;
  height: calc(100% - 28px);
  min-height: 320px;
}
.cmh-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.fxm-spinner, .cmh-spinner {
  position: absolute;
  top: 50%; left: 50%;
  width: 24px; height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #2962ff;
  border-radius: 50%;
  animation: fxm-spin 0.8s linear infinite;
  z-index: 5;
}
@keyframes fxm-spin {
  to { transform: rotate(360deg); }
}
`;
  const style = document.createElement('style');
  style.setAttribute('data-fxm-cmh', '1');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function _seededRand(seed) {
  // Mulberry32
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _fmtRate(v) {
  if (v >= 100) return v.toFixed(2);
  if (v >= 10)  return v.toFixed(3);
  if (v >= 1)   return v.toFixed(4);
  return v.toFixed(5);
}

function _fmtPrice(v) {
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1)    return '$' + v.toFixed(2);
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}

function _fmtCap(v) {
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2)  + 'B';
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2)  + 'M';
  return '$' + v.toFixed(0);
}

function _fmtPct(v) {
  const s = v >= 0 ? '+' : '';
  return s + v.toFixed(2) + '%';
}

// ===========================================================================
// 1. createCrossRatesMatrix
// ===========================================================================

const FX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];

// Approximate spot rates vs USD (1 USD = X CCY). Tuned for realism.
const FX_USD_RATES = {
  USD: 1.0,
  EUR: 0.9234,
  GBP: 0.7891,
  JPY: 152.34,
  AUD: 1.5123,
  CAD: 1.3654,
  CHF: 0.8812,
  NZD: 1.6478,
};

function _generateFxData(seed) {
  const rand = _seededRand(seed);
  const data = {};
  for (const base of FX_CURRENCIES) {
    data[base] = {};
    for (const quote of FX_CURRENCIES) {
      if (base === quote) { data[base][quote] = null; continue; }
      // Cross = (1 USD = quote) / (1 USD = base)  -> 1 base = X quote
      const rate = FX_USD_RATES[quote] / FX_USD_RATES[base];
      // Per-cell 24h change in [-0.6%, +0.6%], slight asymmetry by seed
      const chg = (rand() - 0.5) * 1.2;
      const spreadBps = 0.5 + rand() * 2.5;          // 0.5–3 bps half-spread
      const bid = rate * (1 - spreadBps / 10000);
      const ask = rate * (1 + spreadBps / 10000);
      const dayRange = rate * (0.002 + rand() * 0.006); // ~0.2–0.8% range
      const mid = rate;
      const high = mid + dayRange * (0.3 + rand() * 0.7);
      const low  = mid - dayRange * (0.3 + rand() * 0.7);
      data[base][quote] = {
        pair: base + quote,
        base,
        quote,
        rate: mid,
        bid,
        ask,
        high24: high,
        low24: low,
        chgPct: chg,
      };
    }
  }
  return data;
}

function createCrossRatesMatrix(container, opts = {}) {
  if (!container) throw new Error('createCrossRatesMatrix: container is required');
  ensureStyles();

  const {
    title = 'Cross Rates',
    subtitle = 'Major FX pairs',
    seed = 42,
    onSelectPair = null,
  } = opts;

  let rates = _generateFxData(seed);

  const root = document.createElement('div');
  root.className = 'fxm-root';

  const titleEl = document.createElement('div');
  titleEl.className = 'fxm-title';
  titleEl.innerHTML = `<span>${title}</span><span class="fxm-sub">${subtitle}</span>`;
  root.appendChild(titleEl);

  const tableEl = document.createElement('table');
  tableEl.className = 'fxm-table';
  root.appendChild(tableEl);

  container.appendChild(root);

  // Tooltip element (singleton, appended to body so it escapes overflow)
  const tooltip = document.createElement('div');
  tooltip.className = 'fxm-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  function classifyChange(chg) {
    if (chg > 0.01) return 'fxm-up';
    if (chg < -0.01) return 'fxm-down';
    return 'fxm-flat';
  }
  // Grade background colour intensity: |chg| >= 0.5% is "strong", otherwise
  // softer. Returns an inline-style background string.
  function gradedBg(chg) {
    if (chg > 0.01) {
      const strong = chg >= 0.5;
      // green palette
      // soft: #0f3a26   strong: #0a6b40
      return strong ? '#0a6b40' : '#0f3a26';
    }
    if (chg < -0.01) {
      const strong = chg <= -0.5;
      // red palette: soft #3a1418  strong #6b1a22
      return strong ? '#6b1a22' : '#3a1418';
    }
    return '#1e222d';
  }

  function render() {
    tableEl.innerHTML = '';

    // Header row
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'fxm-corner';
    hr.appendChild(corner);
    for (const q of FX_CURRENCIES) {
      const th = document.createElement('th');
      th.textContent = q;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    tableEl.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const base of FX_CURRENCIES) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = base;
      tr.appendChild(th);
      for (const quote of FX_CURRENCIES) {
        const td = document.createElement('td');
        if (base === quote) {
          td.className = 'fxm-cell fxm-diag';
          td.textContent = '—';
          tr.appendChild(td);
          continue;
        }
        const cell = rates[base][quote];
        const cls = classifyChange(cell.chgPct);
        const strong = Math.abs(cell.chgPct) >= 0.5
          ? (cell.chgPct > 0 ? ' fxm-strong-up' : ' fxm-strong-down')
          : '';
        td.className = 'fxm-cell ' + cls + strong;
        td.style.background = gradedBg(cell.chgPct);
        td.innerHTML = `
          <span class="fxm-rate">${_fmtRate(cell.rate)}</span>
          <span class="fxm-chg">${_fmtPct(cell.chgPct)}</span>
        `;
        td.dataset.base = base;
        td.dataset.quote = quote;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
  }

  function showTooltip(cell, ev) {
    tooltip.innerHTML = `
      <div class="fxm-tt-pair">${cell.pair}</div>
      <div class="fxm-tt-row"><span>Rate</span><span>${_fmtRate(cell.rate)}</span></div>
      <div class="fxm-tt-row"><span>Bid</span><span>${_fmtRate(cell.bid)}</span></div>
      <div class="fxm-tt-row"><span>Ask</span><span>${_fmtRate(cell.ask)}</span></div>
      <div class="fxm-tt-row"><span>24h High</span><span>${_fmtRate(cell.high24)}</span></div>
      <div class="fxm-tt-row"><span>24h Low</span><span>${_fmtRate(cell.low24)}</span></div>
      <div class="fxm-tt-row"><span>24h Chg</span><span>${_fmtPct(cell.chgPct)}</span></div>
    `;
    tooltip.style.display = 'block';
    moveTooltip(ev);
  }

  function moveTooltip(ev) {
    const pad = 14;
    const w = tooltip.offsetWidth;
    const h = tooltip.offsetHeight;
    let x = ev.clientX + pad;
    let y = ev.clientY + pad;
    if (x + w > window.innerWidth)  x = ev.clientX - w - pad;
    if (y + h > window.innerHeight) y = ev.clientY - h - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  function onMouseOver(ev) {
    const td = ev.target.closest('td.fxm-cell');
    if (!td || td.classList.contains('fxm-diag')) { hideTooltip(); return; }
    const cell = rates[td.dataset.base][td.dataset.quote];
    if (cell) showTooltip(cell, ev);
  }
  let _ttRaf = 0;
  let _ttEvt = null;
  function onMouseMove(ev) {
    if (tooltip.style.display !== 'block') return;
    _ttEvt = ev;
    if (_ttRaf) return;
    _ttRaf = requestAnimationFrame(() => {
      _ttRaf = 0;
      if (_ttEvt) moveTooltip(_ttEvt);
    });
  }
  function onMouseOut(ev) {
    const td = ev.target.closest('td.fxm-cell');
    if (!td) return;
    if (!td.contains(ev.relatedTarget)) hideTooltip();
  }
  function onClick(ev) {
    const td = ev.target.closest('td.fxm-cell');
    if (!td || td.classList.contains('fxm-diag')) return;
    const pair = td.dataset.base + td.dataset.quote;
    if (typeof onSelectPair === 'function') onSelectPair(pair);
  }

  tableEl.addEventListener('mouseover', onMouseOver);
  tableEl.addEventListener('mousemove', onMouseMove);
  tableEl.addEventListener('mouseout', onMouseOut);
  tableEl.addEventListener('click', onClick);

  render();

  return {
    refresh(newSeed) {
      rates = _generateFxData(newSeed != null ? newSeed : (Date.now() & 0xffff));
      render();
    },
    setRates(newRates) {
      rates = newRates;
      render();
    },
    destroy() {
      tableEl.removeEventListener('mouseover', onMouseOver);
      tableEl.removeEventListener('mousemove', onMouseMove);
      tableEl.removeEventListener('mouseout', onMouseOut);
      tableEl.removeEventListener('click', onClick);
      if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

// ===========================================================================
// 2. createCryptoMarketCapHeatmap
// ===========================================================================

// Approximate market caps (USD, late-cycle realistic). Sorted desc.
const DEFAULT_COINS = [
  { symbol: 'BTC',   name: 'Bitcoin',      price: 67234.21, cap: 1.325e12 },
  { symbol: 'ETH',   name: 'Ethereum',     price: 3521.88,  cap: 4.23e11  },
  { symbol: 'USDT',  name: 'Tether',       price: 1.0001,   cap: 1.12e11  },
  { symbol: 'BNB',   name: 'BNB',          price: 612.45,   cap: 9.05e10  },
  { symbol: 'SOL',   name: 'Solana',       price: 174.32,   cap: 8.12e10  },
  { symbol: 'USDC',  name: 'USD Coin',     price: 0.9999,   cap: 3.42e10  },
  { symbol: 'XRP',   name: 'XRP',          price: 0.5234,   cap: 2.91e10  },
  { symbol: 'DOGE',  name: 'Dogecoin',     price: 0.1623,   cap: 2.34e10  },
  { symbol: 'TON',   name: 'Toncoin',      price: 7.21,     cap: 1.82e10  },
  { symbol: 'ADA',   name: 'Cardano',      price: 0.4521,   cap: 1.61e10  },
  { symbol: 'AVAX',  name: 'Avalanche',    price: 38.42,    cap: 1.51e10  },
  { symbol: 'SHIB',  name: 'Shiba Inu',    price: 0.0000234,cap: 1.38e10  },
  { symbol: 'TRX',   name: 'TRON',         price: 0.1421,   cap: 1.23e10  },
  { symbol: 'LINK',  name: 'Chainlink',    price: 17.84,    cap: 1.05e10  },
  { symbol: 'DOT',   name: 'Polkadot',     price: 7.12,     cap: 9.51e9   },
  { symbol: 'MATIC', name: 'Polygon',      price: 0.7234,   cap: 7.21e9   },
  { symbol: 'BCH',   name: 'Bitcoin Cash', price: 432.11,   cap: 6.84e9   },
  { symbol: 'LTC',   name: 'Litecoin',     price: 86.45,    cap: 6.42e9   },
  { symbol: 'NEAR',  name: 'NEAR',         price: 5.67,     cap: 6.11e9   },
  { symbol: 'UNI',   name: 'Uniswap',      price: 9.45,     cap: 5.62e9   },
  { symbol: 'ICP',   name: 'Internet Comp',price: 11.23,    cap: 5.21e9   },
  { symbol: 'LEO',   name: 'UNUS SED LEO', price: 5.84,     cap: 4.82e9   },
  { symbol: 'APT',   name: 'Aptos',        price: 9.12,     cap: 4.31e9   },
  { symbol: 'ETC',   name: 'Ether Classic',price: 28.34,    cap: 4.12e9   },
  { symbol: 'XLM',   name: 'Stellar',      price: 0.1234,   cap: 3.61e9   },
  { symbol: 'ATOM',  name: 'Cosmos',       price: 8.91,     cap: 3.42e9   },
  { symbol: 'OKB',   name: 'OKB',          price: 52.31,    cap: 3.18e9   },
  { symbol: 'XMR',   name: 'Monero',       price: 167.34,   cap: 3.07e9   },
  { symbol: 'FIL',   name: 'Filecoin',     price: 5.23,     cap: 2.91e9   },
  { symbol: 'HBAR',  name: 'Hedera',       price: 0.0834,   cap: 2.84e9   },
];

function _assignChangePcts(coins, seed) {
  const rand = _seededRand(seed);
  return coins.map(c => ({
    ...c,
    chgPct: (rand() * 2 - 1) * 10, // [-10%, +10%]
  }));
}

// Squarified treemap (Bruls/Huijbregts/van Wijk, 2000).
function _squarify(items, x, y, w, h) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const scale = (w * h) / total;
  const scaled = items.map(it => ({ ...it, _area: it.value * scale }));

  const result = [];
  _squarifyRec(scaled, [], { x, y, w, h }, result);
  return result;
}

function _squarifyRec(children, row, rect, out) {
  if (children.length === 0) {
    if (row.length) _layoutRow(row, rect, out);
    return;
  }
  const c = children[0];
  const newRow = row.concat([c]);
  const w = Math.min(rect.w, rect.h);
  if (row.length === 0 || _worst(row, w) >= _worst(newRow, w)) {
    _squarifyRec(children.slice(1), newRow, rect, out);
  } else {
    const newRect = _layoutRow(row, rect, out);
    _squarifyRec(children, [], newRect, out);
  }
}

function _worst(row, w) {
  if (row.length === 0) return Infinity;
  const sum = row.reduce((s, r) => s + r._area, 0);
  let rMax = -Infinity, rMin = Infinity;
  for (const r of row) {
    if (r._area > rMax) rMax = r._area;
    if (r._area < rMin) rMin = r._area;
  }
  const w2 = w * w;
  const sum2 = sum * sum;
  return Math.max((w2 * rMax) / sum2, sum2 / (w2 * rMin));
}

function _layoutRow(row, rect, out) {
  const sum = row.reduce((s, r) => s + r._area, 0);
  const horizontal = rect.w >= rect.h;
  if (horizontal) {
    const rowW = sum / rect.h;
    let yy = rect.y;
    for (const r of row) {
      const h = r._area / rowW;
      out.push({ item: r, x: rect.x, y: yy, w: rowW, h });
      yy += h;
    }
    return { x: rect.x + rowW, y: rect.y, w: rect.w - rowW, h: rect.h };
  } else {
    const rowH = sum / rect.w;
    let xx = rect.x;
    for (const r of row) {
      const w = r._area / rowH;
      out.push({ item: r, x: xx, y: rect.y, w, h: rowH });
      xx += w;
    }
    return { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
  }
}

function _colorForChange(pct) {
  // Map [-10, +10] -> red..neutral..green
  const clamped = Math.max(-10, Math.min(10, pct));
  const t = clamped / 10; // [-1, +1]
  if (t >= 0) {
    // neutral -> green:  #2a2e39 -> #26a69a
    const r = Math.round(42 + (38 - 42) * t);
    const g = Math.round(46 + (166 - 46) * t);
    const b = Math.round(57 + (154 - 57) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // neutral -> red: #2a2e39 -> #ef5350
    const k = -t;
    const r = Math.round(42 + (239 - 42) * k);
    const g = Math.round(46 + (83 - 46)  * k);
    const b = Math.round(57 + (80 - 57)  * k);
    return `rgb(${r},${g},${b})`;
  }
}

function createCryptoMarketCapHeatmap(container, opts = {}) {
  if (!container) throw new Error('createCryptoMarketCapHeatmap: container is required');
  ensureStyles();

  const {
    title = 'Crypto Market Cap',
    subtitle = '24h performance',
    seed = 7,
    coins: userCoins = null,
    onSelectCoin = null,
  } = opts;

  let coins = _assignChangePcts(userCoins || DEFAULT_COINS, seed)
    .slice()
    .sort((a, b) => b.cap - a.cap);

  const root = document.createElement('div');
  root.className = 'cmh-root';

  const titleEl = document.createElement('div');
  titleEl.className = 'cmh-title';
  titleEl.innerHTML = `<span>${title}</span><span class="cmh-sub">${subtitle}</span>`;
  root.appendChild(titleEl);

  const wrap = document.createElement('div');
  wrap.className = 'cmh-canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'cmh-canvas';
  wrap.appendChild(canvas);
  root.appendChild(wrap);

  container.appendChild(root);

  const tooltip = document.createElement('div');
  tooltip.className = 'cmh-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  let layout = []; // {item, x, y, w, h} in CSS px
  let dpr = window.devicePixelRatio || 1;
  let cssW = 0, cssH = 0;
  let hoverNode = null;

  function computeLayout() {
    const rect = wrap.getBoundingClientRect();
    cssW = Math.max(100, Math.floor(rect.width));
    cssH = Math.max(100, Math.floor(rect.height));
    dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const items = coins.map(c => ({ ...c, value: c.cap }));
    layout = _squarify(items, 0, 0, cssW, cssH);
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, cssW, cssH);

    for (const node of layout) {
      const { item, x, y, w, h } = node;
      if (w < 1 || h < 1) continue;

      // Tile fill
      ctx.fillStyle = _colorForChange(item.chgPct);
      ctx.fillRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));

      // Border
      ctx.strokeStyle = '#0f0f0f';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      // Skip text on tiny tiles
      if (w < 36 || h < 28) continue;

      const cx = x + w / 2;
      const cy = y + h / 2;

      // Pick font size from tile dimensions
      const area = w * h;
      const tickerSize = Math.max(10, Math.min(34, Math.sqrt(area) / 6));
      const subSize = Math.max(9, Math.min(16, tickerSize * 0.45));

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Drop shadow on labels for legibility on coloured backgrounds.
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.font = `700 ${tickerSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const tickerY = h > 70 ? cy - tickerSize * 0.55 : cy - tickerSize * 0.1;
      ctx.fillText(item.symbol, cx, tickerY);

      if (h > 60 && w > 60) {
        ctx.font = `500 ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillText(_fmtPrice(item.price), cx, cy + subSize * 0.2);

        if (h > 90) {
          ctx.font = `600 ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = item.chgPct >= 0 ? '#b6f0c8' : '#ffd0d0';
          ctx.fillText(_fmtPct(item.chgPct), cx, cy + subSize * 1.6);
        }
      }
      // reset shadow before next tile
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Hover highlight on top of everything
    if (hoverNode) {
      const { x, y, w, h } = hoverNode;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
    }
  }

  function render() {
    computeLayout();
    draw();
  }

  function hitTest(cssX, cssY) {
    // Tiles don't overlap and are returned in order; linear scan is fine for 30.
    for (const node of layout) {
      if (cssX >= node.x && cssX <= node.x + node.w &&
          cssY >= node.y && cssY <= node.y + node.h) {
        return node;
      }
    }
    return null;
  }

  function showTooltip(item, ev) {
    tooltip.innerHTML = `
      <div class="cmh-tt-sym">${item.symbol} <span style="color:#787b86;font-weight:400;font-size:11px;">${item.name || ''}</span></div>
      <div class="cmh-tt-row"><span>Price</span><span>${_fmtPrice(item.price)}</span></div>
      <div class="cmh-tt-row"><span>Market Cap</span><span>${_fmtCap(item.cap)}</span></div>
      <div class="cmh-tt-row"><span>24h Chg</span><span style="color:${item.chgPct >= 0 ? '#26a69a' : '#ef5350'}">${_fmtPct(item.chgPct)}</span></div>
    `;
    tooltip.style.display = 'block';
    moveTooltip(ev);
  }

  function moveTooltip(ev) {
    const pad = 14;
    const w = tooltip.offsetWidth;
    const h = tooltip.offsetHeight;
    let x = ev.clientX + pad;
    let y = ev.clientY + pad;
    if (x + w > window.innerWidth)  x = ev.clientX - w - pad;
    if (y + h > window.innerHeight) y = ev.clientY - h - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  let _moveRaf = 0;
  let _moveEvt = null;
  function onMove(ev) {
    _moveEvt = ev;
    if (_moveRaf) return;
    _moveRaf = requestAnimationFrame(() => {
      _moveRaf = 0;
      const e = _moveEvt;
      if (!e) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      const changed = hit !== hoverNode;
      hoverNode = hit;
      if (hit) showTooltip(hit.item, e);
      else hideTooltip();
      if (changed) draw();
    });
  }

  function onLeave() { hideTooltip(); if (hoverNode) { hoverNode = null; draw(); } }

  function onClick(ev) {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
    if (hit && typeof onSelectCoin === 'function') {
      onSelectCoin(hit.item.symbol);
    }
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('click', onClick);

  // Re-render on resize
  let resizeRaf = 0;
  const ro = new ResizeObserver(() => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(render);
  });
  ro.observe(wrap);

  // Initial paint after layout
  requestAnimationFrame(render);

  return {
    refresh(newSeed) {
      coins = _assignChangePcts(userCoins || DEFAULT_COINS, newSeed != null ? newSeed : (Date.now() & 0xffff))
        .slice()
        .sort((a, b) => b.cap - a.cap);
      render();
    },
    setCoins(newCoins) {
      coins = newCoins.slice().sort((a, b) => b.cap - a.cap);
      render();
    },
    destroy() {
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
      if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

export {
  createCrossRatesMatrix,
  createCryptoMarketCapHeatmap,
};
