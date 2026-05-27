// multi-tf-compare.js
// Two self-contained tools for TradingView-style UI:
//   1) createMultiTimeframeView(container, opts)  — same symbol across N timeframes in a grid
//   2) createSymbolCompareModal(opts)             — modal wizard to compare normalized prices
//
// Library: lightweight-charts v5.2.0
// Dark theme. CSS injected once. No external deps beyond lightweight-charts.

import {
  createChart,
  CandlestickSeries,
  LineSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

/* ============================================================ *
 * Shared: CSS injection (single tag, idempotent)
 * ============================================================ */

const STYLE_ID = 'mtf-cmp-styles-v1';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
.mtf-grid {
  display: grid;
  gap: 8px;
  width: 100%;
  height: 100%;
  background: #0b0e13;
  padding: 8px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #d1d4dc;
}
.mtf-panel {
  position: relative;
  background: #131722;
  border: 1px solid #1e222d;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}
.mtf-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  background: #1a1f2c;
  border-bottom: 1px solid #1e222d;
  user-select: none;
}
.mtf-panel-tf {
  font-weight: 600;
  color: #d1d4dc;
  letter-spacing: 0.5px;
}
.mtf-panel-sym {
  color: #787b86;
  font-size: 11px;
}
.mtf-panel-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: #787b86;
}
.mtf-panel-meta .px {
  color: #26a69a;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.mtf-panel-meta .px.dn { color: #ef5350; }
.mtf-panel-chart {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
}

/* ===== Compare modal ===== */
@keyframes cmpmd-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes cmpmd-pop-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.cmpmd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #d1d4dc;
  animation: cmpmd-fade-in .15s ease-out;
}
.cmpmd {
  width: min(1080px, 96vw);
  max-width: 1080px;
  height: min(720px, 90vh);
  max-height: 90vh;
  background: #131722;
  border: 1px solid #2a2e39;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0,0,0,0.6);
  animation: cmpmd-pop-in .15s ease-out;
}
.cmpmd:focus { outline: none; }
.cmpmd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #131722;
  border-bottom: 1px solid #2a2e39;
}
.cmpmd-title { font-size: 14px; font-weight: 600; color: #f0f3fa; }
.cmpmd-close {
  width: 24px; height: 24px;
  background: transparent;
  color: #787b86;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  line-height: 1;
}
.cmpmd-close:hover { background: #2a2e39; color: #d1d4dc; }
.cmpmd-close:focus-visible { outline: 2px solid #2962ff; outline-offset: 1px; }
.cmpmd-body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 0;
}
.cmpmd-side {
  border-right: 1px solid #2a2e39;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #0f131c;
  scrollbar-width: thin;
  scrollbar-color: #2a2e39 transparent;
}
.cmpmd-side::-webkit-scrollbar { width: 8px; }
.cmpmd-side::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
.cmpmd-side::-webkit-scrollbar-thumb:hover { background: #363a45; }
.cmpmd-side::-webkit-scrollbar-track { background: transparent; }
.cmpmd-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.cmpmd-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #787b86;
  margin: 2px 0 4px 0;
}
.cmpmd-input {
  width: 100%;
  background: #1a1f2c;
  border: 1px solid #2a2e39;
  color: #d1d4dc;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  box-sizing: border-box;
}
.cmpmd-input:focus { outline: none; border-color: #3179f5; }
.cmpmd-search-results {
  max-height: 160px;
  overflow-y: auto;
  background: #0b0e13;
  border: 1px solid #1e222d;
  border-radius: 4px;
  margin-top: 4px;
  display: none;
}
.cmpmd-search-results.open { display: block; }
.cmpmd-search-item {
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.cmpmd-search-item:hover { background: #1e2230; }
.cmpmd-search-item .sym { font-weight: 600; }
.cmpmd-search-item .name { color: #787b86; font-size: 11px; }
.cmpmd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cmpmd-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1a1f2c;
  border: 1px solid #2a2e39;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.cmpmd-chip .swatch {
  width: 10px; height: 10px; border-radius: 50%;
}
.cmpmd-chip .x {
  background: transparent; border: none; color: #787b86; cursor: pointer; padding: 0 2px;
}
.cmpmd-chip .x:hover { color: #ef5350; }
.cmpmd-chip.base { border-color: #3179f5; }
.cmpmd-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cmpmd-pill {
  background: #1a1f2c;
  border: 1px solid #2a2e39;
  color: #d1d4dc;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.cmpmd-pill.active { background: #3179f5; border-color: #3179f5; color: #fff; }
.cmpmd-pill:hover:not(.active) { background: #2a2e39; }
.cmpmd-chart-wrap {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  background: #131722;
}
.cmpmd-stats {
  border-top: 1px solid #2a2e39;
  max-height: 180px;
  overflow: auto;
  background: #0f131c;
}
.cmpmd-stats table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.cmpmd-stats th, .cmpmd-stats td {
  padding: 6px 10px;
  text-align: right;
  border-bottom: 1px solid #1e222d;
  font-variant-numeric: tabular-nums;
}
.cmpmd-stats th {
  background: #1a1f2c;
  font-weight: 500;
  color: #787b86;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.6px;
  position: sticky;
  top: 0;
}
.cmpmd-stats th:first-child, .cmpmd-stats td:first-child { text-align: left; }
.cmpmd-stats td .swatch {
  display: inline-block; width: 10px; height: 10px; border-radius: 50%;
  margin-right: 6px; vertical-align: middle;
}
.cmpmd-stats .pos { color: #26a69a; }
.cmpmd-stats .neg { color: #ef5350; }
.cmpmd-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #1a1f2c;
  border-top: 1px solid #2a2e39;
  gap: 8px;
}
.cmpmd-btn {
  background: #2a2e39;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  height: 32px;
  padding: 0 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex; align-items: center; justify-content: center;
}
.cmpmd-btn:hover { background: #353a47; }
.cmpmd-btn:focus-visible { outline: 2px solid #2962ff; outline-offset: 1px; }
.cmpmd-btn.primary { background: #2962ff; border-color: #2962ff; color: #fff; }
.cmpmd-btn.primary:hover { background: #1976d2; border-color: #1976d2; }
.cmpmd-btn.ghost { background: transparent; }
.cmpmd-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: #787b86; font-size: 13px;
}
`;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

/* ============================================================ *
 * Shared helpers — synthetic OHLC generator + symbol catalog
 * ============================================================ */

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// Hash a string to a deterministic 32-bit seed
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Timeframe → seconds per bar
const TF_SECONDS = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1D': 24 * 60 * 60,
  '1W': 7 * 24 * 60 * 60,
};

function tfSeconds(tf) {
  return TF_SECONDS[tf] || TF_SECONDS['1D'];
}

// Generate synthetic OHLC candles ending at `now` (UTC seconds)
function generateCandles(symbol, timeframe, count = 200, endTs = null) {
  const step = tfSeconds(timeframe);
  const intraday = step < TF_SECONDS['1D'];
  const now = endTs == null ? Math.floor(Date.now() / 1000) : endTs;
  // Align end to step
  const end = Math.floor(now / step) * step;
  const seed = hashSeed(`${symbol}|${timeframe}`);
  const rng = lcg(seed);
  // Base price depends on symbol
  const basePrice = 20 + ((hashSeed(symbol) % 4000) / 10);
  let price = basePrice;
  const vol = 0.0035 + (hashSeed(symbol + '|v') % 100) / 12000; // per-bar vol
  const drift = ((hashSeed(symbol + '|d') % 200) - 100) / 100000;

  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    // We'll fill backward then reverse — but easier forward; compute time forward from start
  }
  const startBars = count;
  for (let i = 0; i < startBars; i++) {
    const t = end - (startBars - 1 - i) * step;
    // Skip weekends for daily-ish only (simulate market hours not enforced for intraday)
    const shock = (rng() - 0.5) * 2 * vol;
    const open = price;
    const close = Math.max(0.01, open * (1 + drift + shock));
    const hi = Math.max(open, close) * (1 + Math.abs(rng() - 0.5) * vol * 0.7);
    const lo = Math.min(open, close) * (1 - Math.abs(rng() - 0.5) * vol * 0.7);
    out.push({
      time: t,
      open: round2(open),
      high: round2(hi),
      low: round2(lo),
      close: round2(close),
    });
    price = close;
  }
  return out;
}

function round2(v) { return Math.round(v * 100) / 100; }

// Catalog used by search; can be extended via opts
const DEFAULT_SYMBOLS = [
  { symbol: 'NVDA',  name: 'NVIDIA Corp.' },
  { symbol: 'AAPL',  name: 'Apple Inc.' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.' },
  { symbol: 'META',  name: 'Meta Platforms' },
  { symbol: 'TSLA',  name: 'Tesla Inc.' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'NFLX',  name: 'Netflix Inc.' },
  { symbol: 'SPY',   name: 'S&P 500 ETF' },
  { symbol: 'QQQ',   name: 'Nasdaq 100 ETF' },
  { symbol: 'BTCUSD', name: 'Bitcoin / USD' },
  { symbol: 'ETHUSD', name: 'Ethereum / USD' },
  { symbol: 'EURUSD', name: 'Euro / USD' },
  { symbol: 'GLD',   name: 'Gold ETF' },
];

// Distinct palette
const PALETTE = [
  '#3179f5', '#ef5350', '#26a69a', '#ffb74d', '#ab47bc',
  '#26c6da', '#f06292', '#9ccc65', '#ff7043', '#7e57c2',
];

/* ============================================================ *
 * Tool 1: createMultiTimeframeView
 * ============================================================ */

export function createMultiTimeframeView(container, opts = {}) {
  if (!container) throw new Error('createMultiTimeframeView: container required');
  injectStyles();

  const state = {
    symbol: opts.symbol || 'NVDA',
    timeframes: Array.isArray(opts.timeframes) && opts.timeframes.length
      ? opts.timeframes.slice()
      : ['5m', '15m', '1h', '4h', '1D'],
    syncCrosshair: opts.syncCrosshair !== false,
    candleCount: opts.candleCount || 180,
  };

  // Build grid
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'mtf-grid';
  const n = state.timeframes.length;
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  container.appendChild(grid);

  // Panels
  const panels = state.timeframes.map((tf) => createPanel(grid, tf, state));

  // Initial render
  function render() {
    for (const p of panels) p.loadData(state.symbol);
  }
  render();

  // Crosshair sync
  let syncing = false;
  if (state.syncCrosshair) {
    for (const p of panels) {
      p.chart.subscribeCrosshairMove((param) => {
        if (syncing) return;
        if (!param || !param.time) {
          syncing = true;
          for (const q of panels) if (q !== p) q.chart.clearCrosshairPosition();
          syncing = false;
          return;
        }
        syncing = true;
        for (const q of panels) {
          if (q === p) continue;
          // Find closest bar by time
          const d = q.data;
          if (!d || !d.length) continue;
          let best = d[0], bestDiff = Math.abs(d[0].time - param.time);
          for (let i = 1; i < d.length; i++) {
            const diff = Math.abs(d[i].time - param.time);
            if (diff < bestDiff) { bestDiff = diff; best = d[i]; }
          }
          try {
            q.chart.setCrosshairPosition(best.close, best.time, q.series);
          } catch (_) { /* series may differ; ignore */ }
        }
        syncing = false;
      });
    }
  }

  // Resize observer
  const ro = new ResizeObserver(() => {
    for (const p of panels) p.resize();
  });
  ro.observe(container);

  return {
    destroy() {
      try { ro.disconnect(); } catch (_) {}
      for (const p of panels) p.destroy();
      container.innerHTML = '';
    },
    setSymbol(sym) {
      state.symbol = sym;
      for (const p of panels) {
        p.head.symEl.textContent = sym;
        p.loadData(sym);
      }
    },
    getSymbol() { return state.symbol; },
    getTimeframes() { return state.timeframes.slice(); },
  };
}

function createPanel(grid, tf, state) {
  const panel = document.createElement('div');
  panel.className = 'mtf-panel';

  const head = document.createElement('div');
  head.className = 'mtf-panel-head';
  const left = document.createElement('div');
  const tfEl = document.createElement('span');
  tfEl.className = 'mtf-panel-tf';
  tfEl.textContent = tf;
  const symEl = document.createElement('span');
  symEl.className = 'mtf-panel-sym';
  symEl.textContent = '  ' + state.symbol;
  left.appendChild(tfEl); left.appendChild(symEl);

  const meta = document.createElement('div');
  meta.className = 'mtf-panel-meta';
  const pxEl = document.createElement('span');
  pxEl.className = 'px';
  const cntEl = document.createElement('span');
  cntEl.textContent = '0 bars';
  meta.appendChild(pxEl); meta.appendChild(cntEl);

  head.appendChild(left); head.appendChild(meta);
  panel.appendChild(head);

  const chartEl = document.createElement('div');
  chartEl.className = 'mtf-panel-chart';
  panel.appendChild(chartEl);

  grid.appendChild(panel);

  const chart = createChart(chartEl, {
    layout: {
      background: { color: '#131722' },
      textColor: '#9ca3af',
      fontSize: 10,
    },
    grid: {
      vertLines: { color: '#1e222d' },
      horzLines: { color: '#1e222d' },
    },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.1 } },
    timeScale: { borderColor: '#2a2e39', timeVisible: tfSeconds(tf) < TF_SECONDS['1D'], secondsVisible: false },
    autoSize: true,
    handleScroll: true,
    handleScale: true,
  });

  const series = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350',
    borderUpColor: '#26a69a', borderDownColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
  });

  const obj = {
    panel, head: { symEl, tfEl },
    chart, series,
    data: [],
    loadData(sym) {
      const data = generateCandles(sym, tf, state.candleCount);
      obj.data = data;
      series.setData(data);
      chart.timeScale().fitContent();
      if (data.length) {
        const last = data[data.length - 1];
        const prev = data[data.length - 2] || last;
        pxEl.textContent = last.close.toFixed(2);
        pxEl.classList.toggle('dn', last.close < prev.close);
      } else {
        pxEl.textContent = '—';
      }
      cntEl.textContent = data.length + ' bars';
    },
    resize() {
      // autoSize handles this; nothing to do
    },
    destroy() {
      try { chart.remove(); } catch (_) {}
      try { panel.remove(); } catch (_) {}
    },
  };
  return obj;
}

/* ============================================================ *
 * Tool 2: createSymbolCompareModal
 * ============================================================ */

const NORMALIZATIONS = [
  { id: 'pct', label: '% change' },
  { id: 'abs', label: 'Absolute' },
  { id: 'log', label: 'Log scale' },
];

const PERIODS = [
  { id: '1D',  label: '1D',  days: 1 },
  { id: '5D',  label: '5D',  days: 5 },
  { id: '1M',  label: '1M',  days: 22 },
  { id: '3M',  label: '3M',  days: 66 },
  { id: '1Y',  label: '1Y',  days: 252 },
  { id: '5Y',  label: '5Y',  days: 252 * 5 },
  { id: 'All', label: 'All', days: 252 * 10 },
];

export function createSymbolCompareModal(opts = {}) {
  injectStyles();

  const catalog = (opts.catalog && opts.catalog.length) ? opts.catalog : DEFAULT_SYMBOLS;
  const state = {
    base: opts.base || (opts.symbols && opts.symbols[0]) || 'NVDA',
    compare: (opts.symbols ? opts.symbols.slice(1) : (opts.compare || ['AAPL', 'MSFT'])).slice(0, 9),
    normalization: opts.normalization || 'pct',
    period: opts.period || '1Y',
  };

  // Build DOM
  const overlay = document.createElement('div');
  overlay.className = 'cmpmd-overlay';
  overlay.innerHTML = `
    <div class="cmpmd" role="dialog" aria-modal="true">
      <div class="cmpmd-head">
        <div class="cmpmd-title">Symbol comparison</div>
        <button class="cmpmd-close" data-act="close" aria-label="Close">×</button>
      </div>
      <div class="cmpmd-body">
        <div class="cmpmd-side">
          <div>
            <div class="cmpmd-section-label">Base symbol</div>
            <div class="cmpmd-chips" data-el="base-chips"></div>
          </div>
          <div>
            <div class="cmpmd-section-label">Add symbol</div>
            <input class="cmpmd-input" data-el="search" type="text" placeholder="Search ticker or name…" autocomplete="off"/>
            <div class="cmpmd-search-results" data-el="search-results"></div>
          </div>
          <div>
            <div class="cmpmd-section-label">Comparison symbols</div>
            <div class="cmpmd-chips" data-el="cmp-chips"></div>
          </div>
          <div>
            <div class="cmpmd-section-label">Normalization</div>
            <div class="cmpmd-row" data-el="norm-row"></div>
          </div>
          <div>
            <div class="cmpmd-section-label">Period</div>
            <div class="cmpmd-row" data-el="period-row"></div>
          </div>
        </div>
        <div class="cmpmd-main">
          <div class="cmpmd-chart-wrap" data-el="chart"></div>
          <div class="cmpmd-stats" data-el="stats"></div>
        </div>
      </div>
      <div class="cmpmd-foot">
        <button class="cmpmd-btn ghost" data-act="export">Export CSV</button>
        <div>
          <button class="cmpmd-btn" data-act="cancel">Cancel</button>
          <button class="cmpmd-btn primary" data-act="apply">Aplicar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const $ = (sel) => overlay.querySelector(sel);
  const els = {
    baseChips: $('[data-el="base-chips"]'),
    cmpChips:  $('[data-el="cmp-chips"]'),
    search:    $('[data-el="search"]'),
    results:   $('[data-el="search-results"]'),
    normRow:   $('[data-el="norm-row"]'),
    periodRow: $('[data-el="period-row"]'),
    chartWrap: $('[data-el="chart"]'),
    stats:     $('[data-el="stats"]'),
  };

  // Build pills
  function renderPills(row, options, currentId, onPick) {
    row.innerHTML = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'cmpmd-pill' + (o.id === currentId ? ' active' : '');
      b.textContent = o.label;
      b.addEventListener('click', () => onPick(o.id));
      row.appendChild(b);
    }
  }
  function renderNorm() {
    renderPills(els.normRow, NORMALIZATIONS, state.normalization, (id) => {
      state.normalization = id; renderNorm(); renderChart();
    });
  }
  function renderPeriod() {
    renderPills(els.periodRow, PERIODS, state.period, (id) => {
      state.period = id; renderPeriod(); renderChart();
    });
  }

  // Chip rendering
  function colorFor(symbol, idx) {
    return PALETTE[idx % PALETTE.length];
  }
  function renderChips() {
    // Base
    els.baseChips.innerHTML = '';
    const baseChip = document.createElement('span');
    baseChip.className = 'cmpmd-chip base';
    baseChip.innerHTML = `<span class="swatch" style="background:${PALETTE[0]}"></span><span>${escapeHtml(state.base)}</span>`;
    els.baseChips.appendChild(baseChip);

    els.cmpChips.innerHTML = '';
    state.compare.forEach((sym, i) => {
      const chip = document.createElement('span');
      chip.className = 'cmpmd-chip';
      chip.innerHTML = `<span class="swatch" style="background:${colorFor(sym, i + 1)}"></span><span>${escapeHtml(sym)}</span><button class="x" title="Remove">×</button>`;
      chip.querySelector('.x').addEventListener('click', () => {
        state.compare.splice(i, 1);
        renderChips(); renderChart();
      });
      els.cmpChips.appendChild(chip);
    });
    if (!state.compare.length) {
      const empty = document.createElement('span');
      empty.style.cssText = 'color:#787b86;font-size:11px;';
      empty.textContent = 'No comparisons yet.';
      els.cmpChips.appendChild(empty);
    }
  }

  // Search
  function runSearch(q) {
    q = (q || '').trim().toUpperCase();
    if (!q) { els.results.classList.remove('open'); els.results.innerHTML = ''; return; }
    const taken = new Set([state.base, ...state.compare].map(s => s.toUpperCase()));
    const matches = catalog
      .filter(c => !taken.has(c.symbol.toUpperCase()))
      .filter(c => c.symbol.toUpperCase().includes(q) || c.name.toUpperCase().includes(q))
      .slice(0, 12);
    // Also allow free-text symbol when nothing matches
    if (!matches.length && /^[A-Z0-9.\-:]{1,12}$/.test(q)) {
      matches.push({ symbol: q, name: '(custom)' });
    }
    els.results.innerHTML = '';
    for (const m of matches) {
      const it = document.createElement('div');
      it.className = 'cmpmd-search-item';
      it.innerHTML = `<span class="sym">${escapeHtml(m.symbol)}</span><span class="name">${escapeHtml(m.name)}</span>`;
      it.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addCompareSymbol(m.symbol);
        els.search.value = '';
        runSearch('');
        els.search.focus();
      });
      els.results.appendChild(it);
    }
    els.results.classList.toggle('open', matches.length > 0);
  }
  function addCompareSymbol(sym) {
    sym = String(sym).toUpperCase();
    if (sym === state.base.toUpperCase()) return;
    if (state.compare.some(s => s.toUpperCase() === sym)) return;
    if (state.compare.length >= 9) return;
    state.compare.push(sym);
    renderChips(); renderChart();
  }
  els.search.addEventListener('input', () => runSearch(els.search.value));
  els.search.addEventListener('focus', () => runSearch(els.search.value));
  els.search.addEventListener('blur', () => setTimeout(() => els.results.classList.remove('open'), 120));
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = els.search.value.trim().toUpperCase();
      if (q) { addCompareSymbol(q); els.search.value = ''; runSearch(''); }
    }
  });

  // Chart
  let chart = null;
  const seriesBySymbol = new Map();
  let lastSeries = []; // [{symbol,color,data:[{time,value}]}]

  function ensureChart() {
    if (chart) return;
    chart = createChart(els.chartWrap, {
      layout: { background: { color: '#131722' }, textColor: '#d1d4dc', fontSize: 11 },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2e39' },
      timeScale: { borderColor: '#2a2e39', timeVisible: false, secondsVisible: false },
      autoSize: true,
    });
  }
  function destroyChart() {
    if (chart) { try { chart.remove(); } catch (_) {} }
    chart = null;
    seriesBySymbol.clear();
  }

  function buildSeriesData() {
    const period = PERIODS.find(p => p.id === state.period) || PERIODS[4];
    // Pick a TF that fits the period reasonably
    let tf = '1D';
    if (period.days <= 1) tf = '5m';
    else if (period.days <= 5) tf = '15m';
    else if (period.days <= 22) tf = '1h';
    else if (period.days <= 66) tf = '4h';
    else tf = '1D';

    // Determine number of bars
    const barsPerDay = (24 * 60 * 60) / tfSeconds(tf);
    const count = Math.min(2000, Math.max(20, Math.round(period.days * barsPerDay)));

    const allSymbols = [state.base, ...state.compare];
    const series = [];
    for (let i = 0; i < allSymbols.length; i++) {
      const sym = allSymbols[i];
      const raw = generateCandles(sym, tf, count);
      if (!raw.length) continue;
      const color = colorFor(sym, i);
      const data = transformSeries(raw, state.normalization);
      series.push({ symbol: sym, color, raw, data });
    }
    return series;
  }

  function transformSeries(raw, mode) {
    if (mode === 'pct') {
      const base = raw[0].close;
      return raw.map(c => ({ time: c.time, value: base === 0 ? 0 : ((c.close - base) / base) * 100 }));
    }
    if (mode === 'log') {
      return raw.map(c => ({ time: c.time, value: c.close > 0 ? Math.log10(c.close) : 0 }));
    }
    // abs
    return raw.map(c => ({ time: c.time, value: c.close }));
  }

  function renderChart() {
    ensureChart();
    // Rebuild fresh — simpler & correct when normalization changes
    destroyChart();
    ensureChart();

    const sList = buildSeriesData();
    lastSeries = sList;
    for (const s of sList) {
      const lineSeries = chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: s.symbol,
        lineStyle: LineStyle.Solid,
      });
      lineSeries.setData(s.data);
      seriesBySymbol.set(s.symbol, lineSeries);
    }
    chart.timeScale().fitContent();
    renderStats(sList);
  }

  function renderStats(sList) {
    if (!sList.length) {
      els.stats.innerHTML = `<div class="cmpmd-empty" style="height:140px;">Add symbols to compare.</div>`;
      return;
    }
    const rows = sList.map(s => {
      const m = computeStats(s.raw);
      const tot = m.totalReturn;
      const cls = tot >= 0 ? 'pos' : 'neg';
      return `<tr>
        <td><span class="swatch" style="background:${s.color}"></span>${escapeHtml(s.symbol)}</td>
        <td class="${cls}">${(tot * 100).toFixed(2)}%</td>
        <td>${(m.vol * 100).toFixed(2)}%</td>
        <td class="neg">${(m.maxDD * 100).toFixed(2)}%</td>
        <td>${m.sharpe.toFixed(2)}</td>
      </tr>`;
    }).join('');
    els.stats.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Symbol</th><th>Total return</th><th>Volatility (σ ann.)</th><th>Max drawdown</th><th>Sharpe</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function computeStats(raw) {
    if (!raw.length) return { totalReturn: 0, vol: 0, maxDD: 0, sharpe: 0 };
    const first = raw[0].close;
    const last = raw[raw.length - 1].close;
    const totalReturn = first === 0 ? 0 : (last - first) / first;

    // Log returns
    const rets = [];
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1].close, b = raw[i].close;
      if (a > 0 && b > 0) rets.push(Math.log(b / a));
    }
    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
    let varSum = 0;
    for (const r of rets) varSum += (r - mean) ** 2;
    const sd = Math.sqrt(varSum / (rets.length || 1));

    // Annualize assuming daily-ish (252) — approximate regardless of TF
    const annFactor = 252;
    const vol = sd * Math.sqrt(annFactor);
    const annReturn = mean * annFactor;
    const sharpe = sd > 0 ? annReturn / vol : 0;

    // Max drawdown
    let peak = raw[0].close, maxDD = 0;
    for (const c of raw) {
      if (c.close > peak) peak = c.close;
      const dd = peak > 0 ? (c.close - peak) / peak : 0;
      if (dd < maxDD) maxDD = dd;
    }
    return { totalReturn, vol, maxDD, sharpe };
  }

  function exportCSV() {
    if (!lastSeries.length) return;
    // Union of timestamps across raw series, but quickest: use base raw timeline
    const cols = lastSeries.map(s => s.symbol);
    const timeIndex = new Map(); // ts -> row
    for (const s of lastSeries) {
      for (const c of s.raw) {
        if (!timeIndex.has(c.time)) {
          const row = { time: c.time };
          for (const sym of cols) row[sym] = '';
          timeIndex.set(c.time, row);
        }
        timeIndex.get(c.time)[s.symbol] = c.close;
      }
    }
    const rows = [...timeIndex.values()].sort((a, b) => a.time - b.time);
    const header = ['date', ...cols];
    const lines = [header.join(',')];
    for (const r of rows) {
      const d = new Date(r.time * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const vals = cols.map(c => r[c] === '' || r[c] == null ? '' : String(r[c]));
      lines.push([d, ...vals].join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare_${state.base}_${state.period}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Result handling
  let resolveResult = null;
  const resultPromise = new Promise((res) => { resolveResult = res; });
  const prevFocus = document.activeElement;

  function close(result) {
    try { destroyChart(); } catch (_) {}
    try { overlay.remove(); } catch (_) {}
    document.removeEventListener('keydown', escListener);
    try { if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus(); } catch (_) {}
    if (resolveResult) { resolveResult(result); resolveResult = null; }
    if (typeof opts.onClose === 'function') opts.onClose(result);
  }

  overlay.addEventListener('click', (e) => {
    const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
    if (act === 'close' || act === 'cancel') {
      close(null);
    } else if (act === 'apply') {
      const result = {
        base: state.base,
        compare: state.compare.slice(),
        symbols: [state.base, ...state.compare],
        normalization: state.normalization,
        period: state.period,
      };
      if (typeof opts.onApply === 'function') opts.onApply(result);
      close(result);
    } else if (act === 'export') {
      exportCSV();
    } else if (e.target === overlay) {
      close(null);
    }
  });

  document.addEventListener('keydown', escListener);
  function escListener(e) {
    if (e.key === 'Escape') { close(null); return; }
    if (e.key === 'Tab') {
      const modal = overlay.querySelector('.cmpmd');
      if (!modal) return;
      const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(n => n.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Prevent click-through from modal interior collapsing modal
  const cmpEl = overlay.querySelector('.cmpmd');
  if (cmpEl) cmpEl.addEventListener('mousedown', (ev) => ev.stopPropagation());

  // Initial paint
  renderChips();
  renderNorm();
  renderPeriod();
  renderChart();

  // Focus first input (search box) on open
  setTimeout(() => { try { els.search.focus(); } catch (_) {} }, 0);

  return {
    result: resultPromise,
    close: () => close(null),
    setBase(sym) { state.base = String(sym).toUpperCase(); renderChips(); renderChart(); },
    addCompare(sym) { addCompareSymbol(sym); },
    getState: () => ({ ...state, compare: state.compare.slice() }),
  };
}

/* ============================================================ *
 * Utilities
 * ============================================================ */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export default {
  createMultiTimeframeView,
  createSymbolCompareModal,
};
