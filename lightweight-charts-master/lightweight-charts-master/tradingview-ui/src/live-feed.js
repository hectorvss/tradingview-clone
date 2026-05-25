/* =============================================================================
   LIVE TICK DATA SIMULATOR
   -----------------------------------------------------------------------------
   Generates realistic intra-bar price ticks against a Lightweight-Charts
   candlestick (and optional volume) series. Implements a Gaussian random walk
   with mean reversion, configurable volatility/trend bias, and rolls a fresh
   bar whenever the timeframe duration elapses.
   ============================================================================= */

import { TF_SECONDS as DATA_TF_SECONDS } from './data.js';

// Fallback if data.js ever fails to export
const TF_SECONDS = DATA_TF_SECONDS || {
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '4h': 14400,
  '1D': 86400, '1S': 604800, '1M': 2592000,
};

const UP_COLOR = 'rgba(38, 166, 154, 0.55)';
const DOWN_COLOR = 'rgba(239, 83, 80, 0.55)';

/* ---------- helpers ---------- */

// Box-Muller transform -> standard normal N(0,1)
function gaussianRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function tickSizeFor(price) {
  if (price >= 100) return 0.01;
  if (price >= 1)   return 0.001;
  if (price >= 0.1) return 0.0001;
  return 0.00001;
}

function roundToTick(p, tick) {
  return Math.round(p / tick) * tick;
}

function clone(bar) {
  return {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/* ---------- factory ---------- */

export function createLiveFeed(opts = {}) {
  const {
    series,
    volumeSeries = null,
    timeframe = '1m',
    symbol = 'SYM',
    onTick = null,
    onNewBar = null,
  } = opts;

  if (!series) throw new Error('createLiveFeed: `series` is required');

  let intervalMs = Math.max(20, opts.intervalMs ?? 500);
  let volatility = Math.max(0, opts.volatility ?? 0.0002);
  let trend = opts.trend ?? 0;

  const barDurationSec = TF_SECONDS[timeframe] || 60;

  // current open bar (mutable); we keep our own copy so we can update without
  // re-reading from the series
  let lastBar = null;
  let tickTimer = null;
  let running = false;
  let bid = 0;
  let ask = 0;
  let destroyed = false;

  /* -- bar bootstrap ----------------------------------------------------- */

  function seedFromSeed(seed) {
    // Accept a seed bar from caller, or synthesize one at "now"
    if (seed && typeof seed.close === 'number') {
      lastBar = clone(seed);
    } else {
      const nowSec = Math.floor(Date.now() / 1000);
      const t = Math.floor(nowSec / barDurationSec) * barDurationSec;
      const p = (seed && seed.price) || 100;
      lastBar = { time: t, open: p, high: p, low: p, close: p, volume: 0 };
    }
    const half = tickSizeFor(lastBar.close);
    bid = lastBar.close - half;
    ask = lastBar.close + half;
  }

  /* -- core tick --------------------------------------------------------- */

  function doTick() {
    if (!lastBar || destroyed) return;

    const tick = tickSizeFor(lastBar.close);

    // 1) random walk step
    let drift = trend;
    // mean reversion: if price has moved > 2% from open, pull back
    const dev = (lastBar.close - lastBar.open) / lastBar.open;
    if (Math.abs(dev) > 0.02) {
      drift -= 0.25 * dev; // pull toward open
    }
    const shock = gaussianRand() * volatility;
    let newPrice = lastBar.close * (1 + drift + shock);

    // 2) clamp to sane bounds (no negative or >10x open)
    const floor = lastBar.open * 0.5;
    const ceil  = lastBar.open * 2.0;
    if (newPrice < floor) newPrice = floor;
    if (newPrice > ceil)  newPrice = ceil;
    newPrice = roundToTick(newPrice, tick);
    if (newPrice <= 0) newPrice = tick;

    // 3) check whether we've crossed into the next bar
    const nowSec = Math.floor(Date.now() / 1000);
    const barEnd = lastBar.time + barDurationSec;

    if (nowSec >= barEnd) {
      // finalize current bar with last update first
      lastBar.close = newPrice;
      if (newPrice > lastBar.high) lastBar.high = newPrice;
      if (newPrice < lastBar.low)  lastBar.low  = newPrice;
      try { series.update(clone(lastBar)); } catch (_) {}

      // open new bar aligned to grid
      const nextTime = Math.floor(nowSec / barDurationSec) * barDurationSec;
      const openPx = roundToTick(
        newPrice * (1 + gaussianRand() * volatility * 0.5),
        tick
      );
      lastBar = {
        time: nextTime,
        open: openPx,
        high: openPx,
        low: openPx,
        close: openPx,
        volume: 0,
      };
      try { series.update(clone(lastBar)); } catch (_) {}
      if (volumeSeries) {
        try {
          volumeSeries.update({
            time: lastBar.time,
            value: 0,
            color: UP_COLOR,
          });
        } catch (_) {}
      }
      if (typeof onNewBar === 'function') {
        try { onNewBar(clone(lastBar)); } catch (_) {}
      }
      return; // next tick will populate the fresh bar
    }

    // 4) update current bar
    lastBar.close = newPrice;
    if (newPrice > lastBar.high) lastBar.high = newPrice;
    if (newPrice < lastBar.low)  lastBar.low  = newPrice;

    // volume increment: base + bias on |shock|
    const base = 10 + Math.floor(Math.random() * 490); // 10..499
    const bias = Math.floor(Math.abs(shock) * 50000);
    const vAdd = base + bias;
    lastBar.volume = (lastBar.volume || 0) + vAdd;

    // bid/ask jitter
    const spread = tick * (1 + Math.random() * 2);
    bid = roundToTick(newPrice - spread / 2, tick);
    ask = roundToTick(newPrice + spread / 2, tick);

    // 5) push updates
    try { series.update(clone(lastBar)); } catch (_) {}
    if (volumeSeries) {
      try {
        volumeSeries.update({
          time: lastBar.time,
          value: lastBar.volume,
          color: lastBar.close >= lastBar.open ? UP_COLOR : DOWN_COLOR,
        });
      } catch (_) {}
    }

    if (typeof onTick === 'function') {
      try {
        onTick({
          time: lastBar.time,
          price: newPrice,
          volume: vAdd,
          bid,
          ask,
          symbol,
        });
      } catch (_) {}
    }
  }

  /* -- public API -------------------------------------------------------- */

  function start(seed) {
    if (destroyed) return;
    if (!lastBar) seedFromSeed(seed);
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(doTick, intervalMs);
    running = true;
  }

  function pause() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    running = false;
  }

  function setSpeed(ms) {
    intervalMs = Math.max(20, ms | 0);
    if (running) {
      // restart timer at new cadence without losing lastBar
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(doTick, intervalMs);
    }
  }

  function setVolatility(v) {
    volatility = Math.max(0, +v || 0);
  }

  function setTrend(t) {
    trend = +t || 0;
  }

  function setSeedBar(bar) {
    seedFromSeed(bar);
  }

  function destroy() {
    pause();
    destroyed = true;
    lastBar = null;
  }

  const feed = {
    start,
    pause,
    setSpeed,
    setVolatility,
    setTrend,
    setSeedBar,
    destroy,
    get isRunning() { return running; },
    get lastBar() { return lastBar ? clone(lastBar) : null; },
    get bid() { return bid; },
    get ask() { return ask; },
  };

  return feed;
}

export default createLiveFeed;
