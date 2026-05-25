// trading-panel.js
// TradingView-style Trading Panel + DOM (Depth of Market) + Time & Sales tape.
// Exports three factories: createTradingPanel, createDOMPanel, createTimeSalesPanel.
// Each returns { render(), destroy() }. All data is synthesized locally with a
// realistic random walk and Poisson trade intervals. CSS is injected once.

// ---------------------------------------------------------------------------
// Shared CSS injection
// ---------------------------------------------------------------------------
const STYLE_ID = 'tv-trading-panel-styles';
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  .tv-tp, .tv-dom, .tv-tape {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #d1d4dc;
    background: #131722;
    border: 1px solid #2a2e39;
    border-radius: 6px;
    box-sizing: border-box;
    font-size: 12px;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  }
  .tv-tp *, .tv-dom *, .tv-tape * { box-sizing: border-box; }

  /* ---- Trading Panel ---- */
  .tv-tp__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-bottom: 1px solid #2a2e39;
    background: #1c2030;
  }
  .tv-tp__sym { font-weight: 600; font-size: 13px; color: #f1f3f6; letter-spacing: .3px; }
  .tv-tp__last { font-variant-numeric: tabular-nums; color: #9aa2b1; }
  .tv-tp__tabs {
    display: flex; gap: 2px; padding: 6px 8px 0 8px;
    background: #131722; border-bottom: 1px solid #2a2e39;
  }
  .tv-tp__tab {
    background: transparent; color: #9aa2b1; border: none;
    padding: 6px 10px; cursor: pointer; font-size: 12px;
    border-radius: 4px 4px 0 0;
  }
  .tv-tp__tab:hover { color: #f1f3f6; background: #1c2030; }
  .tv-tp__tab.is-active {
    color: #f1f3f6; background: #1c2030;
    border-bottom: 2px solid #2962ff;
  }
  .tv-tp__body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .tv-tp__side {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
  }
  .tv-tp__side label {
    display: flex; align-items: center; justify-content: center;
    padding: 6px; border: 1px solid #2a2e39; border-radius: 4px;
    cursor: pointer; gap: 6px; color: #9aa2b1; font-weight: 600;
  }
  .tv-tp__side label.is-buy.is-active { background: #0e2e1f; border-color: #26a69a; color: #26a69a; }
  .tv-tp__side label.is-sell.is-active { background: #2e0e15; border-color: #ef5350; color: #ef5350; }
  .tv-tp__side input { display: none; }
  .tv-tp__field { display: flex; flex-direction: column; gap: 3px; }
  .tv-tp__field label { font-size: 11px; color: #9aa2b1; }
  .tv-tp__field input {
    background: #0e1118; color: #f1f3f6;
    border: 1px solid #2a2e39; border-radius: 4px;
    padding: 6px 8px; font-size: 12px; outline: none;
    font-variant-numeric: tabular-nums;
  }
  .tv-tp__field input:focus { border-color: #2962ff; }
  .tv-tp__field input:disabled { opacity: .45; cursor: not-allowed; }
  .tv-tp__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tv-tp__risk {
    background: #0e1118; border: 1px solid #2a2e39; border-radius: 4px;
    padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;
    font-variant-numeric: tabular-nums;
  }
  .tv-tp__risk-row { display: flex; justify-content: space-between; gap: 8px; }
  .tv-tp__risk-row span:first-child { color: #9aa2b1; font-size: 11px; }
  .tv-tp__risk-row span:last-child { color: #f1f3f6; font-weight: 600; font-size: 12px; }
  .tv-tp__risk-row .pos { color: #26a69a; }
  .tv-tp__risk-row .neg { color: #ef5350; }
  .tv-tp__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
  .tv-tp__btn {
    border: none; color: white; padding: 10px;
    border-radius: 4px; cursor: pointer; font-weight: 700;
    font-size: 13px; letter-spacing: .5px;
    transition: filter .12s ease;
  }
  .tv-tp__btn:hover { filter: brightness(1.1); }
  .tv-tp__btn:active { filter: brightness(.92); }
  .tv-tp__btn--buy { background: #26a69a; }
  .tv-tp__btn--sell { background: #ef5350; }
  .tv-tp__history {
    border-top: 1px solid #2a2e39; padding: 8px 10px; max-height: 160px; overflow-y: auto;
  }
  .tv-tp__history h4 { margin: 0 0 6px 0; font-size: 11px; color: #9aa2b1; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; }
  .tv-tp__order {
    display: grid; grid-template-columns: 60px 50px 1fr 70px 80px;
    gap: 6px; padding: 4px 0; font-size: 11px;
    font-variant-numeric: tabular-nums; border-bottom: 1px dotted #2a2e39;
  }
  .tv-tp__order:last-child { border-bottom: none; }
  .tv-tp__order .buy { color: #26a69a; }
  .tv-tp__order .sell { color: #ef5350; }
  .tv-tp__order .t { color: #6b7280; }

  /* ---- DOM ladder ---- */
  .tv-dom__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-bottom: 1px solid #2a2e39; background: #1c2030;
  }
  .tv-dom__title { font-weight: 600; font-size: 13px; color: #f1f3f6; }
  .tv-dom__last { font-variant-numeric: tabular-nums; }
  .tv-dom__cols {
    display: grid; grid-template-columns: 1fr 90px 1fr;
    padding: 6px 10px; font-size: 10px; color: #6b7280;
    text-transform: uppercase; letter-spacing: .5px;
    border-bottom: 1px solid #2a2e39;
  }
  .tv-dom__cols .buys { text-align: left; }
  .tv-dom__cols .price { text-align: center; }
  .tv-dom__cols .sells { text-align: right; }
  .tv-dom__body { overflow-y: auto; flex: 1; }
  .tv-dom__row {
    display: grid; grid-template-columns: 1fr 90px 1fr;
    height: 20px; font-size: 11px; cursor: pointer;
    font-variant-numeric: tabular-nums;
    position: relative;
  }
  .tv-dom__row:hover { background: #1c2030; }
  .tv-dom__cell {
    position: relative; display: flex; align-items: center;
    padding: 0 6px; overflow: hidden;
  }
  .tv-dom__cell--buy { justify-content: flex-start; color: #26a69a; }
  .tv-dom__cell--sell { justify-content: flex-end; color: #ef5350; }
  .tv-dom__cell--price {
    justify-content: center; color: #d1d4dc;
    background: #0e1118; font-weight: 600;
  }
  .tv-dom__cell--spread {
    color: #6b7280; font-style: italic; font-weight: 500;
    background: #1c2030;
  }
  .tv-dom__bar {
    position: absolute; top: 0; bottom: 0; z-index: 0;
  }
  .tv-dom__bar--buy { left: 0; background: rgba(38, 166, 154, .18); }
  .tv-dom__bar--sell { right: 0; background: rgba(239, 83, 80, .18); }
  .tv-dom__num { position: relative; z-index: 1; }

  /* ---- Time & Sales ---- */
  .tv-tape__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-bottom: 1px solid #2a2e39; background: #1c2030;
  }
  .tv-tape__title { font-weight: 600; font-size: 13px; color: #f1f3f6; }
  .tv-tape__filters {
    display: flex; gap: 2px; padding: 4px 8px;
    border-bottom: 1px solid #2a2e39;
  }
  .tv-tape__filter {
    background: transparent; border: 1px solid transparent;
    color: #9aa2b1; padding: 3px 8px;
    font-size: 11px; cursor: pointer; border-radius: 3px;
  }
  .tv-tape__filter:hover { color: #f1f3f6; background: #1c2030; }
  .tv-tape__filter.is-active {
    color: #f1f3f6; background: #2962ff;
    border-color: #2962ff;
  }
  .tv-tape__cols {
    display: grid; grid-template-columns: 70px 40px 1fr 70px 50px;
    padding: 4px 10px; font-size: 10px; color: #6b7280;
    text-transform: uppercase; letter-spacing: .5px;
    border-bottom: 1px solid #2a2e39;
  }
  .tv-tape__cols span:nth-child(3),
  .tv-tape__cols span:nth-child(4) { text-align: right; }
  .tv-tape__body { flex: 1; overflow-y: auto; }
  .tv-tape__row {
    display: grid; grid-template-columns: 70px 40px 1fr 70px 50px;
    padding: 3px 10px; font-size: 11px;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px dotted #1c2030;
    transition: background-color .6s ease;
  }
  .tv-tape__row.is-fresh-buy { background: rgba(38, 166, 154, .25); }
  .tv-tape__row.is-fresh-sell { background: rgba(239, 83, 80, .25); }
  .tv-tape__row .buy { color: #26a69a; font-weight: 600; }
  .tv-tape__row .sell { color: #ef5350; font-weight: 600; }
  .tv-tape__row .t { color: #6b7280; }
  .tv-tape__row .px, .tv-tape__row .sz { text-align: right; }
  .tv-tape__row .agg { text-align: right; color: #9aa2b1; }
  `;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtSize(n) {
  if (n == null) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function randn() {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poissonDelay(lambdaPerSec) {
  // Returns ms until next event for given rate.
  const u = Math.max(1e-9, Math.random());
  return -Math.log(u) / lambdaPerSec * 1000;
}

// ---------------------------------------------------------------------------
// 1) Trading Panel
// ---------------------------------------------------------------------------
export function createTradingPanel(container, opts = {}) {
  if (!container) throw new Error('createTradingPanel: container required');
  injectStyles();

  const state = {
    symbol: opts.symbol || 'BTCUSDT',
    price: opts.price || 100,
    equity: opts.equity || 10000,
    side: 'buy',           // 'buy' | 'sell'
    type: 'mercado',       // 'mercado' | 'limite' | 'stop' | 'stop-limite'
    qty: opts.qty || 1,
    limitPrice: opts.price || 100,
    stopPrice: opts.price || 100,
    stopLoss: 0,
    takeProfit: 0,
    orders: [],            // recent orders
  };

  // External components (e.g. DOM) can drive the panel via this hook.
  const api = {};
  if (typeof opts.bind === 'function') {
    // give caller a way to receive the api after render
  }

  const root = document.createElement('div');
  root.className = 'tv-tp';
  container.appendChild(root);

  let priceTickInterval = null;
  const listeners = [];

  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    listeners.push(() => el.removeEventListener(ev, fn));
  }

  function calcRisk() {
    const entry = (state.type === 'mercado') ? state.price
                : (state.type === 'limite') ? state.limitPrice
                : state.stopPrice;
    const qty = Number(state.qty) || 0;
    const sl = Number(state.stopLoss) || 0;
    const tp = Number(state.takeProfit) || 0;
    let risk = 0, reward = 0;
    if (sl > 0 && entry > 0 && qty > 0) {
      risk = state.side === 'buy'
        ? Math.max(0, (entry - sl)) * qty
        : Math.max(0, (sl - entry)) * qty;
    }
    if (tp > 0 && entry > 0 && qty > 0) {
      reward = state.side === 'buy'
        ? Math.max(0, (tp - entry)) * qty
        : Math.max(0, (entry - tp)) * qty;
    }
    const rr = (risk > 0) ? reward / risk : 0;
    const pctEquity = state.equity > 0 ? (risk / state.equity) * 100 : 0;
    return { entry, risk, reward, rr, pctEquity };
  }

  function render() {
    root.innerHTML = `
      <div class="tv-tp__header">
        <div class="tv-tp__sym" data-sym>${state.symbol}</div>
        <div class="tv-tp__last" data-last>${fmt(state.price)}</div>
      </div>
      <div class="tv-tp__tabs">
        ${['mercado', 'limite', 'stop', 'stop-limite'].map(t => {
          const label = t === 'mercado' ? 'Mercado'
                      : t === 'limite' ? 'Límite'
                      : t === 'stop' ? 'Stop'
                      : 'Stop-Límite';
          return `<button class="tv-tp__tab${state.type === t ? ' is-active' : ''}" data-tab="${t}">${label}</button>`;
        }).join('')}
      </div>
      <div class="tv-tp__body">
        <div class="tv-tp__side">
          <label class="is-buy${state.side === 'buy' ? ' is-active' : ''}" data-side="buy">
            <input type="radio" name="tv-side" ${state.side === 'buy' ? 'checked' : ''}/> COMPRA
          </label>
          <label class="is-sell${state.side === 'sell' ? ' is-active' : ''}" data-side="sell">
            <input type="radio" name="tv-side" ${state.side === 'sell' ? 'checked' : ''}/> VENTA
          </label>
        </div>
        <div class="tv-tp__field">
          <label>Cantidad</label>
          <input type="number" step="0.0001" min="0" value="${state.qty}" data-field="qty"/>
        </div>
        <div class="tv-tp__grid2">
          <div class="tv-tp__field">
            <label>Precio Límite</label>
            <input type="number" step="0.01" value="${state.limitPrice}" data-field="limitPrice"
              ${(state.type === 'limite' || state.type === 'stop-limite') ? '' : 'disabled'}/>
          </div>
          <div class="tv-tp__field">
            <label>Precio Stop</label>
            <input type="number" step="0.01" value="${state.stopPrice}" data-field="stopPrice"
              ${(state.type === 'stop' || state.type === 'stop-limite') ? '' : 'disabled'}/>
          </div>
        </div>
        <div class="tv-tp__grid2">
          <div class="tv-tp__field">
            <label>Stop Loss</label>
            <input type="number" step="0.01" value="${state.stopLoss}" data-field="stopLoss"/>
          </div>
          <div class="tv-tp__field">
            <label>Take Profit</label>
            <input type="number" step="0.01" value="${state.takeProfit}" data-field="takeProfit"/>
          </div>
        </div>
        <div class="tv-tp__risk" data-risk></div>
        <div class="tv-tp__actions">
          <button class="tv-tp__btn tv-tp__btn--buy" data-submit="buy">COMPRAR</button>
          <button class="tv-tp__btn tv-tp__btn--sell" data-submit="sell">VENDER</button>
        </div>
      </div>
      <div class="tv-tp__history">
        <h4>Órdenes recientes</h4>
        <div data-orders></div>
      </div>
    `;

    renderRisk();
    renderOrders();
    bindEvents();
  }

  function renderRisk() {
    const r = calcRisk();
    const node = root.querySelector('[data-risk]');
    if (!node) return;
    node.innerHTML = `
      <div class="tv-tp__risk-row"><span>Entrada</span><span>${fmt(r.entry)}</span></div>
      <div class="tv-tp__risk-row"><span>R:R</span><span>${r.rr > 0 ? r.rr.toFixed(2) : '-'}</span></div>
      <div class="tv-tp__risk-row"><span>Riesgo $</span><span class="neg">${r.risk > 0 ? '-' + fmt(r.risk) : '-'}</span></div>
      <div class="tv-tp__risk-row"><span>Beneficio $</span><span class="pos">${r.reward > 0 ? '+' + fmt(r.reward) : '-'}</span></div>
      <div class="tv-tp__risk-row"><span>% Equity</span><span>${r.pctEquity > 0 ? r.pctEquity.toFixed(2) + '%' : '-'}</span></div>
      <div class="tv-tp__risk-row"><span>Equity</span><span>${fmt(state.equity)}</span></div>
    `;
  }

  function renderOrders() {
    const node = root.querySelector('[data-orders]');
    if (!node) return;
    if (state.orders.length === 0) {
      node.innerHTML = `<div style="color:#6b7280;font-size:11px;padding:6px 0;">Sin órdenes</div>`;
      return;
    }
    node.innerHTML = state.orders.slice(0, 12).map(o => `
      <div class="tv-tp__order">
        <span class="t">${fmtTime(o.ts)}</span>
        <span class="${o.side}">${o.side === 'buy' ? 'BUY' : 'SELL'}</span>
        <span>${o.type.toUpperCase()}</span>
        <span>${fmt(o.qty, 4)}</span>
        <span>${fmt(o.price)}</span>
      </div>
    `).join('');
  }

  function bindEvents() {
    root.querySelectorAll('[data-tab]').forEach(btn => {
      on(btn, 'click', () => { state.type = btn.dataset.tab; render(); });
    });
    root.querySelectorAll('[data-side]').forEach(lab => {
      on(lab, 'click', () => { state.side = lab.dataset.side; render(); });
    });
    root.querySelectorAll('[data-field]').forEach(inp => {
      on(inp, 'input', () => {
        const k = inp.dataset.field;
        state[k] = parseFloat(inp.value) || 0;
        renderRisk();
      });
    });
    const buyBtn = root.querySelector('[data-submit="buy"]');
    const sellBtn = root.querySelector('[data-submit="sell"]');
    if (buyBtn) on(buyBtn, 'click', () => submitOrder('buy'));
    if (sellBtn) on(sellBtn, 'click', () => submitOrder('sell'));
  }

  function submitOrder(side) {
    const r = calcRisk();
    const order = {
      ts: Date.now(),
      side,
      type: state.type,
      qty: Number(state.qty) || 0,
      price: r.entry,
      sl: Number(state.stopLoss) || 0,
      tp: Number(state.takeProfit) || 0,
    };
    if (order.qty <= 0) return;
    state.orders.unshift(order);
    if (state.orders.length > 50) state.orders.length = 50;
    renderOrders();
    if (typeof opts.onOrder === 'function') {
      try { opts.onOrder(order); } catch (_) { /* ignore */ }
    }
  }

  // Public API for external drivers (e.g. DOM click).
  api.setPrice = (p) => {
    if (!p || isNaN(p)) return;
    state.price = p;
    const last = root.querySelector('[data-last]');
    if (last) last.textContent = fmt(p);
  };
  api.setLimitPrice = (p) => {
    if (!p || isNaN(p)) return;
    state.limitPrice = p;
    state.stopPrice = p;
    if (state.type === 'mercado') state.type = 'limite';
    render();
  };
  api.setSymbol = (s) => {
    state.symbol = s;
    const el = root.querySelector('[data-sym]');
    if (el) el.textContent = s;
  };
  api.getState = () => ({ ...state });

  // Simulated price drift so risk metrics update.
  priceTickInterval = setInterval(() => {
    const drift = randn() * (state.price * 0.0005);
    state.price = Math.max(0.01, state.price + drift);
    const last = root.querySelector('[data-last]');
    if (last) last.textContent = fmt(state.price);
    if (state.type === 'mercado') renderRisk();
  }, 1000);

  render();

  return {
    render,
    destroy() {
      if (priceTickInterval) { clearInterval(priceTickInterval); priceTickInterval = null; }
      listeners.forEach(fn => { try { fn(); } catch (_) { /* ignore */ } });
      listeners.length = 0;
      if (root.parentNode) root.parentNode.removeChild(root);
    },
    ...api,
  };
}

// ---------------------------------------------------------------------------
// 2) DOM (Depth of Market) panel
// ---------------------------------------------------------------------------
export function createDOMPanel(container, opts = {}) {
  if (!container) throw new Error('createDOMPanel: container required');
  injectStyles();

  const state = {
    symbol: opts.symbol || 'BTCUSDT',
    midPrice: opts.price || 100,
    tickSize: opts.tickSize || (opts.price ? opts.price * 0.0005 : 0.05),
    levels: opts.levels || 10,    // levels each side; total = 2 * levels
    bids: [],   // [{ price, size }]
    asks: [],
    maxSize: 1,
  };

  const root = document.createElement('div');
  root.className = 'tv-dom';
  container.appendChild(root);

  let tickInterval = null;
  const listeners = [];
  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    listeners.push(() => el.removeEventListener(ev, fn));
  }

  function seed() {
    state.bids = [];
    state.asks = [];
    const base = state.midPrice;
    for (let i = 1; i <= state.levels; i++) {
      const bidPx = base - i * state.tickSize;
      const askPx = base + i * state.tickSize;
      const sz = Math.max(1, Math.round(50 + Math.abs(randn()) * 80 + (state.levels - i) * 8));
      state.bids.push({ price: bidPx, size: sz });
      state.asks.push({ price: askPx, size: sz + Math.round(randn() * 10) });
    }
    state.maxSize = Math.max(
      ...state.bids.map(b => b.size),
      ...state.asks.map(a => a.size),
      1
    );
  }

  function step() {
    // Random-walk the mid price.
    const drift = randn() * state.tickSize * 0.6;
    state.midPrice = Math.max(state.tickSize, state.midPrice + drift);

    // Re-anchor the ladder rows to the new mid price.
    for (let i = 0; i < state.levels; i++) {
      state.bids[i].price = state.midPrice - (i + 1) * state.tickSize;
      state.asks[i].price = state.midPrice + (i + 1) * state.tickSize;
      // Walk sizes; clamp to >= 1.
      state.bids[i].size = Math.max(1, Math.round(state.bids[i].size + randn() * 12));
      state.asks[i].size = Math.max(1, Math.round(state.asks[i].size + randn() * 12));
    }
    state.maxSize = Math.max(
      ...state.bids.map(b => b.size),
      ...state.asks.map(a => a.size),
      1
    );
    renderBody();
    const lastEl = root.querySelector('[data-last]');
    if (lastEl) lastEl.textContent = fmt(state.midPrice);
  }

  function colorScale(size, side) {
    // 0..1 intensity by size relative to max.
    const t = Math.min(1, size / state.maxSize);
    const alpha = 0.10 + t * 0.55;
    return side === 'buy'
      ? `rgba(38, 166, 154, ${alpha.toFixed(3)})`
      : `rgba(239, 83, 80, ${alpha.toFixed(3)})`;
  }

  function renderShell() {
    root.innerHTML = `
      <div class="tv-dom__header">
        <div class="tv-dom__title">DOM · ${state.symbol}</div>
        <div class="tv-dom__last" data-last>${fmt(state.midPrice)}</div>
      </div>
      <div class="tv-dom__cols">
        <span class="buys">Bid Size</span>
        <span class="price">Precio</span>
        <span class="sells">Ask Size</span>
      </div>
      <div class="tv-dom__body" data-body></div>
    `;
  }

  function renderBody() {
    const body = root.querySelector('[data-body]');
    if (!body) return;
    // Asks: descending from top (highest first), bids descending below mid.
    const askRows = state.asks.slice().sort((a, b) => b.price - a.price);
    const bidRows = state.bids.slice().sort((a, b) => b.price - a.price);
    const rows = [];
    for (const a of askRows) {
      const pct = Math.min(100, (a.size / state.maxSize) * 100);
      rows.push(`
        <div class="tv-dom__row" data-price="${a.price}">
          <div class="tv-dom__cell"></div>
          <div class="tv-dom__cell tv-dom__cell--price"><span class="tv-dom__num">${fmt(a.price)}</span></div>
          <div class="tv-dom__cell tv-dom__cell--sell">
            <div class="tv-dom__bar tv-dom__bar--sell" style="width:${pct.toFixed(1)}%;background:${colorScale(a.size, 'sell')};"></div>
            <span class="tv-dom__num">${fmtSize(a.size)}</span>
          </div>
        </div>
      `);
    }
    // Spread row.
    const bestBid = bidRows[0] ? bidRows[0].price : 0;
    const bestAsk = askRows[askRows.length - 1] ? askRows[askRows.length - 1].price : 0;
    const spread = bestAsk - bestBid;
    rows.push(`
      <div class="tv-dom__row">
        <div class="tv-dom__cell tv-dom__cell--spread">spread</div>
        <div class="tv-dom__cell tv-dom__cell--price tv-dom__cell--spread">${fmt(spread)}</div>
        <div class="tv-dom__cell tv-dom__cell--spread"></div>
      </div>
    `);
    for (const b of bidRows) {
      const pct = Math.min(100, (b.size / state.maxSize) * 100);
      rows.push(`
        <div class="tv-dom__row" data-price="${b.price}">
          <div class="tv-dom__cell tv-dom__cell--buy">
            <div class="tv-dom__bar tv-dom__bar--buy" style="width:${pct.toFixed(1)}%;background:${colorScale(b.size, 'buy')};"></div>
            <span class="tv-dom__num">${fmtSize(b.size)}</span>
          </div>
          <div class="tv-dom__cell tv-dom__cell--price"><span class="tv-dom__num">${fmt(b.price)}</span></div>
          <div class="tv-dom__cell"></div>
        </div>
      `);
    }
    body.innerHTML = rows.join('');

    body.querySelectorAll('[data-price]').forEach(row => {
      on(row, 'click', () => {
        const p = parseFloat(row.dataset.price);
        if (typeof opts.onPriceClick === 'function') {
          try { opts.onPriceClick(p); } catch (_) { /* ignore */ }
        }
      });
    });
  }

  function render() {
    seed();
    renderShell();
    renderBody();
  }

  render();
  tickInterval = setInterval(step, 250);

  return {
    render,
    setSymbol(s) {
      state.symbol = s;
      const el = root.querySelector('.tv-dom__title');
      if (el) el.textContent = `DOM · ${s}`;
    },
    setMidPrice(p) {
      if (!p || isNaN(p)) return;
      state.midPrice = p;
      seed();
      renderBody();
    },
    destroy() {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      listeners.forEach(fn => { try { fn(); } catch (_) { /* ignore */ } });
      listeners.length = 0;
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

// ---------------------------------------------------------------------------
// 3) Time & Sales tape
// ---------------------------------------------------------------------------
export function createTimeSalesPanel(container, opts = {}) {
  if (!container) throw new Error('createTimeSalesPanel: container required');
  injectStyles();

  const state = {
    symbol: opts.symbol || 'BTCUSDT',
    price: opts.price || 100,
    trades: [],          // newest first
    maxTrades: 50,
    filter: 'all',       // 'all' | 'buy' | 'sell' | 'big'
    lambdaPerSec: opts.tradesPerSec || 3,
  };

  const root = document.createElement('div');
  root.className = 'tv-tape';
  container.appendChild(root);

  let nextTimer = null;
  const listeners = [];
  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    listeners.push(() => el.removeEventListener(ev, fn));
  }

  function genTrade() {
    // Random walk.
    state.price = Math.max(0.01, state.price + randn() * state.price * 0.0004);
    const side = Math.random() < 0.5 ? 'buy' : 'sell';
    // Size: mostly small, rare jumbo.
    const r = Math.random();
    let size;
    if (r < 0.85) size = Math.round(1 + Math.random() * 50);
    else if (r < 0.98) size = Math.round(50 + Math.random() * 500);
    else size = Math.round(500 + Math.random() * 20000);
    const notional = size * state.price;
    const aggressor = notional >= 1e6 ? 'WHALE'
                    : notional >= 1e5 ? 'INST'
                    : 'RETAIL';
    return {
      ts: Date.now(),
      side,
      price: state.price,
      size,
      notional,
      aggressor,
      fresh: true,
    };
  }

  function pushTrade() {
    const t = genTrade();
    state.trades.unshift(t);
    if (state.trades.length > state.maxTrades) state.trades.length = state.maxTrades;
    // Mark older trades non-fresh after a short delay handled by render styles.
    setTimeout(() => { t.fresh = false; renderBody(); }, 600);
    renderBody();
  }

  function schedule() {
    if (nextTimer) clearTimeout(nextTimer);
    const delay = Math.min(2000, Math.max(40, poissonDelay(state.lambdaPerSec)));
    nextTimer = setTimeout(() => { pushTrade(); schedule(); }, delay);
  }

  function passFilter(t) {
    if (state.filter === 'all') return true;
    if (state.filter === 'buy') return t.side === 'buy';
    if (state.filter === 'sell') return t.side === 'sell';
    if (state.filter === 'big') return t.notional >= 1e6;
    return true;
  }

  function renderShell() {
    root.innerHTML = `
      <div class="tv-tape__header">
        <div class="tv-tape__title">Time & Sales · ${state.symbol}</div>
        <div class="tv-tape__last" data-last>${fmt(state.price)}</div>
      </div>
      <div class="tv-tape__filters">
        ${[
          ['all', 'Todas'],
          ['buy', 'Compras'],
          ['sell', 'Ventas'],
          ['big', '>$1M'],
        ].map(([k, label]) => `
          <button class="tv-tape__filter${state.filter === k ? ' is-active' : ''}" data-filter="${k}">${label}</button>
        `).join('')}
      </div>
      <div class="tv-tape__cols">
        <span>Hora</span><span>Side</span><span>Precio</span><span>Tamaño</span><span>Agr.</span>
      </div>
      <div class="tv-tape__body" data-body></div>
    `;
    root.querySelectorAll('[data-filter]').forEach(btn => {
      on(btn, 'click', () => {
        state.filter = btn.dataset.filter;
        renderShell();
        renderBody();
      });
    });
  }

  function renderBody() {
    const body = root.querySelector('[data-body]');
    if (!body) return;
    const lastEl = root.querySelector('[data-last]');
    if (lastEl) lastEl.textContent = fmt(state.price);
    const rows = state.trades.filter(passFilter).slice(0, state.maxTrades);
    body.innerHTML = rows.map(t => `
      <div class="tv-tape__row${t.fresh ? (t.side === 'buy' ? ' is-fresh-buy' : ' is-fresh-sell') : ''}">
        <span class="t">${fmtTime(t.ts)}</span>
        <span class="${t.side}">${t.side === 'buy' ? 'B' : 'S'}</span>
        <span class="px ${t.side}">${fmt(t.price)}</span>
        <span class="sz">${fmtSize(t.size)}</span>
        <span class="agg">${t.aggressor}</span>
      </div>
    `).join('');
    // Auto-scroll to top since newest is at the top.
    body.scrollTop = 0;
  }

  function render() {
    renderShell();
    renderBody();
  }

  render();
  schedule();

  return {
    render,
    setSymbol(s) {
      state.symbol = s;
      renderShell();
      renderBody();
    },
    destroy() {
      if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
      listeners.forEach(fn => { try { fn(); } catch (_) { /* ignore */ } });
      listeners.length = 0;
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

export default {
  createTradingPanel,
  createDOMPanel,
  createTimeSalesPanel,
};
