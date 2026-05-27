/* =========================================================================
   strategy-tester-ui.js — TradingView-style Strategy Tester bottom panel.

   Wraps backtester.js (PRESET_STRATEGIES + backtest()) into a self-contained
   docked panel with 3 tabs:
     1. Vista general      — 12 metric cards + equity curve + drawdown chart
     2. Lista de operaciones — sortable / paginable / filterable trades table
     3. Propiedades        — live-edit strategy params, auto re-run

   Public API:
     createStrategyTesterPanel(container, opts = {}) ->
       { render(strategyId, candles), refresh(), destroy() }

   Persists last-used strategy id + params to localStorage key
   "tv.strategy_tester".
   ========================================================================= */

import { createChart, AreaSeries } from 'lightweight-charts';
import { PRESET_STRATEGIES, backtest } from './backtester.js';

/* -------------------------------- styles -------------------------------- */

const STORAGE_KEY = 'tv.strategy_tester';
let _stylesInjected = false;

function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.st-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: #131722;
  border-top: 1px solid #2a2e39;
  display: flex;
  flex-direction: column;
  height: 360px;
  box-sizing: border-box;
  overflow: hidden;
  font-size: 12px;
}
.st-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: #1e222d;
  border-bottom: 1px solid #2a2e39;
  flex: 0 0 auto;
  min-height: 36px;
}
.st-header label { color: #787b86; font-size: 11px; }
.st-header select, .st-header input {
  background: #131722; color: #d1d4dc;
  border: 1px solid #2a2e39; border-radius: 3px;
  padding: 3px 6px; font-size: 12px; outline: none;
}
.st-header select:focus, .st-header input:focus { border-color: #2962ff; }
.st-symbol { color: #d1d4dc; font-weight: 600; padding: 3px 8px; background: #131722; border-radius: 3px; }
.st-rerun {
  background: #2962ff; color: #fff; border: none; border-radius: 3px;
  padding: 5px 12px; cursor: pointer; font-size: 12px; font-weight: 500;
  margin-left: auto;
}
.st-rerun:hover { background: #1e53e5; }
.st-rerun:disabled { background: #2a2e39; cursor: not-allowed; }

.st-tabs {
  display: flex; gap: 0; background: #1e222d;
  border-bottom: 1px solid #2a2e39; flex: 0 0 auto;
}
.st-tab {
  background: transparent; color: #787b86; border: none;
  padding: 8px 16px; cursor: pointer; font-size: 12px;
  border-bottom: 2px solid transparent;
}
.st-tab:hover { color: #d1d4dc; }
.st-tab.active { color: #d1d4dc; border-bottom-color: #2962ff; }

.st-body { flex: 1 1 auto; overflow: auto; position: relative; }
.st-pane { padding: 12px; display: none; }
.st-pane.active { display: block; }

/* --- Overview --- */
.st-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.st-card {
  background: #1e222d; border: 1px solid #2a2e39; border-radius: 4px;
  padding: 8px 10px;
  border-top: 2px solid #2a2e39;
  transition: border-top-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  position: relative;
}
.st-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.45);
}
.st-card.st-card-pos { border-top-color: #26a69a; }
.st-card.st-card-neg { border-top-color: #ef5350; }
.st-card.st-card-neu { border-top-color: #4a4e5a; }
.st-card-label { color: #787b86; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
.st-card-value { font-size: 16px; font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; }
.st-card-spark { display: block; margin-top: 4px; opacity: 0.75; }
.st-pos { color: #26a69a; }
.st-neg { color: #ef5350; }
.st-neu { color: #d1d4dc; }

.st-charts {
  display: grid; grid-template-rows: 1fr 1fr; gap: 8px;
  height: 320px;
}
.st-chart-box {
  background: #1e222d; border: 1px solid #2a2e39; border-radius: 4px;
  position: relative; overflow: hidden;
}
.st-chart-title {
  position: absolute; top: 6px; left: 10px; z-index: 2;
  font-size: 11px; color: #787b86; pointer-events: none;
}
.st-chart-inner { position: absolute; inset: 0; }

/* --- Trades table --- */
.st-trade-controls {
  display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
  flex-wrap: wrap;
}
.st-filter {
  background: #131722; color: #d1d4dc;
  border: 1px solid #2a2e39; border-radius: 3px;
  padding: 3px 8px; font-size: 12px;
}
.st-pager { margin-left: auto; display: flex; gap: 4px; align-items: center; }
.st-pager button {
  background: #1e222d; color: #d1d4dc; border: 1px solid #2a2e39;
  border-radius: 3px; padding: 3px 8px; cursor: pointer; font-size: 11px;
}
.st-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.st-table {
  width: 100%; border-collapse: collapse; font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.st-table th {
  text-align: right; color: #787b86; font-weight: 500;
  padding: 6px 8px; border-bottom: 1px solid #2a2e39;
  background: #1e222d; cursor: pointer; user-select: none;
  position: sticky; top: 0; z-index: 1;
}
.st-table th:first-child, .st-table th:nth-child(2) { text-align: left; }
.st-table th:hover { color: #d1d4dc; }
.st-table th.sorted::after { content: ' ▾'; color: #2962ff; }
.st-table th.sorted.asc::after { content: ' ▴'; }
.st-table td {
  padding: 5px 8px; text-align: right;
  border-bottom: 1px solid #1e222d;
}
.st-table td:first-child, .st-table td:nth-child(2) { text-align: left; }
.st-table tr:hover td { background: #1e222d; }
.st-side-long { color: #26a69a; font-weight: 500; }
.st-side-short { color: #ef5350; font-weight: 500; }

/* --- Properties --- */
.st-props {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.st-prop {
  background: #1e222d; border: 1px solid #2a2e39; border-radius: 4px;
  padding: 8px 10px;
}
.st-prop label {
  display: block; color: #787b86; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;
}
.st-prop input, .st-prop select {
  width: 100%; box-sizing: border-box;
  background: #131722; color: #d1d4dc;
  border: 1px solid #2a2e39; border-radius: 3px;
  padding: 4px 6px; font-size: 12px; outline: none;
}
.st-prop input:focus, .st-prop select:focus { border-color: #2962ff; }

.st-empty {
  padding: 40px; text-align: center; color: #787b86; font-size: 12px;
}
.st-spinner {
  display: block;
  margin: 24px auto;
  width: 22px; height: 22px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #2962ff;
  border-radius: 50%;
  animation: st-spin 0.8s linear infinite;
}
@keyframes st-spin { to { transform: rotate(360deg); } }
`;
  const style = document.createElement('style');
  style.setAttribute('data-strategy-tester', '1');
  style.textContent = css;
  document.head.appendChild(style);
}

/* ------------------------------ helpers --------------------------------- */

function fmtNum(v, dec = 2) {
  if (v == null || !isFinite(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}
function fmtMoney(v) {
  if (v == null || !isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  return sign + '$' + Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
function fmtPct(v, dec = 2) {
  if (v == null || !isFinite(v)) return '—';
  return Number(v).toFixed(dec) + '%';
}
function fmtTime(t) {
  if (t == null) return '—';
  let d;
  if (typeof t === 'number') d = new Date(t * 1000);
  else if (typeof t === 'string') d = new Date(t);
  else if (t.year) d = new Date(Date.UTC(t.year, (t.month || 1) - 1, t.day || 1));
  else d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function colorClass(v) {
  if (v == null || !isFinite(v) || v === 0) return 'st-neu';
  return v > 0 ? 'st-pos' : 'st-neg';
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (_) {}
}

function sparkline(values, color, w = 100, h = 18) {
  if (!values || values.length < 2) return '';
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  const range = max - min || 1;
  const step = w / (values.length - 1);
  let d = '';
  for (let i = 0; i < values.length; i++) {
    const x = (i * step).toFixed(1);
    const y = (h - ((values[i] - min) / range) * h).toFixed(1);
    d += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
  }
  return `<svg class="st-card-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
         `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.2"/></svg>`;
}

// Compute running-up and drawdown per-trade based on the candles within the
// trade window (entryTime..exitTime). Returns {runup, drawdown} in percent.
function tradeExcursions(candles, t) {
  if (!candles || !candles.length) return { runup: 0, drawdown: 0 };
  let i0 = -1, i1 = -1;
  for (let i = 0; i < candles.length; i++) {
    if (i0 < 0 && candles[i].time === t.entryTime) i0 = i;
    if (candles[i].time === t.exitTime) { i1 = i; break; }
  }
  if (i0 < 0) return { runup: 0, drawdown: 0 };
  if (i1 < 0) i1 = candles.length - 1;
  let mfe = -Infinity, mae = Infinity;
  for (let i = i0; i <= i1; i++) {
    const hi = candles[i].high, lo = candles[i].low;
    if (t.side === 'long') {
      if (hi > mfe) mfe = hi;
      if (lo < mae) mae = lo;
    } else {
      if (lo < mae) mae = lo;
      if (hi > mfe) mfe = hi;
    }
  }
  const runup = t.side === 'long'
    ? (mfe - t.entry) / t.entry * 100
    : (t.entry - mae) / t.entry * 100;
  const drawdown = t.side === 'long'
    ? (mae - t.entry) / t.entry * 100
    : (t.entry - mfe) / t.entry * 100;
  return {
    runup: Math.max(0, runup),
    drawdown: Math.min(0, drawdown),
  };
}

/* ============================== main API ================================ */

export function createStrategyTesterPanel(container, opts = {}) {
  ensureStyles();

  const persisted = loadState() || {};
  const state = {
    strategyId: persisted.strategyId || 'sma_cross',
    symbol: opts.symbol || persisted.symbol || '—',
    candles: [],
    result: null,
    activeTab: 'overview',
    backtestOpts: {
      initialCapital: 10000,
      positionSize: 'fixed_dollar',
      positionSizeValue: 1000,
      commission: 0.001,
      slippage: 'none',
      slippageValue: 0.0005,
      allowShort: false,
      atrPeriod: 14,
      ...(persisted.backtestOpts || {}),
    },
    tradesView: {
      filter: 'all',
      sortKey: 'idx',
      sortAsc: true,
      page: 0,
      pageSize: 50,
    },
    equityChart: null,
    equitySeries: null,
    ddChart: null,
    ddSeries: null,
    destroyed: false,
    resizeObserver: null,
  };

  // --- Build DOM ---
  const root = document.createElement('div');
  root.className = 'st-root';
  root.innerHTML = `
    <div class="st-header">
      <label>Estrategia</label>
      <select class="st-strategy">
        ${PRESET_STRATEGIES.map(s =>
          `<option value="${s.id}"${s.id === state.strategyId ? ' selected' : ''}>${s.name}</option>`
        ).join('')}
      </select>
      <span class="st-symbol" data-role="symbol">${state.symbol}</span>
      <label>Period</label>
      <span class="st-neu" data-role="period">— bars</span>
      <button class="st-rerun">Volver a ejecutar</button>
    </div>
    <div class="st-tabs">
      <button class="st-tab active" data-tab="overview">Vista general</button>
      <button class="st-tab" data-tab="trades">Lista de operaciones</button>
      <button class="st-tab" data-tab="properties">Propiedades</button>
    </div>
    <div class="st-body">
      <div class="st-pane active" data-pane="overview">
        <div class="st-empty">Cargando…</div>
      </div>
      <div class="st-pane" data-pane="trades">
        <div class="st-empty">Cargando…</div>
      </div>
      <div class="st-pane" data-pane="properties"></div>
    </div>
  `;
  container.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  /* -------------------- tab switching --------------------- */
  $$('.st-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      $$('.st-tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.st-pane').forEach(p =>
        p.classList.toggle('active', p.dataset.pane === state.activeTab)
      );
      // Charts need to be re-fit after becoming visible.
      if (state.activeTab === 'overview') fitCharts();
    });
  });

  /* -------------------- strategy select ------------------- */
  $('.st-strategy').addEventListener('change', (e) => {
    state.strategyId = e.target.value;
    persist();
    runBacktest();
  });

  /* -------------------- re-run ---------------------------- */
  $('.st-rerun').addEventListener('click', () => runBacktest());

  /* -------------------- properties tab -------------------- */
  buildPropertiesPane();

  /* ===================== rendering helpers ================ */

  function persist() {
    saveState({
      strategyId: state.strategyId,
      symbol: state.symbol,
      backtestOpts: state.backtestOpts,
    });
  }

  function runBacktest() {
    if (!state.candles || state.candles.length < 60) {
      renderEmpty('No hay suficientes velas para ejecutar el backtest.');
      return;
    }
    const preset = PRESET_STRATEGIES.find(s => s.id === state.strategyId)
      || PRESET_STRATEGIES[0];
    try {
      state.result = backtest(state.candles, preset.fn, state.backtestOpts);
    } catch (err) {
      console.error('[strategy-tester] backtest failed', err);
      renderEmpty('Error al ejecutar backtest: ' + (err && err.message));
      return;
    }
    $('[data-role="period"]').textContent = state.candles.length + ' bars';
    state.tradesView.page = 0;
    renderOverview();
    renderTrades();
  }

  function renderEmpty(msg) {
    const o = $('[data-pane="overview"]');
    const t = $('[data-pane="trades"]');
    o.innerHTML = `<div class="st-empty">${msg}</div>`;
    t.innerHTML = `<div class="st-empty">${msg}</div>`;
    destroyCharts();
  }

  /* -------------------- Overview tab ---------------------- */

  function metricCards(m, equity) {
    const eqValues = equity.map(p => p.equity);
    const ddValues = equity.map(p => -p.drawdown * 100);
    // Per-trade running pnl arrays (for sparklines)
    const trades = state.result.trades;
    const cumPnl = [];
    let acc = 0;
    for (const t of trades) { acc += t.pnl; cumPnl.push(acc); }
    const tradePnls = trades.map(t => t.pnl);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const largestWin  = wins.length   ? Math.max(...wins.map(t => t.pnl))      : 0;
    const largestLoss = losses.length ? Math.min(...losses.map(t => t.pnl))    : 0;
    const avgTrade    = trades.length ? tradePnls.reduce((s, x) => s + x, 0) / trades.length : 0;
    const plRatio     = (m.avgLoss && m.avgLoss !== 0)
      ? Math.abs(m.avgWin / m.avgLoss) : 0;
    const netProfit   = equity.length
      ? equity[equity.length - 1].equity - state.backtestOpts.initialCapital
      : 0;

    const POS = '#26a69a', NEG = '#ef5350', NEU = '#787b86';

    return [
      {
        label: 'Net profit', value: fmtMoney(netProfit), sign: netProfit,
        spark: sparkline(eqValues, netProfit >= 0 ? POS : NEG),
      },
      {
        label: 'Total trades', value: String(m.totalTrades), sign: 0,
        spark: sparkline(cumPnl.length ? cumPnl : [0,0], NEU),
      },
      {
        label: 'Profit factor', value: isFinite(m.profitFactor) ? fmtNum(m.profitFactor, 2) : '∞',
        sign: m.profitFactor >= 1 ? 1 : -1,
        spark: sparkline(tradePnls.length ? tradePnls : [0,0], m.profitFactor >= 1 ? POS : NEG),
      },
      {
        label: '% Trades ganadores', value: fmtPct(m.winRate * 100, 1),
        sign: m.winRate >= 0.5 ? 1 : -1,
        spark: sparkline(tradePnls.length ? tradePnls : [0,0], m.winRate >= 0.5 ? POS : NEG),
      },
      {
        label: 'Sharpe', value: fmtNum(m.sharpe, 2), sign: m.sharpe,
        spark: sparkline(eqValues, m.sharpe >= 0 ? POS : NEG),
      },
      {
        label: 'Deflated Sharpe', value: fmtNum(m.deflatedSharpe, 3),
        sign: m.deflatedSharpe >= 0.5 ? 1 : -1,
        spark: sparkline(eqValues, m.deflatedSharpe >= 0.5 ? POS : NEG),
      },
      {
        label: 'Sortino', value: fmtNum(m.sortino, 2), sign: m.sortino,
        spark: sparkline(eqValues, m.sortino >= 0 ? POS : NEG),
      },
      {
        label: 'Max drawdown', value: fmtPct(-m.maxDrawdown, 2), sign: -1,
        spark: sparkline(ddValues.length ? ddValues : [0,0], NEG),
      },
      {
        label: 'Average trade', value: fmtMoney(avgTrade), sign: avgTrade,
        spark: sparkline(tradePnls.length ? tradePnls : [0,0], avgTrade >= 0 ? POS : NEG),
      },
      {
        label: 'Largest win / loss',
        value: fmtMoney(largestWin) + ' / ' + fmtMoney(largestLoss),
        sign: 0,
        spark: sparkline(tradePnls.length ? tradePnls : [0,0], NEU),
      },
      {
        label: 'CAGR', value: fmtPct(m.cagr, 2), sign: m.cagr,
        spark: sparkline(eqValues, m.cagr >= 0 ? POS : NEG),
      },
      {
        label: 'Profit / Loss ratio', value: fmtNum(plRatio, 2),
        sign: plRatio >= 1 ? 1 : -1,
        spark: sparkline(tradePnls.length ? tradePnls : [0,0], plRatio >= 1 ? POS : NEG),
      },
    ];
  }

  function renderOverview() {
    const pane = $('[data-pane="overview"]');
    const m = state.result.metrics;
    const equity = state.result.equityCurve;
    const cards = metricCards(m, equity);

    pane.innerHTML = `
      <div class="st-cards">
        ${cards.map(c => {
          const sc = colorClass(c.sign); // st-pos / st-neg / st-neu
          const cardCls = sc === 'st-pos' ? 'st-card-pos'
                        : sc === 'st-neg' ? 'st-card-neg' : 'st-card-neu';
          return `
          <div class="st-card ${cardCls}">
            <div class="st-card-label">${c.label}</div>
            <div class="st-card-value ${sc}">${c.value}</div>
            ${c.spark}
          </div>
        `;}).join('')}
      </div>
      <div class="st-charts">
        <div class="st-chart-box">
          <div class="st-chart-title">Curva de equity</div>
          <div class="st-chart-inner" data-role="equity-chart"></div>
        </div>
        <div class="st-chart-box">
          <div class="st-chart-title">Drawdown</div>
          <div class="st-chart-inner" data-role="dd-chart"></div>
        </div>
      </div>
    `;
    buildEquityCharts(equity);
  }

  function destroyCharts() {
    try { if (state.equityChart) state.equityChart.remove(); } catch (_) {}
    try { if (state.ddChart) state.ddChart.remove(); } catch (_) {}
    state.equityChart = state.ddChart = null;
    state.equitySeries = state.ddSeries = null;
    if (state.resizeObserver) {
      try { state.resizeObserver.disconnect(); } catch (_) {}
      state.resizeObserver = null;
    }
  }

  function buildEquityCharts(equity) {
    destroyCharts();
    if (!equity || equity.length === 0) return;
    const eqEl = $('[data-role="equity-chart"]');
    const ddEl = $('[data-role="dd-chart"]');
    if (!eqEl || !ddEl) return;

    const common = {
      layout: { background: { color: '#1e222d' }, textColor: '#d1d4dc' },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      rightPriceScale: { borderColor: '#2a2e39' },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
      handleScroll: false, handleScale: false,
    };

    state.equityChart = createChart(eqEl, {
      ...common,
      width: eqEl.clientWidth || 600,
      height: eqEl.clientHeight || 140,
    });
    // Equity curve — green gradient when net positive, red when net negative.
    const initCap = state.backtestOpts.initialCapital;
    const finalEq = equity[equity.length - 1]?.equity ?? initCap;
    const netPos = finalEq >= initCap;
    state.equitySeries = state.equityChart.addSeries(AreaSeries, {
      lineColor: netPos ? '#26a69a' : '#ef5350',
      topColor:    netPos ? 'rgba(38,166,154,0.45)' : 'rgba(239,83,80,0.45)',
      bottomColor: netPos ? 'rgba(38,166,154,0.02)' : 'rgba(239,83,80,0.02)',
      lineWidth: 2,
      priceLineVisible: false,
    });
    state.equitySeries.setData(
      equity.map(p => ({ time: p.time, value: p.equity }))
    );

    state.ddChart = createChart(ddEl, {
      ...common,
      width: ddEl.clientWidth || 600,
      height: ddEl.clientHeight || 140,
    });
    state.ddSeries = state.ddChart.addSeries(AreaSeries, {
      lineColor: '#ef5350',
      topColor: 'rgba(239,83,80,0.02)',
      bottomColor: 'rgba(239,83,80,0.5)',
      lineWidth: 2,
      priceLineVisible: false,
    });
    state.ddSeries.setData(
      equity.map(p => ({ time: p.time, value: -p.drawdown * 100 }))
    );

    // Resize observer to keep charts sized.
    state.resizeObserver = new ResizeObserver(() => fitCharts());
    state.resizeObserver.observe(eqEl);
    state.resizeObserver.observe(ddEl);
    fitCharts();
  }

  function fitCharts() {
    const eqEl = $('[data-role="equity-chart"]');
    const ddEl = $('[data-role="dd-chart"]');
    if (state.equityChart && eqEl) {
      state.equityChart.applyOptions({
        width: eqEl.clientWidth, height: eqEl.clientHeight,
      });
      try { state.equityChart.timeScale().fitContent(); } catch (_) {}
    }
    if (state.ddChart && ddEl) {
      state.ddChart.applyOptions({
        width: ddEl.clientWidth, height: ddEl.clientHeight,
      });
      try { state.ddChart.timeScale().fitContent(); } catch (_) {}
    }
  }

  /* -------------------- Trades tab ------------------------ */

  function buildTradesRows() {
    const trades = state.result.trades.slice();
    let cumDollar = 0;
    const initCap = state.backtestOpts.initialCapital;
    const rows = trades.map((t, i) => {
      cumDollar += t.pnl;
      const cumPct = (cumDollar / initCap) * 100;
      const exc = tradeExcursions(state.candles, t);
      return {
        idx: i + 1,
        side: t.side,
        entryTime: t.entryTime, entryPrice: t.entry,
        exitTime: t.exitTime,   exitPrice:  t.exit,
        qty: t.qty,
        pnl: t.pnl, pnlPct: t.pnlPct * 100,
        cumDollar, cumPct,
        runup: exc.runup, drawdown: exc.drawdown,
        duration: t.durationBars,
      };
    });
    return rows;
  }

  function renderTrades() {
    const pane = $('[data-pane="trades"]');
    const trades = state.result.trades;
    if (!trades.length) {
      pane.innerHTML = '<div class="st-empty">No se han generado operaciones para esta estrategia.</div>';
      return;
    }
    pane.innerHTML = `
      <div class="st-trade-controls">
        <label>Filtro</label>
        <select class="st-filter" data-role="filter">
          <option value="all">Todas</option>
          <option value="winners">Ganadoras</option>
          <option value="losers">Perdedoras</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <label>Filas</label>
        <select class="st-filter" data-role="page-size">
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <div class="st-pager">
          <button data-role="prev">‹ Anterior</button>
          <span data-role="page-info">1 / 1</span>
          <button data-role="next">Siguiente ›</button>
        </div>
      </div>
      <table class="st-table">
        <thead><tr>
          <th data-key="idx">#</th>
          <th data-key="side">Tipo</th>
          <th data-key="entryTime">Entrada</th>
          <th data-key="exitTime">Salida</th>
          <th data-key="qty">Cantidad</th>
          <th data-key="pnl">Resultado $</th>
          <th data-key="pnlPct">Resultado %</th>
          <th data-key="cumDollar">Cumulativo $</th>
          <th data-key="cumPct">Cumulativo %</th>
          <th data-key="runup">Run-up %</th>
          <th data-key="drawdown">Drawdown %</th>
          <th data-key="duration">Duración</th>
        </tr></thead>
        <tbody data-role="tbody"></tbody>
      </table>
    `;
    const v = state.tradesView;
    pane.querySelector('[data-role="filter"]').value = v.filter;
    pane.querySelector('[data-role="page-size"]').value = String(v.pageSize);

    pane.querySelector('[data-role="filter"]').addEventListener('change', (e) => {
      v.filter = e.target.value; v.page = 0; redrawTradesTable();
    });
    pane.querySelector('[data-role="page-size"]').addEventListener('change', (e) => {
      v.pageSize = parseInt(e.target.value, 10); v.page = 0; redrawTradesTable();
    });
    pane.querySelector('[data-role="prev"]').addEventListener('click', () => {
      if (v.page > 0) { v.page--; redrawTradesTable(); }
    });
    pane.querySelector('[data-role="next"]').addEventListener('click', () => {
      v.page++; redrawTradesTable();
    });
    Array.from(pane.querySelectorAll('thead th')).forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.key;
        if (v.sortKey === k) v.sortAsc = !v.sortAsc;
        else { v.sortKey = k; v.sortAsc = true; }
        redrawTradesTable();
      });
    });
    redrawTradesTable();
  }

  function redrawTradesTable() {
    const pane = $('[data-pane="trades"]');
    const tbody = pane.querySelector('[data-role="tbody"]');
    if (!tbody) return;
    const v = state.tradesView;
    let rows = buildTradesRows();
    // Filter
    if (v.filter === 'winners') rows = rows.filter(r => r.pnl > 0);
    else if (v.filter === 'losers')  rows = rows.filter(r => r.pnl <= 0);
    else if (v.filter === 'long')    rows = rows.filter(r => r.side === 'long');
    else if (v.filter === 'short')   rows = rows.filter(r => r.side === 'short');
    // Sort
    rows.sort((a, b) => {
      const av = a[v.sortKey], bv = b[v.sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return v.sortAsc ? av - bv : bv - av;
      }
      const as = String(av), bs = String(bv);
      return v.sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    // Paginate
    const totalPages = Math.max(1, Math.ceil(rows.length / v.pageSize));
    if (v.page >= totalPages) v.page = totalPages - 1;
    const start = v.page * v.pageSize;
    const slice = rows.slice(start, start + v.pageSize);

    tbody.innerHTML = slice.map(r => `
      <tr>
        <td>${r.idx}</td>
        <td class="st-side-${r.side}">${r.side === 'long' ? 'Long' : 'Short'}</td>
        <td>${fmtTime(r.entryTime)} · ${fmtNum(r.entryPrice, 4)}</td>
        <td>${fmtTime(r.exitTime)} · ${fmtNum(r.exitPrice, 4)}</td>
        <td>${fmtNum(r.qty, 4)}</td>
        <td class="${colorClass(r.pnl)}">${fmtMoney(r.pnl)}</td>
        <td class="${colorClass(r.pnlPct)}">${fmtPct(r.pnlPct)}</td>
        <td class="${colorClass(r.cumDollar)}">${fmtMoney(r.cumDollar)}</td>
        <td class="${colorClass(r.cumPct)}">${fmtPct(r.cumPct)}</td>
        <td class="st-pos">${fmtPct(r.runup)}</td>
        <td class="st-neg">${fmtPct(r.drawdown)}</td>
        <td>${r.duration} bars</td>
      </tr>
    `).join('');

    pane.querySelector('[data-role="page-info"]').textContent =
      `${v.page + 1} / ${totalPages}`;
    pane.querySelector('[data-role="prev"]').disabled = v.page === 0;
    pane.querySelector('[data-role="next"]').disabled = v.page >= totalPages - 1;

    Array.from(pane.querySelectorAll('thead th')).forEach(th => {
      th.classList.toggle('sorted', th.dataset.key === v.sortKey);
      th.classList.toggle('asc', th.dataset.key === v.sortKey && v.sortAsc);
    });
  }

  /* -------------------- Properties tab -------------------- */

  function buildPropertiesPane() {
    const pane = $('[data-pane="properties"]');
    const o = state.backtestOpts;
    pane.innerHTML = `
      <div class="st-props">
        <div class="st-prop">
          <label>Capital inicial</label>
          <input type="number" min="0" step="100" data-opt="initialCapital" value="${o.initialCapital}">
        </div>
        <div class="st-prop">
          <label>Modo tamaño posición</label>
          <select data-opt="positionSize">
            <option value="fixed_dollar"${o.positionSize==='fixed_dollar'?' selected':''}>Fijo ($)</option>
            <option value="fixed_pct"${o.positionSize==='fixed_pct'?' selected':''}>% Equity</option>
            <option value="atr"${o.positionSize==='atr'?' selected':''}>Riesgo (ATR)</option>
            <option value="kelly"${o.positionSize==='kelly'?' selected':''}>Kelly (all-in cap)</option>
          </select>
        </div>
        <div class="st-prop">
          <label>Valor tamaño posición</label>
          <input type="number" min="0" step="0.1" data-opt="positionSizeValue" value="${o.positionSizeValue}">
        </div>
        <div class="st-prop">
          <label>Comisión (fracción, ej. 0.001 = 0.1%)</label>
          <input type="number" min="0" step="0.0001" data-opt="commission" value="${o.commission}">
        </div>
        <div class="st-prop">
          <label>Modelo de slippage</label>
          <select data-opt="slippage">
            <option value="none"${o.slippage==='none'?' selected':''}>Ninguno</option>
            <option value="fixed_pct"${o.slippage==='fixed_pct'?' selected':''}>Porcentaje fijo</option>
            <option value="almgren"${o.slippage==='almgren'?' selected':''}>ATR (Almgren)</option>
          </select>
        </div>
        <div class="st-prop">
          <label>Valor slippage</label>
          <input type="number" min="0" step="0.0001" data-opt="slippageValue" value="${o.slippageValue}">
        </div>
        <div class="st-prop">
          <label>Permitir short</label>
          <select data-opt="allowShort">
            <option value="false"${!o.allowShort?' selected':''}>No</option>
            <option value="true"${o.allowShort?' selected':''}>Sí</option>
          </select>
        </div>
        <div class="st-prop">
          <label>Periodo ATR</label>
          <input type="number" min="2" max="200" step="1" data-opt="atrPeriod" value="${o.atrPeriod}">
        </div>
      </div>
    `;
    pane.querySelectorAll('[data-opt]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.opt;
        let val = el.value;
        if (el.tagName === 'INPUT' && el.type === 'number') val = parseFloat(val);
        if (val === 'true')  val = true;
        if (val === 'false') val = false;
        state.backtestOpts[k] = val;
        persist();
        runBacktest();
      });
    });
  }

  /* ============================ public API ================ */

  function render(strategyId, candles) {
    if (state.destroyed) return;
    if (strategyId) {
      state.strategyId = strategyId;
      const sel = $('.st-strategy');
      if (sel) sel.value = strategyId;
    }
    if (Array.isArray(candles)) state.candles = candles;
    if (opts.symbol) {
      state.symbol = opts.symbol;
      $('[data-role="symbol"]').textContent = state.symbol;
    }
    persist();
    runBacktest();
  }

  function refresh() {
    if (state.destroyed) return;
    runBacktest();
  }

  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    destroyCharts();
    try { container.removeChild(root); } catch (_) {}
  }

  return { render, refresh, destroy };
}

export default createStrategyTesterPanel;
