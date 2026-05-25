// interactions.js
// Two self-contained interaction helpers for lightweight-charts v5.2.0:
//
//   1) enableBrushZoom(chart, container, opts)
//        Alt + drag to brush-zoom a time range. Optional double Alt+click to reset.
//
//   2) createAnchoredText(chart, series, container)
//        HTML-div text labels anchored to (time, price) pairs. Labels follow the
//        anchor in pixel space as the user scrolls or zooms.
//
// Pure JS, no build step required. Designed to be dropped into the
// tradingview-ui project and imported from chart-view.js or similar.

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ensureRelativeContainer(container) {
    // The brush overlay and anchored text divs are absolutely positioned
    // relative to `container`. If the container is statically positioned the
    // overlay will escape it, so we upgrade to `position: relative`.
    const cs = window.getComputedStyle(container);
    if (cs.position === 'static' || !cs.position) {
        container.style.position = 'relative';
    }
}

function getLocalPoint(container, evt) {
    const rect = container.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
    };
}

// ---------------------------------------------------------------------------
// 1) Brush zoom
// ---------------------------------------------------------------------------

/**
 * Enable Alt+drag brush-zoom on a chart.
 *
 * @param {import('lightweight-charts').IChartApi} chart
 * @param {HTMLElement} container  Element that wraps the chart (the same
 *                                 element you passed to createChart).
 * @param {object} [opts]
 * @param {string} [opts.fill='rgba(41, 98, 255, 0.18)']    Rectangle fill.
 * @param {string} [opts.stroke='rgba(41, 98, 255, 0.9)']   Rectangle stroke.
 * @param {number} [opts.strokeWidth=1]                     Stroke width (px).
 * @param {number} [opts.minPixels=4]                       Minimum drag width
 *                                                          before we treat it
 *                                                          as a brush.
 * @param {boolean} [opts.doubleClickReset=true]            Reset zoom on
 *                                                          double Alt+click.
 * @param {number} [opts.doubleClickMs=350]                 Window for double
 *                                                          click detection.
 *
 * @returns {{ destroy: () => void }}
 */
export function enableBrushZoom(chart, container, opts = {}) {
    if (!chart || !container) {
        throw new Error('enableBrushZoom: chart and container are required');
    }

    const options = {
        fill: 'rgba(41, 98, 255, 0.18)',
        stroke: 'rgba(41, 98, 255, 0.9)',
        strokeWidth: 1,
        minPixels: 4,
        doubleClickReset: true,
        doubleClickMs: 350,
        ...opts,
    };

    ensureRelativeContainer(container);

    // Overlay div used as the brush rectangle.
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = options.fill;
    overlay.style.border = `${options.strokeWidth}px solid ${options.stroke}`;
    overlay.style.boxSizing = 'border-box';
    overlay.style.display = 'none';
    overlay.style.zIndex = '10';
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    container.appendChild(overlay);

    let dragging = false;
    let startX = 0;
    let currentX = 0;
    let lastAltClickTime = 0;

    // Snapshot of user-interaction options we override during a brush so the
    // chart doesn't try to pan while we drag. Restored on mouseup.
    let savedHandleScroll = null;

    function setBrushRect(x1, x2) {
        const left = Math.min(x1, x2);
        const width = Math.abs(x2 - x1);
        overlay.style.left = `${left}px`;
        overlay.style.top = `0px`;
        overlay.style.width = `${width}px`;
        // Stretch the rectangle vertically across the chart pane.
        overlay.style.height = `${container.clientHeight}px`;
    }

    function disableChartScrolling() {
        try {
            // Cache nothing meaningful — applyOptions accepts partial — and
            // restore by re-enabling. We don't read the current options
            // because v5 doesn't always expose them symmetrically.
            savedHandleScroll = true;
            chart.applyOptions({
                handleScroll: false,
                handleScale: false,
            });
        } catch (_) {
            savedHandleScroll = null;
        }
    }

    function restoreChartScrolling() {
        if (savedHandleScroll === null) return;
        try {
            chart.applyOptions({
                handleScroll: true,
                handleScale: true,
            });
        } catch (_) { /* noop */ }
        savedHandleScroll = null;
    }

    function onMouseDown(evt) {
        if (!evt.altKey) return;
        if (evt.button !== 0) return;
        const pt = getLocalPoint(container, evt);

        // Double-Alt+click resets the visible range.
        if (options.doubleClickReset) {
            const now = performance.now();
            if (now - lastAltClickTime < options.doubleClickMs) {
                try { chart.timeScale().resetTimeScale(); } catch (_) { /* noop */ }
                try { chart.timeScale().fitContent(); } catch (_) { /* noop */ }
                lastAltClickTime = 0;
                evt.preventDefault();
                return;
            }
            lastAltClickTime = now;
        }

        dragging = true;
        startX = pt.x;
        currentX = pt.x;
        setBrushRect(startX, currentX);
        overlay.style.display = 'block';
        disableChartScrolling();
        evt.preventDefault();
    }

    function onMouseMove(evt) {
        if (!dragging) return;
        const pt = getLocalPoint(container, evt);
        currentX = pt.x;
        setBrushRect(startX, currentX);
    }

    function onMouseUp(evt) {
        if (!dragging) return;
        dragging = false;
        overlay.style.display = 'none';
        restoreChartScrolling();

        const x1 = Math.min(startX, currentX);
        const x2 = Math.max(startX, currentX);

        if (x2 - x1 < options.minPixels) return;

        const timeScale = chart.timeScale();
        const t1 = timeScale.coordinateToTime(x1);
        const t2 = timeScale.coordinateToTime(x2);
        if (t1 == null || t2 == null) return;

        try {
            timeScale.setVisibleRange({ from: t1, to: t2 });
        } catch (_) {
            // setVisibleRange can throw if the times aren't comparable for
            // the active series type. Swallow rather than break the page.
        }
    }

    function onMouseLeave() {
        if (!dragging) return;
        dragging = false;
        overlay.style.display = 'none';
        restoreChartScrolling();
    }

    function onKeyUp(evt) {
        // If the user releases Alt mid-drag, cancel the brush so we don't
        // strand the overlay.
        if (evt.key === 'Alt' && dragging) {
            dragging = false;
            overlay.style.display = 'none';
            restoreChartScrolling();
        }
    }

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('keyup', onKeyUp);

    return {
        destroy() {
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('keyup', onKeyUp);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            restoreChartScrolling();
        },
    };
}

// ---------------------------------------------------------------------------
// 2) Anchored text labels
// ---------------------------------------------------------------------------

/**
 * Create an anchored-text manager bound to a chart + series.
 *
 * Each label is an absolutely positioned `<div>` inside `container`. When the
 * chart pans or zooms we recompute its (x, y) from the anchor's (time, price)
 * via `timeToCoordinate` and `priceToCoordinate`.
 *
 * @param {import('lightweight-charts').IChartApi} chart
 * @param {import('lightweight-charts').ISeriesApi<any>} series
 * @param {HTMLElement} container  The chart's wrapping element.
 *
 * @returns {{
 *   add: (spec: {
 *     time: any, price: number, text: string,
 *     color?: string, bg?: string, fontSize?: number, padding?: number
 *   }) => string,
 *   remove: (id: string) => void,
 *   update: (id: string, partial: object) => void,
 *   clear: () => void,
 *   destroy: () => void
 * }}
 */
export function createAnchoredText(chart, series, container) {
    if (!chart || !series || !container) {
        throw new Error('createAnchoredText: chart, series and container are required');
    }

    ensureRelativeContainer(container);

    const labels = new Map(); // id -> { spec, el }
    let nextId = 1;

    function applyStyles(el, spec) {
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.whiteSpace = 'nowrap';
        el.style.transform = 'translate(-50%, -100%)';
        el.style.padding = `${spec.padding ?? 4}px ${(spec.padding ?? 4) + 2}px`;
        el.style.borderRadius = '3px';
        el.style.fontSize = `${spec.fontSize ?? 12}px`;
        el.style.fontFamily =
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        el.style.lineHeight = '1.2';
        el.style.color = spec.color ?? '#ffffff';
        el.style.background = spec.bg ?? 'rgba(41, 98, 255, 0.9)';
        el.style.zIndex = '9';
        el.style.willChange = 'transform, left, top';
        el.style.display = 'none'; // hidden until first position pass
        el.textContent = spec.text ?? '';
    }

    function positionOne(entry) {
        const { spec, el } = entry;
        const x = chart.timeScale().timeToCoordinate(spec.time);
        const y = series.priceToCoordinate(spec.price);
        if (x == null || y == null) {
            el.style.display = 'none';
            return;
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.display = 'block';
    }

    function positionAll() {
        labels.forEach(positionOne);
    }

    // Subscribe to both events: crosshair move catches local interaction
    // updates, visible-range change catches zoom/pan + programmatic changes.
    const onCrosshair = () => positionAll();
    const onRange = () => positionAll();
    chart.subscribeCrosshairMove(onCrosshair);
    chart.timeScale().subscribeVisibleTimeRangeChange(onRange);

    // Also reposition on container resize since coordinates are pixel-based.
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => positionAll());
        resizeObserver.observe(container);
    } else {
        window.addEventListener('resize', positionAll);
    }

    return {
        add(spec) {
            if (!spec || spec.time == null || spec.price == null) {
                throw new Error('anchoredText.add: time and price are required');
            }
            const id = `at_${nextId++}`;
            const el = document.createElement('div');
            const entry = { spec: { ...spec }, el };
            applyStyles(el, entry.spec);
            container.appendChild(el);
            labels.set(id, entry);
            positionOne(entry);
            return id;
        },

        remove(id) {
            const entry = labels.get(id);
            if (!entry) return;
            if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
            labels.delete(id);
        },

        update(id, partial) {
            const entry = labels.get(id);
            if (!entry) return;
            entry.spec = { ...entry.spec, ...partial };
            applyStyles(entry.el, entry.spec);
            positionOne(entry);
        },

        clear() {
            labels.forEach(entry => {
                if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
            });
            labels.clear();
        },

        destroy() {
            try { chart.unsubscribeCrosshairMove(onCrosshair); } catch (_) { /* noop */ }
            try {
                chart.timeScale().unsubscribeVisibleTimeRangeChange(onRange);
            } catch (_) { /* noop */ }
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            } else {
                window.removeEventListener('resize', positionAll);
            }
            this.clear();
        },
    };
}
