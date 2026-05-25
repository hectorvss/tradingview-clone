// shading.js — Canvas overlays for lightweight-charts v5.2.0
// Exports:
//   createSessionShading(chart, container, opts)
//   createVerticalLines(chart, series, container)
//
// Both plugins use a positioned <canvas> overlay layered above the chart
// container. Coordinates come from chart.timeScale().timeToCoordinate(time),
// and redraws are triggered by visible-range changes plus a ResizeObserver
// that keeps the canvas in sync with the container's box.

let _cssInjected = false;
function injectCssOnce() {
    if (_cssInjected) return;
    _cssInjected = true;
    const css = `
.lwc-overlay-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
}
.lwc-overlay-host {
    position: relative;
}
`;
    const style = document.createElement('style');
    style.setAttribute('data-lwc-overlay', '');
    style.textContent = css;
    document.head.appendChild(style);
}

// ---------- internals ----------

function ensureRelative(container) {
    const cs = container.ownerDocument.defaultView.getComputedStyle(container);
    if (cs.position === 'static') {
        container.classList.add('lwc-overlay-host');
    }
}

function makeCanvas(container) {
    injectCssOnce();
    ensureRelative(container);
    const canvas = container.ownerDocument.createElement('canvas');
    canvas.className = 'lwc-overlay-canvas';
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
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom < 0 || rect.top > vh) return false;
    if (rect.right < 0 || rect.left > vw) return false;
    return true;
}

// Convert a Date/UTC seconds to a chart "time" (seconds since epoch — the
// numeric form lightweight-charts accepts for non-business-day series).
function utcSecondsToTime(s) {
    return Math.floor(s);
}

// ---------- 1) Session shading ----------

const DEFAULT_SESSIONS = [
    { id: 'asia',   name: 'Asia',   startH: 0,    endH: 8,    color: 'rgba(33,150,243,0.06)' },
    { id: 'europe', name: 'Europe', startH: 7,    endH: 16,   color: 'rgba(255,193,7,0.06)' },
    { id: 'us',     name: 'US',     startH: 13.5, endH: 20,   color: 'rgba(76,175,80,0.06)' },
];

export function createSessionShading(chart, container, opts = {}) {
    if (!chart || !container) throw new Error('createSessionShading: chart and container required');

    let sessions = (opts.sessions && opts.sessions.length ? opts.sessions : DEFAULT_SESSIONS).slice();
    let visible = opts.visible !== false;

    const canvas = makeCanvas(container);
    const ctx = canvas.getContext('2d');

    let rafHandle = 0;
    function scheduleDraw() {
        if (rafHandle) return;
        rafHandle = requestAnimationFrame(() => {
            rafHandle = 0;
            draw();
        });
    }

    function draw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (!visible) return;
        if (!isElementVisible(container)) return;

        const ts = chart.timeScale();
        const range = ts.getVisibleRange();
        if (!range) return;

        const fromSec = typeof range.from === 'number' ? range.from : Number(range.from);
        const toSec = typeof range.to === 'number' ? range.to : Number(range.to);
        if (!isFinite(fromSec) || !isFinite(toSec) || toSec <= fromSec) return;

        const DAY = 86400;
        // Anchor: start of UTC day containing fromSec, step back one day to
        // catch sessions that began before the visible range.
        const firstDayStart = Math.floor(fromSec / DAY) * DAY - DAY;
        const lastDayStart  = Math.floor(toSec   / DAY) * DAY + DAY;

        for (const s of sessions) {
            const startOff = Math.round((s.startH || 0) * 3600);
            const endOff   = Math.round((s.endH   || 0) * 3600);
            if (endOff <= startOff) continue;
            ctx.fillStyle = s.color || 'rgba(255,255,255,0.04)';

            for (let day = firstDayStart; day <= lastDayStart; day += DAY) {
                const sStart = day + startOff;
                const sEnd   = day + endOff;
                // Skip bands wholly outside the visible window.
                if (sEnd < fromSec || sStart > toSec) continue;

                const xa = ts.timeToCoordinate(utcSecondsToTime(sStart));
                const xb = ts.timeToCoordinate(utcSecondsToTime(sEnd));
                if (xa == null && xb == null) continue;

                // Clamp endpoints that fall outside the data range — fall
                // back to the visible-range edges so the band reaches them.
                const fromX = xa != null
                    ? xa
                    : ts.timeToCoordinate(utcSecondsToTime(Math.max(sStart, fromSec)));
                const toX = xb != null
                    ? xb
                    : ts.timeToCoordinate(utcSecondsToTime(Math.min(sEnd, toSec)));
                if (fromX == null || toX == null) continue;

                const x = Math.min(fromX, toX);
                const width = Math.max(1, Math.abs(toX - fromX));
                ctx.fillRect(x, 0, width, h);
            }
        }
    }

    const ts = chart.timeScale();
    const onRange = () => scheduleDraw();
    ts.subscribeVisibleTimeRangeChange(onRange);
    if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        ts.subscribeVisibleLogicalRangeChange(onRange);
    }

    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(container);

    const onScroll = () => scheduleDraw();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);

    scheduleDraw();

    return {
        setSessions(arr) {
            if (!Array.isArray(arr)) return;
            sessions = arr.slice();
            scheduleDraw();
        },
        setVisible(v) {
            visible = !!v;
            scheduleDraw();
        },
        redraw: scheduleDraw,
        destroy() {
            if (rafHandle) cancelAnimationFrame(rafHandle);
            try { ts.unsubscribeVisibleTimeRangeChange(onRange); } catch (_) {}
            if (typeof ts.unsubscribeVisibleLogicalRangeChange === 'function') {
                try { ts.unsubscribeVisibleLogicalRangeChange(onRange); } catch (_) {}
            }
            try { ro.disconnect(); } catch (_) {}
            window.removeEventListener('scroll', onScroll, { capture: true });
            window.removeEventListener('resize', onScroll);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
    };
}

// ---------- 2) Vertical lines ----------

const LINE_STYLE = {
    solid: [],
    dashed: [6, 4],
    dotted: [2, 3],
};

export function createVerticalLines(chart, series, container) {
    if (!chart || !container) throw new Error('createVerticalLines: chart and container required');

    const canvas = makeCanvas(container);
    const ctx = canvas.getContext('2d');

    const lines = new Map(); // id -> line spec
    let nextId = 1;

    let rafHandle = 0;
    function scheduleDraw() {
        if (rafHandle) return;
        rafHandle = requestAnimationFrame(() => {
            rafHandle = 0;
            draw();
        });
    }

    function draw() {
        const { w, h, dpr } = syncCanvasSize(canvas, container);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (!isElementVisible(container)) return;
        if (lines.size === 0) return;

        const ts = chart.timeScale();

        for (const line of lines.values()) {
            const t = typeof line.time === 'number' ? line.time : Number(line.time);
            if (!isFinite(t)) continue;

            const x = ts.timeToCoordinate(utcSecondsToTime(t));
            if (x == null) continue;          // off-screen
            if (x < -2 || x > w + 2) continue; // outside canvas

            const color = line.color || 'rgba(255,255,255,0.6)';
            const lineWidth = Math.max(1, line.lineWidth || 1);
            const dash = LINE_STYLE[line.lineStyle] || LINE_STYLE.solid;

            ctx.save();
            ctx.beginPath();
            ctx.setLineDash(dash);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            // Crisp 1px lines: align to half-pixel.
            const px = Math.round(x) + (lineWidth % 2 === 1 ? 0.5 : 0);
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();
            ctx.restore();

            if (line.label) {
                const pos = line.labelPosition === 'bottom' ? 'bottom' : 'top';
                ctx.save();
                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                const padX = 4, padY = 2;
                const metrics = ctx.measureText(line.label);
                const textW = Math.ceil(metrics.width);
                const textH = 12;
                const boxW = textW + padX * 2;
                const boxH = textH + padY * 2;
                let bx = Math.round(x) - boxW / 2;
                if (bx < 2) bx = 2;
                if (bx + boxW > w - 2) bx = w - 2 - boxW;
                const by = pos === 'top' ? 2 : h - boxH - 2;
                ctx.fillStyle = color;
                ctx.fillRect(bx, by, boxW, boxH);
                ctx.fillStyle = '#0b0e11';
                ctx.textBaseline = 'top';
                ctx.fillText(line.label, bx + padX, by + padY);
                ctx.restore();
            }
        }
    }

    const ts = chart.timeScale();
    const onRange = () => scheduleDraw();
    ts.subscribeVisibleTimeRangeChange(onRange);
    if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        ts.subscribeVisibleLogicalRangeChange(onRange);
    }

    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(container);

    const onScroll = () => scheduleDraw();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);

    scheduleDraw();

    return {
        addLine(spec) {
            if (!spec || spec.time == null) throw new Error('addLine: time required');
            const id = spec.id != null ? String(spec.id) : 'vl_' + (nextId++);
            lines.set(id, {
                id,
                time: spec.time,
                color: spec.color,
                lineWidth: spec.lineWidth,
                lineStyle: spec.lineStyle,    // 'solid' | 'dashed' | 'dotted'
                label: spec.label,
                labelPosition: spec.labelPosition,
            });
            scheduleDraw();
            return id;
        },
        removeLine(id) {
            const ok = lines.delete(String(id));
            if (ok) scheduleDraw();
            return ok;
        },
        getLines() {
            return Array.from(lines.values());
        },
        clear() {
            lines.clear();
            scheduleDraw();
        },
        redraw: scheduleDraw,
        destroy() {
            if (rafHandle) cancelAnimationFrame(rafHandle);
            try { ts.unsubscribeVisibleTimeRangeChange(onRange); } catch (_) {}
            if (typeof ts.unsubscribeVisibleLogicalRangeChange === 'function') {
                try { ts.unsubscribeVisibleLogicalRangeChange(onRange); } catch (_) {}
            }
            try { ro.disconnect(); } catch (_) {}
            window.removeEventListener('scroll', onScroll, { capture: true });
            window.removeEventListener('resize', onScroll);
            lines.clear();
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        },
    };
}

export default { createSessionShading, createVerticalLines };
