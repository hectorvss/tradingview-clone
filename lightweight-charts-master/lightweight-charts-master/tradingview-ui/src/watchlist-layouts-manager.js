// watchlist-layouts-manager.js — TradingView-style Watchlist + Layouts managers
// ---------------------------------------------------------------------------
// Self-contained, dependency-free. Exposes two factory functions:
//
//   const wm = createWatchlistManager({ onSelectSymbol(sym) });
//   wm.open(); wm.getActive(); wm.setActive(name); wm.addList(name);
//   wm.deleteList(name); wm.addSymbol(name, sym); wm.removeSymbol(name, sym);
//   wm.getLists(); wm.destroy();
//
//   const lm = createLayoutManager({ onLoad(state), getCurrentState() });
//   lm.open(); lm.saveCurrent(name, state); lm.loadLayout(name);
//   lm.deleteLayout(name); lm.listLayouts(); lm.exportLayout(name);
//   lm.importLayout(json); lm.destroy();
//
// Persists to:
//   tv.watchlists_v2  →  { active: string, lists: { [name]: WatchList } }
//   tv.layouts_v2     →  { layouts: { [name]: Layout } }
//
// Both modals are dark-theme, ESC/backdrop close, CSS injected once.
// ---------------------------------------------------------------------------

const WL_KEY = 'tv.watchlists_v2';
const LO_KEY = 'tv.layouts_v2';

// ---------------------------------------------------------------------------
// Shared CSS (injected once for the whole module)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.wlm-backdrop, .lom-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  z-index: 9998; display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.wlm-modal, .lom-modal {
  background: #131722; color: #d1d4dc; width: 880px; max-width: 95vw;
  max-height: 85vh; border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid #2a2e39;
}
.wlm-header, .lom-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #2a2e39; background: #1a1d29;
  flex: 0 0 auto;
}
.wlm-title, .lom-title { font-size: 14px; font-weight: 600; margin: 0; }
.wlm-x, .lom-x {
  background: transparent; border: 0; color: #787b86; cursor: pointer;
  font-size: 18px; padding: 4px 8px; border-radius: 4px;
}
.wlm-x:hover, .lom-x:hover { background: #2a2e39; color: #d1d4dc; }

/* ---- Watchlist Manager ---- */
.wlm-body { display: flex; flex: 1 1 auto; min-height: 0; }
.wlm-side {
  width: 240px; flex: 0 0 240px; border-right: 1px solid #2a2e39;
  display: flex; flex-direction: column; background: #0f1117;
}
.wlm-side-head {
  padding: 8px 10px; display: flex; gap: 6px; align-items: center;
  border-bottom: 1px solid #2a2e39;
}
.wlm-newlist-inp {
  flex: 1 1 auto; background: #1c2030; border: 1px solid #2a2e39;
  color: #d1d4dc; padding: 5px 8px; border-radius: 4px; font-size: 12px;
  outline: none;
}
.wlm-newlist-inp:focus { border-color: #2962ff; }
.wlm-newlist-btn {
  background: #2962ff; color: #fff; border: 0; border-radius: 4px;
  padding: 5px 9px; cursor: pointer; font-size: 12px; font-weight: 600;
}
.wlm-newlist-btn:hover { background: #1e53e5; }
.wlm-lists { flex: 1 1 auto; overflow-y: auto; padding: 4px 0; }
.wlm-list-item {
  padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
  justify-content: space-between; gap: 6px; border-left: 2px solid transparent;
  font-size: 12px;
}
.wlm-list-item:hover { background: #1c2030; }
.wlm-list-item.active {
  background: #1c2030; border-left-color: #2962ff; color: #fff;
}
.wlm-list-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-weight: 500; }
.wlm-list-count {
  font-size: 10px; color: #787b86; background: #2a2e39;
  padding: 1px 6px; border-radius: 8px;
}
.wlm-list-del {
  background: transparent; border: 0; color: #787b86; cursor: pointer;
  font-size: 14px; padding: 0 4px; display: none;
}
.wlm-list-item:hover .wlm-list-del { display: inline; }
.wlm-list-del:hover { color: #f23645; }

.wlm-main { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
.wlm-main-head {
  padding: 10px 14px; border-bottom: 1px solid #2a2e39;
  display: flex; flex-direction: column; gap: 6px;
}
.wlm-main-title-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
}
.wlm-main-title { font-size: 14px; font-weight: 600; margin: 0; }
.wlm-main-meta { font-size: 11px; color: #787b86; }
.wlm-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.wlm-tag {
  font-size: 10px; background: #2a2e39; color: #b2b5be;
  padding: 1px 6px; border-radius: 8px;
}
.wlm-toolbar {
  display: flex; gap: 6px; padding: 8px 14px; border-bottom: 1px solid #2a2e39;
  align-items: center;
}
.wlm-search {
  flex: 1 1 auto; background: #1c2030; border: 1px solid #2a2e39;
  color: #d1d4dc; padding: 6px 10px; border-radius: 4px; font-size: 12px;
  outline: none;
}
.wlm-search:focus { border-color: #2962ff; }
.wlm-tb-btn {
  background: #2a2e39; color: #d1d4dc; border: 0; border-radius: 4px;
  padding: 6px 10px; cursor: pointer; font-size: 11px; font-weight: 500;
}
.wlm-tb-btn:hover { background: #363a45; }
.wlm-tb-btn.primary { background: #2962ff; color: #fff; }
.wlm-tb-btn.primary:hover { background: #1e53e5; }

.wlm-symbols { flex: 1 1 auto; overflow-y: auto; }
.wlm-sym-row {
  display: grid;
  grid-template-columns: 24px 90px 1fr 80px 70px 70px 28px;
  align-items: center; gap: 8px; padding: 8px 14px;
  border-bottom: 1px solid #1c2030; cursor: pointer; user-select: none;
  font-size: 12px;
}
.wlm-sym-row:hover { background: #1a1d29; }
.wlm-sym-row.dragging { opacity: 0.4; }
.wlm-sym-row.drag-over { border-top: 2px solid #2962ff; }
.wlm-sym-drag {
  color: #4a4e5c; cursor: grab; font-size: 14px; text-align: center;
}
.wlm-sym-ticker { font-weight: 600; color: #fff; }
.wlm-sym-name { color: #b2b5be; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; }
.wlm-sym-price { text-align: right; font-variant-numeric: tabular-nums;
  color: #d1d4dc; }
.wlm-sym-chg { text-align: right; font-variant-numeric: tabular-nums;
  font-weight: 600; }
.wlm-sym-chg.up { color: #26a69a; }
.wlm-sym-chg.down { color: #ef5350; }
.wlm-sym-spark { width: 60px; height: 18px; display: block; }
.wlm-sym-rm {
  background: transparent; border: 0; color: #787b86; cursor: pointer;
  font-size: 14px; padding: 0;
}
.wlm-sym-rm:hover { color: #f23645; }
.wlm-empty {
  padding: 40px 20px; text-align: center; color: #787b86; font-size: 12px;
}

/* ---- Layout Manager ---- */
.lom-modal { width: 960px; }
.lom-toolbar {
  padding: 10px 16px; border-bottom: 1px solid #2a2e39;
  display: flex; gap: 8px; align-items: center;
}
.lom-save-inp {
  flex: 1 1 auto; background: #1c2030; border: 1px solid #2a2e39;
  color: #d1d4dc; padding: 6px 10px; border-radius: 4px; font-size: 12px;
  outline: none;
}
.lom-save-inp:focus { border-color: #2962ff; }
.lom-save-btn {
  background: #2962ff; color: #fff; border: 0; border-radius: 4px;
  padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 600;
}
.lom-save-btn:hover { background: #1e53e5; }
.lom-import-btn, .lom-tpl-btn {
  background: #2a2e39; color: #d1d4dc; border: 0; border-radius: 4px;
  padding: 6px 10px; cursor: pointer; font-size: 12px;
}
.lom-import-btn:hover, .lom-tpl-btn:hover { background: #363a45; }

.lom-grid {
  flex: 1 1 auto; overflow-y: auto; padding: 16px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.lom-card {
  background: #1a1d29; border: 1px solid #2a2e39; border-radius: 6px;
  display: flex; flex-direction: column; overflow: hidden;
  transition: border-color 0.15s;
}
.lom-card:hover { border-color: #2962ff; }
.lom-card.template { border-style: dashed; border-color: #3a3e4a; }
.lom-card-thumb {
  width: 100%; height: 110px; background: #0f1117; display: block;
}
.lom-card-body { padding: 8px 10px; }
.lom-card-name {
  font-size: 13px; font-weight: 600; color: #fff; margin: 0 0 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lom-card-meta {
  font-size: 11px; color: #787b86; margin: 0 0 2px;
}
.lom-card-actions {
  display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 10px 10px;
}
.lom-card-actions button {
  background: #2a2e39; color: #d1d4dc; border: 0; border-radius: 3px;
  padding: 4px 8px; cursor: pointer; font-size: 10px; font-weight: 500;
}
.lom-card-actions button:hover { background: #363a45; }
.lom-card-actions button.primary { background: #2962ff; color: #fff; }
.lom-card-actions button.primary:hover { background: #1e53e5; }
.lom-card-actions button.danger:hover { background: #f23645; color: #fff; }
.lom-card-actions button.template { background: #1c2030; }
.lom-empty {
  grid-column: 1 / -1; text-align: center; color: #787b86;
  font-size: 12px; padding: 40px 20px;
}
.lom-section-title {
  grid-column: 1 / -1; font-size: 11px; font-weight: 600;
  color: #787b86; text-transform: uppercase; letter-spacing: 0.5px;
  margin: 4px 0 -4px;
}
`;
  const s = document.createElement('style');
  s.setAttribute('data-wlm-styles', '1');
  s.textContent = css;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowMs() { return Date.now(); }
function fmtDate(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtPrice(p) {
  if (p == null || Number.isNaN(p)) return '—';
  if (Math.abs(p) >= 1000) return p.toFixed(2);
  if (Math.abs(p) >= 1) return p.toFixed(3);
  return p.toFixed(5);
}
function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return '—';
  const s = p >= 0 ? '+' : '';
  return `${s}${p.toFixed(2)}%`;
}
function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed || fallback;
  } catch (_e) { return fallback; }
}
function safeWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (_e) { /* quota */ }
}
function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function pickFile(accept, cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept || '';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => cb(String(r.result || ''), f.name);
    r.readAsText(f);
  };
  inp.click();
}

// Deterministic pseudo-random for price/spark simulation per ticker
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function simPrice(ticker) {
  const h = hashStr(ticker);
  const base = 1 + (h % 50000) / 10;     // 1 .. ~5001
  const drift = ((h >>> 8) % 1000) / 10000; // tiny per-tick drift
  // mix in time (5s resolution) for "live"-ish feel without re-renders flicker
  const t = Math.floor(Date.now() / 5000);
  const wob = Math.sin(t * 0.13 + (h % 100)) * base * 0.01;
  return Math.max(0.0001, base + wob + drift * base);
}
function simChangePct(ticker) {
  const h = hashStr(ticker + '#chg');
  return ((h % 800) - 400) / 100; // -4.00 .. +4.00
}
function simSparkline(ticker, n) {
  n = n || 30;
  const h = hashStr(ticker);
  const out = new Array(n);
  let v = 50 + (h % 50);
  for (let i = 0; i < n; i++) {
    const r = (hashStr(ticker + ':' + i) % 1000) / 1000 - 0.5;
    v = Math.max(1, v + r * 6);
    out[i] = v;
  }
  return out;
}
function drawSparkline(canvas, ticker) {
  if (!canvas) return;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const data = simSparkline(ticker, 30);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < lo) lo = data[i];
    if (data[i] > hi) hi = data[i];
  }
  const span = (hi - lo) || 1;
  const up = data[data.length - 1] >= data[0];
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * (w - 2) + 1;
    const y = h - 2 - ((data[i] - lo) / span) * (h - 4);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = up ? '#26a69a' : '#ef5350';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function drawLayoutThumb(canvas, layout) {
  if (!canvas) return;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  // bg
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = '#1c2030'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 20) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
  }
  const panels = Math.max(1, Math.min(4, (layout && layout.panels) || 1));
  const padX = 8, padY = 8;
  const usableW = w - padX * 2, usableH = h - padY * 2;
  const rows = panels >= 3 ? 2 : 1;
  const cols = panels === 1 ? 1 : 2;
  const cw = usableW / cols, ch = usableH / rows;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx++ >= panels) break;
      const px = padX + c * cw + 2;
      const py = padY + r * ch + 2;
      const pw = cw - 4, ph = ch - 4;
      // panel bg
      ctx.fillStyle = '#1a1d29';
      ctx.fillRect(px, py, pw, ph);
      // sketch candles/line
      const seed = hashStr((layout && layout.symbol || 'X') + idx);
      const pts = 18;
      ctx.strokeStyle = (seed % 2) ? '#26a69a' : '#2962ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let v = ph / 2;
      for (let i = 0; i < pts; i++) {
        const x = px + (i / (pts - 1)) * pw;
        const r2 = (hashStr('p' + idx + ':' + i + ':' + seed) % 1000) / 1000 - 0.5;
        v = Math.max(4, Math.min(ph - 4, v + r2 * (ph * 0.18)));
        const y = py + v;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  // header strip
  ctx.fillStyle = '#1c2030';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillStyle = '#787b86';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.fillText((layout && layout.symbol) || '—', 6, 10);
  const tf = (layout && layout.timeframe) || '';
  if (tf) ctx.fillText(tf, w - 24, 10);
}

// ---------------------------------------------------------------------------
// Built-in defaults
// ---------------------------------------------------------------------------
function builtinLists() {
  const t = nowMs();
  return {
    'Favoritos': {
      name: 'Favoritos', tags: ['custom'], modifiedAt: t,
      symbols: ['AAPL', 'TSLA', 'BTCUSDT', 'EURUSD'],
    },
    'US Acciones': {
      name: 'US Acciones', tags: ['stocks', 'us'], modifiedAt: t,
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM'],
    },
    'Cripto': {
      name: 'Cripto', tags: ['crypto'], modifiedAt: t,
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'],
    },
    'Forex': {
      name: 'Forex', tags: ['fx'], modifiedAt: t,
      symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'],
    },
    'Indices': {
      name: 'Indices', tags: ['index'], modifiedAt: t,
      symbols: ['SPX', 'NDX', 'DJI', 'DAX', 'IBEX', 'NI225'],
    },
  };
}

function builtinTemplates() {
  return [
    { name: 'Análisis básico', symbol: 'AAPL', timeframe: '1D', panels: 1,
      indicators: ['EMA(20)', 'EMA(50)', 'Volume'], drawings: [], compares: [],
      chartType: 'candles', settings: {}, template: true },
    { name: 'Day trader', symbol: 'ES1!', timeframe: '5m', panels: 3,
      indicators: ['VWAP', 'EMA(9)', 'EMA(21)', 'RSI', 'Volume'],
      drawings: [], compares: [], chartType: 'candles', settings: {}, template: true },
    { name: 'Swing trader', symbol: 'SPY', timeframe: '4h', panels: 2,
      indicators: ['EMA(50)', 'EMA(200)', 'MACD'], drawings: [], compares: [],
      chartType: 'candles', settings: {}, template: true },
    { name: 'Scalper', symbol: 'BTCUSDT', timeframe: '1m', panels: 4,
      indicators: ['VWAP', 'Bollinger', 'RSI', 'OBV'], drawings: [], compares: [],
      chartType: 'candles', settings: {}, template: true },
    { name: 'Cripto avanzado', symbol: 'BTCUSDT', timeframe: '1h', panels: 3,
      indicators: ['EMA(20)', 'EMA(50)', 'EMA(200)', 'RSI', 'MACD', 'Volume Profile'],
      drawings: [], compares: ['ETHUSDT', 'SOLUSDT'], chartType: 'candles',
      settings: {}, template: true },
  ];
}

// ---------------------------------------------------------------------------
// Watchlist Manager
// ---------------------------------------------------------------------------
export function createWatchlistManager(opts) {
  opts = opts || {};
  ensureStyles();

  // -- state --
  let store = safeRead(WL_KEY, null);
  if (!store || !store.lists || typeof store.lists !== 'object') {
    store = { active: 'Favoritos', lists: builtinLists() };
    safeWrite(WL_KEY, store);
  }
  // ensure all builtins exist
  const defaults = builtinLists();
  for (const k of Object.keys(defaults)) {
    if (!store.lists[k]) store.lists[k] = defaults[k];
  }
  if (!store.lists[store.active]) {
    store.active = Object.keys(store.lists)[0] || 'Favoritos';
  }

  let backdropEl = null;
  let openFlag = false;
  let sparkTimer = null;
  let dragSym = null;

  function persist() { safeWrite(WL_KEY, store); }

  function touch(name) {
    if (store.lists[name]) store.lists[name].modifiedAt = nowMs();
  }

  // -- public ops --
  function getLists() { return Object.keys(store.lists); }
  function getActive() { return store.active; }
  function setActive(name) {
    if (!store.lists[name]) return;
    store.active = name;
    persist();
    if (openFlag) renderBody();
  }
  function addList(name) {
    name = String(name || '').trim();
    if (!name || store.lists[name]) return;
    store.lists[name] = { name, tags: ['custom'], modifiedAt: nowMs(), symbols: [] };
    persist();
    if (openFlag) renderBody();
  }
  function deleteList(name) {
    if (!store.lists[name]) return;
    delete store.lists[name];
    if (store.active === name) {
      store.active = Object.keys(store.lists)[0] || 'Favoritos';
      if (!store.lists[store.active]) {
        store.lists[store.active] = { name: store.active, tags: [],
          modifiedAt: nowMs(), symbols: [] };
      }
    }
    persist();
    if (openFlag) renderBody();
  }
  function addSymbol(name, sym) {
    sym = String(sym || '').trim().toUpperCase();
    if (!sym || !store.lists[name]) return;
    const arr = store.lists[name].symbols;
    if (arr.indexOf(sym) !== -1) return;
    arr.push(sym);
    touch(name); persist();
    if (openFlag) renderBody();
  }
  function removeSymbol(name, sym) {
    if (!store.lists[name]) return;
    const arr = store.lists[name].symbols;
    const i = arr.indexOf(sym);
    if (i === -1) return;
    arr.splice(i, 1);
    touch(name); persist();
    if (openFlag) renderBody();
  }
  function reorderSymbol(name, fromSym, toSym) {
    if (!store.lists[name] || fromSym === toSym) return;
    const arr = store.lists[name].symbols;
    const fi = arr.indexOf(fromSym);
    const ti = arr.indexOf(toSym);
    if (fi === -1 || ti === -1) return;
    arr.splice(fi, 1);
    const newTi = arr.indexOf(toSym);
    arr.splice(newTi, 0, fromSym);
    touch(name); persist();
    if (openFlag) renderBody();
  }

  function exportCSV(name) {
    const list = store.lists[name];
    if (!list) return;
    const rows = ['Symbol,LastPrice,ChangePct'];
    for (const s of list.symbols) {
      rows.push(`${s},${fmtPrice(simPrice(s))},${simChangePct(s).toFixed(2)}`);
    }
    downloadBlob(`watchlist-${name.replace(/[^a-z0-9]+/gi, '_')}.csv`,
      rows.join('\n'), 'text/csv');
  }
  function importCSV(name, text) {
    if (!store.lists[name]) return;
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;
    for (const ln of lines) {
      const first = ln.split(',')[0].trim().toUpperCase();
      if (!first || /^symbol$/i.test(first)) continue;
      const arr = store.lists[name].symbols;
      if (arr.indexOf(first) === -1) { arr.push(first); added++; }
    }
    if (added) { touch(name); persist(); renderBody(); }
  }

  // -- rendering --
  function open() {
    if (openFlag) return;
    openFlag = true;
    backdropEl = document.createElement('div');
    backdropEl.className = 'wlm-backdrop';
    backdropEl.addEventListener('mousedown', (e) => {
      if (e.target === backdropEl) close();
    });
    document.addEventListener('keydown', onKey);

    const modal = document.createElement('div');
    modal.className = 'wlm-modal';
    modal.innerHTML = `
      <div class="wlm-header">
        <h2 class="wlm-title">Listas de seguimiento</h2>
        <button class="wlm-x" aria-label="Cerrar">×</button>
      </div>
      <div class="wlm-body">
        <div class="wlm-side">
          <div class="wlm-side-head">
            <input class="wlm-newlist-inp" placeholder="Nueva lista…" />
            <button class="wlm-newlist-btn">+</button>
          </div>
          <div class="wlm-lists"></div>
        </div>
        <div class="wlm-main"></div>
      </div>`;
    backdropEl.appendChild(modal);
    document.body.appendChild(backdropEl);

    modal.querySelector('.wlm-x').addEventListener('click', close);
    const inp = modal.querySelector('.wlm-newlist-inp');
    const btn = modal.querySelector('.wlm-newlist-btn');
    const doAdd = () => {
      const v = inp.value.trim();
      if (!v) return;
      addList(v);
      inp.value = '';
      setActive(v);
    };
    btn.addEventListener('click', doAdd);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });

    renderBody();
    // refresh sparklines/prices every 5s
    sparkTimer = setInterval(() => {
      if (!openFlag) return;
      renderSymbols();
    }, 5000);
  }

  function close() {
    if (!openFlag) return;
    openFlag = false;
    document.removeEventListener('keydown', onKey);
    if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }
    if (backdropEl && backdropEl.parentNode) {
      backdropEl.parentNode.removeChild(backdropEl);
    }
    backdropEl = null;
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function renderBody() {
    if (!backdropEl) return;
    const listsEl = backdropEl.querySelector('.wlm-lists');
    const mainEl = backdropEl.querySelector('.wlm-main');
    if (!listsEl || !mainEl) return;

    // sidebar
    listsEl.innerHTML = '';
    for (const name of Object.keys(store.lists)) {
      const list = store.lists[name];
      const row = document.createElement('div');
      row.className = 'wlm-list-item' + (name === store.active ? ' active' : '');
      row.innerHTML = `
        <span class="wlm-list-name"></span>
        <span class="wlm-list-count">${list.symbols.length}</span>
        <button class="wlm-list-del" title="Eliminar">×</button>`;
      row.querySelector('.wlm-list-name').textContent = name;
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('wlm-list-del')) return;
        setActive(name);
      });
      row.querySelector('.wlm-list-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar la lista "${name}"?`)) deleteList(name);
      });
      listsEl.appendChild(row);
    }

    // main
    const list = store.lists[store.active];
    const tags = (list.tags || []).map((t) =>
      `<span class="wlm-tag">${t}</span>`).join('');
    mainEl.innerHTML = `
      <div class="wlm-main-head">
        <div class="wlm-main-title-row">
          <h3 class="wlm-main-title"></h3>
          <span class="wlm-main-meta">${list.symbols.length} símbolos · mod ${fmtDate(list.modifiedAt)}</span>
        </div>
        <div class="wlm-tags">${tags}</div>
      </div>
      <div class="wlm-toolbar">
        <input class="wlm-search" placeholder="Añadir símbolo (ej. AAPL)…" />
        <button class="wlm-tb-btn primary wlm-add-btn">Añadir</button>
        <button class="wlm-tb-btn wlm-imp-btn">Importar CSV</button>
        <button class="wlm-tb-btn wlm-exp-btn">Exportar CSV</button>
      </div>
      <div class="wlm-symbols"></div>`;
    mainEl.querySelector('.wlm-main-title').textContent = store.active;

    const search = mainEl.querySelector('.wlm-search');
    const addBtn = mainEl.querySelector('.wlm-add-btn');
    const doAddSym = () => {
      const v = search.value.trim();
      if (!v) return;
      addSymbol(store.active, v);
      search.value = '';
    };
    addBtn.addEventListener('click', doAddSym);
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAddSym(); });

    mainEl.querySelector('.wlm-imp-btn').addEventListener('click', () => {
      pickFile('.csv,text/csv', (txt) => importCSV(store.active, txt));
    });
    mainEl.querySelector('.wlm-exp-btn').addEventListener('click', () => {
      exportCSV(store.active);
    });

    renderSymbols();
  }

  function renderSymbols() {
    if (!backdropEl) return;
    const wrap = backdropEl.querySelector('.wlm-symbols');
    if (!wrap) return;
    const list = store.lists[store.active];
    wrap.innerHTML = '';
    if (!list.symbols.length) {
      const e = document.createElement('div');
      e.className = 'wlm-empty';
      e.textContent = 'Sin símbolos. Añade uno con la barra superior.';
      wrap.appendChild(e);
      return;
    }
    for (const sym of list.symbols) {
      const row = document.createElement('div');
      row.className = 'wlm-sym-row';
      row.setAttribute('draggable', 'true');
      const chg = simChangePct(sym);
      const price = simPrice(sym);
      row.innerHTML = `
        <span class="wlm-sym-drag">⋮⋮</span>
        <span class="wlm-sym-ticker"></span>
        <span class="wlm-sym-name"></span>
        <span class="wlm-sym-price">${fmtPrice(price)}</span>
        <span class="wlm-sym-chg ${chg >= 0 ? 'up' : 'down'}">${fmtPct(chg)}</span>
        <canvas class="wlm-sym-spark" width="60" height="18"></canvas>
        <button class="wlm-sym-rm" title="Quitar">×</button>`;
      row.querySelector('.wlm-sym-ticker').textContent = sym;
      row.querySelector('.wlm-sym-name').textContent = symbolName(sym);

      drawSparkline(row.querySelector('.wlm-sym-spark'), sym);

      row.addEventListener('click', (e) => {
        if (e.target.closest('.wlm-sym-rm')) return;
        if (typeof opts.onSelectSymbol === 'function') {
          try { opts.onSelectSymbol(sym); } catch (_e) { /* swallow */ }
        }
        close();
      });
      row.querySelector('.wlm-sym-rm').addEventListener('click', (e) => {
        e.stopPropagation();
        removeSymbol(store.active, sym);
      });

      // drag & drop
      row.addEventListener('dragstart', (e) => {
        dragSym = sym;
        row.classList.add('dragging');
        try { e.dataTransfer.setData('text/plain', sym); e.dataTransfer.effectAllowed = 'move'; }
        catch (_e) { /* ignore */ }
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        dragSym = null;
        wrap.querySelectorAll('.wlm-sym-row').forEach((r) => r.classList.remove('drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        if (!dragSym || dragSym === sym) return;
        e.preventDefault();
        row.classList.add('drag-over');
        try { e.dataTransfer.dropEffect = 'move'; } catch (_e) { /* ignore */ }
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (dragSym && dragSym !== sym) {
          reorderSymbol(store.active, dragSym, sym);
        }
      });

      wrap.appendChild(row);
    }
  }

  function symbolName(sym) {
    // tiny lookup table for nicer display; falls back to ticker
    const map = {
      AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.',
      AMZN: 'Amazon.com', META: 'Meta Platforms', NVDA: 'NVIDIA Corp.',
      TSLA: 'Tesla Inc.', JPM: 'JPMorgan Chase',
      BTCUSDT: 'Bitcoin / Tether', ETHUSDT: 'Ethereum / Tether',
      SOLUSDT: 'Solana / Tether', BNBUSDT: 'BNB / Tether',
      XRPUSDT: 'XRP / Tether', ADAUSDT: 'Cardano / Tether',
      EURUSD: 'Euro / US Dollar', GBPUSD: 'British Pound / USD',
      USDJPY: 'USD / Japanese Yen', AUDUSD: 'Aussie / USD',
      USDCAD: 'USD / Canadian Dollar', USDCHF: 'USD / Swiss Franc',
      SPX: 'S&P 500', NDX: 'Nasdaq 100', DJI: 'Dow Jones',
      DAX: 'DAX Index', IBEX: 'IBEX 35', NI225: 'Nikkei 225',
      SPY: 'SPDR S&P 500', 'ES1!': 'E-mini S&P 500',
    };
    return map[sym] || '';
  }

  function destroy() {
    close();
  }

  return {
    open, getActive, setActive, addList, deleteList,
    addSymbol, removeSymbol, getLists, destroy,
  };
}

// ---------------------------------------------------------------------------
// Layout Manager
// ---------------------------------------------------------------------------
export function createLayoutManager(opts) {
  opts = opts || {};
  ensureStyles();

  let store = safeRead(LO_KEY, null);
  if (!store || !store.layouts || typeof store.layouts !== 'object') {
    store = { layouts: {} };
    safeWrite(LO_KEY, store);
  }

  let backdropEl = null;
  let openFlag = false;

  function persist() { safeWrite(LO_KEY, store); }

  function listLayouts() { return Object.keys(store.layouts); }

  function saveCurrent(name, state) {
    name = String(name || '').trim();
    if (!name) return;
    const s = state || (typeof opts.getCurrentState === 'function'
      ? (opts.getCurrentState() || {}) : {});
    const entry = {
      name,
      symbol: s.symbol || '—',
      timeframe: s.timeframe || s.tf || '1D',
      chartType: s.chartType || 'candles',
      panels: s.panels || ((s.indicators && s.indicators.length > 3) ? 2 : 1),
      indicators: Array.isArray(s.indicators) ? s.indicators.slice() : [],
      drawings: Array.isArray(s.drawings) ? s.drawings.slice() : [],
      compares: Array.isArray(s.compares) ? s.compares.slice() : [],
      settings: s.settings || {},
      state: s,                       // opaque payload passed back on load
      savedAt: nowMs(),
      template: false,
    };
    store.layouts[name] = entry;
    persist();
    if (openFlag) renderGrid();
  }

  function loadLayout(name) {
    const l = store.layouts[name];
    if (!l) return;
    if (typeof opts.onLoad === 'function') {
      try { opts.onLoad(l.state || l); } catch (_e) { /* swallow */ }
    }
    if (openFlag) close();
  }

  function deleteLayout(name) {
    if (!store.layouts[name]) return;
    delete store.layouts[name];
    persist();
    if (openFlag) renderGrid();
  }

  function renameLayout(oldName, newName) {
    newName = String(newName || '').trim();
    if (!newName || !store.layouts[oldName] || store.layouts[newName]) return;
    const e = store.layouts[oldName];
    e.name = newName;
    store.layouts[newName] = e;
    delete store.layouts[oldName];
    persist();
    if (openFlag) renderGrid();
  }

  function duplicateLayout(name) {
    const src = store.layouts[name];
    if (!src) return;
    let base = name + ' (copia)', i = 2;
    while (store.layouts[base]) { base = `${name} (copia ${i++})`; }
    const copy = JSON.parse(JSON.stringify(src));
    copy.name = base; copy.savedAt = nowMs(); copy.template = false;
    store.layouts[base] = copy;
    persist();
    if (openFlag) renderGrid();
  }

  function exportLayout(name) {
    const l = store.layouts[name];
    if (!l) return;
    downloadBlob(`layout-${name.replace(/[^a-z0-9]+/gi, '_')}.json`,
      JSON.stringify(l, null, 2), 'application/json');
  }

  function importLayout(json) {
    let obj;
    try { obj = typeof json === 'string' ? JSON.parse(json) : json; }
    catch (_e) { return null; }
    if (!obj || !obj.name) return null;
    let base = obj.name, i = 2;
    while (store.layouts[base]) { base = `${obj.name} (${i++})`; }
    obj.name = base;
    obj.template = false;
    obj.savedAt = nowMs();
    store.layouts[base] = obj;
    persist();
    if (openFlag) renderGrid();
    return base;
  }

  function applyTemplate(tpl) {
    const copy = JSON.parse(JSON.stringify(tpl));
    copy.template = false;
    copy.savedAt = nowMs();
    copy.state = {
      symbol: copy.symbol, timeframe: copy.timeframe, chartType: copy.chartType,
      indicators: copy.indicators, drawings: copy.drawings,
      compares: copy.compares, settings: copy.settings, panels: copy.panels,
    };
    let base = copy.name, i = 2;
    while (store.layouts[base]) { base = `${copy.name} (${i++})`; }
    copy.name = base;
    store.layouts[base] = copy;
    persist();
    if (openFlag) renderGrid();
  }

  function open() {
    if (openFlag) return;
    openFlag = true;
    backdropEl = document.createElement('div');
    backdropEl.className = 'lom-backdrop';
    backdropEl.addEventListener('mousedown', (e) => {
      if (e.target === backdropEl) close();
    });
    document.addEventListener('keydown', onKey);

    const modal = document.createElement('div');
    modal.className = 'lom-modal';
    modal.innerHTML = `
      <div class="lom-header">
        <h2 class="lom-title">Layouts guardados</h2>
        <button class="lom-x" aria-label="Cerrar">×</button>
      </div>
      <div class="lom-toolbar">
        <input class="lom-save-inp" placeholder="Nombre del nuevo layout…" />
        <button class="lom-save-btn">Guardar layout actual</button>
        <button class="lom-import-btn">Importar JSON</button>
      </div>
      <div class="lom-grid"></div>`;
    backdropEl.appendChild(modal);
    document.body.appendChild(backdropEl);

    modal.querySelector('.lom-x').addEventListener('click', close);
    const inp = modal.querySelector('.lom-save-inp');
    const sv = modal.querySelector('.lom-save-btn');
    const doSave = () => {
      const v = inp.value.trim() || `Layout ${Object.keys(store.layouts).length + 1}`;
      saveCurrent(v);
      inp.value = '';
    };
    sv.addEventListener('click', doSave);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });
    modal.querySelector('.lom-import-btn').addEventListener('click', () => {
      pickFile('application/json,.json', (txt) => importLayout(txt));
    });

    renderGrid();
  }

  function close() {
    if (!openFlag) return;
    openFlag = false;
    document.removeEventListener('keydown', onKey);
    if (backdropEl && backdropEl.parentNode) {
      backdropEl.parentNode.removeChild(backdropEl);
    }
    backdropEl = null;
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function renderGrid() {
    if (!backdropEl) return;
    const grid = backdropEl.querySelector('.lom-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const userNames = Object.keys(store.layouts);
    if (userNames.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lom-empty';
      empty.textContent = 'Aún no has guardado ningún layout. Usa la barra superior o aplica una plantilla.';
      grid.appendChild(empty);
    } else {
      const t1 = document.createElement('div');
      t1.className = 'lom-section-title';
      t1.textContent = `Tus layouts (${userNames.length})`;
      grid.appendChild(t1);
      for (const n of userNames) {
        grid.appendChild(makeCard(store.layouts[n], false));
      }
    }

    const t2 = document.createElement('div');
    t2.className = 'lom-section-title';
    t2.textContent = 'Plantillas';
    grid.appendChild(t2);
    for (const tpl of builtinTemplates()) {
      grid.appendChild(makeCard(tpl, true));
    }
  }

  function makeCard(layout, isTemplate) {
    const card = document.createElement('div');
    card.className = 'lom-card' + (isTemplate ? ' template' : '');
    const inds = (layout.indicators || []).length;
    card.innerHTML = `
      <canvas class="lom-card-thumb" width="220" height="110"></canvas>
      <div class="lom-card-body">
        <h4 class="lom-card-name"></h4>
        <p class="lom-card-meta"></p>
        <p class="lom-card-meta"></p>
      </div>
      <div class="lom-card-actions"></div>`;
    card.querySelector('.lom-card-name').textContent = layout.name;
    const metas = card.querySelectorAll('.lom-card-meta');
    metas[0].textContent =
      `${layout.symbol || '—'} · ${layout.timeframe || ''} · ${layout.panels || 1} panel(es)`;
    metas[1].textContent = isTemplate
      ? `Plantilla · ${inds} indicador(es)`
      : `${fmtDate(layout.savedAt)} · ${inds} indicador(es)`;

    drawLayoutThumb(card.querySelector('.lom-card-thumb'), layout);

    const actions = card.querySelector('.lom-card-actions');
    if (isTemplate) {
      const bUse = document.createElement('button');
      bUse.className = 'primary'; bUse.textContent = 'Aplicar';
      bUse.addEventListener('click', () => applyTemplate(layout));
      actions.appendChild(bUse);
    } else {
      const bLoad = document.createElement('button');
      bLoad.className = 'primary'; bLoad.textContent = 'Cargar';
      bLoad.addEventListener('click', () => loadLayout(layout.name));
      const bRen = document.createElement('button');
      bRen.textContent = 'Renombrar';
      bRen.addEventListener('click', () => {
        const nn = prompt('Nuevo nombre:', layout.name);
        if (nn) renameLayout(layout.name, nn);
      });
      const bDup = document.createElement('button');
      bDup.textContent = 'Duplicar';
      bDup.addEventListener('click', () => duplicateLayout(layout.name));
      const bExp = document.createElement('button');
      bExp.textContent = 'Exportar';
      bExp.addEventListener('click', () => exportLayout(layout.name));
      const bDel = document.createElement('button');
      bDel.className = 'danger'; bDel.textContent = 'Eliminar';
      bDel.addEventListener('click', () => {
        if (confirm(`¿Eliminar el layout "${layout.name}"?`)) deleteLayout(layout.name);
      });
      actions.appendChild(bLoad);
      actions.appendChild(bRen);
      actions.appendChild(bDup);
      actions.appendChild(bExp);
      actions.appendChild(bDel);
    }
    return card;
  }

  function destroy() { close(); }

  return {
    open, saveCurrent, loadLayout, deleteLayout,
    listLayouts, exportLayout, importLayout, destroy,
  };
}
