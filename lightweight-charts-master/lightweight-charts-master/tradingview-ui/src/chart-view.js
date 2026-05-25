import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  LineStyle,
  LineType,
  createSeriesMarkers,
  createTextWatermark,
} from 'lightweight-charts';

// PriceScaleMode is an enum object in v5: 0=Normal 1=Log 2=Percentage 3=IndexedTo100.
// Use raw numbers for compatibility across builds.
const PRICE_SCALE_MODE = { normal: 0, log: 1, percent: 2, indexed: 3 };
const PRICE_SCALE_MODE_LABELS = [
  ['normal',  'Normal'],
  ['log',     'Logarítmica'],
  ['percent', 'Porcentaje'],
  ['indexed', 'Indexada a 100'],
];
import { generateNVDAData, computeEMA, computeSMA, loadCandles, getSymbolProfile, TF_SECONDS, openLiveStream, toBinanceSymbol } from './data.js';
import { createVolumeProfile } from './volume-profile.js';
import { createMultiChartLayout } from './multi-chart.js';
import { createLiveFeed } from './live-feed.js';
import { renderMonthlyReturnsHeatmap, renderGridHeatmap, computeMonthlyReturns, computeCorrelationMatrix } from './heatmap.js';
import { wireExtras } from './extras-integration.js';
import { createNativeTrendLine, createNativeRectangle } from './plugins/native-drawing-tools.js';
import { openSymbolInfoModal } from './symbol-info-modal.js';
import { createAlertManager } from './alert-manager.js';
import { createNewsIdeasPane } from './news-ideas-pane.js';
import { createDrawingTemplateManager } from './drawing-templates.js';
import { createSymbolCompareModal } from './multi-tf-compare.js';
import { createObjectTree, createDataWindow } from './object-tree-data-window.js';
import { createTradingPanel, createDOMPanel, createTimeSalesPanel } from './trading-panel.js';
import { createStrategyTesterPanel } from './strategy-tester-ui.js';
import { createWatchlistManager, createLayoutManager } from './watchlist-layouts-manager.js';
import {
  SMA, EMA, WMA, RSI, MACD, BB, Stochastic, ATR, ADX, VWAP,
  Momentum, OBV, CCI, WilliamsR, Ichimoku,
  // Tier 2A — additional 20 indicators
  DonchianChannel, KeltnerChannels, ParabolicSAR, SuperTrend, AroonIndicator,
  ChaikinMoneyFlow, MFI, TRIX, PivotsHL, DEMA, TEMA, HMA, KAMA, VWMA,
  PivotPoints, BollingerBandWidth, ChandeMomentumOscillator, PriceROC, ZLEMA,
  VolumeOscillator,
  INDICATOR_CATALOG, INDICATOR_PALETTE,
} from './indicators.js';
import {
  FairValueGap, OrderBlocks, BreakOfStructure, ChangeOfCharacter,
  LiquiditySweeps, VolumeDelta, AnchoredVolumeProfile,
} from './indicators-smc.js';
import { createDrawingManager } from './drawing-tools.js';
import { backtest, PRESET_STRATEGIES } from './backtester.js';

// Drawing manager instance — created in mountChart, reused across symbol/TF changes
let _dm = null;

/* =========================================================================
   GLOBAL STATE + PERSISTENCE
   ========================================================================= */

const LS = {
  symbol: 'tv.symbol',
  tf: 'tv.timeframe',
  chartType: 'tv.chartType',
  indicators: 'tv.indicators',
  watchlist: 'tv.watchlist',
  alerts: 'tv.alerts',
  layout: 'tv.layout',
  compares: 'tv.compares',
  drawings: 'tv.drawings',
};

const lsGet = (k, d) => {
  try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
  catch { return d; }
};
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const state = {
  symbol:    lsGet(LS.symbol, 'NVDA'),
  tf:        lsGet(LS.tf, '1D'),
  chartType: lsGet(LS.chartType, 'candles'),
  indicators: lsGet(LS.indicators, []),  // [{id, params, color}]
  watchlist:  lsGet(LS.watchlist, ['NVDA','AAPL','MSFT','TSLA','GOOGL','META','AMZN','NFLX','AMD','BTCUSD']),
  alerts:     lsGet(LS.alerts, []),       // [{symbol, op, price, id}]
  compares:   lsGet(LS.compares, []),     // [symbol]
  layout:     lsGet(LS.layout, { candleBottom: 0.25, priceScaleMode: 'normal', watermarkVisible: false, paneHeights: {} }),
  drawings:   lsGet(LS.drawings, []),     // [{id, type:'trendline', p1:{time,price}, p2:{time,price}, color}]
  signalMarkers: lsGet('tv.signalMarkers', []), // [{time, side:'buy'|'sell', label, color}]
  source:     'mock',
};
// Backward-compat: ensure new layout keys exist for users with older persisted state
if (state.layout.priceScaleMode == null) state.layout.priceScaleMode = 'normal';
// Watermark disabled by default — user explicitly requested no chart-bg label
if (state.layout.watermarkVisible == null) state.layout.watermarkVisible = false;
state.layout.watermarkVisible = false;  // force off until user opts in via Settings → Lienzo
if (!state.layout.paneHeights) state.layout.paneHeights = {};

function persist() {
  lsSet(LS.symbol, state.symbol);
  lsSet(LS.tf, state.tf);
  lsSet(LS.chartType, state.chartType);
  lsSet(LS.indicators, state.indicators);
  lsSet(LS.watchlist, state.watchlist);
  lsSet(LS.alerts, state.alerts);
  lsSet(LS.compares, state.compares);
  lsSet(LS.layout, state.layout);
  lsSet(LS.drawings, state.drawings);
  try { localStorage.setItem('tv.signalMarkers', JSON.stringify(state.signalMarkers || [])); } catch {}
}

function saveDrawings() {
  try { localStorage.setItem(LS.drawings, JSON.stringify(state.drawings)); } catch {}
}

/* =========================================================================
   ICON ASSETS extracted from Figma 2QhXqtb66hdeKvlZAZE4fS
   (URLs valid for 7 days from extraction — re-extract or download to disk)
   ========================================================================= */

const TOP = {
  // Symbol "+" plus (node 1:2246) — re-extracted 2026-05-25
  add:        '/src/icons/742616c3-5f50-4027-bde4-2abd712eae35.svg',
  chartStyle: '/src/icons/995c3e1f-2501-4705-8597-8a80990f3bb6.svg',
  // Indicators "fx" (node 1:2282) — COMPOSITE of two glyphs (f on top, x on bottom)
  indicators1: '/src/icons/f9ffaf7a-04dc-4756-893f-559b3de4e76c.svg',
  indicators2: '/src/icons/0f364e35-212d-427a-a724-5bc77df78e6e.svg',
  // Study templates (node 1:2295) — single icon (re-extracted 2026-05)
  templates1: '/src/icons/cf6ac11c-94cc-4d7b-83e4-9a94dcd5b988.svg',
  templates2: '/src/icons/4f2e390b-83fd-4ed8-84aa-ecbc0b51edb8.svg',
  // Alerta bell (node 1:2305) — COMPOSITE: bell body + clapper/notch
  alertBell:  '/src/icons/9e70a39c-d1c8-4917-b2d4-a08fba1d64cb.svg',
  alertDot:   '/src/icons/3b3508fa-c780-4ec5-a127-07bc26f7e114.svg',
  // Reproducción / replay (node 1:2312) — single icon
  replay:     '/src/icons/5711ad98-f7b8-48e0-a048-489f24070022.svg',
  // Undo / Redo (nodes 1:2322 / 1:2326) — single icons
  undo:       '/src/icons/12f56ee2-509f-4e13-aa81-00c7392f5f3e.svg',
  redo:       '/src/icons/5ba1471c-fb4f-49da-bc62-c24118e19ed6.svg',
  // Layout grid (node 1:2332) — single icon (h-[19px] w-[21px])
  layout:     '/src/icons/87119c86-d6a0-42bd-81b6-ede13ea4b2a8.svg',
  // Settings gear (node 1:2353) — COMPOSITE: gear teeth + center hub
  settings1:  '/src/icons/ff08400a-c304-4128-9e8c-dc6003197f9b.svg',
  settings2:  '/src/icons/cb0bdbe9-652e-49f7-9724-e410ff72e609.svg',
  // Fullscreen (node 1:2358) — COMPOSITE: outer frame + inner square
  fullscr1:   '/src/icons/dfbfddc7-7297-4861-8d2e-fa75c48203fb.svg',
  fullscr2:   '/src/icons/5d28f42a-7adf-4a4b-92a1-e845e9e2eabb.svg',
  // Camera (node 1:2368) — COMPOSITE: body + lens
  camera1:    '/src/icons/8d98204f-9c7e-4bcf-923b-81315d3adfdf.svg',
  camera2:    '/src/icons/ff58bddb-dcb2-40c8-89a2-a207fe321b0c.svg',
  camera:     '/src/icons/8d98204f-9c7e-4bcf-923b-81315d3adfdf.svg',
  chevDn:     '/src/icons/3d8c1e84-780b-4275-a757-833330fe3367.svg',
  // Legend icons (status, favorite star, more dots — extracted from node 1:2621)
  star:       '/src/icons/ba5e2ffe-d41d-4e3e-8c05-bbb8388606f5.svg',
  more:       '/src/icons/1f054f3f-98e8-4cbf-9897-438cf2c7422a.svg',
  starAlt:    '/src/icons/9363192f-26a5-434a-9bd2-8af3aeac11d8.svg',
  // Chart-styles is a COMPOSITE of 4 candle bars (node 1:2269) — each piece
  // positioned at specific insets inside a 28×28 frame
  cs1:        '/src/icons/613b43e9-8329-4817-9b54-525455057186.svg',
  cs2:        '/src/icons/003249ef-dfd9-4fed-903d-b5c019506afe.svg',
  cs3:        '/src/icons/073d1bfd-3828-4fa2-b2c4-34759029fea4.svg',
  cs4:        '/src/icons/193ae61e-c533-427c-8bb2-931a7c93b5dc.svg',
};

// Composite chart-styles icon (4 candle bars layered with exact Figma insets)
// NOTE: uses <div> with background-image instead of <img> because
// position:absolute + 4 insets (top/right/bottom/left) only computes a real box
// for non-replaced elements. <img> would collapse to intrinsic SVG size (0).
function chartStylesIcon() {
  const bg = (src) => `background:url('${src}') center/100% 100% no-repeat`;
  return `<span class="cs-icon">
    <div style="left:57.14%;right:25%;top:35.71%;bottom:35.71%;${bg(TOP.cs1)}"></div>
    <div style="left:64.29%;right:32.14%;top:25%;bottom:25%;${bg(TOP.cs2)}"></div>
    <div style="left:28.57%;right:53.57%;top:25%;bottom:25%;${bg(TOP.cs3)}"></div>
    <div style="left:35.71%;right:60.71%;top:14.29%;bottom:14.29%;${bg(TOP.cs4)}"></div>
  </span>`;
}

/* Composite-icon helper — pieces are positioned absolutely inside an 18×18
   frame using the same percentage insets Figma reports for the 28×28 native
   frame (percentages are dimensionless, so they scale). Inset order matches
   Tailwind's inset-[T_R_B_L]. Uses background-image divs so the 4-inset box
   model actually computes a non-zero box (replaced <img> would collapse). */
function compositeIcon(pieces) {
  const divs = pieces.map(p =>
    `<div style="top:${p.t};right:${p.r};bottom:${p.b};left:${p.l};background:url('${p.src}') center/100% 100% no-repeat"></div>`
  ).join('');
  return `<span class="composite-icon">${divs}</span>`;
}

// Indicators "fx" (1:2282) — f glyph on top, x glyph on bottom
function indicatorsIcon() {
  return compositeIcon([
    { src: TOP.indicators1, t: '17.86%', r: '17.86%', b: '57.14%', l: '21.43%' },
    { src: TOP.indicators2, t: '42.86%', r: '17.86%', b: '17.86%', l: '21.43%' },
  ]);
}

// Alert bell (1:2305) — bell body + clapper/notch
function alertBellIcon() {
  return compositeIcon([
    { src: TOP.alertBell, t: '16.07%', r: '16.07%', b: '17.86%', l: '12.5%' },
    { src: TOP.alertDot,  t: '32.14%', r: '14.29%', b: '10.71%', l: '35.71%' },
  ]);
}

// Settings gear (1:2353) — gear teeth + center hub
function settingsIcon() {
  return compositeIcon([
    { src: TOP.settings1, t: '10.74%', r: '28.59%', b: '42.88%', l: '39.3%'  },
    { src: TOP.settings2, t: '21.96%', r: '17.86%', b: '14.32%', l: '17.86%' },
  ]);
}

// Fullscreen (1:2358) — outer frame + inner square
function fullscreenIcon() {
  return compositeIcon([
    { src: TOP.fullscr1, t: '17.86%', r: '12.5%',  b: '17.86%', l: '12.5%' },
    { src: TOP.fullscr2, t: '35.71%', r: '35.71%', b: '35.71%', l: '35.71%' },
  ]);
}

// Camera (1:2368) — camera body + lens
function cameraIcon() {
  return compositeIcon([
    { src: TOP.camera1, t: '17.86%', r: '14.29%', b: '21.43%', l: '10.71%' },
    { src: TOP.camera2, t: '35.71%', r: '35.71%', b: '32.14%', l: '32.14%' },
  ]);
}

const LEFT = [
  { id: 'crosshair', src: '/src/icons/120be4c8-6665-431f-8e18-229d4689de8e.svg', drop: true,  title: 'Cruz' },
  { id: 'trend',     src: '/src/icons/506bbb02-e673-4f76-b48c-dfbde626e6cf.svg', drop: true,  title: 'Línea de tendencia' },
  { id: 'fib',       src: '/src/icons/14c41e6b-f524-43fb-9c5b-5692b06b5f53.svg', drop: true,  title: 'Herramientas Gann y Fibonacci' },
  { id: 'patterns',  src: '/src/icons/45521d1b-c503-4603-b275-ad2773703e02.svg', drop: true,  title: 'Patrones' },
  { id: 'predict',   src: '/src/icons/9343ff15-0066-4249-9392-1dfe2a48894e.svg', drop: true,  title: 'Predicción y proyección' },
  { id: 'text',      src: '/src/icons/20a88d5b-9371-4f03-bc4c-07fddb642e72.svg', drop: true,  title: 'Anotaciones de texto' },
  { id: 'icons',     src: '/src/icons/6033c4b5-b14e-45cb-9533-490516f465dc.svg', drop: true,  title: 'Pinceles, flechas y figuras' },
  { id: 'pulse',     src: '/src/icons/4a8d379b-c967-4eba-a1bb-3395e6f00afc.svg', drop: true,  title: 'Medidas' },
];
const LEFT_2 = [
  { id: 'brush',  src: '/src/icons/a3c3032b-ccc4-40dc-8156-3b1d1e2c0c31.svg', drop: false, title: 'Pincel' },
  { id: 'eraser', src: '/src/icons/735ca0bd-2481-4b64-bdeb-ebd3c25265b3.svg', drop: false, title: 'Borrar dibujos' },
];
const LEFT_3 = [
  { id: 'magnet',   src: '/src/icons/81ca8012-9dab-4a36-bd2d-1e468c334eae.svg', drop: true,  title: 'Modo de imán (snap a OHLC)' },
  { id: 'lock',     src: '/src/icons/fb1099c1-d784-4dc0-917d-b5d9b17092e7.svg', drop: false, title: 'Bloquear todos los dibujos' },
  { id: 'eye',      src: '/src/icons/209e4bef-bb17-4f21-b017-ce3309d6ee9b.svg', drop: false, title: 'Ocultar todos los dibujos' },
  { id: 'zoom',     src: '/src/icons/ec900fc0-d13f-4549-97ea-e682d706e67f.svg', drop: true,  title: 'Zoom' },
];
const LEFT_4 = [
  { id: 'trash', src: '/src/icons/747539e4-f2ef-40e5-9d5a-d88b206f3c03.svg', drop: true, title: 'Eliminar dibujos e indicadores' },
];

/* =========================================================================
   LEFT TOOLBAR DROPDOWN MENUS (drawing tools)
   Structure replicated from TradingView screenshots provided by user.
   Each item: { id, label, hotkey?, fav?, svg } where svg is an inline glyph.
   ========================================================================= */

// Compact inline glyphs (24×24 viewBox, stroke #dbdbdb / fill currentColor)
const G = {
  // Predict glyphs
  longPos:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 18h18M7 14V8M11 14V5M15 14V10M19 14V7"/></svg>',
  shortPos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 6h18M7 10v6M11 10v9M15 10v4M19 10v7"/></svg>',
  fcst:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 19l5-7 4 5 5-9 4 5"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/><circle cx="17" cy="8" r="1.2" fill="currentColor"/></svg>',
  barPat:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 5v14M5 8h3M5 14h3M11 7v10M11 9h3M11 13h3M17 4v16M17 8h3M17 14h3"/></svg>',
  ghost:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 18c0-7 4-11 8-11s8 4 8 11l-3-2-2 2-3-2-2 2-3-2-3 2z"/><circle cx="10" cy="12" r="1" fill="currentColor"/><circle cx="14" cy="12" r="1" fill="currentColor"/></svg>',
  sector:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21V8l9-5 9 5v13M3 21h18M9 21v-6h6v6"/></svg>',
  vwapA:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 17c4 0 5-10 9-10s5 10 9 10"/><circle cx="3" cy="17" r="1.4" fill="currentColor"/></svg>',
  vpFixed:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4v16M21 4v16M5 8h8M5 12h12M5 16h6"/></svg>',
  vpAnchor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="6" r="2"/><path d="M12 8v6M9 11h6M6 18h12"/><path d="M4 16h2v4H4zM18 16h2v4h-2z"/></svg>',
  rangeP:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 6h14M5 18h14M5 4v4M19 4v4M5 16v4M19 16v4M9 12h6"/></svg>',
  rangeD:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 8h16M4 16h16M4 6v4M20 6v4M4 14v4M20 14v4"/></svg>',
  rangePD:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="6" width="16" height="12"/><path d="M4 12h16M12 6v12"/></svg>',

  // Fibonacci glyphs
  fibRet:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 5h18M3 9h18M3 13h18M3 17h18M3 21h18M5 5v16"/></svg>',
  fibExt:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 18l8-12 5 7 5-3M3 18h18M3 5h18"/></svg>',
  fibChan:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 19L21 5M3 16L21 2M3 22L21 8"/></svg>',
  fibTime:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4v16M7 4v16M11 4v16M16 4v16"/></svg>',
  fibFan:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20L20 4M4 20L20 8M4 20L20 12M4 20L20 16M4 20h16"/></svg>',
  fibProj:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20l7-9 4 6 7-10M3 4v16h18"/></svg>',
  fibCirc:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="6" cy="18" r="3"/><circle cx="6" cy="18" r="7"/><circle cx="6" cy="18" r="11"/></svg>',
  fibSpir:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 12a3 3 0 1 1 3 3 5 5 0 0 1-5-5 7 7 0 0 1 7-7"/></svg>',
  fibArc:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20A8 8 0 0 1 20 20M4 20A12 12 0 0 1 20 20M4 20A4 4 0 0 1 20 20"/></svg>',
  fibWedge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20L21 4M3 20l18-2M3 20l18-8"/></svg>',
  fanTool:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20l16-16M4 20l12-6M4 20l8-12M4 20h16"/></svg>',
  gannGrid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h16v16H4zM4 9h16M4 14h16M9 4v16M14 4v16"/></svg>',
  gannSq:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h16v16H4zM4 4l16 16M4 20L20 4"/></svg>',
  gannSqF:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h16v16H4zM4 12h16M12 4v16"/></svg>',
  gannFan:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20L20 4M4 20L18 6M4 20L16 8M4 20h16"/></svg>',

  // Text & notes glyphs
  text:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v3h-2V6H13v12h2v2H9v-2h2V6H6v1H4z"/></svg>',
  note:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h13l3 3v13H4z"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>',
  priceNote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M9 12h6M12 9v6"/></svg>',
  pin:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="10" r="3"/><path d="M12 13v7M12 4a6 6 0 0 1 6 6c0 4-6 10-6 10S6 14 6 10a6 6 0 0 1 6-6z"/></svg>',
  table:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="5" width="16" height="14"/><path d="M4 10h16M4 14h16M10 5v14M16 5v14"/></svg>',
  legend:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="6" width="14" height="12" rx="1"/><path d="M17 11l4-3v8z" fill="currentColor"/></svg>',
  comment:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5h16v11H10l-4 4v-4H4z"/></svg>',
  priceTag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12l9-8h9v9l-8 9z"/><circle cx="17" cy="7" r="1.4" fill="currentColor"/></svg>',
  signal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  flag:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 3v18M5 4h12l-2 4 2 4H5"/></svg>',
  image:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="5" width="18" height="14"/><circle cx="8" cy="10" r="2"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>',
  publish:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  idea:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3a6 6 0 0 1 4-10z"/></svg>',

  // ── TREND-LINES dropdown (2nd icon) ──
  trendLine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20L21 4"/><circle cx="3" cy="20" r="1.4" fill="currentColor"/><circle cx="21" cy="4" r="1.4" fill="currentColor"/></svg>',
  ray:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 19L20 5"/><circle cx="4" cy="19" r="1.4" fill="currentColor"/></svg>',
  infoLine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 18L15 6"/><circle cx="3" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="20" cy="6" r="2.5"/><path d="M20 5v2M20 8v.5"/></svg>',
  extLine:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 22L22 2"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/></svg>',
  angle:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20h16M4 20L18 6"/><path d="M9 20a5 5 0 0 0 4-3"/></svg>',
  hLine:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><path d="M8 12h12"/></svg>',
  hRay:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="4" cy="12" r="1.6" fill="currentColor"/><path d="M6 12h16"/></svg>',
  vLine:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="6" r="1.6" fill="currentColor"/><path d="M12 8v12"/></svg>',
  crossLine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M2 12h8M14 12h8M12 2v8M12 14v8"/></svg>',
  parChan:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20L21 8M3 16L21 4"/></svg>',
  regrTrend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20L20 6M3 14L21 4M5 22L19 10"/></svg>',
  topBottom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 8h18M3 16h18"/></svg>',
  discChan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 8L9 14M11 8L17 14M19 6L21 8M3 16L9 18M11 16L17 18"/></svg>',
  pitch:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4L20 12M4 4L20 18M4 4L12 20"/></svg>',
  schiff:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6L20 14M4 6L20 18M4 6L14 20M4 4v4"/></svg>',
  schiffMod:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 6L22 14M2 6L22 18M2 6L14 20M2 4v4M22 14h-3"/></svg>',

  // ── PATTERNS dropdown (4th icon) ──
  xabcd:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 18l4-12 4 8 4-10 4 14"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/><circle cx="8" cy="6" r="1.2" fill="currentColor"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/><circle cx="16" cy="4" r="1.2" fill="currentColor"/><circle cx="20" cy="18" r="1.2" fill="currentColor"/></svg>',
  cypher:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 20l5-10 4 6 4-12 3 10"/><circle cx="4" cy="20" r="1.2" fill="currentColor"/><circle cx="13" cy="16" r="1.2" fill="currentColor"/><circle cx="20" cy="20" r="1.2" fill="currentColor"/></svg>',
  headShlds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 18l3-6 3 4 3-10 3 10 3-4 3 6"/></svg>',
  abcd:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 20l6-12 4 8 6-10"/><circle cx="4" cy="20" r="1.2" fill="currentColor"/><circle cx="10" cy="8" r="1.2" fill="currentColor"/><circle cx="14" cy="16" r="1.2" fill="currentColor"/><circle cx="20" cy="6" r="1.2" fill="currentColor"/></svg>',
  triPat:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 4L21 14L3 20zM3 4L21 14"/></svg>',
  threeImp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 20l3-6 3 4 3-10 3 8 3-6 3 4"/></svg>',
  elliotIm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 20l3-8 4 4 4-12 4 8 3-6"/></svg>',
  elliotCorr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 4l6 10 4-6 7 12"/></svg>',
  elliotTri:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 12l4-8 3 14 3-10 4 4 3-8 3 14"/></svg>',
  elliotDbl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 18l3-8 3 6 3-10 3 12 3-6 3 8"/></svg>',
  elliotTrp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 20l2-8 3 4 2-10 3 6 2-4 3 8 3-6 3 10"/></svg>',
  cyclicL:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4v16M9 4v16M14 4v16M19 4v16"/><circle cx="4" cy="20" r="1.4" fill="currentColor"/></svg>',
  timeCycle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="18" r="4"/><circle cx="18" cy="18" r="4"/></svg>',
  sineLine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 12c4-8 8-8 12 0s8 8 12 0"/></svg>',

  // ── BRUSH / ARROWS / FIGURES dropdown (7th icon, "icons" id) ──
  brush:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21c0-3 2-5 5-5h2c0 3-2 5-5 5z"/><path d="M9 14L20 3M20 3l1 1M16 6l3 3"/></svg>',
  highliter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 21l4-2 11-11-3-3-11 11z"/><path d="M5 21h6M14 6l3 3"/></svg>',
  arrMark:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20L20 4M14 4h6v6"/></svg>',
  arrow:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21L21 3M21 3h-7M21 3v7"/></svg>',
  arrUp:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 20V5M5 11l7-7 7 7"/></svg>',
  arrDown:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 4v15M5 13l7 7 7-7"/></svg>',
  rectShape:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="6" width="16" height="12"/><circle cx="4" cy="6" r="1.4" fill="currentColor"/><circle cx="20" cy="6" r="1.4" fill="currentColor"/><circle cx="4" cy="18" r="1.4" fill="currentColor"/><circle cx="20" cy="18" r="1.4" fill="currentColor"/></svg>',
  rectRot:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 8L12 4L20 8L20 16L12 20L4 16z"/><circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="20" cy="16" r="1.4" fill="currentColor"/></svg>',
  pathShape:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 18l4-8 5 4 4-6 5 8"/><circle cx="3" cy="18" r="1.2" fill="currentColor"/><circle cx="21" cy="16" r="1.2" fill="currentColor"/></svg>',
  circleShape:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="8"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/></svg>',
  ellipse:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="12" cy="12" rx="9" ry="6"/></svg>',
  polyline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20l5-10 4 6 4-12 5 14"/><circle cx="3" cy="20" r="1.2" fill="currentColor"/><circle cx="8" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="4" r="1.2" fill="currentColor"/><circle cx="21" cy="18" r="1.2" fill="currentColor"/></svg>',
  triShape: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 4L20 20H4z"/></svg>',
  arcShape: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20A10 10 0 0 1 20 20"/><circle cx="4" cy="20" r="1.2" fill="currentColor"/><circle cx="20" cy="20" r="1.2" fill="currentColor"/></svg>',
  curve:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 19C8 19 12 8 21 8"/><circle cx="3" cy="19" r="1.2" fill="currentColor"/><circle cx="21" cy="8" r="1.2" fill="currentColor"/></svg>',
  dblCurve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 18c3 0 4-10 9-10s7 6 9 6"/><path d="M3 12c3 0 4-6 9-6s7 4 9 4"/></svg>',
};

// Glyphs for crosshair tool dropdown (1st icon — Cursor selector)
const CH_GLYPHS = {
  cross:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  dot:    '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>',
  arrow:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4l8 16 2-7 7-2z"/></svg>',
  demo:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg>',
  magic:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20l13-13M14 4l2 2M18 8l2 2M12 2l1 2M20 4l1 2"/></svg>',
  eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 4l4 4-9 9H7l-3-3z"/><path d="M9 21h12"/></svg>',
};

const LEFT_TOOL_MENUS = {
  // 1st icon: Cruz / Cursores
  crosshair: {
    width: 260,
    sections: [
      { items: [
        { id: 'ch-cross', label: 'Cruce',          svg: CH_GLYPHS.cross  },
        { id: 'ch-dot',   label: 'Punto',          svg: CH_GLYPHS.dot    },
        { id: 'ch-arrow', label: 'Flecha',         svg: CH_GLYPHS.arrow  },
        { id: 'ch-demo',  label: 'Demostración',   svg: CH_GLYPHS.demo   },
        { id: 'ch-magic', label: 'Magia',          svg: CH_GLYPHS.magic  },
      ]},
      { items: [
        { id: 'ch-eraser', label: 'Borrador',      svg: CH_GLYPHS.eraser },
      ]},
      { isToggle: true, id: 'ch-longpress-hint', label: 'Sugerencia sobre valores al pulsar de forma prolongada' },
      { isToggle: true, id: 'ch-ohlc-tooltip', label: 'Mostrar OHLC al pasar el cursor', defaultOn: true },
    ]
  },
  // 5th icon: Predicción y proyección
  predict: {
    width: 280,
    sections: [
      { title: 'Previsión', items: [
        { id: 'long-pos',   label: 'Posición larga',           svg: G.longPos  },
        { id: 'short-pos',  label: 'Posición corta',           svg: G.shortPos },
        { id: 'fcst-pos',   label: 'Previsión de la posición', svg: G.fcst     },
        { id: 'bar-pat',    label: 'Patrón de barra',          svg: G.barPat   },
        { id: 'ghost',      label: 'Ghost feed',               svg: G.ghost    },
        { id: 'sector',     label: 'Sector',                   svg: G.sector, fav: true },
      ]},
      { title: 'En función del volumen', items: [
        { id: 'vwap-anchor', label: 'VWAP anclado',                  svg: G.vwapA    },
        { id: 'vp-fixed',    label: 'Perfil de volumen de rango fijo', svg: G.vpFixed  },
        { id: 'vp-anchor',   label: 'Perfil de volumen anclado',     svg: G.vpAnchor },
      ]},
      { title: 'Medidores', items: [
        { id: 'range-p',  label: 'Rango de precios',         svg: G.rangeP  },
        { id: 'range-d',  label: 'Rango de fechas',          svg: G.rangeD  },
        { id: 'range-pd', label: 'Rango de fecha y precio',  svg: G.rangePD },
      ]},
    ]
  },
  // 3rd icon: Herramientas Gann y Fibonacci
  fib: {
    width: 460,
    sections: [
      { title: 'Fibonacci', items: [
        { id: 'fib-ret',   label: 'Retroceso de Fibonacci',                              svg: G.fibRet,  hotkey: 'Alt + F' },
        { id: 'fib-ext',   label: 'Extensión de Fibonacci en función de las tendencias', svg: G.fibExt   },
        { id: 'fib-chan',  label: 'Canal de Fibonacci',                                  svg: G.fibChan  },
        { id: 'fib-time',  label: 'Zona horaria de Fibonacci',                           svg: G.fibTime  },
        { id: 'fib-fan',   label: 'Abanico de Fibonacci de resistencia de velocidad',    svg: G.fibFan, fav: true },
        { id: 'fib-proj',  label: 'Proyección temporal de Fibonacci en función de las tendencias', svg: G.fibProj },
        { id: 'fib-circ',  label: 'Círculos de Fibonacci',                               svg: G.fibCirc  },
        { id: 'fib-spir',  label: 'Espiral de Fibonacci',                                svg: G.fibSpir  },
        { id: 'fib-arc',   label: 'Arcos de Fibonacci de resistencia de velocidad',     svg: G.fibArc   },
        { id: 'fib-wedge', label: 'Cuña de Fibonacci',                                   svg: G.fibWedge },
        { id: 'fan-tool',  label: 'Herramienta abanico',                                 svg: G.fanTool  },
      ]},
      { title: 'Gann', items: [
        { id: 'gann-grid',  label: 'Cuadrícula de Gann',     svg: G.gannGrid },
        { id: 'gann-sq-fix', label: 'Cuadrado de Gann fijo', svg: G.gannSqF  },
        { id: 'gann-sq',    label: 'Cuadrado de Gann',       svg: G.gannSq   },
        { id: 'gann-fan',   label: 'Abanico de Gann',        svg: G.gannFan  },
      ]},
    ]
  },
  // 6th icon: Anotaciones de texto
  text: {
    width: 280,
    sections: [
      { title: 'Texto y notas', items: [
        { id: 'text',       label: 'Texto',            svg: G.text      },
        { id: 'note',       label: 'Nota',             svg: G.note      },
        { id: 'price-note', label: 'Nota de precio',   svg: G.priceNote, fav: true },
        { id: 'pin',        label: 'Fijar',            svg: G.pin       },
        { id: 'table',      label: 'Tabla',            svg: G.table     },
        { id: 'legend',     label: 'Leyenda',          svg: G.legend    },
        { id: 'comment',    label: 'Comentarios',      svg: G.comment   },
        { id: 'price-tag',  label: 'Etiqueta de precio', svg: G.priceTag },
        { id: 'signal',     label: 'Señal',            svg: G.signal    },
        { id: 'flag',       label: 'Marca con bandera', svg: G.flag     },
      ]},
      { title: 'Contenido', items: [
        { id: 'image',   label: 'Imagen',  svg: G.image   },
        { id: 'publish', label: 'Publicar', svg: G.publish },
        { id: 'idea',    label: 'Idea',     svg: G.idea    },
      ]},
    ]
  },
  // 2nd icon: Herramientas de tendencia
  trend: {
    width: 280,
    sections: [
      { title: 'Líneas', items: [
        { id: 'trend-line', label: 'Línea de tendencia',   svg: G.trendLine,  hotkey: 'Alt + T' },
        { id: 'ray',        label: 'Rayo',                 svg: G.ray        },
        { id: 'info-line',  label: 'Línea de información', svg: G.infoLine   },
        { id: 'ext-line',   label: 'Línea extendida',      svg: G.extLine    },
        { id: 'trend-angle',label: 'Ángulo de tendencia',  svg: G.angle      },
        { id: 'h-line',     label: 'Línea horizontal',     svg: G.hLine,      hotkey: 'Alt + H' },
        { id: 'h-ray',      label: 'Rayo horizontal',      svg: G.hRay,       hotkey: 'Alt + J' },
        { id: 'v-line',     label: 'Línea vertical',       svg: G.vLine,      hotkey: 'Alt + V' },
        { id: 'cross-line', label: 'Línea de cruce',       svg: G.crossLine,  hotkey: 'Alt + C' },
      ]},
      { title: 'Canales', items: [
        { id: 'par-chan',   label: 'Canal paralelo',           svg: G.parChan   },
        { id: 'regr-trend', label: 'Tendencia de regresión',   svg: G.regrTrend },
        { id: 'top-bottom', label: 'Plano superior/inferior',  svg: G.topBottom },
        { id: 'disc-chan',  label: 'Canal desconectado',       svg: G.discChan  },
      ]},
      { title: 'Tridentes', items: [
        { id: 'pitch',       label: 'Herramienta tridente',         svg: G.pitch     },
        { id: 'schiff',      label: 'Tridente de Schiff',           svg: G.schiff    },
        { id: 'schiff-mod',  label: 'Tridente de Schiff modificado',svg: G.schiffMod },
      ]},
    ]
  },
  // 4th icon: Patrones
  patterns: {
    width: 320,
    sections: [
      { title: 'Patrones de gráficos', items: [
        { id: 'pat-xabcd',   label: 'Patrón XABCD',           svg: G.xabcd    },
        { id: 'pat-cypher',  label: 'Patrón de cifrado',      svg: G.cypher   },
        { id: 'pat-hs',      label: 'Cabeza y hombros',       svg: G.headShlds},
        { id: 'pat-abcd',    label: 'Patrón ABCD',            svg: G.abcd     },
        { id: 'pat-tri',     label: 'Patrón de triángulo',    svg: G.triPat   },
        { id: 'pat-3imp',    label: 'Patrón de tres impulsos',svg: G.threeImp },
      ]},
      { title: 'Ondas de Elliott', items: [
        { id: 'ell-imp',   label: 'Onda de impulso de Elliott (1·2·3·4·5)',      svg: G.elliotIm   },
        { id: 'ell-corr',  label: 'Onda de corrección de Elliott (A·B·C)',       svg: G.elliotCorr },
        { id: 'ell-tri',   label: 'Onda triangular de Elliott (A·B·C·D·E)',      svg: G.elliotTri  },
        { id: 'ell-dbl',   label: 'Onda doble combinada de Elliott (W·X·Y)',     svg: G.elliotDbl  },
        { id: 'ell-trp',   label: 'Onda triple combinada de Elliott (W·X·Y·Z)',  svg: G.elliotTrp  },
      ]},
      { title: 'Ciclos', items: [
        { id: 'cyclic-lines', label: 'Líneas cíclicas',  svg: G.cyclicL   },
        { id: 'time-cycles',  label: 'Ciclos de tiempo', svg: G.timeCycle },
        { id: 'sine-line',    label: 'Línea del seno',   svg: G.sineLine  },
      ]},
    ]
  },
  // 7th icon: Pinceles, flechas y figuras
  icons: {
    width: 280,
    sections: [
      { title: 'Pinceles', items: [
        { id: 'pencil',     label: 'Pincel',     svg: G.brush     },
        { id: 'highliter',  label: 'Resaltador', svg: G.highliter },
      ]},
      { title: 'Flechas', items: [
        { id: 'arrow-mark', label: 'Marcador de flecha',         svg: G.arrMark },
        { id: 'arrow',      label: 'Flecha',                     svg: G.arrow   },
        { id: 'arrow-up',   label: 'Marca de flecha hacia arriba', svg: G.arrUp   },
        { id: 'arrow-down', label: 'Marca de flecha hacia abajo',  svg: G.arrDown },
      ]},
      { title: 'Figuras', items: [
        { id: 'rect',       label: 'Rectángulo',         svg: G.rectShape,   hotkey: 'Alt + Shift + R' },
        { id: 'rect-rot',   label: 'Rectángulo rotado',  svg: G.rectRot      },
        { id: 'path',       label: 'Ruta',               svg: G.pathShape    },
        { id: 'circle',     label: 'Círculo',            svg: G.circleShape  },
        { id: 'ellipse',    label: 'Elipse',             svg: G.ellipse      },
        { id: 'polyline',   label: 'Polilínea',          svg: G.polyline     },
        { id: 'triangle',   label: 'Triángulo',          svg: G.triShape     },
        { id: 'arc',        label: 'Arco',               svg: G.arcShape     },
        { id: 'curve',      label: 'Curva',              svg: G.curve        },
        { id: 'dbl-curve',  label: 'Doble curva',        svg: G.dblCurve     },
      ]},
    ]
  },
  // Magnet (LEFT_3): weak / strong + snap-to-indicators toggle
  magnet: {
    width: 220,
    sections: [
      { items: [
        { id: 'magnet-weak',   label: 'Imán débil',  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/></svg>' },
        { id: 'magnet-strong', label: 'Imán fuerte', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/></svg>' },
      ]},
      { divider: true, items: [
        { id: 'magnet-snap-ind', label: 'Ajustar a los indicadores', toggle: true },
      ]},
    ]
  },
};

const RIGHT_ICONS = [
  { y: 2,   src: '/src/icons/ec725f13-772a-4f9b-aec3-29ea40f498e7.svg', title: 'Lista de seguimiento' },
  { y: 46,  src: '/src/icons/82b20457-7ccb-4235-8f44-6a6bdcb0eb97.svg', title: 'Alertas' },
  { y: 92,  src: '/src/icons/efa9d9f5-48e0-4204-a42d-a52ece5c08e4.svg', title: 'Árbol de objetos y ventana de datos' },
  { y: 138, src: '/src/icons/cccb7bf3-a5e7-4936-b47e-bdb38f4015eb.svg', title: 'Chats' },
  { y: 529, src: '/src/icons/4fb30348-ed6a-4519-8c81-2f8cfde70992.svg', title: 'Calendario económico' },
  { y: 573, src: '/src/icons/208d5a0f-a1a3-428f-a833-57a8a04ccb5a.svg', title: 'Calendario de noticias' },
  { y: 617, src: '/src/icons/380f8103-cdc8-48b7-b4ac-542c5c9672a4.svg', title: 'Ideas publicadas' },
  { y: 661, src: '/src/icons/c7e6d694-7df2-4ae2-996e-9e149466ff4a.svg', title: 'Comunidad' },
  { y: 707, src: '/src/icons/0f3cee29-0e15-43e8-8497-bef1fdbf420e.svg', title: 'Notificaciones' },
  { y: 753, src: '/src/icons/88fb87a6-d2b9-4b58-988d-8e3568d63f95.svg', title: 'Productos' },
  { y: 812, src: '/src/icons/5470c460-fc80-40a1-b961-003c5ecfb0c6.svg', title: 'Ajustes panel derecho' },
];

const BB_CALENDAR = '/src/icons/2502a872-6a70-4cfa-b961-de63ebef53c3.svg';

/* =========================================================================
   HTML BUILDERS
   ========================================================================= */

// Icon renderer — uses the SVG sprite (1 HTTP request total) for local icons,
// fall back to <img> for any external URL. The sprite is loaded once on
// first <use> reference; subsequent references are instant from cache.
function img(src, w = 28, h = 28, alt = '') {
  const m = src && typeof src === 'string' && src.match(/^\/src\/icons\/([a-f0-9-]+)\.svg$/);
  if (m) {
    return `<svg width="${w}" height="${h}" aria-label="${alt}" class="ic"><use href="/src/icons-sprite.svg#i-${m[1]}"/></svg>`;
  }
  return `<img src="${src}" width="${w}" height="${h}" alt="${alt}" loading="lazy" />`;
}

function buildHBtn() {
  return `
<div class="h-btn" title="Menú principal">
  <div class="h-btn-inner">
    <div class="h-btn-logo">H</div>
    <span class="h-btn-badge">11</span>
  </div>
</div>`;
}

function buildTopBar() {
  return `
<div class="topbar">
  <div class="topbar-scroll">
    <!-- Group 1: Symbol -->
    <div class="tb-group">
      <div class="tb-symbol-wrap">
        <div class="tb-symbol" id="symbolPill" title="Cambiar símbolo">
          <span class="tb-symbol-chev">▾</span>
          <span class="tb-symbol-text">NVDA</span>
          <button class="tb-symbol-info" id="symbolInfoBtn" title="Información del símbolo" style="background:none;border:none;color:#787b86;cursor:pointer;padding:0 4px;font-size:11px">ⓘ</button>
          <button class="tb-symbol-add" id="symbolAddBtn" title="Añadir símbolo de comparación">
            <div>${img(TOP.add, 18, 18)}</div>
          </button>
        </div>
      </div>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 2: Timeframe -->
    <div class="tb-group">
      <button class="tb-tf" id="tfBtn" title="Intervalo">D</button>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 3: Chart styles -->
    <div class="tb-group">
      <button class="tb-btn" id="chartStyleBtn" title="Tipo de gráfico">
        <span class="icon">${chartStylesIcon()}</span>
      </button>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 4: Indicators + templates -->
    <div class="tb-group">
      <button class="tb-btn tb-btn-text" id="indicatorsBtn" title="Indicadores, métricas y estrategias">
        <span class="icon">${indicatorsIcon()}</span>
        <span class="lbl">Indicadores</span>
        <span class="tb-btn-chev">▾</span>
      </button>
      <button class="tb-btn-dropdown" title="Plantillas de indicador">
        <span class="icon">${img(TOP.templates1, 18, 18)}</span>
      </button>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 5: Alerta + Reproducción -->
    <div class="tb-group">
      <button class="tb-btn tb-btn-text" id="alertBtn" title="Crear alerta">
        <span class="icon">${alertBellIcon()}</span>
        <span class="lbl">Alerta</span>
      </button>
      <button class="tb-btn tb-btn-text" id="replayBtn" title="Reproducir barras">
        <span class="icon">${img(TOP.replay)}</span>
        <span class="lbl">Reproducción</span>
      </button>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 6: Undo / Redo -->
    <div class="tb-group">
      <button class="tb-btn" title="Deshacer">
        <span class="icon">${img(TOP.undo)}</span>
      </button>
      <button class="tb-btn" style="opacity:.5" title="Rehacer">
        <span class="icon">${img(TOP.redo)}</span>
      </button>
    </div>

    <div class="tb-fill"></div>

    <!-- Group 7: Layout grid + name -->
    <div class="tb-group">
      <button class="tb-btn" title="Seleccionar diseño">
        <span class="icon">${img(TOP.layout)}</span>
      </button>
      <button class="tb-btn tb-btn-text" title="Diseño / Nombre">
        <span class="lbl">Sin nombre</span>
        <span class="icon">${img(TOP.chevDn, 18, 18)}</span>
      </button>
      <button class="tb-btn" id="searchPaletteBtn" title="Buscar una herramienta o función">
        <span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="#b2b5be"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg></span>
      </button>
    </div>

    <div class="tb-sep"><div></div></div>

    <!-- Group 8: Settings + fullscreen + camera -->
    <div class="tb-group">
      <button class="tb-btn" id="settingsBtn" title="Ajustes">
        <span class="icon">${settingsIcon()}</span>
      </button>
      <button class="tb-btn" id="fullscreenBtn" title="Pantalla completa">
        <span class="icon">${fullscreenIcon()}</span>
      </button>
      <button class="tb-btn" id="screenshotBtn" title="Captura de pantalla">
        <span class="icon">${cameraIcon()}</span>
      </button>
    </div>

  </div>

  <div class="tb-right">
    <div class="tb-trade-wrap">
      <button class="tb-trade-pill" id="tradeBtn">Operar</button>
    </div>
    <div style="width:8px"></div>
    <div class="tb-publish-pill">Publicar</div>
  </div>
</div>`;
}

function buildLeftBar() {
  const grp = (tools) => tools.map(t =>
    `<button class="lb-btn${t.drop ? ' has-dropdown' : ''}" data-tool="${t.id}" title="${t.title}">${img(t.src)}</button>`
  ).join('');

  return `
<div class="leftbar">
  <div class="lb-group">${grp(LEFT)}</div>
  <div class="lb-divider"></div>
  <div class="lb-group">${grp(LEFT_2)}</div>
  <div class="lb-divider"></div>
  <div class="lb-group">${grp(LEFT_3)}</div>
  <div class="lb-divider"></div>
  <div class="lb-group">${grp(LEFT_4)}</div>
</div>`;
}

function buildRightBar() {
  const icons = RIGHT_ICONS.map(ic =>
    `<button class="rb-icon" style="top:${ic.y}px" title="${ic.title}">${img(ic.src, 28, 28)}</button>`
  ).join('');

  return `
<div class="rightbar">
  ${icons}
  <div class="rb-divider" style="top:799px"></div>
</div>`;
}

function buildCenter() {
  return `
<div class="center" id="center">
  <div class="nvda-chart" id="nvda-chart"></div>

  <!-- Pane resize handle between candles and volume -->
  <div class="pane-resize" id="paneResize" title="Arrastra para redimensionar volumen"></div>

  <!-- Shift-zoom rectangle overlay -->
  <div class="zoom-rect" id="zoomRect"></div>

  <!-- Floating crosshair tooltip -->
  <div class="cross-tip" id="crossTip" style="display:none"></div>

  <!-- Floating shift-zoom selection tooltip -->
  <div class="zoom-tip" id="zoomTip" style="display:none"></div>

  <!-- Price-scale context menu (right-click on price axis) -->
  <div class="scale-ctx" id="scaleCtx" style="display:none">
    <div class="ctx-item" data-mode="normal">Normal</div>
    <div class="ctx-item" data-mode="log">Logarítmica</div>
    <div class="ctx-item" data-mode="percent">Porcentaje</div>
    <div class="ctx-item" data-mode="indexed">Indexada a 100</div>
  </div>

  <!-- Auto-scale / reset button (bottom-right of chart area) -->
  <button class="scale-btn" id="resetScaleBtn" title="Restablecer escala">⊙</button>

  <!-- Replay panel (toggled by Reproducción button) — TradingView "Reproducir trading" style -->
  <div class="replay-panel" id="replayPanel" style="display:none">
    <button class="rp-select-bar" id="rpSelectBar" title="Seleccionar punto de partida">
      <span class="rp-scissor">✂</span>
      <span class="rp-select-label">Seleccionar barra</span>
      <span class="rp-chev">▾</span>
    </button>
    <button class="rp-btn rp-prev" id="rpPrev" title="Anterior">▏◀</button>
    <button class="rp-btn rp-play" id="rpPlay" title="Reproducir">▶</button>
    <button class="rp-btn rp-speed-btn" id="rpSpeedBtn" title="Velocidad">
      <span id="rpSpeedLabel">1×</span>
    </button>
    <span class="rp-tf-pill" id="rpTfPill">1m</span>
    <button class="rp-btn rp-next-end" id="rpNext" title="Ir al final">▶▏</button>
    <button class="rp-close" id="rpClose" title="Cerrar">✕</button>
    <!-- Hidden select for speed (used internally; the button cycles values) -->
    <select id="rpSpeed" style="display:none">
      <option value="2000">0.5x</option>
      <option value="1000" selected>1x</option>
      <option value="500">2x</option>
      <option value="250">4x</option>
      <option value="100">10x</option>
    </select>
  </div>

  <!-- Replay "Seleccionar barra" dropdown -->
  <div class="rp-start-menu" id="rpStartMenu" style="display:none">
    <div class="rp-start-title">SELECCIONAR PUNTO DE PARTIDA</div>
    <div class="rp-start-item is-active" data-rs="bar">
      <span class="rp-start-icon">▏◀</span>
      <span>Barra</span>
    </div>
    <div class="rp-start-item" data-rs="date">
      <span class="rp-start-icon">📅</span>
      <span>Fecha…</span>
    </div>
    <div class="rp-start-item" data-rs="first">
      <span class="rp-start-icon">⏮</span>
      <span>Primera fecha disponible</span>
    </div>
    <div class="rp-start-item" data-rs="random">
      <span class="rp-start-icon">🎲</span>
      <span>Barra aleatoria</span>
    </div>
  </div>

  <!-- Context menu (right-click on chart) -->
  <div class="ctx-menu" id="ctxMenu" style="display:none">
    <div class="ctx-item" data-act="settings">Configuración…</div>
    <div class="ctx-item" data-act="fullscreen">Pantalla completa</div>
    <div class="ctx-item" data-act="screenshot">Captura de pantalla</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-act="backtest">Backtest…</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-act="reset">Restablecer escala</div>
    <div class="ctx-item" data-act="autoscale">Autoescalar</div>
  </div>

  <!-- Generic modal/dropdown shell -->
  <div class="modal-back" id="modalBack" style="display:none"></div>
  <div class="modal" id="modal" style="display:none">
    <div class="modal-head">
      <span class="modal-title" id="modalTitle">Diálogo</span>
      <button class="modal-x" id="modalX" title="Cerrar">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>

  <!-- Symbol search dropdown (anchored to symbol pill) -->
  <div class="sym-pop" id="symPop" style="display:none">
    <input class="sym-input" id="symInput" placeholder="Símbolo, p. ej. AAPL" autocomplete="off"/>
    <div class="sym-list" id="symList"></div>
  </div>

  <!-- Compare popup -->
  <div class="sym-pop" id="cmpPop" style="display:none">
    <div class="cmp-head">Comparar símbolos</div>
    <input class="sym-input" id="cmpInput" placeholder="Añadir símbolo a comparar"/>
    <div class="sym-list" id="cmpList"></div>
  </div>

  <!-- Trade dropdown -->
  <div class="trade-pop" id="tradePop" style="display:none">
    <div class="trade-item"><span class="ti-dot buy"></span>Comprar a mercado</div>
    <div class="trade-item"><span class="ti-dot sell"></span>Vender a mercado</div>
    <div class="ctx-sep"></div>
    <div class="trade-item">Orden limitada…</div>
    <div class="trade-item">Orden stop…</div>
    <div class="ctx-sep"></div>
    <div class="trade-item">Conectar broker</div>
  </div>

  <!-- Left-toolbar dropdown panel (drawing tools) -->
  <div class="tool-menu" id="toolMenu" style="display:none">
    <div class="tool-menu-inner" id="toolMenuInner"></div>
  </div>

  <div class="legend" id="legend">
    <div class="legend-line">
      <div class="legend-logo">N</div>
      <span class="legend-title">NVIDIA Corporation</span>
      <span class="legend-sep">·</span>
      <span class="legend-tf">1D</span>
      <span class="legend-sep">·</span>
      <span class="legend-exch">NASDAQ</span>
      <span class="legend-badge" title="Mercado en vivo">
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#089981"/></svg>
      </span>
      <span class="legend-buttons">
        <button class="legend-btn" title="Marcar símbolo">${img(TOP.star, 12, 12)}</button>
        <button class="legend-btn" title="Más">${img(TOP.more, 18, 18)}</button>
      </span>
    </div>
    <div class="ohlc" id="ohlc">
      <span class="ohlc-pair"><span class="ohlc-key">O</span><span class="ohlc-val" id="o">—</span></span>
      <span class="ohlc-pair"><span class="ohlc-key">H</span><span class="ohlc-val" id="h">—</span></span>
      <span class="ohlc-pair"><span class="ohlc-key">L</span><span class="ohlc-val" id="l">—</span></span>
      <span class="ohlc-pair"><span class="ohlc-key">C</span><span class="ohlc-val" id="c">—</span></span>
      <span class="ohlc-pct"><span class="ohlc-val" id="chg">—</span><span class="ohlc-val" id="chgPct">—</span></span>
    </div>
    <div class="price-pills">
      <div class="pill-sell" id="pillSell">
        <div class="pill-price" id="sellPrice">—</div>
        <div class="pill-label">VENDER</div>
      </div>
      <div class="pill-spread" id="spread">0,00</div>
      <div class="pill-buy" id="pillBuy">
        <div class="pill-price" id="buyPrice">—</div>
        <div class="pill-label">COMPRAR</div>
      </div>
    </div>
    <div class="ind-list" id="indList">
      <div class="ind-row" draggable="true" data-ind="vol">
        <span class="ind-grip">⋮⋮</span>
        <span class="ind-swatch" data-color="#089981" title="Ocultar/Mostrar"></span>
        <span class="ind-name vol" id="volName">Vol.</span>
        <span class="ind-val" id="volVal">—</span>
      </div>
    </div>
    <div class="data-badge" id="dataBadge" title="Origen de datos"></div>
    <button class="legend-collapse" title="Contraer">˄</button>
    <span class="legend-drag" title="Arrastra para mover">⠿</span>
  </div>
</div>`;
}

function buildBottomBar() {
  const RANGES = ['1D','5D','1M','3M','6M','YTD','1A','5A','Todos'];
  const ranges = RANGES.map(r =>
    `<button class="bb-range${r === '1A' ? ' active' : ''}" data-range="${r}">${r}</button>`
  ).join('');

  return `
<div class="bottombar">
  <div class="bb-ranges">${ranges}</div>
  <div class="bb-sep"><div></div></div>
  <button class="bb-nav" id="bbGoStart" title="Ir al inicio">⏮</button>
  <button class="bb-nav" id="bbGoEnd" title="Ir al final">⏭</button>
  <div class="bb-sep"><div></div></div>
  <button class="bb-calendar" title="Ir a la fecha">${img(BB_CALENDAR)}</button>
  <div class="bb-fill"></div>
  <div class="bb-right">
    <div class="bb-time" id="bb-clock">--:--:-- UTC+2</div>
    <div class="bb-sep"><div></div></div>
    <button class="bb-adj" title="Ajustar por dividendos">ADJ</button>
  </div>
</div>`;
}

/* =========================================================================
   CHART
   ========================================================================= */

function fmt(n, dec = 2) {
  if (n == null) return '—';
  return Number(n).toFixed(dec).replace('.', ',');
}

function fmtVol(n) {
  if (n == null) return '—';
  if (n >= 1e9) return fmt(n / 1e9) + 'B';
  if (n >= 1e6) return fmt(n / 1e6) + 'M';
  if (n >= 1e3) return fmt(n / 1e3) + 'K';
  return String(n);
}

function fmtDate(ts) {
  const d = new Date(ts * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

let _chart = null;
let _series = null;
let _resizeObs = null;
let _ctx = null; // chart-related shared state
let _ctx_markersApi = null;     // markers plugin handle for re-applying signal markers
let _watermarkApi = null;        // text-watermark plugin handle

// Build a properly-shaped marker object from a stored signal marker entry.
function _buildSignalMarker(sm) {
  const side = sm.side === 'sell' ? 'sell' : 'buy';
  return {
    time: sm.time,
    position: side === 'buy' ? 'belowBar' : 'aboveBar',
    color:    sm.color || (side === 'buy' ? '#089981' : '#f23645'),
    shape:    side === 'buy' ? 'arrowUp' : 'arrowDown',
    text:     sm.label || (side === 'buy' ? 'B' : 'S'),
  };
}

// ---- Chart-type → series builder ----------------------------------------
function buildMainSeries(chart, chartType, candles) {
  const upC = '#089981', dnC = '#f23645';
  switch (chartType) {
    case 'bars':
    case 'hlc-bars': {
      const s = chart.addSeries(BarSeries, {
        upColor: upC, downColor: dnC,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles);
      return { series: s, kind: 'ohlc' };
    }
    case 'vol-candles': {
      // approximate "volume candles": same shape as candles, body scaling not
      // natively supported; just render as candles
      const s = chart.addSeries(CandlestickSeries, {
        upColor: upC, downColor: dnC,
        borderUpColor: upC, borderDownColor: dnC,
        wickUpColor: upC, wickDownColor: dnC,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles);
      return { series: s, kind: 'ohlc' };
    }
    case 'line': {
      const s = chart.addSeries(LineSeries, {
        color: '#2962ff', lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close })));
      return { series: s, kind: 'value' };
    }
    case 'line-markers': {
      const s = chart.addSeries(LineSeries, {
        color: '#2962ff', lineWidth: 2,
        pointMarkersVisible: true,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close })));
      return { series: s, kind: 'value' };
    }
    case 'line-step': {
      const s = chart.addSeries(LineSeries, {
        color: '#2962ff', lineWidth: 2,
        lineType: LineType.WithSteps,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close })));
      return { series: s, kind: 'value' };
    }
    case 'area-hlc': {
      const s = chart.addSeries(AreaSeries, {
        lineColor: '#2962ff', topColor: 'rgba(41,98,255,0.4)', bottomColor: 'rgba(41,98,255,0.0)',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: (c.high + c.low + c.close) / 3 })));
      return { series: s, kind: 'value' };
    }
    case 'columns': {
      const s = chart.addSeries(HistogramSeries, {
        color: '#2962ff',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({
        time: c.time, value: c.close,
        color: c.close >= c.open ? upC : dnC,
      })));
      return { series: s, kind: 'value' };
    }
    case 'high-low': {
      const s = chart.addSeries(BarSeries, {
        upColor: '#b2b5be', downColor: '#b2b5be',
        thinBars: true,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles);
      return { series: s, kind: 'ohlc' };
    }
    case 'area': {
      const s = chart.addSeries(AreaSeries, {
        lineColor: '#2962ff', topColor: 'rgba(41,98,255,0.4)', bottomColor: 'rgba(41,98,255,0.0)',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close })));
      return { series: s, kind: 'value' };
    }
    case 'baseline': {
      const base = candles[0].close;
      const s = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: base },
        topLineColor: upC, topFillColor1: 'rgba(8,153,129,0.4)', topFillColor2: 'rgba(8,153,129,0.0)',
        bottomLineColor: dnC, bottomFillColor1: 'rgba(242,54,69,0.0)', bottomFillColor2: 'rgba(242,54,69,0.4)',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles.map(c => ({ time: c.time, value: c.close })));
      return { series: s, kind: 'value' };
    }
    case 'hollow': {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: 'rgba(0,0,0,0)',        // transparent body for up
        downColor: dnC,
        borderUpColor: upC, borderDownColor: dnC,
        wickUpColor: upC, wickDownColor: dnC,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles);
      return { series: s, kind: 'ohlc' };
    }
    case 'heikin': {
      // Heikin-Ashi: render as candlesticks with HA values
      const ha = toHeikinAshi(candles);
      const s = chart.addSeries(CandlestickSeries, {
        upColor: upC, downColor: dnC,
        borderUpColor: upC, borderDownColor: dnC,
        wickUpColor: upC, wickDownColor: dnC,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(ha);
      return { series: s, kind: 'ohlc' };
    }
    case 'candles':
    default: {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: upC, downColor: dnC,
        borderUpColor: upC, borderDownColor: dnC,
        wickUpColor: upC, wickDownColor: dnC,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      s.setData(candles);
      return { series: s, kind: 'ohlc' };
    }
  }
}

function toHeikinAshi(candles) {
  const out = [];
  let prev = null;
  for (const c of candles) {
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
    const high = Math.max(c.high, open, close);
    const low  = Math.min(c.low,  open, close);
    const ha = { time: c.time, open: +open.toFixed(4), high: +high.toFixed(4), low: +low.toFixed(4), close: +close.toFixed(4) };
    out.push(ha);
    prev = ha;
  }
  return out;
}

// Insert whitespace records over weekend gaps for intraday timeframes.
// Returns a new array; original is not mutated. Volume array (built later
// from this) must align by time, so we keep the same time keys.
function _withWeekendWhitespace(candles, tf) {
  if (!candles || !candles.length) return candles;
  if (tf !== '1h' && tf !== '4h' && tf !== '30m' && tf !== '15m' && tf !== '5m' && tf !== '1m') return candles;
  const step = TF_SECONDS[tf];
  if (!step) return candles;
  const out = [];
  for (let i = 0; i < candles.length; i++) {
    out.push(candles[i]);
    if (i + 1 >= candles.length) continue;
    const gap = candles[i + 1].time - candles[i].time;
    if (gap > step * 2) {
      // Fill the gap with whitespace points at step intervals (cap 96 fillers/gap).
      let t = candles[i].time + step;
      const end = candles[i + 1].time;
      let n = 0;
      while (t < end && n < 96) {
        out.push({ time: t });
        t += step;
        n++;
      }
    }
  }
  return out;
}

function mountChart(container, candles) {
  if (_chart) { _chart.remove(); _chart = null; }

  // Whitespace weekend gaps DISABLED — user prefers continuous bars without
  // visible weekend gaps (see _withWeekendWhitespace, kept for future opt-in).
  // candles = _withWeekendWhitespace(candles, state.tf);

  // Pane sizing — default candle 75%, volume 25%
  const paneSplit = { top: 0.05, candleBottom: state.layout.candleBottom ?? 0.25 };

  const chart = createChart(container, {
    layout: {
      background: { type: 'solid', color: '#131722' },
      textColor: '#b2b5be',
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: 12,
    },
    grid: {
      vertLines: { color: '#1e2230' },
      horzLines: { color: '#1e2230' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#4a4a4a', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
      horzLine: { color: '#4a4a4a', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
    },
    rightPriceScale: {
      borderColor: '#1e2230',
      textColor: '#b2b5be',
      scaleMargins: { top: paneSplit.top, bottom: paneSplit.candleBottom },
    },
    timeScale: {
      borderColor: '#1e2230',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 6,
      barSpacing: 8,
      tickMarkFormatter: (time) => {
        const d = new Date(time * 1000);
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      },
    },
    width:  container.clientWidth,
    height: container.clientHeight,
  });

  const built = buildMainSeries(chart, state.chartType, candles);
  const series = built.series;
  const seriesKind = built.kind;

  // Real (non-whitespace) candles for derived data (vol/markers/indicators)
  const realCandles = candles;  // whitespace disabled — candles is already raw

  const vol = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    color: '#26a69a55',
    lastValueVisible: false,
  });
  vol.priceScale().applyOptions({ scaleMargins: { top: 1 - paneSplit.candleBottom, bottom: 0 } });
  const volData = realCandles.map(c => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? '#08998166' : '#f2364566',
  }));
  vol.setData(volData);

  // Earnings / dividend markers (synthetic, quarterly)
  const markers = [];
  for (let i = 60; i < realCandles.length; i += 63) {
    markers.push({
      time: realCandles[i].time,
      position: 'belowBar',
      color: '#2962ff',
      shape: 'circle',
      text: 'E',
    });
  }
  for (let i = 30; i < realCandles.length; i += 90) {
    markers.push({
      time: realCandles[i].time,
      position: 'belowBar',
      color: '#089981',
      shape: 'circle',
      text: 'D',
    });
  }
  // Persisted user signal markers
  for (const sm of (state.signalMarkers || [])) {
    markers.push(_buildSignalMarker(sm));
  }
  markers.sort((a, b) => a.time - b.time);
  if (seriesKind === 'ohlc') {
    try { _ctx_markersApi = createSeriesMarkers(series, markers); }
    catch { if (typeof series.setMarkers === 'function') series.setMarkers(markers); }
  }

  // (Removed manual "last close" priceLine — lightweight-charts already draws the
  // live last-value line automatically via series default `priceLineVisible: true`.
  // Keeping a manual one created a second frozen line on top of it.)
  const last = realCandles[realCandles.length - 1];

  // Volume color logic (red label if last bar down)
  const volNameEl = document.getElementById('volName');
  const lastUp = last.close >= last.open;
  if (volNameEl) {
    volNameEl.style.color = lastUp ? 'var(--green-32)' : 'var(--red-58)';
  }
  const volSwatch = document.querySelector('.ind-row[data-ind="vol"] .ind-swatch');
  if (volSwatch) {
    volSwatch.dataset.color = lastUp ? '#089981' : '#f23645';
    volSwatch.style.background = volSwatch.dataset.color;
  }

  // Cache state for handlers (set _chart now so applyIndicator etc. can use it)
  _chart = chart;
  _series = series;
  _ctx = {
    chart,
    candles: realCandles,
    displayCandles: candles,
    series, vol,
    seriesKind,
    volByTime: new Map(realCandles.map(d => [d.time, d.volume])),
    paneSplit,
    visible: { vol: true },
    magnet: false,
    container,
    lastCandle: last,
    indicators: [],   // [{id, params, color, seriesList: [...], paneIndex, valueByTime: {primary: Map}}]
    compares: [],     // [{symbol, series, color}]
    alertLines: [],   // [{id, priceLine, ...}]
    nextPaneIndex: 1,
  };

  // Wire all extras (tooltips, shading, plugins, alt chart types, advanced drawings, SMC, screenshot, infinite-scroll, watermark)
  try {
    _ctx.extras = wireExtras(chart, series, container, _ctx);
    _restoreExtrasToggles();
  } catch (e) { console.warn('[extras] wire failed', e); }

  // Apply persisted chart settings (Settings modal)
  try { applySettings(loadSettings(), /*persist*/ false); } catch {}

  // Apply persisted magnet mode if any
  try {
    const m = localStorage.getItem('tv.magnetMode');
    if (m) {
      _ctx.magnetMode = m;
    }
  } catch {}

  // Apply persisted indicators
  for (const ind of state.indicators) {
    applyIndicator(ind, /*persist*/ false);
  }
  // Apply persisted comparisons
  for (const sym of state.compares) {
    addCompareSeries(sym, /*persist*/ false);
  }
  // Apply persisted alerts
  for (const al of state.alerts) {
    drawAlertLine(al);
  }
  refreshLegendIndicators();

  // Crosshair → legend + floating tooltip
  const o = document.getElementById('o');
  const h = document.getElementById('h');
  const l = document.getElementById('l');
  const c = document.getElementById('c');
  const chg = document.getElementById('chg');
  const chgPct = document.getElementById('chgPct');
  const volVal = document.getElementById('volVal');
  const crossTip = document.getElementById('crossTip');

  const updateLegend = (data) => {
    if (!data) return;
    // For line/area/baseline data, only `value` is present — show synthetic OHLC = value
    const open  = data.open  ?? data.value;
    const high  = data.high  ?? data.value;
    const low   = data.low   ?? data.value;
    const close = data.close ?? data.value;
    o.textContent = fmt(open);
    h.textContent = fmt(high);
    l.textContent = fmt(low);
    c.textContent = fmt(close);
    const ch = close - open;
    const pct = open ? (ch / open) * 100 : 0;
    const cls = ch >= 0 ? 'up' : 'dn';
    chg.className = 'ohlc-val ' + cls;
    chgPct.className = 'ohlc-val ' + cls;
    chg.textContent = (ch >= 0 ? '+' : '') + fmt(ch);
    chgPct.textContent = (pct >= 0 ? '+' : '') + fmt(pct) + '%';

    const v = _ctx.volByTime.get(data.time);
    if (volVal) volVal.textContent = v != null ? fmtVol(v) : '—';

    // Indicator values
    for (const ind of _ctx.indicators) {
      if (!ind.valueByTime) continue;
      for (const [k, m] of Object.entries(ind.valueByTime)) {
        const el = document.getElementById(`indVal_${ind.uid}_${k}`);
        if (el) {
          const val = m.get(data.time);
          el.textContent = val != null ? fmt(val) : '—';
        }
      }
    }
  };

  updateLegend(last);
  setPills(last.close);

  chart.subscribeCrosshairMove(p => {
    if (!p || !p.time || !p.point) {
      crossTip.style.display = 'none';
      return;
    }
    // Respect user toggle (default ON)
    const ohlcEnabled = _getToolToggleWithDefault('ch-ohlc-tooltip', true);
    if (!ohlcEnabled) { crossTip.style.display = 'none'; return; }
    const d = p.seriesData.get(series);
    if (d) {
      updateLegend(d);
      const open  = d.open  ?? d.value;
      const close = d.close ?? d.value;
      const high  = d.high  ?? d.value;
      const low   = d.low   ?? d.value;
      const ch = close - open;
      const pct = open ? (ch / open) * 100 : 0;
      const upCls = ch >= 0 ? 'up' : 'dn';
      // Main symbol line (OHLC summary)
      let html = `
        <div class="ct-date">${fmtDate(d.time || p.time)}</div>
        <div class="ct-sym"><b>${escapeHtml(state.symbol)}</b>
          <span class="ct-mini">O:${fmt(open)} H:${fmt(high)} L:${fmt(low)} C:${fmt(close)}</span>
          <span class="ct-${upCls}">(${(ch>=0?'+':'')+fmt(ch)} ${(pct>=0?'+':'')+fmt(pct)}%)</span>
        </div>`;
      const v = _ctx.volByTime.get(d.time);
      if (v != null) html += `<div class="ct-row"><span>Vol</span><b>${fmtVol(v)}</b></div>`;
      // All indicator series
      for (const ind of (_ctx.indicators || [])) {
        for (const s of (ind.seriesList || [])) {
          const sd = p.seriesData.get(s);
          if (sd == null) continue;
          const val = sd.value ?? sd.close;
          if (val == null) continue;
          const label = (ind.label || ind.id.toUpperCase());
          html += `<div class="ct-row"><span style="color:${ind.color}">${escapeHtml(label)}</span><b>${fmt(val)}</b></div>`;
          break; // one row per indicator (primary)
        }
      }
      // Compare series
      for (const cmp of (_ctx.compares || [])) {
        const sd = p.seriesData.get(cmp.series);
        if (sd == null) continue;
        const val = sd.value ?? sd.close;
        if (val == null) continue;
        html += `<div class="ct-row"><span style="color:${cmp.color}">${escapeHtml(cmp.symbol)}</span><b>${fmt(val)}</b></div>`;
      }
      crossTip.innerHTML = html;
      crossTip.style.display = 'block';
      const cw = crossTip.offsetWidth || 140;
      const ch2 = crossTip.offsetHeight || 110;
      const rect = container.getBoundingClientRect();
      let x = p.point.x + 14;
      let y = p.point.y + 14;
      if (x + cw > rect.width - 60) x = p.point.x - cw - 14;
      if (y + ch2 > rect.height - 30) y = p.point.y - ch2 - 14;
      crossTip.style.left = x + 'px';
      crossTip.style.top  = y + 'px';
    }
  });

  // Live bid/ask jitter
  if (_ctx.bidAskTimer) clearInterval(_ctx.bidAskTimer);
  _ctx.bidAskTimer = setInterval(() => {
    if (!_ctx) return;
    const base = _ctx.lastCandle.close;
    const noise = (Math.random() - 0.5) * 0.06;
    const px = base + noise;
    setPills(px);
    checkAlerts(px);
  }, 1500);

  // Responsive
  const ro = new ResizeObserver(entries => {
    for (const e of entries) {
      chart.applyOptions({
        width:  e.contentRect.width,
        height: e.contentRect.height,
      });
    }
  });
  ro.observe(container);

  _chart = chart;
  if (_resizeObs) _resizeObs.disconnect();
  _resizeObs = ro;

  // Fit visible range to last ~250 bars
  const lastT = candles[candles.length - 1].time;
  const startT = candles[Math.max(0, candles.length - 250)].time;
  chart.timeScale().setVisibleRange({ from: startT, to: lastT });

  // Apply persisted price-scale mode
  try {
    const m = PRICE_SCALE_MODE[state.layout.priceScaleMode] ?? 0;
    chart.priceScale('right').applyOptions({ mode: m });
  } catch {}

  // Mount the text watermark (current symbol + TF)
  _attachWatermark();

  // Restore persisted pane heights (for minimize-pane toggle)
  try {
    const ph = state.layout.paneHeights || {};
    const panes = chart.panes();
    for (const [k, v] of Object.entries(ph)) {
      const idx = +k;
      if (panes[idx] && typeof panes[idx].setHeight === 'function') {
        try { panes[idx].setHeight(v); } catch {}
      }
    }
  } catch {}

  // Wire all DnD + UX once chart exists
  enableDnD(container);
  enableScaleAxisContextMenu(container);
  enableResetScaleButton();
  enableBottomNavButtons();

  // Initialize drawing/trendline subsystem (inline impl: trendlines)
  initDrawings(container);

  // Initialize drawing-tools.js manager (handles hline / fib / rect — separate
  // storage key `tv.drawings_dm` so the two systems coexist without clashing).
  try {
    if (_dm) { try { _dm.removeAll(); } catch {} }
    _dm = createDrawingManager(chart, series, container);
    if (_dm) _dm.loadFromStorage();
  } catch (e) {
    console.warn('[chart-view] createDrawingManager failed:', e);
    _dm = null;
  }

  // Create SVG overlay used by advanced drawings (position-range, pitchfork-gann, elliott-text)
  try {
    let svg = container.querySelector('.drawing-overlay-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'drawing-overlay-svg');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:visible';
      container.appendChild(svg);
    }
    if (_ctx) _ctx.svgOverlay = svg;
  } catch (e) { console.warn('[chart-view] svg overlay failed', e); }

  // Initialize native trend-line + rectangle drawing tools (lightweight-charts primitives)
  try {
    if (_ctx) {
      _ctx.nativeTrend = createNativeTrendLine(chart, series, container, { color: '#2962FF', lineWidth: 2, showLabels: true });
      _ctx.nativeRect  = createNativeRectangle(chart, series, container, { color: '#2962FF', fillColor: 'rgba(41,98,255,0.18)', lineWidth: 1 });
      try { _ctx.nativeTrend.loadFromStorage(); } catch {}
      try { _ctx.nativeRect.loadFromStorage(); } catch {}
    }
  } catch (e) { console.warn('[native drawings]', e); }
}

/* ---------- Tier-1 API additions ---------- */

// Watermark — uses createTextWatermark() from lightweight-charts v5.
function _attachWatermark() {
  if (!_chart) return;
  try {
    if (_watermarkApi) { try { _watermarkApi.detach(); } catch {} _watermarkApi = null; }
    const pane = _chart.panes()[0];
    if (!pane) return;
    if (!state.layout.watermarkVisible) return;
    _watermarkApi = createTextWatermark(pane, {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [{
        text: `${state.symbol} · ${state.tf}`,
        color: 'rgba(255,255,255,0.04)',
        fontSize: 80,
        fontStyle: 'bold',
        fontFamily: 'Trebuchet MS, sans-serif',
      }],
    });
  } catch (e) {
    console.warn('[watermark] attach failed:', e);
  }
}

function _updateWatermarkText() {
  if (!_chart) return;
  if (!state.layout.watermarkVisible) {
    if (_watermarkApi) { try { _watermarkApi.detach(); } catch {} _watermarkApi = null; }
    return;
  }
  if (!_watermarkApi) { _attachWatermark(); return; }
  try {
    _watermarkApi.applyOptions({
      lines: [{
        text: `${state.symbol} · ${state.tf}`,
        color: 'rgba(255,255,255,0.04)',
        fontSize: 80,
        fontStyle: 'bold',
        fontFamily: 'Trebuchet MS, sans-serif',
      }],
    });
  } catch {}
}

// Price-scale modes — context menu on right-axis area
function _setPriceScaleMode(modeKey) {
  if (!_chart) return;
  const m = PRICE_SCALE_MODE[modeKey] ?? 0;
  try { _chart.priceScale('right').applyOptions({ mode: m, autoScale: true }); } catch {}
  state.layout.priceScaleMode = modeKey;
  lsSet(LS.layout, state.layout);
}

function enableScaleAxisContextMenu(container) {
  const menu = document.getElementById('scaleCtx');
  if (!menu) return;
  // Mark active item
  const refresh = () => {
    menu.querySelectorAll('.ctx-item').forEach(it => {
      it.classList.toggle('is-active', it.dataset.mode === state.layout.priceScaleMode);
    });
  };
  container.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('.legend, .replay-panel, .modal, .sym-pop, .trade-pop')) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    // Right-axis area = within 60px of right edge
    if (x < r.width - 60) return;
    ev.preventDefault();
    ev.stopPropagation();
    // Hide chart context menu if open
    const cm = document.getElementById('ctxMenu'); if (cm) cm.style.display = 'none';
    const xp = Math.min(x - 140, r.width - 160);
    const yp = Math.min(ev.clientY - r.top, r.height - 140);
    menu.style.left = Math.max(4, xp) + 'px';
    menu.style.top  = Math.max(4, yp) + 'px';
    menu.style.display = 'block';
    refresh();
  }, true);
  window.addEventListener('mousedown', (ev) => {
    if (!ev.target.closest('#scaleCtx')) menu.style.display = 'none';
  });
  if (!menu.dataset.wired) {
    menu.dataset.wired = '1';
    menu.addEventListener('click', (ev) => {
      const mode = ev.target.dataset?.mode;
      if (!mode) return;
      _setPriceScaleMode(mode);
      menu.style.display = 'none';
    });
  }
}

function enableResetScaleButton() {
  const btn = document.getElementById('resetScaleBtn');
  if (!btn || btn.dataset.wired === '1') {
    return;
  }
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    if (!_chart) return;
    try { _chart.priceScale('right').applyOptions({ autoScale: true }); } catch {}
    try { _chart.timeScale().resetTimeScale(); } catch {}
  });
}

function enableBottomNavButtons() {
  const goStart = document.getElementById('bbGoStart');
  const goEnd   = document.getElementById('bbGoEnd');
  if (goStart && goStart.dataset.wired !== '1') {
    goStart.dataset.wired = '1';
    goStart.addEventListener('click', () => {
      if (!_chart || !_ctx) return;
      try {
        const candles = _ctx.candles;
        if (candles && candles.length) {
          const startT = candles[0].time;
          const endT = candles[Math.min(candles.length - 1, 250)].time;
          _chart.timeScale().setVisibleRange({ from: startT, to: endT });
        } else {
          _chart.timeScale().scrollToPosition(-1000, false);
        }
      } catch {}
    });
  }
  if (goEnd && goEnd.dataset.wired !== '1') {
    goEnd.dataset.wired = '1';
    goEnd.addEventListener('click', () => {
      if (!_chart) return;
      try { _chart.timeScale().scrollToRealTime(); } catch {}
    });
  }
}

// addSignalMarker(time, side, label, color) — exposed for testing on window
function addSignalMarker(time, side, label, color) {
  const entry = { time, side: side === 'sell' ? 'sell' : 'buy', label: label || '', color: color || null };
  state.signalMarkers = state.signalMarkers || [];
  state.signalMarkers.push(entry);
  try { localStorage.setItem('tv.signalMarkers', JSON.stringify(state.signalMarkers)); } catch {}
  _redrawAllMarkers();
  return entry;
}

function clearSignalMarkers() {
  state.signalMarkers = [];
  try { localStorage.setItem('tv.signalMarkers', JSON.stringify(state.signalMarkers)); } catch {}
  _redrawAllMarkers();
}

function _redrawAllMarkers() {
  if (!_ctx || !_ctx.series || _ctx.seriesKind !== 'ohlc') return;
  const realCandles = _ctx.candles;
  const markers = [];
  for (let i = 60; i < realCandles.length; i += 63) {
    markers.push({ time: realCandles[i].time, position: 'belowBar', color: '#2962ff', shape: 'circle', text: 'E' });
  }
  for (let i = 30; i < realCandles.length; i += 90) {
    markers.push({ time: realCandles[i].time, position: 'belowBar', color: '#089981', shape: 'circle', text: 'D' });
  }
  for (const sm of (state.signalMarkers || [])) markers.push(_buildSignalMarker(sm));
  markers.sort((a, b) => a.time - b.time);
  try {
    if (_ctx_markersApi && typeof _ctx_markersApi.setMarkers === 'function') {
      _ctx_markersApi.setMarkers(markers);
    } else {
      _ctx_markersApi = createSeriesMarkers(_ctx.series, markers);
    }
  } catch {
    if (typeof _ctx.series.setMarkers === 'function') _ctx.series.setMarkers(markers);
  }
}

// Toggle pane minimize/restore. paneIdx = pane index (0 = main).
function togglePane(paneIdx) {
  if (!_chart) return;
  try {
    const panes = _chart.panes();
    const pane = panes[paneIdx];
    if (!pane || typeof pane.setHeight !== 'function') return;
    state.layout.paneHeights = state.layout.paneHeights || {};
    const cur = state.layout.paneHeights[paneIdx];
    if (cur != null && cur > 0) {
      // Currently minimized — restore (auto)
      delete state.layout.paneHeights[paneIdx];
      try { pane.setHeight(0); } catch {}
      // Force re-layout: applyOptions on chart triggers full recompute
      _chart.applyOptions({});
    } else {
      // Minimize to 30px
      try { pane.setHeight(30); state.layout.paneHeights[paneIdx] = 30; } catch {}
    }
    lsSet(LS.layout, state.layout);
  } catch {}
}

// ============================================================
// TIER 3 wiring — Live stream, Volume Profile, Heatmap, Layout, Sim feed
// ============================================================
let _liveHandle = null;
let _simHandle = null;
let _vpHandle = null;
let _hmModal = null;
let _layoutModal = null;
let _multiHandle = null;

function _setBtnActive(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.background = on ? '#2962ff' : '#1e222d';
  el.style.borderColor = on ? '#2962ff' : '#2a2e39';
  el.style.color = on ? '#fff' : '#b2b5be';
}

let _liveTickCount = 0;
let _liveTickTimer = null;
let _liveLastPrice = null;

function toggleLiveStream() {
  if (_liveHandle) {
    try { _liveHandle.close(); } catch {}
    _liveHandle = null;
    _setBtnActive('liveToggleBtn', false);
    const dot = document.getElementById('liveDot'); if (dot) { dot.style.background = '#787b86'; dot.style.boxShadow=''; dot.style.animation=''; }
    if (_liveTickTimer) { clearInterval(_liveTickTimer); _liveTickTimer = null; }
    const label = document.getElementById('liveLabel'); if (label) label.textContent = 'LIVE';
    return;
  }
  if (!_ctx || !_ctx.series) return;
  const symbol = state.symbol || 'NVDA';
  const tf = state.tf || '1D';
  _liveTickCount = 0;
  let _firstTick = true;
  let _lastFlashColor = null;
  const handle = openLiveStream(symbol, tf, (bar) => {
    try {
      _ctx.series.update({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
      if (_ctx.vol && bar.volume != null) {
        _ctx.vol.update({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? '#08998166' : '#f2364566' });
      }
      setPills(bar.close);
      // Price-flash effect on the OHLC header (TradingView-style)
      try {
        if (_liveLastPrice != null) {
          const dir = bar.close > _liveLastPrice ? 'up' : bar.close < _liveLastPrice ? 'dn' : null;
          if (dir) flashPrice(dir);
        }
      } catch {}
      _liveTickCount++;
      _liveLastPrice = bar.close;
      // Auto-scroll to real-time on first tick so user sees the live candle
      if (_firstTick) {
        try { _ctx.chart.timeScale().scrollToRealTime(); } catch {}
        _firstTick = false;
      }
    } catch {}
  }, { mode: 'trade' });
  _liveHandle = handle;
  _setBtnActive('liveToggleBtn', true);
  const dot = document.getElementById('liveDot');
  if (dot) {
    dot.style.background = '#089981';
    dot.style.boxShadow = '0 0 8px #089981';
    dot.style.animation = 'liveDotPulse 1s ease-in-out infinite';
    // inject keyframes once
    if (!document.getElementById('liveDotKf')) {
      const st = document.createElement('style');
      st.id = 'liveDotKf';
      st.textContent = '@keyframes liveDotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.85)}}';
      document.head.appendChild(st);
    }
  }
  // Tick-rate counter every second
  _liveTickTimer = setInterval(() => {
    const label = document.getElementById('liveLabel');
    if (!label) return;
    const provider = handle.provider || '';
    const tag = provider.includes('binance-trade') ? 'WS·TRADE'
              : provider.includes('binance-kline') ? 'WS·KLINE'
              : provider.includes('coinbase')      ? 'COINBASE'
              : 'POLL';
    label.textContent = `LIVE · ${tag} · ${_liveTickCount}/s`;
    _liveTickCount = 0;
  }, 1000);
}

function toggleVolumeProfile() {
  if (_vpHandle) {
    try { _vpHandle.destroy && _vpHandle.destroy(); } catch {}
    _vpHandle = null;
    _setBtnActive('volProfileBtn', false);
    return;
  }
  if (!_ctx || !_ctx.chart || !_ctx.series) return;
  try {
    _vpHandle = createVolumeProfile(_ctx.chart, _ctx.series, _ctx.container, {
      candles: _ctx.candles, bins: 60, opacity: 0.55,
    });
    _setBtnActive('volProfileBtn', true);
  } catch (e) { console.error('[vp]', e); }
}

function toggleSimFeed() {
  if (_simHandle) {
    try { _simHandle.stop && _simHandle.stop(); } catch {}
    try { _simHandle.close && _simHandle.close(); } catch {}
    _simHandle = null;
    _setBtnActive('simFeedBtn', false);
    return;
  }
  if (!_ctx) return;
  try {
    _simHandle = createLiveFeed({
      series: _ctx.series, volumeSeries: _ctx.vol,
      timeframe: state.tf || '1D',
      lastCandle: _ctx.lastCandle,
      onTick: (p) => setPills(p),
    });
    if (_simHandle && _simHandle.start) _simHandle.start();
    _setBtnActive('simFeedBtn', true);
  } catch (e) { console.error('[sim]', e); }
}

function openHeatmapModal() {
  if (_hmModal) { _hmModal.remove(); _hmModal = null; _setBtnActive('heatmapBtn', false); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#131722;border:1px solid #2a2e39;border-radius:10px;padding:18px;max-width:1100px;width:92%;max-height:88vh;overflow:auto;color:#d1d4dc">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0;font-size:14px">Heatmap — Rentabilidad mensual & Correlación</h3>
        <button id="hmClose" style="background:#1e222d;color:#fff;border:1px solid #2a2e39;border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>
      <div style="margin-bottom:18px">
        <div style="font-size:11px;color:#787b86;margin-bottom:6px;text-transform:uppercase">Rentabilidad mensual (${state.symbol||'NVDA'})</div>
        <div id="hmMonthly"></div>
      </div>
      <div>
        <div style="font-size:11px;color:#787b86;margin-bottom:6px;text-transform:uppercase">Correlación con índices (sintética)</div>
        <div id="hmCorr"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _hmModal = overlay;
  _setBtnActive('heatmapBtn', true);
  overlay.querySelector('#hmClose').addEventListener('click', openHeatmapModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) openHeatmapModal(); });

  try {
    const monthly = computeMonthlyReturns(_ctx.candles || []);
    renderMonthlyReturnsHeatmap(overlay.querySelector('#hmMonthly'), { data: monthly });
  } catch (e) { overlay.querySelector('#hmMonthly').textContent = 'Sin datos suficientes.'; }

  // Synthetic correlation matrix from candles + variants
  try {
    const c = _ctx.candles || [];
    const variants = [
      { name: state.symbol||'NVDA', candles: c },
      { name: 'IBEX 35', candles: c.map(x => ({...x, close: x.close*0.98 + Math.sin(x.time/86400)*2})) },
      { name: 'S&P 500', candles: c.map(x => ({...x, close: x.close*1.01 + Math.cos(x.time/86400)*1.5})) },
      { name: 'NASDAQ', candles: c.map(x => ({...x, close: x.close*1.02 + Math.sin(x.time/172800)*3})) },
      { name: 'DAX',    candles: c.map(x => ({...x, close: x.close*0.99 + Math.cos(x.time/172800)*2})) },
      { name: 'BTC',    candles: c.map((x,i) => ({...x, close: x.close + Math.sin(i/12)*8})) },
    ];
    const m = computeCorrelationMatrix(variants);
    renderGridHeatmap(overlay.querySelector('#hmCorr'), {
      matrix: m.matrix, rowLabels: m.labels, colLabels: m.labels,
      format: 'corr', scheme: 'red-white-green', min: -1, max: 1,
    });
  } catch (e) { console.warn('[hm corr]', e); }
}

function openLayoutModal() {
  if (_layoutModal) { _layoutModal.remove(); _layoutModal = null; _setBtnActive('layoutBtn', false); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#131722;border:1px solid #2a2e39;border-radius:10px;padding:18px;max-width:1300px;width:96%;height:86vh;display:flex;flex-direction:column;color:#d1d4dc">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="display:flex;gap:6px;align-items:center">
          <h3 style="margin:0;font-size:13px">Multi-chart</h3>
          <button data-layout="1x2" style="margin-left:14px;background:#1e222d;color:#b2b5be;border:1px solid #2a2e39;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">1×2</button>
          <button data-layout="2x1" style="background:#1e222d;color:#b2b5be;border:1px solid #2a2e39;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">2×1</button>
          <button data-layout="2x2" style="background:#2962ff;color:#fff;border:1px solid #2962ff;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">2×2</button>
          <button data-layout="3x1" style="background:#1e222d;color:#b2b5be;border:1px solid #2a2e39;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">3×1</button>
        </div>
        <button id="layClose" style="background:#1e222d;color:#fff;border:1px solid #2a2e39;border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>
      <div id="layMount" style="flex:1;min-height:0"></div>
    </div>`;
  document.body.appendChild(overlay);
  _layoutModal = overlay;
  _setBtnActive('layoutBtn', true);
  const close = () => openLayoutModal();
  overlay.querySelector('#layClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const renderLayout = (rows, cols, symbols) => {
    try { if (_multiHandle && _multiHandle.destroy) _multiHandle.destroy(); } catch {}
    const mount = overlay.querySelector('#layMount');
    mount.innerHTML = '';
    const charts = symbols.map((sym, i) => ({
      symbol: sym, timeframe: state.tf || '1D', candles: _ctx.candles || [],
    }));
    try {
      _multiHandle = createMultiChartLayout(mount, { rows, cols, charts, syncCrosshair: true });
    } catch (e) {
      console.error('[layout]', e);
      mount.textContent = 'Error montando layout: ' + e.message;
    }
  };

  const symbolsPool = [state.symbol||'NVDA', 'AAPL', 'MSFT', 'TSLA', 'BTCUSDT', 'ETHUSDT'];
  renderLayout(2, 2, symbolsPool.slice(0, 4));

  overlay.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => {
    const [r, c] = b.dataset.layout.split('x').map(Number);
    overlay.querySelectorAll('[data-layout]').forEach(x => { x.style.background = '#1e222d'; x.style.borderColor='#2a2e39'; x.style.color='#b2b5be'; });
    b.style.background = '#2962ff'; b.style.borderColor = '#2962ff'; b.style.color = '#fff';
    renderLayout(r, c, symbolsPool.slice(0, r*c));
  }));
}

function wireTier3Toolbar() {
  document.getElementById('liveToggleBtn')?.addEventListener('click', toggleLiveStream);
  document.getElementById('volProfileBtn')?.addEventListener('click', toggleVolumeProfile);
  document.getElementById('simFeedBtn')?.addEventListener('click', toggleSimFeed);
  document.getElementById('heatmapBtn')?.addEventListener('click', openHeatmapModal);
  document.getElementById('layoutBtn')?.addEventListener('click', openLayoutModal);
}

// Expose a few helpers for testing / console use
try {
  if (typeof window !== 'undefined') {
    window.__tvChart = {
      addSignalMarker, clearSignalMarkers,
      setPriceScaleMode: _setPriceScaleMode,
      togglePane,
      getChart: () => _chart,
      getCtx:   () => _ctx,
      toggleLive: toggleLiveStream,
      toggleVolumeProfile,
      toggleSimFeed,
      openHeatmap: openHeatmapModal,
      openLayout: openLayoutModal,
      // Extras façade (tooltips, shading, alt chart types, advanced drawings, SMC, screenshot, etc.)
      get extras() { return _ctx && _ctx.extras; },
      // Convenience shortcuts
      screenshot: (opts) => _ctx && _ctx.extras && _ctx.extras.takeScreenshot(opts),
      setChartType: (type, opts) => _ctx && _ctx.extras && _ctx.extras.setChartType(type, _ctx.candles, opts),
      smc: () => _ctx && _ctx.extras && _ctx.extras.smc,
    };
  }
} catch {}

function setPills(price) {
  if (price == null) return;
  const spread = 0.04 + Math.random() * 0.02;
  const sellP = document.getElementById('sellPrice');
  const buyP  = document.getElementById('buyPrice');
  const spreadEl = document.getElementById('spread');
  if (!sellP || !buyP || !spreadEl) return;
  sellP.textContent = fmt(price - spread / 2);
  buyP.textContent  = fmt(price + spread / 2);
  spreadEl.textContent = fmt(spread);
}

/* =========================================================================
   DRAG-AND-DROP + UX HELPERS
   ========================================================================= */

function enableDnD(container) {
  enableShiftZoom(container);
  enablePaneResize(container);
  enableContextMenu(container);
  enableDoubleClickFullscreen(container);
  enableLegendDrag();
  enableIndicatorReorder();
  enableIndicatorToggle();
}

function enableShiftZoom(container) {
  const rectEl = document.getElementById('zoomRect');
  const zoomTip = document.getElementById('zoomTip');
  let active = false;
  let sx = 0, sy = 0;

  container.addEventListener('mousedown', (ev) => {
    if (!ev.shiftKey || ev.button !== 0) return;
    if (ev.target.closest('.legend, .replay-panel, .pane-resize, .modal, .sym-pop, .trade-pop, .ctx-menu')) return;
    active = true;
    const r = container.getBoundingClientRect();
    sx = ev.clientX - r.left;
    sy = ev.clientY - r.top;
    rectEl.style.display = 'block';
    rectEl.style.left = sx + 'px';
    rectEl.style.top  = sy + 'px';
    rectEl.style.width = '0px';
    rectEl.style.height = '0px';
    ev.preventDefault();
  });
  window.addEventListener('mousemove', (ev) => {
    if (!active) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const left = Math.min(x, sx);
    const top  = Math.min(y, sy);
    rectEl.style.left = left + 'px';
    rectEl.style.top  = top + 'px';
    rectEl.style.width  = Math.abs(x - sx) + 'px';
    rectEl.style.height = Math.abs(y - sy) + 'px';
    // Live summary tooltip during drag
    if (zoomTip && _chart && _series) {
      try {
        const ts = _chart.timeScale();
        const t1 = ts.coordinateToTime(Math.min(x, sx));
        const t2 = ts.coordinateToTime(Math.max(x, sx));
        const p1 = _series.coordinateToPrice(Math.min(y, sy));
        const p2 = _series.coordinateToPrice(Math.max(y, sy));
        let bars = '—', days = '—', pRange = '—', vol = '—';
        if (t1 != null && t2 != null) {
          const tFrom = Math.min(t1, t2), tTo = Math.max(t1, t2);
          const secs = tTo - tFrom;
          days = secs >= 86400 ? `${Math.round(secs/86400)} días` : `${Math.round(secs/3600)} h`;
          // Bars via barsInLogicalRange
          try {
            const lFrom = ts.coordinateToLogical(Math.min(x, sx));
            const lTo   = ts.coordinateToLogical(Math.max(x, sx));
            if (lFrom != null && lTo != null) {
              const info = _series.barsInLogicalRange({ from: lFrom, to: lTo });
              if (info && info.barsBefore != null) bars = String(info.barsAfter + info.barsBefore >= 0 ? Math.max(0, info.barsAfter + 0) : 0);
              if (info && info.barsBefore != null) {
                // Use absolute count of bars within range
                bars = String(Math.max(0, Math.round((lTo - lFrom))));
              }
            }
          } catch {}
          // Volume sum over real candles in range
          let vsum = 0;
          for (const c of (_ctx?.candles || [])) {
            if (c.time >= tFrom && c.time <= tTo) vsum += (c.volume || 0);
          }
          vol = fmtVol(vsum);
        }
        if (p1 != null && p2 != null) {
          const lo = Math.min(p1, p2), hi = Math.max(p1, p2);
          const delta = hi - lo;
          const pct = lo ? (delta / lo) * 100 : 0;
          pRange = `${fmt(delta)} (${fmt(pct)}%)`;
        }
        zoomTip.innerHTML = `
          <div class="zt-row"><span>Barras</span><b>${bars}</b></div>
          <div class="zt-row"><span>Tiempo</span><b>${days}</b></div>
          <div class="zt-row"><span>Δ Precio</span><b>${pRange}</b></div>
          <div class="zt-row"><span>Vol Σ</span><b>${vol}</b></div>`;
        zoomTip.style.display = 'block';
        let zx = x + 14, zy = y + 14;
        if (zx + 160 > r.width) zx = x - 160;
        if (zy + 90 > r.height) zy = y - 90;
        zoomTip.style.left = zx + 'px';
        zoomTip.style.top  = zy + 'px';
      } catch {}
    }
  });
  window.addEventListener('mouseup', (ev) => {
    if (!active) return;
    active = false;
    rectEl.style.display = 'none';
    if (zoomTip) zoomTip.style.display = 'none';
    if (!_chart) return;
    const r = container.getBoundingClientRect();
    const ex = ev.clientX - r.left;
    const ey = ev.clientY - r.top;
    if (Math.abs(ex - sx) < 6 || Math.abs(ey - sy) < 6) return;
    const x1 = Math.min(sx, ex), x2 = Math.max(sx, ex);
    const ts = _chart.timeScale();
    const t1 = ts.coordinateToTime(x1);
    const t2 = ts.coordinateToTime(x2);
    if (t1 != null && t2 != null) {
      _chart.timeScale().setVisibleRange({ from: t1, to: t2 });
    }
    if (_series) {
      const y1 = Math.min(sy, ey), y2 = Math.max(sy, ey);
      const p1 = _series.coordinateToPrice(y1);
      const p2 = _series.coordinateToPrice(y2);
      if (p1 != null && p2 != null) {
        _series.priceScale().applyOptions({ autoScale: false });
        try {
          _series.priceScale().setVisibleRange?.({ from: Math.min(p1,p2), to: Math.max(p1,p2) });
        } catch (e) { /* not all versions support setVisibleRange on priceScale */ }
      }
    }
  });
}

function enablePaneResize(container) {
  const handle = document.getElementById('paneResize');
  if (!handle || !_ctx) return;
  // Position handle based on current candle/volume split
  const repos = () => {
    if (!_ctx) return;
    const top = _ctx.paneSplit.top;
    const candleBottom = _ctx.paneSplit.candleBottom;
    // Candle area occupies (top) → (1 - candleBottom) of container height
    const h = container.clientHeight;
    const yFrac = 1 - candleBottom;
    handle.style.top = (yFrac * h - 3) + 'px';
  };
  repos();
  new ResizeObserver(repos).observe(container);

  let dragging = false;
  handle.addEventListener('mousedown', (ev) => {
    dragging = true;
    document.body.style.cursor = 'ns-resize';
    ev.preventDefault();
  });
  window.addEventListener('mousemove', (ev) => {
    if (!dragging || !_ctx) return;
    const r = container.getBoundingClientRect();
    const y = ev.clientY - r.top;
    const h = container.clientHeight;
    let frac = y / h;
    frac = Math.max(0.4, Math.min(0.92, frac));
    const candleBottom = 1 - frac;
    _ctx.paneSplit.candleBottom = candleBottom;
    _ctx.series.priceScale().applyOptions({
      scaleMargins: { top: _ctx.paneSplit.top, bottom: candleBottom }
    });
    _ctx.vol.priceScale().applyOptions({
      scaleMargins: { top: 1 - candleBottom + 0.02, bottom: 0 }
    });
    handle.style.top = (y - 3) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; document.body.style.cursor = ''; }
  });
}

function enableContextMenu(container) {
  const menu = document.getElementById('ctxMenu');
  container.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('.legend, .replay-panel, .modal, .sym-pop, .trade-pop')) return;
    ev.preventDefault();
    const r = container.getBoundingClientRect();
    const x = Math.min(ev.clientX - r.left, r.width - 200);
    const y = Math.min(ev.clientY - r.top, r.height - 160);
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    menu.style.display = 'block';
  });
  window.addEventListener('mousedown', (ev) => {
    if (!ev.target.closest('#ctxMenu')) menu.style.display = 'none';
  });
  menu.addEventListener('click', (ev) => {
    const act = ev.target.dataset?.act;
    menu.style.display = 'none';
    if (act === 'settings') openSettingsModal();
    if (act === 'fullscreen') toggleFullscreen();
    if (act === 'screenshot') takeScreenshot();
    if (act === 'backtest') openBacktestStrategyPicker();
    if (act === 'reset' && _chart) _chart.timeScale().resetTimeScale();
    if (act === 'autoscale' && _series) _series.priceScale().applyOptions({ autoScale: true });
  });
}

function enableDoubleClickFullscreen(container) {
  container.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('.legend, .replay-panel, .modal, .sym-pop, .trade-pop, .ctx-menu, .pane-resize')) return;
    toggleFullscreen();
  });
}

function enableLegendDrag() {
  const legend = document.getElementById('legend');
  const handle = legend.querySelector('.legend-drag');
  if (!handle) return;
  let dragging = false, ox = 0, oy = 0;
  handle.addEventListener('mousedown', (ev) => {
    dragging = true;
    const rect = legend.getBoundingClientRect();
    ox = ev.clientX - rect.left;
    oy = ev.clientY - rect.top;
    legend.style.transition = 'none';
    ev.preventDefault();
  });
  window.addEventListener('mousemove', (ev) => {
    if (!dragging) return;
    const parent = legend.parentElement.getBoundingClientRect();
    let x = ev.clientX - parent.left - ox;
    let y = ev.clientY - parent.top - oy;
    x = Math.max(0, Math.min(parent.width - 200, x));
    y = Math.max(0, Math.min(parent.height - 100, y));
    legend.style.left = x + 'px';
    legend.style.top  = y + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; });
}

function enableIndicatorReorder() {
  const list = document.getElementById('indList');
  if (!list) return;
  let dragEl = null;
  list.querySelectorAll('.ind-row').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragEl = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      dragEl?.classList.remove('dragging');
      dragEl = null;
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragEl || dragEl === row) return;
      const rect = row.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      list.insertBefore(dragEl, after ? row.nextSibling : row);
    });
  });
}

function enableIndicatorToggle() {
  document.querySelectorAll('.ind-row .ind-swatch').forEach(sw => {
    if (sw.dataset.wired === '1') return;
    sw.dataset.wired = '1';
    sw.style.background = sw.dataset.color;
    sw.addEventListener('click', () => {
      const row = sw.closest('.ind-row');
      const ind = row.dataset.ind;
      if (!_ctx) return;
      if (ind === 'vol') {
        _ctx.visible.vol = !_ctx.visible.vol;
        _ctx.vol.applyOptions({ visible: _ctx.visible.vol });
        row.classList.toggle('ind-hidden', !_ctx.visible.vol);
        return;
      }
      // Dynamic indicator (uid stored on row.dataset.uid)
      const uid = row.dataset.uid;
      const dynInd = _ctx.indicators.find(x => x.uid === uid);
      if (dynInd) {
        dynInd.visible = !dynInd.visible;
        for (const s of dynInd.seriesList) s.applyOptions({ visible: dynInd.visible });
        row.classList.toggle('ind-hidden', !dynInd.visible);
      }
      // Comparison series
      const cmp = _ctx.compares.find(c => c.uid === uid);
      if (cmp) {
        cmp.visible = !cmp.visible;
        cmp.series.applyOptions({ visible: cmp.visible });
        row.classList.toggle('ind-hidden', !cmp.visible);
      }
    });
  });

  // Wire X (remove) buttons
  document.querySelectorAll('.ind-row .ind-x').forEach(x => {
    if (x.dataset.wired === '1') return;
    x.dataset.wired = '1';
    x.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const row = x.closest('.ind-row');
      const uid = row.dataset.uid;
      if (!uid) return;
      removeIndicatorByUid(uid);
      removeCompareByUid(uid);
    });
  });
}

/* =========================================================================
   MODAL + MENU HELPERS
   ========================================================================= */

function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').style.display = 'block';
  document.getElementById('modalBack').style.display = 'block';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modalBack').style.display = 'none';
}

/* ---- LEFT TOOLBAR DROPDOWN ---- */
function openToolMenu(toolId, anchorEl) {
  const menu = LEFT_TOOL_MENUS[toolId];
  if (!menu) return;
  const panel = document.getElementById('toolMenu');
  const inner = document.getElementById('toolMenuInner');
  if (!panel || !inner) return;

  // Build HTML
  let html = '';
  for (let si = 0; si < menu.sections.length; si++) {
    const section = menu.sections[si];
    if (section.divider) html += `<div class="tm-divider"></div>`;
    // Section-level toggle row (no items, just a single switch + label)
    if (section.isToggle) {
      if (si > 0) html += `<div class="tm-divider"></div>`;
      const on = _getToolToggleWithDefault(section.id, !!section.defaultOn);
      html += `<div class="tm-item tm-toggle-row" data-tool-item="${section.id}" data-toggle="1">
        <span class="tm-label">${section.label}</span>
        <span class="tm-toggle${on ? ' on' : ''}" data-toggle-for="${section.id}"></span>
      </div>`;
      continue;
    }
    if (section.title) html += `<div class="tm-section-title">${section.title}</div>`;
    // Auto-add divider between item-only sections (no title)
    if (!section.title && si > 0 && !menu.sections[si - 1].isToggle && !menu.sections[si - 1].divider) {
      html += `<div class="tm-divider"></div>`;
    }
    for (const it of section.items) {
      if (it.toggle) {
        const on = !!_getToolToggle(it.id);
        html += `<div class="tm-item" data-tool-item="${it.id}" data-toggle="1">
          <span class="tm-label">${it.label}</span>
          <span class="tm-toggle${on ? ' on' : ''}" data-toggle-for="${it.id}"></span>
        </div>`;
      } else {
        const isActive = _isToolItemActive(toolId, it.id);
        html += `<div class="tm-item${isActive ? ' active' : ''}" data-tool-item="${it.id}">
          ${it.svg ? `<span class="tm-icon">${it.svg}</span>` : ''}
          <span class="tm-label">${it.label}</span>
          ${it.hotkey ? `<span class="tm-hotkey">${it.hotkey}</span>` : ''}
          ${(toolId === 'magnet') ? '' : `<span class="tm-star${it.fav ? ' on' : ''}" title="${it.fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">★</span>`}
        </div>`;
      }
    }
  }
  inner.innerHTML = html;
  panel.style.width = (menu.width || 280) + 'px';

  // Position: to the right of the anchor button, top-aligned with it
  const r = anchorEl.getBoundingClientRect();
  // Container is .center which is positioned within the grid
  const center = document.getElementById('center');
  const cr = center.getBoundingClientRect();
  // panel is appended inside center so coords are relative
  panel.style.top  = Math.max(4, r.top - cr.top) + 'px';
  panel.style.left = '4px';  // sits just inside the chart area, against left edge
  panel.style.display = 'block';

  // Wire item clicks (placeholder action — log + close)
  inner.querySelectorAll('.tm-item').forEach(el => {
    el.addEventListener('click', (ev) => {
      const id = el.dataset.toolItem;
      if (el.dataset.toggle === '1') {
        // Find section to know its default
        const sec = (LEFT_TOOL_MENUS[toolId]?.sections || []).find(s => s.isToggle && s.id === id);
        const cur = _getToolToggleWithDefault(id, !!(sec && sec.defaultOn));
        _setToolToggle(id, !cur);
        const tog = el.querySelector('.tm-toggle');
        if (tog) tog.classList.toggle('on', !cur);
        ev.stopPropagation();
        return;
      }
      if (toolId === 'magnet') {
        _setMagnetMode(id === 'magnet-strong' ? 'strong' : 'weak');
        closeToolMenu();
        ev.stopPropagation();
        return;
      }
      if (id === 'trend-line') {
        closeToolMenu();
        // Prefer the native lightweight-charts primitive trend line (imported from plugin examples).
        if (_ctx && _ctx.nativeTrend) {
          try { _ctx.nativeTrend.activate(); } catch (e) { console.warn('[trend-line] native failed, falling back', e); activateTrendlineMode(); }
        } else {
          activateTrendlineMode();
        }
        ev.stopPropagation();
        return;
      }
      // Drawing-tools.js handlers (hline, fib, rect)
      if (_dm && id === 'h-line') {
        closeToolMenu();
        _dm.activate('hline');
        ev.stopPropagation();
        return;
      }
      if (_dm && id === 'fib-ret') {
        closeToolMenu();
        _dm.activate('fib');
        ev.stopPropagation();
        return;
      }
      if (id === 'rect') {
        closeToolMenu();
        // Prefer native lightweight-charts primitive rectangle.
        if (_ctx && _ctx.nativeRect) {
          try { _ctx.nativeRect.activate(); } catch (e) { console.warn('[rect] native failed, falling back', e); if (_dm) _dm.activate('rect'); }
        } else if (_dm) { _dm.activate('rect'); }
        ev.stopPropagation();
        return;
      }
      // === New advanced drawings (position-range, pitchfork-gann, elliott-text) ===
      const ADV_MAP = {
        // Position / range tools (5th icon "predict")
        'long-pos':   { reg: 'position',  key: 'long' },
        'short-pos':  { reg: 'position',  key: 'short' },
        'range-p':    { reg: 'position',  key: 'priceRange' },
        'range-d':    { reg: 'position',  key: 'dateRange' },
        'range-pd':   { reg: 'position',  key: 'priceRange' }, // fallback
        // Pitchfork variants (2nd icon "trend" → Tridentes)
        'pitch':      { reg: 'pitchfork', key: 'andrews_pitchfork', variant: 'standard' },
        'schiff':     { reg: 'pitchfork', key: 'andrews_pitchfork', variant: 'schiff' },
        'schiff-mod': { reg: 'pitchfork', key: 'andrews_pitchfork', variant: 'modified-schiff' },
        // Gann (3rd icon "fib" → Gann section)
        'gann-grid':  { reg: 'pitchfork', key: 'gann_box' },
        'gann-sq-fix':{ reg: 'pitchfork', key: 'gann_square', variant: 'sq144' },
        'gann-sq':    { reg: 'pitchfork', key: 'gann_square' },
        'gann-fan':   { reg: 'pitchfork', key: 'gann_fan' },
        // Elliott (4th icon "patterns" → Ondas de Elliott)
        'ell-imp':    { reg: 'elliott',   key: 'elliott_impulse' },
        'ell-corr':   { reg: 'elliott',   key: 'elliott_correction' },
        // Text (6th icon "text")
        'text':       { reg: 'elliott',   key: 'text' },
        'note':       { reg: 'elliott',   key: 'callout' },
        'price-note': { reg: 'elliott',   key: 'callout' },
        'comment':    { reg: 'elliott',   key: 'callout' },
        // Icons (7th icon "icons" → Pinceles + Flechas)
        'pencil':     { reg: 'elliott',   key: 'polyline' },
        'highliter':  { reg: 'elliott',   key: 'polyline' },
        'arrow':      { reg: 'elliott',   key: 'arrow' },
        'arrow-mark': { reg: 'elliott',   key: 'arrow' },
        'polyline':   { reg: 'elliott',   key: 'polyline' },
      };
      if (ADV_MAP[id] && _ctx && _ctx.extras && _ctx.svgOverlay) {
        const m = ADV_MAP[id];
        closeToolMenu();
        try {
          const reg = _ctx.extras.drawings.registries[m.reg];
          let tool = null;
          const opts = m.variant ? { variant: m.variant } : undefined;
          if (m.reg === 'position') {
            const entry = reg && reg[m.key];
            const factory = entry && entry.factory;
            if (factory) tool = factory(_ctx.svgOverlay, _chart, _ctx.series, opts);
          } else if (m.reg === 'pitchfork') {
            // PITCHFORK_GANN_TOOLS has a create(id, svg, chart, series, opts) method
            if (typeof reg.create === 'function') {
              tool = reg.create(m.key, _ctx.svgOverlay, _chart, _ctx.series, opts);
            }
          } else if (m.reg === 'elliott') {
            const entry = reg && reg[m.key];
            const factory = entry && entry.create;
            if (factory) tool = factory(_ctx.svgOverlay, _chart, _ctx.series);
          }
          if (!tool) {
            console.warn('[adv-draw] factory not found for', m);
            return;
          }
          if (typeof tool.startDraw === 'function') tool.startDraw();
          else if (typeof tool.activate === 'function') tool.activate();
          else if (typeof tool.beginCreate === 'function') tool.beginCreate();
          // Track for cleanup
          _ctx._advDrawings = _ctx._advDrawings || [];
          _ctx._advDrawings.push(tool);
          console.log('[adv-draw] activated', id, '→', m);
        } catch (e) { console.error('[adv-draw]', id, e); }
        ev.stopPropagation();
        return;
      }
      console.log('[drawing-tool] selected:', toolId, '→', id);
      closeToolMenu();
      ev.stopPropagation();
    });
  });
  // Star toggle (favorite)
  inner.querySelectorAll('.tm-star').forEach(el => {
    el.addEventListener('click', (ev) => {
      el.classList.toggle('on');
      ev.stopPropagation();
    });
  });
}

function closeToolMenu() {
  const p = document.getElementById('toolMenu');
  if (p) p.style.display = 'none';
}

/* =========================================================================
   CHART SETTINGS MODAL — 7-tab modal extracted from Figma 2QhXqtb66hdeKvlZAZE4fS
   Frame: div.dialog-qyCw0PaN  610×663
   Tabs (Component 20 sidebar): Símbolo, Línea de estado, Escalas y líneas,
                                Lienzo, Comerciar, Alertas, Eventos
   ========================================================================= */

const SETTINGS_LS = 'tv.settings';
const DEFAULT_SETTINGS = {
  // Símbolo
  upColor:       '#089981',
  downColor:     '#f23645',
  borderUp:      '#089981',
  borderDown:    '#f23645',
  wickUp:        '#089981',
  wickDown:      '#f23645',
  body:          true,
  borders:       true,
  wick:          true,
  barColorPrev:  false,
  adjDividends:  false,
  precision:     'default',
  session:       'regular',
  timezone:      'Europe/Madrid',
  // Línea de estado
  ls_logo:       true,
  ls_title:      true,
  ls_ohlc:       true,
  ls_changeBar:  true,
  ls_volume:     true,
  ls_changeDay:  true,
  ls_indicators: true,
  ls_indTitles:  true,
  ls_indInputs:  false,
  ls_indValues:  true,
  ls_background: false,
  // Escalas y líneas
  sc_currency:        true,
  sc_scaleMode:       'normal',
  sc_lockRatio:       false,
  sc_axisPosition:    'right',
  sc_noOverlap:       true,
  sc_moreBtn:         true,
  sc_countdown:       false,
  sc_symbolLabel:     true,
  sc_prevClose:       true,
  sc_indDataLabels:   true,
  sc_prePostMarket:   false,
  sc_highLow:         false,
  sc_bidAsk:          false,
  // Time scale
  sc_dayOfWeek:       true,
  sc_dateFormat:      'dd MMM \'yy',
  sc_timeFormat:      '24-hour',
  sc_saveLeftEdge:    false,
  // Lienzo
  ca_bg:              '#131722',
  ca_grid:            '#1e2230',
  ca_crosshair:       '#4a4a4a',
  ca_watermark:       '#2a2e39',
  ca_scales:          '#1e2230',
  ca_text:            '#b2b5be',
  ca_lines:           '#363c4e',
  ca_buttons:         '#b2b5be',
  ca_navigation:      true,
  ca_panel:           true,
  ca_marginTop:       10,
  ca_marginBottom:    8,
  ca_marginRight:     6,
  ca_watermarkVisible: false,
  // Comerciar
  tr_buySellBtns:     true,
  tr_oneClick:        false,
  tr_execSound:       true,
  tr_onlyRejects:     false,
  tr_revBtn:          true,
  tr_marketProj:      true,
  tr_pnl:             true,
  tr_positions:       true,
  tr_brackets:        true,
  tr_execMarks:       true,
  tr_execLabels:      false,
  tr_extLines:        false,
  tr_order:           'price',
  tr_screenshots:     true,
  // Alertas
  al_lines:           true,
  al_onlyActive:      false,
  al_sound:           true,
  al_autoHide:        false,
  // Eventos
  ev_ideas:           true,
  ev_dividends:       true,
  ev_splits:          true,
  ev_earnings:        true,
  ev_earningsBreak:   false,
  ev_sessionBreak:    false,
  ev_news:            true,
};

function loadSettings() {
  const saved = lsGet(SETTINGS_LS, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}
function saveSettings(s) { lsSet(SETTINGS_LS, s); }

let _settingsDraft = null;     // working copy during dialog
let _settingsActiveTab = 'symbol';

const SETTINGS_TABS = [
  { id: 'symbol',   label: 'Símbolo',           icon: 'S' },
  { id: 'status',   label: 'Línea de estado',   icon: 'E' },
  { id: 'scales',   label: 'Escalas y líneas',  icon: 'X' },
  { id: 'canvas',   label: 'Lienzo',            icon: 'L' },
  { id: 'trade',    label: 'Comerciar',         icon: 'C' },
  { id: 'alerts',   label: 'Alertas',           icon: 'A' },
  { id: 'events',   label: 'Eventos',           icon: 'V' },
];

/* ----- Form-builder helpers (return HTML) ----- */
function _cs_chk(key, label, hint) {
  const v = _settingsDraft[key];
  return `<label class="cs-chk"><input type="checkbox" data-csk="${key}" ${v?'checked':''}/><span class="cs-chkbox"></span><span class="cs-chk-l">${label}</span>${hint?`<span class="cs-hint" title="${hint}">?</span>`:''}</label>`;
}
function _cs_row(label, control) {
  return `<div class="cs-row"><span class="cs-row-l">${label}</span><div class="cs-row-c">${control}</div></div>`;
}
function _cs_color(key) {
  const v = _settingsDraft[key];
  return `<span class="cs-swatch-wrap"><input type="color" class="cs-swatch" data-csk="${key}" value="${v}"/></span>`;
}
function _cs_select(key, opts) {
  const v = _settingsDraft[key];
  const o = opts.map(([val,lbl]) => `<option value="${val}" ${v===val?'selected':''}>${lbl}</option>`).join('');
  return `<select class="cs-select" data-csk="${key}">${o}</select>`;
}
function _cs_num(key, min, max, step) {
  const v = _settingsDraft[key];
  return `<input type="number" class="cs-num" data-csk="${key}" value="${v}" min="${min}" max="${max}" step="${step||1}"/>`;
}
function _cs_section(title) { return `<div class="cs-sec-title">${title}</div>`; }

/* ----- Tab content builders ----- */
function _settingsTabSymbol() {
  return `
    ${_cs_section('Velas')}
    ${_cs_chk('barColorPrev','Color de barras en función del cierre anterior')}
    <div class="cs-grid">
      <div class="cs-cell">${_cs_chk('body','Cuerpo')}</div>
      <div class="cs-cell cs-swatches">${_cs_color('upColor')}${_cs_color('downColor')}</div>
      <div class="cs-cell">${_cs_chk('borders','Bordes')}</div>
      <div class="cs-cell cs-swatches">${_cs_color('borderUp')}${_cs_color('borderDown')}</div>
      <div class="cs-cell">${_cs_chk('wick','Mecha')}</div>
      <div class="cs-cell cs-swatches">${_cs_color('wickUp')}${_cs_color('wickDown')}</div>
    </div>
    ${_cs_section('Modificación de datos')}
    ${_cs_row('Sesión', _cs_select('session', [['regular','Regular'],['extended','Extendida']]))}
    ${_cs_chk('adjDividends','Ajustar datos de los dividendos','Ajusta el histórico por dividendos')}
    ${_cs_row('Precisión', _cs_select('precision', [['default','Por defecto'],['1','1'],['0.1','0.1'],['0.01','0.01'],['0.001','0.001'],['0.0001','0.0001']]))}
    ${_cs_row('Zona horaria', _cs_select('timezone', [['Europe/Madrid','(UTC+1) Madrid'],['Europe/London','(UTC+0) Londres'],['America/New_York','(UTC-5) Nueva York'],['Asia/Tokyo','(UTC+9) Tokio'],['UTC','UTC']]))}
  `;
}
function _settingsTabStatus() {
  return `
    ${_cs_section('Instrumento')}
    ${_cs_chk('ls_logo','Logo')}
    ${_cs_chk('ls_title','Título')}
    ${_cs_section('Valores del gráfico')}
    ${_cs_chk('ls_ohlc','Valores OHLC en la barra')}
    ${_cs_chk('ls_changeBar','Valores de los cambios en la barra')}
    ${_cs_chk('ls_volume','Volumen')}
    ${_cs_chk('ls_changeDay','Valores del cambio del último día')}
    ${_cs_section('Indicadores')}
    ${_cs_chk('ls_indTitles','Títulos')}
    ${_cs_chk('ls_indInputs','Entradas de datos')}
    ${_cs_chk('ls_indValues','Valores')}
    ${_cs_chk('ls_background','Fondo')}
  `;
}
function _settingsTabScales() {
  return `
    ${_cs_section('Escala de precios')}
    ${_cs_chk('sc_currency','Mostrar divisa y unidad')}
    ${_cs_row('Modos de escala (A y L)', _cs_select('sc_scaleMode',[['normal','Normal'],['log','Logarítmica'],['percent','Porcentual'],['indexed','Indexada a 100']]))}
    ${_cs_chk('sc_lockRatio','Bloquear la relación precio/barra')}
    ${_cs_row('Colocación de escalas', _cs_select('sc_axisPosition',[['right','Derecha'],['left','Izquierda'],['both','Ambas'],['none','Ninguna']]))}
    ${_cs_section('Etiquetas y líneas de precios')}
    ${_cs_chk('sc_noOverlap','Sin etiquetas superpuestas')}
    ${_cs_chk('sc_moreBtn','Botón "más"')}
    ${_cs_chk('sc_countdown','Cuenta atrás del cierre de barra')}
    ${_cs_chk('sc_symbolLabel','Símbolo')}
    ${_cs_chk('sc_prevClose','Cierre del día anterior')}
    ${_cs_chk('sc_indDataLabels','Indicadores y datos financieros')}
    ${_cs_chk('sc_prePostMarket','Previo a apertura y posterior al cierre de mercado')}
    ${_cs_chk('sc_highLow','Máximo y mínimo')}
    ${_cs_chk('sc_bidAsk','Compra y venta (bid/ask)')}
    ${_cs_section('Escala de tiempo')}
    ${_cs_chk('sc_dayOfWeek','Día de la semana en las etiquetas')}
    ${_cs_row('Formato de fecha', _cs_select('sc_dateFormat',[["dd MMM 'yy","dd MMM 'yy"],['yyyy-MM-dd','yyyy-MM-dd'],['MM/dd/yyyy','MM/dd/yyyy'],['dd/MM/yyyy','dd/MM/yyyy']]))}
    ${_cs_row('Formato de las horas', _cs_select('sc_timeFormat',[['24-hour','24 horas'],['12-hour','12 horas (am/pm)']]))}
    ${_cs_chk('sc_saveLeftEdge','Guardar la posición del borde izquierdo del gráfico al cambiar el intervalo')}
  `;
}
function _settingsTabCanvas() {
  return `
    ${_cs_section('Estilos básicos del gráfico')}
    ${_cs_row('Fondo', _cs_color('ca_bg'))}
    ${_cs_row('Líneas cuadrícula', _cs_color('ca_grid'))}
    ${_cs_row('Retícula', _cs_color('ca_crosshair'))}
    ${_cs_row('Marca de agua', _cs_color('ca_watermark'))}
    ${_cs_row('Escalas', _cs_color('ca_scales'))}
    ${_cs_row('Texto', _cs_color('ca_text'))}
    ${_cs_row('Líneas', _cs_color('ca_lines'))}
    ${_cs_section('Botones')}
    ${_cs_chk('ca_navigation','Navegación')}
    ${_cs_chk('ca_panel','Panel')}
    ${_cs_section('Márgenes')}
    ${_cs_row('Parte superior', `${_cs_num('ca_marginTop',0,40,1)} <span class="cs-unit">%</span>`)}
    ${_cs_row('Parte inferior', `${_cs_num('ca_marginBottom',0,40,1)} <span class="cs-unit">%</span>`)}
    ${_cs_row('Derecha', `${_cs_num('ca_marginRight',0,60,1)} <span class="cs-unit">barras</span>`)}
    ${_cs_section('Marca de agua')}
    ${_cs_chk('ca_watermarkVisible','Mostrar marca de agua (símbolo + intervalo)')}
  `;
}
function _settingsTabTrade() {
  return `
    ${_cs_section('General')}
    ${_cs_chk('tr_buySellBtns','Botones de Compra/Venta','Muestra los botones de compra y venta directamente en el gráfico')}
    ${_cs_chk('tr_oneClick','Operaciones con un solo clic','Emita, modifique o cancele órdenes sin confirmación')}
    ${_cs_chk('tr_execSound','Sonido de ejecución')}
    ${_cs_chk('tr_onlyRejects','Mostrar solo notificaciones de rechazo')}
    ${_cs_section('Apariencia')}
    ${_cs_chk('tr_revBtn','Botón de reversión de posición','Añade el botón de revertir junto a la posición abierta en el gráfico')}
    ${_cs_chk('tr_marketProj','Proyección de órdenes de mercado','Muestra una orden proyectada en el gráfico antes de enviarla')}
    ${_cs_chk('tr_pnl','Valor de ganancias y pérdidas')}
    ${_cs_chk('tr_positions','Posiciones')}
    ${_cs_chk('tr_brackets','Corchetes')}
    ${_cs_chk('tr_execMarks','Marcas de ejecución')}
    ${_cs_chk('tr_execLabels','Etiquetas de ejecución')}
    ${_cs_chk('tr_extLines','Líneas de precios extendidas a lo largo de todo el ancho del gráfico')}
    ${_cs_row('Orden y alineación de posiciones', _cs_select('tr_order',[['price','Por precio'],['time','Por tiempo'],['type','Por tipo']]))}
    ${_cs_chk('tr_screenshots','Órdenes, ejecuciones y posiciones en capturas de gráficos','Muestra sus operaciones en el gráfico mediante imágenes')}
  `;
}
function _settingsTabAlerts() {
  return `
    ${_cs_section('Visibilidad de la línea del gráfico')}
    ${_cs_chk('al_lines','Líneas de alerta')}
    ${_cs_chk('al_onlyActive','Solo alertas activas')}
    ${_cs_section('Notificaciones')}
    ${_cs_chk('al_sound','Volumen de alertas')}
    ${_cs_chk('al_autoHide','Ocultar automáticamente los avisos')}
  `;
}
function _settingsTabEvents() {
  return `
    ${_cs_section('Eventos')}
    ${_cs_chk('ev_ideas','Ideas')}
    ${_cs_chk('ev_dividends','Dividendos')}
    ${_cs_chk('ev_splits','Splits')}
    ${_cs_chk('ev_earnings','Beneficios')}
    ${_cs_chk('ev_earningsBreak','Rupturas de beneficios')}
    ${_cs_chk('ev_sessionBreak','Ruptura de las sesiones')}
    ${_cs_section('Últimas noticias')}
    ${_cs_chk('ev_news','Notificación de noticias')}
  `;
}
const SETTINGS_TAB_BUILDERS = {
  symbol: _settingsTabSymbol,
  status: _settingsTabStatus,
  scales: _settingsTabScales,
  canvas: _settingsTabCanvas,
  trade:  _settingsTabTrade,
  alerts: _settingsTabAlerts,
  events: _settingsTabEvents,
};

function _renderSettingsBody() {
  const tabsHtml = SETTINGS_TABS.map(t => `
    <div class="cs-tab${_settingsActiveTab===t.id?' is-active':''}" data-cstab="${t.id}">
      <span class="cs-tab-icon">${t.icon}</span>
      <span class="cs-tab-label">${t.label}</span>
    </div>`).join('');
  const content = SETTINGS_TAB_BUILDERS[_settingsActiveTab]();
  return `
    <div class="cs-head">
      <div class="cs-title">Opciones de configuración del gráfico</div>
      <button class="cs-x" id="csX" title="Cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4 L14 14 M14 4 L4 14" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="cs-body">
      <aside class="cs-side">${tabsHtml}</aside>
      <section class="cs-content" id="csContent">${content}</section>
    </div>
    <div class="cs-foot">
      <button class="cs-btn cs-btn-ghost" id="csTpl">Plantilla</button>
      <div class="cs-foot-r">
        <button class="cs-btn cs-btn-ghost" id="csCancel">Cancelar</button>
        <button class="cs-btn cs-btn-primary" id="csOk">Aceptar</button>
      </div>
    </div>
  `;
}

function openSettingsModal() {
  document.getElementById('csModalBack')?.remove();
  document.getElementById('csModal')?.remove();

  _settingsDraft = loadSettings();
  // Default active tab — keep last opened
  if (!SETTINGS_TABS.find(t => t.id === _settingsActiveTab)) _settingsActiveTab = 'symbol';

  const back = document.createElement('div');
  back.id = 'csModalBack';
  back.className = 'cs-modal-back';

  const m = document.createElement('div');
  m.id = 'csModal';
  m.className = 'cs-modal';
  m.innerHTML = _renderSettingsBody();

  const center = document.getElementById('center') || document.body;
  center.appendChild(back);
  center.appendChild(m);

  const rerenderContent = () => {
    m.querySelector('#csContent').innerHTML = SETTINGS_TAB_BUILDERS[_settingsActiveTab]();
    m.querySelectorAll('.cs-tab').forEach(el => el.classList.toggle('is-active', el.dataset.cstab === _settingsActiveTab));
    wireForm();
  };

  const wireForm = () => {
    m.querySelectorAll('[data-csk]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.csk;
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.type === 'number') v = +el.value;
        else v = el.value;
        _settingsDraft[k] = v;
        // Live apply (so the user sees changes immediately)
        applySettings(_settingsDraft, /*persist*/ false);
      });
    });
  };

  // sidebar clicks
  m.querySelector('.cs-side').addEventListener('click', (ev) => {
    const t = ev.target.closest('.cs-tab');
    if (!t) return;
    _settingsActiveTab = t.dataset.cstab;
    rerenderContent();
  });

  const closeFn = () => {
    // Restore persisted on cancel — but here we just remove. User chose to close.
    back.remove(); m.remove();
  };
  const acceptFn = () => {
    saveSettings(_settingsDraft);
    applySettings(_settingsDraft, /*persist*/ true);
    back.remove(); m.remove();
  };
  const cancelFn = () => {
    // Revert live changes back to saved
    applySettings(loadSettings(), /*persist*/ false);
    back.remove(); m.remove();
  };

  back.addEventListener('click', cancelFn);
  m.querySelector('#csX').addEventListener('click', cancelFn);
  m.querySelector('#csCancel').addEventListener('click', cancelFn);
  m.querySelector('#csOk').addEventListener('click', acceptFn);
  m.querySelector('#csTpl').addEventListener('click', () => {
    // Reset to defaults
    _settingsDraft = { ...DEFAULT_SETTINGS };
    rerenderContent();
    applySettings(_settingsDraft, false);
  });

  // ESC
  const onKey = (ev) => { if (ev.key === 'Escape') { cancelFn(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  wireForm();
}

/* Apply settings live to lightweight-charts */
function applySettings(s, persist) {
  if (persist) saveSettings(s);
  if (!_chart || !_ctx) return;
  try {
    // Layout / canvas
    _chart.applyOptions({
      layout: {
        background: { type: 'solid', color: s.ca_bg },
        textColor:  s.ca_text,
      },
      grid: {
        vertLines: { color: s.ca_grid },
        horzLines: { color: s.ca_grid },
      },
      crosshair: {
        vertLine: { color: s.ca_crosshair },
        horzLine: { color: s.ca_crosshair },
      },
      rightPriceScale: {
        borderColor: s.ca_scales,
        textColor:   s.ca_text,
        visible:     s.sc_axisPosition === 'right' || s.sc_axisPosition === 'both',
      },
      leftPriceScale: {
        visible:     s.sc_axisPosition === 'left' || s.sc_axisPosition === 'both',
      },
      timeScale: {
        borderColor: s.ca_scales,
      },
    });

    // Pane margins (top/bottom)
    if (_ctx.series && _ctx.series.priceScale) {
      _ctx.series.priceScale().applyOptions({
        scaleMargins: { top: (s.ca_marginTop||10)/100, bottom: _ctx.paneSplit.candleBottom },
      });
    }
    _chart.timeScale().applyOptions({ rightOffset: s.ca_marginRight ?? 6 });

    // Candle colors — only on candlestick / bar series
    if (_ctx.seriesKind === 'ohlc' && _ctx.series) {
      _ctx.series.applyOptions({
        upColor:         s.body ? s.upColor : 'rgba(0,0,0,0)',
        downColor:       s.body ? s.downColor : 'rgba(0,0,0,0)',
        borderVisible:   s.borders,
        borderUpColor:   s.borderUp,
        borderDownColor: s.borderDown,
        wickVisible:     s.wick,
        wickUpColor:     s.wickUp,
        wickDownColor:   s.wickDown,
      });
    }

    // Watermark visibility
    if (typeof s.ca_watermarkVisible === 'boolean') {
      state.layout.watermarkVisible = s.ca_watermarkVisible;
      lsSet(LS.layout, state.layout);
      _updateWatermarkText();
    }

    // Price scale mode (from "Escalas y líneas" tab)
    if (s.sc_scaleMode) {
      const map = { normal: 0, log: 1, percent: 2, percentage: 2, indexed: 3 };
      const m = map[s.sc_scaleMode] ?? 0;
      try { _chart.priceScale('right').applyOptions({ mode: m }); } catch {}
      state.layout.priceScaleMode = (s.sc_scaleMode === 'percentage' ? 'percent' : s.sc_scaleMode);
      lsSet(LS.layout, state.layout);
    }

    // Volume visibility/colors
    if (_ctx.vol) {
      _ctx.vol.applyOptions({ visible: s.ls_volume });
      _ctx.visible.vol = s.ls_volume;
    }

    // Legend visibility — toggle CSS classes on .legend
    const legend = document.querySelector('.legend');
    if (legend) {
      legend.classList.toggle('hide-logo',     !s.ls_logo);
      legend.classList.toggle('hide-title',    !s.ls_title);
      legend.classList.toggle('hide-ohlc',     !s.ls_ohlc);
      legend.classList.toggle('hide-change-bar', !s.ls_changeBar);
      legend.classList.toggle('hide-volume',   !s.ls_volume);
      legend.classList.toggle('hide-change-day', !s.ls_changeDay);
      legend.classList.toggle('hide-ind-titles', !s.ls_indTitles);
      legend.classList.toggle('hide-ind-values', !s.ls_indValues);
      legend.classList.toggle('hide-ind-inputs', !s.ls_indInputs);
      legend.classList.toggle('has-bg',         s.ls_background);
    }
  } catch (e) {
    console.warn('[settings] applySettings error:', e);
  }
}

// (Old stub indicatorsModalContent removed — v2 defined below)

const SAMPLE_SYMBOLS = [
  { sym: 'AAPL',  name: 'Apple Inc.',           ex: 'NASDAQ' },
  { sym: 'MSFT',  name: 'Microsoft Corporation', ex: 'NASDAQ' },
  { sym: 'TSLA',  name: 'Tesla, Inc.',          ex: 'NASDAQ' },
  { sym: 'AMZN',  name: 'Amazon.com Inc.',      ex: 'NASDAQ' },
  { sym: 'GOOGL', name: 'Alphabet Inc.',        ex: 'NASDAQ' },
  { sym: 'META',  name: 'Meta Platforms',       ex: 'NASDAQ' },
  { sym: 'NVDA',  name: 'NVIDIA Corporation',   ex: 'NASDAQ' },
  { sym: 'AMD',   name: 'Advanced Micro Dev.',  ex: 'NASDAQ' },
  { sym: 'NFLX',  name: 'Netflix, Inc.',        ex: 'NASDAQ' },
  { sym: 'SPY',   name: 'SPDR S&P 500 ETF',     ex: 'NYSE'   },
];

function renderSymList(target, q = '') {
  const filtered = SAMPLE_SYMBOLS.filter(s =>
    s.sym.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase())
  );
  target.innerHTML = filtered.map(s => `
    <div class="sym-item" data-sym="${s.sym}">
      <span class="si-sym">${s.sym}</span>
      <span class="si-name">${s.name}</span>
      <span class="si-ex">${s.ex}</span>
    </div>`).join('');
}

function positionPopAtSymbol(pop) {
  const pill = document.getElementById('symbolPill');
  if (!pill) return;
  const r = pill.getBoundingClientRect();
  const parent = document.getElementById('center').getBoundingClientRect();
  pop.style.left = Math.max(8, r.left - parent.left) + 'px';
  pop.style.top  = (r.bottom - parent.top + 6) + 'px';
}

function positionPopAtElement(pop, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const parent = document.getElementById('center').getBoundingClientRect();
  pop.style.left = Math.max(8, r.left - parent.left) + 'px';
  pop.style.top  = (r.bottom - parent.top + 6) + 'px';
}

/* =========================================================================
   INDICATOR & COMPARE MANAGEMENT
   ========================================================================= */

function nextColor() {
  if (!_ctx) return INDICATOR_PALETTE[0];
  const used = _ctx.indicators.length + _ctx.compares.length;
  return INDICATOR_PALETTE[used % INDICATOR_PALETTE.length];
}

function uniqueId() {
  return 'i_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Apply an indicator entry. The `entry` object: { id, params, color, uid }.
 * If `persist`=true, push to state.indicators.
 */
function applyIndicator(entry, persist = true) {
  if (!_ctx) return;
  const meta = INDICATOR_CATALOG.find(x => x.id === entry.id);
  if (!meta) return;
  if (!entry.uid) entry.uid = uniqueId();
  if (!entry.color) entry.color = nextColor();
  const candles = _ctx.candles;
  const seriesList = [];
  const valueByTime = {};
  let paneIndex = 0;
  if (meta.pane === 'new') {
    paneIndex = _ctx.nextPaneIndex++;
  }

  const lineOpts = (color, width = 1.5, extra = {}) => ({
    color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, ...extra,
  });

  if (entry.id === 'sma' || entry.id === 'ema' || entry.id === 'wma') {
    const fn = entry.id === 'sma' ? SMA : entry.id === 'ema' ? EMA : WMA;
    const data = fn(candles, entry.params?.period ?? meta.defaults.period);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'bb') {
    const p = entry.params?.period ?? 20, m = entry.params?.mult ?? 2;
    const { upper, basis, lower } = BB(candles, p, m);
    const su = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    const sb = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sl = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    su.setData(upper); sb.setData(basis); sl.setData(lower);
    seriesList.push(su, sb, sl);
    valueByTime.upper = new Map(upper.map(d => [d.time, d.value]));
    valueByTime.basis = new Map(basis.map(d => [d.time, d.value]));
    valueByTime.lower = new Map(lower.map(d => [d.time, d.value]));
  } else if (entry.id === 'vwap') {
    const data = VWAP(candles);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'ichimoku') {
    const ich = Ichimoku(candles, entry.params?.tenkan ?? 9, entry.params?.kijun ?? 26, entry.params?.senkouB ?? 52);
    const stk = _chart.addSeries(LineSeries, lineOpts('#26c6da', 1.2), paneIndex);
    const skj = _chart.addSeries(LineSeries, lineOpts('#ec407a', 1.2), paneIndex);
    const sa = _chart.addSeries(LineSeries, lineOpts('#66bb6a99', 1), paneIndex);
    const sb = _chart.addSeries(LineSeries, lineOpts('#ff704399', 1), paneIndex);
    const sc = _chart.addSeries(LineSeries, lineOpts('#9c27b066', 1), paneIndex);
    stk.setData(ich.tenkan); skj.setData(ich.kijun); sa.setData(ich.senkouA); sb.setData(ich.senkouB); sc.setData(ich.chikou);
    seriesList.push(stk, skj, sa, sb, sc);
    valueByTime.tenkan = new Map(ich.tenkan.map(d => [d.time, d.value]));
    valueByTime.kijun  = new Map(ich.kijun.map(d => [d.time, d.value]));
  } else if (entry.id === 'rsi') {
    const data = RSI(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    // 70/30 reference lines
    s.createPriceLine({ price: 70, color: '#888', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
    s.createPriceLine({ price: 30, color: '#888', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'macd') {
    const { macd, signal, histogram } = MACD(candles, entry.params?.fast ?? 12, entry.params?.slow ?? 26, entry.params?.signal ?? 9);
    const sh = _chart.addSeries(HistogramSeries, { priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }, priceLineVisible: false, lastValueVisible: false }, paneIndex);
    const sm = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    const ss = _chart.addSeries(LineSeries, lineOpts('#ec407a', 1.5), paneIndex);
    sh.setData(histogram); sm.setData(macd); ss.setData(signal);
    seriesList.push(sh, sm, ss);
    valueByTime.macd = new Map(macd.map(d => [d.time, d.value]));
    valueByTime.signal = new Map(signal.map(d => [d.time, d.value]));
  } else if (entry.id === 'stoch') {
    const { k, d } = Stochastic(candles, entry.params?.k ?? 14, entry.params?.d ?? 3, entry.params?.smooth ?? 3);
    const sk = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    const sd = _chart.addSeries(LineSeries, lineOpts('#ec407a', 1.2), paneIndex);
    sk.setData(k); sd.setData(d);
    sk.createPriceLine({ price: 80, color: '#888', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
    sk.createPriceLine({ price: 20, color: '#888', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
    seriesList.push(sk, sd);
    valueByTime.k = new Map(k.map(d => [d.time, d.value]));
    valueByTime.d = new Map(d.map(p => [p.time, p.value]));
  } else if (entry.id === 'cci') {
    const data = CCI(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'willr') {
    const data = WilliamsR(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'adx') {
    const { adx, plusDi, minusDi } = ADX(candles, entry.params?.period ?? 14);
    const sa = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    const sp = _chart.addSeries(LineSeries, lineOpts('#089981', 1.2), paneIndex);
    const sm = _chart.addSeries(LineSeries, lineOpts('#f23645', 1.2), paneIndex);
    sa.setData(adx); sp.setData(plusDi); sm.setData(minusDi);
    seriesList.push(sa, sp, sm);
    valueByTime.adx = new Map(adx.map(d => [d.time, d.value]));
  } else if (entry.id === 'mom') {
    const data = Momentum(candles, entry.params?.period ?? 10);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'obv') {
    const data = OBV(candles);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'atr') {
    const data = ATR(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  }
  /* ───── Tier 2A: 20 additional indicators ───── */
  else if (entry.id === 'donchian') {
    const { upper, middle, lower } = DonchianChannel(candles, entry.params?.period ?? 20);
    const su = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    const sm = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sl = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    su.setData(upper); sm.setData(middle); sl.setData(lower);
    seriesList.push(su, sm, sl);
    valueByTime.upper = new Map(upper.map(d => [d.time, d.value]));
    valueByTime.middle = new Map(middle.map(d => [d.time, d.value]));
    valueByTime.lower = new Map(lower.map(d => [d.time, d.value]));
  } else if (entry.id === 'kc') {
    const { upper, middle, lower } = KeltnerChannels(candles, entry.params?.emaPeriod ?? 20, entry.params?.atrMult ?? 2, entry.params?.atrPeriod ?? 10);
    const su = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    const sm = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    const sl = _chart.addSeries(LineSeries, lineOpts(entry.color, 1), paneIndex);
    su.setData(upper); sm.setData(middle); sl.setData(lower);
    seriesList.push(su, sm, sl);
    valueByTime.upper = new Map(upper.map(d => [d.time, d.value]));
    valueByTime.middle = new Map(middle.map(d => [d.time, d.value]));
    valueByTime.lower = new Map(lower.map(d => [d.time, d.value]));
  } else if (entry.id === 'psar') {
    const data = ParabolicSAR(candles, entry.params?.start ?? 0.02, entry.params?.increment ?? 0.02, entry.params?.max ?? 0.2);
    const s = _chart.addSeries(LineSeries, { ...lineOpts(entry.color, 0), priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 2 }, paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'supertrend') {
    const { upper, lower } = SuperTrend(candles, entry.params?.period ?? 10, entry.params?.multiplier ?? 3);
    const su = _chart.addSeries(LineSeries, lineOpts('#f23645', 2), paneIndex);
    const sl = _chart.addSeries(LineSeries, lineOpts('#089981', 2), paneIndex);
    su.setData(upper); sl.setData(lower);
    seriesList.push(su, sl);
    valueByTime.upper = new Map(upper.map(d => [d.time, d.value]));
    valueByTime.lower = new Map(lower.map(d => [d.time, d.value]));
  } else if (entry.id === 'aroon') {
    const { up, down } = AroonIndicator(candles, entry.params?.period ?? 14);
    const su = _chart.addSeries(LineSeries, lineOpts('#089981', 1.5), paneIndex);
    const sd = _chart.addSeries(LineSeries, lineOpts('#f23645', 1.5), paneIndex);
    su.setData(up); sd.setData(down);
    seriesList.push(su, sd);
    valueByTime.up = new Map(up.map(d => [d.time, d.value]));
    valueByTime.down = new Map(down.map(d => [d.time, d.value]));
  } else if (entry.id === 'cmf') {
    const data = ChaikinMoneyFlow(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'mfi') {
    const data = MFI(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'trix') {
    const data = TRIX(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'pivots-hl') {
    const { pivotHighs, pivotLows } = PivotsHL(candles, entry.params?.leftBars ?? 10, entry.params?.rightBars ?? 10);
    // Render as markers via createSeriesMarkers (uses existing helper if exists)
    const markers = [
      ...pivotHighs.map(p => ({ time: p.time, position: 'aboveBar', color: '#f23645', shape: 'arrowDown', text: 'H' })),
      ...pivotLows.map(p => ({ time: p.time, position: 'belowBar', color: '#089981', shape: 'arrowUp', text: 'L' })),
    ].sort((a, b) => a.time - b.time);
    try { createSeriesMarkers(_ctx.series, markers); } catch {}
    valueByTime.primary = new Map();  // markers, no time series
  } else if (entry.id === 'dema') {
    const data = DEMA(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'tema') {
    const data = TEMA(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'hma') {
    const data = HMA(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'kama') {
    const data = KAMA(candles, entry.params?.period ?? 10, entry.params?.fast ?? 2, entry.params?.slow ?? 30);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'vwma') {
    const data = VWMA(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'pivots') {
    const { pivot, r1, r2, r3, s1, s2, s3 } = PivotPoints(candles);
    const sP = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    const sR1 = _chart.addSeries(LineSeries, lineOpts('#f23645', 1, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sR2 = _chart.addSeries(LineSeries, lineOpts('#f23645', 1, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sR3 = _chart.addSeries(LineSeries, lineOpts('#f23645', 1, { lineStyle: LineStyle.Dotted }), paneIndex);
    const sS1 = _chart.addSeries(LineSeries, lineOpts('#089981', 1, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sS2 = _chart.addSeries(LineSeries, lineOpts('#089981', 1, { lineStyle: LineStyle.Dashed }), paneIndex);
    const sS3 = _chart.addSeries(LineSeries, lineOpts('#089981', 1, { lineStyle: LineStyle.Dotted }), paneIndex);
    sP.setData(pivot); sR1.setData(r1); sR2.setData(r2); sR3.setData(r3);
    sS1.setData(s1); sS2.setData(s2); sS3.setData(s3);
    seriesList.push(sP, sR1, sR2, sR3, sS1, sS2, sS3);
    valueByTime.primary = new Map(pivot.map(d => [d.time, d.value]));
  } else if (entry.id === 'bbw') {
    const data = BollingerBandWidth(candles, entry.params?.period ?? 20, entry.params?.mult ?? 2);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'cmo') {
    const data = ChandeMomentumOscillator(candles, entry.params?.period ?? 14);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'roc') {
    const data = PriceROC(candles, entry.params?.period ?? 12);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'zlema') {
    const data = ZLEMA(candles, entry.params?.period ?? 20);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id === 'volosc') {
    const data = VolumeOscillator(candles, entry.params?.fast ?? 5, entry.params?.slow ?? 10);
    const s = _chart.addSeries(LineSeries, lineOpts(entry.color, 1.5), paneIndex);
    s.setData(data);
    seriesList.push(s);
    valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
  } else if (entry.id && entry.id.startsWith('smc-')) {
    // SMC indicators — overlay via createPriceLine/markers (no pane series, mostly visual)
    try { _renderSmcIndicator(entry, candles, paneIndex, seriesList, valueByTime, lineOpts); } catch (e) { console.error('[smc]', e); }
  }

  const record = {
    id: entry.id, params: entry.params || meta.defaults, color: entry.color, uid: entry.uid,
    seriesList, paneIndex, valueByTime, visible: true,
    label: meta.name,
    lineWidth: entry.lineWidth,
    lineStyle: entry.lineStyle,
  };
  _ctx.indicators.push(record);
  // Apply persisted line styling (Tier-1: dynamic series options)
  if (record.lineWidth != null || record.lineStyle != null) {
    _indsetApplyLineOpts(record);
  }

  if (persist) {
    state.indicators.push({
      id: entry.id, params: record.params, color: entry.color, uid: entry.uid,
      lineWidth: record.lineWidth, lineStyle: record.lineStyle,
    });
    lsSet(LS.indicators, state.indicators);
  }
  refreshLegendIndicators();
}

/**
 * Render an SMC indicator. Uses price lines on the main candle series for
 * zones (FVG/OB), markers for events (BOS/CHoCH/Sweeps), a histogram pane
 * for VolumeDelta, and price lines for AVP POC/VAH/VAL.
 *
 * Mutates `seriesList` (so removeIndicatorByUid can clean up), and pushes any
 * price-line handles into `seriesList[0]._smcPriceLines` for later removal.
 */
function _renderSmcIndicator(entry, candles, paneIndex, seriesList, valueByTime, lineOpts) {
  if (!_ctx || !candles || !candles.length) return;
  const mainSeries = _ctx.series;
  const priceLineHandles = [];
  const addPL = (opts) => {
    try {
      const pl = mainSeries.createPriceLine(opts);
      priceLineHandles.push(pl);
    } catch {}
  };

  if (entry.id === 'smc-fvg') {
    const minSize = entry.params?.minSize ?? 0.001;
    const gaps = FairValueGap(candles, { minSize });
    for (const g of gaps) {
      const color = g.type === 'bullish' ? '#089981' : '#f23645';
      const style = g.filled ? LineStyle.Dotted : LineStyle.Dashed;
      addPL({ price: g.top,    color, lineStyle: style, lineWidth: 1, axisLabelVisible: false, title: 'FVG' });
      addPL({ price: g.bottom, color, lineStyle: style, lineWidth: 1, axisLabelVisible: false, title: '' });
    }
    valueByTime.primary = new Map();
  } else if (entry.id === 'smc-ob') {
    const lookback = entry.params?.lookback ?? 5;
    const minMove  = entry.params?.minMove  ?? 0.02;
    const obs = OrderBlocks(candles, { lookback, minMove });
    const markers = [];
    for (const ob of obs) {
      const color = ob.type === 'bullish' ? '#089981' : '#f23645';
      addPL({ price: ob.top,    color, lineStyle: LineStyle.Solid,  lineWidth: 1, axisLabelVisible: false, title: 'OB' });
      addPL({ price: ob.bottom, color, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: '' });
      markers.push({
        time: ob.time,
        position: ob.type === 'bullish' ? 'belowBar' : 'aboveBar',
        color, shape: ob.type === 'bullish' ? 'arrowUp' : 'arrowDown',
        text: 'OB',
      });
    }
    markers.sort((a, b) => a.time - b.time);
    try { createSeriesMarkers(mainSeries, markers); } catch {}
    valueByTime.primary = new Map();
  } else if (entry.id === 'smc-bos') {
    const lookback = entry.params?.lookback ?? 20;
    const events = BreakOfStructure(candles, { lookback });
    const markers = events.map(e => ({
      time: e.time,
      position: e.type === 'bos-up' ? 'belowBar' : 'aboveBar',
      color: e.type === 'bos-up' ? '#089981' : '#f23645',
      shape: e.type === 'bos-up' ? 'arrowUp' : 'arrowDown',
      text: 'BOS',
    })).sort((a, b) => a.time - b.time);
    try { createSeriesMarkers(mainSeries, markers); } catch {}
    valueByTime.primary = new Map();
  } else if (entry.id === 'smc-choch') {
    const lookback = entry.params?.lookback ?? 20;
    const events = ChangeOfCharacter(candles, { lookback });
    const markers = events.map(e => ({
      time: e.time,
      position: e.type === 'choch-up' ? 'belowBar' : 'aboveBar',
      color: e.type === 'choch-up' ? '#26c6da' : '#ec407a',
      shape: e.type === 'choch-up' ? 'arrowUp' : 'arrowDown',
      text: 'CHoCH',
    })).sort((a, b) => a.time - b.time);
    try { createSeriesMarkers(mainSeries, markers); } catch {}
    valueByTime.primary = new Map();
  } else if (entry.id === 'smc-sweeps') {
    const tolerance = entry.params?.tolerance ?? 0.0005;
    const events = LiquiditySweeps(candles, { tolerance });
    const markers = events.map(e => ({
      time: e.time,
      position: e.direction === 'up' ? 'aboveBar' : 'belowBar',
      color: e.direction === 'up' ? '#f23645' : '#089981',
      shape: e.direction === 'up' ? 'arrowDown' : 'arrowUp',
      text: 'Sweep',
    })).sort((a, b) => a.time - b.time);
    try { createSeriesMarkers(mainSeries, markers); } catch {}
    valueByTime.primary = new Map();
  } else if (entry.id === 'smc-voldelta') {
    const data = VolumeDelta(candles);
    const histData = data.map(d => ({
      time: d.time, value: d.delta,
      color: d.delta >= 0 ? '#089981aa' : '#f23645aa',
    }));
    const sh = _chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceLineVisible: false, lastValueVisible: false,
    }, paneIndex);
    sh.setData(histData);
    seriesList.push(sh);
    valueByTime.primary = new Map(data.map(d => [d.time, d.delta]));
    valueByTime.cumulative = new Map(data.map(d => [d.time, d.cumulative]));
  } else if (entry.id === 'smc-avp') {
    const bins = entry.params?.bins ?? 60;
    const anchorTime = entry.params?.anchorTime ?? candles[0].time;
    const { poc, vah, val } = AnchoredVolumeProfile(candles, anchorTime, { bins });
    if (poc != null) addPL({ price: poc, color: '#f7a600', lineStyle: LineStyle.Solid,  lineWidth: 2, axisLabelVisible: true, title: 'POC' });
    if (vah != null) addPL({ price: vah, color: '#f7a600', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: 'VAH' });
    if (val != null) addPL({ price: val, color: '#f7a600', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: 'VAL' });
    console.log('[smc-avp]', { poc, vah, val });
    valueByTime.primary = new Map();
  }

  // Attach price-line handles to a sentinel object so cleanup can remove them.
  if (priceLineHandles.length) {
    const sentinel = {
      _smcPriceLines: priceLineHandles,
      _smcMainSeries: mainSeries,
    };
    // Provide a no-op so chart.removeSeries(sentinel) is safe.
    Object.defineProperty(sentinel, '__isSmcSentinel', { value: true });
    seriesList.push(sentinel);
  }
}

function removeIndicatorByUid(uid) {
  if (!_ctx) return;
  const idx = _ctx.indicators.findIndex(x => x.uid === uid);
  if (idx < 0) return;
  const rec = _ctx.indicators[idx];
  for (const s of rec.seriesList) {
    try { _chart.removeSeries(s); } catch {}
  }
  _ctx.indicators.splice(idx, 1);
  state.indicators = state.indicators.filter(x => x.uid !== uid);
  lsSet(LS.indicators, state.indicators);
  refreshLegendIndicators();
}

function addCompareSeries(symbol, persist = true) {
  if (!_ctx) return;
  const color = nextColor();
  const uid = uniqueId();
  // Need data for the comparison symbol — generate from mock (Yahoo CORS unreliable)
  import('./data.js').then(({ generateData }) => {
    const cmpCandles = generateData(symbol, state.tf, _ctx.candles.length);
    const firstVal = cmpCandles[0]?.close || 1;
    const baseFirst = _ctx.candles[0]?.close || 1;
    // Normalize: percent change from start, mapped onto main pane's price range via scaling
    // Use overlay price scale (separate) so the series doesn't distort main scale
    const s = _chart.addSeries(LineSeries, {
      color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true,
      priceScaleId: 'cmp_' + uid,
      title: symbol,
    });
    // Normalize values to start at the same value as main symbol's first close
    s.setData(cmpCandles.map(c => ({ time: c.time, value: +(c.close / firstVal * baseFirst).toFixed(4) })));
    s.priceScale().applyOptions({ visible: false, scaleMargins: { top: 0.05, bottom: _ctx.paneSplit.candleBottom } });
    _ctx.compares.push({ symbol, series: s, color, uid, visible: true });
    if (persist && !state.compares.includes(symbol)) {
      state.compares.push(symbol);
      lsSet(LS.compares, state.compares);
    }
    refreshLegendIndicators();
  });
}

function removeCompareByUid(uid) {
  if (!_ctx) return;
  const idx = _ctx.compares.findIndex(c => c.uid === uid);
  if (idx < 0) return;
  const cmp = _ctx.compares[idx];
  try { _chart.removeSeries(cmp.series); } catch {}
  _ctx.compares.splice(idx, 1);
  state.compares = state.compares.filter(s => s !== cmp.symbol);
  lsSet(LS.compares, state.compares);
  refreshLegendIndicators();
}

/* ---- Legend re-render --------------------------------------------------- */

function refreshLegendIndicators() {
  const list = document.getElementById('indList');
  if (!list || !_ctx) return;
  // Preserve the static volume row by clearing dynamic rows first
  list.querySelectorAll('.ind-row.ind-dyn').forEach(r => r.remove());

  const append = (html) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    list.appendChild(wrap.firstElementChild);
  };

  for (const ind of _ctx.indicators) {
    const paramStr = formatParams(ind.id, ind.params);
    const paneBtn = ind.paneIndex > 0
      ? `<span class="ind-pane pane-min" data-pane="${ind.paneIndex}" title="Minimizar/Restaurar panel">⊟</span>`
      : '';
    append(`
      <div class="ind-row ind-dyn" draggable="true" data-ind="dyn" data-uid="${ind.uid}">
        <span class="ind-grip">⋮⋮</span>
        <span class="ind-swatch" data-color="${ind.color}" title="Ocultar/Mostrar"></span>
        <span class="ind-name">${escapeHtml(ind.label)} ${paramStr}</span>
        <span class="ind-val" id="indVal_${ind.uid}_primary">—</span>
        ${paneBtn}
        <span class="ind-cog" title="Configurar">⚙</span>
        <span class="ind-x" title="Eliminar">✕</span>
      </div>
    `);
  }
  for (const cmp of _ctx.compares) {
    append(`
      <div class="ind-row ind-dyn" data-ind="cmp" data-uid="${cmp.uid}">
        <span class="ind-grip">⋮⋮</span>
        <span class="ind-swatch" data-color="${cmp.color}" title="Ocultar/Mostrar"></span>
        <span class="ind-name">${escapeHtml(cmp.symbol)}</span>
        <span class="ind-x" title="Eliminar">✕</span>
      </div>
    `);
  }
  enableIndicatorToggle();
  enableIndicatorReorder();
  if (typeof enableIndicatorSettings === 'function') enableIndicatorSettings();
  // Pane minimize/restore buttons
  document.querySelectorAll('.ind-row .pane-min').forEach(btn => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const pi = +btn.dataset.pane;
      if (!Number.isFinite(pi)) return;
      togglePane(pi);
      const minimized = (state.layout.paneHeights || {})[pi] != null;
      btn.classList.toggle('is-min', minimized);
      btn.textContent = minimized ? '⊞' : '⊟';
    });
  });

  // Update data badge
  const badge = document.getElementById('dataBadge');
  if (badge) {
    badge.textContent = state.source === 'yahoo' ? 'Yahoo' : 'Datos de prueba';
    badge.className = 'data-badge' + (state.source === 'yahoo' ? ' live' : '');
  }
}

function formatParams(id, p) {
  if (!p) return '';
  if (id === 'macd') return `${p.fast ?? 12} ${p.slow ?? 26} ${p.signal ?? 9}`;
  if (id === 'bb')   return `${p.period ?? 20} ${p.mult ?? 2}`;
  if (id === 'stoch')return `${p.k ?? 14} ${p.d ?? 3} ${p.smooth ?? 3}`;
  if (id === 'ichimoku') return `${p.tenkan ?? 9} ${p.kijun ?? 26} ${p.senkouB ?? 52}`;
  if (p.period != null) return String(p.period);
  return '';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

/* =========================================================================
   ALERTS
   ========================================================================= */

function drawAlertLine(alert) {
  if (!_ctx) return;
  const pl = _ctx.series.createPriceLine({
    price: alert.price,
    color: '#ff9800',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: `Alerta @ ${alert.price.toFixed(2)}`,
  });
  _ctx.alertLines.push({ id: alert.id, priceLine: pl, alert });
}

function checkAlerts(price) {
  if (!_ctx || !state.alerts.length) return;
  const toFire = [];
  for (const a of state.alerts) {
    if (a.symbol !== state.symbol) continue;
    if (a.fired) continue;
    if (a.op === 'above' && price >= a.price) toFire.push(a);
    if (a.op === 'below' && price <= a.price) toFire.push(a);
    if (a.op === 'equal' && Math.abs(price - a.price) < (a.price * 0.001)) toFire.push(a);
  }
  for (const a of toFire) {
    a.fired = true;
    try {
      if (Notification.permission === 'granted') {
        new Notification(`${a.symbol} ${a.op === 'above' ? 'cruzó por encima' : a.op === 'below' ? 'cruzó por debajo' : '= '} $${a.price}`, {
          body: `Precio actual: $${price.toFixed(2)}`,
        });
      }
    } catch {}
    // remove price line
    const al = _ctx.alertLines.find(x => x.id === a.id);
    if (al) { try { _ctx.series.removePriceLine(al.priceLine); } catch {} }
    state.alerts = state.alerts.filter(x => x.id !== a.id);
    _ctx.alertLines = _ctx.alertLines.filter(x => x.id !== a.id);
    lsSet(LS.alerts, state.alerts);
  }
}

/* =========================================================================
   SYMBOL / TIMEFRAME / CHART-TYPE SWITCHING
   ========================================================================= */

async function reloadChart() {
  const container = document.getElementById('nvda-chart');
  if (!container) return;
  // Stop any existing live stream before reloading
  if (_liveHandle) { try { _liveHandle.close(); } catch {} _liveHandle = null; }
  if (_liveTickTimer) { clearInterval(_liveTickTimer); _liveTickTimer = null; }
  const { candles, source } = await loadCandles(state.symbol, state.tf, 500);
  state.source = source;
  mountChart(container, candles);
  updateLegendHeader();
  persist();
  // Auto-activate LIVE for crypto symbols (Binance WS sub-second)
  if (toBinanceSymbol(state.symbol)) {
    setTimeout(() => { try { toggleLiveStream(); } catch {} }, 250);
  }
}

// TradingView-style price flash: highlight OHLC header in green/red briefly on tick
function flashPrice(direction) {
  const els = document.querySelectorAll('.legend-ohlc, .ohlc-value, #symbolPill, .tb-symbol-text');
  const color = direction === 'up' ? '#089981' : '#f23645';
  els.forEach(el => {
    if (!el) return;
    el.style.transition = 'color 80ms ease-out';
    el.style.color = color;
    clearTimeout(el._flashT);
    el._flashT = setTimeout(() => { el.style.color = ''; }, 220);
  });
}

function updateLegendHeader() {
  const prof = getSymbolProfile(state.symbol);
  const titleEl = document.querySelector('.legend-title');
  const tfEl = document.querySelector('.legend-tf');
  const exchEl = document.querySelector('.legend-exch');
  const logoEl = document.querySelector('.legend-logo');
  const pillTextEl = document.querySelector('.tb-symbol-text');
  const tfBtn = document.getElementById('tfBtn');
  if (titleEl) titleEl.textContent = prof.name;
  if (tfEl) tfEl.textContent = state.tf;
  if (exchEl) exchEl.textContent = prof.ex;
  if (logoEl) logoEl.textContent = state.symbol[0];
  if (pillTextEl) pillTextEl.textContent = state.symbol;
  if (tfBtn) tfBtn.textContent = state.tf === '1D' ? 'D' : state.tf;
  _updateWatermarkText();
}

async function loadSymbol(sym) {
  state.symbol = sym;
  await reloadChart();
}
async function changeTimeframe(tf) {
  state.tf = tf;
  await reloadChart();
}
// Custom-series types from lightweight-charts plugin examples (rendered as separate ICustomSeriesPaneView).
const CUSTOM_SERIES_TYPES = new Set([
  'rounded-candles', 'pretty-histogram', 'hlc-area', 'lollipop', 'box-whisker', 'dual-histogram',
]);

async function changeChartType(ct) {
  state.chartType = ct;
  // If it's an alternative (transformed) type, reload base candles then apply transform
  const altKey = ALT_CHART_TYPE_MAP && ALT_CHART_TYPE_MAP[ct];
  if (altKey) {
    const prev = state.chartType;
    state.chartType = 'candles';
    await reloadChart();
    state.chartType = prev;
    try {
      if (_ctx && _ctx.extras) _ctx.extras.setChartType(altKey, _ctx.candles);
      _showToast?.(`Gráfico: ${ct}`);
    } catch (e) { console.error('[chart-type]', e); }
    return;
  }
  // If it's a custom-series type, mount base then add custom series with adapted data
  if (CUSTOM_SERIES_TYPES.has(ct)) {
    const prev = state.chartType;
    state.chartType = 'candles';
    await reloadChart();
    state.chartType = prev;
    try {
      const ex = _ctx && _ctx.extras;
      if (!ex) return;
      // Hide the base candle series so only the custom one shows
      try { _ctx.series.applyOptions({ visible: false }); } catch {}
      try { _ctx.vol?.applyOptions({ visible: false }); } catch {}
      const data = _adaptDataForCustomSeries(ct, _ctx.candles);
      const cs = ex.addCustomSeries(ct, {});
      if (cs && data) {
        try { cs.setData(data); } catch (e) { console.warn('[custom-series setData]', e); }
        _ctx._customSeries = cs;
      }
      _showToast?.(`Gráfico: ${ct}`);
    } catch (e) { console.error('[custom-chart-type]', e); }
    return;
  }
  await reloadChart();
}

function _adaptDataForCustomSeries(type, candles) {
  if (!candles || !candles.length) return [];
  switch (type) {
    case 'rounded-candles':
      return candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
    case 'pretty-histogram':
    case 'lollipop':
    case 'dual-histogram':
      return candles.map((c, i, arr) => ({ time: c.time, value: i > 0 ? c.close - arr[i-1].close : 0 }));
    case 'hlc-area':
      return candles.map(c => ({ time: c.time, high: c.high, low: c.low, close: c.close }));
    case 'box-whisker': {
      // Synthetic: rolling 20-bar percentiles (placeholder visualization)
      const out = [];
      for (let i = 19; i < candles.length; i++) {
        const w = candles.slice(i - 19, i + 1).map(x => x.close).sort((a,b) => a - b);
        out.push({
          time: candles[i].time,
          low: w[0], q1: w[5], median: w[10], q3: w[15], high: w[19],
        });
      }
      return out;
    }
    default: return [];
  }
}

/* =========================================================================
   DROPDOWNS: CHART-TYPE + TIMEFRAME
   ========================================================================= */

/* ---- Helpers: magnet / toggle / chart-type SVGs ---- */
const TOOL_TOGGLE_LS = 'tv.toolToggles';
function _getToolToggle(id) {
  try { return (JSON.parse(localStorage.getItem(TOOL_TOGGLE_LS) || '{}'))[id]; } catch { return false; }
}
function _getToolToggleWithDefault(id, def) {
  try {
    const o = JSON.parse(localStorage.getItem(TOOL_TOGGLE_LS) || '{}');
    return id in o ? !!o[id] : def;
  } catch { return def; }
}
function _setToolToggle(id, val) {
  try {
    const o = JSON.parse(localStorage.getItem(TOOL_TOGGLE_LS) || '{}');
    o[id] = val;
    localStorage.setItem(TOOL_TOGGLE_LS, JSON.stringify(o));
  } catch {}
  // Wire to UI side-effects
  try {
    if (id === 'ch-ohlc-tooltip') {
      // Hide immediately if just turned off
      if (!val) {
        const t = document.getElementById('crossTip');
        if (t) t.style.display = 'none';
      }
    }
  } catch (e) { console.warn('[toggle wire]', e); }
}

function _restoreExtrasToggles() { /* no-op now — toggles are read live */ }

const MAGNET_LS = 'tv.magnetMode';
function _getMagnetMode() { try { return localStorage.getItem(MAGNET_LS) || 'weak'; } catch { return 'weak'; } }
function _setMagnetMode(mode) {
  try { localStorage.setItem(MAGNET_LS, mode); } catch {}
  if (!_ctx || !_chart) return;
  _ctx.magnet = true;
  _ctx.magnetMode = mode;
  // weak = Magnet (snaps only when close); strong = MagnetOHLC (always snaps)
  const cm = mode === 'strong' ? (CrosshairMode.MagnetOHLC ?? CrosshairMode.Magnet) : CrosshairMode.Magnet;
  _chart.applyOptions({ crosshair: { mode: cm } });
  const btn = document.querySelector('.lb-btn[data-tool="magnet"]');
  if (btn) btn.classList.add('lb-active');
}
function _isToolItemActive(toolId, itemId) {
  if (toolId === 'magnet') {
    const m = _getMagnetMode();
    return (itemId === 'magnet-strong' && m === 'strong') || (itemId === 'magnet-weak' && m === 'weak');
  }
  return false;
}

/* ---- CHART TYPES (full panel) ---- */
const CTG = {
  bar:        `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b2b5be" stroke-width="1.5"><path d="M11 3v16M6 8h5M11 14h5"/></svg>`,
  candle:     `<svg width="22" height="22" viewBox="0 0 22 22"><line x1="11" y1="2" x2="11" y2="20" stroke="#b2b5be" stroke-width="1"/><rect x="7" y="6" width="8" height="10" fill="#089981"/></svg>`,
  hollow:     `<svg width="22" height="22" viewBox="0 0 22 22"><line x1="11" y1="2" x2="11" y2="20" stroke="#b2b5be" stroke-width="1"/><rect x="7" y="6" width="8" height="10" fill="none" stroke="#089981" stroke-width="1.5"/></svg>`,
  volCandle:  `<svg width="22" height="22" viewBox="0 0 22 22"><line x1="11" y1="2" x2="11" y2="20" stroke="#b2b5be" stroke-width="1"/><rect x="6" y="6" width="10" height="10" fill="#089981" opacity=".7"/></svg>`,
  line:       `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2962ff" stroke-width="1.6"><polyline points="2,17 7,8 13,12 20,4"/></svg>`,
  lineMark:   `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2962ff" stroke-width="1.6"><polyline points="2,17 7,8 13,12 20,4"/><circle cx="2" cy="17" r="1.6" fill="#2962ff"/><circle cx="7" cy="8" r="1.6" fill="#2962ff"/><circle cx="13" cy="12" r="1.6" fill="#2962ff"/><circle cx="20" cy="4" r="1.6" fill="#2962ff"/></svg>`,
  lineStep:   `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2962ff" stroke-width="1.6"><path d="M2 17h5v-9h6v4h7v-8"/></svg>`,
  area:       `<svg width="22" height="22" viewBox="0 0 22 22"><polygon points="2,17 7,8 13,12 20,4 20,20 2,20" fill="rgba(41,98,255,0.4)" stroke="#2962ff" stroke-width="1.2"/></svg>`,
  areaHLC:    `<svg width="22" height="22" viewBox="0 0 22 22"><polygon points="2,15 7,10 13,11 20,6 20,20 2,20" fill="rgba(41,98,255,0.25)" stroke="#2962ff" stroke-width="1.2"/><polyline points="2,12 7,7 13,8 20,3" fill="none" stroke="#2962ff" stroke-width="1.2" opacity=".6"/></svg>`,
  baseline:   `<svg width="22" height="22" viewBox="0 0 22 22"><line x1="0" y1="11" x2="22" y2="11" stroke="#888" stroke-dasharray="2,2"/><polyline points="2,17 7,5 13,15 20,6" fill="none" stroke="#089981" stroke-width="1.4"/></svg>`,
  columns:    `<svg width="22" height="22" viewBox="0 0 22 22" fill="#089981"><rect x="3" y="10" width="3" height="10"/><rect x="8" y="6" width="3" height="14"/><rect x="13" y="14" width="3" height="6"/><rect x="18" y="4" width="3" height="16"/></svg>`,
  hiLow:      `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b2b5be" stroke-width="1.5"><path d="M5 4v14M11 7v11M17 3v16"/></svg>`,
  vfp:        `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b2b5be" stroke-width="1.3"><path d="M4 4v16M20 4v16M6 7h6M6 11h10M6 15h7"/></svg>`,
  tpo:        `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b2b5be" stroke-width="1.3"><text x="11" y="9" text-anchor="middle" font-size="6" fill="#b2b5be">ABC</text><text x="11" y="16" text-anchor="middle" font-size="6" fill="#b2b5be">DEF</text></svg>`,
  vps:        `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b2b5be" stroke-width="1.3"><path d="M3 5h6M3 9h12M3 13h9M3 17h5M20 4v16"/></svg>`,
  heikin:     `<svg width="22" height="22" viewBox="0 0 22 22"><rect x="3" y="5" width="5" height="12" fill="#089981"/><rect x="13" y="8" width="5" height="9" fill="#f23645"/></svg>`,
  renko:      `<svg width="22" height="22" viewBox="0 0 22 22"><rect x="2" y="12" width="4" height="4" fill="#089981"/><rect x="6" y="8" width="4" height="4" fill="#089981"/><rect x="10" y="10" width="4" height="4" fill="#f23645"/><rect x="14" y="6" width="4" height="4" fill="#089981"/></svg>`,
};

const CHART_TYPE_GROUPS = [
  // Group 1
  [
    { id: 'bars',         label: 'Barras',                                   icon: CTG.bar },
    { id: 'candles',      label: 'Velas',                                    icon: CTG.candle },
    { id: 'hollow',       label: 'Velas huecas',                             icon: CTG.hollow },
    { id: 'vol-candles',  label: 'Velas de volumen',                         icon: CTG.volCandle },
  ],
  // Group 2
  [
    { id: 'line',         label: 'Línea',                                    icon: CTG.line },
    { id: 'line-markers', label: 'Línea con marcadores',                     icon: CTG.lineMark },
    { id: 'line-step',    label: 'Línea escalonada',                         icon: CTG.lineStep },
  ],
  // Group 3
  [
    { id: 'area',         label: 'Área',                                     icon: CTG.area },
    { id: 'area-hlc',     label: 'Área HLC',                                 icon: CTG.areaHLC },
    { id: 'baseline',     label: 'Línea de referencia',                      icon: CTG.baseline },
  ],
  // Group 4
  [
    { id: 'columns',      label: 'Columnas',                                 icon: CTG.columns },
    { id: 'high-low',     label: 'Máximo-mínimo',                            icon: CTG.hiLow },
  ],
  // Group 5 (stubs)
  [
    { id: 'vfp',          label: 'Huella de volumen',                        icon: CTG.vfp, stub: true },
    { id: 'tpo',          label: 'Oportunidad de precios en el tiempo',      icon: CTG.tpo, stub: true },
    { id: 'vps',          label: 'Perfil de volumen de sesión',              icon: CTG.vps, stub: true },
  ],
  // Group 6 — alternative chart types (live, transformed via extras-integration)
  [
    { id: 'heikin',       label: 'Heikin Ashi',                              icon: CTG.heikin },
    { id: 'renko',        label: 'Renko',                                    icon: CTG.renko },
    { id: 'line-break',   label: 'Line Break (3)',                           icon: CTG.lineStep || CTG.line },
    { id: 'range-bars',   label: 'Range bars',                               icon: CTG.bar },
    { id: 'pf',           label: 'Point & Figure',                           icon: CTG.columns },
    { id: 'kagi',         label: 'Kagi',                                     icon: CTG.line },
  ],
  // Group 7 — custom series (native ICustomSeriesPaneView plugins from lightweight-charts)
  [
    { id: 'rounded-candles', label: 'Velas redondeadas',                     icon: CTG.candle },
    { id: 'pretty-histogram',label: 'Histograma con gradiente',              icon: CTG.columns },
    { id: 'hlc-area',        label: 'Área HLC (Yahoo style)',                icon: CTG.areaHLC || CTG.area },
    { id: 'lollipop',        label: 'Lollipop',                              icon: CTG.line },
    { id: 'box-whisker',     label: 'Box-Whisker (estadístico)',             icon: CTG.bar },
    { id: 'dual-histogram',  label: 'Histograma bipolar (+/-)',              icon: CTG.columns },
  ],
];

// Maps chart-type id from the menu to the transformer key in extras-integration.
const ALT_CHART_TYPE_MAP = {
  'heikin':     'heikin-ashi',
  'renko':      'renko',
  'line-break': 'line-break',
  'range-bars': 'range',
  'pf':         'pf',
  'kagi':       'kagi',
};

function _showToast(msg) {
  let t = document.getElementById('tvToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'tvToast';
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#1c1c1c;border:1px solid #2e2e2e;color:#fff;padding:8px 14px;border-radius:4px;z-index:200;font-size:13px;font-family:var(--font-ui);box-shadow:0 4px 12px rgba(0,0,0,.5)';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2000);
}

function openChartTypeMenu() {
  closeAllPops();
  const btn = document.getElementById('chartStyleBtn');
  if (!btn) return;
  const pop = ensurePop('chartTypePop', 'tool-menu');
  pop.style.width = '340px';
  let html = '<div class="tool-menu-inner">';
  CHART_TYPE_GROUPS.forEach((group, gi) => {
    if (gi > 0) html += '<div class="tm-divider"></div>';
    for (const ct of group) {
      const active = ct.id === state.chartType;
      html += `<div class="tm-item${active ? ' active' : ''}" data-ct="${ct.id}"${ct.stub ? ' data-stub="1"' : ''}>
        <span class="tm-icon">${ct.icon}</span>
        <span class="tm-label">${ct.label}</span>
      </div>`;
    }
  });
  html += '</div>';
  pop.innerHTML = html;
  positionPopBelow(pop, btn);
  pop.style.display = 'block';
  pop.querySelectorAll('.tm-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.ct;
      if (el.dataset.stub === '1') {
        _showToast(`${el.querySelector('.tm-label').textContent}: Próximamente`);
        pop.style.display = 'none';
        return;
      }
      changeChartType(id);
      pop.style.display = 'none';
    });
  });
}

/* ---- TIMEFRAME (full panel) ---- */
const TF_SECTIONS = [
  { id: 'ticks',    title: 'TICKS',    items: [
    { id: '1t',    label: '1 tick',     unsupported: true },
    { id: '10t',   label: '10 ticks',   unsupported: true },
    { id: '100t',  label: '100 ticks',  unsupported: true },
    { id: '1000t', label: '1000 ticks', unsupported: true },
  ]},
  { id: 'secs',     title: 'SEGUNDOS', items: [
    { id: '1s',  label: '1 segundo',   unsupported: true },
    { id: '5s',  label: '5 segundos',  unsupported: true },
    { id: '10s', label: '10 segundos', unsupported: true },
    { id: '15s', label: '15 segundos', unsupported: true },
    { id: '30s', label: '30 segundos', unsupported: true },
    { id: '45s', label: '45 segundos', unsupported: true },
  ]},
  { id: 'mins',     title: 'MINUTOS',  items: [
    { id: '1m',  label: '1 minuto'   },
    { id: '2m',  label: '2 minutos'  },
    { id: '3m',  label: '3 minutos'  },
    { id: '5m',  label: '5 minutos'  },
    { id: '10m', label: '10 minutos' },
    { id: '15m', label: '15 minutos' },
    { id: '30m', label: '30 minutos' },
    { id: '45m', label: '45 minutos' },
  ]},
  { id: 'hours',    title: 'HORAS',    items: [
    { id: '1h', label: '1 hora'  },
    { id: '2h', label: '2 horas' },
    { id: '3h', label: '3 horas' },
    { id: '4h', label: '4 horas' },
  ]},
  { id: 'days',     title: 'DÍAS',     items: [
    { id: '1D',  label: '1 día'    },
    { id: '1S',  label: '1 semana' },
    { id: '1M',  label: '1 mes'    },
    { id: '3M',  label: '3 meses'  },
    { id: '6M',  label: '6 meses'  },
    { id: '12M', label: '12 meses' },
  ]},
  { id: 'ranges',   title: 'RANGOS',   items: [
    { id: '1r',    label: '1 rango',     unsupported: true },
    { id: '10r',   label: '10 rangos',   unsupported: true },
    { id: '100r',  label: '100 rangos',  unsupported: true },
    { id: '1000r', label: '1000 rangos', unsupported: true },
  ]},
];

const TF_COLLAPSE_LS = 'tv.tfCollapsed';
function _getTfCollapsed() { try { return JSON.parse(localStorage.getItem(TF_COLLAPSE_LS) || '{}'); } catch { return {}; } }
function _setTfCollapsed(o) { try { localStorage.setItem(TF_COLLAPSE_LS, JSON.stringify(o)); } catch {} }

function openTfMenu() {
  closeAllPops();
  const btn = document.getElementById('tfBtn');
  if (!btn) return;
  const pop = ensurePop('tfPop', 'tool-menu');
  pop.style.width = '340px';
  const collapsed = _getTfCollapsed();
  let html = '<div class="tool-menu-inner">';
  html += `<div class="tm-custom-btn" id="tfCustomBtn">+ Añadir intervalo personalizado…</div>`;
  for (const sec of TF_SECTIONS) {
    const isCol = !!collapsed[sec.id];
    html += `<div class="tm-section-title collapsible${isCol ? ' collapsed' : ''}" data-sec="${sec.id}">
      <span>${sec.title}</span><span class="tm-chev">▾</span></div>`;
    if (!isCol) {
      for (const it of sec.items) {
        const active = it.id === state.tf;
        html += `<div class="tm-item${active ? ' active' : ''}" data-tf="${it.id}"${it.unsupported ? ' data-unsupported="1"' : ''}>
          <span class="tm-label">${it.label}</span>
        </div>`;
      }
    }
  }
  html += '</div>';
  pop.innerHTML = html;
  positionPopBelow(pop, btn);
  pop.style.display = 'block';

  pop.querySelector('#tfCustomBtn')?.addEventListener('click', () => {
    console.log('[tf] custom interval requested');
    pop.style.display = 'none';
  });
  pop.querySelectorAll('.tm-section-title.collapsible').forEach(el => {
    el.addEventListener('click', () => {
      const sec = el.dataset.sec;
      const cur = _getTfCollapsed();
      cur[sec] = !cur[sec];
      _setTfCollapsed(cur);
      openTfMenu(); // re-render
    });
  });
  pop.querySelectorAll('.tm-item').forEach(el => {
    el.addEventListener('click', () => {
      const tf = el.dataset.tf;
      if (el.dataset.unsupported === '1') {
        console.log('[tf] Intervalo no soportado por la data mock:', tf);
        state.tf = tf;
        const tfBtn = document.getElementById('tfBtn');
        if (tfBtn) tfBtn.textContent = tf;
        pop.style.display = 'none';
        return;
      }
      changeTimeframe(tf);
      pop.style.display = 'none';
    });
  });
}

/* ---- SEARCH PALETTE (lightning bolt) ---- */
const RECENT_TOOLS_LS = 'tv.recentTools';
function _getRecentTools() { try { return JSON.parse(localStorage.getItem(RECENT_TOOLS_LS) || '[]'); } catch { return []; } }
function _addRecentTool(item) {
  try {
    let arr = _getRecentTools().filter(x => x.id !== item.id);
    arr.unshift(item);
    arr = arr.slice(0, 10);
    localStorage.setItem(RECENT_TOOLS_LS, JSON.stringify(arr));
  } catch {}
}

function _buildSearchableActions() {
  const acts = [];
  // Indicators
  for (const ind of INDICATOR_CATALOG) {
    acts.push({ id: 'ind:' + ind.id, label: ind.name, kind: 'indicator', payload: ind.id, icon: 'fx' });
  }
  // Chart types
  for (const group of CHART_TYPE_GROUPS) {
    for (const ct of group) {
      acts.push({ id: 'ct:' + ct.id, label: 'Tipo de gráfico: ' + ct.label, kind: 'chartType', payload: ct.id, icon: 'chart' });
    }
  }
  // Timeframes
  for (const sec of TF_SECTIONS) {
    for (const tf of sec.items) {
      if (tf.unsupported) continue;
      acts.push({ id: 'tf:' + tf.id, label: 'Intervalo: ' + tf.label, kind: 'tf', payload: tf.id, icon: 'clock' });
    }
  }
  // Chart actions
  acts.push({ id: 'act:pine', label: 'Abrir Editor de Pine', kind: 'noop', icon: 'arrow' });
  acts.push({ id: 'act:vfp', label: 'Perfil de volumen de rango fijo', kind: 'noop', icon: 'flag' });
  acts.push({ id: 'act:settings', label: 'Abrir Configuración', kind: 'settings', icon: 'arrow' });
  acts.push({ id: 'act:alert', label: 'Crear alerta', kind: 'alert', icon: 'arrow' });
  acts.push({ id: 'act:fullscreen', label: 'Pantalla completa', kind: 'fullscreen', icon: 'arrow' });
  return acts;
}

const SP_ICONS = {
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
  flag:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v18M5 4h12l-2 4 2 4H5"/></svg>',
  fx:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="3" y="18" font-size="14" font-family="serif">fx</text></svg>',
  chart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M6 16V8M10 16V4M14 16V10M18 16V6"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function _runSearchAction(act) {
  _addRecentTool({ id: act.id, label: act.label, icon: act.icon });
  if (act.kind === 'indicator') {
    const meta = INDICATOR_CATALOG.find(x => x.id === act.payload);
    if (meta) applyIndicator({ id: meta.id, params: { ...meta.defaults } });
  } else if (act.kind === 'chartType') {
    changeChartType(act.payload);
  } else if (act.kind === 'tf') {
    changeTimeframe(act.payload);
  } else if (act.kind === 'settings') {
    if (typeof openSettingsModal === 'function') openSettingsModal();
  } else if (act.kind === 'alert') {
    if (typeof openAlertModal === 'function') openAlertModal();
  } else if (act.kind === 'fullscreen') {
    if (typeof toggleFullscreen === 'function') toggleFullscreen();
  } else {
    console.log('[search-palette] action:', act.id);
  }
}

function openSearchPalette() {
  closeAllPops();
  let pal = document.getElementById('spPalette');
  if (!pal) {
    pal = document.createElement('div');
    pal.id = 'spPalette';
    pal.className = 'sp-palette';
    document.getElementById('center').appendChild(pal);
  }
  const renderBody = (query) => {
    const body = pal.querySelector('.sp-palette-body');
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      const recent = _getRecentTools();
      let html = `<div class="sp-palette-section">BÚSQUEDA RECIENTE</div>`;
      if (recent.length === 0) {
        // Sample defaults from screenshot
        html += `
          <div class="sp-palette-item" data-sample="pine">
            <span class="sp-palette-item-icon">${SP_ICONS.arrow}</span>
            <span>Abrir Editor de Pine</span>
          </div>
          <div class="sp-palette-item" data-sample="vfp">
            <span class="sp-palette-item-icon" style="color:#f7a600">★</span>
            <span>Perfil de volumen de rango fijo</span>
            <span class="sp-palette-item-icon" style="margin-left:auto">${SP_ICONS.flag}</span>
          </div>`;
      } else {
        for (const r of recent) {
          html += `<div class="sp-palette-item" data-recent="${r.id}">
            <span class="sp-palette-item-icon">${SP_ICONS[r.icon] || SP_ICONS.arrow}</span>
            <span>${r.label}</span>
          </div>`;
        }
      }
      body.innerHTML = html;
      body.querySelectorAll('.sp-palette-item').forEach(el => {
        el.addEventListener('click', () => {
          if (el.dataset.sample === 'pine') {
            console.log('[search-palette] Abrir Editor de Pine'); pal.style.display = 'none'; return;
          }
          if (el.dataset.sample === 'vfp') {
            _showToast('Perfil de volumen de rango fijo: Próximamente');
            pal.style.display = 'none'; return;
          }
          const id = el.dataset.recent;
          const acts = _buildSearchableActions();
          const act = acts.find(a => a.id === id);
          if (act) { _runSearchAction(act); pal.style.display = 'none'; }
        });
      });
      return;
    }
    const acts = _buildSearchableActions();
    const results = acts.filter(a => a.label.toLowerCase().includes(q)).slice(0, 12);
    if (results.length === 0) {
      body.innerHTML = `<div class="sp-palette-empty">Sin resultados</div>`;
      return;
    }
    body.innerHTML = `<div class="sp-palette-section">RESULTADOS</div>` +
      results.map(a => `<div class="sp-palette-item" data-id="${a.id}">
        <span class="sp-palette-item-icon">${SP_ICONS[a.icon] || SP_ICONS.arrow}</span>
        <span>${a.label}</span>
      </div>`).join('');
    body.querySelectorAll('.sp-palette-item').forEach(el => {
      el.addEventListener('click', () => {
        const act = results.find(a => a.id === el.dataset.id);
        if (act) { _runSearchAction(act); pal.style.display = 'none'; }
      });
    });
  };
  pal.innerHTML = `
    <div class="sp-palette-head">
      <span class="sp-palette-title">Buscar una herramienta o función</span>
      <button class="sp-palette-close" id="spPaletteClose">✕</button>
    </div>
    <div class="sp-palette-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input type="text" id="spPaletteInput" placeholder="" autocomplete="off"/>
    </div>
    <div class="sp-palette-body"></div>
  `;
  // Position below lightning button
  const btn = document.getElementById('searchPaletteBtn');
  const center = document.getElementById('center');
  if (btn && center) {
    const r = btn.getBoundingClientRect();
    const cr = center.getBoundingClientRect();
    pal.style.left = Math.max(8, Math.min(r.left - cr.left - 200, cr.width - 470)) + 'px';
    pal.style.top  = (r.bottom - cr.top + 6) + 'px';
  }
  pal.style.display = 'block';
  renderBody('');
  const input = pal.querySelector('#spPaletteInput');
  input.addEventListener('input', () => renderBody(input.value));
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { pal.style.display = 'none'; }
    if (ev.key === 'Enter') {
      const first = pal.querySelector('.sp-palette-item');
      if (first) first.click();
    }
  });
  pal.querySelector('#spPaletteClose').addEventListener('click', () => pal.style.display = 'none');
  setTimeout(() => input.focus(), 0);
}

function ensurePop(id, cls) {
  let pop = document.getElementById(id);
  if (!pop) {
    pop = document.createElement('div');
    pop.id = id;
    pop.className = cls;
    document.getElementById('center').appendChild(pop);
  }
  return pop;
}

function positionPopBelow(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  const parent = document.getElementById('center').getBoundingClientRect();
  pop.style.left = (r.left - parent.left) + 'px';
  pop.style.top  = (r.bottom - parent.top + 4) + 'px';
}

function closeAllPops() {
  ['symPop','cmpPop','tradePop','chartTypePop','tfPop','spPalette','watchPanel','alertPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el && id !== 'watchPanel' && id !== 'alertPanel') el.style.display = 'none';
  });
}

/* =========================================================================
   INDICATORS MODAL (Figma node 5:21887 — 840×638)
   Tabs: Indicadores técnicos / Estrategias / Perfiles / Patrones
   Top-tab: Favoritos / Bases técnicas / Estrategias
   Sidebar (Personal/Integrado/Comunidad) categories filter the list
   ========================================================================= */

const IND_FAV_KEY = 'tv.favIndicators';

// Sidebar mirrors Figma layout (Personal/Integrado/Comunidad sections).
// "Personal" = Favoritos + custom buckets; "Integrado" = built-in categories;
// "Comunidad" = community scripts (placeholders, like Figma original).
const IND_SIDEBAR = [
  { header: 'Personal', items: [
    { id: 'favs',       label: 'Favoritos' },
    { id: 'mine',       label: 'Mis scripts' },
    { id: 'recent',     label: 'Recientes' },
    { id: 'invitations',label: 'Solo por invitación' },
  ]},
  { header: 'Integrado', items: [
    { id: 'tech',       label: 'Bases técnicas' },
    { id: 'fin',        label: 'Financieros' },
  ]},
  { header: 'Comunidad', items: [
    { id: 'editor',     label: 'Selección del editor' },
    { id: 'community',  label: 'Scripts de la comunidad' },
    { id: 'volumeProf', label: 'Perfil de volumen' },
    { id: 'candles',    label: 'Patrones de velas' },
  ]},
];

// Top tabs as per Figma (Bases técnicas / Estrategias tabs)
const IND_TOP_TABS = [
  { id: 'indicators', label: 'Indicadores técnicos' },
  { id: 'strategies', label: 'Estrategias' },
  { id: 'profiles',   label: 'Perfiles' },
  { id: 'patterns',   label: 'Patrones' },
];

// Map each Figma category (label in sidebar) → filter over INDICATOR_CATALOG
function _indFilterFor(sidebarId) {
  switch (sidebarId) {
    case 'favs': {
      const favs = _indReadFavs();
      return INDICATOR_CATALOG.filter(i => favs.includes(i.id));
    }
    case 'tech':
      return INDICATOR_CATALOG.slice();
    case 'mine':
    case 'recent':
    case 'invitations':
    case 'fin':
    case 'editor':
    case 'community':
    case 'volumeProf':
    case 'candles':
      return []; // empty state for non-built-in buckets
    default:
      return INDICATOR_CATALOG.slice();
  }
}

function _indReadFavs() {
  try { return JSON.parse(localStorage.getItem(IND_FAV_KEY) || '[]'); }
  catch { return []; }
}
function _indWriteFavs(arr) {
  localStorage.setItem(IND_FAV_KEY, JSON.stringify(arr));
}
function _indToggleFav(id) {
  const favs = _indReadFavs();
  const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1); else favs.push(id);
  _indWriteFavs(favs);
  return favs.includes(id);
}

// State for the open dialog
const _indState = {
  topTab: 'indicators',   // indicators | strategies | profiles | patterns
  sidebar: 'tech',        // selected sidebar entry id
  query: '',
};

function openIndicatorsModal() {
  // remove any prior instance
  document.getElementById('indModalBack')?.remove();
  document.getElementById('indModal')?.remove();

  const back = document.createElement('div');
  back.id = 'indModalBack';
  back.className = 'ind-modal-back';

  const m = document.createElement('div');
  m.id = 'indModal';
  m.className = 'ind-modal';
  m.innerHTML = `
    <div class="ind-m-head">
      <div class="ind-m-title">Indicadores, métricas y estrategias</div>
      <button class="ind-m-x" id="indMX" title="Cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 4 L14 14 M14 4 L4 14" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="ind-m-search-wrap">
      <span class="ind-m-search-icon" aria-hidden="true">
        <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="12" cy="12" r="6.5"/>
          <path d="M17 17 L22 22" stroke-linecap="round"/>
        </svg>
      </span>
      <input id="indMSearch" type="text" placeholder="Buscar" autocomplete="off"/>
    </div>
    <div class="ind-m-content">
      <aside class="ind-m-side" id="indMSide">${_indRenderSidebar()}</aside>
      <section class="ind-m-main">
        <div class="ind-m-tabs" id="indMTabs">${_indRenderTopTabs()}</div>
        <div class="ind-m-list-head"><span>Nombre del script</span></div>
        <div class="ind-m-list" id="indMList"></div>
      </section>
    </div>
  `;

  const center = document.getElementById('center') || document.body;
  center.appendChild(back);
  center.appendChild(m);

  // initial render
  _indRenderList();

  // Wire close
  back.addEventListener('click', closeIndicatorsModal);
  m.querySelector('#indMX').addEventListener('click', closeIndicatorsModal);

  // Wire sidebar
  m.querySelector('#indMSide').addEventListener('click', (ev) => {
    const it = ev.target.closest('.ind-m-side-item');
    if (!it) return;
    _indState.sidebar = it.dataset.id;
    m.querySelectorAll('.ind-m-side-item').forEach(el => el.classList.toggle('is-active', el === it));
    _indRenderList();
  });

  // Wire top tabs
  m.querySelector('#indMTabs').addEventListener('click', (ev) => {
    const t = ev.target.closest('.ind-m-tab');
    if (!t) return;
    _indState.topTab = t.dataset.id;
    m.querySelectorAll('.ind-m-tab').forEach(el => el.classList.toggle('is-active', el === t));
    _indRenderList();
  });

  // Wire search
  const search = m.querySelector('#indMSearch');
  search.addEventListener('input', () => {
    _indState.query = search.value.trim().toLowerCase();
    _indRenderList();
  });

  // Wire list (delegated)
  m.querySelector('#indMList').addEventListener('click', (ev) => {
    const star = ev.target.closest('.ind-m-star');
    if (star) {
      ev.stopPropagation();
      const id = star.dataset.id;
      const now = _indToggleFav(id);
      star.classList.toggle('is-on', now);
      if (_indState.sidebar === 'favs') _indRenderList();
      return;
    }
    const add = ev.target.closest('.ind-m-add');
    const row = ev.target.closest('.ind-m-row');
    if (add || row) {
      const id = (add || row).dataset.id;
      const meta = INDICATOR_CATALOG.find(x => x.id === id);
      if (!meta) return;
      applyIndicator({ id, params: { ...meta.defaults } });
      closeIndicatorsModal();
    }
  });

  // focus search
  setTimeout(() => search.focus(), 0);
}

function closeIndicatorsModal() {
  document.getElementById('indModalBack')?.remove();
  document.getElementById('indModal')?.remove();
}

/* ========================================================================
   COMPARE MODAL  (Figma 5:66126 — dialog-qyCw0PaN, 840×565)
   ======================================================================== */

const COMPARE_RECENT_SYMBOLS = [
  { sym: 'IXIC',   desc: 'NASDAQ Composite Index',          exch: 'NASDAQ', type: 'index' },
  { sym: 'USDCAD', desc: 'US Dollar/Canadian Dollar',       exch: 'FXCM',   type: 'forex' },
  { sym: 'EURCHF', desc: 'Euro/Swiss Franc',                exch: 'FXCM',   type: 'forex' },
  { sym: 'USDCHF', desc: 'US Dollar/Swiss Franc',           exch: 'FXCM',   type: 'forex' },
  { sym: 'SPX',    desc: 'S&P 500',                         exch: 'SPCFD',  type: 'index' },
  { sym: 'NDQ',    desc: 'US 100 Index',                    exch: 'TVC',    type: 'index' },
  { sym: 'DJI',    desc: 'Dow Jones Industrial Average Index', exch: 'DJCFD', type: 'index' },
  { sym: 'NI225',  desc: 'Japan 225 Index',                 exch: 'TVC',    type: 'index' },
  { sym: 'DEU40',  desc: 'GERMAN STOCK INDEX (DAX)',        exch: 'XETR',   type: 'index' },
  { sym: 'UKX',    desc: 'UK 100 INDEX',                    exch: 'FTSE',   type: 'index' },
];

function openCompareModal() {
  document.getElementById('cmpModalBack')?.remove();
  document.getElementById('cmpModal')?.remove();

  const back = document.createElement('div');
  back.id = 'cmpModalBack';
  back.className = 'cmp-modal-back';

  const m = document.createElement('div');
  m.id = 'cmpModal';
  m.className = 'cmp-modal';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-label', 'Comparar símbolos');
  m.innerHTML = `
    <div class="cmp-m-head">
      <div class="cmp-m-title">Comparar símbolos</div>
      <button class="cmp-m-x" id="cmpMX" title="Cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 4 L14 14 M14 4 L4 14" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="cmp-m-input-wrap">
      <div class="cmp-m-input">
        <span class="cmp-m-search-icon" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="12" cy="12" r="6.5"/>
            <path d="M17 17 L22 22" stroke-linecap="round"/>
          </svg>
        </span>
        <input id="cmpMInput" type="text" placeholder="Símbolo, ISIN o CUSIP" autocomplete="off"/>
        <button class="cmp-m-add" id="cmpMAdd" title="Añadir">Añadir</button>
      </div>
    </div>
    <div class="cmp-m-scroll">
      ${_cmpRenderActive()}
      <div class="cmp-m-section-head">Símbolos recientes</div>
      <div class="cmp-m-list" id="cmpMList">
        ${COMPARE_RECENT_SYMBOLS.map(_cmpRenderRow).join('')}
      </div>
    </div>
  `;

  const center = document.getElementById('center') || document.body;
  center.appendChild(back);
  center.appendChild(m);

  back.addEventListener('click', closeCompareModal);
  m.querySelector('#cmpMX').addEventListener('click', closeCompareModal);

  const input = m.querySelector('#cmpMInput');
  const addBtn = m.querySelector('#cmpMAdd');
  const submitInput = () => {
    const v = input.value.trim().toUpperCase();
    if (!v) return;
    addCompareSeries(v);
    closeCompareModal();
  };
  addBtn.addEventListener('click', submitInput);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); submitInput(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); closeCompareModal(); }
  });

  // Row click → add that symbol
  m.querySelector('#cmpMList').addEventListener('click', (ev) => {
    const row = ev.target.closest('.cmp-m-row');
    if (!row) return;
    addCompareSeries(row.dataset.sym);
    closeCompareModal();
  });

  // Active chip × removal
  m.querySelectorAll('.cmp-m-chip-x').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const uid = btn.dataset.uid;
      removeCompareByUid(uid);
      // re-render active section
      const act = m.querySelector('#cmpMActive');
      if (act) act.outerHTML = _cmpRenderActive();
      // re-wire after re-render
      m.querySelectorAll('.cmp-m-chip-x').forEach(b => {
        b.addEventListener('click', (e2) => {
          e2.stopPropagation();
          removeCompareByUid(b.dataset.uid);
          const a2 = m.querySelector('#cmpMActive');
          if (a2) a2.outerHTML = _cmpRenderActive();
        });
      });
    });
  });

  setTimeout(() => input.focus(), 0);
}

function closeCompareModal() {
  document.getElementById('cmpModalBack')?.remove();
  document.getElementById('cmpModal')?.remove();
}

function _cmpRenderActive() {
  const list = (_ctx && _ctx.compares) ? _ctx.compares : [];
  if (!list.length) return `<div id="cmpMActive" class="cmp-m-active is-empty"></div>`;
  return `
    <div id="cmpMActive" class="cmp-m-active">
      <div class="cmp-m-section-head">Comparando ahora</div>
      <div class="cmp-m-chips">
        ${list.map(c => `
          <span class="cmp-m-chip" title="${c.symbol}">
            <span class="cmp-m-chip-dot" style="background:${c.color}"></span>
            <span class="cmp-m-chip-label">${c.symbol}</span>
            <button class="cmp-m-chip-x" data-uid="${c.uid}" title="Quitar" aria-label="Quitar ${c.symbol}">
              <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M3 3 L9 9 M9 3 L3 9" stroke-linecap="round"/>
              </svg>
            </button>
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

function _cmpRenderRow(r) {
  const initial = r.sym.charAt(0).toUpperCase();
  return `
    <div class="cmp-m-row" data-sym="${r.sym}" role="button" tabindex="0">
      <div class="cmp-m-row-logo"><span>${initial}</span></div>
      <div class="cmp-m-row-info">
        <div class="cmp-m-row-sym">${r.sym}</div>
        <div class="cmp-m-row-desc">${r.desc}</div>
      </div>
      <div class="cmp-m-row-exch">${r.exch}</div>
      <div class="cmp-m-row-type">${r.type}</div>
    </div>
  `;
}

function _indRenderSidebar() {
  return IND_SIDEBAR.map(sec => `
    <div class="ind-m-side-sec">
      <div class="ind-m-side-title">${sec.header}</div>
      ${sec.items.map(it => `
        <div class="ind-m-side-item ${it.id === _indState.sidebar ? 'is-active' : ''}" data-id="${it.id}">
          <span class="ind-m-side-label">${it.label}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function _indRenderTopTabs() {
  return IND_TOP_TABS.map(t => `
    <button class="ind-m-tab ${t.id === _indState.topTab ? 'is-active' : ''}" data-id="${t.id}">${t.label}</button>
  `).join('');
}

function _indRenderList() {
  const list = document.getElementById('indMList');
  if (!list) return;

  // Strategies tab → functional list of preset strategies with Backtest buttons
  if (_indState.topTab === 'strategies') {
    let strategies = PRESET_STRATEGIES.slice();
    if (_indState.query) {
      const q = _indState.query;
      strategies = strategies.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }
    if (!strategies.length) {
      list.innerHTML = `<div class="ind-m-empty">No hay estrategias disponibles</div>`;
      return;
    }
    list.innerHTML = `<div class="bt-strat-grid">${strategies.map(s => `
      <div class="bt-strat-card" data-id="${escapeHtml(s.id)}">
        <div class="bt-strat-card-head">
          <span class="bt-strat-card-name">${escapeHtml(s.name)}</span>
        </div>
        <div class="bt-strat-card-desc">${escapeHtml(s.description || '')}</div>
        <div class="bt-strat-card-foot">
          <button class="bt-strat-run" data-id="${escapeHtml(s.id)}">Backtest</button>
        </div>
      </div>
    `).join('')}</div>`;
    // Wire backtest buttons (delegated once)
    list.onclick = (ev) => {
      const btn = ev.target.closest('.bt-strat-run');
      if (!btn) return;
      const sid = btn.dataset.id;
      const strat = PRESET_STRATEGIES.find(x => x.id === sid);
      if (!strat) return;
      closeIndicatorsModal();
      openBacktestConfigModal(strat);
    };
    return;
  } else {
    // restore default delegated handler for indicators tab (attached by caller)
    list.onclick = null;
  }

  // Profiles / Patterns tabs → empty state (no data wired)
  if (_indState.topTab !== 'indicators') {
    const msg = _indState.topTab === 'profiles' ? 'No hay perfiles disponibles' : 'No hay patrones disponibles';
    list.innerHTML = `<div class="ind-m-empty">${msg}</div>`;
    return;
  }

  let items = _indFilterFor(_indState.sidebar);
  if (_indState.query) {
    const q = _indState.query;
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q)
    );
  }

  if (!items.length) {
    const msg = _indState.sidebar === 'favs'
      ? 'No tienes indicadores en Favoritos. Marca la estrella en la lista de Bases técnicas.'
      : 'No hay elementos en esta sección.';
    list.innerHTML = `<div class="ind-m-empty">${msg}</div>`;
    return;
  }

  const favs = _indReadFavs();
  list.innerHTML = items.map(i => `
    <div class="ind-m-row" data-id="${i.id}">
      <button class="ind-m-star ${favs.includes(i.id) ? 'is-on' : ''}" data-id="${i.id}" title="Favorito" aria-label="Favorito">
        <svg viewBox="0 0 18 18" width="16" height="16">
          <path d="M9 1.7 l2.18 4.42 4.88.71 -3.53 3.44 .83 4.85 L9 12.84 4.64 15.12 5.47 10.27 1.94 6.83 6.82 6.12 Z"
                fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="ind-m-name">${i.name}</span>
      <span class="ind-m-cat">${i.category}</span>
      <button class="ind-m-add" data-id="${i.id}" title="Añadir al gráfico" aria-label="Añadir">+</button>
    </div>
  `).join('');
}

/* =========================================================================
   WATCHLIST PANEL
   ========================================================================= */

function ensureWatchPanel() {
  let p = document.getElementById('watchPanel');
  if (!p) {
    p = document.createElement('div');
    p.id = 'watchPanel';
    p.className = 'side-panel';
    p.innerHTML = `
      <div class="sp-head">
        <span class="sp-title">Lista de seguimiento</span>
        <button class="sp-add" id="watchAdd" title="Añadir símbolo">＋</button>
        <button class="sp-x" id="watchClose" title="Cerrar">✕</button>
      </div>
      <div class="sp-addbar" id="watchAddBar" style="display:none">
        <input class="sym-input" id="watchInput" placeholder="Símbolo (p.ej. AAPL)"/>
      </div>
      <div class="sp-list" id="watchList"></div>
    `;
    document.getElementById('center').appendChild(p);
    p.querySelector('#watchClose').addEventListener('click', () => p.style.display = 'none');
    p.querySelector('#watchAdd').addEventListener('click', () => {
      const bar = p.querySelector('#watchAddBar');
      bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
      if (bar.style.display === 'block') p.querySelector('#watchInput').focus();
    });
    p.querySelector('#watchInput').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        const v = ev.target.value.trim().toUpperCase();
        if (v && !state.watchlist.includes(v)) {
          state.watchlist.push(v);
          lsSet(LS.watchlist, state.watchlist);
          renderWatchlist();
        }
        ev.target.value = '';
        p.querySelector('#watchAddBar').style.display = 'none';
      }
    });
  }
  return p;
}

function renderWatchlist() {
  const list = document.getElementById('watchList');
  if (!list) return;
  list.innerHTML = state.watchlist.map(sym => {
    const prof = getSymbolProfile(sym);
    // Generate a snapshot price quickly from mock for display
    const snap = makeWatchSnapshot(sym);
    const upCls = snap.chgPct >= 0 ? 'up' : 'dn';
    return `
      <div class="wl-row" data-sym="${sym}">
        <span class="wl-logo">${sym[0]}</span>
        <span class="wl-sym">${sym}</span>
        <span class="wl-price">${snap.price}</span>
        <span class="wl-chg ${upCls}">${snap.chgPct >= 0 ? '+' : ''}${snap.chgPct.toFixed(2)}%</span>
        <span class="wl-x" title="Eliminar">✕</span>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.wl-row').forEach(row => {
    row.addEventListener('click', (ev) => {
      if (ev.target.classList.contains('wl-x')) {
        state.watchlist = state.watchlist.filter(s => s !== row.dataset.sym);
        lsSet(LS.watchlist, state.watchlist);
        renderWatchlist();
        return;
      }
      loadSymbol(row.dataset.sym);
    });
    row.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      state.watchlist = state.watchlist.filter(s => s !== row.dataset.sym);
      lsSet(LS.watchlist, state.watchlist);
      renderWatchlist();
    });
  });
}

function makeWatchSnapshot(sym) {
  // Tiny deterministic 2-bar snapshot
  // (Avoid full generation cost)
  const prof = getSymbolProfile(sym);
  // Hash to small offset
  let h = 0; for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) & 0xffff;
  const chg = ((h % 1000) / 1000 - 0.5) * prof.vol * 100; // % change
  const price = prof.price * (1 + chg / 100);
  return { price: price.toFixed(prof.price < 5 ? 4 : 2), chgPct: chg };
}

function openWatchPanel() {
  const p = ensureWatchPanel();
  p.style.display = 'flex';
  renderWatchlist();
}

/* =========================================================================
   ALERTS MODAL  (Figma node 5:35094 — 480×475)
   ========================================================================= */

const ALERT_CONDITIONS = [
  'Cruce', 'Cruce por encima', 'Cruce por debajo',
  'Mayor que', 'Menor que',
  'Entra en canal', 'Sale del canal',
  'Dentro del canal', 'Fuera del canal',
  'Movimiento al alza', 'Movimiento a la baja',
  'Cambio porcentual',
];

const ALERT_TRIGGERS = [
  'Solo una vez', 'Una vez por barra', 'Una vez por barra cerrada', 'Una vez por minuto',
];

const ALERT_NOTIF_KEYS = [
  { id: 'app',   label: 'App' },
  { id: 'popup', label: 'Notificaciones emergentes' },
  { id: 'email', label: 'Correo electrónico' },
  { id: 'sound', label: 'Sonido' },
  { id: 'mobile', label: 'Notificación móvil' },
  { id: 'webhook', label: 'Webhook URL' },
];

function _alertDefaultExpiry() {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const pad = n => String(n).padStart(2,'0');
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} a las ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _alertExpiryISO() {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const _alState = {
  condition: 'Cruce',
  source: 'Precio',
  value: 0,
  trigger: 'Solo una vez',
  expiry: '',
  message: '',
  notifs: { app: true, popup: true, email: true, sound: true, mobile: false, webhook: false },
};

function openAlertModal() {
  closeAlertModal();

  const lastPrice = _ctx?.lastCandle?.close ?? 100;
  _alState.value = +lastPrice.toFixed(2);
  _alState.expiry = _alertExpiryISO();
  _alState.message = `${state.symbol} ${_alState.condition} ${String(_alState.value).replace('.', ',')}`;
  const expiryLabel = _alertDefaultExpiry();

  const back = document.createElement('div');
  back.id = 'alertModalBack';
  back.className = 'al-modal-back';

  const m = document.createElement('div');
  m.id = 'alertModal';
  m.className = 'al-modal';
  m.innerHTML = `
    <!-- Header -->
    <div class="al-m-head">
      <div class="al-m-title">Crear alerta sobre</div>
      <div class="al-m-symbol-pill" id="alMSymPill">
        <span class="al-m-sym-icon" aria-hidden="true">
          <img src="/src/icons/46fd424b-7a01-44d7-b204-e7e5c6dbcb19.svg" alt=""/>
        </span>
        <span class="al-m-sym-name">${state.symbol}</span>
        <span class="al-m-sym-chev" aria-hidden="true">
          <img src="/src/icons/5f02451e-6a34-4c09-b3d6-232939a6bb7c.svg" alt=""/>
        </span>
      </div>
      <div class="al-m-head-actions">
        <button class="al-m-icon-btn" id="alMSettings" title="Configuración" aria-label="Configuración">
          <img src="/src/icons/dadc2e13-e071-4f6f-9ec5-88c7fb354149.svg" alt=""/>
        </button>
        <button class="al-m-icon-btn" id="alMX" title="Cerrar" aria-label="Cerrar">
          <img src="/src/icons/398e96b5-cd4e-4d47-a025-a0b128f1d6d0.svg" alt=""/>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="al-m-content">

      <!-- Condición -->
      <div class="al-m-field al-m-field-condition">
        <div class="al-m-legend">Condición</div>
        <div class="al-m-controls">
          <div class="al-m-row">
            <div class="al-m-select" id="alMSourceSelect">
              <span class="al-m-select-label" id="alMSourceLabel">Precio</span>
              <span class="al-m-select-chev"><img src="/src/icons/bc2f9040-81e9-4886-84f3-7b28c3c0f10d.svg" alt=""/></span>
            </div>
          </div>
          <div class="al-m-row">
            <div class="al-m-select" id="alMCondSelect">
              <span class="al-m-select-label" id="alMCondLabel">${_alState.condition}</span>
              <span class="al-m-select-chev"><img src="/src/icons/bc2f9040-81e9-4886-84f3-7b28c3c0f10d.svg" alt=""/></span>
            </div>
          </div>
          <div class="al-m-row al-m-row-split">
            <div class="al-m-select al-m-select-fixed">
              <span class="al-m-select-label">Valor</span>
              <span class="al-m-select-chev"><img src="/src/icons/bc2f9040-81e9-4886-84f3-7b28c3c0f10d.svg" alt=""/></span>
            </div>
            <div class="al-m-numwrap">
              <input id="alMValue" class="al-m-num" type="text" inputmode="decimal" value="${String(_alState.value).replace('.', ',')}"/>
              <div class="al-m-num-steppers">
                <button class="al-m-step" id="alMStepUp" aria-label="Aumentar">
                  <img src="/src/icons/c3824bcf-0716-45d5-88d7-1982302dae8b.svg" alt=""/>
                </button>
                <button class="al-m-step" id="alMStepDown" aria-label="Disminuir">
                  <img src="/src/icons/a98c3495-e374-46df-9b13-7c20dbac44d7.svg" alt=""/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add condition link -->
      <div class="al-m-addrow">
        <button class="al-m-addcond" id="alMAddCond">
          <span class="al-m-addcond-plus"><img src="/src/icons/7e0d8cd1-eb4d-4200-ba6a-3e1d40985636.svg" alt=""/></span>
          <span>Añadir condición</span>
        </button>
        <span class="al-m-hint" title="Ayuda">
          <img src="/src/icons/0bdf5c47-2897-4d0d-8885-bfa43884b052.svg" alt=""/>
        </span>
      </div>

      <div class="al-m-spacer"></div>

      <!-- Activación -->
      <div class="al-m-field al-m-field-inline">
        <div class="al-m-legend">Activación</div>
        <div class="al-m-controls">
          <button class="al-m-inlineval" id="alMTriggerBtn">
            <span id="alMTriggerLabel">${_alState.trigger}</span>
            <span class="al-m-inlineval-chev"><img src="/src/icons/f33914e6-8ee1-4559-aabe-24d5ec21b292.svg" alt=""/></span>
          </button>
        </div>
      </div>

      <!-- Vencimiento -->
      <div class="al-m-field al-m-field-inline">
        <div class="al-m-legend">Vencimiento</div>
        <div class="al-m-controls">
          <button class="al-m-inlineval" id="alMExpiryBtn">
            <span id="alMExpiryLabel">${expiryLabel}</span>
            <span class="al-m-inlineval-chev"><img src="/src/icons/db75606a-e362-4792-b059-bc26e92bd566.svg" alt=""/></span>
          </button>
          <input type="datetime-local" id="alMExpiryInput" class="al-m-hidden-input" value="${_alState.expiry}"/>
        </div>
      </div>

      <!-- Mensaje -->
      <div class="al-m-field al-m-field-inline">
        <div class="al-m-legend">Mensaje</div>
        <div class="al-m-controls">
          <button class="al-m-inlineval" id="alMMsgBtn">
            <span id="alMMsgLabel">${_alState.message}</span>
            <span class="al-m-inlineval-chev"><img src="/src/icons/9b247a09-d08a-4b07-a570-53b26c435527.svg" alt=""/></span>
          </button>
          <input type="text" id="alMMsgInput" class="al-m-hidden-input" value="${_alState.message}"/>
        </div>
      </div>

      <!-- Notificaciones -->
      <div class="al-m-field al-m-field-inline">
        <div class="al-m-legend">Notificaciones</div>
        <div class="al-m-controls">
          <button class="al-m-inlineval" id="alMNotifBtn">
            <span id="alMNotifLabel">${_alertNotifsLabel()}</span>
            <span class="al-m-inlineval-chev"><img src="/src/icons/bb04adf2-ff0b-43b8-8d2b-4f2ee84ff697.svg" alt=""/></span>
          </button>
          <div class="al-m-popover" id="alMNotifPop" style="display:none">
            ${ALERT_NOTIF_KEYS.map(n => `
              <label class="al-m-popover-item">
                <input type="checkbox" data-nk="${n.id}" ${_alState.notifs[n.id] ? 'checked' : ''}/>
                <span>${n.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="al-m-footer">
      <button class="al-m-btn al-m-btn-secondary" id="alMCancel">Cancelar</button>
      <button class="al-m-btn al-m-btn-primary" id="alMCreate">Crear</button>
    </div>

    <!-- Generic select popovers -->
    <div class="al-m-popover al-m-popover-select" id="alMCondPop" style="display:none">
      ${ALERT_CONDITIONS.map(c => `<div class="al-m-popover-opt" data-v="${c}">${c}</div>`).join('')}
    </div>
    <div class="al-m-popover al-m-popover-select" id="alMTriggerPop" style="display:none">
      ${ALERT_TRIGGERS.map(c => `<div class="al-m-popover-opt" data-v="${c}">${c}</div>`).join('')}
    </div>
  `;

  const center = document.getElementById('center') || document.body;
  center.appendChild(back);
  center.appendChild(m);

  back.addEventListener('click', closeAlertModal);
  m.querySelector('#alMX').addEventListener('click', closeAlertModal);
  m.querySelector('#alMCancel').addEventListener('click', closeAlertModal);

  // Value stepper
  const valInput = m.querySelector('#alMValue');
  const bump = (delta) => {
    const cur = parseFloat(String(valInput.value).replace(',', '.')) || 0;
    const next = +(cur + delta).toFixed(2);
    valInput.value = String(next).replace('.', ',');
    _alState.value = next;
    _refreshMessage(m);
  };
  m.querySelector('#alMStepUp').addEventListener('click', () => bump(0.01));
  m.querySelector('#alMStepDown').addEventListener('click', () => bump(-0.01));
  valInput.addEventListener('input', () => {
    const n = parseFloat(String(valInput.value).replace(',', '.'));
    if (isFinite(n)) { _alState.value = n; _refreshMessage(m); }
  });

  // Condition select
  const condSel = m.querySelector('#alMCondSelect');
  const condPop = m.querySelector('#alMCondPop');
  condSel.addEventListener('click', (e) => {
    e.stopPropagation();
    _alCloseAllPops(m);
    const r = condSel.getBoundingClientRect();
    const pr = m.getBoundingClientRect();
    condPop.style.left = (r.left - pr.left) + 'px';
    condPop.style.top  = (r.bottom - pr.top + 2) + 'px';
    condPop.style.width = r.width + 'px';
    condPop.style.display = 'block';
  });
  condPop.addEventListener('click', (e) => {
    const opt = e.target.closest('.al-m-popover-opt');
    if (!opt) return;
    _alState.condition = opt.dataset.v;
    m.querySelector('#alMCondLabel').textContent = opt.dataset.v;
    condPop.style.display = 'none';
    _refreshMessage(m);
  });

  // Trigger select
  const trigBtn = m.querySelector('#alMTriggerBtn');
  const trigPop = m.querySelector('#alMTriggerPop');
  trigBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    _alCloseAllPops(m);
    const r = trigBtn.getBoundingClientRect();
    const pr = m.getBoundingClientRect();
    trigPop.style.right = (pr.right - r.right) + 'px';
    trigPop.style.top   = (r.bottom - pr.top + 2) + 'px';
    trigPop.style.minWidth = '200px';
    trigPop.style.display = 'block';
  });
  trigPop.addEventListener('click', (e) => {
    const opt = e.target.closest('.al-m-popover-opt');
    if (!opt) return;
    _alState.trigger = opt.dataset.v;
    m.querySelector('#alMTriggerLabel').textContent = opt.dataset.v;
    trigPop.style.display = 'none';
  });

  // Expiry — hidden datetime input fronted by button
  const expBtn = m.querySelector('#alMExpiryBtn');
  const expInp = m.querySelector('#alMExpiryInput');
  expBtn.addEventListener('click', () => {
    expInp.showPicker?.();
    expInp.focus();
  });
  expInp.addEventListener('change', () => {
    _alState.expiry = expInp.value;
    const d = new Date(expInp.value);
    if (!isNaN(d.getTime())) {
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const pad = n => String(n).padStart(2,'0');
      m.querySelector('#alMExpiryLabel').textContent =
        `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} a las ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  });

  // Message — hidden text input fronted by button
  const msgBtn = m.querySelector('#alMMsgBtn');
  const msgInp = m.querySelector('#alMMsgInput');
  msgBtn.addEventListener('click', () => {
    msgInp.style.display = 'block';
    msgBtn.style.display = 'none';
    msgInp.focus();
    msgInp.select();
  });
  const commitMsg = () => {
    _alState.message = msgInp.value;
    m.querySelector('#alMMsgLabel').textContent = msgInp.value || ' ';
    msgInp.style.display = 'none';
    msgBtn.style.display = '';
  };
  msgInp.addEventListener('blur', commitMsg);
  msgInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitMsg(); });

  // Notifications popover
  const notifBtn = m.querySelector('#alMNotifBtn');
  const notifPop = m.querySelector('#alMNotifPop');
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    _alCloseAllPops(m);
    const r = notifBtn.getBoundingClientRect();
    const pr = m.getBoundingClientRect();
    notifPop.style.right = (pr.right - r.right) + 'px';
    notifPop.style.top   = (r.bottom - pr.top + 2) + 'px';
    notifPop.style.minWidth = '220px';
    notifPop.style.display = 'block';
  });
  notifPop.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type=checkbox]');
    if (!cb) return;
    _alState.notifs[cb.dataset.nk] = cb.checked;
    m.querySelector('#alMNotifLabel').textContent = _alertNotifsLabel();
  });

  // Add condition (UI stub — appends a second condition row visually)
  m.querySelector('#alMAddCond').addEventListener('click', (e) => { e.stopPropagation(); });

  // Outside-click closes popovers
  m.addEventListener('click', () => _alCloseAllPops(m));

  // Create
  m.querySelector('#alMCreate').addEventListener('click', async () => {
    const price = parseFloat(String(valInput.value).replace(',', '.'));
    if (!isFinite(price)) return;

    // Map Spanish condition to internal op
    const cond = _alState.condition;
    let op = 'above';
    if (/encima|Mayor/.test(cond))      op = 'above';
    else if (/debajo|Menor/.test(cond)) op = 'below';
    else                                op = 'above'; // Cruce default

    // Request notification permission if needed
    if ((_alState.notifs.popup || _alState.notifs.app) && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }

    const a = {
      id: 'a_' + Date.now(),
      symbol: state.symbol,
      op,
      price,
      fired: false,
      condition: cond,
      trigger: _alState.trigger,
      expiry: _alState.expiry,
      message: _alState.message,
      notifs: { ..._alState.notifs },
    };
    state.alerts.push(a);
    lsSet(LS.alerts, state.alerts);
    drawAlertLine(a);
    closeAlertModal();
  });
}

function closeAlertModal() {
  document.getElementById('alertModalBack')?.remove();
  document.getElementById('alertModal')?.remove();
}

function _alCloseAllPops(m) {
  m.querySelectorAll('.al-m-popover').forEach(p => { p.style.display = 'none'; });
}

function _alertNotifsLabel() {
  const labels = ALERT_NOTIF_KEYS.filter(n => _alState.notifs[n.id]).map(n => n.label);
  return labels.length ? labels.join(', ') : 'Ninguna';
}

function _refreshMessage(m) {
  const v = String(_alState.value).replace('.', ',');
  const msg = `${state.symbol} ${_alState.condition} ${v}`;
  _alState.message = msg;
  const label = m.querySelector('#alMMsgLabel');
  const input = m.querySelector('#alMMsgInput');
  if (label) label.textContent = msg;
  if (input) input.value = msg;
}

/* =========================================================================
   FULLSCREEN / SCREENSHOT
   ========================================================================= */

function toggleFullscreen() {
  const page = document.querySelector('.chart-page');
  if (!page) return;
  if (!document.fullscreenElement) {
    page.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function takeScreenshot() {
  if (!_chart) return;
  try {
    const canvas = _chart.takeScreenshot();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      a.href = url;
      a.download = `${state.symbol}-${state.tf}-${ts}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } catch (e) {
    console.warn('screenshot failed', e);
  }
}

/* =========================================================================
   WIRE TOOLBAR EVENTS
   ========================================================================= */

function wireTopbar() {
  document.getElementById('indicatorsBtn')?.addEventListener('click', () => {
    openIndicatorsModal();
  });
  document.getElementById('chartStyleBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const cur = document.getElementById('chartTypePop');
    if (cur && cur.style.display === 'block') { cur.style.display = 'none'; return; }
    openChartTypeMenu();
  });
  document.getElementById('tfBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const cur = document.getElementById('tfPop');
    if (cur && cur.style.display === 'block') { cur.style.display = 'none'; return; }
    openTfMenu();
  });
  document.getElementById('alertBtn')?.addEventListener('click', () => {
    openAlertModal();
  });
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    openSettingsModal();
  });
  document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);
  document.getElementById('screenshotBtn')?.addEventListener('click', takeScreenshot);
  document.getElementById('modalX')?.addEventListener('click', closeModal);
  document.getElementById('modalBack')?.addEventListener('click', closeModal);

  // Replay panel toggle — wires the buttons to the functional replay engine
  // defined below in the BAR REPLAY MODE block.
  const replayPanel = document.getElementById('replayPanel');
  document.getElementById('replayBtn')?.addEventListener('click', () => {
    const showing = replayPanel.style.display !== 'none';
    if (showing) {
      replayPanel.style.display = 'none';
      exitReplayMode();
    } else {
      replayPanel.style.display = 'flex';
      enterReplayMode();
    }
  });
  document.getElementById('rpClose')?.addEventListener('click', () => {
    replayPanel.style.display = 'none';
    exitReplayMode();
  });
  document.getElementById('rpPlay')?.addEventListener('click', togglePlay);
  document.getElementById('rpPrev')?.addEventListener('click', () => advanceReplay(-1));
  document.getElementById('rpNext')?.addEventListener('click', () => advanceReplay(1));
  document.getElementById('rpSpeed')?.addEventListener('change', (ev) => {
    setReplaySpeed(+ev.target.value);
    const lbl = ev.target.options[ev.target.selectedIndex]?.text || '1x';
    const lblEl = document.getElementById('rpSpeedLabel');
    if (lblEl) lblEl.textContent = lbl.replace('x', '×');
  });
  // Speed button cycles through speeds (0.5× → 1× → 2× → 4× → 10×)
  document.getElementById('rpSpeedBtn')?.addEventListener('click', () => {
    const sel = document.getElementById('rpSpeed');
    if (!sel) return;
    sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
    sel.dispatchEvent(new Event('change'));
  });
  // TF pill in replay panel reflects current timeframe
  const rpTfPill = document.getElementById('rpTfPill');
  if (rpTfPill) rpTfPill.textContent = state.tf || '1m';

  // "Seleccionar barra" dropdown
  const rpSelectBar = document.getElementById('rpSelectBar');
  const rpStartMenu = document.getElementById('rpStartMenu');
  rpSelectBar?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (!rpStartMenu) return;
    if (rpStartMenu.style.display === 'block') {
      rpStartMenu.style.display = 'none';
      return;
    }
    const r = rpSelectBar.getBoundingClientRect();
    const center = document.getElementById('center');
    const cr = center.getBoundingClientRect();
    rpStartMenu.style.left = (r.left - cr.left) + 'px';
    rpStartMenu.style.bottom = (cr.bottom - r.top + 4) + 'px';
    rpStartMenu.style.top = 'auto';
    rpStartMenu.style.display = 'block';
  });
  rpStartMenu?.querySelectorAll('.rp-start-item').forEach(it => {
    it.addEventListener('click', () => {
      rpStartMenu.querySelectorAll('.rp-start-item').forEach(x => x.classList.remove('is-active'));
      it.classList.add('is-active');
      const mode = it.dataset.rs;
      // Apply start point
      if (_ctx && _ctx.candles) {
        const c = _ctx.candles;
        if (mode === 'first' && c.length) {
          const t = c[0].time;
          _chart?.timeScale().setVisibleRange({ from: t, to: c[Math.min(50, c.length - 1)].time });
        } else if (mode === 'random' && c.length) {
          const idx = Math.floor(Math.random() * c.length);
          const t = c[idx].time;
          const t2 = c[Math.min(c.length - 1, idx + 50)].time;
          _chart?.timeScale().setVisibleRange({ from: t, to: t2 });
        }
        // 'bar' = current selection (no change); 'date' = TODO date picker
      }
      rpStartMenu.style.display = 'none';
    });
  });
  // Close start menu on outside click
  document.addEventListener('mousedown', (ev) => {
    if (rpStartMenu && rpStartMenu.style.display === 'block') {
      if (!ev.target.closest('#rpStartMenu') && !ev.target.closest('#rpSelectBar')) {
        rpStartMenu.style.display = 'none';
      }
    }
  });

  // Trade dropdown
  const tradePop = document.getElementById('tradePop');
  document.getElementById('tradeBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (tradePop.style.display === 'block') { tradePop.style.display = 'none'; return; }
    positionPopAtElement(tradePop, 'tradeBtn');
    // anchor to top-right area
    const btn = document.getElementById('tradeBtn').getBoundingClientRect();
    const parent = document.getElementById('center').getBoundingClientRect();
    tradePop.style.left = (btn.right - parent.left - 200) + 'px';
    tradePop.style.top  = (btn.bottom - parent.top + 6) + 'px';
    tradePop.style.display = 'block';
  });

  // === TIER 3 TOOLBAR WIRING (Live, VolProfile, Heatmap, Layout, SimFeed) ===
  try { wireTier3Toolbar(); } catch (e) { console.warn('[tier3] wire failed', e); }

  // Symbol search popup
  const symPop = document.getElementById('symPop');
  const symInput = document.getElementById('symInput');
  const symList = document.getElementById('symList');
  document.getElementById('symbolPill')?.addEventListener('click', (ev) => {
    if (ev.target.closest('.tb-symbol-add')) return;
    ev.stopPropagation();
    openSymbolSearchModal();
  });
  symInput?.addEventListener('input', () => renderSymList(symList, symInput.value));
  symList?.addEventListener('click', (ev) => {
    const it = ev.target.closest('.sym-item');
    if (!it) return;
    symPop.style.display = 'none';
    loadSymbol(it.dataset.sym);
  });

  // Compare popup
  const cmpPop = document.getElementById('cmpPop');
  const cmpInput = document.getElementById('cmpInput');
  const cmpList = document.getElementById('cmpList');
  document.getElementById('compareBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    positionPopAtElement(cmpPop, 'compareBtn');
    renderSymList(cmpList);
    cmpPop.style.display = 'block';
    setTimeout(() => cmpInput.focus(), 0);
  });
  document.getElementById('symbolAddBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openCompareModal();
  });
  cmpInput?.addEventListener('input', () => renderSymList(cmpList, cmpInput.value));
  cmpInput?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const v = cmpInput.value.trim().toUpperCase();
      if (v) { addCompareSeries(v); cmpInput.value = ''; cmpPop.style.display = 'none'; }
    }
  });
  cmpList?.addEventListener('click', (ev) => {
    const it = ev.target.closest('.sym-item');
    if (!it || !_ctx) return;
    addCompareSeries(it.dataset.sym);
    cmpPop.style.display = 'none';
  });

  // Bottom range pills change visible range
  document.querySelectorAll('.bb-range').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bb-range').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!_ctx) return;
      const days = { '1D':1,'5D':5,'1M':22,'3M':66,'6M':130,'YTD':110,'1A':252,'5A':1260,'Todos':99999 }[btn.dataset.range] || 252;
      const candles = _ctx.candles;
      const lastT = candles[candles.length - 1].time;
      const startIdx = Math.max(0, candles.length - days);
      const startT = candles[startIdx].time;
      _chart.timeScale().setVisibleRange({ from: startT, to: lastT });
    });
  });

  // Magnet → opens dropdown (weak/strong + snap toggle)
  document.querySelector('.lb-btn[data-tool="magnet"]')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const tm = document.getElementById('toolMenu');
    if (tm && tm.style.display === 'block') { closeToolMenu(); return; }
    openToolMenu('magnet', ev.currentTarget);
  });

  // Search palette (lightning bolt)
  document.getElementById('searchPaletteBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const pal = document.getElementById('spPalette');
    if (pal && pal.style.display === 'block') { pal.style.display = 'none'; return; }
    openSearchPalette();
  });

  // Generic left-tool active highlight + dropdown opener
  document.querySelectorAll('.lb-btn').forEach(b => {
    b.addEventListener('click', (ev) => {
      if (b.dataset.tool === 'magnet') return; // handled
      document.querySelectorAll('.lb-btn').forEach(x => x.dataset.tool !== 'magnet' && x.classList.remove('lb-active'));
      b.classList.add('lb-active');
      // Open dropdown if this tool has a menu and dropdown arrow area was clicked
      const tool = b.dataset.tool;
      if (LEFT_TOOL_MENUS[tool]) {
        openToolMenu(tool, b);
        ev.stopPropagation();
      } else {
        closeToolMenu();
      }
    });
  });

  // Global click closes popups
  window.addEventListener('mousedown', (ev) => {
    ['symPop','cmpPop','tradePop','chartTypePop','tfPop'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.style.display === 'block' && !ev.target.closest('#' + id) &&
          !ev.target.closest('#symbolPill') && !ev.target.closest('#compareBtn') &&
          !ev.target.closest('#symbolAddBtn') && !ev.target.closest('#tradeBtn') &&
          !ev.target.closest('#chartStyleBtn') && !ev.target.closest('#tfBtn')) {
        el.style.display = 'none';
      }
    });
    // Tool menu (left toolbar drawing-tool dropdowns)
    const tm = document.getElementById('toolMenu');
    if (tm && tm.style.display === 'block') {
      if (!ev.target.closest('#toolMenu') && !ev.target.closest('.lb-btn')) {
        closeToolMenu();
      }
    }
    // Search palette
    const pal = document.getElementById('spPalette');
    if (pal && pal.style.display === 'block') {
      if (!ev.target.closest('#spPalette') && !ev.target.closest('#searchPaletteBtn')) {
        pal.style.display = 'none';
      }
    }
  });

  // Right-sidebar icon handlers (watchlist is first)
  const rbBtns = document.querySelectorAll('.rb-icon');
  rbBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (idx === 0) { openWatchPanel(); return; }            // Watchlist (compat)
      if (idx === 1) { openAlertManagerPanel(); return; }     // Alertas
      if (idx === 2) { openObjectTreePanel(); return; }       // Árbol de objetos y ventana de datos
      if (idx === 3) { openTradingPanelSidebar(); return; }   // Chats → reusar como trading panel
      if (idx === 4) { openCalendarSidePanel(); return; }     // Calendario económico
      if (idx === 5) { openNewsIdeasPanel('news'); return; }  // Calendario noticias
      if (idx === 6) { openNewsIdeasPanel('ideas'); return; } // Ideas publicadas
      // Stub: open a generic side panel
      openStubPanel(RIGHT_ICONS[idx]?.title || 'Panel');
    });
  });

  // Symbol info button (ⓘ inside the symbol pill)
  document.getElementById('symbolInfoBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    try { openSymbolInfoModal(state.symbol); } catch (e) { console.error('[symbol-info]', e); }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') {
      if (ev.key === 'Escape') ev.target.blur();
      return;
    }
    if (ev.key === 'Escape') {
      if (_ctx && _ctx.drawingMode) { cancelTrendlineMode(); return; }
      if (_ctx && _ctx.selectedDrawingId) { selectDrawing(null); }
      closeModal();
      closeIndicatorsModal();
      closeAlertModal();
      closeCompareModal();
      closeAllPops();
      const ctxM = document.getElementById('ctxMenu'); if (ctxM) ctxM.style.display = 'none';
      const wp = document.getElementById('watchPanel'); if (wp) wp.style.display = 'none';
      const tcm = document.getElementById('trendCtxMenu'); if (tcm) tcm.style.display = 'none';
      return;
    }
    if (!_chart) return;
    if (ev.key === '\\') {
      _ctx.magnet = !_ctx.magnet;
      _chart.applyOptions({ crosshair: { mode: _ctx.magnet ? CrosshairMode.Magnet : CrosshairMode.Normal } });
    } else if (ev.key === '+' || ev.key === '=') {
      const ts = _chart.timeScale();
      const r = ts.getVisibleRange(); if (!r) return;
      const mid = (r.from + r.to) / 2;
      const half = (r.to - r.from) * 0.4;
      ts.setVisibleRange({ from: mid - half, to: mid + half });
    } else if (ev.key === '-') {
      const ts = _chart.timeScale();
      const r = ts.getVisibleRange(); if (!r) return;
      const mid = (r.from + r.to) / 2;
      const half = (r.to - r.from) * 0.6;
      ts.setVisibleRange({ from: mid - half, to: mid + half });
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      const ts = _chart.timeScale();
      const r = ts.getVisibleRange(); if (!r) return;
      const step = (r.to - r.from) * 0.1 * (ev.key === 'ArrowRight' ? 1 : -1);
      ts.setVisibleRange({ from: r.from + step, to: r.to + step });
    } else if (ev.key === 'z' && (ev.ctrlKey || ev.metaKey)) {
      console.log('[chart] Ctrl+Z (undo not implemented)');
    } else if (ev.key === 'f' || ev.key === 'F') {
      toggleFullscreen();
    } else if (ev.key === ',') {
      openSettingsModal();
    } else if (ev.altKey && (ev.key === 'i' || ev.key === 'I')) {
      ev.preventDefault();
      openIndicatorsModal();
    } else if (ev.altKey && (ev.key === 't' || ev.key === 'T')) {
      ev.preventDefault();
      activateTrendlineMode();
    } else if ((ev.key === 'Delete' || ev.key === 'Backspace') && _ctx && _ctx.selectedDrawingId) {
      ev.preventDefault();
      deleteDrawing(_ctx.selectedDrawingId);
    }
  });
}

function _openSidePanel(id, title, mountFn) {
  let p = document.getElementById(id);
  const center = document.getElementById('center');
  if (!p) {
    p = document.createElement('div');
    p.id = id;
    p.className = 'side-panel';
    p.style.cssText = 'position:absolute;top:0;right:46px;width:380px;height:100%;background:#131722;border-left:1px solid #2a2e39;display:flex;flex-direction:column;z-index:30';
    p.innerHTML = `
      <div class="sp-head" style="padding:10px 14px;border-bottom:1px solid #2a2e39;display:flex;justify-content:space-between;align-items:center">
        <span class="sp-title" style="font-size:13px;font-weight:600;color:#d1d4dc">${title}</span>
        <button class="sp-x" style="background:none;border:none;color:#787b86;font-size:18px;cursor:pointer">✕</button>
      </div>
      <div class="sp-body" id="${id}-body" style="flex:1;overflow:auto;padding:0"></div>`;
    center.appendChild(p);
    p.querySelector('.sp-x').addEventListener('click', () => { p.style.display = 'none'; });
    try { mountFn(p.querySelector('.sp-body')); } catch (e) { console.error('[side-panel mount]', e); }
  }
  p.style.display = 'flex';
}

function openAlertManagerPanel() {
  _openSidePanel('alertMgrPanel', 'Gestor de alertas', (mount) => {
    const mgr = createAlertManager(mount, {});
    mgr.render();
  });
}

function openObjectTreePanel() {
  _openSidePanel('objectTreePanel', 'Árbol de objetos · Ventana de datos', (mount) => {
    mount.style.padding = '0';
    mount.innerHTML = `
      <div id="ot-mount" style="border-bottom:1px solid #2a2e39"></div>
      <div id="dw-mount"></div>`;
    const tree = createObjectTree(mount.querySelector('#ot-mount'), {
      onToggleVisibility: (id, vis) => console.log('visibility', id, vis),
      onDelete: (id) => deleteDrawing?.(id),
      panes: [0, 1, 2],
    });
    // Compose items list from current chart state
    const items = [];
    if (_ctx) {
      for (const ind of (_ctx.indicators || [])) {
        items.push({ id: ind.uid, type: 'indicator', name: ind.label || ind.id, visible: ind.visible !== false, paneIndex: ind.paneIndex });
      }
      for (const dr of (_ctx.drawings || [])) {
        items.push({ id: dr.id, type: 'drawing', name: dr.kind || 'drawing', visible: true });
      }
      for (const cmp of (_ctx.compares || [])) {
        items.push({ id: cmp.uid, type: 'compare', name: cmp.symbol, visible: cmp.visible !== false });
      }
      for (const al of (state.alerts || [])) {
        items.push({ id: al.id, type: 'alert', name: `${al.condition} ${al.value}`, visible: true });
      }
    }
    tree.render(items);
    const dw = createDataWindow(mount.querySelector('#dw-mount'), {});
    dw.render();
    // Push live values on crosshair move
    try {
      _chart.subscribeCrosshairMove((p) => {
        if (!p || !p.time) return;
        const d = p.seriesData.get(_ctx.series);
        if (!d) return;
        const ohlc = { time: p.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: _ctx.volByTime.get(d.time) };
        const indVals = [];
        for (const ind of (_ctx.indicators || [])) {
          const s = ind.seriesList?.[0];
          if (!s) continue;
          const sd = p.seriesData.get(s);
          const v = sd?.value ?? sd?.close;
          if (v != null) indVals.push({ id: ind.uid, name: ind.label || ind.id, color: ind.color, value: v });
        }
        dw.updateValues({ ohlc, indicators: indVals });
      });
    } catch {}
  });
}

function openTradingPanelSidebar() {
  _openSidePanel('tradingSidebar', 'Trading · DOM · Tape', (mount) => {
    mount.style.padding = '0';
    mount.innerHTML = `
      <div id="tp-mount" style="border-bottom:1px solid #2a2e39;padding:8px"></div>
      <div id="dom-mount" style="border-bottom:1px solid #2a2e39;height:280px;overflow:hidden"></div>
      <div id="ts-mount" style="height:240px;overflow:hidden"></div>`;
    const symbol = state.symbol || 'NVDA';
    const price = _ctx?.lastCandle?.close || 100;
    const tp = createTradingPanel(mount.querySelector('#tp-mount'), { symbol, price, equity: 100000, onOrder: (o) => console.log('order', o) });
    const dom = createDOMPanel(mount.querySelector('#dom-mount'), { symbol, price, onPriceClick: (p) => tp.setLimitPrice?.(p) });
    const ts = createTimeSalesPanel(mount.querySelector('#ts-mount'), { symbol, price });
    tp.render(); dom.render(); ts.render();
  });
}

function openCalendarSidePanel() {
  _openSidePanel('calendarSidebar', 'Calendario económico', (mount) => {
    const w = createEconomicCalendar(mount, { eventCount: 40 });
    w.render();
  });
}

function openNewsIdeasPanel(defaultTab = 'news') {
  const id = 'newsIdeasPanel';
  const existing = document.getElementById(id);
  if (existing) { existing.style.display = 'flex'; return; }
  _openSidePanel(id, defaultTab === 'ideas' ? 'Ideas' : 'Noticias', (mount) => {
    const pane = createNewsIdeasPane(mount, {
      defaultTab,
      onSelectSymbol: (sym) => { window.location.hash = '#/chart/' + sym; },
    });
    pane.render();
  });
}

function openStubPanel(title) {
  let p = document.getElementById('stubPanel');
  if (!p) {
    p = document.createElement('div');
    p.id = 'stubPanel';
    p.className = 'side-panel';
    p.innerHTML = `
      <div class="sp-head">
        <span class="sp-title" id="stubTitle">${title}</span>
        <button class="sp-x" id="stubClose">✕</button>
      </div>
      <div class="sp-body" style="padding:16px;color:var(--grey-55);font-size:13px">Panel próximamente</div>
    `;
    document.getElementById('center').appendChild(p);
    p.querySelector('#stubClose').addEventListener('click', () => p.style.display = 'none');
  }
  document.getElementById('stubTitle').textContent = title;
  p.style.display = 'flex';
}

/* =========================================================================
   CLOCK
   ========================================================================= */
function startClock() {
  const el = document.getElementById('bb-clock');
  const tick = () => {
    if (!el) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const tz = -now.getTimezoneOffset() / 60;
    el.textContent = `${hh}:${mm}:${ss} UTC${tz >= 0 ? '+' : ''}${tz}`;
  };
  tick();
  return setInterval(tick, 1000);
}

let _clockId = null;

/* =========================================================================
   DRAWINGS — Trendlines (lightweight-charts LineSeries-based)
   =========================================================================
   state.drawings: [{ id, type:'trendline', p1:{time,price}, p2:{time,price}, color }]
   _ctx.drawings:  [{ id, def, series, endpointSeries, visible }]
   ========================================================================= */
function _genId() {
  return 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _trendSeriesOpts(color, selected, dashed) {
  return {
    color,
    lineWidth: 2,
    lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    pointMarkersVisible: false,
    autoscaleInfoProvider: () => null,
  };
}

function _candleRangeContains(time) {
  if (!_ctx || !_ctx.candles || !_ctx.candles.length) return false;
  const t0 = _ctx.candles[0].time;
  const tN = _ctx.candles[_ctx.candles.length - 1].time;
  return time >= t0 && time <= tN;
}

function _findNearestCandleTime(time) {
  if (!_ctx || !_ctx.candles || !_ctx.candles.length) return time;
  const candles = _ctx.candles;
  // binary search
  let lo = 0, hi = candles.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time < time) lo = mid + 1; else hi = mid;
  }
  const a = candles[Math.max(0, lo - 1)].time;
  const b = candles[lo].time;
  return Math.abs(a - time) < Math.abs(b - time) ? a : b;
}

function _renderTrendlineSeries(d) {
  // Sort the two endpoints by time (LWC requires ascending time)
  let p1 = d.def.p1, p2 = d.def.p2;
  if (p1.time > p2.time) { const t = p1; p1 = p2; p2 = t; }
  d.series.applyOptions(_trendSeriesOpts(d.def.color || '#2962ff', d.selected, false));
  d.series.setData([
    { time: p1.time, value: p1.price },
    { time: p2.time, value: p2.price },
  ]);
}

function _createDrawingFromDef(def) {
  const series = _chart.addSeries(LineSeries, _trendSeriesOpts(def.color || '#2962ff', false, false));
  const rec = { id: def.id, def, series, selected: false, visible: true };
  _renderTrendlineSeries(rec);
  _ctx.drawings.push(rec);
  return rec;
}

function _removeDrawingRecord(rec) {
  try { _chart.removeSeries(rec.series); } catch {}
  _ctx.drawings = _ctx.drawings.filter(d => d.id !== rec.id);
}

function _drawingCoords(rec) {
  // Returns {x1,y1,x2,y2} or null if any endpoint can't be projected
  const ts = _chart.timeScale();
  const x1 = ts.timeToCoordinate(rec.def.p1.time);
  const x2 = ts.timeToCoordinate(rec.def.p2.time);
  const y1 = _ctx.series.priceToCoordinate(rec.def.p1.price);
  const y2 = _ctx.series.priceToCoordinate(rec.def.p2.price);
  if (x1 == null || x2 == null || y1 == null || y2 == null) return null;
  return { x1, y1, x2, y2 };
}

function _distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function _ensureHandleOverlay(container) {
  let ov = document.getElementById('drawOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'drawOverlay';
    ov.style.position = 'absolute';
    ov.style.inset = '0';
    ov.style.pointerEvents = 'none';
    container.appendChild(ov);
  }
  return ov;
}

function _renderHandles(container) {
  const ov = _ensureHandleOverlay(container);
  ov.innerHTML = '';
  for (const rec of _ctx.drawings) {
    if (!rec.selected) continue;
    const c = _drawingCoords(rec);
    if (!c) continue;
    for (const [which, x, y] of [['p1', c.x1, c.y1], ['p2', c.x2, c.y2]]) {
      const h = document.createElement('div');
      h.className = 'trendline-handle';
      h.style.left = x + 'px';
      h.style.top = y + 'px';
      h.dataset.drawingId = rec.id;
      h.dataset.endpoint = which;
      ov.appendChild(h);
    }
  }
}

function selectDrawing(id) {
  if (!_ctx) return;
  _ctx.selectedDrawingId = id;
  for (const d of _ctx.drawings) {
    const sel = d.id === id;
    if (d.selected !== sel) {
      d.selected = sel;
      d.series.applyOptions({ lineWidth: sel ? 3 : 2 });
    }
  }
  _renderHandles(_ctx.container);
}

function deleteDrawing(id) {
  if (!_ctx) return;
  const rec = _ctx.drawings.find(d => d.id === id);
  if (rec) _removeDrawingRecord(rec);
  state.drawings = state.drawings.filter(d => d.id !== id);
  saveDrawings();
  if (_ctx.selectedDrawingId === id) _ctx.selectedDrawingId = null;
  _renderHandles(_ctx.container);
  const tcm = document.getElementById('trendCtxMenu');
  if (tcm) tcm.style.display = 'none';
}

function activateTrendlineMode() {
  if (!_ctx || !_chart) return;
  if (_ctx.drawingMode) return;
  _ctx.drawingMode = 'trendline';
  _ctx.drawingFirstPoint = null;
  _ctx.container.classList.add('drawing-mode');
  // Activate the trend tool button visually
  const btn = document.querySelector('.lb-btn[data-tool="trend"]');
  if (btn) btn.classList.add('lb-active');
  selectDrawing(null);
}

function cancelTrendlineMode() {
  if (!_ctx) return;
  _ctx.drawingMode = null;
  _ctx.drawingFirstPoint = null;
  _ctx.container.classList.remove('drawing-mode');
  // Remove preview series if any
  if (_ctx.previewSeries) {
    try { _chart.removeSeries(_ctx.previewSeries); } catch {}
    _ctx.previewSeries = null;
  }
  // Deactivate tool button visual state
  const btn = document.querySelector('.lb-btn[data-tool="trend"]');
  if (btn) btn.classList.remove('lb-active');
}

function _finishTrendline(p1, p2) {
  const def = {
    id: _genId(),
    type: 'trendline',
    p1: { time: p1.time, price: p1.price },
    p2: { time: p2.time, price: p2.price },
    color: '#2962ff',
  };
  state.drawings.push(def);
  saveDrawings();
  _createDrawingFromDef(def);
  cancelTrendlineMode();
}

function _showTrendCtxMenu(container, clientX, clientY, drawingId) {
  let m = document.getElementById('trendCtxMenu');
  if (!m) {
    m = document.createElement('div');
    m.id = 'trendCtxMenu';
    m.className = 'trendline-context-menu';
    container.appendChild(m);
  }
  m.innerHTML = `<div data-act="delete">Eliminar línea</div>`;
  const r = container.getBoundingClientRect();
  m.style.left = (clientX - r.left) + 'px';
  m.style.top = (clientY - r.top) + 'px';
  m.style.display = 'block';
  m.onclick = (ev) => {
    const act = ev.target.dataset?.act;
    m.style.display = 'none';
    if (act === 'delete') deleteDrawing(drawingId);
  };
}

function initDrawings(container) {
  // Initialize drawings array on context
  _ctx.drawings = [];
  _ctx.drawingMode = null;
  _ctx.drawingFirstPoint = null;
  _ctx.previewSeries = null;
  _ctx.selectedDrawingId = null;

  // Restore persisted drawings whose time range is valid
  for (const def of state.drawings) {
    if (def.type !== 'trendline') continue;
    if (!_candleRangeContains(def.p1.time) || !_candleRangeContains(def.p2.time)) continue;
    try { _createDrawingFromDef(def); } catch (e) { console.warn('[drawings] restore failed', e); }
  }

  // Click handler on chart container (capture phase, before LWC processes pan)
  // We use mousedown so we can also handle drag-start on handles.
  const overlay = _ensureHandleOverlay(container);

  // Drag handle logic
  let dragging = null; // {recId, endpoint}
  overlay.addEventListener('mousedown', (ev) => {
    const h = ev.target.closest('.trendline-handle');
    if (!h) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging = { recId: h.dataset.drawingId, endpoint: h.dataset.endpoint };
  });

  window.addEventListener('mousemove', (ev) => {
    if (!dragging || !_ctx) return;
    const rec = _ctx.drawings.find(d => d.id === dragging.recId);
    if (!rec) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const ts = _chart.timeScale();
    let time = ts.coordinateToTime(x);
    if (time == null && _ctx.candles && _ctx.candles.length) time = _ctx.candles[_ctx.candles.length - 1].time;
    if (time == null) return;
    // Snap to nearest candle
    time = _findNearestCandleTime(time);
    const price = _ctx.series.coordinateToPrice(y);
    if (price == null) return;
    rec.def[dragging.endpoint] = { time, price };
    _renderTrendlineSeries(rec);
    _renderHandles(container);
  });

  window.addEventListener('mouseup', () => {
    if (dragging) {
      // Persist updated def
      const rec = _ctx.drawings.find(d => d.id === dragging.recId);
      if (rec) {
        const sd = state.drawings.find(d => d.id === rec.id);
        if (sd) { sd.p1 = rec.def.p1; sd.p2 = rec.def.p2; saveDrawings(); }
      }
      dragging = null;
    }
  });

  // Click on chart: drawing-mode anchor OR selection hit-test
  container.addEventListener('click', (ev) => {
    if (!_ctx) return;
    // Ignore clicks on UI overlays / handles
    if (ev.target.closest('.trendline-handle, .trendline-context-menu, .legend, .replay-panel, .ctx-menu, .modal, .sym-pop, .trade-pop, .pane-resize')) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const ts = _chart.timeScale();
    let time = ts.coordinateToTime(x);
    const price = _ctx.series.coordinateToPrice(y);
    if (_ctx.drawingMode === 'trendline') {
      // Fallback: if click is past the last candle, use last candle's time
      if (time == null && _ctx.candles && _ctx.candles.length) {
        time = _ctx.candles[_ctx.candles.length - 1].time;
      }
      if (time == null || price == null) return;
      time = _findNearestCandleTime(time);
      const point = { time, price };
      if (!_ctx.drawingFirstPoint) {
        _ctx.drawingFirstPoint = point;
        // Create preview series
        _ctx.previewSeries = _chart.addSeries(LineSeries, _trendSeriesOpts('#2962ff', false, true));
        _ctx.previewSeries.setData([{ time, value: price }]);
      } else {
        const p1 = _ctx.drawingFirstPoint;
        // Remove preview before adding committed series
        if (_ctx.previewSeries) {
          try { _chart.removeSeries(_ctx.previewSeries); } catch {}
          _ctx.previewSeries = null;
        }
        _finishTrendline(p1, point);
      }
      return;
    }
    // Selection hit-test
    let hit = null;
    let hitDist = 6;
    for (const rec of _ctx.drawings) {
      const c = _drawingCoords(rec);
      if (!c) continue;
      const d = _distPointToSegment(x, y, c.x1, c.y1, c.x2, c.y2);
      if (d < hitDist) { hitDist = d; hit = rec; }
    }
    if (hit) {
      selectDrawing(hit.id);
    } else if (_ctx.selectedDrawingId) {
      selectDrawing(null);
    }
  }, true);

  // Right-click on a trendline → context menu
  container.addEventListener('contextmenu', (ev) => {
    if (!_ctx || !_ctx.drawings.length) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    let hit = null;
    let hitDist = 6;
    for (const rec of _ctx.drawings) {
      const c = _drawingCoords(rec);
      if (!c) continue;
      const d = _distPointToSegment(x, y, c.x1, c.y1, c.x2, c.y2);
      if (d < hitDist) { hitDist = d; hit = rec; }
    }
    if (hit) {
      ev.preventDefault();
      ev.stopPropagation();
      selectDrawing(hit.id);
      // hide the standard chart ctx menu if it appeared
      const stdCtx = document.getElementById('ctxMenu');
      if (stdCtx) stdCtx.style.display = 'none';
      _showTrendCtxMenu(container, ev.clientX, ev.clientY, hit.id);
    }
  }, true);

  // Hide ctx-menu on outside click
  window.addEventListener('mousedown', (ev) => {
    const m = document.getElementById('trendCtxMenu');
    if (m && m.style.display === 'block' && !ev.target.closest('#trendCtxMenu')) {
      m.style.display = 'none';
    }
  });

  // Live preview during trendline drawing + handle reposition on zoom/pan
  _chart.subscribeCrosshairMove((p) => {
    if (_ctx && _ctx.drawingMode === 'trendline' && _ctx.drawingFirstPoint && p && p.point && _ctx.previewSeries) {
      const ts = _chart.timeScale();
      let t = ts.coordinateToTime(p.point.x);
      const pr = _ctx.series.coordinateToPrice(p.point.y);
      if (t == null && _ctx.candles && _ctx.candles.length) t = _ctx.candles[_ctx.candles.length - 1].time;
      if (t == null || pr == null) return;
      t = _findNearestCandleTime(t);
      const p1 = _ctx.drawingFirstPoint;
      let a = p1, b = { time: t, price: pr };
      if (a.time === b.time) {
        // identical x — render single point only to avoid LWC error
        _ctx.previewSeries.setData([{ time: a.time, value: a.price }]);
      } else {
        if (a.time > b.time) { const tmp = a; a = b; b = tmp; }
        _ctx.previewSeries.setData([
          { time: a.time, value: a.price },
          { time: b.time, value: b.price },
        ]);
      }
    }
  });

  // Reposition handles on zoom/pan
  _chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (_ctx) _renderHandles(_ctx.container);
  });
  _chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    if (_ctx) _renderHandles(_ctx.container);
  });

  _renderHandles(container);
}

/* =========================================================================
   INDICATOR SETTINGS MODAL — live editable params per active indicator
   (added: ⚙ icon in legend opens a modal with per-type controls; live apply
    drives entry.seriesList[i].setData() without recreating series; Cancel
    restores snapshot of params+color; Aceptar persists to localStorage.)
   ========================================================================= */

const _INDSET_TITLES = {
  sma: 'SMA', ema: 'EMA', wma: 'WMA', bb: 'Bandas de Bollinger',
  vwap: 'VWAP', ichimoku: 'Ichimoku',
  rsi: 'RSI', macd: 'MACD', stoch: 'Estocástico', cci: 'CCI',
  willr: 'Williams %R', adx: 'ADX', mom: 'Momentum', obv: 'OBV', atr: 'ATR',
};

const _INDSET_SOURCES = [
  ['close','Cierre'], ['open','Apertura'], ['high','Máximo'], ['low','Mínimo'],
  ['hl2','HL2'], ['hlc3','HLC3'], ['ohlc4','OHLC4'],
];

function _indsetMapCandles(candles, src) {
  if (!src || src === 'close') return candles;
  return candles.map(c => {
    let v;
    switch (src) {
      case 'open': v = c.open; break;
      case 'high': v = c.high; break;
      case 'low':  v = c.low;  break;
      case 'hl2':  v = (c.high + c.low) / 2; break;
      case 'hlc3': v = (c.high + c.low + c.close) / 3; break;
      case 'ohlc4':v = (c.open + c.high + c.low + c.close) / 4; break;
      default: v = c.close;
    }
    return { ...c, close: v };
  });
}

function enableIndicatorSettings() {
  document.querySelectorAll('.ind-row .ind-cog').forEach(cog => {
    if (cog.dataset.wired === '1') return;
    cog.dataset.wired = '1';
    cog.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const row = cog.closest('.ind-row');
      const uid = row?.dataset?.uid;
      if (!uid || !_ctx) return;
      const entry = _ctx.indicators.find(x => x.uid === uid);
      if (!entry) return;
      openIndicatorSettingsModal(entry);
    });
  });
}

function _indsetRecompute(entry) {
  if (!_ctx || !_chart) return;
  const candles = _indsetMapCandles(_ctx.candles, entry.params?.source);
  const p = entry.params || {};
  const sl = entry.seriesList;
  try {
    if (entry.id === 'sma' || entry.id === 'ema' || entry.id === 'wma') {
      const fn = entry.id === 'sma' ? SMA : entry.id === 'ema' ? EMA : WMA;
      const data = fn(candles, p.period ?? 20);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'bb') {
      const { upper, basis, lower } = BB(candles, p.period ?? 20, p.mult ?? 2);
      sl[0].setData(upper); sl[1].setData(basis); sl[2].setData(lower);
      entry.valueByTime.upper = new Map(upper.map(d => [d.time, d.value]));
      entry.valueByTime.basis = new Map(basis.map(d => [d.time, d.value]));
      entry.valueByTime.lower = new Map(lower.map(d => [d.time, d.value]));
    } else if (entry.id === 'vwap') {
      const data = VWAP(_ctx.candles);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'ichimoku') {
      const ich = Ichimoku(_ctx.candles, p.tenkan ?? 9, p.kijun ?? 26, p.senkouB ?? 52);
      sl[0].setData(ich.tenkan); sl[1].setData(ich.kijun);
      sl[2].setData(ich.senkouA); sl[3].setData(ich.senkouB); sl[4].setData(ich.chikou);
      entry.valueByTime.tenkan = new Map(ich.tenkan.map(d => [d.time, d.value]));
      entry.valueByTime.kijun  = new Map(ich.kijun.map(d => [d.time, d.value]));
    } else if (entry.id === 'rsi') {
      const data = RSI(candles, p.period ?? 14);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'macd') {
      const { macd, signal, histogram } = MACD(candles, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9);
      sl[0].setData(histogram); sl[1].setData(macd); sl[2].setData(signal);
      entry.valueByTime.macd = new Map(macd.map(d => [d.time, d.value]));
      entry.valueByTime.signal = new Map(signal.map(d => [d.time, d.value]));
    } else if (entry.id === 'stoch') {
      const { k, d } = Stochastic(_ctx.candles, p.k ?? 14, p.d ?? 3, p.smooth ?? 3);
      sl[0].setData(k); sl[1].setData(d);
      entry.valueByTime.k = new Map(k.map(x => [x.time, x.value]));
      entry.valueByTime.d = new Map(d.map(x => [x.time, x.value]));
    } else if (entry.id === 'cci') {
      const data = CCI(_ctx.candles, p.period ?? 20);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'willr') {
      const data = WilliamsR(_ctx.candles, p.period ?? 14);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'adx') {
      const { adx, plusDi, minusDi } = ADX(_ctx.candles, p.period ?? 14);
      sl[0].setData(adx); sl[1].setData(plusDi); sl[2].setData(minusDi);
      entry.valueByTime.adx = new Map(adx.map(d => [d.time, d.value]));
    } else if (entry.id === 'mom') {
      const data = Momentum(candles, p.period ?? 10);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'obv') {
      const data = OBV(_ctx.candles);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    } else if (entry.id === 'atr') {
      const data = ATR(_ctx.candles, p.period ?? 14);
      sl[0].setData(data);
      entry.valueByTime.primary = new Map(data.map(d => [d.time, d.value]));
    }
  } catch (e) { /* swallow live-edit errors */ }
}

function _indsetApplyColor(entry, color) {
  entry.color = color;
  if (entry.seriesList && entry.seriesList[0]) {
    try { entry.seriesList[0].applyOptions({ color }); } catch {}
  }
}

function _indsetBuildControls(entry) {
  const id = entry.id;
  const p = entry.params || {};
  const row = (lbl, ctrl) =>
    `<div class="indset-row"><label class="indset-lbl">${lbl}</label><div class="indset-ctrl">${ctrl}</div></div>`;
  const num = (key, min, max, step, val) =>
    `<input class="indset-num" data-key="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${val}">
     <input class="indset-rng" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${val}">`;
  const src = (key, val) => {
    const opts = _INDSET_SOURCES.map(([v, n]) =>
      `<option value="${v}" ${v === (val || 'close') ? 'selected' : ''}>${n}</option>`).join('');
    return `<select class="indset-sel" data-key="${key}">${opts}</select>`;
  };
  const anchor = (key, val) => {
    const opts = ['Session','Day','Week','Month'].map(v =>
      `<option value="${v}" ${v === (val || 'Session') ? 'selected' : ''}>${v}</option>`).join('');
    return `<select class="indset-sel" data-key="${key}">${opts}</select>`;
  };

  let html = '';
  if (id === 'sma' || id === 'ema' || id === 'wma') {
    html += row('Período', num('period', 2, 500, 1, p.period ?? 20));
    html += row('Fuente', src('source', p.source));
  } else if (id === 'rsi') {
    html += row('Período', num('period', 2, 100, 1, p.period ?? 14));
    html += row('Sobrecompra', num('overbought', 50, 95, 1, p.overbought ?? 70));
    html += row('Sobreventa',  num('oversold',   5, 50, 1, p.oversold   ?? 30));
    html += row('Fuente', src('source', p.source));
  } else if (id === 'macd') {
    html += row('Rápida',  num('fast',   2, 50,  1, p.fast   ?? 12));
    html += row('Lenta',   num('slow',   5, 100, 1, p.slow   ?? 26));
    html += row('Señal',   num('signal', 2, 30,  1, p.signal ?? 9));
    html += row('Fuente',  src('source', p.source));
  } else if (id === 'bb') {
    html += row('Período', num('period', 5, 100, 1, p.period ?? 20));
    html += row('Multiplicador', num('mult', 0.5, 5.0, 0.1, p.mult ?? 2));
    html += row('Fuente', src('source', p.source));
  } else if (id === 'stoch') {
    html += row('%K',     num('k',      5, 50, 1, p.k      ?? 14));
    html += row('%D',     num('d',      1, 20, 1, p.d      ?? 3));
    html += row('Suavizado', num('smooth', 1, 10, 1, p.smooth ?? 3));
  } else if (id === 'atr') {
    html += row('Período', num('period', 2, 100, 1, p.period ?? 14));
  } else if (id === 'adx') {
    html += row('Período', num('period', 5, 50, 1, p.period ?? 14));
  } else if (id === 'vwap') {
    html += row('Anclaje', anchor('anchor', p.anchor));
  } else if (id === 'cci') {
    html += row('Período', num('period', 5, 100, 1, p.period ?? 20));
  } else if (id === 'willr') {
    html += row('Período', num('period', 5, 100, 1, p.period ?? 14));
  } else if (id === 'mom') {
    html += row('Período', num('period', 2, 100, 1, p.period ?? 10));
  } else if (id === 'obv') {
    html += row('Fuente', src('source', p.source));
  } else if (id === 'ichimoku') {
    html += row('Tenkan',  num('tenkan',  5, 20,  1, p.tenkan  ?? 9));
    html += row('Kijun',   num('kijun',   10, 50, 1, p.kijun   ?? 26));
    html += row('Senkou B',num('senkouB', 30, 100,1, p.senkouB ?? 52));
  }
  html += row('Color', `<input class="indset-color" data-key="__color" type="color" value="${entry.color || '#26a69a'}">`);
  // Tier-1 extensions: line width + line style
  const curLW = entry.lineWidth ?? 1.5;
  const curLS = entry.lineStyle ?? 'solid';
  html += row('Grosor',
    `<input class="indset-num" data-key="__lineWidth" type="number" min="1" max="4" step="1" value="${Math.round(curLW)}">
     <input class="indset-rng" data-key="__lineWidth" type="range" min="1" max="4" step="1" value="${Math.round(curLW)}">`);
  html += row('Estilo',
    `<select class="indset-sel" data-key="__lineStyle">
       <option value="solid"  ${curLS==='solid'?'selected':''}>Sólido</option>
       <option value="dashed" ${curLS==='dashed'?'selected':''}>Discontinuo</option>
       <option value="dotted" ${curLS==='dotted'?'selected':''}>Punteado</option>
       <option value="largeDashed" ${curLS==='largeDashed'?'selected':''}>Trazo largo</option>
     </select>`);
  return html;
}

const _LS_MAP = {
  solid: LineStyle.Solid,
  dashed: LineStyle.Dashed,
  dotted: LineStyle.Dotted,
  largeDashed: LineStyle.LargeDashed,
};
function _indsetApplyLineOpts(entry) {
  if (!entry || !entry.seriesList) return;
  const lw = entry.lineWidth ?? 1.5;
  const ls = _LS_MAP[entry.lineStyle] ?? LineStyle.Solid;
  for (const s of entry.seriesList) {
    try { s.applyOptions({ lineWidth: lw, lineStyle: ls }); } catch {}
  }
}

function openIndicatorSettingsModal(entry) {
  document.querySelectorAll('.indset-backdrop').forEach(m => m.remove());

  const snapshot = {
    params: JSON.parse(JSON.stringify(entry.params || {})),
    color: entry.color,
    lineWidth: entry.lineWidth,
    lineStyle: entry.lineStyle,
  };
  const name = _INDSET_TITLES[entry.id] || entry.id.toUpperCase();

  const backdrop = document.createElement('div');
  backdrop.className = 'indset-backdrop';
  backdrop.innerHTML = `
    <div class="indset-modal" role="dialog" aria-modal="true">
      <div class="indset-head">
        <span class="indset-title">Configuración de ${escapeHtml(name)}</span>
        <span class="indset-close" title="Cerrar">×</span>
      </div>
      <div class="indset-body">${_indsetBuildControls(entry)}</div>
      <div class="indset-foot">
        <button class="indset-btn indset-btn-ghost" data-act="cancel">Cancelar</button>
        <button class="indset-btn indset-btn-azure" data-act="accept">Aceptar</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const revert = () => {
    entry.params = JSON.parse(JSON.stringify(snapshot.params));
    _indsetApplyColor(entry, snapshot.color);
    entry.lineWidth = snapshot.lineWidth;
    entry.lineStyle = snapshot.lineStyle;
    _indsetApplyLineOpts(entry);
    _indsetRecompute(entry);
  };

  const cleanup = () => {
    document.removeEventListener('keydown', escHandler);
    backdrop.remove();
  };

  const close = (commit) => {
    if (!commit) revert();
    else {
      const idx = state.indicators.findIndex(x => x.uid === entry.uid);
      if (idx >= 0) {
        state.indicators[idx] = {
          id: entry.id, params: entry.params, color: entry.color, uid: entry.uid,
          lineWidth: entry.lineWidth, lineStyle: entry.lineStyle,
        };
        lsSet(LS.indicators, state.indicators);
      }
    }
    refreshLegendIndicators();
    cleanup();
  };

  const escHandler = (e) => { if (e.key === 'Escape') close(false); };
  document.addEventListener('keydown', escHandler);

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
  backdrop.querySelector('.indset-close').addEventListener('click', () => close(false));
  backdrop.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
  backdrop.querySelector('[data-act="accept"]').addEventListener('click', () => close(true));

  const onChange = (e) => {
    const t = e.target;
    const key = t.dataset.key;
    if (!key) return;
    if (key === '__color') {
      _indsetApplyColor(entry, t.value);
      return;
    }
    if (key === '__lineWidth') {
      entry.lineWidth = parseFloat(t.value);
      backdrop.querySelectorAll('[data-key="__lineWidth"]').forEach(el => {
        if (el !== t && (el.type === 'number' || el.type === 'range')) el.value = t.value;
      });
      _indsetApplyLineOpts(entry);
      return;
    }
    if (key === '__lineStyle') {
      entry.lineStyle = t.value;
      _indsetApplyLineOpts(entry);
      return;
    }
    let val = t.value;
    if (t.type === 'number' || t.type === 'range') val = parseFloat(val);
    if (!entry.params) entry.params = {};
    entry.params[key] = val;
    backdrop.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
      if (el !== t && (el.type === 'number' || el.type === 'range')) el.value = val;
    });
    _indsetRecompute(entry);
  };
  backdrop.querySelectorAll('.indset-num, .indset-rng, .indset-sel, .indset-color')
    .forEach(el => {
      el.addEventListener('input', onChange);
      el.addEventListener('change', onChange);
    });
}

/* =========================================================================
   SYMBOL SEARCH MODAL — large dialog matching TradingView's "Búsqueda de
   símbolos" (opened by clicking the symbol pill in the top-left).
   ========================================================================= */

// Cross-exchange listings for popular tickers — replicates TradingView's
// behavior of showing the same ticker across global exchanges
const SYMBOL_EXTRA_LISTINGS = {
  NVDA: [
    { type: 'dr',             desc: 'NVIDIA Corporation Shs Canadian Depositary Receipt Repr Shs', ex: 'TSX' },
    { type: 'bond corporate', desc: 'NVIDIA Corporation 2.85% 01-APR-2030',                       ex: 'GETTEX' },
    { type: 'stock',          desc: 'NVIDIA Corporation',                                          ex: 'BMV' },
    { type: 'dr',             desc: 'NVIDIA Corporation Shs Cert Deposito Arg Repr 0.04166667 Sh', ex: 'BYMA' },
    { type: 'stock',          desc: 'NVIDIA Corporation',                                          ex: 'BIVA' },
    { type: 'stock',          desc: 'NVIDIA Corporation',                                          ex: 'BCS' },
    { type: 'bond corporate', desc: 'NVIDIA Corporation 2.85% 01-APR-2030',                       ex: 'FWB' },
    { type: 'stock',          desc: 'NVIDIA Corporation',                                          ex: 'SIX' },
    { type: 'bond corporate', desc: 'NVIDIA Corporation 2.85% 01-APR-2030',                       ex: 'MUN' },
    { type: 'bond corporate', desc: 'NVIDIA Corporation 2.85% 01-APR-2030',                       ex: 'DUS' },
    { type: 'dr',             desc: 'NVIDIA Corporation Shs Canadian Depositary Receipt Repr Shs', ex: 'NEO' },
  ],
  AAPL: [
    { type: 'stock', desc: 'Apple Inc',                ex: 'BMV' },
    { type: 'stock', desc: 'Apple Inc',                ex: 'BIVA' },
    { type: 'dr',    desc: 'Apple Inc CEDEAR',         ex: 'BYMA' },
    { type: 'stock', desc: 'Apple Inc',                ex: 'FWB' },
    { type: 'stock', desc: 'Apple Inc',                ex: 'SIX' },
  ],
  MSFT: [
    { type: 'stock', desc: 'Microsoft Corporation',    ex: 'BMV' },
    { type: 'stock', desc: 'Microsoft Corporation',    ex: 'FWB' },
    { type: 'stock', desc: 'Microsoft Corporation',    ex: 'SIX' },
  ],
  TSLA: [
    { type: 'stock', desc: 'Tesla Inc',                ex: 'FWB' },
    { type: 'dr',    desc: 'Tesla Inc CEDEAR',         ex: 'BYMA' },
  ],
};

// Exchange display colors (small dot/badge to the right of exchange name)
const EXCHANGE_BADGE_COLORS = {
  NASDAQ: '#76b900',  TSX: '#e31837',  GETTEX: '#f7a600',  BMV: '#0066cc',
  BYMA: '#ffcc00',    BIVA: '#28b54b', BCS: '#ff5252',     FWB: '#0033aa',
  SIX: '#ff0000',     MUN: '#cc0066',  DUS: '#9966cc',     NEO: '#00aaff',
  NYSE: '#0066cc',    CME: '#003366',  COMEX: '#9966cc',   ICE: '#666666',
  NSE: '#0099cc',     BSE: '#cc6600',  HKEX: '#cc0000',    JPX: '#000080',
  LSE: '#003366',     SSE: '#ff0000',  TADAWUL: '#00aa00', ASX: '#ff6600',
  BINANCE: '#f3ba2f', COINBASE: '#0052ff', KRAKEN: '#5741d9',
  FX:'#26a69a', FX_IDC:'#26a69a', OANDA:'#1f6bff',
};

const SYMSEARCH_TABS = [
  { id: 'all',     label: 'Todos',     filter: () => true },
  { id: 'stock',   label: 'Acciones',  filter: (r) => r.type === 'stock' || r.type === 'dr' },
  { id: 'fund',    label: 'Fondos',    filter: (r) => r.type === 'fund' || r.type === 'etf' },
  { id: 'fut',     label: 'Futuros',   filter: (r) => r.type === 'commodity' || /1!$/.test(r.symbol) },
  { id: 'forex',   label: 'Forex',     filter: (r) => r.type === 'forex' },
  { id: 'crypto',  label: 'Cripto',    filter: (r) => r.type === 'crypto' },
  { id: 'index',   label: 'Índices',   filter: (r) => r.type === 'index' },
  { id: 'bond',    label: 'Bonos',     filter: (r) => r.type === 'bond corporate' || r.type === 'bond' },
  { id: 'econ',    label: 'Economía',  filter: (r) => r.type === 'economic' },
  { id: 'option',  label: 'Opciones',  filter: (r) => r.type === 'option' },
];

let _ssActiveTab = 'all';

function _expandSymbolCatalog() {
  // Build full row list (primary listing + cross listings)
  const rows = [];
  if (typeof SYMBOL_CATALOG === 'undefined') return rows;
  for (const it of SYMBOL_CATALOG) {
    rows.push({
      symbol: it.symbol,
      desc: it.name,
      type: it.type,
      ex: it.exchange,
      keywords: it.keywords || [],
    });
    const extras = SYMBOL_EXTRA_LISTINGS[it.symbol];
    if (extras) {
      for (const x of extras) rows.push({ symbol: it.symbol, ...x, keywords: it.keywords || [] });
    }
  }
  return rows;
}

function _ssScoreRow(row, q) {
  if (!q) return 1;
  const s = row.symbol.toLowerCase();
  const n = (row.desc || '').toLowerCase();
  const e = (row.ex || '').toLowerCase();
  const kw = (row.keywords || []).join(' ').toLowerCase();
  if (s === q) return 1000;
  if (s.startsWith(q)) return 500 + (10 - Math.min(10, s.length));
  if (n.startsWith(q)) return 200;
  if (kw.includes(q)) return 120;
  if (n.includes(q)) return 80;
  if (e.includes(q)) return 40;
  if (s.includes(q)) return 30;
  return 0;
}

function openSymbolSearchModal() {
  // Reuse if already exists
  let modal = document.getElementById('symSearchModal');
  if (modal) { modal.style.display = 'flex'; document.getElementById('symSearchBack').style.display = 'block'; setTimeout(() => modal.querySelector('input')?.focus(), 0); return; }

  const back = document.createElement('div');
  back.id = 'symSearchBack';
  back.className = 'symsearch-back';
  back.addEventListener('click', closeSymbolSearchModal);
  document.body.appendChild(back);

  modal = document.createElement('div');
  modal.id = 'symSearchModal';
  modal.className = 'symsearch-modal';
  modal.innerHTML = `
    <div class="ssm-head">
      <span class="ssm-title">Búsqueda de símbolos</span>
      <button class="ssm-close" title="Cerrar">✕</button>
    </div>
    <div class="ssm-search">
      <span class="ssm-search-icon">⌕</span>
      <input class="ssm-search-input" type="text" placeholder="Símbolo, ISIN o CUSIP" value="${state.symbol}" />
      <button class="ssm-search-clear" title="Borrar">✕</button>
      <button class="ssm-kbd" title="Atajos">⌨</button>
    </div>
    <div class="ssm-tabs">
      ${SYMSEARCH_TABS.map(t => `<button class="ssm-tab${t.id === _ssActiveTab ? ' is-active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="ssm-list" id="ssmList"></div>
    <div class="ssm-foot">Buscar utilizando los códigos ISIN y CUSIP</div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('.ssm-search-input');
  const listEl = modal.querySelector('#ssmList');

  const render = () => {
    const q = (input.value || '').trim().toLowerCase();
    const tabDef = SYMSEARCH_TABS.find(t => t.id === _ssActiveTab) || SYMSEARCH_TABS[0];
    const rows = _expandSymbolCatalog()
      .filter(tabDef.filter)
      .map(r => ({ row: r, score: _ssScoreRow(r, q) }))
      .filter(x => q === '' || x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
    listEl.innerHTML = rows.map((x, i) => {
      const r = x.row;
      const badgeColor = EXCHANGE_BADGE_COLORS[r.ex] || '#888';
      const typeLabel = ({
        'stock': 'stock',
        'dr': 'dr',
        'bond corporate': 'bond corporate',
        'bond': 'bond',
        'crypto': 'crypto',
        'forex': 'forex',
        'index': 'index',
        'commodity': 'commodity',
        'fund': 'fund',
        'etf': 'etf',
      })[r.type] || r.type;
      return `<div class="ssm-row${i === 0 ? ' is-active' : ''}" data-sym="${r.symbol}">
        <span class="ssm-eye">👁</span>
        <span class="ssm-sym">${r.symbol}</span>
        <span class="ssm-desc">${r.desc || ''}</span>
        <span class="ssm-type">${typeLabel}</span>
        <span class="ssm-exch">${r.ex || ''}</span>
        <span class="ssm-exch-badge" style="background:${badgeColor}">${r.ex?.[0] || ''}</span>
      </div>`;
    }).join('') || `<div class="ssm-empty">Sin resultados para "${q}"</div>`;
  };

  // Wire input
  input.addEventListener('input', render);
  modal.querySelector('.ssm-search-clear').addEventListener('click', () => { input.value = ''; input.focus(); render(); });
  modal.querySelector('.ssm-close').addEventListener('click', closeSymbolSearchModal);

  // Tab clicks
  modal.querySelectorAll('.ssm-tab').forEach(b => {
    b.addEventListener('click', () => {
      _ssActiveTab = b.dataset.tab;
      modal.querySelectorAll('.ssm-tab').forEach(x => x.classList.toggle('is-active', x.dataset.tab === _ssActiveTab));
      render();
    });
  });

  // Row click
  listEl.addEventListener('click', (ev) => {
    const row = ev.target.closest('.ssm-row');
    if (!row) return;
    const sym = row.dataset.sym;
    closeSymbolSearchModal();
    if (typeof loadSymbol === 'function') loadSymbol(sym);
    else { state.symbol = sym; lsSet(LS.symbol, sym); location.reload(); }
  });

  // Esc to close
  const escHandler = (ev) => { if (ev.key === 'Escape') { closeSymbolSearchModal(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);

  render();
  setTimeout(() => { input.focus(); input.select(); }, 0);
}

function closeSymbolSearchModal() {
  document.getElementById('symSearchModal')?.remove();
  document.getElementById('symSearchBack')?.remove();
}

/* =========================================================================
   ENTRY
   ========================================================================= */
export function renderChartView(container) {
  container.innerHTML = `
<div class="chart-page">
  ${buildHBtn()}
  ${buildTopBar()}
  <div class="topright"></div>
  ${buildLeftBar()}
  ${buildCenter()}
  ${buildRightBar()}
  ${buildBottomBar()}
</div>`;

  const chartEl = document.getElementById('nvda-chart');
  // Apply initial symbol/tf header BEFORE chart mounts (so user sees the right pill)
  updateLegendHeader();
  // setTimeout so layout settles; rAF can starve when tab is hidden / off-screen
  setTimeout(async () => {
    try {
      const { candles, source } = await loadCandles(state.symbol, state.tf, 500);
      state.source = source;
      mountChart(chartEl, candles);
      wireTopbar();
      updateLegendHeader();
    } catch (e) {
      console.error('[chart-view] mount failed:', e);
    }
  }, 0);

  if (_clockId) clearInterval(_clockId);
  _clockId = startClock();

  document.querySelector('.h-btn')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });
}

/* =========================================================================
   BAR REPLAY MODE
   -------------------------------------------------------------------------
   Transient (non-persisted) playback engine. Truncates every chart series
   (main, volume, indicators, compares) to the same prefix of bars so the
   chart looks like it did at bar `currentBarIdx`. Speed-driven setInterval
   advances one bar at a time. Exiting restores the full data set.
   ========================================================================= */

function _replayState() {
  // Lives on _ctx so it auto-tears-down when chart remounts.
  if (!_ctx) return null;
  if (!_ctx._replay) {
    _ctx._replay = {
      active: false,
      currentBarIdx: 0,
      speedMs: 1000,
      timer: null,
      snapshots: [],   // [{series, fullData}]
      marker: null,    // priceLine on main series at current bar's close
      badgeEl: null,
    };
  }
  return _ctx._replay;
}

function _snapshotAllSeries(rp) {
  rp.snapshots = [];
  if (!_ctx) return;
  const push = (s) => {
    if (!s || typeof s.data !== 'function') return;
    try {
      const d = s.data();
      // s.data() can return readonly array — clone for safe slicing
      rp.snapshots.push({ series: s, fullData: Array.from(d) });
    } catch {}
  };
  push(_ctx.series);
  push(_ctx.vol);
  for (const ind of (_ctx.indicators || [])) {
    for (const s of (ind.seriesList || [])) push(s);
  }
  for (const cmp of (_ctx.compares || [])) {
    push(cmp.series);
  }
}

function _applyReplaySlice(idx) {
  const rp = _replayState();
  if (!rp) return;
  for (const snap of rp.snapshots) {
    const len = snap.fullData.length;
    const cut = Math.max(1, Math.min(len, idx + 1));
    try { snap.series.setData(snap.fullData.slice(0, cut)); } catch {}
  }
  _updateReplayMarker(idx);
  _updateLegendForReplay(idx);
}

function _updateReplayMarker(idx) {
  const rp = _replayState();
  if (!rp || !_ctx || !_ctx.series) return;
  const candle = _ctx.candles[idx];
  if (!candle) return;
  // Remove previous marker
  if (rp.marker) {
    try { _ctx.series.removePriceLine(rp.marker); } catch {}
    rp.marker = null;
  }
  try {
    rp.marker = _ctx.series.createPriceLine({
      price: candle.close,
      color: '#ff9800',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'REPLAY',
    });
  } catch {}
}

function _updateLegendForReplay(idx) {
  if (!_ctx) return;
  const candle = _ctx.candles[idx];
  if (!candle) return;
  // OHLC legend
  const o = document.getElementById('o');
  const h = document.getElementById('h');
  const l = document.getElementById('l');
  const c = document.getElementById('c');
  const chg = document.getElementById('chg');
  const chgPct = document.getElementById('chgPct');
  const volVal = document.getElementById('volVal');
  const f = (n) => (n == null || isNaN(n)) ? '—' : (+n).toFixed(2);
  if (o) o.textContent = f(candle.open);
  if (h) h.textContent = f(candle.high);
  if (l) l.textContent = f(candle.low);
  if (c) c.textContent = f(candle.close);
  const ch = candle.close - candle.open;
  const pct = candle.open ? (ch / candle.open) * 100 : 0;
  const cls = ch >= 0 ? 'up' : 'dn';
  if (chg) { chg.className = 'ohlc-val ' + cls; chg.textContent = (ch >= 0 ? '+' : '') + f(ch); }
  if (chgPct) { chgPct.className = 'ohlc-val ' + cls; chgPct.textContent = (pct >= 0 ? '+' : '') + f(pct) + '%'; }
  if (volVal) volVal.textContent = candle.volume != null ? candle.volume.toLocaleString() : '—';
  // Indicator values at this bar's time
  const t = candle.time;
  for (const ind of (_ctx.indicators || [])) {
    if (!ind.valueByTime) continue;
    for (const [k, m] of Object.entries(ind.valueByTime)) {
      const el = document.getElementById(`indVal_${ind.uid}_${k}`);
      if (el) {
        const val = m.get(t);
        el.textContent = (val != null && !isNaN(val)) ? (+val).toFixed(2) : '—';
      }
    }
  }
}

function _showReplayBadge() {
  const rp = _replayState();
  if (!rp || !_ctx || !_ctx.container) return;
  if (rp.badgeEl) return;
  const b = document.createElement('div');
  b.className = 'replay-badge';
  b.textContent = 'REPLAY';
  _ctx.container.appendChild(b);
  rp.badgeEl = b;
}

function _hideReplayBadge() {
  const rp = _replayState();
  if (!rp) return;
  if (rp.badgeEl && rp.badgeEl.parentNode) {
    rp.badgeEl.parentNode.removeChild(rp.badgeEl);
  }
  rp.badgeEl = null;
}

function enterReplayMode() {
  const rp = _replayState();
  if (!rp || rp.active) return;
  if (!_ctx || !_ctx.candles || !_ctx.candles.length) return;
  rp.active = true;
  // Pick starting bar = candle nearest to visible-range "to"
  let startIdx = _ctx.candles.length - 1;
  try {
    const vr = _chart.timeScale().getVisibleRange();
    if (vr && vr.to != null) {
      const targetT = vr.to;
      // candles sorted by time → binary-ish linear scan acceptable for typical sizes
      let best = startIdx, bestDiff = Infinity;
      for (let i = 0; i < _ctx.candles.length; i++) {
        const d = Math.abs(_ctx.candles[i].time - targetT);
        if (d < bestDiff) { bestDiff = d; best = i; }
      }
      startIdx = best;
    }
  } catch {}
  // Clamp so there's still room to play forward
  if (startIdx >= _ctx.candles.length) startIdx = _ctx.candles.length - 1;
  if (startIdx < 1) startIdx = 1;
  rp.currentBarIdx = startIdx;
  _snapshotAllSeries(rp);
  _applyReplaySlice(startIdx);
  _showReplayBadge();
  const speedSel = document.getElementById('rpSpeed');
  if (speedSel) rp.speedMs = +speedSel.value || 1000;
  const playBtn = document.getElementById('rpPlay');
  if (playBtn) playBtn.textContent = '▶';
}

function exitReplayMode() {
  const rp = _replayState();
  if (!rp) return;
  if (rp.timer) { clearInterval(rp.timer); rp.timer = null; }
  // Restore full data
  for (const snap of rp.snapshots) {
    try { snap.series.setData(snap.fullData); } catch {}
  }
  rp.snapshots = [];
  if (rp.marker && _ctx && _ctx.series) {
    try { _ctx.series.removePriceLine(rp.marker); } catch {}
  }
  rp.marker = null;
  _hideReplayBadge();
  rp.active = false;
  const playBtn = document.getElementById('rpPlay');
  if (playBtn) playBtn.textContent = '▶';
  // Refresh legend to last bar
  if (_ctx && _ctx.lastCandle) _updateLegendForReplay(_ctx.candles.length - 1);
}

function advanceReplay(steps) {
  const rp = _replayState();
  if (!rp || !rp.active || !_ctx) return;
  const max = _ctx.candles.length - 1;
  let next = rp.currentBarIdx + steps;
  if (next < 0) next = 0;
  if (next > max) {
    next = max;
    // Auto-stop at end
    if (rp.timer) {
      clearInterval(rp.timer);
      rp.timer = null;
      const playBtn = document.getElementById('rpPlay');
      if (playBtn) playBtn.textContent = '▶';
    }
  }
  rp.currentBarIdx = next;
  _applyReplaySlice(next);
}

function setReplaySpeed(ms) {
  const rp = _replayState();
  if (!rp) return;
  rp.speedMs = ms || 1000;
  if (rp.timer) {
    clearInterval(rp.timer);
    rp.timer = setInterval(() => advanceReplay(1), rp.speedMs);
  }
}

function togglePlay() {
  const rp = _replayState();
  if (!rp) return;
  if (!rp.active) enterReplayMode();
  const playBtn = document.getElementById('rpPlay');
  if (rp.timer) {
    clearInterval(rp.timer);
    rp.timer = null;
    if (playBtn) playBtn.textContent = '▶';
    return;
  }
  // If at end, rewind a bit so play does something useful
  if (_ctx && rp.currentBarIdx >= _ctx.candles.length - 1) {
    rp.currentBarIdx = Math.max(1, _ctx.candles.length - 50);
    _applyReplaySlice(rp.currentBarIdx);
  }
  if (playBtn) playBtn.textContent = '⏸';
  rp.timer = setInterval(() => advanceReplay(1), rp.speedMs || 1000);
}

/* =========================================================================
   SYMBOL SEARCH PALETTE (NEW BLOCK — added by symbol-search agent)
   - Catalog of 150+ tradable symbols across asset classes
   - Live filter w/ scoring (exact prefix > word prefix > substring)
   - Keyboard navigation (Up/Down/Enter/Esc), Ctrl+K / Cmd+K hotkey
   - Recents persisted to localStorage (tv.recentSymbols, max 8 FIFO)
   - Category chips (Todos / Acciones / Cripto / Forex / Materias primas / Índices)
   ========================================================================= */

const SYMBOL_CATALOG = [
  // ---- STOCKS ----
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',           exchange: 'NASDAQ', type: 'stock', keywords: ['nvidia','gpu','ai','semiconductor','chips'] },
  { symbol: 'AAPL',  name: 'Apple Inc.',                   exchange: 'NASDAQ', type: 'stock', keywords: ['apple','iphone','mac','ipad'] },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',        exchange: 'NASDAQ', type: 'stock', keywords: ['microsoft','windows','azure','xbox'] },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A',        exchange: 'NASDAQ', type: 'stock', keywords: ['google','alphabet','search','android'] },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',              exchange: 'NASDAQ', type: 'stock', keywords: ['amazon','aws','ecommerce','prime'] },
  { symbol: 'META',  name: 'Meta Platforms Inc.',          exchange: 'NASDAQ', type: 'stock', keywords: ['meta','facebook','instagram','whatsapp'] },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                   exchange: 'NASDAQ', type: 'stock', keywords: ['tesla','ev','musk','automotive'] },
  { symbol: 'NFLX',  name: 'Netflix Inc.',                 exchange: 'NASDAQ', type: 'stock', keywords: ['netflix','streaming','movies'] },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',       exchange: 'NASDAQ', type: 'stock', keywords: ['amd','cpu','gpu','semiconductor'] },
  { symbol: 'INTC',  name: 'Intel Corporation',            exchange: 'NASDAQ', type: 'stock', keywords: ['intel','cpu','semiconductor'] },
  { symbol: 'ORCL',  name: 'Oracle Corporation',           exchange: 'NYSE',   type: 'stock', keywords: ['oracle','database','enterprise'] },
  { symbol: 'CRM',   name: 'Salesforce Inc.',              exchange: 'NYSE',   type: 'stock', keywords: ['salesforce','crm','cloud'] },
  { symbol: 'ADBE',  name: 'Adobe Inc.',                   exchange: 'NASDAQ', type: 'stock', keywords: ['adobe','photoshop','creative'] },
  { symbol: 'CSCO',  name: 'Cisco Systems Inc.',           exchange: 'NASDAQ', type: 'stock', keywords: ['cisco','networking'] },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',                exchange: 'NASDAQ', type: 'stock', keywords: ['broadcom','semiconductor'] },
  { symbol: 'QCOM',  name: 'Qualcomm Inc.',                exchange: 'NASDAQ', type: 'stock', keywords: ['qualcomm','snapdragon','mobile'] },
  { symbol: 'TXN',   name: 'Texas Instruments',            exchange: 'NASDAQ', type: 'stock', keywords: ['texas instruments','semiconductor'] },
  { symbol: 'IBM',   name: 'International Business Machines', exchange: 'NYSE', type: 'stock', keywords: ['ibm','enterprise','watson'] },
  { symbol: 'DIS',   name: 'The Walt Disney Company',      exchange: 'NYSE',   type: 'stock', keywords: ['disney','entertainment','parks'] },
  { symbol: 'NKE',   name: 'Nike Inc.',                    exchange: 'NYSE',   type: 'stock', keywords: ['nike','sportswear','shoes'] },
  { symbol: 'KO',    name: 'The Coca-Cola Company',        exchange: 'NYSE',   type: 'stock', keywords: ['coca cola','beverage'] },
  { symbol: 'PEP',   name: 'PepsiCo Inc.',                 exchange: 'NASDAQ', type: 'stock', keywords: ['pepsi','beverage','snacks'] },
  { symbol: 'WMT',   name: 'Walmart Inc.',                 exchange: 'NYSE',   type: 'stock', keywords: ['walmart','retail'] },
  { symbol: 'COST',  name: 'Costco Wholesale Corp.',       exchange: 'NASDAQ', type: 'stock', keywords: ['costco','wholesale','retail'] },
  { symbol: 'HD',    name: 'The Home Depot Inc.',          exchange: 'NYSE',   type: 'stock', keywords: ['home depot','retail','hardware'] },
  { symbol: 'MCD',   name: "McDonald's Corporation",       exchange: 'NYSE',   type: 'stock', keywords: ['mcdonalds','fast food','restaurants'] },
  { symbol: 'SBUX',  name: 'Starbucks Corporation',        exchange: 'NASDAQ', type: 'stock', keywords: ['starbucks','coffee'] },
  { symbol: 'V',     name: 'Visa Inc.',                    exchange: 'NYSE',   type: 'stock', keywords: ['visa','payments','cards'] },
  { symbol: 'MA',    name: 'Mastercard Inc.',              exchange: 'NYSE',   type: 'stock', keywords: ['mastercard','payments','cards'] },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.',         exchange: 'NASDAQ', type: 'stock', keywords: ['paypal','payments','fintech'] },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',         exchange: 'NYSE',   type: 'stock', keywords: ['jpmorgan','jp morgan','bank'] },
  { symbol: 'BAC',   name: 'Bank of America Corp.',        exchange: 'NYSE',   type: 'stock', keywords: ['bank of america','bank'] },
  { symbol: 'WFC',   name: 'Wells Fargo & Company',        exchange: 'NYSE',   type: 'stock', keywords: ['wells fargo','bank'] },
  { symbol: 'GS',    name: 'Goldman Sachs Group',          exchange: 'NYSE',   type: 'stock', keywords: ['goldman sachs','investment bank'] },
  { symbol: 'MS',    name: 'Morgan Stanley',               exchange: 'NYSE',   type: 'stock', keywords: ['morgan stanley','investment bank'] },
  { symbol: 'C',     name: 'Citigroup Inc.',               exchange: 'NYSE',   type: 'stock', keywords: ['citigroup','citi','bank'] },
  { symbol: 'BLK',   name: 'BlackRock Inc.',               exchange: 'NYSE',   type: 'stock', keywords: ['blackrock','asset management'] },
  { symbol: 'AXP',   name: 'American Express Company',     exchange: 'NYSE',   type: 'stock', keywords: ['amex','american express','cards'] },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',            exchange: 'NYSE',   type: 'stock', keywords: ['johnson','pharma','health'] },
  { symbol: 'PFE',   name: 'Pfizer Inc.',                  exchange: 'NYSE',   type: 'stock', keywords: ['pfizer','pharma'] },
  { symbol: 'UNH',   name: 'UnitedHealth Group Inc.',      exchange: 'NYSE',   type: 'stock', keywords: ['unitedhealth','insurance','health'] },
  { symbol: 'ABBV',  name: 'AbbVie Inc.',                  exchange: 'NYSE',   type: 'stock', keywords: ['abbvie','pharma'] },
  { symbol: 'MRK',   name: 'Merck & Co. Inc.',             exchange: 'NYSE',   type: 'stock', keywords: ['merck','pharma'] },
  { symbol: 'LLY',   name: 'Eli Lilly and Company',        exchange: 'NYSE',   type: 'stock', keywords: ['eli lilly','pharma'] },
  { symbol: 'BMY',   name: 'Bristol-Myers Squibb',         exchange: 'NYSE',   type: 'stock', keywords: ['bristol myers','pharma'] },
  { symbol: 'GILD',  name: 'Gilead Sciences Inc.',         exchange: 'NASDAQ', type: 'stock', keywords: ['gilead','biotech'] },
  { symbol: 'AMGN',  name: 'Amgen Inc.',                   exchange: 'NASDAQ', type: 'stock', keywords: ['amgen','biotech'] },
  { symbol: 'BIIB',  name: 'Biogen Inc.',                  exchange: 'NASDAQ', type: 'stock', keywords: ['biogen','biotech'] },
  { symbol: 'XOM',   name: 'Exxon Mobil Corporation',      exchange: 'NYSE',   type: 'stock', keywords: ['exxon','oil','energy'] },
  { symbol: 'CVX',   name: 'Chevron Corporation',          exchange: 'NYSE',   type: 'stock', keywords: ['chevron','oil','energy'] },
  { symbol: 'COP',   name: 'ConocoPhillips',               exchange: 'NYSE',   type: 'stock', keywords: ['conoco','oil','energy'] },
  { symbol: 'OXY',   name: 'Occidental Petroleum',         exchange: 'NYSE',   type: 'stock', keywords: ['occidental','oil','energy'] },
  { symbol: 'SLB',   name: 'Schlumberger N.V.',            exchange: 'NYSE',   type: 'stock', keywords: ['schlumberger','oil services'] },
  { symbol: 'BA',    name: 'The Boeing Company',           exchange: 'NYSE',   type: 'stock', keywords: ['boeing','aerospace','defense'] },
  { symbol: 'LMT',   name: 'Lockheed Martin Corporation',  exchange: 'NYSE',   type: 'stock', keywords: ['lockheed','defense','aerospace'] },
  { symbol: 'RTX',   name: 'RTX Corporation',              exchange: 'NYSE',   type: 'stock', keywords: ['raytheon','rtx','defense'] },
  { symbol: 'GE',    name: 'General Electric Company',     exchange: 'NYSE',   type: 'stock', keywords: ['ge','general electric','industrial'] },
  { symbol: 'CAT',   name: 'Caterpillar Inc.',             exchange: 'NYSE',   type: 'stock', keywords: ['caterpillar','machinery'] },
  { symbol: 'HON',   name: 'Honeywell International',      exchange: 'NASDAQ', type: 'stock', keywords: ['honeywell','industrial'] },
  { symbol: 'MMM',   name: '3M Company',                   exchange: 'NYSE',   type: 'stock', keywords: ['3m','industrial'] },
  { symbol: 'F',     name: 'Ford Motor Company',           exchange: 'NYSE',   type: 'stock', keywords: ['ford','automotive'] },
  { symbol: 'GM',    name: 'General Motors Company',       exchange: 'NYSE',   type: 'stock', keywords: ['gm','general motors','automotive'] },
  { symbol: 'RIVN',  name: 'Rivian Automotive Inc.',       exchange: 'NASDAQ', type: 'stock', keywords: ['rivian','ev'] },
  { symbol: 'LCID',  name: 'Lucid Group Inc.',             exchange: 'NASDAQ', type: 'stock', keywords: ['lucid','ev'] },
  { symbol: 'UBER',  name: 'Uber Technologies Inc.',       exchange: 'NYSE',   type: 'stock', keywords: ['uber','rideshare'] },
  { symbol: 'LYFT',  name: 'Lyft Inc.',                    exchange: 'NASDAQ', type: 'stock', keywords: ['lyft','rideshare'] },
  { symbol: 'ABNB',  name: 'Airbnb Inc.',                  exchange: 'NASDAQ', type: 'stock', keywords: ['airbnb','travel'] },
  { symbol: 'SHOP',  name: 'Shopify Inc.',                 exchange: 'NYSE',   type: 'stock', keywords: ['shopify','ecommerce'] },
  { symbol: 'SQ',    name: 'Block Inc.',                   exchange: 'NYSE',   type: 'stock', keywords: ['block','square','fintech'] },
  { symbol: 'ROKU',  name: 'Roku Inc.',                    exchange: 'NASDAQ', type: 'stock', keywords: ['roku','streaming'] },
  { symbol: 'ZM',    name: 'Zoom Video Communications',    exchange: 'NASDAQ', type: 'stock', keywords: ['zoom','video','communications'] },
  { symbol: 'DOCU',  name: 'DocuSign Inc.',                exchange: 'NASDAQ', type: 'stock', keywords: ['docusign','esign'] },
  { symbol: 'CRWD',  name: 'CrowdStrike Holdings Inc.',    exchange: 'NASDAQ', type: 'stock', keywords: ['crowdstrike','security','cyber'] },
  { symbol: 'OKTA',  name: 'Okta Inc.',                    exchange: 'NASDAQ', type: 'stock', keywords: ['okta','identity','security'] },
  { symbol: 'DDOG',  name: 'Datadog Inc.',                 exchange: 'NASDAQ', type: 'stock', keywords: ['datadog','observability'] },
  { symbol: 'SNOW',  name: 'Snowflake Inc.',               exchange: 'NYSE',   type: 'stock', keywords: ['snowflake','data','cloud'] },
  { symbol: 'PLTR',  name: 'Palantir Technologies Inc.',   exchange: 'NYSE',   type: 'stock', keywords: ['palantir','data','analytics'] },
  { symbol: 'MDB',   name: 'MongoDB Inc.',                 exchange: 'NASDAQ', type: 'stock', keywords: ['mongodb','database'] },
  { symbol: 'NET',   name: 'Cloudflare Inc.',              exchange: 'NYSE',   type: 'stock', keywords: ['cloudflare','cdn','security'] },
  { symbol: 'ZS',    name: 'Zscaler Inc.',                 exchange: 'NASDAQ', type: 'stock', keywords: ['zscaler','security','cyber'] },
  { symbol: 'PANW',  name: 'Palo Alto Networks Inc.',      exchange: 'NASDAQ', type: 'stock', keywords: ['palo alto','security','cyber'] },

  // ---- INDICES ----
  { symbol: 'SPX',     name: 'S&P 500 Index',              exchange: 'INDEX', type: 'index', keywords: ['sp500','s&p','spx','us500'] },
  { symbol: 'NDX',     name: 'Nasdaq 100 Index',           exchange: 'INDEX', type: 'index', keywords: ['nasdaq 100','ndx','us100'] },
  { symbol: 'DJI',     name: 'Dow Jones Industrial Avg.',  exchange: 'INDEX', type: 'index', keywords: ['dow jones','djia','us30'] },
  { symbol: 'RUT',     name: 'Russell 2000 Index',         exchange: 'INDEX', type: 'index', keywords: ['russell 2000','rut','smallcap'] },
  { symbol: 'VIX',     name: 'CBOE Volatility Index',      exchange: 'INDEX', type: 'index', keywords: ['vix','volatility','fear'] },
  { symbol: 'FTSE',    name: 'FTSE 100 Index',             exchange: 'INDEX', type: 'index', keywords: ['ftse','uk100','london'] },
  { symbol: 'DAX',     name: 'DAX 40 Index',               exchange: 'INDEX', type: 'index', keywords: ['dax','de40','germany'] },
  { symbol: 'CAC',     name: 'CAC 40 Index',               exchange: 'INDEX', type: 'index', keywords: ['cac','france','fr40'] },
  { symbol: 'NI225',   name: 'Nikkei 225 Index',           exchange: 'INDEX', type: 'index', keywords: ['nikkei','japan','jp225'] },
  { symbol: 'HSI',     name: 'Hang Seng Index',            exchange: 'INDEX', type: 'index', keywords: ['hang seng','hong kong','hk50'] },
  { symbol: 'SHCOMP',  name: 'Shanghai Composite Index',   exchange: 'INDEX', type: 'index', keywords: ['shanghai','china','composite'] },
  { symbol: 'ASX',     name: 'S&P/ASX 200 Index',          exchange: 'INDEX', type: 'index', keywords: ['asx','australia','au200'] },
  { symbol: 'IBEX',    name: 'IBEX 35 Index',              exchange: 'INDEX', type: 'index', keywords: ['ibex','spain','es35'] },

  // ---- FOREX ----
  { symbol: 'EURUSD', name: 'Euro / US Dollar',            exchange: 'FX', type: 'forex', keywords: ['eur','usd','euro','dollar'] },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar',   exchange: 'FX', type: 'forex', keywords: ['gbp','usd','cable','pound'] },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen',    exchange: 'FX', type: 'forex', keywords: ['usd','jpy','yen'] },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc',     exchange: 'FX', type: 'forex', keywords: ['usd','chf','swiss','franc'] },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', exchange: 'FX', type: 'forex', keywords: ['aud','usd','aussie'] },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', exchange: 'FX', type: 'forex', keywords: ['nzd','usd','kiwi'] },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', exchange: 'FX', type: 'forex', keywords: ['usd','cad','loonie'] },
  { symbol: 'EURGBP', name: 'Euro / British Pound',        exchange: 'FX', type: 'forex', keywords: ['eur','gbp'] },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen',         exchange: 'FX', type: 'forex', keywords: ['eur','jpy'] },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc',          exchange: 'FX', type: 'forex', keywords: ['eur','chf'] },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', exchange: 'FX', type: 'forex', keywords: ['gbp','jpy'] },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', exchange: 'FX', type: 'forex', keywords: ['aud','jpy'] },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar',    exchange: 'FX', type: 'forex', keywords: ['eur','aud'] },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', exchange: 'FX', type: 'forex', keywords: ['gbp','aud'] },
  { symbol: 'USDMXN', name: 'US Dollar / Mexican Peso',    exchange: 'FX', type: 'forex', keywords: ['usd','mxn','peso'] },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira',    exchange: 'FX', type: 'forex', keywords: ['usd','try','lira'] },

  // ---- CRYPTO ----
  { symbol: 'BTCUSD',   name: 'Bitcoin / US Dollar',       exchange: 'CRYPTO', type: 'crypto', keywords: ['btc','bitcoin'] },
  { symbol: 'ETHUSD',   name: 'Ethereum / US Dollar',      exchange: 'CRYPTO', type: 'crypto', keywords: ['eth','ethereum','ether'] },
  { symbol: 'BNBUSD',   name: 'BNB / US Dollar',           exchange: 'CRYPTO', type: 'crypto', keywords: ['bnb','binance coin'] },
  { symbol: 'SOLUSD',   name: 'Solana / US Dollar',        exchange: 'CRYPTO', type: 'crypto', keywords: ['sol','solana'] },
  { symbol: 'XRPUSD',   name: 'Ripple / US Dollar',        exchange: 'CRYPTO', type: 'crypto', keywords: ['xrp','ripple'] },
  { symbol: 'ADAUSD',   name: 'Cardano / US Dollar',       exchange: 'CRYPTO', type: 'crypto', keywords: ['ada','cardano'] },
  { symbol: 'DOGEUSD',  name: 'Dogecoin / US Dollar',      exchange: 'CRYPTO', type: 'crypto', keywords: ['doge','dogecoin'] },
  { symbol: 'AVAXUSD',  name: 'Avalanche / US Dollar',     exchange: 'CRYPTO', type: 'crypto', keywords: ['avax','avalanche'] },
  { symbol: 'DOTUSD',   name: 'Polkadot / US Dollar',      exchange: 'CRYPTO', type: 'crypto', keywords: ['dot','polkadot'] },
  { symbol: 'MATICUSD', name: 'Polygon / US Dollar',       exchange: 'CRYPTO', type: 'crypto', keywords: ['matic','polygon'] },
  { symbol: 'SHIBUSD',  name: 'Shiba Inu / US Dollar',     exchange: 'CRYPTO', type: 'crypto', keywords: ['shib','shiba'] },
  { symbol: 'TRXUSD',   name: 'TRON / US Dollar',          exchange: 'CRYPTO', type: 'crypto', keywords: ['trx','tron'] },
  { symbol: 'LTCUSD',   name: 'Litecoin / US Dollar',      exchange: 'CRYPTO', type: 'crypto', keywords: ['ltc','litecoin'] },
  { symbol: 'LINKUSD',  name: 'Chainlink / US Dollar',     exchange: 'CRYPTO', type: 'crypto', keywords: ['link','chainlink'] },
  { symbol: 'ATOMUSD',  name: 'Cosmos / US Dollar',        exchange: 'CRYPTO', type: 'crypto', keywords: ['atom','cosmos'] },
  { symbol: 'UNIUSD',   name: 'Uniswap / US Dollar',       exchange: 'CRYPTO', type: 'crypto', keywords: ['uni','uniswap','dex'] },
  { symbol: 'NEARUSD',  name: 'NEAR Protocol / US Dollar', exchange: 'CRYPTO', type: 'crypto', keywords: ['near'] },
  { symbol: 'APTUSD',   name: 'Aptos / US Dollar',         exchange: 'CRYPTO', type: 'crypto', keywords: ['apt','aptos'] },
  { symbol: 'XLMUSD',   name: 'Stellar / US Dollar',       exchange: 'CRYPTO', type: 'crypto', keywords: ['xlm','stellar','lumens'] },
  { symbol: 'ETCUSD',   name: 'Ethereum Classic / US Dollar', exchange: 'CRYPTO', type: 'crypto', keywords: ['etc','ethereum classic'] },

  // ---- COMMODITIES ----
  { symbol: 'GC1!', name: 'Gold Futures',                  exchange: 'COMEX',  type: 'commodity', keywords: ['gold','xau','metals'] },
  { symbol: 'SI1!', name: 'Silver Futures',                exchange: 'COMEX',  type: 'commodity', keywords: ['silver','xag','metals'] },
  { symbol: 'HG1!', name: 'Copper Futures',                exchange: 'COMEX',  type: 'commodity', keywords: ['copper','metals'] },
  { symbol: 'PL1!', name: 'Platinum Futures',              exchange: 'NYMEX',  type: 'commodity', keywords: ['platinum','metals'] },
  { symbol: 'CL1!', name: 'WTI Crude Oil Futures',         exchange: 'NYMEX',  type: 'commodity', keywords: ['oil','crude','wti','energy'] },
  { symbol: 'BZ1!', name: 'Brent Crude Oil Futures',       exchange: 'ICE',    type: 'commodity', keywords: ['oil','brent','crude','energy'] },
  { symbol: 'NG1!', name: 'Natural Gas Futures',           exchange: 'NYMEX',  type: 'commodity', keywords: ['natural gas','gas','energy'] },
  { symbol: 'ZC1!', name: 'Corn Futures',                  exchange: 'CBOT',   type: 'commodity', keywords: ['corn','grain','agriculture'] },
  { symbol: 'ZS1!', name: 'Soybean Futures',               exchange: 'CBOT',   type: 'commodity', keywords: ['soybean','soy','grain','agriculture'] },
  { symbol: 'ZW1!', name: 'Wheat Futures',                 exchange: 'CBOT',   type: 'commodity', keywords: ['wheat','grain','agriculture'] },

  // ---- SPANISH (IBEX 35) ----
  { symbol: 'SAN',  name: 'Banco Santander',               exchange: 'BME', type: 'stock', keywords: ['santander','banco','spain'] },
  { symbol: 'BBVA', name: 'Banco Bilbao Vizcaya Argentaria', exchange: 'BME', type: 'stock', keywords: ['bbva','banco','spain'] },
  { symbol: 'IBE',  name: 'Iberdrola',                     exchange: 'BME', type: 'stock', keywords: ['iberdrola','utility','spain'] },
  { symbol: 'TEF',  name: 'Telefónica',                    exchange: 'BME', type: 'stock', keywords: ['telefonica','telecom','spain'] },
  { symbol: 'REP',  name: 'Repsol',                        exchange: 'BME', type: 'stock', keywords: ['repsol','energy','spain'] },
  { symbol: 'ELE',  name: 'Endesa',                        exchange: 'BME', type: 'stock', keywords: ['endesa','utility','spain'] },
  { symbol: 'GRF',  name: 'Grifols',                       exchange: 'BME', type: 'stock', keywords: ['grifols','pharma','spain'] },
  { symbol: 'NTGY', name: 'Naturgy Energy Group',          exchange: 'BME', type: 'stock', keywords: ['naturgy','gas','utility','spain'] },
  { symbol: 'AMS',  name: 'Amadeus IT Group',              exchange: 'BME', type: 'stock', keywords: ['amadeus','travel','tech','spain'] },
  { symbol: 'AENA', name: 'Aena',                          exchange: 'BME', type: 'stock', keywords: ['aena','airports','spain'] },
  { symbol: 'MTS',  name: 'ArcelorMittal',                 exchange: 'BME', type: 'stock', keywords: ['arcelormittal','steel','spain'] },
  { symbol: 'IDR',  name: 'Indra Sistemas',                exchange: 'BME', type: 'stock', keywords: ['indra','tech','spain'] },
  { symbol: 'ACS',  name: 'ACS Actividades de Construcción', exchange: 'BME', type: 'stock', keywords: ['acs','construction','spain'] },
  { symbol: 'CLNX', name: 'Cellnex Telecom',               exchange: 'BME', type: 'stock', keywords: ['cellnex','telecom','spain'] },
];

const SS_TYPE_COLORS = {
  stock:     '#2962ff',
  crypto:    '#f7a600',
  forex:     '#089981',
  commodity: '#f2c94c',
  index:     '#9c27b0',
};
const SS_TYPE_LABELS = {
  stock:     'Acción',
  crypto:    'Cripto',
  forex:     'Forex',
  commodity: 'Materia prima',
  index:     'Índice',
};
const SS_CATEGORIES = [
  { id: 'all',       label: 'Todos',           type: null },
  { id: 'stock',     label: 'Acciones',        type: 'stock' },
  { id: 'crypto',    label: 'Cripto',          type: 'crypto' },
  { id: 'forex',     label: 'Forex',           type: 'forex' },
  { id: 'commodity', label: 'Materias primas', type: 'commodity' },
  { id: 'index',     label: 'Índices',         type: 'index' },
];
const SS_RECENTS_KEY = 'tv.recentSymbols';
const SS_RECENTS_MAX = 8;

function _ssGetRecents() {
  try { const v = JSON.parse(localStorage.getItem(SS_RECENTS_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function _ssAddRecent(sym) {
  const cur = _ssGetRecents().filter(s => s !== sym);
  cur.unshift(sym);
  while (cur.length > SS_RECENTS_MAX) cur.pop();
  try { localStorage.setItem(SS_RECENTS_KEY, JSON.stringify(cur)); } catch {}
}

function _ssEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Scoring: exact symbol = 200, symbol prefix = 100+, name prefix = 80, name word prefix = 50,
// keyword exact = 90, keyword prefix = 60, substring fallbacks (40/15/12).
function _ssScore(item, q) {
  if (!q) return 1;
  const ql = q.toLowerCase();
  const sym = item.symbol.toLowerCase();
  const nm = item.name.toLowerCase();
  const ex = item.exchange.toLowerCase();
  let best = 0;
  if (sym === ql) best = Math.max(best, 200);
  if (sym.startsWith(ql)) best = Math.max(best, 100 + (10 - Math.min(10, sym.length)));
  if (nm.startsWith(ql)) best = Math.max(best, 80);
  for (const w of nm.split(/[\s\.\-\/]+/)) if (w.startsWith(ql)) { best = Math.max(best, 50); break; }
  for (const k of (item.keywords || [])) {
    const kl = k.toLowerCase();
    if (kl === ql) best = Math.max(best, 90);
    else if (kl.startsWith(ql)) best = Math.max(best, 60);
    else if (kl.includes(ql)) best = Math.max(best, 25);
  }
  if (sym.includes(ql)) best = Math.max(best, 40);
  if (nm.includes(ql)) best = Math.max(best, 15);
  if (ex.includes(ql)) best = Math.max(best, 12);
  return best;
}

function _ssRowHTML(item, active) {
  const color = SS_TYPE_COLORS[item.type] || '#787b86';
  const letter = item.symbol.charAt(0);
  return `<div class="sp-row${active ? ' sp-row-active' : ''}" data-sym="${_ssEscape(item.symbol)}">
    <div class="sp-logo" style="background:${color}">${_ssEscape(letter)}</div>
    <div class="sp-meta">
      <div class="sp-sym">${_ssEscape(item.symbol)}</div>
      <div class="sp-name">${_ssEscape(item.name)}</div>
    </div>
    <div class="sp-right">
      <span class="sp-exch">${_ssEscape(item.exchange)}</span>
      <span class="sp-pill" style="background:${color}22;color:${color}">${SS_TYPE_LABELS[item.type] || item.type}</span>
    </div>
  </div>`;
}

let _ssState = { query: '', cat: 'all', active: 0, items: [] };

function _ssComputeItems() {
  const q = _ssState.query.trim();
  const catType = SS_CATEGORIES.find(c => c.id === _ssState.cat)?.type || null;
  let pool = SYMBOL_CATALOG;
  if (catType) pool = pool.filter(s => s.type === catType);
  if (!q) {
    if (_ssState.cat === 'all') {
      const recs = _ssGetRecents();
      const recItems = recs.map(s => SYMBOL_CATALOG.find(x => x.symbol === s)).filter(Boolean);
      const recSet = new Set(recItems.map(i => i.symbol));
      const rest = pool.filter(i => !recSet.has(i.symbol));
      return { recents: recItems, items: rest };
    }
    return { recents: [], items: pool };
  }
  const scored = pool.map(it => ({ it, sc: _ssScore(it, q) })).filter(x => x.sc > 0);
  scored.sort((a, b) => b.sc - a.sc || a.it.symbol.localeCompare(b.it.symbol));
  return { recents: [], items: scored.map(x => x.it) };
}

function _ssRenderBody(pal) {
  const body = pal.querySelector('.sp-body-list');
  if (!body) return;
  const { recents, items } = _ssComputeItems();
  _ssState.items = [...recents, ...items];
  if (_ssState.active >= _ssState.items.length) _ssState.active = 0;
  if (_ssState.items.length === 0) {
    body.innerHTML = `<div class="sp-empty">Sin resultados para "${_ssEscape(_ssState.query)}"</div>`;
    return;
  }
  let html = '';
  if (recents.length) {
    html += `<div class="sp-section">RECIENTES</div>`;
    recents.forEach((it, i) => { html += _ssRowHTML(it, i === _ssState.active); });
    if (items.length) html += `<div class="sp-section">TODOS LOS SÍMBOLOS</div>`;
  }
  const offset = recents.length;
  items.forEach((it, i) => { html += _ssRowHTML(it, (i + offset) === _ssState.active); });
  body.innerHTML = html;
  body.querySelectorAll('.sp-row').forEach(el => {
    el.addEventListener('click', () => _ssSelect(el.dataset.sym));
    el.addEventListener('mouseenter', () => {
      const sym = el.dataset.sym;
      const idx = _ssState.items.findIndex(x => x.symbol === sym);
      if (idx >= 0) { _ssState.active = idx; _ssUpdateActive(pal); }
    });
  });
  const activeEl = body.querySelector('.sp-row-active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
}

function _ssUpdateActive(pal) {
  pal.querySelectorAll('.sp-row').forEach(r => {
    const sym = r.dataset.sym;
    const idx = _ssState.items.findIndex(x => x.symbol === sym);
    r.classList.toggle('sp-row-active', idx === _ssState.active);
  });
  const activeEl = pal.querySelector('.sp-row-active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
}

function _ssSelect(sym) {
  if (!sym) return;
  _ssAddRecent(sym);
  closeSymbolSearchPalette();
  try {
    if (typeof loadSymbol === 'function') { loadSymbol(sym); return; }
  } catch {}
  try {
    state.symbol = sym;
    if (typeof persist === 'function') persist();
    location.reload();
  } catch (e) {
    console.error('[symbol-search] fallback failed:', e);
  }
}

function closeSymbolSearchPalette() {
  const pal = document.getElementById('searchPalette');
  if (pal) pal.style.display = 'none';
}

function openSymbolSearchPalette() {
  try { if (typeof closeAllPops === 'function') closeAllPops(); } catch {}
  let pal = document.getElementById('searchPalette');
  const center = document.getElementById('center') || document.body;
  if (!pal) {
    pal = document.createElement('div');
    pal.id = 'searchPalette';
    pal.className = 'sp-symsearch';
    pal.innerHTML = `
      <div class="sp-ss-head">
        <span class="sp-ss-title">Buscar símbolo</span>
        <button class="sp-ss-close" id="ssClose" title="Cerrar">✕</button>
      </div>
      <div class="sp-ss-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="ssInput" placeholder="Buscar símbolo, nombre, exchange..." autocomplete="off" spellcheck="false"/>
      </div>
      <div class="sp-ss-chips">
        ${SS_CATEGORIES.map(c => `<button class="sp-chip${c.id === 'all' ? ' sp-chip-on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div class="sp-body-list"></div>
    `;
    center.appendChild(pal);

    pal.querySelector('#ssClose').addEventListener('click', () => closeSymbolSearchPalette());
    const input = pal.querySelector('#ssInput');
    input.addEventListener('input', () => {
      _ssState.query = input.value;
      _ssState.active = 0;
      _ssRenderBody(pal);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (_ssState.items.length) _ssState.active = (_ssState.active + 1) % _ssState.items.length;
        _ssUpdateActive(pal);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (_ssState.items.length) _ssState.active = (_ssState.active - 1 + _ssState.items.length) % _ssState.items.length;
        _ssUpdateActive(pal);
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const it = _ssState.items[_ssState.active];
        if (it) _ssSelect(it.symbol);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        closeSymbolSearchPalette();
      }
    });
    pal.querySelectorAll('.sp-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        pal.querySelectorAll('.sp-chip').forEach(x => x.classList.remove('sp-chip-on'));
        ch.classList.add('sp-chip-on');
        _ssState.cat = ch.dataset.cat;
        _ssState.active = 0;
        _ssRenderBody(pal);
        pal.querySelector('#ssInput')?.focus();
      });
    });
  }
  _ssState.query = '';
  _ssState.active = 0;
  _ssState.cat = 'all';
  const input = pal.querySelector('#ssInput');
  if (input) input.value = '';
  pal.querySelectorAll('.sp-chip').forEach(x => x.classList.toggle('sp-chip-on', x.dataset.cat === 'all'));
  pal.style.display = 'flex';
  _ssRenderBody(pal);
  setTimeout(() => input?.focus(), 0);
}

// Bindings: intercept #searchPaletteBtn click + Ctrl/Cmd+K hotkey (capture phase to override prior handler)
(function initSymbolSearchBindings() {
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('#searchPaletteBtn');
    if (!btn) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    const pal = document.getElementById('searchPalette');
    if (pal && pal.style.display !== 'none' && pal.style.display !== '') {
      closeSymbolSearchPalette();
    } else {
      openSymbolSearchPalette();
    }
  }, true);

  window.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      ev.stopPropagation();
      const pal = document.getElementById('searchPalette');
      if (pal && pal.style.display !== 'none' && pal.style.display !== '') {
        closeSymbolSearchPalette();
      } else {
        openSymbolSearchPalette();
      }
    }
  }, true);

  document.addEventListener('mousedown', (ev) => {
    const pal = document.getElementById('searchPalette');
    if (!pal || pal.style.display === 'none' || pal.style.display === '') return;
    if (ev.target.closest('#searchPalette') || ev.target.closest('#searchPaletteBtn')) return;
    closeSymbolSearchPalette();
  });
})();

/* =========================================================================
   BACKTESTER UI — config modal, results modal, CSV export
   ========================================================================= */

const BT_RESULTS_KEY = 'tv.backtestResults';
const BT_RESULTS_MAX = 5;
let _btEquityChart = null;
let _btDDChart = null;

function openBacktestStrategyPicker() {
  // Quick picker → opens strategies list as a tiny modal
  _btCloseAll();
  const back = document.createElement('div');
  back.className = 'bt-back';
  back.id = 'btPickBack';
  const m = document.createElement('div');
  m.className = 'bt-modal bt-modal-sm';
  m.id = 'btPickModal';
  m.innerHTML = `
    <div class="bt-head">
      <span class="bt-title">Seleccionar estrategia</span>
      <button class="bt-x" id="btPickX" title="Cerrar" aria-label="Cerrar">✕</button>
    </div>
    <div class="bt-body">
      <div class="bt-strat-grid">${PRESET_STRATEGIES.map(s => `
        <div class="bt-strat-card" data-id="${escapeHtml(s.id)}">
          <div class="bt-strat-card-head"><span class="bt-strat-card-name">${escapeHtml(s.name)}</span></div>
          <div class="bt-strat-card-desc">${escapeHtml(s.description || '')}</div>
          <div class="bt-strat-card-foot">
            <button class="bt-strat-run" data-id="${escapeHtml(s.id)}">Backtest</button>
          </div>
        </div>
      `).join('')}</div>
    </div>
  `;
  document.body.appendChild(back);
  document.body.appendChild(m);
  const close = () => { back.remove(); m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', close);
  m.querySelector('#btPickX').addEventListener('click', close);
  m.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.bt-strat-run');
    if (!btn) return;
    const sid = btn.dataset.id;
    const strat = PRESET_STRATEGIES.find(x => x.id === sid);
    if (!strat) return;
    close();
    openBacktestConfigModal(strat);
  });
}

function openBacktestConfigModal(strategy) {
  _btCloseAll();
  const back = document.createElement('div');
  back.className = 'bt-back';
  back.id = 'btCfgBack';
  const m = document.createElement('div');
  m.className = 'bt-modal';
  m.id = 'btCfgModal';
  m.innerHTML = `
    <div class="bt-head">
      <span class="bt-title">Backtest — ${escapeHtml(strategy.name)}</span>
      <button class="bt-x" id="btCfgX" title="Cerrar" aria-label="Cerrar">✕</button>
    </div>
    <div class="bt-body">
      <form id="btCfgForm" class="bt-form" autocomplete="off">
        <div class="bt-grid">
          <label class="bt-field">
            <span>Capital inicial ($)</span>
            <input type="number" name="initialCapital" value="10000" min="1" step="1"/>
            <span class="bt-err" data-err="initialCapital"></span>
          </label>
          <label class="bt-field">
            <span>Tamaño de posición</span>
            <select name="positionSize">
              <option value="fixed_dollar">Dólares fijos</option>
              <option value="fixed_pct">% del capital</option>
              <option value="kelly">Kelly</option>
              <option value="atr">ATR (riesgo %)</option>
            </select>
          </label>
          <label class="bt-field">
            <span>Valor del tamaño</span>
            <input type="number" name="positionSizeValue" value="1000" min="0.0001" step="any"/>
            <span class="bt-err" data-err="positionSizeValue"></span>
          </label>
          <label class="bt-field">
            <span>Comisión (fracción)</span>
            <input type="number" name="commission" value="0.001" min="0" step="0.0001"/>
            <span class="bt-err" data-err="commission"></span>
          </label>
          <label class="bt-field">
            <span>Slippage</span>
            <select name="slippage">
              <option value="none">Ninguno</option>
              <option value="pct" selected>% fijo</option>
              <option value="almgren">Almgren-Chriss</option>
            </select>
          </label>
          <label class="bt-field">
            <span>Valor del slippage</span>
            <input type="number" name="slippageValue" value="0.0005" min="0" step="0.0001"/>
          </label>
        </div>
        <div class="bt-grid">
          <div class="bt-field bt-row">
            <label class="bt-check"><input type="checkbox" name="useSL" checked/> <span>Stop Loss</span></label>
            <select name="slType">
              <option value="pct" selected>%</option>
              <option value="atr">ATR</option>
            </select>
            <input type="number" name="slValue" value="0.02" min="0" step="any"/>
          </div>
          <div class="bt-field bt-row">
            <label class="bt-check"><input type="checkbox" name="useTP" checked/> <span>Take Profit</span></label>
            <select name="tpType">
              <option value="pct" selected>%</option>
              <option value="atr">ATR</option>
            </select>
            <input type="number" name="tpValue" value="0.05" min="0" step="any"/>
          </div>
          <div class="bt-field bt-row">
            <label class="bt-check"><input type="checkbox" name="useTrail"/> <span>Trailing stop</span></label>
            <select name="trailType">
              <option value="pct" selected>%</option>
              <option value="atr">ATR</option>
            </select>
            <input type="number" name="trailValue" value="0.03" min="0" step="any"/>
          </div>
          <div class="bt-field bt-row">
            <label class="bt-check"><input type="checkbox" name="allowShort"/> <span>Permitir cortos</span></label>
          </div>
        </div>
      </form>
    </div>
    <div class="bt-foot">
      <button class="bt-btn bt-btn-ghost" id="btCfgCancel">Cancelar</button>
      <button class="bt-btn bt-btn-primary" id="btCfgRun">Ejecutar backtest</button>
    </div>
  `;
  document.body.appendChild(back);
  document.body.appendChild(m);
  const close = () => { back.remove(); m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', close);
  m.querySelector('#btCfgX').addEventListener('click', close);
  m.querySelector('#btCfgCancel').addEventListener('click', close);
  m.querySelector('#btCfgRun').addEventListener('click', (ev) => {
    ev.preventDefault();
    const form = m.querySelector('#btCfgForm');
    const fd = new FormData(form);
    // clear errors
    m.querySelectorAll('.bt-err').forEach(e => e.textContent = '');
    const num = (k) => Number(fd.get(k));
    let valid = true;
    const setErr = (k, msg) => {
      valid = false;
      const el = m.querySelector(`[data-err="${k}"]`);
      if (el) el.textContent = msg;
    };
    const initialCapital = num('initialCapital');
    if (!isFinite(initialCapital) || initialCapital <= 0) setErr('initialCapital', 'Debe ser > 0');
    const positionSizeValue = num('positionSizeValue');
    if (!isFinite(positionSizeValue) || positionSizeValue <= 0) setErr('positionSizeValue', 'Debe ser > 0');
    const commission = num('commission');
    if (!isFinite(commission) || commission < 0) setErr('commission', 'Debe ser ≥ 0');
    if (!valid) return;
    const opts = {
      initialCapital,
      positionSize: fd.get('positionSize'),
      positionSizeValue,
      commission,
      slippage: fd.get('slippage'),
      slippageValue: Number(fd.get('slippageValue')) || 0,
      allowShort: fd.get('allowShort') === 'on',
      stopLoss: fd.get('useSL') === 'on' ? { type: fd.get('slType'), value: Number(fd.get('slValue')) || 0 } : null,
      takeProfit: fd.get('useTP') === 'on' ? { type: fd.get('tpType'), value: Number(fd.get('tpValue')) || 0 } : null,
      trailingStop: fd.get('useTrail') === 'on' ? { type: fd.get('trailType'), value: Number(fd.get('trailValue')) || 0 } : null,
    };
    runBacktestAndShow(strategy, opts);
    close();
  });
}

function runBacktestAndShow(strategy, opts) {
  const candles = (_ctx && _ctx.candles) || [];
  if (!candles.length) {
    alert('No hay datos cargados para ejecutar el backtest.');
    return;
  }
  let result;
  try {
    result = backtest(candles, strategy.fn, opts);
  } catch (e) {
    console.error('[backtest] failed', e);
    alert('Error ejecutando backtest: ' + (e && e.message || e));
    return;
  }
  // Persist to localStorage (last 5, FIFO)
  try {
    const slim = {
      ts: Date.now(),
      strategyId: strategy.id,
      strategyName: strategy.name,
      options: opts,
      metrics: result.metrics,
      tradesCount: result.trades.length,
    };
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(BT_RESULTS_KEY) || '[]'); } catch {}
    arr.push(slim);
    while (arr.length > BT_RESULTS_MAX) arr.shift();
    localStorage.setItem(BT_RESULTS_KEY, JSON.stringify(arr));
  } catch (e) { /* ignore */ }
  openBacktestResultsModal(strategy, result, opts);
}

function openBacktestResultsModal(strategy, result, opts) {
  _btCloseAll();
  const candles = (_ctx && _ctx.candles) || [];
  const fmtTime = (t) => {
    if (t == null) return '';
    const n = typeof t === 'number' ? t : Number(t);
    if (!isFinite(n)) return String(t);
    const d = new Date(n * 1000);
    return d.toISOString().slice(0, 10);
  };
  const startTime = candles.length ? candles[0].time : null;
  const endTime = candles.length ? candles[candles.length - 1].time : null;
  const m = result.metrics || {};
  const pct = (v) => (v == null || !isFinite(v)) ? '—' : (v * 100).toFixed(2) + '%';
  const num = (v, d=2) => (v == null || !isFinite(v)) ? '—' : Number(v).toFixed(d);
  const money = (v) => (v == null || !isFinite(v)) ? '—' : '$' + Number(v).toFixed(2);
  const colorReturn = (v) => v == null ? '' : (v >= 0 ? 'bt-pos' : 'bt-neg');
  const ds = m.deflatedSharpe;
  const dsClass = ds == null ? 'bt-ds-na' : (ds > 1 ? 'bt-ds-good' : (ds >= 0.5 ? 'bt-ds-warn' : 'bt-ds-bad'));
  const dsLabel = ds == null ? 'N/A' : (ds > 1 ? 'Robusto' : (ds >= 0.5 ? 'Marginal' : 'Probable falso positivo'));

  const back = document.createElement('div');
  back.className = 'bt-back';
  back.id = 'btResBack';
  const w = document.createElement('div');
  w.className = 'bt-modal bt-modal-lg';
  w.id = 'btResModal';
  w.innerHTML = `
    <div class="bt-head">
      <div class="bt-title-wrap">
        <span class="bt-title">Resultados: ${escapeHtml(strategy.name)}</span>
        <span class="bt-sub">${candles.length} barras · ${fmtTime(startTime)} → ${fmtTime(endTime)}</span>
      </div>
      <button class="bt-x" id="btResX" title="Cerrar" aria-label="Cerrar">✕</button>
    </div>
    <div class="bt-body bt-body-scroll">
      <div class="bt-ds-card ${dsClass}">
        <div class="bt-ds-l"><span class="bt-ds-label">Deflated Sharpe</span><span class="bt-ds-tag">${dsLabel}</span></div>
        <div class="bt-ds-v">${num(ds, 3)}</div>
      </div>
      <div class="bt-metrics-grid">
        <div class="bt-met"><span class="bt-met-l">Total Return</span><span class="bt-met-v ${colorReturn(m.totalReturn)}">${pct(m.totalReturn)}</span></div>
        <div class="bt-met"><span class="bt-met-l">CAGR</span><span class="bt-met-v ${colorReturn(m.cagr)}">${pct(m.cagr)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Sharpe</span><span class="bt-met-v">${num(m.sharpe, 3)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Sortino</span><span class="bt-met-v">${num(m.sortino, 3)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Calmar</span><span class="bt-met-v">${num(m.calmar, 3)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Max DD</span><span class="bt-met-v bt-neg">${pct(m.maxDrawdown)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Win Rate</span><span class="bt-met-v">${pct(m.winRate)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Profit Factor</span><span class="bt-met-v">${num(m.profitFactor, 2)}</span></div>
        <div class="bt-met"><span class="bt-met-l">Total Trades</span><span class="bt-met-v">${m.totalTrades ?? 0}</span></div>
        <div class="bt-met"><span class="bt-met-l">Winning</span><span class="bt-met-v bt-pos">${m.winningTrades ?? 0}</span></div>
        <div class="bt-met"><span class="bt-met-l">Losing</span><span class="bt-met-v bt-neg">${m.losingTrades ?? 0}</span></div>
        <div class="bt-met"><span class="bt-met-l">Expectancy</span><span class="bt-met-v">${money(m.expectancy)}</span></div>
      </div>

      <div class="bt-chart-section">
        <div class="bt-chart-title">Equity curve</div>
        <div id="btEquityChart" class="bt-chart-host" style="height:280px"></div>
      </div>
      <div class="bt-chart-section">
        <div class="bt-chart-title">Drawdown</div>
        <div id="btDDChart" class="bt-chart-host" style="height:120px"></div>
      </div>

      <div class="bt-trades-section">
        <button class="bt-collapse-toggle" id="btTradesToggle" aria-expanded="true">Trades (${result.trades.length})</button>
        <div class="bt-trades-wrap" id="btTradesWrap">
          ${_btRenderTradesTable(result.trades)}
        </div>
      </div>
    </div>
    <div class="bt-foot">
      <button class="bt-btn bt-btn-ghost" id="btResClose">Cerrar</button>
      <button class="bt-btn bt-btn-primary" id="btResCsv">Exportar CSV</button>
    </div>
  `;
  document.body.appendChild(back);
  document.body.appendChild(w);

  const close = () => {
    if (_btEquityChart) { try { _btEquityChart.remove(); } catch {} _btEquityChart = null; }
    if (_btDDChart) { try { _btDDChart.remove(); } catch {} _btDDChart = null; }
    back.remove(); w.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', close);
  w.querySelector('#btResX').addEventListener('click', close);
  w.querySelector('#btResClose').addEventListener('click', close);
  w.querySelector('#btResCsv').addEventListener('click', () => _btExportCsv(strategy, result));
  w.querySelector('#btTradesToggle').addEventListener('click', (ev) => {
    const wrap = w.querySelector('#btTradesWrap');
    const open = wrap.style.display !== 'none';
    wrap.style.display = open ? 'none' : '';
    ev.currentTarget.setAttribute('aria-expanded', String(!open));
  });

  // Build charts after DOM is in
  setTimeout(() => _btBuildCharts(result), 0);
}

function _btRenderTradesTable(trades) {
  if (!trades || !trades.length) {
    return `<div class="bt-empty">No se generaron operaciones.</div>`;
  }
  const fmt = (t) => {
    if (t == null) return '';
    const n = typeof t === 'number' ? t : Number(t);
    if (!isFinite(n)) return String(t);
    return new Date(n * 1000).toISOString().slice(0, 10);
  };
  const rows = trades.slice(0, 50).map(t => `
    <tr>
      <td>${escapeHtml(fmt(t.entryTime))}</td>
      <td>${escapeHtml(fmt(t.exitTime))}</td>
      <td>${escapeHtml(t.side || '')}</td>
      <td>${(t.qty != null ? Number(t.qty).toFixed(4) : '')}</td>
      <td class="${(t.pnl||0) >= 0 ? 'bt-pos' : 'bt-neg'}">${(t.pnl != null ? Number(t.pnl).toFixed(2) : '')}</td>
      <td class="${(t.pnlPct||0) >= 0 ? 'bt-pos' : 'bt-neg'}">${(t.pnlPct != null ? (Number(t.pnlPct) * 100).toFixed(2) + '%' : '')}</td>
      <td>${(t.durationBars != null ? t.durationBars : ((t.exitIdx != null && t.entryIdx != null) ? (t.exitIdx - t.entryIdx) : ''))}</td>
      <td>${escapeHtml(t.exitReason || '')}</td>
    </tr>
  `).join('');
  const moreNote = trades.length > 50 ? `<div class="bt-trades-more">Mostrando 50 de ${trades.length} operaciones.</div>` : '';
  return `
    <div class="bt-trades-scroll">
      <table class="bt-trades-table">
        <thead><tr>
          <th>Entry</th><th>Exit</th><th>Side</th><th>Qty</th><th>PnL</th><th>PnL %</th><th>Duration</th><th>Exit reason</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${moreNote}
  `;
}

function _btBuildCharts(result) {
  const eqHost = document.getElementById('btEquityChart');
  const ddHost = document.getElementById('btDDChart');
  if (!eqHost || !ddHost) return;
  const eq = (result.equityCurve || []).filter(p => p && p.time != null && isFinite(p.equity));
  if (!eq.length) {
    eqHost.innerHTML = '<div class="bt-empty">Sin datos de equity.</div>';
    ddHost.innerHTML = '<div class="bt-empty">Sin datos de drawdown.</div>';
    return;
  }
  // Dedup time values (lightweight-charts requires strictly ascending unique times)
  const seen = new Set();
  const eqData = [];
  for (const p of eq) {
    const t = Number(p.time);
    if (seen.has(t)) continue;
    seen.add(t);
    eqData.push({ time: t, value: Number(p.equity) });
  }
  eqData.sort((a, b) => a.time - b.time);

  // Drawdown series
  let peak = -Infinity;
  const ddData = eqData.map(p => {
    if (p.value > peak) peak = p.value;
    const dd = peak > 0 ? (p.value - peak) / peak : 0; // negative or zero
    return { time: p.time, value: dd * 100 };
  });

  const baseOpts = {
    layout: { background: { color: '#0f0f0f' }, textColor: '#dbdbdb' },
    grid: { vertLines: { color: '#1c1c1c' }, horzLines: { color: '#1c1c1c' } },
    rightPriceScale: { borderColor: '#2e2e2e' },
    timeScale: { borderColor: '#2e2e2e', timeVisible: true },
    crosshair: { mode: 0 },
    handleScroll: true, handleScale: true,
  };

  try {
    _btEquityChart = createChart(eqHost, { ...baseOpts, height: 280 });
    const eqSer = _btEquityChart.addSeries(AreaSeries, {
      lineColor: '#2962ff', topColor: 'rgba(41,98,255,0.4)', bottomColor: 'rgba(41,98,255,0.02)', lineWidth: 2,
    });
    eqSer.setData(eqData);
    // markers from signals
    const sigs = (result.signals || [])
      .filter(s => s && s.time != null)
      .map(s => ({
        time: Number(s.time),
        position: s.type === 'buy' ? 'belowBar' : 'aboveBar',
        color: s.type === 'buy' ? '#089981' : '#f23645',
        shape: s.type === 'buy' ? 'arrowUp' : 'arrowDown',
        text: s.type === 'buy' ? 'B' : 'S',
      }))
      .filter(s => isFinite(s.time))
      .sort((a, b) => a.time - b.time);
    // dedup marker times
    const sigSeen = new Set();
    const sigClean = sigs.filter(s => { if (sigSeen.has(s.time)) return false; sigSeen.add(s.time); return true; });
    if (sigClean.length) {
      try { createSeriesMarkers(eqSer, sigClean); } catch {}
    }
    _btEquityChart.timeScale().fitContent();
  } catch (e) {
    console.error('[backtest] equity chart failed', e);
    eqHost.innerHTML = '<div class="bt-empty">No se pudo crear el gráfico.</div>';
  }

  try {
    _btDDChart = createChart(ddHost, { ...baseOpts, height: 120 });
    const ddSer = _btDDChart.addSeries(AreaSeries, {
      lineColor: '#f23645', topColor: 'rgba(242,54,69,0.02)', bottomColor: 'rgba(242,54,69,0.4)', lineWidth: 1,
    });
    ddSer.setData(ddData);
    _btDDChart.timeScale().fitContent();
  } catch (e) {
    console.error('[backtest] drawdown chart failed', e);
    ddHost.innerHTML = '<div class="bt-empty">No se pudo crear el gráfico.</div>';
  }
}

function _btExportCsv(strategy, result) {
  const fmt = (t) => {
    if (t == null) return '';
    const n = typeof t === 'number' ? t : Number(t);
    if (!isFinite(n)) return String(t);
    return new Date(n * 1000).toISOString().slice(0, 10);
  };
  const esc = (s) => {
    const str = String(s ?? '');
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };
  const header = 'Entry Time,Exit Time,Side,Qty,Entry Price,Exit Price,PnL,PnL %,Duration (bars),Exit Reason';
  const lines = [header];
  for (const t of (result.trades || [])) {
    lines.push([
      esc(fmt(t.entryTime)),
      esc(fmt(t.exitTime)),
      esc(t.side || ''),
      (t.qty != null ? Number(t.qty).toFixed(6) : ''),
      (t.entry != null ? Number(t.entry).toFixed(4) : (t.entryPrice != null ? Number(t.entryPrice).toFixed(4) : '')),
      (t.exit != null ? Number(t.exit).toFixed(4) : (t.exitPrice != null ? Number(t.exitPrice).toFixed(4) : '')),
      (t.pnl != null ? Number(t.pnl).toFixed(4) : ''),
      (t.pnlPct != null ? (Number(t.pnlPct) * 100).toFixed(4) : ''),
      (t.durationBars != null ? t.durationBars : ((t.exitIdx != null && t.entryIdx != null) ? (t.exitIdx - t.entryIdx) : '')),
      esc(t.exitReason || ''),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backtest_${strategy.id}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
}

function _btCloseAll() {
  ['btPickBack','btPickModal','btCfgBack','btCfgModal','btResBack','btResModal'].forEach(id => {
    const el = document.getElementById(id); if (el) el.remove();
  });
  if (_btEquityChart) { try { _btEquityChart.remove(); } catch {} _btEquityChart = null; }
  if (_btDDChart) { try { _btDDChart.remove(); } catch {} _btDDChart = null; }
}
