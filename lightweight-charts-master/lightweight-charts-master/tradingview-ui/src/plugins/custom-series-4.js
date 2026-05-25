/**
 * custom-series-4.js
 *
 * Three TradingView Lightweight Charts v5 plugins ported from the official
 * TypeScript examples to vanilla ES modules:
 *
 *   1) HlcAreaSeries           — ICustomSeriesPaneView (high/low filled area + close line)
 *   2) DualRangeHistogramSeries — ICustomSeriesPaneView (positive/negative coloured columns)
 *   3) BandsIndicatorPrimitive — ISeriesPrimitive (Bollinger-style upper/middle/lower bands)
 *
 * Self-contained. No external helpers — all geometry utilities (bitmap
 * positioning, column layout, rounded-rect drawing) are inlined below.
 *
 * Data shapes:
 *   HLC area              : { time, high, low, close }
 *   Dual-range histogram  : { time, value }          (sign of `value` selects colour)
 *   Bands (attached)      : derived from the base series' own data
 *
 * Public API:
 *   - class HlcAreaSeries
 *   - class DualRangeHistogramSeries
 *   - class BandsIndicatorPrimitive
 *   - addHlcAreaSeries(chart, opts)            -> ISeriesApi<'Custom'>
 *   - addDualRangeHistogramSeries(chart, opts) -> ISeriesApi<'Custom'>
 *   - attachBandsIndicator(series, opts)       -> BandsIndicatorPrimitive
 */

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared geometry helpers (inlined from plugin-examples/helpers)            */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Positions a box between two media-space coordinates, returning a bitmap-space
 * { position, length } pair suitable for `ctx.fillRect`.
 */
function positionsBox(position1Media, position2Media, pixelRatio) {
    const a = Math.round(pixelRatio * position1Media);
    const b = Math.round(pixelRatio * position2Media);
    return {
        position: Math.min(a, b),
        length: Math.abs(b - a) + 1,
    };
}

/* ── Column-layout (used by the histogram renderer) ───────────────────────── */

const ALIGN_TO_MINIMAL_WIDTH_LIMIT = 4;
const SHOW_SPACING_MINIMAL_BAR_WIDTH = 1;

function columnSpacing(barSpacingMedia, hpr) {
    return Math.ceil(barSpacingMedia * hpr) <= SHOW_SPACING_MINIMAL_BAR_WIDTH
        ? 0
        : Math.max(1, Math.floor(hpr));
}

function desiredColumnWidth(barSpacingMedia, hpr, spacing) {
    return Math.round(barSpacingMedia * hpr) -
        (spacing === undefined ? columnSpacing(barSpacingMedia, hpr) : spacing);
}

function columnCommon(barSpacingMedia, hpr) {
    const spacing = columnSpacing(barSpacingMedia, hpr);
    const columnWidthBitmap = desiredColumnWidth(barSpacingMedia, hpr, spacing);
    const shiftLeft = columnWidthBitmap % 2 === 0;
    const columnHalfWidthBitmap = (columnWidthBitmap - (shiftLeft ? 0 : 1)) / 2;
    return { spacing, shiftLeft, columnHalfWidthBitmap, horizontalPixelRatio: hpr };
}

function calculateColumnPosition(xMedia, common, previous) {
    const xBitmapUnRounded = xMedia * common.horizontalPixelRatio;
    const xBitmap = Math.round(xBitmapUnRounded);
    const pos = {
        left: xBitmap - common.columnHalfWidthBitmap,
        right: xBitmap + common.columnHalfWidthBitmap - (common.shiftLeft ? 1 : 0),
        shiftLeft: xBitmap > xBitmapUnRounded,
    };
    const expectedAlignmentShift = common.spacing + 1;
    if (previous && pos.left - previous.right !== expectedAlignmentShift) {
        if (previous.shiftLeft) {
            previous.right = pos.left - expectedAlignmentShift;
        } else {
            pos.left = previous.right + expectedAlignmentShift;
        }
    }
    return pos;
}

function calculateColumnPositionsInPlace(items, barSpacingMedia, hpr, startIndex, endIndex) {
    const common = columnCommon(barSpacingMedia, hpr);
    let previous;
    const end = Math.min(endIndex, items.length);
    for (let i = startIndex; i < end; i++) {
        items[i].column = calculateColumnPosition(items[i].x, common, previous);
        previous = items[i].column;
    }
    let minColumnWidth = Math.ceil(barSpacingMedia * hpr);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.column || i < startIndex || i > endIndex) continue;
        if (item.column.right < item.column.left) item.column.right = item.column.left;
        const width = item.column.right - item.column.left + 1;
        if (width < minColumnWidth) minColumnWidth = width;
    }
    if (common.spacing > 0 && minColumnWidth < ALIGN_TO_MINIMAL_WIDTH_LIMIT) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.column || i < startIndex || i > endIndex) continue;
            const width = item.column.right - item.column.left + 1;
            if (width <= minColumnWidth) continue;
            if (item.column.shiftLeft) item.column.right -= 1;
            else item.column.left += 1;
        }
    }
}

/* ── Rounded-rect drawing (used by the histogram renderer) ────────────────── */

function changeBorderRadius(radii, offset) {
    return radii.map(x => (x === 0 ? 0 : x + offset));
}

function drawRoundRectPath(ctx, x, y, w, h, radii) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radii);
        return;
    }
    // Fallback (manual rounded-rect path) — left/top/right/bottom radii are
    // ordered [tl, tr, br, bl] to match the native roundRect signature.
    ctx.moveTo(x + radii[0], y);
    ctx.lineTo(x + w - radii[1], y);
    if (radii[1] !== 0) ctx.arcTo(x + w, y, x + w, y + radii[1], radii[1]);
    ctx.lineTo(x + w, y + h - radii[2]);
    if (radii[2] !== 0) ctx.arcTo(x + w, y + h, x + w - radii[2], y + h, radii[2]);
    ctx.lineTo(x + radii[3], y + h);
    if (radii[3] !== 0) ctx.arcTo(x, y + h, x, y + h - radii[3], radii[3]);
    ctx.lineTo(x, y + radii[0]);
    if (radii[0] !== 0) ctx.arcTo(x, y, x + radii[0], y, radii[0]);
}

function drawRoundRectWithBorder(
    ctx, left, top, width, height, backgroundColor,
    borderWidth = 0, outerBorderRadius = [0, 0, 0, 0], borderColor = ''
) {
    ctx.save();
    if (!borderWidth || !borderColor || borderColor === backgroundColor) {
        drawRoundRectPath(ctx, left, top, width, height, outerBorderRadius);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.restore();
        return;
    }
    const half = borderWidth / 2;
    const radii = changeBorderRadius(outerBorderRadius, -half);
    drawRoundRectPath(ctx, left + half, top + half, width - borderWidth, height - borderWidth, radii);
    if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fill();
    }
    if (borderColor !== 'transparent') {
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.closePath();
        ctx.stroke();
    }
    ctx.restore();
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  1.  HLC Area Series                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const HLC_AREA_DEFAULTS = {
    highLineColor:    '#049981',
    lowLineColor:     '#F23645',
    closeLineColor:   '#878993',
    areaBottomColor:  'rgba(242, 54, 69, 0.2)',
    areaTopColor:     'rgba(4, 153, 129, 0.2)',
    highLineWidth:    2,
    lowLineWidth:     2,
    closeLineWidth:   2,
};

class HlcAreaSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }
    update(data, options) {
        this._data = data;
        this._options = options;
    }
    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace(scope => this._drawImpl(scope, priceConverter));
    }
    _drawImpl(scope, priceToCoordinate) {
        const data = this._data;
        const options = this._options;
        if (!data || !options || data.bars.length === 0 || data.visibleRange === null) return;

        const hpr = scope.horizontalPixelRatio;
        const vpr = scope.verticalPixelRatio;
        const bars = data.bars.map(bar => ({
            x:     bar.x * hpr,
            high:  priceToCoordinate(bar.originalData.high)  * vpr,
            low:   priceToCoordinate(bar.originalData.low)   * vpr,
            close: priceToCoordinate(bar.originalData.close) * vpr,
        }));

        const ctx = scope.context;
        const { from, to } = data.visibleRange;
        if (to - from < 1) return;

        const lowLine = new Path2D();
        const highLine = new Path2D();
        const closeLine = new Path2D();

        const firstBar = bars[from];
        lowLine.moveTo(firstBar.x, firstBar.low);
        highLine.moveTo(firstBar.x, firstBar.high);
        for (let i = from + 1; i < to; i++) {
            lowLine.lineTo(bars[i].x, bars[i].low);
            highLine.lineTo(bars[i].x, bars[i].high);
        }

        // Close drawn in reverse so its Path2D can be appended to the area paths.
        const lastBar = bars[to - 1];
        closeLine.moveTo(lastBar.x, lastBar.close);
        for (let i = to - 2; i >= from; i--) {
            closeLine.lineTo(bars[i].x, bars[i].close);
        }

        const topArea = new Path2D(highLine);
        topArea.lineTo(lastBar.x, lastBar.close);
        topArea.addPath(closeLine);
        topArea.lineTo(firstBar.x, firstBar.high);
        topArea.closePath();
        ctx.fillStyle = options.areaTopColor;
        ctx.fill(topArea);

        const bottomArea = new Path2D(lowLine);
        bottomArea.lineTo(lastBar.x, lastBar.close);
        bottomArea.addPath(closeLine);
        bottomArea.lineTo(firstBar.x, firstBar.low);
        bottomArea.closePath();
        ctx.fillStyle = options.areaBottomColor;
        ctx.fill(bottomArea);

        ctx.lineJoin = 'round';
        ctx.strokeStyle = options.lowLineColor;
        ctx.lineWidth = options.lowLineWidth * vpr;
        ctx.stroke(lowLine);
        ctx.strokeStyle = options.highLineColor;
        ctx.lineWidth = options.highLineWidth * vpr;
        ctx.stroke(highLine);
        ctx.strokeStyle = options.closeLineColor;
        ctx.lineWidth = options.closeLineWidth * vpr;
        ctx.stroke(closeLine);
    }
}

export class HlcAreaSeries {
    constructor() {
        this._renderer = new HlcAreaSeriesRenderer();
    }
    priceValueBuilder(plotRow) {
        return [plotRow.low, plotRow.high, plotRow.close];
    }
    isWhitespace(data) {
        return data.close === undefined || data.high === undefined || data.low === undefined;
    }
    renderer() {
        return this._renderer;
    }
    update(data, options) {
        this._renderer.update(data, options);
    }
    defaultOptions() {
        return { ...HLC_AREA_DEFAULTS };
    }
}

/**
 * Adds an HLC-area custom series to the chart.
 * @param {IChartApi} chart
 * @param {Partial<typeof HLC_AREA_DEFAULTS>} [opts]
 */
export function addHlcAreaSeries(chart, opts = {}) {
    return chart.addCustomSeries(new HlcAreaSeries(), opts);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2.  Dual-Range Histogram Series                                           */
/* ────────────────────────────────────────────────────────────────────────── */

const DUAL_HIST_DEFAULTS = {
    // [positiveFill, positiveBorder, negativeFill, negativeBorder]
    positiveColor: '#42BDA8',
    negativeColor: '#F77C80',
    borderRadius: 2,
    maxHeight: 130,
};

class DualRangeHistogramSeriesRenderer {
    constructor() {
        this._data = null;
        this._options = null;
    }
    update(data, options) {
        this._data = data;
        this._options = options;
    }
    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace(scope => this._drawImpl(scope, priceConverter));
    }
    _drawImpl(scope, priceToCoordinate) {
        const data = this._data;
        const options = this._options;
        if (!data || !options || data.bars.length === 0 || data.visibleRange === null) return;

        const hpr = scope.horizontalPixelRatio;
        const vpr = scope.verticalPixelRatio;
        const { from, to } = data.visibleRange;

        // Find the largest absolute value in the visible range so we can scale
        // both wings symmetrically to half of `options.maxHeight` media px.
        let maxValue = 0;
        for (let i = from; i < to; i++) {
            const v = data.bars[i].originalData.value;
            const a = Math.abs(v);
            if (a > maxValue) maxValue = a;
        }
        if (maxValue === 0) return;

        const halfHeight = options.maxHeight / 2;
        const bars = data.bars.map(bar => {
            const v = bar.originalData.value;
            return {
                x: bar.x,
                y: (Math.abs(v) / maxValue) * Math.sign(v) * halfHeight,
                positive: v >= 0,
            };
        });

        calculateColumnPositionsInPlace(bars, data.barSpacing, hpr, from, to);

        const zeroY = priceToCoordinate(0) ?? 0;
        const borderWidth = data.barSpacing * hpr < 4 ? 0 : Math.max(1, 0.5 * hpr);

        for (let i = from; i < to; i++) {
            const item = bars[i];
            const column = item.column;
            if (!column) continue;
            const width = Math.min(
                Math.max(hpr, column.right - column.left),
                data.barSpacing * hpr
            );
            const box = positionsBox(zeroY, zeroY - item.y, vpr);
            const radius = options.borderRadius * vpr;
            const actualRadius = Math.floor(Math.min(radius, width / 2, Math.abs(box.length)));
            // Round only the "outer" corners (away from the zero line).
            const borderRadius = item.positive
                ? [actualRadius, actualRadius, 0, 0]
                : [0, 0, actualRadius, actualRadius];
            const color = item.positive ? options.positiveColor : options.negativeColor;
            drawRoundRectWithBorder(
                scope.context,
                column.left, box.position,
                width, box.length,
                color, borderWidth, borderRadius, 'transparent'
            );
        }
    }
}

export class DualRangeHistogramSeries {
    constructor() {
        this._renderer = new DualRangeHistogramSeriesRenderer();
    }
    priceValueBuilder() {
        // Always keep the zero line in view for symmetric auto-scaling.
        return [0];
    }
    isWhitespace(data) {
        return data.value === undefined || data.value === null;
    }
    renderer() {
        return this._renderer;
    }
    update(data, options) {
        this._renderer.update(data, options);
    }
    defaultOptions() {
        return { ...DUAL_HIST_DEFAULTS };
    }
}

/**
 * Adds a dual-range (positive/negative) histogram custom series to the chart.
 * @param {IChartApi} chart
 * @param {Partial<typeof DUAL_HIST_DEFAULTS>} [opts]
 */
export function addDualRangeHistogramSeries(chart, opts = {}) {
    return chart.addCustomSeries(new DualRangeHistogramSeries(), opts);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  3.  Bands Indicator Primitive (Bollinger-style)                           */
/* ────────────────────────────────────────────────────────────────────────── */

const BANDS_DEFAULTS = {
    period: 20,
    stdDev: 2,
    upperColor:  'rgba(33, 150, 243, 0.9)',
    middleColor: 'rgba(255, 152, 0, 0.9)',
    lowerColor:  'rgba(33, 150, 243, 0.9)',
    fillColor:   'rgba(33, 150, 243, 0.12)',
    lineWidth:   1,
    drawMiddle:  true,
};

/** Pulls a plotting price out of any of the series-data shapes lightweight-charts supports. */
function extractPrice(d) {
    if (d == null) return undefined;
    if (typeof d.close === 'number') return d.close;
    if (typeof d.value === 'number') return d.value;
    return undefined;
}

class BandsIndicatorPaneRenderer {
    constructor(viewData) {
        this._viewData = viewData;
    }
    draw() { /* nothing — bands sit behind candles */ }
    drawBackground(target) {
        const points = this._viewData.data;
        const options = this._viewData.options;
        if (!points || points.length < 2) return;

        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            ctx.save();
            ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

            // Filled region between upper and lower bands.
            const region = new Path2D();
            region.moveTo(points[0].x, points[0].upper);
            for (let i = 1; i < points.length; i++) {
                region.lineTo(points[i].x, points[i].upper);
            }
            for (let i = points.length - 1; i >= 0; i--) {
                region.lineTo(points[i].x, points[i].lower);
            }
            region.closePath();
            ctx.fillStyle = options.fillColor;
            ctx.fill(region);

            // Upper line.
            ctx.lineWidth = options.lineWidth;
            ctx.strokeStyle = options.upperColor;
            const upperLine = new Path2D();
            upperLine.moveTo(points[0].x, points[0].upper);
            for (let i = 1; i < points.length; i++) upperLine.lineTo(points[i].x, points[i].upper);
            ctx.stroke(upperLine);

            // Lower line.
            ctx.strokeStyle = options.lowerColor;
            const lowerLine = new Path2D();
            lowerLine.moveTo(points[0].x, points[0].lower);
            for (let i = 1; i < points.length; i++) lowerLine.lineTo(points[i].x, points[i].lower);
            ctx.stroke(lowerLine);

            // Middle (moving-average) line.
            if (options.drawMiddle) {
                ctx.strokeStyle = options.middleColor;
                const midLine = new Path2D();
                midLine.moveTo(points[0].x, points[0].middle);
                for (let i = 1; i < points.length; i++) midLine.lineTo(points[i].x, points[i].middle);
                ctx.stroke(midLine);
            }
            ctx.restore();
        });
    }
}

class BandsIndicatorPaneView {
    constructor(source) {
        this._source = source;
        this._data = { data: [], options: source._options };
    }
    update() {
        const series = this._source._series;
        const chart = this._source._chart;
        if (!series || !chart) {
            this._data.data = [];
            return;
        }
        const ts = chart.timeScale();
        this._data.options = this._source._options;
        this._data.data = this._source._bandsData.map(d => ({
            x:      ts.timeToCoordinate(d.time) ?? -100,
            upper:  series.priceToCoordinate(d.upper)  ?? -100,
            middle: series.priceToCoordinate(d.middle) ?? -100,
            lower:  series.priceToCoordinate(d.lower)  ?? -100,
        }));
    }
    renderer() {
        return new BandsIndicatorPaneRenderer(this._data);
    }
}

export class BandsIndicatorPrimitive {
    constructor(options = {}) {
        this._options = { ...BANDS_DEFAULTS, ...options };
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
        this._paneViews = [new BandsIndicatorPaneView(this)];
        this._bandsData = [];
        this._minValue = Number.POSITIVE_INFINITY;
        this._maxValue = Number.NEGATIVE_INFINITY;

        // Pre-bound so we can subscribe/unsubscribe with the same reference.
        this._onDataChanged = () => {
            this._recalculate();
            if (this._requestUpdate) this._requestUpdate();
        };
    }

    /* ── ISeriesPrimitive lifecycle ────────────────────────────────────── */

    attached(param) {
        this._chart = param.chart;
        this._series = param.series;
        this._requestUpdate = param.requestUpdate;
        this._series.subscribeDataChanged(this._onDataChanged);
        this._recalculate();
        if (this._requestUpdate) this._requestUpdate();
    }

    detached() {
        if (this._series) this._series.unsubscribeDataChanged(this._onDataChanged);
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }

    updateAllViews() {
        for (const view of this._paneViews) view.update();
    }

    paneViews() {
        return this._paneViews;
    }

    autoscaleInfo() {
        if (!isFinite(this._minValue) || !isFinite(this._maxValue)) return null;
        return {
            priceRange: { minValue: this._minValue, maxValue: this._maxValue },
        };
    }

    /* ── Public helpers ────────────────────────────────────────────────── */

    applyOptions(partial) {
        this._options = { ...this._options, ...partial };
        if (this._requestUpdate) this._requestUpdate();
    }

    /* ── Internal: compute SMA + stddev bands from the series data ─────── */

    _recalculate() {
        this._bandsData = [];
        this._minValue = Number.POSITIVE_INFINITY;
        this._maxValue = Number.NEGATIVE_INFINITY;
        if (!this._series) return;

        const raw = this._series.data();
        const period = Math.max(1, Math.floor(this._options.period));
        const k = this._options.stdDev;

        // Single sliding-window pass: maintain running sum and sum-of-squares.
        let sum = 0;
        let sumSq = 0;
        const prices = new Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            const p = extractPrice(raw[i]);
            prices[i] = (typeof p === 'number') ? p : NaN;
        }

        for (let i = 0; i < prices.length; i++) {
            const p = prices[i];
            if (!isNaN(p)) {
                sum += p;
                sumSq += p * p;
            }
            if (i >= period) {
                const dropped = prices[i - period];
                if (!isNaN(dropped)) {
                    sum -= dropped;
                    sumSq -= dropped * dropped;
                }
            }
            if (i < period - 1) continue;

            const mean = sum / period;
            const variance = Math.max(0, (sumSq / period) - mean * mean);
            const sd = Math.sqrt(variance);
            const upper = mean + k * sd;
            const lower = mean - k * sd;
            if (upper > this._maxValue) this._maxValue = upper;
            if (lower < this._minValue) this._minValue = lower;
            this._bandsData.push({
                time:   raw[i].time,
                upper,
                middle: mean,
                lower,
            });
        }
    }
}

/**
 * Convenience factory: builds a BandsIndicatorPrimitive and attaches it.
 * @param {ISeriesApi<any>} series
 * @param {Partial<typeof BANDS_DEFAULTS>} [opts]
 */
export function attachBandsIndicator(series, opts = {}) {
    const primitive = new BandsIndicatorPrimitive(opts);
    series.attachPrimitive(primitive);
    return primitive;
}
