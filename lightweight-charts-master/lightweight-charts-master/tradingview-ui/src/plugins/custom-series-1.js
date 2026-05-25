/**
 * custom-series-1.js
 *
 * Pure-JS port of two lightweight-charts v5 custom-series plugin examples:
 *
 *   1. RoundedCandlesSeries  — candlesticks rendered with rounded body corners.
 *   2. PrettyHistogramSeries — histogram with rounded tops and a vertical
 *                              gradient fill (top -> bottom alpha falloff).
 *
 * Both classes implement the ICustomSeriesPaneView<Time> interface and can be
 * attached to a chart via the convenience factory helpers exported at the
 * bottom of this file (addRoundedCandlesSeries / addPrettyHistogramSeries).
 *
 * No external dependencies beyond the already-installed `lightweight-charts`
 * package (v5.2.0). All dimension/positioning helpers from the original
 * TypeScript plugin-examples are inlined below so this file is self-contained.
 */

import { customSeriesDefaultOptions } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Inlined dimension helpers (ported from plugin-examples/src/helpers/dimensions)
// ---------------------------------------------------------------------------

/**
 * Default grid / crosshair line width in bitmap sizing.
 * @param {number} horizontalPixelRatio
 * @returns {number}
 */
function gridAndCrosshairBitmapWidth(horizontalPixelRatio) {
    return Math.max(1, Math.floor(horizontalPixelRatio));
}

/**
 * Default grid / crosshair line width in media sizing.
 * @param {number} horizontalPixelRatio
 * @returns {number}
 */
function gridAndCrosshairMediaWidth(horizontalPixelRatio) {
    return gridAndCrosshairBitmapWidth(horizontalPixelRatio) / horizontalPixelRatio;
}

/**
 * Bitmap position+length for a horizontally-centered line.
 * @param {number} positionMedia
 * @param {number} pixelRatio
 * @param {number} [desiredWidthMedia=1]
 * @param {boolean} [widthIsBitmap]
 * @returns {{position:number,length:number}}
 */
function positionsLine(positionMedia, pixelRatio, desiredWidthMedia = 1, widthIsBitmap) {
    const scaledPosition = Math.round(pixelRatio * positionMedia);
    const lineBitmapWidth = widthIsBitmap
        ? desiredWidthMedia
        : Math.round(desiredWidthMedia * pixelRatio);
    const offset = Math.floor(lineBitmapWidth * 0.5);
    const position = scaledPosition - offset;
    return { position, length: lineBitmapWidth };
}

/**
 * Bitmap position+length for a box spanning two media coordinates.
 * @param {number} position1Media
 * @param {number} position2Media
 * @param {number} pixelRatio
 * @returns {{position:number,length:number}}
 */
function positionsBox(position1Media, position2Media, pixelRatio) {
    const scaledPosition1 = Math.round(pixelRatio * position1Media);
    const scaledPosition2 = Math.round(pixelRatio * position2Media);
    return {
        position: Math.min(scaledPosition1, scaledPosition2),
        length: Math.abs(scaledPosition2 - scaledPosition1) + 1,
    };
}

/**
 * Optimal candle body width in bitmap pixels (mirrors the library's own logic
 * so our custom candle width matches the built-in candlestick series).
 * @param {number} barSpacing
 * @param {number} pixelRatio
 * @returns {number}
 */
function optimalCandlestickWidth(barSpacing, pixelRatio) {
    const barSpacingSpecialCaseFrom = 2.5;
    const barSpacingSpecialCaseTo = 4;
    const barSpacingSpecialCaseCoeff = 3;
    if (barSpacing >= barSpacingSpecialCaseFrom && barSpacing <= barSpacingSpecialCaseTo) {
        return Math.floor(barSpacingSpecialCaseCoeff * pixelRatio);
    }
    const barSpacingReducingCoeff = 0.2;
    const coeff =
        1 -
        (barSpacingReducingCoeff *
            Math.atan(Math.max(barSpacingSpecialCaseTo, barSpacing) - barSpacingSpecialCaseTo)) /
            (Math.PI * 0.5);
    const res = Math.floor(barSpacing * coeff * pixelRatio);
    const scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
    const optimal = Math.min(res, scaledBarSpacing);
    return Math.max(Math.floor(pixelRatio), optimal);
}

/**
 * Candle body width matching the built-in candlestick series.
 * @param {number} barSpacing
 * @param {number} horizontalPixelRatio
 * @returns {number}
 */
function candlestickWidth(barSpacing, horizontalPixelRatio) {
    let width = optimalCandlestickWidth(barSpacing, horizontalPixelRatio);
    if (width >= 2) {
        const wickWidth = Math.floor(horizontalPixelRatio);
        if (wickWidth % 2 !== width % 2) {
            width--;
        }
    }
    return width;
}

// ---------------------------------------------------------------------------
// Color utility — used by the histogram for its gradient fill.
// ---------------------------------------------------------------------------

/**
 * Convert any CSS color (`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`)
 * into an `rgba(r, g, b, a)` string with the supplied alpha. Falls back to
 * the original color if it cannot be parsed.
 * @param {string} color
 * @param {number} alpha
 * @returns {string}
 */
function colorWithAlpha(color, alpha) {
    if (typeof color !== 'string') return color;
    const a = Math.max(0, Math.min(1, alpha));

    // #rgb / #rgba
    let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(color);
    if (m) {
        const r = parseInt(m[1] + m[1], 16);
        const g = parseInt(m[2] + m[2], 16);
        const b = parseInt(m[3] + m[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    // #rrggbb / #rrggbbaa
    m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(color);
    if (m) {
        const r = parseInt(m[1], 16);
        const g = parseInt(m[2], 16);
        const b = parseInt(m[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    // rgb(...) / rgba(...)
    m = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i.exec(color);
    if (m) {
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
    }
    return color;
}

// ===========================================================================
// 1. Rounded Candles Series
// ===========================================================================

const roundedCandlesDefaultOptions = {
    ...customSeriesDefaultOptions,
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickVisible: true,
    borderVisible: true,
    borderColor: '#378658',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickColor: '#737375',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    /**
     * Corner radius as a function of bar spacing (media px).
     * @param {number} bs
     */
    radius: function (bs) {
        if (bs < 4) return 0;
        return bs / 3;
    },
};

/**
 * Pane-renderer for RoundedCandlesSeries.
 * Implements ICustomSeriesPaneRenderer.
 */
class RoundedCandlesSeriesRenderer {
    constructor() {
        /** @type {import('lightweight-charts').PaneRendererCustomData<any, any> | null} */
        this._data = null;
        /** @type {any} */
        this._options = null;
    }

    /**
     * @param {import('fancy-canvas').CanvasRenderingTarget2D} target
     * @param {import('lightweight-charts').PriceToCoordinateConverter} priceConverter
     */
    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace((scope) => this._drawImpl(scope, priceConverter));
    }

    /**
     * @param {import('lightweight-charts').PaneRendererCustomData<any, any>} data
     * @param {any} options
     */
    update(data, options) {
        this._data = data;
        this._options = options;
    }

    _drawImpl(renderingScope, priceToCoordinate) {
        if (
            this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null
        ) {
            return;
        }

        let lastClose = -Infinity;
        const bars = this._data.bars.map((bar) => {
            const isUp = bar.originalData.close >= lastClose;
            lastClose = bar.originalData.close ?? lastClose;
            const openY = priceToCoordinate(bar.originalData.open) ?? 0;
            const highY = priceToCoordinate(bar.originalData.high) ?? 0;
            const lowY = priceToCoordinate(bar.originalData.low) ?? 0;
            const closeY = priceToCoordinate(bar.originalData.close) ?? 0;
            return { openY, highY, lowY, closeY, x: bar.x, isUp };
        });

        const radius = this._options.radius(this._data.barSpacing);
        this._drawWicks(renderingScope, bars, this._data.visibleRange);
        this._drawCandles(renderingScope, bars, this._data.visibleRange, radius);
    }

    _drawWicks(renderingScope, bars, visibleRange) {
        if (this._data === null || this._options === null) return;
        if (this._options.wickVisible === false) return;

        const { context: ctx, horizontalPixelRatio, verticalPixelRatio } = renderingScope;
        const wickWidth = gridAndCrosshairMediaWidth(horizontalPixelRatio);

        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const bar = bars[i];
            ctx.fillStyle = bar.isUp
                ? this._options.wickUpColor
                : this._options.wickDownColor;

            const verticalPositions = positionsBox(bar.lowY, bar.highY, verticalPixelRatio);
            const linePositions = positionsLine(bar.x, horizontalPixelRatio, wickWidth);
            ctx.fillRect(
                linePositions.position,
                verticalPositions.position,
                linePositions.length,
                verticalPositions.length
            );
        }
    }

    _drawCandles(renderingScope, bars, visibleRange, radius) {
        if (this._data === null || this._options === null) return;

        const { context: ctx, horizontalPixelRatio, verticalPixelRatio } = renderingScope;

        // Media width — positionsLine() scales by pixelRatio internally.
        const candleBodyWidth = candlestickWidth(this._data.barSpacing, 1);

        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const bar = bars[i];
            const verticalPositions = positionsBox(
                Math.min(bar.openY, bar.closeY),
                Math.max(bar.openY, bar.closeY),
                verticalPixelRatio
            );
            const linePositions = positionsLine(bar.x, horizontalPixelRatio, candleBodyWidth);

            ctx.fillStyle = bar.isUp ? this._options.upColor : this._options.downColor;

            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(
                    linePositions.position,
                    verticalPositions.position,
                    linePositions.length,
                    verticalPositions.length,
                    radius
                );
                ctx.fill();
            } else {
                ctx.fillRect(
                    linePositions.position,
                    verticalPositions.position,
                    linePositions.length,
                    verticalPositions.length
                );
            }
        }
    }
}

/**
 * Rounded-corner candlestick custom series.
 * Implements ICustomSeriesPaneView<Time>.
 *
 * Data shape per point: { time, open, high, low, close }.
 */
export class RoundedCandlesSeries {
    constructor() {
        this._renderer = new RoundedCandlesSeriesRenderer();
    }

    /**
     * @param {{open:number,high:number,low:number,close:number}} plotRow
     * @returns {number[]}
     */
    priceValueBuilder(plotRow) {
        return [plotRow.high, plotRow.low, plotRow.close];
    }

    renderer() {
        return this._renderer;
    }

    isWhitespace(data) {
        return data.close === undefined;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return roundedCandlesDefaultOptions;
    }
}

// ===========================================================================
// 2. Pretty Histogram Series (rounded tops + vertical gradient fill)
// ===========================================================================

const prettyHistogramDefaultOptions = {
    ...customSeriesDefaultOptions,
    color: '#D63864',
    widthPercent: 50,
    radius: 4,
    // Extra (vs. the original TS example): vertical gradient toward the
    // baseline. Set `gradient: false` to disable.
    gradient: true,
    gradientTopAlpha: 1.0,
    gradientBottomAlpha: 0.15,
};

/**
 * Pane-renderer for PrettyHistogramSeries.
 * Implements ICustomSeriesPaneRenderer.
 */
class PrettyHistogramSeriesRenderer {
    constructor() {
        /** @type {import('lightweight-charts').PaneRendererCustomData<any, any> | null} */
        this._data = null;
        /** @type {any} */
        this._options = null;
    }

    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace((scope) => this._drawImpl(scope, priceConverter));
    }

    update(data, options) {
        this._data = data;
        this._options = options;
    }

    _drawImpl(renderingScope, priceToCoordinate) {
        if (
            this._data === null ||
            this._data.bars.length === 0 ||
            this._data.visibleRange === null ||
            this._options === null
        ) {
            return;
        }

        const options = this._options;
        const ctx = renderingScope.context;
        const { horizontalPixelRatio, verticalPixelRatio } = renderingScope;

        const bars = this._data.bars.map((bar) => ({
            x: bar.x * horizontalPixelRatio,
            value: priceToCoordinate(bar.originalData.value) ?? 0,
            color: bar.barColor ?? options.color,
        }));

        const zeroCoordinate = priceToCoordinate(0) ?? 0;
        const width = Math.max(
            1,
            Math.round(0.01 * options.widthPercent * this._data.barSpacing * horizontalPixelRatio)
        );
        const radius = Math.floor(options.radius * horizontalPixelRatio);

        const useGradient = options.gradient !== false && typeof ctx.createLinearGradient === 'function';

        // When using a per-bar gradient we cannot batch by color (each bar
        // needs its own fillStyle), so draw each bar individually. Without a
        // gradient we mirror the original batched-path behaviour.
        if (useGradient) {
            const visibleBars = bars.slice(this._data.visibleRange.from, this._data.visibleRange.to + 1);
            for (const item of visibleBars) {
                const yPositionBox = positionsBox(zeroCoordinate, item.value, verticalPixelRatio);
                const actualRadius = Math.floor(
                    Math.min(radius, width / 2, Math.abs(yPositionBox.length))
                );
                const left = Math.round(item.x - width / 2);
                const isNegative = item.value < zeroCoordinate;

                // Gradient runs from the bar tip toward the baseline.
                const tipY = isNegative
                    ? yPositionBox.position + yPositionBox.length
                    : yPositionBox.position;
                const baseY = isNegative
                    ? yPositionBox.position
                    : yPositionBox.position + yPositionBox.length;

                const grad = ctx.createLinearGradient(0, tipY, 0, baseY);
                grad.addColorStop(0, colorWithAlpha(item.color, options.gradientTopAlpha));
                grad.addColorStop(1, colorWithAlpha(item.color, options.gradientBottomAlpha));
                ctx.fillStyle = grad;

                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(
                        left,
                        yPositionBox.position,
                        width,
                        yPositionBox.length,
                        isNegative
                            ? [actualRadius, actualRadius, 0, 0]
                            : [0, 0, actualRadius, actualRadius]
                    );
                } else {
                    ctx.rect(left, yPositionBox.position, width, yPositionBox.length);
                }
                ctx.fill();
            }
            return;
        }

        // Flat-fill path: batch consecutive same-color bars into one fill.
        let prevColor = null;
        ctx.beginPath();
        const visibleBars = bars.slice(this._data.visibleRange.from, this._data.visibleRange.to + 1);
        for (const item of visibleBars) {
            const color = item.color;
            if (prevColor !== null && prevColor !== color) {
                ctx.fill();
                ctx.beginPath();
            }
            ctx.fillStyle = color;
            const yPositionBox = positionsBox(zeroCoordinate, item.value, verticalPixelRatio);
            const actualRadius = Math.floor(
                Math.min(radius, width / 2, Math.abs(yPositionBox.length))
            );
            const left = Math.round(item.x - width / 2);
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(
                    left,
                    yPositionBox.position,
                    width,
                    yPositionBox.length,
                    item.value < zeroCoordinate
                        ? [actualRadius, actualRadius, 0, 0]
                        : [0, 0, actualRadius, actualRadius]
                );
            } else {
                ctx.rect(left, yPositionBox.position, width, yPositionBox.length);
            }
            prevColor = color;
        }
        ctx.fill();
    }
}

/**
 * Pretty histogram custom series — rounded bar tops with optional vertical
 * gradient fill. Implements ICustomSeriesPaneView<Time>.
 *
 * Data shape per point: { time, value, color? }.
 */
export class PrettyHistogramSeries {
    constructor() {
        this._renderer = new PrettyHistogramSeriesRenderer();
    }

    priceValueBuilder(plotRow) {
        return [plotRow.value];
    }

    isWhitespace(data) {
        return data.value === undefined;
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return prettyHistogramDefaultOptions;
    }
}

// ===========================================================================
// Factory helpers
// ===========================================================================

/**
 * Convenience wrapper around `chart.addCustomSeries(new RoundedCandlesSeries(), opts)`.
 * @param {import('lightweight-charts').IChartApi} chart
 * @param {Partial<typeof roundedCandlesDefaultOptions>} [opts]
 * @param {number} [paneIndex]
 * @returns {import('lightweight-charts').ISeriesApi<'Custom'>}
 */
export function addRoundedCandlesSeries(chart, opts, paneIndex) {
    if (!chart || typeof chart.addCustomSeries !== 'function') {
        throw new Error('addRoundedCandlesSeries: chart.addCustomSeries is not available');
    }
    return chart.addCustomSeries(new RoundedCandlesSeries(), opts || {}, paneIndex);
}

/**
 * Convenience wrapper around `chart.addCustomSeries(new PrettyHistogramSeries(), opts)`.
 * @param {import('lightweight-charts').IChartApi} chart
 * @param {Partial<typeof prettyHistogramDefaultOptions>} [opts]
 * @param {number} [paneIndex]
 * @returns {import('lightweight-charts').ISeriesApi<'Custom'>}
 */
export function addPrettyHistogramSeries(chart, opts, paneIndex) {
    if (!chart || typeof chart.addCustomSeries !== 'function') {
        throw new Error('addPrettyHistogramSeries: chart.addCustomSeries is not available');
    }
    return chart.addCustomSeries(new PrettyHistogramSeries(), opts || {}, paneIndex);
}

export default {
    RoundedCandlesSeries,
    PrettyHistogramSeries,
    addRoundedCandlesSeries,
    addPrettyHistogramSeries,
};
