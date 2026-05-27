/* =========================================================================
 * chart-view-kline.js
 * -------------------------------------------------------------------------
 * Parallel chart screen built on KLineCharts v10 instead of lightweight-charts.
 * UI is intentionally kept visually identical to chart-view.js — same
 * topbar, leftbar, rightbar layout — but the chart engine, drawings and
 * indicators are wired through KLine's native APIs.
 *
 * Single export:  renderChartViewKline(container)
 *
 * Wire it from main.js when navigating to e.g.  #/chart-kline
 * Does NOT touch the existing chart-view.js.
 * ========================================================================= */

import { init, dispose, registerIndicator } from 'klinecharts';
import {
  loadCandles,
  openLiveStream,
  TF_SECONDS,
  getSymbolProfile,
} from './data.js';

/* =========================================================================
   STATE + PERSISTENCE  (shares the same localStorage keys as chart-view.js
   so the user's last symbol / TF carry over between engines)
   ========================================================================= */

const LS = {
  symbol:     'tv.symbol',
  tf:         'tv.timeframe',
  chartType:  'tv.chartType.kline',
  indicators: 'tv.indicators.kline',
  drawings:   'tv.drawings.kline',
};

const lsGet = (k, d) => {
  try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
  catch { return d; }
};
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Allow URL hash to override persisted symbol:  #/chart-kline/BTCUSDT
function symbolFromHash() {
  try {
    const parts = (window.location.hash || '').split('/');
    const candidate = parts[2];
    if (candidate && /^[A-Z0-9._-]{2,20}$/i.test(candidate)) return candidate.toUpperCase();
  } catch {}
  return null;
}

const state = {
  symbol:    symbolFromHash() || lsGet(LS.symbol, 'BTCUSDT'),
  tf:        lsGet(LS.tf, '1D'),
  chartType: lsGet(LS.chartType, 'candle_solid'),
  indicators: lsGet(LS.indicators, []),   // [{name, paneId}]
  drawings:   lsGet(LS.drawings, []),     // overlay descriptors (not auto-restored)
  source:    'mock',
};

function persist() {
  lsSet(LS.symbol, state.symbol);
  lsSet(LS.tf, state.tf);
  lsSet(LS.chartType, state.chartType);
  lsSet(LS.indicators, state.indicators);
}

/* =========================================================================
   TIMEFRAMES — map our TF strings to KLine Period objects
   ========================================================================= */

const TF_TO_KLINE_PERIOD = {
  '1m':  { type: 'minute', span: 1 },
  '5m':  { type: 'minute', span: 5 },
  '15m': { type: 'minute', span: 15 },
  '30m': { type: 'minute', span: 30 },
  '1h':  { type: 'hour',   span: 1 },
  '4h':  { type: 'hour',   span: 4 },
  '1D':  { type: 'day',    span: 1 },
  '1W':  { type: 'week',   span: 1 },
  '1M':  { type: 'month',  span: 1 },
};

const TF_LIST = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

/* =========================================================================
   DRAWING TOOL → KLine OVERLAY NAME MAPPING
   ========================================================================= */

const TOOL_TO_OVERLAY = {
  'trend-line':  'straightLine',
  'ray':         'rayLine',
  'info-line':   'segment',
  'h-line':      'horizontalStraightLine',
  'h-ray':       'horizontalRayLine',
  'v-line':      'verticalStraightLine',
  'fib-ret':     'fibonacciLine',
  'fib-ext':     'fibonacciExtension',
  'fib-circ':    'fibonacciCircle',
  'fib-spir':    'fibonacciSpiral',
  'fib-fan':     'fibonacciSpeedResistanceFan',
  'fib-seg':     'fibonacciSegment',
  'pitch':       'priceChannelLine',
  'par-chan':    'parallelStraightLine',
  'gann-sq':     'gannBox',
  'gann-grid':   'gannBox',
  'ell-imp':     'fiveWaves',
  'ell-corr':    'threeWaves',
  'ell-eight':   'eightWaves',
  'pat-xabcd':   'xabcd',
  'pat-abcd':    'abcd',
  'text':        'simpleAnnotation',
  'price-line':  'priceLine',
};

/* =========================================================================
   NATIVE KLINE INDICATOR LIST (catalog for modal)
   ========================================================================= */

const NATIVE_INDICATORS = [
  // Trend / overlay (drawn on main pane)
  { id: 'MA',    name: 'MA — Moving Average',        category: 'Trend',     overlay: true  },
  { id: 'EMA',   name: 'EMA — Exponential MA',       category: 'Trend',     overlay: true  },
  { id: 'SMA',   name: 'SMA — Simple MA',            category: 'Trend',     overlay: true  },
  { id: 'BOLL',  name: 'Bollinger Bands',            category: 'Trend',     overlay: true  },
  { id: 'BBI',   name: 'BBI',                        category: 'Trend',     overlay: true  },
  { id: 'SAR',   name: 'Parabolic SAR',              category: 'Trend',     overlay: true  },
  // Momentum / oscillators (separate pane)
  { id: 'MACD',  name: 'MACD',                       category: 'Momentum',  overlay: false },
  { id: 'RSI',   name: 'RSI — Relative Strength',    category: 'Momentum',  overlay: false },
  { id: 'KDJ',   name: 'KDJ',                        category: 'Momentum',  overlay: false },
  { id: 'CCI',   name: 'CCI',                        category: 'Momentum',  overlay: false },
  { id: 'WR',    name: 'Williams %R',                category: 'Momentum',  overlay: false },
  { id: 'MTM',   name: 'Momentum',                   category: 'Momentum',  overlay: false },
  { id: 'ROC',   name: 'Rate of Change',             category: 'Momentum',  overlay: false },
  { id: 'BIAS',  name: 'BIAS',                       category: 'Momentum',  overlay: false },
  { id: 'BRAR',  name: 'BRAR',                       category: 'Momentum',  overlay: false },
  { id: 'DMI',   name: 'DMI / ADX',                  category: 'Momentum',  overlay: false },
  { id: 'CR',    name: 'CR',                         category: 'Momentum',  overlay: false },
  { id: 'PSY',   name: 'PSY',                        category: 'Momentum',  overlay: false },
  { id: 'DMA',   name: 'DMA',                        category: 'Momentum',  overlay: false },
  { id: 'TRIX',  name: 'TRIX',                       category: 'Momentum',  overlay: false },
  { id: 'AO',    name: 'Awesome Oscillator',         category: 'Momentum',  overlay: false },
  // Volume
  { id: 'VOL',   name: 'Volume',                     category: 'Volume',    overlay: false },
  { id: 'OBV',   name: 'On-Balance Volume',          category: 'Volume',    overlay: false },
  { id: 'VR',    name: 'Volume Ratio',               category: 'Volume',    overlay: false },
  { id: 'PVT',   name: 'PVT',                        category: 'Volume',    overlay: false },
  { id: 'EMV',   name: 'Ease of Movement',           category: 'Volume',    overlay: false },
];

/* =========================================================================
   KLINE STYLE — TradingView dark theme look-alike
   ========================================================================= */

function klineStyles(chartType = 'candle_solid') {
  return {
    grid: {
      show: true,
      horizontal: { show: true, color: '#1e222d', style: 'dashed', dashedValue: [2, 2] },
      vertical:   { show: true, color: '#1e222d', style: 'dashed', dashedValue: [2, 2] },
    },
    candle: {
      type: chartType,
      bar: {
        upColor:        '#089981',
        downColor:      '#f23645',
        noChangeColor:  '#787b86',
        upBorderColor:  '#089981',
        downBorderColor:'#f23645',
        upWickColor:    '#089981',
        downWickColor:  '#f23645',
      },
      area: {
        lineSize: 2,
        lineColor: '#2962ff',
        value: 'close',
        backgroundColor: [
          { offset: 0, color: 'rgba(41, 98, 255, 0.01)' },
          { offset: 1, color: 'rgba(41, 98, 255, 0.18)' },
        ],
      },
      priceMark: {
        show: true,
        high: { show: true, color: '#d1d4dc', textSize: 10 },
        low:  { show: true, color: '#d1d4dc', textSize: 10 },
        last: {
          show: true,
          upColor:   '#089981',
          downColor: '#f23645',
          noChangeColor: '#787b86',
          line:   { show: true, style: 'dashed', dashedValue: [4, 4], size: 1 },
          text:   { show: true, size: 12, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, color: '#ffffff', borderColor: 'transparent' },
        },
      },
      tooltip: {
        showRule: 'always',
        showType: 'standard',
        defaultValue: '--',
        title: { show: true, size: 12, color: '#d1d4dc' },
        legend: { size: 12, color: '#d1d4dc' },
      },
    },
    indicator: {
      lines: [
        { color: '#FF9600' },
        { color: '#2962FF' },
        { color: '#9C27B0' },
        { color: '#26A69A' },
        { color: '#EF5350' },
      ],
      tooltip: { showRule: 'always', text: { size: 12, color: '#d1d4dc' } },
    },
    xAxis: {
      show: true,
      axisLine: { show: true, color: '#2a2e39', size: 1 },
      tickText: { show: true, color: '#787b86', size: 12 },
      tickLine: { show: true, color: '#2a2e39', size: 1, length: 3 },
    },
    yAxis: {
      show: true,
      position: 'right',
      type: 'normal',
      axisLine: { show: true, color: '#2a2e39', size: 1 },
      tickText: { show: true, color: '#787b86', size: 12 },
      tickLine: { show: true, color: '#2a2e39', size: 1, length: 3 },
    },
    separator: { size: 1, color: '#2a2e39', fill: true, activeBackgroundColor: 'rgba(41, 98, 255, .15)' },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: { show: true, style: 'dashed', dashedValue: [4, 2], size: 1, color: '#787b86' },
        text: { show: true, color: '#ffffff', backgroundColor: '#2a2e39', size: 12, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2 },
      },
      vertical: {
        show: true,
        line: { show: true, style: 'dashed', dashedValue: [4, 2], size: 1, color: '#787b86' },
        text: { show: true, color: '#ffffff', backgroundColor: '#2a2e39', size: 12, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2 },
      },
    },
    overlay: {
      point: { color: '#2962ff', borderColor: 'rgba(41, 98, 255, 0.35)' },
      line:  { color: '#2962ff', size: 1, style: 'solid' },
    },
  };
}

/* =========================================================================
   HTML BUILDERS — simplified TradingView-style chrome.
   Visually equivalent to chart-view.js but written from scratch so this
   file is self-contained (chart-view.js does NOT export its builders).
   ========================================================================= */

const DRAW_TOOLS = [
  { id: 'crosshair',  glyph: '+',  title: 'Cursor (cancel drawing)' },
  { id: 'trend-line', glyph: '╱',  title: 'Trend line' },
  { id: 'ray',        glyph: '╱→', title: 'Ray' },
  { id: 'info-line',  glyph: '—',  title: 'Segment' },
  { id: 'h-line',     glyph: '─',  title: 'Horizontal line' },
  { id: 'v-line',     glyph: '│',  title: 'Vertical line' },
  { id: 'par-chan',   glyph: '∥',  title: 'Parallel channel' },
  { id: 'fib-ret',    glyph: 'Fib',title: 'Fibonacci retracement' },
  { id: 'fib-ext',    glyph: 'Fx', title: 'Fibonacci extension' },
  { id: 'fib-fan',    glyph: 'F◀', title: 'Fibonacci fan' },
  { id: 'gann-sq',    glyph: '⊞',  title: 'Gann box' },
  { id: 'pitch',      glyph: '◣',  title: 'Pitchfork (price channel)' },
  { id: 'ell-imp',    glyph: '5w', title: 'Elliott 5 waves' },
  { id: 'ell-corr',   glyph: '3w', title: 'Elliott ABC (3 waves)' },
  { id: 'text',       glyph: 'A',  title: 'Text annotation' },
  { id: 'price-line', glyph: '$',  title: 'Price line' },
];

const RIGHT_PANELS = [
  { id: 'watchlist',  glyph: '★', title: 'Watchlist' },
  { id: 'alerts',     glyph: '🔔', title: 'Alerts' },
  { id: 'objects',    glyph: '◧', title: 'Object tree' },
  { id: 'trading',    glyph: '⇅', title: 'Trading panel' },
  { id: 'news',       glyph: '📰', title: 'News & ideas' },
  { id: 'calendar',   glyph: '📅', title: 'Economic calendar' },
];

function buildScreen() {
  const tfButtons = TF_LIST.map(tf =>
    `<button class="kv-tf${tf === state.tf ? ' active' : ''}" data-tf="${tf}">${tf}</button>`
  ).join('');

  const drawBtns = DRAW_TOOLS.map(t =>
    `<button class="kv-tool" data-tool="${t.id}" title="${t.title}"><span>${t.glyph}</span></button>`
  ).join('');

  const rightBtns = RIGHT_PANELS.map(p =>
    `<button class="kv-rb" data-panel="${p.id}" title="${p.title}">${p.glyph}</button>`
  ).join('');

  return `
<div class="kv-page">
  <style>
    .kv-page { position:fixed; inset:0; display:grid;
               grid-template-columns: 46px 1fr 56px;
               grid-template-rows: 44px 1fr 28px;
               background:#0d0e12; color:#d1d4dc;
               font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
               font-size: 12px; }
    .kv-top   { grid-column: 1 / -1; grid-row: 1;
                display:flex; align-items:center; gap:8px; padding:0 10px;
                background:#131722; border-bottom:1px solid #2a2e39; }
    .kv-left  { grid-column: 1; grid-row: 2;
                background:#131722; border-right:1px solid #2a2e39;
                display:flex; flex-direction:column; align-items:center; padding-top:6px; gap:2px;
                overflow-y:auto; }
    .kv-center{ grid-column: 2; grid-row: 2; position:relative; }
    .kv-right { grid-column: 3; grid-row: 2;
                background:#131722; border-left:1px solid #2a2e39;
                display:flex; flex-direction:column; align-items:center; padding-top:6px; gap:2px; }
    .kv-bot   { grid-column: 1 / -1; grid-row: 3;
                display:flex; align-items:center; gap:8px; padding:0 10px;
                background:#131722; border-top:1px solid #2a2e39;
                color:#787b86; }
    .kv-sym, .kv-tf-btn, .kv-cs, .kv-ind, .kv-alert, .kv-set, .kv-fs, .kv-snap,
    .kv-trade {
      background:transparent; color:#d1d4dc; border:none; padding:4px 8px;
      cursor:pointer; border-radius:3px; font-size:12px;
    }
    .kv-sym { font-weight:600; font-size:14px; padding:4px 10px; }
    .kv-sym:hover, .kv-tf-btn:hover, .kv-cs:hover, .kv-ind:hover, .kv-alert:hover,
    .kv-set:hover, .kv-fs:hover, .kv-snap:hover { background:#2a2e39; }
    .kv-trade { background:#2962ff; color:#fff; font-weight:600; padding:5px 14px; }
    .kv-trade:hover { background:#1e53e5; }
    .kv-sep { width:1px; height:22px; background:#2a2e39; margin:0 4px; }
    .kv-fill { flex:1; }
    .kv-tf-group { display:flex; align-items:center; gap:1px; }
    .kv-tf {
      background:transparent; color:#787b86; border:none; padding:3px 7px;
      cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;
    }
    .kv-tf:hover { background:#2a2e39; color:#d1d4dc; }
    .kv-tf.active { background:#2962ff; color:#fff; }
    .kv-tool, .kv-rb {
      width:36px; height:36px; background:transparent; color:#b2b5be;
      border:none; cursor:pointer; border-radius:3px;
      display:flex; align-items:center; justify-content:center;
      font-size:14px; font-weight:600;
    }
    .kv-tool:hover, .kv-rb:hover { background:#2a2e39; color:#fff; }
    .kv-tool.active { background:#2962ff; color:#fff; }
    .kv-tool span { display:block; transform:translateY(-1px); }
    .kv-divider { width:60%; height:1px; background:#2a2e39; margin:6px 0; }
    #kv-chart { position:absolute; inset:0; }
    .kv-header {
      position:absolute; top:8px; left:12px; z-index:5;
      display:flex; align-items:center; gap:10px;
      background:rgba(19,23,34,.85); padding:6px 10px; border-radius:3px;
      pointer-events:none; font-size:12px;
    }
    .kv-header .kv-h-sym { font-weight:700; color:#fff; font-size:13px; }
    .kv-header .kv-h-tf  { color:#787b86; }
    .kv-header .kv-h-src { color:#787b86; font-size:11px; padding-left:6px; border-left:1px solid #2a2e39; }
    .kv-ohlc { color:#787b86; font-size:11px; display:flex; gap:6px; }
    .kv-ohlc b { color:#d1d4dc; font-weight:500; }
    .kv-ohlc .pos { color:#089981; }
    .kv-ohlc .neg { color:#f23645; }
    /* Modal */
    .kv-modal-back {
      position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:1000;
      display:flex; align-items:center; justify-content:center;
    }
    .kv-modal {
      background:#1e222d; color:#d1d4dc; border:1px solid #2a2e39;
      border-radius:4px; min-width:480px; max-width:720px; max-height:80vh;
      display:flex; flex-direction:column; overflow:hidden;
    }
    .kv-modal-head {
      padding:10px 14px; border-bottom:1px solid #2a2e39;
      display:flex; align-items:center; justify-content:space-between;
      font-size:14px; font-weight:600;
    }
    .kv-modal-body { padding:10px 14px; overflow-y:auto; }
    .kv-modal-x {
      background:transparent; border:none; color:#787b86; cursor:pointer;
      font-size:18px; padding:0 6px;
    }
    .kv-ind-cat { font-size:11px; color:#787b86; text-transform:uppercase;
                  margin:10px 0 4px; letter-spacing:.5px; }
    .kv-ind-item {
      padding:6px 10px; cursor:pointer; border-radius:3px; font-size:12px;
      display:flex; align-items:center; justify-content:space-between;
    }
    .kv-ind-item:hover { background:#2a2e39; }
    .kv-ind-add { color:#2962ff; font-size:11px; font-weight:600; }
    .kv-sym-input {
      width:100%; background:#0d0e12; border:1px solid #2a2e39;
      color:#d1d4dc; padding:8px 10px; border-radius:3px; font-size:13px;
      box-sizing:border-box;
    }
    .kv-sym-suggest { margin-top:6px; max-height:300px; overflow-y:auto; }
    .kv-sym-row {
      padding:6px 10px; cursor:pointer; border-radius:3px;
      display:flex; justify-content:space-between;
    }
    .kv-sym-row:hover { background:#2a2e39; }
    .kv-sym-row b { color:#fff; }
    .kv-toast {
      position:fixed; bottom:50px; left:50%; transform:translateX(-50%);
      background:#2a2e39; color:#fff; padding:8px 16px; border-radius:3px;
      font-size:12px; z-index:2000; box-shadow:0 4px 14px rgba(0,0,0,.4);
    }
    .kv-side-panel {
      position:fixed; right:56px; top:44px; bottom:28px;
      width:320px; background:#131722; border-left:1px solid #2a2e39;
      z-index:50; display:flex; flex-direction:column;
    }
    .kv-side-head {
      padding:8px 12px; border-bottom:1px solid #2a2e39;
      display:flex; justify-content:space-between; align-items:center;
      font-size:13px; font-weight:600;
    }
    .kv-side-body { flex:1; overflow-y:auto; padding:10px; font-size:12px; color:#b2b5be; }
  </style>

  <!-- TOP BAR -->
  <div class="kv-top">
    <button class="kv-sym" id="kvSymBtn" title="Change symbol">
      <span id="kvSymLabel">${state.symbol}</span> <span style="color:#787b86">▾</span>
    </button>
    <div class="kv-sep"></div>
    <div class="kv-tf-group" id="kvTfGroup">${tfButtons}</div>
    <div class="kv-sep"></div>
    <button class="kv-cs" id="kvCsBtn" title="Chart type">Candles ▾</button>
    <div class="kv-sep"></div>
    <button class="kv-ind" id="kvIndBtn" title="Indicators">ƒx Indicators</button>
    <div class="kv-sep"></div>
    <button class="kv-alert" id="kvAlertBtn" title="New alert">🔔 Alert</button>

    <div class="kv-fill"></div>

    <button class="kv-set" id="kvSetBtn" title="Settings">⚙</button>
    <button class="kv-fs"  id="kvFsBtn"  title="Fullscreen">⛶</button>
    <button class="kv-snap" id="kvSnapBtn" title="Screenshot">📷</button>
    <button class="kv-trade" id="kvTradeBtn">Trade</button>
  </div>

  <!-- LEFT TOOLBAR -->
  <div class="kv-left" id="kvLeft">${drawBtns}
    <div class="kv-divider"></div>
    <button class="kv-tool" data-act="erase" title="Remove last drawing"><span>⌫</span></button>
    <button class="kv-tool" data-act="erase-all" title="Remove all drawings"><span>🗑</span></button>
  </div>

  <!-- CENTER (chart) -->
  <div class="kv-center" id="kvCenter">
    <div id="kv-chart"></div>
    <div class="kv-header">
      <span class="kv-h-sym" id="kvHsym">${state.symbol}</span>
      <span class="kv-h-tf"  id="kvHtf">${state.tf}</span>
      <span class="kv-h-src" id="kvHsrc">${state.source}</span>
      <div class="kv-ohlc" id="kvOhlc">
        O <b id="kvO">—</b> H <b id="kvH">—</b> L <b id="kvL">—</b> C <b id="kvC">—</b>
        <span id="kvChg">—</span>
      </div>
    </div>
  </div>

  <!-- RIGHT SIDEBAR -->
  <div class="kv-right" id="kvRight">${rightBtns}</div>

  <!-- BOTTOM BAR -->
  <div class="kv-bot">
    <span>KLineCharts engine</span>
    <span class="kv-fill"></span>
    <span id="kvClock">--:--:--</span>
  </div>
</div>`;
}

/* =========================================================================
   CHART LIFECYCLE
   ========================================================================= */

let _chart = null;
let _liveCloseFn = null;     // teardown for current WS subscription
let _activeIndicators = [];  // [{ name, paneId }]
let _activeOverlays = [];    // overlay ids returned by chart.createOverlay
let _clockId = null;
let _sidePanelEl = null;

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'kv-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function pickPrecision(symbol) {
  const s = (symbol || '').toUpperCase();
  if (s.endsWith('USDT') || s.endsWith('USD') || s.endsWith('BUSD')) {
    if (s.startsWith('BTC') || s.startsWith('ETH')) return 2;
    return 4;
  }
  return 2;
}

function candlesToKline(candles) {
  return (candles || []).map(c => ({
    timestamp: (c.time || 0) * 1000,
    open:   +c.open,
    high:   +c.high,
    low:    +c.low,
    close:  +c.close,
    volume: +(c.volume || 0),
  }));
}

async function mountChart() {
  if (_chart) {
    try { dispose('kv-chart'); } catch {}
    _chart = null;
  }
  _activeOverlays = [];

  _chart = init('kv-chart', { styles: klineStyles(state.chartType) });
  if (!_chart) {
    console.error('[chart-view-kline] init() returned null');
    toast('KLineCharts failed to initialise');
    return;
  }

  _chart.setLocale('en-US');
  try { _chart.setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'); } catch {}

  const precision = pickPrecision(state.symbol);
  _chart.setSymbol({ ticker: state.symbol, pricePrecision: precision, volumePrecision: 2 });
  _chart.setPeriod(TF_TO_KLINE_PERIOD[state.tf] || TF_TO_KLINE_PERIOD['1D']);

  // ---- DataLoader: provides initial bars + live subscription ----
  _chart.setDataLoader({
    getBars: async ({ type, callback }) => {
      try {
        const { candles, source } = await loadCandles(state.symbol, state.tf, 500);
        state.source = source || 'mock';
        const sourceEl = document.getElementById('kvHsrc');
        if (sourceEl) sourceEl.textContent = state.source;
        callback(candlesToKline(candles), false);
      } catch (e) {
        console.error('[chart-view-kline] getBars failed:', e);
        callback([], false);
      }
    },
    subscribeBar: ({ callback }) => {
      // Tear down previous stream (in case)
      if (_liveCloseFn) { try { _liveCloseFn(); } catch {} _liveCloseFn = null; }
      try {
        const close = openLiveStream(state.symbol, state.tf, (bar) => {
          if (!bar) return;
          callback({
            timestamp: (bar.time || 0) * 1000,
            open:   +bar.open,
            high:   +bar.high,
            low:    +bar.low,
            close:  +bar.close,
            volume: +(bar.volume || 0),
          });
          // Update OHLC header
          updateOhlc(bar);
        });
        _liveCloseFn = (typeof close === 'function') ? close : null;
      } catch (e) {
        console.warn('[chart-view-kline] live stream failed:', e);
      }
    },
    unsubscribeBar: () => {
      if (_liveCloseFn) { try { _liveCloseFn(); } catch {} _liveCloseFn = null; }
    },
  });

  // Re-apply any persisted indicators from previous session
  for (const ind of state.indicators) {
    try {
      _chart.createIndicator(ind.name, false, ind.paneId ? { id: ind.paneId } : undefined);
    } catch {}
  }

  // Crosshair / tooltip → keep OHLC header in sync
  _chart.subscribeAction('onCrosshairChange', (data) => {
    if (data && data.kLineData) updateOhlc({
      time: Math.round(data.kLineData.timestamp / 1000),
      open: data.kLineData.open,
      high: data.kLineData.high,
      low:  data.kLineData.low,
      close:data.kLineData.close,
      volume: data.kLineData.volume,
    });
  });
}

function updateOhlc(bar) {
  const fmt = (n) => (n == null || isNaN(n)) ? '—' : (+n).toFixed(pickPrecision(state.symbol));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kvO', fmt(bar.open));
  set('kvH', fmt(bar.high));
  set('kvL', fmt(bar.low));
  set('kvC', fmt(bar.close));
  const ch = bar.close - bar.open;
  const pct = bar.open ? (ch / bar.open) * 100 : 0;
  const chgEl = document.getElementById('kvChg');
  if (chgEl) {
    const sign = ch >= 0 ? '+' : '';
    chgEl.textContent = `${sign}${ch.toFixed(pickPrecision(state.symbol))} (${sign}${pct.toFixed(2)}%)`;
    chgEl.className = ch >= 0 ? 'pos' : 'neg';
  }
}

/* =========================================================================
   WIRING — buttons, TF group, drawing tools, indicator modal, etc.
   ========================================================================= */

function wire() {
  // TF buttons
  document.getElementById('kvTfGroup')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.kv-tf');
    if (!btn) return;
    const tf = btn.dataset.tf;
    if (tf === state.tf) return;
    document.querySelectorAll('.kv-tf').forEach(b => b.classList.toggle('active', b === btn));
    state.tf = tf;
    persist();
    document.getElementById('kvHtf').textContent = tf;
    await mountChart();
  });

  // Symbol button
  document.getElementById('kvSymBtn')?.addEventListener('click', openSymbolModal);

  // Chart type
  document.getElementById('kvCsBtn')?.addEventListener('click', openChartTypeModal);

  // Indicators
  document.getElementById('kvIndBtn')?.addEventListener('click', openIndicatorsModal);

  // Alert button — bridge to alert-manager if available
  document.getElementById('kvAlertBtn')?.addEventListener('click', () => {
    openSidePanel('alerts');
  });

  // Settings
  document.getElementById('kvSetBtn')?.addEventListener('click', openSettingsModal);

  // Fullscreen
  document.getElementById('kvFsBtn')?.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  // Screenshot
  document.getElementById('kvSnapBtn')?.addEventListener('click', () => {
    try {
      const canvas = _chart?.getConvertPictureUrl?.(true, 'png', '#131722');
      if (canvas) {
        const a = document.createElement('a');
        a.href = canvas;
        a.download = `${state.symbol}_${state.tf}_${Date.now()}.png`;
        a.click();
      } else {
        toast('Screenshot API not available');
      }
    } catch (e) { toast('Screenshot failed'); }
  });

  // Trade
  document.getElementById('kvTradeBtn')?.addEventListener('click', () => openSidePanel('trading'));

  // Left toolbar drawing tools
  document.getElementById('kvLeft')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.kv-tool');
    if (!btn) return;
    const tool = btn.dataset.tool;
    const act  = btn.dataset.act;

    if (act === 'erase') {
      const last = _activeOverlays.pop();
      if (last) { try { _chart.removeOverlay({ id: last }); } catch {} }
      else toast('No drawings to remove');
      return;
    }
    if (act === 'erase-all') {
      try { _chart.removeOverlay(); _activeOverlays = []; toast('All drawings removed'); } catch {}
      return;
    }
    if (!tool) return;

    // visual selection state
    document.querySelectorAll('.kv-tool').forEach(b => b.classList.toggle('active', b === btn));

    if (tool === 'crosshair') {
      // Cancel any in-progress overlay drawing — KLine handles ESC; we just clear active.
      return;
    }
    const overlayName = TOOL_TO_OVERLAY[tool];
    if (!overlayName) { toast(`Tool "${tool}" not supported`); return; }
    try {
      const id = _chart.createOverlay({ name: overlayName });
      if (id) _activeOverlays.push(id);
    } catch (e) {
      console.error('[chart-view-kline] createOverlay failed:', e);
      toast(`Failed to create ${overlayName}`);
    }
  });

  // Right sidebar panels
  document.getElementById('kvRight')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.kv-rb');
    if (!btn) return;
    openSidePanel(btn.dataset.panel);
  });

  // Clock
  if (_clockId) clearInterval(_clockId);
  const tickClock = () => {
    const el = document.getElementById('kvClock');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toTimeString().slice(0, 8);
  };
  tickClock();
  _clockId = setInterval(tickClock, 1000);

  // Keyboard shortcuts
  document.addEventListener('keydown', kvKeyHandler);
}

function kvKeyHandler(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.altKey && e.key.toLowerCase() === 't') { triggerTool('trend-line'); e.preventDefault(); }
  else if (e.altKey && e.key.toLowerCase() === 'h') { triggerTool('h-line'); e.preventDefault(); }
  else if (e.altKey && e.key.toLowerCase() === 'v') { triggerTool('v-line'); e.preventDefault(); }
  else if (e.altKey && e.key.toLowerCase() === 'f') { triggerTool('fib-ret'); e.preventDefault(); }
  else if (e.key === 'Escape') { document.querySelector('.kv-modal-back')?.remove(); _sidePanelEl?.remove(); _sidePanelEl = null; }
}

function triggerTool(toolId) {
  const btn = document.querySelector(`.kv-tool[data-tool="${toolId}"]`);
  if (btn) btn.click();
}

/* =========================================================================
   MODALS  (symbol picker, chart type, indicators, settings)
   ========================================================================= */

function makeModal(title, bodyHtml) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'kv-modal-back';
  back.innerHTML = `
    <div class="kv-modal">
      <div class="kv-modal-head">
        <span>${title}</span>
        <button class="kv-modal-x">✕</button>
      </div>
      <div class="kv-modal-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
  back.querySelector('.kv-modal-x').addEventListener('click', closeModal);
  return back;
}

function closeModal() {
  document.querySelector('.kv-modal-back')?.remove();
}

const SYMBOL_SUGGESTIONS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',
  'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'DOTUSDT', 'LTCUSDT',
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'META', 'AMZN', 'NFLX', 'AMD',
];

function openSymbolModal() {
  const body = `
    <input class="kv-sym-input" id="kvSymInput" placeholder="Type a symbol e.g. BTCUSDT" autofocus />
    <div class="kv-sym-suggest" id="kvSymSuggest"></div>
  `;
  const back = makeModal('Symbol search', body);
  const input = back.querySelector('#kvSymInput');
  const list  = back.querySelector('#kvSymSuggest');

  function render(filter = '') {
    const f = filter.trim().toUpperCase();
    const matches = SYMBOL_SUGGESTIONS.filter(s => !f || s.includes(f)).slice(0, 30);
    if (f && !matches.includes(f)) matches.unshift(f);
    list.innerHTML = matches.map(s => {
      const prof = (typeof getSymbolProfile === 'function') ? (getSymbolProfile(s) || {}) : {};
      return `<div class="kv-sym-row" data-sym="${s}"><b>${s}</b><span style="color:#787b86">${prof.name || ''}</span></div>`;
    }).join('');
  }
  render();
  input.addEventListener('input', () => render(input.value));
  list.addEventListener('click', async (e) => {
    const row = e.target.closest('.kv-sym-row');
    if (!row) return;
    state.symbol = row.dataset.sym;
    persist();
    document.getElementById('kvSymLabel').textContent = state.symbol;
    document.getElementById('kvHsym').textContent = state.symbol;
    closeModal();
    await mountChart();
  });
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const v = input.value.trim().toUpperCase();
      if (v) {
        state.symbol = v;
        persist();
        document.getElementById('kvSymLabel').textContent = v;
        document.getElementById('kvHsym').textContent = v;
        closeModal();
        await mountChart();
      }
    }
  });
}

function openChartTypeModal() {
  const types = [
    { id: 'candle_solid', label: 'Candles (solid)' },
    { id: 'candle_stroke', label: 'Candles (hollow)' },
    { id: 'candle_up_stroke', label: 'Candles (up hollow)' },
    { id: 'candle_down_stroke', label: 'Candles (down hollow)' },
    { id: 'ohlc',  label: 'OHLC bars' },
    { id: 'area',  label: 'Area' },
  ];
  const body = types.map(t =>
    `<div class="kv-ind-item" data-type="${t.id}">${t.label}${state.chartType === t.id ? ' ✓' : ''}</div>`
  ).join('');
  const back = makeModal('Chart type', body);
  back.querySelectorAll('[data-type]').forEach(it => {
    it.addEventListener('click', () => {
      state.chartType = it.dataset.type;
      persist();
      _chart?.setStyles({ candle: { type: state.chartType } });
      closeModal();
    });
  });
}

function openIndicatorsModal() {
  const cats = {};
  for (const ind of NATIVE_INDICATORS) {
    cats[ind.category] = cats[ind.category] || [];
    cats[ind.category].push(ind);
  }
  let body = '';
  for (const cat of Object.keys(cats)) {
    body += `<div class="kv-ind-cat">${cat}</div>`;
    body += cats[cat].map(i =>
      `<div class="kv-ind-item" data-ind="${i.id}" data-overlay="${i.overlay ? 1 : 0}">
         <span>${i.name}</span><span class="kv-ind-add">+ Add</span>
       </div>`
    ).join('');
  }
  const back = makeModal('Indicators', body);
  back.querySelectorAll('.kv-ind-item').forEach(it => {
    it.addEventListener('click', () => {
      const name = it.dataset.ind;
      const isOverlay = it.dataset.overlay === '1';
      try {
        // For overlay indicators (e.g. MA, BOLL), place on main pane via isStack.
        // For oscillators, create a new pane (default).
        const paneId = _chart.createIndicator(
          name,
          isOverlay,                     // isStack — true means draw on main pane
          isOverlay ? { id: 'candle_pane' } : undefined
        );
        if (paneId) {
          state.indicators.push({ name, paneId });
          persist();
          toast(`${name} added`);
        }
      } catch (e) {
        console.error('[chart-view-kline] createIndicator failed:', e);
        toast(`Failed to add ${name}`);
      }
      closeModal();
    });
  });
}

function openSettingsModal() {
  const body = `
    <div class="kv-ind-cat">Theme</div>
    <div class="kv-ind-item" data-act="toggle-grid">Toggle grid</div>
    <div class="kv-ind-item" data-act="reset-zoom">Reset zoom</div>
    <div class="kv-ind-item" data-act="clear-indicators">Remove all indicators</div>
    <div class="kv-ind-item" data-act="clear-drawings">Remove all drawings</div>
    <div class="kv-ind-cat">Data</div>
    <div class="kv-ind-item" data-act="reload">Reload data</div>
  `;
  const back = makeModal('Settings', body);
  back.querySelectorAll('[data-act]').forEach(it => {
    it.addEventListener('click', async () => {
      const a = it.dataset.act;
      if (a === 'toggle-grid') {
        const styles = _chart.getStyles();
        const on = !styles.grid.show;
        _chart.setStyles({ grid: { show: on, horizontal: { show: on }, vertical: { show: on } } });
      } else if (a === 'reset-zoom') {
        _chart.scrollToRealTime(300);
      } else if (a === 'clear-indicators') {
        _chart.removeIndicator();
        state.indicators = [];
        persist();
        toast('Indicators removed');
      } else if (a === 'clear-drawings') {
        _chart.removeOverlay();
        _activeOverlays = [];
        toast('Drawings removed');
      } else if (a === 'reload') {
        await mountChart();
        toast('Reloaded');
      }
      closeModal();
    });
  });
}

/* =========================================================================
   SIDE PANELS — bridge to existing managers when available; otherwise stub.
   ========================================================================= */

function openSidePanel(panelId) {
  if (_sidePanelEl) { _sidePanelEl.remove(); _sidePanelEl = null; }
  const titles = {
    watchlist: 'Watchlist',
    alerts:    'Alerts',
    objects:   'Object tree',
    trading:   'Trading panel',
    news:      'News & ideas',
    calendar:  'Economic calendar',
  };
  const el = document.createElement('div');
  el.className = 'kv-side-panel';
  el.innerHTML = `
    <div class="kv-side-head">
      <span>${titles[panelId] || panelId}</span>
      <button class="kv-modal-x">✕</button>
    </div>
    <div class="kv-side-body" id="kvSideBody">Loading…</div>
  `;
  document.body.appendChild(el);
  el.querySelector('.kv-modal-x').addEventListener('click', () => { el.remove(); _sidePanelEl = null; });
  _sidePanelEl = el;

  const body = el.querySelector('#kvSideBody');

  // Best-effort dynamic import of the existing panel modules — they were
  // written for the lightweight-charts screen but their HTML/UI is engine
  // agnostic. If the import fails or the API differs, fall back to a stub.
  (async () => {
    try {
      if (panelId === 'alerts') {
        const mod = await import('./alert-manager.js').catch(() => null);
        if (mod?.createAlertManager) {
          const mgr = mod.createAlertManager({ symbol: state.symbol });
          if (mgr?.render) { body.innerHTML = ''; body.appendChild(mgr.render()); return; }
        }
        body.innerHTML = stubPanel('Alerts manager — module unavailable in stand-alone Kline view.');
      } else if (panelId === 'news') {
        const mod = await import('./news-ideas-pane.js').catch(() => null);
        if (mod?.createNewsIdeasPane) {
          const pane = mod.createNewsIdeasPane({ symbol: state.symbol });
          if (pane?.render) { body.innerHTML = ''; body.appendChild(pane.render()); return; }
        }
        body.innerHTML = stubPanel('News & ideas pane — module unavailable.');
      } else if (panelId === 'objects') {
        const mod = await import('./object-tree-data-window.js').catch(() => null);
        if (mod?.createObjectTree) {
          const t = mod.createObjectTree({});
          if (t?.render) { body.innerHTML = ''; body.appendChild(t.render()); return; }
        }
        body.innerHTML = stubPanel('Object tree — module unavailable.');
      } else if (panelId === 'trading') {
        const mod = await import('./trading-panel.js').catch(() => null);
        if (mod?.createTradingPanel) {
          const p = mod.createTradingPanel({ symbol: state.symbol });
          if (p?.render) { body.innerHTML = ''; body.appendChild(p.render()); return; }
        }
        body.innerHTML = stubPanel('Trading panel — module unavailable.');
      } else if (panelId === 'calendar') {
        const mod = await import('./economic-calendar.js').catch(() => null);
        if (mod?.createEconomicCalendar) {
          const c = mod.createEconomicCalendar({});
          if (c?.render) { body.innerHTML = ''; body.appendChild(c.render()); return; }
        }
        body.innerHTML = stubPanel('Economic calendar — module unavailable.');
      } else if (panelId === 'watchlist') {
        body.innerHTML = renderWatchlistStub();
        body.querySelectorAll('.kv-sym-row').forEach(r => {
          r.addEventListener('click', async () => {
            state.symbol = r.dataset.sym;
            persist();
            document.getElementById('kvSymLabel').textContent = state.symbol;
            document.getElementById('kvHsym').textContent = state.symbol;
            await mountChart();
          });
        });
      } else {
        body.innerHTML = stubPanel(`${titles[panelId]} — coming soon.`);
      }
    } catch (e) {
      console.warn('[chart-view-kline] side panel error:', e);
      body.innerHTML = stubPanel('Panel failed to load.');
    }
  })();
}

function stubPanel(msg) {
  return `<div style="padding:20px;text-align:center;color:#787b86">${msg}</div>`;
}

function renderWatchlistStub() {
  const wl = lsGet('tv.watchlist', SYMBOL_SUGGESTIONS.slice(0, 10));
  return wl.map(s =>
    `<div class="kv-sym-row" data-sym="${s}" style="padding:8px 10px;cursor:pointer">
       <b>${s}</b><span style="color:#787b86">→</span>
     </div>`
  ).join('');
}

/* =========================================================================
   PUBLIC ENTRY POINT
   ========================================================================= */

export function renderChartViewKline(container) {
  container.innerHTML = buildScreen();
  // Defer chart init until layout settles so the kv-chart container has size.
  setTimeout(async () => {
    try {
      await mountChart();
      wire();
    } catch (e) {
      console.error('[chart-view-kline] render failed:', e);
    }
  }, 0);
}

/* Optional cleanup hook for callers that swap views. */
export function disposeChartViewKline() {
  if (_clockId) { clearInterval(_clockId); _clockId = null; }
  if (_liveCloseFn) { try { _liveCloseFn(); } catch {} _liveCloseFn = null; }
  if (_chart) { try { dispose('kv-chart'); } catch {} _chart = null; }
  document.removeEventListener('keydown', kvKeyHandler);
}
