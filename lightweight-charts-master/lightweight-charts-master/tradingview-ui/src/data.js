// Seeded pseudo-random number generator (LCG)
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// Target price curve: piecewise between key dates
function getTargetPrice(dayIndex, totalDays) {
  const milestones = [
    [0,     57.20],
    [130,  140.00],
    [185,  105.00],
    [250,  175.00],
    [345,   88.00],
    [460,  219.00],
  ];

  for (let i = 1; i < milestones.length; i++) {
    const [d0, p0] = milestones[i - 1];
    const [d1, p1] = milestones[i];
    if (dayIndex <= d1) {
      const t = (dayIndex - d0) / (d1 - d0);
      return p0 + (p1 - p0) * t;
    }
  }
  return milestones[milestones.length - 1][1];
}

export function generateNVDAData() {
  const rng = seededRandom(42);
  const candles = [];
  let currentDate = new Date(2023, 10, 1);
  let prevClose = 57.20;
  let dayIndex = 0;
  const maxDays = 640;

  while (candles.length < maxDays) {
    const dow = currentDate.getDay();
    if (dow !== 0 && dow !== 6) {
      const target = getTargetPrice(dayIndex, maxDays);
      const pull = (target - prevClose) * 0.02;
      const drift = pull + (rng() - 0.48) * 2.5;
      const range = prevClose * (0.01 + rng() * 0.03);

      const open = prevClose + (rng() - 0.5) * range * 0.4;
      let close = open + drift + (rng() - 0.5) * range;
      close = Math.max(close, open * 0.97);

      const high = Math.max(open, close) + rng() * range * 0.5;
      const low  = Math.min(open, close) - rng() * range * 0.5;

      const bigMove = Math.abs(close - open) / open > 0.02;
      const volume = Math.round((50 + rng() * 150 + (bigMove ? 100 : 0)) * 1e6);
      const ts = Math.floor(currentDate.getTime() / 1000);

      candles.push({
        time: ts,
        open:  +open.toFixed(2),
        high:  +high.toFixed(2),
        low:   +low.toFixed(2),
        close: +close.toFixed(2),
        volume,
      });

      prevClose = close;
      dayIndex++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return candles;
}

export function computeEMA(candles, period) {
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  const result = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j <= i; j++) sum += candles[j].close;
      ema = sum / period;
    } else {
      ema = candles[i].close * k + ema * (1 - k);
    }
    result.push({ time: candles[i].time, value: +ema.toFixed(2) });
  }
  return result;
}

export function computeSMA(candles, period) {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].time, value: +(sum / period).toFixed(2) });
  }
  return result;
}

// Generate IBEX 35 intraday data (hourly)
export function generateIBEXIntraday() {
  const rng = seededRandom(99);
  const today = new Date(2026, 4, 24);
  const data = [];
  // 7-hour session, generate sub-hour points for smooth curve
  const points = 90;
  const startHour = 9;
  let price = 17960;
  for (let i = 0; i < points; i++) {
    price = price + (rng() - 0.5) * 35;
    const minutesFromOpen = (i / points) * (7 * 60);
    const h = startHour + Math.floor(minutesFromOpen / 60);
    const m = Math.floor(minutesFromOpen % 60);
    const ts = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h - 2, m, 0);
    data.push({ time: Math.floor(ts.getTime() / 1000), value: +price.toFixed(2) });
  }
  return data;
}

// Small sparkline data (monotonic-ish trend)
export function generateSparkline(seed, up) {
  const rng = seededRandom(seed);
  const data = [];
  let val = 100;
  const today = new Date(2026, 4, 24);
  for (let i = 60; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = up ? 0.25 : -0.25;
    val += drift + (rng() - 0.5) * 1.8;
    data.push({ time: Math.floor(d.getTime() / 1000), value: +val.toFixed(2) });
  }
  return data;
}

// Mini candlestick data for idea cards (60 daily candles)
export function generateMiniCandles(seed, up) {
  const rng = seededRandom(seed);
  const candles = [];
  let prev = 100;
  const today = new Date(2026, 4, 24);
  for (let i = 60; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = up ? 0.4 : -0.4;
    const open = prev;
    const close = prev + drift + (rng() - 0.5) * 3;
    const high = Math.max(open, close) + rng() * 1.5;
    const low  = Math.min(open, close) - rng() * 1.5;
    candles.push({
      time: Math.floor(d.getTime() / 1000),
      open: +open.toFixed(2), high: +high.toFixed(2),
      low: +low.toFixed(2), close: +close.toFixed(2),
    });
    prev = close;
  }
  return candles;
}

/* =========================================================================
   MULTI-SYMBOL / MULTI-TIMEFRAME OHLCV GENERATOR
   ========================================================================= */

export const TF_SECONDS = {
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '4h': 14400,
  '1D': 86400, '1S': 604800, '1M': 2592000,
};

export const TF_LABELS = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '4h': '4h', '1D': '1D', '1S': '1S', '1M': '1M',
};

// Per-symbol baseline price and volatility
const SYMBOL_PROFILES = {
  NVDA:   { price: 200, vol: 0.025, name: 'NVIDIA Corporation', ex: 'NASDAQ' },
  AAPL:   { price: 180, vol: 0.015, name: 'Apple Inc.',          ex: 'NASDAQ' },
  MSFT:   { price: 450, vol: 0.014, name: 'Microsoft Corporation', ex: 'NASDAQ' },
  TSLA:   { price: 350, vol: 0.035, name: 'Tesla, Inc.',         ex: 'NASDAQ' },
  GOOGL:  { price: 170, vol: 0.018, name: 'Alphabet Inc.',       ex: 'NASDAQ' },
  META:   { price: 520, vol: 0.022, name: 'Meta Platforms',      ex: 'NASDAQ' },
  AMZN:   { price: 195, vol: 0.018, name: 'Amazon.com Inc.',     ex: 'NASDAQ' },
  NFLX:   { price: 670, vol: 0.020, name: 'Netflix, Inc.',       ex: 'NASDAQ' },
  AMD:    { price: 165, vol: 0.030, name: 'Advanced Micro Devices', ex: 'NASDAQ' },
  SPY:    { price: 560, vol: 0.010, name: 'SPDR S&P 500 ETF',    ex: 'NYSE'   },
  BTCUSD: { price: 95000, vol: 0.035, name: 'Bitcoin / USD',     ex: 'CRYPTO' },
  ETHUSD: { price: 3500, vol: 0.040, name: 'Ethereum / USD',     ex: 'CRYPTO' },
  EURUSD: { price: 1.08, vol: 0.005, name: 'Euro / USD',         ex: 'FX'     },
};

export function getSymbolProfile(sym) {
  return SYMBOL_PROFILES[sym?.toUpperCase()] || { price: 100, vol: 0.02, name: sym, ex: '—' };
}

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate deterministic OHLCV for a given symbol + timeframe.
 * - Skips weekends for intraday TFs (1m..4h).
 * - Daily/weekly/monthly: continuous calendar (skipping only weekends for 1D stocks).
 */
export function generateData(symbol, tf = '1D', bars = 500) {
  const profile = getSymbolProfile(symbol);
  const step = TF_SECONDS[tf] || 86400;
  const rng = seededRandom(hashStr((symbol || 'X') + '_' + tf));
  const candles = [];

  // Anchor end time: today 16:00 UTC for simplicity
  const now = new Date(2026, 4, 24, 16, 0, 0);
  const endTs = Math.floor(now.getTime() / 1000);

  // Walk back generating bars; for intraday and 1D skip weekends
  const skipWeekends = (step <= TF_SECONDS['1D']);
  const isIntraday = step < TF_SECONDS['1D'];

  // Build timestamps walking back
  const timestamps = [];
  let t = endTs - (endTs % step);
  while (timestamps.length < bars) {
    const d = new Date(t * 1000);
    const dow = d.getUTCDay();
    let ok = true;
    if (skipWeekends && (dow === 0 || dow === 6)) ok = false;
    if (isIntraday) {
      // restrict to typical market hours 13:30 - 20:00 UTC (US equities)
      // skip crypto check: BTC/ETH/EUR trade 24/7
      const ex = profile.ex;
      if (ex !== 'CRYPTO' && ex !== 'FX') {
        const hourUTC = d.getUTCHours();
        const minUTC = d.getUTCMinutes();
        const hm = hourUTC * 60 + minUTC;
        if (hm < 13 * 60 + 30 || hm > 20 * 60) ok = false;
      }
    }
    if (ok) timestamps.push(t);
    t -= step;
  }
  timestamps.reverse();

  // Generate price walk with mild trend bias
  let price = profile.price;
  const vol = profile.vol;
  // Pre-walk forward from a 'starting' price toward profile.price * (1 + drift)
  const driftBias = (rng() - 0.4) * 0.0005; // small per-bar drift
  // Backwards anchor: start from price*(1 - driftBias*bars)
  let startPrice = profile.price * (1 - driftBias * bars);
  price = startPrice;
  for (let i = 0; i < timestamps.length; i++) {
    const noise = (rng() - 0.5) * 2 * vol;
    const open = price;
    const close = Math.max(0.0001, open * (1 + driftBias + noise));
    const rangePct = vol * (0.5 + rng() * 1.2);
    const hi = Math.max(open, close) * (1 + rng() * rangePct * 0.5);
    const lo = Math.min(open, close) * (1 - rng() * rangePct * 0.5);
    const baseVol = profile.price > 1000 ? 1e3 : 1e6;
    const volume = Math.round(baseVol * (0.5 + rng() * 1.5) + (Math.abs(close - open) / open) * baseVol * 50);
    candles.push({
      time: timestamps[i],
      open:  +open.toFixed(profile.price < 5 ? 5 : 2),
      high:  +hi.toFixed(profile.price < 5 ? 5 : 2),
      low:   +lo.toFixed(profile.price < 5 ? 5 : 2),
      close: +close.toFixed(profile.price < 5 ? 5 : 2),
      volume,
    });
    price = close;
  }
  return candles;
}

/* =========================================================================
   CACHE LAYER (localStorage, 30 min TTL)
   ========================================================================= */

const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheGet(key) {
  try {
    const raw = localStorage.getItem('tv.data.' + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    // Invalidate stale cross-source cache: if symbol is now a Binance pair but cache is from
    // a non-binance source, drop it so loadCandles can fetch fresh aligned data.
    const sym = key.split('_')[0];
    if (toBinanceSymbol(sym) && data && data.source !== 'binance') {
      try { localStorage.removeItem('tv.data.' + key); } catch {}
      return null;
    }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem('tv.data.' + key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota */ }
}

/* =========================================================================
   YAHOO FINANCE FETCH (CORS-prone; fallback to mock)
   ========================================================================= */

const TF_TO_YAHOO = {
  '1m': { range: '5d',  interval: '1m'  },
  '5m': { range: '1mo', interval: '5m'  },
  '15m':{ range: '1mo', interval: '15m' },
  '30m':{ range: '1mo', interval: '30m' },
  '1h': { range: '3mo', interval: '60m' },
  '4h': { range: '1y',  interval: '60m' }, // Yahoo has no 4h — synthesize from 1h
  '1D': { range: '5y',  interval: '1d'  },
  '1S': { range: '10y', interval: '1wk' },
  '1M': { range: 'max', interval: '1mo' },
};

export async function fetchYahoo(symbol, tf = '1D') {
  const cfg = TF_TO_YAHOO[tf] || TF_TO_YAHOO['1D'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}`;
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r || !r.timestamp) throw new Error('Yahoo: empty result');
  const q = r.indicators.quote[0];
  const out = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    if (q.open[i] == null) continue;
    out.push({
      time: r.timestamp[i],
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i],
      volume: q.volume?.[i] || 0,
    });
  }
  return out;
}

/**
 * Fetch historical klines from Binance REST. Aligns perfectly with Binance WS streams.
 */
export async function fetchBinanceKlines(symbol, tf = '1m', limit = 500) {
  const sym = toBinanceSymbol(symbol);
  const tfb = TF_TO_BINANCE[tf] || '1m';
  if (!sym) throw new Error('not a binance symbol');
  const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${tfb}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Binance HTTP ' + res.status);
  const arr = await res.json();
  return arr.map(k => ({
    time:   Math.floor(k[0] / 1000),
    open:   +k[1],
    high:   +k[2],
    low:    +k[3],
    close:  +k[4],
    volume: +k[5],
  }));
}

/**
 * Public loader: routes to the best free real-time source.
 *  - crypto pair → Binance REST (aligns with Binance WS)
 *  - other        → Yahoo Finance, fallback mock
 * Returns { candles, source: 'binance' | 'yahoo' | 'mock' }.
 */
export async function loadCandles(symbol, tf = '1D', bars = 500) {
  const key = `${symbol}_${tf}`;
  const cached = cacheGet(key);
  if (cached) return { candles: cached.candles, source: cached.source };

  // CRYPTO route — Binance REST
  if (toBinanceSymbol(symbol)) {
    try {
      const candles = await fetchBinanceKlines(symbol, tf, Math.min(bars, 1000));
      if (candles && candles.length > 10) {
        cacheSet(key, { candles, source: 'binance' });
        return { candles, source: 'binance' };
      }
    } catch (e) {
      console.warn('[data] Binance REST failed, falling back to Yahoo:', e.message);
    }
  }

  // STOCK / FX / FUT route — Yahoo
  try {
    const candles = await fetchYahoo(symbol, tf);
    if (candles && candles.length > 10) {
      const trimmed = candles.slice(-bars);
      cacheSet(key, { candles: trimmed, source: 'yahoo' });
      return { candles: trimmed, source: 'yahoo' };
    }
    throw new Error('insufficient data');
  } catch (e) {
    console.warn('[data] Yahoo failed, using mock:', e.message);
    const candles = generateData(symbol, tf, bars);
    cacheSet(key, { candles, source: 'mock' });
    return { candles, source: 'mock' };
  }
}

/* =========================================================================
   LIVE STREAMING — Yahoo polling + Binance WebSocket
   ========================================================================= */

const TF_TO_BINANCE = {
  '1m':'1m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','4h':'4h','1D':'1d','1S':'1w','1M':'1M'
};
const TF_TO_MS = {
  '1m':60e3,'5m':300e3,'15m':900e3,'30m':1.8e6,'1h':3.6e6,'4h':14.4e6,'1D':86.4e6,'1S':604.8e6,'1M':2.628e9
};

/**
 * Detect if symbol is a crypto pair routable through Binance WS.
 * Accepts e.g. BTCUSDT, ETHUSDT, BINANCE:BTCUSDT, BTC-USD, BTCUSD, BTC/USD.
 * Pairs ending in plain USD are remapped to USDT (Binance's most liquid quote).
 */
const KNOWN_CRYPTO_BASES = new Set([
  'BTC','ETH','SOL','ADA','XRP','BNB','DOGE','AVAX','DOT','MATIC','LINK','LTC',
  'BCH','ATOM','UNI','XLM','NEAR','ETC','APT','ARB','OP','SUI','INJ','ICP',
  'FIL','TRX','SHIB','PEPE','HBAR','RNDR','RENDER','FET','GRT','AAVE','MKR',
  'TAO','TON','WIF','BONK','FLOKI','JUP','PYTH','TIA','SEI','ORDI','WLD',
]);

export function toBinanceSymbol(symbol) {
  if (!symbol) return null;
  let s = String(symbol).toUpperCase();
  if (s.includes(':')) s = s.split(':').pop();
  s = s.replace(/[-\/]/g, '');
  // Bare base symbol — assume USDT (check FIRST to avoid e.g. "BTC" matching BTC$ regex)
  if (KNOWN_CRYPTO_BASES.has(s)) return s + 'USDT';
  // Plain USD → remap to USDT (Binance does not list <X>USD spot, only USDT)
  if (s.endsWith('USD')) {
    const base = s.slice(0, -3);
    if (KNOWN_CRYPTO_BASES.has(base)) return base + 'USDT';
  }
  // Already in correct Binance format (with explicit quote)
  const m = s.match(/^([A-Z0-9]{2,10})(USDT|USDC|BUSD|FDUSD|BTC|ETH|BNB|EUR|TRY)$/);
  if (m && KNOWN_CRYPTO_BASES.has(m[1])) return s;
  return null;
}

/**
 * Open a Binance WS RAW TRADE stream — ticks por cada operación ejecutada.
 * Mucho más fluido (>10 ticks/s en BTC) que el kline stream.
 * Agrega los trades en la vela actual del timeframe `tf` y emite onTick().
 *
 * onTick({ time, open, high, low, close, volume, isFinal:false, tickPrice })
 */
export function openBinanceTradeStream(symbol, tf, onTick) {
  const sym = toBinanceSymbol(symbol);
  if (!sym) return { close() {} };
  const tfMs = TF_TO_MS[tf] || 60e3;
  const url = `wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`;
  let ws, closed = false, retry = 0, timer = null;
  let bar = null; // { time, open, high, low, close, volume }

  const bucketStart = (tsMs) => Math.floor(tsMs / tfMs) * (tfMs / 1000);

  const connect = () => {
    if (closed) return;
    try { ws = new WebSocket(url); } catch (e) { return; }
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        // m.p price, m.q qty, m.T trade time ms
        const px = +m.p, qty = +m.q, tsMs = +m.T;
        if (!isFinite(px)) return;
        const bucket = bucketStart(tsMs);
        if (!bar || bar.time !== bucket) {
          // close previous bar (final)
          if (bar) {
            try { onTick({ ...bar, isFinal: true }); } catch {}
          }
          bar = { time: bucket, open: px, high: px, low: px, close: px, volume: qty };
        } else {
          bar.high = Math.max(bar.high, px);
          bar.low  = Math.min(bar.low, px);
          bar.close = px;
          bar.volume += qty;
        }
        onTick({ ...bar, isFinal: false, tickPrice: px });
      } catch {}
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
    ws.onclose = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, 1000 * Math.pow(2, retry));
    };
  };
  connect();
  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      try { ws && ws.close(); } catch {}
    }
  };
}

/**
 * Open a Binance WS kline stream. Returns { close() }.
 * onTick({ time, open, high, low, close, volume, isFinal })
 */
export function openBinanceStream(symbol, tf, onTick) {
  const sym = toBinanceSymbol(symbol);
  const tfb = TF_TO_BINANCE[tf] || '1m';
  if (!sym) return { close() {} };
  const url = `wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@kline_${tfb}`;
  let ws, closed = false, retry = 0, timer = null;
  const connect = () => {
    if (closed) return;
    try { ws = new WebSocket(url); } catch (e) { console.warn('[binance ws] err', e); return; }
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        const k = m.k;
        if (!k) return;
        onTick({
          time: Math.floor(k.t / 1000),
          open: +k.o, high: +k.h, low: +k.l, close: +k.c,
          volume: +k.v, isFinal: !!k.x,
        });
      } catch {}
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
    ws.onclose = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, 1000 * Math.pow(2, retry));
    };
  };
  connect();
  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      try { ws && ws.close(); } catch {}
    }
  };
}

/**
 * Poll Yahoo for the latest bar(s) of (symbol, tf). Calls onTick with last bar.
 * Returns { close() }. Cadence chosen by timeframe: 5s (1m), 10s (5m+), 30s (intraday), 60s (daily+).
 */
export function startYahooPolling(symbol, tf, onTick, opts = {}) {
  const cad = opts.cadenceMs || (
    tf === '1m' ? 5000 :
    (tf === '5m' || tf === '15m') ? 10000 :
    (tf === '30m' || tf === '1h') ? 30000 : 60000
  );
  let closed = false;
  let lastTime = null;
  const tick = async () => {
    if (closed) return;
    try {
      const bars = await fetchYahoo(symbol, tf);
      if (bars && bars.length) {
        const last = bars[bars.length - 1];
        // Emit last bar (update or new)
        onTick({ ...last, isFinal: lastTime != null && last.time > lastTime });
        lastTime = last.time;
      }
    } catch (e) { /* swallow */ }
    if (!closed) setTimeout(tick, cad);
  };
  setTimeout(tick, cad);
  return { close() { closed = true; } };
}

/**
 * Open a Coinbase WS trade stream — alternative free crypto feed.
 * Coinbase Advanced Trade uses different symbol format (BTC-USD, ETH-USD).
 */
export function openCoinbaseTradeStream(symbol, tf, onTick) {
  // Convert e.g. BTCUSDT -> BTC-USD
  let s = String(symbol || '').toUpperCase().replace(':', '-');
  if (s.endsWith('USDT')) s = s.slice(0, -4) + '-USD';
  if (s.endsWith('USD') && !s.includes('-')) s = s.slice(0, -3) + '-USD';
  const tfMs = TF_TO_MS[tf] || 60e3;
  const bucketStart = (tsMs) => Math.floor(tsMs / tfMs) * (tfMs / 1000);
  let ws, closed = false, bar = null, retry = 0, timer = null;
  const connect = () => {
    if (closed) return;
    try { ws = new WebSocket('wss://ws-feed.exchange.coinbase.com'); } catch { return; }
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', product_ids: [s], channels: ['matches'] }));
    };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.type !== 'match' && m.type !== 'last_match') return;
        const px = +m.price, qty = +m.size, tsMs = new Date(m.time).getTime();
        const bucket = bucketStart(tsMs);
        if (!bar || bar.time !== bucket) {
          if (bar) onTick({ ...bar, isFinal: true });
          bar = { time: bucket, open: px, high: px, low: px, close: px, volume: qty };
        } else {
          bar.high = Math.max(bar.high, px); bar.low = Math.min(bar.low, px);
          bar.close = px; bar.volume += qty;
        }
        onTick({ ...bar, isFinal: false, tickPrice: px });
      } catch {}
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
    ws.onclose = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, 1000 * Math.pow(2, retry));
    };
  };
  connect();
  return { close() { closed = true; if (timer) clearTimeout(timer); try { ws && ws.close(); } catch {} } };
}

/**
 * Unified live stream — picks the best free feed available.
 *  - crypto symbol → Binance @trade WebSocket (sub-second, real ticks)
 *  - everything else → Yahoo polling
 *
 * Options:
 *   mode: 'trade' (default, sub-second) | 'kline' (1s aggregate) | 'auto'
 *   provider: 'binance' (default) | 'coinbase'
 *   pollMs: override Yahoo polling cadence (default adaptive 5–60s)
 */
export function openLiveStream(symbol, tf, onTick, opts = {}) {
  const mode = opts.mode || 'trade';
  const provider = opts.provider || 'binance';
  if (toBinanceSymbol(symbol)) {
    if (provider === 'coinbase') {
      const h = openCoinbaseTradeStream(symbol, tf, onTick);
      return { close: h.close, provider: 'coinbase-trade-ws' };
    }
    if (mode === 'kline') {
      const h = openBinanceStream(symbol, tf, onTick);
      return { close: h.close, provider: 'binance-kline-ws' };
    }
    const h = openBinanceTradeStream(symbol, tf, onTick);
    return { close: h.close, provider: 'binance-trade-ws' };
  }
  const h = startYahooPolling(symbol, tf, onTick, { cadenceMs: opts.pollMs });
  return { close: h.close, provider: 'yahoo-poll' };
}

// Bar chart data (e.g. Spain 10Y monthly bars)
export function generateBars(seed) {
  const rng = seededRandom(seed);
  const data = [];
  const today = new Date(2026, 4, 24);
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const v = 3.2 + (rng() - 0.5) * 0.6;
    data.push({ time: Math.floor(d.getTime() / 1000), value: +v.toFixed(3) });
  }
  return data;
}
