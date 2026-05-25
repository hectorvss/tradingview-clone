// screener.js — TradingView-style stock screener
// Public API:
//   createScreener(container, opts = {}) -> { render(), destroy() }
//   SCREENER_PRESETS — array of ready-to-use filter presets
//
// opts:
//   onSelectSymbol(ticker)  — invoked when user clicks a ticker or "Abrir gráfico"
//   initialFilters          — partial filter object to seed the UI
//   pageSize                — default rows per page (25 | 50 | 100)
//   stockCount              — number of synthetic stocks to generate (default 200)
//
// Self-contained: synthetic dataset generation, filter bar, sortable paginated
// table, mini sparklines via lightweight-charts v5, scoped CSS injected once.

import {
  createChart,
  LineSeries,
  CrosshairMode,
} from 'lightweight-charts';

// ---------------------------------------------------------------------------
// One-time CSS injection
// ---------------------------------------------------------------------------
const STYLE_ATTR = 'data-screener-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTR, '');
  style.textContent = `
.scr-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: #0f0f0f;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.scr-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
}
.scr-toolbar label {
  font-size: 11px;
  color: #787b86;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-right: 4px;
}
.scr-toolbar select,
.scr-toolbar input {
  background: #0f0f0f;
  color: #d1d4dc;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  outline: none;
  min-width: 90px;
}
.scr-toolbar select:hover,
.scr-toolbar input:hover {
  border-color: #3a3a3a;
}
.scr-toolbar select:focus,
.scr-toolbar input:focus {
  border-color: #2962ff;
}
.scr-toolbar button {
  background: #2962ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
}
.scr-toolbar button.scr-secondary {
  background: #2a2a2a;
  color: #d1d4dc;
}
.scr-toolbar button:hover { filter: brightness(1.15); }
.scr-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 0;
}
.scr-preset-btn {
  background: #1c1c1c;
  border: 1px solid #2a2a2a;
  color: #b2b5be;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}
.scr-preset-btn:hover { background: #232323; color: #d1d4dc; }
.scr-preset-btn.active {
  background: rgba(41,98,255,0.18);
  border-color: #2962ff;
  color: #4f8aff;
}
.scr-tablewrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  background: #131313;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
}
.scr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}
.scr-table thead th {
  position: sticky;
  top: 0;
  background: #1a1a1a;
  color: #787b86;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 10.5px;
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px solid #2a2a2a;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.scr-table thead th.scr-text { text-align: left; }
.scr-table thead th:hover { color: #d1d4dc; }
.scr-table thead th .scr-arrow {
  display: inline-block;
  margin-left: 4px;
  opacity: 0.4;
  font-size: 9px;
}
.scr-table thead th.scr-sorted .scr-arrow {
  opacity: 1;
  color: #2962ff;
}
.scr-table tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid #1e1e1e;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.scr-table tbody tr:nth-child(even) { background: #161616; }
.scr-table tbody tr:hover { background: #1f1f1f; }
.scr-table tbody td.scr-text { text-align: left; }
.scr-ticker {
  color: #2962ff;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.2px;
}
.scr-ticker:hover { text-decoration: underline; }
.scr-name { color: #b2b5be; }
.scr-up { color: #26a69a; }
.scr-down { color: #ef5350; }
.scr-neutral { color: #b2b5be; }
.scr-sector { color: #b2b5be; font-size: 11px; }
.scr-spark {
  width: 80px;
  height: 24px;
  display: inline-block;
  vertical-align: middle;
}
.scr-openbtn {
  background: #2a2a2a;
  color: #d1d4dc;
  border: 1px solid #333;
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
}
.scr-openbtn:hover { background: #2962ff; color: #fff; border-color: #2962ff; }
.scr-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  font-size: 11px;
  color: #787b86;
}
.scr-pager { display: flex; gap: 4px; align-items: center; }
.scr-pager button {
  background: #2a2a2a;
  color: #d1d4dc;
  border: 1px solid #333;
  border-radius: 3px;
  padding: 3px 9px;
  font-size: 11px;
  cursor: pointer;
  min-width: 28px;
}
.scr-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.scr-pager button.active {
  background: #2962ff;
  border-color: #2962ff;
  color: #fff;
}
.scr-empty {
  text-align: center;
  padding: 40px 16px;
  color: #787b86;
  font-size: 12px;
}
`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (so dataset is stable across renders)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260525);
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function range(min, max) { return min + rand() * (max - min); }
function gauss(mean, std) {
  // Box-Muller
  const u = Math.max(1e-9, rand());
  const v = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const MARKETS = ['US', 'ES', 'Crypto', 'Forex'];

const SECTORS = [
  'Technology', 'Finance', 'Energy', 'Health', 'Consumer',
  'Industrial', 'Utilities', 'Materials', 'Communication', 'Real Estate',
];

const INDUSTRIES = {
  Technology: ['Software', 'Semiconductors', 'Hardware', 'Internet', 'IT Services'],
  Finance: ['Banks', 'Insurance', 'Asset Management', 'Brokerage', 'Fintech'],
  Energy: ['Oil & Gas', 'Renewables', 'Pipelines', 'Refining'],
  Health: ['Pharma', 'Biotech', 'Medical Devices', 'Hospitals'],
  Consumer: ['Retail', 'Apparel', 'Food & Beverage', 'Luxury'],
  Industrial: ['Aerospace', 'Machinery', 'Construction', 'Transport'],
  Utilities: ['Electric', 'Water', 'Gas Distribution'],
  Materials: ['Mining', 'Chemicals', 'Paper', 'Steel'],
  Communication: ['Telecom', 'Media', 'Gaming', 'Advertising'],
  'Real Estate': ['REIT Residential', 'REIT Commercial', 'Developers'],
};

const CAP_BUCKETS = [
  { name: 'Mega',  min: 200e9, max: 3000e9 },
  { name: 'Large', min:  10e9, max:  200e9 },
  { name: 'Mid',   min:   2e9, max:   10e9 },
  { name: 'Small', min: 300e6, max:    2e9 },
  { name: 'Micro', min:  50e6, max:  300e6 },
];

function capBucket(cap) {
  for (const b of CAP_BUCKETS) {
    if (cap >= b.min && cap < b.max) return b.name;
  }
  return cap >= 3000e9 ? 'Mega' : 'Micro';
}

// Seed real-ish tickers across markets so the list feels familiar.
const SEED_TICKERS = {
  US: [
    ['AAPL', 'Apple Inc.',           'Technology',    'Hardware'],
    ['MSFT', 'Microsoft Corp.',      'Technology',    'Software'],
    ['NVDA', 'NVIDIA Corp.',         'Technology',    'Semiconductors'],
    ['GOOGL','Alphabet Inc.',        'Communication', 'Internet'],
    ['AMZN', 'Amazon.com Inc.',      'Consumer',      'Retail'],
    ['META', 'Meta Platforms',       'Communication', 'Internet'],
    ['TSLA', 'Tesla Inc.',           'Consumer',      'Automotive'],
    ['JPM',  'JPMorgan Chase',       'Finance',       'Banks'],
    ['BAC',  'Bank of America',      'Finance',       'Banks'],
    ['XOM',  'Exxon Mobil',          'Energy',        'Oil & Gas'],
    ['CVX',  'Chevron Corp.',        'Energy',        'Oil & Gas'],
    ['JNJ',  'Johnson & Johnson',    'Health',        'Pharma'],
    ['PFE',  'Pfizer Inc.',          'Health',        'Pharma'],
    ['UNH',  'UnitedHealth Group',   'Health',        'Hospitals'],
    ['WMT',  'Walmart Inc.',         'Consumer',      'Retail'],
    ['KO',   'Coca-Cola Co.',        'Consumer',      'Food & Beverage'],
    ['DIS',  'Walt Disney Co.',      'Communication', 'Media'],
    ['BA',   'Boeing Co.',           'Industrial',    'Aerospace'],
    ['CAT',  'Caterpillar Inc.',     'Industrial',    'Machinery'],
    ['NEE',  'NextEra Energy',       'Utilities',     'Electric'],
    ['T',    'AT&T Inc.',            'Communication', 'Telecom'],
    ['VZ',   'Verizon Communications','Communication','Telecom'],
    ['INTC', 'Intel Corp.',          'Technology',    'Semiconductors'],
    ['AMD',  'Advanced Micro Devices','Technology',   'Semiconductors'],
    ['ORCL', 'Oracle Corp.',         'Technology',    'Software'],
    ['CRM',  'Salesforce Inc.',      'Technology',    'Software'],
    ['NFLX', 'Netflix Inc.',         'Communication', 'Media'],
    ['ADBE', 'Adobe Inc.',           'Technology',    'Software'],
    ['PEP',  'PepsiCo Inc.',         'Consumer',      'Food & Beverage'],
    ['MCD',  "McDonald's Corp.",     'Consumer',      'Food & Beverage'],
  ],
  ES: [
    ['SAN',  'Banco Santander',      'Finance',       'Banks'],
    ['BBVA', 'BBVA',                 'Finance',       'Banks'],
    ['ITX',  'Inditex',              'Consumer',      'Apparel'],
    ['IBE',  'Iberdrola',            'Utilities',     'Electric'],
    ['REP',  'Repsol',               'Energy',        'Oil & Gas'],
    ['TEF',  'Telefónica',           'Communication', 'Telecom'],
    ['CABK', 'CaixaBank',            'Finance',       'Banks'],
    ['ACS',  'Grupo ACS',            'Industrial',    'Construction'],
    ['AENA', 'Aena',                 'Industrial',    'Transport'],
    ['FER',  'Ferrovial',            'Industrial',    'Construction'],
    ['MAP',  'Mapfre',               'Finance',       'Insurance'],
    ['ELE',  'Endesa',               'Utilities',     'Electric'],
    ['NTGY', 'Naturgy Energy',       'Utilities',     'Gas Distribution'],
    ['GRF',  'Grifols',              'Health',        'Biotech'],
    ['MEL',  'Meliá Hotels',         'Consumer',      'Luxury'],
    ['SAB',  'Banco Sabadell',       'Finance',       'Banks'],
    ['ANA',  'Acciona',              'Utilities',     'Electric'],
    ['ENG',  'Enagás',               'Energy',        'Pipelines'],
    ['RED',  'Red Eléctrica',        'Utilities',     'Electric'],
    ['IAG',  'IAG',                  'Industrial',    'Transport'],
  ],
  Crypto: [
    ['BTC',  'Bitcoin',              'Crypto',        'Layer 1'],
    ['ETH',  'Ethereum',             'Crypto',        'Layer 1'],
    ['SOL',  'Solana',               'Crypto',        'Layer 1'],
    ['BNB',  'BNB',                  'Crypto',        'Exchange'],
    ['XRP',  'XRP',                  'Crypto',        'Payments'],
    ['ADA',  'Cardano',              'Crypto',        'Layer 1'],
    ['AVAX', 'Avalanche',            'Crypto',        'Layer 1'],
    ['DOGE', 'Dogecoin',             'Crypto',        'Meme'],
    ['DOT',  'Polkadot',             'Crypto',        'Interoperability'],
    ['LINK', 'Chainlink',            'Crypto',        'Oracle'],
    ['MATIC','Polygon',              'Crypto',        'Layer 2'],
    ['ATOM', 'Cosmos',               'Crypto',        'Interoperability'],
    ['LTC',  'Litecoin',             'Crypto',        'Payments'],
    ['UNI',  'Uniswap',              'Crypto',        'DeFi'],
    ['ARB',  'Arbitrum',             'Crypto',        'Layer 2'],
  ],
  Forex: [
    ['EURUSD','Euro / US Dollar',     'Forex', 'Major'],
    ['GBPUSD','Pound / US Dollar',    'Forex', 'Major'],
    ['USDJPY','US Dollar / Yen',      'Forex', 'Major'],
    ['USDCHF','US Dollar / Franc',    'Forex', 'Major'],
    ['AUDUSD','Aussie / US Dollar',   'Forex', 'Major'],
    ['USDCAD','US Dollar / Loonie',   'Forex', 'Major'],
    ['NZDUSD','Kiwi / US Dollar',     'Forex', 'Major'],
    ['EURGBP','Euro / Pound',         'Forex', 'Cross'],
    ['EURJPY','Euro / Yen',           'Forex', 'Cross'],
    ['GBPJPY','Pound / Yen',          'Forex', 'Cross'],
  ],
};

// ---------------------------------------------------------------------------
// Synthetic dataset
// ---------------------------------------------------------------------------
function genSparkline(price, change, n = 40) {
  const out = [];
  let p = price * (1 - change / 100);
  const drift = (price - p) / n;
  for (let i = 0; i < n; i++) {
    p = Math.max(0.0001, p + drift + gauss(0, price * 0.008));
    out.push({ time: i + 1, value: +p.toFixed(4) });
  }
  // Ensure last point matches the displayed price for visual consistency.
  out[out.length - 1].value = +price.toFixed(4);
  return out;
}

function randTicker() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const len = 3 + Math.floor(rand() * 2);
  let s = '';
  for (let i = 0; i < len; i++) s += letters[Math.floor(rand() * 26)];
  return s;
}

function generateStock(market, seed) {
  let ticker, name, sector, industry;
  if (seed) {
    [ticker, name, sector, industry] = seed;
  } else {
    ticker = randTicker();
    if (market === 'ES') ticker = ticker.slice(0, 4);
    if (market === 'Crypto') ticker = randTicker().slice(0, 4);
    if (market === 'Forex') {
      const bases = ['EUR','USD','GBP','JPY','CHF','AUD','CAD','NZD','MXN','SEK'];
      ticker = pick(bases) + pick(bases.filter(b => b !== bases[0]));
    }
    sector = market === 'Crypto' ? 'Crypto'
           : market === 'Forex'  ? 'Forex'
           : pick(SECTORS);
    industry = (INDUSTRIES[sector] && pick(INDUSTRIES[sector])) || 'General';
    name = ticker + ' Holdings';
  }

  // Price distribution: log-normal-ish, market-specific.
  let price;
  if (market === 'Crypto') {
    price = ticker === 'BTC' ? range(50000, 95000)
          : ticker === 'ETH' ? range(2200, 4200)
          : Math.exp(gauss(2.5, 2.2));
  } else if (market === 'Forex') {
    price = range(0.6, 1.6);
    if (ticker.endsWith('JPY')) price = range(120, 170);
  } else {
    price = Math.exp(gauss(3.6, 1.0)); // ~ centered around $36
  }
  price = Math.max(0.01, price);

  // Market cap: log-normal weighted toward mid-large
  let cap;
  if (market === 'Forex') cap = 0;
  else if (market === 'Crypto') cap = Math.exp(gauss(21, 3));
  else cap = Math.exp(gauss(22.5, 2.4));

  const changePct = gauss(0.2, 2.6);
  const change = price * changePct / 100;

  const volume = Math.floor(Math.exp(gauss(14.5, 1.8)));
  const pe = market === 'Forex' || market === 'Crypto'
    ? null
    : Math.max(2, gauss(22, 12));
  const dividend = (market === 'Forex' || market === 'Crypto')
    ? 0
    : Math.max(0, gauss(1.6, 1.8));
  const rsi = Math.min(95, Math.max(5, gauss(50, 16)));

  // Light EMA approximation: derive from sparkline.
  const spark = genSparkline(price, changePct);
  const ema = (arr, period) => {
    const k = 2 / (period + 1);
    let e = arr[0].value;
    for (let i = 1; i < arr.length; i++) e = arr[i].value * k + e * (1 - k);
    return e;
  };
  const ema50 = ema(spark, Math.min(50, spark.length));
  const ema200 = ema(spark, spark.length); // approx with full window

  return {
    market,
    ticker,
    name,
    sector,
    industry,
    price,
    change,
    changePct,
    volume,
    marketCap: cap,
    pe,
    dividend,
    rsi,
    ema50,
    ema200,
    spark,
  };
}

function generateDataset(total = 200) {
  const out = [];
  // Seeded
  for (const m of MARKETS) {
    const seeds = SEED_TICKERS[m] || [];
    for (const s of seeds) out.push(generateStock(m, s));
  }
  // Fill with random until we reach total, biased toward US/ES
  const fillMarkets = ['US','US','US','US','ES','ES','Crypto','Forex'];
  while (out.length < total) {
    out.push(generateStock(pick(fillMarkets), null));
  }
  return out.slice(0, total);
}

// ---------------------------------------------------------------------------
// Filtering / sorting / formatting
// ---------------------------------------------------------------------------
const DEFAULT_FILTERS = {
  market: 'all',
  sector: 'all',
  cap:    'all',
  minVol: 0,
  changeBand: 'all', // 'gt0', 'gt5', 'lt0', 'lt-5'
  tech: 'none',      // 'rsi_os', 'rsi_ob', 'golden'
  search: '',
};

function applyFilters(rows, f) {
  return rows.filter(r => {
    if (f.market !== 'all' && r.market !== f.market) return false;
    if (f.sector !== 'all' && r.sector !== f.sector) return false;
    if (f.cap !== 'all' && capBucket(r.marketCap) !== f.cap) return false;
    if (f.minVol && r.volume < f.minVol) return false;
    if (f.changeBand === 'gt0'  && !(r.changePct >  0)) return false;
    if (f.changeBand === 'gt5'  && !(r.changePct >  5)) return false;
    if (f.changeBand === 'lt0'  && !(r.changePct <  0)) return false;
    if (f.changeBand === 'lt-5' && !(r.changePct < -5)) return false;
    if (f.tech === 'rsi_os' && !(r.rsi < 30)) return false;
    if (f.tech === 'rsi_ob' && !(r.rsi > 70)) return false;
    if (f.tech === 'golden' && !(r.ema50 > r.ema200)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!r.ticker.toLowerCase().includes(q) &&
          !r.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function sortRows(rows, key, dir) {
  const m = dir === 'asc' ? 1 : -1;
  const sorted = rows.slice().sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * m;
    return String(av).localeCompare(String(bv)) * m;
  });
  return sorted;
}

function fmtPrice(v, market) {
  if (v == null) return '—';
  if (market === 'Forex') return v.toFixed(v < 10 ? 4 : 2);
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1)    return v.toFixed(2);
  return v.toFixed(4);
}
function fmtChange(v) {
  if (v == null || !isFinite(v)) return '—';
  const s = v >= 0 ? '+' : '';
  return s + v.toFixed(2);
}
function fmtPct(v) {
  if (v == null || !isFinite(v)) return '—';
  const s = v >= 0 ? '+' : '';
  return s + v.toFixed(2) + '%';
}
function fmtBig(v) {
  if (v == null || !isFinite(v) || v === 0) return '—';
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9)  return (v / 1e9).toFixed(2)  + 'B';
  if (v >= 1e6)  return (v / 1e6).toFixed(2)  + 'M';
  if (v >= 1e3)  return (v / 1e3).toFixed(1)  + 'K';
  return String(Math.round(v));
}
function fmtNum(v, digits = 2) {
  if (v == null || !isFinite(v)) return '—';
  return v.toFixed(digits);
}

// ---------------------------------------------------------------------------
// Column model
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: 'ticker',     label: 'Ticker',     text: true,  width: '90px'  },
  { key: 'name',       label: 'Nombre',     text: true,  width: '170px' },
  { key: 'price',      label: 'Precio',     text: false, width: '90px'  },
  { key: 'change',     label: 'Cambio',     text: false, width: '80px'  },
  { key: 'changePct',  label: 'Cambio %',   text: false, width: '80px'  },
  { key: 'volume',     label: 'Volumen',    text: false, width: '90px'  },
  { key: 'marketCap',  label: 'Cap. mercado',text: false,width: '100px' },
  { key: 'pe',         label: 'P/E',        text: false, width: '60px'  },
  { key: 'dividend',   label: 'Div. %',     text: false, width: '70px'  },
  { key: 'rsi',        label: 'RSI',        text: false, width: '60px'  },
  { key: 'sector',     label: 'Sector',     text: true,  width: '110px' },
  { key: 'industry',   label: 'Industria',  text: true,  width: '120px' },
  { key: 'spark',      label: 'Tendencia',  text: true,  width: '90px', noSort: true },
  { key: '_actions',   label: 'Acciones',   text: true,  width: '110px', noSort: true },
];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
export const SCREENER_PRESETS = [
  {
    id: 'us-oversold',
    label: 'Sobreventa US',
    description: 'Acciones US con RSI < 30',
    filters: { market: 'US', tech: 'rsi_os' },
    sort: { key: 'rsi', dir: 'asc' },
  },
  {
    id: 'gold-bull',
    label: 'Oro alcista',
    description: 'Mineras de oro / materiales con cambio > 0',
    filters: { sector: 'Materials', changeBand: 'gt0' },
    sort: { key: 'changePct', dir: 'desc' },
  },
  {
    id: 'crypto-vol',
    label: 'Cripto top volumen',
    description: 'Cripto ordenado por volumen',
    filters: { market: 'Crypto' },
    sort: { key: 'volume', dir: 'desc' },
  },
  {
    id: 'high-div',
    label: 'Dividendo alto >5%',
    description: 'Rentabilidad por dividendo superior al 5%',
    filters: { market: 'all', minVol: 100000 },
    sort: { key: 'dividend', dir: 'desc' },
    postFilter: r => r.dividend > 5,
  },
  {
    id: 'large-growth',
    label: 'Cap. grande crecimiento',
    description: 'Large/Mega cap con golden cross y cambio > 0',
    filters: { cap: 'Large', tech: 'golden', changeBand: 'gt0' },
    sort: { key: 'marketCap', dir: 'desc' },
  },
];

// ---------------------------------------------------------------------------
// Sparkline chart cache (cleaned up on destroy)
// ---------------------------------------------------------------------------
function createSparkline(host, data, up) {
  let chart = null;
  try {
    chart = createChart(host, {
      width: 80,
      height: 24,
      autoSize: false,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: 'rgba(0,0,0,0)',
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale:  false,
      kineticScroll: { touch: false, mouse: false },
    });
    const series = chart.addSeries(LineSeries, {
      color: up ? '#26a69a' : '#ef5350',
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    series.setData(data);
    chart.timeScale().fitContent();
  } catch (err) {
    // If lightweight-charts fails (e.g. SSR), fall back to a tiny SVG.
    host.innerHTML = `<svg width="80" height="24" viewBox="0 0 80 24">
      <polyline fill="none" stroke="${up ? '#26a69a' : '#ef5350'}" stroke-width="1.5"
        points="${data.map((d, i) => `${(i / (data.length - 1)) * 80},${
          24 - ((d.value - Math.min(...data.map(x => x.value))) /
          Math.max(1e-9, Math.max(...data.map(x => x.value)) - Math.min(...data.map(x => x.value)))) * 22 - 1
        }`).join(' ')}" />
    </svg>`;
  }
  return chart;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------
export function createScreener(container, opts = {}) {
  if (!container) throw new Error('createScreener: container is required');
  ensureStyles();

  const state = {
    filters: { ...DEFAULT_FILTERS, ...(opts.initialFilters || {}) },
    sortKey: opts.sortKey || 'marketCap',
    sortDir: opts.sortDir || 'desc',
    page:    1,
    pageSize: opts.pageSize || 25,
    activePreset: null,
    postFilter: null,
  };

  const dataset = generateDataset(opts.stockCount || 200);
  const sparkCharts = [];

  // Root layout
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'scr-root';
  container.appendChild(root);

  const toolbar = document.createElement('div');
  toolbar.className = 'scr-toolbar';
  root.appendChild(toolbar);

  const presetsBar = document.createElement('div');
  presetsBar.className = 'scr-presets';
  root.appendChild(presetsBar);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'scr-tablewrap';
  root.appendChild(tableWrap);

  const footer = document.createElement('div');
  footer.className = 'scr-footer';
  root.appendChild(footer);

  // ---------- toolbar ----------
  function buildSelect(label, value, options, onChange) {
    const wrap = document.createElement('span');
    const lab = document.createElement('label');
    lab.textContent = label;
    wrap.appendChild(lab);
    const sel = document.createElement('select');
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === String(value)) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    wrap.appendChild(sel);
    return wrap;
  }

  function buildToolbar() {
    toolbar.innerHTML = '';
    toolbar.appendChild(buildSelect('Mercado', state.filters.market, [
      { value: 'all', label: 'Todos' },
      ...MARKETS.map(m => ({ value: m, label: m })),
    ], v => { state.filters.market = v; state.page = 1; render(); }));

    toolbar.appendChild(buildSelect('Sector', state.filters.sector, [
      { value: 'all', label: 'Todos' },
      ...SECTORS.concat(['Crypto','Forex']).map(s => ({ value: s, label: s })),
    ], v => { state.filters.sector = v; state.page = 1; render(); }));

    toolbar.appendChild(buildSelect('Cap.', state.filters.cap, [
      { value: 'all', label: 'Todas' },
      ...CAP_BUCKETS.map(b => ({ value: b.name, label: b.name })),
    ], v => { state.filters.cap = v; state.page = 1; render(); }));

    // Min volume
    const volWrap = document.createElement('span');
    const volLab = document.createElement('label');
    volLab.textContent = 'Vol. mín.';
    volWrap.appendChild(volLab);
    const volIn = document.createElement('input');
    volIn.type = 'number';
    volIn.min = '0';
    volIn.step = '1000';
    volIn.value = state.filters.minVol || '';
    volIn.placeholder = '0';
    volIn.style.width = '110px';
    volIn.addEventListener('change', () => {
      state.filters.minVol = Math.max(0, parseInt(volIn.value, 10) || 0);
      state.page = 1; render();
    });
    volWrap.appendChild(volIn);
    toolbar.appendChild(volWrap);

    toolbar.appendChild(buildSelect('Cambio %', state.filters.changeBand, [
      { value: 'all',  label: 'Todos' },
      { value: 'gt0',  label: '> 0%'  },
      { value: 'gt5',  label: '> 5%'  },
      { value: 'lt0',  label: '< 0%'  },
      { value: 'lt-5', label: '< -5%' },
    ], v => { state.filters.changeBand = v; state.page = 1; render(); }));

    toolbar.appendChild(buildSelect('Indicador', state.filters.tech, [
      { value: 'none',   label: 'Ninguno'         },
      { value: 'rsi_os', label: 'RSI < 30 (sobreventa)' },
      { value: 'rsi_ob', label: 'RSI > 70 (sobrecompra)'},
      { value: 'golden', label: 'EMA50 > EMA200 (golden)' },
    ], v => { state.filters.tech = v; state.page = 1; render(); }));

    // Search
    const sWrap = document.createElement('span');
    const sLab = document.createElement('label');
    sLab.textContent = 'Buscar';
    sWrap.appendChild(sLab);
    const sIn = document.createElement('input');
    sIn.type = 'search';
    sIn.value = state.filters.search;
    sIn.placeholder = 'Ticker o nombre';
    sIn.addEventListener('input', () => {
      state.filters.search = sIn.value;
      state.page = 1; render();
    });
    sWrap.appendChild(sIn);
    toolbar.appendChild(sWrap);

    const reset = document.createElement('button');
    reset.className = 'scr-secondary';
    reset.textContent = 'Limpiar';
    reset.addEventListener('click', () => {
      state.filters = { ...DEFAULT_FILTERS };
      state.activePreset = null;
      state.postFilter = null;
      state.page = 1;
      render();
    });
    toolbar.appendChild(reset);
  }

  function buildPresets() {
    presetsBar.innerHTML = '';
    const lbl = document.createElement('label');
    lbl.textContent = 'Presets:';
    lbl.style.fontSize = '11px';
    lbl.style.color = '#787b86';
    lbl.style.alignSelf = 'center';
    lbl.style.marginRight = '4px';
    presetsBar.appendChild(lbl);
    for (const p of SCREENER_PRESETS) {
      const b = document.createElement('button');
      b.className = 'scr-preset-btn' + (state.activePreset === p.id ? ' active' : '');
      b.textContent = p.label;
      b.title = p.description;
      b.addEventListener('click', () => {
        state.filters = { ...DEFAULT_FILTERS, ...p.filters };
        if (p.sort) { state.sortKey = p.sort.key; state.sortDir = p.sort.dir; }
        state.activePreset = p.id;
        state.postFilter = p.postFilter || null;
        state.page = 1;
        render();
      });
      presetsBar.appendChild(b);
    }
  }

  // ---------- table ----------
  function destroySparks() {
    while (sparkCharts.length) {
      const c = sparkCharts.pop();
      try { c && c.remove && c.remove(); } catch (_) { /* noop */ }
    }
  }

  function buildTable() {
    destroySparks();
    tableWrap.innerHTML = '';

    let rows = applyFilters(dataset, state.filters);
    if (state.postFilter) rows = rows.filter(state.postFilter);
    rows = sortRows(rows, state.sortKey, state.sortDir);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);

    if (total === 0) {
      const empty = document.createElement('div');
      empty.className = 'scr-empty';
      empty.textContent = 'Sin resultados para los filtros seleccionados.';
      tableWrap.appendChild(empty);
      buildFooter(0, 0, 0);
      return;
    }

    const table = document.createElement('table');
    table.className = 'scr-table';

    // colgroup for column widths
    const cg = document.createElement('colgroup');
    for (const c of COLUMNS) {
      const col = document.createElement('col');
      col.style.width = c.width;
      cg.appendChild(col);
    }
    table.appendChild(cg);

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const c of COLUMNS) {
      const th = document.createElement('th');
      th.textContent = c.label;
      if (c.text) th.classList.add('scr-text');
      const arrow = document.createElement('span');
      arrow.className = 'scr-arrow';
      if (state.sortKey === c.key) {
        th.classList.add('scr-sorted');
        arrow.textContent = state.sortDir === 'asc' ? '▲' : '▼';
      } else {
        arrow.textContent = '▾';
      }
      if (!c.noSort) th.appendChild(arrow);
      else th.style.cursor = 'default';
      if (!c.noSort) {
        th.addEventListener('click', () => {
          if (state.sortKey === c.key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = c.key;
            state.sortDir = (c.key === 'ticker' || c.key === 'name' ||
                             c.key === 'sector' || c.key === 'industry')
              ? 'asc' : 'desc';
          }
          render();
        });
      }
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const r of pageRows) {
      const tr = document.createElement('tr');
      const up = r.changePct >= 0;
      const chgCls = r.changePct > 0 ? 'scr-up'
                   : r.changePct < 0 ? 'scr-down'
                   : 'scr-neutral';

      // ticker
      const tdT = document.createElement('td');
      tdT.className = 'scr-text';
      const tk = document.createElement('span');
      tk.className = 'scr-ticker';
      tk.textContent = r.ticker;
      tk.addEventListener('click', () => {
        if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(r.ticker);
      });
      tdT.appendChild(tk);
      tr.appendChild(tdT);

      // name
      const tdN = document.createElement('td');
      tdN.className = 'scr-text scr-name';
      tdN.textContent = r.name;
      tdN.title = r.name;
      tr.appendChild(tdN);

      // price
      const tdP = document.createElement('td');
      tdP.textContent = fmtPrice(r.price, r.market);
      tr.appendChild(tdP);

      // change
      const tdC = document.createElement('td');
      tdC.textContent = fmtChange(r.change);
      tdC.className = chgCls;
      tr.appendChild(tdC);

      // change %
      const tdCP = document.createElement('td');
      tdCP.textContent = fmtPct(r.changePct);
      tdCP.className = chgCls;
      tr.appendChild(tdCP);

      // volume
      const tdV = document.createElement('td');
      tdV.textContent = fmtBig(r.volume);
      tr.appendChild(tdV);

      // market cap
      const tdMC = document.createElement('td');
      tdMC.textContent = fmtBig(r.marketCap);
      tr.appendChild(tdMC);

      // pe
      const tdPE = document.createElement('td');
      tdPE.textContent = r.pe == null ? '—' : fmtNum(r.pe, 1);
      tr.appendChild(tdPE);

      // dividend
      const tdD = document.createElement('td');
      tdD.textContent = r.dividend ? fmtNum(r.dividend, 2) + '%' : '—';
      tr.appendChild(tdD);

      // rsi
      const tdR = document.createElement('td');
      tdR.textContent = fmtNum(r.rsi, 1);
      tdR.className = r.rsi < 30 ? 'scr-up'
                    : r.rsi > 70 ? 'scr-down'
                    : 'scr-neutral';
      tr.appendChild(tdR);

      // sector
      const tdS = document.createElement('td');
      tdS.className = 'scr-text scr-sector';
      tdS.textContent = r.sector;
      tr.appendChild(tdS);

      // industry
      const tdI = document.createElement('td');
      tdI.className = 'scr-text scr-sector';
      tdI.textContent = r.industry;
      tdI.title = r.industry;
      tr.appendChild(tdI);

      // sparkline
      const tdSp = document.createElement('td');
      tdSp.className = 'scr-text';
      const sparkHost = document.createElement('div');
      sparkHost.className = 'scr-spark';
      tdSp.appendChild(sparkHost);
      tr.appendChild(tdSp);

      // actions
      const tdA = document.createElement('td');
      tdA.className = 'scr-text';
      const btn = document.createElement('button');
      btn.className = 'scr-openbtn';
      btn.textContent = 'Abrir gráfico';
      btn.addEventListener('click', () => {
        if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(r.ticker);
      });
      tdA.appendChild(btn);
      tr.appendChild(tdA);

      tbody.appendChild(tr);

      // Defer chart creation to after the row is in the DOM, so sizing works.
      // We push the sparkline host into a list and create after table append.
      tr._sparkHost = sparkHost;
      tr._sparkData = r.spark;
      tr._sparkUp = up;
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    // Create sparklines now that hosts are attached.
    for (const tr of tbody.children) {
      if (tr._sparkHost && tr._sparkData) {
        const c = createSparkline(tr._sparkHost, tr._sparkData, tr._sparkUp);
        if (c) sparkCharts.push(c);
      }
    }

    buildFooter(total, start + 1, Math.min(start + state.pageSize, total));
  }

  function buildFooter(total, from, to) {
    footer.innerHTML = '';

    const info = document.createElement('div');
    info.textContent = total === 0
      ? '0 resultados'
      : `Mostrando ${from}–${to} de ${total} resultados`;
    footer.appendChild(info);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '12px';
    right.style.alignItems = 'center';

    // page-size selector
    const ps = document.createElement('select');
    ps.style.background = '#0f0f0f';
    ps.style.color = '#d1d4dc';
    ps.style.border = '1px solid #2a2a2a';
    ps.style.borderRadius = '3px';
    ps.style.padding = '3px 6px';
    ps.style.fontSize = '11px';
    for (const n of [25, 50, 100]) {
      const o = document.createElement('option');
      o.value = String(n);
      o.textContent = n + ' / pág.';
      if (n === state.pageSize) o.selected = true;
      ps.appendChild(o);
    }
    ps.addEventListener('change', () => {
      state.pageSize = parseInt(ps.value, 10);
      state.page = 1;
      render();
    });
    right.appendChild(ps);

    // pager
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const pager = document.createElement('div');
    pager.className = 'scr-pager';

    const prev = document.createElement('button');
    prev.textContent = '‹';
    prev.disabled = state.page <= 1;
    prev.addEventListener('click', () => { state.page--; render(); });
    pager.appendChild(prev);

    // window of pages around current
    const windowSize = 5;
    let pStart = Math.max(1, state.page - Math.floor(windowSize / 2));
    let pEnd   = Math.min(totalPages, pStart + windowSize - 1);
    pStart = Math.max(1, pEnd - windowSize + 1);
    for (let i = pStart; i <= pEnd; i++) {
      const b = document.createElement('button');
      b.textContent = String(i);
      if (i === state.page) b.classList.add('active');
      b.addEventListener('click', () => { state.page = i; render(); });
      pager.appendChild(b);
    }

    const next = document.createElement('button');
    next.textContent = '›';
    next.disabled = state.page >= totalPages;
    next.addEventListener('click', () => { state.page++; render(); });
    pager.appendChild(next);

    right.appendChild(pager);
    footer.appendChild(right);
  }

  function render() {
    buildToolbar();
    buildPresets();
    buildTable();
  }

  function destroy() {
    destroySparks();
    if (container) container.innerHTML = '';
  }

  render();
  return { render, destroy };
}

export default createScreener;
