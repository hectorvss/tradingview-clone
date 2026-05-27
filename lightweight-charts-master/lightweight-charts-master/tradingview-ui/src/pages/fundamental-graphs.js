// fundamental-graphs.js — TradingView clone "Gráficos fundamentales" page
// Public API: createFundamentalGraphsPage(mount, opts) -> { destroy }
// Self-contained: owns its own top header, title bar, wizard panel, chart,
// bottom timeframe controls, right widget rail, and two modals
// (Añadir símbolo / Añadir métrica).
//
// Visual reference: Figma file 2QhXqtb66hdeKvlZAZE4fS
//   17:110209  base view (#/fundamental-graphs)
//   17:115821  + "Añadir métrica" modal
//   17:113889  + "Añadir símbolo" modal

import { createChart, LineSeries } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Design tokens (extracted from Figma)
// ---------------------------------------------------------------------------
const T = {
  bg0: '#0f0f0f',        // grey/6  — page bg
  bg1: '#131313',        // grey/7  — header / widget rail bg
  bg2: '#1a1e21',        // azure/12 — tag chip bg
  bg3: '#1e222d',        // hover bg
  bd1: '#2a2e39',        // subtle border
  bd2: '#363a45',        // border / divider stronger
  txt0: '#f2f2f2',       // grey/95 — heading
  txt1: '#dbdbdb',       // grey/86 — body
  txt2: '#8c8c8c',       // grey/55 — muted
  txt3: '#5d5d5d',       // grey/36 — very muted
  blue: '#2962ff',
  cyan: '#00bce6',
  magenta: '#d500f9',
  orange: '#ff9800',
  red: '#f7525f',
  green: '#00bc43',
};

// ---------------------------------------------------------------------------
// Style injection (scoped by tv-fg- prefix)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-fg-root {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${T.bg0};
  color: ${T.txt1};
  font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}
body.has-global-header  .tv-fg-root { top: 48px; }
body.has-global-rightbar .tv-fg-root { right: 45px; }
body.has-global-header  .tv-fg-header { display: none !important; }
body.has-global-rightbar .tv-fg-rail   { display: none !important; }
.tv-fg-root .tv-fg-logo, .tv-fg-root .tv-fg-logo-mark, .tv-fg-root .tv-fg-logo-word { display: none !important; }
/* Defensive: any SVG inside the root with default white fill (from Figma
 * var(--fill-0, white)) gets a transparent fill so it can't bleed. */
.tv-fg-root svg path[fill="var(--fill-0, white)"],
.tv-fg-root svg path[fill="white"] { fill: transparent; }
.tv-fg-header img, .tv-fg-rail img { max-width: 100%; max-height: 100%; }
.tv-fg-root *, .tv-fg-root *::before, .tv-fg-root *::after { box-sizing: border-box; }
.tv-fg-root button { font-family: inherit; }

/* ------ Top header (page-owned) ------ */
.tv-fg-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px 0 40px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bd1};
  gap: 8px;
}
.tv-fg-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${T.txt0};
  text-decoration: none;
  margin-right: 24px;
}
.tv-fg-logo svg, .tv-fg-logo img { display: block; }
.tv-fg-logo-mark {
  position: relative;
  width: 36px;
  height: 28px;
  flex-shrink: 0;
}
.tv-fg-logo-mark img { position: absolute; max-width: none; }
.tv-fg-logo-mark .bg  { top: 14.29%; right: 1.39%; bottom: 21.43%; left: 0;       width: auto; height: auto; }
.tv-fg-logo-mark .dot { top: 14.29%; right: 33.33%; bottom: 57.14%; left: 44.44%; width: auto; height: auto; }
.tv-fg-logo-word { width: 147px; height: 28px; flex-shrink: 0; }
.tv-fg-search {
  display: flex;
  align-items: center;
  width: 200px;
  height: 40px;
  background: ${T.bg2};
  border-radius: 6px;
  padding: 0 12px;
  color: ${T.txt2};
  font-size: 13px;
  gap: 8px;
  cursor: text;
}
.tv-fg-search svg { flex-shrink: 0; opacity: 0.75; }
.tv-fg-nav {
  display: flex;
  align-items: center;
  margin-left: 8px;
}
.tv-fg-nav a {
  padding: 0 16px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  color: ${T.txt1};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
}
.tv-fg-nav a:hover { background: ${T.bg2}; }
.tv-fg-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tv-fg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d500f9 0%, #5d2bff 100%);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.tv-fg-offer {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, ${T.magenta} 0%, ${T.blue} 100%);
  color: #fff;
  border: none;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

/* ------ Body layout ------ */
.tv-fg-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.tv-fg-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0 40px;
}
.tv-fg-rail {
  flex-shrink: 0;
  width: 45px;
  background: ${T.bg0};
  border-left: 1px solid ${T.bd1};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 0;
  gap: 0;
}
.tv-fg-rail-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${T.txt2};
  cursor: pointer;
  border-radius: 4px;
}
.tv-fg-rail-btn:hover { background: ${T.bg2}; color: ${T.txt0}; }
.tv-fg-rail-btn.is-active { color: ${T.txt0}; background: ${T.bg2}; }
.tv-fg-rail-glyph {
  position: relative;
  width: 28px;
  height: 28px;
  display: block;
  filter: invert(63%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(95%) contrast(85%);
}
.tv-fg-rail-btn:hover .tv-fg-rail-glyph,
.tv-fg-rail-btn.is-active .tv-fg-rail-glyph {
  filter: invert(98%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(102%) contrast(101%);
}
.tv-fg-rail-spacer { flex: 1; }
.tv-fg-rail-sep {
  width: 33px;
  height: 1px;
  background: ${T.bd2};
  margin: 6px 0;
}

/* ------ Title bar ------ */
.tv-fg-title-bar {
  padding: 12px 0 16px;
}
.tv-fg-breadcrumb {
  font-size: 12px;
  color: ${T.txt2};
  margin-bottom: 4px;
}
.tv-fg-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tv-fg-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: ${T.txt0};
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.tv-fg-title-caret { color: ${T.txt2}; }
.tv-fg-title-right { margin-left: auto; display: flex; gap: 8px; }
.tv-fg-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid ${T.bd1};
  border-radius: 4px;
  color: ${T.txt1};
  cursor: pointer;
}
.tv-fg-icon-btn:hover { background: ${T.bg2}; border-color: ${T.bd2}; }

/* ------ Content (wizard + chart) ------ */
.tv-fg-content {
  flex: 1;
  display: flex;
  gap: 32px;
  min-height: 0;
}
.tv-fg-wizard {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.tv-fg-preset {
  height: 34px;
  background: ${T.bg2};
  border: 1px solid ${T.bd1};
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: ${T.txt2};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tv-fg-group-title {
  font-size: 16px;
  font-weight: 600;
  color: ${T.txt0};
  margin: 0 0 10px;
  font-family: Inter, -apple-system, sans-serif;
}
.tv-fg-tag {
  height: 34px;
  background: ${T.bg2};
  border: 1px solid ${T.bd1};
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px 0 10px;
  margin-bottom: 4px;
  gap: 6px;
  font-size: 13px;
  color: ${T.txt1};
}
.tv-fg-tag-ico {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  flex-shrink: 0;
}
.tv-fg-tag-ico.aapl { background: #fff; color: #000; }
.tv-fg-tag-ico.googl {
  background: conic-gradient(from -45deg, #4285f4 0deg 90deg, #ea4335 90deg 180deg, #fbbc04 180deg 270deg, #34a853 270deg 360deg);
}
.tv-fg-tag-label { flex: 1; }
.tv-fg-tag-del {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${T.txt2};
  cursor: pointer;
  border-radius: 4px;
}
.tv-fg-tag-del:hover { background: ${T.bg3}; color: ${T.txt1}; }
.tv-fg-add-btn {
  height: 34px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid ${T.bd1};
  border-radius: 6px;
  color: ${T.txt1};
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.tv-fg-add-btn:hover { background: ${T.bg2}; border-color: ${T.bd2}; }
.tv-fg-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: ${T.txt1};
  cursor: pointer;
}
.tv-fg-check input { width: 16px; height: 16px; accent-color: ${T.blue}; }

/* ------ Chart panel ------ */
.tv-fg-chart-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tv-fg-chart-legend {
  font-size: 12px;
  color: ${T.txt1};
  margin-bottom: 4px;
  line-height: 1.6;
}
.tv-fg-chart-legend .row { display: block; }
.tv-fg-chart-legend .sym { font-weight: 600; margin-right: 6px; }
.tv-fg-chart-legend .met { color: ${T.txt2}; margin-right: 6px; }
.tv-fg-chart-toggle {
  width: 28px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${T.bd1};
  background: ${T.bg0};
  color: ${T.txt2};
  border-radius: 4px;
  cursor: pointer;
  margin: 4px 0 8px;
}
.tv-fg-chart {
  flex: 1;
  min-height: 0;
  position: relative;
}
.tv-fg-tf-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 12px 0 20px;
  justify-content: center;
}
.tv-fg-tf {
  flex: 1;
  max-width: 180px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${T.txt1};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.tv-fg-tf:hover { background: ${T.bg2}; }
.tv-fg-tf.is-active { background: ${T.bg2}; color: ${T.txt0}; }

/* ------ Modals ------ */
.tv-fg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 110px;
}
.tv-fg-modal {
  width: 840px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 140px);
  background: ${T.bg0};
  border: 1px solid ${T.bd1};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}
.tv-fg-modal-head {
  display: flex;
  align-items: center;
  padding: 20px;
  flex-shrink: 0;
}
.tv-fg-modal-title {
  font-size: 20px;
  font-weight: 600;
  color: ${T.txt0};
  flex: 1;
  font-family: Inter, sans-serif;
}
.tv-fg-modal-close {
  width: 34px;
  height: 34px;
  background: transparent;
  border: none;
  color: ${T.txt1};
  cursor: pointer;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tv-fg-modal-close:hover { background: ${T.bg2}; }
.tv-fg-modal-input {
  margin: 0 20px;
  height: 40px;
  background: ${T.bg2};
  border: 1px solid transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
}
.tv-fg-modal-input:focus-within { border-color: ${T.blue}; }
.tv-fg-modal-input input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${T.txt0};
  font-size: 13px;
  font-family: inherit;
}
.tv-fg-modal-input input::placeholder { color: ${T.txt2}; }
.tv-fg-modal-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.tv-fg-modal-tab {
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: transparent;
  color: ${T.txt1};
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.tv-fg-modal-tab:hover { background: ${T.bg2}; }
.tv-fg-modal-tab.is-active { background: #fff; color: #000; }
.tv-fg-modal-filters {
  display: flex;
  gap: 8px;
  padding: 4px 20px 12px;
  flex-shrink: 0;
}
.tv-fg-modal-filter {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: ${T.bg2};
  color: ${T.txt1};
  border: 1px solid ${T.bd1};
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tv-fg-modal-filter:hover { background: ${T.bg3}; }
.tv-fg-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 20px;
}
.tv-fg-modal-body::-webkit-scrollbar { width: 8px; }
.tv-fg-modal-body::-webkit-scrollbar-thumb { background: ${T.bd2}; border-radius: 4px; }

.tv-fg-metric-hdr {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${T.txt2};
  padding: 12px 20px 6px;
}
.tv-fg-metric-row {
  display: flex;
  align-items: center;
  padding: 6px 20px;
  font-size: 13px;
  color: ${T.txt1};
  cursor: pointer;
}
.tv-fg-metric-row:hover { background: ${T.bg2}; }
.tv-fg-metric-row.is-sub { padding-left: 36px; }
.tv-fg-metric-row.is-sub::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${T.txt2};
  margin-right: 10px;
}

.tv-fg-symbol-row {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  font-size: 13px;
  color: ${T.txt1};
  cursor: pointer;
  gap: 12px;
}
.tv-fg-symbol-row:hover { background: ${T.bg2}; }
.tv-fg-symbol-row .ico {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  color: #fff;
  flex-shrink: 0;
}
.tv-fg-symbol-row .tk { font-weight: 600; width: 80px; flex-shrink: 0; color: ${T.txt0}; }
.tv-fg-symbol-row .nm { flex: 1; color: ${T.txt1}; }
.tv-fg-symbol-row .ty { color: ${T.txt2}; font-size: 12px; margin-right: 8px; }
.tv-fg-symbol-row .ex { color: ${T.txt1}; font-size: 12px; width: 60px; }
.tv-fg-symbol-row .add {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${T.blue};
  color: #fff;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
`;
  const tag = document.createElement('style');
  tag.setAttribute('data-tv-fg', '1');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Figma-extracted assets (real SVGs downloaded from the Figma file)
// ---------------------------------------------------------------------------
const FIG = '/figma/fundamental-graphs';
const IMG = {
  logoMarkBg:   `${FIG}/logo-mark-bg.svg`,
  logoMarkDot:  `${FIG}/logo-mark-dot.svg`,
  logoWordmark: `${FIG}/logo-wordmark.svg`,
  search:       `${FIG}/search-icon.svg`,
  titleCaret:   `${FIG}/title-caret.svg`,
  titleGear1:   `${FIG}/title-gear-1.svg`,
  titleGear2:   `${FIG}/title-gear-2.svg`,
  buttonPlus:   `${FIG}/button-add-plus.svg`,
  legendCaret:  `${FIG}/legend-caret.svg`,
  tagApple:     `${FIG}/tag-apple-logo.svg`,
  tagTrash:     `${FIG}/tag-trash.svg`,
  railWatchA:   `${FIG}/rail-watchlist-a.svg`,
  railWatchB:   `${FIG}/rail-watchlist-b.svg`,
  railAlertA:   `${FIG}/rail-alertas-a.svg`,
  railAlertB:   `${FIG}/rail-alertas-b.svg`,
  railChatA:    `${FIG}/rail-chats-a.svg`,
  railChatB:    `${FIG}/rail-chats-b.svg`,
  railInd:      `${FIG}/rail-indicators.svg`,
  railCalMask:  `${FIG}/rail-calendarios-mask.svg`,
  railCal:      `${FIG}/rail-calendarios.svg`,
  railComm:     `${FIG}/rail-comunidad.svg`,
  railNotifA:   `${FIG}/rail-notif-a.svg`,
  railNotifB:   `${FIG}/rail-notif-b.svg`,
  railNotifC:   `${FIG}/rail-notif-c.svg`,
  railNotifD:   `${FIG}/rail-notif-d.svg`,
  railProd:     `${FIG}/rail-productos.svg`,
  railHelp:     `${FIG}/rail-help.svg`,
};

// Build a rail icon from one or more Figma vector layers. Each layer's inset
// (in %) was captured from the Figma layout — they sit inside a 44×44 frame.
function railIcon(title, layers) {
  const imgs = layers.map((l) => {
    const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;`;
    return `<img src="${l.src}" alt="" style="${style}width:auto;height:auto;display:block;max-width:none;" />`;
  }).join('');
  return `<button class="tv-fg-rail-btn" title="${title}"><span class="tv-fg-rail-glyph">${imgs}</span></button>`;
}

// ---------------------------------------------------------------------------
// Inline SVG fallbacks for tiny glyphs not worth a download
// ---------------------------------------------------------------------------
const ICO = {
  search: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5 4l.5 9a1 1 0 001 1h3a1 1 0 001-1L11 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  caret: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretUp: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 8.5L7 5l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretDown: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8.5" r="2.3" stroke="currentColor" stroke-width="1.3"/><path d="M6 4l1-1.5h2L10 4" stroke="currentColor" stroke-width="1.3"/></svg>',
  tvLogo: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M2 8h10v3H8v9H5v-9H2V8z" fill="currentColor"/><path d="M14 8h12v3h-4.5l-3 9H15.5l3-9H14V8z" fill="currentColor"/><circle cx="22.5" cy="18" r="2.5" fill="#2962ff"/></svg>',
  bookmark: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 3h8v12l-4-3-4 3V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M9 5.5V9l2.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12v9H8l-4 3v-3H3V4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  gauge: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 12a6 6 0 1112 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 12L6 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  calendar: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 7h13M6 2.5v3M12 2.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  community: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 12c0-2 1.5-3 3-3M12 12c0-2-1.5-3-3-3M6 9a2 2 0 100-4 2 2 0 000 4zM12 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  rss: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 14a1 1 0 100-2 1 1 0 000 2zM4 4a10 10 0 0110 10M4 9a5 5 0 015 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 13h10l-1.5-2V8a3.5 3.5 0 10-7 0v3L4 13zM7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  grid: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="8" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="13" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="3" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="8" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="13" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="13" y="3" width="3" height="3" stroke="currentColor" stroke-width="1.3"/><rect x="13" y="8" width="3" height="3" stroke="currentColor" stroke-width="1.3"/></svg>',
  help: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 7.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 2.5M9 12.3v.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

// ---------------------------------------------------------------------------
// Mock data for chart (Ingresos totales · FQ — AAPL vs GOOGL, 2022–2026)
// ---------------------------------------------------------------------------
function buildMockSeries(symbol, baseline, peakBoost) {
  const out = [];
  // 16 quarters between 2022-Q1 and 2026-Q1
  const startYear = 2022;
  for (let i = 0; i < 17; i++) {
    const year = startYear + Math.floor(i / 4);
    const month = (i % 4) * 3 + 1;
    const time = `${year}-${String(month).padStart(2, '0')}-01`;
    // AAPL is seasonal (Q4 spike), GOOGL is steady growth
    let v;
    if (symbol === 'AAPL') {
      const q = i % 4;
      const seasonal = q === 3 ? 1.4 + peakBoost : 0.8 + q * 0.05;
      v = baseline * seasonal * (1 + i * 0.015);
    } else {
      v = baseline * (1 + i * 0.045);
    }
    out.push({ time, value: Math.round(v * 100) / 100 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Modal: Añadir métrica
// ---------------------------------------------------------------------------
const METRIC_GROUPS = {
  'Cuenta de resultados': {
    items: [
      { label: 'Ingresos totales' },
      {
        label: 'Coste de bienes vendidos',
        sub: [
          'Depreciación y amortización',
          'Depreciación',
          'Amortización de intangibles',
          'Amortización de cargos diferidos',
          'Otros costes de bienes vendidos',
        ],
      },
      { label: 'Beneficio bruto' },
      {
        label: 'Gastos de explotación (excluido el coste de los bienes vendidos)',
        sub: [
          'Selling/general/admin expenses (total)',
          'Investigación y desarrollo',
          'Selling/general/admin expenses (other)',
          'Other operating expenses (total)',
        ],
      },
      { label: 'Ingresos de explotación' },
      {
        label: 'Non-operating income (total)',
        sub: [
          'Gasto por intereses, neto de intereses capitalizados',
          'Gastos por intereses sobre la deuda',
          'Intereses capitalizados',
          'Non-operating income (excl. interest expenses)',
          'Ingresos no operativos en concepto de intereses',
          'Participación en beneficios antes de impuestos',
          'Otros gastos no operativos',
          'Ingresos/gastos inusuales',
          'Devaluaciones',
          'Gastos de reestructuración',
          'Gastos de reclamaciones judiciales',
          'Pérdidas/ganancias no realizadas',
          'Otros gastos excepcionales',
        ],
      },
      { label: 'Ingresos antes de impuestos' },
      { label: 'Participación en beneficios' },
      {
        label: 'Impuestos',
        sub: [
          'Income tax (current)',
          'Income tax (current - domestic)',
          'Income tax (current - foreign)',
        ],
      },
    ],
  },
  'Balance de situación': { items: [{ label: 'Total activos' }, { label: 'Total pasivos' }, { label: 'Patrimonio neto' }] },
  'Flujo de efectivo': { items: [{ label: 'Flujo de caja operativo' }, { label: 'Flujo de caja libre' }] },
  'Estadísticas': { items: [{ label: 'PER' }, { label: 'EPS' }, { label: 'Capitalización' }] },
};

function openAddMetricModal(parent, onPick) {
  const back = document.createElement('div');
  back.className = 'tv-fg-backdrop';
  let activeTab = 'Cuenta de resultados';

  function render() {
    const group = METRIC_GROUPS[activeTab];
    const rows = group.items.map((it) => {
      const main = `<div class="tv-fg-metric-row" data-pick="${it.label}">${it.label}</div>`;
      const subs = (it.sub || []).map((s) => `<div class="tv-fg-metric-row is-sub" data-pick="${s}">${s}</div>`).join('');
      return main + subs;
    }).join('');

    back.innerHTML = `
      <div class="tv-fg-modal" role="dialog" aria-modal="true" aria-label="Añadir métrica">
        <div class="tv-fg-modal-head">
          <div class="tv-fg-modal-title">Añadir métrica</div>
          <button class="tv-fg-modal-close" data-close>${ICO.close}</button>
        </div>
        <label class="tv-fg-modal-input">
          ${ICO.search}
          <input type="text" placeholder="Buscar" />
        </label>
        <div class="tv-fg-modal-tabs">
          ${Object.keys(METRIC_GROUPS).map((t) => `<button class="tv-fg-modal-tab${t === activeTab ? ' is-active' : ''}" data-tab="${t}">${t}</button>`).join('')}
        </div>
        <div class="tv-fg-metric-hdr">Nombre de la métrica</div>
        <div class="tv-fg-modal-body">${rows}</div>
      </div>`;
  }
  render();

  function onClick(e) {
    if (e.target === back) { close(); return; }
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) { close(); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { activeTab = tab.dataset.tab; render(); return; }
    const row = e.target.closest('[data-pick]');
    if (row) {
      const label = row.dataset.pick;
      onPick && onPick(label);
      close();
    }
  }
  back.addEventListener('click', onClick);

  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  function close() {
    document.removeEventListener('keydown', onKey);
    back.remove();
  }
  parent.appendChild(back);
  return { close };
}

// ---------------------------------------------------------------------------
// Modal: Añadir símbolo
// ---------------------------------------------------------------------------
const SYMBOL_TABS = ['Todos', 'Acciones', 'Fondos', 'Futuros', 'Forex', 'Cripto', 'Índices', 'Bonos', 'Economía', 'Opciones'];
const SYMBOLS = [
  { tk: 'NVDA',  nm: 'NVIDIA Corporation',      ex: 'NASDAQ', ico: { bg: '#76b900', t: 'N' } },
  { tk: 'TSLA',  nm: 'Tesla, Inc.',             ex: 'NASDAQ', ico: { bg: '#e82127', t: 'T' } },
  { tk: 'AAPL',  nm: 'Apple Inc.',              ex: 'NASDAQ', ico: { bg: '#fff', c: '#000', t: 'A' } },
  { tk: 'MSFT',  nm: 'Microsoft Corporation',   ex: 'NASDAQ', ico: { bg: '#f3f3f3', c: '#000', t: 'M' } },
  { tk: 'META',  nm: 'Meta Platforms Inc Class A', ex: 'NASDAQ', ico: { bg: '#1877f2', t: 'M' } },
  { tk: 'AMZN',  nm: 'Amazon.com, Inc.',        ex: 'NASDAQ', ico: { bg: '#ff9900', t: 'A' } },
  { tk: 'AMD',   nm: 'Advanced Micro Devices, Inc.', ex: 'NASDAQ', ico: { bg: '#000', t: 'A' } },
  { tk: 'GOOGL', nm: 'Alphabet Inc. Class A',   ex: 'NASDAQ', ico: { bg: '#fff', c: '#4285f4', t: 'G' } },
  { tk: 'MELI',  nm: 'MercadoLibre, Inc.',      ex: 'NASDAQ', ico: { bg: '#ffe600', c: '#000', t: 'M' } },
  { tk: 'SAN',   nm: 'Banco Santander, S.A.',   ex: 'BME',    ico: { bg: '#ec0000', t: 'S' } },
  { tk: 'MU',    nm: 'Micron Technology, Inc.', ex: 'NASDAQ', ico: { bg: '#1f6fbf', t: 'M' } },
  { tk: 'PLTR',  nm: 'Palantir Technologies Inc. Class A', ex: 'NASDAQ', ico: { bg: '#000', t: 'P' } },
];

function openAddSymbolModal(parent, onPick) {
  const back = document.createElement('div');
  back.className = 'tv-fg-backdrop';
  let activeTab = 'Acciones';

  back.innerHTML = `
    <div class="tv-fg-modal" role="dialog" aria-modal="true" aria-label="Añadir símbolo">
      <div class="tv-fg-modal-head">
        <div class="tv-fg-modal-title">Añadir símbolo</div>
        <button class="tv-fg-modal-close" data-close>${ICO.close}</button>
      </div>
      <label class="tv-fg-modal-input">
        ${ICO.search}
        <input type="text" placeholder="Símbolo, ISIN o CUSIP" />
      </label>
      <div class="tv-fg-modal-tabs" data-tabs>
        ${SYMBOL_TABS.map((t) => `<button class="tv-fg-modal-tab${t === activeTab ? ' is-active' : ''}" data-tab="${t}">${t}</button>`).join('')}
      </div>
      <div class="tv-fg-modal-filters">
        <button class="tv-fg-modal-filter">Todos los países ${ICO.caretDown}</button>
        <button class="tv-fg-modal-filter">Todos los tipos ${ICO.caretDown}</button>
        <button class="tv-fg-modal-filter">Todos los sectores ${ICO.caretDown}</button>
      </div>
      <div class="tv-fg-modal-body">
        ${SYMBOLS.map((s) => `
          <div class="tv-fg-symbol-row" data-pick="${s.tk}">
            <span class="ico" style="background:${s.ico.bg};color:${s.ico.c || '#fff'}">${s.ico.t}</span>
            <span class="tk">${s.tk}</span>
            <span class="nm">${s.nm}</span>
            <span class="ty">stock</span>
            <span class="ex">${s.ex}</span>
            <button class="add" aria-label="Añadir">${ICO.plus}</button>
          </div>`).join('')}
      </div>
    </div>`;

  function onClick(e) {
    if (e.target === back) { close(); return; }
    if (e.target.closest('[data-close]')) { close(); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      back.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === activeTab));
      return;
    }
    const row = e.target.closest('[data-pick]');
    if (row) {
      onPick && onPick(row.dataset.pick);
      close();
    }
  }
  back.addEventListener('click', onClick);

  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  function close() {
    document.removeEventListener('keydown', onKey);
    back.remove();
  }
  parent.appendChild(back);
  return { close };
}

// ---------------------------------------------------------------------------
// Main page factory
// ---------------------------------------------------------------------------
export function createFundamentalGraphsPage(mount, opts = {}) {
  ensureStyles();

  // Clear out the host element (mount is `app`)
  mount.innerHTML = '';

  // State
  const state = {
    symbols: [
      { tk: 'AAPL',  cls: 'aapl',  color: T.orange },
      { tk: 'GOOGL', cls: 'googl', color: T.cyan },
    ],
    metrics: ['Ingresos totales · FQ'],
    timeframe: '5 años',
  };

  // Root
  const root = document.createElement('div');
  root.className = 'tv-fg-root';
  root.innerHTML = `
    <div class="tv-fg-header">
      <a href="#/" class="tv-fg-logo" aria-label="TradingView">
        <span class="tv-fg-logo-mark">
          <img class="bg"  src="${IMG.logoMarkBg}"  alt="" />
          <img class="dot" src="${IMG.logoMarkDot}" alt="" />
        </span>
        <img class="tv-fg-logo-word" src="${IMG.logoWordmark}" alt="TradingView" />
      </a>
      <div class="tv-fg-search"><img src="${IMG.search}" width="16" height="16" alt="" /><span>Buscar (Ctrl+K)</span></div>
      <nav class="tv-fg-nav">
        <a href="#/">Productos</a>
        <a href="#/news">Comunidad</a>
        <a href="#/screener">Mercados</a>
        <a href="#/">Brókeres</a>
        <a href="#/">Más</a>
      </nav>
      <div class="tv-fg-header-right">
        <div class="tv-fg-avatar" title="Perfil">H</div>
        <button class="tv-fg-offer">Ampliar</button>
      </div>
    </div>

    <div class="tv-fg-body">
      <div class="tv-fg-main">
        <div class="tv-fg-title-bar">
          <div class="tv-fg-breadcrumb">Gráficos fundamentales</div>
          <div class="tv-fg-title-row">
            <h1 class="tv-fg-title">Gráfico sin título <span class="tv-fg-title-caret"><img src="${IMG.titleCaret}" width="12" height="12" alt="" /></span></h1>
            <div class="tv-fg-title-right">
              <button class="tv-fg-icon-btn" title="Configuración"><img src="${IMG.titleGear1}" width="18" height="18" alt="" /></button>
              <button class="tv-fg-icon-btn" title="Captura"><img src="${IMG.titleGear2}" width="18" height="18" alt="" /></button>
            </div>
          </div>
        </div>

        <div class="tv-fg-content">
          <aside class="tv-fg-wizard">
            <div class="tv-fg-preset">Todos los símbolos: todas las métricas</div>

            <div>
              <h2 class="tv-fg-group-title">Símbolos</h2>
              <div data-symbols></div>
              <button class="tv-fg-add-btn" data-add-symbol><img src="${IMG.buttonPlus}" width="14" height="14" alt="" /> Añadir</button>
              <label class="tv-fg-check">
                <input type="checkbox" /> Mostrar gráficos de precios
              </label>
            </div>

            <div>
              <h2 class="tv-fg-group-title">Métricas</h2>
              <div data-metrics></div>
              <button class="tv-fg-add-btn" data-add-metric><img src="${IMG.buttonPlus}" width="14" height="14" alt="" /> Añadir</button>
            </div>
          </aside>

          <div class="tv-fg-chart-wrap">
            <div class="tv-fg-chart-legend" data-legend></div>
            <button class="tv-fg-chart-toggle" title="Ocultar leyenda"><img src="${IMG.legendCaret}" width="14" height="14" alt="" style="transform:rotate(180deg)" /></button>
            <div class="tv-fg-chart" data-chart></div>
            <div class="tv-fg-tf-row" data-tf></div>
          </div>
        </div>
      </div>

      <aside class="tv-fg-rail">
        ${railIcon('Listas',         [{ src: IMG.railWatchA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railWatchB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Alertas',        [{ src: IMG.railAlertA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railAlertB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Chats',          [{ src: IMG.railChatA,  t: 20.45, r: 20.45, b: 45.45, l: 20.45 }, { src: IMG.railChatB,  t: 25, r: 25,    b: 25,    l: 25 }])}
        <div class="tv-fg-rail-spacer"></div>
        ${railIcon('Selector de datos', [{ src: IMG.railInd, t: 25, r: 22.7, b: 18.84, l: 22.73 }])}
        ${railIcon('Calendarios',    [{ src: IMG.railCal, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
        ${railIcon('Comunidad',      [{ src: IMG.railComm, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
        ${railIcon('Notificaciones', [
          { src: IMG.railNotifA, t: 22.73, r: 25,    b: 27.27, l: 25 },
          { src: IMG.railNotifB, t: 36.36, r: 38.64, b: 27.27, l: 25 },
          { src: IMG.railNotifC, t: 50,    r: 52.27, b: 27.27, l: 25 },
          { src: IMG.railNotifD, t: 63.64, r: 65.91, b: 27.27, l: 25 },
        ])}
        <div class="tv-fg-rail-sep"></div>
        <button class="tv-fg-rail-btn is-active" title="Productos"><span class="tv-fg-rail-glyph"><img src="${IMG.railProd}" alt="" style="position:absolute;top:11.36%;right:11.36%;bottom:11.36%;left:11.36%;width:auto;height:auto;display:block;max-width:none;" /></span></button>
        ${railIcon('Ayuda', [{ src: IMG.railHelp, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
      </aside>
    </div>
  `;
  mount.appendChild(root);

  // ---- Wizard rendering helpers ----
  const symbolsEl = root.querySelector('[data-symbols]');
  const metricsEl = root.querySelector('[data-metrics]');
  const legendEl = root.querySelector('[data-legend]');
  const tfEl = root.querySelector('[data-tf]');
  const chartEl = root.querySelector('[data-chart]');

  function renderSymbols() {
    symbolsEl.innerHTML = state.symbols.map((s, i) => {
      const icoHtml = s.tk === 'AAPL'
        ? `<span class="tv-fg-tag-ico aapl"><img src="${IMG.tagApple}" width="14" height="14" alt="" /></span>`
        : `<span class="tv-fg-tag-ico ${s.cls}"></span>`;
      return `
      <div class="tv-fg-tag">
        ${icoHtml}
        <span class="tv-fg-tag-label">${s.tk}</span>
        <button class="tv-fg-tag-del" data-del-sym="${i}" aria-label="Eliminar"><img src="${IMG.tagTrash}" width="14" height="14" alt="" /></button>
      </div>`;
    }).join('');
  }
  function renderMetrics() {
    metricsEl.innerHTML = state.metrics.map((m, i) => `
      <div class="tv-fg-tag">
        <span class="tv-fg-tag-label">${m}</span>
        <button class="tv-fg-tag-del" data-del-met="${i}" aria-label="Eliminar"><img src="${IMG.tagTrash}" width="14" height="14" alt="" /></button>
      </div>`).join('');
  }
  function renderLegend() {
    const last = (sym) => {
      const series = chartData[sym];
      return series ? series[series.length - 1].value : null;
    };
    function fmt(v) {
      if (v == null) return '';
      return (v / 1000).toFixed(2).replace('.', ',') + ' B';
    }
    legendEl.innerHTML = state.symbols.map((s) => `
      <span class="row">
        <span class="sym">${s.tk}</span>
        <span class="met">Ingresos totales · FQ</span>
        <span style="color:${s.color}">${fmt(last(s.tk))}</span>
      </span>`).join('');
  }
  function renderTf() {
    const opts = ['1 año', '3 años', '5 años', '10 años', 'Todo el tiempo'];
    tfEl.innerHTML = opts.map((o) => `<button class="tv-fg-tf${o === state.timeframe ? ' is-active' : ''}" data-tf="${o}">${o}</button>`).join('');
  }

  renderSymbols();
  renderMetrics();
  renderTf();

  // ---- Chart ----
  // baseline numbers are in billions, then we multiply by 1000 to display as e.g. 111.18 B
  const chartData = {
    AAPL: buildMockSeries('AAPL', 75 * 1000, 0.1),   // peaks ~140B in Q4
    GOOGL: buildMockSeries('GOOGL', 55 * 1000, 0),  // smooth growth to ~110B
  };

  const chart = createChart(chartEl, {
    layout: {
      background: { type: 'solid', color: T.bg0 },
      textColor: T.txt2,
      fontFamily: 'Roboto, sans-serif',
      fontSize: 11,
    },
    grid: { vertLines: { color: 'transparent' }, horzLines: { color: T.bd1 } },
    rightPriceScale: { borderVisible: false, textColor: T.txt2 },
    timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
    crosshair: { mode: 0 },
    handleScroll: false,
    handleScale: false,
  });

  const seriesAapl = chart.addSeries(LineSeries, {
    color: T.orange,
    lineWidth: 2,
    pointMarkersVisible: true,
    pointMarkersRadius: 3,
    priceFormat: { type: 'custom', formatter: (v) => (v / 1000).toFixed(0) + 'B' },
  });
  const seriesGoogl = chart.addSeries(LineSeries, {
    color: T.cyan,
    lineWidth: 2,
    pointMarkersVisible: true,
    pointMarkersRadius: 3,
    priceFormat: { type: 'custom', formatter: (v) => (v / 1000).toFixed(0) + 'B' },
  });
  seriesAapl.setData(chartData.AAPL);
  seriesGoogl.setData(chartData.GOOGL);
  chart.timeScale().fitContent();
  renderLegend();

  // Auto-resize
  function resize() {
    const r = chartEl.getBoundingClientRect();
    chart.resize(r.width, r.height);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(chartEl);

  // ---- Interaction ----
  function onClick(e) {
    if (e.target.closest('[data-add-symbol]')) {
      openAddSymbolModal(root, (tk) => {
        if (!state.symbols.some((s) => s.tk === tk)) {
          state.symbols.push({ tk, cls: '', color: T.magenta });
          renderSymbols();
          renderLegend();
        }
      });
      return;
    }
    if (e.target.closest('[data-add-metric]')) {
      openAddMetricModal(root, (label) => {
        if (!state.metrics.some((m) => m === label)) {
          state.metrics.push(label);
          renderMetrics();
        }
      });
      return;
    }
    const delSym = e.target.closest('[data-del-sym]');
    if (delSym) {
      state.symbols.splice(Number(delSym.dataset.delSym), 1);
      renderSymbols();
      renderLegend();
      return;
    }
    const delMet = e.target.closest('[data-del-met]');
    if (delMet) {
      state.metrics.splice(Number(delMet.dataset.delMet), 1);
      renderMetrics();
      return;
    }
    const tfBtn = e.target.closest('[data-tf]');
    if (tfBtn) {
      state.timeframe = tfBtn.dataset.tf;
      renderTf();
      return;
    }
  }
  root.addEventListener('click', onClick);

  function destroy() {
    try { ro.disconnect(); } catch {}
    try { chart.remove(); } catch {}
    root.remove();
    mount.innerHTML = '';
  }

  return { destroy };
}

export default createFundamentalGraphsPage;
