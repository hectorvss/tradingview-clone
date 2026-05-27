// /options chain tab — wide table of Calls | STRIKE | Puts with greeks/IV/volume.
// Figma 17:130797 (file 2QhXqtb66hdeKvlZAZE4fS). Mock data only.
//
// 1:1 rebuild against design-context for the column header strip, IV-bar cells,
// symbol-banner active row, and Component 11/12 expiry accordion rows.

const STYLE_ID = 'opt-chain-style';

// Figma palette (raw hex, taken from get_design_context responses):
//   color/black/solid            -> #000000  (header strip bg)
//   color/grey/6                 -> #0f0f0f  (page bg, sometimes used)
//   color/grey/12                -> #1f1f1f  (strike column bg, expiry row bg, symbol banner pill)
//   color/grey/18                -> #2e2e2e  (row hover / banner pill)
//   color/grey/24                -> #3d3d3d  (inset bottom border between rows)
//   color/grey/55                -> #8c8c8c  (header text)
//   color/grey/72-20%            -> rgba(184,184,184,0.2)  (series code tag bg)
//   color/grey/86                -> #dbdbdb  (cell text)
//   color/azure/23-4             -> #142e61  (call IV bar track)
//   color/azure/58               -> #2962ff  (call IV bar fill)
//   color/red/20                 -> #4d191d  (put IV bar track)
//   color/red/58                 -> #f23645  (put IV bar fill / down number)
//   color/red/58-20%             -> rgba(242,54,69,0.2)  (0DTE tag bg)
//   color/red/73-2               -> #f77c80  (DTE tag text)
//   color/cyan/40                -> #22ab94  (up number)

const STYLES = `
.opt-chain-wrap {
  display: flex; flex-direction: column;
  width: 100%; height: 100%;
  background: #0f0f0f;
  font-family: Roboto, 'Trebuchet MS', Arial, sans-serif;
  color: #dbdbdb;
  font-size: 14px;
  line-height: 18px;
  overflow: hidden;
  box-sizing: border-box;
}
.opt-chain-wrap * { box-sizing: border-box; }

/* Top bits (controls, side labels, open expiry row, accordion) stay put;
   only the chain table scrolls. */
.opt-chain-controls,
.opt-chain-side-labels,
.opt-chain-wrap > .opt-acc-row,
.opt-accordion-list { flex: 0 0 auto; }

/* LIVE pulsing dot near the symbol pill */
.opt-live-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  background: #22ab94;
  margin-right: 6px;
  vertical-align: middle;
  box-shadow: 0 0 0 0 rgba(34,171,148,0.6);
  animation: opt-live-pulse 1.6s ease-out infinite;
}
.opt-live-label {
  display: inline-block; vertical-align: middle;
  font: 700 10px/1 Roboto, Arial, sans-serif;
  color: #22ab94;
  letter-spacing: 0.6px;
  margin-right: 8px;
}
@keyframes opt-live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34,171,148,0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(34,171,148,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,171,148,0); }
}

/* ------- top control row (pills + icons) ------- */
.opt-chain-controls {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 20px 8px;
}
.opt-ctrl-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 12px;
  background: #1f1f1f;
  border: 1px solid #2e2e2e;
  border-radius: 4px;
  color: #dbdbdb;
  font: 400 14px/18px Roboto, Arial, sans-serif;
  cursor: pointer;
}
.opt-ctrl-pill:hover { border-color: #4a4a4a; }
.opt-ctrl-pill .opt-ctrl-caret { color: #8c8c8c; font-size: 10px; margin-left: 2px; }
.opt-ctrl-spacer { flex: 1 1 auto; }
.opt-ctrl-icon {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: #8c8c8c; cursor: pointer; border-radius: 4px;
  font-size: 16px;
}
.opt-ctrl-icon:hover { background: #1f1f1f; color: #dbdbdb; }

/* ------- "Calls"/"Puts" side labels above the table ------- */
.opt-chain-side-labels {
  display: flex; justify-content: space-between;
  padding: 8px 20px 4px;
  font: 400 14px/18px Roboto, Arial, sans-serif;
  color: #dbdbdb;
}
.opt-chain-side-labels .opt-side-puts { color: #dbdbdb; }

/* ------- main horizontally-scrolling table ------- */
.opt-chain-scroll {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  overflow: auto;
  position: relative;
}
.opt-chain-table {
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  min-width: 100%;
  font: 400 14px/18px Roboto, Arial, sans-serif;
  color: #dbdbdb;
}
/* HEADER — sticky vertically so it stays in view when scrolling expiries */
.opt-chain-table thead th {
  position: sticky; top: 0; z-index: 5;
  background: #000;
  color: #8c8c8c;
  font: 400 14px/18px Roboto, Arial, sans-serif;
  padding: 11px 12px;
  box-shadow: inset 0 -1px 0 0 #3d3d3d;
  text-align: right;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
}
.opt-chain-table thead th .opt-sort-arrow {
  display: inline-block;
  width: 0; opacity: 0;
  margin-left: 4px;
  font-size: 9px;
  color: #8c8c8c;
  transition: opacity 0.15s ease, width 0.15s ease;
}
.opt-chain-table thead th:hover .opt-sort-arrow,
.opt-chain-table thead th.opt-sorted .opt-sort-arrow {
  width: 10px; opacity: 1;
}
.opt-chain-table thead th.opt-sorted { color: #dbdbdb; }
/* Sticky STRIKE column — header sits at the crossing of vertical+horizontal */
.opt-chain-table thead th.opt-th-strike {
  position: sticky; top: 0; left: 50%;
  z-index: 7;
  background: #1f1f1f;
  color: #dbdbdb;
  font-weight: 500;
  text-align: center;
  min-width: 86px;
  cursor: default;
}
.opt-chain-table thead th.opt-th-strike .opt-th-strike-inner {
  display: inline-flex; align-items: center; gap: 2px;
  justify-content: center;
}
.opt-chain-table thead th.opt-th-strike .opt-th-strike-caret {
  display: inline-block; width: 14px; height: 14px;
  color: #8c8c8c; font-size: 10px; transform: rotate(180deg);
}
/* BODY */
.opt-chain-table tbody td {
  padding: 11px 12px;
  text-align: right;
  white-space: nowrap;
  box-shadow: inset 0 -1px 0 0 #3d3d3d;
  font-variant-numeric: tabular-nums;
  background: #000;
  vertical-align: middle;
}
.opt-chain-table tbody td.opt-td-strike {
  position: sticky; left: 50%;
  z-index: 3;
  text-align: center;
  font-weight: 500;
  color: #dbdbdb;
  background: #1f1f1f;
  min-width: 86px;
  cursor: pointer;
}
.opt-chain-table tbody tr.opt-row-active td {
  background: #0a0a0a;
}
.opt-chain-table tbody tr.opt-row-active td.opt-td-strike {
  background: #2e2e2e;
}
.opt-chain-table tbody tr.opt-row-selected td {
  background: rgba(41,98,255,0.10);
}
.opt-chain-table tbody tr.opt-row-selected td.opt-td-strike {
  background: #2962ff;
  color: #fff;
}
.opt-chain-table tbody tr:not(.opt-row-active):not(.opt-row-selected):not(.opt-symbol-row):hover td {
  background: rgba(255,255,255,0.03);
}
.opt-chain-table tbody tr:not(.opt-row-active):not(.opt-row-selected):not(.opt-symbol-row):hover td.opt-td-strike {
  background: #2a2a2a;
}
.opt-chain-table tbody tr { cursor: pointer; }

/* Expiry header row inside the scrolling table (used for the active expiry).
   Holds the symbol banner pill, centered. */
.opt-chain-table tbody tr.opt-symbol-row td {
  background: #000;
  padding: 0;
  box-shadow: inset 0 -1px 0 0 #3d3d3d;
  height: 41px;
  position: relative;
}
.opt-symbol-row .opt-symbol-pill {
  position: sticky; left: 50%;
  display: inline-flex; align-items: center; gap: 6px;
  background: #2e2e2e;
  padding: 5px 12px 5px 5px;
  border-radius: 40px;
  transform: translateX(-50%);
  margin: 0 auto;
}
.opt-symbol-row .opt-symbol-pill-wrap {
  display: flex; justify-content: center; align-items: center; height: 41px;
}
.opt-symbol-pill .opt-symbol-icon {
  width: 18px; height: 18px; border-radius: 9px;
  background: #f23645;
  color: #fff; font-size: 8px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  letter-spacing: -0.3px;
}
.opt-symbol-pill .opt-symbol-name {
  font: 400 12.9px/1 Roboto, Arial, sans-serif;
  color: #dbdbdb;
}
.opt-symbol-pill .opt-symbol-price {
  font: 400 14px/1 Roboto, Arial, sans-serif;
  color: #dbdbdb;
}
.opt-symbol-pill .opt-symbol-ccy {
  font: 500 10px/14px Roboto, Arial, sans-serif;
  color: #dbdbdb;
  align-self: flex-end;
}
.opt-symbol-pill .opt-symbol-chg {
  font: 400 14px/1 Roboto, Arial, sans-serif;
  color: #22ab94;
}
.opt-symbol-pill .opt-symbol-chg-pct {
  font: 400 13.8px/1 Roboto, Arial, sans-serif;
  color: #22ab94;
}
.opt-symbol-pill .opt-symbol-chg.down,
.opt-symbol-pill .opt-symbol-chg-pct.down { color: #f23645; }

/* IV-bar cell — 80x6 bar with right-anchored (calls) or left-anchored (puts) fill */
.opt-chain-table tbody td.opt-iv-bar-cell {
  text-align: right;
  padding: 11px 12px;
}
/* The put-side IV bar (first put column) is also sticky, anchored just past STRIKE */
.opt-chain-table tbody td.opt-iv-bar-cell.opt-iv-sticky {
  position: sticky; left: calc(50% + 86px);
  z-index: 2;
  background: #000;
}
.opt-chain-table thead th.opt-th-iv-sticky {
  position: sticky; top: 0; left: calc(50% + 86px);
  z-index: 6;
  background: #000;
}
.opt-chain-table tbody tr.opt-row-active td.opt-iv-bar-cell.opt-iv-sticky { background: #0a0a0a; }
.opt-chain-table tbody tr.opt-row-selected td.opt-iv-bar-cell.opt-iv-sticky { background: #0d1a3a; }
.opt-iv-bar-cell .opt-iv-bar-inner {
  display: inline-flex; align-items: center; gap: 8px;
  vertical-align: middle;
}
.opt-iv-bar {
  position: relative;
  width: 80px; height: 6px;
  border-radius: 12px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
}
.opt-iv-bar.call { background: #142e61; }
.opt-iv-bar.put  { background: #4d191d; }
.opt-iv-bar .opt-iv-bar-fill {
  position: absolute; top: 0; bottom: 0;
  border-radius: 12px;
}
.opt-iv-bar.call .opt-iv-bar-fill { background: #2962ff; right: 0; }
.opt-iv-bar.put  .opt-iv-bar-fill { background: #f23645; left: 0; }

.opt-iv-bar-cell .opt-iv-bar-val {
  display: inline-block;
  min-width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Coloured numeric cells */
.opt-num-pos { color: #22ab94; }
.opt-num-neg { color: #f23645; }
.opt-num-mute { color: #8c8c8c; }

/* Expiry accordion (sticky group rows under the open table). Component 11/12 in Figma. */
.opt-accordion-list { display: flex; flex-direction: column; }
.opt-acc-row {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 16px 10px 16px;
  background: #1f1f1f;
  box-shadow: inset 0 -1px 0 0 #3d3d3d;
  font: 700 14px/18px Roboto, Arial, sans-serif;
  color: #dbdbdb;
  cursor: pointer;
  user-select: none;
  min-height: 39px;
  box-sizing: border-box;
}
.opt-acc-row:hover { background: #232323; }
.opt-acc-caret {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  color: #8c8c8c; font-size: 10px;
  transition: transform 0.15s ease;
  transform: rotate(-90deg);
}
.opt-acc-row.open .opt-acc-caret { transform: rotate(0deg); }
.opt-acc-body {
  overflow: hidden;
  max-height: 0;
  padding: 0 18px 0 40px;
  transition: max-height 0.28s ease, padding 0.2s ease;
}
.opt-acc-body.open {
  max-height: 240px;
  padding: 10px 18px 14px 40px;
}
.opt-acc-date {
  font: 700 14px/18px Roboto, Arial, sans-serif;
  color: #dbdbdb;
  margin-right: 4px;
}
.opt-acc-tag-dte {
  display: inline-flex; align-items: center; justify-content: center;
  height: 20px; padding: 0 6px;
  background: rgba(242,54,69,0.2);
  color: #f77c80;
  border-radius: 4px;
  font: 700 11px/1 Roboto, Arial, sans-serif;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  gap: 3.88px;
}
.opt-acc-tag-series {
  display: inline-flex; align-items: center; justify-content: center;
  height: 20px; padding: 0 6px;
  background: rgba(184,184,184,0.2);
  color: #dbdbdb;
  border-radius: 4px;
  font: 700 11px/1 Roboto, Arial, sans-serif;
  letter-spacing: 0.55px;
  text-transform: uppercase;
}
.opt-acc-body {
  background: #0a0a0a;
  color: #8c8c8c;
  font: 400 12px/16px Roboto, Arial, sans-serif;
  box-shadow: inset 0 -1px 0 0 #3d3d3d;
}
`;

// ============================================================================
//   COLUMN DEFINITION — copied 1:1 from Figma metadata
//   (49 header cells, 24 columns per side + 1 STRIKE center column)
//   Widths are extracted from the th.th-lCkuStTk frame widths.
//   Left side (Calls)  ─ from far edge inwards (Rho first, Volumen closest)
//   STRIKE             ─ centered between Calls Volumen and Volatilidad
//   Right side (Puts)  ─ MIRRORED: Volatilidad implícita FIRST after STRIKE,
//                         then Volumen, Distancia, …, Rho on the far right.
// ============================================================================
const CALL_COLS = [
  { key: 'rho',          label: 'Rho',                          w: 61, type: 'num',   sign: 'signed' },
  { key: 'vega',         label: 'Vega',                         w: 53, type: 'num' },
  { key: 'gamma',        label: 'Gamma',                        w: 71, type: 'num4' },
  { key: 'theta',        label: 'Theta',                        w: 68, type: 'num',   sign: 'neg' },
  { key: 'delta',        label: 'Delta',                        w: 61, type: 'num' },
  { key: 'beBreak',      label: '% hasta punto de equilibrio',  w: 194, type: 'pct' },
  { key: 'be',           label: 'BE',                           w: 83, type: 'num' },
  { key: 'spreadVI',     label: 'Spread de VI',                 w: 103, type: 'pct' },
  { key: 'viAsk',        label: 'VI de ask, %',                 w: 98, type: 'pct' },
  { key: 'viBid',        label: 'VI de bid, %',                 w: 97, type: 'pct' },
  { key: 'timeValue',    label: 'Valor del tiempo',             w: 128, type: 'num' },
  { key: 'intrinsic',    label: 'Valor intrínseco',             w: 122, type: 'num' },
  { key: 'askAnnual',    label: 'Ask anual, %',                 w: 101, type: 'pct' },
  { key: 'bidAnnual',    label: 'Bid anual, %',                 w: 100, type: 'pct' },
  { key: 'askPct',       label: 'Ask, %',                       w: 63, type: 'pct' },
  { key: 'bidPct',       label: 'Bid, %',                       w: 61, type: 'pct' },
  { key: 'puc',          label: 'PUC',                          w: 68, type: 'num' },
  { key: 'theoretical',  label: 'Teórico',                      w: 69, type: 'num' },
  { key: 'spread',       label: 'Spread',                       w: 67, type: 'num' },
  { key: 'ask',          label: 'Ask',                          w: 68, type: 'num' },
  { key: 'bid',          label: 'Bid',                          w: 68, type: 'num' },
  { key: 'distRel',      label: 'Dist. rel.',                   w: 80, type: 'pct' },
  { key: 'distancia',    label: 'Distancia',                    w: 81, type: 'num' },
  { key: 'volumen',      label: 'Volumen',                      w: 104, type: 'int' },
];

const PUT_COLS = [
  { key: 'ivBar',        label: 'Volatilidad implícita',        w: 151, type: 'ivbar' },
  { key: 'volumen',      label: 'Volumen',                      w: 104, type: 'int' },
  { key: 'distancia',    label: 'Distancia',                    w: 81, type: 'num' },
  { key: 'distRel',      label: 'Dist. rel.',                   w: 80, type: 'pct' },
  { key: 'bid',          label: 'Bid',                          w: 68, type: 'num' },
  { key: 'ask',          label: 'Ask',                          w: 68, type: 'num' },
  { key: 'spread',       label: 'Spread',                       w: 67, type: 'num' },
  { key: 'theoretical',  label: 'Teórico',                      w: 69, type: 'num' },
  { key: 'puc',          label: 'PUC',                          w: 68, type: 'num' },
  { key: 'bidPct',       label: 'Bid, %',                       w: 61, type: 'pct' },
  { key: 'askPct',       label: 'Ask, %',                       w: 63, type: 'pct' },
  { key: 'bidAnnual',    label: 'Bid anual, %',                 w: 100, type: 'pct' },
  { key: 'askAnnual',    label: 'Ask anual, %',                 w: 101, type: 'pct' },
  { key: 'intrinsic',    label: 'Valor intrínseco',             w: 122, type: 'num' },
  { key: 'timeValue',    label: 'Valor del tiempo',             w: 128, type: 'num' },
  { key: 'viBid',        label: 'VI de bid, %',                 w: 97, type: 'pct' },
  { key: 'viAsk',        label: 'VI de ask, %',                 w: 98, type: 'pct' },
  { key: 'spreadVI',     label: 'Spread de VI',                 w: 103, type: 'pct' },
  { key: 'be',           label: 'BE',                           w: 83, type: 'num' },
  { key: 'beBreak',      label: '% hasta punto de equilibrio',  w: 194, type: 'pct' },
  { key: 'delta',        label: 'Delta',                        w: 61, type: 'num' },
  { key: 'theta',        label: 'Theta',                        w: 68, type: 'num',   sign: 'neg' },
  { key: 'gamma',        label: 'Gamma',                        w: 71, type: 'num4' },
  { key: 'vega',         label: 'Vega',                         w: 53, type: 'num' },
  { key: 'rho',          label: 'Rho',                          w: 67, type: 'num',   sign: 'signed' },
];

// Calls visible side gets the IV-bar column closest to STRIKE — but on the Calls
// side Figma renders it *between* the call columns and STRIKE (mirror of puts).
// Looking again at the metadata: there is only ONE IV-bar header column (id 17:128931
// "Volatilidad implícita"), positioned at x=2154 right after the STRIKE column.
// So the Calls side does NOT have a separate IV-bar header; instead the bar fills
// the rightmost Volumen cell on call rows. Confirmed by 24 bar nodes (one per
// row, on the put side only, x=0 width=80).
// We render an IV-bar column ONLY on the Put side — the Calls IV bar visible in
// the cached image lives in the Volumen cell on call rows.

// ----------------------------- mock data -----------------------------
const STRIKES = [7515, 7520, 7525, 7530, 7535, 7540, 7545];
const ACTIVE_STRIKE = 7530;
const SYMBOL_PRICE = 7531.00;
const SYMBOL_CHG = 40.00;
const SYMBOL_CHG_PCT = 0.53;

function seedNum(strike, key, scale = 1, offset = 0) {
  let h = 0; const s = String(strike) + key;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const r = ((h >>> 0) % 10000) / 10000;
  return offset + r * scale;
}

function fmtN(v, dec = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  const [int, frac] = abs.toFixed(dec).split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return sign + (frac ? withDots + ',' + frac : withDots);
}
function fmtInt(v) {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtPct(v) { return fmtN(v, 2) + '%'; }

function cellValue(strike, key, side) {
  const itm = side === 'call' ? strike <= ACTIVE_STRIKE : strike >= ACTIVE_STRIKE;
  switch (key) {
    case 'rho':         return seedNum(strike, key, 1.2, -0.4);
    case 'vega':        return seedNum(strike, key, 1.2, 0.1);
    case 'gamma':       return seedNum(strike, key, 0.0015, 0.0005);
    case 'theta':       return -seedNum(strike, key, 25, 5);
    case 'delta':       return side === 'call' ? seedNum(strike, key, 0.8, 0.1) : -seedNum(strike, key, 0.8, 0.1);
    case 'beBreak':     return seedNum(strike, key, 1.2, 0.1);
    case 'be':          return seedNum(strike, key, 50, 7500);
    case 'spreadVI':    return seedNum(strike, key, 8, 0.5);
    case 'viAsk':       return seedNum(strike, key, 25, 12);
    case 'viBid':       return seedNum(strike, key, 25, 11);
    case 'timeValue':   return seedNum(strike, key, 20, 1);
    case 'intrinsic':   return itm ? Math.abs(strike - ACTIVE_STRIKE) + seedNum(strike, key, 5) : 0;
    case 'askAnnual':   return seedNum(strike, key, 65, 5);
    case 'bidAnnual':   return seedNum(strike, key, 60, 5);
    case 'askPct':      return seedNum(strike, key, 0.3, 0.05);
    case 'bidPct':      return seedNum(strike, key, 0.3, 0.05);
    case 'puc':         return seedNum(strike, key, 30, 5);
    case 'theoretical': return seedNum(strike, key, 30, 6);
    case 'spread':      return seedNum(strike, key, 3, 0.3);
    case 'ask':         return seedNum(strike, key, 30, 6);
    case 'bid':         return seedNum(strike, key, 30, 5);
    case 'distRel':     return Math.abs(strike - ACTIVE_STRIKE) / ACTIVE_STRIKE * 100;
    case 'distancia':   return Math.abs(strike - ACTIVE_STRIKE);
    case 'volumen':     return Math.floor(seedNum(strike, key, 200, 50));
    default: return null;
  }
}

function renderCell(strike, col, side, isFirstPut) {
  if (col.type === 'ivbar') return renderIvBarCell(strike, side, isFirstPut);
  const v = cellValue(strike, col.key, side);
  let txt;
  switch (col.type) {
    case 'num':   txt = fmtN(v, 2); break;
    case 'num4':  txt = fmtN(v, 4); break;
    case 'pct':   txt = fmtN(v, 2) + '%'; break;
    case 'int':   txt = fmtInt(v); break;
    default:      txt = String(v);
  }
  return `<td data-col="${col.key}" data-side="${side}" data-val="${v}">${txt}</td>`;
}

function renderIvBarCell(strike, side, isFirstPut) {
  const dist = Math.abs(strike - ACTIVE_STRIKE);
  // pct = fraction of bar filled
  const fillPct = Math.max(8, Math.min(92, 60 - dist * 3));
  const val = (seedNum(strike, 'iv' + side, 4, 14)).toFixed(2);
  const fillStyle = `width:${fillPct}%`;
  const stickyCls = isFirstPut ? ' opt-iv-sticky' : '';
  return `<td class="opt-iv-bar-cell${stickyCls}" data-col="ivBar" data-side="${side}" data-val="${val}">
    <span class="opt-iv-bar-inner">
      <span class="opt-iv-bar ${side}"><span class="opt-iv-bar-fill" style="${fillStyle}"></span></span>
      <span class="opt-iv-bar-val">${val}%</span>
    </span>
  </td>`;
}

function fmtStrike(s) {
  return String(s).replace(/(\d)(\d{3})$/, '$1.$2');
}

function headerThs(cols, side) {
  return cols.map((c, idx) => {
    const isFirstPut = side === 'put' && idx === 0 && c.type === 'ivbar';
    const stickyCls = isFirstPut ? ' opt-th-iv-sticky' : '';
    return `<th class="opt-th-col${stickyCls}" data-col="${c.key}" data-side="${side}" style="min-width:${c.w}px;width:${c.w}px">${c.label}<span class="opt-sort-arrow">▼</span></th>`;
  }).join('');
}

function rowTds(strike, cols, side) {
  return cols.map((c, idx) => renderCell(strike, c, side, side === 'put' && idx === 0 && c.type === 'ivbar')).join('');
}

// Symbol banner row — the active strike row replaces the standard tr with a
// horizontal pill containing the symbol name + price + change.
function symbolRow(totalCols) {
  const upDown = SYMBOL_CHG >= 0 ? '+' : '−';
  const cls = SYMBOL_CHG >= 0 ? '' : ' down';
  return `
    <tr class="opt-symbol-row">
      <td colspan="${totalCols}">
        <div class="opt-symbol-pill-wrap">
          <span class="opt-symbol-pill">
            <span class="opt-live-dot" title="Datos en tiempo real"></span>
            <span class="opt-live-label">LIVE</span>
            <span class="opt-symbol-icon">S&amp;P</span>
            <span class="opt-symbol-name">ESM2026</span>
            <span class="opt-symbol-price">${fmtN(SYMBOL_PRICE, 2)}</span>
            <span class="opt-symbol-ccy">USD</span>
            <span class="opt-symbol-chg${cls}">${upDown}${fmtN(Math.abs(SYMBOL_CHG), 2)}</span>
            <span class="opt-symbol-chg-pct${cls}">${upDown}${fmtN(Math.abs(SYMBOL_CHG_PCT), 2)}%</span>
          </span>
        </div>
      </td>
    </tr>
  `;
}

function dataRow(strike, isActive) {
  return `
    <tr class="${isActive ? 'opt-row-active' : ''}">
      ${rowTds(strike, CALL_COLS, 'call')}
      <td class="opt-td-strike">${fmtStrike(strike)}</td>
      ${rowTds(strike, PUT_COLS, 'put')}
    </tr>
  `;
}

function activeExpiryRows() {
  const totalCols = CALL_COLS.length + 1 + PUT_COLS.length;
  let html = '';
  // First, rows above and including ACTIVE_STRIKE
  let symbolInjected = false;
  for (let i = 0; i < STRIKES.length; i++) {
    const s = STRIKES[i];
    const isActive = s === ACTIVE_STRIKE;
    html += dataRow(s, isActive);
    if (isActive && !symbolInjected) {
      html += symbolRow(totalCols);
      symbolInjected = true;
    }
  }
  return html;
}

// ============================================================================
//  Accordion expiries (Component 11/12) — collapsed below the open table.
//  Tag pattern: red "<n>DTE" pill + grey series-code pill ("E4B", "E4C", …).
// ============================================================================
const ACCORDION_EXPIRIES = [
  { date: '27 de mayo',  dte: '1',  series: 'E4C' },
  { date: '28 de mayo',  dte: '2',  series: 'E4D' },
  { date: '29 de mayo',  dte: '3',  series: 'E4E' },
  { date: '1 de junio',  dte: '6',  series: 'E1A' },
  { date: '2 de junio',  dte: '7',  series: 'E1B' },
  { date: '3 de junio',  dte: '8',  series: 'E1C' },
  { date: '4 de junio',  dte: '9',  series: 'E1D' },
  { date: '5 de junio',  dte: '10', series: 'E1E' },
  { date: '8 de junio',  dte: '13', series: 'E2A' },
  { date: '9 de junio',  dte: '14', series: 'E2B' },
  { date: '10 de junio', dte: '15', series: 'E2C' },
  { date: '11 de junio', dte: '16', series: 'E2D' },
  { date: '12 de junio', dte: '17', series: 'E2E' },
  { date: '15 de junio', dte: '20', series: 'E3A' },
  { date: '16 de junio', dte: '21', series: 'E3B' },
  { date: '17 de junio', dte: '22', series: 'E3C' },
  { date: '18 de junio', dte: '23', series: 'E3D' },
  { date: '19 de junio', dte: '24', series: 'EOM' },
  { date: '22 de junio', dte: '27', series: 'E4A' },
  { date: '23 de junio', dte: '28', series: 'E4B' },
  { date: '24 de junio', dte: '29', series: 'E4C' },
  { date: '25 de junio', dte: '30', series: 'E4D' },
];

function accordionRow(e, i, open) {
  return `
    <div class="opt-acc-row ${open ? 'open' : ''}" data-acc="${i}">
      <span class="opt-acc-caret">▼</span>
      <span class="opt-acc-date">${e.date}</span>
      <span class="opt-acc-tag-dte"><span>${e.dte}</span><span>DTE</span></span>
      <span class="opt-acc-tag-series">${e.series}</span>
    </div>
  `;
}

// ============================================================================

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export function renderOptionsChainTab(mount /*, opts */) {
  injectStyle();

  const accordionHTML = ACCORDION_EXPIRIES.map((e, i) => accordionRow(e, i, false)).join('');

  // The "open" expiry header (26 de mayo / 0DTE / E4B) is rendered as a
  // separate sticky row immediately above the chain table.
  const openExpiryRow = `
    <div class="opt-acc-row open" data-acc="open">
      <span class="opt-acc-caret">▼</span>
      <span class="opt-acc-date">26 de mayo</span>
      <span class="opt-acc-tag-dte"><span>0</span><span>DTE</span></span>
      <span class="opt-acc-tag-series">E4B</span>
    </div>
  `;

  mount.innerHTML = `
    <div class="opt-chain-wrap">
      <div class="opt-chain-controls">
        <button class="opt-ctrl-pill" type="button">Próximos 30 días <span class="opt-ctrl-caret">▼</span></button>
        <button class="opt-ctrl-pill" type="button">±6 strikes <span class="opt-ctrl-caret">▼</span></button>
        <button class="opt-ctrl-pill" type="button">Spread <span class="opt-ctrl-caret">▼</span></button>
        <div class="opt-ctrl-spacer"></div>
        <button class="opt-ctrl-icon" type="button" title="Configuración" aria-label="Configuración">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.7 1 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </button>
      </div>

      <div class="opt-chain-side-labels">
        <span class="opt-side-calls">Calls</span>
        <span class="opt-side-puts">Puts</span>
      </div>

      ${openExpiryRow}

      <div class="opt-chain-scroll">
        <table class="opt-chain-table">
          <thead>
            <tr>
              ${headerThs(CALL_COLS, 'call')}
              <th class="opt-th-strike">
                <span class="opt-th-strike-inner">
                  <span class="opt-th-strike-caret">▼</span>
                  <span>Strike</span>
                </span>
              </th>
              ${headerThs(PUT_COLS, 'put')}
            </tr>
          </thead>
          <tbody>
            ${activeExpiryRows()}
          </tbody>
        </table>
      </div>

      <div class="opt-accordion-list">
        ${accordionHTML}
      </div>
    </div>
  `;

  // Accordion toggle with smooth max-height transition.
  const list = mount.querySelector('.opt-accordion-list');
  list.addEventListener('click', (ev) => {
    const row = ev.target.closest('.opt-acc-row');
    if (!row) return;
    const isOpen = row.classList.toggle('open');
    let next = row.nextElementSibling;
    if (isOpen) {
      if (!next || !next.classList.contains('opt-acc-body')) {
        const body = document.createElement('div');
        body.className = 'opt-acc-body';
        body.textContent = 'Cargando strikes para este vencimiento…';
        row.after(body);
        next = body;
      }
      // Force reflow so the transition runs from max-height:0.
      requestAnimationFrame(() => next.classList.add('open'));
    } else if (next && next.classList.contains('opt-acc-body')) {
      next.classList.remove('open');
      const node = next;
      setTimeout(() => { if (node && !node.classList.contains('open')) node.remove(); }, 280);
    }
  });

  // Row click → toggle is-selected on the strike row (mock only).
  const tbody = mount.querySelector('.opt-chain-table tbody');
  tbody.addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr');
    if (!tr || tr.classList.contains('opt-symbol-row')) return;
    const wasSelected = tr.classList.contains('opt-row-selected');
    tbody.querySelectorAll('tr.opt-row-selected').forEach(r => r.classList.remove('opt-row-selected'));
    if (!wasSelected) tr.classList.add('opt-row-selected');
  });

  // Header click → simulate sort (visual rearrange of data rows by data-val).
  const table = mount.querySelector('.opt-chain-table');
  const thead = table.querySelector('thead');
  let sortState = { col: null, side: null, dir: 1 };
  thead.addEventListener('click', (ev) => {
    const th = ev.target.closest('th.opt-th-col');
    if (!th) return;
    const col = th.dataset.col;
    const side = th.dataset.side;
    if (sortState.col === col && sortState.side === side) {
      sortState.dir = -sortState.dir;
    } else {
      sortState = { col, side, dir: 1 };
    }
    thead.querySelectorAll('th.opt-sorted').forEach(e => e.classList.remove('opt-sorted'));
    th.classList.add('opt-sorted');
    th.querySelector('.opt-sort-arrow').textContent = sortState.dir > 0 ? '▲' : '▼';

    // Collect data rows (skip symbol-row), sort by parsed cell value, reinsert.
    const tb = table.querySelector('tbody');
    const symRow = tb.querySelector('.opt-symbol-row');
    const dataRows = Array.from(tb.querySelectorAll('tr')).filter(r => !r.classList.contains('opt-symbol-row'));
    dataRows.sort((a, b) => {
      const ca = a.querySelector(`td[data-col="${col}"][data-side="${side}"]`);
      const cb = b.querySelector(`td[data-col="${col}"][data-side="${side}"]`);
      const va = parseFloat(ca && ca.dataset.val) || 0;
      const vb = parseFloat(cb && cb.dataset.val) || 0;
      return (va - vb) * sortState.dir;
    });
    // Re-append in sorted order; symbol row goes back after the originally active strike.
    const frag = document.createDocumentFragment();
    let symbolInserted = false;
    for (const r of dataRows) {
      frag.appendChild(r);
      if (!symbolInserted && r.classList.contains('opt-row-active') && symRow) {
        frag.appendChild(symRow);
        symbolInserted = true;
      }
    }
    if (!symbolInserted && symRow) frag.appendChild(symRow);
    tb.innerHTML = '';
    tb.appendChild(frag);
  });

  return {
    destroy() { mount.innerHTML = ''; }
  };
}
