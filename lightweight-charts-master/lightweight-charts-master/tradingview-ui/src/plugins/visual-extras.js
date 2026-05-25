// visual-extras.js — Standalone JS ports of three plugin examples for
// lightweight-charts v5.2.0:
//
//   1) attachHighlightBarCrosshair(chart, container, opts)
//      Highlights the bar under the crosshair with a vertical band drawn
//      on a canvas overlay layered above the chart container.
//      Returns: { setColor, setVisible, destroy }
//
//   2) attachBackgroundShade(chart, container)
//      Paints rectangular regions between two times with a background
//      color (e.g. recession periods). Canvas overlay, time-based.
//      Returns: { addRegion({from,to,color,label}), removeRegion(id),
//                 clear(), destroy() }
//
//   3) attachOverlayPriceScale(chart, series, opts)
//      Moves the series onto an overlay price scale and renders a
//      secondary axis with price labels (drawn on a canvas overlay so
//      it does not interfere with the chart's own axes).
//      Returns: { destroy() }
//
// All three plugins are implemented with the canvas-overlay pattern
// (the same approach used in shading.js): a positioned <canvas> child
// of the chart container, redrawn on visible-range changes and on
// resize.

// ----------------------------------------------------------------------------
// Shared CSS / DOM helpers
// ----------------------------------------------------------------------------

let _cssInjected = false;
function injectCssOnce() {
    if (_cssInjected) return;
    _cssInjected = true;
    const css = `
.lwc-vx-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 3;
}
.lwc-vx-host {
    position: relative;
}
`;
    const style = document.createElement('style');
    style.setAttribute('data-lwc-visual-extras', '');
    style.textContent = css;
    document.head.appendChild(style);
}

function ensureRelative(container) {
    const view = container.ownerDocument.defaultView || window;
    const cs = view.getComputedStyle(container);
    if (cs.position === 'static') {
        container.classList.add('lwc-vx-host');
    }
}

function makeCanvas(container, zIndex) {
    injectCssOnce();
    ensureRelative(container);
    const canvas = container.ownerDocument.createElement('canvas');
    canvas.className = 'lwc-vx-canvas';
    if (zIndex != null) canvas.style.zIndex = String(zIndex);
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

function isElementVisible(el) {
    if (!el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return true;
}

function toNumericTime(t) {
    if (t == null) return NaN;
    if (typeof t === 'number') return t;
    if (typeof t === 'string') {
        // Try ISO/date parse
        const d = Date.parse(t);
        if (!isNaN(d)) return Math.floor(d / 1000);
        const n = Number(t);
        return isNaN(n) ? NaN : n;
    }
    if (t instanceof Date) return Math.floor(t.getTime() / 1000);
    if (typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
        // BusinessDay
        const d = Date.UTC(t.year, (t.month || 1) - 1, t.day || 1);
        return Math.floor(d / 1000);
    }
    return NaN;
}

function utcSecondsToTime(s) {
    return Math.floor(s);
}

// Shared boilerplate: subscribe to range changes + ResizeObserver, returns
// an unsubscribe function.
function wireRedraw(chart, container, scheduleDraw) {
    const ts = chart.timeScale();
    const onRange = () => scheduleDraw();
    ts.subscribeVisibleTimeRangeChange(onRange);
    if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        ts.subscribeVisibleLogicalRangeChange(onRange);
    }
    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(container);
    const onWin = () => scheduleDraw();
    window.addEventListener('scroll', onWin, { passive: true, capture: true });
    window.addEventListener('resize', onWin);
    return function unsub() {
        try { ts.unsubscribeVisibleTimeRangeChange(onRange); } catch (_) {}
        if (typeof ts.unsubscribeVisibleLogicalRangeChange === 'function') {
            try { ts.unsubscribeVisibleLogicalRangeChange(onRange); } catch (_) {}
        }
        try { ro.disconnect(); } catch (_) {}
        window.removeEventListener('scroll', onWin, { capture: true });
        window.removeEventListener('resize', onWin);
    };
}

// ----------------------------------------------------------------------------
// 1) Highlight bar crosshair
// ----------------------------------------------------------------------------

export function attachHighlightBarCrosshair(chart, container, opts = {}) {
    if (!chart || !container) {
        throw new Error('attachHighlightBarCrosshair: chart and container required');
    }
    let color = opts.color || 'rgba(0, 0, 0, 0.2)';
    let visible = opts.visible !== false;

    // Try to disable the chart's own vertical crosshair line (so the
    // band replaces it). Failures here are non-fatal — the band still
    // draws correctly when the chart line is shown.
    try {
        chart.applyOptions({
            crosshair: {
                vertLine: { visible: false },
            },
        });
    } catch (_) { /* ignore */ }

    const canvas = makeCanvas(container, 3);
    const ctx = canvas.getContext('2d');

    // State updated by the crosshair-move handler.
    let lastX = 0;
    let lastVisible = false;
    let barSpacing = 6;

    let rafHandle = 0;
    function scheduleDraw() {
        if (rafHandle) return;
        rafHandle = requestAnimationFrame(() => {
            rafHandle = 0;
            draw();
        });
    }

    function computeBarSpacing() {
        try {
            const ts = chart.timeScale();
            const vlr = ts.getVisibleLogicalRange();
            if (!vlr) return 6;
            const span = vlr.to - vlr.from;
            if (!isFinite(span) || span <= 0) return 6;
            return ts.width() / span;
        } catch (_) {
            return 6;
        }
    }

    function draw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (!visible || !lastVisible) return;
        if (!isElementVisible(container)) return;

        const bs = Math.max(1, barSpacing);
        // Match the original plugin's "positionsLine" pixel snapping:
        // center the band on x with width = floor(bs).
        const width = Math.max(1, Math.floor(bs));
        const x = Math.round(lastX) - Math.floor(width / 2);
        ctx.fillStyle = color;
        ctx.fillRect(x, 0, width, h);
    }

    function onMove(param) {
        const logical = param && param.logical;
        if (logical == null || logical === undefined) {
            lastVisible = false;
            scheduleDraw();
            return;
        }
        try {
            const ts = chart.timeScale();
            const coord = ts.logicalToCoordinate(logical);
            if (coord == null) {
                lastVisible = false;
            } else {
                lastX = coord;
                lastVisible = true;
                barSpacing = computeBarSpacing();
            }
        } catch (_) {
            lastVisible = false;
        }
        scheduleDraw();
    }

    chart.subscribeCrosshairMove(onMove);
    const unsubRedraw = wireRedraw(chart, container, scheduleDraw);
    scheduleDraw();

    return {
        setColor(c) {
            if (typeof c === 'string' && c) {
                color = c;
                scheduleDraw();
            }
        },
        setVisible(v) {
            visible = !!v;
            scheduleDraw();
        },
        destroy() {
            if (rafHandle) cancelAnimationFrame(rafHandle);
            try { chart.unsubscribeCrosshairMove(onMove); } catch (_) {}
            unsubRedraw();
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
    };
}

// ----------------------------------------------------------------------------
// 2) Background shade (regions between two times)
// ----------------------------------------------------------------------------

export function attachBackgroundShade(chart, container) {
    if (!chart || !container) {
        throw new Error('attachBackgroundShade: chart and container required');
    }

    const canvas = makeCanvas(container, 1); // below crosshair-highlight
    const ctx = canvas.getContext('2d');

    const regions = new Map(); // id -> { id, from, to, color, label }
    let nextId = 1;

    let rafHandle = 0;
    function scheduleDraw() {
        if (rafHandle) return;
        rafHandle = requestAnimationFrame(() => {
            rafHandle = 0;
            draw();
        });
    }

    function coordinateForTime(ts, tSec, fallbackSec) {
        // Try the original time first, then a clamped fallback inside
        // the visible range — keeps the band reaching the screen edge
        // when one endpoint lies outside the data domain.
        let x = ts.timeToCoordinate(utcSecondsToTime(tSec));
        if (x == null && fallbackSec != null) {
            x = ts.timeToCoordinate(utcSecondsToTime(fallbackSec));
        }
        return x;
    }

    function draw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (regions.size === 0) return;
        if (!isElementVisible(container)) return;

        const ts = chart.timeScale();
        const range = ts.getVisibleRange();
        if (!range) return;
        const fromSec = typeof range.from === 'number' ? range.from : Number(range.from);
        const toSec = typeof range.to === 'number' ? range.to : Number(range.to);
        if (!isFinite(fromSec) || !isFinite(toSec) || toSec <= fromSec) return;

        for (const r of regions.values()) {
            let a = toNumericTime(r.from);
            let b = toNumericTime(r.to);
            if (!isFinite(a) || !isFinite(b)) continue;
            if (b < a) { const tmp = a; a = b; b = tmp; }
            // Skip regions wholly outside the visible window.
            if (b < fromSec || a > toSec) continue;

            const clampA = Math.max(a, fromSec);
            const clampB = Math.min(b, toSec);
            const xa = coordinateForTime(ts, a, clampA);
            const xb = coordinateForTime(ts, b, clampB);
            if (xa == null || xb == null) continue;

            const x = Math.min(xa, xb);
            const width = Math.max(1, Math.abs(xb - xa));

            ctx.fillStyle = r.color || 'rgba(255, 200, 100, 0.15)';
            ctx.fillRect(x, 0, width, h);

            if (r.label) {
                ctx.save();
                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                const padX = 4, padY = 2;
                const metrics = ctx.measureText(r.label);
                const textW = Math.ceil(metrics.width);
                const textH = 12;
                const boxW = textW + padX * 2;
                const boxH = textH + padY * 2;
                let bx = x + Math.max(0, (width - boxW) / 2);
                if (bx < 2) bx = 2;
                if (bx + boxW > w - 2) bx = Math.max(2, w - 2 - boxW);
                const by = 4;
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillRect(bx, by, boxW, boxH);
                ctx.fillStyle = '#fff';
                ctx.textBaseline = 'top';
                ctx.fillText(r.label, bx + padX, by + padY);
                ctx.restore();
            }
        }
    }

    const unsubRedraw = wireRedraw(chart, container, scheduleDraw);
    scheduleDraw();

    return {
        addRegion(spec) {
            if (!spec || spec.from == null || spec.to == null) {
                throw new Error('addRegion: {from, to} required');
            }
            const id = spec.id != null ? String(spec.id) : 'bg_' + (nextId++);
            regions.set(id, {
                id,
                from: spec.from,
                to: spec.to,
                color: spec.color,
                label: spec.label,
            });
            scheduleDraw();
            return id;
        },
        removeRegion(id) {
            const ok = regions.delete(String(id));
            if (ok) scheduleDraw();
            return ok;
        },
        clear() {
            if (regions.size === 0) return;
            regions.clear();
            scheduleDraw();
        },
        destroy() {
            if (rafHandle) cancelAnimationFrame(rafHandle);
            unsubRedraw();
            regions.clear();
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
    };
}

// ----------------------------------------------------------------------------
// 3) Overlay price scale
// ----------------------------------------------------------------------------
//
// Strategy: move the series onto an overlay scale (priceScaleId set to a
// non-empty id that does not equal 'left' or 'right'), then draw a
// canvas-based price axis on top of the chart. We sample y coordinates
// every `tickSpacing` pixels and convert each to a price via
// series.coordinateToPrice(), formatted with series.priceFormatter().

const _OPS_DEFAULTS = {
    side: 'left',                     // 'left' | 'right'
    textColor: '#d1d4dc',
    backgroundColor: 'rgba(20, 24, 32, 0.75)',
    priceScaleId: '',                 // auto-generated if empty
    tickSpacing: 40,
    fontSize: 11,
    sideMargin: 8,
    radius: 4,
};

let _opsCounter = 0;

export function attachOverlayPriceScale(chart, series, opts = {}) {
    if (!chart || !series || !container_arg_present(arguments)) {
        // Container is optional — try the chart container via series.chart.
    }
    if (!chart || !series) {
        throw new Error('attachOverlayPriceScale: chart and series required');
    }
    const options = Object.assign({}, _OPS_DEFAULTS, opts || {});
    if (!options.priceScaleId) {
        options.priceScaleId = 'overlay_' + (++_opsCounter);
    }

    // The chart container: the only reliable way to overlay canvases is
    // to use the DOM element the chart was created against. Accept it
    // via opts.container, else infer from chart.chartElement() (v5 API).
    let container = opts.container || null;
    if (!container && typeof chart.chartElement === 'function') {
        try { container = chart.chartElement(); } catch (_) {}
    }
    if (!container) {
        throw new Error('attachOverlayPriceScale: container required (pass opts.container or use a chart whose chartElement() is available)');
    }

    // Save prior series options we may need to restore on destroy.
    let prevPriceScaleId = null;
    try {
        const so = series.options();
        prevPriceScaleId = so && so.priceScaleId != null ? so.priceScaleId : null;
    } catch (_) {}

    // Move the series onto the overlay scale.
    try {
        series.applyOptions({ priceScaleId: options.priceScaleId });
    } catch (e) {
        throw new Error('attachOverlayPriceScale: failed to set priceScaleId — ' + e.message);
    }

    // Make sure the overlay scale itself is configured (visible, has margins).
    try {
        chart.priceScale(options.priceScaleId).applyOptions({
            visible: false,        // hide native axis — we draw our own
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });
    } catch (_) { /* ignore — older versions may behave differently */ }

    const canvas = makeCanvas(container, 4);
    const ctx = canvas.getContext('2d');

    let rafHandle = 0;
    function scheduleDraw() {
        if (rafHandle) return;
        rafHandle = requestAnimationFrame(() => {
            rafHandle = 0;
            draw();
        });
    }

    function computeLabels(height) {
        const labels = [];
        const tickSpacing = Math.max(10, options.tickSpacing);
        const halfTick = Math.round(tickSpacing / 4);
        let formatter = null;
        try { formatter = series.priceFormatter(); } catch (_) {}

        for (let y = halfTick; y <= height - halfTick; y += tickSpacing) {
            let price = null;
            try { price = series.coordinateToPrice(y); } catch (_) {}
            if (price == null || !isFinite(price)) continue;
            let text;
            if (formatter && typeof formatter.format === 'function') {
                try { text = formatter.format(price); } catch (_) { text = String(price); }
            } else {
                text = String(price);
            }
            labels.push({ y, text });
        }
        return labels;
    }

    function draw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (!isElementVisible(container)) return;

        const labels = computeLabels(h);
        if (labels.length === 0) return;

        const fontSize = options.fontSize;
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const padX = 4, padY = 2;
        const isLeft = options.side === 'left';

        // Width = widest label.
        let maxTextW = 0;
        for (const l of labels) {
            const m = ctx.measureText(l.text);
            if (m.width > maxTextW) maxTextW = m.width;
        }
        const boxW = Math.ceil(maxTextW) + padX * 2;
        const boxH = fontSize + padY * 2;

        const x = isLeft
            ? options.sideMargin
            : w - options.sideMargin - boxW;

        const radius = options.radius;

        for (const l of labels) {
            const by = Math.round(l.y - boxH / 2);
            // Rounded rect (supports browsers without ctx.roundRect).
            drawRoundedRect(ctx, x, by, boxW, boxH, radius);
            ctx.fillStyle = options.backgroundColor;
            ctx.fill();
            ctx.fillStyle = options.textColor;
            ctx.fillText(l.text, x + padX, by + padY);
        }
    }

    const unsubRedraw = wireRedraw(chart, container, scheduleDraw);
    scheduleDraw();

    let destroyed = false;
    return {
        destroy() {
            if (destroyed) return;
            destroyed = true;
            if (rafHandle) cancelAnimationFrame(rafHandle);
            unsubRedraw();
            // Restore previous priceScaleId if we knew it.
            if (prevPriceScaleId != null) {
                try { series.applyOptions({ priceScaleId: prevPriceScaleId }); } catch (_) {}
            }
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
    };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Helper used by attachOverlayPriceScale to be defensive about its
// arguments object (the rest of the file uses plain parameters).
function container_arg_present(args) {
    return args && args.length >= 3;
}

export default {
    attachHighlightBarCrosshair,
    attachBackgroundShade,
    attachOverlayPriceScale,
};
