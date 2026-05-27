// Runtime icon substitution for Figma-exported placeholders.
// Scans `.figma-icon[data-component]` nodes and swaps inline SVGs from /icons/
// based on the parent-class / position context.

const ICONS = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 28" fill="currentColor" stroke="currentColor" stroke-width="0">
  <rect x="2" y="2" width="6" height="24" rx="1"/>
  <rect x="12" y="8" width="6" height="14" rx="1"/>
  <rect x="22" y="4" width="6" height="20" rx="1"/>
  <path d="M2 22 L8 18 L18 22 L28 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  logoWordmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 147 28" fill="currentColor" stroke="none">
  <text x="0" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="currentColor">TradingView</text>
</svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="7"/>
  <line x1="17" y1="17" x2="23" y2="23"/>
</svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4,7 9,12 14,7"/>
</svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2.5" y="3.5" width="13" height="12" rx="1.5"/>
  <line x1="2.5" y1="7" x2="15.5" y2="7"/>
  <line x1="6" y1="2" x2="6" y2="5"/>
  <line x1="12" y1="2" x2="12" y2="5"/>
</svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 9a6 6 0 0 1 12 0c0 4 2 5 2 5H3s2-1 2-5z"/>
  <path d="M9.5 18a2 2 0 0 0 3 0"/>
</svg>`,
  chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V5z"/>
</svg>`,
  chartUp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3,17 8,11 12,14 19,5"/>
  <polyline points="14,5 19,5 19,10"/>
</svg>`,
  help: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <path d="M8.5 8.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
  <circle cx="11" cy="15.5" r="0.6" fill="currentColor" stroke="none"/>
</svg>`,
  grid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" stroke="none">
  <circle cx="5" cy="5" r="1.6"/>
  <circle cx="11" cy="5" r="1.6"/>
  <circle cx="17" cy="5" r="1.6"/>
  <circle cx="5" cy="11" r="1.6"/>
  <circle cx="11" cy="11" r="1.6"/>
  <circle cx="17" cy="11" r="1.6"/>
  <circle cx="5" cy="17" r="1.6"/>
  <circle cx="11" cy="17" r="1.6"/>
  <circle cx="17" cy="17" r="1.6"/>
</svg>`,
  community: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="8" cy="8" r="3"/>
  <circle cx="16" cy="9" r="2.5"/>
  <path d="M2.5 18c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"/>
  <path d="M14 18c0-2 1.5-3.5 4-3.5 1.5 0 2.5 0.7 3 1.5"/>
</svg>`,
  rss: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 5a13 13 0 0 1 13 13"/>
  <path d="M4 11a7 7 0 0 1 7 7"/>
  <circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none"/>
</svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round">
  <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z"/>
</svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
  <line x1="7" y1="1" x2="7" y2="2.5"/>
  <line x1="7" y1="11.5" x2="7" y2="13"/>
  <line x1="1" y1="7" x2="2.5" y2="7"/>
  <line x1="11.5" y1="7" x2="13" y2="7"/>
  <line x1="2.7" y1="2.7" x2="3.8" y2="3.8"/>
  <line x1="10.2" y1="10.2" x2="11.3" y2="11.3"/>
  <line x1="11.3" y1="2.7" x2="10.2" y2="3.8"/>
  <line x1="3.8" y1="10.2" x2="2.7" y2="11.3"/>
</svg>`,
  upload: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
  <polyline points="8,8 12,4 16,8"/>
  <line x1="12" y1="4" x2="12" y2="15"/>
</svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19"/>
  <line x1="5" y1="12" x2="19" y2="12"/>
</svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>
</svg>`,
  externalLink: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 4h6v6"/>
  <line x1="10" y1="14" x2="20" y2="4"/>
  <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>
</svg>`,
  zoomIn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="6"/>
  <line x1="15.5" y1="15.5" x2="20" y2="20"/>
  <line x1="11" y1="8" x2="11" y2="14"/>
  <line x1="8" y1="11" x2="14" y2="11"/>
</svg>`,
  zoomOut: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="6"/>
  <line x1="15.5" y1="15.5" x2="20" y2="20"/>
  <line x1="8" y1="11" x2="14" y2="11"/>
</svg>`,
  fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4,9 4,4 9,4"/>
  <polyline points="15,4 20,4 20,9"/>
  <polyline points="20,15 20,20 15,20"/>
  <polyline points="9,20 4,20 4,15"/>
</svg>`,
  flag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <ellipse cx="12" cy="12" rx="4" ry="9"/>
  <line x1="3" y1="12" x2="21" y2="12"/>
</svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`,
};

function hasAncestorClass(el, className) {
  let node = el.parentElement;
  while (node) {
    if (node.classList && node.classList.contains(className)) return node;
    node = node.parentElement;
  }
  return null;
}

function hasAncestorClassMatching(el, predicate) {
  let node = el.parentElement;
  while (node) {
    if (node.classList) {
      for (const cls of node.classList) {
        if (predicate(cls)) return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function readTop(el) {
  // Prefer inline style; fall back to bounding rect relative to .layout__area--right.
  const styleTop = parseFloat(el.style.top);
  if (!Number.isNaN(styleTop)) return styleTop;
  const container = hasAncestorClass(el, 'layout__area--right');
  if (container) {
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return r.top - cr.top;
  }
  return 0;
}

function readWidth(el) {
  const w = parseFloat(el.style.width);
  if (!Number.isNaN(w)) return w;
  return el.getBoundingClientRect().width;
}

function detectIcon(el) {
  // 1. Header logo icon container
  if (hasAncestorClass(el, 'tv-header__icon')) return 'logo';
  // 2. Header wordmark
  if (hasAncestorClass(el, 'tv-header__logo-text')) return 'logoWordmark';
  // 3. Search box
  if (hasAncestorClass(el, 'tv-header-search-container')) return 'search';
  // 4. Header main-menu link → chevron
  if (hasAncestorClass(el, 'tv-header__main-menu-link')) return 'chevronDown';
  // 5. Anything with 'chevron' in a class name
  if (hasAncestorClassMatching(el, (c) => c.toLowerCase().includes('chevron'))) return 'chevronDown';

  // 6. Right sidebar — position-driven mapping
  if (hasAncestorClass(el, 'layout__area--right')) {
    const y = readTop(el);
    if (y < 46) return 'calendar';
    if (y < 92) return 'bell';
    if (y < 140) return 'chat';
    if (y >= 600 && y < 657) return 'chartUp';
    if (y >= 657 && y < 703) return 'calendar';
    if (y >= 703 && y < 749) return 'community';
    if (y >= 749 && y < 795) return 'rss';
    if (y >= 795 && y < 845) return 'grid';
    if (y >= 850) return 'help';
    return null;
  }

  // 7. IPO calendar empty-day rows
  if (hasAncestorClass(el, 'emptyDayRow-vN7omtvq')) return 'moon';

  // 9. Portfolio slider arrows / first-corner plus
  if (hasAncestorClassMatching(el, (c) => c === 'btnWrapper-l3x84Fov' || c === 'pause-l3x84Fov')) {
    const w = readWidth(el);
    if (w >= 26 && w <= 32) return 'plus';
    return 'chevronDown';
  }

  // 10. Portfolio toast icon
  if (hasAncestorClass(el, 'icon-LCLd8JNY')) return 'bookmark';

  // 8. Small width in a button-ish container → chevron
  const w = readWidth(el);
  if (w > 0 && w <= 22) {
    const parent = el.parentElement;
    if (parent) {
      const ph = parseFloat(parent.style.height);
      if (!Number.isNaN(ph) && ph <= 40) return 'chevronDown';
    }
  }

  // 12. Heatmap: zoom controls inside .container-u2sJ9azF
  //   .group-eypd_CIk wraps the +/− stack; y=2.8 → zoomIn, y=34.8 → zoomOut
  if (hasAncestorClass(el, 'group-eypd_CIk')) {
    const y = parseFloat(el.style.top);
    if (!Number.isNaN(y) && y > 20) return 'zoomOut';
    return 'zoomIn';
  }
  // 13. Heatmap: fullscreen button inside .container-u2sJ9azF (below the zoom group)
  if (hasAncestorClass(el, 'container-u2sJ9azF')) return 'fullscreen';
  // 14. Heatmap: top-right toolbar controls (.controls-ShSaLsfC) 34x34 → fullscreen
  if (hasAncestorClass(el, 'controls-ShSaLsfC')) return 'fullscreen';
  // 15. Heatmap: tab/toolbar (.toolbar-mYkFHquo) → grid (view switcher)
  if (hasAncestorClass(el, 'toolbar-mYkFHquo')) return 'grid';
  // 16. Heatmap: G20 country cards (.card-TgaYZV1c / .list-TgaYZV1c) → flag proxy
  if (hasAncestorClass(el, 'card-TgaYZV1c')) return 'flag';
  if (hasAncestorClass(el, 'list-TgaYZV1c')) return 'flag';
  // 17. Heatmap: small Component 8 inside .mapContainer-PucT6CA9 → settings (legend gear)
  if (hasAncestorClass(el, 'mapContainer-PucT6CA9')) return 'settings';

  // 18. Financial charts: header controls (.chartHeaderControls-pSw9Lpo7) → settings
  if (hasAncestorClass(el, 'chartHeaderControls-pSw9Lpo7')) return 'settings';
  // 19. Financial charts: legend toggler → chevronDown
  if (hasAncestorClass(el, 'togglerWrapper-JF9Ht_ie')) return 'chevronDown';
  // 20. Financial charts: dialog nav button → chevronDown
  if (hasAncestorClass(el, 'nav-button-JwteAiHB')) return 'chevronDown';
  // 21. Financial charts: financial-list row (.listContainer-dlewR1s1) → externalLink
  if (hasAncestorClass(el, 'listContainer-dlewR1s1')) return 'externalLink';

  // 11. Fallback by Component number suffix
  const comp = el.dataset.component || '';
  if (/\b1$/.test(comp)) return 'logo';
  if (/\b2$/.test(comp)) return 'search';
  return null;
}

export function substituteIcons(root = document.body) {
  const placeholders = root.querySelectorAll('.figma-icon[data-component]');
  for (const el of placeholders) {
    const key = detectIcon(el);
    if (!key || !ICONS[key]) continue;
    el.innerHTML = ICONS[key];
    el.classList.add('figma-icon--replaced');
    el.dataset.iconKey = key;
  }
}
