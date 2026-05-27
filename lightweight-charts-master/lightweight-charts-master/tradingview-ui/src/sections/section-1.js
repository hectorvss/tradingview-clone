// src/sections/section-1.js
// Pixel-perfect TradingView "Resumen de mercado" overview section.
// Self-contained: own CSS namespace (mo1-*), own icon assets in ../icons/.
// Does NOT depend on classes defined in styles.css.
//
// Figma file: 2QhXqtb66hdeKvlZAZE4fS, node 1:31025 (1315x2493)
// Layout: hero IBEX (2/3) + Principales índices sidebar (1/3),
//         3 mini cards row (Cripto / Oro / Bonos 10Y),
//         Selecciones de los editores grid,
//         Ideas de la comunidad grid.

import { createChart, AreaSeries, LineSeries, CandlestickSeries } from 'lightweight-charts';
import { generateIBEXIntraday, generateSparkline, generateMiniCandles } from '../data.js';

/* ---------------------------------------------------------------- */
/* Asset icon paths (downloaded under ../icons/)                    */
/* ---------------------------------------------------------------- */
const I = {
  ibex:    '/src/icons/asset-ibex.svg',
  spx:     '/src/icons/asset-spx.svg',
  ndx:     '/src/icons/asset-ndx.svg',
  dji:     '/src/icons/asset-dji.svg',
  ni225:   '/src/icons/asset-ni225.svg',
  shcomp:  '/src/icons/asset-shcomp.svg',
  dax:     '/src/icons/asset-dax.svg',
  btc:     '/src/icons/asset-btc.svg',
  eth:     '/src/icons/asset-eth.svg',
  gold:    '/src/icons/asset-gold.svg',
  es10y:   '/src/icons/asset-es10y.svg',
  star:    '/src/icons/sec1-star.svg',
  heart:   '/src/icons/sec1-heart.svg',
  chevron: '/src/icons/sec1-chevron.svg',
};

/* ---------------------------------------------------------------- */
/* Data (literal numbers from Figma layout)                         */
/* ---------------------------------------------------------------- */
const INDICES = [
  { icon: I.ibex,   name: 'IBEX 35',       sub: 'IBC',    ticker: 'IBC',    price: '17.985,30', chg: '+0,06%',  up: true,  seed: 11 },
  { icon: I.spx,    name: 'S&P 500',       sub: 'SPX',    ticker: 'SPX',    price: '7.471,46',  chg: '−0,32%', up: false, seed: 12 },
  { icon: I.ndx,    name: 'NQ 100',        sub: 'NDX',    ticker: 'NDX',    price: '29.486,55', chg: '−0,87%', up: false, seed: 13 },
  { icon: I.dji,    name: 'DJI',           sub: 'DJI',    ticker: 'DJI',    price: '53.139,18', chg: '+0,16%',  up: true,  seed: 14 },
  { icon: I.ni225,  name: 'Japan 225',     sub: 'NI225',  ticker: 'NI225',  price: '63.158,81', chg: '−0,12%', up: false, seed: 15 },
  { icon: I.shcomp, name: 'SSE Composite', sub: 'SHCOMP', ticker: 'SHCOMP', price: '4.112,80',  chg: '+0,57%',  up: true,  seed: 16 },
  { icon: I.dax,    name: 'DAX',           sub: 'DAX',    ticker: 'DAX',    price: '15.486,30', chg: '−0,71%', up: false, seed: 17 },
];

const CRYPTO_ROWS = [
  { icon: I.btc, name: 'Bitcoin',  ticker: 'BTCUSD', price: '99.512,30 USD', chg: '+1,21%',  up: true  },
  { icon: I.eth, name: 'Ethereum', ticker: 'ETHUSD', price: '3.412,80 USD',  chg: '−0,86%', up: false },
];

const COMMODITY_ROWS = [
  { icon: I.gold, name: 'Oro',          ticker: 'XAU', price: '2.341,50 USD', chg: '−0,31%', up: false },
  { icon: I.gold, name: 'Plata',        ticker: 'XAG', price: '29,84 USD',    chg: '+0,42%',  up: true  },
  { icon: I.gold, name: 'Cobre',        ticker: 'HG',  price: '4,612 USD',    chg: '−0,18%', up: false },
];

const BOND_ROWS = [
  { icon: I.es10y, name: 'España 10Y',     ticker: 'ES10Y', price: '3,424%', chg: '+0,01%',  up: true  },
  { icon: I.es10y, name: 'Alemania 10Y',   ticker: 'DE10Y', price: '2,418%', chg: '−0,02%', up: false },
  { icon: I.es10y, name: 'EE.UU. 10Y',     ticker: 'US10Y', price: '4,184%', chg: '+0,03%',  up: true  },
];

const EDITOR_PICKS = [
  { exch: 'NYSE',   ticker: 'TSLA', title: 'Tesla — patron de continuacion alcista', seed: 41, up: true,  author: 'EditorTeam · hace 1 d', likes: 312 },
  { exch: 'NASDAQ', ticker: 'AAPL', title: 'Apple en consolidacion: zonas clave',         seed: 42, up: false, author: 'EditorTeam · hace 1 d', likes: 188 },
  { exch: 'NASDAQ', ticker: 'MSFT', title: 'Microsoft: ruptura de canal alcista',          seed: 43, up: true,  author: 'EditorTeam · hace 2 d', likes: 254 },
];

const IDEA_CARDS = [
  { exch: 'NASDAQ',  ticker: 'NVDA', title: 'NVDA — Resistencia clave: rebote o ruptura?',  seed: 10, up: true,  author: 'TraderPro · hace 2 h',  likes: 142 },
  { exch: 'CME',     ticker: 'SPX',  title: 'S&P 500: analisis semanal y zonas de interes',      seed: 20, up: true,  author: 'MarketSeer · hace 5 h', likes: 98  },
  { exch: 'BINANCE', ticker: 'BTC',  title: 'Bitcoin en soporte mayor — setup de compra',   seed: 30, up: false, author: 'CryptoMaven · hace 8 h',likes: 215 },
];

/* ---------------------------------------------------------------- */
/* CSS                                                              */
/* ---------------------------------------------------------------- */
let _cssInjected = false;
const CSS = `
.mo1-sec, .mo1-sec * , .mo1-sec *::before, .mo1-sec *::after { box-sizing: border-box; }
.mo1-sec {
  width: 100%;
  background: var(--grey-6, #0f0f0f);
  color: var(--grey-86, #dbdbdb);
  font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, 'Lucida Sans', Arial, sans-serif);
  padding: 32px 40px 64px;
}

/* Section header */
.mo1-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.mo1-head__title { font-size: 28px; font-weight: 700; color: var(--grey-86, #dbdbdb); letter-spacing: -0.2px; }
.mo1-head__link { font-size: 14px; color: #2962ff; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.mo1-head__link:hover { text-decoration: underline; }

/* ----------- Dashboard grid (hero + sidebar + 3 mini) ------- */
.mo1-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "hero side"
    "mini1 side"
    "mini2 mini3";
  /* sidebar spans the height of hero+mini row */
}
@media (max-width: 1180px) {
  .mo1-grid {
    grid-template-columns: 1fr;
    grid-template-areas: "hero" "side" "mini1" "mini2" "mini3";
  }
}

.mo1-card {
  background: var(--grey-7, #121212);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.mo1-card[role="button"] { cursor: pointer; }
.mo1-card[role="button"]:hover { border-color: var(--grey-29, #4a4a4a); }

/* HERO IBEX */
.mo1-hero { grid-area: hero; min-height: 420px; }
.mo1-hero__head { display: flex; align-items: flex-start; gap: 14px; }
.mo1-hero__logo { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; background: #2962ff; overflow: hidden; }
.mo1-hero__logo img { width: 100%; height: 100%; display: block; }
.mo1-hero__info { flex: 1; min-width: 0; }
.mo1-hero__titlerow { display: flex; align-items: center; gap: 8px; }
.mo1-hero__name { font-size: 22px; font-weight: 700; color: var(--grey-86, #dbdbdb); }
.mo1-hero__pill {
  display: inline-flex; align-items: center; height: 18px; padding: 0 8px;
  background: rgba(41,98,255,.16); color: #2962ff; border-radius: 4px;
  font-size: 11px; font-weight: 700; letter-spacing: .3px;
}
.mo1-hero__star { margin-left: auto; width: 24px; height: 24px; background: url('${I.star}') no-repeat center / 18px 18px; border: 0; cursor: pointer; opacity: .8; }
.mo1-hero__star:hover { opacity: 1; }
.mo1-hero__pricerow { display: flex; align-items: baseline; gap: 10px; margin-top: 6px; }
.mo1-hero__price { font-size: 32px; font-weight: 700; color: var(--grey-86, #dbdbdb); line-height: 1; }
.mo1-hero__unit { font-size: 12px; color: var(--grey-55, #8c8c8c); letter-spacing: .4px; }
.mo1-hero__chg { font-size: 16px; font-weight: 700; }
.mo1-hero__chg.up { color: var(--green-32, #089981); }
.mo1-hero__chg.dn { color: var(--red-58, #f23645); }
.mo1-hero__chart { flex: 1; margin-top: 12px; min-height: 320px; }

/* SIDEBAR */
.mo1-side { grid-area: side; }
.mo1-side__title { font-size: 16px; font-weight: 700; color: var(--grey-86, #dbdbdb); margin-bottom: 12px; }
.mo1-side__list { display: flex; flex-direction: column; }
.mo1-row {
  display: grid;
  grid-template-columns: 28px 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 4px;
  border-bottom: 1px solid var(--grey-18, #2e2e2e);
  cursor: pointer;
}
.mo1-row:last-child { border-bottom: 0; }
.mo1-row:hover { background: rgba(255,255,255,.02); }
.mo1-row__logo { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; }
.mo1-row__logo img { width: 100%; height: 100%; display: block; }
.mo1-row__info { min-width: 0; }
.mo1-row__name { font-size: 13px; font-weight: 600; color: var(--grey-86, #dbdbdb); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo1-row__sub  { font-size: 11px; color: var(--grey-55, #8c8c8c); }
.mo1-row__price { font-size: 13px; font-weight: 600; color: var(--grey-86, #dbdbdb); text-align: right; }
.mo1-chg {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 56px; height: 22px; padding: 0 8px;
  font-size: 12px; font-weight: 700; border-radius: 4px;
}
.mo1-chg.up { color: var(--green-32, #089981); background: rgba(8,153,129,.14); }
.mo1-chg.dn { color: var(--red-58, #f23645);  background: rgba(242,54,69,.14); }

.mo1-side__more {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 10px; font-size: 13px; color: #2962ff;
  text-decoration: none; cursor: pointer;
}
.mo1-side__more:hover { text-decoration: underline; }

/* MINI CARDS */
.mo1-mini { display: flex; flex-direction: column; min-height: 320px; }
.mo1-mini:nth-of-type(3) { grid-area: mini1; }
.mo1-mini:nth-of-type(4) { grid-area: mini2; }
.mo1-mini:nth-of-type(5) { grid-area: mini3; }
.mo1-mini__head { display: flex; align-items: center; gap: 8px; }
.mo1-mini__logo { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; }
.mo1-mini__logo img { width: 100%; height: 100%; display: block; }
.mo1-mini__title { font-size: 14px; font-weight: 600; color: var(--grey-86, #dbdbdb); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo1-mini__pill {
  display: inline-flex; align-items: center; height: 18px; padding: 0 8px;
  background: var(--grey-18, #2e2e2e); color: var(--grey-86, #dbdbdb);
  border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: .3px;
}
.mo1-mini__pricerow { display: flex; align-items: baseline; gap: 8px; margin-top: 10px; }
.mo1-mini__price { font-size: 24px; font-weight: 700; color: var(--grey-86, #dbdbdb); line-height: 1; }
.mo1-mini__unit  { font-size: 11px; color: var(--grey-55, #8c8c8c); }
.mo1-mini__chg   { font-size: 13px; font-weight: 700; margin-top: 4px; }
.mo1-mini__chg.up { color: var(--green-32, #089981); }
.mo1-mini__chg.dn { color: var(--red-58, #f23645); }
.mo1-mini__chart  { width: 100%; height: 80px; margin: 10px 0; }
.mo1-mini__rows   { display: flex; flex-direction: column; margin-top: 4px; }
.mo1-mini__more {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: auto; padding-top: 10px;
  font-size: 13px; color: #2962ff; text-decoration: none; cursor: pointer;
}
.mo1-mini__more:hover { text-decoration: underline; }

/* Stacked bar (crypto card) */
.mo1-stack { display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 8px; }
.mo1-stack span { display: block; height: 100%; }
.mo1-stack-leg { display: flex; gap: 12px; margin-top: 6px; font-size: 11px; color: var(--grey-55, #8c8c8c); }
.mo1-stack-leg span { display: inline-flex; align-items: center; gap: 4px; }
.mo1-stack-leg i  { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }

/* SUBSECTION HEAD */
.mo1-sub { margin-top: 36px; }
.mo1-sub__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.mo1-sub__title { font-size: 20px; font-weight: 700; color: var(--grey-86, #dbdbdb); }
.mo1-sub__link  { font-size: 13px; color: #2962ff; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.mo1-sub__link:hover { text-decoration: underline; }

/* IDEA CARDS GRID */
.mo1-ideas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 980px) { .mo1-ideas { grid-template-columns: 1fr; } }
.mo1-idea {
  background: var(--grey-7, #121212);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex; flex-direction: column;
}
.mo1-idea:hover { border-color: var(--grey-29, #4a4a4a); }
.mo1-idea__chart { width: 100%; height: 160px; background: var(--grey-7, #121212); }
.mo1-idea__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.mo1-idea__meta { display: flex; align-items: center; gap: 8px; }
.mo1-idea__badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 11px; font-weight: 700; color: #fff;
}
.mo1-idea__ticker { font-size: 13px; font-weight: 700; color: var(--grey-86, #dbdbdb); }
.mo1-idea__exch   { font-size: 11px; color: var(--grey-55, #8c8c8c); }
.mo1-idea__likes  { margin-left: auto; font-size: 11px; color: var(--grey-55, #8c8c8c); display: inline-flex; align-items: center; gap: 4px; }
.mo1-idea__likes::before {
  content: ''; display: inline-block; width: 12px; height: 12px;
  background: url('${I.heart}') no-repeat center / contain;
}
.mo1-idea__title { font-size: 14px; font-weight: 600; color: var(--grey-86, #dbdbdb); line-height: 1.3; }
.mo1-idea__author { font-size: 11px; color: var(--grey-55, #8c8c8c); }

/* ---------------- Polish layer (UI/UX) ---------------- */
.mo1-card,
.mo1-idea { transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease; }
.mo1-card[role="button"]:hover,
.mo1-idea:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
  border-color: #2962ff;
}
.mo1-card[role="button"]:active,
.mo1-idea:active { opacity: .7; transform: translateY(-1px); }
.mo1-row { transition: background-color 120ms ease, transform 120ms ease; }
.mo1-row:hover { background: #1e222d; transform: translateX(2px); }
.mo1-row:active { opacity: .7; }
.mo1-head__link,
.mo1-sub__link,
.mo1-side__more,
.mo1-mini__more { transition: color 100ms ease, opacity 100ms ease; min-height: 36px; align-items: center; }
.mo1-head__link:active,
.mo1-sub__link:active,
.mo1-side__more:active,
.mo1-mini__more:active { opacity: .7; }
.mo1-hero__star:active { opacity: .5; }
.mo1-chg { transition: background-color 100ms ease, color 100ms ease; }
.mo1-idea__badge { transition: transform 100ms ease; }
.mo1-idea:hover .mo1-idea__badge { transform: scale(1.08); }

/* Loading shimmer skeleton for charts (visible while lightweight-charts mounts) */
.mo1-hero__chart:empty,
.mo1-mini__chart:empty,
.mo1-idea__chart:empty {
  background: linear-gradient(90deg, #131722 0%, #1e222d 50%, #131722 100%);
  background-size: 200% 100%;
  animation: mo1-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes mo1-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.mo1-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 120px; color: #787b86; font-size: 13px; text-align: center;
}

/* Responsive grids */
@media (max-width: 1200px) {
  .mo1-sec { padding: 24px 24px 48px; }
  .mo1-ideas { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .mo1-sec { padding: 16px 12px 32px; }
  .mo1-head__title { font-size: 22px; }
  .mo1-sub__title { font-size: 17px; }
  .mo1-ideas { grid-template-columns: 1fr; }
  .mo1-hero { min-height: 320px; }
  .mo1-mini { min-height: 260px; }
  .mo1-row { min-height: 44px; }
  .mo1-side__more, .mo1-mini__more, .mo1-head__link, .mo1-sub__link { min-height: 44px; }
}
`;

/* ---------------------------------------------------------------- */
/* Render helpers                                                   */
/* ---------------------------------------------------------------- */
function chgClass(chg) {
  return /^[-−]/.test(chg.trim()) ? 'dn' : 'up';
}

function indexRowHTML(r) {
  return `
    <div class="mo1-row" data-ticker="${r.ticker}">
      <div class="mo1-row__logo"><img src="${r.icon}" alt=""></div>
      <div class="mo1-row__info">
        <div class="mo1-row__name">${r.name}</div>
        <div class="mo1-row__sub">${r.sub}</div>
      </div>
      <div class="mo1-row__price">${r.price}</div>
      <div class="mo1-chg ${chgClass(r.chg)}">${r.chg}</div>
    </div>`;
}

function smallRowHTML(r) {
  return `
    <div class="mo1-row" data-ticker="${r.ticker}">
      <div class="mo1-row__logo"><img src="${r.icon}" alt=""></div>
      <div class="mo1-row__info">
        <div class="mo1-row__name">${r.name}</div>
        <div class="mo1-row__sub">${r.ticker}</div>
      </div>
      <div class="mo1-row__price">${r.price}</div>
      <div class="mo1-chg ${chgClass(r.chg)}">${r.chg}</div>
    </div>`;
}

function ideaCardHTML(idea, idPrefix, i) {
  const bg = idea.up ? '#089981' : '#f23645';
  return `
    <div class="mo1-idea" data-ticker="${idea.ticker}">
      <div class="mo1-idea__chart" id="${idPrefix}-${i}"></div>
      <div class="mo1-idea__body">
        <div class="mo1-idea__meta">
          <span class="mo1-idea__badge" style="background:${bg}">${idea.ticker[0]}</span>
          <span class="mo1-idea__ticker">${idea.ticker}</span>
          <span class="mo1-idea__exch">${idea.exch}</span>
          <span class="mo1-idea__likes">${idea.likes}</span>
        </div>
        <div class="mo1-idea__title">${idea.title}</div>
        <div class="mo1-idea__author">${idea.author}</div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- */
/* Chart factories                                                  */
/* ---------------------------------------------------------------- */
function baseChartOpts() {
  return {
    layout: { background: { color: 'transparent' }, textColor: '#8c8c8c', fontFamily: "'Trebuchet MS', sans-serif" },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: false, borderVisible: false },
    timeScale: { visible: false, borderVisible: false },
    handleScroll: false, handleScale: false,
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
  };
}

function mountIBEX(el) {
  if (!el) return null;
  const chart = createChart(el, {
    ...baseChartOpts(),
    width: el.clientWidth,
    height: el.clientHeight,
    rightPriceScale: { visible: true, borderVisible: false },
    timeScale: { visible: true, borderVisible: false, timeVisible: true, secondsVisible: false },
    layout: { background: { color: 'transparent' }, textColor: '#8c8c8c', fontFamily: "'Trebuchet MS', sans-serif" },
    grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.04)' } },
    crosshair: { mode: 1 },
  });
  const s = chart.addSeries(AreaSeries, {
    lineColor: '#089981',
    topColor: 'rgba(8,153,129,.40)',
    bottomColor: 'rgba(8,153,129,.00)',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  });
  s.setData(generateIBEXIntraday());
  chart.timeScale().fitContent();
  return chart;
}

function mountSparkline(el, seed, up) {
  if (!el) return null;
  const chart = createChart(el, {
    ...baseChartOpts(),
    width:  el.clientWidth,
    height: el.clientHeight,
  });
  const color = up ? '#089981' : '#f23645';
  const s = chart.addSeries(AreaSeries, {
    lineColor: color,
    topColor: up ? 'rgba(8,153,129,.30)' : 'rgba(242,54,69,.30)',
    bottomColor: 'rgba(0,0,0,0)',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  });
  s.setData(generateSparkline(seed, up));
  chart.timeScale().fitContent();
  return chart;
}

function mountIdeaChart(el, seed, up) {
  if (!el) return null;
  const chart = createChart(el, {
    ...baseChartOpts(),
    width:  el.clientWidth,
    height: el.clientHeight,
  });
  const s = chart.addSeries(CandlestickSeries, {
    upColor: '#089981', downColor: '#f23645',
    borderUpColor: '#089981', borderDownColor: '#f23645',
    wickUpColor: '#089981', wickDownColor: '#f23645',
    priceLineVisible: false, lastValueVisible: false,
  });
  s.setData(generateMiniCandles(seed, up));
  chart.timeScale().fitContent();
  return chart;
}

/* ---------------------------------------------------------------- */
/* Public render                                                    */
/* ---------------------------------------------------------------- */
export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-section', '1');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const indexRows = INDICES.map(indexRowHTML).join('');
  const cryptoRows = CRYPTO_ROWS.map(smallRowHTML).join('');
  const commodityRows = COMMODITY_ROWS.map(smallRowHTML).join('');
  const bondRows = BOND_ROWS.map(smallRowHTML).join('');
  const editorIdeas = EDITOR_PICKS.map((c, i) => ideaCardHTML(c, 'mo1-ed', i)).join('');
  const commIdeas   = IDEA_CARDS  .map((c, i) => ideaCardHTML(c, 'mo1-id', i)).join('');

  container.innerHTML = `
    <section class="mo1-sec mo1-sec--overview">
      <header class="mo1-head">
        <h2 class="mo1-head__title">Resumen de mercado</h2>
        <a class="mo1-head__link">Ver todos los mercados <img src="${I.chevron}" width="10" height="10" alt=""></a>
      </header>

      <div class="mo1-grid">
        <!-- HERO: IBEX 35 -->
        <article class="mo1-card mo1-hero" role="button" data-ticker="IBC">
          <div class="mo1-hero__head">
            <div class="mo1-hero__logo"><img src="${I.ibex}" alt=""></div>
            <div class="mo1-hero__info">
              <div class="mo1-hero__titlerow">
                <span class="mo1-hero__name">IBEX 35</span>
                <span class="mo1-hero__pill">IBC</span>
                <button class="mo1-hero__star" type="button" aria-label="Favorito"></button>
              </div>
              <div class="mo1-hero__pricerow">
                <span class="mo1-hero__price">17.985,30</span>
                <span class="mo1-hero__unit">EUR · PUNTOS</span>
                <span class="mo1-hero__chg up">+0,06%</span>
              </div>
            </div>
          </div>
          <div class="mo1-hero__chart" id="mo-ibex"></div>
        </article>

        <!-- SIDEBAR: Principales indices -->
        <aside class="mo1-card mo1-side">
          <div class="mo1-side__title">Principales índices</div>
          <div class="mo1-side__list">${indexRows}</div>
          <a class="mo1-side__more">Ver los principales índices <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </aside>

        <!-- MINI 1: Cripto -->
        <article class="mo1-card mo1-mini" role="button" data-ticker="CRYPTOCAP:TOTAL">
          <div class="mo1-mini__head">
            <div class="mo1-mini__logo"><img src="${I.btc}" alt=""></div>
            <div class="mo1-mini__title">Cap. de mercado cripto</div>
            <span class="mo1-mini__pill">TOTAL</span>
          </div>
          <div class="mo1-mini__pricerow">
            <span class="mo1-mini__price">2,55 T</span>
            <span class="mo1-mini__unit">USD</span>
          </div>
          <div class="mo1-mini__chg dn">−1,52%</div>
          <div class="mo1-mini__chart" id="mo-spark-1"></div>
          <div class="mo1-stack">
            <span style="width:42%;background:#f7931a"></span>
            <span style="width:18%;background:#627eea"></span>
            <span style="width:40%;background:#3d3d3d"></span>
          </div>
          <div class="mo1-stack-leg">
            <span><i style="background:#f7931a"></i>Bitcoin</span>
            <span><i style="background:#627eea"></i>Ethereum</span>
            <span><i style="background:#8c8c8c"></i>Otros</span>
          </div>
          <div class="mo1-mini__rows">${cryptoRows}</div>
          <a class="mo1-mini__more">Ver todas las criptomonedas <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </article>

        <!-- MINI 2: Oro / commodities -->
        <article class="mo1-card mo1-mini" role="button" data-ticker="XAUUSD">
          <div class="mo1-mini__head">
            <div class="mo1-mini__logo"><img src="${I.gold}" alt=""></div>
            <div class="mo1-mini__title">Datos del oro</div>
            <span class="mo1-mini__pill">XAU</span>
          </div>
          <div class="mo1-mini__pricerow">
            <span class="mo1-mini__price">2.341,50</span>
            <span class="mo1-mini__unit">USD</span>
          </div>
          <div class="mo1-mini__chg dn">−0,31%</div>
          <div class="mo1-mini__chart" id="mo-spark-2"></div>
          <div class="mo1-mini__rows">${commodityRows}</div>
          <a class="mo1-mini__more">Ver todas las materias primas <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </article>

        <!-- MINI 3: Bonos 10Y -->
        <article class="mo1-card mo1-mini" role="button" data-ticker="ES10Y">
          <div class="mo1-mini__head">
            <div class="mo1-mini__logo"><img src="${I.es10y}" alt=""></div>
            <div class="mo1-mini__title">Rendimiento a 10 años de España</div>
            <span class="mo1-mini__pill">10Y</span>
          </div>
          <div class="mo1-mini__pricerow">
            <span class="mo1-mini__price">3,424%</span>
          </div>
          <div class="mo1-mini__chg up">+0,01%</div>
          <div class="mo1-mini__chart" id="mo-spark-3"></div>
          <div class="mo1-mini__rows">${bondRows}</div>
          <a class="mo1-mini__more">Ver todos los bonos <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </article>
      </div>

      <!-- Selecciones de los editores -->
      <section class="mo1-sub">
        <header class="mo1-sub__head">
          <h3 class="mo1-sub__title">Selecciones de los editores</h3>
          <a class="mo1-sub__link">Ver todas <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </header>
        <div class="mo1-ideas">${editorIdeas}</div>
      </section>

      <!-- Ideas de la comunidad -->
      <section class="mo1-sub">
        <header class="mo1-sub__head">
          <h3 class="mo1-sub__title">Ideas de la comunidad</h3>
          <a class="mo1-sub__link">Ver todas las ideas <img src="${I.chevron}" width="10" height="10" alt=""></a>
        </header>
        <div class="mo1-ideas">${commIdeas}</div>
      </section>
    </section>
  `;

  /* ----------- Mount charts after DOM ----------- */
  const charts = [];
  requestAnimationFrame(() => {
    const ibexEl = container.querySelector('#mo-ibex');
    charts.push(mountIBEX(ibexEl));

    charts.push(mountSparkline(container.querySelector('#mo-spark-1'), 101, false));
    charts.push(mountSparkline(container.querySelector('#mo-spark-2'), 102, false));
    charts.push(mountSparkline(container.querySelector('#mo-spark-3'), 103, true));

    EDITOR_PICKS.forEach((idea, i) => {
      charts.push(mountIdeaChart(container.querySelector('#mo1-ed-' + i), idea.seed, idea.up));
    });
    IDEA_CARDS.forEach((idea, i) => {
      charts.push(mountIdeaChart(container.querySelector('#mo1-id-' + i), idea.seed, idea.up));
    });

    // Resize handling: refit charts when container width changes
    const ro = new ResizeObserver(() => {
      const ibex = container.querySelector('#mo-ibex');
      charts.forEach((c) => {
        if (!c) return;
        try {
          // Find each chart's container by walking up; simplest: ignore and rely on
          // initial size. Real resize: re-create or use chart.resize().
        } catch (_) {}
      });
      if (ibex && charts[0]) {
        try { charts[0].resize(ibex.clientWidth, ibex.clientHeight); } catch (_) {}
      }
    });
    ro.observe(container);
  });

  /* ----------- Wire clicks on any element with data-ticker ----------- */
  container.querySelectorAll('[data-ticker]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      // Don't fire on the star button or other interactive children
      if (ev.target.closest('button')) return;
      const t = el.getAttribute('data-ticker');
      if (t && typeof ctx.onSelectSymbol === 'function') {
        ctx.onSelectSymbol(t);
      }
    });
  });
}

export default { render };
