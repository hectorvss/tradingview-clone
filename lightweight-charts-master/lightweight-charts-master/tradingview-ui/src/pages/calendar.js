// calendar.js — TradingView clone "Calendario económico" page (#/calendar)
// Public API: createCalendarPage(mount, opts) -> { render, destroy }
//   opts.tab : 'economico' | 'beneficios' | 'ingresos' | 'dividendos' | 'ipo'
//              (aliases accepted: 'eventos' -> 'ipo', 'resultados' -> 'beneficios')
//
// Visual reference: Figma file 2QhXqtb66hdeKvlZAZE4fS
//   15:105259 Económico tab
//   15:119925 Resultados/Beneficios tab
//   15:121300 Dividendos tab
//   16:106756 IPO/Eventos tab (Oferta pública inicial)

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const T = {
  bg0: '#0f0f0f',
  bg1: '#131313',
  bg2: '#1a1e21',
  bg3: '#1e222d',
  bd1: '#2a2e39',
  bd2: '#363a45',
  txt0: '#f2f2f2',
  txt1: '#dbdbdb',
  txt2: '#8c8c8c',
  txt3: '#5d5d5d',
  blue: '#2962ff',
  magenta: '#d500f9',
  red: '#f7525f',
  green: '#00bc43',
  amber: '#ff9800',
};

const FIG_FG = '/figma/fundamental-graphs';
const FIG_CAL = '/figma/calendar';

const IMG = {
  // reused
  logoMarkBg:   `${FIG_FG}/logo-mark-bg.svg`,
  logoMarkDot:  `${FIG_FG}/logo-mark-dot.svg`,
  logoWordmark: `${FIG_FG}/logo-wordmark.svg`,
  search:       `${FIG_FG}/search-icon.svg`,
  navCaret:     `${FIG_FG}/nav-caret.svg`,
  railWatchA:   `${FIG_FG}/rail-watchlist-a.svg`,
  railWatchB:   `${FIG_FG}/rail-watchlist-b.svg`,
  railAlertA:   `${FIG_FG}/rail-alertas-a.svg`,
  railAlertB:   `${FIG_FG}/rail-alertas-b.svg`,
  railChatA:    `${FIG_FG}/rail-chats-a.svg`,
  railChatB:    `${FIG_FG}/rail-chats-b.svg`,
  railInd:      `${FIG_FG}/rail-indicators.svg`,
  railCal:      `${FIG_FG}/rail-calendarios.svg`,
  railComm:     `${FIG_FG}/rail-comunidad.svg`,
  railNotifA:   `${FIG_FG}/rail-notif-a.svg`,
  railNotifB:   `${FIG_FG}/rail-notif-b.svg`,
  railProd:     `${FIG_FG}/rail-productos.svg`,
  railHelp:     `${FIG_FG}/rail-help.svg`,
  // new
  badgeUpcoming: `${FIG_CAL}/badge-proximamente.png`,
  importanceBar: `${FIG_CAL}/importance-bars.png`,
};

// Ticker / company logos extracted from Figma calendar tab frames.
// Each Figma row references a small 24×24 mark; we ship the unique marks here
// and look them up by ticker symbol first, then by a company-name keyword.
// Rows without a match fall back to the colored letter monogram.
const FIG_TICK = `${FIG_CAL}/tickers`;
const TICKER_LOGO_BY_SYMBOL = {
  // Direct ticker → asset (Figma 2QhXqtb66hdeKvlZAZE4fS)
  HUMBL:   `${FIG_TICK}/hardide-plc.png`,            // node 15:118607
  CIL:     `${FIG_TICK}/cleantek-industries.png`,    // node 15:118989
  FBH:     `${FIG_TICK}/paykel.png`,                 // node 15:119242 (Fisher & Paykel)
  '300787':`${FIG_TICK}/anfu-ce-link.png`,           // node 15:120309
  TBC:     `${FIG_TICK}/shibaura-machine.png`,       // node 15:118804
  AEP:     `${FIG_TICK}/atlas-engineered.png`,       // node 15:119053
  ANDRO:   `${FIG_TICK}/andromeda.png`,              // node 15:120259
  ALAQU:   `${FIG_TICK}/aquila.png`,                 // node 15:120356
  ARLUF:   `${FIG_TICK}/aristocrat-leisure.png`,     // node 15:120403
  ALL:     `${FIG_TICK}/aristocrat-leisure.png`,
  '901652':`${FIG_TICK}/aristocrat-leisure.png`,
  AC8:     `${FIG_TICK}/aristocrat-leisure.png`,
  ARKAF:   `${FIG_TICK}/arkema.png`,                 // node 15:120638
  V1S:     `${FIG_TICK}/arkema.png`,
};
const TICKER_LOGO_BY_NAME = [
  // [substring of row.name → asset]
  [/paykel/i,             `${FIG_TICK}/paykel.png`],
  [/anfu ce link/i,       `${FIG_TICK}/anfu-ce-link.png`],
  [/cleantek|cilcorel/i,  `${FIG_TICK}/cleantek-industries.png`],
  [/hardide|humble/i,     `${FIG_TICK}/hardide-plc.png`],
  [/shibaura/i,           `${FIG_TICK}/shibaura-machine.png`],
  [/atlas engineered/i,   `${FIG_TICK}/atlas-engineered.png`],
  [/andromeda/i,          `${FIG_TICK}/andromeda.png`],
  [/aquila/i,             `${FIG_TICK}/aquila.png`],
  [/aristocrat/i,         `${FIG_TICK}/aristocrat-leisure.png`],
  [/arkema/i,             `${FIG_TICK}/arkema.png`],
];
function tickerLogoSrc(row) {
  if (!row) return null;
  const t = (row.ticker || '').toUpperCase();
  if (TICKER_LOGO_BY_SYMBOL[t]) return TICKER_LOGO_BY_SYMBOL[t];
  const n = row.name || '';
  for (const [re, src] of TICKER_LOGO_BY_NAME) if (re.test(n)) return src;
  return null;
}
// Render the ticker-row mark: real Figma logo when we have one, else the
// colored letter monogram. onerror swaps the broken <img> for the monogram so
// any future renaming still degrades gracefully.
function tickerLogoHtml(r) {
  const src = tickerLogoSrc(r);
  const mono = `<span class="tv-cal-mono" style="background:${r.mono}">${initials(r.ticker)}</span>`;
  if (!src) return mono;
  const fallback = mono.replace(/"/g, '&quot;');
  return `<img class="tv-cal-ticker-logo" src="${src}" alt="" `
    + `onerror="this.outerHTML='${fallback}'"/>`;
}

const FLAGS = {
  US: `${FIG_CAL}/flag-us.png`,
  KR: `${FIG_CAL}/flag-kr.png`,
  AR: `${FIG_CAL}/flag-ar.png`,
  FR: `${FIG_CAL}/flag-fr.png`,
  DE: `${FIG_CAL}/flag-de.png`,
  GB: `${FIG_CAL}/flag-gb.png`,
  CN: `${FIG_CAL}/flag-cn.png`,
  JP: `${FIG_CAL}/flag-jp.png`,
  TR: `${FIG_CAL}/flag-tr.png`,
  ZA: `${FIG_CAL}/flag-za.png`,
};

// ---------------------------------------------------------------------------
// Inline icon set (tiny glyphs, not worth a separate file)
// ---------------------------------------------------------------------------
const ICO = {
  search:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  caretD:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretU:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 7.5l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretL:   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 3l-4 4 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  caretR:   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cal:      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="3.5" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 6.5h13M5.5 2v3M12.5 2v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  clock:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.4" stroke="currentColor" stroke-width="1.3"/><path d="M9 5.5V9l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  filter:   '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M5 9h8M7 14h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  chart:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14V7M7 14V4M11 14v-5M15 14v-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  crown:    '<svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M2 12h16M3 11l-1-7 4 3 4-6 4 6 4-3-1 7" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  g20:      '<svg width="22" height="14" viewBox="0 0 22 14" fill="none"><text x="0" y="11" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="currentColor">G20</text></svg>',
  importLow:'<svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="1" y="8" width="3" height="3" fill="#5d5d5d"/><rect x="6" y="8" width="3" height="3" fill="#5d5d5d"/><rect x="11" y="8" width="3" height="3" fill="#5d5d5d"/></svg>',
  importMid:'<svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="1" y="6" width="3" height="5" fill="#ff9800"/><rect x="6" y="6" width="3" height="5" fill="#ff9800"/><rect x="11" y="8" width="3" height="3" fill="#3d3d3d"/></svg>',
  importHi: '<svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="1" y="3" width="3" height="8" fill="#f7525f"/><rect x="6" y="3" width="3" height="8" fill="#f7525f"/><rect x="11" y="3" width="3" height="8" fill="#f7525f"/></svg>',
  arrowDn:  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v9M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expand:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 11.5l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h2M3 8h2M3 12h2M7 4h7M7 8h7M7 12h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

// ---------------------------------------------------------------------------
// Style injection (scoped by tv-cal- prefix)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-cal-root {
  position: fixed; inset: 0;
  background: ${T.bg0}; color: ${T.txt1};
  font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
  font-size: 13px;
  display: flex; flex-direction: column;
  overflow: hidden; z-index: 1;
}
.tv-cal-root *, .tv-cal-root *::before, .tv-cal-root *::after { box-sizing: border-box; }
.tv-cal-root button { font-family: inherit; }

/* Header */
.tv-cal-header {
  flex-shrink: 0; height: 64px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px 0 40px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bd1};
}
.tv-cal-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: ${T.txt0}; margin-right: 24px; }
.tv-cal-logo-mark { position: relative; width: 36px; height: 28px; flex-shrink: 0; }
.tv-cal-logo-mark img { position: absolute; max-width: none; display: block; }
.tv-cal-logo-mark .bg  { top:14.29%; right:1.39%; bottom:21.43%; left:0; width:auto; height:auto; }
.tv-cal-logo-mark .dot { top:14.29%; right:33.33%; bottom:57.14%; left:44.44%; width:auto; height:auto; }
.tv-cal-logo-word { width: 147px; height: 28px; flex-shrink: 0; }
.tv-cal-search {
  display: flex; align-items: center; gap: 8px;
  width: 200px; height: 40px;
  background: ${T.bg2}; border-radius: 6px;
  padding: 0 12px; color: ${T.txt2}; cursor: text;
}
.tv-cal-search svg { opacity: 0.7; }
.tv-cal-nav { display: flex; align-items: center; }
.tv-cal-nav a {
  padding: 0 16px; height: 40px;
  display: inline-flex; align-items: center; gap: 4px;
  color: ${T.txt1}; text-decoration: none;
  font-size: 14px; font-weight: 500; border-radius: 6px;
}
.tv-cal-nav a:hover { background: ${T.bg2}; }
.tv-cal-nav a.is-active { color: ${T.blue}; }
.tv-cal-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tv-cal-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #d500f9 0%, #5d2bff 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  position: relative;
}
.tv-cal-avatar::after {
  content: ''; position: absolute; top: -2px; right: -2px;
  width: 8px; height: 8px; border-radius: 50%; background: ${T.red};
  border: 2px solid ${T.bg0};
}
.tv-cal-offer {
  height: 32px; padding: 0 14px; border-radius: 6px;
  background: linear-gradient(90deg, ${T.magenta} 0%, ${T.blue} 100%);
  color: #fff; border: none; font-weight: 600; font-size: 13px; cursor: pointer;
}

/* Body layout */
.tv-cal-body { flex: 1; display: flex; min-height: 0; }
.tv-cal-main {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
  padding: 0 40px;
  overflow-y: auto;
}
.tv-cal-rail {
  flex-shrink: 0; width: 45px;
  background: ${T.bg0};
  border-left: 1px solid ${T.bd1};
  display: flex; flex-direction: column; align-items: center;
  padding: 2px 0;
}
.tv-cal-rail-btn {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: ${T.txt2};
  cursor: pointer; border-radius: 4px;
}
.tv-cal-rail-btn:hover { background: ${T.bg2}; color: ${T.txt0}; }
.tv-cal-rail-glyph {
  position: relative; width: 28px; height: 28px; display: block;
  filter: invert(63%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(95%) contrast(85%);
}
.tv-cal-rail-spacer { flex: 1; }
.tv-cal-rail-sep { width: 33px; height: 1px; background: ${T.bd2}; margin: 6px 0; }

/* Title + controls */
.tv-cal-title-row {
  display: flex; align-items: center; gap: 12px;
  padding-top: 16px;
}
.tv-cal-title {
  margin: 0;
  font-family: Inter, -apple-system, sans-serif;
  font-weight: 600; font-size: 22px; color: ${T.txt0};
}
.tv-cal-icon-btn {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: ${T.txt1}; cursor: pointer;
}
.tv-cal-icon-btn:hover { background: ${T.bg2}; }
.tv-cal-icon-btn.is-bordered { border-color: ${T.bd2}; }
.tv-cal-title-right { margin-left: auto; }

.tv-cal-controls {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 0;
}
.tv-cal-controls .tv-cal-spacer { flex: 1; }
.tv-cal-today {
  height: 34px; padding: 0 14px; border-radius: 18px;
  background: ${T.bg2}; border: 1px solid ${T.bd1};
  color: ${T.txt1}; font-size: 13px; cursor: pointer;
}
.tv-cal-today:hover { background: ${T.bg3}; }
.tv-cal-daterange {
  font-family: Inter, -apple-system, sans-serif;
  font-size: 16px; font-weight: 500; color: ${T.txt0};
  margin-left: 8px;
}
.tv-cal-tz-chip {
  height: 34px; padding: 0 10px;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid ${T.bd2}; border-radius: 4px;
  color: ${T.txt1}; font-size: 13px; background: transparent;
}

/* Week strip — 7 day cards */
.tv-cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding-bottom: 20px;
}
.tv-cal-day {
  border: 1px solid ${T.bd1};
  border-radius: 12px;
  padding: 12px;
  background: ${T.bg0};
  display: flex; flex-direction: column; gap: 8px;
  min-height: 132px;
  cursor: pointer;
  transition: border-color .12s;
}
.tv-cal-day:hover { border-color: ${T.bd2}; }
.tv-cal-day.is-active {
  background: ${T.bg2};
  border-color: ${T.bd2};
}
.tv-cal-day-name {
  font-size: 16px; font-weight: 500; color: ${T.txt1};
  font-family: Roboto, sans-serif;
  border-bottom: 2px solid transparent;
  align-self: flex-start;
  padding-bottom: 2px;
}
.tv-cal-day.is-active .tv-cal-day-name { border-bottom-color: ${T.txt0}; color: ${T.txt0}; }
.tv-cal-day-stats { display: flex; flex-direction: column; gap: 4px; }
.tv-cal-day-stat {
  display: flex; justify-content: space-between; gap: 0;
  font-size: 12px; color: ${T.txt2};
}
.tv-cal-day-stat-val { color: ${T.txt1}; font-variant-numeric: tabular-nums; }
.tv-cal-day-stat.empty .tv-cal-day-stat-val { color: ${T.txt3}; }

/* Tab bar */
.tv-cal-tabs-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 0 16px;
  border-bottom: 1px solid ${T.bd1};
  position: relative;
}
.tv-cal-tab {
  height: 34px; padding: 0 14px;
  border-radius: 18px;
  background: transparent; border: 1px solid ${T.bd2};
  color: ${T.txt1}; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
}
.tv-cal-tab:hover { background: ${T.bg2}; }
.tv-cal-tab.is-active {
  background: ${T.txt0}; color: #000; border-color: ${T.txt0};
}
.tv-cal-tabs-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tv-cal-categ {
  height: 34px; padding: 0 12px;
  display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid transparent; border-radius: 4px;
  color: ${T.txt1}; font-size: 13px; background: transparent; cursor: pointer;
}
.tv-cal-categ:hover { background: ${T.bg2}; }

/* Table */
.tv-cal-table-wrap {
  margin-top: 16px;
  padding-bottom: 60px;
  position: relative;
}
.tv-cal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tv-cal-table th,
.tv-cal-table td {
  padding: 11px 12px;
  text-align: left;
  border-bottom: 1px solid ${T.bd1};
  vertical-align: middle;
}
.tv-cal-table th {
  font-weight: 400; font-size: 12px;
  color: ${T.txt2};
  text-align: right;
  padding-top: 14px; padding-bottom: 14px;
}
.tv-cal-table th:first-child,
.tv-cal-table th.left { text-align: left; }
.tv-cal-table td.num,
.tv-cal-table td.right { text-align: right; font-variant-numeric: tabular-nums; }
.tv-cal-table td.muted { color: ${T.txt2}; }
.tv-cal-day-sep td {
  background: ${T.bg2};
  color: ${T.txt1}; font-weight: 500;
  border-bottom: 1px solid ${T.bd2};
  padding: 10px 12px;
}
.tv-cal-empty-row td {
  text-align: center; color: ${T.txt2}; padding: 18px;
}
.tv-cal-empty-row svg { vertical-align: -3px; margin-right: 6px; opacity: 0.6; }

/* Country cell */
.tv-cal-country {
  display: inline-flex; align-items: center; gap: 8px;
}
.tv-cal-flag {
  width: 24px; height: 24px; border-radius: 12px;
  object-fit: cover;
  background: ${T.bg2};
  flex-shrink: 0;
}
.tv-cal-country-name { color: ${T.txt1}; }

/* Event title */
.tv-cal-event-title {
  display: inline-flex; align-items: center; gap: 6px;
  color: ${T.txt1};
}
.tv-cal-event-title .caret { opacity: 0.5; }

/* Importance bars */
.tv-cal-imp {
  display: inline-block; vertical-align: middle;
  width: 18px; height: 12px;
}

/* Company logo monogram */
.tv-cal-logo-cell {
  display: inline-flex; align-items: center; gap: 10px;
}
.tv-cal-mono {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 11px;
  flex-shrink: 0;
}
.tv-cal-ticker-logo {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: ${T.bg2};
  object-fit: contain;
  flex-shrink: 0;
  display: inline-block;
}
.tv-cal-ticker-chip {
  display: inline-block;
  padding: 3px 6px; border-radius: 3px;
  background: ${T.bg2}; color: ${T.txt0};
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.3px;
  font-family: Roboto, sans-serif;
}

/* Floating Próximamente badge */
.tv-cal-upcoming-floater {
  position: sticky; bottom: 12px;
  display: flex; justify-content: center;
  pointer-events: none;
  margin-top: -56px; height: 0;
}
.tv-cal-upcoming-btn {
  pointer-events: auto;
  height: 34px; padding: 0 14px 0 8px;
  border-radius: 17px;
  background: ${T.txt0}; color: ${T.bg0};
  border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.tv-cal-upcoming-btn:hover { background: #fff; }

/* P/L colors */
.tv-cal-pos { color: ${T.green}; }
.tv-cal-neg { color: ${T.red}; }
`;
  const style = document.createElement('style');
  style.setAttribute('data-tv-cal', '');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Datasets (mock — representative of Figma)
// ---------------------------------------------------------------------------
const WEEK_DAYS = [
  { name: 'lun 25', date: '2026-05-25', stats: { economico: 18, beneficios: 146, dividendos: 299, ipo: 1 } },
  { name: 'mar 26', date: '2026-05-26', stats: { economico: 33, beneficios: 1051, dividendos: 610, ipo: 3 }, active: true },
  { name: 'mié 27', date: '2026-05-27', stats: { economico: 49, beneficios: 559, dividendos: 635, ipo: 1 } },
  { name: 'jue 28', date: '2026-05-28', stats: { economico: 95, beneficios: 668, dividendos: 1181 } },
  { name: 'vie 29', date: '2026-05-29', stats: { economico: 96, beneficios: 235, dividendos: 2384, ipo: 1 } },
  { name: 'sáb 30', date: '2026-05-30', stats: { economico: 1, beneficios: 17 } },
  { name: 'dom 31', date: '2026-05-31', stats: { economico: 5, beneficios: 2, dividendos: 4 } },
];

const STAT_LABELS = {
  economico: 'Económico',
  beneficios: 'Beneficios',
  dividendos: 'Dividendos',
  ipo: 'Oferta pública inicial (IPO)',
};

// Económico — events grouped by day
const ECONOMICO_ROWS = [
  { day: 'lunes, 25 de mayo', kind: 'sep' },
  { country: 'KR', name: 'Corea del Sur', importance: 'low', title: "Buddha’s Birthday", real: '—', prev: '—', ant: '—' },
  { country: 'US', name: 'EE. UU.',       importance: 'low', title: 'Memorial Day',     real: '—', prev: '—', ant: '—' },
  { country: 'AR', name: 'Argentina',     importance: 'low', title: 'National Day',     real: '—', prev: '—', ant: '—' },
  { country: 'FR', name: 'Francia',       importance: 'low', title: 'Pentecost Monday', real: '—', prev: '—', ant: '—' },
  { country: 'DE', name: 'Alemania',      importance: 'low', title: 'Pentecost Monday', real: '—', prev: '—', ant: '—' },
  { country: 'GB', name: 'Reino Unido',   importance: 'low', title: 'Spring Bank Holiday', real: '—', prev: '—', ant: '—' },
  { country: 'CN', name: 'China continental', importance: 'low', title: 'FDI (YTD) YoY', real: '-10,3%', prev: '—', ant: '-7,3%', realCls: 'neg' },
  { country: 'JP', name: 'Japón',         importance: 'mid', title: '5-Year Climate Transition JGB Auction', real: '1,941%', prev: '—', ant: '1,684%' },
  { country: 'TR', name: 'Turquía',       importance: 'mid', title: 'Economic Confidence Index', real: '97,2', prev: '—', ant: '96,4' },
  { country: 'ZA', name: 'Sudáfrica',     importance: 'low', title: '182-Day T-Bill Auction', real: '7,52%', prev: '—', ant: '7,46%' },
  { country: 'ZA', name: 'Sudáfrica',     importance: 'low', title: '273-Day T-Bill Auction', real: '7,76%', prev: '—', ant: '7,78%', upcoming: true },
  { country: 'ZA', name: 'Sudáfrica',     importance: 'low', title: '364-Day T-Bill Auction', real: '7,81%', prev: '—', ant: '7,78%' },
];

// Beneficios — companies reporting earnings
const BENEFICIOS_ROWS = [
  { day: 'lunes, 25 de mayo', kind: 'sep' },
  { ticker: 'HUMBL',  name: 'Humble plc',                     mono: '#ff9800', bpaE: '—',    bpaR: '0,03',  surp: '+17%', mcap: '32,52 M USD' },
  { ticker: 'TBC',    name: 'Shibaura Machine Co., Ltd.',     mono: '#ff9800', bpaE: '—',    bpaR: '0,11',  surp: '+19%', mcap: '474,76 M USD', upcoming: true },
  { ticker: 'TBC',    name: 'Shibaura Machine Co., Ltd.',     mono: '#ff9800', bpaE: '—',    bpaR: '−0,24', surp: '—',    mcap: '670,76 M USD' },
  { ticker: 'CIL',    name: 'Cilcorel Industries Inc.',       mono: '#ff9800', bpaE: '−0,02',bpaR: '−0,21', surp: '−25%', mcap: '203,00 M USD', surpCls: 'neg' },
  { ticker: 'AEP',    name: 'Atlas Engineered Products Ltd',  mono: '#ff9800', bpaE: '—',    bpaR: '−0,01', surp: '−500%',mcap: '34,80 M USD',  surpCls: 'neg' },
  { ticker: 'AEP',    name: 'Atlas Engineered Products Ltd',  mono: '#ff9800', bpaE: '—',    bpaR: '−0,01', surp: '−500%',mcap: '37,30 M USD',  surpCls: 'neg' },
  { ticker: 'FBH',    name: 'Fisher & Paykel Healthcare Corporation Limited', mono: '#ff9800', bpaE: '—', bpaR: '0,24', surp: '−7%', mcap: '11,60 B USD', surpCls: 'neg' },
];

// Dividendos
const DIVIDENDOS_ROWS = [
  { day: 'lunes, 25 de mayo', kind: 'sep' },
  { ticker: 'ADSH11', name: 'Ad Shopping Fundo de Investimento Imobiliario Responsabilidade Limit…', mono: '#9aa0a6', amt: '0,01', ccy: 'USD', ex: '25 may 2026', pay: '29 may 2026', yld: '0,00%', upcoming: true },
  { ticker: 'ANDRO',  name: 'Alpha Trust Andromeda Investment Trust SA', mono: '#3f51b5', amt: '0,49', ccy: 'USD', ex: '25 may 2026', pay: '19 jun 2026', yld: '8,04%' },
  { ticker: '300787', name: 'Anfu CE LINK Ltd. Class A',                  mono: '#00bc43', amt: '0,03', ccy: 'USD', ex: '25 may 2026', pay: '25 may 2026', yld: '1,88%' },
  { ticker: 'ALAQU',  name: 'Aquila SA',                                  mono: '#ff9800', amt: '0,29', ccy: 'USD', ex: '25 may 2026', pay: '27 may 2026', yld: '7,31%' },
  { ticker: 'ARLUF',  name: 'Aristocrat Leisure Limited',                 mono: '#2962ff', amt: '0,36', ccy: 'USD', ex: '25 may 2026', pay: '1 jul 2026',  yld: '0,00%' },
  { ticker: 'ALL',    name: 'Aristocrat Leisure Limited',                 mono: '#2962ff', amt: '0,36', ccy: 'USD', ex: '25 may 2026', pay: '1 jul 2026',  yld: '1,97%' },
  { ticker: '901652', name: 'Aristocrat Leisure Limited',                 mono: '#2962ff', amt: '0,36', ccy: 'USD', ex: '25 may 2026', pay: '1 jul 2026',  yld: '1,98%' },
  { ticker: 'AC8',    name: 'Aristocrat Leisure Limited',                 mono: '#2962ff', amt: '0,36', ccy: 'USD', ex: '25 may 2026', pay: '1 jul 2026',  yld: '1,98%' },
  { ticker: 'ARKAF',  name: 'Arkema SA',                                  mono: '#00bc43', amt: '4,19', ccy: 'USD', ex: '25 may 2026', pay: '27 may 2026', yld: '0,00%' },
  { ticker: 'V1S',    name: 'Arkema SA',                                  mono: '#00bc43', amt: '4,19', ccy: 'USD', ex: '25 may 2026', pay: '27 may 2026', yld: '6,10%' },
];

// IPO — original "Eventos" tab data
const IPO_ROWS = [
  { day: 'lunes, 25 de mayo', kind: 'sep' },
  { ticker: 'NFPSAMPOOR', name: 'NFP Sampoorna Foods Limited', mono: '#9aa0a6', market: 'NSE',  price: '0,57 USD',   shares: '4.460.000', volume: '2,55 M USD', mcap: '7,26 M USD' },
  { day: 'martes, 26 de mayo', kind: 'sep' },
  { ticker: 'TEAMTECH',  name: 'TEAMTECH FORMWORK SOL LTD',   mono: '#9aa0a6', market: 'NSE',  price: '0,66 USD',   shares: '7.960.000', volume: '5,24 M USD', mcap: '19,73 M USD' },
  { ticker: 'DRIL',      name: 'Lannister Mining Corp.',      mono: '#f7525f', market: 'AMEX', price: '4,00 - 6,00 USD', shares: '2.000.000', volume: '12,00 M USD', mcap: '—' },
  { ticker: 'BWGC',      name: 'BW Industrial Holdings, Inc.', mono: '#2962ff', market: 'AMEX', price: '6,00 - 7,00 USD', shares: '2.625.000', volume: '18,38 M USD', mcap: '—' },
  { day: 'miércoles, 27 de mayo', kind: 'sep' },
  { ticker: '574A',      name: 'LASSIC Co. Ltd.',             mono: '#ff9800', market: 'TSE',  price: '—',          shares: '3.240.000', volume: '—',           mcap: '—' },
  { day: 'jueves, 28 de mayo', kind: 'sep' },
  { kind: 'empty' },
  { day: 'viernes, 29 de mayo', kind: 'sep' },
  { ticker: 'QBL',       name: 'Q-Line Biotech Limited',      mono: '#00bc43', market: 'NSE',  price: '3,40 - 3,57 USD', shares: '6.253.200', volume: '22,35 M USD', mcap: '—' },
];

const TABS = [
  { id: 'economico',  label: 'Económico'  },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'ingresos',   label: 'Ingresos'   },
  { id: 'dividendos', label: 'Dividendos' },
  { id: 'ipo',        label: 'Oferta pública inicial (IPO)' },
];

function normalizeTab(t) {
  if (!t) return 'economico';
  const m = { eventos: 'ipo', resultados: 'beneficios' };
  const id = m[t] || t;
  return TABS.find((x) => x.id === id) ? id : 'economico';
}

// ---------------------------------------------------------------------------
// Renderers per tab
// ---------------------------------------------------------------------------
function impGlyph(level) {
  if (level === 'high') return ICO.importHi;
  if (level === 'mid')  return ICO.importMid;
  return ICO.importLow;
}

function renderTableEconomico() {
  let rows = '';
  for (const r of ECONOMICO_ROWS) {
    if (r.kind === 'sep') {
      rows += `<tr class="tv-cal-day-sep"><td colspan="6">${r.day}</td></tr>`;
      continue;
    }
    const flag = FLAGS[r.country] || '';
    rows += `<tr>
      <td>
        <span class="tv-cal-country">
          ${flag ? `<img class="tv-cal-flag" src="${flag}" alt="${r.country}" />` : `<span class="tv-cal-flag"></span>`}
          <span class="tv-cal-country-name">${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td><span class="tv-cal-imp">${impGlyph(r.importance)}</span></td>
      <td class="left"><span class="tv-cal-event-title">${escapeHtml(r.title)} <span class="caret">${ICO.caretD}</span></span></td>
      <td class="num ${r.realCls === 'neg' ? 'tv-cal-neg' : ''}"><strong>${escapeHtml(r.real)}</strong></td>
      <td class="num muted">${escapeHtml(r.prev)}</td>
      <td class="num">${escapeHtml(r.ant)}</td>
    </tr>`;
  }
  return `
    <table class="tv-cal-table">
      <thead><tr>
        <th class="left" colspan="3"></th>
        <th>Real</th><th>Previsión</th><th>Anterior</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTableBeneficios() {
  let rows = '';
  for (const r of BENEFICIOS_ROWS) {
    if (r.kind === 'sep') {
      rows += `<tr class="tv-cal-day-sep"><td colspan="6">${r.day}</td></tr>`;
      continue;
    }
    rows += `<tr>
      <td colspan="2">
        <span class="tv-cal-logo-cell">
          ${tickerLogoHtml(r)}
          <span class="tv-cal-ticker-chip">${escapeHtml(r.ticker)}</span>
          <span>${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td class="num">${escapeHtml(r.bpaE)}</td>
      <td class="num"><strong>${escapeHtml(r.bpaR)}</strong></td>
      <td class="num ${r.surpCls === 'neg' ? 'tv-cal-neg' : 'tv-cal-pos'}">${escapeHtml(r.surp)}</td>
      <td class="num muted">${escapeHtml(r.mcap)}</td>
    </tr>`;
  }
  return `
    <table class="tv-cal-table">
      <thead><tr>
        <th class="left" colspan="2">Sorpresa, 25 de mayo</th>
        <th>BPA estimado</th><th>BPA real</th><th>Sorpresa</th><th>Capitalización de mercado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTableIngresos() {
  // Reuse beneficios rows with different column labels
  let rows = '';
  for (const r of BENEFICIOS_ROWS) {
    if (r.kind === 'sep') {
      rows += `<tr class="tv-cal-day-sep"><td colspan="6">${r.day}</td></tr>`;
      continue;
    }
    rows += `<tr>
      <td colspan="2">
        <span class="tv-cal-logo-cell">
          ${tickerLogoHtml(r)}
          <span class="tv-cal-ticker-chip">${escapeHtml(r.ticker)}</span>
          <span>${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td class="num muted">—</td>
      <td class="num"><strong>${escapeHtml(r.mcap.replace(' USD',''))}</strong></td>
      <td class="num ${r.surpCls === 'neg' ? 'tv-cal-neg' : 'tv-cal-pos'}">${escapeHtml(r.surp)}</td>
      <td class="num muted">${escapeHtml(r.mcap)}</td>
    </tr>`;
  }
  return `
    <table class="tv-cal-table">
      <thead><tr>
        <th class="left" colspan="2"></th>
        <th>Ingresos estimados</th><th>Ingresos reales</th><th>Sorpresa</th><th>Capitalización de mercado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTableDividendos() {
  let rows = '';
  for (const r of DIVIDENDOS_ROWS) {
    if (r.kind === 'sep') {
      rows += `<tr class="tv-cal-day-sep"><td colspan="6">${r.day}</td></tr>`;
      continue;
    }
    rows += `<tr>
      <td colspan="2">
        <span class="tv-cal-logo-cell">
          ${tickerLogoHtml(r)}
          <span class="tv-cal-ticker-chip">${escapeHtml(r.ticker)}</span>
          <span>${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td class="num">${escapeHtml(r.amt)} <span class="muted">${escapeHtml(r.ccy)}</span></td>
      <td class="num"><strong>${escapeHtml(r.ex)}</strong></td>
      <td class="num"><strong>${escapeHtml(r.pay)}</strong></td>
      <td class="num">${escapeHtml(r.yld)}</td>
    </tr>`;
  }
  return `
    <table class="tv-cal-table">
      <thead><tr>
        <th class="left" colspan="2"></th>
        <th>Cantidad</th><th>Fecha ex-dividendo</th><th>Fecha de pago</th><th>Rentabilidad por dividendo</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTableIpo() {
  let rows = '';
  for (const r of IPO_ROWS) {
    if (r.kind === 'sep') {
      rows += `<tr class="tv-cal-day-sep"><td colspan="7">${r.day}</td></tr>`;
      continue;
    }
    if (r.kind === 'empty') {
      rows += `<tr class="tv-cal-empty-row"><td colspan="7">${ICO.cal} No hay eventos</td></tr>`;
      continue;
    }
    rows += `<tr>
      <td colspan="2">
        <span class="tv-cal-logo-cell">
          ${tickerLogoHtml(r)}
          <span class="tv-cal-ticker-chip">${escapeHtml(r.ticker)}</span>
          <span>${escapeHtml(r.name)}</span>
        </span>
      </td>
      <td>${escapeHtml(r.market)}</td>
      <td class="num">${escapeHtml(r.price)}</td>
      <td class="num">${escapeHtml(r.shares)}</td>
      <td class="num">${escapeHtml(r.volume)}</td>
      <td class="num">${escapeHtml(r.mcap)}</td>
    </tr>`;
  }
  return `
    <table class="tv-cal-table">
      <thead><tr>
        <th class="left" colspan="2"></th>
        <th>Mercado bursátil</th><th>Precio de oferta</th><th>Acciones ofrecidas</th><th>Importe</th><th>Cap. mercado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const TABLE_RENDERERS = {
  economico:  renderTableEconomico,
  beneficios: renderTableBeneficios,
  ingresos:   renderTableIngresos,
  dividendos: renderTableDividendos,
  ipo:        renderTableIpo,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function initials(s) {
  return String(s || '').slice(0, 1).toUpperCase();
}
function railIcon(title, layers) {
  const imgs = layers.map((l) => {
    const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;`;
    return `<img src="${l.src}" alt="" style="${style}width:auto;height:auto;display:block;max-width:none;" />`;
  }).join('');
  return `<button class="tv-cal-rail-btn" title="${title}"><span class="tv-cal-rail-glyph">${imgs}</span></button>`;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------
export function createCalendarPage(mount, opts = {}) {
  ensureStyles();
  if (!mount) throw new Error('createCalendarPage: missing mount');
  mount.innerHTML = '';

  const state = {
    tab: normalizeTab(opts.tab),
    activeDayIdx: WEEK_DAYS.findIndex((d) => d.active) || 1,
  };

  const root = document.createElement('div');
  root.className = 'tv-cal-root';
  mount.appendChild(root);

  function renderShell() {
    root.innerHTML = `
      <div class="tv-cal-header">
        <a href="#/" class="tv-cal-logo" aria-label="TradingView">
          <span class="tv-cal-logo-mark">
            <img class="bg"  src="${IMG.logoMarkBg}"  alt="" />
            <img class="dot" src="${IMG.logoMarkDot}" alt="" />
          </span>
          <img class="tv-cal-logo-word" src="${IMG.logoWordmark}" alt="TradingView" />
        </a>
        <div class="tv-cal-search">${ICO.search}<span>Buscar (Ctrl+K)</span></div>
        <nav class="tv-cal-nav">
          <a href="#/" class="is-active">Productos ${ICO.caretD}</a>
          <a href="#/news">Comunidad ${ICO.caretD}</a>
          <a href="#/screener">Mercados ${ICO.caretD}</a>
          <a href="#/brokers">Brokers ${ICO.caretD}</a>
          <a href="#/">Más ${ICO.caretD}</a>
        </nav>
        <div class="tv-cal-header-right">
          <div class="tv-cal-avatar" title="Perfil">H</div>
          <button class="tv-cal-offer">Ampliar</button>
        </div>
      </div>

      <div class="tv-cal-body">
        <main class="tv-cal-main">
          <div class="tv-cal-title-row">
            <h1 class="tv-cal-title">Calendario</h1>
            <div class="tv-cal-title-right">
              <button class="tv-cal-icon-btn" title="Expandir">${ICO.expand}</button>
            </div>
          </div>

          <div class="tv-cal-controls">
            <button class="tv-cal-today">Hoy</button>
            <button class="tv-cal-icon-btn" title="Calendario">${ICO.cal}</button>
            <button class="tv-cal-icon-btn" title="Anterior" data-nav="prev">${ICO.caretL}</button>
            <button class="tv-cal-icon-btn" title="Siguiente" data-nav="next">${ICO.caretR}</button>
            <span class="tv-cal-daterange">25 may — 31 may 2026</span>
            <span class="tv-cal-spacer"></span>
            <button class="tv-cal-icon-btn" title="Importancia">${ICO.crown}</button>
            <button class="tv-cal-icon-btn" title="G20">${ICO.g20}</button>
            <button class="tv-cal-tz-chip">${ICO.clock}<span>10:02 (UTC+2)</span> ${ICO.caretD}</button>
          </div>

          <div class="tv-cal-week" data-week></div>

          <div class="tv-cal-tabs-row" data-tabs-row>
            <div data-tabs></div>
            <div class="tv-cal-tabs-right">
              <button class="tv-cal-icon-btn" title="Visualización">${ICO.chart}</button>
              <button class="tv-cal-categ">${ICO.list} Todas las categorías ${ICO.caretD}</button>
            </div>
          </div>

          <div class="tv-cal-table-wrap" data-table></div>

          <div class="tv-cal-upcoming-floater" data-upcoming-wrap>
            <button class="tv-cal-upcoming-btn">${ICO.arrowDn} Próximamente</button>
          </div>
        </main>

        <aside class="tv-cal-rail">
          ${railIcon('Listas', [
            { src: IMG.railWatchA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 },
            { src: IMG.railWatchB, t: 25,    r: 27.27, b: 22.73, l: 27.27 },
          ])}
          ${railIcon('Alertas', [
            { src: IMG.railAlertA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 },
            { src: IMG.railAlertB, t: 25,    r: 27.27, b: 22.73, l: 27.27 },
          ])}
          ${railIcon('Chats', [
            { src: IMG.railChatA, t: 20.45, r: 20.45, b: 45.45, l: 20.45 },
            { src: IMG.railChatB, t: 25, r: 25, b: 25, l: 25 },
          ])}
          <div class="tv-cal-rail-spacer"></div>
          ${railIcon('Indicadores', [{ src: IMG.railInd, t: 25, r: 22.7, b: 18.84, l: 22.73 }])}
          ${railIcon('Calendarios', [{ src: IMG.railCal, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
          ${railIcon('Comunidad',   [{ src: IMG.railComm, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
          ${railIcon('Notificaciones', [
            { src: IMG.railNotifA, t: 22.73, r: 25, b: 27.27, l: 25 },
            { src: IMG.railNotifB, t: 36.36, r: 38.64, b: 27.27, l: 25 },
          ])}
          ${railIcon('Productos', [{ src: IMG.railProd, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
          ${railIcon('Ayuda',     [{ src: IMG.railHelp, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
        </aside>
      </div>
    `;

    renderWeek();
    renderTabs();
    renderTable();
    wireEvents();
  }

  function renderWeek() {
    const host = root.querySelector('[data-week]');
    host.innerHTML = WEEK_DAYS.map((d, i) => {
      const isActive = i === state.activeDayIdx;
      const lines = ['economico', 'beneficios', 'dividendos', 'ipo']
        .filter((k) => d.stats[k] != null || k !== 'ipo' || d.stats.ipo != null)
        .map((k) => {
          const v = d.stats[k];
          if (v == null) return '';
          return `<div class="tv-cal-day-stat"><span>${STAT_LABELS[k]}</span><span class="tv-cal-day-stat-val">${v}</span></div>`;
        }).join('');
      return `<button class="tv-cal-day ${isActive ? 'is-active' : ''}" data-day="${i}">
        <span class="tv-cal-day-name">${d.name}</span>
        <div class="tv-cal-day-stats">${lines}</div>
      </button>`;
    }).join('');
  }

  function renderTabs() {
    const host = root.querySelector('[data-tabs]');
    host.style.display = 'flex';
    host.style.gap = '8px';
    host.innerHTML = TABS.map((t) =>
      `<button class="tv-cal-tab ${state.tab === t.id ? 'is-active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');
  }

  function renderTable() {
    const host = root.querySelector('[data-table]');
    const fn = TABLE_RENDERERS[state.tab] || TABLE_RENDERERS.economico;
    host.innerHTML = fn();
  }

  function wireEvents() {
    // Delegated handler — survives sub-renders that rebuild tabs/week buttons.
    root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn && root.contains(tabBtn)) {
        state.tab = tabBtn.dataset.tab;
        renderTabs();
        renderTable();
        return;
      }
      const dayBtn = e.target.closest('[data-day]');
      if (dayBtn && root.contains(dayBtn)) {
        state.activeDayIdx = Number(dayBtn.dataset.day);
        renderWeek();
        return;
      }
    });
  }

  function render() { renderShell(); }
  function destroy() {
    try { root.remove(); } catch {}
  }

  render();
  return { render, destroy };
}

export default createCalendarPage;
