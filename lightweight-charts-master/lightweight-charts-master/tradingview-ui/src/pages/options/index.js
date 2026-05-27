// /options — shell (header + title + symbol info bar + sticky sub-tab pills + tab content slot).
// Figma 17:130797 (file 2QhXqtb66hdeKvlZAZE4fS). Default tab = chain.
// Other tabs (builder/finder/volatility/volume) are dynamically imported from sibling
// files owned by parallel agents; if missing or broken, render a "Próximamente" placeholder.
//
// Visual target: https://es.tradingview.com/options/chain/?symbol=CME_MINI:ES1!
// The shell renders the chrome around the active tab and is responsible for the
// symbol header (ticker + live price + change + intraday stats) and the sticky
// tab strip so the chain table below can scroll under it.

const STYLE_ID = 'opt-shell-style';

const STYLES = `
.opt-page {
  background: var(--grey-6, #0f0f0f);
  color: var(--grey-86, #dbdbdb);
  /* When the global header (48px) is mounted, cap the page to the visible
   * viewport so the options table can scroll internally without page-level
   * scroll. The global rightbar (45px) is accounted for via padding-right. */
  min-height: 100vh;
  font-family: var(--font-ui, 'Trebuchet MS', Arial, sans-serif);
  display: flex; flex-direction: column;
  position: relative;
}
body.has-global-header   .opt-page { min-height: calc(100vh - 48px); height: calc(100vh - 48px); }
body.has-global-rightbar .opt-page { padding-right: 45px; }
body.has-global-header   .opt-header { display: none !important; }
.opt-page .opt-logo, .opt-page .opt-logo-mark { display: none !important; }
.opt-header img { max-width: 100%; max-height: 100%; }
.opt-header {
  display: flex; align-items: center; gap: 18px;
  height: 48px; padding: 0 14px;
  background: var(--grey-6, #0f0f0f);
  border-bottom: 1px solid var(--grey-18, #2e2e2e);
  flex: 0 0 auto;
}
.opt-logo { display: flex; align-items: center; gap: 6px; color: #fff; font-weight: 700; font-size: 18px; letter-spacing: -0.2px; }
.opt-logo-mark {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg,#2962ff,#5b9cf6);
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 800;
}
.opt-search {
  flex: 0 1 280px; height: 32px;
  background: var(--grey-12, #1f1f1f);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 4px;
  padding: 0 10px;
  display: flex; align-items: center;
  color: var(--grey-55, #8c8c8c);
  font-size: 13px;
}
.opt-nav { display: flex; align-items: center; gap: 18px; font-size: 14px; color: var(--grey-86, #dbdbdb); }
.opt-nav a { color: inherit; text-decoration: none; cursor: pointer; }
.opt-nav a.active { color: #fff; font-weight: 700; }
.opt-nav a:hover { color: #fff; }
.opt-header-spacer { flex: 1 1 auto; }
.opt-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg,#96609f,#d500f9);
  color: #fff; font-weight: 700; font-size: 13px;
  display: inline-flex; align-items: center; justify-content: center;
}
.opt-ampliar {
  height: 32px; padding: 0 14px;
  background: var(--azure-58, #2962ff);
  color: #fff; font-weight: 700; font-size: 13px;
  border: none; border-radius: 4px; cursor: pointer;
}

/* ---- Title row (Opciones + TradeStation badge) ---- */
.opt-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px 4px;
  flex: 0 0 auto;
}
.opt-title {
  font-size: 28px; line-height: 1; font-weight: 400; color: #fff;
  font-family: Inter, var(--font-ui, Arial), sans-serif;
}
.opt-tradestation { display: flex; align-items: center; gap: 6px; color: var(--grey-86, #dbdbdb); font-size: 13px; font-weight: 600; }
.opt-ts-mark {
  width: 16px; height: 16px; border-radius: 3px;
  background: linear-gradient(135deg,#00bce6,#22ab94);
  display: inline-block;
}

/* ---- Symbol info bar (between title and tabs) ---- */
.opt-symbol-bar {
  display: flex; align-items: flex-start; gap: 18px;
  padding: 6px 16px 10px;
  flex: 0 0 auto;
}
.opt-symbol-main {
  display: flex; align-items: baseline; gap: 10px;
  flex-wrap: wrap;
}
.opt-symbol-flag {
  width: 14px; height: 10px; display: inline-block;
  background: linear-gradient(to bottom, #c8102e 0 33%, #ffffff 33% 66%, #c8102e 66% 100%);
  border-radius: 1px;
  transform: translateY(2px);
  margin-right: 4px;
}
.opt-symbol-name {
  color: #fff; font-size: 14px; font-weight: 700;
  letter-spacing: 0.2px;
}
.opt-symbol-price {
  color: #fff; font-size: 22px; font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.opt-symbol-ccy {
  color: var(--grey-55, #8c8c8c); font-size: 12px; font-weight: 600;
}
.opt-symbol-change {
  color: #22ab94; font-size: 14px; font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.opt-symbol-change.neg { color: #f23645; }
.opt-symbol-stats {
  display: flex; flex-wrap: wrap; gap: 14px;
  color: var(--grey-55, #8c8c8c);
  font-size: 12px;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.opt-symbol-stats .opt-stat b {
  color: var(--grey-86, #dbdbdb); font-weight: 500;
  margin-left: 4px;
}
.opt-symbol-block { display: flex; flex-direction: column; gap: 2px; }

/* ---- Tab row (sticky under the global header) ---- */
.opt-tabrow {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px 8px;
  flex-wrap: wrap;
  flex: 0 0 auto;
  background: var(--grey-6, #0f0f0f);
  border-bottom: 1px solid var(--grey-18, #2e2e2e);
  position: sticky; top: 0; z-index: 5;
}
body.has-global-header .opt-tabrow { top: 0; }
.opt-ticker-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 10px;
  background: var(--grey-12, #1f1f1f);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 14px;
  color: var(--grey-86, #dbdbdb);
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.opt-ticker-dot { width: 8px; height: 8px; border-radius: 50%; background: #f23645; box-shadow: 0 0 0 2px rgba(34,171,148,0.45); }
.opt-ticker-pill .opt-ticker-dot { background: #f23645; }
.opt-ticker-pill .opt-ticker-live { width: 6px; height: 6px; border-radius: 50%; background: #22ab94; margin-left: 2px; }
.opt-ticker-caret { color: var(--grey-55, #8c8c8c); font-size: 10px; }
.opt-tab-pill {
  display: inline-flex; align-items: center; height: 28px; padding: 0 14px;
  border-radius: 14px; cursor: pointer;
  color: var(--grey-86, #dbdbdb);
  font-size: 13px; font-weight: 600;
  background: transparent; border: 1px solid transparent;
  user-select: none;
}
.opt-tab-pill:hover { background: var(--grey-12, #1f1f1f); }
.opt-tab-pill.active {
  background: var(--grey-86, #dbdbdb); color: var(--grey-6, #0f0f0f);
  font-weight: 700;
}

/* ---- Content slot (the only scrollable region) ---- */
.opt-tab-content {
  flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column;
  overflow: auto;
}
.opt-soon {
  margin: 40px 18px; padding: 60px 24px;
  background: var(--grey-12, #1f1f1f);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 6px;
  text-align: center; color: var(--grey-55, #8c8c8c); font-size: 14px;
}
.opt-soon strong { display: block; font-size: 18px; color: var(--grey-86, #dbdbdb); margin-bottom: 6px; }
`;

const TABS = [
  { id: 'chain',      label: 'Chain' },
  { id: 'builder',    label: 'Creador de estrategias' },
  { id: 'finder',     label: 'Buscador de estrategias' },
  { id: 'volatility', label: 'Volatilidad' },
  { id: 'volume',     label: 'Volumen' },
];

// Mock quote — Spanish locale (`.` thousands, `,` decimal). Values mirror what
// the live page shows for CME_MINI:ES1! around mid-session.
const QUOTE = {
  symbol:   'CME_MINI:ES1!',
  price:    '5.842,25',
  currency: 'USD',
  change:   '+12,50',
  changePc: '+0,21%',
  positive: true,
  stats: [
    { label: 'Apertura',    value: '5.829,75' },
    { label: 'Máx.',        value: '5.846,50' },
    { label: 'Mín.',        value: '5.825,00' },
    { label: 'Cierre ant.', value: '5.829,75' },
    { label: 'Vol.',        value: '1,2M' },
  ],
};

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

function renderShell(mount, activeTab) {
  const tabsHTML = TABS.map(t =>
    `<button class="opt-tab-pill ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
  ).join('');

  const changeClass = QUOTE.positive ? '' : ' neg';
  const statsHTML = QUOTE.stats.map(s =>
    `<span class="opt-stat">${s.label}<b>${s.value}</b></span>`
  ).join('');

  mount.innerHTML = `
    <div class="opt-page">
      <header class="opt-header">
        <a class="opt-logo" href="#/" data-nav>
          <span class="opt-logo-mark">TV</span>
          <span>TradingView</span>
        </a>
        <div class="opt-search">Buscar (Ctrl+K)</div>
        <nav class="opt-nav">
          <a class="active" data-nav href="#/options">Productos</a>
          <a data-nav href="#/community">Comunidad</a>
          <a data-nav href="#/markets">Mercados</a>
          <a data-nav href="#/brokers">Brokers</a>
          <a data-nav href="#/">Más</a>
        </nav>
        <div class="opt-header-spacer"></div>
        <div class="opt-avatar">HV</div>
        <button class="opt-ampliar" type="button">Ampliar</button>
      </header>

      <div class="opt-titlebar">
        <div class="opt-title">Opciones</div>
        <div class="opt-tradestation">
          <span class="opt-ts-mark"></span>
          <span>TradeStation</span>
        </div>
      </div>

      <div class="opt-symbol-bar">
        <div class="opt-symbol-block">
          <div class="opt-symbol-main">
            <span class="opt-symbol-flag" title="USA"></span>
            <span class="opt-symbol-name">${QUOTE.symbol}</span>
            <span class="opt-symbol-price">${QUOTE.price}</span>
            <span class="opt-symbol-ccy">${QUOTE.currency}</span>
            <span class="opt-symbol-change${changeClass}">${QUOTE.change}</span>
            <span class="opt-symbol-change${changeClass}">${QUOTE.changePc}</span>
          </div>
          <div class="opt-symbol-stats">${statsHTML}</div>
        </div>
      </div>

      <div class="opt-tabrow">
        <button class="opt-ticker-pill" type="button">
          <span class="opt-ticker-dot"></span>
          <span>ES1!</span>
          <span class="opt-ticker-live"></span>
          <span class="opt-ticker-caret">▼</span>
        </button>
        ${tabsHTML}
      </div>

      <div class="opt-tab-content" id="optsTabContent"></div>
    </div>
  `;

  const tabRow = mount.querySelector('.opt-tabrow');
  tabRow.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.opt-tab-pill');
    if (!btn) return;
    const tab = btn.getAttribute('data-tab');
    if (!tab || tab === activeTab) return;
    location.hash = `#/options/${tab}`;
  });
}

function renderPlaceholder(slot, label) {
  slot.innerHTML = `
    <div class="opt-soon">
      <strong>${label}</strong>
      Próximamente
    </div>
  `;
}

async function loadTab(slot, activeTab, opts) {
  const map = {
    chain:      { mod: './tab-chain.js',      fn: 'renderOptionsChainTab',      label: 'Chain' },
    builder:    { mod: './tab-builder.js',    fn: 'renderOptionsBuilderTab',    label: 'Creador de estrategias' },
    finder:     { mod: './tab-finder.js',     fn: 'renderOptionsFinderTab',     label: 'Buscador de estrategias' },
    volatility: { mod: './tab-volatility.js', fn: 'renderOptionsVolatilityTab', label: 'Volatilidad' },
    volume:     { mod: './tab-volume.js',     fn: 'renderOptionsVolumeTab',     label: 'Volumen' },
  };
  const entry = map[activeTab] || map.chain;

  try {
    // Vite needs the path to be statically analyzable up to the variable segment.
    let module;
    switch (activeTab) {
      case 'chain':      module = await import('./tab-chain.js'); break;
      case 'builder':    module = await import('./tab-builder.js'); break;
      case 'finder':     module = await import('./tab-finder.js'); break;
      case 'volatility': module = await import('./tab-volatility.js'); break;
      case 'volume':     module = await import('./tab-volume.js'); break;
      default:           module = await import('./tab-chain.js'); break;
    }
    const fn = module && module[entry.fn];
    if (typeof fn !== 'function') {
      renderPlaceholder(slot, entry.label);
      return { destroy() { slot.innerHTML = ''; } };
    }
    const handle = fn(slot, opts) || {};
    return handle;
  } catch (err) {
    // Module missing or threw — render placeholder, don't crash the shell.
    // eslint-disable-next-line no-console
    console.warn('[options] tab module unavailable:', activeTab, err && err.message);
    renderPlaceholder(slot, entry.label);
    return { destroy() { slot.innerHTML = ''; } };
  }
}

export function createOptionsPage(mount, opts = {}) {
  injectStyle();
  const validTabs = new Set(TABS.map(t => t.id));
  const activeTab = validTabs.has(opts.activeTab) ? opts.activeTab : 'chain';

  renderShell(mount, activeTab);

  const slot = mount.querySelector('#optsTabContent');
  let tabHandle = null;
  loadTab(slot, activeTab, opts).then(h => { tabHandle = h; });

  // Header nav click — let hash links route naturally; avatar/ampliar are decorative.
  return {
    destroy() {
      try { tabHandle && tabHandle.destroy && tabHandle.destroy(); } catch (_) {}
      mount.innerHTML = '';
    }
  };
}
