// custom-series-2.js
// Self-contained port of three custom-series plugins from the lightweight-charts
// plugin-examples (TypeScript) to plain JS, targeting lightweight-charts v5.2.0
// ICustomSeriesPaneView API.
//
// Provides:
//   - StackedAreaSeries / addStackedAreaSeries(chart, opts)
//   - StackedBarsSeries / addStackedBarsSeries(chart, opts)
//   - GroupedBarsSeries / addGroupedBarsSeries(chart, opts)
//
// Each datapoint: { time, values: [n0, n1, ...] }
//
// Source originals:
//   plugin-examples/src/plugins/stacked-area-series/*
//   plugin-examples/src/plugins/stacked-bars-series/*
//   plugin-examples/src/plugins/grouped-bars-series/*
//   plugin-examples/src/helpers/dimensions/{columns,positions}.ts

import { customSeriesDefaultOptions } from 'lightweight-charts';

// ---------------------------------------------------------------------------
// helpers/dimensions/positions.js
// ---------------------------------------------------------------------------

function centreOffset(lineBitmapWidth) {
    return Math.floor(lineBitmapWidth * 0.5);
}

/**
 * Bitmap position for an item centred on a media coordinate with a desired width.
 * Returns { position, length }.
 */
function positionsLine(positionMedia, pixelRatio, desiredWidthMedia = 1, widthIsBitmap = false) {
    const scaledPosition = Math.round(pixelRatio * positionMedia);
    const lineBitmapWidth = widthIsBitmap
        ? desiredWidthMedia
        : Math.round(desiredWidthMedia * pixelRatio);
    const offset = centreOffset(lineBitmapWidth);
    const position = scaledPosition - offset;
    return { position, length: lineBitmapWidth };
}

/**
 * Bitmap position+length for a box spanning two media coordinates along one axis.
 */
function positionsBox(position1Media, position2Media, pixelRatio) {
    const scaledPosition1 = Math.round(pixelRatio * position1Media);
    const scaledPosition2 = Math.round(pixelRatio * position2Media);
    return {
        position: Math.min(scaledPosition1, scaledPosition2),
        length: Math.abs(scaledPosition2 - scaledPosition1) + 1,
    };
}

// ---------------------------------------------------------------------------
// helpers/dimensions/columns.js
// ---------------------------------------------------------------------------

const alignToMinimalWidthLimit = 4;
const showSpacingMinimalBarWidth = 1;

function columnSpacing(barSpacingMedia, horizontalPixelRatio) {
    return Math.ceil(barSpacingMedia * horizontalPixelRatio) <= showSpacingMinimalBarWidth
        ? 0
        : Math.max(1, Math.floor(horizontalPixelRatio));
}

function desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing) {
    return (
        Math.round(barSpacingMedia * horizontalPixelRatio) -
        (spacing != null ? spacing : columnSpacing(barSpacingMedia, horizontalPixelRatio))
    );
}

function columnCommon(barSpacingMedia, horizontalPixelRatio) {
    const spacing = columnSpacing(barSpacingMedia, horizontalPixelRatio);
    const columnWidthBitmap = desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing);
    const shiftLeft = columnWidthBitmap % 2 === 0;
    const columnHalfWidthBitmap = (columnWidthBitmap - (shiftLeft ? 0 : 1)) / 2;
    return { spacing, shiftLeft, columnHalfWidthBitmap, horizontalPixelRatio };
}

function calculateColumnPosition(xMedia, columnData, previousPosition) {
    const xBitmapUnRounded = xMedia * columnData.horizontalPixelRatio;
    const xBitmap = Math.round(xBitmapUnRounded);
    const xPositions = {
        left: xBitmap - columnData.columnHalfWidthBitmap,
        right: xBitmap + columnData.columnHalfWidthBitmap - (columnData.shiftLeft ? 1 : 0),
        shiftLeft: xBitmap > xBitmapUnRounded,
    };
    const expectedAlignmentShift = columnData.spacing + 1;
    if (previousPosition) {
        if (xPositions.left - previousPosition.right !== expectedAlignmentShift) {
            if (previousPosition.shiftLeft) {
                previousPosition.right = xPositions.left - expectedAlignmentShift;
            } else {
                xPositions.left = previousPosition.right + expectedAlignmentShift;
            }
        }
    }
    return xPositions;
}

/**
 * Calculates column positions in-place on an array of items having an `x` field.
 * Mutates items[i].column = { left, right, shiftLeft }.
 */
function calculateColumnPositionsInPlace(items, barSpacingMedia, horizontalPixelRatio, startIndex, endIndex) {
    const common = columnCommon(barSpacingMedia, horizontalPixelRatio);
    let previous = undefined;
    for (let i = startIndex; i < Math.min(endIndex, items.length); i++) {
        items[i].column = calculateColumnPosition(items[i].x, common, previous);
        previous = items[i].column;
    }
    const minColumnWidth = items.reduce((smallest, item, index) => {
        if (!item.column || index < startIndex || index > endIndex) return smallest;
        if (item.column.right < item.column.left) item.column.right = item.column.left;
        const width = item.column.right - item.column.left + 1;
        return Math.min(smallest, width);
    }, Math.ceil(barSpacingMedia * horizontalPixelRatio));
    if (common.spacing > 0 && minColumnWidth < alignToMinimalWidthLimit) {
        items.forEach((item, index) => {
            if (!item.column || index < startIndex || index > endIndex) return;
            const width = item.column.right - item.column.left + 1;
            if (width <= minColumnWidth) return;
            if (item.column.shiftLeft) {
                item.column.right -= 1;
            } else {
                item.column.left += 1;
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function cumulativeBuildUp(arr) {
    let sum = 0;
    return arr.map(value => {
        sum += value;
        return sum;
    });
}

function isWhitespacePoint(data) {
    return !Boolean(data && data.values && data.values.length);
}

// ===========================================================================
// 1) Stacked Area Series
// ===========================================================================

const stackedAreaDefaultOptions = {
    ...customSeriesDefaultOptions,
    colors: [
        { line: 'rgb(41, 98, 255)', area: 'rgba(41, 98, 255, 0.2)' },
        { line: 'rgb(225, 87, 90)', area: 'rgba(225, 87, 90, 0.2)' },
        { line: 'rgb(242, 142, 44)', area: 'rgba(242, 142, 44, 0.2)' },
        { line: 'rgb(164, 89, 209)', area: 'rgba(164, 89, 209, 0.2)' },
        { line: 'rgb(27, 156, 133)', area: 'rgba(27, 156, 133, 0.2)' },
    ],
    lineWidth: 2,
};

class StackedAreaSeriesRenderer {
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
        const bars = this._data.bars.map(bar => ({
            x: bar.x,
            ys: cumulativeBuildUp(bar.originalData.values).map(value => priceToCoordinate(value) ?? 0),
        }));
        const zeroY = priceToCoordinate(0) ?? 0;
        const linesMeshed = this._createLinePaths(
            bars,
            this._data.visibleRange,
            renderingScope,
            zeroY * renderingScope.verticalPixelRatio
        );
        const areaPaths = this._createAreas(linesMeshed);
        const colorsCount = options.colors.length;
        areaPaths.forEach((areaPath, index) => {
            renderingScope.context.fillStyle = options.colors[index % colorsCount].area;
            renderingScope.context.fill(areaPath);
        });
        renderingScope.context.lineWidth = options.lineWidth * renderingScope.verticalPixelRatio;
        renderingScope.context.lineJoin = 'round';
        linesMeshed.forEach((linePath, index) => {
            if (index === 0) return;
            renderingScope.context.beginPath();
            renderingScope.context.strokeStyle = options.colors[(index - 1) % colorsCount].line;
            renderingScope.context.stroke(linePath.path);
        });
    }

    _createLinePaths(bars, visibleRange, renderingScope, zeroY) {
        const { horizontalPixelRatio, verticalPixelRatio } = renderingScope;
        const oddLines = [];
        const evenLines = [];
        let firstBar = true;
        for (let i = visibleRange.from; i < visibleRange.to; i++) {
            const stack = bars[i];
            let lineIndex = 0;
            stack.ys.forEach((yMedia, index) => {
                if (index % 2 !== 0) return; // odd indices only
                const x = stack.x * horizontalPixelRatio;
                const y = yMedia * verticalPixelRatio;
                if (firstBar) {
                    oddLines[lineIndex] = {
                        path: new Path2D(),
                        first: { x, y },
                        last: { x, y },
                    };
                    oddLines[lineIndex].path.moveTo(x, y);
                } else {
                    oddLines[lineIndex].path.lineTo(x, y);
                    oddLines[lineIndex].last.x = x;
                    oddLines[lineIndex].last.y = y;
                }
                lineIndex += 1;
            });
            firstBar = false;
        }
        firstBar = true;
        for (let i = visibleRange.to - 1; i >= visibleRange.from; i--) {
            const stack = bars[i];
            let lineIndex = 0;
            stack.ys.forEach((yMedia, index) => {
                if (index % 2 === 0) return; // even indices only
                const x = stack.x * horizontalPixelRatio;
                const y = yMedia * verticalPixelRatio;
                if (firstBar) {
                    evenLines[lineIndex] = {
                        path: new Path2D(),
                        first: { x, y },
                        last: { x, y },
                    };
                    evenLines[lineIndex].path.moveTo(x, y);
                } else {
                    evenLines[lineIndex].path.lineTo(x, y);
                    evenLines[lineIndex].last.x = x;
                    evenLines[lineIndex].last.y = y;
                }
                lineIndex += 1;
            });
            firstBar = false;
        }

        const baseLine = {
            path: new Path2D(),
            first: { x: oddLines[0].last.x, y: zeroY },
            last: { x: oddLines[0].first.x, y: zeroY },
        };
        baseLine.path.moveTo(oddLines[0].last.x, zeroY);
        baseLine.path.lineTo(oddLines[0].first.x, zeroY);
        const linesMeshed = [baseLine];
        for (let i = 0; i < oddLines.length; i++) {
            linesMeshed.push(oddLines[i]);
            if (i < evenLines.length) linesMeshed.push(evenLines[i]);
        }
        return linesMeshed;
    }

    _createAreas(linesMeshed) {
        const areas = [];
        for (let i = 1; i < linesMeshed.length; i++) {
            const areaPath = new Path2D(linesMeshed[i - 1].path);
            areaPath.lineTo(linesMeshed[i].first.x, linesMeshed[i].first.y);
            areaPath.addPath(linesMeshed[i].path);
            areaPath.lineTo(linesMeshed[i - 1].first.x, linesMeshed[i - 1].first.y);
            areaPath.closePath();
            areas.push(areaPath);
        }
        return areas;
    }
}

export class StackedAreaSeries {
    constructor() {
        this._renderer = new StackedAreaSeriesRenderer();
    }

    priceValueBuilder(plotRow) {
        return [0, plotRow.values.reduce((a, b) => a + b, 0)];
    }

    isWhitespace(data) {
        return isWhitespacePoint(data);
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return stackedAreaDefaultOptions;
    }
}

export function addStackedAreaSeries(chart, opts = {}) {
    return chart.addCustomSeries(new StackedAreaSeries(), opts);
}

// ===========================================================================
// 2) Stacked Bars Series
// ===========================================================================

const stackedBarsDefaultOptions = {
    ...customSeriesDefaultOptions,
    colors: [
        '#2962FF',
        '#E1575A',
        '#F28E2C',
        'rgb(164, 89, 209)',
        'rgb(27, 156, 133)',
    ],
};

class StackedBarsSeriesRenderer {
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
        const bars = this._data.bars.map(bar => ({
            x: bar.x,
            ys: cumulativeBuildUp(bar.originalData.values).map(value => priceToCoordinate(value) ?? 0),
        }));
        calculateColumnPositionsInPlace(
            bars,
            this._data.barSpacing,
            renderingScope.horizontalPixelRatio,
            this._data.visibleRange.from,
            this._data.visibleRange.to
        );
        const zeroY = priceToCoordinate(0) ?? 0;
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const stack = bars[i];
            const column = stack.column;
            if (!column) return;
            let previousY = zeroY;
            const width = Math.min(
                Math.max(renderingScope.horizontalPixelRatio, column.right - column.left),
                this._data.barSpacing * renderingScope.horizontalPixelRatio
            );
            stack.ys.forEach((y, index) => {
                const color = options.colors[index % options.colors.length];
                const stackBoxPositions = positionsBox(previousY, y, renderingScope.verticalPixelRatio);
                renderingScope.context.fillStyle = color;
                renderingScope.context.fillRect(
                    column.left,
                    stackBoxPositions.position,
                    width,
                    stackBoxPositions.length
                );
                previousY = y;
            });
        }
    }
}

export class StackedBarsSeries {
    constructor() {
        this._renderer = new StackedBarsSeriesRenderer();
    }

    priceValueBuilder(plotRow) {
        return [0, plotRow.values.reduce((a, b) => a + b, 0)];
    }

    isWhitespace(data) {
        return isWhitespacePoint(data);
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return stackedBarsDefaultOptions;
    }
}

export function addStackedBarsSeries(chart, opts = {}) {
    return chart.addCustomSeries(new StackedBarsSeries(), opts);
}

// ===========================================================================
// 3) Grouped Bars Series (side-by-side)
// ===========================================================================

const groupedBarsDefaultOptions = {
    ...customSeriesDefaultOptions,
    colors: [
        '#2962FF',
        '#E1575A',
        '#F28E2C',
        'rgb(164, 89, 209)',
        'rgb(27, 156, 133)',
    ],
};

class GroupedBarsSeriesRenderer {
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
        const barWidth = this._data.barSpacing;
        const groups = this._data.bars.map(bar => {
            const count = bar.originalData.values.length;
            const singleBarWidth = barWidth / (count + 1);
            const padding = singleBarWidth / 2;
            const startX = padding + bar.x - barWidth / 2 + singleBarWidth / 2;
            return {
                singleBarWidth,
                singleBars: bar.originalData.values.map((value, index) => ({
                    y: priceToCoordinate(value) ?? 0,
                    color: options.colors[index % options.colors.length],
                    x: startX + index * singleBarWidth,
                })),
            };
        });

        const zeroY = priceToCoordinate(0) ?? 0;
        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const group = groups[i];
            let lastX;
            group.singleBars.forEach(bar => {
                const yPos = positionsBox(zeroY, bar.y, renderingScope.verticalPixelRatio);
                const xPos = positionsLine(
                    bar.x,
                    renderingScope.horizontalPixelRatio,
                    group.singleBarWidth
                );
                renderingScope.context.beginPath();
                renderingScope.context.fillStyle = bar.color;
                const offset = lastX ? xPos.position - lastX : 0;
                renderingScope.context.fillRect(
                    xPos.position - offset,
                    yPos.position,
                    xPos.length + offset,
                    yPos.length
                );
                lastX = xPos.position + xPos.length;
            });
        }
    }
}

export class GroupedBarsSeries {
    constructor() {
        this._renderer = new GroupedBarsSeriesRenderer();
    }

    priceValueBuilder(plotRow) {
        return [0, ...plotRow.values];
    }

    isWhitespace(data) {
        return isWhitespacePoint(data);
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return groupedBarsDefaultOptions;
    }
}

export function addGroupedBarsSeries(chart, opts = {}) {
    return chart.addCustomSeries(new GroupedBarsSeries(), opts);
}
