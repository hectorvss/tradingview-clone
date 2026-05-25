// custom-series-3.js
// Two custom-series plugins for lightweight-charts v5.2.0, ported from the
// official plugin examples to plain ES modules:
//
//   1) BoxWhiskerSeries — statistical box-and-whisker plot.
//      Data: { time, q1, median, q3, low, high, outliers?: number[] }
//
//   2) LollipopSeries — vertical stem from zero with a circular head.
//      Data: { time, value, color? }
//
// Both implement the v5 ICustomSeriesPaneView contract:
//   - priceValueBuilder(plotRow): number[]   (min/max used for autoscale)
//   - isWhitespace(data): boolean
//   - renderer(): ICustomSeriesPaneRenderer
//   - update(data, options): void
//   - defaultOptions(): object
//
// And the renderer contract:
//   - draw(target, priceConverter): void     where target is a CanvasRenderingTarget2D
//   - update(data, options): void
//
// Pure JS, no external deps beyond `lightweight-charts`.

import { customSeriesDefaultOptions } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Pixel-perfect drawing helpers (ported from plugin-examples/helpers).
// ---------------------------------------------------------------------------

function _centreOffset(lineBitmapWidth) {
  return Math.floor(lineBitmapWidth * 0.5);
}

/**
 * Bitmap position for a 1-D point with a desired pixel width, centred on a
 * media coordinate. Equivalent of plugin-examples positionsLine().
 */
function positionsLine(positionMedia, pixelRatio, desiredWidthMedia, widthIsBitmap) {
  if (desiredWidthMedia === undefined) desiredWidthMedia = 1;
  const scaledPosition = Math.round(pixelRatio * positionMedia);
  const lineBitmapWidth = widthIsBitmap
    ? desiredWidthMedia
    : Math.round(desiredWidthMedia * pixelRatio);
  const offset = _centreOffset(lineBitmapWidth);
  return { position: scaledPosition - offset, length: lineBitmapWidth };
}

/**
 * Bitmap span between two media coordinates. Equivalent of positionsBox().
 */
function positionsBox(position1Media, position2Media, pixelRatio) {
  const p1 = Math.round(pixelRatio * position1Media);
  const p2 = Math.round(pixelRatio * position2Media);
  return {
    position: Math.min(p1, p2),
    length: Math.abs(p2 - p1) + 1,
  };
}

function gridAndCrosshairBitmapWidth(pixelRatio) {
  return Math.max(1, Math.floor(pixelRatio));
}
function gridAndCrosshairMediaWidth(pixelRatio) {
  return gridAndCrosshairBitmapWidth(pixelRatio) / pixelRatio;
}

function _optimalCandlestickWidth(barSpacing, pixelRatio) {
  const FROM = 2.5, TO = 4, COEFF = 3;
  if (barSpacing >= FROM && barSpacing <= TO) {
    return Math.floor(COEFF * pixelRatio);
  }
  const reducing = 0.2;
  const coeff = 1 - (reducing * Math.atan(Math.max(TO, barSpacing) - TO)) / (Math.PI * 0.5);
  const res = Math.floor(barSpacing * coeff * pixelRatio);
  const scaled = Math.floor(barSpacing * pixelRatio);
  return Math.max(Math.floor(pixelRatio), Math.min(res, scaled));
}

function candlestickWidth(barSpacing, horizontalPixelRatio) {
  let width = _optimalCandlestickWidth(barSpacing, horizontalPixelRatio);
  if (width >= 2) {
    const wickWidth = Math.floor(horizontalPixelRatio);
    if (wickWidth % 2 !== width % 2) width--;
  }
  return width;
}

// ===========================================================================
// 1) BoxWhiskerSeries
// ===========================================================================

const boxWhiskerDefaultOptions = Object.assign({}, customSeriesDefaultOptions, {
  whiskerColor: 'rgba(106, 27, 154, 1)',
  lowerQuartileFill: 'rgba(103, 58, 183, 1)',
  upperQuartileFill: 'rgba(233, 30, 99, 1)',
  outlierColor: 'rgba(149, 152, 161, 1)',
});

function _boxDesiredWidths(barSpacing) {
  const bodyWidth = candlestickWidth(barSpacing, 1);
  const medianWidth = Math.floor(barSpacing);
  const lineWidth = candlestickWidth(barSpacing / 2, 1);
  return {
    body: bodyWidth,
    medianLine: Math.max(medianWidth, bodyWidth),
    extremeLines: lineWidth,
    outlierRadius: Math.min(bodyWidth, 4),
  };
}

class BoxWhiskerSeriesRenderer {
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

    // Each bar resolved into the 5 quartile Y-pixel positions plus outliers.
    // We accept input either as `quartiles: [low, q1, median, q3, high]`
    // (the original TS shape) or as the simpler `{ q1, median, q3, low, high }`.
    const bars = data.bars.map(bar => {
      const od = bar.originalData;
      let qPrices;
      if (Array.isArray(od.quartiles) && od.quartiles.length === 5) {
        qPrices = od.quartiles;
      } else {
        qPrices = [od.low, od.q1, od.median, od.q3, od.high];
      }
      return {
        quartilesY: qPrices.map(p => (priceToCoordinate(p) ?? 0)),
        outliers: (od.outliers || []).map(p => (priceToCoordinate(p) ?? 0)),
        x: bar.x,
      };
    });

    const widths = _boxDesiredWidths(data.barSpacing);
    const verticalLineWidth = gridAndCrosshairMediaWidth(scope.horizontalPixelRatio);
    const horizontalLineWidth = gridAndCrosshairMediaWidth(scope.verticalPixelRatio);

    for (let i = data.visibleRange.from; i < data.visibleRange.to; i++) {
      const bar = bars[i];
      if (widths.outlierRadius > 2) {
        this._drawOutliers(scope.context, bar, widths.outlierRadius, options,
          scope.horizontalPixelRatio, scope.verticalPixelRatio);
      }
      this._drawWhisker(scope.context, bar, widths.extremeLines, options,
        scope.horizontalPixelRatio, scope.verticalPixelRatio,
        verticalLineWidth, horizontalLineWidth);
      this._drawBox(scope.context, bar, widths.body, options,
        scope.horizontalPixelRatio, scope.verticalPixelRatio);
      this._drawMedianLine(scope.context, bar, widths.medianLine, options,
        scope.horizontalPixelRatio, scope.verticalPixelRatio, horizontalLineWidth);
    }
  }

  _drawWhisker(ctx, bar, extremeLineWidth, options,
               hpr, vpr, wickWidth, horizontalWickWidth) {
    ctx.save();
    ctx.fillStyle = options.whiskerColor;

    const vLine = positionsLine(bar.x, hpr, wickWidth);
    const topWhisker = positionsBox(bar.quartilesY[0], bar.quartilesY[1], vpr);
    ctx.fillRect(vLine.position, topWhisker.position, vLine.length, topWhisker.length);

    const botWhisker = positionsBox(bar.quartilesY[3], bar.quartilesY[4], vpr);
    ctx.fillRect(vLine.position, botWhisker.position, vLine.length, botWhisker.length);

    const hLine = positionsLine(bar.x, hpr, extremeLineWidth);
    const topCap = positionsLine(bar.quartilesY[4], vpr, horizontalWickWidth);
    ctx.fillRect(hLine.position, topCap.position, hLine.length, topCap.length);

    const botCap = positionsLine(bar.quartilesY[0], vpr, horizontalWickWidth);
    ctx.fillRect(hLine.position, botCap.position, hLine.length, botCap.length);
    ctx.restore();
  }

  _drawBox(ctx, bar, bodyWidth, options, hpr, vpr) {
    ctx.save();
    const upper = positionsBox(bar.quartilesY[2], bar.quartilesY[3], vpr);
    const lower = positionsBox(bar.quartilesY[1], bar.quartilesY[2], vpr);
    const x = positionsLine(bar.x, hpr, bodyWidth);
    ctx.fillStyle = options.lowerQuartileFill;
    ctx.fillRect(x.position, lower.position, x.length, lower.length);
    ctx.fillStyle = options.upperQuartileFill;
    ctx.fillRect(x.position, upper.position, x.length, upper.length);
    ctx.restore();
  }

  _drawMedianLine(ctx, bar, medianLineWidth, options, hpr, vpr, horizontalLineWidth) {
    const x = positionsLine(bar.x, hpr, medianLineWidth);
    const y = positionsLine(bar.quartilesY[2], vpr, horizontalLineWidth);
    ctx.save();
    ctx.fillStyle = options.whiskerColor;
    ctx.fillRect(x.position, y.position, x.length, y.length);
    ctx.restore();
  }

  _drawOutliers(ctx, bar, radius, options, hpr, vpr) {
    ctx.save();
    const x = positionsLine(bar.x, hpr, 1, true);
    ctx.fillStyle = options.outlierColor;
    ctx.lineWidth = 0;
    for (let j = 0; j < bar.outliers.length; j++) {
      const y = positionsLine(bar.outliers[j], vpr, 1, true);
      ctx.beginPath();
      ctx.arc(x.position, y.position, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.closePath();
    }
    ctx.restore();
  }
}

export class BoxWhiskerSeries {
  constructor() {
    this._renderer = new BoxWhiskerSeriesRenderer();
  }

  priceValueBuilder(plotRow) {
    if (Array.isArray(plotRow.quartiles) && plotRow.quartiles.length === 5) {
      // [low, q1, median, q3, high]  →  [high, low, median]
      return [plotRow.quartiles[4], plotRow.quartiles[0], plotRow.quartiles[2]];
    }
    return [plotRow.high, plotRow.low, plotRow.median];
  }

  isWhitespace(data) {
    return (
      data.quartiles === undefined &&
      (data.median === undefined || data.q1 === undefined || data.q3 === undefined)
    );
  }

  renderer() {
    return this._renderer;
  }

  update(data, options) {
    this._renderer.update(data, options);
  }

  defaultOptions() {
    return boxWhiskerDefaultOptions;
  }
}

// ===========================================================================
// 2) LollipopSeries
// ===========================================================================

const lollipopDefaultOptions = Object.assign({}, customSeriesDefaultOptions, {
  color: 'rgba(33, 150, 243, 1)',
  lineWidth: 2,
});

class LollipopSeriesRenderer {
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

    const bars = data.bars.map(bar => ({
      x: bar.x,
      y: priceToCoordinate(bar.originalData.value) ?? 0,
      color: bar.originalData.color,
    }));

    const lineWidth = Math.min(options.lineWidth, data.barSpacing);
    const barWidth = data.barSpacing;
    const radius = Math.floor(barWidth / 2);
    const zeroY = priceToCoordinate(0) ?? 0;
    const ctx = scope.context;

    for (let i = data.visibleRange.from; i < data.visibleRange.to; i++) {
      const bar = bars[i];
      const xPos = positionsLine(bar.x, scope.horizontalPixelRatio, lineWidth);
      const yBox = positionsBox(zeroY, bar.y, scope.verticalPixelRatio);

      ctx.beginPath();
      ctx.fillStyle = bar.color || options.color;
      // Stem
      ctx.fillRect(xPos.position, yBox.position, xPos.length, yBox.length);
      // Head (circle on top)
      ctx.arc(
        bar.x * scope.horizontalPixelRatio,
        bar.y * scope.verticalPixelRatio,
        radius * scope.horizontalPixelRatio,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

export class LollipopSeries {
  constructor() {
    this._renderer = new LollipopSeriesRenderer();
  }

  priceValueBuilder(plotRow) {
    // Include zero so autoscale always shows the stem base.
    return [0, plotRow.value];
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
    return lollipopDefaultOptions;
  }
}

// ===========================================================================
// Factory helpers
// ===========================================================================

/**
 * Add a BoxWhiskerSeries to a chart.
 * @param {IChartApi} chart
 * @param {Partial<typeof boxWhiskerDefaultOptions>} [opts]
 * @param {number} [paneIndex=0]
 * @returns {ISeriesApi<'Custom'>}
 */
export function addBoxWhiskerSeries(chart, opts, paneIndex) {
  if (!chart) throw new Error('addBoxWhiskerSeries: chart is required');
  const view = new BoxWhiskerSeries();
  return chart.addCustomSeries(view, opts || {}, paneIndex || 0);
}

/**
 * Add a LollipopSeries to a chart.
 * @param {IChartApi} chart
 * @param {Partial<typeof lollipopDefaultOptions>} [opts]
 * @param {number} [paneIndex=0]
 * @returns {ISeriesApi<'Custom'>}
 */
export function addLollipopSeries(chart, opts, paneIndex) {
  if (!chart) throw new Error('addLollipopSeries: chart is required');
  const view = new LollipopSeries();
  return chart.addCustomSeries(view, opts || {}, paneIndex || 0);
}

export default {
  BoxWhiskerSeries,
  LollipopSeries,
  addBoxWhiskerSeries,
  addLollipopSeries,
};
