/* =========================================================================
   Smart Money Concepts (SMC) indicators
   Inputs: candles = Array<{time, open, high, low, close, volume?}>
   Each indicator exports a pure function + a catalog entry.
   ========================================================================= */

const r = (n, d = 4) => +Number(n).toFixed(d);

/* -------------------------------------------------------------------------
   1) Fair Value Gap (FVG / Imbalance)
   3-candle pattern. Bullish FVG: candle[i-1].high < candle[i+1].low
   Bearish FVG: candle[i-1].low > candle[i+1].high
   Returns array of {time, top, bottom, type, filled}.
   ------------------------------------------------------------------------- */
export function FairValueGap(candles, opts = {}) {
  const { minSize = 0.001 } = opts;
  const out = [];
  if (!candles || candles.length < 3) return out;
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const next = candles[i + 1];
    const refPrice = candles[i].close || 1;
    // Bullish FVG: gap between prev.high and next.low
    if (prev.high < next.low) {
      const top = next.low;
      const bottom = prev.high;
      const size = (top - bottom) / refPrice;
      if (size >= minSize) {
        // determine fill: any later candle whose low penetrates 'bottom'
        let filled = false;
        for (let k = i + 2; k < candles.length; k++) {
          if (candles[k].low <= bottom) { filled = true; break; }
        }
        out.push({
          time: candles[i].time,
          top: r(top), bottom: r(bottom),
          type: 'bullish', filled,
        });
      }
    }
    // Bearish FVG
    if (prev.low > next.high) {
      const top = prev.low;
      const bottom = next.high;
      const size = (top - bottom) / refPrice;
      if (size >= minSize) {
        let filled = false;
        for (let k = i + 2; k < candles.length; k++) {
          if (candles[k].high >= top) { filled = true; break; }
        }
        out.push({
          time: candles[i].time,
          top: r(top), bottom: r(bottom),
          type: 'bearish', filled,
        });
      }
    }
  }
  return out;
}

export const FVG_CATALOG = {
  id: 'smc-fvg',
  name: 'Fair Value Gap (FVG)',
  category: 'smc',
  defaultParams: { minSize: 0.001 },
  paramSchema: {
    minSize: { type: 'number', min: 0, max: 0.1, step: 0.0001, label: 'Tamaño mínimo (% precio)' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'rectangle',
    fields: ['top', 'bottom'],
    colorBy: 'type',
    colors: { bullish: 'rgba(8,153,129,0.18)', bearish: 'rgba(242,54,69,0.18)' },
    fadedWhen: 'filled',
  },
};

/* -------------------------------------------------------------------------
   2) Order Blocks
   The last opposite-color candle before a strong impulsive move.
   Bullish OB: last bearish (red) candle before strong up move.
   Bearish OB: last bullish (green) candle before strong down move.
   minMove is fraction of price (e.g. 0.02 = 2%) measured over lookback bars.
   Returns [{time, top, bottom, type, strength}].
   ------------------------------------------------------------------------- */
export function OrderBlocks(candles, opts = {}) {
  const { lookback = 5, minMove = 0.02 } = opts;
  const out = [];
  if (!candles || candles.length < lookback + 2) return out;
  for (let i = 1; i < candles.length - lookback; i++) {
    const c = candles[i];
    const startClose = c.close;
    let maxAhead = -Infinity, minAhead = Infinity;
    for (let k = i + 1; k <= i + lookback && k < candles.length; k++) {
      if (candles[k].high > maxAhead) maxAhead = candles[k].high;
      if (candles[k].low < minAhead) minAhead = candles[k].low;
    }
    const upMove = (maxAhead - startClose) / (startClose || 1);
    const dnMove = (startClose - minAhead) / (startClose || 1);

    const isBearishCandle = c.close < c.open;
    const isBullishCandle = c.close > c.open;

    // Bullish OB: bearish candle followed by strong up-move
    if (isBearishCandle && upMove >= minMove) {
      // ensure this is the LAST bearish candle in a small window — check next candle is bullish
      const next = candles[i + 1];
      if (next && next.close > next.open) {
        out.push({
          time: c.time,
          top: r(c.high), bottom: r(c.low),
          type: 'bullish', strength: r(upMove, 4),
        });
      }
    }
    // Bearish OB: bullish candle followed by strong down-move
    if (isBullishCandle && dnMove >= minMove) {
      const next = candles[i + 1];
      if (next && next.close < next.open) {
        out.push({
          time: c.time,
          top: r(c.high), bottom: r(c.low),
          type: 'bearish', strength: r(dnMove, 4),
        });
      }
    }
  }
  return out;
}

export const OB_CATALOG = {
  id: 'smc-ob',
  name: 'Order Blocks',
  category: 'smc',
  defaultParams: { lookback: 5, minMove: 0.02 },
  paramSchema: {
    lookback: { type: 'integer', min: 1, max: 50, step: 1, label: 'Barras hacia delante' },
    minMove:  { type: 'number',  min: 0, max: 1,  step: 0.001, label: 'Movimiento mínimo (fracción)' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'rectangle',
    fields: ['top', 'bottom'],
    colorBy: 'type',
    colors: { bullish: 'rgba(8,153,129,0.25)', bearish: 'rgba(242,54,69,0.25)' },
    sizeBy: 'strength',
  },
};

/* -------------------------------------------------------------------------
   Internal: detect swing pivots (HH/HL/LH/LL) with given lookback on each side
   Returns array of {idx, time, price, kind: 'H'|'L'}
   ------------------------------------------------------------------------- */
function _pivots(candles, leftRight = 3) {
  const out = [];
  for (let i = leftRight; i < candles.length - leftRight; i++) {
    let isHigh = true, isLow = true;
    const h = candles[i].high, l = candles[i].low;
    for (let j = i - leftRight; j <= i + leftRight; j++) {
      if (j === i) continue;
      if (candles[j].high >= h) isHigh = false;
      if (candles[j].low  <= l) isLow  = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) out.push({ idx: i, time: candles[i].time, price: h, kind: 'H' });
    if (isLow)  out.push({ idx: i, time: candles[i].time, price: l, kind: 'L' });
  }
  return out;
}

/* -------------------------------------------------------------------------
   3) Break of Structure (BOS)
   After identifying pivots, a BOS-up = close breaks above last swing high
   while existing trend is up. BOS-down = close breaks below last swing low
   while existing trend is down. Continuation signals.
   Returns [{time, type:'bos-up'|'bos-down', priceLevel}].
   ------------------------------------------------------------------------- */
export function BreakOfStructure(candles, opts = {}) {
  const { lookback = 20 } = opts;
  const out = [];
  if (!candles || candles.length < lookback + 4) return out;
  const lr = Math.max(2, Math.floor(lookback / 6));
  const pivots = _pivots(candles, lr);
  if (pivots.length < 2) return out;

  let trend = 0; // 1 up, -1 down, 0 unknown
  let lastHigh = null; // {idx, price}
  let lastLow  = null;
  let prevHigh = null;
  let prevLow  = null;

  // Walk candles; maintain pivot list up to current bar
  let pi = 0;
  for (let i = 0; i < candles.length; i++) {
    // ingest pivots whose idx is sufficiently in the past (idx + lr <= i)
    while (pi < pivots.length && pivots[pi].idx + lr <= i) {
      const p = pivots[pi];
      if (p.kind === 'H') {
        prevHigh = lastHigh;
        lastHigh = p;
        if (prevHigh && lastHigh.price > prevHigh.price) trend = 1; // HH
        else if (prevHigh && lastHigh.price < prevHigh.price) {
          if (trend === 1) trend = 0; // LH while uptrend — neutral until break
        }
      } else {
        prevLow = lastLow;
        lastLow = p;
        if (prevLow && lastLow.price < prevLow.price) trend = -1; // LL
        else if (prevLow && lastLow.price > prevLow.price) {
          if (trend === -1) trend = 0;
        }
      }
      pi++;
    }

    const c = candles[i];
    if (trend === 1 && lastHigh && i > lastHigh.idx && c.close > lastHigh.price) {
      out.push({ time: c.time, type: 'bos-up', priceLevel: r(lastHigh.price) });
      // promote: this break becomes the new reference
      lastHigh = { idx: i, time: c.time, price: c.close };
    } else if (trend === -1 && lastLow && i > lastLow.idx && c.close < lastLow.price) {
      out.push({ time: c.time, type: 'bos-down', priceLevel: r(lastLow.price) });
      lastLow = { idx: i, time: c.time, price: c.close };
    }
  }
  return out;
}

export const BOS_CATALOG = {
  id: 'smc-bos',
  name: 'Break of Structure (BOS)',
  category: 'smc',
  defaultParams: { lookback: 20 },
  paramSchema: {
    lookback: { type: 'integer', min: 4, max: 200, step: 1, label: 'Lookback de estructura' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'marker',
    fields: ['priceLevel'],
    colorBy: 'type',
    colors: { 'bos-up': '#089981', 'bos-down': '#f23645' },
    labels: { 'bos-up': 'BOS', 'bos-down': 'BOS' },
  },
};

/* -------------------------------------------------------------------------
   4) Change of Character (CHoCH)
   First BOS in the OPPOSITE direction after a defined trend — signals
   potential reversal.
   ------------------------------------------------------------------------- */
export function ChangeOfCharacter(candles, opts = {}) {
  const { lookback = 20 } = opts;
  const out = [];
  if (!candles || candles.length < lookback + 4) return out;
  const lr = Math.max(2, Math.floor(lookback / 6));
  const pivots = _pivots(candles, lr);
  if (pivots.length < 2) return out;

  let trend = 0;
  let lastHigh = null, lastLow = null, prevHigh = null, prevLow = null;
  let pi = 0;

  for (let i = 0; i < candles.length; i++) {
    while (pi < pivots.length && pivots[pi].idx + lr <= i) {
      const p = pivots[pi];
      if (p.kind === 'H') {
        prevHigh = lastHigh;
        lastHigh = p;
        if (prevHigh && lastHigh.price > prevHigh.price) trend = 1;
      } else {
        prevLow = lastLow;
        lastLow = p;
        if (prevLow && lastLow.price < prevLow.price) trend = -1;
      }
      pi++;
    }
    const c = candles[i];
    // CHoCH UP: previously downtrend, now breaks above last swing high
    if (trend === -1 && lastHigh && i > lastHigh.idx && c.close > lastHigh.price) {
      out.push({ time: c.time, type: 'choch-up', priceLevel: r(lastHigh.price) });
      trend = 1;
      lastHigh = { idx: i, time: c.time, price: c.close };
    }
    // CHoCH DOWN: previously uptrend, now breaks below last swing low
    else if (trend === 1 && lastLow && i > lastLow.idx && c.close < lastLow.price) {
      out.push({ time: c.time, type: 'choch-down', priceLevel: r(lastLow.price) });
      trend = -1;
      lastLow = { idx: i, time: c.time, price: c.close };
    }
  }
  return out;
}

export const CHOCH_CATALOG = {
  id: 'smc-choch',
  name: 'Change of Character (CHoCH)',
  category: 'smc',
  defaultParams: { lookback: 20 },
  paramSchema: {
    lookback: { type: 'integer', min: 4, max: 200, step: 1, label: 'Lookback de estructura' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'marker',
    fields: ['priceLevel'],
    colorBy: 'type',
    colors: { 'choch-up': '#26c6da', 'choch-down': '#ec407a' },
    labels: { 'choch-up': 'CHoCH', 'choch-down': 'CHoCH' },
  },
};

/* -------------------------------------------------------------------------
   5) Liquidity Sweeps
   Wick pierces prior swing high/low by <= tolerance*price then candle
   closes back inside the prior range. Indicates stop-hunt / liquidity grab.
   tolerance: fraction of price (e.g. 0.0005 = 5 bps).
   Returns [{time, swept, direction, strength}].
   ------------------------------------------------------------------------- */
export function LiquiditySweeps(candles, opts = {}) {
  const { tolerance = 0.0005 } = opts;
  const out = [];
  if (!candles || candles.length < 6) return out;
  const lr = 3;
  const pivots = _pivots(candles, lr);
  // Build sorted arrays of confirmed pivot highs / lows with idx
  const highs = pivots.filter(p => p.kind === 'H');
  const lows  = pivots.filter(p => p.kind === 'L');

  for (let i = lr + 1; i < candles.length; i++) {
    const c = candles[i];
    const price = c.close || 1;
    const tol = tolerance * price;

    // Find most recent pivot high BEFORE this bar (idx + lr <= i so it was confirmed)
    let ph = null;
    for (let k = highs.length - 1; k >= 0; k--) {
      if (highs[k].idx + lr <= i && highs[k].idx < i) { ph = highs[k]; break; }
    }
    let pl = null;
    for (let k = lows.length - 1; k >= 0; k--) {
      if (lows[k].idx + lr <= i && lows[k].idx < i) { pl = lows[k]; break; }
    }

    // Upside sweep: wick > pivot high, close <= pivot high (back inside)
    if (ph && c.high > ph.price && c.close <= ph.price + tol && c.close < c.high) {
      const wickSize = c.high - Math.max(c.open, c.close);
      const candleRange = (c.high - c.low) || 1e-9;
      out.push({
        time: c.time,
        swept: r(ph.price),
        direction: 'up',
        strength: r(wickSize / candleRange, 4),
      });
    }
    // Downside sweep
    if (pl && c.low < pl.price && c.close >= pl.price - tol && c.close > c.low) {
      const wickSize = Math.min(c.open, c.close) - c.low;
      const candleRange = (c.high - c.low) || 1e-9;
      out.push({
        time: c.time,
        swept: r(pl.price),
        direction: 'down',
        strength: r(wickSize / candleRange, 4),
      });
    }
  }
  return out;
}

export const SWEEPS_CATALOG = {
  id: 'smc-sweeps',
  name: 'Liquidity Sweeps',
  category: 'smc',
  defaultParams: { tolerance: 0.0005 },
  paramSchema: {
    tolerance: { type: 'number', min: 0, max: 0.01, step: 0.0001, label: 'Tolerancia (fracción)' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'marker',
    fields: ['swept'],
    colorBy: 'direction',
    colors: { up: '#f23645', down: '#089981' },
    labels: { up: 'Sweep', down: 'Sweep' },
  },
};

/* -------------------------------------------------------------------------
   6) Volume Delta
   buyVol = vol * (close - low) / (high - low)
   sellVol = vol - buyVol
   delta = buyVol - sellVol; cumulative running sum.
   Returns [{time, delta, cumulative}].
   ------------------------------------------------------------------------- */
export function VolumeDelta(candles) {
  const out = [];
  if (!candles || !candles.length) return out;
  let cum = 0;
  for (const c of candles) {
    const range = (c.high - c.low) || 1e-9;
    const vol = c.volume || 0;
    const buy = vol * (c.close - c.low) / range;
    const sell = vol - buy;
    const delta = buy - sell;
    cum += delta;
    out.push({ time: c.time, delta: r(delta, 2), cumulative: r(cum, 2) });
  }
  return out;
}

export const VOLDELTA_CATALOG = {
  id: 'smc-voldelta',
  name: 'Volume Delta',
  category: 'smc',
  defaultParams: {},
  paramSchema: {},
  render: 'pane',
  overlayHints: {
    shape: 'histogram',
    fields: ['delta'],
    secondary: { shape: 'line', field: 'cumulative' },
    colorByField: 'delta',
    colors: { positive: '#089981', negative: '#f23645' },
  },
};

/* -------------------------------------------------------------------------
   7) Anchored Volume Profile
   Builds horizontal volume distribution starting from a given anchorTime.
   Returns {poc, vah, val, bins:[{price, volume}]}.
   VAH/VAL define the 70% value area around POC.
   ------------------------------------------------------------------------- */
export function AnchoredVolumeProfile(candles, anchorTime, opts = {}) {
  const { bins = 60 } = opts;
  if (!candles || !candles.length) return { poc: null, vah: null, val: null, bins: [] };

  // slice from anchor
  const startIdx = candles.findIndex(c => c.time >= anchorTime);
  const slice = startIdx >= 0 ? candles.slice(startIdx) : candles.slice();
  if (!slice.length) return { poc: null, vah: null, val: null, bins: [] };

  let hi = -Infinity, lo = Infinity, totalVol = 0;
  for (const c of slice) {
    if (c.high > hi) hi = c.high;
    if (c.low  < lo) lo = c.low;
    totalVol += (c.volume || 0);
  }
  if (hi === lo) hi = lo + 1e-9;
  const binSize = (hi - lo) / bins;
  const binVols = new Array(bins).fill(0);

  // Distribute each candle's volume across the bins it touches (proportional to overlap)
  for (const c of slice) {
    const vol = c.volume || 0;
    if (vol === 0) continue;
    const cRange = (c.high - c.low) || 1e-9;
    const startBin = Math.max(0, Math.floor((c.low - lo) / binSize));
    const endBin   = Math.min(bins - 1, Math.floor((c.high - lo) / binSize));
    for (let b = startBin; b <= endBin; b++) {
      const binLo = lo + b * binSize;
      const binHi = binLo + binSize;
      const overlap = Math.max(0, Math.min(c.high, binHi) - Math.max(c.low, binLo));
      binVols[b] += vol * (overlap / cRange);
    }
  }

  const binsOut = binVols.map((v, b) => ({
    price: r(lo + (b + 0.5) * binSize),
    volume: r(v, 2),
  }));

  // POC = bin with max volume
  let pocIdx = 0;
  for (let i = 1; i < binVols.length; i++) if (binVols[i] > binVols[pocIdx]) pocIdx = i;
  const poc = binsOut[pocIdx].price;

  // Value Area = expand from POC outward until 70% of volume captured
  const target = totalVol * 0.7;
  let acc = binVols[pocIdx];
  let lower = pocIdx, upper = pocIdx;
  while (acc < target && (lower > 0 || upper < bins - 1)) {
    const dn = lower > 0 ? binVols[lower - 1] : -1;
    const up = upper < bins - 1 ? binVols[upper + 1] : -1;
    if (up >= dn) { upper++; acc += binVols[upper]; }
    else          { lower--; acc += binVols[lower]; }
  }
  const val = binsOut[lower].price;
  const vah = binsOut[upper].price;

  return { poc, vah, val, bins: binsOut };
}

export const AVP_CATALOG = {
  id: 'smc-avp',
  name: 'Anchored Volume Profile',
  category: 'smc',
  defaultParams: { bins: 60 },
  paramSchema: {
    bins: { type: 'integer', min: 10, max: 500, step: 1, label: 'Número de bins' },
    anchorTime: { type: 'time', label: 'Punto de anclaje' },
  },
  render: 'overlay',
  overlayHints: {
    shape: 'profile',
    fields: ['bins', 'poc', 'vah', 'val'],
    pocColor: '#f7a600',
    vaColor: 'rgba(247,166,0,0.15)',
    binColor: 'rgba(124,77,255,0.45)',
  },
};

/* -------------------------------------------------------------------------
   Combined catalog
   ------------------------------------------------------------------------- */
export const SMC_INDICATOR_CATALOG = [
  FVG_CATALOG,
  OB_CATALOG,
  BOS_CATALOG,
  CHOCH_CATALOG,
  SWEEPS_CATALOG,
  VOLDELTA_CATALOG,
  AVP_CATALOG,
];
