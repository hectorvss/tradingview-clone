// native-drawing-tools.js
// Ported (TypeScript -> pure JS) from lightweight-charts plugin-examples:
//   - plugins/trend-line/trend-line.ts
//   - plugins/rectangle-drawing-tool/rectangle-drawing-tool.ts
// Plus helpers/dimensions/positions.ts and plugins/plugin-base.ts
//
// Provides TWO native (ISeriesPrimitive) drawing tools for lightweight-charts v5.
//
// Public API:
//   createNativeTrendLine(chart, series, container, opts = {})
//   createNativeRectangle(chart, series, container, opts = {})
// Each returns:
//   { activate(), cancel(), destroy(), getDrawings(), removeAll(),
//     loadFromStorage(), saveToStorage() }
//
// Both tools:
//   - draw via series.attachPrimitive() (lightweight-charts v5 native primitives)
//   - support drag-translate of the whole drawing
//   - support hover-highlight (highlighted drawings render with a brighter stroke)
//   - support color / lineWidth / lineStyle options (lineStyle = canvas dash array)
//   - persist to localStorage (keys: tv.drawings_native_trend / tv.drawings_native_rect)
//
// Usage:
//   import { createNativeTrendLine, createNativeRectangle } from './plugins/native-drawing-tools.js';
//   const trend = createNativeTrendLine(chart, series, toolbarEl, { color: '#2962FF', lineWidth: 2 });
//   trend.loadFromStorage();
//   document.querySelector('#trend-btn').onclick = () => trend.activate();

// ---------------------------------------------------------------------------
// Helpers (inlined from helpers/dimensions/positions.ts)
// ---------------------------------------------------------------------------
function positionsBox(p1Media, p2Media, pixelRatio) {
    const s1 = Math.round(pixelRatio * p1Media);
    const s2 = Math.round(pixelRatio * p2Media);
    return {
        position: Math.min(s1, s2),
        length: Math.abs(s2 - s1) + 1,
    };
}

function ensureDefined(v) {
    if (v === undefined || v === null) {
        throw new Error('native-drawing-tools: value expected to be defined');
    }
    return v;
}

function isBusinessDay(time) {
    return (
        time && typeof time === 'object' &&
        typeof time.year === 'number' &&
        typeof time.month === 'number' &&
        typeof time.day === 'number'
    );
}

function timeToKey(time) {
    if (typeof time === 'number') return time;
    if (typeof time === 'string') return time;
    if (isBusinessDay(time)) {
        return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
    }
    return String(time);
}

function defaultTimeFormatter(time) {
    if (typeof time === 'string') return time;
    const d = isBusinessDay(time)
        ? new Date(time.year, time.month - 1, time.day)
        : new Date(time * 1000);
    return d.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// PluginBase (ported from plugins/plugin-base.ts)
// ---------------------------------------------------------------------------
class PluginBase {
    constructor() {
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
        this._fireDataUpdated = (scope) => {
            if (this.dataUpdated) this.dataUpdated(scope);
        };
    }
    requestUpdate() {
        if (this._requestUpdate) this._requestUpdate();
    }
    attached(param) {
        this._chart = param.chart;
        this._series = param.series;
        this._requestUpdate = param.requestUpdate;
        if (this._series && this._series.subscribeDataChanged) {
            this._series.subscribeDataChanged(this._fireDataUpdated);
        }
        this.requestUpdate();
    }
    detached() {
        if (this._series && this._series.unsubscribeDataChanged) {
            this._series.unsubscribeDataChanged(this._fireDataUpdated);
        }
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }
    get chart() { return ensureDefined(this._chart); }
    get series() { return ensureDefined(this._series); }
}

// ---------------------------------------------------------------------------
// TREND LINE
// ---------------------------------------------------------------------------

const TREND_DEFAULTS = {
    color: '#2962FF',
    hoverColor: '#FF9800',
    lineWidth: 2,
    lineStyle: [],          // canvas dash array, e.g. [4,4]
    showLabels: false,
    labelBackgroundColor: 'rgba(255,255,255,0.85)',
    labelTextColor: 'rgb(0,0,0)',
};

class TrendLinePaneRenderer {
    constructor(p1, p2, text1, text2, options, highlighted) {
        this._p1 = p1;
        this._p2 = p2;
        this._text1 = text1;
        this._text2 = text2;
        this._options = options;
        this._highlighted = highlighted;
    }
    draw(target) {
        target.useBitmapCoordinateSpace((scope) => {
            if (
                this._p1.x === null || this._p1.y === null ||
                this._p2.x === null || this._p2.y === null
            ) return;
            const ctx = scope.context;
            const x1 = Math.round(this._p1.x * scope.horizontalPixelRatio);
            const y1 = Math.round(this._p1.y * scope.verticalPixelRatio);
            const x2 = Math.round(this._p2.x * scope.horizontalPixelRatio);
            const y2 = Math.round(this._p2.y * scope.verticalPixelRatio);

            ctx.save();
            const baseWidth = this._options.lineWidth || 2;
            ctx.lineWidth = (this._highlighted ? baseWidth + 1 : baseWidth) *
                Math.max(scope.horizontalPixelRatio, scope.verticalPixelRatio);
            ctx.strokeStyle = this._highlighted
                ? (this._options.hoverColor || this._options.color)
                : this._options.color;
            if (Array.isArray(this._options.lineStyle) && this._options.lineStyle.length) {
                const ratio = scope.horizontalPixelRatio;
                ctx.setLineDash(this._options.lineStyle.map((v) => v * ratio));
            }
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            if (this._options.showLabels) {
                this._drawLabel(scope, this._text1, x1, y1, true);
                this._drawLabel(scope, this._text2, x2, y2, false);
            }
            ctx.restore();
        });
    }
    _drawLabel(scope, text, x, y, left) {
        const ctx = scope.context;
        ctx.font = `${Math.round(12 * scope.verticalPixelRatio)}px sans-serif`;
        const offset = 5 * scope.horizontalPixelRatio;
        const metrics = ctx.measureText(text);
        const leftAdj = left ? metrics.width + offset * 4 : 0;
        ctx.fillStyle = this._options.labelBackgroundColor;
        const bx = x + offset - leftAdj;
        const by = y - 16 * scope.verticalPixelRatio;
        const bw = metrics.width + offset * 2;
        const bh = 16 * scope.verticalPixelRatio + offset;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 4);
            ctx.fill();
        } else {
            ctx.fillRect(bx, by, bw, bh);
        }
        ctx.fillStyle = this._options.labelTextColor;
        ctx.fillText(text, x + offset * 2 - leftAdj, y);
    }
}

class TrendLinePaneView {
    constructor(source) {
        this._source = source;
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
    }
    update() {
        const s = this._source._series;
        const ts = this._source._chart.timeScale();
        this._p1 = {
            x: ts.timeToCoordinate(this._source._p1.time),
            y: s.priceToCoordinate(this._source._p1.price),
        };
        this._p2 = {
            x: ts.timeToCoordinate(this._source._p2.time),
            y: s.priceToCoordinate(this._source._p2.price),
        };
    }
    renderer() {
        return new TrendLinePaneRenderer(
            this._p1, this._p2,
            this._source._p1.price.toFixed(2),
            this._source._p2.price.toFixed(2),
            this._source._options,
            this._source._highlighted
        );
    }
}

class TrendLine extends PluginBase {
    constructor(chart, series, p1, p2, options) {
        super();
        this._chart = chart;
        this._series = series;
        this._p1 = p1;
        this._p2 = p2;
        this._options = Object.assign({}, TREND_DEFAULTS, options || {});
        this._highlighted = false;
        this._paneViews = [new TrendLinePaneView(this)];
        this._minPrice = Math.min(p1.price, p2.price);
        this._maxPrice = Math.max(p1.price, p2.price);
    }
    attached(param) {
        // override: keep chart/series we already have
        this._requestUpdate = param.requestUpdate;
        this.requestUpdate();
    }
    detached() {
        this._requestUpdate = undefined;
    }
    updateAllViews() {
        this._paneViews.forEach((pv) => pv.update());
    }
    paneViews() { return this._paneViews; }
    autoscaleInfo(startLogical, endLogical) {
        const ts = this._chart.timeScale();
        const c1 = ts.timeToCoordinate(this._p1.time);
        const c2 = ts.timeToCoordinate(this._p2.time);
        if (c1 === null || c2 === null) return null;
        const i1 = ts.coordinateToLogical(c1);
        const i2 = ts.coordinateToLogical(c2);
        if (i1 === null || i2 === null) return null;
        const lo = Math.min(i1, i2), hi = Math.max(i1, i2);
        if (endLogical < lo || startLogical > hi) return null;
        return { priceRange: { minValue: this._minPrice, maxValue: this._maxPrice } };
    }
    setHighlighted(h) {
        if (this._highlighted === h) return;
        this._highlighted = h;
        this.requestUpdate();
    }
    translate(dxPrice, dxTimeIndex) {
        // dxTimeIndex is a delta in logical index; convert each endpoint via timeScale
        const ts = this._chart.timeScale();
        const newP1 = this._shiftPoint(this._p1, dxPrice, dxTimeIndex, ts);
        const newP2 = this._shiftPoint(this._p2, dxPrice, dxTimeIndex, ts);
        if (newP1 && newP2) {
            this._p1 = newP1;
            this._p2 = newP2;
            this._minPrice = Math.min(newP1.price, newP2.price);
            this._maxPrice = Math.max(newP1.price, newP2.price);
            this.requestUpdate();
        }
    }
    _shiftPoint(p, dxPrice, dxIdx, ts) {
        const c = ts.timeToCoordinate(p.time);
        if (c === null) return null;
        const idx = ts.coordinateToLogical(c);
        if (idx === null) return null;
        const newCoord = ts.logicalToCoordinate(idx + dxIdx);
        if (newCoord === null) return null;
        const newTime = ts.coordinateToTime(newCoord);
        if (newTime === null) return null;
        return { time: newTime, price: p.price + dxPrice };
    }
    applyOptions(opts) {
        this._options = Object.assign({}, this._options, opts);
        this.requestUpdate();
    }
    serialize() {
        return {
            p1: { time: this._p1.time, price: this._p1.price },
            p2: { time: this._p2.time, price: this._p2.price },
            options: this._options,
        };
    }
}

// ---------------------------------------------------------------------------
// RECTANGLE
// ---------------------------------------------------------------------------

const RECT_DEFAULTS = {
    color: '#2962FF',                // stroke color
    hoverColor: '#FF9800',
    fillColor: 'rgba(41,98,255,0.20)',
    previewFillColor: 'rgba(41,98,255,0.10)',
    lineWidth: 1,
    lineStyle: [],
    showLabels: false,
    labelColor: 'rgba(41,98,255,1)',
    labelTextColor: 'white',
    priceLabelFormatter: (p) => p.toFixed(2),
    timeLabelFormatter: defaultTimeFormatter,
};

class RectanglePaneRenderer {
    constructor(p1, p2, options, highlighted) {
        this._p1 = p1;
        this._p2 = p2;
        this._options = options;
        this._highlighted = highlighted;
    }
    draw(target) {
        target.useBitmapCoordinateSpace((scope) => {
            if (
                this._p1.x === null || this._p1.y === null ||
                this._p2.x === null || this._p2.y === null
            ) return;
            const ctx = scope.context;
            const hp = positionsBox(this._p1.x, this._p2.x, scope.horizontalPixelRatio);
            const vp = positionsBox(this._p1.y, this._p2.y, scope.verticalPixelRatio);
            ctx.save();
            ctx.fillStyle = this._options.fillColor;
            ctx.fillRect(hp.position, vp.position, hp.length, vp.length);
            if (this._options.lineWidth > 0) {
                const baseW = this._options.lineWidth;
                ctx.lineWidth = (this._highlighted ? baseW + 1 : baseW) *
                    Math.max(scope.horizontalPixelRatio, scope.verticalPixelRatio);
                ctx.strokeStyle = this._highlighted
                    ? (this._options.hoverColor || this._options.color)
                    : this._options.color;
                if (Array.isArray(this._options.lineStyle) && this._options.lineStyle.length) {
                    const ratio = scope.horizontalPixelRatio;
                    ctx.setLineDash(this._options.lineStyle.map((v) => v * ratio));
                }
                ctx.strokeRect(hp.position, vp.position, hp.length, vp.length);
            }
            ctx.restore();
        });
    }
}

class RectanglePaneView {
    constructor(source) {
        this._source = source;
        this._p1 = { x: null, y: null };
        this._p2 = { x: null, y: null };
    }
    update() {
        const s = this._source.series;
        const ts = this._source.chart.timeScale();
        this._p1 = {
            x: ts.timeToCoordinate(this._source._p1.time),
            y: s.priceToCoordinate(this._source._p1.price),
        };
        this._p2 = {
            x: ts.timeToCoordinate(this._source._p2.time),
            y: s.priceToCoordinate(this._source._p2.price),
        };
    }
    renderer() {
        return new RectanglePaneRenderer(
            this._p1, this._p2,
            this._source._options,
            this._source._highlighted
        );
    }
}

class RectangleAxisPaneRenderer {
    constructor(p1, p2, fillColor, vertical) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
        this._vertical = vertical;
    }
    draw(target) {
        target.useBitmapCoordinateSpace((scope) => {
            if (this._p1 === null || this._p2 === null) return;
            const ctx = scope.context;
            ctx.save();
            ctx.globalAlpha = 0.5;
            const pos = positionsBox(
                this._p1, this._p2,
                this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
            );
            ctx.fillStyle = this._fillColor;
            if (this._vertical) {
                ctx.fillRect(0, pos.position, 15, pos.length);
            } else {
                ctx.fillRect(pos.position, 0, pos.length, 15);
            }
            ctx.restore();
        });
    }
}

class RectangleAxisPaneView {
    constructor(source, vertical) {
        this._source = source;
        this._vertical = vertical;
        this._p1 = null;
        this._p2 = null;
    }
    getPoints() { return [null, null]; }
    update() {
        const pts = this.getPoints();
        this._p1 = pts[0];
        this._p2 = pts[1];
    }
    renderer() {
        return new RectangleAxisPaneRenderer(
            this._p1, this._p2,
            this._source._options.labelColor,
            this._vertical
        );
    }
    zOrder() { return 'bottom'; }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
    getPoints() {
        const s = this._source.series;
        return [
            s.priceToCoordinate(this._source._p1.price),
            s.priceToCoordinate(this._source._p2.price),
        ];
    }
}
class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
    getPoints() {
        const ts = this._source.chart.timeScale();
        return [
            ts.timeToCoordinate(this._source._p1.time),
            ts.timeToCoordinate(this._source._p2.time),
        ];
    }
}

class RectangleAxisView {
    constructor(source, p) {
        this._source = source;
        this._p = p;
        this._pos = null;
    }
    coordinate() { return this._pos == null ? -1 : this._pos; }
    visible() { return !!this._source._options.showLabels; }
    tickVisible() { return !!this._source._options.showLabels; }
    textColor() { return this._source._options.labelTextColor; }
    backColor() { return this._source._options.labelColor; }
    movePoint(p) { this._p = p; this.update(); }
    update() {}
    text() { return ''; }
}
class RectangleTimeAxisView extends RectangleAxisView {
    update() {
        const ts = this._source.chart.timeScale();
        this._pos = ts.timeToCoordinate(this._p.time);
    }
    text() {
        const f = this._source._options.timeLabelFormatter || defaultTimeFormatter;
        return f(this._p.time);
    }
}
class RectanglePriceAxisView extends RectangleAxisView {
    update() {
        this._pos = this._source.series.priceToCoordinate(this._p.price);
    }
    text() {
        const f = this._source._options.priceLabelFormatter || ((p) => p.toFixed(2));
        return f(this._p.price);
    }
}

class Rectangle extends PluginBase {
    constructor(p1, p2, options) {
        super();
        this._p1 = p1;
        this._p2 = p2;
        this._options = Object.assign({}, RECT_DEFAULTS, options || {});
        this._highlighted = false;
        this._paneViews = [new RectanglePaneView(this)];
        this._timeAxisViews = [
            new RectangleTimeAxisView(this, p1),
            new RectangleTimeAxisView(this, p2),
        ];
        this._priceAxisViews = [
            new RectanglePriceAxisView(this, p1),
            new RectanglePriceAxisView(this, p2),
        ];
        this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
        this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
    }
    updateAllViews() {
        this._paneViews.forEach((v) => v.update());
        this._timeAxisViews.forEach((v) => v.update());
        this._priceAxisViews.forEach((v) => v.update());
        this._priceAxisPaneViews.forEach((v) => v.update());
        this._timeAxisPaneViews.forEach((v) => v.update());
    }
    paneViews() { return this._paneViews; }
    priceAxisViews() { return this._priceAxisViews; }
    timeAxisViews() { return this._timeAxisViews; }
    priceAxisPaneViews() { return this._priceAxisPaneViews; }
    timeAxisPaneViews() { return this._timeAxisPaneViews; }
    setHighlighted(h) {
        if (this._highlighted === h) return;
        this._highlighted = h;
        this.requestUpdate();
    }
    applyOptions(opts) {
        this._options = Object.assign({}, this._options, opts);
        this.requestUpdate();
    }
    translate(dxPrice, dxIdx) {
        const ts = this.chart.timeScale();
        const np1 = this._shiftPoint(this._p1, dxPrice, dxIdx, ts);
        const np2 = this._shiftPoint(this._p2, dxPrice, dxIdx, ts);
        if (np1 && np2) {
            this._p1 = np1;
            this._p2 = np2;
            this._timeAxisViews[0].movePoint(np1);
            this._timeAxisViews[1].movePoint(np2);
            this._priceAxisViews[0].movePoint(np1);
            this._priceAxisViews[1].movePoint(np2);
            this.requestUpdate();
        }
    }
    _shiftPoint(p, dxPrice, dxIdx, ts) {
        const c = ts.timeToCoordinate(p.time);
        if (c === null) return null;
        const idx = ts.coordinateToLogical(c);
        if (idx === null) return null;
        const nc = ts.logicalToCoordinate(idx + dxIdx);
        if (nc === null) return null;
        const nt = ts.coordinateToTime(nc);
        if (nt === null) return null;
        return { time: nt, price: p.price + dxPrice };
    }
    serialize() {
        return {
            p1: { time: this._p1.time, price: this._p1.price },
            p2: { time: this._p2.time, price: this._p2.price },
            options: {
                color: this._options.color,
                hoverColor: this._options.hoverColor,
                fillColor: this._options.fillColor,
                previewFillColor: this._options.previewFillColor,
                lineWidth: this._options.lineWidth,
                lineStyle: this._options.lineStyle,
                showLabels: this._options.showLabels,
                labelColor: this._options.labelColor,
                labelTextColor: this._options.labelTextColor,
            },
        };
    }
}

class PreviewRectangle extends Rectangle {
    constructor(p1, p2, options) {
        super(p1, p2, options);
        this._options.fillColor = this._options.previewFillColor;
    }
    updateEndPoint(p) {
        this._p2 = p;
        this._paneViews[0].update();
        this._timeAxisViews[1].movePoint(p);
        this._priceAxisViews[1].movePoint(p);
        this.requestUpdate();
    }
}

// ---------------------------------------------------------------------------
// Shared interaction wiring (click-to-create + drag + hover-highlight)
// ---------------------------------------------------------------------------

function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const x = ax + t * dx, y = ay + t * dy;
    return Math.hypot(px - x, py - y);
}

function pointInRectScreen(px, py, x1, y1, x2, y2) {
    const lo_x = Math.min(x1, x2), hi_x = Math.max(x1, x2);
    const lo_y = Math.min(y1, y2), hi_y = Math.max(y1, y2);
    return px >= lo_x && px <= hi_x && py >= lo_y && py <= hi_y;
}

function projectDrawingToScreen(drawing, chart, series, kind) {
    const ts = chart.timeScale();
    const x1 = ts.timeToCoordinate(drawing._p1.time);
    const x2 = ts.timeToCoordinate(drawing._p2.time);
    const y1 = series.priceToCoordinate(drawing._p1.price);
    const y2 = series.priceToCoordinate(drawing._p2.price);
    if (x1 === null || x2 === null || y1 === null || y2 === null) return null;
    return { x1, y1, x2, y2 };
}

function makeTool(kind, chart, series, container, opts) {
    if (!chart || !series) {
        throw new Error('native-drawing-tools: chart and series are required');
    }
    const STORAGE_KEY = kind === 'trend' ? 'tv.drawings_native_trend' : 'tv.drawings_native_rect';
    const HIT_TOLERANCE = 6;

    const drawings = [];
    let drawingState = {
        active: false,
        points: [],
        preview: null, // rectangle preview only
    };
    let dragState = null; // { drawing, startPx, startPy, startLogical, startPrice }
    let hoverDrawing = null;
    const defaults = Object.assign({}, opts || {});

    // ---- create drawing of correct kind ----
    function createDrawing(p1, p2, options) {
        if (kind === 'trend') {
            const d = new TrendLine(chart, series, p1, p2, Object.assign({}, defaults, options || {}));
            series.attachPrimitive(d);
            return d;
        } else {
            const d = new Rectangle(p1, p2, Object.assign({}, defaults, options || {}));
            series.attachPrimitive(d);
            return d;
        }
    }

    function destroyDrawing(d) {
        try { series.detachPrimitive(d); } catch (_) { /* ignore */ }
    }

    // ---- click + crosshair handlers (drawing mode) ----
    const clickHandler = (param) => {
        if (!drawingState.active) return;
        if (!param.point || !param.time) return;
        const price = series.coordinateToPrice(param.point.y);
        if (price === null) return;
        const p = { time: param.time, price };
        drawingState.points.push(p);

        if (kind === 'rect' && drawingState.points.length === 1) {
            drawingState.preview = new PreviewRectangle(p, p, Object.assign({}, defaults));
            series.attachPrimitive(drawingState.preview);
        }
        if (drawingState.points.length >= 2) {
            const [a, b] = drawingState.points;
            const d = createDrawing(a, b, defaults);
            drawings.push(d);
            finishDrawing();
            saveToStorage();
        }
    };

    const moveHandler = (param) => {
        // preview tracking for rectangle
        if (drawingState.active && drawingState.preview && param.point && param.time) {
            const price = series.coordinateToPrice(param.point.y);
            if (price !== null) {
                drawingState.preview.updateEndPoint({ time: param.time, price });
            }
        }
        // hover-highlight (only when not actively drawing)
        if (!drawingState.active && !dragState && param.point) {
            updateHover(param.point.x, param.point.y);
        }
    };

    function updateHover(px, py) {
        let best = null;
        let bestDist = Infinity;
        for (const d of drawings) {
            const scr = projectDrawingToScreen(d, chart, series, kind);
            if (!scr) continue;
            if (kind === 'trend') {
                const dist = distanceToSegment(px, py, scr.x1, scr.y1, scr.x2, scr.y2);
                if (dist <= HIT_TOLERANCE && dist < bestDist) {
                    best = d; bestDist = dist;
                }
            } else {
                if (pointInRectScreen(px, py, scr.x1, scr.y1, scr.x2, scr.y2)) {
                    best = d;
                    bestDist = 0;
                    break;
                }
            }
        }
        if (best !== hoverDrawing) {
            if (hoverDrawing) hoverDrawing.setHighlighted(false);
            hoverDrawing = best;
            if (hoverDrawing) hoverDrawing.setHighlighted(true);
        }
    }

    chart.subscribeClick(clickHandler);
    chart.subscribeCrosshairMove(moveHandler);

    // ---- drag (translate) on DOM container ----
    const dragTarget = container && container.nodeType === 1 ? container : null;

    function getLocalPos(ev) {
        if (!dragTarget) return null;
        const rect = dragTarget.getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }

    const onPointerDown = (ev) => {
        if (drawingState.active) return;
        const pos = getLocalPos(ev);
        if (!pos) return;
        // find hit drawing
        let hit = null;
        for (const d of drawings) {
            const scr = projectDrawingToScreen(d, chart, series, kind);
            if (!scr) continue;
            if (kind === 'trend') {
                if (distanceToSegment(pos.x, pos.y, scr.x1, scr.y1, scr.x2, scr.y2) <= HIT_TOLERANCE) {
                    hit = d; break;
                }
            } else {
                if (pointInRectScreen(pos.x, pos.y, scr.x1, scr.y1, scr.x2, scr.y2)) {
                    hit = d; break;
                }
            }
        }
        if (!hit) return;
        const ts = chart.timeScale();
        const startLogical = ts.coordinateToLogical(pos.x);
        const startPrice = series.coordinateToPrice(pos.y);
        if (startLogical === null || startPrice === null) return;
        dragState = {
            drawing: hit,
            startLogical,
            startPrice,
            lastLogical: startLogical,
            lastPrice: startPrice,
        };
        hit.setHighlighted(true);
        ev.preventDefault();
        ev.stopPropagation();
        try { dragTarget.setPointerCapture && dragTarget.setPointerCapture(ev.pointerId); } catch (_) {}
    };

    const onPointerMove = (ev) => {
        if (!dragState) return;
        const pos = getLocalPos(ev);
        if (!pos) return;
        const ts = chart.timeScale();
        const curLogical = ts.coordinateToLogical(pos.x);
        const curPrice = series.coordinateToPrice(pos.y);
        if (curLogical === null || curPrice === null) return;
        const dIdx = curLogical - dragState.lastLogical;
        const dPrice = curPrice - dragState.lastPrice;
        if (dIdx !== 0 || dPrice !== 0) {
            dragState.drawing.translate(dPrice, dIdx);
            dragState.lastLogical = curLogical;
            dragState.lastPrice = curPrice;
        }
    };

    const onPointerUp = (ev) => {
        if (!dragState) return;
        try { dragTarget.releasePointerCapture && dragTarget.releasePointerCapture(ev.pointerId); } catch (_) {}
        dragState = null;
        saveToStorage();
    };

    if (dragTarget) {
        dragTarget.addEventListener('pointerdown', onPointerDown);
        dragTarget.addEventListener('pointermove', onPointerMove);
        dragTarget.addEventListener('pointerup', onPointerUp);
        dragTarget.addEventListener('pointercancel', onPointerUp);
    }

    // ---- drawing lifecycle ----
    function activate() {
        if (drawingState.active) return;
        drawingState = { active: true, points: [], preview: null };
    }
    function cancel() {
        finishDrawing();
    }
    function finishDrawing() {
        if (drawingState.preview) {
            try { series.detachPrimitive(drawingState.preview); } catch (_) {}
        }
        drawingState = { active: false, points: [], preview: null };
    }

    // ---- persistence ----
    function saveToStorage() {
        try {
            const data = drawings.map((d) => d.serialize());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (_) { /* ignore quota / SSR */ }
    }
    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return;
            for (const item of arr) {
                if (!item || !item.p1 || !item.p2) continue;
                const d = createDrawing(item.p1, item.p2, item.options || {});
                drawings.push(d);
            }
        } catch (_) { /* ignore */ }
    }

    function removeAll() {
        while (drawings.length) {
            const d = drawings.pop();
            destroyDrawing(d);
        }
        hoverDrawing = null;
        saveToStorage();
    }

    function destroy() {
        finishDrawing();
        try { chart.unsubscribeClick(clickHandler); } catch (_) {}
        try { chart.unsubscribeCrosshairMove(moveHandler); } catch (_) {}
        if (dragTarget) {
            dragTarget.removeEventListener('pointerdown', onPointerDown);
            dragTarget.removeEventListener('pointermove', onPointerMove);
            dragTarget.removeEventListener('pointerup', onPointerUp);
            dragTarget.removeEventListener('pointercancel', onPointerUp);
        }
        for (const d of drawings) destroyDrawing(d);
        drawings.length = 0;
        hoverDrawing = null;
    }

    function getDrawings() {
        return drawings.slice();
    }

    return {
        activate,
        cancel,
        destroy,
        getDrawings,
        removeAll,
        loadFromStorage,
        saveToStorage,
    };
}

// ---------------------------------------------------------------------------
// Public factory exports
// ---------------------------------------------------------------------------
export function createNativeTrendLine(chart, series, container, opts = {}) {
    return makeTool('trend', chart, series, container, opts);
}

export function createNativeRectangle(chart, series, container, opts = {}) {
    return makeTool('rect', chart, series, container, opts);
}

// Also expose the underlying primitives for advanced use / testing.
export const __internals = {
    TrendLine,
    Rectangle,
    PreviewRectangle,
    positionsBox,
};
