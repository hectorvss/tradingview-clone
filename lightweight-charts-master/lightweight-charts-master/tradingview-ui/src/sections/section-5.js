// src/sections/section-5.js
// Section 5 — "Forex y divisas"
// Reuses existing mo-* classes from styles.css. Only injects a small <style>
// for the 1D/5D/1M toggle pills (new visual polish).
//
// Exports: render(container, ctx = {}) -> { destroy() }

import { createChart, AreaSeries } from 'lightweight-charts';
import { generateSparkline } from '../data.js';

/* ─────────────────────────── DATA ─────────────────────────── */

const EDITOR_PICKS = [
  { exch: 'FX',    ticker: 'EURUSD', title: 'EUR/USD — rebote desde soporte clave',  seed: 51, up: true,  author: 'EditorTeam · hace 1 d' },
  { exch: 'FX',    ticker: 'GBPUSD', title: 'GBP/USD: ruptura de canal bajista',     seed: 52, up: true,  author: 'EditorTeam · hace 1 d' },
  { exch: 'FX',    ticker: 'USDJPY', title: 'USD/JPY en zona de resistencia mayor',  seed: 53, up: false, author: 'EditorTeam · hace 2 d' },
];

const FOREX_PAIRS = [
  { flagL: 'EU', flagR: 'US', pair: 'EUR/USD', chg: 0.140,  val: '1,0842' },
  { flagL: 'GB', flagR: 'US', pair: 'GBP/USD', chg: 0.140,  val: '1,2641' },
  { flagL: 'US', flagR: 'JP', pair: 'USD/JPY', chg: -0.060, val: '157,21' },
  { flagL: 'AU', flagR: 'US', pair: 'AUD/USD', chg: 0.060,  val: '0,6612' },
  { flagL: 'US', flagR: 'CA', pair: 'USD/CAD', chg: -0.125, val: '1,3712' },
  { flagL: 'US', flagR: 'CH', pair: 'USD/CHF', chg: 0.125,  val: '0,8941' },
  { flagL: 'NZ', flagR: 'US', pair: 'NZD/USD', chg: -0.124, val: '0,5984' },
];

const NEWS = [
  { tag: 'anonjuan · Reuters', body: 'La Reserva Federal mantiene tipos: el mercado descuenta dos recortes para final de año.' },
  { tag: 'anonjuan · Reuters', body: 'Tesla anuncia récord de entregas en Europa pese a la presión competitiva china.' },
  { tag: 'anonjuan · Reuters', body: 'Bitcoin recupera los 99.500 USD tras la decisión de la SEC sobre ETF de Ethereum.' },
  { tag: 'anonjuan · Reuters', body: 'El IBEX 35 cierra plano: bancos compensan caídas en utilities tras el dato de IPC.' },
  { tag: 'anonjuan · Reuters', body: 'NVIDIA sorprende con beneficios y guía: el sector chips se dispara en pre-mercado.' },
  { tag: 'anonjuan · Reuters', body: 'El BCE prepara nuevo paquete de liquidez ante tensiones en bonos periféricos.' },
];

const TF_TABS = ['1D', '5D', '1M'];

/* ─────────────────────── LOCAL STYLES ─────────────────────── */

const STYLE_ID = 'mo-section5-styles';
const STYLE_CSS = `
.mo-fx-foot { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; }
.mo-fx-tabs { display:inline-flex; gap:4px; background:#1a1a1a; border-radius:6px; padding:3px; }
.mo-fx-tab  { font-size:11px; padding:4px 10px; border-radius:4px; color:#8c8c8c; cursor:pointer; user-select:none; border:0; background:transparent; }
.mo-fx-tab.is-active { background:#2962ff; color:#fff; }
.mo-fx-tab:hover:not(.is-active) { color:#d1d4dc; }

/* ---------------- Polish layer (UI/UX) ---------------- */
.mo-fx-tab { transition: background-color 100ms ease, color 100ms ease, opacity 100ms ease; min-height: 28px; }
.mo-fx-tab:active { opacity: .7; }

.mo-fx-row { transition: background-color 120ms ease, transform 120ms ease; cursor: pointer; }
.mo-fx-row:hover { background: #1e222d; transform: translateX(2px); }
.mo-fx-row:active { opacity: .7; }

/* Idea / news cards used by section-5 (share .mo-card pattern from global) */
.mo-fx-card,
.mo-fx-idea,
.mo-fx-news { transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease; cursor: pointer; }
.mo-fx-card:hover,
.mo-fx-idea:hover,
.mo-fx-news:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
  border-color: #2962ff;
}
.mo-fx-card:active,
.mo-fx-idea:active,
.mo-fx-news:active { opacity: .7; transform: translateY(-1px); }

/* Loading shimmer for sparklines */
.mo-fx-spark:empty,
[id^="mo-fx-spark-"]:empty {
  background: linear-gradient(90deg, #131722 0%, #1e222d 50%, #131722 100%);
  background-size: 200% 100%;
  animation: mo-fx-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes mo-fx-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.mo-fx-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 120px; color: #787b86; font-size: 13px; text-align: center;
}

/* Responsive — Forex table 4-col -> 2-col -> 1-col */
@media (max-width: 1200px) {
  .mo-fx-table { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 768px) {
  .mo-fx-table { grid-template-columns: 1fr !important; }
  .mo-fx-row { min-height: 44px; }
  .mo-fx-tab { min-height: 36px; padding: 8px 14px; font-size: 12px; }
}
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}

/* ─────────────────────── HELPERS ─────────────────────── */

function subHeader(title) {
  return `<h3 class="mo-h3"><a>${title} <span class="mo-arrow">›</span></a></h3>`;
}

function sectionHeader(title) {
  return `<h2 class="mo-h2"><a>${title} <span class="mo-arrow">›</span></a></h2>`;
}

function fallbackSparkline(seed, up) {
  // Inline gen if generateSparkline isn't suitable; produces array of {time,value}
  let v = 100;
  const out = [];
  const trend = up ? 0.18 : -0.18;
  let t = Math.floor(Date.now() / 1000) - 60 * 60;
  for (let i = 0; i < 60; i++) {
    const r = Math.sin((seed + i) * 0.7) + Math.cos((seed * 1.3 + i) * 0.4);
    v += r * 0.6 + trend;
    out.push({ time: t, value: v });
    t += 60;
  }
  return out;
}

function getSparklineData(seed, up) {
  try {
    const d = generateSparkline(seed, up);
    if (Array.isArray(d) && d.length) return d;
  } catch (_) { /* fall through */ }
  return fallbackSparkline(seed, up);
}

function makeSparkline(container, data, up) {
  if (!container) return null;
  const colorLine = up ? '#089981' : '#f23645';
  const colorTop  = up ? 'rgba(8,153,129,0.30)' : 'rgba(242,54,69,0.30)';
  const colorBot  = up ? 'rgba(8,153,129,0.00)' : 'rgba(242,54,69,0.00)';
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: 'transparent' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    leftPriceScale: { visible: false },
    rightPriceScale: { visible: false },
    timeScale: { visible: false },
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    handleScroll: false,
    handleScale: false,
    width: container.clientWidth || 280,
    height: container.clientHeight || 140,
  });
  const series = chart.addSeries(AreaSeries, {
    lineColor: colorLine,
    topColor: colorTop,
    bottomColor: colorBot,
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  series.setData(data);
  chart.timeScale().fitContent();
  return chart;
}

/* ─────────────────────── HTML BUILDER ─────────────────────── */

function buildHTML() {
  const ideas = EDITOR_PICKS.map((idea, i) => `
    <div class="mo-idea-card" data-ticker="${idea.ticker}" id="mo-s5-idea-${i}">
      <div class="mo-idea-chart" id="mo-s5-chart-${i}"></div>
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
    const isUp = pct >= 0;
    const half = 50;
    const w = Math.min(45, Math.abs(pct) * 200);
    const left = isUp ? half : half - w;
    const colour = isUp ? '#089981' : '#f23645';
    return `
    <div class="mo-fx-row" data-ticker="${p.pair}">
      <span class="mo-fx-pair">${p.flagL}${p.flagR} ${p.pair}</span>
      <div class="mo-fx-bar"><div class="mo-fx-bar-mid"></div><div class="mo-fx-bar-fill" style="left:${left}%;width:${w}%;background:${colour}"></div></div>
      <span class="mo-fx-val ${isUp ? 'up' : 'dn'}">${(pct * 100).toFixed(2).replace('.', ',')}%</span>
    </div>`;
  }).join('');

  const tabs = TF_TABS.map((t, i) => `
    <button class="mo-fx-tab ${i === 0 ? 'is-active' : ''}" data-tf="${t}" type="button">${t}</button>`).join('');

  const news = NEWS.slice(0, 6).map(n => `
    <div class="mo-news-item">
      <div class="mo-news-tag"><span class="mo-news-dot"></span>${n.tag}</div>
      <div class="mo-news-body">${n.body}</div>
    </div>`).join('');

  return `
<section class="mo-section" data-section="5">
  ${sectionHeader('Forex y divisas')}
  ${subHeader('Ideas de trading')}
  <div class="mo-ideas-grid">${ideas}</div>

  ${subHeader('Rendimiento del mercado de divisas')}
  <div class="mo-fx-table">
    ${fxRows}
    <div class="mo-fx-foot">
      <div class="mo-fx-tabs" role="tablist">${tabs}</div>
      <a class="mo-link">Ver todos los tipos ›</a>
    </div>
  </div>

  ${subHeader('Noticias sobre divisas')}
  <div class="mo-news-grid">${news}</div>
  <a class="mo-link">Seguir leyendo ›</a>
</section>`;
}

/* ─────────────────────── MAIN EXPORT ─────────────────────── */

export function render(container, ctx = {}) {
  if (!container) return { destroy() {} };
  ensureStyles();

  const root = document.createElement('div');
  root.innerHTML = buildHTML();
  const sectionEl = root.firstElementChild;
  container.appendChild(sectionEl);

  const charts = [];
  const handlers = []; // { el, type, fn }

  const onIdeaClick = (ticker) => () => {
    if (typeof ctx.onTicker === 'function') ctx.onTicker(ticker);
    else console.log('open ticker', ticker);
  };

  // Wire idea cards
  EDITOR_PICKS.forEach((idea, i) => {
    const card = sectionEl.querySelector(`#mo-s5-idea-${i}`);
    if (card) {
      card.style.cursor = 'pointer';
      const fn = onIdeaClick(idea.ticker);
      card.addEventListener('click', fn);
      handlers.push({ el: card, type: 'click', fn });
    }
  });

  // Wire FX rows
  sectionEl.querySelectorAll('.mo-fx-row[data-ticker]').forEach(row => {
    row.style.cursor = 'pointer';
    const ticker = row.getAttribute('data-ticker');
    const fn = onIdeaClick(ticker);
    row.addEventListener('click', fn);
    handlers.push({ el: row, type: 'click', fn });
  });

  // Wire 1D/5D/1M tabs
  const tabBtns = sectionEl.querySelectorAll('.mo-fx-tab');
  tabBtns.forEach(btn => {
    const fn = () => {
      tabBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const tf = btn.getAttribute('data-tf');
      if (typeof ctx.onTimeframe === 'function') ctx.onTimeframe(tf);
    };
    btn.addEventListener('click', fn);
    handlers.push({ el: btn, type: 'click', fn });
  });

  // Mount sparkline charts after layout settles
  let rafId = requestAnimationFrame(() => {
    rafId = 0;
    EDITOR_PICKS.forEach((idea, i) => {
      const el = sectionEl.querySelector(`#mo-s5-chart-${i}`);
      if (!el) return;
      const data = getSparklineData(idea.seed, idea.up);
      const c = makeSparkline(el, data, idea.up);
      if (c) charts.push(c);
    });
  });

  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      handlers.forEach(({ el, type, fn }) => {
        try { el.removeEventListener(type, fn); } catch (_) {}
      });
      handlers.length = 0;
      charts.forEach(c => { try { c.remove(); } catch (_) {} });
      charts.length = 0;
      if (sectionEl && sectionEl.parentNode) sectionEl.parentNode.removeChild(sectionEl);
    },
  };
}

export default { render };
