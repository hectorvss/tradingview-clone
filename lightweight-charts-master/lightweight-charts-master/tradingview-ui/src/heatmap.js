// heatmap.js — Grid & Monthly Returns heatmap renderers
// Two renderers:
//   renderGridHeatmap(container, opts)            — NxM matrix (e.g., correlations)
//   renderMonthlyReturnsHeatmap(container, opts)  — years x months returns
//
// Plus helpers:
//   computeCorrelationMatrix(seriesArray)
//   computeMonthlyReturns(candles)
//
// Uses inline CSS (injected once) and leverages existing CSS tokens
// from styles.css (--grey-6, --green-32, --red-58, etc.).

// ---------------------------------------------------------------------------
// One-time style injection
// ---------------------------------------------------------------------------
let _stylesInjected = false;

function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const css = `
.hm-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: var(--grey-6, #0f0f0f);
  padding: 12px;
  box-sizing: border-box;
  position: relative;
  overflow: auto;
}
.hm-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0 0 10px 0;
  letter-spacing: 0.2px;
}
.hm-table {
  border-collapse: separate;
  border-spacing: 2px;
  width: 100%;
  font-size: 11px;
  table-layout: fixed;
}
.hm-table th, .hm-table td {
  padding: 0;
  text-align: center;
  vertical-align: middle;
  font-weight: 500;
  border-radius: 2px;
  user-select: none;
}
.hm-table th {
  color: #787b86;
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 4px 2px;
  background: transparent;
}
.hm-table th.hm-row-label,
.hm-table td.hm-row-label {
  text-align: right;
  padding: 0 8px;
  color: #b2b5be;
  background: transparent;
  font-weight: 500;
  width: 56px;
}
.hm-cell {
  padding: 8px 4px;
  cursor: default;
  transition: outline 60ms ease;
  outline: 1px solid transparent;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0,0,0,0.35);
  font-variant-numeric: tabular-nums;
  min-width: 38px;
  height: 28px;
}
.hm-cell:hover {
  outline: 1px solid #d1d4dc;
  z-index: 2;
}
.hm-cell.hm-empty {
  background: rgba(255,255,255,0.02) !important;
  color: #555;
  cursor: default;
}
.hm-cell.hm-total {
  font-weight: 700;
  border-left: 2px solid #2a2e39;
}
.hm-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 10px;
  color: #787b86;
}
.hm-legend-bar {
  flex: 0 0 180px;
  height: 8px;
  border-radius: 2px;
}
.hm-tooltip {
  position: fixed;
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  border-radius: 4px;
  padding: 6px 9px;
  font-size: 11px;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  white-space: nowrap;
  line-height: 1.4;
}
.hm-tooltip .hm-tt-row { color: #787b86; }
.hm-tooltip .hm-tt-row b { color: #d1d4dc; font-weight: 600; }
.hm-tooltip .hm-tt-val  { color: #fff; font-weight: 700; font-size: 12px; }
.hm-tooltip .hm-tt-rank { color: #787b86; font-size: 10px; margin-top: 2px; }
`;
  const tag = document.createElement('style');
  tag.setAttribute('data-hm-styles', '1');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Color interpolation
// ---------------------------------------------------------------------------
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRGB(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}
function rgb(arr) { return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`; }

// Stops based on existing TV palette: red-58 (#f23645), green-32 (#089981)
const STOPS = {
  'red-white-green': [
    [0.0, [242,  54,  69]],   // red-58
    [0.5, [ 30,  34,  45]],   // neutral grey (matches panel bg)
    [1.0, [  8, 153, 129]],   // green-32
  ],
  'red-green': [
    [0.0, [242,  54,  69]],
    [0.5, [120,  90,  80]],
    [1.0, [  8, 153, 129]],
  ],
  'cool-warm': [
    [0.0, [ 59, 130, 246]],   // blue
    [0.5, [ 30,  34,  45]],
    [1.0, [249, 115,  22]],   // orange
  ],
  'sequential-green': [
    [0.0, [ 18,  30,  28]],
    [1.0, [  8, 200, 160]],
  ],
};

function colorAt(value, min, max, scheme = 'red-white-green') {
  if (value == null || Number.isNaN(value)) return 'rgba(255,255,255,0.02)';
  const stops = STOPS[scheme] || STOPS['red-white-green'];
  if (max === min) return rgb(stops[Math.floor(stops.length / 2)][1]);
  const t = clamp((value - min) / (max - min), 0, 1);
  // find bracketing stops
  for (let i = 0; i < stops.length - 1; i++) {
    const [t1, c1] = stops[i];
    const [t2, c2] = stops[i + 1];
    if (t >= t1 && t <= t2) {
      const local = (t - t1) / (t2 - t1);
      return rgb(lerpRGB(c1, c2, local));
    }
  }
  return rgb(stops[stops.length - 1][1]);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function formatValue(v, fmt) {
  if (v == null || Number.isNaN(v)) return '—';
  switch (fmt) {
    case 'pct':    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    case 'corr':   return v.toFixed(2);
    case 'number': return Number.isInteger(v) ? String(v) : v.toFixed(2);
    case 'int':    return String(Math.round(v));
    default:       return v.toFixed(2);
  }
}

function percentileRank(value, sortedArr) {
  if (!sortedArr.length || value == null || Number.isNaN(value)) return null;
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedArr[mid] < value) lo = mid + 1; else hi = mid;
  }
  return Math.round((lo / sortedArr.length) * 100);
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
function attachTooltip(root) {
  let tip = null;

  function show(e, html) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'hm-tooltip';
      document.body.appendChild(tip);
    }
    tip.innerHTML = html;
    move(e);
  }
  function move(e) {
    if (!tip) return;
    const pad = 12;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width  > window.innerWidth)  x = e.clientX - r.width  - pad;
    if (y + r.height > window.innerHeight) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }
  function hide() {
    if (tip) { tip.remove(); tip = null; }
  }

  root.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.hm-cell');
    if (!cell || cell.classList.contains('hm-empty')) { hide(); return; }
    const rowLabel = cell.dataset.row || '';
    const colLabel = cell.dataset.col || '';
    const value    = cell.dataset.value;
    const fmt      = cell.dataset.fmt || 'number';
    const rank     = cell.dataset.rank;
    const v = value === '' || value == null ? null : Number(value);
    const html =
      `<div class="hm-tt-row"><b>${escapeHtml(rowLabel)}</b>` +
        (colLabel ? ` <span style="color:#555">/</span> <b>${escapeHtml(colLabel)}</b>` : '') +
      `</div>` +
      `<div class="hm-tt-val">${formatValue(v, fmt)}</div>` +
      (rank != null && rank !== '' ? `<div class="hm-tt-rank">Percentil ${rank}</div>` : '');
    show(e, html);
  });
  root.addEventListener('mouseleave', hide);
  return { destroy: hide };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ---------------------------------------------------------------------------
// A. Grid heatmap (sector / correlation / arbitrary matrix)
// ---------------------------------------------------------------------------
export function renderGridHeatmap(container, opts = {}) {
  ensureStyles();
  if (!container) throw new Error('renderGridHeatmap: container required');

  const {
    rows = [],
    cols = [],
    values = [],
    format = 'number',
    colorScale = 'red-white-green',
    title = '',
    showLegend = true,
  } = opts;

  // Derive min/max if not provided
  const flat = [];
  for (const row of values) for (const v of row) {
    if (typeof v === 'number' && !Number.isNaN(v)) flat.push(v);
  }
  const dataMin = flat.length ? Math.min(...flat) : 0;
  const dataMax = flat.length ? Math.max(...flat) : 1;
  const min = opts.min != null ? opts.min : dataMin;
  const max = opts.max != null ? opts.max : dataMax;
  const sorted = flat.slice().sort((a, b) => a - b);

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'hm-root hm-grid';
  container.appendChild(root);

  if (title) {
    const h = document.createElement('div');
    h.className = 'hm-title';
    h.textContent = title;
    root.appendChild(h);
  }

  const table = document.createElement('table');
  table.className = 'hm-table';

  // header
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.appendChild(document.createElement('th')); // corner
  for (const c of cols) {
    const th = document.createElement('th');
    th.textContent = c;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  // body
  const tbody = document.createElement('tbody');
  for (let i = 0; i < rows.length; i++) {
    const tr = document.createElement('tr');
    const lbl = document.createElement('td');
    lbl.className = 'hm-row-label';
    lbl.textContent = rows[i];
    tr.appendChild(lbl);

    const rowVals = values[i] || [];
    for (let j = 0; j < cols.length; j++) {
      const v = rowVals[j];
      const td = document.createElement('td');
      td.className = 'hm-cell';
      if (v == null || Number.isNaN(v)) {
        td.classList.add('hm-empty');
        td.textContent = '';
      } else {
        td.style.background = colorAt(v, min, max, colorScale);
        td.textContent = formatValue(v, format);
        td.dataset.value = String(v);
        td.dataset.row = rows[i];
        td.dataset.col = cols[j];
        td.dataset.fmt = format;
        const pr = percentileRank(v, sorted);
        if (pr != null) td.dataset.rank = String(pr);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);

  if (showLegend) root.appendChild(buildLegend(min, max, colorScale, format));

  const tt = attachTooltip(root);
  return {
    destroy() { tt.destroy(); container.innerHTML = ''; },
  };
}

function buildLegend(min, max, scheme, fmt) {
  const wrap = document.createElement('div');
  wrap.className = 'hm-legend';

  const lo = document.createElement('span');
  lo.textContent = formatValue(min, fmt);

  const bar = document.createElement('div');
  bar.className = 'hm-legend-bar';
  // build gradient from scheme stops
  const stops = STOPS[scheme] || STOPS['red-white-green'];
  const grad = stops.map(([t, c]) => `${rgb(c)} ${Math.round(t * 100)}%`).join(', ');
  bar.style.background = `linear-gradient(to right, ${grad})`;

  const hi = document.createElement('span');
  hi.textContent = formatValue(max, fmt);

  wrap.appendChild(lo);
  wrap.appendChild(bar);
  wrap.appendChild(hi);
  return wrap;
}

// ---------------------------------------------------------------------------
// B. Monthly returns heatmap
// ---------------------------------------------------------------------------
const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_LBL  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function renderMonthlyReturnsHeatmap(container, opts = {}) {
  ensureStyles();
  if (!container) throw new Error('renderMonthlyReturnsHeatmap: container required');

  const {
    data = [],
    colorScale = 'red-white-green',
    title = 'Rentabilidad mensual',
    showLegend = true,
  } = opts;

  // collect monthly values for color scale
  const monthlyFlat = [];
  const totalFlat = [];
  for (const row of data) {
    for (const k of MONTH_KEYS) {
      const v = row[k];
      if (typeof v === 'number' && !Number.isNaN(v)) monthlyFlat.push(v);
    }
    if (typeof row.total === 'number' && !Number.isNaN(row.total)) totalFlat.push(row.total);
  }
  // symmetric scale around zero so red/green balance
  const absMax = monthlyFlat.length
    ? Math.max(...monthlyFlat.map(Math.abs))
    : 1;
  const min = -absMax;
  const max =  absMax;
  const totalAbsMax = totalFlat.length ? Math.max(...totalFlat.map(Math.abs)) : 1;
  const sortedMonths = monthlyFlat.slice().sort((a, b) => a - b);

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'hm-root hm-monthly';
  container.appendChild(root);

  if (title) {
    const h = document.createElement('div');
    h.className = 'hm-title';
    h.textContent = title;
    root.appendChild(h);
  }

  const table = document.createElement('table');
  table.className = 'hm-table';

  // header: Year | Ene..Dic | Total
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.className = 'hm-row-label';
  th0.textContent = 'Año';
  trh.appendChild(th0);
  for (const m of MONTH_LBL) {
    const th = document.createElement('th');
    th.textContent = m;
    trh.appendChild(th);
  }
  const thT = document.createElement('th');
  thT.textContent = 'Total';
  trh.appendChild(thT);
  thead.appendChild(trh);
  table.appendChild(thead);

  // body
  const tbody = document.createElement('tbody');
  // sort by year ascending
  const sorted = data.slice().sort((a, b) => (a.year || 0) - (b.year || 0));
  for (const row of sorted) {
    const tr = document.createElement('tr');
    const lbl = document.createElement('td');
    lbl.className = 'hm-row-label';
    lbl.textContent = row.year != null ? String(row.year) : '';
    tr.appendChild(lbl);

    for (let i = 0; i < MONTH_KEYS.length; i++) {
      const v = row[MONTH_KEYS[i]];
      const td = document.createElement('td');
      td.className = 'hm-cell';
      if (v == null || Number.isNaN(v)) {
        td.classList.add('hm-empty');
        td.textContent = '';
      } else {
        td.style.background = colorAt(v, min, max, colorScale);
        td.textContent = formatValue(v, 'pct');
        td.dataset.value = String(v);
        td.dataset.row = String(row.year);
        td.dataset.col = MONTH_LBL[i];
        td.dataset.fmt = 'pct';
        const pr = percentileRank(v, sortedMonths);
        if (pr != null) td.dataset.rank = String(pr);
      }
      tr.appendChild(td);
    }

    // total column
    const tot = row.total;
    const tdT = document.createElement('td');
    tdT.className = 'hm-cell hm-total';
    if (tot == null || Number.isNaN(tot)) {
      tdT.classList.add('hm-empty');
      tdT.textContent = '';
    } else {
      tdT.style.background = colorAt(tot, -totalAbsMax, totalAbsMax, colorScale);
      tdT.textContent = formatValue(tot, 'pct');
      tdT.dataset.value = String(tot);
      tdT.dataset.row = String(row.year);
      tdT.dataset.col = 'Total';
      tdT.dataset.fmt = 'pct';
    }
    tr.appendChild(tdT);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);

  if (showLegend) root.appendChild(buildLegend(min, max, colorScale, 'pct'));

  const tt = attachTooltip(root);
  return {
    destroy() { tt.destroy(); container.innerHTML = ''; },
  };
}

// ---------------------------------------------------------------------------
// Helpers: correlation matrix
// ---------------------------------------------------------------------------
/**
 * Compute Pearson correlation matrix from an array of series.
 * Accepts either:
 *   - [{ name, values: [number, ...] }, ...]
 *   - [{ name, candles: [{time, close}, ...] }, ...]  (uses log returns)
 *   - [[number, ...], [number, ...]]                  (raw arrays)
 *
 * Returns { rows, cols, values }.
 */
export function computeCorrelationMatrix(seriesArray) {
  if (!Array.isArray(seriesArray) || !seriesArray.length) {
    return { rows: [], cols: [], values: [] };
  }
  // normalize
  const series = seriesArray.map((s, i) => {
    if (Array.isArray(s)) return { name: `S${i+1}`, values: s.slice() };
    if (s && Array.isArray(s.values)) return { name: s.name || `S${i+1}`, values: s.values.slice() };
    if (s && Array.isArray(s.candles)) {
      const vals = [];
      const c = s.candles;
      for (let k = 1; k < c.length; k++) {
        const a = c[k-1].close, b = c[k].close;
        if (a > 0 && b > 0) vals.push(Math.log(b / a));
      }
      return { name: s.name || `S${i+1}`, values: vals };
    }
    return { name: `S${i+1}`, values: [] };
  });

  const n = series.length;
  // Align: use the shortest tail of each pair
  const rows = series.map(s => s.name);
  const cols = rows.slice();
  const values = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const a = series[i].values;
      const b = series[j].values;
      const len = Math.min(a.length, b.length);
      const aa = a.slice(a.length - len);
      const bb = b.slice(b.length - len);
      const r = i === j ? 1 : pearson(aa, bb);
      values[i][j] = r;
      values[j][i] = r;
    }
  }
  return { rows, cols, values };
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb;
    da  += xa * xa;
    db  += xb * xb;
  }
  const den = Math.sqrt(da * db);
  if (den === 0) return 0;
  return num / den;
}

// ---------------------------------------------------------------------------
// Helpers: monthly returns from candles
// ---------------------------------------------------------------------------
/**
 * Group OHLC candles by year/month and compute compounded monthly returns.
 * candles: [{ time: unixSeconds | {year,month,day} | 'YYYY-MM-DD', close: number }, ...]
 * Returns: [{ year, jan, feb, ..., dec, total }, ...] sorted by year asc.
 */
export function computeMonthlyReturns(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return [];

  // bucket by year-month: store first and last close in that month
  const buckets = new Map(); // key 'YYYY-MM' -> { year, month, first, last }
  const ordered = [];

  for (const c of candles) {
    const d = candleDate(c);
    if (!d) continue;
    const key = d.year + '-' + String(d.month).padStart(2, '0');
    let b = buckets.get(key);
    if (!b) {
      b = { year: d.year, month: d.month, first: c.close, last: c.close };
      buckets.set(key, b);
      ordered.push(b);
    } else {
      b.last = c.close;
    }
  }
  if (!ordered.length) return [];
  ordered.sort((a, b) => a.year - b.year || a.month - b.month);

  // Better: monthly return = (lastOfMonth / lastOfPrevMonth) - 1
  // Use last close of each month, and chain. For the very first month,
  // use first close of that month as prior anchor.
  const monthlyPct = []; // {year, month, ret}
  let prevClose = ordered[0].first;
  for (const b of ordered) {
    const ret = prevClose > 0 ? ((b.last / prevClose) - 1) * 100 : 0;
    monthlyPct.push({ year: b.year, month: b.month, ret });
    prevClose = b.last;
  }

  // assemble rows by year
  const byYear = new Map();
  for (const m of monthlyPct) {
    let row = byYear.get(m.year);
    if (!row) {
      row = { year: m.year };
      for (const k of MONTH_KEYS) row[k] = null;
      byYear.set(m.year, row);
    }
    row[MONTH_KEYS[m.month - 1]] = m.ret;
  }
  // compute total per year (compounded)
  const out = [];
  for (const row of byYear.values()) {
    let comp = 1;
    let any = false;
    for (const k of MONTH_KEYS) {
      const v = row[k];
      if (v != null && !Number.isNaN(v)) {
        comp *= (1 + v / 100);
        any = true;
      }
    }
    row.total = any ? (comp - 1) * 100 : null;
    out.push(row);
  }
  out.sort((a, b) => a.year - b.year);
  return out;
}

function candleDate(c) {
  if (!c) return null;
  const t = c.time;
  if (t == null) return null;
  if (typeof t === 'number') {
    const ms = t < 1e12 ? t * 1000 : t; // seconds vs ms
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }
  if (typeof t === 'string') {
    // 'YYYY-MM-DD' or ISO
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (m) return { year: +m[1], month: +m[2], day: +m[3] };
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }
    return null;
  }
  if (typeof t === 'object' && t.year && t.month) {
    return { year: t.year, month: t.month, day: t.day || 1 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Default export bundle
// ---------------------------------------------------------------------------
export default {
  renderGridHeatmap,
  renderMonthlyReturnsHeatmap,
  computeCorrelationMatrix,
  computeMonthlyReturns,
};
