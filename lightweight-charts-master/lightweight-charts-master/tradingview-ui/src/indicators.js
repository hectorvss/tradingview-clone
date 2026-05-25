/* =========================================================================
   Technical indicators library
   Inputs: candles = Array<{time, open, high, low, close, volume?}>
   Outputs: Array<{time, value}> or Array<{time, ...named fields}>
   ========================================================================= */

const r = (n, d = 4) => +Number(n).toFixed(d);

// ----- Moving Averages -----

export function SMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period) return out;
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i][field];
    if (i >= period) sum -= candles[i - period][field];
    if (i >= period - 1) out.push({ time: candles[i].time, value: r(sum / period) });
  }
  return out;
}

export function EMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period) return out;
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += candles[i][field];
  ema /= period;
  out.push({ time: candles[period - 1].time, value: r(ema) });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i][field] * k + ema * (1 - k);
    out.push({ time: candles[i].time, value: r(ema) });
  }
  return out;
}

export function WMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < candles.length; i++) {
    let num = 0;
    for (let j = 0; j < period; j++) {
      num += candles[i - period + 1 + j][field] * (j + 1);
    }
    out.push({ time: candles[i].time, value: r(num / denom) });
  }
  return out;
}

// ----- Oscillators -----

export function RSI(candles, period = 14) {
  const out = [];
  if (!candles || candles.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = candles[i].close - candles[i - 1].close;
    if (ch >= 0) gain += ch; else loss -= ch;
  }
  gain /= period; loss /= period;
  let rs = loss === 0 ? 100 : gain / loss;
  out.push({ time: candles[period].time, value: r(100 - 100 / (1 + rs), 2) });
  for (let i = period + 1; i < candles.length; i++) {
    const ch = candles[i].close - candles[i - 1].close;
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rs = loss === 0 ? 100 : gain / loss;
    out.push({ time: candles[i].time, value: r(100 - 100 / (1 + rs), 2) });
  }
  return out;
}

export function MACD(candles, fast = 12, slow = 26, signal = 9) {
  const macd = [], signalLine = [], hist = [];
  if (!candles || candles.length < slow + signal) return { macd, signal: signalLine, histogram: hist };
  const emaFast = EMA(candles, fast);
  const emaSlow = EMA(candles, slow);
  const fastMap = new Map(emaFast.map(d => [d.time, d.value]));
  const macdRaw = [];
  for (const s of emaSlow) {
    const f = fastMap.get(s.time);
    if (f != null) macdRaw.push({ time: s.time, value: r(f - s.value) });
  }
  // signal = EMA of macdRaw
  const k = 2 / (signal + 1);
  if (macdRaw.length < signal) return { macd: macdRaw, signal: [], histogram: [] };
  let sigVal = 0;
  for (let i = 0; i < signal; i++) sigVal += macdRaw[i].value;
  sigVal /= signal;
  for (let i = signal - 1; i < macdRaw.length; i++) {
    if (i === signal - 1) {
      // already initial
    } else {
      sigVal = macdRaw[i].value * k + sigVal * (1 - k);
    }
    const t = macdRaw[i].time;
    macd.push({ time: t, value: macdRaw[i].value });
    signalLine.push({ time: t, value: r(sigVal) });
    hist.push({
      time: t,
      value: r(macdRaw[i].value - sigVal),
      color: (macdRaw[i].value - sigVal) >= 0 ? '#089981aa' : '#f23645aa',
    });
  }
  return { macd, signal: signalLine, histogram: hist };
}

export function BB(candles, period = 20, mult = 2) {
  const upper = [], basis = [], lower = [];
  if (!candles || candles.length < period) return { upper, basis, lower };
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const m = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (candles[j].close - m) ** 2;
    const sd = Math.sqrt(sq / period);
    const t = candles[i].time;
    basis.push({ time: t, value: r(m) });
    upper.push({ time: t, value: r(m + mult * sd) });
    lower.push({ time: t, value: r(m - mult * sd) });
  }
  return { upper, basis, lower };
}

export function Stochastic(candles, k = 14, d = 3, smooth = 3) {
  const kRaw = [];
  if (!candles || candles.length < k) return { k: [], d: [] };
  for (let i = k - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - k + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    const range = hi - lo || 1e-9;
    kRaw.push({ time: candles[i].time, value: r(((candles[i].close - lo) / range) * 100, 2) });
  }
  // smooth %K
  const kSmoothed = smoothSeries(kRaw, smooth);
  const dLine = smoothSeries(kSmoothed, d);
  return { k: kSmoothed, d: dLine };
}

function smoothSeries(series, period) {
  if (period <= 1) return series.slice();
  const out = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i].value;
    if (i >= period) sum -= series[i - period].value;
    if (i >= period - 1) out.push({ time: series[i].time, value: r(sum / period, 2) });
  }
  return out;
}

export function ATR(candles, period = 14) {
  const out = [];
  if (!candles || candles.length < period + 1) return out;
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = 0;
  for (let i = 0; i < period; i++) atr += tr[i];
  atr /= period;
  out.push({ time: candles[period].time, value: r(atr) });
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out.push({ time: candles[i + 1].time, value: r(atr) });
  }
  return out;
}

export function ADX(candles, period = 14) {
  const adx = [], plusDi = [], minusDi = [];
  if (!candles || candles.length < period * 2) return { adx, plusDi, minusDi };
  const tr = [], plusDM = [], minusDM = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    const ph = candles[i - 1].high, pl = candles[i - 1].low;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const upMove = h - ph;
    const dnMove = pl - l;
    plusDM.push(upMove > dnMove && upMove > 0 ? upMove : 0);
    minusDM.push(dnMove > upMove && dnMove > 0 ? dnMove : 0);
  }
  // Wilder smoothing
  let trS = 0, pS = 0, mS = 0;
  for (let i = 0; i < period; i++) { trS += tr[i]; pS += plusDM[i]; mS += minusDM[i]; }
  const dxs = [];
  let pdi = (pS / trS) * 100;
  let mdi = (mS / trS) * 100;
  let dx = (Math.abs(pdi - mdi) / (pdi + mdi || 1e-9)) * 100;
  dxs.push(dx);
  plusDi.push({ time: candles[period].time, value: r(pdi, 2) });
  minusDi.push({ time: candles[period].time, value: r(mdi, 2) });
  for (let i = period; i < tr.length; i++) {
    trS = trS - trS / period + tr[i];
    pS  = pS  - pS  / period + plusDM[i];
    mS  = mS  - mS  / period + minusDM[i];
    pdi = (pS / trS) * 100;
    mdi = (mS / trS) * 100;
    dx = (Math.abs(pdi - mdi) / (pdi + mdi || 1e-9)) * 100;
    dxs.push(dx);
    plusDi.push({ time: candles[i + 1].time, value: r(pdi, 2) });
    minusDi.push({ time: candles[i + 1].time, value: r(mdi, 2) });
  }
  // ADX = Wilder smoothing of DX
  let adxV = 0;
  for (let i = 0; i < period; i++) adxV += dxs[i];
  adxV /= period;
  adx.push({ time: candles[period * 2 - 1]?.time || candles[candles.length - 1].time, value: r(adxV, 2) });
  for (let i = period; i < dxs.length; i++) {
    adxV = (adxV * (period - 1) + dxs[i]) / period;
    const t = candles[i + period]?.time;
    if (t != null) adx.push({ time: t, value: r(adxV, 2) });
  }
  return { adx, plusDi, minusDi };
}

export function VWAP(candles) {
  const out = [];
  if (!candles || !candles.length) return out;
  let cumPV = 0, cumV = 0;
  let lastDay = -1;
  for (const c of candles) {
    const day = Math.floor(c.time / 86400);
    if (day !== lastDay) { cumPV = 0; cumV = 0; lastDay = day; }
    const tp = (c.high + c.low + c.close) / 3;
    const v = c.volume || 1;
    cumPV += tp * v;
    cumV += v;
    out.push({ time: c.time, value: r(cumPV / cumV) });
  }
  return out;
}

export function Momentum(candles, period = 10) {
  const out = [];
  for (let i = period; i < candles.length; i++) {
    out.push({ time: candles[i].time, value: r(candles[i].close - candles[i - period].close) });
  }
  return out;
}

export function OBV(candles) {
  const out = [];
  if (!candles || !candles.length) return out;
  let obv = 0;
  out.push({ time: candles[0].time, value: 0 });
  for (let i = 1; i < candles.length; i++) {
    const v = candles[i].volume || 0;
    if (candles[i].close > candles[i - 1].close) obv += v;
    else if (candles[i].close < candles[i - 1].close) obv -= v;
    out.push({ time: candles[i].time, value: obv });
  }
  return out;
}

export function CCI(candles, period = 20) {
  const out = [];
  if (!candles || candles.length < period) return out;
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tp[j];
    const sma = sum / period;
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) md += Math.abs(tp[j] - sma);
    md /= period;
    const cci = md === 0 ? 0 : (tp[i] - sma) / (0.015 * md);
    out.push({ time: candles[i].time, value: r(cci, 2) });
  }
  return out;
}

export function WilliamsR(candles, period = 14) {
  const out = [];
  if (!candles || candles.length < period) return out;
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    const range = hi - lo || 1e-9;
    out.push({ time: candles[i].time, value: r(((hi - candles[i].close) / range) * -100, 2) });
  }
  return out;
}

export function Ichimoku(candles, tenkanP = 9, kijunP = 26, senkouBP = 52) {
  const tenkan = [], kijun = [], senkouA = [], senkouB = [], chikou = [];
  if (!candles || candles.length < senkouBP) return { tenkan, kijun, senkouA, senkouB, chikou };
  const hhll = (p, i) => {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - p + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    return (hi + lo) / 2;
  };
  // Estimate next bar interval from last gap
  const interval = candles.length > 1 ? candles[candles.length - 1].time - candles[candles.length - 2].time : 86400;
  for (let i = 0; i < candles.length; i++) {
    const t = candles[i].time;
    let tk = null, kj = null;
    if (i >= tenkanP - 1) { tk = hhll(tenkanP, i); tenkan.push({ time: t, value: r(tk) }); }
    if (i >= kijunP - 1)  { kj = hhll(kijunP, i);  kijun.push({ time: t, value: r(kj) }); }
    if (i >= kijunP - 1 && tk != null && kj != null) {
      senkouA.push({ time: t + interval * kijunP, value: r((tk + kj) / 2) });
    }
    if (i >= senkouBP - 1) {
      senkouB.push({ time: t + interval * kijunP, value: r(hhll(senkouBP, i)) });
    }
    if (i + kijunP < candles.length) {
      chikou.push({ time: candles[i].time, value: candles[i + kijunP] ? r(candles[i + kijunP].close) : null });
    } else {
      // chikou shifted back; emit at past time
      chikou.push({ time: candles[Math.max(0, i - kijunP)].time, value: r(candles[i].close) });
    }
  }
  // Deduplicate chikou by time (keep latest)
  const seen = new Map();
  for (const p of chikou) if (p.value != null) seen.set(p.time, p);
  const chikouOut = [...seen.values()].sort((a, b) => a.time - b.time);
  return { tenkan, kijun, senkouA, senkouB, chikou: chikouOut };
}

/* =========================================================================
   Helpers (internal)
   ========================================================================= */

function trueRangeArray(candles) {
  const tr = [];
  if (!candles || candles.length < 2) return tr;
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return tr;
}

// Wilder/RMA smoothed ATR aligned to candles[period..] (length candles.length - period)
function atrSeries(candles, period = 14) {
  const tr = trueRangeArray(candles);
  const out = [];
  if (tr.length < period) return out;
  let atr = 0;
  for (let i = 0; i < period; i++) atr += tr[i];
  atr /= period;
  out.push(atr);
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out.push(atr);
  }
  return out; // out[k] corresponds to candles[period + k]
}

// EMA of plain number series — returns aligned numbers with leading nulls
function emaNumbers(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  out[period - 1] = ema;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

function smaNumbers(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function wmaNumbers(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let num = 0;
    for (let j = 0; j < period; j++) num += values[i - period + 1 + j] * (j + 1);
    out[i] = num / denom;
  }
  return out;
}

/* =========================================================================
   Additional Moving Averages
   ========================================================================= */

export function DEMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period * 2 - 1) return out;
  const values = candles.map(c => c[field]);
  const ema1 = emaNumbers(values, period);
  // ema2 must operate on ema1 (drop nulls)
  const ema1Vals = ema1.filter(v => v != null);
  const ema2 = emaNumbers(ema1Vals, period);
  // align: first valid ema2 is at ema1Vals index period-1 => corresponds to candle index (period-1)+(period-1)=2*period-2
  const offset = (period - 1) + (period - 1);
  for (let i = 0; i < ema2.length; i++) {
    if (ema2[i] == null) continue;
    const idx = offset + (i - (period - 1));
    if (idx >= candles.length) break;
    out.push({ time: candles[idx].time, value: r(2 * ema1Vals[i] - ema2[i]) });
  }
  return out;
}

export function TEMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period * 3 - 2) return out;
  const values = candles.map(c => c[field]);
  const ema1 = emaNumbers(values, period);
  const ema1Vals = ema1.filter(v => v != null);
  const ema2 = emaNumbers(ema1Vals, period);
  const ema2Vals = ema2.filter(v => v != null);
  const ema3 = emaNumbers(ema2Vals, period);
  // offset relative to candle index: ema3 starts at candle index 3*(period-1)
  const baseOffset = 3 * (period - 1);
  for (let i = 0; i < ema3.length; i++) {
    if (ema3[i] == null) continue;
    const candleIdx = baseOffset + (i - (period - 1));
    if (candleIdx >= candles.length) break;
    // align ema1Vals and ema2Vals to same point
    const ema1Idx = candleIdx - 0; // ema1Vals[k] => candle (period-1)+k
    const k1 = candleIdx - (period - 1);
    const k2 = candleIdx - 2 * (period - 1);
    const v1 = ema1Vals[k1];
    const v2 = ema2Vals[k2];
    const v3 = ema3[i];
    out.push({ time: candles[candleIdx].time, value: r(3 * v1 - 3 * v2 + v3) });
  }
  return out;
}

export function HMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period) return out;
  const values = candles.map(c => c[field]);
  const half = Math.floor(period / 2);
  const sqrtP = Math.max(1, Math.floor(Math.sqrt(period)));
  const wmaHalf = wmaNumbers(values, half);
  const wmaFull = wmaNumbers(values, period);
  const raw = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (wmaHalf[i] != null && wmaFull[i] != null) raw[i] = 2 * wmaHalf[i] - wmaFull[i];
  }
  const rawVals = raw.filter(v => v != null);
  const hma = wmaNumbers(rawVals, sqrtP);
  // first raw value at candle index period-1
  const startCandle = period - 1;
  for (let i = 0; i < hma.length; i++) {
    if (hma[i] == null) continue;
    const candleIdx = startCandle + i;
    if (candleIdx >= candles.length) break;
    out.push({ time: candles[candleIdx].time, value: r(hma[i]) });
  }
  return out;
}

export function KAMA(candles, period = 10, fast = 2, slow = 30, field = 'close') {
  const out = [];
  if (!candles || candles.length < period + 1) return out;
  const values = candles.map(c => c[field]);
  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);
  let kama = values[period - 1];
  out.push({ time: candles[period - 1].time, value: r(kama) });
  for (let i = period; i < values.length; i++) {
    const change = Math.abs(values[i] - values[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) volatility += Math.abs(values[j] - values[j - 1]);
    const er = volatility === 0 ? 0 : change / volatility;
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    kama = kama + sc * (values[i] - kama);
    out.push({ time: candles[i].time, value: r(kama) });
  }
  return out;
}

export function VWMA(candles, period = 20) {
  const out = [];
  if (!candles || candles.length < period) return out;
  let pvSum = 0, vSum = 0;
  for (let i = 0; i < candles.length; i++) {
    const v = candles[i].volume || 0;
    pvSum += candles[i].close * v;
    vSum += v;
    if (i >= period) {
      const v0 = candles[i - period].volume || 0;
      pvSum -= candles[i - period].close * v0;
      vSum -= v0;
    }
    if (i >= period - 1) {
      const val = vSum === 0 ? candles[i].close : pvSum / vSum;
      out.push({ time: candles[i].time, value: r(val) });
    }
  }
  return out;
}

export function ZLEMA(candles, period = 20, field = 'close') {
  const out = [];
  if (!candles || candles.length < period) return out;
  const lag = Math.floor((period - 1) / 2);
  const adjusted = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < lag) adjusted.push(candles[i][field]);
    else adjusted.push(2 * candles[i][field] - candles[i - lag][field]);
  }
  const ema = emaNumbers(adjusted, period);
  for (let i = 0; i < ema.length; i++) {
    if (ema[i] == null) continue;
    out.push({ time: candles[i].time, value: r(ema[i]) });
  }
  return out;
}

/* =========================================================================
   Channels / Bands
   ========================================================================= */

export function DonchianChannel(candles, period = 20) {
  const upper = [], middle = [], lower = [];
  if (!candles || candles.length < period) return { upper, middle, lower };
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    const t = candles[i].time;
    upper.push({ time: t, value: r(hi) });
    lower.push({ time: t, value: r(lo) });
    middle.push({ time: t, value: r((hi + lo) / 2) });
  }
  return { upper, middle, lower };
}

export function KeltnerChannels(candles, emaPeriod = 20, atrMult = 2, atrPeriod = 10) {
  const upper = [], middle = [], lower = [];
  if (!candles || candles.length < Math.max(emaPeriod, atrPeriod + 1)) return { upper, middle, lower };
  const values = candles.map(c => c.close);
  const emaArr = emaNumbers(values, emaPeriod);
  const atrArr = atrSeries(candles, atrPeriod); // aligned to candles[atrPeriod + k]
  for (let i = 0; i < candles.length; i++) {
    const e = emaArr[i];
    const k = i - atrPeriod;
    if (e == null || k < 0 || k >= atrArr.length) continue;
    const a = atrArr[k];
    const t = candles[i].time;
    middle.push({ time: t, value: r(e) });
    upper.push({ time: t, value: r(e + atrMult * a) });
    lower.push({ time: t, value: r(e - atrMult * a) });
  }
  return { upper, middle, lower };
}

export function BollingerBandWidth(candles, period = 20, mult = 2) {
  const out = [];
  const bb = BB(candles, period, mult);
  for (let i = 0; i < bb.basis.length; i++) {
    const basis = bb.basis[i].value;
    const width = bb.upper[i].value - bb.lower[i].value;
    out.push({ time: bb.basis[i].time, value: r(basis === 0 ? 0 : width / basis, 4) });
  }
  return out;
}

/* =========================================================================
   Trend / Direction
   ========================================================================= */

export function ParabolicSAR(candles, start = 0.02, increment = 0.02, max = 0.2) {
  const out = [];
  if (!candles || candles.length < 2) return out;
  let isUp = candles[1].close >= candles[0].close;
  let af = start;
  let ep = isUp ? candles[0].high : candles[0].low;
  let sar = isUp ? candles[0].low : candles[0].high;
  out.push({ time: candles[0].time, value: r(sar) });
  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar);
    const c = candles[i];
    if (isUp) {
      // SAR can't be above prior two lows
      const minLow = Math.min(candles[i - 1].low, candles[Math.max(0, i - 2)].low);
      if (sar > minLow) sar = minLow;
      if (c.low < sar) {
        // reverse
        isUp = false;
        sar = ep;
        ep = c.low;
        af = start;
      } else {
        if (c.high > ep) { ep = c.high; af = Math.min(af + increment, max); }
      }
    } else {
      const maxHigh = Math.max(candles[i - 1].high, candles[Math.max(0, i - 2)].high);
      if (sar < maxHigh) sar = maxHigh;
      if (c.high > sar) {
        isUp = true;
        sar = ep;
        ep = c.high;
        af = start;
      } else {
        if (c.low < ep) { ep = c.low; af = Math.min(af + increment, max); }
      }
    }
    out.push({ time: c.time, value: r(sar) });
  }
  return out;
}

export function SuperTrend(candles, period = 10, multiplier = 3) {
  const upper = [], lower = [], trendArr = [];
  if (!candles || candles.length < period + 1) return { upper, lower, trend: trendArr };
  const atrArr = atrSeries(candles, period);
  let prevUpper = null, prevLower = null;
  let trend = 1;
  let prevClose = null;
  for (let k = 0; k < atrArr.length; k++) {
    const i = period + k;
    const c = candles[i];
    const hl2 = (c.high + c.low) / 2;
    const a = atrArr[k];
    let upperBand = hl2 + multiplier * a;
    let lowerBand = hl2 - multiplier * a;
    if (prevUpper != null) {
      if (upperBand < prevUpper || prevClose > prevUpper) {
        // keep
      } else {
        upperBand = prevUpper;
      }
      if (lowerBand > prevLower || prevClose < prevLower) {
        // keep
      } else {
        lowerBand = prevLower;
      }
    }
    if (prevUpper != null) {
      if (trend === 1 && c.close < lowerBand) trend = -1;
      else if (trend === -1 && c.close > upperBand) trend = 1;
    } else {
      trend = c.close >= hl2 ? 1 : -1;
    }
    const t = c.time;
    upper.push({ time: t, value: r(upperBand) });
    lower.push({ time: t, value: r(lowerBand) });
    trendArr.push({ time: t, value: trend });
    prevUpper = upperBand;
    prevLower = lowerBand;
    prevClose = c.close;
  }
  return { upper, lower, trend: trendArr };
}

export function AroonIndicator(candles, period = 14) {
  const up = [], down = [], oscillator = [];
  if (!candles || candles.length < period + 1) return { up, down, oscillator };
  for (let i = period; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity, hiIdx = i, loIdx = i;
    for (let j = i - period; j <= i; j++) {
      if (candles[j].high >= hi) { hi = candles[j].high; hiIdx = j; }
      if (candles[j].low <= lo) { lo = candles[j].low; loIdx = j; }
    }
    const aUp = ((period - (i - hiIdx)) / period) * 100;
    const aDn = ((period - (i - loIdx)) / period) * 100;
    const t = candles[i].time;
    up.push({ time: t, value: r(aUp, 2) });
    down.push({ time: t, value: r(aDn, 2) });
    oscillator.push({ time: t, value: r(aUp - aDn, 2) });
  }
  return { up, down, oscillator };
}

/* =========================================================================
   Volume-based
   ========================================================================= */

export function ChaikinMoneyFlow(candles, period = 20) {
  const out = [];
  if (!candles || candles.length < period) return out;
  const mfv = candles.map(c => {
    const range = (c.high - c.low) || 1e-9;
    const mfm = ((c.close - c.low) - (c.high - c.close)) / range;
    return mfm * (c.volume || 0);
  });
  let mfvSum = 0, volSum = 0;
  for (let i = 0; i < candles.length; i++) {
    mfvSum += mfv[i];
    volSum += (candles[i].volume || 0);
    if (i >= period) {
      mfvSum -= mfv[i - period];
      volSum -= (candles[i - period].volume || 0);
    }
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: r(volSum === 0 ? 0 : mfvSum / volSum, 4) });
    }
  }
  return out;
}

export function MFI(candles, period = 14) {
  const out = [];
  if (!candles || candles.length < period + 1) return out;
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const rawMF = candles.map((c, i) => tp[i] * (c.volume || 0));
  for (let i = period; i < candles.length; i++) {
    let pos = 0, neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += rawMF[j];
      else if (tp[j] < tp[j - 1]) neg += rawMF[j];
    }
    const mr = neg === 0 ? 100 : pos / neg;
    out.push({ time: candles[i].time, value: r(100 - 100 / (1 + mr), 2) });
  }
  return out;
}

export function VolumeOscillator(candles, fast = 5, slow = 10) {
  const out = [];
  if (!candles || candles.length < slow) return out;
  const vols = candles.map(c => c.volume || 0);
  const f = smaNumbers(vols, fast);
  const s = smaNumbers(vols, slow);
  for (let i = 0; i < candles.length; i++) {
    if (f[i] == null || s[i] == null || s[i] === 0) continue;
    out.push({ time: candles[i].time, value: r(((f[i] - s[i]) / s[i]) * 100, 2) });
  }
  return out;
}

/* =========================================================================
   Momentum / Oscillators
   ========================================================================= */

export function TRIX(candles, period = 14, field = 'close') {
  const out = [];
  if (!candles || candles.length < period * 3) return out;
  const values = candles.map(c => c[field]);
  const e1 = emaNumbers(values, period);
  const e1v = e1.filter(v => v != null);
  const e2 = emaNumbers(e1v, period);
  const e2v = e2.filter(v => v != null);
  const e3 = emaNumbers(e2v, period);
  // candle index for e3[i] (i >= period-1) is: (period-1)*3 + (i - (period-1)) = 3*period - 3 + i - period + 1 = 2*period - 2 + i
  let prev = null;
  for (let i = 0; i < e3.length; i++) {
    if (e3[i] == null) continue;
    const candleIdx = 2 * (period - 1) + i;
    if (candleIdx >= candles.length) break;
    if (prev != null && prev !== 0) {
      const trix = ((e3[i] - prev) / prev) * 10000;
      out.push({ time: candles[candleIdx].time, value: r(trix, 4) });
    }
    prev = e3[i];
  }
  return out;
}

export function ChandeMomentumOscillator(candles, period = 14) {
  const out = [];
  if (!candles || candles.length < period + 1) return out;
  for (let i = period; i < candles.length; i++) {
    let up = 0, dn = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const ch = candles[j].close - candles[j - 1].close;
      if (ch > 0) up += ch; else dn -= ch;
    }
    const denom = up + dn;
    const v = denom === 0 ? 0 : ((up - dn) / denom) * 100;
    out.push({ time: candles[i].time, value: r(v, 2) });
  }
  return out;
}

export function PriceROC(candles, period = 12, field = 'close') {
  const out = [];
  if (!candles || candles.length <= period) return out;
  for (let i = period; i < candles.length; i++) {
    const prev = candles[i - period][field];
    const v = prev === 0 ? 0 : ((candles[i][field] - prev) / prev) * 100;
    out.push({ time: candles[i].time, value: r(v, 2) });
  }
  return out;
}

/* =========================================================================
   Support / Resistance
   ========================================================================= */

export function PivotsHL(candles, leftBars = 10, rightBars = 10) {
  const pivotHighs = [], pivotLows = [];
  if (!candles || candles.length < leftBars + rightBars + 1) return { pivotHighs, pivotLows };
  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const h = candles[i].high, l = candles[i].low;
    let isHigh = true, isLow = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high >= h) isHigh = false;
      if (candles[j].low <= l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) pivotHighs.push({ time: candles[i].time, value: r(h) });
    if (isLow) pivotLows.push({ time: candles[i].time, value: r(l) });
  }
  return { pivotHighs, pivotLows };
}

export function PivotPoints(candles) {
  const pivot = [], r1 = [], r2 = [], r3 = [], s1 = [], s2 = [], s3 = [];
  if (!candles || candles.length < 2) return { pivot, r1, r2, r3, s1, s2, s3 };
  // group candles by day; previous day's HLC drives current day's pivots
  const byDay = new Map();
  const dayOrder = [];
  for (const c of candles) {
    const d = Math.floor(c.time / 86400);
    if (!byDay.has(d)) { byDay.set(d, []); dayOrder.push(d); }
    byDay.get(d).push(c);
  }
  for (let di = 1; di < dayOrder.length; di++) {
    const prev = byDay.get(dayOrder[di - 1]);
    let h = -Infinity, l = Infinity;
    const close = prev[prev.length - 1].close;
    for (const c of prev) { if (c.high > h) h = c.high; if (c.low < l) l = c.low; }
    const p = (h + l + close) / 3;
    const R1 = 2 * p - l;
    const S1 = 2 * p - h;
    const R2 = p + (h - l);
    const S2 = p - (h - l);
    const R3 = h + 2 * (p - l);
    const S3 = l - 2 * (h - p);
    for (const c of byDay.get(dayOrder[di])) {
      const t = c.time;
      pivot.push({ time: t, value: r(p) });
      r1.push({ time: t, value: r(R1) });
      r2.push({ time: t, value: r(R2) });
      r3.push({ time: t, value: r(R3) });
      s1.push({ time: t, value: r(S1) });
      s2.push({ time: t, value: r(S2) });
      s3.push({ time: t, value: r(S3) });
    }
  }
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

/* =========================================================================
   Indicator catalog (used by indicators modal + state)
   ========================================================================= */

export const INDICATOR_CATALOG = [
  // Overlays (main pane)
  { id: 'sma',     name: 'Media móvil simple (SMA)',       category: 'Trend',     pane: 'main', defaults: { period: 20 } },
  { id: 'ema',     name: 'Media móvil exponencial (EMA)',  category: 'Trend',     pane: 'main', defaults: { period: 22 } },
  { id: 'wma',     name: 'Media móvil ponderada (WMA)',    category: 'Trend',     pane: 'main', defaults: { period: 20 } },
  { id: 'bb',      name: 'Bandas de Bollinger',            category: 'Volatility',pane: 'main', defaults: { period: 20, mult: 2 } },
  { id: 'vwap',    name: 'VWAP',                           category: 'Volume',    pane: 'main', defaults: {} },
  { id: 'ichimoku',name: 'Nube de Ichimoku',               category: 'Trend',     pane: 'main', defaults: { tenkan: 9, kijun: 26, senkouB: 52 } },
  // Oscillators (new pane)
  { id: 'rsi',     name: 'RSI',                            category: 'Momentum',  pane: 'new',  defaults: { period: 14 } },
  { id: 'macd',    name: 'MACD',                           category: 'Momentum',  pane: 'new',  defaults: { fast: 12, slow: 26, signal: 9 } },
  { id: 'stoch',   name: 'Estocástico',                    category: 'Momentum',  pane: 'new',  defaults: { k: 14, d: 3, smooth: 3 } },
  { id: 'cci',     name: 'CCI',                            category: 'Momentum',  pane: 'new',  defaults: { period: 20 } },
  { id: 'willr',   name: 'Williams %R',                    category: 'Momentum',  pane: 'new',  defaults: { period: 14 } },
  { id: 'adx',     name: 'ADX',                            category: 'Trend',     pane: 'new',  defaults: { period: 14 } },
  { id: 'mom',     name: 'Momentum',                       category: 'Momentum',  pane: 'new',  defaults: { period: 10 } },
  { id: 'obv',     name: 'On-Balance Volume (OBV)',        category: 'Volume',    pane: 'new',  defaults: {} },
  { id: 'atr',     name: 'ATR',                            category: 'Volatility',pane: 'new',  defaults: { period: 14 } },
  // ---- Extended library ----
  // Overlays
  { id: 'dema',    name: 'DEMA (Doble EMA)',               category: 'Tendencia',         pane: 'main', defaults: { period: 20 } },
  { id: 'tema',    name: 'TEMA (Triple EMA)',              category: 'Tendencia',         pane: 'main', defaults: { period: 20 } },
  { id: 'hma',     name: 'Media móvil de Hull (HMA)',      category: 'Tendencia',         pane: 'main', defaults: { period: 20 } },
  { id: 'kama',    name: 'KAMA (MA Adaptativa de Kaufman)',category: 'Tendencia',         pane: 'main', defaults: { period: 10, fast: 2, slow: 30 } },
  { id: 'vwma',    name: 'Media móvil ponderada por volumen (VWMA)', category: 'Volumen',  pane: 'main', defaults: { period: 20 } },
  { id: 'zlema',   name: 'EMA de retardo cero (ZLEMA)',    category: 'Tendencia',         pane: 'main', defaults: { period: 20 } },
  { id: 'donchian',name: 'Canal Donchian',                 category: 'Volatilidad',       pane: 'main', defaults: { period: 20 } },
  { id: 'kc',      name: 'Canales Keltner',                category: 'Volatilidad',       pane: 'main', defaults: { emaPeriod: 20, atrMult: 2, atrPeriod: 10 } },
  { id: 'psar',    name: 'SAR Parabólico',                 category: 'Tendencia',         pane: 'main', defaults: { start: 0.02, increment: 0.02, max: 0.2 } },
  { id: 'supertrend', name: 'SuperTrend',                  category: 'Tendencia',         pane: 'main', defaults: { period: 10, multiplier: 3 } },
  { id: 'pivotshl',name: 'Puntos pivote (HL)',             category: 'Soporte/Resistencia', pane: 'main', defaults: { leftBars: 10, rightBars: 10 } },
  { id: 'pivots',  name: 'Puntos pivote clásicos',         category: 'Soporte/Resistencia', pane: 'main', defaults: {} },
  // Oscillators / new pane
  { id: 'aroon',   name: 'Indicador Aroon',                category: 'Momentum',          pane: 'new',  defaults: { period: 14 } },
  { id: 'cmf',     name: 'Flujo de Dinero de Chaikin (CMF)', category: 'Volumen',         pane: 'new',  defaults: { period: 20 } },
  { id: 'mfi',     name: 'Índice de Flujo de Dinero (MFI)',category: 'Volumen',           pane: 'new',  defaults: { period: 14 } },
  { id: 'trix',    name: 'TRIX',                           category: 'Momentum',          pane: 'new',  defaults: { period: 14 } },
  { id: 'bbw',     name: 'Anchura de Bandas de Bollinger', category: 'Volatilidad',       pane: 'new',  defaults: { period: 20, mult: 2 } },
  { id: 'cmo',     name: 'Oscilador de Momento de Chande', category: 'Oscilador',         pane: 'new',  defaults: { period: 14 } },
  { id: 'roc',     name: 'Tasa de Cambio (ROC)',           category: 'Momentum',          pane: 'new',  defaults: { period: 12 } },
  { id: 'volosc',  name: 'Oscilador de Volumen',           category: 'Volumen',           pane: 'new',  defaults: { fast: 5, slow: 10 } },
];

export const INDICATOR_PALETTE = [
  '#f7a600', '#9c27b0', '#26c6da', '#ec407a',
  '#66bb6a', '#ff7043', '#5c6bc0', '#ab47bc',
];
