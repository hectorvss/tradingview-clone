/**
 * rb-pf-kagi.js
 * ----------------------------------------------------------------------------
 * Pure, deterministic price-action chart transformers for lightweight-charts
 * v5.2.0. Converts a standard OHLCV candle array into candle-encoded variants
 * suitable for `CandlestickSeries.setData(...)`:
 *
 *   - toRangeBars       : fixed price-range bars
 *   - toPointAndFigure  : classic X / O point-and-figure columns
 *   - toKagi            : kagi yang/yin lines
 *
 * Plus a convenience helper `applyAltChartType(series, candles, type, opts)`
 * mirroring the ha-renko-lb.js export pattern used elsewhere in this project.
 *
 * All inputs are arrays of plain candle objects:
 *   { time: number, open: number, high: number, low: number, close: number, volume?: number }
 * `time` is a UTCTimestamp (seconds since epoch) — lightweight-charts native.
 *
 * No external dependencies. Side-effect free aside from `applyAltChartType`,
 * which only calls `series.setData(...)`.
 * ----------------------------------------------------------------------------
 */

'use strict';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wilder-style ATR over an array of candles. Returns a single ATR value taken
 * from the last `period` true-range readings. Used when an alt-chart option
 * accepts `'atr'` as its sizing input.
 *
 * @param {Array<{high:number,low:number,close:number}>} candles
 * @param {number} period
 * @returns {number} ATR. 0 if not enough data.
 */
function _atr(candles, period) {
  if (!Array.isArray(candles) || candles.length < 2) return 0;
  const p = Math.max(1, period | 0);
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trs.push(tr);
  }
  const slice = trs.slice(-p);
  if (slice.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < slice.length; i++) sum += slice[i];
  return sum / slice.length;
}

/**
 * Resolve a size option that may be a literal number or the string 'atr'.
 * @param {number|'atr'} value
 * @param {Array} candles
 * @param {number} atrPeriod
 * @returns {number}
 */
function _resolveSize(value, candles, atrPeriod) {
  if (value === 'atr') return _atr(candles, atrPeriod || 14);
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Lightweight-charts CandlestickSeries color convention used by this module:
 *   up   bar: close >= open
 *   down bar: close <  open
 * To force a colour we set open/close to encode direction; per-bar colour
 * overrides are also attached via `color`, `borderColor`, `wickColor` so the
 * downstream series picks the same hue regardless of its default palette.
 */
const UP_COLOR = '#26a69a';
const DN_COLOR = '#ef5350';

// ---------------------------------------------------------------------------
// 1) Range Bars
// ---------------------------------------------------------------------------

/**
 * Convert OHLC candles into fixed-range bars. A new bar opens whenever the
 * intra-bar price travel exceeds the configured `range`. Each emitted bar has
 * `high - low === range` (within floating-point tolerance).
 *
 * Direction is decided by the order in which the high or low of the source
 * candle is hit relative to the open: if price walks up first we emit an up
 * bar (open = low, close = high); otherwise a down bar (open = high,
 * close = low). When multiple range bars are produced from a single source
 * candle they continue in the same direction.
 *
 * @param {Array<{time:number,open:number,high:number,low:number,close:number}>} candles
 * @param {{range:(number|'atr'), atrPeriod?:number}} [opts]
 * @returns {Array<{time:number,open:number,high:number,low:number,close:number,color?:string,borderColor?:string,wickColor?:string}>}
 *
 * @example
 * // input  : 4 candles, range = 2
 * // sample : toRangeBars([
 * //   { time: 1, open: 10, high: 12, low: 10, close: 12 },
 * //   { time: 2, open: 12, high: 14, low: 11, close: 13 },
 * //   { time: 3, open: 13, high: 13, low: 9,  close: 9  },
 * //   { time: 4, open: 9,  high: 11, low: 9,  close: 11 },
 * // ], { range: 2 });
 * // => [
 * //   { time:1, open:10, high:12, low:10, close:12, ... up },
 * //   { time:2, open:12, high:14, low:12, close:14, ... up },
 * //   { time:3, open:13, high:13, low:11, close:11, ... down },
 * //   { time:3, open:11, high:11, low:9,  close:9 , ... down },
 * //   { time:4, open:9 , high:11, low:9 , close:11, ... up },
 * // ]
 */
function toRangeBars(candles, opts) {
  const options = opts || {};
  const range = _resolveSize(options.range, candles, options.atrPeriod || 14);
  if (!Array.isArray(candles) || candles.length === 0 || range <= 0) return [];

  const out = [];
  // Running bar state.
  let barOpen = candles[0].open;
  let barHigh = barOpen;
  let barLow = barOpen;
  let barTime = candles[0].time;
  let lastDir = 0; // +1 up, -1 down, 0 unknown

  function emit(dir, time) {
    const isUp = dir >= 0;
    const open = isUp ? barLow : barHigh;
    const close = isUp ? barHigh : barLow;
    const color = isUp ? UP_COLOR : DN_COLOR;
    out.push({
      time: time,
      open: open,
      high: barHigh,
      low: barLow,
      close: close,
      color: color,
      borderColor: color,
      wickColor: color,
    });
    lastDir = isUp ? 1 : -1;
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    barTime = c.time;
    // Decide intra-candle path order: open -> first extreme -> second extreme.
    const upFirst = Math.abs(c.high - c.open) <= Math.abs(c.open - c.low)
      ? true
      : false;
    // Walk the two extremes in order.
    const path = upFirst ? [c.high, c.low] : [c.low, c.high];
    for (let step = 0; step < path.length; step++) {
      const target = path[step];
      // Extend the running bar toward `target`, slicing off completed range
      // bars whenever the span hits `range`.
      while (true) {
        const dir = target >= barHigh ? +1 : (target <= barLow ? -1 : 0);
        if (dir === 0) break;
        if (dir > 0) {
          const room = range - (barHigh - barLow);
          if (target - barHigh < room) {
            barHigh = target;
            break;
          }
          // Complete the bar at barLow + range.
          barHigh = barLow + range;
          emit(+1, barTime);
          // Next bar starts where this ended.
          barOpen = barHigh;
          barLow = barHigh;
        } else {
          const room = range - (barHigh - barLow);
          if (barLow - target < room) {
            barLow = target;
            break;
          }
          barLow = barHigh - range;
          emit(-1, barTime);
          barOpen = barLow;
          barHigh = barLow;
        }
      }
    }
    // Close out the residual partial bar at the source candle close so the
    // last visible bar reflects the most recent price.
    if (i === candles.length - 1 && (barHigh - barLow) > 0) {
      const isUp = c.close >= barOpen;
      out.push({
        time: barTime,
        open: barOpen,
        high: barHigh,
        low: barLow,
        close: c.close,
        color: isUp ? UP_COLOR : DN_COLOR,
        borderColor: isUp ? UP_COLOR : DN_COLOR,
        wickColor: isUp ? UP_COLOR : DN_COLOR,
      });
    }
  }
  // Lightweight-charts requires strictly increasing times. Nudge duplicates.
  return _monotonicTimes(out);
}

// ---------------------------------------------------------------------------
// 2) Point & Figure
// ---------------------------------------------------------------------------

/**
 * Convert OHLC candles into classic three-box-reversal Point & Figure data,
 * encoded as candles for a CandlestickSeries:
 *   X column (rising)  -> green up candle, open = colStart, close = colEnd
 *   O column (falling) -> red  down candle, open = colStart, close = colEnd
 * The `low` / `high` of each emitted bar mirror open/close so the body fully
 * fills the column height.
 *
 * Boxes are aligned to integer multiples of `boxSize` measured from the first
 * candle's open, ensuring deterministic snap-to-grid behaviour.
 *
 * @param {Array<{time:number,open:number,high:number,low:number,close:number}>} candles
 * @param {{boxSize:(number|'atr'), reversal?:number, atrPeriod?:number}} [opts]
 * @returns {Array<{time:number,open:number,high:number,low:number,close:number,color?:string,borderColor?:string,wickColor?:string}>}
 *
 * @example
 * // sample: toPointAndFigure([
 * //   { time: 1, open: 100, high: 103, low: 100, close: 103 },
 * //   { time: 2, open: 103, high: 106, low: 102, close: 106 },
 * //   { time: 3, open: 106, high: 106, low: 100, close: 100 },
 * //   { time: 4, open: 100, high: 102, low: 97 , close: 97  },
 * // ], { boxSize: 1, reversal: 3 });
 * // => emits one X column 100->106, then one O column 106->97.
 */
function toPointAndFigure(candles, opts) {
  const options = opts || {};
  const boxSize = _resolveSize(options.boxSize, candles, options.atrPeriod || 14);
  const reversal = Math.max(1, (options.reversal || 3) | 0);
  if (!Array.isArray(candles) || candles.length === 0 || boxSize <= 0) return [];

  // Snap a price to the grid (floor toward origin).
  const origin = candles[0].open;
  function boxIndex(p) { return Math.floor((p - origin) / boxSize); }
  function priceAt(idx) { return origin + idx * boxSize; }

  const out = [];
  // Column state.
  let dir = 0;       // +1 X, -1 O, 0 uninitialised
  let topIdx = boxIndex(origin);
  let botIdx = topIdx;
  let colTime = candles[0].time;

  function flushColumn() {
    if (dir === 0) return;
    const isUp = dir > 0;
    const colStart = priceAt(isUp ? botIdx : topIdx);
    const colEnd = priceAt(isUp ? topIdx : botIdx);
    const color = isUp ? UP_COLOR : DN_COLOR;
    out.push({
      time: colTime,
      open: colStart,
      high: Math.max(colStart, colEnd),
      low: Math.min(colStart, colEnd),
      close: colEnd,
      color: color,
      borderColor: color,
      wickColor: color,
    });
  }

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const hiIdx = boxIndex(c.high);
    const loIdx = boxIndex(c.low);

    if (dir === 0) {
      // Bootstrap direction from the first candle's net move.
      if (hiIdx > topIdx && loIdx >= botIdx) {
        dir = +1;
        topIdx = hiIdx;
        colTime = c.time;
      } else if (loIdx < botIdx) {
        dir = -1;
        botIdx = loIdx;
        colTime = c.time;
      } else if (hiIdx > topIdx) {
        dir = +1;
        topIdx = hiIdx;
        colTime = c.time;
      }
      continue;
    }

    if (dir > 0) {
      // Extend the X column on new highs.
      if (hiIdx > topIdx) topIdx = hiIdx;
      // Reversal: price has fallen `reversal` boxes from the column top.
      if (topIdx - loIdx >= reversal) {
        flushColumn();
        dir = -1;
        // New O column starts one box below the prior top.
        topIdx = topIdx - 1;
        botIdx = loIdx;
        colTime = c.time;
      }
    } else {
      if (loIdx < botIdx) botIdx = loIdx;
      if (hiIdx - botIdx >= reversal) {
        flushColumn();
        dir = +1;
        botIdx = botIdx + 1;
        topIdx = hiIdx;
        colTime = c.time;
      }
    }
  }
  // Flush the in-progress column so the most recent action is visible.
  flushColumn();
  return _monotonicTimes(out);
}

// ---------------------------------------------------------------------------
// 3) Kagi
// ---------------------------------------------------------------------------

/**
 * Convert OHLC candles into Kagi-line data, encoded as candles:
 *   yang segment (thick green) when the line is above the previous shoulder
 *   yin  segment (thin red)    when below the previous shoulder
 * Each emitted bar represents one Kagi segment with `close` = current line
 * price and `open` = previous line price.
 *
 * `value` is either an absolute price reversal threshold (when `reversal` is
 * 'price'), a fraction of price (when `reversal` is 'percent', e.g. 0.04 for
 * 4%), or an ATR multiple (when `reversal` is 'atr').
 *
 * @param {Array<{time:number,open:number,high:number,low:number,close:number}>} candles
 * @param {{reversal?:('price'|'percent'|'atr'), value:number, atrPeriod?:number}} [opts]
 * @returns {Array<{time:number,open:number,high:number,low:number,close:number,color?:string,borderColor?:string,wickColor?:string}>}
 *
 * @example
 * // sample: toKagi([
 * //   { time: 1, open: 100, high: 100, low: 100, close: 100 },
 * //   { time: 2, open: 100, high: 105, low: 100, close: 105 },
 * //   { time: 3, open: 105, high: 105, low: 100, close: 100 },
 * //   { time: 4, open: 100, high: 108, low: 100, close: 108 },
 * // ], { reversal: 'percent', value: 0.04 });
 * // => yang up to 105, yin down to 100, yang up to 108.
 */
function toKagi(candles, opts) {
  const options = opts || {};
  const mode = options.reversal || 'percent';
  const value = Number(options.value);
  if (!Array.isArray(candles) || candles.length === 0 || !Number.isFinite(value) || value <= 0) {
    return [];
  }

  function threshold(price) {
    if (mode === 'price') return value;
    if (mode === 'atr') return _atr(candles, options.atrPeriod || 14) * value;
    // default: percent (fraction)
    return Math.abs(price) * value;
  }

  // Walk the closes; Kagi traditionally uses closes only.
  let linePrice = candles[0].close;
  let lineTime = candles[0].time;
  let dir = 0; // +1 up segment, -1 down segment, 0 none
  let shoulder = linePrice; // last reversal price defining yang/yin shoulder

  const segments = []; // raw (timeStart,timeEnd,priceStart,priceEnd,dir)

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const price = c.close;
    const thr = threshold(linePrice);
    if (dir === 0) {
      if (price - linePrice >= thr) {
        segments.push({ t0: lineTime, t1: c.time, p0: linePrice, p1: price, dir: +1 });
        dir = +1;
        linePrice = price;
        lineTime = c.time;
      } else if (linePrice - price >= thr) {
        segments.push({ t0: lineTime, t1: c.time, p0: linePrice, p1: price, dir: -1 });
        dir = -1;
        linePrice = price;
        lineTime = c.time;
      }
      continue;
    }
    if (dir > 0) {
      if (price > linePrice) {
        // Extend the up segment by mutating the last segment's endpoint.
        const seg = segments[segments.length - 1];
        seg.p1 = price;
        seg.t1 = c.time;
        linePrice = price;
        lineTime = c.time;
      } else if (linePrice - price >= thr) {
        shoulder = linePrice;
        segments.push({ t0: lineTime, t1: c.time, p0: linePrice, p1: price, dir: -1 });
        dir = -1;
        linePrice = price;
        lineTime = c.time;
      }
    } else {
      if (price < linePrice) {
        const seg = segments[segments.length - 1];
        seg.p1 = price;
        seg.t1 = c.time;
        linePrice = price;
        lineTime = c.time;
      } else if (price - linePrice >= thr) {
        shoulder = linePrice;
        segments.push({ t0: lineTime, t1: c.time, p0: linePrice, p1: price, dir: +1 });
        dir = +1;
        linePrice = price;
        lineTime = c.time;
      }
    }
  }

  // Classify each segment as yang (above shoulder) or yin (below shoulder)
  // walking forward so that colour reflects break of prior swing.
  const out = [];
  let prevHigh = -Infinity;
  let prevLow = +Infinity;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const isYang = s.dir > 0 ? s.p1 > prevHigh : s.p0 > prevHigh && s.p1 >= prevLow;
    // Simpler convention: yang when going up through prior high, yin when going down through prior low.
    let yang;
    if (s.dir > 0) yang = s.p1 > prevHigh;
    else yang = !(s.p1 < prevLow);
    const color = yang ? UP_COLOR : DN_COLOR;
    // Encode as candle: open = p0, close = p1. Up candle when p1 >= p0.
    const isUpCandle = s.p1 >= s.p0;
    out.push({
      time: s.t1,
      open: s.p0,
      high: Math.max(s.p0, s.p1),
      low: Math.min(s.p0, s.p1),
      close: isUpCandle ? Math.max(s.p1, s.p0 + 1e-9) : Math.min(s.p1, s.p0 - 1e-9),
      color: color,
      borderColor: color,
      wickColor: color,
    });
    if (s.p1 > prevHigh) prevHigh = s.p1;
    if (s.p1 < prevLow) prevLow = s.p1;
    if (s.p0 > prevHigh) prevHigh = s.p0;
    if (s.p0 < prevLow) prevLow = s.p0;
  }
  return _monotonicTimes(out);
}

// ---------------------------------------------------------------------------
// Time guard: lightweight-charts forbids duplicate or out-of-order times.
// We nudge collisions forward by 1 second; inputs are UTCTimestamp seconds.
// ---------------------------------------------------------------------------

function _monotonicTimes(bars) {
  if (!bars || bars.length === 0) return bars || [];
  let lastT = -Infinity;
  for (let i = 0; i < bars.length; i++) {
    let t = bars[i].time;
    if (t <= lastT) t = lastT + 1;
    bars[i].time = t;
    lastT = t;
  }
  return bars;
}

// ---------------------------------------------------------------------------
// applyAltChartType — convenience binding (mirrors ha-renko-lb.js pattern)
// ---------------------------------------------------------------------------

/**
 * Apply one of the alt chart transforms onto an existing CandlestickSeries.
 * Returns the transformed data so callers may stash it for tooltips / exports.
 *
 * @param {{setData: Function}} series  Lightweight-charts CandlestickSeries.
 * @param {Array} candles               Source OHLCV candles.
 * @param {'range'|'pf'|'kagi'} type    Chart variant.
 * @param {Object} [opts]               Options forwarded to the transformer.
 * @returns {Array} The transformed bar array that was pushed to the series.
 * @throws {Error} on unknown `type` or missing `series.setData`.
 */
function applyAltChartType(series, candles, type, opts) {
  if (!series || typeof series.setData !== 'function') {
    throw new Error('applyAltChartType: series.setData is required');
  }
  let data;
  switch (type) {
    case 'range':
      data = toRangeBars(candles, opts);
      break;
    case 'pf':
      data = toPointAndFigure(candles, opts);
      break;
    case 'kagi':
      data = toKagi(candles, opts);
      break;
    default:
      throw new Error('applyAltChartType: unknown type "' + String(type) + '"');
  }
  series.setData(data);
  return data;
}

// ---------------------------------------------------------------------------
// Exports — UMD-ish: ES module + CommonJS + window global, so this file can
// be loaded from <script type="module">, a bundler, or Node tests alike.
// ---------------------------------------------------------------------------

const _api = {
  toRangeBars: toRangeBars,
  toPointAndFigure: toPointAndFigure,
  toKagi: toKagi,
  applyAltChartType: applyAltChartType,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.RBPFKagi = _api;
}

export { toRangeBars, toPointAndFigure, toKagi, applyAltChartType };
export default _api;
