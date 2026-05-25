/**
 * plugin-base.js
 *
 * Foundation module for custom lightweight-charts v5.2.0 plugins.
 *
 * Consolidates (ported from the upstream TypeScript plugin-examples):
 *   - plugin-base.ts                       -> PluginBase (ISeriesPrimitive lifecycle)
 *   - helpers/assertions.ts                -> ensureDefined, ensureNotNull, assert
 *   - helpers/dimensions/positions.ts      -> positionsLine, positionsBox
 *   - helpers/dimensions/full-width.ts     -> fullBarWidth
 *   - helpers/dimensions/columns.ts        -> calculateColumnPositions(InPlace)
 *   - (new) bitmap helpers                 -> positionsBitmap, mediaToBitmap*, etc.
 *   - (new) color helpers                  -> hexToRgb, rgbToString, interpolate,
 *                                             mixColors, alpha helpers, parseColor
 *   - (new) canvas drawing helpers         -> drawRoundedRect, drawHorizontalLine,
 *                                             drawVerticalLine, drawCircle, etc.
 *
 * Pure ES module, no runtime dependencies. Safe to import from other plugin
 * files. Designed for v5.x lightweight-charts ISeriesPrimitive interface.
 */

/* =========================================================================
 *  ASSERTIONS
 * ========================================================================= */

/**
 * Throws if `value` is undefined. Returns the value otherwise.
 * @template T
 * @param {T | undefined} value
 * @returns {T}
 */
export function ensureDefined(value) {
	if (value === undefined) {
		throw new Error('Value is undefined');
	}
	return value;
}

/**
 * Throws if `value` is null. Returns the value otherwise.
 * @template T
 * @param {T | null} value
 * @returns {T}
 */
export function ensureNotNull(value) {
	if (value === null) {
		throw new Error('Value is null');
	}
	return value;
}

/**
 * Throws if `value` is null or undefined.
 * @template T
 * @param {T | null | undefined} value
 * @returns {T}
 */
export function ensure(value) {
	if (value === undefined || value === null) {
		throw new Error('Value is not defined');
	}
	return value;
}

/**
 * Generic runtime assertion. Throws with `message` if `condition` is falsy.
 * @param {unknown} condition
 * @param {string} [message]
 * @returns {asserts condition}
 */
export function assert(condition, message) {
	if (!condition) {
		throw new Error(message || 'Assertion failed');
	}
}

/* =========================================================================
 *  DIMENSION HELPERS
 *
 *  All "positions*" functions return `{ position, length }` where both are
 *  integer bitmap-space values, suitable for the bitmap rendering scope
 *  given by lightweight-charts' `useBitmapCoordinateSpace`.
 * ========================================================================= */

/**
 * @typedef {Object} BitmapPositionLength
 * @property {number} position  Start coordinate in bitmap space
 * @property {number} length    Length in bitmap pixels
 */

function _centreOffset(lineBitmapWidth) {
	return Math.floor(lineBitmapWidth * 0.5);
}

/**
 * Computes the bitmap position for a 1-D item (line/tick) of a desired width,
 * centred on a media-space coordinate.
 *
 * @param {number} positionMedia     - centre coordinate in media space
 * @param {number} pixelRatio        - pixel ratio for the relevant axis
 * @param {number} [desiredWidthMedia=1]
 * @param {boolean} [widthIsBitmap=false] - treat desiredWidthMedia as already-in-bitmap
 * @returns {BitmapPositionLength}
 */
export function positionsLine(positionMedia, pixelRatio, desiredWidthMedia = 1, widthIsBitmap = false) {
	const scaledPosition = Math.round(pixelRatio * positionMedia);
	const lineBitmapWidth = widthIsBitmap
		? desiredWidthMedia
		: Math.round(desiredWidthMedia * pixelRatio);
	const offset = _centreOffset(lineBitmapWidth);
	return { position: scaledPosition - offset, length: lineBitmapWidth };
}

/**
 * Bitmap position/length for a box spanning two media-space coordinates.
 *
 * @param {number} position1Media
 * @param {number} position2Media
 * @param {number} pixelRatio
 * @returns {BitmapPositionLength}
 */
export function positionsBox(position1Media, position2Media, pixelRatio) {
	const a = Math.round(pixelRatio * position1Media);
	const b = Math.round(pixelRatio * position2Media);
	return {
		position: Math.min(a, b),
		length: Math.abs(b - a) + 1,
	};
}

/**
 * Generic alias / convenience: given a media coordinate and pixel ratio,
 * returns the corresponding bitmap position/length for a 1-pixel-wide item.
 * Equivalent to `positionsLine(positionMedia, pixelRatio, 1)`.
 *
 * @param {number} positionMedia
 * @param {number} pixelRatio
 * @param {number} [widthMedia=1]
 * @returns {BitmapPositionLength}
 */
export function positionsBitmap(positionMedia, pixelRatio, widthMedia = 1) {
	return positionsLine(positionMedia, pixelRatio, widthMedia, false);
}

/**
 * Bar position which exactly fills the bar-space (no gaps between neighbours).
 *
 * @param {number} xMedia                - bar centre, media coords
 * @param {number} halfBarSpacingMedia   - half the current barSpacing
 * @param {number} horizontalPixelRatio
 * @returns {BitmapPositionLength}
 */
export function fullBarWidth(xMedia, halfBarSpacingMedia, horizontalPixelRatio) {
	const leftBitmap = Math.round((xMedia - halfBarSpacingMedia) * horizontalPixelRatio);
	const rightBitmap = Math.round((xMedia + halfBarSpacingMedia) * horizontalPixelRatio);
	return { position: leftBitmap, length: rightBitmap - leftBitmap };
}

/** Convert media -> bitmap coordinate (rounded). */
export function mediaToBitmap(positionMedia, pixelRatio) {
	return Math.round(positionMedia * pixelRatio);
}

/** Convert bitmap -> media coordinate. */
export function bitmapToMedia(positionBitmap, pixelRatio) {
	return positionBitmap / pixelRatio;
}

/* ---- Column position helpers (multi-bar histograms / volume) ------------ */

const _ALIGN_TO_MIN_WIDTH_LIMIT = 4;
const _SHOW_SPACING_MIN_BAR_WIDTH = 1;

function _columnSpacing(barSpacingMedia, horizontalPixelRatio) {
	return Math.ceil(barSpacingMedia * horizontalPixelRatio) <= _SHOW_SPACING_MIN_BAR_WIDTH
		? 0
		: Math.max(1, Math.floor(horizontalPixelRatio));
}

function _desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing) {
	const s = spacing !== undefined ? spacing : _columnSpacing(barSpacingMedia, horizontalPixelRatio);
	return Math.round(barSpacingMedia * horizontalPixelRatio) - s;
}

function _columnCommon(barSpacingMedia, horizontalPixelRatio) {
	const spacing = _columnSpacing(barSpacingMedia, horizontalPixelRatio);
	const columnWidthBitmap = _desiredColumnWidth(barSpacingMedia, horizontalPixelRatio, spacing);
	const shiftLeft = columnWidthBitmap % 2 === 0;
	const columnHalfWidthBitmap = (columnWidthBitmap - (shiftLeft ? 0 : 1)) / 2;
	return { spacing, shiftLeft, columnHalfWidthBitmap, horizontalPixelRatio };
}

/**
 * @typedef {Object} ColumnPosition
 * @property {number} left
 * @property {number} right
 * @property {boolean} shiftLeft
 */

function _calculateColumnPosition(xMedia, columnData, previousPosition) {
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

function _fixPositionsAndReturnSmallestWidth(positions, initialMinWidth) {
	return positions.reduce((smallest, position) => {
		if (position.right < position.left) position.right = position.left;
		const width = position.right - position.left + 1;
		return Math.min(smallest, width);
	}, initialMinWidth);
}

function _fixAlignmentForNarrowColumns(positions, minColumnWidth) {
	return positions.map(position => {
		const width = position.right - position.left + 1;
		if (width <= minColumnWidth) return position;
		if (position.shiftLeft) position.right -= 1;
		else position.left += 1;
		return position;
	});
}

/**
 * Compute aligned column positions (bitmap space) for an array of bar centres.
 * @param {number[]} xMediaPositions
 * @param {number} barSpacingMedia
 * @param {number} horizontalPixelRatio
 * @returns {ColumnPosition[]}
 */
export function calculateColumnPositions(xMediaPositions, barSpacingMedia, horizontalPixelRatio) {
	const common = _columnCommon(barSpacingMedia, horizontalPixelRatio);
	const positions = new Array(xMediaPositions.length);
	let previous;
	for (let i = 0; i < xMediaPositions.length; i++) {
		positions[i] = _calculateColumnPosition(xMediaPositions[i], common, previous);
		previous = positions[i];
	}
	const initialMinWidth = Math.ceil(barSpacingMedia * horizontalPixelRatio);
	const minColumnWidth = _fixPositionsAndReturnSmallestWidth(positions, initialMinWidth);
	if (common.spacing > 0 && minColumnWidth < _ALIGN_TO_MIN_WIDTH_LIMIT) {
		return _fixAlignmentForNarrowColumns(positions, minColumnWidth);
	}
	return positions;
}

/**
 * Same as calculateColumnPositions but mutates items[i].column in place. Items
 * must have a numeric `.x` (media). Useful for performance-critical paths.
 *
 * @param {Array<{x:number, column?:ColumnPosition}>} items
 * @param {number} barSpacingMedia
 * @param {number} horizontalPixelRatio
 * @param {number} startIndex
 * @param {number} endIndex
 */
export function calculateColumnPositionsInPlace(items, barSpacingMedia, horizontalPixelRatio, startIndex, endIndex) {
	const common = _columnCommon(barSpacingMedia, horizontalPixelRatio);
	let previous;
	const last = Math.min(endIndex, items.length);
	for (let i = startIndex; i < last; i++) {
		items[i].column = _calculateColumnPosition(items[i].x, common, previous);
		previous = items[i].column;
	}
	const minColumnWidth = items.reduce((smallest, item, index) => {
		if (!item.column || index < startIndex || index > endIndex) return smallest;
		if (item.column.right < item.column.left) item.column.right = item.column.left;
		const width = item.column.right - item.column.left + 1;
		return Math.min(smallest, width);
	}, Math.ceil(barSpacingMedia * horizontalPixelRatio));
	if (common.spacing > 0 && minColumnWidth < _ALIGN_TO_MIN_WIDTH_LIMIT) {
		items.forEach((item, index) => {
			if (!item.column || index < startIndex || index > endIndex) return;
			const width = item.column.right - item.column.left + 1;
			if (width <= minColumnWidth) return;
			if (item.column.shiftLeft) item.column.right -= 1;
			else item.column.left += 1;
		});
	}
}

/* =========================================================================
 *  COLOR HELPERS
 * ========================================================================= */

/**
 * @typedef {Object} Rgba
 * @property {number} r 0..255
 * @property {number} g 0..255
 * @property {number} b 0..255
 * @property {number} a 0..1
 */

/** Clamp value into [min, max]. */
export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between two numbers. */
export function interpolate(a, b, t) {
	return a + (b - a) * t;
}

/**
 * Parse a hex color string (#rgb, #rrggbb, #rrggbbaa) into an Rgba object.
 * Throws on malformed input.
 * @param {string} hex
 * @returns {Rgba}
 */
export function hexToRgb(hex) {
	if (typeof hex !== 'string') throw new Error('hexToRgb: expected string');
	let h = hex.trim();
	if (h.charAt(0) === '#') h = h.slice(1);
	if (h.length === 3 || h.length === 4) {
		h = h.split('').map(c => c + c).join('');
	}
	if (h.length !== 6 && h.length !== 8) {
		throw new Error('hexToRgb: invalid hex color "' + hex + '"');
	}
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
		throw new Error('hexToRgb: invalid hex color "' + hex + '"');
	}
	return { r, g, b, a };
}

/**
 * Convert an Rgba object to a CSS color string. Always emits rgba(...).
 * @param {Rgba} rgba
 * @returns {string}
 */
export function rgbToString(rgba) {
	const r = clamp(Math.round(rgba.r), 0, 255);
	const g = clamp(Math.round(rgba.g), 0, 255);
	const b = clamp(Math.round(rgba.b), 0, 255);
	const a = clamp(rgba.a !== undefined ? rgba.a : 1, 0, 1);
	return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

/**
 * Convert an Rgba object to a 6- or 8-digit hex string.
 * @param {Rgba} rgba
 * @param {boolean} [includeAlpha=false]
 * @returns {string}
 */
export function rgbToHex(rgba, includeAlpha = false) {
	const toHex = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
	let out = '#' + toHex(rgba.r) + toHex(rgba.g) + toHex(rgba.b);
	if (includeAlpha) out += toHex((rgba.a !== undefined ? rgba.a : 1) * 255);
	return out;
}

/**
 * Lenient color parser. Accepts:
 *   - #rgb / #rrggbb / #rrggbbaa
 *   - rgb(r,g,b) / rgba(r,g,b,a)
 *   - transparent
 * @param {string} color
 * @returns {Rgba}
 */
export function parseColor(color) {
	if (typeof color !== 'string') throw new Error('parseColor: expected string');
	const c = color.trim().toLowerCase();
	if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
	if (c.charAt(0) === '#') return hexToRgb(c);
	const m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
	if (!m) throw new Error('parseColor: cannot parse "' + color + '"');
	return {
		r: parseFloat(m[1]),
		g: parseFloat(m[2]),
		b: parseFloat(m[3]),
		a: m[4] !== undefined ? parseFloat(m[4]) : 1,
	};
}

/**
 * Linear mix of two CSS colors. ratio=0 -> color1, ratio=1 -> color2.
 * @param {string} color1
 * @param {string} color2
 * @param {number} ratio  in [0, 1]
 * @returns {string} rgba(...) string
 */
export function mixColors(color1, color2, ratio) {
	const t = clamp(ratio, 0, 1);
	const c1 = parseColor(color1);
	const c2 = parseColor(color2);
	return rgbToString({
		r: interpolate(c1.r, c2.r, t),
		g: interpolate(c1.g, c2.g, t),
		b: interpolate(c1.b, c2.b, t),
		a: interpolate(c1.a, c2.a, t),
	});
}

/**
 * Return a copy of `color` with the alpha channel replaced.
 * @param {string} color
 * @param {number} alpha 0..1
 * @returns {string}
 */
export function setOpacity(color, alpha) {
	const c = parseColor(color);
	c.a = clamp(alpha, 0, 1);
	return rgbToString(c);
}

/**
 * Multiply current alpha by `factor` (clamped).
 * @param {string} color
 * @param {number} factor
 * @returns {string}
 */
export function applyAlpha(color, factor) {
	const c = parseColor(color);
	c.a = clamp(c.a * factor, 0, 1);
	return rgbToString(c);
}

/* =========================================================================
 *  CANVAS DRAWING HELPERS
 *
 *  These operate in *bitmap space* unless noted otherwise — i.e. coords
 *  expected to be integers from `positionsLine`/`positionsBox`.
 * ========================================================================= */

/**
 * Stroke a horizontal line spanning [x1, x2] at integer bitmap y, snapped
 * to a crisp pixel via a 0.5 offset for odd line widths.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} x2
 * @param {number} y
 * @param {number} [lineWidth=1]
 */
export function drawHorizontalLine(ctx, x1, x2, y, lineWidth = 1) {
	ctx.save();
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	const offset = lineWidth % 2 ? 0.5 : 0;
	const yy = Math.round(y) + offset;
	ctx.moveTo(Math.min(x1, x2), yy);
	ctx.lineTo(Math.max(x1, x2), yy);
	ctx.stroke();
	ctx.restore();
}

/**
 * Stroke a vertical line spanning [y1, y2] at integer bitmap x.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y1
 * @param {number} y2
 * @param {number} [lineWidth=1]
 */
export function drawVerticalLine(ctx, x, y1, y2, lineWidth = 1) {
	ctx.save();
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	const offset = lineWidth % 2 ? 0.5 : 0;
	const xx = Math.round(x) + offset;
	ctx.moveTo(xx, Math.min(y1, y2));
	ctx.lineTo(xx, Math.max(y1, y2));
	ctx.stroke();
	ctx.restore();
}

/**
 * Stroke a line from (x1,y1) to (x2,y2) with optional dash pattern and cap.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {Object} [opts]
 * @param {number} [opts.lineWidth=1]
 * @param {string} [opts.strokeStyle]
 * @param {number[]} [opts.dash]
 * @param {CanvasLineCap} [opts.lineCap='butt']
 */
export function drawLine(ctx, x1, y1, x2, y2, opts = {}) {
	ctx.save();
	ctx.lineWidth = opts.lineWidth || 1;
	if (opts.strokeStyle) ctx.strokeStyle = opts.strokeStyle;
	if (opts.dash) ctx.setLineDash(opts.dash);
	ctx.lineCap = opts.lineCap || 'butt';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.restore();
}

/**
 * Build a rounded-rectangle path on `ctx`. Does not stroke or fill.
 *
 * `radius` may be a number (all corners) or [tl, tr, br, bl].
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number | number[]} [radius=0]
 */
export function roundedRectPath(ctx, x, y, w, h, radius = 0) {
	let tl, tr, br, bl;
	if (Array.isArray(radius)) {
		[tl, tr, br, bl] = radius;
	} else {
		tl = tr = br = bl = radius;
	}
	const maxR = Math.min(Math.abs(w), Math.abs(h)) / 2;
	tl = clamp(tl, 0, maxR);
	tr = clamp(tr, 0, maxR);
	br = clamp(br, 0, maxR);
	bl = clamp(bl, 0, maxR);
	ctx.beginPath();
	ctx.moveTo(x + tl, y);
	ctx.lineTo(x + w - tr, y);
	if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr);
	ctx.lineTo(x + w, y + h - br);
	if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
	ctx.lineTo(x + bl, y + h);
	if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl);
	ctx.lineTo(x, y + tl);
	if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl);
	ctx.closePath();
}

/**
 * Fill (and optionally stroke) a rounded rectangle.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number | number[]} [radius=0]
 * @param {Object} [opts]
 * @param {string} [opts.fillStyle]
 * @param {string} [opts.strokeStyle]
 * @param {number} [opts.lineWidth=1]
 */
export function drawRoundedRect(ctx, x, y, w, h, radius = 0, opts = {}) {
	ctx.save();
	roundedRectPath(ctx, x, y, w, h, radius);
	if (opts.fillStyle) {
		ctx.fillStyle = opts.fillStyle;
		ctx.fill();
	}
	if (opts.strokeStyle) {
		ctx.strokeStyle = opts.strokeStyle;
		ctx.lineWidth = opts.lineWidth || 1;
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * Fill a plain rectangle (bitmap space).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} [fillStyle]
 */
export function fillRect(ctx, x, y, w, h, fillStyle) {
	if (fillStyle) {
		ctx.save();
		ctx.fillStyle = fillStyle;
		ctx.fillRect(x, y, w, h);
		ctx.restore();
	} else {
		ctx.fillRect(x, y, w, h);
	}
}

/**
 * Stroke a rectangle outline (bitmap space).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} [strokeStyle]
 * @param {number} [lineWidth=1]
 */
export function strokeRect(ctx, x, y, w, h, strokeStyle, lineWidth = 1) {
	ctx.save();
	if (strokeStyle) ctx.strokeStyle = strokeStyle;
	ctx.lineWidth = lineWidth;
	const offset = lineWidth % 2 ? 0.5 : 0;
	ctx.strokeRect(x + offset, y + offset, w, h);
	ctx.restore();
}

/**
 * Fill (and optionally stroke) a circle.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {Object} [opts]
 * @param {string} [opts.fillStyle]
 * @param {string} [opts.strokeStyle]
 * @param {number} [opts.lineWidth=1]
 */
export function drawCircle(ctx, cx, cy, radius, opts = {}) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, Math.max(0, radius), 0, Math.PI * 2);
	if (opts.fillStyle) {
		ctx.fillStyle = opts.fillStyle;
		ctx.fill();
	}
	if (opts.strokeStyle) {
		ctx.strokeStyle = opts.strokeStyle;
		ctx.lineWidth = opts.lineWidth || 1;
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * Draw a single line of text. Bitmap space; caller is responsible for
 * choosing `font` scaled to the pixel ratio.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts]
 * @param {string} [opts.font]
 * @param {string} [opts.fillStyle]
 * @param {string} [opts.strokeStyle]
 * @param {number} [opts.lineWidth]
 * @param {CanvasTextAlign} [opts.align='left']
 * @param {CanvasTextBaseline} [opts.baseline='alphabetic']
 */
export function drawText(ctx, text, x, y, opts = {}) {
	ctx.save();
	if (opts.font) ctx.font = opts.font;
	ctx.textAlign = opts.align || 'left';
	ctx.textBaseline = opts.baseline || 'alphabetic';
	if (opts.strokeStyle) {
		ctx.strokeStyle = opts.strokeStyle;
		ctx.lineWidth = opts.lineWidth || 1;
		ctx.strokeText(text, x, y);
	}
	if (opts.fillStyle) {
		ctx.fillStyle = opts.fillStyle;
		ctx.fillText(text, x, y);
	}
	ctx.restore();
}

/* =========================================================================
 *  PLUGIN BASE
 *
 *  Default implementation of v5.x ISeriesPrimitive lifecycle. Concrete
 *  plugins extend this class and override the optional hooks:
 *
 *    - updateAllViews()
 *    - paneViews()  / pricePaneViews() / timeAxisViews() / etc.
 *    - dataUpdated(scope)         (protected hook, called on series data change)
 *    - hitTest(x, y)
 *
 *  Helpers exposed to subclasses:
 *    - this.chart      => IChartApi          (throws if detached)
 *    - this.series     => ISeriesApi         (throws if detached)
 *    - this.requestUpdate()                  (no-op if detached)
 * ========================================================================= */

export class PluginBase {
	constructor() {
		/** @type {import('lightweight-charts').IChartApi | undefined} */
		this._chart = undefined;
		/** @type {import('lightweight-charts').ISeriesApi<any> | undefined} */
		this._series = undefined;
		/** @type {(() => void) | undefined} */
		this._requestUpdate = undefined;

		// Bound once so subscribe/unsubscribe receive the same reference.
		this._fireDataUpdated = scope => {
			if (typeof this.dataUpdated === 'function') {
				this.dataUpdated(scope);
			}
		};
	}

	/**
	 * Called by lightweight-charts when the primitive is attached to a series.
	 * @param {{chart: import('lightweight-charts').IChartApi, series: import('lightweight-charts').ISeriesApi<any>, requestUpdate: () => void}} param
	 */
	attached({ chart, series, requestUpdate }) {
		this._chart = chart;
		this._series = series;
		this._requestUpdate = requestUpdate;
		this._series.subscribeDataChanged(this._fireDataUpdated);
		this.requestUpdate();
	}

	/** Called by lightweight-charts when the primitive is detached. */
	detached() {
		if (this._series) {
			try { this._series.unsubscribeDataChanged(this._fireDataUpdated); } catch (_) { /* noop */ }
		}
		this._chart = undefined;
		this._series = undefined;
		this._requestUpdate = undefined;
	}

	/** Attached chart. Throws if the plugin is not attached. */
	get chart() { return ensureDefined(this._chart); }

	/** Attached series. Throws if the plugin is not attached. */
	get series() { return ensureDefined(this._series); }

	/** Request a redraw from the host chart. No-op when detached. */
	requestUpdate() {
		if (this._requestUpdate) this._requestUpdate();
	}

	/* ----- ISeriesPrimitive optional hooks: safe defaults ----- */

	/** Override to recompute view state before paint. */
	updateAllViews() { /* override */ }

	/** @returns {readonly any[]} */
	paneViews() { return []; }

	/** @returns {readonly any[]} */
	priceAxisViews() { return []; }

	/** @returns {readonly any[]} */
	timeAxisViews() { return []; }

	/** @returns {readonly any[]} */
	priceAxisPaneViews() { return []; }

	/** @returns {readonly any[]} */
	timeAxisPaneViews() { return []; }

	/**
	 * Optional hit-test for crosshair/tooltip interactions. Return null when
	 * nothing is hit.
	 * @param {number} _x
	 * @param {number} _y
	 * @returns {null | {cursorStyle?: string, externalId?: string, zOrder?: string}}
	 */
	hitTest(_x, _y) { return null; }
}

export default PluginBase;
