import './styles.css';
import { renderMarketOverview } from './market-overview.js';
import { renderChartView } from './chart-view.js';
import { createScreener } from './screener.js';
import { createCrossRatesMatrix, createCryptoMarketCapHeatmap } from './forex-crypto-matrix.js';
import { createYieldCurve, setYieldCurveData } from './plugins/yield-curve-chart.js';
import { createMultiTimeframeView } from './multi-tf-compare.js';
import { createNewsIdeasPane } from './news-ideas-pane.js';
import { createEconomicCalendar } from './economic-calendar.js';
import { createCalculatorsPanel } from './trading-calculators.js';
import { createPaperTradingAccount, createPaperTradingPanel } from './paper-trading.js';
import { createPineEditor, createPineLibrary } from './pine-editor.js';

const app = document.getElementById('app');
let _activePageDestroy = null;

function _teardown() {
  try { _activePageDestroy && _activePageDestroy(); } catch {}
  _activePageDestroy = null;
}

function _pageWrap(title) {
  _teardown();
  app.innerHTML = `
    <div style="min-height:100vh;background:#0d1015;color:#d1d4dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="padding:18px 24px;border-bottom:1px solid #1e222d;display:flex;align-items:center;gap:16px">
        <a href="#/" style="color:#787b86;text-decoration:none;font-size:13px">‹ Inicio</a>
        <h1 style="margin:0;font-size:18px;font-weight:600">${title}</h1>
        <nav style="margin-left:auto;display:flex;gap:14px;font-size:12px">
          <a href="#/chart/NVDA" style="color:#787b86;text-decoration:none">Gráfico</a>
          <a href="#/screener" style="color:#787b86;text-decoration:none">Screener</a>
          <a href="#/fx" style="color:#787b86;text-decoration:none">Forex</a>
          <a href="#/crypto-hm" style="color:#787b86;text-decoration:none">Crypto Heatmap</a>
          <a href="#/yield" style="color:#787b86;text-decoration:none">Curva tipos</a>
          <a href="#/mtf/BTCUSD" style="color:#787b86;text-decoration:none">Multi-TF</a>
          <a href="#/news" style="color:#787b86;text-decoration:none">Noticias</a>
          <a href="#/calendar" style="color:#787b86;text-decoration:none">Calendario</a>
          <a href="#/calculators" style="color:#787b86;text-decoration:none">Calculadoras</a>
          <a href="#/paper" style="color:#787b86;text-decoration:none">Paper Trading</a>
          <a href="#/pine" style="color:#787b86;text-decoration:none">Pine Editor</a>
        </nav>
      </div>
      <div id="page-mount" style="padding:18px 24px"></div>
    </div>`;
  return document.getElementById('page-mount');
}

function navigate() {
  const hash = window.location.hash || '#/';
  const goSymbol = (sym) => { window.location.hash = '#/chart/' + (sym || 'NVDA'); };

  if (hash.startsWith('#/chart')) {
    _teardown();
    renderChartView(app);
    return;
  }
  if (hash.startsWith('#/screener')) {
    const m = _pageWrap('Screener de acciones');
    const s = createScreener(m, { onSelectSymbol: goSymbol });
    s.render();
    _activePageDestroy = s.destroy;
    return;
  }
  if (hash.startsWith('#/fx')) {
    const m = _pageWrap('Forex — Tabla de cruces');
    const w = createCrossRatesMatrix(m, { onSelectPair: goSymbol });
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/crypto-hm')) {
    const m = _pageWrap('Mapa de calor — Cripto');
    m.style.height = '80vh';
    const w = createCryptoMarketCapHeatmap(m, { onSelectCoin: goSymbol });
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/yield')) {
    const m = _pageWrap('Curva de tipos — Treasuries');
    m.style.height = '500px';
    const { chart, series } = createYieldCurve(m, {});
    setYieldCurveData(chart, [
      { time: 1,   value: 5.42 }, { time: 3,   value: 5.38 },
      { time: 6,   value: 5.29 }, { time: 12,  value: 5.05 },
      { time: 24,  value: 4.78 }, { time: 36,  value: 4.55 },
      { time: 60,  value: 4.35 }, { time: 84,  value: 4.30 },
      { time: 120, value: 4.32 }, { time: 240, value: 4.55 },
      { time: 360, value: 4.62 },
    ]);
    _activePageDestroy = () => { try { chart.remove(); } catch {} };
    return;
  }
  if (hash.startsWith('#/mtf')) {
    const sym = decodeURIComponent(hash.split('/')[2] || 'BTCUSD');
    const m = _pageWrap(`Multi-TF — ${sym}`);
    m.style.height = '82vh';
    const w = createMultiTimeframeView(m, {
      symbol: sym,
      timeframes: ['5m', '15m', '1h', '4h', '1D'],
      syncCrosshair: true,
    });
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/news')) {
    const m = _pageWrap('Noticias e ideas');
    m.style.maxWidth = '900px';
    m.style.margin = '0 auto';
    const w = createNewsIdeasPane(m, { onSelectSymbol: goSymbol });
    w.render();
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/calendar')) {
    const m = _pageWrap('Calendario económico');
    const w = createEconomicCalendar(m, {});
    w.render();
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/calculators')) {
    const m = _pageWrap('Calculadoras de trading');
    m.style.maxWidth = '1000px';
    m.style.margin = '0 auto';
    const w = createCalculatorsPanel(m, {});
    w.render();
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/paper')) {
    const m = _pageWrap('Paper Trading');
    const account = createPaperTradingAccount({ initialBalance: 100000 });
    const w = createPaperTradingPanel(m, { account });
    w.render();
    _activePageDestroy = w.destroy;
    return;
  }
  if (hash.startsWith('#/pine')) {
    const m = _pageWrap('Pine Script — Editor + Biblioteca');
    m.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 360px;gap:14px;min-height:80vh">
        <div id="pine-editor-mount"></div>
        <div id="pine-library-mount"></div>
      </div>`;
    const editor = createPineEditor(m.querySelector('#pine-editor-mount'), {
      onAddToChart: (script) => alert('Añadido al gráfico: ' + script.name),
    });
    const lib = createPineLibrary(m.querySelector('#pine-library-mount'), {
      onLoadScript: (code) => {
        const ta = m.querySelector('textarea');
        if (ta) { ta.value = code; ta.dispatchEvent(new Event('input')); }
      },
    });
    editor.render(); lib.render();
    _activePageDestroy = () => { try { editor.destroy(); lib.destroy(); } catch {} };
    return;
  }

  // Default → home
  _teardown();
  renderMarketOverview(app, () => { goSymbol('NVDA'); });
}

window.addEventListener('hashchange', navigate);
navigate();
