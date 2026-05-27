// symbol-overview.js — TradingView clone "Symbol / Portfolio overview" page
// Public API: createSymbolOverviewPage(mount, opts) -> { render, destroy }
// Route: #/symbols/:symbol  (e.g. #/symbols/NVDA)
//
// Visual reference: Figma file 2QhXqtb66hdeKvlZAZE4fS, node 17:108911
//   The Figma source describes the "Mi cartera / portfolio" detail layout. We
//   re-skin it for a single symbol (NVDA by default). All recurring components
//   were extracted via get_design_context; SVG assets live in
//   public/figma/symbols/ and public/figma/fundamental-graphs/.

import { createChart, AreaSeries } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Design tokens (from Figma get_variable_defs + project palette)
// ---------------------------------------------------------------------------
const T = {
  bg0: '#0f0f0f',
  bg1: '#131313',
  bg2: '#1a1e21',
  bg3: '#1e222d',
  bd1: '#2a2e39',
  bd2: '#363a45',
  bdSoft: '#2e2e2e',
  txt0: '#f2f2f2',
  txt1: '#dbdbdb',
  txt2: '#8c8c8c',
  txt3: '#5d5d5d',
  blue: '#2962ff',
  azure: '#448aff',
  cyan: '#4dd0e1',
  cyanFill: '#22ab94',
  magenta: '#d500f9',
  orange: '#ff9800',
  red: '#f7525f',
  green: '#089981',
  greenText: '#22ab94',
};

// ---------------------------------------------------------------------------
// Figma-extracted assets
// ---------------------------------------------------------------------------
const FG = '/figma/fundamental-graphs';
const SY = '/figma/symbols';
const IMG = {
  // Reused from fundamental-graphs (same Figma file, same Components)
  logoMarkBg:   `${FG}/logo-mark-bg.svg`,
  logoMarkDot:  `${FG}/logo-mark-dot.svg`,
  logoWordmark: `${FG}/logo-wordmark.svg`,
  search:       `${FG}/search-icon.svg`,
  titleCaret:   `${FG}/title-caret.svg`,
  buttonPlus:   `${FG}/button-add-plus.svg`,
  navCaret:     `${FG}/nav-caret.svg`,
  // Right rail icons (Component 13 instances)
  railWatchA:   `${FG}/rail-watchlist-a.svg`,
  railWatchB:   `${FG}/rail-watchlist-b.svg`,
  railAlertA:   `${FG}/rail-alertas-a.svg`,
  railAlertB:   `${FG}/rail-alertas-b.svg`,
  railChatA:    `${FG}/rail-chats-a.svg`,
  railChatB:    `${FG}/rail-chats-b.svg`,
  railInd:      `${FG}/rail-indicators.svg`,
  railCal:      `${FG}/rail-calendarios.svg`,
  railComm:     `${FG}/rail-comunidad.svg`,
  railNotifA:   `${FG}/rail-notif-a.svg`,
  railNotifB:   `${FG}/rail-notif-b.svg`,
  railNotifC:   `${FG}/rail-notif-c.svg`,
  railNotifD:   `${FG}/rail-notif-d.svg`,
  railProd:     `${FG}/rail-productos.svg`,
  railHelp:     `${FG}/rail-help.svg`,
  // New: pie chart slices (Component 1 instance, node 17:108232)
  pieArc1: `${SY}/pie-arc1.svg`,
  pieArc2: `${SY}/pie-arc2.svg`,
  pieArc3: `${SY}/pie-arc3.svg`,
  pieArc4: `${SY}/pie-arc4.svg`,
  pieArc5: `${SY}/pie-arc5.svg`,
  pieArc6: `${SY}/pie-arc6.svg`,
  // New: row symbol marks (Component 17, Component 22 instances)
  logoOrclA: `${SY}/logo-orcl-a.svg`,
  logoOrclB: `${SY}/logo-orcl-b.svg`,
  logoBtcA:  `${SY}/logo-btc-a.svg`,
  logoBtcB:  `${SY}/logo-btc-b.svg`,
};

// ---------------------------------------------------------------------------
// Country flags (real PNGs from Figma — reused from calendar/, plus symbols/)
// ---------------------------------------------------------------------------
const FLAG_MAP = {
  US: '/figma/calendar/flag-us.png',
  GB: '/figma/calendar/flag-gb.png',
  JP: '/figma/calendar/flag-jp.png',
  KR: '/figma/calendar/flag-kr.png',
  CN: '/figma/calendar/flag-cn.png',
  DE: '/figma/calendar/flag-de.png',
  FR: '/figma/calendar/flag-fr.png',
  AR: '/figma/calendar/flag-ar.png',
  TR: '/figma/calendar/flag-tr.png',
  ZA: '/figma/calendar/flag-za.png',
  EU: '/figma/symbols/flag-eu.png',
};
function flagBadge(cc) {
  const code = (cc || '').toUpperCase();
  const src = FLAG_MAP[code];
  if (src) return `<img src="${src}" class="tv-sym-flag" alt="${code}" />`;
  return `<span class="tv-sym-flag-missing">${code}</span>`;
}
function flagStack(codes) {
  return `<span class="flag-stack">${codes.map(flagBadge).join('')}</span>`;
}

// ---------------------------------------------------------------------------
// Inline glyph fallbacks
// ---------------------------------------------------------------------------
const ICO = {
  caretDown: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretRight: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5L6.5 5 3.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  info: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 6v3.5M7 4.4v.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

// ---------------------------------------------------------------------------
// Style injection (scoped by tv-sym- prefix)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-sym-root {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${T.bg0};
  color: ${T.txt1};
  font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}
body.has-global-header  .tv-sym-root { top: 48px; }
body.has-global-rightbar .tv-sym-root { right: 45px; }
body.has-global-header  .tv-sym-header { display: none !important; }
body.has-global-rightbar .tv-sym-rail   { display: none !important; }
.tv-sym-root .tv-sym-logo, .tv-sym-root .tv-sym-logo-mark, .tv-sym-root .tv-sym-logo-word { display: none !important; }
/* Defensive: any SVG inside the root with default white fill (from Figma
 * var(--fill-0, white)) gets a transparent fill so it can't bleed. */
.tv-sym-root svg path[fill="var(--fill-0, white)"],
.tv-sym-root svg path[fill="white"] { fill: transparent; }
.tv-sym-header img, .tv-sym-rail img { max-width: 100%; max-height: 100%; }
.tv-sym-root *, .tv-sym-root *::before, .tv-sym-root *::after { box-sizing: border-box; }
.tv-sym-root button { font-family: inherit; }

/* ---- Header ---- */
.tv-sym-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px 0 40px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bd1};
  gap: 8px;
}
.tv-sym-logo {
  display: flex; align-items: center; gap: 8px; color: ${T.txt0};
  text-decoration: none; margin-right: 24px;
}
.tv-sym-logo-mark { position: relative; width: 36px; height: 28px; flex-shrink: 0; }
.tv-sym-logo-mark img { position: absolute; max-width: none; display: block; }
.tv-sym-logo-mark .bg  { top: 14.29%; right: 1.39%; bottom: 21.43%; left: 0; }
.tv-sym-logo-mark .dot { top: 14.29%; right: 33.33%; bottom: 57.14%; left: 44.44%; }
.tv-sym-logo-word { width: 147px; height: 28px; flex-shrink: 0; display: block; }
.tv-sym-search {
  display: flex; align-items: center; width: 220px; height: 40px;
  background: ${T.bg2}; border-radius: 6px; padding: 0 12px;
  color: ${T.txt2}; font-size: 13px; gap: 8px; cursor: text;
}
.tv-sym-nav { display: flex; align-items: center; margin-left: 8px; }
.tv-sym-nav a {
  padding: 0 16px; height: 40px; display: inline-flex; align-items: center;
  color: ${T.txt1}; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 6px;
}
.tv-sym-nav a:hover { background: ${T.bg2}; }
.tv-sym-nav a.is-active { color: ${T.blue}; }
.tv-sym-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tv-sym-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #d500f9 0%, #5d2bff 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.tv-sym-offer {
  height: 32px; padding: 0 14px; border-radius: 6px;
  background: linear-gradient(90deg, ${T.magenta} 0%, ${T.blue} 100%);
  color: #fff; border: none; font-weight: 600; font-size: 13px; cursor: pointer;
}

/* ---- Body ---- */
.tv-sym-body {
  flex: 1; display: flex; min-height: 0;
}
.tv-sym-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
}
.tv-sym-rail {
  flex-shrink: 0; width: 45px; background: ${T.bg0};
  border-left: 1px solid ${T.bd1};
  display: flex; flex-direction: column; align-items: center; padding: 2px 0;
}
.tv-sym-rail-btn {
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: ${T.txt2}; cursor: pointer; border-radius: 4px;
}
.tv-sym-rail-btn:hover, .tv-sym-rail-btn.is-active { background: ${T.bg2}; color: ${T.txt0}; }
.tv-sym-rail-glyph {
  position: relative; width: 28px; height: 28px; display: block;
  filter: invert(63%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(95%) contrast(85%);
}
.tv-sym-rail-btn:hover .tv-sym-rail-glyph,
.tv-sym-rail-btn.is-active .tv-sym-rail-glyph {
  filter: invert(98%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(102%) contrast(101%);
}
.tv-sym-rail-spacer { flex: 1; }
.tv-sym-rail-sep { width: 33px; height: 1px; background: ${T.bd2}; margin: 6px 0; }

/* ---- Page container ---- */
.tv-sym-page {
  max-width: 1395px;
  margin: 0 auto;
  padding: 24px 40px 48px;
}

/* ---- Breadcrumb ---- */
.tv-sym-breadcrumb {
  font-size: 13px; color: ${T.txt2}; display: flex; gap: 6px; align-items: center;
  margin-bottom: 14px;
}
.tv-sym-breadcrumb a { color: ${T.txt2}; text-decoration: none; }
.tv-sym-breadcrumb a:hover { color: ${T.txt1}; }
.tv-sym-breadcrumb .sep { color: ${T.txt3}; }

/* ---- Title row ---- */
.tv-sym-title-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
}
.tv-sym-title {
  font-family: Inter, -apple-system, sans-serif;
  font-size: 28px; font-weight: 700; color: ${T.txt0};
  margin: 0; display: flex; align-items: center; gap: 8px;
}
.tv-sym-title-caret { color: ${T.txt2}; cursor: pointer; }
.tv-sym-title-actions { margin-left: auto; display: flex; gap: 8px; }
.tv-sym-pill {
  height: 40px; padding: 0 14px; border-radius: 6px;
  background: ${T.bg2}; border: 1px solid ${T.bd1}; color: ${T.txt1};
  font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.tv-sym-pill:hover { background: ${T.bg3}; border-color: ${T.bd2}; }
.tv-sym-pill .caret { margin-left: 6px; color: ${T.txt2}; }
.tv-sym-subhead {
  font-size: 13px; color: ${T.blue}; margin-bottom: 24px; cursor: pointer;
}

/* ---- Tips banner ---- */
.tv-sym-tips {
  height: 60px; border: 1px solid ${T.bd1}; border-radius: 8px;
  display: flex; align-items: center; padding: 0 18px; gap: 8px;
  font-size: 14px; color: ${T.txt1}; margin-bottom: 24px;
}
.tv-sym-tips .ico { color: ${T.txt2}; display: inline-flex; }
.tv-sym-tips .label { font-weight: 500; }
.tv-sym-tips .info { color: ${T.txt2}; margin-left: 4px; display: inline-flex; }

/* ---- KPI tiles ---- */
.tv-sym-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
  margin-bottom: 36px;
}
.tv-sym-kpi {
  border: 1px solid ${T.bd1}; border-radius: 8px; padding: 16px;
  background: transparent;
}
.tv-sym-kpi-title { font-size: 16px; color: ${T.txt1}; margin-bottom: 12px; line-height: 24px; }
.tv-sym-kpi-row1 {
  display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
  font-family: Roboto, sans-serif;
}
.tv-sym-kpi-val { font-size: 24px; font-weight: 700; color: ${T.txt0}; line-height: 28px; }
.tv-sym-kpi-val.neg { color: ${T.red}; }
.tv-sym-kpi-val.pos { color: ${T.greenText}; }
.tv-sym-kpi-cur { font-size: 12px; color: ${T.txt2}; }
.tv-sym-kpi-pct { font-size: 16px; font-weight: 500; margin-left: 6px; }
.tv-sym-kpi-pct.neg { color: ${T.red}; }
.tv-sym-kpi-pct.pos { color: ${T.greenText}; }
.tv-sym-kpi-row2 {
  margin-top: 8px; font-size: 14px; color: ${T.txt2};
  display: flex; gap: 6px; flex-wrap: wrap;
}
.tv-sym-kpi-row2 .v { color: ${T.txt1}; }
.tv-sym-kpi-row2 .v.neg { color: ${T.red}; }
.tv-sym-kpi-row2 .v.pos { color: ${T.greenText}; }

/* ---- Tabs ---- */
.tv-sym-tabs {
  display: flex; gap: 24px; border-bottom: 1px solid ${T.bd1};
  margin-bottom: 24px;
}
.tv-sym-tab {
  padding: 6px 0 10px; font-size: 14px; font-weight: 500;
  color: ${T.txt2}; background: transparent; border: none;
  cursor: pointer; position: relative;
}
.tv-sym-tab:hover { color: ${T.txt1}; }
.tv-sym-tab.is-active { color: ${T.txt0}; }
.tv-sym-tab.is-active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; background: ${T.blue};
}

/* ---- Section ---- */
.tv-sym-section { margin-bottom: 40px; }
.tv-sym-section-title {
  font-family: Inter, sans-serif; font-size: 22px; font-weight: 600;
  color: ${T.txt0}; margin: 0 0 16px;
}

/* ---- Mode pills (Valor / Rendimiento) ---- */
.tv-sym-modepills { display: flex; gap: 8px; margin-bottom: 12px; }
.tv-sym-modepill {
  height: 34px; padding: 0 14px; border-radius: 17px;
  background: ${T.bg2}; color: ${T.txt1}; border: none;
  font-size: 13px; font-weight: 500; cursor: pointer;
}
.tv-sym-modepill.is-active { background: ${T.bg3}; color: ${T.txt0}; }

/* ---- Chart ---- */
.tv-sym-chart-wrap {
  position: relative;
  border: 1px solid ${T.bd1};
  border-radius: 8px;
  background: ${T.bg0};
  padding: 8px;
}
.tv-sym-chart { width: 100%; height: 380px; }
.tv-sym-chart-legend {
  position: absolute; top: 16px; left: 16px;
  background: rgba(15,15,15,0.85); padding: 6px 10px; border-radius: 6px;
  font-size: 13px; color: ${T.txt1}; display: flex; flex-direction: column; gap: 2px;
}
.tv-sym-chart-legend .row { display: flex; align-items: center; gap: 6px; }
.tv-sym-chart-legend .sw {
  width: 8px; height: 8px; border-radius: 50%;
}

/* ---- Period tiles (Component 16) ---- */
.tv-sym-periods {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
  margin-top: 16px;
}
.tv-sym-period {
  border-radius: 12px; padding: 8px 18px;
  display: flex; flex-direction: column; align-items: center;
  background: transparent; cursor: pointer;
}
.tv-sym-period:hover { background: ${T.bg2}; }
.tv-sym-period.is-active { background: ${T.bg3}; }
.tv-sym-period-label { font-size: 14px; color: ${T.txt1}; font-weight: 500; line-height: 24px; }
.tv-sym-period-val { font-size: 16px; font-weight: 500; line-height: 24px; }
.tv-sym-period-val.pos { color: ${T.greenText}; }
.tv-sym-period-val.neg { color: ${T.red}; }
.tv-sym-period-val.muted { color: ${T.txt2}; }

/* ---- Two-column layout for winners/losers ---- */
.tv-sym-cols2 {
  display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
  margin-bottom: 40px;
}

/* ---- Row table (Component 17) ---- */
.tv-sym-row {
  display: grid;
  grid-template-columns: 110px 1fr 60px;
  gap: 12px;
  align-items: center;
  padding: 4px 0;
}
.tv-sym-row + .tv-sym-row { margin-top: 4px; }
.tv-sym-row-logo {
  display: flex; align-items: center;
}
.tv-sym-row-mark {
  width: 24px; height: 24px; border-radius: 12px;
  background: ${T.bdSoft};
  display: inline-flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
  position: relative;
}
.tv-sym-row-mark .l1 { position: absolute; inset: 0; width: 100%; height: 100%; }
.tv-sym-row-mark .l2 { position: absolute; inset: 33.33% 22.22%; }
.tv-sym-row-mark .l2 img { width: 120%; height: 133.34%; margin: -16.67% -10%; max-width: none; display: block; }
.tv-sym-row-mark.bg-red { background: #f7525f; }
.tv-sym-row-mark.bg-green { background: ${T.green}; }
.tv-sym-row-mark.bg-blue { background: #2962ff; }
.tv-sym-row-mark.bg-meta { background: #1877f2; }
.tv-sym-row-mark.bg-nv { background: #76b900; }
.tv-sym-row-mark .letter {
  color: #fff; font-family: Roboto, sans-serif; font-weight: 700; font-size: 12px;
}
.tv-sym-row-sym {
  margin-left: 12px;
  background: ${T.bdSoft}; color: ${T.txt1};
  font-family: Roboto, sans-serif; font-weight: 700; font-size: 12px;
  border-radius: 6px; padding: 4px 8px; line-height: 16px;
  white-space: nowrap;
}
.tv-sym-row-bar {
  background: ${T.bdSoft}; height: 8px; border-radius: 4px;
  padding: 0; overflow: hidden;
  display: flex;
}
.tv-sym-row-bar-fill { height: 100%; border-radius: 4px; }
.tv-sym-row-bar-fill.pos { background: ${T.green}; }
.tv-sym-row-bar-fill.neg { background: ${T.red}; }
.tv-sym-row-val {
  font-family: Roboto, sans-serif; font-size: 14px; text-align: right;
}
.tv-sym-row-val.pos { color: ${T.greenText}; }
.tv-sym-row-val.neg { color: ${T.red}; }

/* ---- Donut chart layout ---- */
.tv-sym-dist {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 64px;
  align-items: start;
}
.tv-sym-dist-tabs { display: flex; gap: 0; margin-bottom: 24px; grid-column: 1 / -1; }
.tv-sym-dist-tab {
  height: 34px; padding: 0 14px; border-radius: 17px;
  background: transparent; color: ${T.txt1}; border: none;
  font-size: 13px; font-weight: 500; cursor: pointer;
}
.tv-sym-dist-tab.is-active { background: ${T.bg3}; color: ${T.txt0}; }
.tv-sym-dist-pie {
  width: 320px; height: 320px; position: relative;
}
.tv-sym-dist-pie svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.tv-sym-dist-pie .center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: ${T.txt0};
}
.tv-sym-dist-pie .count { font-size: 28px; font-weight: 700; line-height: 32px; }
.tv-sym-dist-pie .lbl { font-size: 16px; color: ${T.txt1}; line-height: 24px; margin-top: 2px; }
.tv-sym-dist-pie .pct {
  position: absolute; font-size: 16px; color: #fff; font-family: Inter, sans-serif;
}
.tv-sym-dist-pie .pct.big   { top: 50%; right: 18%; transform: translateY(-50%); }
.tv-sym-dist-pie .pct.small { top: 18%; left: 18%; }
.tv-sym-dist-pie .arc-lbl {
  position: absolute; font-size: 14px; color: ${T.txt2}; line-height: 16px;
}
.tv-sym-dist-pie .arc-lbl.right { top: 82%; right: -2%; }
.tv-sym-dist-pie .arc-lbl.left  { top: 18%;  left: -8%; }

/* ---- Distribution table ---- */
.tv-sym-disttbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tv-sym-disttbl th {
  text-align: left; font-weight: 500; color: ${T.txt2};
  padding: 12px 8px; border-bottom: 1px solid ${T.bd1};
}
.tv-sym-disttbl th.r { text-align: right; }
.tv-sym-disttbl td {
  padding: 12px 8px; border-bottom: 1px solid ${T.bd1};
  color: ${T.txt1};
}
.tv-sym-disttbl td.r { text-align: right; }
.tv-sym-disttbl td.neg { color: ${T.red}; }
.tv-sym-disttbl .swatch {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 8px; vertical-align: middle;
}
.tv-sym-disttbl .cur { font-size: 12px; color: ${T.txt2}; margin-left: 4px; }

/* ---- Generic data table (Próximos beneficios / dividendos) ---- */
.tv-sym-tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tv-sym-tbl th {
  text-align: left; font-weight: 500; color: ${T.txt2};
  padding: 14px 12px; border-bottom: 1px solid ${T.bd1};
  background: ${T.bg1};
}
.tv-sym-tbl th.r { text-align: right; }
.tv-sym-tbl td {
  padding: 12px 12px; border-bottom: 1px solid ${T.bd1};
  color: ${T.txt1};
}
.tv-sym-tbl td.r { text-align: right; font-family: Roboto, sans-serif; }
.tv-sym-tbl td.muted { color: ${T.txt2}; }
.tv-sym-tbl td.sym-cell { display: flex; align-items: center; gap: 12px; }
.tv-sym-tbl .upcoming-row { background: transparent; }
.tv-sym-tbl .upcoming-row td { color: ${T.txt2}; font-size: 13px; padding: 9px 12px; }
.tv-sym-tbl .upcoming-row td:first-child { padding-left: 12px; }

/* ---- News list ---- */
.tv-sym-news {
  width: 100%; border-collapse: collapse;
}
.tv-sym-news th {
  text-align: left; font-weight: 500; color: ${T.txt2}; font-size: 14px;
  padding: 14px 12px; border-bottom: 1px solid ${T.bd1};
}
.tv-sym-news td {
  padding: 14px 12px; border-bottom: 1px solid ${T.bd1};
  color: ${T.txt1}; font-size: 14px; vertical-align: middle;
}
.tv-sym-news td.t { color: ${T.txt2}; width: 110px; }
.tv-sym-news td.inst { width: 110px; }
.tv-sym-news td.inst .mk {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 9px; overflow: hidden;
  background: ${T.bdSoft};
}
.tv-sym-news td.inst .mk.bg-orange { background: #f7931a; }
.tv-sym-news td.inst .mk.bg-meta { background: #1877f2; color: #fff; font-size: 10px; font-weight: 700; }
.tv-sym-news td.inst .mk.bg-nv { background: #76b900; color: #fff; font-size: 10px; font-weight: 700; }
.tv-sym-news td.inst .mk.bg-red { background: #f7525f; color: #fff; font-size: 10px; font-weight: 700; }
.tv-sym-news td.inst .flag-stack { display: inline-flex; align-items: center; }
.tv-sym-news td.inst .flag-stack .tv-sym-flag {
  width: 18px; height: 18px; border-radius: 9px; object-fit: cover;
  box-shadow: 0 0 0 1px ${T.bg1}; margin-left: -3px;
}
.tv-sym-news td.inst .flag-stack .tv-sym-flag:first-child { margin-left: 0; }
.tv-sym-news td.inst .flag-stack .tv-sym-flag-missing {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 9px;
  background: ${T.bdSoft}; color: ${T.txt2};
  font-size: 8px; font-weight: 700; letter-spacing: 0;
  box-shadow: 0 0 0 1px ${T.bg1}; margin-left: -3px;
}
.tv-sym-news td.inst .flag-stack .tv-sym-flag-missing:first-child { margin-left: 0; }
.tv-sym-news td.headline { color: ${T.txt0}; cursor: pointer; }
.tv-sym-news td.headline:hover { color: ${T.blue}; }
.tv-sym-news td.prov { color: ${T.txt2}; text-align: right; width: 180px; }

/* ---- Search row ---- */
.tv-sym-search-row {
  display: flex; align-items: center;
  height: 40px; padding: 0 12px; gap: 8px;
  border: 1px solid ${T.bd1}; border-radius: 6px;
  margin-top: 16px; color: ${T.txt2};
}
.tv-sym-search-row input {
  flex: 1; background: transparent; border: none; outline: none;
  color: ${T.txt1}; font-size: 14px;
}
`;
  const tag = document.createElement('style');
  tag.id = 'tv-sym-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Mock data builder — realistic-shape NVDA 5y price history
// ---------------------------------------------------------------------------
function buildPriceSeries(seed = 1) {
  const out = [];
  const start = new Date('2021-06-01').getTime();
  const day = 86400000;
  let v = 120;
  let rng = seed * 9301 + 49297;
  function rand() { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; }
  const n = 260 * 5; // ~5y of business days, daily-ish
  for (let i = 0; i < n; i += 5) {
    // overall growth + cyclical waves + noise
    const trend = 0.0015;
    const wave = Math.sin(i / 38) * 0.012 + Math.sin(i / 110) * 0.018;
    const noise = (rand() - 0.5) * 0.03;
    v *= 1 + trend + wave + noise;
    v = Math.max(40, Math.min(v, 380));
    out.push({
      time: Math.floor((start + i * day) / 1000),
      value: Math.round(v * 100) / 100,
    });
  }
  return out;
}

function buildPctSeries(price) {
  const base = price[0].value;
  return price.map((p) => ({ time: p.time, value: ((p.value - base) / base) * 100 }));
}

// ---------------------------------------------------------------------------
// Row builder for winners/losers tables (Component 17)
// ---------------------------------------------------------------------------
function rowMark(spec) {
  // spec.kind: 'orcl' uses real Figma SVG layered. Others: solid bg + letter.
  if (spec.kind === 'orcl') {
    return `
      <span class="tv-sym-row-mark">
        <img class="l1" src="${IMG.logoOrclA}" alt="" />
        <span class="l2"><img src="${IMG.logoOrclB}" alt="" /></span>
      </span>`;
  }
  if (spec.kind === 'btc') {
    return `
      <span class="tv-sym-row-mark" style="background:#f7931a">
        <img class="l1" src="${IMG.logoBtcA}" alt="" />
        <span class="l2"><img src="${IMG.logoBtcB}" alt="" /></span>
      </span>`;
  }
  return `<span class="tv-sym-row-mark bg-${spec.bg}"><span class="letter">${spec.letter}</span></span>`;
}

function buildRow(item) {
  const dir = item.pct >= 0 ? 'pos' : 'neg';
  const widthPct = Math.min(100, Math.abs(item.pct) * 4);
  const sign = item.pct > 0 ? '+' : '';
  return `
    <div class="tv-sym-row">
      <div class="tv-sym-row-logo">
        ${rowMark(item)}
        <span class="tv-sym-row-sym">${item.tk}</span>
      </div>
      <div class="tv-sym-row-bar">
        <div class="tv-sym-row-bar-fill ${dir}" style="width:${widthPct}%"></div>
      </div>
      <div class="tv-sym-row-val ${dir}">${sign}${item.pct.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Rail icon helper
// ---------------------------------------------------------------------------
function railIcon(title, layers, active = false) {
  const imgs = layers.map((l) => {
    const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;`;
    return `<img src="${l.src}" alt="" style="${style}width:auto;height:auto;display:block;max-width:none;" />`;
  }).join('');
  return `<button class="tv-sym-rail-btn${active ? ' is-active' : ''}" title="${title}"><span class="tv-sym-rail-glyph">${imgs}</span></button>`;
}

// ---------------------------------------------------------------------------
// Page factory
// ---------------------------------------------------------------------------
export function createSymbolOverviewPage(mount, opts = {}) {
  ensureStyles();

  const symbol = (opts.symbol || 'NVDA').toUpperCase();

  // Mock symbol profile data
  const PROFILE = {
    NVDA: {
      name: 'NVIDIA Corporation',
      logo: { kind: 'nv', letter: 'N' },
      price: 142.83,
      currency: 'USD',
      change: -3.42,
      pct: -2.34,
      bid: 142.80, ask: 142.85,
    },
    TSLA: {
      name: 'Tesla, Inc.',
      logo: { kind: 'sym', bg: 'red', letter: 'T' },
      price: 248.50,
      currency: 'USD',
      change: 4.12,
      pct: 1.69,
      bid: 248.47, ask: 248.53,
    },
    AAPL: {
      name: 'Apple Inc.',
      logo: { kind: 'sym', bg: 'gray', letter: 'A' },
      price: 189.95,
      currency: 'USD',
      change: -0.78,
      pct: -0.41,
      bid: 189.92, ask: 189.98,
    },
    MSFT: {
      name: 'Microsoft Corporation',
      logo: { kind: 'sym', bg: 'blue', letter: 'M' },
      price: 415.26,
      currency: 'USD',
      change: 2.34,
      pct: 0.57,
      bid: 415.22, ask: 415.30,
    },
    GOOGL: {
      name: 'Alphabet Inc.',
      logo: { kind: 'sym', bg: 'green', letter: 'G' },
      price: 172.18,
      currency: 'USD',
      change: 1.05,
      pct: 0.61,
      bid: 172.15, ask: 172.21,
    },
    AMZN: {
      name: 'Amazon.com Inc.',
      logo: { kind: 'sym', bg: 'orange', letter: 'A' },
      price: 198.42,
      currency: 'USD',
      change: -1.23,
      pct: -0.62,
      bid: 198.39, ask: 198.45,
    },
    META: {
      name: 'Meta Platforms Inc.',
      logo: { kind: 'sym', bg: 'meta', letter: 'M' },
      price: 562.78,
      currency: 'USD',
      change: -12.15,
      pct: -2.16,
      bid: 562.72, ask: 562.84,
    },
    SPX: {
      name: 'S&P 500 Index',
      logo: { kind: 'sym', bg: 'blue', letter: 'S' },
      price: 5825.34,
      currency: 'USD',
      change: 18.42,
      pct: 0.32,
      bid: 5825.20, ask: 5825.48,
    },
  };
  if (!PROFILE[symbol]) {
    console.warn('[symbol-overview] no profile for', symbol, '— falling back to NVDA');
  }
  const p = PROFILE[symbol] || PROFILE.NVDA;

  mount.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'tv-sym-root';

  // -------------------- Build HTML --------------------
  const winners = [
    { kind: 'orcl', tk: 'ORCL', pct: 1.22 },
  ];
  const losers = [
    { kind: 'sym', bg: 'red', letter: 'C', tk: 'CSU',   pct: -16.54 },
    { kind: 'sym', bg: 'meta', letter: 'M', tk: 'META', pct: -2.16 },
    { kind: 'sym', bg: 'nv', letter: 'N', tk: 'NVDA',   pct: -1.90 },
    { kind: 'btc', tk: 'BTCUSD',                       pct: -0.73 },
  ];

  root.innerHTML = `
    <div class="tv-sym-header">
      <a href="#/" class="tv-sym-logo" aria-label="TradingView">
        <span class="tv-sym-logo-mark">
          <img class="bg"  src="${IMG.logoMarkBg}"  alt="" />
          <img class="dot" src="${IMG.logoMarkDot}" alt="" />
        </span>
        <img class="tv-sym-logo-word" src="${IMG.logoWordmark}" alt="TradingView" />
      </a>
      <div class="tv-sym-search">${ICO.search}<span>Buscar (Ctrl+K)</span></div>
      <nav class="tv-sym-nav">
        <a href="#/" class="is-active">Productos</a>
        <a href="#/community">Comunidad</a>
        <a href="#/markets">Mercados</a>
        <a href="#/brokers">Brókeres</a>
        <a href="#/">Más</a>
      </nav>
      <div class="tv-sym-header-right">
        <div class="tv-sym-avatar" title="Perfil">H</div>
        <button class="tv-sym-offer">Ampliar</button>
      </div>
    </div>

    <div class="tv-sym-body">
      <div class="tv-sym-scroll">
        <div class="tv-sym-page">
          <div class="tv-sym-breadcrumb">
            <a href="#/portfolios">Carteras</a>
            <span class="sep">/</span>
            <span>${p.name}</span>
          </div>

          <div class="tv-sym-title-row">
            <h1 class="tv-sym-title">${symbol} <span class="tv-sym-title-caret">${ICO.caretDown}</span></h1>
            <div class="tv-sym-title-actions">
              <button class="tv-sym-pill">Añadir transacción <span class="caret">${ICO.caretDown}</span></button>
            </div>
          </div>
          <div class="tv-sym-subhead">Añadir descripción</div>

          <div class="tv-sym-tips">
            <span class="ico">${ICO.caretRight}</span>
            <span class="label">Consejos para la cartera</span>
            <span class="info">${ICO.info}</span>
          </div>

          <div class="tv-sym-kpis">
            <div class="tv-sym-kpi">
              <div class="tv-sym-kpi-title">Valor de la cartera</div>
              <div class="tv-sym-kpi-row1">
                <span class="tv-sym-kpi-val neg">−436,38</span>
                <span class="tv-sym-kpi-cur">USD</span>
              </div>
              <div class="tv-sym-kpi-row2">Efectivo <span class="v neg">−7.032,90</span></div>
            </div>
            <div class="tv-sym-kpi">
              <div class="tv-sym-kpi-title">Ganancia no realizada</div>
              <div class="tv-sym-kpi-row1">
                <span class="tv-sym-kpi-val neg">−436,38</span>
                <span class="tv-sym-kpi-cur">USD</span>
                <span class="tv-sym-kpi-pct neg">−6,20%</span>
              </div>
              <div class="tv-sym-kpi-row2">Último día <span class="v neg">−178,08</span> <span class="v neg">−2,63%</span></div>
            </div>
            <div class="tv-sym-kpi">
              <div class="tv-sym-kpi-title">Ganancia realizada</div>
              <div class="tv-sym-kpi-row1">
                <span class="tv-sym-kpi-val">0,00</span>
                <span class="tv-sym-kpi-cur">USD</span>
              </div>
              <div class="tv-sym-kpi-row2">Total de dividendos <span class="v">0,00</span> <span class="cur" style="font-size:12px;color:${T.txt2}">USD</span></div>
            </div>
            <div class="tv-sym-kpi">
              <div class="tv-sym-kpi-title">Ganancia total</div>
              <div class="tv-sym-kpi-row1">
                <span class="tv-sym-kpi-val neg">−436,38</span>
                <span class="tv-sym-kpi-cur">USD</span>
                <span class="tv-sym-kpi-pct neg">−7,75%</span>
              </div>
              <div class="tv-sym-kpi-row2">Rendimiento anualizado <span class="v neg">−23,19%</span></div>
            </div>
          </div>

          <div class="tv-sym-tabs" data-tabs>
            <button class="tv-sym-tab is-active" data-tab="resumen">Resumen</button>
            <button class="tv-sym-tab" data-tab="participaciones">Participaciones</button>
            <button class="tv-sym-tab" data-tab="transacciones">Transacciones</button>
            <button class="tv-sym-tab" data-tab="analisis">Análisis</button>
          </div>

          <section class="tv-sym-section">
            <h2 class="tv-sym-section-title">Cambio en la cartera</h2>
            <div class="tv-sym-modepills" data-modepills>
              <button class="tv-sym-modepill" data-mode="valor">Valor</button>
              <button class="tv-sym-modepill is-active" data-mode="rend">Rendimiento</button>
            </div>
            <div class="tv-sym-chart-wrap">
              <div class="tv-sym-chart-legend">
                <div class="row"><span class="sw" style="background:${T.cyan}"></span><span>Cartera</span></div>
                <div class="row"><span class="sw" style="background:${T.red}"></span><span>SPX</span></div>
              </div>
              <div class="tv-sym-chart" data-chart></div>
            </div>
            <div class="tv-sym-periods" data-periods>
              <button class="tv-sym-period" data-period="1m"><span class="tv-sym-period-label">1 mes</span><span class="tv-sym-period-val pos">6,57%</span></button>
              <button class="tv-sym-period" data-period="3m"><span class="tv-sym-period-label">3 meses</span><span class="tv-sym-period-val pos">19,83%</span></button>
              <button class="tv-sym-period" data-period="6m"><span class="tv-sym-period-label">6 meses</span><span class="tv-sym-period-val neg">−5,06%</span></button>
              <button class="tv-sym-period" data-period="ytd"><span class="tv-sym-period-label">Año hasta la fecha</span><span class="tv-sym-period-val neg">−3,99%</span></button>
              <button class="tv-sym-period" data-period="1y"><span class="tv-sym-period-label">1 año</span><span class="tv-sym-period-val muted">—</span></button>
              <button class="tv-sym-period is-active" data-period="all"><span class="tv-sym-period-label">Todo el tiempo</span><span class="tv-sym-period-val neg">−7,75%</span></button>
            </div>
          </section>

          <div class="tv-sym-cols2">
            <section class="tv-sym-section">
              <h2 class="tv-sym-section-title">Ganadoras diarias</h2>
              ${winners.map(buildRow).join('')}
            </section>
            <section class="tv-sym-section">
              <h2 class="tv-sym-section-title">Perdedoras diarias</h2>
              ${losers.map(buildRow).join('')}
            </section>
          </div>

          <section class="tv-sym-section">
            <h2 class="tv-sym-section-title">Distribución de la cartera</h2>
            <div class="tv-sym-dist-tabs">
              <button class="tv-sym-dist-tab">Activos</button>
              <button class="tv-sym-dist-tab is-active">Tipos de activos</button>
              <button class="tv-sym-dist-tab">Sectores</button>
              <button class="tv-sym-dist-tab">Divisas</button>
            </div>
            <div class="tv-sym-dist">
              <div class="tv-sym-dist-pie">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="${T.cyan}" stroke-width="20"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="${T.azure}"
                    stroke-width="20" stroke-dasharray="172.7 251.3" stroke-dashoffset="0"/>
                </svg>
                <div class="center">
                  <div class="count">5</div>
                  <div class="lbl">Activos totales</div>
                </div>
                <div class="pct big">69%</div>
                <div class="pct small">31%</div>
                <div class="arc-lbl right">Acciones</div>
                <div class="arc-lbl left">Cripto</div>
              </div>
              <table class="tv-sym-disttbl">
                <thead>
                  <tr>
                    <th>Clase de activo</th>
                    <th class="r">Valor de títulos en cartera</th>
                    <th class="r">Reparto</th>
                    <th class="r">Ganancia no realizada</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="swatch" style="background:${T.azure}"></span>Acciones</td>
                    <td class="r">4.534,95<span class="cur">USD</span></td>
                    <td class="r">68,75%</td>
                    <td class="r neg">−158,96<span class="cur">USD</span></td>
                  </tr>
                  <tr>
                    <td><span class="swatch" style="background:${T.cyan}"></span>Cripto</td>
                    <td class="r">2.061,58<span class="cur">USD</span></td>
                    <td class="r">31,25%</td>
                    <td class="r neg">−277,42<span class="cur">USD</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="tv-sym-section">
            <h2 class="tv-sym-section-title">Próximos beneficios</h2>
            <table class="tv-sym-tbl">
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th class="r">BPA estimado</th>
                  <th class="r">BPA real</th>
                  <th class="r">Sorpresa</th>
                  <th class="r">Capitalización<br>de mercado</th>
                </tr>
              </thead>
              <tbody>
                <tr class="upcoming-row"><td colspan="7">PRÓXIMOS 30 DÍAS</td></tr>
                <tr>
                  <td class="sym-cell">${rowMark({ kind: 'orcl' })}<span class="tv-sym-row-sym">ORCL</span><span style="color:${T.txt2}">Oracle Corporation</span></td>
                  <td>16 jun 2026</td>
                  <td class="muted">—</td>
                  <td class="r">1,95 USD</td>
                  <td class="r muted">—</td>
                  <td class="r muted">—</td>
                  <td class="r">552,43 B USD</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tv-sym-section">
            <h2 class="tv-sym-section-title">Próximos dividendos</h2>
            <div class="tv-sym-modepills">
              <button class="tv-sym-modepill is-active">Por fecha exdividendo</button>
              <button class="tv-sym-modepill">Por fecha de pago</button>
            </div>
            <table class="tv-sym-tbl">
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th class="r">Cantidad</th>
                  <th class="r">Fecha exdividendo</th>
                  <th class="r">Fecha de pago</th>
                  <th class="r">Rentabilidad por<br>dividendo</th>
                </tr>
              </thead>
              <tbody>
                <tr class="upcoming-row"><td colspan="5">PRÓXIMOS 30 DÍAS</td></tr>
                <tr>
                  <td class="sym-cell"><span class="tv-sym-row-mark bg-nv"><span class="letter">N</span></span><span class="tv-sym-row-sym">NVDA</span><span style="color:${T.txt2}">NVIDIA Corporation</span></td>
                  <td class="r">0,75 USD</td>
                  <td class="r" style="color:${T.txt0}">4 jun 2026</td>
                  <td class="r">26 jun 2026</td>
                  <td class="r">0,46%</td>
                </tr>
                <tr>
                  <td class="sym-cell"><span class="tv-sym-row-mark" style="background:#1f6fbf"><span class="letter">C</span></span><span class="tv-sym-row-sym">CSU</span><span style="color:${T.txt2}">Constellation Software Inc.</span></td>
                  <td class="r">1,38 CAD</td>
                  <td class="r" style="color:${T.txt0}">19 jun 2026</td>
                  <td class="r">10 jul 2026</td>
                  <td class="r">0,21%</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tv-sym-section">
            <h2 class="tv-sym-section-title">Noticias</h2>
            <table class="tv-sym-news">
              <thead>
                <tr><th>Hora</th><th>Instrumento</th><th>Titular</th><th style="text-align:right">Proveedor</th></tr>
              </thead>
              <tbody>
                <tr><td class="t">hace 40 minutos</td><td class="inst"><span class="mk bg-orange"><img src="${IMG.logoBtcA}" width="18" height="18" alt="" /></span></td><td class="headline">¿Qué debes saber sobre Kevin Warsh, el nuevo presidente de la Fed?</td><td class="prov">Beincrypto</td></tr>
                <tr><td class="t">hace 2 horas</td><td class="inst"><span class="mk bg-meta">M</span></td><td class="headline">¿Por qué Meta podría alcanzar los 1.000 dólares para finales del 2026?</td><td class="prov">Estrategias de inversión</td></tr>
                <tr><td class="t">hace 3 horas</td><td class="inst"><span class="mk bg-orange"><img src="${IMG.logoBtcA}" width="18" height="18" alt="" /></span></td><td class="headline">Bitcoin Fakeout bajo reporte clave: alerta por manos débiles y posible rally alcista</td><td class="prov">NewsBTC</td></tr>
                <tr><td class="t">hace 3 horas</td><td class="inst">${flagStack(['US','JP','EU','GB'])}</td><td class="headline">Nvidia sale más que España, Italia y Australia juntos</td><td class="prov">Estrategias de inversión</td></tr>
                <tr><td class="t">hace 4 horas</td><td class="inst"><span class="mk bg-orange"><img src="${IMG.logoBtcA}" width="18" height="18" alt="" /></span></td><td class="headline">Batalla del flujo de Bitcoin en hora decisiva: señal de posible rebote y próxima recuperación</td><td class="prov">NewsBTC</td></tr>
                <tr><td class="t">hace 5 horas</td><td class="inst"><span class="mk bg-orange"><img src="${IMG.logoBtcA}" width="18" height="18" alt="" /></span></td><td class="headline">Bitcoin muestra influjos netos positivos en Binance durante 10 días, posible señal de venta</td><td class="prov">NewsBTC</td></tr>
                <tr><td class="t">hace 8 horas</td><td class="inst"><span class="mk bg-nv">M</span></td><td class="headline">Strategy reduce deuda y refuerza su posición de Bitcoin: impacto para los accionistas de MSTR</td><td class="prov">NewsBTC</td></tr>
                <tr><td class="t">hace 10 horas</td><td class="inst"><span class="mk bg-orange"><img src="${IMG.logoBtcA}" width="18" height="18" alt="" /></span></td><td class="headline">Bitcoin se recupera tras la subida del bono coordinado, el impulso del posible acuerdo EE.UU.-Irán</td><td class="prov">NewsBTC</td></tr>
                <tr><td class="t">hace 17 horas</td><td class="inst">${flagStack(['US','JP','EU','GB'])}</td><td class="headline">Dólar cae tras descenso del petróleo ante esperanzas de acuerdo sobre estrecho de Or</td><td class="prov">Reuters</td></tr>
                <tr><td class="t">hace 19 horas</td><td class="inst">${flagStack(['US','JP','EU','GB'])}</td><td class="headline">Dólar cae junto al petróleo debido a esperanzas de acuerdo sobre el estrecho de Or</td><td class="prov">Reuters</td></tr>
              </tbody>
            </table>
            <div class="tv-sym-search-row">${ICO.search}<input type="text" placeholder="Buscar noticias…" /></div>
          </section>
        </div>
      </div>

      <aside class="tv-sym-rail" aria-label="Widgets">
        ${railIcon('Listas',         [{ src: IMG.railWatchA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railWatchB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Alertas',        [{ src: IMG.railAlertA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railAlertB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Chats',          [{ src: IMG.railChatA,  t: 20.45, r: 20.45, b: 45.45, l: 20.45 }, { src: IMG.railChatB,  t: 25, r: 25,    b: 25,    l: 25 }])}
        <div class="tv-sym-rail-spacer"></div>
        ${railIcon('Selector de datos', [{ src: IMG.railInd, t: 25, r: 22.7, b: 18.84, l: 22.73 }])}
        ${railIcon('Calendarios',    [{ src: IMG.railCal, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
        ${railIcon('Comunidad',      [{ src: IMG.railComm, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
        ${railIcon('Notificaciones', [
          { src: IMG.railNotifA, t: 22.73, r: 25,    b: 27.27, l: 25 },
          { src: IMG.railNotifB, t: 36.36, r: 38.64, b: 27.27, l: 25 },
          { src: IMG.railNotifC, t: 50,    r: 52.27, b: 27.27, l: 25 },
          { src: IMG.railNotifD, t: 63.64, r: 65.91, b: 27.27, l: 25 },
        ])}
        <div class="tv-sym-rail-sep"></div>
        <button class="tv-sym-rail-btn is-active" title="Productos"><span class="tv-sym-rail-glyph"><img src="${IMG.railProd}" alt="" style="position:absolute;top:11.36%;right:11.36%;bottom:11.36%;left:11.36%;width:auto;height:auto;display:block;max-width:none;" /></span></button>
        ${railIcon('Ayuda', [{ src: IMG.railHelp, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
      </aside>
    </div>
  `;

  mount.appendChild(root);

  // -------------------- Chart --------------------
  const chartEl = root.querySelector('[data-chart]');
  let chart = null;
  let portfolioSeries = null;
  let spxSeries = null;

  function initChart() {
    if (!chartEl || chart) return;
    chart = createChart(chartEl, {
      layout: {
        background: { type: 'solid', color: T.bg0 },
        textColor: T.txt2,
        fontFamily: 'Roboto, sans-serif',
        fontSize: 11,
      },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: T.bd1 } },
      rightPriceScale: { borderVisible: false, textColor: T.txt2 },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { mode: 0 },
    });
    const priceP = buildPriceSeries(3);
    const priceS = buildPriceSeries(11);
    const pctP = buildPctSeries(priceP);
    const pctS = buildPctSeries(priceS);

    portfolioSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(77,208,225,0.15)',
      bottomColor: 'rgba(77,208,225,0.00)',
      lineColor: T.cyan,
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (v) => v.toFixed(2) + '%' },
    });
    spxSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(247,82,95,0.10)',
      bottomColor: 'rgba(247,82,95,0.00)',
      lineColor: T.red,
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (v) => v.toFixed(2) + '%' },
    });
    portfolioSeries.setData(pctP);
    spxSeries.setData(pctS);
    chart.timeScale().fitContent();
  }

  function resizeChart() {
    if (!chart || !chartEl) return;
    const r = chartEl.getBoundingClientRect();
    chart.applyOptions({ width: r.width, height: r.height });
  }

  const onResize = () => resizeChart();

  // -------------------- Tab interactions --------------------
  root.querySelector('[data-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('is-active', x === b));
  });
  root.querySelector('[data-modepills]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
  });
  root.querySelector('[data-periods]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-period]');
    if (!b) return;
    root.querySelectorAll('[data-period]').forEach((x) => x.classList.toggle('is-active', x === b));
  });

  // -------------------- Lifecycle --------------------
  function render() {
    initChart();
    requestAnimationFrame(resizeChart);
    window.addEventListener('resize', onResize);
  }
  function destroy() {
    window.removeEventListener('resize', onResize);
    try { chart && chart.remove(); } catch {}
    chart = null;
    root.remove();
  }

  return { render, destroy, root, symbol: p };
}

export default createSymbolOverviewPage;
