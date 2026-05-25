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
];

export const INDICATOR_PALETTE = [
  '#f7a600', '#9c27b0', '#26c6da', '#ec407a',
  '#66bb6a', '#ff7043', '#5c6bc0', '#ab47bc',
];
