// src/sections/header.js - TradingView header bar (Figma node 1:41502)
// Pixel-perfect translation of the top header (1395x64) from Figma file 2QhXqtb66hdeKvlZAZE4fS.

let _cssInjected = false;

const ICONS = {
  logoIcon:      '/src/icons/tv-logo-icon.svg',
  logoIconInner: '/src/icons/tv-logo-icon-inner.svg',
  logoText:      '/src/icons/tv-logo-text.svg',
  search:        '/src/icons/header-search.svg',
  caret:         '/src/icons/header-caret.svg',
  avatar:        '/src/icons/header-avatar.svg',
};

// Reusable SVG icons (TradingView-style line icons, 18x18 viewBox, 1.5 stroke)
const ICO = {
  bolt:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2L4 10h4l-1 6 7-8h-4l1-6z"/></svg>',
  trophy:   '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4V3z"/><path d="M5 5H3v1a2 2 0 0 0 2 2M13 5h2v1a2 2 0 0 1-2 2M9 10v3M6 15h6"/></svg>',
  chart:    '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="6.5"/><path d="M9 5v4l2.5 2.5"/></svg>',
  calendar: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="3.5" width="13" height="12" rx="1.5"/><path d="M2.5 7h13M6 2v3M12 2v3"/></svg>',
  news:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="3.5" width="13" height="11" rx="1"/><path d="M5 6.5h8M5 9h8M5 11.5h5"/></svg>',
  briefcase:'<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="5.5" width="13" height="9" rx="1.5"/><path d="M6 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5"/></svg>',
  bars:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 15V8M7 15V4M11 15v-5M15 15V6"/></svg>',
  curve:    '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14C5 12 7 5 9 5s4 7 7 9"/></svg>',
  cog:      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="2.2"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.5 1.5M12.5 12.5L14 14M4 14l1.5-1.5M12.5 5.5L14 4"/></svg>',
  globe:    '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="6.5"/><path d="M2.5 9h13M9 2.5c2 2 2 11 0 13M9 2.5c-2 2-2 11 0 13"/></svg>',
  flag:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 15V3l9 1.5L4 6"/></svg>',
  paper:    '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2.5h7l3 3V15a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"/><path d="M11 2.5v3h3"/></svg>',
  bulb:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 12a3 3 0 0 1-1-2.3A4.5 4.5 0 1 1 12.5 12M7 14h4M7.5 16h3"/></svg>',
  pen:      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3l4 4-9 9H2v-4z"/></svg>',
  bag:      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h10l-1 9H5z"/><path d="M7 6V4a2 2 0 0 1 4 0v2"/></svg>',
  star:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2l2.2 4.5L16 7.3l-3.5 3.4.8 4.8L9 13.3 4.7 15.5l.8-4.8L2 7.3l4.8-.8z"/></svg>',
  scales:   '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2v14M3 15h12M9 4l-4 6h8z"/></svg>',
  plus:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="6.5"/><path d="M9 6v6M6 9h6"/></svg>',
  brokers:  '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="2.5"/><circle cx="13" cy="6" r="2.5"/><path d="M2 15a4 4 0 0 1 8 0M9 15a4 4 0 0 1 7 0"/></svg>',
  calc:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2.5" width="12" height="13" rx="1.5"/><rect x="5" y="4.5" width="8" height="2.5" rx="0.5"/><path d="M5.5 10h.01M9 10h.01M12.5 10h.01M5.5 13h.01M9 13h.01M12.5 13h.01"/></svg>',
  grid:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="5" height="5" rx="0.5"/><rect x="10.5" y="2.5" width="5" height="5" rx="0.5"/><rect x="2.5" y="10.5" width="5" height="5" rx="0.5"/><rect x="10.5" y="10.5" width="5" height="5" rx="0.5"/></svg>',
  fire:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2c0 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-4 1 1 2 2 2 4 0-2 1-5 1-8z"/></svg>',
  swap:     '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h10l-3-3M15 12H5l3 3"/></svg>',
};

// Each entry has a label, an optional href fallback, and `dropdown` array of
// sections {hero?, section?, items:[{icon,label,desc?,href,arrow?,meta?}]}.
// NOTE: every href below points to a real, routable page in main.js (either a
// hash route like `#/chart/SYM` or a clean-path PATH_ROUTES entry like
// `/community`). The SPA click handler in main.js intercepts the latter and
// dispatches via History API. Audit: 2026-05-27 — every page that exists in
// the codebase is now reachable from at least one dropdown.
const NAV_ITEMS = [
  {
    label: 'Productos', href: '#/chart/BTCUSDT',
    dropdown: [
      { hero: { icon: ICO.bolt, label: 'Supergráficos', desc: 'El único terminal para dominarlos a todos', href: '#/chart/BTCUSDT' } },
      { section: 'Herramientas de análisis', items: [
        { icon: ICO.chart,     label: 'Screener de acciones',       href: '#/screener',                arrow: true },
        { icon: ICO.fire,      label: 'Screener de cripto',         href: '#/crypto-coins-screener',   arrow: true },
        { icon: ICO.bars,      label: 'Gráficos fundamentales',     href: '#/fundamental-graphs',      arrow: true },
        { icon: ICO.grid,      label: 'Multi-timeframe',            href: '#/mtf/BTCUSD' },
        { icon: ICO.cog,       label: 'Opciones (chain / builder)', href: '#/options' },
        { icon: ICO.curve,     label: 'Curvas de rendimiento',      href: '#/yield' },
      ]},
      { section: 'Datos & contenido', items: [
        { icon: ICO.calendar,  label: 'Calendario económico',       href: '#/calendar',                arrow: true },
        { icon: ICO.news,      label: 'Flujo de noticias',          href: '#/news' },
        { icon: ICO.star,      label: 'Vista de símbolo',           href: '#/symbols/NVDA' },
        { icon: ICO.globe,     label: 'Mapa de calor cripto',       href: '#/crypto-hm' },
      ]},
      { section: 'Motores de gráfico', items: [
        { icon: ICO.chart,     label: 'Lightweight-Charts',         href: '#/chart-lwc' },
        { icon: ICO.chart,     label: 'KLineChart',                 href: '#/chart-kline' },
      ]},
    ],
  },
  {
    label: 'Comunidad', href: '/community',
    dropdown: [
      { hero: { icon: ICO.trophy, label: 'Hub de la comunidad', desc: 'Ideas, scripts y traders destacados', href: '/community' } },
      { section: 'Creado por traders', items: [
        { icon: ICO.bulb, label: 'Ideas recientes',           href: '/ideas/recent',        arrow: true },
        { icon: ICO.pen,  label: 'Scripts: selección editor', href: '/scripts/editors-picks', arrow: true },
        { icon: ICO.news, label: 'Flujo de noticias',         href: '#/news' },
      ]},
      { section: 'Crea & comparte', items: [
        { icon: ICO.pen,    label: 'Pine Script Editor',       href: '#/pine' },
        { icon: ICO.paper,  label: 'Paper Trading',            href: '#/paper' },
      ]},
    ],
  },
  {
    label: 'Mercados', href: '/markets',
    dropdown: [
      { hero: { icon: ICO.globe, label: 'Vista global de mercados', desc: 'Índices, materias primas, divisas y cripto', href: '/markets' } },
      { section: 'Por activo', items: [
        { icon: ICO.bars,    label: 'Acciones / Índices / ETFs', href: '#/screener',   arrow: true },
        { icon: ICO.fire,    label: 'Cripto (heatmap)',          href: '#/crypto-hm',  arrow: true },
        { icon: ICO.fire,    label: 'Cripto (coins screener)',   href: '#/crypto-coins-screener', arrow: true },
        { icon: ICO.swap,    label: 'Forex — tabla de cruces',   href: '#/fx',         arrow: true },
        { icon: ICO.curve,   label: 'Bonos & curva de tipos',    href: '#/yield',      arrow: true },
        { icon: ICO.calendar,label: 'Economía & calendario',     href: '#/calendar',   arrow: true },
      ]},
      { section: 'Por región & evento', items: [
        { icon: ICO.flag,    label: 'Mercados — España',         href: '/markets/world/spain',          arrow: true },
        { icon: ICO.globe,   label: 'Mapas economía mundial',    href: '/markets/world-economy/maps',   arrow: true },
        { icon: ICO.briefcase, label: 'Actividad corporativa',   href: '/markets/corporate-actions',    arrow: true },
      ]},
    ],
  },
  {
    label: 'Brokers', href: '#/brokers',
    dropdown: [
      { hero: { icon: ICO.brokers, label: 'Directorio de brokers', desc: 'Compara plataformas, comisiones y mercados disponibles', href: '#/brokers' } },
      { section: 'Acciones rápidas', items: [
        { icon: ICO.star,    label: 'Principales brokers', href: '#/brokers' },
        { icon: ICO.scales,  label: 'Compare brokers',     href: '#/brokers' },
        { icon: ICO.plus,    label: 'Abrir una cuenta',    href: '#/brokers' },
        { icon: ICO.trophy,  label: 'Brokers premiados',   href: '#/brokers' },
      ]},
      { section: 'Brokers destacados', items: [
        { icon: ICO.brokers, label: 'OKX',                 meta: '4.8 ★', href: '#/brokers' },
        { icon: ICO.brokers, label: 'AMP Futures',         meta: '4.6 ★', href: '#/brokers' },
        { icon: ICO.brokers, label: 'WhiteBIT',            meta: '4.4 ★', href: '#/brokers' },
        { icon: ICO.brokers, label: 'Interactive Brokers', meta: '4.2 ★', href: '#/brokers' },
      ]},
    ],
  },
  {
    label: 'Más', href: '#/portfolio',
    dropdown: [
      { section: 'Herramientas', items: [
        { icon: ICO.calc,      label: 'Calculadoras de trading',  href: '#/calculators' },
        { icon: ICO.paper,     label: 'Paper trading',            href: '#/paper' },
        { icon: ICO.briefcase, label: 'Carteras',                 href: '#/portfolio' },
        { icon: ICO.pen,       label: 'Pine Script Editor',       href: '#/pine' },
      ]},
      { section: 'Análisis avanzado', items: [
        { icon: ICO.grid,      label: 'Multi-timeframe',          href: '#/mtf/BTCUSD' },
        { icon: ICO.swap,      label: 'Tabla de Forex',           href: '#/fx' },
        { icon: ICO.curve,     label: 'Curva de rendimiento',     href: '#/yield' },
        { icon: ICO.fire,      label: 'Mapa de calor cripto',     href: '#/crypto-hm' },
      ]},
      { section: 'Mercados & datos', items: [
        { icon: ICO.bars,      label: 'Gráficos fundamentales',   href: '#/fundamental-graphs' },
        { icon: ICO.cog,       label: 'Opciones',                 href: '#/options' },
        { icon: ICO.star,      label: 'Vista de símbolo',         href: '#/symbols/NVDA' },
      ]},
    ],
  },
];

const CSS = `
  .mo-header,
  .mo-header *,
  .mo-header *::before,
  .mo-header *::after { box-sizing: border-box; }

  .mo-header {
    width: 100%;
    background: #000;
    color: #fff;
    font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, sans-serif);
    user-select: none;
  }

  .mo-header__inner {
    display: flex;
    align-items: center;
    height: 48px;
    width: 100%;
    padding: 0 40px;
  }

  /* ---------------- Logo ---------------- */
  .mo-header__logo {
    display: flex;
    align-items: center;
    height: 48px;
    flex-shrink: 0;
  }
  .mo-header__logo-link {
    display: flex;
    align-items: center;
    height: 22px;
    text-decoration: none;
    color: #fff;
    cursor: pointer;
  }
  .mo-header__logo-mark {
    /* Preserve original 36×28 (1.286:1) aspect ratio at the new 22px height. */
    width: 28px;
    height: 22px;
    background: url('${ICONS.logoIcon}') no-repeat center / contain;
    flex-shrink: 0;
  }
  .mo-header__logo-text-wrap {
    display: flex;
    align-items: center;
    height: 48px;
    padding-left: 6px;
    flex-shrink: 0;
  }
  .mo-header__logo-text {
    /* Preserve original 147×28 (5.25:1) aspect ratio at the new 22px height. */
    width: 116px;
    height: 22px;
    background: url('${ICONS.logoText}') no-repeat center / contain;
    flex-shrink: 0;
  }

  /* ---------------- Middle ---------------- */
  .mo-header__middle-wrapper {
    display: flex;
    flex: 1 0 0;
    min-width: 0;
    height: 48px;
    align-items: flex-start;
    justify-content: center;
  }
  .mo-header__middle-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 915.86px;
  }

  /* ---------------- Search ---------------- */
  .mo-header__search-margin {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-right: 8px;
    flex-shrink: 0;
  }
  .mo-header__search {
    display: flex;
    align-items: center;
    height: 40px;
    background: #2e2e2e;
    border-radius: 40px;
    padding: 6px 54.97px 6px 6px;
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    color: inherit;
    font-family: inherit;
  }
  .mo-header__search-icon {
    width: 28px;
    height: 28px;
    background: url('${ICONS.search}') no-repeat center / 18px 18px;
    flex-shrink: 0;
  }
  .mo-header__search-text-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-left: 4px;
  }
  .mo-header__search-placeholder,
  .mo-header__search-hotkey {
    font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, sans-serif);
    font-size: 16px;
    line-height: 24px;
    color: #b8b8b8;
    white-space: nowrap;
  }
  .mo-header__search-hotkey {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24.5px;
    width: 56.19px;
  }

  /* ---------------- Main menu ---------------- */
  .mo-header__main-menu {
    display: flex;
    align-items: flex-start;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .mo-header__menu-item {
    display: flex;
    align-items: flex-start;
    padding: 12px 0;
    align-self: stretch;
    flex-shrink: 0;
  }
  .mo-header__menu-link {
    position: relative;
    display: flex;
    align-items: center;
    height: 40px;
    padding: 7.5px 16px 8.5px;
    border-radius: 36px;
    color: #fff;
    text-decoration: none;
    font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, sans-serif);
    font-size: 16px;
    line-height: 24px;
    letter-spacing: 0.3px;
    white-space: nowrap;
    cursor: pointer;
    flex-shrink: 0;
    background: transparent;
    border: none;
    transition: background-color 0.12s ease;
  }
  .mo-header__menu-link:hover {
    background: #2e2e2e;
  }

  /* ---------------- Right area ---------------- */
  .mo-header__area--right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  /* Avatar with notification dot */
  .mo-header__avatar-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 32px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .mo-header__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 32px;
    overflow: hidden;
    background:
      url('${ICONS.avatar}') no-repeat center / 40px 40px,
      #96609f;
    color: #fff;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 28px;
    line-height: 1;
    text-align: center;
  }
  .mo-header__avatar-letter {
    position: relative;
    z-index: 1;
    color: #fff;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 28px;
    line-height: 1;
  }
  .mo-header__avatar-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #f7525f;
    border: 4px solid #000;
    box-sizing: border-box;
  }

  /* Offer / Ampliar CTA */
  .mo-header__offer-margin {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-left: 12px;
    flex-shrink: 0;
  }
  .mo-header__offer {
    position: relative;
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 22.6px 0 16px;
    border-radius: 8px;
    color: #fff;
    text-decoration: none;
    font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, sans-serif);
    font-size: 16px;
    line-height: 24px;
    white-space: nowrap;
    cursor: pointer;
    overflow: hidden;
    flex-shrink: 0;
    border: none;
  }
  .mo-header__offer::before {
    content: '';
    position: absolute;
    inset: 0 -1.63px 0 -14.08px;
    background-image: linear-gradient(
      74.886deg,
      #00bce6 0%,
      #2962ff 50.31%,
      #d500f9 100%
    );
    transform: skewX(-22.18deg);
    transform-origin: center;
    border-top-right-radius: 11.5px;
    border-bottom-right-radius: 4.5px;
    z-index: 0;
  }
  .mo-header__offer-label {
    position: relative;
    z-index: 1;
    min-width: 55.55px;
  }

  /* ---------------- Polish layer (UI/UX) ---------------- */
  .mo-header__menu-link,
  .mo-header__search,
  .mo-header__offer,
  .mo-header__avatar-wrap {
    transition: background-color 100ms ease, color 100ms ease, transform 100ms ease, opacity 100ms ease, filter 100ms ease;
  }
  .mo-header__menu-link:active,
  .mo-header__search:active,
  .mo-header__avatar-wrap:active { opacity: .7; }
  .mo-header__offer:hover { filter: brightness(1.08); }
  .mo-header__offer:active { opacity: .85; transform: translateY(1px); }
  .mo-header__avatar-wrap:hover { transform: scale(1.04); }

  .mo-header__menu-link:focus-visible,
  .mo-header__search:focus-visible,
  .mo-header__offer:focus-visible,
  .mo-header__avatar-wrap:focus-visible { outline: 2px solid #2962ff; outline-offset: 2px; }

  /* Responsive */
  @media (max-width: 1200px) {
    .mo-header__inner { padding: 0 24px; }
    .mo-header__middle-content { width: auto; }
    .mo-header__search-hotkey { display: none; }
  }
  @media (max-width: 900px) {
    .mo-header__main-menu { display: none; }
  }
  @media (max-width: 768px) {
    .mo-header__inner { padding: 0 12px; height: 56px; }
    .mo-header__logo { height: 56px; }
    .mo-header__logo-text-wrap { display: none; }
    .mo-header__search-placeholder { display: none; }
    .mo-header__search { padding: 6px; min-height: 40px; min-width: 40px; }
    .mo-header__offer { padding: 0 14px 0 10px; min-height: 40px; }
    .mo-header__avatar,
    .mo-header__avatar-wrap { width: 36px; height: 36px; }
  }

  /* ===== Nav dropdowns (Productos, Comunidad, Mercados, Brokers, Más) ===== */
  .mo-header__menu-item { position: relative; }
  .mo-header__menu-item.has-dd .mo-header__menu-link { cursor: pointer; }
  .hdr-dd-panel {
    position: absolute;
    top: calc(100% + 6px);
    left: -8px;
    min-width: 280px;
    max-width: 360px;
    background: rgba(22, 26, 36, 0.96);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
    padding: 6px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
    z-index: 200;
    color: #d1d4dc;
    font-size: 13px;
    font-family: 'Trebuchet MS', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .mo-header__menu-item:hover .hdr-dd-panel,
  .mo-header__menu-item:focus-within .hdr-dd-panel {
    opacity: 1; visibility: visible; transform: translateY(0);
  }
  .hdr-dd-section {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #787b86;
    padding: 10px 12px 6px;
    font-weight: 600;
  }
  .hdr-dd-section:first-child { padding-top: 4px; }
  .hdr-dd-item {
    display: block;
    text-decoration: none;
    color: #d1d4dc;
    border-radius: 6px;
    transition: background 120ms ease, color 120ms ease;
  }
  .hdr-dd-item:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
  .hdr-dd-item:hover .hdr-dd-icon { color: #2962ff; }
  .hdr-dd-item:hover .hdr-dd-arrow { color: #d1d4dc; }
  .hdr-dd-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px;
    font-size: 13px;
    font-weight: 500;
  }
  .hdr-dd-icon {
    width: 22px; height: 22px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 15px;
    color: #d1d4dc;
    flex-shrink: 0;
  }
  .hdr-dd-icon--blank { width: 22px; }
  .hdr-dd-label { flex: 1; }
  .hdr-dd-meta { font-size: 11px; color: #787b86; margin-right: 6px; }
  .hdr-dd-arrow { color: #787b86; font-size: 14px; }
  .hdr-dd-hero {
    display: flex; gap: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    margin-bottom: 4px;
    text-decoration: none;
    color: #d1d4dc;
    transition: background 120ms ease;
  }
  .hdr-dd-hero:hover { background: rgba(255,255,255,0.06); }
  .hdr-dd-hero:hover .hdr-dd-hero-icon { color: #2962ff; }
  .hdr-dd-hero-icon { color: #d1d4dc; transition: color 120ms ease; }
  .hdr-dd-hero-icon {
    width: 32px; height: 32px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .hdr-dd-hero-text { display: flex; flex-direction: column; gap: 2px; }
  .hdr-dd-hero-label { font-size: 14px; font-weight: 600; color: #fff; }
  .hdr-dd-hero-desc { font-size: 12px; color: #b2b5be; line-height: 1.35; }
`;

function _renderDropdownItem(it) {
  if (!it) return '';
  const arrow = it.arrow ? '<span class="hdr-dd-arrow">›</span>' : '';
  const meta = it.meta ? `<span class="hdr-dd-meta">${it.meta}</span>` : '';
  const icon = it.icon ? `<span class="hdr-dd-icon">${it.icon}</span>` : '<span class="hdr-dd-icon hdr-dd-icon--blank"></span>';
  return `<a class="hdr-dd-item" href="${it.href || '#/'}"><span class="hdr-dd-row">${icon}<span class="hdr-dd-label">${it.label}</span>${meta}${arrow}</span></a>`;
}
function _renderDropdownSection(sec) {
  if (sec.hero) {
    const h = sec.hero;
    return `<a class="hdr-dd-hero" href="${h.href||'#/'}">
      <span class="hdr-dd-hero-icon">${h.icon||'⚡'}</span>
      <span class="hdr-dd-hero-text"><span class="hdr-dd-hero-label">${h.label}</span><span class="hdr-dd-hero-desc">${h.desc||''}</span></span>
    </a>`;
  }
  const title = sec.section ? `<div class="hdr-dd-section">${sec.section}</div>` : '';
  const items = (sec.items || []).map(_renderDropdownItem).join('');
  return title + items;
}
function _renderDropdown(dd) {
  if (!dd) return '';
  return `<div class="hdr-dd-panel" role="menu">${dd.map(_renderDropdownSection).join('')}</div>`;
}

function buildMarkup() {
  const navHtml = NAV_ITEMS.map(item => `
    <li class="mo-header__menu-item${item.dropdown ? ' has-dd' : ''}">
      <a class="mo-header__menu-link" href="${item.href}" data-symbol="${item.label}">${item.label}</a>
      ${_renderDropdown(item.dropdown)}
    </li>
  `).join('');

  return `
    <header class="mo-header">
      <div class="mo-header__inner">
        <span class="mo-header__logo">
          <a class="mo-header__logo-link mo-brand" href="#/" aria-label="Pagina de inicio de TradingView">
            <span class="mo-header__logo-mark" aria-hidden="true"></span>
            <span class="mo-header__logo-text-wrap">
              <span class="mo-header__logo-text" aria-hidden="true"></span>
            </span>
          </a>
        </span>

        <div class="mo-header__middle-wrapper">
          <div class="mo-header__middle-content">
            <div class="mo-header__search-margin">
              <button type="button" class="mo-header__search" aria-label="Buscar">
                <span class="mo-header__search-icon" aria-hidden="true"></span>
                <span class="mo-header__search-text-wrap">
                  <span class="mo-header__search-placeholder">Buscar</span>
                  <span class="mo-header__search-hotkey">(Ctrl+K)</span>
                </span>
              </button>
            </div>

            <ul class="mo-header__main-menu">
              ${navHtml}
            </ul>
          </div>
        </div>

        <div class="mo-header__area--right">
          <div class="mo-header__avatar-wrap" role="button" aria-label="Perfil">
            <div class="mo-header__avatar">
              <span class="mo-header__avatar-letter">H</span>
            </div>
            <span class="mo-header__avatar-dot" aria-hidden="true"></span>
          </div>
          <div class="mo-header__offer-margin">
            <a class="mo-header__offer" href="#/">
              <span class="mo-header__offer-label">Ampliar</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const s = document.createElement('style');
    s.id = 'sec-header-css';
    s.textContent = CSS;
    document.head.appendChild(s);
    _cssInjected = true;
  }

  container.innerHTML = buildMarkup();

  const brand = container.querySelector('.mo-brand');
  if (brand) {
    brand.addEventListener('click', (e) => {
      if (typeof ctx.onNavigate === 'function') {
        e.preventDefault();
        ctx.onNavigate(null);
      }
    });
  }

  // Top-level menu link click → navigate to its href.
  // Two flavours: hash routes (`#/foo`) go via location.hash; clean-path routes
  // (`/community`, `/markets/...`) go via History API + dispatch a popstate so
  // the SPA router in main.js picks them up.
  container.querySelectorAll('.mo-header__menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '#/';
      e.preventDefault();
      if (href.startsWith('#')) {
        window.location.hash = href.slice(1);
      } else {
        history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
  });

  const search = container.querySelector('.mo-header__search');
  if (search) {
    search.addEventListener('click', () => {
      if (typeof ctx.onNavigate === 'function') ctx.onNavigate('SEARCH');
    });
  }

  const offer = container.querySelector('.mo-header__offer');
  if (offer) {
    offer.addEventListener('click', (e) => {
      if (typeof ctx.onNavigate === 'function') {
        e.preventDefault();
        ctx.onNavigate('UPGRADE');
      }
    });
  }
}

export default { render };
