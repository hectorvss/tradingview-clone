// price-lines.js — Price-line / alert plugins for lightweight-charts v5.2.0
// Ports four TS reference plugins (user-price-lines, user-price-alerts,
// partial-price-line, expiring-price-alerts) to plain JS using the
// ISeriesPrimitive API.
//
// Public API
// ----------
//   createUserPriceLines(chart, series, container, opts?)
//       -> { add({price,color,title,draggable}), remove(id), clear(),
//            list(), destroy() }
//   createUserPriceAlerts(chart, series, container, opts?)
//       -> { add({price,color,title,message,draggable}), remove(id),
//            clear(), list(), onTrigger(cb), destroy() }
//   createPartialPriceLine(series, { price, fromTime, toTime, color, lineWidth, lineStyle })
//       -> ISeriesPrimitive instance (auto-attached to `series`)
//   createExpiringAlerts(chart, series, container, opts?)
//       -> { add({price, expiresAt, color, title, direction}),
//            remove(id), list(), destroy() }
//
// Persistence: user lines/alerts are JSON-serialised under the localStorage
// keys `tv.user_price_lines` and `tv.user_price_alerts`, keyed by the
// `storageKey` option (defaults to the series price-format type or 'default').
//
// Interaction: right-click anywhere on the chart pane opens a context menu
// offering "Anadir linea de precio aqui" / "Anadir alerta aqui" at the
// price under the cursor.  Lines/alerts can be dragged vertically with the
// mouse when `draggable !== false`.

// ---------------------------------------------------------------------------
// CSS / DOM helpers
// ---------------------------------------------------------------------------

let _cssInjected = false;
function injectCssOnce() {
    if (_cssInjected) return;
    _cssInjected = true;
    const css = `
.tv-pl-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
}
.tv-pl-host { position: relative; }
.tv-pl-menu {
    position: fixed;
    z-index: 9999;
    min-width: 220px;
    background: #1e222d;
    color: #d1d4dc;
    border: 1px solid #2a2e39;
    border-radius: 6px;
    box-shadow: 0 6px 24px rgba(0,0,0,.45);
    font: 12px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 4px 0;
    user-select: none;
}
.tv-pl-menu-item {
    padding: 6px 14px;
    cursor: pointer;
    white-space: nowrap;
}
.tv-pl-menu-item:hover { background: #2a2e39; }
.tv-pl-menu-sep {
    height: 1px;
    margin: 4px 0;
    background: #2a2e39;
}
`;
    const style = document.createElement('style');
    style.setAttribute('data-tv-price-lines', '');
    style.textContent = css;
    document.head.appendChild(style);
}

function ensureRelative(container) {
    const view = container.ownerDocument.defaultView;
    const cs = view.getComputedStyle(container);
    if (cs.position === 'static') container.classList.add('tv-pl-host');
}

function makeOverlay(container) {
    injectCssOnce();
    ensureRelative(container);
    const doc = container.ownerDocument;
    const canvas = doc.createElement('canvas');
    canvas.className = 'tv-pl-overlay';
    container.appendChild(canvas);
    return canvas;
}

function syncCanvasSize(canvas, container) {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const needW = Math.floor(w * dpr);
    const needH = Math.floor(h * dpr);
    if (canvas.width !== needW || canvas.height !== needH) {
        canvas.width = needW;
        canvas.height = needH;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    return { w, h, dpr };
}

function uid(prefix) {
    return prefix + '_' +
        Date.now().toString(36) + '_' +
        Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

function loadStore(key, bucket) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const obj = JSON.parse(raw);
        const arr = obj && obj[bucket];
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}

function saveStore(key, bucket, items) {
    let obj = {};
    try {
        const raw = localStorage.getItem(key);
        if (raw) obj = JSON.parse(raw) || {};
    } catch (_) { obj = {}; }
    obj[bucket] = items;
    try {
        localStorage.setItem(key, JSON.stringify(obj));
    } catch (_) { /* quota — ignore */ }
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

function showContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'tv-pl-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    items.forEach((it) => {
        if (it === '-') {
            const sep = document.createElement('div');
            sep.className = 'tv-pl-menu-sep';
            menu.appendChild(sep);
            return;
        }
        const el = document.createElement('div');
        el.className = 'tv-pl-menu-item';
        el.textContent = it.label;
        el.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            closeContextMenu();
            try { it.onClick(); } catch (_) { /* swallow */ }
        });
        menu.appendChild(el);
    });
    document.body.appendChild(menu);
    _currentMenu = menu;
    // Clamp to viewport
    const r = menu.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (r.right > vw) menu.style.left = Math.max(0, vw - r.width - 4) + 'px';
    if (r.bottom > vh) menu.style.top = Math.max(0, vh - r.height - 4) + 'px';

    setTimeout(() => {
        document.addEventListener('mousedown', _onDocMouseDown, true);
        document.addEventListener('keydown', _onDocKeyDown, true);
    }, 0);
}

let _currentMenu = null;
function closeContextMenu() {
    if (_currentMenu && _currentMenu.parentNode) {
        _currentMenu.parentNode.removeChild(_currentMenu);
    }
    _currentMenu = null;
    document.removeEventListener('mousedown', _onDocMouseDown, true);
    document.removeEventListener('keydown', _onDocKeyDown, true);
}
function _onDocMouseDown(ev) {
    if (_currentMenu && !_currentMenu.contains(ev.target)) closeContextMenu();
}
function _onDocKeyDown(ev) {
    if (ev.key === 'Escape') closeContextMenu();
}

// ---------------------------------------------------------------------------
// Shared drawing
// ---------------------------------------------------------------------------

const DEFAULT_LINE_COLOR = '#2962ff';
const DEFAULT_ALERT_COLOR = '#ff9800';
const LABEL_H = 18;
const LABEL_PAD_X = 6;

function setLineDash(ctx, dpr, style) {
    switch (style) {
        case 'dashed': ctx.setLineDash([6 * dpr, 4 * dpr]); break;
        case 'dotted': ctx.setLineDash([2 * dpr, 3 * dpr]); break;
        case 'solid':
        default: ctx.setLineDash([]); break;
    }
}

function drawLine(ctx, x0, x1, y, color, dpr, lineWidth, style) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, (lineWidth || 1) * dpr);
    setLineDash(ctx, dpr, style || 'dashed');
    ctx.beginPath();
    ctx.moveTo(Math.round(x0) + 0.5, Math.round(y) + 0.5);
    ctx.lineTo(Math.round(x1) + 0.5, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.restore();
}

function drawLabel(ctx, x, y, text, bg, fg, dpr) {
    ctx.save();
    ctx.font = (10 * dpr) + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    const padX = LABEL_PAD_X * dpr;
    const padY = 3 * dpr;
    const tw = ctx.measureText(text).width;
    const h = LABEL_H * dpr;
    const w = tw + padX * 2;
    const top = Math.round(y - h / 2);
    ctx.fillStyle = bg;
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(Math.round(x), top, w, h, 3 * dpr);
        ctx.fill();
    } else {
        ctx.fillRect(Math.round(x), top, w, h);
    }
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(x) + padX, top + h / 2 + padY * 0.1);
    ctx.restore();
    return { x: Math.round(x), y: top, w, h };
}

// ---------------------------------------------------------------------------
// 1. User price lines
// ---------------------------------------------------------------------------

const DEFAULTS_LINES = {
    storageKey: 'default',
    color: DEFAULT_LINE_COLOR,
    textColor: '#ffffff',
    lineWidth: 1,
    lineStyle: 'dashed',
    persist: true,
    enableContextMenu: true,
    hitTolerance: 5,
};

function createUserPriceLines(chart, series, container, opts) {
    return _createDraggableLines(chart, series, container, opts, {
        defaults: DEFAULTS_LINES,
        storageKey: 'tv.user_price_lines',
        kind: 'line',
        menuLabel: 'Anadir linea de precio aqui',
    });
}

// ---------------------------------------------------------------------------
// 2. User price alerts (lines with metadata + cross trigger callback)
// ---------------------------------------------------------------------------

const DEFAULTS_ALERTS = {
    storageKey: 'default',
    color: DEFAULT_ALERT_COLOR,
    textColor: '#000000',
    lineWidth: 1,
    lineStyle: 'dashed',
    persist: true,
    enableContextMenu: true,
    hitTolerance: 5,
    fireOnce: true,
};

function createUserPriceAlerts(chart, series, container, opts) {
    return _createDraggableLines(chart, series, container, opts, {
        defaults: DEFAULTS_ALERTS,
        storageKey: 'tv.user_price_alerts',
        kind: 'alert',
        menuLabel: 'Anadir alerta aqui',
    });
}

// ---------------------------------------------------------------------------
// Shared implementation for user-lines + user-alerts
// ---------------------------------------------------------------------------

function _createDraggableLines(chart, series, container, userOpts, cfg) {
    const opts = Object.assign({}, cfg.defaults, userOpts || {});
    const canvas = makeOverlay(container);
    const ctx = canvas.getContext('2d');
    const triggerCbs = [];

    /** @type {Array<{id:string, price:number, color?:string, textColor?:string,
     *               title?:string, message?:string, draggable:boolean,
     *               triggered?:boolean, lastDirection?:'up'|'down'|null}>} */
    let items = [];
    if (opts.persist) items = loadStore(cfg.storageKey, opts.storageKey);

    // Drag/hover state
    let hoverId = null;
    let dragId = null;
    let dragOffsetY = 0;

    // ----------------------------- primitive -----------------------------
    const paneView = {
        renderer() { return paneRenderer; },
        zOrder() { return 'top'; },
    };
    const paneRenderer = {
        draw(target) {
            // Defer actual painting to our overlay canvas; the primitive
            // exists so the chart triggers our redraws on layout changes.
            scheduleRedraw();
        },
    };
    const primitive = {
        updateAllViews() { scheduleRedraw(); },
        paneViews() { return [paneView]; },
        priceAxisViews() { return []; },
        attached() {},
        detached() {},
    };
    series.attachPrimitive(primitive);

    // ----------------------------- redraw --------------------------------
    let rafId = 0;
    function scheduleRedraw() {
        if (rafId) return;
        rafId = requestAnimationFrame(() => { rafId = 0; redraw(); });
    }

    function priceFmt(p) {
        try {
            const f = series.priceFormatter && series.priceFormatter();
            if (f && typeof f.format === 'function') return f.format(p);
        } catch (_) {}
        return Number(p).toFixed(2);
    }

    function redraw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (items.length === 0) return;
        const W = w * dpr;
        for (const it of items) {
            const y = series.priceToCoordinate(it.price);
            if (y == null) continue;
            const yPx = y * dpr;
            const color = it.color || opts.color;
            const fg = it.textColor || opts.textColor;
            const isHover = it.id === hoverId || it.id === dragId;
            const lw = (opts.lineWidth || 1) + (isHover ? 1 : 0);
            drawLine(ctx, 0, W, yPx, color, dpr, lw, opts.lineStyle);
            const label = (it.title ? it.title + ' ' : '') + priceFmt(it.price);
            const prefix = cfg.kind === 'alert' ? '! ' : '';
            drawLabel(ctx, 4 * dpr, yPx, prefix + label, color, fg, dpr);
        }
    }

    function persist() {
        if (opts.persist) saveStore(cfg.storageKey, opts.storageKey, items);
    }

    // ----------------------------- hit test ------------------------------
    function hitTest(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const y = clientY - rect.top;
        let best = null, bestDist = opts.hitTolerance + 0.001;
        for (const it of items) {
            const ly = series.priceToCoordinate(it.price);
            if (ly == null) continue;
            const d = Math.abs(ly - y);
            if (d < bestDist) { bestDist = d; best = it; }
        }
        return best;
    }

    // ----------------------------- mouse ---------------------------------
    function onMouseMove(ev) {
        if (dragId) {
            const rect = canvas.getBoundingClientRect();
            const y = ev.clientY - rect.top - dragOffsetY;
            const p = series.coordinateToPrice(y);
            if (p != null) {
                const it = items.find(i => i.id === dragId);
                if (it) { it.price = p; scheduleRedraw(); }
            }
            ev.preventDefault();
            return;
        }
        const hit = hitTest(ev.clientX, ev.clientY);
        const newId = hit ? hit.id : null;
        if (newId !== hoverId) {
            hoverId = newId;
            container.style.cursor = newId ? 'ns-resize' : '';
            scheduleRedraw();
        }
    }

    function onMouseDown(ev) {
        if (ev.button !== 0) return;
        const hit = hitTest(ev.clientX, ev.clientY);
        if (!hit || hit.draggable === false) return;
        dragId = hit.id;
        const rect = canvas.getBoundingClientRect();
        const ly = series.priceToCoordinate(hit.price);
        dragOffsetY = (ly == null) ? 0 : (ev.clientY - rect.top) - ly;
        canvas.style.pointerEvents = 'auto';
        container.style.cursor = 'ns-resize';
        ev.preventDefault();
        ev.stopPropagation();
    }

    function onMouseUp(_ev) {
        if (!dragId) return;
        dragId = null;
        canvas.style.pointerEvents = 'none';
        persist();
        scheduleRedraw();
    }

    function onContextMenu(ev) {
        if (!opts.enableContextMenu) return;
        const rect = container.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        // Only react inside the chart-pane portion (exclude price scale)
        const tsW = chart.timeScale().width();
        if (x > tsW) return;
        const price = series.coordinateToPrice(y);
        if (price == null) return;
        const hit = hitTest(ev.clientX, ev.clientY);
        const menu = [
            { label: cfg.menuLabel + ' (' + priceFmt(price) + ')',
              onClick: () => api.add({ price }) },
        ];
        if (hit) {
            menu.push('-');
            menu.push({ label: 'Eliminar', onClick: () => api.remove(hit.id) });
        }
        menu.push('-');
        menu.push({ label: 'Limpiar todo', onClick: () => api.clear() });
        ev.preventDefault();
        ev.stopPropagation();
        showContextMenu(ev.clientX, ev.clientY, menu);
    }

    // To receive mousedown for dragging we must temporarily enable pointer
    // events on the canvas when the cursor is near a line. We do that by
    // attaching the mousedown listener to the container (always live) and
    // letting hit-tests resolve from there.
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('contextmenu', onContextMenu);

    // Resize + chart events
    const ro = new ResizeObserver(scheduleRedraw);
    ro.observe(container);
    const ts = chart.timeScale();
    ts.subscribeVisibleLogicalRangeChange(scheduleRedraw);
    const onSeriesData = () => { checkTriggers(); scheduleRedraw(); };
    series.subscribeDataChanged && series.subscribeDataChanged(onSeriesData);

    // ----------------------------- triggers (alerts only) ----------------
    let lastClose;
    function lastValue() {
        try {
            const lib = require ? null : null; // no-op
        } catch (_) {}
        try {
            const d = series.dataByIndex(1e9, -1);
            if (d == null) return undefined;
            if (typeof d.value === 'number') return d.value;
            if (typeof d.close === 'number') return d.close;
        } catch (_) {}
        return undefined;
    }
    function checkTriggers() {
        if (cfg.kind !== 'alert') return;
        const v = lastValue();
        if (v == null) { lastClose = v; return; }
        if (lastClose != null) {
            for (const it of items) {
                if (it.triggered && opts.fireOnce) continue;
                let dir = null;
                if (lastClose <= it.price && v > it.price) dir = 'up';
                else if (lastClose >= it.price && v < it.price) dir = 'down';
                if (dir) {
                    it.triggered = true;
                    it.lastDirection = dir;
                    triggerCbs.forEach(cb => {
                        try { cb({ id: it.id, price: it.price, value: v,
                                   direction: dir, title: it.title,
                                   message: it.message }); } catch (_) {}
                    });
                }
            }
            if (opts.fireOnce) {
                const before = items.length;
                items = items.filter(i => !i.triggered);
                if (items.length !== before) persist();
            } else {
                persist();
            }
        }
        lastClose = v;
    }

    // ----------------------------- public API ----------------------------
    const api = {
        add(spec) {
            const it = {
                id: uid(cfg.kind),
                price: Number(spec.price),
                color: spec.color,
                textColor: spec.textColor,
                title: spec.title || '',
                message: spec.message || '',
                draggable: spec.draggable !== false,
                triggered: false,
                lastDirection: null,
            };
            items.push(it);
            persist();
            scheduleRedraw();
            return it.id;
        },
        remove(id) {
            const n = items.length;
            items = items.filter(i => i.id !== id);
            if (items.length !== n) { persist(); scheduleRedraw(); }
        },
        clear() {
            if (!items.length) return;
            items = [];
            persist();
            scheduleRedraw();
        },
        list() { return items.slice(); },
        onTrigger(cb) {
            if (typeof cb !== 'function') return () => {};
            triggerCbs.push(cb);
            return () => {
                const i = triggerCbs.indexOf(cb);
                if (i >= 0) triggerCbs.splice(i, 1);
            };
        },
        destroy() {
            try { series.detachPrimitive(primitive); } catch (_) {}
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('contextmenu', onContextMenu);
            try { ts.unsubscribeVisibleLogicalRangeChange(scheduleRedraw); }
            catch (_) {}
            try { ro.disconnect(); } catch (_) {}
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (rafId) cancelAnimationFrame(rafId);
            triggerCbs.length = 0;
        },
    };

    scheduleRedraw();
    return api;
}

// ---------------------------------------------------------------------------
// 3. Partial price line — only renders between fromTime..toTime
// ---------------------------------------------------------------------------

function createPartialPriceLine(series, spec) {
    const cfg = Object.assign({
        price: 0,
        fromTime: null, // unix-seconds | business-day | null = data start
        toTime: null,   // null = last bar
        color: DEFAULT_LINE_COLOR,
        lineWidth: 2,
        lineStyle: 'dashed',
    }, spec || {});

    let chart = null;
    let attachedSeries = null;

    function timeToX(time) {
        if (time == null || !chart) return null;
        const x = chart.timeScale().timeToCoordinate(time);
        return (x == null) ? null : x;
    }

    function inferLastTime() {
        if (!attachedSeries) return null;
        try {
            const d = attachedSeries.dataByIndex(1e9, -1);
            return d ? d.time : null;
        } catch (_) { return null; }
    }
    function inferFirstTime() {
        if (!attachedSeries) return null;
        try {
            const d = attachedSeries.dataByIndex(0, 1);
            return d ? d.time : null;
        } catch (_) { return null; }
    }

    const renderer = {
        draw(target) {
            if (!chart || !attachedSeries) return;
            target.useBitmapCoordinateSpace((scope) => {
                const yPrice = attachedSeries.priceToCoordinate(cfg.price);
                if (yPrice == null) return;
                const ctx = scope.context;
                const dpr = scope.verticalPixelRatio;
                const hdpr = scope.horizontalPixelRatio;

                const from = (cfg.fromTime != null) ? cfg.fromTime : inferFirstTime();
                const to   = (cfg.toTime   != null) ? cfg.toTime   : inferLastTime();
                let x0 = timeToX(from);
                let x1 = timeToX(to);
                if (x0 == null) x0 = 0;
                if (x1 == null) x1 = scope.bitmapSize.width / hdpr;
                const x0b = Math.round(x0 * hdpr);
                const x1b = Math.round(x1 * hdpr);
                const yb  = Math.round(yPrice * dpr) + 0.5;

                ctx.save();
                ctx.strokeStyle = cfg.color;
                ctx.lineWidth = Math.max(1, cfg.lineWidth * dpr);
                setLineDash(ctx, dpr, cfg.lineStyle);
                ctx.beginPath();
                ctx.moveTo(Math.min(x0b, x1b), yb);
                ctx.lineTo(Math.max(x0b, x1b), yb);
                ctx.stroke();
                ctx.restore();
            });
        },
    };

    const paneView = {
        renderer() { return renderer; },
        zOrder() { return 'normal'; },
    };

    const primitive = {
        attached(param) {
            chart = param.chart;
            attachedSeries = param.series;
        },
        detached() { chart = null; attachedSeries = null; },
        updateAllViews() {},
        paneViews() { return [paneView]; },
        priceAxisViews() { return []; },
        // small mutator helpers exposed on the primitive instance
        update(patch) { Object.assign(cfg, patch || {}); },
        options() { return Object.assign({}, cfg); },
    };

    series.attachPrimitive(primitive);
    return primitive;
}

// ---------------------------------------------------------------------------
// 4. Expiring alerts — auto-remove when Date.now() > expiresAt
// ---------------------------------------------------------------------------

const DEFAULTS_EXPIRING = {
    color: '#ef5350',
    textColor: '#ffffff',
    lineWidth: 1,
    lineStyle: 'dashed',
    checkIntervalMs: 1000,
    persist: false,
    storageKey: 'default',
};

function createExpiringAlerts(chart, series, container, opts) {
    const o = Object.assign({}, DEFAULTS_EXPIRING, opts || {});
    const canvas = makeOverlay(container);
    const ctx = canvas.getContext('2d');

    /** @type {Array<{id:string,price:number,expiresAt:number,
     *                color?:string,title?:string,direction?:'up'|'down',
     *                triggered?:boolean,lastValue?:number}>} */
    let items = [];
    if (o.persist) items = loadStore('tv.user_price_alerts', '__expiring__' + o.storageKey);

    let rafId = 0;
    function schedule() {
        if (rafId) return;
        rafId = requestAnimationFrame(() => { rafId = 0; redraw(); });
    }

    function priceFmt(p) {
        try {
            const f = series.priceFormatter && series.priceFormatter();
            if (f && typeof f.format === 'function') return f.format(p);
        } catch (_) {}
        return Number(p).toFixed(2);
    }

    function purge() {
        const now = Date.now();
        const before = items.length;
        items = items.filter(i => i.expiresAt > now);
        if (o.persist && items.length !== before) {
            saveStore('tv.user_price_alerts',
                      '__expiring__' + o.storageKey, items);
        }
        return items.length !== before;
    }

    function redraw() {
        purge();
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!items.length) return;
        const now = Date.now();
        for (const it of items) {
            const y = series.priceToCoordinate(it.price);
            if (y == null) continue;
            const remainingMs = Math.max(0, it.expiresAt - now);
            const remainingSec = Math.ceil(remainingMs / 1000);
            const alpha = Math.min(1, Math.max(0.35, remainingMs / 60000));
            const color = it.color || o.color;
            ctx.save();
            ctx.globalAlpha = alpha;
            const yPx = y * dpr;
            drawLine(ctx, 0, w * dpr, yPx, color, dpr,
                     o.lineWidth, o.lineStyle);
            const label = (it.title ? it.title + ' ' : '') +
                          priceFmt(it.price) + '  ' + remainingSec + 's';
            drawLabel(ctx, 4 * dpr, yPx, label, color, o.textColor, dpr);
            ctx.restore();
        }
    }

    const paneView = {
        renderer() { return { draw() { schedule(); } }; },
        zOrder() { return 'top'; },
    };
    const primitive = {
        updateAllViews() { schedule(); },
        paneViews() { return [paneView]; },
        priceAxisViews() { return []; },
    };
    series.attachPrimitive(primitive);

    // Cross detection (uses last data point on every data change)
    function lastValue() {
        try {
            const d = series.dataByIndex(1e9, -1);
            if (!d) return undefined;
            if (typeof d.value === 'number') return d.value;
            if (typeof d.close === 'number') return d.close;
        } catch (_) {}
        return undefined;
    }
    function checkCross() {
        const v = lastValue();
        if (v == null) return;
        for (const it of items) {
            if (it.triggered) continue;
            if (it.lastValue != null) {
                if (it.direction === 'up' &&
                    it.lastValue <= it.price && v > it.price) it.triggered = true;
                else if (it.direction === 'down' &&
                    it.lastValue >= it.price && v < it.price) it.triggered = true;
                else if (!it.direction &&
                    ((it.lastValue <= it.price && v > it.price) ||
                     (it.lastValue >= it.price && v < it.price))) it.triggered = true;
                if (it.triggered) {
                    // collapse expiry so the line fades out immediately
                    it.expiresAt = Math.min(it.expiresAt, Date.now() + 1500);
                }
            }
            it.lastValue = v;
        }
    }
    const onData = () => { checkCross(); schedule(); };
    if (series.subscribeDataChanged) series.subscribeDataChanged(onData);

    // Resize + range + tick timer
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    const ts = chart.timeScale();
    ts.subscribeVisibleLogicalRangeChange(schedule);
    const tick = setInterval(() => {
        const removed = purge();
        schedule();
        if (removed) { /* could fire onExpire callbacks */ }
    }, o.checkIntervalMs);

    return {
        add(spec) {
            const it = {
                id: uid('exp'),
                price: Number(spec.price),
                expiresAt: Number(spec.expiresAt),
                color: spec.color,
                title: spec.title || '',
                direction: spec.direction || null,
                triggered: false,
                lastValue: undefined,
            };
            if (!Number.isFinite(it.expiresAt) || it.expiresAt <= Date.now()) {
                return null;
            }
            items.push(it);
            if (o.persist) saveStore('tv.user_price_alerts',
                '__expiring__' + o.storageKey, items);
            schedule();
            return it.id;
        },
        remove(id) {
            const n = items.length;
            items = items.filter(i => i.id !== id);
            if (items.length !== n) {
                if (o.persist) saveStore('tv.user_price_alerts',
                    '__expiring__' + o.storageKey, items);
                schedule();
            }
        },
        list() { return items.slice(); },
        destroy() {
            clearInterval(tick);
            try { series.detachPrimitive(primitive); } catch (_) {}
            try { ts.unsubscribeVisibleLogicalRangeChange(schedule); } catch (_) {}
            try { ro.disconnect(); } catch (_) {}
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (rafId) cancelAnimationFrame(rafId);
        },
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    createUserPriceLines,
    createUserPriceAlerts,
    createPartialPriceLine,
    createExpiringAlerts,
};
