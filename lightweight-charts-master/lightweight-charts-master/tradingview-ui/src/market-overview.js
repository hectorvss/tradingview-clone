import { createChart, AreaSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import {
  generateIBEXIntraday,
  generateSparkline,
  generateMiniCandles,
  generateBars,
} from './data.js';

/* ───────────────────────── DATA ───────────────────────── */

const NAV_LINKS = [
  { label: 'Productos' },
  { label: 'Comunidad' },
  { label: 'Mercados' },
  { label: 'Brokers' },
  { label: 'Más' },
];

const STICKY_TABS = [
  { label: 'Resumen de mercado', active: true },
  'Acciones españolas',
  'Cripto',
  'Futuros',
  'Forex',
  'Economía',
  'Brokers',
];

const PRINCIPAL_INDICES = [
  { color: '#2962ff', letter: 'I', name: 'IBEX 35',       sub: 'IBC',   price: '17.985,30', chg: '+0,06%',  up: true  },
  { color: '#f23645', letter: 'S', name: 'S&P 500',        sub: 'SPX',   price: '7.471,46',  chg: '−0,32%',  up: false },
  { color: '#9c27b0', letter: 'N', name: 'NQ 100',         sub: 'NDX',   price: '29.486,55', chg: '−0,87%',  up: false },
  { color: '#f7a600', letter: 'D', name: 'DJI',            sub: 'DJI',   price: '53.139,18', chg: '+0,16%',  up: true  },
  { color: '#089981', letter: 'J', name: 'Japan 225',      sub: 'NI225', price: '63.158,81', chg: '−0,12%',  up: false },
  { color: '#ff5252', letter: 'S', name: 'SSE Composite',  sub: 'SHCOMP',price: '4.112,80',  chg: '+0,57%',  up: true  },
  { color: '#2962ff', letter: 'D', name: 'DAX',            sub: 'DAX',   price: '15.486,30', chg: '−0,71%',  up: false },
];

const CRYPTO_ROWS = [
  { sym: '₿', color: '#f7931a', name: 'Bitcoin',  ticker: 'BTCUSD',  price: '99.512,30 USD', chg: '+1,21%',  up: true  },
  { sym: 'Ξ', color: '#627eea', name: 'Ethereum', ticker: 'ETHUSD',  price: '3.412,80 USD',  chg: '−0,86%',  up: false },
];

const FUTURES_ROWS = [
  { color: '#000', name: 'Petróleo crudo WTI', ticker: 'CL1!',  price: '78,42 USD',  chg: '−0,84%', up: false },
  { color: '#2962ff', name: 'E-mini S&P 500',  ticker: 'ES1!',  price: '5.481,75',   chg: '−0,18%', up: false },
  { color: '#f7a600', name: 'Oro',             ticker: 'GC1!',  price: '2.341,50 USD',chg: '−0,31%', up: false },
];

const COMMODITY_ROWS = [
  { color: '#000',    name: 'WTI Crudo',      ticker: 'WTI',  price: '78,42 USD',   chg: '−0,84%', up: false },
  { color: '#2962ff', name: 'Gas Natural',    ticker: 'NG',   price: '2,154 USD',   chg: '+1,23%', up: true  },
  { color: '#f7a600', name: 'Oro',            ticker: 'XAU',  price: '2.341,50 USD',chg: '−0,31%', up: false },
];

const IDEA_CARDS = [
  { exch: 'NASDAQ', ticker: 'NVDA', author: 'TraderPro · hace 2 h',  title: 'NVDA — Resistencia clave: ¿rebote o ruptura?',     seed: 10, up: true,  likes: 142 },
  { exch: 'CME',    ticker: 'SPX',  author: 'MarketSeer · hace 5 h', title: 'S&P 500: análisis semanal y zonas de interés',     seed: 20, up: true,  likes: 98  },
  { exch: 'BINANCE',ticker: 'BTC',  author: 'CryptoMaven · hace 8 h',title: 'Bitcoin en soporte mayor — setup de compra',       seed: 30, up: false, likes: 215 },
];

const EDITOR_PICKS = [
  { exch: 'NYSE',     ticker: 'TSLA', title: 'Tesla — patrón de continuación alcista', seed: 41, up: true,  author: 'EditorTeam · hace 1 d' },
  { exch: 'NASDAQ',   ticker: 'AAPL', title: 'Apple en consolidación: zonas clave',    seed: 42, up: false, author: 'EditorTeam · hace 1 d' },
  { exch: 'NASDAQ',   ticker: 'MSFT', title: 'Microsoft: ruptura de canal alcista',    seed: 43, up: true,  author: 'EditorTeam · hace 2 d' },
];

// Section 2: Acciones españolas
const SPANISH_STOCKS_TOP = [
  { ticker: 'SAN',   name: 'Banco Santander', price: '4,512 EUR', chg: '+1,12%', up: true  },
  { ticker: 'BBVA',  name: 'BBVA',            price: '9,876 EUR', chg: '+0,68%', up: true  },
  { ticker: 'IBE',   name: 'Iberdrola',       price: '13,21 EUR', chg: '−0,42%', up: false },
  { ticker: 'TEF',   name: 'Telefónica',      price: '4,213 EUR', chg: '+0,18%', up: true  },
];

const SPANISH_GAINERS = [
  { ticker: 'GRF',  name: 'Grifols',       price: '11,42 EUR',  chg: '+5,84%', up: true },
  { ticker: 'ELE',  name: 'Endesa',        price: '20,18 EUR',  chg: '+4,21%', up: true },
  { ticker: 'REP',  name: 'Repsol',        price: '14,80 EUR',  chg: '+3,87%', up: true },
  { ticker: 'ACS',  name: 'ACS',           price: '46,12 EUR',  chg: '+3,12%', up: true },
  { ticker: 'CLNX', name: 'Cellnex',       price: '32,40 EUR',  chg: '+2,98%', up: true },
];

const SPANISH_LOSERS = [
  { ticker: 'MTS',  name: 'ArcelorMittal', price: '21,18 EUR',  chg: '−4,12%', up: false },
  { ticker: 'IDR',  name: 'Indra',         price: '17,84 EUR',  chg: '−3,42%', up: false },
  { ticker: 'AENA', name: 'Aena',          price: '186,40 EUR', chg: '−2,86%', up: false },
  { ticker: 'NTGY', name: 'Naturgy',       price: '22,12 EUR',  chg: '−2,18%', up: false },
  { ticker: 'AMS',  name: 'Amadeus',       price: '64,80 EUR',  chg: '−1,98%', up: false },
];

const SPANISH_ACTIVE = [
  { ticker: 'SAN',  name: 'Banco Santander',  price: '4,512 EUR',  vol: '125,4M' },
  { ticker: 'BBVA', name: 'BBVA',             price: '9,876 EUR',  vol: '98,1M'  },
  { ticker: 'IBE',  name: 'Iberdrola',        price: '13,21 EUR',  vol: '84,7M'  },
];

// Section 3 — Crypto
const CRYPTO_LIST_GAINERS = [
  { sym: '◎', color: '#9945ff', name: 'Solana',     ticker: 'SOLUSDT', price: '218,30 USD', chg: '+8,42%', up: true },
  { sym: 'X', color: '#000',    name: 'XRP',        ticker: 'XRPUSDT', price: '2,481 USD',  chg: '+6,18%', up: true },
  { sym: 'L', color: '#345d9d', name: 'Litecoin',   ticker: 'LTCUSDT', price: '142,80 USD', chg: '+5,12%', up: true },
  { sym: 'A', color: '#0033ad', name: 'Cardano',    ticker: 'ADAUSDT', price: '1,124 USD',  chg: '+4,87%', up: true },
  { sym: 'D', color: '#c2a633', name: 'Dogecoin',   ticker: 'DOGEUSDT',price: '0,4218 USD', chg: '+3,98%', up: true },
];
const CRYPTO_LIST_LOSERS = [
  { sym: '₿', color: '#f7931a', name: 'Bitcoin',    ticker: 'BTCUSD',  price: '99.512 USD', chg: '−1,21%', up: false },
  { sym: 'Ξ', color: '#627eea', name: 'Ethereum',   ticker: 'ETHUSD',  price: '3.412 USD',  chg: '−0,86%', up: false },
  { sym: 'T', color: '#26a17b', name: 'Tether',     ticker: 'USDT',    price: '1,000 USD',  chg: '−0,02%', up: false },
  { sym: 'B', color: '#f0b90b', name: 'BNB',        ticker: 'BNBUSDT', price: '641,2 USD',  chg: '−1,87%', up: false },
  { sym: 'A', color: '#000',    name: 'Avalanche',  ticker: 'AVAXUSDT',price: '38,42 USD',  chg: '−2,47%', up: false },
];

// Section 4 — Futuros
const FUTURES_ENERGY = [
  { color: '#000',    name: 'Crudo WTI',     ticker: 'CL1!', price: '78,42 USD', chg: '−0,84%', up: false },
  { color: '#7b2ff7', name: 'Crudo Brent',   ticker: 'BZ1!', price: '82,18 USD', chg: '−1,47%', up: false },
  { color: '#0099ff', name: 'Gas Natural',   ticker: 'NG1!', price: '2,154 USD', chg: '−2,84%', up: false },
];
const FUTURES_METALS = [
  { color: '#f7a600', name: 'Oro',           ticker: 'GC1!', price: '2.341,5 USD', chg: '−0,42%', up: false },
  { color: '#c0c0c0', name: 'Plata',         ticker: 'SI1!', price: '28,42 USD',   chg: '−0,89%', up: false },
  { color: '#b87333', name: 'Cobre',         ticker: 'HG1!', price: '4,412 USD',   chg: '−0,47%', up: false },
];

// Section 5 — Forex
const FOREX_PAIRS = [
  { flagL: '🇪🇺', flagR: '🇺🇸', pair: 'EUR/USD', chg: 0.140, val: '1,0842'  },
  { flagL: '🇬🇧', flagR: '🇺🇸', pair: 'GBP/USD', chg: 0.140, val: '1,2641'  },
  { flagL: '🇺🇸', flagR: '🇯🇵', pair: 'USD/JPY', chg: -0.060,val: '157,21'  },
  { flagL: '🇦🇺', flagR: '🇺🇸', pair: 'AUD/USD', chg: 0.060, val: '0,6612'  },
  { flagL: '🇺🇸', flagR: '🇨🇦', pair: 'USD/CAD', chg: -0.125,val: '1,3712'  },
  { flagL: '🇺🇸', flagR: '🇨🇭', pair: 'USD/CHF', chg: 0.125, val: '0,8941'  },
  { flagL: '🇳🇿', flagR: '🇺🇸', pair: 'NZD/USD', chg: -0.124,val: '0,5984'  },
];

const NEWS = [
  { tag: 'anonjuan · Reuters', body: 'La Reserva Federal mantiene tipos: el mercado descuenta dos recortes para final de año.' },
  { tag: 'anonjuan · Reuters', body: 'Tesla anuncia récord de entregas en Europa pese a la presión competitiva china.' },
  { tag: 'anonjuan · Reuters', body: 'Bitcoin recupera los 99.500 USD tras la decisión de la SEC sobre ETF de Ethereum.' },
  { tag: 'anonjuan · Reuters', body: 'El IBEX 35 cierra plano: bancos compensan caídas en utilities tras el dato de IPC.' },
  { tag: 'anonjuan · Reuters', body: 'NVIDIA sorprende con beneficios y guía: el sector chips se dispara en pre-mercado.' },
  { tag: 'anonjuan · Reuters', body: 'El BCE prepara nuevo paquete de liquidez ante tensiones en bonos periféricos.' },
];

// Section 7 — Brokers — stacked-card logos per Figma (3 overlapping rounded squares)
const BROKERS = [
  { bg: '#2a2a2a', logoColors: ['#0d0d0d','#1a1a1a','#000'],   logoText: 'X', logoTextColor:'#fff', name: 'OKX',         tag: 'Cripto',  rating: '4.8 • Excelente' },
  { bg: '#2a2a2a', logoColors: ['#1c8eff','#1278d6','#0a5aa8'],logoText: '↑', logoTextColor:'#fff', name: 'AMP Futures', tag: 'Futuros', rating: '4.6 • Excelente' },
  { bg: '#2a2a2a', logoColors: ['#cdf500','#a8c800','#7a9300'],logoText: '◆', logoTextColor:'#000', name: 'WhiteBIT',    tag: 'Cripto',  rating: '4.4 • Muy bueno' },
];

const FOOTER_COLS = [
  { title: 'MÁS QUE UN PRODUCTO',     items: ['Supergráficos'] },
  { title: 'HERRAMIENTAS Y SUSCRIPCIONES', items: ['Funcionalidades','Precios','Datos de mercado','Regalar planes'] },
  { title: 'COMUNIDAD',               items: ['Red social','Muro del amor','Recomendar a un amigo','Normas internas','Moderadores'] },
  { title: 'SOLUCIONES PARA EMPRESAS',items: ['Widgets','Bibliotecas de gráficos','Lightweight Charts™','Gráficos avanzados','Plataforma de trading'] },
  { title: 'ANALIZADORES',            items: ['Acciones','ETF','Bonos','Criptomonedas','Pares CEX','Pares DEX','Pine'] },
  { title: 'TRADING',                 items: ['Resumen','Principales brokers','Comparación de brokers'] },
  { title: 'IDEAS',                   items: ['Trading','Formación','Selecciones de los editores'] },
  { title: 'OPORTUNIDADES DE CRECIMIENTO', items: ['Publicidad','Integración de brokers','Programa de socios','Programa de formación'] },
  { title: 'MAPAS DE CALOR',          items: ['Acciones','ETF','Criptomonedas'] },
  { title: 'OFERTAS ESPECIALES',      items: ['Futuros CME Group','Futuros Eurex','Paquete de acciones de EE.UU.'] },
  { title: 'PINE SCRIPT',             items: ['Indicadores y estrategias','Wizards','Autónomos','Espacios de pago'] },
  { title: 'CALENDARIOS',             items: ['Económico','Beneficios','Dividendos'] },
  { title: 'MÁS PRODUCTOS',           items: ['Curvas de rendimiento','Opciones','Mapas macro','Flujo de noticias','Pine Script®'] },
  { title: 'TIENDA',                  items: ['Tienda TradingView','Cartas de tarot para traders','C63 TradeTime'] },
  { title: 'ACERCA DE LA EMPRESA',    items: ['Quiénes somos','Misión espacial','Blog','Ofertas de empleo','Kit de medios'] },
  { title: 'APLICACIONES',            items: ['Móvil','Desktop'] },
  { title: 'POLÍTICAS Y SEGURIDAD',   items: ['Condiciones de uso','Exención de responsabilidad','Política de privacidad','Política de cookies','Declaración de accesibilidad','Consejos de seguridad','Programa de recompensas por encontrar errores','Página de estado'] },
];

/* ─────────────────────── HELPERS ─────────────────────── */

const isUp = (s) => typeof s === 'string' ? s.trim().startsWith('+') : !!s;
const chgClass = (s) => isUp(s) ? 'up' : 'dn';

function logoCircle(letter, color, size = 28) {
  return `<span class="mo-logo" style="background:${color};width:${size}px;height:${size}px;font-size:${Math.round(size*0.42)}px">${letter}</span>`;
}

function tickerRow(it, opts = {}) {
  const sym = it.sym || it.letter || it.ticker?.[0] || '·';
  const color = it.color || '#3d3d3d';
  return `
    <div class="mo-row" data-ticker="${it.ticker || ''}">
      ${logoCircle(sym, color)}
      <div class="mo-row-main">
        <div class="mo-row-name">${it.name || it.ticker}</div>
        <div class="mo-row-sub">${it.sub || it.ticker || ''}</div>
      </div>
      <div class="mo-row-vals">
        <div class="mo-row-price">${it.price || ''}</div>
        ${it.chg ? `<div class="mo-row-chg ${chgClass(it.chg)}">${it.chg}</div>` : ''}
        ${it.vol ? `<div class="mo-row-vol">${it.vol}</div>` : ''}
      </div>
    </div>`;
}

function pillBadge(text, cls) {
  return `<span class="mo-pill ${cls || ''}">${text}</span>`;
}

function sectionHeader(title, hint) {
  return `<h2 class="mo-h2"><a>${title} <span class="mo-arrow">›</span></a>${hint ? `<span class="mo-hint">${hint}</span>` : ''}</h2>`;
}

function subHeader(title) {
  return `<h3 class="mo-h3"><a>${title} <span class="mo-arrow">›</span></a></h3>`;
}

/* ─────────────────────── BUILDERS ─────────────────────── */

function buildHeader() {
  const links = NAV_LINKS.map(l => `<a class="mo-nav-link">${l.label}</a>`).join('');
  return `
<header class="mo-header">
  <div class="mo-header-inner">
    <a class="mo-brand" id="mo-brand">
      <span class="mo-brand-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M2 5h11v3.5H8.75V22H5.25V8.5H2V5z" fill="#fff"/>
          <path d="M14 5h11v3.5h-4.25l5 13.5h-3.7L17.5 8.5H14V5z" fill="#fff"/>
          <circle cx="22" cy="19" r="3.2" fill="#2962ff"/>
        </svg>
      </span>
      <span class="mo-brand-name">TradingView</span>
    </a>
    <div class="mo-search">
      <span class="mo-search-icon">⌕</span>
      <span class="mo-search-text">Buscar (Ctrl+K)</span>
    </div>
    <nav class="mo-nav">${links}</nav>
    <div class="mo-header-right">
      <button class="mo-avatar"><span>H</span><i class="mo-avatar-dot"></i></button>
      <button class="mo-cta">Ampliar</button>
    </div>
  </div>
</header>`;
}

function buildSection1() {
  const principalRows = PRINCIPAL_INDICES.slice(1).map(idx => `
    <div class="mo-idx-row" data-ticker="${idx.sub}">
      ${logoCircle(idx.letter, idx.color, 24)}
      <div class="mo-idx-name">${idx.name}</div>
      <div class="mo-idx-sub">${idx.sub}</div>
      <div class="mo-idx-vals">
        <div class="mo-idx-price">${idx.price}</div>
        <div class="mo-idx-chg ${chgClass(idx.chg)}">${idx.chg}</div>
      </div>
    </div>`).join('');

  const cryptoRows = CRYPTO_ROWS.map(tickerRow).join('');
  const commodityRows = COMMODITY_ROWS.map(tickerRow).join('');
  const futuresRows = FUTURES_ROWS.map(tickerRow).join('');

  const ideaCards = IDEA_CARDS.map((idea, i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-idea-${i}">
      <div class="mo-idea-chart" id="mo-idea-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  const editorCards = EDITOR_PICKS.map((idea, i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-edit-${i}">
      <div class="mo-idea-chart" id="mo-edit-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Resumen de mercado')}

  <div class="mo-dashboard">
    <!-- main IBEX card -->
    <div class="mo-card mo-main-card" data-ticker="IBX">
      <div class="mo-main-head">
        ${logoCircle('35', '#2962ff', 56)}
        <div class="mo-main-info">
          <div class="mo-main-title-row">
            <span class="mo-main-title">IBEX 35</span>
            <span class="mo-pill mo-pill-blue">IBC</span>
            <button class="mo-star">☆</button>
          </div>
          <div class="mo-main-price-row">
            <span class="mo-main-price">17.985,30</span>
            <span class="mo-main-unit"><span>D</span><span>POINT</span></span>
            <span class="mo-main-chg up">+0,06%</span>
          </div>
        </div>
      </div>
      <div class="mo-main-chart" id="mo-ibex-chart"></div>
    </div>

    <!-- principal indices sidebar -->
    <div class="mo-card mo-side-card">
      <div class="mo-side-title">Principales índices</div>
      <div class="mo-side-list">${principalRows}</div>
      <a class="mo-link">Ver los principales índices ›</a>
    </div>

    <!-- 3 widget cards -->
    <div class="mo-card mo-mini-card">
      <div class="mo-mini-head">
        ${logoCircle('₿', '#f7931a', 24)}
        <span class="mo-mini-title">Cap. de mercado cripto</span>
        <span class="mo-pill mo-pill-grey">TOTAL</span>
      </div>
      <div class="mo-mini-price-row">
        <span class="mo-mini-price">2,55 T</span>
        <span class="mo-mini-unit">USD</span>
      </div>
      <div class="mo-mini-chg dn">−1,52%</div>
      <div class="mo-mini-chart" id="mo-spark-1"></div>
      <div class="mo-stack-bar"><span style="width:42%;background:#f7931a"></span><span style="width:18%;background:#627eea"></span><span style="width:40%;background:#3d3d3d"></span></div>
      <div class="mo-stack-legend"><span><i style="background:#f7931a"></i>Bitcoin</span><span><i style="background:#627eea"></i>Ethereum</span><span><i style="background:#8c8c8c"></i>Otros</span></div>
      ${cryptoRows}
      <a class="mo-link">Ver todas las criptomonedas ›</a>
    </div>

    <div class="mo-card mo-mini-card">
      <div class="mo-mini-head">
        ${logoCircle('Au', '#f7a600', 24)}
        <span class="mo-mini-title">Datos del oro</span>
        <span class="mo-pill mo-pill-grey">XAU</span>
      </div>
      <div class="mo-mini-price-row">
        <span class="mo-mini-price">2.341,50</span>
        <span class="mo-mini-unit">USD</span>
      </div>
      <div class="mo-mini-chg dn">−0,31%</div>
      <div class="mo-mini-chart" id="mo-spark-2"></div>
      ${commodityRows}
      <a class="mo-link">Ver todas las materias primas ›</a>
    </div>

    <div class="mo-card mo-mini-card">
      <div class="mo-mini-head">
        ${logoCircle('B', '#089981', 24)}
        <span class="mo-mini-title">Rendimiento a 10 años de España</span>
        <span class="mo-pill mo-pill-grey">10Y</span>
      </div>
      <div class="mo-mini-price-row">
        <span class="mo-mini-price">3,424%</span>
      </div>
      <div class="mo-mini-chg up">+0,01%</div>
      <div class="mo-mini-chart" id="mo-spark-3"></div>
      ${futuresRows}
      <a class="mo-link">Ver todos los bonos ›</a>
    </div>
  </div>

  <!-- Selecciones de los editores -->
  <div class="mo-subsection">
    ${subHeader('Selecciones de los editores')}
    <div class="mo-ideas-grid">${editorCards}</div>
  </div>

  <!-- Ideas de la comunidad -->
  <div class="mo-subsection">
    ${subHeader('Ideas de la comunidad')}
    <div class="mo-ideas-grid">${ideaCards}</div>
  </div>
</section>`;
}

function buildSection2() {
  const topCards = SPANISH_STOCKS_TOP.map(s => `
    <div class="mo-stat-card" data-ticker="${s.ticker}">
      <div class="mo-stat-head">${logoCircle(s.ticker[0],'#2962ff',24)}<span>${s.ticker}</span></div>
      <div class="mo-stat-price">${s.price}</div>
      <div class="mo-stat-chg ${chgClass(s.chg)}">${s.chg}</div>
    </div>`).join('');

  const ideas = EDITOR_PICKS.map((idea, i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-sp-idea-${i}">
      <div class="mo-idea-chart" id="mo-sp-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  const gainers = SPANISH_GAINERS.map(s => `
    <div class="mo-list-row" data-ticker="${s.ticker}">
      ${logoCircle(s.ticker[0],'#2962ff',24)}
      <div class="mo-list-info"><div class="mo-list-name">${s.ticker}</div><div class="mo-list-sub">${s.name}</div></div>
      <div class="mo-list-price">${s.price}</div>
      <div class="mo-chg-pill up">${s.chg}</div>
    </div>`).join('');

  const losers = SPANISH_LOSERS.map(s => `
    <div class="mo-list-row" data-ticker="${s.ticker}">
      ${logoCircle(s.ticker[0],'#f23645',24)}
      <div class="mo-list-info"><div class="mo-list-name">${s.ticker}</div><div class="mo-list-sub">${s.name}</div></div>
      <div class="mo-list-price">${s.price}</div>
      <div class="mo-chg-pill dn">${s.chg}</div>
    </div>`).join('');

  const active = SPANISH_ACTIVE.map(s => `
    <div class="mo-active-card" data-ticker="${s.ticker}">
      ${logoCircle(s.ticker[0],'#2962ff',32)}
      <div class="mo-active-info"><div>${s.ticker}</div><div class="mo-list-sub">${s.name}</div></div>
      <div class="mo-active-vol">${s.vol}</div>
    </div>`).join('');

  const news = NEWS.slice(0,4).map(n => `
    <div class="mo-news-item">
      <div class="mo-news-tag"><span class="mo-news-dot"></span>${n.tag}</div>
      <div class="mo-news-body">${n.body}</div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Acciones españolas')}
  <div class="mo-stat-row">${topCards}</div>

  ${subHeader('Ideas de trading')}
  <div class="mo-ideas-grid">${ideas}</div>

  <div class="mo-two-col">
    <div>
      ${subHeader('Mayor ganancia del día')}
      <div class="mo-list">${gainers}</div>
      <a class="mo-link">Ver todas las acciones con mayor ganancia ›</a>
    </div>
    <div>
      ${subHeader('Mayor pérdida del día')}
      <div class="mo-list">${losers}</div>
      <a class="mo-link">Ver todas las acciones con mayor pérdida ›</a>
    </div>
  </div>

  ${subHeader('Las más activas')}
  <div class="mo-active-row">${active}</div>

  ${subHeader('Noticias sobre acciones españolas')}
  <div class="mo-news-grid">${news}</div>

  <a class="mo-link">Seguir leyendo ›</a>
</section>`;
}

function buildSection3() {
  const cryptoCards = CRYPTO_ROWS.concat([
    { sym:'X', color:'#000', name:'XRP', ticker:'XRPUSDT', price:'2,48 USD', chg:'+6,18%', up:true },
    { sym:'◎', color:'#9945ff', name:'Solana', ticker:'SOLUSDT', price:'218 USD', chg:'+8,42%', up:true },
  ]).slice(0,4).map(c => `
    <div class="mo-stat-card" data-ticker="${c.ticker}">
      <div class="mo-stat-head">${logoCircle(c.sym, c.color, 24)}<span>${c.ticker}</span></div>
      <div class="mo-stat-price">${c.price}</div>
      <div class="mo-stat-chg ${chgClass(c.chg)}">${c.chg}</div>
    </div>`).join('');

  const ideas = IDEA_CARDS.map((idea,i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-cr-idea-${i}">
      <div class="mo-idea-chart" id="mo-cr-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  const gainers = CRYPTO_LIST_GAINERS.map(c => `
    <div class="mo-list-row" data-ticker="${c.ticker}">
      ${logoCircle(c.sym,c.color,24)}
      <div class="mo-list-info"><div class="mo-list-name">${c.ticker}</div><div class="mo-list-sub">${c.name}</div></div>
      <div class="mo-list-price">${c.price}</div>
      <div class="mo-chg-pill up">${c.chg}</div>
    </div>`).join('');
  const losers = CRYPTO_LIST_LOSERS.map(c => `
    <div class="mo-list-row" data-ticker="${c.ticker}">
      ${logoCircle(c.sym,c.color,24)}
      <div class="mo-list-info"><div class="mo-list-name">${c.ticker}</div><div class="mo-list-sub">${c.name}</div></div>
      <div class="mo-list-price">${c.price}</div>
      <div class="mo-chg-pill dn">${c.chg}</div>
    </div>`).join('');
  const news = NEWS.slice(0,6).map(n => `
    <div class="mo-news-item">
      <div class="mo-news-tag"><span class="mo-news-dot"></span>${n.tag}</div>
      <div class="mo-news-body">${n.body}</div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Cripto')}
  ${subHeader('Tendencias de la comunidad')}
  <div class="mo-stat-row">${cryptoCards}</div>

  ${subHeader('Ideas de trading')}
  <div class="mo-ideas-grid">${ideas}</div>

  <div class="mo-two-col">
    <div>
      ${subHeader('Criptomonedas ganadoras')}
      <div class="mo-list">${gainers}</div>
      <a class="mo-link">Ver todas las monedas con mayor crecimiento diario ›</a>
    </div>
    <div>
      ${subHeader('Criptomonedas perdedoras')}
      <div class="mo-list">${losers}</div>
      <a class="mo-link">Ver todas las monedas con mayor caída diaria ›</a>
    </div>
  </div>

  ${subHeader('Noticias sobre criptomonedas')}
  <div class="mo-news-grid">${news}</div>
  <a class="mo-link">Seguir leyendo ›</a>
</section>`;
}

function buildSection4() {
  const ideas = EDITOR_PICKS.map((idea,i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-fu-idea-${i}">
      <div class="mo-idea-chart" id="mo-fu-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  const energy = FUTURES_ENERGY.map(f => `
    <div class="mo-list-row" data-ticker="${f.ticker}">
      ${logoCircle(f.ticker[0],f.color,24)}
      <div class="mo-list-info"><div class="mo-list-name">${f.ticker}</div><div class="mo-list-sub">${f.name}</div></div>
      <div class="mo-list-price">${f.price}</div>
      <div class="mo-chg-pill ${chgClass(f.chg)}">${f.chg}</div>
    </div>`).join('');
  const metals = FUTURES_METALS.map(f => `
    <div class="mo-list-row" data-ticker="${f.ticker}">
      ${logoCircle(f.ticker[0],f.color,24)}
      <div class="mo-list-info"><div class="mo-list-name">${f.ticker}</div><div class="mo-list-sub">${f.name}</div></div>
      <div class="mo-list-price">${f.price}</div>
      <div class="mo-chg-pill ${chgClass(f.chg)}">${f.chg}</div>
    </div>`).join('');
  const news = NEWS.slice(0,6).map(n => `
    <div class="mo-news-item">
      <div class="mo-news-tag"><span class="mo-news-dot"></span>${n.tag}</div>
      <div class="mo-news-body">${n.body}</div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Futuros y materias primas')}
  ${subHeader('Ideas de trading')}
  <div class="mo-ideas-grid">${ideas}</div>

  <div class="mo-two-col">
    <div>
      ${subHeader('Futuros de energía')}
      <div class="mo-list">${energy}</div>
      <a class="mo-link">Ver todos los futuros de energía ›</a>
    </div>
    <div>
      ${subHeader('Futuros de metales')}
      <div class="mo-list">${metals}</div>
      <a class="mo-link">Ver todos los futuros de metales ›</a>
    </div>
  </div>

  ${subHeader('Noticias sobre futuros')}
  <div class="mo-news-grid">${news}</div>
  <a class="mo-link">Seguir leyendo ›</a>
</section>`;
}

function buildSection5() {
  const ideas = EDITOR_PICKS.map((idea,i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-fx-idea-${i}">
      <div class="mo-idea-chart" id="mo-fx-chart-${i}"></div>
      <div class="mo-idea-body">
        <div class="mo-idea-meta">
          <span class="mo-mini-logo" style="background:${idea.up ? '#089981' : '#f23645'}">${idea.ticker[0]}</span>
          <span class="mo-idea-ticker">${idea.ticker}</span>
          <span class="mo-idea-exch">${idea.exch}</span>
        </div>
        <div class="mo-idea-title">${idea.title}</div>
        <div class="mo-idea-author">${idea.author}</div>
      </div>
    </div>`).join('');

  const fxRows = FOREX_PAIRS.map(p => {
    const pct = p.chg;
    const isUpFx = pct >= 0;
    const half = 50;
    const w = Math.min(45, Math.abs(pct) * 200);
    const left = isUpFx ? half : half - w;
    const colour = isUpFx ? '#089981' : '#f23645';
    return `
    <div class="mo-fx-row" data-ticker="${p.pair}">
      <span class="mo-fx-pair">${p.flagL}${p.flagR} ${p.pair}</span>
      <div class="mo-fx-bar"><div class="mo-fx-bar-mid"></div><div class="mo-fx-bar-fill" style="left:${left}%;width:${w}%;background:${colour}"></div></div>
      <span class="mo-fx-val ${isUpFx?'up':'dn'}">${(pct*100).toFixed(2).replace('.',',')}%</span>
    </div>`;
  }).join('');

  const news = NEWS.slice(0,6).map(n => `
    <div class="mo-news-item">
      <div class="mo-news-tag"><span class="mo-news-dot"></span>${n.tag}</div>
      <div class="mo-news-body">${n.body}</div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Forex y divisas')}
  ${subHeader('Ideas de trading')}
  <div class="mo-ideas-grid">${ideas}</div>

  ${subHeader('Rendimiento del mercado de divisas')}
  <div class="mo-fx-table">
    ${fxRows}
    <div class="mo-fx-foot"><span>1D</span><a class="mo-link">Ver todos los tipos ›</a></div>
  </div>

  ${subHeader('Noticias sobre divisas')}
  <div class="mo-news-grid">${news}</div>
  <a class="mo-link">Seguir leyendo ›</a>
</section>`;
}

function buildSection6() {
  const calendar = [
    { flag:'🇰🇷', when:'Mañana · 02:00', name:"Buddha's Birthday" },
    { flag:'🇺🇸', when:'Mañana · 02:00', name:'Memorial Day' },
    { flag:'🇦🇷', when:'Mañana · 02:00', name:'National Day' },
    { flag:'🇫🇷', when:'Mañana · 02:00', name:'Pentecost Monday' },
  ].map(e => `
    <div class="mo-cal-card">
      <div class="mo-cal-when">${e.when} <span class="mo-cal-imp">⋮⋮⋮</span></div>
      <div class="mo-cal-name">${e.flag} ${e.name}</div>
      <div class="mo-cal-foot"><span>Real</span><span>Previsión</span><span>Anterior</span></div>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Economía')}
  ${subHeader('Mapa mundial de la inflación')}
  <div class="mo-map-card">
    <div class="mo-map-placeholder">
      <div class="mo-map-grad"></div>
      <div class="mo-map-legend"><span>0%</span><span>7%</span><span>25%</span></div>
    </div>
  </div>
  <a class="mo-link">Ver más tendencias mundiales ›</a>

  ${subHeader('Calendario económico')}
  <div class="mo-cal-row">${calendar}</div>
  <a class="mo-link">Ver todos los eventos del mercado ›</a>
</section>`;
}

function buildSection7() {
  const brokers = BROKERS.map(b => `
    <div class="mo-broker-card" style="background:${b.bg}">
      <div class="mo-broker-logo-stack">
        <span class="mo-bls mo-bls-3" style="background:${b.logoColors[2]}"></span>
        <span class="mo-bls mo-bls-2" style="background:${b.logoColors[1]}"></span>
        <span class="mo-bls mo-bls-1" style="background:${b.logoColors[0]};color:${b.logoTextColor}">${b.logoText}</span>
      </div>
      <div class="mo-broker-info">
        <div class="mo-broker-name">${b.name}</div>
        <div class="mo-broker-tag">${b.tag}</div>
      </div>
      <div class="mo-broker-rating">★ ${b.rating} <span class="mo-verified">✓</span></div>
      <button class="mo-broker-btn">Abrir cuenta ↗</button>
    </div>`).join('');

  return `
<section class="mo-section">
  ${sectionHeader('Trading y brokers')}
  <p class="mo-lead">Opere directamente en los Supergráficos a través de nuestros brokers compatibles, totalmente verificados y evaluados por los usuarios.</p>
  <div class="mo-brokers-row">${brokers}</div>
</section>`;
}

function buildLookFirstStrip() {
  return `<div class="mo-look-first"><span>LOOK FIRST / THEN LEAP.</span></div>`;
}

function buildStickyBar() {
  const tabs = STICKY_TABS.map(t => {
    const obj = typeof t === 'string' ? { label: t } : t;
    return `<a class="mo-sticky-tab${obj.active ? ' active' : ''}">${obj.label}</a>`;
  }).join('');
  return `<div class="mo-sticky-bar"><div class="mo-sticky-tabs">${tabs}</div></div>`;
}

function buildFooter() {
  const cols = FOOTER_COLS.map(c => `
    <div class="mo-foot-col">
      <div class="mo-foot-title">${c.title}</div>
      ${c.items.map(it => `<a class="mo-foot-link">${it}</a>`).join('')}
    </div>`).join('');

  return `
<footer class="mo-footer">
  <div class="mo-footer-inner">
    <div class="mo-foot-brand">
      <div class="mo-foot-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M2 5h11v3.5H8.75V22H5.25V8.5H2V5z" fill="#fff"/>
          <path d="M14 5h11v3.5h-4.25l5 13.5h-3.7L17.5 8.5H14V5z" fill="#fff"/>
          <circle cx="22" cy="19" r="3.2" fill="#2962ff"/>
        </svg>
        <span>TradingView</span>
      </div>
      <div class="mo-foot-tag">Look first / Then leap.</div>
      <div class="mo-foot-social">
        <a>𝕏</a><a>f</a><a>▶</a><a>📷</a><a>in</a><a>✈</a><a>🎵</a><a>r</a>
      </div>
      <div class="mo-foot-lang">🌐 Español ▾</div>
      <p class="mo-foot-small">Los datos de mercado seleccionados los proporciona <a class="mo-foot-a">ICE Data Services</a>.</p>
      <p class="mo-foot-small">Los datos de referencia escogidos los suministra FactSet. Copyright © 2026 FactSet Research Systems Inc.</p>
      <p class="mo-foot-small">Copyright © 2026, American Bankers Association. La base de datos CUSIP proviene de FactSet Research Systems Inc. Todos los derechos reservados.</p>
      <p class="mo-foot-small">Los documentos presentados ante la SEC y otros, los facilita <a class="mo-foot-a">Quartr</a>.</p>
      <p class="mo-foot-small">© 2026 TradingView, Inc.</p>
    </div>
    <div class="mo-foot-cols">${cols}</div>
  </div>
</footer>`;
}

function buildRightSidebar() {
  return `
<aside class="mo-rightbar">
  <div class="mo-rb-icon" title="Lista de seguimiento">★</div>
  <div class="mo-rb-icon" title="Alertas">🔔</div>
  <div class="mo-rb-icon" title="Datos">📊</div>
  <div class="mo-rb-icon" title="Calendario">📅</div>
  <div class="mo-rb-icon" title="Chat">💬</div>
  <div class="mo-rb-icon" title="Ideas">💡</div>
  <div class="mo-rb-icon" title="Notas">📝</div>
  <div class="mo-rb-icon" title="Configuración">⚙</div>
</aside>`;
}

/* ───────────────────── CHART HELPERS ───────────────────── */

function makeSparkline(container, data, up, opts = {}) {
  if (!container) return;
  const color = up ? '#089981' : '#f23645';
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: 'transparent' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    leftPriceScale: { visible: false },
    rightPriceScale: { visible: false },
    timeScale: { visible: false },
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    handleScroll: false,
    handleScale: false,
    width: container.clientWidth || 300,
    height: container.clientHeight || 80,
  });
  const series = chart.addSeries(AreaSeries, {
    lineColor: color,
    topColor: color + '55',
    bottomColor: color + '00',
    lineWidth: 1.5,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });
  series.setData(data);
  chart.timeScale().fitContent();
  return chart;
}

function makeIBEX(container, data) {
  if (!container) return;
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: '#787b86' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    leftPriceScale: { visible: false },
    rightPriceScale: { visible: true, borderVisible: false, textColor: '#787b86' },
    timeScale: {
      visible: true,
      borderVisible: false,
      timeVisible: true,
      tickMarkFormatter: (t) => {
        const d = new Date(t * 1000);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      },
    },
    crosshair: { mode: 1 },
    handleScroll: false,
    handleScale: false,
    width: container.clientWidth || 600,
    height: container.clientHeight || 360,
  });
  const series = chart.addSeries(AreaSeries, {
    lineColor: '#f23645',
    topColor: 'rgba(242,54,69,0.30)',
    bottomColor: 'rgba(242,54,69,0.00)',
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  series.setData(data);
  chart.timeScale().fitContent();
  return chart;
}

function makeMiniCandles(container, data, up) {
  if (!container) return;
  const chart = createChart(container, {
    layout: { background: { color: '#0d1418' }, textColor: 'transparent' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    leftPriceScale: { visible: false },
    rightPriceScale: { visible: false },
    timeScale: { visible: false },
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    handleScroll: false,
    handleScale: false,
    width: container.clientWidth || 300,
    height: container.clientHeight || 160,
  });
  const series = chart.addSeries(CandlestickSeries, {
    upColor: '#089981', downColor: '#f23645',
    borderUpColor: '#089981', borderDownColor: '#f23645',
    wickUpColor: '#089981', wickDownColor: '#f23645',
  });
  series.setData(data);
  chart.timeScale().fitContent();
  return chart;
}

/* ────────────────────── MAIN EXPORT ────────────────────── */

export function renderMarketOverview(container, onChartNav) {
  container.innerHTML = `
<div class="mo-page" id="mo-page">
  ${buildHeader()}
  <div class="mo-body">
    <main class="mo-main">
      ${buildSection1()}
      ${buildSection2()}
      ${buildSection3()}
      ${buildSection4()}
      ${buildSection5()}
      ${buildSection6()}
      ${buildSection7()}
      ${buildLookFirstStrip()}
      ${buildFooter()}
    </main>
    ${buildRightSidebar()}
  </div>
  ${buildStickyBar()}
</div>`;

  // Click-to-navigate (any element with [data-ticker] goes to NVDA chart)
  container.querySelectorAll('[data-ticker]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      if (typeof onChartNav === 'function') onChartNav();
      else window.location.hash = '#/chart/NVDA';
    });
  });
  container.querySelector('#mo-brand')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Charts — wait a tick for layout
  requestAnimationFrame(() => {
    const ibex = document.getElementById('mo-ibex-chart');
    if (ibex) makeIBEX(ibex, generateIBEXIntraday());

    makeSparkline(document.getElementById('mo-spark-1'), generateSparkline(1, false), false);
    makeSparkline(document.getElementById('mo-spark-2'), generateSparkline(2, false), false);

    // Spain 10Y as bars/area
    const s3 = document.getElementById('mo-spark-3');
    if (s3) {
      const chart = createChart(s3, {
        layout: { background: { color: 'transparent' }, textColor: 'transparent' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        leftPriceScale: { visible: false },
        rightPriceScale: { visible: false },
        timeScale: { visible: false },
        handleScroll: false, handleScale: false,
        width: s3.clientWidth || 300, height: s3.clientHeight || 80,
      });
      const series = chart.addSeries(HistogramSeries, { color: '#089981' });
      series.setData(generateBars(7));
      chart.timeScale().fitContent();
    }

    // Idea cards
    [
      ['mo-idea-chart-', IDEA_CARDS],
      ['mo-edit-chart-', EDITOR_PICKS],
      ['mo-sp-chart-',   EDITOR_PICKS],
      ['mo-cr-chart-',   IDEA_CARDS],
      ['mo-fu-chart-',   EDITOR_PICKS],
      ['mo-fx-chart-',   EDITOR_PICKS],
    ].forEach(([prefix, list]) => {
      list.forEach((it, i) => {
        const el = document.getElementById(prefix + i);
        if (el) makeMiniCandles(el, generateMiniCandles(it.seed + i, it.up), it.up);
      });
    });
  });
}
