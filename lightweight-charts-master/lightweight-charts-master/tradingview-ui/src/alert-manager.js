// alert-manager.js — TradingView-style Alert Manager side panel
// ---------------------------------------------------------------------------
// Self-contained side-panel that lists, creates, edits, pauses, duplicates,
// and deletes price/volume/indicator alerts. Persists to localStorage under
// the key `tv.alerts_v2` (kept separate from any older `tv.alerts` data).
//
// Public API:
//   const am = createAlertManager(container, opts);
//   am.render();
//   am.refresh();
//   am.addAlert(alert);
//   am.removeAlert(id);
//   am.updateAlert(id, patch);
//   am.destroy();
//
// Alert schema:
//   {
//     id: string,
//     ticker: string,                 // e.g. "BTCUSDT"
//     name: string,                   // e.g. "Bitcoin / Tether"
//     category: 'price'|'volume'|'indicator'|'crypto'|'stocks',
//     metric: 'price'|'volume'|'RSI'|'MACD'|'EMA'|'SMA',
//     op: '>'|'<'|'>='|'<='|'=='|'cross_up'|'cross_down',
//     value: number,
//     message: string,
//     frequency: 'once'|'recurring'|'daily'|'every',
//     notify: { sound:boolean, email:boolean, push:boolean },
//     expiresAt: number|null,         // epoch ms
//     status: 'active'|'triggered'|'paused',
//     createdAt: number,
//     triggeredAt: number|null,
//   }
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tv.alerts_v2';

// ---------------------------------------------------------------------------
// One-time style injection
// ---------------------------------------------------------------------------
let _stylesInjected = false;

function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const css = `
.am-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: var(--grey-6, #0f0f0f);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  font-size: 12px;
}
.am-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #2a2e39;
  background: #131722;
  flex: 0 0 auto;
}
.am-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0;
  letter-spacing: 0.2px;
}
.am-title .am-count {
  color: #787b86;
  font-weight: 500;
  margin-left: 4px;
}
.am-header-btns {
  display: flex;
  gap: 6px;
}
.am-btn {
  background: #2a2e39;
  color: #d1d4dc;
  border: 1px solid #363a45;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  transition: background 80ms ease, border-color 80ms ease;
}
.am-btn:hover { background: #363a45; border-color: #434651; }
.am-btn.am-btn-primary {
  background: #2962ff;
  border-color: #2962ff;
  color: #fff;
}
.am-btn.am-btn-primary:hover { background: #1e53e5; border-color: #1e53e5; }
.am-btn.am-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: #b2b5be;
  padding: 5px 8px;
}
.am-btn.am-btn-ghost:hover { background: #2a2e39; color: #d1d4dc; }
.am-btn.am-btn-danger {
  background: transparent;
  color: #ef5350;
  border-color: #3a2a2e;
}
.am-btn.am-btn-danger:hover { background: #3a2a2e; }

.am-tabs {
  display: flex;
  border-bottom: 1px solid #2a2e39;
  background: #131722;
  padding: 0 8px;
  flex: 0 0 auto;
}
.am-tab {
  background: transparent;
  border: none;
  color: #787b86;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 5px;
}
.am-tab:hover { color: #d1d4dc; }
.am-tab.is-active {
  color: #d1d4dc;
  border-bottom-color: #2962ff;
}
.am-tab .am-tab-count {
  background: #2a2e39;
  color: #b2b5be;
  border-radius: 8px;
  padding: 0 6px;
  font-size: 10px;
  min-width: 16px;
  text-align: center;
}
.am-tab.is-active .am-tab-count { background: #2962ff; color: #fff; }

.am-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #2a2e39;
  background: #0f1115;
  flex: 0 0 auto;
}
.am-chip {
  background: #1e222d;
  color: #b2b5be;
  border: 1px solid #2a2e39;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 80ms ease;
}
.am-chip:hover { background: #2a2e39; color: #d1d4dc; }
.am-chip.is-active {
  background: rgba(41, 98, 255, 0.15);
  color: #5b8def;
  border-color: rgba(41, 98, 255, 0.4);
}

.am-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.am-list::-webkit-scrollbar { width: 8px; }
.am-list::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }

.am-empty {
  color: #5d606b;
  text-align: center;
  padding: 40px 16px;
  font-size: 12px;
}
.am-empty .am-empty-title {
  color: #b2b5be;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.am-card {
  background: #131722;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 80ms ease;
  position: relative;
}
.am-card:hover { border-color: #363a45; }
.am-card.is-triggered { border-left: 3px solid #ef5350; }
.am-card.is-paused { border-left: 3px solid #787b86; opacity: 0.72; }
.am-card.is-active { border-left: 3px solid #26a69a; }

.am-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.am-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #2962ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex: 0 0 auto;
  text-transform: uppercase;
}
.am-sym {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.am-sym-ticker {
  font-weight: 600;
  color: #d1d4dc;
  font-size: 13px;
  line-height: 1.2;
}
.am-sym-name {
  color: #787b86;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.am-status {
  font-size: 10px;
  color: #b2b5be;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}
.am-status .am-dot {
  width: 8px; height: 8px; border-radius: 50%;
  display: inline-block;
}
.am-status.is-active .am-dot { background: #26a69a; box-shadow: 0 0 6px rgba(38,166,154,0.6); }
.am-status.is-triggered .am-dot { background: #ef5350; box-shadow: 0 0 6px rgba(239,83,80,0.6); }
.am-status.is-paused .am-dot { background: #787b86; }

.am-cond {
  background: #0f1115;
  border: 1px solid #2a2e39;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: "Menlo", "Consolas", monospace;
  font-size: 12px;
  color: #d1d4dc;
}
.am-cond .am-cond-metric { color: #5b8def; font-weight: 600; }
.am-cond .am-cond-op { color: #f7a600; margin: 0 4px; }
.am-cond .am-cond-value { color: #26a69a; }

.am-msg {
  color: #b2b5be;
  font-size: 11px;
  font-style: italic;
  padding: 0 2px;
}

.am-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 10px;
  color: #787b86;
}
.am-meta span { display: inline-flex; align-items: center; gap: 3px; }
.am-meta .am-meta-label { color: #5d606b; }

.am-notify-row {
  display: flex;
  gap: 4px;
}
.am-notify-tog {
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 11px;
  color: #5d606b;
  font-family: inherit;
}
.am-notify-tog.is-on { background: rgba(41,98,255,0.15); border-color: rgba(41,98,255,0.4); color: #5b8def; }

.am-actions {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid #1e222d;
  margin-top: 2px;
}
.am-actions .am-btn {
  padding: 4px 8px;
  font-size: 10px;
  flex: 0 0 auto;
}
.am-actions .am-spacer { flex: 1 1 auto; }

/* Modal */
.am-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: am-fade 120ms ease;
}
@keyframes am-fade { from { opacity: 0; } to { opacity: 1; } }
.am-modal {
  background: #131722;
  border: 1px solid #2a2e39;
  border-radius: 8px;
  width: 460px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
}
.am-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2e39;
}
.am-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0;
}
.am-modal-close {
  background: transparent;
  border: none;
  color: #787b86;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  font-family: inherit;
  line-height: 1;
}
.am-modal-close:hover { color: #d1d4dc; }
.am-modal-body {
  padding: 14px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.am-modal-foot {
  padding: 10px 16px;
  border-top: 1px solid #2a2e39;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.am-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.am-field-row {
  display: flex;
  gap: 8px;
}
.am-field-row .am-field { flex: 1 1 0; }
.am-label {
  font-size: 11px;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}
.am-input, .am-select {
  background: #0f1115;
  border: 1px solid #2a2e39;
  color: #d1d4dc;
  border-radius: 4px;
  padding: 7px 9px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.am-input:focus, .am-select:focus { border-color: #2962ff; }
.am-checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.am-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #b2b5be;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.am-checkbox input { accent-color: #2962ff; }
`;

  const style = document.createElement('style');
  style.setAttribute('data-am-styles', '1');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function uid(prefix = 'al') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch (_) {
    return null;
  }
}

function saveStored(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) { /* quota or disabled */ }
}

function fmtNumber(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtDate(ts) {
  if (!ts) return 'Nunca';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function fmtDateTimeLocal(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function freqLabel(f) {
  switch (f) {
    case 'once': return 'Una vez';
    case 'recurring': return 'Recurrente';
    case 'daily': return 'Diario';
    case 'every': return 'Cada vez';
    default: return f;
  }
}

function opLabel(op) {
  switch (op) {
    case '>': return '>';
    case '<': return '<';
    case '>=': return '≥';
    case '<=': return '≤';
    case '==': return '=';
    case 'cross_up': return 'cruza ↑';
    case 'cross_down': return 'cruza ↓';
    default: return op;
  }
}

function statusLabel(s) {
  switch (s) {
    case 'active': return 'Activa';
    case 'triggered': return 'Disparada';
    case 'paused': return 'Pausada';
    default: return s;
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
function seedAlerts() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: uid(), ticker: 'BTCUSDT', name: 'Bitcoin / Tether', category: 'crypto',
      metric: 'price', op: '>', value: 75000,
      message: 'BTC rompe nuevo máximo histórico',
      frequency: 'once',
      notify: { sound: true, email: true, push: true },
      expiresAt: now + 30 * day, status: 'active',
      createdAt: now - 2 * day, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'ETHUSDT', name: 'Ethereum / Tether', category: 'crypto',
      metric: 'price', op: '<', value: 2800,
      message: 'Soporte clave perdido',
      frequency: 'recurring',
      notify: { sound: true, email: false, push: true },
      expiresAt: null, status: 'active',
      createdAt: now - 5 * day, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'AAPL', name: 'Apple Inc.', category: 'stocks',
      metric: 'RSI', op: '<', value: 30,
      message: 'Sobreventa — posible rebote',
      frequency: 'daily',
      notify: { sound: false, email: true, push: false },
      expiresAt: now + 14 * day, status: 'active',
      createdAt: now - 1 * day, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'TSLA', name: 'Tesla Inc.', category: 'stocks',
      metric: 'volume', op: '>', value: 50000000,
      message: 'Volumen anormalmente alto',
      frequency: 'every',
      notify: { sound: true, email: true, push: false },
      expiresAt: null, status: 'triggered',
      createdAt: now - 10 * day, triggeredAt: now - 3 * 3600000,
    },
    {
      id: uid(), ticker: 'SPX', name: 'S&P 500 Index', category: 'price',
      metric: 'price', op: 'cross_down', value: 5200,
      message: 'Cruce bajista de soporte mayor',
      frequency: 'once',
      notify: { sound: true, email: true, push: true },
      expiresAt: now + 60 * day, status: 'active',
      createdAt: now - 7 * day, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'NVDA', name: 'NVIDIA Corp.', category: 'indicator',
      metric: 'MACD', op: 'cross_up', value: 0,
      message: 'Cruce alcista MACD en H4',
      frequency: 'recurring',
      notify: { sound: false, email: false, push: true },
      expiresAt: null, status: 'paused',
      createdAt: now - 12 * day, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'SOLUSDT', name: 'Solana / Tether', category: 'crypto',
      metric: 'price', op: '>=', value: 220,
      message: '',
      frequency: 'once',
      notify: { sound: true, email: false, push: false },
      expiresAt: now + 7 * day, status: 'active',
      createdAt: now - 6 * 3600000, triggeredAt: null,
    },
    {
      id: uid(), ticker: 'GOLD', name: 'Gold Futures', category: 'price',
      metric: 'price', op: '<=', value: 2300,
      message: 'Retroceso a zona de compra',
      frequency: 'daily',
      notify: { sound: true, email: true, push: true },
      expiresAt: now + 90 * day, status: 'triggered',
      createdAt: now - 20 * day, triggeredAt: now - 2 * day,
    },
  ];
}

function defaultAlert() {
  return {
    id: uid(),
    ticker: '',
    name: '',
    category: 'price',
    metric: 'price',
    op: '>',
    value: 0,
    message: '',
    frequency: 'once',
    notify: { sound: true, email: false, push: false },
    expiresAt: null,
    status: 'active',
    createdAt: Date.now(),
    triggeredAt: null,
  };
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------
export function createAlertManager(container, opts = {}) {
  if (!container) throw new Error('createAlertManager: container required');
  ensureStyles();

  // ---- state -------------------------------------------------------------
  const state = {
    alerts: [],
    activeTab: 'active',        // active | triggered | paused
    activeChip: 'all',          // all | price | volume | indicator | crypto | stocks
    onChange: typeof opts.onChange === 'function' ? opts.onChange : null,
  };

  // ---- DOM refs ----------------------------------------------------------
  let root = null;
  let listEl = null;
  let countEl = null;
  let tabsEl = null;
  let chipsEl = null;
  let modalEl = null;          // active modal backdrop element
  let keyHandler = null;       // global Esc handler

  // ---- persistence -------------------------------------------------------
  function persist() {
    saveStored(state.alerts);
    if (state.onChange) {
      try { state.onChange(state.alerts.slice()); } catch (_) {}
    }
  }

  // ---- initial load ------------------------------------------------------
  const stored = loadStored();
  state.alerts = (stored && stored.length) ? stored : seedAlerts();
  if (!stored) persist();

  // ---- helpers -----------------------------------------------------------
  function getFiltered() {
    return state.alerts.filter((a) => {
      if (state.activeTab === 'active' && a.status !== 'active') return false;
      if (state.activeTab === 'triggered' && a.status !== 'triggered') return false;
      if (state.activeTab === 'paused' && a.status !== 'paused') return false;
      if (state.activeChip !== 'all' && a.category !== state.activeChip) return false;
      return true;
    });
  }

  function tabCounts() {
    return {
      active: state.alerts.filter((a) => a.status === 'active').length,
      triggered: state.alerts.filter((a) => a.status === 'triggered').length,
      paused: state.alerts.filter((a) => a.status === 'paused').length,
    };
  }

  // ---- render ------------------------------------------------------------
  function render() {
    if (!root) {
      root = document.createElement('div');
      root.className = 'am-root';
      container.innerHTML = '';
      container.appendChild(root);
    }
    root.innerHTML = renderShellHtml();
    bindShell();
    renderList();
  }

  function renderShellHtml() {
    return `
      <div class="am-header">
        <h3 class="am-title">Alertas <span class="am-count" data-am-count></span></h3>
        <div class="am-header-btns">
          <button class="am-btn am-btn-primary" data-am-new>＋ Nueva alerta</button>
          <button class="am-btn am-btn-ghost" data-am-filters title="Filtros">⚙</button>
          <button class="am-btn am-btn-ghost am-btn-danger" data-am-clear title="Limpiar disparadas">🗑</button>
        </div>
      </div>
      <div class="am-tabs" data-am-tabs></div>
      <div class="am-chips" data-am-chips></div>
      <div class="am-list" data-am-list></div>
    `;
  }

  function bindShell() {
    countEl = root.querySelector('[data-am-count]');
    listEl = root.querySelector('[data-am-list]');
    tabsEl = root.querySelector('[data-am-tabs]');
    chipsEl = root.querySelector('[data-am-chips]');

    root.querySelector('[data-am-new]').addEventListener('click', () => openModal(null));
    root.querySelector('[data-am-filters]').addEventListener('click', () => {
      // simple cycle: show/hide chips
      if (chipsEl) chipsEl.style.display = chipsEl.style.display === 'none' ? '' : 'none';
    });
    root.querySelector('[data-am-clear]').addEventListener('click', () => {
      const before = state.alerts.length;
      state.alerts = state.alerts.filter((a) => a.status !== 'triggered');
      if (state.alerts.length !== before) { persist(); renderList(); }
    });

    renderTabs();
    renderChips();
  }

  function renderTabs() {
    const counts = tabCounts();
    const tabs = [
      { id: 'active', label: 'Activas', n: counts.active },
      { id: 'triggered', label: 'Disparadas', n: counts.triggered },
      { id: 'paused', label: 'Pausadas', n: counts.paused },
    ];
    tabsEl.innerHTML = tabs.map((t) => `
      <button class="am-tab ${state.activeTab === t.id ? 'is-active' : ''}" data-am-tab="${t.id}">
        ${t.label} <span class="am-tab-count">${t.n}</span>
      </button>
    `).join('');
    tabsEl.querySelectorAll('[data-am-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.getAttribute('data-am-tab');
        renderTabs();
        renderList();
      });
    });
  }

  function renderChips() {
    const chips = [
      { id: 'all', label: 'Todas' },
      { id: 'price', label: 'Precio' },
      { id: 'volume', label: 'Volumen' },
      { id: 'indicator', label: 'Indicador' },
      { id: 'crypto', label: 'Cripto' },
      { id: 'stocks', label: 'Acciones' },
    ];
    chipsEl.innerHTML = chips.map((c) => `
      <button class="am-chip ${state.activeChip === c.id ? 'is-active' : ''}" data-am-chip="${c.id}">${c.label}</button>
    `).join('');
    chipsEl.querySelectorAll('[data-am-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeChip = btn.getAttribute('data-am-chip');
        renderChips();
        renderList();
      });
    });
  }

  function renderList() {
    if (!listEl) return;
    countEl.textContent = '(' + state.alerts.length + ')';

    const items = getFiltered();
    if (!items.length) {
      listEl.innerHTML = `
        <div class="am-empty">
          <div class="am-empty-title">Sin alertas</div>
          <div>No hay alertas que coincidan con el filtro actual.</div>
        </div>`;
      return;
    }

    listEl.innerHTML = items.map(renderCardHtml).join('');
    items.forEach((a) => bindCard(a));
  }

  function renderCardHtml(a) {
    const letter = (a.ticker || a.name || '?').charAt(0);
    const valueStr = (a.metric === 'volume') ? fmtNumber(a.value) : fmtNumber(a.value);
    const cond = `
      <span class="am-cond-metric">${escapeHtml(a.metric.toUpperCase())}</span>
      <span class="am-cond-op">${escapeHtml(opLabel(a.op))}</span>
      <span class="am-cond-value">${escapeHtml(valueStr)}</span>
    `;
    const msg = a.message
      ? `<div class="am-msg">“${escapeHtml(a.message)}”</div>`
      : '';
    const exp = a.expiresAt ? fmtDate(a.expiresAt) : 'Nunca';
    const notif = a.notify || { sound:false, email:false, push:false };

    return `
      <div class="am-card is-${a.status}" data-am-card="${a.id}">
        <div class="am-card-head">
          <div class="am-logo">${escapeHtml(letter)}</div>
          <div class="am-sym">
            <div class="am-sym-ticker">${escapeHtml(a.ticker)}</div>
            <div class="am-sym-name">${escapeHtml(a.name)}</div>
          </div>
          <div class="am-status is-${a.status}">
            <span class="am-dot"></span>${escapeHtml(statusLabel(a.status))}
          </div>
        </div>
        <div class="am-cond">${cond}</div>
        ${msg}
        <div class="am-meta">
          <span><span class="am-meta-label">Frecuencia:</span> ${escapeHtml(freqLabel(a.frequency))}</span>
          <span><span class="am-meta-label">Vence:</span> ${escapeHtml(exp)}</span>
        </div>
        <div class="am-notify-row">
          <button class="am-notify-tog ${notif.sound ? 'is-on' : ''}" data-am-notify="sound" title="Sonido">🔔 Sonido</button>
          <button class="am-notify-tog ${notif.email ? 'is-on' : ''}" data-am-notify="email" title="Email">📧 Email</button>
          <button class="am-notify-tog ${notif.push ? 'is-on' : ''}" data-am-notify="push" title="Push">📱 Push</button>
        </div>
        <div class="am-actions">
          <button class="am-btn" data-am-act="edit">Editar</button>
          <button class="am-btn" data-am-act="toggle">${a.status === 'paused' ? 'Reanudar' : 'Pausar'}</button>
          <button class="am-btn" data-am-act="duplicate">Duplicar</button>
          <span class="am-spacer"></span>
          <button class="am-btn am-btn-danger" data-am-act="delete">Eliminar</button>
        </div>
      </div>
    `;
  }

  function bindCard(a) {
    const card = listEl.querySelector(`[data-am-card="${a.id}"]`);
    if (!card) return;

    card.querySelectorAll('[data-am-notify]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-am-notify');
        const cur = state.alerts.find((x) => x.id === a.id);
        if (!cur) return;
        cur.notify = Object.assign({}, cur.notify, { [k]: !cur.notify[k] });
        persist();
        renderList();
      });
    });

    card.querySelectorAll('[data-am-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-am-act');
        const cur = state.alerts.find((x) => x.id === a.id);
        if (!cur) return;
        if (act === 'edit') {
          openModal(cur);
        } else if (act === 'toggle') {
          cur.status = (cur.status === 'paused') ? 'active' : 'paused';
          persist();
          renderTabs();
          renderList();
        } else if (act === 'duplicate') {
          const copy = Object.assign({}, cur, {
            id: uid(),
            createdAt: Date.now(),
            triggeredAt: null,
            status: 'active',
            notify: Object.assign({}, cur.notify),
          });
          state.alerts.push(copy);
          persist();
          renderTabs();
          renderList();
        } else if (act === 'delete') {
          state.alerts = state.alerts.filter((x) => x.id !== cur.id);
          persist();
          renderTabs();
          renderList();
        }
      });
    });
  }

  // ---- modal -------------------------------------------------------------
  function openModal(existing) {
    closeModal();
    const isEdit = !!existing;
    const data = isEdit
      ? JSON.parse(JSON.stringify(existing))
      : defaultAlert();

    modalEl = document.createElement('div');
    modalEl.className = 'am-modal-backdrop';
    modalEl.innerHTML = `
      <div class="am-modal" role="dialog" aria-modal="true">
        <div class="am-modal-head">
          <h4 class="am-modal-title">${isEdit ? 'Editar alerta' : 'Nueva alerta'}</h4>
          <button class="am-modal-close" data-am-close aria-label="Cerrar">×</button>
        </div>
        <div class="am-modal-body">
          <div class="am-field-row">
            <div class="am-field">
              <label class="am-label">Ticker</label>
              <input class="am-input" data-f="ticker" value="${escapeHtml(data.ticker)}" placeholder="BTCUSDT">
            </div>
            <div class="am-field">
              <label class="am-label">Nombre</label>
              <input class="am-input" data-f="name" value="${escapeHtml(data.name)}" placeholder="Bitcoin / Tether">
            </div>
          </div>
          <div class="am-field-row">
            <div class="am-field">
              <label class="am-label">Categoría</label>
              <select class="am-select" data-f="category">
                ${['price','volume','indicator','crypto','stocks'].map((c) =>
                  `<option value="${c}" ${data.category===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="am-field">
              <label class="am-label">Métrica</label>
              <select class="am-select" data-f="metric">
                ${['price','volume','RSI','MACD','EMA','SMA'].map((m) =>
                  `<option value="${m}" ${data.metric===m?'selected':''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="am-field-row">
            <div class="am-field">
              <label class="am-label">Operador</label>
              <select class="am-select" data-f="op">
                ${['>','<','>=','<=','==','cross_up','cross_down'].map((o) =>
                  `<option value="${o}" ${data.op===o?'selected':''}>${opLabel(o)}</option>`).join('')}
              </select>
            </div>
            <div class="am-field">
              <label class="am-label">Valor</label>
              <input class="am-input" type="number" step="any" data-f="value" value="${escapeHtml(data.value)}">
            </div>
          </div>
          <div class="am-field">
            <label class="am-label">Mensaje (opcional)</label>
            <input class="am-input" data-f="message" value="${escapeHtml(data.message)}" placeholder="Notas para la alerta">
          </div>
          <div class="am-field-row">
            <div class="am-field">
              <label class="am-label">Frecuencia</label>
              <select class="am-select" data-f="frequency">
                ${['once','recurring','daily','every'].map((f) =>
                  `<option value="${f}" ${data.frequency===f?'selected':''}>${freqLabel(f)}</option>`).join('')}
              </select>
            </div>
            <div class="am-field">
              <label class="am-label">Vencimiento</label>
              <input class="am-input" type="datetime-local" data-f="expiresAt" value="${escapeHtml(fmtDateTimeLocal(data.expiresAt))}">
            </div>
          </div>
          <div class="am-field">
            <label class="am-label">Notificaciones</label>
            <div class="am-checkbox-row">
              <label class="am-checkbox"><input type="checkbox" data-f="notify.sound" ${data.notify.sound?'checked':''}> 🔔 Sonido</label>
              <label class="am-checkbox"><input type="checkbox" data-f="notify.email" ${data.notify.email?'checked':''}> 📧 Email</label>
              <label class="am-checkbox"><input type="checkbox" data-f="notify.push" ${data.notify.push?'checked':''}> 📱 Push</label>
            </div>
          </div>
          <div class="am-field">
            <label class="am-label">Estado</label>
            <select class="am-select" data-f="status">
              ${['active','paused','triggered'].map((s) =>
                `<option value="${s}" ${data.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="am-modal-foot">
          <button class="am-btn" data-am-cancel>Cancelar</button>
          <button class="am-btn am-btn-primary" data-am-save>${isEdit ? 'Guardar' : 'Crear alerta'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // backdrop click closes
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
    modalEl.querySelector('[data-am-close]').addEventListener('click', closeModal);
    modalEl.querySelector('[data-am-cancel]').addEventListener('click', closeModal);
    modalEl.querySelector('[data-am-save]').addEventListener('click', () => {
      const result = readForm(modalEl, data);
      if (!result.ticker.trim()) {
        const t = modalEl.querySelector('[data-f="ticker"]');
        if (t) t.focus();
        return;
      }
      if (isEdit) {
        const idx = state.alerts.findIndex((x) => x.id === existing.id);
        if (idx >= 0) state.alerts[idx] = Object.assign({}, state.alerts[idx], result, { id: existing.id });
      } else {
        state.alerts.unshift(Object.assign({}, result, { id: uid(), createdAt: Date.now() }));
      }
      persist();
      closeModal();
      renderTabs();
      renderList();
    });

    // ESC handler
    keyHandler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', keyHandler);

    // focus
    setTimeout(() => {
      const f = modalEl.querySelector('[data-f="ticker"]');
      if (f) f.focus();
    }, 30);
  }

  function readForm(rootEl, base) {
    const out = Object.assign({}, base);
    rootEl.querySelectorAll('[data-f]').forEach((el) => {
      const key = el.getAttribute('data-f');
      let val;
      if (el.type === 'checkbox') val = el.checked;
      else if (el.type === 'number') val = parseFloat(el.value) || 0;
      else if (el.type === 'datetime-local') val = el.value ? new Date(el.value).getTime() : null;
      else val = el.value;

      if (key.indexOf('.') >= 0) {
        const [a, b] = key.split('.');
        out[a] = Object.assign({}, out[a] || {}, { [b]: val });
      } else {
        out[key] = val;
      }
    });
    return out;
  }

  function closeModal() {
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
    modalEl = null;
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }

  // ---- public API --------------------------------------------------------
  function refresh() {
    if (!root) { render(); return; }
    renderTabs();
    renderChips();
    renderList();
  }

  function addAlert(alert) {
    const a = Object.assign(defaultAlert(), alert || {});
    if (!a.id) a.id = uid();
    state.alerts.unshift(a);
    persist();
    refresh();
    return a;
  }

  function removeAlert(id) {
    const before = state.alerts.length;
    state.alerts = state.alerts.filter((a) => a.id !== id);
    if (state.alerts.length !== before) { persist(); refresh(); }
  }

  function updateAlert(id, patch) {
    const idx = state.alerts.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    state.alerts[idx] = Object.assign({}, state.alerts[idx], patch || {}, { id });
    persist();
    refresh();
    return state.alerts[idx];
  }

  function destroy() {
    closeModal();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = listEl = countEl = tabsEl = chipsEl = null;
  }

  return { render, refresh, addAlert, removeAlert, updateAlert, destroy };
}

export default createAlertManager;
