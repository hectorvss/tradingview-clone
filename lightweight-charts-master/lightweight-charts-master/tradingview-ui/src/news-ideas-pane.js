// news-ideas-pane.js — TradingView-style News + Ideas + Analysis streaming sidebar pane
// Public API:
//   createNewsIdeasPane(container, opts = {}) -> { render(), refresh(), destroy() }
// opts:
//   onSelectSymbol(ticker)  - called when ticker chip or headline clicked
//   onOpenIdea(ideaId)      - called when an idea / analysis card clicked
//   defaultTab              - 'news' | 'ideas' | 'analysis' (default 'news')
//   lightweightCharts       - optional reference to the lightweight-charts module
//                             (auto-imported from CDN if missing, falls back to canvas sparkline)

import { ensurePolishStyles, emptyStateHTML } from './ui-polish.js';

// ---------------------------------------------------------------------------
// One-time CSS injection
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.nip-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: var(--grey-6, #0f0f0f);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  font-size: 12px;
}
.nip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #1e222d;
  background: #131722;
  flex-shrink: 0;
}
.nip-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  letter-spacing: 0.2px;
}
.nip-refresh {
  background: transparent;
  border: 1px solid #2a2e39;
  color: #b2b5be;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all .15s;
}
.nip-refresh:hover { background: #1e222d; color: #d1d4dc; border-color: #363a45; }
.nip-refresh.spinning svg { animation: nip-spin .8s linear infinite; }
@keyframes nip-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }

.nip-tabs {
  display: flex;
  border-bottom: 1px solid #1e222d;
  background: #131722;
  flex-shrink: 0;
}
.nip-tab {
  flex: 1;
  padding: 9px 8px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #787b86;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  letter-spacing: 0.2px;
}
.nip-tab:hover { color: #b2b5be; }
.nip-tab.active {
  color: #2962ff;
  border-bottom-color: #2962ff;
}

.nip-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  flex-shrink: 0;
  background: #0f1117;
  border-bottom: 1px solid #1e222d;
  scrollbar-width: none;
}
.nip-toolbar::-webkit-scrollbar { display: none; }
.nip-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  background: #1e222d;
  color: #b2b5be;
  font-size: 11px;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.nip-chip:hover { background: #2a2e39; color: #d1d4dc; }
.nip-chip.active {
  background: rgba(41, 98, 255, 0.15);
  color: #2962ff;
  border-color: rgba(41, 98, 255, 0.35);
}

.nip-sort {
  margin-left: auto;
  background: #131722;
  border: 1px solid #2a2e39;
  color: #b2b5be;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.nip-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: #2a2e39 transparent;
}
.nip-list::-webkit-scrollbar { width: 8px; }
.nip-list::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
.nip-list::-webkit-scrollbar-track { background: transparent; }

/* News card */
.nip-news-item {
  padding: 10px 12px;
  border-bottom: 1px solid #1a1d27;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background .15s;
  position: relative;
}
.nip-news-item:hover { background: #131722; }
.nip-news-item.imp-high { border-left-color: #f23645; }
.nip-news-item.imp-medium { border-left-color: #ff9800; }
.nip-news-item.imp-low { border-left-color: transparent; }

.nip-news-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #787b86;
  margin-bottom: 4px;
}
.nip-news-source {
  font-weight: 600;
  color: #b2b5be;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.nip-news-dot { color: #4a4d57; }
.nip-news-headline {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  line-height: 1.35;
  margin: 2px 0 4px 0;
}
.nip-news-headline:hover { color: #2962ff; }
.nip-news-snippet {
  font-size: 11px;
  color: #9598a1;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nip-news-tickers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.nip-ticker-chip {
  display: inline-block;
  padding: 1px 6px;
  background: #1e222d;
  color: #2962ff;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.nip-ticker-chip:hover { background: #2a2e39; color: #5b8def; }

/* Idea card */
.nip-idea-item {
  padding: 12px;
  border-bottom: 1px solid #1a1d27;
  cursor: pointer;
  transition: background .15s;
}
.nip-idea-item:hover { background: #131722; }
.nip-idea-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.nip-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2962ff, #1e88e5);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nip-author {
  font-size: 11px;
  font-weight: 600;
  color: #d1d4dc;
}
.nip-rep {
  font-size: 10px;
  color: #787b86;
  margin-left: 4px;
}
.nip-time {
  font-size: 10px;
  color: #787b86;
  margin-left: auto;
}
.nip-idea-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 4px 0;
  line-height: 1.35;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.nip-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.nip-tag-long { background: rgba(38, 166, 154, 0.18); color: #26a69a; }
.nip-tag-short { background: rgba(242, 54, 69, 0.18); color: #f23645; }
.nip-idea-body {
  font-size: 11px;
  color: #9598a1;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 4px 0 8px;
}
.nip-idea-body.long {
  -webkit-line-clamp: 6;
}
.nip-thumb {
  width: 100%;
  height: 72px;
  background: #0a0d14;
  border: 1px solid #1e222d;
  border-radius: 4px;
  margin: 6px 0;
  position: relative;
  overflow: hidden;
}
.nip-thumb canvas { display: block; width: 100%; height: 100%; }
.nip-mini-chart {
  width: 100%;
  height: 120px;
  background: #0a0d14;
  border: 1px solid #1e222d;
  border-radius: 4px;
  margin: 8px 0;
  overflow: hidden;
  position: relative;
}
.nip-idea-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 10px;
  color: #787b86;
  margin-top: 6px;
}
.nip-idea-foot span { display: inline-flex; align-items: center; gap: 4px; }
.nip-idea-foot .nip-fcount { color: #b2b5be; }

.nip-empty {
  padding: 32px 16px;
  text-align: center;
  color: #787b86;
  font-size: 12px;
}
`;
  const style = document.createElement('style');
  style.setAttribute('data-nip-styles', '1');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Synthetic data generation
// ---------------------------------------------------------------------------
const SOURCES = ['Reuters', 'Bloomberg', 'CNBC', 'Investing', 'MarketWatch'];
const CATEGORIES = ['Mercado', 'Cripto', 'Forex', 'Macro', 'Earnings'];
const TICKERS_STOCK = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'JPM', 'BAC', 'XOM', 'CVX', 'WMT', 'DIS', 'BA', 'KO', 'PEP', 'V'];
const TICKERS_CRYPTO = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'ADAUSD', 'DOGEUSD', 'XRPUSD', 'AVAXUSD', 'LINKUSD', 'DOTUSD'];
const TICKERS_FX = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
const TICKERS_MACRO = ['DXY', 'SPX', 'NDX', 'DJI', 'VIX', 'US10Y', 'GOLD', 'WTI', 'COPPER'];

const NEWS_TEMPLATES = {
  Mercado: [
    ['Wall Street abre con sesgo {dir} ante datos de empleo en EE.UU.', 'Los principales índices registran una jornada {dir2} mientras los inversores digieren las cifras de nóminas no agrícolas y revisan exposición sectorial.'],
    ['Sector tecnológico lidera {dir3} en la sesión de Nueva York', 'Las acciones de megacaps tecnológicas registran movimientos significativos tras los últimos resultados trimestrales y guías corporativas.'],
    ['Volatilidad repunta en pre-mercado tras revisión de calificaciones', 'Las agencias actualizan su perspectiva sobre el sector bancario regional, generando reacciones inmediatas en futuros.'],
    ['Volumen institucional supera la media en {sym}', 'Detección de bloques compradores significativos sugiere reposicionamiento de fondos antes del cierre semanal.'],
  ],
  Cripto: [
    ['Bitcoin {dir} con fuerza tras superar resistencia clave', 'El activo digital extiende su movimiento mientras los flujos hacia ETF spot mantienen niveles récord durante la semana.'],
    ['Ethereum lidera repunte de altcoins con avance de {pct}%', 'Las actualizaciones de la red y la actividad on-chain alimentan el optimismo entre los traders institucionales.'],
    ['Reguladores anuncian nuevo marco para stablecoins en EU', 'La propuesta busca armonizar requisitos de reservas y transparencia operativa para emisores europeos.'],
    ['Ballena mueve {amt} BTC tras meses de inactividad', 'La transacción on-chain genera especulación sobre posibles distribuciones o reorganización de cold storage.'],
  ],
  Forex: [
    ['EURUSD cae a mínimos de 3 semanas ante divergencia BCE/Fed', 'El par retrocede mientras los mercados ajustan expectativas sobre la senda de tipos en ambos lados del Atlántico.'],
    ['Yen japonés se aprecia tras intervención verbal del MoF', 'Las autoridades niponas reiteran su preocupación por movimientos especulativos excesivos en el cruce.'],
    ['Libra esterlina rebota tras dato de inflación más fuerte', 'Los precios subyacentes del Reino Unido sorprenden al alza, reavivando apuestas por una pausa más prolongada del BoE.'],
  ],
  Macro: [
    ['Powell sugiere paciencia antes de futuros recortes de tipos', 'El presidente de la Fed enfatiza dependencia de datos y advierte sobre riesgos de aflojar la política prematuramente.'],
    ['IPC subyacente de la eurozona se modera al {pct}% interanual', 'La cifra refuerza el escenario de aterrizaje suave y abre espacio para que el BCE considere su próximo movimiento.'],
    ['PMI manufacturero de China sorprende positivamente', 'Los nuevos pedidos y la producción muestran expansión por primera vez en meses, impulsando materias primas.'],
    ['Curva de tipos se aplana tras subasta de Treasuries a 10 años', 'La demanda extranjera supera expectativas, presionando los rendimientos en el tramo largo de la curva.'],
  ],
  Earnings: [
    ['{sym} supera estimaciones con EPS de ${pct}', 'La compañía reporta crecimiento robusto en su segmento principal y eleva la guía para el ejercicio completo.'],
    ['{sym} decepciona con ingresos por debajo del consenso', 'La acción cae en after-hours tras conocerse márgenes presionados y advertencias sobre demanda en el próximo trimestre.'],
    ['{sym} anuncia recompra de acciones por $10B', 'El programa de retorno al accionista sorprende al mercado y se interpreta como señal de confianza en el flujo de caja.'],
  ],
};

const IDEA_TITLES = [
  'Setup técnico de continuación alcista en {sym}',
  'Posible reversión bajista en {sym} tras divergencia',
  'Triángulo simétrico maduro en {sym} apunta a ruptura',
  'Doble suelo confirmado en {sym} con volumen creciente',
  'Cuña descendente en {sym} sugiere objetivo en resistencia',
  'Patrón de banderín en {sym} tras impulso institucional',
  'Soporte de tendencia respetado en {sym} — oportunidad de compra',
  'Sobrecompra extrema en {sym}: oportunidad para corto táctico',
  'Acumulación Wyckoff en {sym}: fase D próxima',
  'Order block alcista en {sym} con confluencia Fibonacci',
];

const IDEA_BODIES = [
  'El precio está respetando una estructura clara de máximos y mínimos crecientes desde hace varias semanas. La media móvil de 50 sesiones actúa como soporte dinámico y el RSI se mantiene en zona constructiva sin entrar en sobrecompra. Stop sugerido bajo el último swing low, objetivo en la resistencia histórica.',
  'La divergencia entre precio y momentum es evidente en el último impulso. El MACD muestra debilidad en el histograma y el volumen acompañó solo parcialmente la subida. Vigilar ruptura de la línea de tendencia ascendente como gatillo bajista, con objetivo en la siguiente media móvil.',
  'Patrón gráfico de consolidación lateral con compresión de volatilidad creciente. Las Bandas de Bollinger se estrechan a niveles que históricamente preceden movimientos amplios. La dirección de la ruptura definirá el sesgo: vigilar volumen y cierres en marco diario.',
  'Confluencia técnica relevante en zona de oferta institucional. El volumen profile muestra POC desplazado y la zona contiene niveles Fibonacci, retroceso 0.618 del último impulso y soporte horizontal. Esperar reacción antes de tomar posición.',
];

const AUTHORS = [
  ['CarlosFX', 'Premium', 4582],
  ['TraderBea', 'Top', 12340],
  ['MarketWizard', 'Pro', 8721],
  ['IberMercados', 'Verified', 3210],
  ['CryptoSage', 'Premium', 6543],
  ['SwingMaster', 'Pro', 2890],
  ['SMC_Pro', 'Top', 9876],
  ['VolPriceAction', 'Premium', 5432],
  ['MacroLens', 'Verified', 4321],
  ['AlgoQuant', 'Pro', 7654],
];

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

function pickTickersFor(rnd, cat) {
  let pool;
  if (cat === 'Cripto') pool = TICKERS_CRYPTO;
  else if (cat === 'Forex') pool = TICKERS_FX;
  else if (cat === 'Macro') pool = TICKERS_MACRO;
  else if (cat === 'Earnings') pool = TICKERS_STOCK;
  else pool = TICKERS_STOCK.concat(TICKERS_MACRO);
  const n = 1 + Math.floor(rnd() * 3);
  const set = new Set();
  while (set.size < n) set.add(pick(rnd, pool));
  return Array.from(set);
}

function fillTemplate(rnd, str, sym) {
  return str
    .replace(/\{sym\}/g, sym || pick(rnd, TICKERS_STOCK))
    .replace(/\{dir\}/g, pick(rnd, ['alcista', 'bajista', 'mixto']))
    .replace(/\{dir2\}/g, pick(rnd, ['positiva', 'negativa', 'volátil']))
    .replace(/\{dir3\}/g, pick(rnd, ['las subidas', 'las correcciones', 'la rotación']))
    .replace(/\{pct\}/g, (rnd() * 5 + 0.5).toFixed(2))
    .replace(/\{amt\}/g, (Math.floor(rnd() * 9000) + 1000).toString());
}

function generateNews(seed, count) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const category = pick(rnd, CATEGORIES);
    const tickers = pickTickersFor(rnd, category);
    const templates = NEWS_TEMPLATES[category];
    const [headT, snipT] = pick(rnd, templates);
    const headline = fillTemplate(rnd, headT, tickers[0]);
    const snippet = fillTemplate(rnd, snipT, tickers[0]);
    const importanceRnd = rnd();
    let importance = 'low';
    if (importanceRnd > 0.85) importance = 'high';
    else if (importanceRnd > 0.55) importance = 'medium';
    const minutesAgo = Math.floor(rnd() * 720) + 1; // up to 12h
    out.push({
      id: 'n_' + seed + '_' + i,
      source: pick(rnd, SOURCES),
      category,
      tickers,
      headline,
      snippet,
      importance,
      minutesAgo,
    });
  }
  out.sort((a, b) => a.minutesAgo - b.minutesAgo);
  return out;
}

function generateIdeas(seed, count, longBody) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const cat = pick(rnd, ['Mercado', 'Cripto', 'Forex']);
    const tickers = pickTickersFor(rnd, cat);
    const sym = tickers[0];
    const author = pick(rnd, AUTHORS);
    const side = rnd() > 0.5 ? 'Long' : 'Short';
    const title = fillTemplate(rnd, pick(rnd, IDEA_TITLES), sym);
    let body = pick(rnd, IDEA_BODIES);
    if (longBody) {
      body = body + ' ' + pick(rnd, IDEA_BODIES) + ' Adicionalmente, el contexto sectorial favorece este planteamiento y la correlación con el subyacente refuerza la tesis operativa.';
    }
    const minutesAgo = Math.floor(rnd() * 4320) + 5;
    out.push({
      id: 'i_' + seed + '_' + i,
      author: author[0],
      authorTier: author[1],
      reputation: author[2],
      side,
      tickers,
      title,
      body,
      likes: Math.floor(rnd() * 800) + 10,
      comments: Math.floor(rnd() * 80),
      minutesAgo,
      thumbSeed: Math.floor(rnd() * 100000),
      sym,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatRelative(min) {
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function initials(name) {
  return (name || '?').substring(0, 1).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sparkline canvas thumbnail
// ---------------------------------------------------------------------------
function drawSparkline(canvas, seed, side) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const rnd = rng(seed);
  const n = 60;
  const data = [];
  let v = 100;
  const drift = side === 'Long' ? 0.25 : -0.25;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * 3 + drift;
    data.push(v);
  }
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (n - 1);

  // baseline grid
  ctx.strokeStyle = '#1a1d27';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const y = (h * i) / 4;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // line
  const up = data[data.length - 1] >= data[0];
  const color = up ? '#26a69a' : '#f23645';
  const fill = up ? 'rgba(38,166,154,0.15)' : 'rgba(242,54,69,0.15)';

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i * stepX;
    const y = h - ((data[i] - min) / range) * (h - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // fill
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Mini lightweight-chart for Analysis tab (with fallback)
// ---------------------------------------------------------------------------
function renderMiniChart(el, seed, side, lwcModule) {
  // Try lightweight-charts if available
  const LWC = lwcModule || (typeof window !== 'undefined' && window.LightweightCharts);
  if (LWC && typeof LWC.createChart === 'function') {
    try {
      const chart = LWC.createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: { background: { color: '#0a0d14' }, textColor: '#787b86', fontSize: 9 },
        grid: { vertLines: { color: '#1a1d27' }, horzLines: { color: '#1a1d27' } },
        rightPriceScale: { borderColor: '#1e222d' },
        timeScale: { borderColor: '#1e222d', timeVisible: false },
        crosshair: { mode: 0 },
        handleScroll: false,
        handleScale: false,
      });
      // v5 API uses addSeries(LineSeries, ...)
      let series;
      if (LWC.LineSeries && typeof chart.addSeries === 'function') {
        series = chart.addSeries(LWC.LineSeries, {
          color: side === 'Long' ? '#26a69a' : '#f23645',
          lineWidth: 2,
        });
      } else if (typeof chart.addLineSeries === 'function') {
        series = chart.addLineSeries({
          color: side === 'Long' ? '#26a69a' : '#f23645',
          lineWidth: 2,
        });
      }
      const rnd = rng(seed);
      const data = [];
      let v = 100;
      const drift = side === 'Long' ? 0.2 : -0.2;
      const now = Math.floor(Date.now() / 1000);
      for (let i = 0; i < 80; i++) {
        v += (rnd() - 0.5) * 2.2 + drift;
        data.push({ time: now - (80 - i) * 3600, value: +v.toFixed(2) });
      }
      if (series) {
        series.setData(data);
        chart.timeScale().fitContent();
      }
      return { destroy: () => { try { chart.remove(); } catch (e) {} } };
    } catch (e) {
      // fall through to canvas fallback
    }
  }
  // Fallback: bigger sparkline with annotation
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  el.appendChild(canvas);
  // wait one frame for layout
  requestAnimationFrame(() => drawSparkline(canvas, seed, side));
  return { destroy: () => { try { el.removeChild(canvas); } catch (e) {} } };
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------
export function createNewsIdeasPane(container, opts = {}) {
  if (!container) throw new Error('createNewsIdeasPane: container is required');
  ensureStyles();
  ensurePolishStyles();

  const state = {
    tab: opts.defaultTab || 'news',
    seed: (Date.now() & 0xffffff) || 1,
    newsFilter: 'Todas',
    ideaSort: 'Recent',
    news: [],
    ideas: [],
    analysis: [],
    miniCharts: [],
  };

  function regenerate() {
    state.news = generateNews(state.seed, 50);
    state.ideas = generateIdeas(state.seed + 1, 30, false);
    state.analysis = generateIdeas(state.seed + 2, 20, true);
  }
  regenerate();

  // Root layout
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'nip-root';

  // Header
  const header = document.createElement('div');
  header.className = 'nip-header';
  const title = document.createElement('div');
  title.className = 'nip-title';
  title.textContent = 'Stream';
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'nip-refresh';
  refreshBtn.title = 'Refrescar';
  refreshBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    refresh();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
  header.appendChild(title);
  header.appendChild(refreshBtn);
  root.appendChild(header);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'nip-tabs';
  const tabDefs = [
    { id: 'news', label: 'Noticias' },
    { id: 'ideas', label: 'Ideas' },
    { id: 'analysis', label: 'Análisis' },
  ];
  const tabEls = {};
  tabDefs.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'nip-tab' + (state.tab === t.id ? ' active' : '');
    b.textContent = t.label;
    b.addEventListener('click', () => {
      state.tab = t.id;
      Object.keys(tabEls).forEach((k) => tabEls[k].classList.toggle('active', k === t.id));
      renderBody();
    });
    tabEls[t.id] = b;
    tabs.appendChild(b);
  });
  root.appendChild(tabs);

  // Toolbar (filters / sort)
  const toolbar = document.createElement('div');
  toolbar.className = 'nip-toolbar';
  root.appendChild(toolbar);

  // List
  const list = document.createElement('div');
  list.className = 'nip-list';
  root.appendChild(list);

  container.appendChild(root);

  // ---- toolbar renderers ----
  function renderToolbarNews() {
    toolbar.innerHTML = '';
    const filters = ['Todas', ...CATEGORIES];
    filters.forEach((f) => {
      const chip = document.createElement('button');
      chip.className = 'nip-chip' + (state.newsFilter === f ? ' active' : '');
      chip.textContent = f;
      chip.addEventListener('click', () => {
        state.newsFilter = f;
        renderToolbarNews();
        renderListNews();
      });
      toolbar.appendChild(chip);
    });
  }

  function renderToolbarIdeas() {
    toolbar.innerHTML = '';
    const sorts = ['Recent', 'Popular', 'Trending'];
    sorts.forEach((s) => {
      const chip = document.createElement('button');
      chip.className = 'nip-chip' + (state.ideaSort === s ? ' active' : '');
      chip.textContent = s;
      chip.addEventListener('click', () => {
        state.ideaSort = s;
        renderToolbarIdeas();
        renderListIdeas();
      });
      toolbar.appendChild(chip);
    });
  }

  function renderToolbarAnalysis() {
    toolbar.innerHTML = '';
    const sorts = ['Recent', 'Popular', 'Trending'];
    sorts.forEach((s) => {
      const chip = document.createElement('button');
      chip.className = 'nip-chip' + (state.ideaSort === s ? ' active' : '');
      chip.textContent = s;
      chip.addEventListener('click', () => {
        state.ideaSort = s;
        renderToolbarAnalysis();
        renderListAnalysis();
      });
      toolbar.appendChild(chip);
    });
  }

  // ---- list renderers ----
  function clearMiniCharts() {
    state.miniCharts.forEach((c) => { try { c.destroy(); } catch (e) {} });
    state.miniCharts = [];
  }

  function renderListNews() {
    clearMiniCharts();
    list.innerHTML = '';
    const items = state.news.filter((n) => state.newsFilter === 'Todas' || n.category === state.newsFilter);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('No hay noticias disponibles', 'Cambia el filtro o pulsa "Actualizar" para regenerar el feed.', '📰');
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((n) => {
      const div = document.createElement('div');
      div.className = 'nip-news-item imp-' + n.importance;
      const tickersHtml = n.tickers.map((t) =>
        `<span class="nip-ticker-chip" data-ticker="${escapeHtml(t)}">${escapeHtml(t)}</span>`
      ).join('');
      div.innerHTML = `
        <div class="nip-news-meta">
          <span class="nip-news-source">${escapeHtml(n.source)}</span>
          <span class="nip-news-dot">·</span>
          <span>${escapeHtml(n.category)}</span>
          <span class="nip-news-dot">·</span>
          <span>${formatRelative(n.minutesAgo)}</span>
        </div>
        <div class="nip-news-headline" data-headline="1">${escapeHtml(n.headline)}</div>
        <div class="nip-news-snippet">${escapeHtml(n.snippet)}</div>
        <div class="nip-news-tickers">${tickersHtml}</div>
      `;
      div.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t && t.classList && t.classList.contains('nip-ticker-chip')) {
          ev.stopPropagation();
          const sym = t.getAttribute('data-ticker');
          if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(sym);
          return;
        }
        // headline / card click → select primary ticker
        if (typeof opts.onSelectSymbol === 'function' && n.tickers[0]) {
          opts.onSelectSymbol(n.tickers[0]);
        }
      });
      frag.appendChild(div);
    });
    list.appendChild(frag);
  }

  function sortIdeas(arr) {
    const copy = arr.slice();
    if (state.ideaSort === 'Recent') copy.sort((a, b) => a.minutesAgo - b.minutesAgo);
    else if (state.ideaSort === 'Popular') copy.sort((a, b) => b.likes - a.likes);
    else copy.sort((a, b) => (b.likes + b.comments * 5) / (b.minutesAgo + 30) - (a.likes + a.comments * 5) / (a.minutesAgo + 30));
    return copy;
  }

  function renderListIdeas() {
    clearMiniCharts();
    list.innerHTML = '';
    const items = sortIdeas(state.ideas);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('No hay ideas disponibles', 'Cuando otros traders compartan ideas aparecerán aquí.', '💡');
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((it) => {
      const div = document.createElement('div');
      div.className = 'nip-idea-item';
      const tickersHtml = it.tickers.map((t) =>
        `<span class="nip-ticker-chip" data-ticker="${escapeHtml(t)}">${escapeHtml(t)}</span>`
      ).join(' ');
      div.innerHTML = `
        <div class="nip-idea-head">
          <div class="nip-avatar">${escapeHtml(initials(it.author))}</div>
          <div>
            <span class="nip-author">${escapeHtml(it.author)}</span>
            <span class="nip-rep">${escapeHtml(it.authorTier)} · ${it.reputation}</span>
          </div>
          <span class="nip-time">${formatRelative(it.minutesAgo)}</span>
        </div>
        <div class="nip-idea-title">
          <span class="nip-tag nip-tag-${it.side.toLowerCase()}">${escapeHtml(it.side)}</span>
          <span>${escapeHtml(it.title)}</span>
        </div>
        <div>${tickersHtml}</div>
        <div class="nip-thumb"><canvas></canvas></div>
        <div class="nip-idea-body">${escapeHtml(it.body)}</div>
        <div class="nip-idea-foot">
          <span>♥ <span class="nip-fcount">${it.likes}</span></span>
          <span>💬 <span class="nip-fcount">${it.comments}</span></span>
        </div>
      `;
      const canvas = div.querySelector('canvas');
      requestAnimationFrame(() => drawSparkline(canvas, it.thumbSeed, it.side));
      div.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t && t.classList && t.classList.contains('nip-ticker-chip')) {
          ev.stopPropagation();
          const sym = t.getAttribute('data-ticker');
          if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(sym);
          return;
        }
        if (typeof opts.onOpenIdea === 'function') opts.onOpenIdea(it.id);
        else console.log('[news-ideas-pane] open idea', it.id);
      });
      frag.appendChild(div);
    });
    list.appendChild(frag);
  }

  function renderListAnalysis() {
    clearMiniCharts();
    list.innerHTML = '';
    const items = sortIdeas(state.analysis);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('No hay análisis disponibles', 'El feed de análisis está vacío. Vuelve a actualizar más tarde.', '📊');
      return;
    }
    const frag = document.createDocumentFragment();
    const chartsToInit = [];
    items.forEach((it) => {
      const div = document.createElement('div');
      div.className = 'nip-idea-item';
      const tickersHtml = it.tickers.map((t) =>
        `<span class="nip-ticker-chip" data-ticker="${escapeHtml(t)}">${escapeHtml(t)}</span>`
      ).join(' ');
      div.innerHTML = `
        <div class="nip-idea-head">
          <div class="nip-avatar">${escapeHtml(initials(it.author))}</div>
          <div>
            <span class="nip-author">${escapeHtml(it.author)}</span>
            <span class="nip-rep">${escapeHtml(it.authorTier)} · ${it.reputation}</span>
          </div>
          <span class="nip-time">${formatRelative(it.minutesAgo)}</span>
        </div>
        <div class="nip-idea-title">
          <span class="nip-tag nip-tag-${it.side.toLowerCase()}">${escapeHtml(it.side)}</span>
          <span>${escapeHtml(it.title)}</span>
        </div>
        <div>${tickersHtml}</div>
        <div class="nip-mini-chart"></div>
        <div class="nip-idea-body long">${escapeHtml(it.body)}</div>
        <div class="nip-idea-foot">
          <span>♥ <span class="nip-fcount">${it.likes}</span></span>
          <span>💬 <span class="nip-fcount">${it.comments}</span></span>
        </div>
      `;
      const mini = div.querySelector('.nip-mini-chart');
      chartsToInit.push({ el: mini, seed: it.thumbSeed, side: it.side });
      div.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t && t.classList && t.classList.contains('nip-ticker-chip')) {
          ev.stopPropagation();
          const sym = t.getAttribute('data-ticker');
          if (typeof opts.onSelectSymbol === 'function') opts.onSelectSymbol(sym);
          return;
        }
        if (typeof opts.onOpenIdea === 'function') opts.onOpenIdea(it.id);
        else console.log('[news-ideas-pane] open analysis', it.id);
      });
      frag.appendChild(div);
    });
    list.appendChild(frag);
    // init mini charts after layout
    requestAnimationFrame(() => {
      chartsToInit.forEach(({ el, seed, side }) => {
        if (!el.clientWidth) return;
        const h = renderMiniChart(el, seed, side, opts.lightweightCharts);
        if (h) state.miniCharts.push(h);
      });
    });
  }

  // ---- dispatcher ----
  function renderBody() {
    if (state.tab === 'news') {
      renderToolbarNews();
      renderListNews();
    } else if (state.tab === 'ideas') {
      renderToolbarIdeas();
      renderListIdeas();
    } else {
      renderToolbarAnalysis();
      renderListAnalysis();
    }
  }

  function render() {
    renderBody();
  }

  function refresh() {
    state.seed = (state.seed + 7919) & 0xffffff;
    regenerate();
    renderBody();
  }

  function destroy() {
    clearMiniCharts();
    try { container.innerHTML = ''; } catch (e) {}
  }

  render();
  return { render, refresh, destroy };
}

export default createNewsIdeasPane;
