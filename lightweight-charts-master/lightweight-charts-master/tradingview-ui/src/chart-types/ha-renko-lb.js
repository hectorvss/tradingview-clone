// chart-types/ha-renko-lb.js
// Pure-function chart-type transformers for lightweight-charts v5.2.0.
// Each transformer takes an array of OHLCV candles and returns a new array
// (or wrapper object, for Renko) suitable for CandlestickSeries.setData().
//
// All functions are deterministic and side-effect free.

/**
 * Convert standard OHLCV candles to Heikin-Ashi candles.
 *
 * Formula:
 *   haClose = (O + H + L + C) / 4
 *   haOpen  = i === 0 ? (O + C) / 2 : (prevHaOpen + prevHaClose) / 2
 *   haHigh  = max(H, haOpen, haClose)
 *   haLow   = min(L, haOpen, haClose)
 *
 * Time and volume are preserved unchanged.
 *
 * @param {Array<{time:any,open:number,high:number,low:number,close:number,volume?:number}>} candles
 * @returns {Array<{time:any,open:number,high:number,low:number,close:number,volume?:number}>}
 */
export function toHeikinAshi(candles) {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    const out = new Array(candles.length);
    let prevHaOpen = 0;
    let prevHaClose = 0;
    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = i === 0
            ? (c.open + c.close) / 2
            : (prevHaOpen + prevHaClose) / 2;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        const bar = {
            time: c.time,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
        };
        if (c.volume !== undefined) bar.volume = c.volume;
        out[i] = bar;
        prevHaOpen = haOpen;
        prevHaClose = haClose;
    }
    return out;
}

/**
 * Compute the Average True Range (ATR) over `period` bars on the full series.
 * Returns the ATR value computed using Wilder's smoothing on the last bar.
 * Used internally by toRenko when brickSize === 'atr'.
 *
 * @param {Array<{high:number,low:number,close:number}>} candles
 * @param {number} period
 * @returns {number} ATR of the last bar; 0 if insufficient data.
 */
function computeATR(candles, period) {
    if (!Array.isArray(candles) || candles.length < 2 || period <= 0) return 0;
    const trs = new Array(candles.length);
    trs[0] = candles[0].high - candles[0].low;
    for (let i = 1; i < candles.length; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        const pc = candles[i - 1].close;
        trs[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
    if (candles.length < period) {
        // Fall back to simple average of available TRs.
        let s = 0;
        for (let i = 0; i < trs.length; i++) s += trs[i];
        return s / trs.length;
    }
    // Seed with SMA of first `period` TRs, then Wilder smoothing.
    let atr = 0;
    for (let i = 0; i < period; i++) atr += trs[i];
    atr /= period;
    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
    }
    return atr;
}

/**
 * Convert OHLCV candles to classic Renko bricks.
 *
 * A new brick is emitted whenever price moves by `brickSize` from the prior
 * brick's close, in either direction. Multiple bricks may be emitted per
 * source candle. Each brick has open === prevClose and close === prevClose ±
 * brickSize. The first brick is seeded from the first candle's open, snapped
 * to the brickSize grid.
 *
 * Time uses the source candle's time, incremented by 1 second per extra brick
 * emitted from the same candle, so all brick times are strictly increasing
 * (a requirement of lightweight-charts).
 *
 * @param {Array<{time:any,open:number,high:number,low:number,close:number,volume?:number}>} candles
 * @param {{brickSize?: 'atr'|number, atrPeriod?: number}} [opts]
 * @returns {{bricks: Array<{time:any,open:number,high:number,low:number,close:number}>, brickSize: number, source: 'renko'}}
 */
export function toRenko(candles, opts) {
    const options = opts || {};
    const brickSizeOpt = options.brickSize !== undefined ? options.brickSize : 'atr';
    const atrPeriod = options.atrPeriod !== undefined ? options.atrPeriod : 14;

    if (!Array.isArray(candles) || candles.length === 0) {
        return { bricks: [], brickSize: 0, source: 'renko' };
    }

    let brickSize;
    if (brickSizeOpt === 'atr') {
        brickSize = computeATR(candles, atrPeriod);
    } else {
        brickSize = Number(brickSizeOpt);
    }
    if (!isFinite(brickSize) || brickSize <= 0) {
        return { bricks: [], brickSize: 0, source: 'renko' };
    }

    const bricks = [];
    // Seed price snapped to the brickSize grid so brick boundaries are stable.
    let lastClose = Math.floor(candles[0].open / brickSize) * brickSize;

    const isNumericTime = typeof candles[0].time === 'number';

    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        let emittedThisBar = 0;
        // Walk price up/down by brickSize until within (lastClose - bs, lastClose + bs).
        // Use close as the driver (classic Renko).
        let safety = 0;
        while (safety++ < 100000) {
            if (c.close >= lastClose + brickSize) {
                const open = lastClose;
                const close = lastClose + brickSize;
                const t = isNumericTime ? c.time + emittedThisBar : c.time;
                bricks.push({
                    time: t,
                    open,
                    high: close,
                    low: open,
                    close,
                });
                lastClose = close;
                emittedThisBar++;
            } else if (c.close <= lastClose - brickSize) {
                const open = lastClose;
                const close = lastClose - brickSize;
                const t = isNumericTime ? c.time + emittedThisBar : c.time;
                bricks.push({
                    time: t,
                    open,
                    high: open,
                    low: close,
                    close,
                });
                lastClose = close;
                emittedThisBar++;
            } else {
                break;
            }
        }
    }

    return { bricks, brickSize, source: 'renko' };
}

/**
 * Convert OHLCV candles to an N-line-break series (default N = 3).
 *
 * Rules:
 *   - First line is seeded from the first two distinct closes (or the first
 *     candle's open/close if only one bar is available).
 *   - A new "up" line is drawn when close > max(high of last N lines).
 *   - A new "down" line is drawn when close < min(low of last N lines).
 *   - When a reversal occurs (e.g. up after down), only the last 1 line is
 *     used as the reference for the break threshold (classic N-line-break
 *     reversal rule).
 *   - Otherwise the bar is ignored.
 *
 * Each emitted line is a candle: an up line has open=prevClose, close=newClose;
 * a down line has open=prevClose, close=newClose (close < open).
 *
 * Time uses the triggering candle's time; if a duplicate time would result
 * (multiple lines per same timestamp won't happen here since each line needs
 * a triggering bar), time is passed through unchanged.
 *
 * @param {Array<{time:any,open:number,high:number,low:number,close:number,volume?:number}>} candles
 * @param {number} [lines=3]
 * @returns {Array<{time:any,open:number,high:number,low:number,close:number}>}
 */
export function toLineBreak(candles, lines) {
    const N = lines === undefined ? 3 : Math.max(1, Math.floor(lines));
    if (!Array.isArray(candles) || candles.length === 0) return [];

    const out = [];
    // Seed: find first bar whose close differs from candles[0].open, or use
    // the first bar as a flat seed line.
    const first = candles[0];
    let seedOpen = first.open;
    let seedClose = first.close;
    if (seedClose === seedOpen && candles.length > 1) {
        seedClose = candles[1].close;
    }
    if (seedClose === seedOpen) {
        // Degenerate: nothing to break. Emit a single flat line and stop.
        out.push({
            time: first.time,
            open: seedOpen,
            high: seedOpen,
            low: seedOpen,
            close: seedOpen,
        });
        return out;
    }
    out.push({
        time: first.time,
        open: seedOpen,
        high: Math.max(seedOpen, seedClose),
        low: Math.min(seedOpen, seedClose),
        close: seedClose,
    });

    const startIdx = (seedClose === first.close) ? 1 : 2;

    for (let i = startIdx; i < candles.length; i++) {
        const c = candles[i];
        const last = out[out.length - 1];
        const lastDir = last.close > last.open ? 1 : (last.close < last.open ? -1 : 0);

        // Reference window: last N lines for continuation, last 1 line for reversal.
        const window = out.slice(-N);
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (let j = 0; j < window.length; j++) {
            const w = window[j];
            const hi = Math.max(w.open, w.close);
            const lo = Math.min(w.open, w.close);
            if (hi > maxHigh) maxHigh = hi;
            if (lo < minLow) minLow = lo;
        }
        // Reversal thresholds use only the last line.
        const lastHi = Math.max(last.open, last.close);
        const lastLo = Math.min(last.open, last.close);

        let newLine = null;
        if (lastDir >= 0) {
            // Currently up (or flat): continuation needs close > maxHigh of last N;
            // reversal down needs close < minLow of last N.
            if (c.close > maxHigh) {
                const openP = last.close;
                const closeP = c.close;
                newLine = {
                    time: c.time,
                    open: openP,
                    high: closeP,
                    low: openP,
                    close: closeP,
                };
            } else if (c.close < minLow) {
                const openP = last.close;
                const closeP = c.close;
                newLine = {
                    time: c.time,
                    open: openP,
                    high: openP,
                    low: closeP,
                    close: closeP,
                };
            }
        } else {
            // Currently down: continuation needs close < minLow of last N;
            // reversal up needs close > maxHigh of last N.
            if (c.close < minLow) {
                const openP = last.close;
                const closeP = c.close;
                newLine = {
                    time: c.time,
                    open: openP,
                    high: openP,
                    low: closeP,
                    close: closeP,
                };
            } else if (c.close > maxHigh) {
                const openP = last.close;
                const closeP = c.close;
                newLine = {
                    time: c.time,
                    open: openP,
                    high: closeP,
                    low: openP,
                    close: closeP,
                };
            }
        }

        if (newLine) {
            // Guard strictly increasing time for numeric timestamps.
            if (typeof newLine.time === 'number' && newLine.time <= last.time) {
                newLine.time = last.time + 1;
            }
            out.push(newLine);
        }
    }

    return out;
}

/**
 * Apply a chart type to a lightweight-charts CandlestickSeries.
 *
 * @param {{setData: Function}} series  A CandlestickSeries (or compatible).
 * @param {Array} candles               Raw OHLCV candles.
 * @param {'candles'|'heikin-ashi'|'renko'|'line-break'} type
 * @param {Object} [opts]               Transformer-specific options:
 *                                      - renko: {brickSize, atrPeriod}
 *                                      - line-break: {lines}
 * @returns {{type:string, count:number, brickSize?:number}} Metadata.
 */
export function applyChartType(series, candles, type, opts) {
    const options = opts || {};
    const data = Array.isArray(candles) ? candles : [];
    switch (type) {
        case 'candles': {
            series.setData(data);
            return { type, count: data.length };
        }
        case 'heikin-ashi': {
            const ha = toHeikinAshi(data);
            series.setData(ha);
            return { type, count: ha.length };
        }
        case 'renko': {
            const r = toRenko(data, options);
            series.setData(r.bricks);
            return { type, count: r.bricks.length, brickSize: r.brickSize };
        }
        case 'line-break': {
            const lb = toLineBreak(data, options.lines);
            series.setData(lb);
            return { type, count: lb.length };
        }
        default:
            throw new Error('applyChartType: unknown type "' + type + '"');
    }
}

export default {
    toHeikinAshi,
    toRenko,
    toLineBreak,
    applyChartType,
};
