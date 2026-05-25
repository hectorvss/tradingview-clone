// trading-calculators.js — Bundle of 6 standard trading calculators
//
// Public API:
//   createCalculatorsPanel(container, opts = {})
//     opts:
//       activeCalc:    initial calc id (default 'position')
//       onSave(entry): optional callback when user saves a calculation
//     returns: { render(activeCalc?), setActive(calcId), destroy() }
//
// All calculators:
//   - Form on the left, results on the right (large numbers + small text)
//   - Auto-update on input change + manual "Calcular" button
//   - "Guardar cálculo" persists to localStorage key 'tv.calc_history' (last 20)
//   - "Resetear" clears the form back to defaults
//
// Dark theme matching TradingView. CSS is injected exactly once per page.

import { createChart, AreaSeries } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HISTORY_KEY = 'tv.calc_history';
const HISTORY_MAX = 20;

const CALCS = [
  { id: 'position', label: 'Tamaño de posición',     icon: 'P' },
  { id: 'rr',       label: 'Riesgo / Recompensa',    icon: 'R' },
  { id: 'pnl',      label: 'Beneficio / Pérdida',    icon: '$' },
  { id: 'margin',   label: 'Margen y apalancamiento',icon: 'L' },
  { id: 'fx',       label: 'Conversor de divisas',   icon: 'F' },
  { id: 'compound', label: 'Interés compuesto',      icon: 'C' },
];

// Synthetic FX rates relative to USD (1 USD = rate * X). Stable, deterministic.
const FX_RATES_VS_USD = {
  USD: 1,        EUR: 0.9234,   GBP: 0.7912,   JPY: 156.42,  CHF: 0.8821,
  CAD: 1.3654,   AUD: 1.5123,   NZD: 1.6489,   CNY: 7.2456,  HKD: 7.8123,
  SGD: 1.3421,   SEK: 10.456,   NOK: 10.823,   DKK: 6.8745,  MXN: 17.834,
  BRL: 5.1234,   INR: 83.456,   KRW: 1342.5,   TRY: 32.145,  ZAR: 18.567,
};
const FX_CODES = Object.keys(FX_RATES_VS_USD);

// ---------------------------------------------------------------------------
// One-time CSS injection
// ---------------------------------------------------------------------------

let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const css = `
.tcalc-root {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: var(--grey-6, #0f0f0f);
  color: #d1d4dc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  box-sizing: border-box;
  overflow: hidden;
}
.tcalc-sidebar {
  width: 220px;
  flex: 0 0 220px;
  background: #131722;
  border-right: 1px solid #1e222d;
  padding: 12px 0;
  overflow-y: auto;
}
.tcalc-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 4px 16px 10px;
  margin: 0;
}
.tcalc-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: 0;
  border-left: 3px solid transparent;
  color: #b2b5be;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 80ms ease, color 80ms ease;
  font-family: inherit;
}
.tcalc-tab:hover { background: #1e222d; color: #fff; }
.tcalc-tab.is-active {
  background: #1e222d;
  color: #fff;
  border-left-color: #2962ff;
}
.tcalc-tab-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #2a2e39;
  color: #d1d4dc;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}
.tcalc-tab.is-active .tcalc-tab-icon { background: #2962ff; color: #fff; }

.tcalc-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.tcalc-header {
  padding: 14px 20px;
  border-bottom: 1px solid #1e222d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #131722;
}
.tcalc-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}
.tcalc-header-sub {
  font-size: 12px;
  color: #787b86;
}

.tcalc-body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 20px;
  padding: 20px;
  overflow: auto;
  align-content: start;
}
@media (max-width: 720px) {
  .tcalc-body { grid-template-columns: 1fr; }
}

.tcalc-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tcalc-field { display: flex; flex-direction: column; gap: 4px; }
.tcalc-field label {
  font-size: 11px;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 500;
}
.tcalc-field input,
.tcalc-field select {
  background: #1e222d;
  border: 1px solid #2a2e39;
  color: #d1d4dc;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color 80ms ease;
}
.tcalc-field input:focus,
.tcalc-field select:focus { border-color: #2962ff; }
.tcalc-field input[type=range] {
  padding: 0;
  height: 4px;
  background: #2a2e39;
  border: 0;
  -webkit-appearance: none;
  appearance: none;
}
.tcalc-field input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  background: #2962ff;
  border-radius: 50%;
  cursor: pointer;
}
.tcalc-field input[type=range]::-moz-range-thumb {
  width: 14px; height: 14px;
  background: #2962ff;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.tcalc-field-row { display: flex; gap: 8px; align-items: center; }
.tcalc-field-row > * { flex: 1; }
.tcalc-hint { font-size: 11px; color: #5d6066; }

.tcalc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.tcalc-btn {
  background: #2962ff;
  color: #fff;
  border: 0;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 80ms ease;
}
.tcalc-btn:hover { background: #1e53e5; }
.tcalc-btn.secondary { background: #2a2e39; color: #d1d4dc; }
.tcalc-btn.secondary:hover { background: #363a45; }
.tcalc-btn.ghost { background: transparent; color: #787b86; }
.tcalc-btn.ghost:hover { color: #fff; }

.tcalc-results {
  background: #131722;
  border: 1px solid #1e222d;
  border-radius: 6px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.tcalc-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.tcalc-stat {
  background: #1e222d;
  padding: 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.tcalc-stat-label {
  font-size: 10px;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.tcalc-stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tcalc-stat-value.pos { color: #26a69a; }
.tcalc-stat-value.neg { color: #ef5350; }
.tcalc-stat-sub {
  font-size: 11px;
  color: #787b86;
}

.tcalc-bar {
  display: flex;
  height: 18px;
  border-radius: 3px;
  overflow: hidden;
  background: #1e222d;
}
.tcalc-bar-risk { background: #ef5350; }
.tcalc-bar-reward { background: #26a69a; }
.tcalc-bar-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  font-weight: 600;
}

.tcalc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.tcalc-table th, .tcalc-table td {
  padding: 6px 8px;
  text-align: right;
  border-bottom: 1px solid #1e222d;
}
.tcalc-table th {
  color: #787b86;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.4px;
}
.tcalc-table td:first-child, .tcalc-table th:first-child { text-align: left; }
.tcalc-table-wrap {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #1e222d;
  border-radius: 4px;
}

.tcalc-chart {
  width: 100%;
  height: 220px;
  background: #0f0f0f;
  border: 1px solid #1e222d;
  border-radius: 4px;
}

.tcalc-section-title {
  font-size: 11px;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin: 4px 0 -4px;
}

.tcalc-toast {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: #2962ff;
  color: #fff;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
}
.tcalc-toast.show { opacity: 1; transform: translateY(0); }
`;

  const style = document.createElement('style');
  style.setAttribute('data-tcalc', '1');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v === false || v == null) { /* skip */ }
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function fmtMoney(v, cur = '$', digits = 2) {
  if (!Number.isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return sign + cur + abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtPct(v, digits = 2) {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(digits) + '%';
}
function fmtNum(v, digits = 4) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function field(label, inputAttrs, hint) {
  const input = el('input', { type: 'number', step: 'any', ...inputAttrs });
  const wrap = el('div', { class: 'tcalc-field' }, [
    el('label', {}, label),
    input,
    hint ? el('div', { class: 'tcalc-hint' }, hint) : null,
  ]);
  return { wrap, input };
}
function selectField(label, options, value) {
  const select = el('select', {});
  for (const opt of options) {
    const o = el('option', { value: opt }, opt);
    if (opt === value) o.setAttribute('selected', '');
    select.appendChild(o);
  }
  const wrap = el('div', { class: 'tcalc-field' }, [el('label', {}, label), select]);
  return { wrap, input: select };
}
function statBox(label, value, sub, cls = '') {
  return el('div', { class: 'tcalc-stat' }, [
    el('div', { class: 'tcalc-stat-label' }, label),
    el('div', { class: 'tcalc-stat-value ' + cls }, value),
    sub ? el('div', { class: 'tcalc-stat-sub' }, sub) : null,
  ]);
}

// ---------------------------------------------------------------------------
// History storage
// ---------------------------------------------------------------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveHistoryEntry(entry) {
  const list = loadHistory();
  list.unshift({ ts: Date.now(), ...entry });
  while (list.length > HISTORY_MAX) list.pop();
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* quota */ }
  return list;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createCalculatorsPanel(container, opts = {}) {
  if (!container) throw new Error('createCalculatorsPanel: container required');
  ensureStyles();

  const state = {
    active: opts.activeCalc || 'position',
    cleanup: [], // disposers per active calc
    root: null,
    sidebar: null,
    mainArea: null,
    bodyArea: null,
    headerTitle: null,
    headerSub: null,
    toast: null,
  };

  function showToast(msg) {
    if (!state.toast) return;
    state.toast.textContent = msg;
    state.toast.classList.add('show');
    setTimeout(() => state.toast && state.toast.classList.remove('show'), 1400);
  }

  function disposeActive() {
    for (const fn of state.cleanup) {
      try { fn(); } catch { /* ignore */ }
    }
    state.cleanup = [];
    if (state.bodyArea) state.bodyArea.innerHTML = '';
  }

  function renderShell() {
    container.innerHTML = '';
    state.root = el('div', { class: 'tcalc-root' });

    // Sidebar
    state.sidebar = el('div', { class: 'tcalc-sidebar' }, [
      el('div', { class: 'tcalc-sidebar-title' }, 'Calculadoras'),
    ]);
    for (const c of CALCS) {
      const btn = el('button', {
        class: 'tcalc-tab' + (c.id === state.active ? ' is-active' : ''),
        'data-id': c.id,
        type: 'button',
        onclick: () => setActive(c.id),
      }, [
        el('span', { class: 'tcalc-tab-icon' }, c.icon),
        el('span', {}, c.label),
      ]);
      state.sidebar.appendChild(btn);
    }

    // Header + body
    state.headerTitle = el('h2', {}, '');
    state.headerSub = el('div', { class: 'tcalc-header-sub' }, '');
    const header = el('div', { class: 'tcalc-header' }, [
      el('div', {}, [state.headerTitle, state.headerSub]),
    ]);
    state.bodyArea = el('div', { class: 'tcalc-body' });
    state.toast = el('div', { class: 'tcalc-toast' }, '');
    state.mainArea = el('div', { class: 'tcalc-main', style: { position: 'relative' } }, [
      header, state.bodyArea, state.toast,
    ]);

    state.root.appendChild(state.sidebar);
    state.root.appendChild(state.mainArea);
    container.appendChild(state.root);
  }

  function updateActiveTab() {
    if (!state.sidebar) return;
    for (const btn of state.sidebar.querySelectorAll('.tcalc-tab')) {
      btn.classList.toggle('is-active', btn.getAttribute('data-id') === state.active);
    }
  }

  function renderActive() {
    disposeActive();
    const def = CALCS.find(c => c.id === state.active) || CALCS[0];
    state.headerTitle.textContent = def.label;
    state.headerSub.textContent = subtitleFor(def.id);

    const ctx = {
      body: state.bodyArea,
      register: (fn) => state.cleanup.push(fn),
      save: (entry) => {
        const list = saveHistoryEntry({ calc: state.active, ...entry });
        showToast('Cálculo guardado');
        if (typeof opts.onSave === 'function') {
          try { opts.onSave({ calc: state.active, ...entry, total: list.length }); } catch { /* ignore */ }
        }
      },
    };

    switch (state.active) {
      case 'position': renderPosition(ctx); break;
      case 'rr':       renderRR(ctx); break;
      case 'pnl':      renderPnL(ctx); break;
      case 'margin':   renderMargin(ctx); break;
      case 'fx':       renderFx(ctx); break;
      case 'compound': renderCompound(ctx); break;
      default:         renderPosition(ctx);
    }
  }

  function setActive(id) {
    if (!CALCS.some(c => c.id === id)) return;
    state.active = id;
    updateActiveTab();
    renderActive();
  }

  function render(activeCalc) {
    if (activeCalc) state.active = activeCalc;
    renderShell();
    renderActive();
  }

  function destroy() {
    disposeActive();
    if (container) container.innerHTML = '';
    state.root = state.sidebar = state.mainArea = state.bodyArea = null;
    state.headerTitle = state.headerSub = state.toast = null;
  }

  // initial render
  render();

  return { render, setActive, destroy };
}

function subtitleFor(id) {
  switch (id) {
    case 'position': return 'Calcula el tamaño óptimo según tu riesgo por operación.';
    case 'rr':       return 'Ratio riesgo / recompensa y distancias al stop y objetivo.';
    case 'pnl':      return 'Beneficio neto, porcentaje y retorno anualizado.';
    case 'margin':   return 'Margen requerido y precio de liquidación.';
    case 'fx':       return 'Conversión entre divisas con tasas sintéticas.';
    case 'compound': return 'Crecimiento del capital con aportaciones periódicas.';
    default:         return '';
  }
}

// ---------------------------------------------------------------------------
// 1) Tamaño de posición
// ---------------------------------------------------------------------------

function renderPosition(ctx) {
  const account = field('Cuenta ($)',      { value: 10000, min: 0 });
  const risk    = field('Riesgo (%)',      { value: 1, min: 0, max: 100, step: 0.1 });
  const entry   = field('Precio de entrada', { value: 100, min: 0 });
  const stop    = field('Stop loss',       { value: 95, min: 0 });

  const out = el('div', { class: 'tcalc-results-grid' });
  const note = el('div', { class: 'tcalc-stat-sub' }, '');

  const form = buildForm([account, risk, entry, stop],
    () => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: snapshot({ account: account.input, risk: risk.input, entry: entry.input, stop: stop.input }),
      outputs: lastOutputs,
    }));

  let lastOutputs = {};
  function doCalc() {
    const a = num(account.input.value);
    const r = num(risk.input.value);
    const e = num(entry.input.value);
    const s = num(stop.input.value);
    const riskMoney = a * r / 100;
    const diff = Math.abs(e - s);
    const shares = diff > 0 ? riskMoney / diff : 0;
    const posSize = shares * e;
    lastOutputs = { riskMoney, shares, posSize, diff };

    out.innerHTML = '';
    out.appendChild(statBox('Acciones / Contratos', fmtNum(shares, 4), 'Tamaño calculado'));
    out.appendChild(statBox('Riesgo en $', fmtMoney(riskMoney), `${fmtPct(r)} de la cuenta`));
    out.appendChild(statBox('Tamaño posición', fmtMoney(posSize), 'Valor nocional'));
    note.textContent = diff > 0
      ? `Distancia al stop: ${fmtMoney(diff)} por unidad.`
      : 'Define un stop distinto al precio de entrada.';
  }
  function doReset() {
    account.input.value = 10000; risk.input.value = 1;
    entry.input.value = 100; stop.input.value = 95;
    doCalc();
  }
  attachAuto([account.input, risk.input, entry.input, stop.input], doCalc);

  layout(ctx, form, [
    el('div', { class: 'tcalc-section-title' }, 'Resultados'),
    out, note,
  ]);
  doCalc();
}

// ---------------------------------------------------------------------------
// 2) Riesgo / Recompensa
// ---------------------------------------------------------------------------

function renderRR(ctx) {
  const entry = field('Entrada', { value: 100 });
  const stop  = field('Stop',    { value: 95 });
  const tp    = field('Take profit', { value: 115 });

  const out = el('div', { class: 'tcalc-results-grid' });
  const bar = el('div', { class: 'tcalc-bar' });
  const barLegend = el('div', { class: 'tcalc-stat-sub' }, '');

  let lastOutputs = {};
  const form = buildForm([entry, stop, tp],
    () => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: snapshot({ entry: entry.input, stop: stop.input, tp: tp.input }),
      outputs: lastOutputs,
    }));

  function doCalc() {
    const e = num(entry.input.value);
    const s = num(stop.input.value);
    const t = num(tp.input.value);
    const riskDist = Math.abs(e - s);
    const rewardDist = Math.abs(t - e);
    const rr = riskDist > 0 ? rewardDist / riskDist : 0;
    const pctStop   = e > 0 ? (riskDist / e) * 100 : 0;
    const pctTarget = e > 0 ? (rewardDist / e) * 100 : 0;
    lastOutputs = { rr, pctStop, pctTarget, riskDist, rewardDist };

    out.innerHTML = '';
    out.appendChild(statBox('R : R', `1 : ${fmtNum(rr, 2)}`, 'Ratio riesgo/beneficio'));
    out.appendChild(statBox('Distancia al stop', fmtPct(pctStop), fmtMoney(riskDist) + ' / ud.'));
    out.appendChild(statBox('Distancia al TP', fmtPct(pctTarget), fmtMoney(rewardDist) + ' / ud.'));

    const total = riskDist + rewardDist;
    const riskPctBar   = total > 0 ? (riskDist   / total) * 100 : 50;
    const rewardPctBar = total > 0 ? (rewardDist / total) * 100 : 50;
    bar.innerHTML = '';
    bar.appendChild(el('div', { class: 'tcalc-bar-seg tcalc-bar-risk',   style: { width: riskPctBar + '%' } },
                       riskPctBar > 12 ? 'Riesgo' : ''));
    bar.appendChild(el('div', { class: 'tcalc-bar-seg tcalc-bar-reward', style: { width: rewardPctBar + '%' } },
                       rewardPctBar > 12 ? 'Beneficio' : ''));
    barLegend.textContent = rr >= 2
      ? 'Ratio favorable (≥ 1:2).'
      : rr >= 1 ? 'Ratio aceptable.' : 'Ratio desfavorable (< 1:1).';
  }
  function doReset() {
    entry.input.value = 100; stop.input.value = 95; tp.input.value = 115;
    doCalc();
  }
  attachAuto([entry.input, stop.input, tp.input], doCalc);

  layout(ctx, form, [
    el('div', { class: 'tcalc-section-title' }, 'Resultados'), out,
    el('div', { class: 'tcalc-section-title' }, 'Riesgo vs beneficio'),
    bar, barLegend,
  ]);
  doCalc();
}

// ---------------------------------------------------------------------------
// 3) Beneficio / Pérdida
// ---------------------------------------------------------------------------

function renderPnL(ctx) {
  const qty   = field('Cantidad',         { value: 100, min: 0 });
  const buy   = field('Precio de entrada',{ value: 100, min: 0 });
  const sell  = field('Precio de salida', { value: 110, min: 0 });
  const fee   = field('Comisión (%)',     { value: 0.1, min: 0, step: 0.01 });
  const days  = field('Periodo (días)',   { value: 30,  min: 1 });

  const out = el('div', { class: 'tcalc-results-grid' });

  let lastOutputs = {};
  const form = buildForm([qty, buy, sell, fee, days],
    () => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: snapshot({ qty: qty.input, buy: buy.input, sell: sell.input, fee: fee.input, days: days.input }),
      outputs: lastOutputs,
    }));

  function doCalc() {
    const q  = num(qty.input.value);
    const pb = num(buy.input.value);
    const ps = num(sell.input.value);
    const f  = num(fee.input.value);
    const d  = Math.max(1, num(days.input.value, 1));
    const gross = q * (ps - pb);
    const fees  = (q * pb + q * ps) * (f / 100);
    const net   = gross - fees;
    const cost  = q * pb;
    const pnlPct = cost > 0 ? (net / cost) * 100 : 0;
    const years = d / 365;
    const roiAnnual = (cost > 0 && years > 0)
      ? (Math.pow(1 + net / cost, 1 / years) - 1) * 100
      : 0;
    lastOutputs = { gross, fees, net, pnlPct, roiAnnual };

    const cls = net >= 0 ? 'pos' : 'neg';
    out.innerHTML = '';
    out.appendChild(statBox('P&L neto', fmtMoney(net), `Bruto ${fmtMoney(gross)} − Comisiones ${fmtMoney(fees)}`, cls));
    out.appendChild(statBox('P&L %', fmtPct(pnlPct), 'Sobre el coste inicial', cls));
    out.appendChild(statBox('ROI anualizado', fmtPct(roiAnnual), `${fmtNum(d, 0)} días`, roiAnnual >= 0 ? 'pos' : 'neg'));
  }
  function doReset() {
    qty.input.value = 100; buy.input.value = 100; sell.input.value = 110;
    fee.input.value = 0.1; days.input.value = 30;
    doCalc();
  }
  attachAuto([qty.input, buy.input, sell.input, fee.input, days.input], doCalc);

  layout(ctx, form, [el('div', { class: 'tcalc-section-title' }, 'Resultados'), out]);
  doCalc();
}

// ---------------------------------------------------------------------------
// 4) Margen y apalancamiento
// ---------------------------------------------------------------------------

function renderMargin(ctx) {
  const size = field('Tamaño de posición ($)', { value: 10000, min: 0 });
  const entry = field('Precio de entrada',      { value: 100,   min: 0 });

  // leverage slider + readout
  const lev = el('input', { type: 'range', min: 1, max: 100, step: 1, value: 10 });
  const levVal = el('span', {}, '10x');
  const levWrap = el('div', { class: 'tcalc-field' }, [
    el('label', {}, 'Apalancamiento'),
    el('div', { class: 'tcalc-field-row' }, [lev, levVal]),
    el('div', { class: 'tcalc-hint' }, '1x — 100x'),
  ]);
  lev.addEventListener('input', () => { levVal.textContent = lev.value + 'x'; doCalc(); });

  const out = el('div', { class: 'tcalc-results-grid' });

  let lastOutputs = {};
  const formFields = [size, entry];
  const formNode = el('div', { class: 'tcalc-form' });
  for (const f of formFields) formNode.appendChild(f.wrap);
  formNode.appendChild(levWrap);
  const actions = makeActions(() => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: { size: num(size.input.value), entry: num(entry.input.value), leverage: num(lev.value) },
      outputs: lastOutputs,
    }));
  formNode.appendChild(actions);

  function doCalc() {
    const s = num(size.input.value);
    const e = num(entry.input.value);
    const l = Math.max(1, num(lev.value, 1));
    const initial = s / l;
    const maintenance = initial * 0.5; // synthetic 50% of initial
    const liqLong  = e * (1 - 1 / l + 0.005);   // includes maintenance buffer
    const liqShort = e * (1 + 1 / l - 0.005);
    lastOutputs = { initial, maintenance, liqLong, liqShort, leverage: l };

    out.innerHTML = '';
    out.appendChild(statBox('Margen requerido', fmtMoney(initial), `Apalancamiento ${l}x`));
    out.appendChild(statBox('Margen mantenimiento', fmtMoney(maintenance), '50% del margen inicial'));
    out.appendChild(statBox('Liquidación (LONG)', fmtMoney(liqLong), `Desde ${fmtMoney(e)}`, 'neg'));
    out.appendChild(statBox('Liquidación (SHORT)', fmtMoney(liqShort), `Desde ${fmtMoney(e)}`, 'neg'));
  }
  function doReset() {
    size.input.value = 10000; entry.input.value = 100; lev.value = 10; levVal.textContent = '10x';
    doCalc();
  }
  attachAuto([size.input, entry.input], doCalc);

  layout(ctx, formNode, [el('div', { class: 'tcalc-section-title' }, 'Resultados'), out]);
  doCalc();
}

// ---------------------------------------------------------------------------
// 5) Conversor de divisas
// ---------------------------------------------------------------------------

function renderFx(ctx) {
  const amount = field('Cantidad', { value: 1000, min: 0 });
  const from = selectField('De', FX_CODES, 'USD');
  const to   = selectField('A',  FX_CODES, 'EUR');

  const swapBtn = el('button', { class: 'tcalc-btn ghost', type: 'button' }, 'Invertir ⇄');
  const rowSwap = el('div', { class: 'tcalc-field-row' }, [from.wrap, to.wrap]);

  const out = el('div', { class: 'tcalc-results-grid' });
  const rateLine = el('div', { class: 'tcalc-stat-sub' }, '');

  let lastOutputs = {};
  const formNode = el('div', { class: 'tcalc-form' });
  formNode.appendChild(amount.wrap);
  formNode.appendChild(rowSwap);
  formNode.appendChild(swapBtn);
  const actions = makeActions(() => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: { amount: num(amount.input.value), from: from.input.value, to: to.input.value },
      outputs: lastOutputs,
    }));
  formNode.appendChild(actions);

  swapBtn.addEventListener('click', () => {
    const a = from.input.value; from.input.value = to.input.value; to.input.value = a;
    doCalc();
  });

  function doCalc() {
    const a = num(amount.input.value);
    const f = from.input.value;
    const t = to.input.value;
    const rateF = FX_RATES_VS_USD[f];
    const rateT = FX_RATES_VS_USD[t];
    const rate = rateT / rateF;
    const converted = a * rate;
    const inverse = 1 / rate;
    lastOutputs = { amount: a, from: f, to: t, rate, converted };

    out.innerHTML = '';
    out.appendChild(statBox(`${a.toLocaleString('en-US')} ${f} →`, fmtNum(converted, 4) + ' ' + t, 'Resultado de la conversión'));
    out.appendChild(statBox('Tipo de cambio', `1 ${f} = ${fmtNum(rate, 6)} ${t}`, `1 ${t} = ${fmtNum(inverse, 6)} ${f}`));
    rateLine.textContent = 'Tasas sintéticas, no aptas para operaciones reales.';
  }
  function doReset() {
    amount.input.value = 1000; from.input.value = 'USD'; to.input.value = 'EUR';
    doCalc();
  }
  attachAuto([amount.input, from.input, to.input], doCalc);

  layout(ctx, formNode, [
    el('div', { class: 'tcalc-section-title' }, 'Resultados'),
    out, rateLine,
  ]);
  doCalc();
}

// ---------------------------------------------------------------------------
// 6) Interés compuesto
// ---------------------------------------------------------------------------

function renderCompound(ctx) {
  const principal = field('Principal ($)',         { value: 10000, min: 0 });
  const monthly   = field('Aportación mensual ($)',{ value: 200,   min: 0 });
  const annualPct = field('Tasa anual (%)',        { value: 8,     step: 0.1 });
  const years     = field('Años',                  { value: 20,    min: 1, max: 100 });

  const out = el('div', { class: 'tcalc-results-grid' });
  const tableWrap = el('div', { class: 'tcalc-table-wrap' });
  const chartHost = el('div', { class: 'tcalc-chart' });

  let lastOutputs = {};
  let chart = null, series = null, ro = null;

  ctx.register(() => {
    try { if (ro) ro.disconnect(); } catch { /* ignore */ }
    try { if (chart) chart.remove(); } catch { /* ignore */ }
    chart = null; series = null; ro = null;
  });

  const form = buildForm([principal, monthly, annualPct, years],
    () => doCalc(), () => doReset(),
    () => ctx.save({
      inputs: snapshot({
        principal: principal.input, monthly: monthly.input,
        annualPct: annualPct.input, years: years.input,
      }),
      outputs: lastOutputs,
    }));

  function doCalc() {
    const p = num(principal.input.value);
    const m = num(monthly.input.value);
    const r = num(annualPct.input.value) / 100;
    const y = Math.max(1, Math.floor(num(years.input.value, 1)));
    const monthlyRate = r / 12;

    let balance = p;
    let contributed = p;
    const rows = [];
    const chartData = [];

    // Year 0 baseline
    chartData.push({ time: dateForYear(0), value: balance });

    for (let yr = 1; yr <= y; yr++) {
      const startBal = balance;
      for (let mo = 0; mo < 12; mo++) {
        balance = balance * (1 + monthlyRate) + m;
        contributed += m;
      }
      const interest = balance - startBal - m * 12;
      rows.push({
        year: yr,
        start: startBal,
        contributions: m * 12,
        interest,
        end: balance,
      });
      chartData.push({ time: dateForYear(yr), value: balance });
    }
    const totalInterest = balance - contributed;
    lastOutputs = { finalValue: balance, contributed, totalInterest, years: y };

    // Stats
    out.innerHTML = '';
    out.appendChild(statBox('Valor final', fmtMoney(balance), `Tras ${y} años`, 'pos'));
    out.appendChild(statBox('Total aportado', fmtMoney(contributed), 'Principal + aportaciones'));
    out.appendChild(statBox('Intereses', fmtMoney(totalInterest), `${fmtPct(contributed > 0 ? (totalInterest / contributed) * 100 : 0)} ganado`, 'pos'));

    // Table
    const table = el('table', { class: 'tcalc-table' });
    const thead = el('thead', {}, el('tr', {}, [
      el('th', {}, 'Año'),
      el('th', {}, 'Inicio'),
      el('th', {}, 'Aportes'),
      el('th', {}, 'Intereses'),
      el('th', {}, 'Final'),
    ]));
    const tbody = el('tbody');
    for (const row of rows) {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, String(row.year)),
        el('td', {}, fmtMoney(row.start)),
        el('td', {}, fmtMoney(row.contributions)),
        el('td', {}, fmtMoney(row.interest)),
        el('td', {}, fmtMoney(row.end)),
      ]));
    }
    table.appendChild(thead); table.appendChild(tbody);
    tableWrap.innerHTML = ''; tableWrap.appendChild(table);

    // Chart
    ensureChart();
    if (series) series.setData(chartData);
    if (chart) chart.timeScale().fitContent();
  }

  function ensureChart() {
    if (chart) return;
    try {
      chart = createChart(chartHost, {
        width: chartHost.clientWidth || 400,
        height: 220,
        layout: { background: { color: '#0f0f0f' }, textColor: '#787b86' },
        grid:   { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
        rightPriceScale: { borderColor: '#1e222d' },
        timeScale: { borderColor: '#1e222d' },
      });
      series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.05)',
        lineColor: '#2962ff',
        lineWidth: 2,
      });
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (chart && chartHost.clientWidth) {
            chart.applyOptions({ width: chartHost.clientWidth, height: 220 });
          }
        });
        ro.observe(chartHost);
      }
    } catch (err) {
      // lightweight-charts not available — degrade gracefully
      chartHost.textContent = 'Gráfico no disponible';
      chartHost.style.display = 'flex';
      chartHost.style.alignItems = 'center';
      chartHost.style.justifyContent = 'center';
      chartHost.style.color = '#5d6066';
      chartHost.style.fontSize = '12px';
    }
  }

  function doReset() {
    principal.input.value = 10000; monthly.input.value = 200;
    annualPct.input.value = 8; years.input.value = 20;
    doCalc();
  }
  attachAuto([principal.input, monthly.input, annualPct.input, years.input], doCalc);

  layout(ctx, form, [
    el('div', { class: 'tcalc-section-title' }, 'Resultados'),
    out,
    el('div', { class: 'tcalc-section-title' }, 'Crecimiento'),
    chartHost,
    el('div', { class: 'tcalc-section-title' }, 'Detalle anual'),
    tableWrap,
  ]);
  doCalc();
}

function dateForYear(offsetYears) {
  // Use yyyy-mm-dd (Jan 1) starting at 2000 for stable monotonic times.
  const yr = 2000 + offsetYears;
  return `${yr}-01-01`;
}

// ---------------------------------------------------------------------------
// Shared form / layout helpers (kept at bottom)
// ---------------------------------------------------------------------------

function attachAuto(inputs, fn) {
  for (const inp of inputs) {
    inp.addEventListener('input', fn);
    inp.addEventListener('change', fn);
  }
}

function makeActions(onCalc, onReset, onSave) {
  return el('div', { class: 'tcalc-actions' }, [
    el('button', { class: 'tcalc-btn', type: 'button', onclick: onCalc }, 'Calcular'),
    el('button', { class: 'tcalc-btn secondary', type: 'button', onclick: onSave }, 'Guardar cálculo'),
    el('button', { class: 'tcalc-btn ghost', type: 'button', onclick: onReset }, 'Resetear'),
  ]);
}

function buildForm(fields, onCalc, onReset, onSave) {
  const form = el('div', { class: 'tcalc-form' });
  for (const f of fields) form.appendChild(f.wrap);
  form.appendChild(makeActions(onCalc, onReset, onSave));
  return form;
}

function layout(ctx, formNode, resultsChildren) {
  const results = el('div', { class: 'tcalc-results' }, resultsChildren);
  ctx.body.appendChild(formNode);
  ctx.body.appendChild(results);
}

function snapshot(map) {
  const out = {};
  for (const [k, inp] of Object.entries(map)) out[k] = num(inp.value);
  return out;
}
