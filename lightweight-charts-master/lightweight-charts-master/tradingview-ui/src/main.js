import './styles.css';
import { renderMarketOverview } from './market-overview.js';
import { renderChartView } from './chart-view.js';
import { renderChartViewKline } from './chart-view-kline.js';
// Chart engine: 'lwc' (default — UI completa) | 'kline' (motor alternativo, UI minimal por ahora)
function _getChartEngine() {
  try { return localStorage.getItem('tv.chartEngine') || 'lwc'; } catch { return 'lwc'; }
}
function _setChartEngine(eng) {
  try { localStorage.setItem('tv.chartEngine', eng); } catch {}
}
window.__tvSetChartEngine = (e) => { _setChartEngine(e); location.reload(); };
import { createScreener } from './screener.js';
import { createCryptoCoinsScreener } from './crypto-coins-screener.js';
import { createCrossRatesMatrix, createCryptoMarketCapHeatmap } from './forex-crypto-matrix.js';
import { createYieldCurve, setYieldCurveData } from './plugins/yield-curve-chart.js';
import { createMultiTimeframeView } from './multi-tf-compare.js';
import { createNewsIdeasPane } from './news-ideas-pane.js';
import { createEconomicCalendar } from './economic-calendar.js';
import { createCalculatorsPanel } from './trading-calculators.js';
import { createPaperTradingAccount, createPaperTradingPanel } from './paper-trading.js';
import { createPineEditor, createPineLibrary } from './pine-editor.js';
// Páginas nuevas (rutas limpias, History API) — Figmas 25:xxxxx
import { renderCommunity } from './pages/community.js';
import { renderMarkets } from './pages/markets.js';
import { renderMarketsSpain } from './pages/markets-spain.js';
import { renderCorporateActions } from './pages/corporate-actions.js';
import { renderScreenerETF } from './pages/screener-etf.js';
import { renderScreenerBonds } from './pages/screener-bonds.js';
import { renderScreenerCrypto } from './pages/screener-crypto.js';
import { renderScreenerForex } from './pages/screener-forex.js';
import { renderMarketsWorldEconomyMaps } from './pages/markets-world-economy-maps.js';
import { renderIdeasRecent } from './pages/ideas-recent.js';
import { renderScriptsEditorsPicks } from './pages/scripts-editors-picks.js';
import { render as renderSiteHeader } from './sections/header.js';
import { render as renderGlobalSidebar } from './sections/right-sidebar.js';
import { attachSidebarHandlers } from './sidebars/sidebar-actions.js';

// Mapa de rutas limpias (History API) → render(mount)
const PATH_ROUTES = [
  { test: /^\/community\/?$/,                       title: 'Comunidad — TradingView',                render: renderCommunity },
  { test: /^\/markets\/world-economy\/maps\/?$/,    title: 'Mapas macro — TradingView',              render: renderMarketsWorldEconomyMaps },
  { test: /^\/markets\/world\/spain\/?$/,           title: 'Mercados — España',                       render: renderMarketsSpain },
  { test: /^\/markets\/corporate-actions\/?$/,      title: 'Actividad corporativa',                   render: renderCorporateActions },
  { test: /^\/markets\/?$/,                         title: 'Mercados',                                 render: renderMarkets },
  { test: /^\/ideas\/recent\/?$/,                   title: 'Ideas de la comunidad — TradingView',    render: renderIdeasRecent },
  { test: /^\/scripts\/editors-picks\/?$/,          title: 'Indicadores y estrategias — TradingView', render: renderScriptsEditorsPicks },
  { test: /^\/screeners\/etf\/?$/,                  title: 'Analizador de ETFs — TradingView',        render: renderScreenerETF },
  { test: /^\/screeners\/bonds\/?$/,                title: 'Analizador de bonos — TradingView',       render: renderScreenerBonds },
  { test: /^\/screeners\/crypto\/?$/,               title: 'Analizador de criptos — TradingView',     render: renderScreenerCrypto },
  { test: /^\/screeners\/forex\/?$/,                title: 'Analizador de Forex — TradingView',       render: renderScreenerForex },
];

const app = document.getElementById('app');
let _activePageDestroy = null;
let _navToken = 0;

function _teardown() {
  try { _activePageDestroy && _activePageDestroy(); } catch {}
  _activePageDestroy = null;
}

function _showLoading() {
  app.innerHTML = `
    <div class="tv-route-state" role="status" aria-live="polite">
      <span class="tv-spinner tv-spinner--lg" aria-hidden="true"></span>
      <div class="tv-route-state__desc">Cargando…</div>
    </div>`;
}

function _showError(err) {
  const msg = (err && (err.message || String(err))) || 'Error desconocido';
  app.innerHTML = `
    <div class="tv-route-state" role="alert">
      <div class="tv-route-state__title">Algo ha ido mal</div>
      <div class="tv-route-state__desc">${msg.replace(/</g, '&lt;')}</div>
      <a class="tv-route-state__link" href="#/">Volver a Inicio</a>
    </div>`;
}

function _show404(hash) {
  app.innerHTML = `
    <div class="tv-route-state">
      <div class="tv-route-state__code">404</div>
      <div class="tv-route-state__title">Página no encontrada</div>
      <div class="tv-route-state__desc">La ruta <code>${(hash || '').replace(/</g, '&lt;')}</code> no existe.</div>
      <a class="tv-route-state__link" href="#/">Volver a Inicio</a>
    </div>`;
}

// Map from current location (hash or clean path) → top-nav dropdown label that
// should light up blue. Matched against `hash || pathname`. Order matters:
// first match wins, so put more specific routes before generic prefixes.
const ACTIVE_NAV_BY_ROUTE = [
  // Clean-path routes (PATH_ROUTES in this file)
  { rx: /^\/community/,                          label: 'Comunidad' },
  { rx: /^\/ideas\//,                            label: 'Comunidad' },
  { rx: /^\/scripts\//,                          label: 'Comunidad' },
  { rx: /^\/markets\b/,                          label: 'Mercados'  },
  // Hash routes
  { rx: /^#\/brokers/,                           label: 'Brokers'   },
  { rx: /^#\/chart/,                             label: 'Productos' },
  { rx: /^#\/screener/,                          label: 'Productos' },
  { rx: /^#\/crypto-coins-screener/,             label: 'Productos' },
  { rx: /^#\/fundamental-graphs/,                label: 'Productos' },
  { rx: /^#\/mtf/,                               label: 'Productos' },
  { rx: /^#\/options/,                           label: 'Productos' },
  { rx: /^#\/symbols/,                           label: 'Productos' },
  { rx: /^#\/calendar/,                          label: 'Productos' },
  { rx: /^#\/news/,                              label: 'Comunidad' },
  { rx: /^#\/pine/,                              label: 'Comunidad' },
  { rx: /^#\/fx/,                                label: 'Mercados'  },
  { rx: /^#\/crypto-hm/,                         label: 'Mercados'  },
  { rx: /^#\/yield/,                             label: 'Mercados'  },
  { rx: /^#\/calculators/,                       label: 'Más'       },
  { rx: /^#\/paper/,                             label: 'Más'       },
  { rx: /^#\/portfolio/,                         label: 'Más'       },
];

function _mountSiteHeader(host) {
  // Brand-click should ALWAYS take the user to the real home, even when the
  // browser is currently on a clean-path route like /community. We must reset
  // BOTH pathname and hash, otherwise navigate() sees the lingering path and
  // re-renders that page instead of the market overview.
  const goHome = () => {
    if (window.location.pathname !== '/') {
      history.pushState({}, '', '/');
    }
    if (window.location.hash !== '#/') {
      window.location.hash = '#/';
    } else {
      // Hash already #/ — manually trigger router (hashchange won't fire).
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  renderSiteHeader(host, {
    onNavigate: (target) => {
      if (target == null)            goHome();
      else if (target === 'SEARCH')  window.location.hash = '#/screener';
      else if (target === 'UPGRADE') window.location.hash = '#/pricing';
      else                            goHome();
    },
  });
  // Active-state highlight — match both hash route and clean pathname so
  // /community, /markets, /ideas/* etc. also light up the correct dropdown.
  try {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    const probe = hash || path;
    const match = ACTIVE_NAV_BY_ROUTE.find(r => r.rx.test(probe) || r.rx.test(path));
    if (match) {
      host.querySelectorAll('.mo-header__menu-link').forEach(a => {
        if (a.textContent.trim() === match.label) a.classList.add('is-active');
      });
    }
  } catch {}
}

// Inject CSS for the active nav highlight + page-shell title strip + global
// header/sidebar styling. Idempotent — keeps a single <style> element but
// rewrites its textContent each call so hot-reloaded layout fixes propagate
// without a hard refresh.
function _ensurePageShellCss() {
  let s = document.getElementById('tv-page-shell-css');
  if (!s) {
    s = document.createElement('style');
    s.id = 'tv-page-shell-css';
    document.head.appendChild(s);
  }
  s.textContent = `
    .mo-header__menu-link.is-active { color: #2962ff !important; }
    .mo-header__menu-link.is-active::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: -2px;
      height: 2px; background: #2962ff; border-radius: 2px;
    }
    .mo-header__menu-item { position: relative; }
    .tv-page-shell {
      min-height: 100vh; background: #0d1015; color: #d1d4dc;
      font-family: 'Trebuchet MS', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tv-page-shell__title-strip {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 24px; border-bottom: 1px solid #1e222d;
    }
    .tv-page-shell__back {
      color: #787b86; text-decoration: none; font-size: 13px;
    }
    .tv-page-shell__back:hover { color: #d1d4dc; }
    .tv-page-shell__title {
      margin: 0; font-size: 18px; font-weight: 600; color: #d1d4dc;
    }
    .tv-page-shell__mount { padding: 18px 24px; }

    /* Global site header injected on top of pages that don't ship their own.
     * Use position:fixed (not sticky) so it ALWAYS floats above page content,
     * including pages that themselves use position:fixed (news, calendar,
     * portfolio, symbol-overview, fundamental-graphs) which would otherwise
     * compete with sticky positioning. The very high z-index guarantees the
     * dropdown panels open above ANY page-level chrome. */
    #tv-global-header {
      position: fixed; top: 0; left: 0; right: 0;
      z-index: 9000;
      background: #0d1015;
      border-bottom: 1px solid #1e222d;
      pointer-events: auto;
    }
    /* Push everything in #app down by the 48px header height so it doesn't
     * sit underneath the now-fixed header. Flow pages benefit immediately;
     * fixed pages already set their own top:48px when has-global-header. */
    body.has-global-header #app { padding-top: 48px; }
    /* Dropdown panels need to outrank everything (page roots, modal overlays). */
    #tv-global-header .hdr-dd-panel,
    #tv-global-header .hdr-dd-subpanel { z-index: 9001 !important; }
    /* When the global header is mounted at top of #app, shrink chart-page to
     * fit the remaining viewport so the chart's full UI (top toolbar, axes,
     * bottom strip) is visible without scrolling. */
    body.has-global-header .chart-page { height: calc(100vh - 48px); }

    /* Global right-sidebar (the same 11-icon strip from the chart view, mounted
     * on every page that doesn't already include one). Fixed to the right edge
     * so internal page layouts (which expect full-width #app) keep working.
     * box-sizing:border-box so the 1px left border is INCLUDED in the 45px
     * width — page content at right:45px touches the border with no gap. */
    #tv-global-rightbar {
      position: fixed;
      top: 48px; right: 0;
      width: 45px;
      height: calc(100vh - 48px);
      z-index: 550;
      background: #0f0f0f;
      border-left: 1px solid #2e2e2e;
      box-sizing: border-box;
    }
    /* Push page content 45px in from the right so the sidebar doesn't overlap.
     * For flow-positioned pages only — fixed pages already set their own
     * right offset in their own CSS. */
    body.has-global-rightbar .tv-page-shell,
    body.has-global-rightbar #app > div:not(#tv-global-header):not(#tv-global-rightbar) {
      padding-right: 45px;
    }
  `;
}

// Mount the home header at the very top of #app if no .mo-header exists yet
// (so home + _pageWrap routes that already render one are left untouched).
// Then highlight the active nav item in blue based on the current hash route.
function _ensureGlobalHeader() {
  _ensurePageShellCss();
  // Skip global header injection on the full-screen chart pages — they
  // already render a complete TradingView-style topbar (symbol pill,
  // timeframe selector, chart-type, indicators, alert, etc.) that fills
  // 100vh and would get its bottom time-axis strip clipped off-viewport
  // if we stole 48px at the top.
  const hash = window.location.hash || '';
  const isChartPage = /^#\/(chart|chart-lwc|chart-kline)\b/.test(hash);
  if (isChartPage) {
    document.body.classList.remove('has-global-header');
    const existing = app.querySelector('#tv-global-header');
    if (existing) existing.remove();
    return;
  }

  // If the page already rendered the site header (home, _pageWrap), reuse it.
  let host = app.querySelector('#tv-global-header');
  const existingHeader = app.querySelector('.mo-header');

  if (!existingHeader) {
    // Page doesn't ship its own header — inject one at the top.
    if (!host) {
      host = document.createElement('div');
      host.id = 'tv-global-header';
      app.insertBefore(host, app.firstChild);
    }
    _mountSiteHeader(host);
    document.body.classList.add('has-global-header');
  } else {
    // Page brought its own header — just apply active-state highlight.
    document.body.classList.remove('has-global-header');
    try {
      const hash = window.location.hash || '';
      const path = window.location.pathname || '';
      const probe = hash || path;
      const match = ACTIVE_NAV_BY_ROUTE.find(r => r.rx.test(probe) || r.rx.test(path));
      app.querySelectorAll('.mo-header__menu-link.is-active').forEach(a => a.classList.remove('is-active'));
      if (match) {
        app.querySelectorAll('.mo-header__menu-link').forEach(a => {
          if (a.textContent.trim() === match.label) a.classList.add('is-active');
        });
      }
    } catch {}
  }
}

function _pageWrap(title) {
  _teardown();
  _ensurePageShellCss();
  app.innerHTML = `
    <div class="tv-page-shell">
      <div id="page-site-header"></div>
      <div class="tv-page-shell__title-strip">
        <a class="tv-page-shell__back" href="#/">‹ Inicio</a>
        <h1 class="tv-page-shell__title">${title}</h1>
      </div>
      <div id="page-mount" class="tv-page-shell__mount"></div>
    </div>`;
  _mountSiteHeader(document.getElementById('page-site-header'));
  return document.getElementById('page-mount');
}

// Known route prefixes (used for 404 detection)
const KNOWN_ROUTES = [
  '#/', '#/chart', '#/screener', '#/crypto-coins-screener', '#/fx', '#/crypto-hm', '#/yield',
  '#/mtf', '#/news', '#/news-old', '#/calendar', '#/calculators', '#/paper', '#/pine',
  '#/fundamental-graphs', '#/symbols', '#/portfolio', '#/pricing',
  '#/brokers', '#/options',
];

function _isKnownRoute(hash) {
  if (!hash || hash === '#' || hash === '#/') return true;
  return KNOWN_ROUTES.some((r) => r !== '#/' && hash.startsWith(r));
}

async function navigate() {
  const token = ++_navToken;
  const hash = window.location.hash || '#/';
  const goSymbol = (sym) => { window.location.hash = '#/chart/' + (sym || 'NVDA'); };

  // ---- Rutas limpias (History API): /community, /markets, /markets/world/spain, /markets/corporate-actions
  const path = window.location.pathname;
  const matched = PATH_ROUTES.find(r => r.test.test(path));
  if (matched && (!hash || hash === '#' || hash === '#/')) {
    _teardown();
    document.title = matched.title;
    app.innerHTML = '';
    const w = matched.render(app);
    if (w && typeof w.destroy === 'function') _activePageDestroy = w.destroy;
    return;
  }

  // 404 for unknown hashes
  if (!_isKnownRoute(hash)) {
    _teardown();
    _show404(hash);
    return;
  }

  _showLoading();

  try {
    // Yield once so the loading state paints before heavy synchronous work.
    await Promise.resolve();
    if (token !== _navToken) return;

    if (hash.startsWith('#/fundamental-graphs')) {
      _teardown();
      const mod = await import('./pages/fundamental-graphs.js');
      if (token !== _navToken) return;
      const w = mod.createFundamentalGraphsPage(app, {});
      _activePageDestroy = w.destroy;
      return;
    }
    if (hash.startsWith('#/symbols')) {
      _teardown();
      const sym = decodeURIComponent(hash.split('/')[2] || 'NVDA');
      const mod = await import('./pages/symbol-overview.js');
      if (token !== _navToken) return;
      const w = mod.createSymbolOverviewPage(app, { symbol: sym });
      if (typeof w.render === 'function') w.render();
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/portfolio')) {
      _teardown();
      const mod = await import('./pages/portfolio.js');
      if (token !== _navToken) return;
      const w = mod.createPortfolioPage(app, {});
      if (typeof w.render === 'function') w.render();
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/pricing')) {
      _teardown();
      const mod = await import('./pages/pricing.js');
      if (token !== _navToken) return;
      const w = mod.createPricingPage(app, {});
      if (typeof w.render === 'function') w.render();
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/brokers')) {
      _teardown();
      const mod = await import('./pages/brokers.js');
      if (token !== _navToken) return;
      const w = mod.createBrokersPage(app, {});
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/options')) {
      _teardown();
      // #/options              → chain (default)
      // #/options/chain|builder|finder|volatility|volume
      const m = hash.match(/^#\/options(?:\/([a-z]+))?/);
      const activeTab = (m && m[1]) || 'chain';
      const mod = await import('./pages/options/index.js');
      if (token !== _navToken) return;
      const w = mod.createOptionsPage(app, { activeTab, onSelectSymbol: goSymbol });
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/chart-lwc')) {
      _teardown();
      renderChartView(app);
      return;
    }
    if (hash.startsWith('#/chart-kline')) {
      _teardown();
      renderChartViewKline(app);
      return;
    }
    if (hash.startsWith('#/chart')) {
      _teardown();
      const engine = _getChartEngine();
      try {
        if (engine === 'kline') renderChartViewKline(app);
        else renderChartView(app);
      } catch (e) {
        console.error('[chart engine failed, falling back]', e);
        try { renderChartView(app); } catch (e2) { _showError(e2); }
      }
      return;
    }
    if (hash.startsWith('#/crypto-coins-screener')) {
      _teardown();
      const w = createCryptoCoinsScreener(app, { onSelectSymbol: goSymbol });
      _activePageDestroy = w.destroy;
      return;
    }
    if (hash.startsWith('#/screener')) {
      _teardown();
      const s = createScreener(app, { onSelectSymbol: goSymbol });
      if (typeof s.render === 'function') s.render();
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
      const { chart } = createYieldCurve(m, {});
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
    if (hash.startsWith('#/news-old')) {
      const m = _pageWrap('Noticias e ideas (legacy)');
      m.style.maxWidth = '900px';
      m.style.margin = '0 auto';
      const w = createNewsIdeasPane(m, { onSelectSymbol: goSymbol });
      w.render();
      _activePageDestroy = w.destroy;
      return;
    }
    if (hash.startsWith('#/news')) {
      _teardown();
      const mod = await import('./pages/news.js');
      if (token !== _navToken) return;
      const w = mod.createNewsPage(app, {});
      if (typeof w.render === 'function') w.render();
      _activePageDestroy = w && w.destroy;
      return;
    }
    if (hash.startsWith('#/calendar')) {
      _teardown();
      const m = hash.match(/^#\/calendar(?:\/([a-z]+))?/);
      const tab = (m && m[1]) || 'eventos';
      const mod = await import('./pages/calendar.js');
      if (token !== _navToken) return;
      const w = mod.createCalendarPage(app, { tab });
      if (typeof w.render === 'function') w.render();
      _activePageDestroy = w && w.destroy;
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
  } catch (err) {
    if (token !== _navToken) return;
    console.error('[router] navigation failed:', err);
    _teardown();
    _showError(err);
  }
}

// Mount the same 11-icon right-sidebar (from the chart view) on the right
// edge of every non-chart, non-home page. The chart page has its own embedded
// rightbar with richer panels; the home page renders one internally via
// market-overview.js. For everything else, we inject this fixed strip.
function _ensureGlobalRightbar() {
  const hash = window.location.hash || '';
  const path = window.location.pathname || '';
  const isChartPage = /^#\/(chart|chart-lwc|chart-kline)\b/.test(hash);
  const isHome = (!hash || hash === '#/' || hash === '#') && path === '/';
  // Home + chart already render their own version
  if (isChartPage || isHome) {
    const existing = document.getElementById('tv-global-rightbar');
    if (existing) existing.remove();
    document.body.classList.remove('has-global-rightbar');
    return;
  }
  let host = document.getElementById('tv-global-rightbar');
  if (!host) {
    host = document.createElement('div');
    host.id = 'tv-global-rightbar';
    document.body.appendChild(host);
  }
  try { renderGlobalSidebar(host); } catch {}
  try { attachSidebarHandlers(host); } catch {}
  document.body.classList.add('has-global-rightbar');
}

// After every navigation settles, ensure the home header is present at the
// top of #app (so every screen shares the same nav) and highlight the active
// category in blue. We run on a microtask + a short timeout so async page
// renderers (dynamic imports) have time to flush their HTML into #app.
function _afterNavigate() {
  try { _ensureGlobalHeader(); _ensureGlobalRightbar(); } catch {}
  setTimeout(() => { try { _ensureGlobalHeader(); _ensureGlobalRightbar(); } catch {} }, 0);
  setTimeout(() => { try { _ensureGlobalHeader(); _ensureGlobalRightbar(); } catch {} }, 120);
}
window.addEventListener('hashchange', () => { navigate(); _afterNavigate(); });
window.addEventListener('popstate',   () => { navigate(); _afterNavigate(); });
// SPA: intercept internal <a href="/..."> clicks for clean-path routes
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="/"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('//') || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
  if (PATH_ROUTES.some(r => r.test.test(href.split('?')[0].split('#')[0]))) {
    e.preventDefault();
    history.pushState({}, '', href);
    navigate();
    _afterNavigate();
  }
});
navigate();
_afterNavigate();
