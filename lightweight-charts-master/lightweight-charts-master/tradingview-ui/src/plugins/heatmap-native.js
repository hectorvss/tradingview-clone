// heatmap-native.js
// Self-contained port (TypeScript -> pure JS) of two lightweight-charts plugins:
//   - plugin-examples/src/plugins/heatmap-series/   (ICustomSeriesPaneView)
//   - plugin-examples/src/plugins/image-watermark/  (ISeriesPrimitive image watermark)
//
// Targets lightweight-charts v5.2.0. No external imports — dimension helpers
// (fullBarWidth / positionsBox) are inlined.
//
// Public API:
//   class HeatmapSeries                       — ICustomSeriesPaneView implementation
//   addHeatmapSeries(chart, opts)             — factory: returns the ISeriesApi
//   attachImageWatermark(chart, paneIndex, imageUrl, opts) -> { destroy() }
//
// Heatmap data shape (per bar):
//   { time, cells: [{ lowPrice, highPrice, amount, color? }, ...] }
// The original TS plugin uses { low, high, amount }; both spellings are accepted
// transparently here so existing data sources keep working.

// ---------------------------------------------------------------------------
// Dimension helpers (inlined from plugin-examples/src/helpers/dimensions/*)
// ---------------------------------------------------------------------------

function fullBarWidth(xMedia, halfBarSpacingMedia, horizontalPixelRatio) {
        const leftMedia = xMedia - halfBarSpacingMedia;
        const rightMedia = xMedia + halfBarSpacingMedia;
        const leftBitmap = Math.round(leftMedia * horizontalPixelRatio);
        const rightBitmap = Math.round(rightMedia * horizontalPixelRatio);
        return { position: leftBitmap, length: rightBitmap - leftBitmap };
}

function positionsBox(p1Media, p2Media, pixelRatio) {
        const s1 = Math.round(pixelRatio * p1Media);
        const s2 = Math.round(pixelRatio * p2Media);
        return {
                position: Math.min(s1, s2),
                length: Math.abs(s2 - s1) + 1,
        };
}

// ---------------------------------------------------------------------------
// Cell normalisation — accept both {low,high} and {lowPrice,highPrice}
// ---------------------------------------------------------------------------

function cellLow(cell) {
        return cell.low !== undefined ? cell.low : cell.lowPrice;
}
function cellHigh(cell) {
        return cell.high !== undefined ? cell.high : cell.highPrice;
}

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

export const heatmapDefaultOptions = {
        // CustomSeriesOptions defaults that we explicitly want
        lastValueVisible: false,
        priceLineVisible: false,
        priceScaleId: 'right',
        visible: true,
        // shader: amount in [0..100] -> css color
        cellShader: function defaultCellShader(amount) {
                const amt = Math.min(Math.max(0, amount), 100);
                return (
                        'rgba(0, ' +
                        (100 + amt * 1.55) +
                        ', ' +
                        (0 + amt) +
                        ', ' +
                        (0.2 + amt * 0.8) +
                        ')'
                );
        },
        cellBorderWidth: 1,
        cellBorderColor: 'transparent',
};

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

class HeatmapSeriesRenderer {
        constructor() {
                this._data = null;
                this._options = null;
        }

        update(data, options) {
                this._data = data;
                this._options = options;
        }

        draw(target, priceConverter) {
                const self = this;
                target.useBitmapCoordinateSpace(function (scope) {
                        self._drawImpl(scope, priceConverter);
                });
        }

        _drawImpl(renderingScope, priceToCoordinate) {
                const data = this._data;
                const options = this._options;
                if (
                        data === null ||
                        options === null ||
                        data.bars.length === 0 ||
                        data.visibleRange === null
                ) {
                        return;
                }

                const bars = data.bars.map(function (bar) {
                        const original = bar.originalData;
                        const cells = (original && original.cells) || [];
                        return {
                                x: bar.x,
                                cells: cells.map(function (cell) {
                                        return {
                                                amount: cell.amount,
                                                color: cell.color,
                                                low: priceToCoordinate(cellLow(cell)),
                                                high: priceToCoordinate(cellHigh(cell)),
                                        };
                                }),
                        };
                });

                const drawBorder = data.barSpacing > options.cellBorderWidth * 3;
                const ctx = renderingScope.context;

                for (let i = data.visibleRange.from; i < data.visibleRange.to; i++) {
                        const bar = bars[i];
                        if (!bar) continue;
                        const fullWidth = fullBarWidth(
                                bar.x,
                                data.barSpacing / 2,
                                renderingScope.horizontalPixelRatio
                        );
                        const borderH = drawBorder
                                ? options.cellBorderWidth * renderingScope.horizontalPixelRatio
                                : 0;
                        const borderV = drawBorder
                                ? options.cellBorderWidth * renderingScope.verticalPixelRatio
                                : 0;

                        for (const cell of bar.cells) {
                                if (cell.low === null || cell.high === null) continue;
                                const vert = positionsBox(
                                        cell.low,
                                        cell.high,
                                        renderingScope.verticalPixelRatio
                                );
                                ctx.fillStyle =
                                        cell.color !== undefined && cell.color !== null
                                                ? cell.color
                                                : options.cellShader(cell.amount);
                                ctx.fillRect(
                                        fullWidth.position + borderH,
                                        vert.position + borderV,
                                        fullWidth.length - borderH * 2,
                                        vert.length - 1 - borderV * 2
                                );
                                if (
                                        drawBorder &&
                                        options.cellBorderWidth &&
                                        options.cellBorderColor !== 'transparent'
                                ) {
                                        ctx.beginPath();
                                        ctx.rect(
                                                fullWidth.position + borderH / 2,
                                                vert.position + borderV / 2,
                                                fullWidth.length - borderH,
                                                vert.length - 1 - borderV
                                        );
                                        ctx.strokeStyle = options.cellBorderColor;
                                        ctx.lineWidth = borderH;
                                        ctx.stroke();
                                }
                        }
                }
        }
}

// ---------------------------------------------------------------------------
// HeatmapSeries — ICustomSeriesPaneView
// ---------------------------------------------------------------------------

export class HeatmapSeries {
        constructor() {
                this._renderer = new HeatmapSeriesRenderer();
        }

        // Build the price values used by the chart to determine autoscale range
        // and the value associated with the bar. Returns [low, high, mid].
        priceValueBuilder(plotRow) {
                const cells = plotRow && plotRow.cells;
                if (!cells || cells.length < 1) {
                        return [NaN];
                }
                let low = Infinity;
                let high = -Infinity;
                for (const cell of cells) {
                        const l = cellLow(cell);
                        const h = cellHigh(cell);
                        if (l < low) low = l;
                        if (h > high) high = h;
                }
                const mid = low + (high - low) / 2;
                return [low, high, mid];
        }

        isWhitespace(data) {
                return (
                        !data ||
                        data.cells === undefined ||
                        data.cells === null ||
                        data.cells.length < 1
                );
        }

        renderer() {
                return this._renderer;
        }

        update(data, options) {
                this._renderer.update(data, options);
        }

        defaultOptions() {
                return heatmapDefaultOptions;
        }
}

// ---------------------------------------------------------------------------
// Factory: addHeatmapSeries(chart, opts)
// ---------------------------------------------------------------------------

export function addHeatmapSeries(chart, opts) {
        if (!chart || typeof chart.addCustomSeries !== 'function') {
                throw new Error(
                        'addHeatmapSeries: chart.addCustomSeries is not available. ' +
                                'Requires lightweight-charts v5 with custom series support.'
                );
        }
        const view = new HeatmapSeries();
        const options = Object.assign({}, heatmapDefaultOptions, opts || {});
        return chart.addCustomSeries(view, options);
}

// ---------------------------------------------------------------------------
// Image watermark — ISeriesPrimitive
// ---------------------------------------------------------------------------

class ImageWatermarkPaneRenderer {
        constructor(source, view) {
                this._source = source;
                this._view = view;
        }
        draw(target) {
                const self = this;
                target.useMediaCoordinateSpace(function (scope) {
                        const ctx = scope.context;
                        const pos = self._view._placement;
                        if (!pos) return;
                        const img = self._source._imgElement;
                        if (!img) return;
                        const prevAlpha = ctx.globalAlpha;
                        ctx.globalAlpha =
                                self._source._options.alpha !== undefined
                                        ? self._source._options.alpha
                                        : 1;
                        ctx.drawImage(img, pos.x, pos.y, pos.width, pos.height);
                        ctx.globalAlpha = prevAlpha;
                });
        }
}

class ImageWatermarkPaneView {
        constructor(source) {
                this._source = source;
                this._placement = null;
        }
        zOrder() {
                return 'bottom';
        }
        update() {
                this._placement = this._determinePlacement();
        }
        renderer() {
                return new ImageWatermarkPaneRenderer(this._source, this);
        }
        _determinePlacement() {
                const src = this._source;
                const chart = src._chart;
                if (!chart || !src._imageWidth || !src._imageHeight) return null;

                // Try left price-scale width (some charts may not have one)
                let leftPriceScaleWidth = 0;
                try {
                        leftPriceScaleWidth = chart.priceScale('left').width() || 0;
                } catch (e) {
                        leftPriceScaleWidth = 0;
                }
                const plotAreaWidth = chart.timeScale().width();
                const startX = leftPriceScaleWidth;
                const plotAreaHeight =
                        chart.chartElement().clientHeight - chart.timeScale().height();

                const plotCentreX = Math.round(plotAreaWidth / 2) + startX;
                const plotCentreY = Math.round(plotAreaHeight / 2);

                const padding = src._options.padding || 0;
                let availableWidth = plotAreaWidth - 2 * padding;
                let availableHeight = plotAreaHeight - 2 * padding;

                if (src._options.maxHeight) {
                        availableHeight = Math.min(availableHeight, src._options.maxHeight);
                }
                if (src._options.maxWidth) {
                        availableWidth = Math.min(availableWidth, src._options.maxWidth);
                }
                if (availableWidth <= 0 || availableHeight <= 0) return null;

                const scaleX = availableWidth / src._imageWidth;
                const scaleY = availableHeight / src._imageHeight;
                const scale = Math.min(scaleX, scaleY);

                const drawWidth = src._imageWidth * scale;
                const drawHeight = src._imageHeight * scale;

                return {
                        x: plotCentreX - 0.5 * drawWidth,
                        y: plotCentreY - 0.5 * drawHeight,
                        width: drawWidth,
                        height: drawHeight,
                };
        }
}

export class ImageWatermark {
        constructor(imageUrl, options) {
                this._imageUrl = imageUrl;
                this._options = options || {};
                this._paneViews = [new ImageWatermarkPaneView(this)];
                this._imgElement = null;
                this._imageWidth = 0;
                this._imageHeight = 0;
                this._chart = null;
                this._requestUpdate = null;
        }

        attached(param) {
                const self = this;
                this._chart = param.chart;
                this._requestUpdate = param.requestUpdate;
                const img = new Image();
                img.onload = function () {
                        self._imageWidth = img.naturalWidth || 1;
                        self._imageHeight = img.naturalHeight || 1;
                        self._paneViews.forEach(function (pv) {
                                pv.update();
                        });
                        self.requestUpdate();
                };
                img.src = this._imageUrl;
                this._imgElement = img;
        }

        detached() {
                this._imgElement = null;
                this._chart = null;
                this._requestUpdate = null;
        }

        requestUpdate() {
                if (this._requestUpdate) this._requestUpdate();
        }

        updateAllViews() {
                this._paneViews.forEach(function (pv) {
                        pv.update();
                });
        }

        paneViews() {
                return this._paneViews;
        }
}

// ---------------------------------------------------------------------------
// attachImageWatermark(chart, paneIndex, imageUrl, opts)
// ---------------------------------------------------------------------------
//
// Series primitives must be attached to a series. Lightweight-charts v5 also
// exposes pane primitives via IPaneApi#attachPrimitive in some builds; we
// prefer that route, and fall back to attaching to the first series in the
// requested pane.
export function attachImageWatermark(chart, paneIndex, imageUrl, opts) {
        if (!chart) throw new Error('attachImageWatermark: chart is required');
        if (!imageUrl) throw new Error('attachImageWatermark: imageUrl is required');

        const primitive = new ImageWatermark(imageUrl, opts || {});
        const pIndex = typeof paneIndex === 'number' ? paneIndex : 0;

        let attachedSeries = null;
        let attachedPane = null;

        // Preferred: attach to the pane directly if the build supports it.
        try {
                if (typeof chart.panes === 'function') {
                        const panes = chart.panes();
                        const pane = panes && panes[pIndex];
                        if (pane && typeof pane.attachPrimitive === 'function') {
                                pane.attachPrimitive(primitive);
                                attachedPane = pane;
                        } else if (pane && typeof pane.getSeries === 'function') {
                                const seriesList = pane.getSeries();
                                if (seriesList && seriesList.length > 0) {
                                        const s = seriesList[0];
                                        s.attachPrimitive(primitive);
                                        attachedSeries = s;
                                }
                        }
                }
        } catch (e) {
                // fall through to series-based attach below
        }

        if (!attachedSeries && !attachedPane) {
                // Last resort: find any series in the chart. The caller must have
                // at least one series before calling this for the fallback path.
                throw new Error(
                        'attachImageWatermark: could not locate a pane primitive host. ' +
                                'Ensure the requested pane exists and contains at least one series, ' +
                                'or use a lightweight-charts build that exposes IPaneApi#attachPrimitive.'
                );
        }

        return {
                destroy: function () {
                        try {
                                if (attachedPane && typeof attachedPane.detachPrimitive === 'function') {
                                        attachedPane.detachPrimitive(primitive);
                                } else if (
                                        attachedSeries &&
                                        typeof attachedSeries.detachPrimitive === 'function'
                                ) {
                                        attachedSeries.detachPrimitive(primitive);
                                }
                        } catch (e) {
                                // swallow — chart may already be disposed
                        }
                },
        };
}

export default {
        HeatmapSeries: HeatmapSeries,
        addHeatmapSeries: addHeatmapSeries,
        attachImageWatermark: attachImageWatermark,
        ImageWatermark: ImageWatermark,
        heatmapDefaultOptions: heatmapDefaultOptions,
};
