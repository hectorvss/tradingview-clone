// Shared top navbar partial. SVGs are inlined as string literals (no fs at runtime;
// these mirror the contents of ../../icons/*.svg).

const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 28" fill="currentColor" stroke="currentColor" stroke-width="0" width="36" height="28">
  <rect x="2" y="2" width="6" height="24" rx="1"/>
  <rect x="12" y="8" width="6" height="14" rx="1"/>
  <rect x="22" y="4" width="6" height="20" rx="1"/>
  <path d="M2 22 L8 18 L18 22 L28 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 147 28" fill="currentColor" stroke="none" width="147" height="28">
  <text x="0" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="currentColor">TradingView</text>
</svg>`;

const SVG_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
  <circle cx="12" cy="12" r="7"/>
  <line x1="17" y1="17" x2="23" y2="23"/>
</svg>`;

const SVG_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron">
  <polyline points="4,7 9,12 14,7"/>
</svg>`;

const MENU_ITEMS = [
  { id: 'productos', label: 'Productos' },
  { id: 'comunidad', label: 'Comunidad' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'brokers', label: 'Brokers' },
  { id: 'mas', label: 'Más' },
];

export function renderNavbar(opts = {}) {
  const activeLink = opts.activeLink || null;
  const userInitial = (opts.userInitial || 'H').toString().slice(0, 1);

  const menuHtml = MENU_ITEMS.map(item => {
    const activeCls = item.id === activeLink ? ' is-active' : '';
    return `<li class="tv-header__main-menu-item">
      <a class="tv-header__main-menu-link${activeCls}" href="#" data-menu-id="${item.id}">
        <span class="tv-header__main-menu-link-text">${item.label}</span>
        ${SVG_CHEVRON}
      </a>
    </li>`;
  }).join('');

  return `<div class="tv-header">
    <div class="tv-header__inner">
      <span class="tv-header__logo">
        <span class="tv-header__icon">${SVG_LOGO}</span>
        <span class="tv-header__logo-text">${SVG_WORDMARK}</span>
      </span>
      <div class="tv-header__middle-wrapper">
        <div class="tv-header-search-container" role="button" tabindex="0">
          ${SVG_SEARCH}
          <span class="tv-header-search-container__text">Buscar<span class="tv-header-search-container__hint"> (Ctrl+K)</span></span>
        </div>
        <ul class="tv-header__main-menu">
          ${menuHtml}
        </ul>
      </div>
      <div class="tv-header__area tv-header__area--right">
        <div class="tv-user-menu-button" role="button" tabindex="0" aria-label="Cuenta">${userInitial}</div>
        <button type="button" class="js-offer-button tv-header__offer-button">Ampliar</button>
      </div>
    </div>
  </div>`;
}

export default renderNavbar;
