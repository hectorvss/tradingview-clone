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

const NAV_ITEMS = [
  { label: 'Productos', href: 'https://es.tradingview.com/chart/' },
  { label: 'Comunidad', href: 'https://es.tradingview.com/ideas/' },
  { label: 'Mercados',  href: 'https://es.tradingview.com/markets/' },
  { label: 'Brokers',   href: 'https://es.tradingview.com/brokers/' },
  { label: 'Mas',       href: 'https://es.tradingview.com/support/' },
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
    height: 64px;
    width: 100%;
    padding: 0 40px;
  }

  /* ---------------- Logo ---------------- */
  .mo-header__logo {
    display: flex;
    align-items: center;
    height: 64px;
    flex-shrink: 0;
  }
  .mo-header__logo-link {
    display: flex;
    align-items: center;
    height: 28px;
    text-decoration: none;
    color: #fff;
    cursor: pointer;
  }
  .mo-header__logo-mark {
    width: 36px;
    height: 28px;
    background: url('${ICONS.logoIcon}') no-repeat center / contain;
    flex-shrink: 0;
  }
  .mo-header__logo-text-wrap {
    display: flex;
    align-items: center;
    height: 64px;
    padding-left: 6px;
    flex-shrink: 0;
  }
  .mo-header__logo-text {
    width: 147px;
    height: 28px;
    background: url('${ICONS.logoText}') no-repeat center / contain;
    flex-shrink: 0;
  }

  /* ---------------- Middle ---------------- */
  .mo-header__middle-wrapper {
    display: flex;
    flex: 1 0 0;
    min-width: 0;
    height: 64px;
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
`;

function buildMarkup() {
  const navHtml = NAV_ITEMS.map(item => `
    <li class="mo-header__menu-item">
      <a class="mo-header__menu-link" href="${item.href}" target="_blank" rel="noopener" data-symbol="${item.label}">${item.label}</a>
    </li>
  `).join('');

  return `
    <header class="mo-header">
      <div class="mo-header__inner">
        <span class="mo-header__logo">
          <a class="mo-header__logo-link mo-brand" href="https://es.tradingview.com/" target="_blank" rel="noopener" aria-label="Pagina de inicio de TradingView">
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
            <a class="mo-header__offer" href="https://es.tradingview.com/pricing/" target="_blank" rel="noopener">
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

  container.querySelectorAll('.mo-header__menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const symbol = link.getAttribute('data-symbol');
      if (typeof ctx.onNavigate === 'function') {
        e.preventDefault();
        ctx.onNavigate(symbol);
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
