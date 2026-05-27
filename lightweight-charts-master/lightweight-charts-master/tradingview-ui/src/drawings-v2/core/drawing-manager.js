// drawings-v2/core/drawing-manager.js
// DrawingManagerV2 — successor to the legacy drawing-system.js manager.
//
// Spec-side opt-ins (read by this manager):
//   spec.renderMode      : 'svg' | 'canvas' | 'auto'  (default 'svg'; 'auto' picks
//                          canvas when an estimated element count > 50)
//   spec.estimateElements?: () => number              (optional; for 'auto')
//   spec.renderCanvas?(ctx2d, ctx)                    (canvas renderer if used)
//
// Browser singleton diagnostic:
//   window.__tvDrawingsProfile()   -> { drawings, svgNodes, avgFrameMs, dirty }
//
// This file is self-contained: it only depends on drawing-loader, render-cache,
// settings-generator and behaviors (siblings).

import { SPEC_REGISTRY, instantiate } from './drawing-loader.js';
import { RenderCache, computeViewKey } from './render-cache.js';
import { buildSettingsDialog } from './settings-generator.js';
import { ensureDrawingCss } from './behaviors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_STORAGE_KEY = 'tv.drawings_v3';
const HANDLE_HIT_RADIUS = 8;
const COMPLEX_ELEMENT_THRESHOLD = 50;
// Predictive drag: how much (0..1) of the smoothed velocity to add to the
// instantaneous pointer position. Kept small to avoid overshoot.
const DRAG_PREDICT_FACTOR = 0.18;
const DRAG_VEL_SMOOTH = 0.35;

export class DrawingManagerV2 {
    constructor(chart, series, container, opts = {}) {
        this.chart = chart;
        this.series = series;
        this.container = container;
        this.storageKey = opts.storageKey || DEFAULT_STORAGE_KEY;
        this.getCandles = typeof opts.getCandles === 'function' ? opts.getCandles : () => [];
        this.magnetMode = opts.magnetMode || (typeof localStorage !== 'undefined' ? localStorage.getItem('tv.magnetMode') : null) || 'off';

        ensureDrawingCss();

        // State
        this.drawings = [];               // ordered (low z first)
        this.activeTool = null;           // type id of tool being placed
        this.activeOpts = null;           // options to apply on creation
        this._creationPoints = [];        // accumulated points while placing
        this._creationDrawing = null;     // in-progress drawing
        this.selectedId = null;
        this.hoveredId = null;
        this.draggingHandle = null;       // { id, handleIdx, magnet, lastPoint, vel }
        this.draggingBody = null;         // { id, startMouse, startPoints, vel }
        this._settingsHandle = null;
        this._ghostNode = null;           // semi-transparent original during drag
        this._snapIndicatorNode = null;   // pulsing snap target visual
        this._hintBanner = null;
        this._contextMenu = null;
        // single drawing fast-path (during handle/body drag)
        this._singleDrawingMode = null;   // drawing id when active
        // predictive RAF interpolation for drags
        this._pendingDragTarget = null;   // { x, y } latest pointer
        this._dragRaf = 0;

        // Caches
        this.cache = new RenderCache();
        this._rafHandle = 0;
        this._lastViewKey = null;

        // Build SVG overlay (+ optional canvas overlay)
        this._buildOverlay();

        // Bind handlers (so we can remove them)
        this._onSvgMouseDown = this._onSvgMouseDown.bind(this);
        this._onSvgMouseMove = this._onSvgMouseMove.bind(this);
        this._onSvgMouseUp = this._onSvgMouseUp.bind(this);
        this._onSvgContextMenu = this._onSvgContextMenu.bind(this);
        this._onDocMouseDown = this._onDocMouseDown.bind(this);
        this._onDocKeyDown = this._onDocKeyDown.bind(this);
        this._onChartClick = this._onChartClick.bind(this);
        this._onCrosshairMove = this._onCrosshairMove.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onPointerRawUpdate = this._onPointerRawUpdate.bind(this);

        // Wire
        this.svg.addEventListener('mousedown', this._onSvgMouseDown);
        this.svg.addEventListener('mousemove', this._onSvgMouseMove);
        // pointerrawupdate gives sub-frame pointer events on browsers that support it.
        this.svg.addEventListener('pointerrawupdate', this._onPointerRawUpdate);
        this.svg.addEventListener('contextmenu', this._onSvgContextMenu);
        window.addEventListener('mouseup', this._onSvgMouseUp);
        document.addEventListener('mousedown', this._onDocMouseDown, true);
        document.addEventListener('keydown', this._onDocKeyDown);

        try { this.chart.subscribeClick(this._onChartClick); } catch (e) {}
        try { this.chart.subscribeCrosshairMove(this._onCrosshairMove); } catch (e) {}

        // CRITICAL: re-render drawings when chart pans/zooms so they stay anchored to time+price.
        // Without these subscriptions, drawings appear pinned to pixel positions and don't follow
        // the candles when user scrolls/zooms/changes timeframe.
        this._onChartViewChange = () => {
            // Mark all drawings dirty so they reproject from (time, price) → (x, y)
            try { this.cache?.markAllDirty?.(); } catch {}
            // Re-measure plot area in case the price scale changed width
            try { this._resizePlotArea?.(); } catch {}
            // Force viewKey invalidation so render() re-projects everything
            this._lastViewKey = null;
            this._scheduleRender();
        };
        try {
            const ts = this.chart.timeScale();
            ts.subscribeVisibleTimeRangeChange(this._onChartViewChange);
            this._unsubTimeRange = () => { try { ts.unsubscribeVisibleTimeRangeChange(this._onChartViewChange); } catch {} };
            if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
                ts.subscribeVisibleLogicalRangeChange(this._onChartViewChange);
                this._unsubLogical = () => { try { ts.unsubscribeVisibleLogicalRangeChange(this._onChartViewChange); } catch {} };
            }
        } catch (e) { console.warn('[DrawingManagerV2] time range subscribe failed', e); }
        // Some chart versions expose a generic size-change subscription too
        try {
            if (typeof this.chart.subscribeChartSizeChange === 'function') {
                this.chart.subscribeChartSizeChange(this._onChartViewChange);
                this._unsubSize = () => { try { this.chart.unsubscribeChartSizeChange(this._onChartViewChange); } catch {} };
            } else if (typeof this.chart.subscribeSizeChange === 'function') {
                this.chart.subscribeSizeChange(this._onChartViewChange);
                this._unsubSize = () => { try { this.chart.unsubscribeSizeChange(this._onChartViewChange); } catch {} };
            }
        } catch {}
        // Also listen to price-scale changes (price axis may rescale on logarithmic toggle etc.)
        try {
            const ps = this.series?.priceScale?.();
            if (ps && typeof ps.subscribePriceScaleChanged === 'function') {
                ps.subscribePriceScaleChanged(this._onChartViewChange);
                this._unsubPriceScale = () => { try { ps.unsubscribePriceScaleChanged(this._onChartViewChange); } catch {} };
            }
        } catch {}

        // Observe resize
        if (typeof ResizeObserver !== 'undefined') {
            this._ro = new ResizeObserver(this._onResize);
            try { this._ro.observe(this.container); } catch (e) {}
        }

        // Profile hook (browser only — single instance wins)
        if (typeof window !== 'undefined') {
            window.__tvDrawingsProfile = () => this.profile();
        }

        // First sizing + render
        try { this._resizePlotArea(); } catch {}
        this._scheduleRender();
    }

    // ========================================================================
    // SVG overlay (+ optional canvas)
    // ========================================================================
    _buildOverlay() {
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }
        this.svg = document.createElementNS(SVG_NS, 'svg');
        this.svg.setAttribute('class', 'dmgr-v2-svg');
        this.svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:visible';
        const defs = document.createElementNS(SVG_NS, 'defs');
        const clip = document.createElementNS(SVG_NS, 'clipPath');
        clip.setAttribute('id', 'dmgr-v2-clip');
        const clipRect = document.createElementNS(SVG_NS, 'rect');
        clipRect.setAttribute('x', '0'); clipRect.setAttribute('y', '0');
        clipRect.setAttribute('width', '100%'); clipRect.setAttribute('height', '100%');
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        this.svg.appendChild(defs);
        this._clipRect = clipRect;

        // Order: drawings (SVG) -> ghost -> handles -> preview -> snap
        this._drawingsRoot = document.createElementNS(SVG_NS, 'g');
        this._drawingsRoot.setAttribute('clip-path', 'url(#dmgr-v2-clip)');
        this._drawingsRoot.setAttribute('class', 'dmgr-v2-drawings');
        this._drawingsRoot.style.pointerEvents = 'auto';
        this.svg.appendChild(this._drawingsRoot);

        this._ghostRoot = document.createElementNS(SVG_NS, 'g');
        this._ghostRoot.setAttribute('class', 'dmgr-v2-ghost-root');
        this._ghostRoot.style.pointerEvents = 'none';
        this.svg.appendChild(this._ghostRoot);

        this._handlesRoot = document.createElementNS(SVG_NS, 'g');
        this._handlesRoot.setAttribute('class', 'dmgr-v2-handles');
        this._handlesRoot.style.pointerEvents = 'auto';
        this.svg.appendChild(this._handlesRoot);

        this._previewRoot = document.createElementNS(SVG_NS, 'g');
        this._previewRoot.setAttribute('class', 'dmgr-v2-preview');
        this._previewRoot.style.pointerEvents = 'none';
        this.svg.appendChild(this._previewRoot);

        this._snapRoot = document.createElementNS(SVG_NS, 'g');
        this._snapRoot.setAttribute('class', 'dmgr-v2-snap');
        this._snapRoot.style.pointerEvents = 'none';
        this.svg.appendChild(this._snapRoot);

        this.container.appendChild(this.svg);

        // Canvas overlay (created lazily on first complex drawing)
        this.canvas = null;
        this._canvasCtx = null;
    }

    _ensureCanvas() {
        if (this.canvas) return;
        const c = document.createElement('canvas');
        c.className = 'dmgr-v2-canvas';
        c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:4';
        this.container.appendChild(c);
        this.canvas = c;
        this._canvasCtx = c.getContext('2d');
        this._resizeCanvas();
    }

    _resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        if (this._canvasCtx && this._canvasCtx.setTransform) {
            this._canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================
    activate(typeId, opts) {
        if (!SPEC_REGISTRY[typeId]) {
            console.warn(`[drawings-v2] unknown tool: ${typeId}`);
            return;
        }
        this.cancel();
        this.activeTool = typeId;
        this.activeOpts = opts || null;
        this._creationPoints = [];
        this._creationDrawing = null;
        this.container.style.cursor = 'crosshair';
        this.container.classList.add('dmgr-v2-tool-active');
        const spec = SPEC_REGISTRY[typeId].spec || {};
        const needed = spec.pointsRequired || 2;
        this._showHint(spec.label || typeId, 0, needed);
    }

    cancel() {
        this.activeTool = null;
        this.activeOpts = null;
        this._creationPoints = [];
        this._creationDrawing = null;
        this.container.style.cursor = '';
        this.container.classList.remove('dmgr-v2-tool-active');
        this._clearPreview();
        this._hideHint();
        this.setSelected(null);
    }

    add(drawing) {
        if (!drawing) return null;
        if (!Number.isFinite(drawing.zIndex) || drawing.zIndex === 0) {
            drawing.zIndex = this._nextZIndex();
        }
        this.drawings.push(drawing);
        drawing._dirty = true;
        this._scheduleRender();
        this.saveToStorage();
        return drawing;
    }

    remove(id) {
        const i = this.drawings.findIndex(d => d.id === id);
        if (i === -1) return false;
        this.drawings.splice(i, 1);
        if (this.selectedId === id) this.setSelected(null);
        if (this.hoveredId === id) this.hoveredId = null;
        this.cache.markAllDirty();
        this._scheduleRender();
        this.saveToStorage();
        return true;
    }

    removeAll() {
        this.drawings = [];
        this.setSelected(null);
        this.hoveredId = null;
        this.cache.clear();
        this._scheduleRender();
        this.saveToStorage();
    }

    list() { return this.drawings.slice(); }

    getSelected() {
        if (!this.selectedId) return null;
        return this.drawings.find(d => d.id === this.selectedId) || null;
    }

    setSelected(id) {
        const prev = this.selectedId;
        this.selectedId = id || null;
        if (prev !== this.selectedId) {
            if (this._settingsHandle && (!this.selectedId)) {
                try { this._settingsHandle.close(); } catch (e) {}
                this._settingsHandle = null;
            }
            if (this.selectedId) this._openSettingsForSelected();
            this._scheduleRender();
        }
    }

    // ---- Z-order API --------------------------------------------------------
    _nextZIndex() {
        let max = 0;
        for (let i = 0; i < this.drawings.length; i++) {
            const z = this.drawings[i].zIndex || 0;
            if (z > max) max = z;
        }
        return max + 1;
    }
    bringToFront(id) {
        const d = this.drawings.find(x => x.id === id); if (!d) return;
        d.zIndex = this._nextZIndex();
        this.cache.markAllDirty(); this._scheduleRender(); this.saveToStorage();
    }
    sendToBack(id) {
        const d = this.drawings.find(x => x.id === id); if (!d) return;
        let min = 0;
        for (let i = 0; i < this.drawings.length; i++) {
            const z = this.drawings[i].zIndex || 0;
            if (z < min) min = z;
        }
        d.zIndex = min - 1;
        this.cache.markAllDirty(); this._scheduleRender(); this.saveToStorage();
    }
    raise(id) {
        const d = this.drawings.find(x => x.id === id); if (!d) return;
        d.zIndex = (d.zIndex || 0) + 1;
        this.cache.markAllDirty(); this._scheduleRender(); this.saveToStorage();
    }
    lower(id) {
        const d = this.drawings.find(x => x.id === id); if (!d) return;
        d.zIndex = (d.zIndex || 0) - 1;
        this.cache.markAllDirty(); this._scheduleRender(); this.saveToStorage();
    }

    loadFromStorage() {
        if (typeof localStorage === 'undefined') return;
        let raw = null;
        try { raw = localStorage.getItem(this.storageKey); } catch (e) { return; }
        if (!raw) return;
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { return; }
        if (!parsed) return;
        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.drawings) ? parsed.drawings : []);

        const loaded = [];
        list.forEach(data => {
            try {
                if (!data || typeof data !== 'object') return;
                if (data.schemaVersion && data.schemaVersion >= 2 && data.type && SPEC_REGISTRY[data.type]) {
                    const inst = instantiate(data.type, data);
                    if (inst) { inst._committed = true; loaded.push(inst); }
                    return;
                }
                const migrated = this._migrateLegacy(data);
                if (migrated) loaded.push(migrated);
            } catch (e) {
                console.warn('[drawings-v2] skipped corrupt drawing during load', e);
            }
        });
        this.drawings = loaded;
        this.cache.clear();
        this._scheduleRender();
    }

    _migrateLegacy(data) {
        if (!data.type || !SPEC_REGISTRY[data.type]) return null;
        try {
            const inst = instantiate(data.type, {
                id: data.id,
                points: data.points || data.anchors || [],
                options: data.options || data.style || {},
                zIndex: data.zIndex,
                locked: !!data.locked,
            });
            if (inst) { inst._committed = true; return inst; }
        } catch (e) { /* fall through */ }
        return null;
    }

    saveToStorage() {
        if (typeof localStorage === 'undefined') return;
        try {
            const payload = this.drawings
                .filter(d => d._committed !== false)
                .map(d => d.serialize());
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('[drawings-v2] saveToStorage failed', e);
        }
    }

    destroy() {
        if (this._rafHandle) { cancelAnimationFrame(this._rafHandle); this._rafHandle = 0; }
        if (this._dragRaf) { cancelAnimationFrame(this._dragRaf); this._dragRaf = 0; }
        try { this.svg.removeEventListener('mousedown', this._onSvgMouseDown); } catch (e) {}
        try { this.svg.removeEventListener('mousemove', this._onSvgMouseMove); } catch (e) {}
        try { this.svg.removeEventListener('pointerrawupdate', this._onPointerRawUpdate); } catch (e) {}
        try { this.svg.removeEventListener('contextmenu', this._onSvgContextMenu); } catch (e) {}
        try { window.removeEventListener('mouseup', this._onSvgMouseUp); } catch (e) {}
        try { document.removeEventListener('mousedown', this._onDocMouseDown, true); } catch (e) {}
        try { document.removeEventListener('keydown', this._onDocKeyDown); } catch (e) {}
        try { this.chart.unsubscribeClick(this._onChartClick); } catch (e) {}
        try { this.chart.unsubscribeCrosshairMove(this._onCrosshairMove); } catch (e) {}
        // Unsubscribe view-change listeners (zoom/scroll/TF/resize)
        if (this._unsubTimeRange) { this._unsubTimeRange(); this._unsubTimeRange = null; }
        if (this._unsubLogical) { this._unsubLogical(); this._unsubLogical = null; }
        if (this._unsubSize) { this._unsubSize(); this._unsubSize = null; }
        if (this._unsubPriceScale) { this._unsubPriceScale(); this._unsubPriceScale = null; }
        if (this._ro) { try { this._ro.disconnect(); } catch (e) {} this._ro = null; }
        if (this._settingsHandle) { try { this._settingsHandle.close(); } catch (e) {} this._settingsHandle = null; }
        this._hideHint();
        this._closeContextMenu();
        if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        this.svg = null;
        this.canvas = null;
        this._drawingsRoot = null;
        this._handlesRoot = null;
        this._previewRoot = null;
        this._ghostRoot = null;
        this._snapRoot = null;
        this.drawings = [];
        this.cache.clear();
        if (typeof window !== 'undefined' && window.__tvDrawingsProfile) {
            try { delete window.__tvDrawingsProfile; } catch (e) {}
        }
    }

    // ========================================================================
    // Profile (window.__tvDrawingsProfile)
    // ========================================================================
    profile() {
        let svgNodes = 0;
        if (this._drawingsRoot) {
            svgNodes = this._drawingsRoot.getElementsByTagName('*').length;
        }
        let dirty = 0;
        const ctx = this._lastViewKey;
        for (let i = 0; i < this.drawings.length; i++) {
            if (this.cache.isDirty(this.drawings[i], ctx)) dirty++;
        }
        return {
            drawings: this.drawings.length,
            svgNodes,
            avgFrameMs: +this.cache.avgFrameMs().toFixed(2),
            lastFrameMs: +this.cache.lastFrameMs().toFixed(2),
            dirty,
            canvasActive: !!this.canvas,
        };
    }

    // ========================================================================
    // Render scheduling
    // ========================================================================
    _scheduleRender() {
        if (this._rafHandle) return;
        this._rafHandle = requestAnimationFrame(() => {
            this._rafHandle = 0;
            // If a single drawing is being dragged, use fast-path
            if (this._singleDrawingMode) {
                const d = this.drawings.find(dd => dd.id === this._singleDrawingMode);
                if (d) {
                    this._renderSingleDrawing(d);
                    return;
                }
            }
            this._render();
        });
    }

    _onResize() {
        this.cache.markAllDirty();
        this._resizePlotArea();
        this._resizeCanvas();
        this._scheduleRender();
    }

    // Resize SVG / canvas so the overlay covers ONLY the plot area, not the
    // right price scale or bottom time scale. Otherwise drawings intercept
    // pointer events on the scales and the user can't drag-rescale the Y axis
    // or pan via the time axis.
    _resizePlotArea() {
        try {
            const rect = this.container.getBoundingClientRect();
            let psW = 0, tsH = 0;
            try {
                const ps = this.chart && this.chart.priceScale && this.chart.priceScale('right');
                if (ps && typeof ps.width === 'function') psW = ps.width() || 0;
            } catch {}
            try {
                const ts = this.chart && this.chart.timeScale && this.chart.timeScale();
                if (ts && typeof ts.height === 'function') tsH = ts.height() || 0;
            } catch {}
            const plotW = Math.max(0, rect.width  - psW);
            const plotH = Math.max(0, rect.height - tsH);
            if (this.svg) {
                this.svg.style.width  = plotW + 'px';
                this.svg.style.height = plotH + 'px';
            }
            if (this.canvas) {
                this.canvas.style.width  = plotW + 'px';
                this.canvas.style.height = plotH + 'px';
            }
            this._plotW = plotW;
            this._plotH = plotH;
        } catch {}
    }

    _getRenderContext() {
        const rect = this.container.getBoundingClientRect();
        // Use plot-area dimensions (container minus right price scale and bottom
        // time scale) so drawings that anchor to ctx.width (fib retracement
        // "right axis" labels, extendRight horizontal lines, etc.) land at the
        // right edge of the candles, not over the Y-axis price scale.
        const width  = (typeof this._plotW === 'number' && this._plotW > 0) ? this._plotW : rect.width;
        const height = (typeof this._plotH === 'number' && this._plotH > 0) ? this._plotH : rect.height;
        const ts = this.chart && this.chart.timeScale ? this.chart.timeScale() : null;
        const series = this.series;
        const projectX = (time) => {
            if (!ts || time == null) return NaN;
            try { return ts.timeToCoordinate(time); } catch (e) { return NaN; }
        };
        const projectY = (price) => {
            if (!series || price == null) return NaN;
            try { return series.priceToCoordinate(price); } catch (e) { return NaN; }
        };
        const inverseX = (x) => {
            if (!ts) return null;
            try { return ts.coordinateToTime(x); } catch (e) { return null; }
        };
        const inverseY = (y) => {
            if (!series) return null;
            try { return series.coordinateToPrice(y); } catch (e) { return null; }
        };
        let fromTime = 0, toTime = 0;
        try {
            const lr = ts && ts.getVisibleLogicalRange && ts.getVisibleLogicalRange();
            const vr = ts && ts.getVisibleRange && ts.getVisibleRange();
            if (vr) { fromTime = vr.from; toTime = vr.to; }
            else if (lr) { fromTime = lr.from; toTime = lr.to; }
        } catch (e) {}
        const viewKey = computeViewKey(fromTime, toTime, 0, 0, width, height);
        return {
            width, height,
            viewBox: { x: 0, y: 0, width, height, w: width, h: height },
            projectX, projectY, inverseX, inverseY,
            viewKey,
        };
    }

    _pickRenderMode(d) {
        const mode = d.spec && d.spec.renderMode;
        if (mode === 'canvas') return 'canvas';
        if (mode === 'svg' || !mode) return 'svg';
        if (mode === 'auto') {
            // estimate complexity
            try {
                const est = (d.spec.estimateElements && d.spec.estimateElements.call(d)) || 0;
                if (est > COMPLEX_ELEMENT_THRESHOLD && typeof d.spec.renderCanvas === 'function') {
                    return 'canvas';
                }
            } catch (e) {}
        }
        return 'svg';
    }

    _render() {
        if (!this.svg || !this._drawingsRoot) return;
        const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
        const ctx = this._getRenderContext();
        if (this._lastViewKey !== ctx.viewKey) {
            this.cache.markAllDirty();
            this._lastViewKey = ctx.viewKey;
        }
        if (this._clipRect) {
            this._clipRect.setAttribute('width', String(ctx.width));
            this._clipRect.setAttribute('height', String(ctx.height));
        }

        // Z-order: selected always temporarily on top
        const ordered = this.drawings.slice().sort((a, b) => {
            const za = (a.zIndex || 0) + (a.id === this.selectedId ? 1e6 : 0);
            const zb = (b.zIndex || 0) + (b.id === this.selectedId ? 1e6 : 0);
            return za - zb;
        });

        // Determine if we need canvas
        const canvasDrawings = [];
        const svgDrawings = [];
        ordered.forEach(d => {
            if (this._pickRenderMode(d) === 'canvas') canvasDrawings.push(d);
            else svgDrawings.push(d);
        });
        if (canvasDrawings.length) this._ensureCanvas();

        // ---- SVG layer
        const existing = new Map();
        Array.from(this._drawingsRoot.children).forEach(node => existing.set(node.getAttribute('data-id'), node));

        const seen = new Set();
        // Re-append in z-order so paint order is correct.
        svgDrawings.forEach(d => {
            seen.add(d.id);
            let g = existing.get(d.id);
            if (!g) {
                g = document.createElementNS(SVG_NS, 'g');
                g.setAttribute('data-id', d.id);
                g.setAttribute('class', 'dmgr-v2-drawing');
                this._drawingsRoot.appendChild(g);
            } else {
                // ensure ordering
                this._drawingsRoot.appendChild(g);
            }
            const selected = (this.selectedId === d.id);
            const hovered = (this.hoveredId === d.id);
            g.setAttribute('data-selected', selected ? '1' : '0');
            g.setAttribute('data-hovered', hovered ? '1' : '0');

            if (this.cache.isDirty(d, ctx.viewKey)) {
                while (g.firstChild) g.removeChild(g.firstChild);
                try { d.render(g, ctx); } catch (e) { console.warn('[drawings-v2] render error', d.type, e); }
                this.cache.commit(d, ctx.viewKey);
            }
        });

        existing.forEach((node, id) => {
            if (!seen.has(id)) node.remove();
        });

        // ---- Canvas layer
        if (this.canvas && this._canvasCtx) {
            const c2 = this._canvasCtx;
            c2.clearRect(0, 0, ctx.width, ctx.height);
            canvasDrawings.forEach(d => {
                try { d.spec.renderCanvas.call(d, c2, ctx); }
                catch (e) { console.warn('[drawings-v2] renderCanvas error', d.type, e); }
                this.cache.commit(d, ctx.viewKey);
            });
        }

        // Handles for selected
        this._renderHandles(ctx);

        // Preview for in-progress drawing
        if (this._creationDrawing) {
            while (this._previewRoot.firstChild) this._previewRoot.removeChild(this._previewRoot.firstChild);
            const pg = document.createElementNS(SVG_NS, 'g');
            pg.setAttribute('class', 'dmgr-v2-preview-drawing');
            pg.style.opacity = '0.7';
            try { this._creationDrawing.render(pg, ctx); } catch (e) {}
            this._previewRoot.appendChild(pg);
            // Optimistic: render dots for each committed point so user sees their clicks
            this._creationPoints.forEach(p => {
                const px = ctx.projectX(p.time);
                const py = ctx.projectY(p.price);
                if (Number.isFinite(px) && Number.isFinite(py)) {
                    const c = document.createElementNS(SVG_NS, 'circle');
                    c.setAttribute('cx', String(px));
                    c.setAttribute('cy', String(py));
                    c.setAttribute('r', '3');
                    c.setAttribute('fill', '#2962ff');
                    c.setAttribute('stroke', '#fff');
                    c.setAttribute('stroke-width', '1.5');
                    this._previewRoot.appendChild(c);
                }
            });
        }

        this.cache.endPass();
        if (t0) {
            const dt = performance.now() - t0;
            this.cache.recordFrame(dt);
        }
    }

    /**
     * Fast-path render for a single drawing during drag — touches only its
     * <g>, handles, and (optional) snap indicator. Skips global re-sort and
     * the existence-map pass.
     */
    _renderSingleDrawing(d) {
        if (!this.svg || !this._drawingsRoot || !d) return;
        const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
        const ctx = this._getRenderContext();
        if (this._lastViewKey !== ctx.viewKey) {
            // viewport moved during drag — fall back to full render
            this.cache.markAllDirty();
            this._lastViewKey = ctx.viewKey;
            this._render();
            return;
        }
        let g = null;
        for (let i = 0; i < this._drawingsRoot.children.length; i++) {
            if (this._drawingsRoot.children[i].getAttribute('data-id') === d.id) {
                g = this._drawingsRoot.children[i]; break;
            }
        }
        const mode = this._pickRenderMode(d);
        if (mode === 'svg') {
            if (!g) {
                g = document.createElementNS(SVG_NS, 'g');
                g.setAttribute('data-id', d.id);
                g.setAttribute('class', 'dmgr-v2-drawing');
                this._drawingsRoot.appendChild(g);
            }
            g.setAttribute('data-selected', this.selectedId === d.id ? '1' : '0');
            g.setAttribute('data-hovered', '0');
            while (g.firstChild) g.removeChild(g.firstChild);
            try { d.render(g, ctx); } catch (e) {}
            this.cache.commit(d, ctx.viewKey);
        } else if (mode === 'canvas' && this._canvasCtx) {
            // Canvas drawings can't be re-blitted in isolation; redraw all canvas drawings only.
            const c2 = this._canvasCtx;
            c2.clearRect(0, 0, ctx.width, ctx.height);
            this.drawings.forEach(dd => {
                if (this._pickRenderMode(dd) !== 'canvas') return;
                try { dd.spec.renderCanvas.call(dd, c2, ctx); } catch (e) {}
            });
            this.cache.commit(d, ctx.viewKey);
        }
        this._renderHandles(ctx);
        if (t0) this.cache.recordFrame(performance.now() - t0);
    }

    _renderHandles(ctx) {
        if (!this._handlesRoot) return;
        while (this._handlesRoot.firstChild) this._handlesRoot.removeChild(this._handlesRoot.firstChild);
        const d = this.getSelected();
        if (!d || d.locked) return;
        const activeIdx = this.draggingHandle ? this.draggingHandle.handleIdx : -1;
        this._handlesRoot.classList.toggle('is-dragging', !!this.draggingHandle);
        const handles = d.getHandles(ctx) || [];
        handles.forEach((h, i) => {
            if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) return;
            const c = document.createElementNS(SVG_NS, 'circle');
            c.setAttribute('cx', String(h.x));
            c.setAttribute('cy', String(h.y));
            c.setAttribute('r', '5');
            c.setAttribute('fill', '#fff');
            c.setAttribute('stroke', '#2962FF');
            c.setAttribute('stroke-width', '2');
            const idx = (h.anchorIdx != null ? h.anchorIdx : i);
            c.setAttribute('data-handle-idx', String(idx));
            if (idx === activeIdx) c.setAttribute('data-active', '1');
            this._handlesRoot.appendChild(c);
        });
    }

    _clearPreview() {
        if (!this._previewRoot) return;
        while (this._previewRoot.firstChild) this._previewRoot.removeChild(this._previewRoot.firstChild);
    }

    // ========================================================================
    // Ghost layer (drag preview)
    // ========================================================================
    _showGhost(drawing) {
        if (!this._ghostRoot || !drawing) return;
        while (this._ghostRoot.firstChild) this._ghostRoot.removeChild(this._ghostRoot.firstChild);
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'dmgr-v2-ghost');
        try {
            const ctx = this._getRenderContext();
            // Render a snapshot from the *original* points captured at drag start
            const snapshot = {
                points: drawing.points.map(p => ({ ...p })),
                options: { ...drawing.options },
            };
            // create a transient clone-like object with same render
            const fakeRender = drawing.spec && drawing.spec.render;
            if (fakeRender) {
                const proxy = Object.create(drawing);
                proxy.points = snapshot.points;
                proxy.options = snapshot.options;
                try { fakeRender.call(proxy, g, ctx); } catch (e) {}
            }
        } catch (e) {}
        this._ghostRoot.appendChild(g);
        this._ghostNode = g;
    }

    _hideGhost() {
        if (!this._ghostRoot) return;
        while (this._ghostRoot.firstChild) this._ghostRoot.removeChild(this._ghostRoot.firstChild);
        this._ghostNode = null;
    }

    // ========================================================================
    // Snap indicator
    // ========================================================================
    _showSnapIndicator(x, y, confidence) {
        if (!this._snapRoot) return;
        while (this._snapRoot.firstChild) this._snapRoot.removeChild(this._snapRoot.firstChild);
        // inline construction (no import cycle with primitives)
        const color = confidence === 'low' ? '#ffb300' : '#26a69a';
        const g = document.createElementNS(SVG_NS, 'g');
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('cx', String(x)); ring.setAttribute('cy', String(y));
        ring.setAttribute('r', '14');
        ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', color);
        ring.setAttribute('stroke-width', '1.5'); ring.setAttribute('opacity', '0.6');
        this._ensureSnapKeyframes();
        ring.style.animation = 'd2SnapPulse 900ms ease-out infinite';
        ring.style.transformOrigin = `${x}px ${y}px`;
        g.appendChild(ring);
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y));
        dot.setAttribute('r', '6');
        dot.setAttribute('fill', color); dot.setAttribute('stroke', '#fff');
        dot.setAttribute('stroke-width', '1.5'); dot.setAttribute('opacity', '0.95');
        g.appendChild(dot);
        this._snapRoot.appendChild(g);
        this._snapIndicatorNode = g;
    }

    _hideSnapIndicator() {
        if (!this._snapRoot) return;
        while (this._snapRoot.firstChild) this._snapRoot.removeChild(this._snapRoot.firstChild);
        this._snapIndicatorNode = null;
    }

    _ensureSnapKeyframes() {
        if (this._snapCssInjected) return;
        if (typeof document === 'undefined') return;
        if (document.querySelector('style[data-d2-snap-css]')) { this._snapCssInjected = true; return; }
        const s = document.createElement('style');
        s.setAttribute('data-d2-snap-css', '1');
        s.textContent = `
@keyframes d2SnapPulse {
  0%   { transform: scale(0.6); opacity: 0.9; }
  70%  { transform: scale(1.4); opacity: 0.1; }
  100% { transform: scale(1.6); opacity: 0; }
}`;
        document.head.appendChild(s);
        this._snapCssInjected = true;
    }

    // ========================================================================
    // Hint banner
    // ========================================================================
    _showHint(label, current, total) {
        this._hideHint();
        const b = document.createElement('div');
        b.className = 'd2-hint-banner';
        b.innerHTML = `
            <span class="d2-hint-cursor"></span>
            <span class="d2-hint-label"></span>
            <span>punto</span>
            <span class="d2-hint-count">${current + 1}</span>
            <span>de ${total}</span>
            <span style="opacity:0.5">·</span>
            <kbd>Esc</kbd>
            <span>cancela</span>
        `;
        b.querySelector('.d2-hint-label').textContent = label;
        this.container.appendChild(b);
        this._hintBanner = b;
        this._hintTotal = total;
    }

    _bumpHint(current) {
        if (!this._hintBanner) return;
        const node = this._hintBanner.querySelector('.d2-hint-count');
        if (!node) return;
        node.textContent = String(current + 1);
        node.classList.remove('is-bump');
        // force reflow to restart animation
        void node.offsetWidth;
        node.classList.add('is-bump');
        setTimeout(() => { if (node) node.classList.remove('is-bump'); }, 200);
    }

    _hideHint() {
        if (!this._hintBanner) return;
        const b = this._hintBanner;
        this._hintBanner = null;
        b.style.animation = 'd2HintOut 180ms ease-in forwards';
        setTimeout(() => { if (b && b.parentNode) b.parentNode.removeChild(b); }, 200);
    }

    // ========================================================================
    // Hit testing (coordinate-based, no per-element listeners)
    // ========================================================================
    _eventCoords(e) {
        const rect = this.svg.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    _hitTestHandle(x, y) {
        const sel = this.getSelected();
        if (!sel || sel.locked) return null;
        const ctx = this._getRenderContext();
        const handles = sel.getHandles(ctx) || [];
        for (let i = 0; i < handles.length; i++) {
            const h = handles[i];
            if (!h) continue;
            const dx = h.x - x, dy = h.y - y;
            if (dx * dx + dy * dy <= HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
                return { drawing: sel, handleIdx: (h.anchorIdx != null ? h.anchorIdx : i) };
            }
        }
        return null;
    }

    _hitTestDrawing(x, y) {
        const ctx = this._getRenderContext();
        // Top-most first (sorted by zIndex ascending → iterate reverse)
        const ordered = this.drawings.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (let i = ordered.length - 1; i >= 0; i--) {
            const d = ordered[i];
            if (!d._committed) continue;
            try {
                if (d.hitTest(x, y, ctx)) return d;
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    // ========================================================================
    // Mouse / keyboard handlers
    // ========================================================================
    _onSvgMouseDown(e) {
        if (this.activeTool) return; // creation flow handled via chart click
        if (e.button === 2) return;  // right-click → contextmenu handler
        const { x, y } = this._eventCoords(e);

        // 1) Handle drag?
        const h = this._hitTestHandle(x, y);
        if (h && !h.drawing.locked && h.drawing.hasBehavior('handle-draggable')) {
            this.draggingHandle = {
                id: h.drawing.id,
                handleIdx: h.handleIdx,
                magnet: this.magnetMode,
                lastPoint: { x, y },
                vel: { x: 0, y: 0 },
            };
            this._singleDrawingMode = h.drawing.id;
            this._showGhost(h.drawing);
            this.svg.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // 2) Drawing body?
        const d = this._hitTestDrawing(x, y);
        if (d) {
            this.setSelected(d.id);
            if (!d.locked && d.hasBehavior('draggable')) {
                this.draggingBody = {
                    id: d.id,
                    startMouse: { x, y },
                    startPoints: d.points.map(p => ({ ...p })),
                    lastPoint: { x, y },
                    vel: { x: 0, y: 0 },
                };
                this._singleDrawingMode = d.id;
                this._showGhost(d);
                this.svg.style.cursor = 'grabbing';
            }
            e.preventDefault();
            return;
        }
    }

    _onSvgContextMenu(e) {
        if (this.activeTool) return;
        const { x, y } = this._eventCoords(e);
        const d = this._hitTestDrawing(x, y);
        if (!d) return;
        e.preventDefault();
        this.setSelected(d.id);
        this._openContextMenu(d, e.clientX, e.clientY);
    }

    _openContextMenu(d, screenX, screenY) {
        this._closeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'dmgr-v2-context-menu';
        menu.style.left = screenX + 'px';
        menu.style.top = screenY + 'px';
        const mk = (label, fn) => {
            const it = document.createElement('div');
            it.className = 'item'; it.textContent = label;
            it.addEventListener('click', () => { fn(); this._closeContextMenu(); });
            return it;
        };
        const sep = () => { const s = document.createElement('div'); s.className = 'sep'; return s; };
        menu.appendChild(mk('Enviar al frente', () => this.bringToFront(d.id)));
        menu.appendChild(mk('Subir una capa', () => this.raise(d.id)));
        menu.appendChild(mk('Bajar una capa', () => this.lower(d.id)));
        menu.appendChild(mk('Enviar al fondo', () => this.sendToBack(d.id)));
        menu.appendChild(sep());
        menu.appendChild(mk(d.locked ? 'Desbloquear' : 'Bloquear', () => {
            d.locked = !d.locked; this.cache.markDirty(d); this._scheduleRender(); this.saveToStorage();
        }));
        menu.appendChild(mk('Eliminar', () => this.remove(d.id)));
        document.body.appendChild(menu);
        this._contextMenu = menu;
        // close on next click anywhere
        setTimeout(() => {
            const off = (ev) => {
                if (!menu.contains(ev.target)) {
                    this._closeContextMenu();
                    document.removeEventListener('mousedown', off, true);
                }
            };
            document.addEventListener('mousedown', off, true);
        }, 0);
    }

    _closeContextMenu() {
        if (this._contextMenu && this._contextMenu.parentNode) {
            this._contextMenu.parentNode.removeChild(this._contextMenu);
        }
        this._contextMenu = null;
    }

    _onPointerRawUpdate(e) {
        // raw pointer events: only used to update the latest drag target;
        // a RAF tick is what actually applies it (smooth 60fps interpolation).
        if (!this.draggingHandle && !this.draggingBody) return;
        const { x, y } = this._eventCoords(e);
        this._pendingDragTarget = { x, y };
        this._scheduleDragApply();
    }

    _scheduleDragApply() {
        if (this._dragRaf) return;
        this._dragRaf = requestAnimationFrame(() => {
            this._dragRaf = 0;
            const target = this._pendingDragTarget;
            this._pendingDragTarget = null;
            if (!target) return;
            this._applyDrag(target.x, target.y);
        });
    }

    _onSvgMouseMove(e) {
        const { x, y } = this._eventCoords(e);

        if (this.draggingHandle || this.draggingBody) {
            this._pendingDragTarget = { x, y };
            this._scheduleDragApply();
            return;
        }

        // Hover
        const hover = this._hitTestDrawing(x, y);
        const newHoverId = hover ? hover.id : null;
        if (this.hoveredId !== newHoverId) {
            this.hoveredId = newHoverId;
            // Cursor management
            if (this.activeTool) {
                this.svg.style.cursor = 'crosshair';
            } else if (newHoverId) {
                const isSel = (newHoverId === this.selectedId);
                this.svg.style.cursor = isSel ? 'move' : 'pointer';
            } else {
                this.svg.style.cursor = '';
            }
            // mark hovered drawing for outline (cheap render)
            this.cache.markAllDirty();
            this._scheduleRender();
        }

        // Hover over handle? → grab cursor
        if (!this.activeTool) {
            const h = this._hitTestHandle(x, y);
            if (h) this.svg.style.cursor = 'grab';
        }
    }

    _applyDrag(x, y) {
        const ctx = this._getRenderContext();

        if (this.draggingHandle) {
            const d = this.drawings.find(dd => dd.id === this.draggingHandle.id);
            if (!d) return;
            // velocity smoothing for predictive lookahead
            const prev = this.draggingHandle.lastPoint;
            const dx = x - prev.x, dy = y - prev.y;
            this.draggingHandle.vel.x = this.draggingHandle.vel.x * (1 - DRAG_VEL_SMOOTH) + dx * DRAG_VEL_SMOOTH;
            this.draggingHandle.vel.y = this.draggingHandle.vel.y * (1 - DRAG_VEL_SMOOTH) + dy * DRAG_VEL_SMOOTH;
            this.draggingHandle.lastPoint = { x, y };
            const px = x + this.draggingHandle.vel.x * DRAG_PREDICT_FACTOR;
            const py = y + this.draggingHandle.vel.y * DRAG_PREDICT_FACTOR;

            let time = ctx.inverseX(px);
            let price = ctx.inverseY(py);
            let snappedAt = null;
            if (this.draggingHandle.magnet && this.draggingHandle.magnet !== 'off') {
                const snapped = this._magnetSnap(time, price);
                if (snapped) {
                    time = snapped.time; price = snapped.price;
                    snappedAt = {
                        x: ctx.projectX(time), y: ctx.projectY(price),
                        confidence: snapped.confidence,
                    };
                }
            }
            d.onDrag(this.draggingHandle.handleIdx, { time, price });
            this.cache.markDirty(d);
            if (snappedAt && Number.isFinite(snappedAt.x) && Number.isFinite(snappedAt.y)) {
                this._showSnapIndicator(snappedAt.x, snappedAt.y, snappedAt.confidence);
            } else {
                this._hideSnapIndicator();
            }
            this._scheduleRender();
            return;
        }

        if (this.draggingBody) {
            const d = this.drawings.find(dd => dd.id === this.draggingBody.id);
            if (!d) return;
            const prev = this.draggingBody.lastPoint;
            const ddx = x - prev.x, ddy = y - prev.y;
            this.draggingBody.vel.x = this.draggingBody.vel.x * (1 - DRAG_VEL_SMOOTH) + ddx * DRAG_VEL_SMOOTH;
            this.draggingBody.vel.y = this.draggingBody.vel.y * (1 - DRAG_VEL_SMOOTH) + ddy * DRAG_VEL_SMOOTH;
            this.draggingBody.lastPoint = { x, y };
            const px = x + this.draggingBody.vel.x * DRAG_PREDICT_FACTOR;
            const py = y + this.draggingBody.vel.y * DRAG_PREDICT_FACTOR;

            const dx = px - this.draggingBody.startMouse.x;
            const dy = py - this.draggingBody.startMouse.y;
            const newPoints = this.draggingBody.startPoints.map(p => {
                const ppx = ctx.projectX(p.time);
                const ppy = ctx.projectY(p.price);
                if (!Number.isFinite(ppx) || !Number.isFinite(ppy)) return p;
                const nt = ctx.inverseX(ppx + dx);
                const np = ctx.inverseY(ppy + dy);
                return { ...p, time: nt != null ? nt : p.time, price: np != null ? np : p.price };
            });
            d.points = newPoints;
            d.version++; d._dirty = true;
            this.cache.markDirty(d);
            this._scheduleRender();
        }
    }

    _onSvgMouseUp() {
        if (this.draggingHandle || this.draggingBody) {
            this.draggingHandle = null;
            this.draggingBody = null;
            this._singleDrawingMode = null;
            this._hideGhost();
            this._hideSnapIndicator();
            this.svg.style.cursor = '';
            this.cache.markAllDirty();
            this._scheduleRender();
            this.saveToStorage();
        }
    }

    _onDocMouseDown(e) {
        if (!this.svg) return;
        if (this.svg.contains(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('.dmgr-v2-settings')) return;
        if (e.target && e.target.closest && e.target.closest('.dmgr-v2-context-menu')) return;
        if (this.selectedId) this.setSelected(null);
    }

    _onDocKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.activeTool) { this.cancel(); return; }
            if (this.selectedId) { this.setSelected(null); return; }
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) {
            const ae = document.activeElement;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
            this.remove(this.selectedId);
        }
    }

    // ========================================================================
    // Creation flow (chart click + crosshair preview)
    // ========================================================================
    _onChartClick(param) {
        if (!this.activeTool || !param) return;
        const spec = SPEC_REGISTRY[this.activeTool] && SPEC_REGISTRY[this.activeTool].spec;
        if (!spec) { this.cancel(); return; }

        let time = param.time != null ? param.time : null;
        let price = null;
        if (param.point && this.series && this.series.coordinateToPrice) {
            try { price = this.series.coordinateToPrice(param.point.y); } catch (e) {}
        }
        if (time == null && param.point && this.chart && this.chart.timeScale) {
            try { time = this.chart.timeScale().coordinateToTime(param.point.x); } catch (e) {}
        }
        if (time == null || price == null) return;

        if (this.magnetMode && this.magnetMode !== 'off') {
            const snapped = this._magnetSnap(time, price);
            if (snapped) { time = snapped.time; price = snapped.price; }
        }

        this._creationPoints.push({ time, price });

        if (!this._creationDrawing) {
            this._creationDrawing = instantiate(this.activeTool, {
                points: this._creationPoints.slice(),
                options: this.activeOpts || {},
            });
            if (this._creationDrawing) this._creationDrawing._committed = false;
        } else {
            this._creationDrawing.points = this._creationPoints.slice();
            this._creationDrawing._dirty = true;
            this._creationDrawing.version++;
        }

        const needed = spec.pointsRequired || 2;
        this._bumpHint(this._creationPoints.length);
        if (this._creationPoints.length >= needed) {
            const d = this._creationDrawing;
            d.points = this._creationPoints.slice();
            try { d.onCommit(); } catch (e) {}
            if (!Number.isFinite(d.zIndex) || d.zIndex === 0) d.zIndex = this._nextZIndex();
            this.drawings.push(d);
            this._creationDrawing = null;
            this._creationPoints = [];
            this._clearPreview();
            this.cancel();
            this.setSelected(d.id);
            this.saveToStorage();
        }
        this._scheduleRender();
    }

    _onCrosshairMove(param) {
        if (!this.activeTool || !this._creationPoints.length || !param || !param.point) return;
        const spec = SPEC_REGISTRY[this.activeTool] && SPEC_REGISTRY[this.activeTool].spec;
        if (!spec) return;
        let time = param.time != null ? param.time : null;
        let price = null;
        try { price = this.series && this.series.coordinateToPrice(param.point.y); } catch (e) {}
        if (time == null) {
            try { time = this.chart.timeScale().coordinateToTime(param.point.x); } catch (e) {}
        }
        if (time == null || price == null) return;

        const ptsPreview = this._creationPoints.slice();
        ptsPreview.push({ time, price });
        if (!this._creationDrawing) {
            this._creationDrawing = instantiate(this.activeTool, {
                points: ptsPreview,
                options: this.activeOpts || {},
            });
            if (this._creationDrawing) this._creationDrawing._committed = false;
        } else {
            this._creationDrawing.points = ptsPreview;
            this._creationDrawing._dirty = true;
            this._creationDrawing.version++;
        }
        this._scheduleRender();
    }

    // ========================================================================
    // Magnet snap (lightweight; reads cached candles)
    // ========================================================================
    _magnetSnap(time, price) {
        if (time == null || price == null) return null;
        const candles = this.getCandles() || [];
        if (!candles.length) return null;
        let best = null, bestDt = Infinity;
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i]; if (!c) continue;
            const dt = Math.abs((c.time || 0) - time);
            if (dt < bestDt) { bestDt = dt; best = c; }
        }
        if (!best) return null;
        const candidates = [best.open, best.high, best.low, best.close].filter(v => Number.isFinite(v));
        let snapPrice = price, bestDp = Infinity;
        candidates.forEach(v => {
            const dp = Math.abs(v - price);
            if (dp < bestDp) { bestDp = dp; snapPrice = v; }
        });
        // confidence heuristic: close in both time (≤1 candle) and price (≤0.5% of price)
        const priceRel = Math.abs(price) > 0 ? bestDp / Math.abs(price) : 1;
        const confidence = (bestDp <= Math.abs(price) * 0.01) ? 'high' : 'low';
        return { time: best.time, price: snapPrice, confidence };
    }

    // ========================================================================
    // Settings dialog plumbing
    // ========================================================================
    _openSettingsForSelected() {
        const d = this.getSelected();
        if (!d) return;
        const schema = (d.spec && d.spec.schema) || { estilo: [], especifico: [], coord: 'auto' };
        if (this._settingsHandle) { try { this._settingsHandle.close(); } catch (e) {} this._settingsHandle = null; }
        const ctx = this._getRenderContext();
        const handles = d.getHandles(ctx) || [];
        const rect = this.svg.getBoundingClientRect();
        let anchorX = window.innerWidth / 2 - 160;
        let anchorY = window.innerHeight / 2 - 200;
        if (handles[0]) {
            anchorX = rect.left + handles[0].x + 14;
            anchorY = rect.top + handles[0].y + 14;
        }
        this._settingsHandle = buildSettingsDialog(d, schema, {
            anchorX, anchorY,
            onChange: (k, v, dr) => {
                dr._dirty = true;
                if (typeof dr.version === 'number') dr.version++;
                try { dr.onEdit(); } catch (e) {}
                this.cache.markDirty(dr);
                this._scheduleRender();
                this.saveToStorage();
            },
            onClose: () => {
                this._settingsHandle = null;
                if (this.selectedId === d.id) this.setSelected(null);
            },
        });
    }
}

export default DrawingManagerV2;
