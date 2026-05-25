/* =========================================================================
   Event-driven strategy backtester.

   Public API:
     backtest(candles, strategy, options) -> BacktestResult
     PRESET_STRATEGIES: Array<{ id, name, description, fn }>

   The engine walks candles sequentially. At each bar (after warmup) the
   strategy function is asked for an action ('buy' | 'sell' | 'hold').
   Fills happen at the NEXT bar's open with slippage + commission applied.
   Stops / targets / trailing stops are evaluated intrabar using high/low.
   ========================================================================= */

import * as Ind from './indicators.js';
const { SMA, EMA, RSI, MACD, BB, ATR } = Ind;
// DonchianChannel may be added later by another agent; fall back if absent.
const DonchianChannel = Ind.DonchianChannel || null;

/* ------------------------------ helpers --------------------------------- */

function alignByTime(series) {
  // returns Map<time, value-or-row>
  const m = new Map();
  for (const p of series) m.set(p.time, p);
  return m;
}

function lastAtOrBefore(map, time, timesArr) {
  // not used by default; we look up by exact time since indicators are bar-aligned
  return map.get(time);
}

function normCdf(x) {
  // Abramowitz & Stegun 7.1.26 approximation
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 0.5 * (1 + sign * y);
}

function mean(xs) {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stddev(xs, mu) {
  if (xs.length < 2) return 0;
  if (mu == null) mu = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - mu) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

function skewness(xs) {
  const n = xs.length;
  if (n < 3) return 0;
  const mu = mean(xs);
  const sd = stddev(xs, mu);
  if (sd === 0) return 0;
  let s = 0;
  for (const x of xs) s += ((x - mu) / sd) ** 3;
  return (n / ((n - 1) * (n - 2))) * s;
}

function kurtosis(xs) {
  // Excess kurtosis; we return raw kurtosis (excess + 3) since the DSR formula
  // below uses (kurt - 1)/4 which is the standard form for *raw* kurtosis.
  const n = xs.length;
  if (n < 4) return 3;
  const mu = mean(xs);
  const sd = stddev(xs, mu);
  if (sd === 0) return 3;
  let s = 0;
  for (const x of xs) s += ((x - mu) / sd) ** 4;
  const g2 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * s
           - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  return g2 + 3;
}

/* -------------------------- slippage models ----------------------------- */

function applySlippage(price, side, action, opts, ctx) {
  // side: 'long' | 'short'; action: 'enter' | 'exit'
  // For a long entry / short exit the trader is buying -> price up.
  // For a long exit / short entry the trader is selling -> price down.
  const buying = (side === 'long' && action === 'enter') || (side === 'short' && action === 'exit');
  const sign = buying ? +1 : -1;
  const model = opts.slippage || 'none';
  if (model === 'none') return price;
  if (model === 'fixed_pct') {
    return price * (1 + sign * (opts.slippageValue || 0));
  }
  if (model === 'almgren') {
    // Simplified Almgren-Chriss temporary impact:
    //   slip = coef * sigma * sqrt(qty / avgVolume)
    // Without true ADV we use ATR-as-volatility and qty/avgVolume ratio
    // proxied by (notional / (price * avgVolume)). When volume is missing
    // we degrade to: slip = coef * (ATR/price).
    const coef = opts.slippageValue || 0.1;
    const atr = ctx.atrAt || 0;
    const sigma = atr > 0 ? atr / price : 0.01;
    let participation = 0.01;
    if (ctx.qty && ctx.avgVolume && ctx.avgVolume > 0) {
      participation = Math.min(1, ctx.qty / ctx.avgVolume);
    }
    const slip = coef * sigma * Math.sqrt(participation);
    return price * (1 + sign * slip);
  }
  return price;
}

/* -------------------------- position sizing ----------------------------- */

function sizePosition(equity, price, opts, ctx) {
  const mode = opts.positionSize || 'fixed_dollar';
  const v = opts.positionSizeValue;
  if (mode === 'fixed_dollar') {
    return Math.max(0, v / price);
  }
  if (mode === 'fixed_pct') {
    return Math.max(0, (equity * (v / 100)) / price);
  }
  if (mode === 'atr') {
    // Risk `v` percent of equity per trade, sized so 1 ATR move = that risk.
    const atr = ctx.atrAt || 0;
    if (atr <= 0) return Math.max(0, (equity * 0.01) / price);
    const riskDollars = equity * (v / 100);
    return Math.max(0, riskDollars / atr);
  }
  if (mode === 'kelly') {
    // Use rolling win-rate and avg win/loss tracked in ctx.
    const f = Math.max(0, Math.min(1, ctx.kellyFraction || 0));
    return Math.max(0, (equity * f) / price);
  }
  return Math.max(0, v / price);
}

/* ----------------------- stop / target evaluation ----------------------- */

function computeStopLevels(entry, side, atrAtEntry, opts) {
  const out = { sl: null, tp: null, trail: null, trailDist: null };
  if (opts.stopLoss) {
    const v = opts.stopLoss.value;
    const dist = opts.stopLoss.type === 'atr' ? v * atrAtEntry : entry * v;
    out.sl = side === 'long' ? entry - dist : entry + dist;
  }
  if (opts.takeProfit) {
    const v = opts.takeProfit.value;
    const dist = opts.takeProfit.type === 'atr' ? v * atrAtEntry : entry * v;
    out.tp = side === 'long' ? entry + dist : entry - dist;
  }
  if (opts.trailingStop) {
    const v = opts.trailingStop.value;
    out.trailDist = opts.trailingStop.type === 'atr' ? v * atrAtEntry : null; // pct handled live
    out.trail = side === 'long' ? entry - (out.trailDist || entry * v)
                                : entry + (out.trailDist || entry * v);
    out._trailPct = opts.trailingStop.type === 'pct' ? v : null;
  }
  return out;
}

function updateTrailing(stops, side, bar) {
  if (stops.trail == null) return;
  if (side === 'long') {
    const dist = stops.trailDist != null ? stops.trailDist : bar.close * stops._trailPct;
    const candidate = bar.high - dist;
    if (candidate > stops.trail) stops.trail = candidate;
  } else {
    const dist = stops.trailDist != null ? stops.trailDist : bar.close * stops._trailPct;
    const candidate = bar.low + dist;
    if (candidate < stops.trail) stops.trail = candidate;
  }
}

function checkExits(stops, side, bar) {
  // Returns { hit: true, price, reason } or null. TradingView convention: if
  // both SL and TP are inside the bar we conservatively assume SL first.
  if (side === 'long') {
    if (stops.sl != null && bar.low <= stops.sl)      return { hit: true, price: stops.sl,    reason: 'sl' };
    if (stops.trail != null && bar.low <= stops.trail) return { hit: true, price: stops.trail, reason: 'trailing' };
    if (stops.tp != null && bar.high >= stops.tp)    return { hit: true, price: stops.tp,    reason: 'tp' };
  } else {
    if (stops.sl != null && bar.high >= stops.sl)    return { hit: true, price: stops.sl,    reason: 'sl' };
    if (stops.trail != null && bar.high >= stops.trail) return { hit: true, price: stops.trail, reason: 'trailing' };
    if (stops.tp != null && bar.low <= stops.tp)     return { hit: true, price: stops.tp,    reason: 'tp' };
  }
  return null;
}

/* ----------------------- indicator pre-computation ---------------------- */

function precomputeIndicators(candles) {
  const sma = (p) => alignByTime(SMA(candles, p));
  const ema = (p) => alignByTime(EMA(candles, p));
  const rsi = (p) => alignByTime(RSI(candles, p));
  const atr = alignByTime(ATR(candles, 14));
  const bb20 = BB(candles, 20, 2);
  const bb = {
    upper: alignByTime(bb20.upper),
    basis: alignByTime(bb20.basis),
    lower: alignByTime(bb20.lower),
  };
  const macd = MACD(candles, 12, 26, 9);
  const macdMap = {
    macd: alignByTime(macd.macd),
    signal: alignByTime(macd.signal),
    histogram: alignByTime(macd.histogram),
  };
  // Rolling Donchian (manual fallback)
  const donchian = (hi, lo) => {
    const out = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < Math.max(hi, lo) - 1) { out.push(null); continue; }
      let highest = -Infinity, lowest = Infinity;
      for (let j = i - hi + 1; j <= i; j++) if (candles[j].high > highest) highest = candles[j].high;
      for (let j = i - lo + 1; j <= i; j++) if (candles[j].low < lowest)  lowest  = candles[j].low;
      out.push({ time: candles[i].time, upper: highest, lower: lowest });
    }
    return out;
  };

  const cache = {
    sma: new Map(),
    ema: new Map(),
    rsi: new Map(),
    atr,
    bb,
    macd: macdMap,
    donchian,
    sma_get(p) { if (!this.sma.has(p)) this.sma.set(p, sma(p)); return this.sma.get(p); },
    ema_get(p) { if (!this.ema.has(p)) this.ema.set(p, ema(p)); return this.ema.get(p); },
    rsi_get(p) { if (!this.rsi.has(p)) this.rsi.set(p, rsi(p)); return this.rsi.get(p); },
  };
  return cache;
}

/* --------------------------- main engine -------------------------------- */

export function backtest(candles, strategy, options = {}) {
  const opts = {
    initialCapital: 10000,
    positionSize: 'fixed_dollar',
    positionSizeValue: 1000,
    commission: 0.001,
    slippage: 'none',
    slippageValue: 0.0005,
    allowShort: false,
    stopLoss: null,
    takeProfit: null,
    trailingStop: null,
    numStrategiesTested: 1,
    riskFreeRate: 0.04,
    warmupPeriod: 50,
    ...options,
  };

  if (!Array.isArray(candles) || candles.length < opts.warmupPeriod + 2) {
    return emptyResult(opts);
  }

  const indicators = precomputeIndicators(candles);

  // Rolling avg volume (used by Almgren slippage).
  const avgVolWindow = 20;
  const avgVolume = new Array(candles.length).fill(0);
  let vSum = 0;
  for (let i = 0; i < candles.length; i++) {
    vSum += candles[i].volume || 0;
    if (i >= avgVolWindow) vSum -= candles[i - avgVolWindow].volume || 0;
    avgVolume[i] = i >= avgVolWindow - 1 ? vSum / avgVolWindow : (vSum / (i + 1));
  }

  let equity = opts.initialCapital;
  let cash = opts.initialCapital;
  let peakEquity = equity;
  let peakEquityIdx = 0;
  let maxDD = 0;
  let maxDDDuration = 0;

  let position = null; // { side, entry, qty, entryIdx, entryTime, stops, atrAtEntry }
  const trades = [];
  const signals = [];
  const equityCurve = [];
  const dailyReturns = [];

  // For Kelly sizing we track running stats.
  let runWins = 0, runLosses = 0, runWinSum = 0, runLossSum = 0;
  const kellyFraction = () => {
    if (runWins + runLosses < 5) return 0.02;
    const p = runWins / (runWins + runLosses);
    const avgW = runWins ? runWinSum / runWins : 0;
    const avgL = runLosses ? runLossSum / runLosses : 0;
    if (avgL <= 0) return 0.02;
    const b = avgW / avgL;
    const f = (p * (b + 1) - 1) / b;
    return Math.max(0, Math.min(0.25, f)); // cap at 25%
  };

  const startIdx = Math.max(1, opts.warmupPeriod);
  let barsInMarket = 0;

  for (let i = startIdx; i < candles.length; i++) {
    const bar = candles[i];

    // ---- 1. Intrabar stop/target check on existing position ----
    if (position) {
      updateTrailing(position.stops, position.side, bar);
      const hit = checkExits(position.stops, position.side, bar);
      if (hit) {
        const fill = applySlippage(hit.price, position.side, 'exit', opts, {
          atrAt: position.atrAtEntry, qty: position.qty, avgVolume: avgVolume[i],
        });
        closePosition(position, fill, bar.time, i, hit.reason);
      }
    }
    if (position) barsInMarket++;

    // ---- 2. Ask strategy for action at THIS bar ----
    const action = safeStrategy(strategy, candles, {
      i, indicators, position: position ? { side: position.side, entry: position.entry } : null,
    });

    // ---- 3. Execute orders at NEXT bar's open ----
    const next = candles[i + 1];
    if (next) {
      const atrAt = (indicators.atr.get(bar.time) || {}).value || 0;
      const ctxSize = { atrAt, kellyFraction: kellyFraction() };

      if (action === 'buy') {
        if (!position) {
          const fill = applySlippage(next.open, 'long', 'enter', opts, { atrAt, qty: 0, avgVolume: avgVolume[i] });
          const qty = sizePosition(equity, fill, opts, ctxSize);
          if (qty > 0) {
            openPosition('long', fill, qty, next.time, i + 1, atrAt);
            signals.push({ time: next.time, type: 'buy', price: fill });
          }
        } else if (position.side === 'short') {
          const fill = applySlippage(next.open, 'short', 'exit', opts, { atrAt: position.atrAtEntry, qty: position.qty, avgVolume: avgVolume[i] });
          closePosition(position, fill, next.time, i + 1, 'signal');
          signals.push({ time: next.time, type: 'buy', price: fill });
        }
      } else if (action === 'sell') {
        if (position && position.side === 'long') {
          const fill = applySlippage(next.open, 'long', 'exit', opts, { atrAt: position.atrAtEntry, qty: position.qty, avgVolume: avgVolume[i] });
          closePosition(position, fill, next.time, i + 1, 'signal');
          signals.push({ time: next.time, type: 'sell', price: fill });
        } else if (!position && opts.allowShort) {
          const fill = applySlippage(next.open, 'short', 'enter', opts, { atrAt, qty: 0, avgVolume: avgVolume[i] });
          const qty = sizePosition(equity, fill, opts, ctxSize);
          if (qty > 0) {
            openPosition('short', fill, qty, next.time, i + 1, atrAt);
            signals.push({ time: next.time, type: 'sell', price: fill });
          }
        }
      }
    }

    // ---- 4. Mark-to-market equity ----
    const mtm = markToMarket(cash, position, bar.close);
    equity = mtm;
    if (equity > peakEquity) { peakEquity = equity; peakEquityIdx = i; }
    const dd = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;
    if (dd > maxDD) maxDD = dd;
    const ddDur = i - peakEquityIdx;
    if (ddDur > maxDDDuration) maxDDDuration = ddDur;

    equityCurve.push({ time: bar.time, equity, drawdown: dd });

    if (equityCurve.length >= 2) {
      const prev = equityCurve[equityCurve.length - 2].equity;
      if (prev > 0) dailyReturns.push(equity / prev - 1);
    }
  }

  // Force-close any open position on last bar.
  if (position) {
    const last = candles[candles.length - 1];
    const fill = applySlippage(last.close, position.side, 'exit', opts,
      { atrAt: position.atrAtEntry, qty: position.qty, avgVolume: avgVolume[avgVolume.length - 1] });
    closePosition(position, fill, last.time, candles.length - 1, 'end');
    const mtm = markToMarket(cash, position, last.close);
    if (equityCurve.length) {
      equityCurve[equityCurve.length - 1].equity = mtm;
      equity = mtm;
    }
  }

  const metrics = computeMetrics({
    trades, equityCurve, dailyReturns, opts,
    initialCapital: opts.initialCapital, maxDD, maxDDDuration,
    barsInMarket, totalBars: candles.length - startIdx,
  });

  return { trades, equityCurve, metrics, signals, options: { ...opts } };

  // ----- closures -----
  function openPosition(side, price, qty, time, idx, atrAt) {
    const commCost = price * qty * opts.commission;
    if (side === 'long') cash -= price * qty + commCost;
    else                 cash += price * qty - commCost; // short: receive proceeds
    const stops = computeStopLevels(price, side, atrAt, opts);
    position = { side, entry: price, qty, entryIdx: idx, entryTime: time, stops, atrAtEntry: atrAt };
  }

  function closePosition(pos, price, time, idx, reason) {
    const commCost = price * pos.qty * opts.commission;
    let pnl;
    if (pos.side === 'long') {
      cash += price * pos.qty - commCost;
      pnl = (price - pos.entry) * pos.qty - commCost - (pos.entry * pos.qty * opts.commission);
    } else {
      cash -= price * pos.qty + commCost;
      pnl = (pos.entry - price) * pos.qty - commCost - (pos.entry * pos.qty * opts.commission);
    }
    const pnlPct = pos.side === 'long'
      ? (price / pos.entry - 1)
      : (pos.entry / price - 1);
    trades.push({
      entryTime: pos.entryTime, exitTime: time, side: pos.side,
      entry: pos.entry, exit: price, qty: pos.qty,
      pnl, pnlPct, durationBars: idx - pos.entryIdx, exitReason: reason,
    });
    if (pnl >= 0) { runWins++; runWinSum += pnl; } else { runLosses++; runLossSum += -pnl; }
    position = null;
  }
}

function markToMarket(cash, position, lastPrice) {
  if (!position) return cash;
  if (position.side === 'long')  return cash + position.qty * lastPrice;
  // short: liability = qty * lastPrice
  return cash - position.qty * lastPrice;
}

function safeStrategy(strategy, candles, ctx) {
  try {
    const v = strategy(candles, ctx);
    if (v === 'buy' || v === 'sell' || v === 'hold') return v;
    return 'hold';
  } catch (_) { return 'hold'; }
}

function emptyResult(opts) {
  return {
    trades: [], equityCurve: [], signals: [], options: { ...opts },
    metrics: zeroMetrics(),
  };
}

function zeroMetrics() {
  return {
    totalReturn: 0, cagr: 0, sharpe: 0, sortino: 0, calmar: 0,
    maxDrawdown: 0, maxDrawdownDuration: 0, winRate: 0, profitFactor: 0,
    avgWin: 0, avgLoss: 0, avgWinPct: 0, avgLossPct: 0, expectancy: 0,
    totalTrades: 0, winningTrades: 0, losingTrades: 0,
    longestWinStreak: 0, longestLossStreak: 0, maxConsecutiveLosses: 0,
    deflatedSharpe: 0, timeInMarket: 0,
  };
}

/* ----------------------------- metrics ---------------------------------- */

function computeMetrics({ trades, equityCurve, dailyReturns, opts,
                          initialCapital, maxDD, maxDDDuration,
                          barsInMarket, totalBars }) {
  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const totalReturn = (finalEquity / initialCapital - 1) * 100;

  // Estimate years assuming each bar = 1 day (caller can rescale if needed).
  const years = Math.max(1 / 252, equityCurve.length / 252);
  const cagr = (Math.pow(Math.max(finalEquity, 1e-9) / initialCapital, 1 / years) - 1) * 100;

  const rfDaily = opts.riskFreeRate / 252;
  const mu = mean(dailyReturns);
  const sd = stddev(dailyReturns, mu);
  const sharpe = sd > 0 ? ((mu - rfDaily) / sd) * Math.sqrt(252) : 0;

  // Sortino: downside-only std (negative returns only, relative to 0)
  const downside = dailyReturns.filter(r => r < 0);
  const downsideSd = stddev(downside.length ? downside : [0], 0);
  const sortino = downsideSd > 0 ? ((mu - rfDaily) / downsideSd) * Math.sqrt(252) : 0;

  const calmar = maxDD > 0 ? cagr / (maxDD * 100) : 0;

  // Trade-level stats
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winSum = wins.reduce((s, t) => s + t.pnl, 0);
  const lossSum = losses.reduce((s, t) => s + t.pnl, 0);
  const profitFactor = lossSum < 0 ? winSum / Math.abs(lossSum) : (winSum > 0 ? Infinity : 0);
  const winRate = trades.length ? wins.length / trades.length : 0;
  const avgWin = wins.length ? winSum / wins.length : 0;
  const avgLoss = losses.length ? lossSum / losses.length : 0;
  const avgWinPct = wins.length ? mean(wins.map(t => t.pnlPct)) * 100 : 0;
  const avgLossPct = losses.length ? mean(losses.map(t => t.pnlPct)) * 100 : 0;
  const lossRate = 1 - winRate;
  const expectancy = winRate * avgWin - lossRate * Math.abs(avgLoss);

  // Streaks
  let longestWinStreak = 0, longestLossStreak = 0, curW = 0, curL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curW++; curL = 0; if (curW > longestWinStreak) longestWinStreak = curW; }
    else           { curL++; curW = 0; if (curL > longestLossStreak) longestLossStreak = curL; }
  }

  /* ------------------------- Deflated Sharpe Ratio --------------------------
     Bailey & Lopez de Prado (2014). The DSR adjusts the observed Sharpe for
     (a) the variance of the Sharpe estimator under non-normal returns and
     (b) selection bias from testing many strategies.

        SR^   = observed Sharpe (non-annualized, per-period)
        skew  = sample skewness of per-period returns
        kurt  = sample raw kurtosis of per-period returns
        n     = number of return observations
        N     = number of independent strategy trials
        E[SR*]= expected maximum Sharpe under H0 from N trials,
                approximated via Euler-Mascheroni:
                  E[SR*] ~ V * ((1-gamma)*Phi^-1(1-1/N) + gamma*Phi^-1(1-1/(N*e)))
                where V = std of the population of trial Sharpes
                (we approximate V = 1/sqrt(n), i.e. the SE of SR under H0).

        DSR = Phi( (SR^ - E[SR*]) * sqrt(n - 1)
                   / sqrt(1 - skew*SR^ + ((kurt - 1)/4)*SR^^2) )
     ------------------------------------------------------------------------- */
  const srPer = sd > 0 ? (mu - rfDaily) / sd : 0; // per-period Sharpe
  const skew = skewness(dailyReturns);
  const kurt = kurtosis(dailyReturns);
  const nObs = dailyReturns.length;
  const nTrials = Math.max(1, opts.numStrategiesTested || 1);
  let dsr = 0;
  if (nObs > 3 && sd > 0) {
    const gamma = 0.5772156649; // Euler-Mascheroni
    const V = 1 / Math.sqrt(nObs);
    let expectedMaxSR;
    if (nTrials <= 1) {
      expectedMaxSR = 0;
    } else {
      // inverse normal via Beasley-Springer-Moro is overkill; use approximation
      const invPhi = (p) => {
        // Acklam-style rational approx
        const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
        const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
        const pLow = 0.02425, pHigh = 1 - pLow;
        let q, r;
        if (p < pLow) { q = Math.sqrt(-2 * Math.log(p));
          return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
        if (p <= pHigh) { q = p - 0.5; r = q*q;
          return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
      };
      const t1 = invPhi(1 - 1 / nTrials);
      const t2 = invPhi(1 - 1 / (nTrials * Math.E));
      expectedMaxSR = V * ((1 - gamma) * t1 + gamma * t2);
    }
    const denom = Math.sqrt(Math.max(1e-12, 1 - skew * srPer + ((kurt - 1) / 4) * srPer * srPer));
    const z = (srPer - expectedMaxSR) * Math.sqrt(nObs - 1) / denom;
    dsr = normCdf(z);
  }

  return {
    totalReturn,
    cagr,
    sharpe,
    sortino,
    calmar,
    maxDrawdown: maxDD * 100,
    maxDrawdownDuration: maxDDDuration,
    winRate,
    profitFactor,
    avgWin, avgLoss,
    avgWinPct, avgLossPct,
    expectancy,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    longestWinStreak,
    longestLossStreak,
    maxConsecutiveLosses: longestLossStreak,
    deflatedSharpe: dsr,
    timeInMarket: totalBars > 0 ? barsInMarket / totalBars : 0,
  };
}

/* -------------------------- preset strategies --------------------------- */

// Utility: cross-detection on aligned indicator maps.
function crossedAbove(seriesA, seriesB, timeNow, timePrev) {
  const aN = seriesA.get(timeNow), aP = seriesA.get(timePrev);
  const bN = seriesB.get(timeNow), bP = seriesB.get(timePrev);
  if (!aN || !aP || !bN || !bP) return false;
  return aP.value <= bP.value && aN.value > bN.value;
}
function crossedBelow(seriesA, seriesB, timeNow, timePrev) {
  const aN = seriesA.get(timeNow), aP = seriesA.get(timePrev);
  const bN = seriesB.get(timeNow), bP = seriesB.get(timePrev);
  if (!aN || !aP || !bN || !bP) return false;
  return aP.value >= bP.value && aN.value < bN.value;
}

export const PRESET_STRATEGIES = [
  {
    id: 'buyhold',
    name: 'Buy & Hold',
    description: 'Buy on the first eligible bar and hold to the end.',
    fn: (candles, ctx) => {
      if (ctx.position) return 'hold';
      // Trigger exactly once at warmup boundary.
      return 'buy';
    },
  },
  {
    id: 'sma_cross',
    name: 'SMA Crossover (10/50)',
    description: 'Long when fast SMA crosses above slow SMA; exit on opposite cross.',
    fn: (candles, ctx) => {
      const fast = ctx.indicators.sma_get(10);
      const slow = ctx.indicators.sma_get(50);
      const t = candles[ctx.i].time, tp = candles[ctx.i - 1].time;
      if (!ctx.position && crossedAbove(fast, slow, t, tp)) return 'buy';
      if (ctx.position && ctx.position.side === 'long' && crossedBelow(fast, slow, t, tp)) return 'sell';
      return 'hold';
    },
  },
  {
    id: 'rsi_meanrev',
    name: 'RSI Mean Reversion (14, 30/70)',
    description: 'Buy when RSI < 30 (oversold); sell when RSI > 70 (overbought).',
    fn: (candles, ctx) => {
      const rsi = ctx.indicators.rsi_get(14);
      const t = candles[ctx.i].time;
      const row = rsi.get(t);
      if (!row) return 'hold';
      if (!ctx.position && row.value < 30) return 'buy';
      if (ctx.position && ctx.position.side === 'long' && row.value > 70) return 'sell';
      return 'hold';
    },
  },
  {
    id: 'bollinger_breakout',
    name: 'Bollinger Breakout (20, 2)',
    description: 'Buy on close above upper band; exit when close drops below basis.',
    fn: (candles, ctx) => {
      const bb = ctx.indicators.bb;
      const t = candles[ctx.i].time;
      const u = bb.upper.get(t), b = bb.basis.get(t);
      if (!u || !b) return 'hold';
      const close = candles[ctx.i].close;
      if (!ctx.position && close > u.value) return 'buy';
      if (ctx.position && ctx.position.side === 'long' && close < b.value) return 'sell';
      return 'hold';
    },
  },
  {
    id: 'macd_signal',
    name: 'MACD Signal Cross (12/26/9)',
    description: 'Buy on MACD crossing above the signal line; exit on opposite cross.',
    fn: (candles, ctx) => {
      const m = ctx.indicators.macd;
      const t = candles[ctx.i].time, tp = candles[ctx.i - 1].time;
      if (!ctx.position && crossedAbove(m.macd, m.signal, t, tp)) return 'buy';
      if (ctx.position && ctx.position.side === 'long' && crossedBelow(m.macd, m.signal, t, tp)) return 'sell';
      return 'hold';
    },
  },
  {
    id: 'donchian_breakout',
    name: 'Donchian Breakout (20/10)',
    description: 'Buy on close > 20-bar high; exit on close < 10-bar low.',
    fn: (candles, ctx) => {
      const i = ctx.i;
      if (i < 20) return 'hold';
      // Use shipped DonchianChannel if available, else inline rolling extremes.
      let upper20, lower10;
      if (DonchianChannel) {
        const dc20 = DonchianChannel(candles, 20);
        const dc10 = DonchianChannel(candles, 10);
        const t = candles[i].time;
        const a = dc20.find(d => d.time === t);
        const b = dc10.find(d => d.time === t);
        if (!a || !b) return 'hold';
        upper20 = a.upper; lower10 = b.lower;
      } else {
        let hi = -Infinity, lo = Infinity;
        for (let j = i - 19; j <= i - 1; j++) if (candles[j].high > hi) hi = candles[j].high;
        for (let j = i - 9;  j <= i - 1; j++) if (candles[j].low  < lo) lo = candles[j].low;
        upper20 = hi; lower10 = lo;
      }
      const close = candles[i].close;
      if (!ctx.position && close > upper20) return 'buy';
      if (ctx.position && ctx.position.side === 'long' && close < lower10) return 'sell';
      return 'hold';
    },
  },
];
