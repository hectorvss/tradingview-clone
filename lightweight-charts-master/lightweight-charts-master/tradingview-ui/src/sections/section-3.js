// src/sections/section-3.js — TradingView "Cripto" market overview Section 3.
// Pixel-perfect translation of Figma node 1:35529 (1315x2169) from file
// 2QhXqtb66hdeKvlZAZE4fS. All Spanish labels match the source exactly.

import { createChart, CandlestickSeries } from 'lightweight-charts';
import { generateMiniCandles } from '../data.js';

let _cssInjected = false;

/* ───────────────────── DATA (extracted from Figma) ───────────────────── */

const TRENDING = [
  { icon: 'crypto-near.svg',   bg: '#00ec97', price: '2,3507',  unit: 'USDT', chg: '−3,99%', up: false, ticker: 'NEARUSDT.P',   sub: 'NEARUSDT Perpetual Contract' },
  { icon: 'crypto-beat.svg',   bg: '#5e2c9c', price: '1,21739', unit: 'USDT', chg: '−3,55%', up: false, ticker: 'BEATUSDT.P',   sub: 'BEATUSDT Perpetual Contract' },
  { icon: 'crypto-fet.svg',    bg: '#210950', price: '0,2109',  unit: 'USDT', chg: '+1,30%', up: true,  ticker: 'FETUSDT',      sub: 'Fetch.AI / TetherUS' },
  { icon: 'crypto-grass.svg',  bg: '#acf601', price: '0,53693', unit: 'USDT', chg: '+0,39%', up: true,  ticker: 'GRASSUSDT.P',  sub: 'GRASSUSDT Perpetual Contract' },
  { icon: 'crypto-icp.svg',    bg: '#000000', price: '2,600',   unit: 'USDT', chg: '−0,08%', up: false, ticker: 'ICPUSDT.P',    sub: 'ICPUSDT Perpetual Contract' },
  { icon: 'crypto-wld.svg',    bg: '#000000', price: '0,3021',  unit: 'USDT', chg: '+0,77%', up: true,  ticker: 'WLDUSDT.P',    sub: 'WLDUSDT Perpetual Contract' },
  { icon: 'crypto-render.svg', bg: '#000000', price: '1,9691',  unit: 'USDT', chg: '+1,43%', up: true,  ticker: 'RENDERUSDT.P', sub: 'RENDERUSDT Perpetual Contract' },
  { icon: 'crypto-ondo.svg',   bg: '#0099ff', price: '0,4376',  unit: 'USDT', chg: '+2,63%', up: true,  ticker: 'ONDOUSDT',     sub: 'ONDOUSDT SPOT' },
  { icon: 'crypto-atom.svg',   bg: '#2e3148', price: '2,1080',  unit: 'USDT', chg: '+0,01%', up: true,  ticker: 'ATOMUSDT.P',   sub: 'ATOMUSDT Perpetual Contract' },
  { icon: 'crypto-link.svg',   bg: '#2a5ada', price: '9,581',   unit: 'USDT', chg: '+0,25%', up: true,  ticker: 'LINKUSDT.P',   sub: 'LINKUSDT Perpetual Contract' },
];

const IDEAS = [
  { exch: 'BITSTAMP', ticker: 'BTCUSD',  author: 'CryptoVision · hace 3 h', title: 'BTCUSD Bullish Outlook — Análisis técnico semanal',  body: 'Bitcoin se mantiene sobre el soporte clave en 98K. Setup de continuación alcista hacia 105K si rompe resistencia.', seed: 31, up: true,  likes: 245 },
  { exch: 'BINANCE',  ticker: 'ETHUSDT', author: 'AltcoinTrader · hace 5 h', title: 'ETH/USDT — Patrón triangular en formación',          body: 'Ethereum forma un triángulo simétrico en el gráfico de 4H. Ruptura inminente, vigilar volumen para confirmar dirección.', seed: 42, up: true,  likes: 187 },
  { exch: 'BINANCE',  ticker: 'SOLUSDT', author: 'SolMaxi · hace 7 h',       title: 'Solana — Zona de acumulación clara',                 body: 'SOL muestra acumulación en zona de demanda. Objetivo en 250 USD si mantiene 210 como soporte. Stop loss estricto.', seed: 53, up: false, likes: 132 },
];

const GAINERS = [
  { icon: 'crypto-near.svg',   bg: '#00ec97', name: 'NEAR',      ticker: 'NEAR Protocol',     price: '5,8420 USD',   chg: '+15,28%' },
  { icon: 'crypto-render.svg', bg: '#000000', name: 'RENDER',    ticker: 'Render Token',      price: '9,1235 USD',   chg: '+14,16%' },
  { icon: 'crypto-fet.svg',    bg: '#210950', name: 'FET',       ticker: 'Fetch.AI',          price: '1,4218 USD',   chg: '+12,84%' },
  { icon: 'crypto-grass.svg',  bg: '#acf601', name: 'GRASS',     ticker: 'Grass',             price: '2,3140 USD',   chg: '+9,42%' },
  { icon: 'crypto-ondo.svg',   bg: '#0099ff', name: 'ONDO',      ticker: 'Ondo',              price: '1,8945 USD',   chg: '+7,12%' },
  { icon: 'crypto-wld.svg',    bg: '#000000', name: 'WLD',       ticker: 'Worldcoin',         price: '3,4218 USD',   chg: '+5,48%' },
];

const LOSERS = [
  { icon: 'crypto-beat.svg',   bg: '#5e2c9c', name: 'BEAT',      ticker: 'Beat Token',        price: '0,8124 USD',   chg: '−9,32%' },
  { icon: 'crypto-icp.svg',    bg: '#000000', name: 'ICP',       ticker: 'Internet Computer', price: '7,1245 USD',   chg: '−6,12%' },
  { icon: 'crypto-atom.svg',   bg: '#2e3148', name: 'ATOM',      ticker: 'Cosmos',            price: '4,8210 USD',   chg: '−5,86%' },
  { icon: 'crypto-link.svg',   bg: '#2a5ada', name: 'LINK',      ticker: 'Chainlink',         price: '12,3540 USD',  chg: '−3,42%' },
  { icon: 'crypto-near.svg',   bg: '#00ec97', name: 'TRX',       ticker: 'TRON',              price: '0,2418 USD',   chg: '−2,84%' },
  { icon: 'crypto-fet.svg',    bg: '#210950', name: 'DOT',       ticker: 'Polkadot',          price: '6,1842 USD',   chg: '−1,48%' },
];

const NEWS = [
  { src: 'Hace 18 horas — Bitcoin.es',  body: 'El precio de Bitcoin se consolida sobre los 99.000 USD tras la decisión de la SEC sobre los ETF de Ethereum spot.' },
  { src: 'Hace 18 horas — NewsBTC',     body: 'Solana alcanza nuevo máximo histórico mientras crece el interés institucional por su ecosistema DeFi.' },
  { src: 'Hace 18 horas — NewsBTC',     body: 'Análisis técnico: Ethereum forma patrón alcista en gráfico semanal con objetivo en 4.500 USD.' },
  { src: 'Hace 19 horas — Bitcoin.es',  body: 'XRP rompe resistencia clave tras el acuerdo de Ripple con bancos asiáticos para pagos transfronterizos.' },
  { src: 'Hace 19 horas — NewsBTC',     body: 'NEAR Protocol lidera ganancias diarias con un crecimiento del 15% impulsado por nuevos lanzamientos.' },
  { src: 'Hace 20 horas — Bitcoin.es',  body: 'El BCE estudia incorporar criptomonedas a sus reservas: impacto potencial sobre el euro digital.' },
  { src: 'Hace 20 horas — Bitcoin.es',  body: 'Cardano lanza actualización de smart contracts: mejoras en escalabilidad y reducción de comisiones.' },
  { src: 'Hace 21 horas — NewsBTC',     body: 'Análisis: el dominio de Bitcoin cae al 52% mientras altcoins capturan flujo de capital especulativo.' },
  { src: 'Hace 21 horas — NewsBTC',     body: 'Worldcoin alcanza 10 millones de usuarios verificados: el token WLD sube un 5% tras el anuncio.' },
];

/* ───────────────────────── CSS ───────────────────────── */

const CSS = `
.sec3, .sec3 *, .sec3 *::before, .sec3 *::after { box-sizing: border-box; }
.sec3 {
  width: 100%;
  background: var(--grey-6, #0f0f0f);
  color: var(--grey-86, #dbdbdb);
  font-family: var(--font-ui, 'Trebuchet MS', sans-serif);
  padding: 0 40px;
}
.sec3-inner { max-width: 1315px; margin: 0 auto; padding: 24px 0 64px; }

/* Header */
.sec3-h1 {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 28px;
  line-height: 36px;
  color: var(--grey-86, #dbdbdb);
  margin: 0 0 24px;
}
.sec3-h2 {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 20px;
  line-height: 28px;
  color: var(--grey-86, #dbdbdb);
  margin: 32px 0 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.sec3-h2 .sec3-arrow { color: var(--grey-55, #8c8c8c); font-weight: 400; transition: transform .15s; }
.sec3-h2:hover .sec3-arrow { transform: translateX(3px); color: var(--grey-86); }

/* Scroll row */
.sec3-scroll {
  position: relative;
  margin: 0 -8px;
}
.sec3-scroll-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 8px;
  scroll-snap-type: x mandatory;
}
.sec3-scroll-track::-webkit-scrollbar { display: none; }
.sec3-scroll-btn {
  position: absolute;
  top: 50%;
  right: -16px;
  transform: translateY(-50%);
  width: 48px; height: 48px;
  background: var(--grey-18, #2e2e2e);
  border: none;
  border-radius: 24px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,.4);
  z-index: 2;
  color: var(--grey-86);
}
.sec3-scroll-btn:hover { background: #3a3a3a; }
.sec3-scroll-btn svg { width: 18px; height: 18px; }

/* Trending ticker card */
.sec3-ticker {
  flex: 0 0 237px;
  height: 148px;
  border: 1px solid var(--grey-29, #4a4a4a);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: 42px 52px;
  column-gap: 8px;
  row-gap: 20px;
  background: transparent;
  cursor: pointer;
  transition: background .15s;
  scroll-snap-align: start;
}
.sec3-ticker:hover { background: rgba(255,255,255,.03); }
.sec3-ticker-logo {
  width: 36px; height: 36px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.sec3-ticker-logo img { width: 24px; height: 24px; }
.sec3-ticker-info {
  display: flex; flex-direction: column;
  align-items: flex-start; justify-content: center;
  min-width: 0;
}
.sec3-ticker-sym {
  font-size: 16px; line-height: 24px;
  color: var(--grey-86, #dbdbdb);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 100%;
}
.sec3-ticker-name {
  font-size: 14px; line-height: 18px;
  color: var(--grey-55, #8c8c8c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 100%;
}
.sec3-ticker-vals {
  grid-column: 1 / span 2;
  display: flex; flex-direction: column;
  gap: 4px;
  align-self: center;
}
.sec3-ticker-price {
  display: flex; align-items: baseline; gap: 2px;
  font-size: 16px; line-height: 24px;
  color: var(--grey-86, #dbdbdb);
}
.sec3-ticker-unit {
  font-size: 11px; line-height: 16px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--grey-86, #dbdbdb);
}
.sec3-ticker-chg { font-size: 16px; line-height: 24px; }
.sec3-ticker-chg.up { color: #22ab94; }
.sec3-ticker-chg.dn { color: #f7525f; }

/* Idea cards */
.sec3-ideas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.sec3-idea {
  height: 408px;
  background: var(--grey-11, #1c1c1c);
  border-radius: 16px;
  overflow: hidden;
  display: flex; flex-direction: column;
  cursor: pointer;
  transition: transform .15s;
}
.sec3-idea:hover { transform: translateY(-2px); }
.sec3-idea-chart {
  width: 100%;
  height: 220px;
  background: var(--azure-10, #131722);
  position: relative;
}
.sec3-idea-body {
  padding: 16px;
  display: flex; flex-direction: column;
  gap: 8px; flex: 1;
}
.sec3-idea-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
}
.sec3-idea-pill {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,.06);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--grey-86, #dbdbdb);
}
.sec3-idea-exch { color: var(--grey-55, #8c8c8c); font-size: 11px; }
.sec3-idea-title {
  font-size: 16px; line-height: 22px;
  color: var(--grey-86, #dbdbdb);
  font-weight: 700;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.sec3-idea-text {
  font-size: 13px; line-height: 18px;
  color: var(--grey-55, #8c8c8c);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
.sec3-idea-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: auto;
  font-size: 12px;
  color: var(--grey-55, #8c8c8c);
}
.sec3-idea-likes { display: inline-flex; gap: 4px; align-items: center; }

/* Two-column gainers/losers */
.sec3-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  margin-top: 8px;
}
.sec3-col-head {
  border-top: 3px solid #00ec97;
  padding-top: 12px;
  margin-top: 0;
}
.sec3-col-head.dn { border-top-color: #f7525f; }

/* List rows */
.sec3-list { display: flex; flex-direction: column; }
.sec3-row {
  display: grid;
  grid-template-columns: 28px 1fr auto auto;
  gap: 12px;
  align-items: center;
  height: 68px;
  border-bottom: 1px solid var(--grey-18, #2e2e2e);
  cursor: pointer;
  padding: 0 4px;
  transition: background .15s;
}
.sec3-row:hover { background: rgba(255,255,255,.03); }
.sec3-row:last-child { border-bottom: none; }
.sec3-row-logo {
  width: 28px; height: 28px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.sec3-row-logo img { width: 20px; height: 20px; }
.sec3-row-info { display: flex; flex-direction: column; min-width: 0; }
.sec3-row-sym {
  font-size: 16px; line-height: 20px;
  color: var(--grey-86, #dbdbdb);
  font-weight: 700;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sec3-row-name {
  font-size: 13px; line-height: 16px;
  color: var(--grey-55, #8c8c8c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sec3-row-price {
  font-size: 14px;
  color: var(--grey-86, #dbdbdb);
  text-align: right;
  min-width: 110px;
}
.sec3-row-chg {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  min-width: 80px;
  text-align: center;
}
.sec3-row-chg.up { background: rgba(34,171,148,.15); color: #22ab94; }
.sec3-row-chg.dn { background: rgba(247,82,95,.15);  color: #f7525f; }

.sec3-foot-link {
  display: inline-block;
  margin-top: 20px;
  color: var(--grey-86, #dbdbdb);
  font-size: 14px;
  cursor: pointer;
}
.sec3-foot-link:hover { color: var(--azure-58, #2962ff); }

/* News grid */
.sec3-news {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px 64px;
  margin-top: 8px;
}
.sec3-news-item {
  display: flex; flex-direction: column;
  gap: 8px;
  cursor: pointer;
}
.sec3-news-tag {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
  color: var(--grey-55, #8c8c8c);
}
.sec3-news-dot {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--grey-29, #4a4a4a);
  flex-shrink: 0;
}
.sec3-news-body {
  font-size: 14px; line-height: 20px;
  color: var(--grey-86, #dbdbdb);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
.sec3-news-item:hover .sec3-news-body { color: var(--azure-58, #2962ff); }

@media (max-width: 1100px) {
  .sec3-ideas, .sec3-news { grid-template-columns: repeat(2, 1fr); }
  .sec3-two-col { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 700px) {
  .sec3-ideas, .sec3-news { grid-template-columns: 1fr; }
}

/* ---------------- Polish layer (UI/UX) ---------------- */
.sec3-card,
.sec3-idea,
.sec3-news-item,
.sec3-trending-item,
.sec3-row { transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease; cursor: pointer; }
.sec3-card:hover,
.sec3-idea:hover,
.sec3-news-item:hover,
.sec3-trending-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
  border-color: #2962ff;
}
.sec3-card:active,
.sec3-idea:active,
.sec3-news-item:active,
.sec3-trending-item:active,
.sec3-row:active { opacity: .7; transform: translateY(-1px); }
.sec3-row:hover { background: #1e222d; }

/* Loading shimmer for charts */
[id^="sec3-chart-"]:empty,
[id^="sec3-spark-"]:empty,
.sec3-chart:empty,
.sec3-spark:empty {
  background: linear-gradient(90deg, #131722 0%, #1e222d 50%, #131722 100%);
  background-size: 200% 100%;
  animation: sec3-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes sec3-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.sec3-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 140px; color: #787b86; font-size: 13px; text-align: center;
}

/* Responsive */
@media (max-width: 1200px) {
  .sec3-trending { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
@media (max-width: 768px) {
  .sec3-row, .sec3-news-item, .sec3-trending-item { min-height: 44px; }
}
`;

/* ───────────────────────── HELPERS ───────────────────────── */

const ICON_PATH = '/src/icons/';

function chgClass(s) { return String(s).trim().startsWith('+') ? 'up' : 'dn'; }

function tickerCard(t) {
  return `
    <div class="sec3-ticker" data-ticker="${t.ticker}">
      <div class="sec3-ticker-logo" style="background:${t.bg}">
        <img alt="${t.ticker}" src="${ICON_PATH}${t.icon}" />
      </div>
      <div class="sec3-ticker-info">
        <div class="sec3-ticker-sym">${t.ticker}</div>
        <div class="sec3-ticker-name">${t.sub}</div>
      </div>
      <div class="sec3-ticker-vals">
        <div class="sec3-ticker-price">
          <span>${t.price}</span>
          <span class="sec3-ticker-unit">${t.unit}</span>
        </div>
        <div class="sec3-ticker-chg ${t.up ? 'up' : 'dn'}">${t.chg}</div>
      </div>
    </div>`;
}

function ideaCard(idea, i) {
  return `
    <article class="sec3-idea" data-ticker="${idea.ticker}">
      <div class="sec3-idea-chart" id="sec3-idea-chart-${i}"></div>
      <div class="sec3-idea-body">
        <div class="sec3-idea-meta">
          <span class="sec3-idea-pill">${idea.ticker}</span>
          <span class="sec3-idea-exch">${idea.exch}</span>
        </div>
        <div class="sec3-idea-title">${idea.title}</div>
        <div class="sec3-idea-text">${idea.body}</div>
        <div class="sec3-idea-foot">
          <span>${idea.author}</span>
          <span class="sec3-idea-likes">♥ ${idea.likes}</span>
        </div>
      </div>
    </article>`;
}

function listRow(it) {
  const cls = chgClass(it.chg);
  return `
    <div class="sec3-row" data-ticker="${it.name}">
      <div class="sec3-row-logo" style="background:${it.bg}">
        <img alt="${it.name}" src="${ICON_PATH}${it.icon}" />
      </div>
      <div class="sec3-row-info">
        <div class="sec3-row-sym">${it.name}</div>
        <div class="sec3-row-name">${it.ticker}</div>
      </div>
      <div class="sec3-row-price">${it.price}</div>
      <div class="sec3-row-chg ${cls}">${it.chg}</div>
    </div>`;
}

function newsItem(n) {
  return `
    <div class="sec3-news-item">
      <div class="sec3-news-tag">
        <span class="sec3-news-dot"></span>
        ${n.src}
      </div>
      <div class="sec3-news-body">${n.body}</div>
    </div>`;
}

/* ───────────────────────── MOUNT CHARTS ───────────────────────── */

function mountIdeaCharts(root) {
  IDEAS.forEach((idea, i) => {
    const el = root.querySelector(`#sec3-idea-chart-${i}`);
    if (!el) return;
    try {
      const chart = createChart(el, {
        width: el.clientWidth || 380,
        height: 220,
        layout: { background: { color: '#131722' }, textColor: '#787b86' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { visible: false },
        timeScale: { visible: false },
        handleScroll: false,
        handleScale: false,
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor:   '#22ab94', downColor: '#f7525f',
        wickUpColor: '#22ab94', wickDownColor: '#f7525f',
        borderVisible: false,
      });
      series.setData(generateMiniCandles(idea.seed, idea.up));
      chart.timeScale().fitContent();

      // Resize on window
      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: 220 });
      });
      ro.observe(el);
    } catch (e) {
      // graceful fallback — leave empty chart bg
      console.warn('section-3 chart mount failed', e);
    }
  });
}

function wireScrollButton(root) {
  const track = root.querySelector('.sec3-scroll-track');
  const btn   = root.querySelector('.sec3-scroll-btn');
  if (!track || !btn) return;
  btn.addEventListener('click', () => {
    track.scrollBy({ left: 540, behavior: 'smooth' });
  });
}

/* ───────────────────────── RENDER ───────────────────────── */

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-sec3', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const tickers = TRENDING.map(tickerCard).join('');
  const ideas   = IDEAS.map(ideaCard).join('');
  const gainers = GAINERS.map(listRow).join('');
  const losers  = LOSERS.map(listRow).join('');
  const news    = NEWS.map(newsItem).join('');

  container.innerHTML = `
    <section class="sec3" id="section-3">
      <div class="sec3-inner">
        <h1 class="sec3-h1">Cripto</h1>

        <h2 class="sec3-h2">Tendencias de la comunidad <span class="sec3-arrow">›</span></h2>
        <div class="sec3-scroll">
          <div class="sec3-scroll-track">${tickers}</div>
          <button class="sec3-scroll-btn" aria-label="Desplazar a la derecha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          </button>
        </div>

        <h2 class="sec3-h2">Ideas de trading <span class="sec3-arrow">›</span></h2>
        <div class="sec3-ideas">${ideas}</div>

        <div class="sec3-two-col">
          <div>
            <h2 class="sec3-h2 sec3-col-head">Criptomonedas ganadoras <span class="sec3-arrow">›</span></h2>
            <div class="sec3-list">${gainers}</div>
            <a class="sec3-foot-link">Ver todas las monedas con mayor crecimiento diario ›</a>
          </div>
          <div>
            <h2 class="sec3-h2 sec3-col-head dn">Criptomonedas perdedoras <span class="sec3-arrow">›</span></h2>
            <div class="sec3-list">${losers}</div>
            <a class="sec3-foot-link">Ver todas las monedas con mayor caída diaria ›</a>
          </div>
        </div>

        <h2 class="sec3-h2">Noticias sobre criptomonedas <span class="sec3-arrow">›</span></h2>
        <div class="sec3-news">${news}</div>
        <a class="sec3-foot-link">Seguir leyendo ›</a>
      </div>
    </section>
  `;

  // Mount mini candle charts inside idea cards
  // defer so layout is committed before measuring widths
  requestAnimationFrame(() => mountIdeaCharts(container));
  wireScrollButton(container);

  return container;
}

export default { render };
