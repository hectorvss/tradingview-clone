/* =========================================================================
   Paper Trading module — simulated trading account with persistence + UI.

   Public API:
     createPaperTradingAccount(opts) -> account
     createPaperTradingPanel(container, opts) -> { render, destroy }

   Storage key: tv.paper_trading
   ========================================================================= */

import { createChart, AreaSeries } from 'lightweight-charts';
import { ensurePolishStyles, showToast, emptyStateHTML } from './ui-polish.js';

const STORAGE_KEY = 'tv.paper_trading';
const FEE_RATE = 0.0005; // 0.05% per side
const DEFAULT_INITIAL = 100000;
const MARGIN_RATE = 0.1; // 10% margin requirement on notional

/* ---- Singleton registry so multiple panels share one account ---- */
const _instances = new Map();

/* =========================================================================
   ACCOUNT
   ========================================================================= */
export function createPaperTradingAccount(opts = {}) {
    const key = opts.key || 'default';
    if (_instances.has(key)) return _instances.get(key);

    const initialBalance = Number(opts.initialBalance) || DEFAULT_INITIAL;

    /** @type {{
     *  initialBalance:number, balance:number,
     *  positions: Record<string, {symbol:string, side:'long'|'short', qty:number, avgPrice:number, currentPrice:number, stopLoss?:number, takeProfit?:number, openedAt:number, fees:number}>,
     *  orders: Array<{id:string, symbol:string, side:'buy'|'sell', qty:number, type:string, price?:number, stopLoss?:number, takeProfit?:number, createdAt:number, status:string}>,
     *  history: Array<any>,
     *  prices: Record<string, number>,
     *  equityCurve: Array<{time:number, value:number}>,
     *  todayAnchor: {date:string, value:number}
     * }} */
    let state = load() || {
        initialBalance,
        balance: initialBalance,
        positions: {},
        orders: [],
        history: [],
        prices: {},
        equityCurve: [{ time: nowSec(), value: initialBalance }],
        todayAnchor: { date: todayStr(), value: initialBalance },
    };

    const subscribers = new Map(); // symbol -> Set<cb>
    const accountListeners = new Set();

    /* ---- helpers ---- */
    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
    }
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }
    function notifyAccount() {
        accountListeners.forEach((cb) => { try { cb(getAccount()); } catch (e) { /* ignore */ } });
    }
    function notifyPrice(symbol, price) {
        const set = subscribers.get(symbol);
        if (set) set.forEach((cb) => { try { cb(price); } catch (e) { /* ignore */ } });
    }
    function genId() {
        return 'o_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
    function nowSec() { return Math.floor(Date.now() / 1000); }
    function todayStr() { return new Date().toISOString().slice(0, 10); }

    function rolloverTodayAnchorIfNeeded() {
        const t = todayStr();
        if (state.todayAnchor.date !== t) {
            state.todayAnchor = { date: t, value: getEquity() };
        }
    }

    function getMarkPrice(symbol) {
        const pos = state.positions[symbol];
        const px = state.prices[symbol];
        if (typeof px === 'number') return px;
        if (pos) return pos.currentPrice || pos.avgPrice;
        return 0;
    }

    function positionPnL(pos) {
        const mark = pos.currentPrice || pos.avgPrice;
        const dir = pos.side === 'long' ? 1 : -1;
        return (mark - pos.avgPrice) * pos.qty * dir;
    }

    function positionNotional(pos) {
        return Math.abs(pos.qty * (pos.currentPrice || pos.avgPrice));
    }

    function getMarginUsed() {
        let m = 0;
        for (const sym in state.positions) m += positionNotional(state.positions[sym]) * MARGIN_RATE;
        return m;
    }

    function getUnrealized() {
        let p = 0;
        for (const sym in state.positions) p += positionPnL(state.positions[sym]);
        return p;
    }

    function getEquity() {
        return state.balance + getUnrealized();
    }

    function getTotalPnL() {
        return getEquity() - state.initialBalance;
    }

    function getTodayPnL() {
        rolloverTodayAnchorIfNeeded();
        return getEquity() - state.todayAnchor.value;
    }

    function pushEquityPoint() {
        const t = nowSec();
        const v = getEquity();
        const last = state.equityCurve[state.equityCurve.length - 1];
        if (last && last.time === t) {
            last.value = v;
        } else {
            state.equityCurve.push({ time: t, value: v });
            if (state.equityCurve.length > 5000) state.equityCurve.shift();
        }
    }

    /* ---- public: account snapshot ---- */
    function getAccount() {
        const equity = getEquity();
        const marginUsed = getMarginUsed();
        return {
            balance: round2(state.balance),
            equity: round2(equity),
            marginUsed: round2(marginUsed),
            marginAvailable: round2(equity - marginUsed),
            totalPnL: round2(getTotalPnL()),
            todayPnL: round2(getTodayPnL()),
            accountValue: round2(equity),
            initialBalance: state.initialBalance,
        };
    }

    /* ---- orders ---- */
    function placeOrder(o) {
        if (!o || !o.symbol || !o.side || !o.qty) throw new Error('placeOrder: missing fields');
        const order = {
            id: genId(),
            symbol: String(o.symbol).toUpperCase(),
            side: o.side === 'sell' ? 'sell' : 'buy',
            qty: Math.abs(Number(o.qty)),
            type: o.type || 'market',
            price: o.price != null ? Number(o.price) : undefined,
            stopLoss: o.stopLoss != null ? Number(o.stopLoss) : undefined,
            takeProfit: o.takeProfit != null ? Number(o.takeProfit) : undefined,
            createdAt: Date.now(),
            status: 'pending',
        };

        if (order.type === 'market') {
            const mark = getMarkPrice(order.symbol);
            if (!mark) {
                // queue as pending until first tick
                state.orders.push(order);
                save(); notifyAccount();
                return order.id;
            }
            fillOrder(order, mark);
        } else {
            state.orders.push(order);
        }
        save(); notifyAccount();
        return order.id;
    }

    function cancelOrder(id) {
        const idx = state.orders.findIndex((o) => o.id === id);
        if (idx === -1) return false;
        state.orders.splice(idx, 1);
        save(); notifyAccount();
        return true;
    }

    function fillOrder(order, fillPrice) {
        const symbol = order.symbol;
        const sideLong = order.side === 'buy';
        const fee = Math.abs(order.qty * fillPrice) * FEE_RATE;

        const existing = state.positions[symbol];
        if (!existing) {
            // open
            state.positions[symbol] = {
                symbol,
                side: sideLong ? 'long' : 'short',
                qty: order.qty,
                avgPrice: fillPrice,
                currentPrice: fillPrice,
                stopLoss: order.stopLoss,
                takeProfit: order.takeProfit,
                openedAt: Date.now(),
                fees: fee,
            };
            state.balance -= fee;
        } else {
            const sameDir = (existing.side === 'long') === sideLong;
            if (sameDir) {
                // add to position — recompute avg
                const totalQty = existing.qty + order.qty;
                existing.avgPrice = (existing.avgPrice * existing.qty + fillPrice * order.qty) / totalQty;
                existing.qty = totalQty;
                existing.fees += fee;
                if (order.stopLoss != null) existing.stopLoss = order.stopLoss;
                if (order.takeProfit != null) existing.takeProfit = order.takeProfit;
                state.balance -= fee;
            } else {
                // reducing / closing / flipping
                const closeQty = Math.min(existing.qty, order.qty);
                const dir = existing.side === 'long' ? 1 : -1;
                const realized = (fillPrice - existing.avgPrice) * closeQty * dir;
                state.balance += realized - fee;
                existing.fees += fee;

                state.history.push({
                    id: genId(),
                    symbol,
                    side: existing.side,
                    qty: closeQty,
                    entryPrice: existing.avgPrice,
                    exitPrice: fillPrice,
                    pnl: round2(realized - fee),
                    pnlPct: round2(((fillPrice - existing.avgPrice) / existing.avgPrice) * 100 * dir),
                    fees: round2(fee + (existing.fees * (closeQty / existing.qty))),
                    openedAt: existing.openedAt,
                    closedAt: Date.now(),
                    reason: order._reason || 'manual',
                });

                existing.qty -= closeQty;
                if (existing.qty <= 1e-9) {
                    delete state.positions[symbol];
                    const leftover = order.qty - closeQty;
                    if (leftover > 1e-9) {
                        // flip
                        state.positions[symbol] = {
                            symbol,
                            side: sideLong ? 'long' : 'short',
                            qty: leftover,
                            avgPrice: fillPrice,
                            currentPrice: fillPrice,
                            stopLoss: order.stopLoss,
                            takeProfit: order.takeProfit,
                            openedAt: Date.now(),
                            fees: 0,
                        };
                    }
                }
            }
        }

        order.status = 'filled';
        order.fillPrice = fillPrice;
        order.filledAt = Date.now();
        pushEquityPoint();
    }

    function closePosition(symbol, qty) {
        symbol = String(symbol).toUpperCase();
        const pos = state.positions[symbol];
        if (!pos) return false;
        const closeQty = qty != null ? Math.min(Math.abs(Number(qty)), pos.qty) : pos.qty;
        const mark = getMarkPrice(symbol) || pos.avgPrice;
        // create a synthetic order opposite direction
        const order = {
            id: genId(),
            symbol,
            side: pos.side === 'long' ? 'sell' : 'buy',
            qty: closeQty,
            type: 'market',
            createdAt: Date.now(),
            status: 'pending',
            _reason: 'manual_close',
        };
        fillOrder(order, mark);
        save(); notifyAccount();
        return true;
    }

    /* ---- ticks ---- */
    function processTick(symbol, price) {
        symbol = String(symbol).toUpperCase();
        price = Number(price);
        if (!isFinite(price) || price <= 0) return;
        state.prices[symbol] = price;

        // update positions
        const pos = state.positions[symbol];
        if (pos) {
            pos.currentPrice = price;
            // SL / TP
            if (pos.side === 'long') {
                if (pos.stopLoss != null && price <= pos.stopLoss) triggerClose(symbol, price, 'stop_loss');
                else if (pos.takeProfit != null && price >= pos.takeProfit) triggerClose(symbol, price, 'take_profit');
            } else {
                if (pos.stopLoss != null && price >= pos.stopLoss) triggerClose(symbol, price, 'stop_loss');
                else if (pos.takeProfit != null && price <= pos.takeProfit) triggerClose(symbol, price, 'take_profit');
            }
        }

        // check pending orders
        for (let i = state.orders.length - 1; i >= 0; i--) {
            const o = state.orders[i];
            if (o.symbol !== symbol) continue;
            let trigger = false;
            if (o.type === 'market') trigger = true;
            else if (o.type === 'limit') {
                if (o.side === 'buy' && price <= o.price) trigger = true;
                else if (o.side === 'sell' && price >= o.price) trigger = true;
            } else if (o.type === 'stop') {
                if (o.side === 'buy' && price >= o.price) trigger = true;
                else if (o.side === 'sell' && price <= o.price) trigger = true;
            }
            if (trigger) {
                state.orders.splice(i, 1);
                fillOrder(o, price);
            }
        }

        pushEquityPoint();
        save();
        notifyPrice(symbol, price);
        notifyAccount();
    }

    function triggerClose(symbol, price, reason) {
        const pos = state.positions[symbol];
        if (!pos) return;
        const order = {
            id: genId(),
            symbol,
            side: pos.side === 'long' ? 'sell' : 'buy',
            qty: pos.qty,
            type: 'market',
            createdAt: Date.now(),
            status: 'pending',
            _reason: reason,
        };
        fillOrder(order, price);
    }

    /* ---- queries ---- */
    function getPositions() {
        return Object.values(state.positions).map((p) => ({
            symbol: p.symbol,
            side: p.side,
            qty: p.qty,
            avgPrice: p.avgPrice,
            currentPrice: p.currentPrice || p.avgPrice,
            pnl: round2(positionPnL(p)),
            pnlPct: round2(((p.currentPrice || p.avgPrice) - p.avgPrice) / p.avgPrice * 100 * (p.side === 'long' ? 1 : -1)),
            stopLoss: p.stopLoss,
            takeProfit: p.takeProfit,
            openedAt: p.openedAt,
            fees: round2(p.fees),
        }));
    }
    function getOrders() { return state.orders.slice(); }
    function getTradeHistory() { return state.history.slice().reverse(); }
    function getEquityCurve() { return state.equityCurve.slice(); }

    function subscribeToPrice(symbol, cb) {
        symbol = String(symbol).toUpperCase();
        if (!subscribers.has(symbol)) subscribers.set(symbol, new Set());
        subscribers.get(symbol).add(cb);
        return () => { const s = subscribers.get(symbol); if (s) s.delete(cb); };
    }

    function subscribeAccount(cb) {
        accountListeners.add(cb);
        return () => accountListeners.delete(cb);
    }

    function reset() {
        state = {
            initialBalance,
            balance: initialBalance,
            positions: {},
            orders: [],
            history: [],
            prices: {},
            equityCurve: [{ time: nowSec(), value: initialBalance }],
            todayAnchor: { date: todayStr(), value: initialBalance },
        };
        save();
        notifyAccount();
    }

    const api = {
        getAccount, placeOrder, cancelOrder, closePosition,
        getPositions, getOrders, getTradeHistory, getEquityCurve,
        subscribeToPrice, subscribeAccount, processTick, reset,
        _key: key,
    };
    _instances.set(key, api);
    return api;
}

function round2(n) { return Math.round(n * 100) / 100; }
function fmtMoney(n) {
    const s = (Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : (Math.round(n * 100) / 100).toFixed(2));
    return (n < 0 ? '-$' : '$') + s.replace(/^-/, '');
}
function fmtPct(n) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function fmtNum(n, d = 4) { return Number(n).toFixed(d); }
function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

/* =========================================================================
   PANEL
   ========================================================================= */
export function createPaperTradingPanel(container, opts = {}) {
    const account = opts.account || createPaperTradingAccount(opts);
    if (!container) throw new Error('createPaperTradingPanel: container required');

    let root, tabsEl, bodyEl;
    let activeTab = 'positions';
    let unsubAccount = null;
    let historyChart = null, historySeries = null;
    let equityChart = null, equitySeries = null;
    let resizeObserver = null;
    let destroyed = false;

    function injectStyles() {
        if (document.getElementById('pt-styles')) return;
        const style = document.createElement('style');
        style.id = 'pt-styles';
        style.textContent = `
.pt-root{display:flex;flex-direction:column;height:100%;width:100%;background:#0f0f0f;color:#d1d4dc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;}
.pt-tabs{display:flex;border-bottom:1px solid #2a2e39;background:#131722;flex-shrink:0;}
.pt-tab{padding:10px 16px;cursor:pointer;color:#787b86;border-bottom:2px solid transparent;font-weight:500;user-select:none;transition:color 100ms ease;}
.pt-tab:hover{color:#d1d4dc;}
.pt-tab.active{color:#2962ff;border-bottom-color:#2962ff;}
.pt-body{flex:1;overflow:auto;padding:12px;}
.pt-table{width:100%;border-collapse:collapse;font-size:12px;}
.pt-table th{text-align:left;padding:8px 12px;font-weight:500;color:#787b86;border-bottom:1px solid #2a2e39;background:#131722;position:sticky;top:0;}
.pt-table td{padding:8px 12px;border-bottom:1px solid #1e222d;}
.pt-table tr:hover td{background:#1e222d;}
.pt-pill{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;text-transform:uppercase;}
.pt-pill.long,.pt-pill.buy{background:rgba(8,153,129,.15);color:#089981;}
.pt-pill.short,.pt-pill.sell{background:rgba(242,54,69,.15);color:#f23645;}
.pt-up{color:#089981;}
.pt-down{color:#f23645;}
.pt-btn{background:#2a2e39;color:#d1d4dc;border:1px solid #363a45;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;transition:background 100ms ease;}
.pt-btn:hover{background:#363a45;}
.pt-btn:disabled{background:#2a2e39;color:#787b86;cursor:not-allowed;opacity:.6;}
.pt-btn.danger{background:rgba(242,54,69,.15);color:#f23645;border-color:rgba(242,54,69,.3);}
.pt-btn.danger:hover{background:rgba(242,54,69,.25);}
.pt-btn.primary{background:#2962ff;color:#fff;border-color:#2962ff;}
.pt-btn.primary:hover{background:#1976d2;border-color:#1976d2;}
.pt-empty{padding:40px;text-align:center;color:#787b86;font-style:italic;}
.pt-account-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;}
.pt-stat{background:#131722;border:1px solid #2a2e39;border-radius:4px;padding:12px;}
.pt-stat-label{font-size:11px;color:#787b86;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
.pt-stat-value{font-size:18px;font-weight:600;color:#d1d4dc;}
.pt-chart-wrap{background:#131722;border:1px solid #2a2e39;border-radius:4px;padding:12px;margin-top:12px;height:260px;display:flex;flex-direction:column;}
.pt-chart-title{font-size:11px;color:#787b86;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
.pt-chart-host{flex:1;min-height:0;}
.pt-actions{display:flex;gap:6px;}
.pt-account-actions{margin-top:16px;display:flex;gap:8px;}
`;
        document.head.appendChild(style);
    }

    function build() {
        injectStyles();
        ensurePolishStyles();
        root = document.createElement('div');
        root.className = 'pt-root';
        tabsEl = document.createElement('div');
        tabsEl.className = 'pt-tabs';
        const tabs = [
            { id: 'positions', label: 'Posiciones' },
            { id: 'orders', label: 'Órdenes' },
            { id: 'history', label: 'Historial' },
            { id: 'account', label: 'Cuenta' },
        ];
        tabs.forEach((t) => {
            const el = document.createElement('div');
            el.className = 'pt-tab' + (t.id === activeTab ? ' active' : '');
            el.textContent = t.label;
            el.dataset.tab = t.id;
            el.addEventListener('click', () => setTab(t.id));
            tabsEl.appendChild(el);
        });
        bodyEl = document.createElement('div');
        bodyEl.className = 'pt-body';
        root.appendChild(tabsEl);
        root.appendChild(bodyEl);
        container.appendChild(root);
    }

    function setTab(id) {
        activeTab = id;
        Array.from(tabsEl.children).forEach((el) => {
            el.classList.toggle('active', el.dataset.tab === id);
        });
        render();
    }

    function disposeCharts() {
        if (historyChart) { try { historyChart.remove(); } catch (e) {} historyChart = null; historySeries = null; }
        if (equityChart) { try { equityChart.remove(); } catch (e) {} equityChart = null; equitySeries = null; }
    }

    function render() {
        if (destroyed) return;
        disposeCharts();
        bodyEl.innerHTML = '';
        if (activeTab === 'positions') renderPositions();
        else if (activeTab === 'orders') renderOrders();
        else if (activeTab === 'history') renderHistory();
        else if (activeTab === 'account') renderAccount();
    }

    function renderPositions() {
        const positions = account.getPositions();
        if (!positions.length) {
            bodyEl.innerHTML = emptyStateHTML('No hay posiciones abiertas', 'Abre una operación desde el gráfico o el formulario para verla aquí.', '☐');
            return;
        }
        const table = document.createElement('table');
        table.className = 'pt-table';
        table.innerHTML = `
            <thead><tr>
                <th>Símbolo</th><th>Lado</th><th>Cantidad</th>
                <th>Precio Med.</th><th>Precio Actual</th>
                <th>P&L $</th><th>P&L %</th><th>SL / TP</th><th>Acciones</th>
            </tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        positions.forEach((p) => {
            const tr = document.createElement('tr');
            const cls = p.pnl >= 0 ? 'pt-up' : 'pt-down';
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.symbol)}</strong></td>
                <td><span class="pt-pill ${p.side}">${p.side}</span></td>
                <td>${fmtNum(p.qty)}</td>
                <td>${fmtNum(p.avgPrice, 2)}</td>
                <td>${fmtNum(p.currentPrice, 2)}</td>
                <td class="${cls}">${fmtMoney(p.pnl)}</td>
                <td class="${cls}">${fmtPct(p.pnlPct)}</td>
                <td>${p.stopLoss != null ? fmtNum(p.stopLoss, 2) : '—'} / ${p.takeProfit != null ? fmtNum(p.takeProfit, 2) : '—'}</td>
                <td><div class="pt-actions">
                    <button class="pt-btn danger" data-action="close" data-symbol="${escapeHtml(p.symbol)}">Cerrar</button>
                    <button class="pt-btn" data-action="close-half" data-symbol="${escapeHtml(p.symbol)}" data-qty="${p.qty / 2}">½</button>
                </div></td>`;
            tbody.appendChild(tr);
        });
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const sym = btn.dataset.symbol;
            if (btn.dataset.action === 'close') account.closePosition(sym);
            else if (btn.dataset.action === 'close-half') account.closePosition(sym, Number(btn.dataset.qty));
            render();
        });
        bodyEl.appendChild(table);
    }

    function renderOrders() {
        const orders = account.getOrders();
        if (!orders.length) {
            bodyEl.innerHTML = emptyStateHTML('No hay órdenes pendientes', 'Las órdenes limit/stop sin ejecutar aparecerán en esta lista.', '◷');
            return;
        }
        const table = document.createElement('table');
        table.className = 'pt-table';
        table.innerHTML = `
            <thead><tr>
                <th>ID</th><th>Símbolo</th><th>Lado</th><th>Tipo</th>
                <th>Cantidad</th><th>Precio</th><th>SL / TP</th><th>Creada</th><th></th>
            </tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        orders.forEach((o) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:monospace;color:#787b86;">${escapeHtml(o.id.slice(-8))}</td>
                <td><strong>${escapeHtml(o.symbol)}</strong></td>
                <td><span class="pt-pill ${o.side}">${o.side}</span></td>
                <td>${escapeHtml(o.type)}</td>
                <td>${fmtNum(o.qty)}</td>
                <td>${o.price != null ? fmtNum(o.price, 2) : '—'}</td>
                <td>${o.stopLoss != null ? fmtNum(o.stopLoss, 2) : '—'} / ${o.takeProfit != null ? fmtNum(o.takeProfit, 2) : '—'}</td>
                <td>${fmtTime(o.createdAt)}</td>
                <td><button class="pt-btn danger" data-cancel="${escapeHtml(o.id)}">Cancelar</button></td>`;
            tbody.appendChild(tr);
        });
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-cancel]');
            if (!btn) return;
            account.cancelOrder(btn.dataset.cancel);
            showToast('Orden cancelada', { type: 'success', duration: 1500 });
            render();
        });
        bodyEl.appendChild(table);
    }

    function renderHistory() {
        const history = account.getTradeHistory();
        if (!history.length) {
            bodyEl.innerHTML = emptyStateHTML('Sin operaciones cerradas', 'Aquí verás el histórico de trades una vez cierres tus primeras posiciones.', '✓');
            return;
        }
        const table = document.createElement('table');
        table.className = 'pt-table';
        table.innerHTML = `
            <thead><tr>
                <th>Símbolo</th><th>Lado</th><th>Cantidad</th>
                <th>Entrada</th><th>Salida</th>
                <th>P&L $</th><th>P&L %</th><th>Comisiones</th>
                <th>Razón</th><th>Cerrada</th>
            </tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        history.forEach((h) => {
            const cls = h.pnl >= 0 ? 'pt-up' : 'pt-down';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(h.symbol)}</strong></td>
                <td><span class="pt-pill ${h.side}">${h.side}</span></td>
                <td>${fmtNum(h.qty)}</td>
                <td>${fmtNum(h.entryPrice, 2)}</td>
                <td>${fmtNum(h.exitPrice, 2)}</td>
                <td class="${cls}">${fmtMoney(h.pnl)}</td>
                <td class="${cls}">${fmtPct(h.pnlPct)}</td>
                <td>${fmtMoney(h.fees || 0)}</td>
                <td>${escapeHtml(h.reason || 'manual')}</td>
                <td>${fmtTime(h.closedAt)}</td>`;
            tbody.appendChild(tr);
        });
        bodyEl.appendChild(table);

        // cumulative P&L chart
        const wrap = document.createElement('div');
        wrap.className = 'pt-chart-wrap';
        wrap.innerHTML = '<div class="pt-chart-title">P&L acumulado</div><div class="pt-chart-host"></div>';
        bodyEl.appendChild(wrap);

        const host = wrap.querySelector('.pt-chart-host');
        try {
            historyChart = createChart(host, {
                layout: { background: { color: 'transparent' }, textColor: '#d1d4dc' },
                grid: { vertLines: { color: '#1c2030' }, horzLines: { color: '#1c2030' } },
                rightPriceScale: { borderColor: '#2a2e39' },
                timeScale: { borderColor: '#2a2e39', timeVisible: true },
                width: host.clientWidth, height: host.clientHeight,
            });
            historySeries = historyChart.addSeries(AreaSeries, {
                lineColor: '#2962ff', topColor: 'rgba(41,98,255,.4)', bottomColor: 'rgba(41,98,255,0)',
            });
            const sorted = history.slice().reverse(); // oldest first
            let cum = 0;
            const data = sorted.map((h) => { cum += h.pnl; return { time: Math.floor(h.closedAt / 1000), value: round2(cum) }; });
            // dedupe times
            const seen = new Map();
            data.forEach((d) => seen.set(d.time, d));
            historySeries.setData(Array.from(seen.values()).sort((a, b) => a.time - b.time));
            historyChart.timeScale().fitContent();
        } catch (e) { /* chart failure non-fatal */ }
    }

    function renderAccount() {
        const a = account.getAccount();
        const grid = document.createElement('div');
        grid.className = 'pt-account-grid';
        const stats = [
            ['Balance', fmtMoney(a.balance), ''],
            ['Equity', fmtMoney(a.equity), ''],
            ['Margen usado', fmtMoney(a.marginUsed), ''],
            ['Margen disponible', fmtMoney(a.marginAvailable), ''],
            ['P&L Total', fmtMoney(a.totalPnL), a.totalPnL >= 0 ? 'pt-up' : 'pt-down'],
            ['P&L Hoy', fmtMoney(a.todayPnL), a.todayPnL >= 0 ? 'pt-up' : 'pt-down'],
            ['Valor de cuenta', fmtMoney(a.accountValue), ''],
            ['Balance inicial', fmtMoney(a.initialBalance), ''],
        ];
        stats.forEach(([label, value, cls]) => {
            const card = document.createElement('div');
            card.className = 'pt-stat';
            card.innerHTML = `<div class="pt-stat-label">${escapeHtml(label)}</div><div class="pt-stat-value ${cls}">${escapeHtml(value)}</div>`;
            grid.appendChild(card);
        });
        bodyEl.appendChild(grid);

        const actions = document.createElement('div');
        actions.className = 'pt-account-actions';
        const resetBtn = document.createElement('button');
        resetBtn.className = 'pt-btn danger';
        resetBtn.textContent = 'Reset cuenta';
        resetBtn.addEventListener('click', () => {
            if (confirm('¿Resetear la cuenta? Se perderá todo el historial.')) {
                account.reset();
                showToast('Cuenta reseteada', { type: 'success' });
                render();
            }
        });
        actions.appendChild(resetBtn);
        bodyEl.appendChild(actions);

        const wrap = document.createElement('div');
        wrap.className = 'pt-chart-wrap';
        wrap.innerHTML = '<div class="pt-chart-title">Curva de equity</div><div class="pt-chart-host"></div>';
        bodyEl.appendChild(wrap);

        const host = wrap.querySelector('.pt-chart-host');
        try {
            equityChart = createChart(host, {
                layout: { background: { color: 'transparent' }, textColor: '#d1d4dc' },
                grid: { vertLines: { color: '#1c2030' }, horzLines: { color: '#1c2030' } },
                rightPriceScale: { borderColor: '#2a2e39' },
                timeScale: { borderColor: '#2a2e39', timeVisible: true },
                width: host.clientWidth, height: host.clientHeight,
            });
            equitySeries = equityChart.addSeries(AreaSeries, {
                lineColor: '#26a69a', topColor: 'rgba(38,166,154,.4)', bottomColor: 'rgba(38,166,154,0)',
            });
            const curve = account.getEquityCurve();
            const seen = new Map();
            curve.forEach((p) => seen.set(p.time, p));
            equitySeries.setData(Array.from(seen.values()).sort((a, b) => a.time - b.time));
            equityChart.timeScale().fitContent();
        } catch (e) { /* */ }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function destroy() {
        destroyed = true;
        if (unsubAccount) { try { unsubAccount(); } catch (e) {} unsubAccount = null; }
        disposeCharts();
        if (resizeObserver) { try { resizeObserver.disconnect(); } catch (e) {} resizeObserver = null; }
        if (root && root.parentNode) root.parentNode.removeChild(root);
    }

    /* ---- bootstrap ---- */
    build();
    render();
    unsubAccount = account.subscribeAccount(() => {
        // light re-render to avoid clobbering scroll on every tick — only update visible tab
        if (activeTab === 'positions' || activeTab === 'account') render();
    });

    try {
        resizeObserver = new ResizeObserver(() => {
            if (historyChart) historyChart.applyOptions({});
            if (equityChart) equityChart.applyOptions({});
        });
        resizeObserver.observe(container);
    } catch (e) { /* SSR safe */ }

    return { render, destroy };
}
