// indicators-figma-modal.js
// Replica del modal "Indicadores, métricas y estrategias" de TradingView,
// basada en los frames Figma 5:27442 (estado "Datos técnicos") y
// 5:22002 (estado "Favoritos") del fileKey 2QhXqtb66hdeKvlZAZE4fS.
//
// API pública:
//   createIndicatorsFigmaModal(opts?) -> {
//     open(), close(), destroy(),
//     setCategory(name), setQuery(text)
//   }
//
// Auto-contenido: inyecta su CSS scopeado bajo `.tvind-` en un <style>
// con `data-tvind`. No depende de styles.css ni de otros módulos.

// ---------------------------------------------------------------------------
// Catálogo de indicadores (textos copiados literal del Figma)
// ---------------------------------------------------------------------------

// Categorías = items del sidebar izquierdo del modal. El orden y los
// grupos (Personal / Integrado / Comunidad) son los del Figma.
const SIDEBAR = [
  {
    group: 'Personal',
    items: [
      { id: 'favoritos',  label: 'Favoritos',          icon: 'star' },
      { id: 'mis-scripts', label: 'Mis scripts',        icon: 'script' },
      { id: 'requiere',   label: 'Requiere invitación', icon: 'lock' },
      { id: 'comprados',  label: 'Comprados',           icon: 'cart' },
    ],
  },
  {
    group: 'Integrado',
    items: [
      { id: 'datos-tecnicos',      label: 'Datos técnicos',       icon: 'chart' },
      { id: 'datos-fundamentales', label: 'Datos fundamentales',  icon: 'building' },
    ],
  },
  {
    group: 'Comunidad',
    items: [
      { id: 'selecciones',     label: 'Selecciones de los editores', icon: 'medal' },
      { id: 'parte-superior',  label: 'Parte superior',              icon: 'flame' },
      { id: 'tendencias',      label: 'Tendencias',                  icon: 'trend' },
      { id: 'tienda',          label: 'Tienda',                      icon: 'shop' },
    ],
  },
];

// Pestañas horizontales en la columna derecha (Figma: div#indicators-tabs).
const TABS = ['Indicadores', 'Estrategias', 'Perfiles', 'Patrones'];

// Lista de indicadores para "Datos técnicos" (orden y badges del Figma 5:27442).
// `badge` puede ser 'New' o 'Updated'.
const TECH_INDICATORS = [
  { name: 'Acumulación/distribución' },
  { name: 'Alligator de Williams' },
  { name: 'Ancho Bandas de Bollinger' },
  { name: 'Aroon' },
  { name: 'Aroon Oscillator', badge: 'New' },
  { name: 'Auto Key Levels' },
  { name: 'Beta', badge: 'New' },
  { name: 'Balance de volúmenes' },
  { name: 'Bandas de Bollinger' },
  { name: 'Bandas de Bollinger %b' },
  { name: 'Barras de Bollinger', badge: 'New' },
  { name: 'BBTrend' },
  { name: 'Bull Bear Power' },
  { name: 'Canal de regresión lineal' },
  { name: 'Canales de Donchian' },
  { name: 'Canales Keltner' },
  { name: 'Chande Kroll Stop' },
  { name: 'Chandelier Exit', badge: 'New' },
  { name: 'Cinta de medias móviles' },
  { name: 'Cinta RCI', badge: 'New' },
  { name: 'Coeficiente de correlación' },
  { name: 'Convergencia/divergencia de la media móvil', badge: 'Updated' },
  { name: 'Correlación de fuerzas' },
  { name: 'Cruce MA' },
  { name: 'Curva de Coppock' },
  { name: 'Delta del volumen' },
  { name: 'Delta del volumen acumulado' },
  { name: 'Estocástica' },
  { name: 'Extensión de Fibonacci automática' },
  { name: 'Facilidad de movimiento' },
  { name: 'Fases lunares' },
  { name: 'Flujo monetario Chaikin' },
  { name: 'Fractales de Williams' },
  { name: 'Gaps' },
  { name: 'Gráficos con múltiples períodos de tiempo', badge: 'Updated' },
];

// Lista de "Favoritos" (Figma 5:22002 muestra un único item).
const FAVORITES_INDICATORS = [
  { name: 'Índice de fuerza relativa (RSI) estocástica' },
];

// Mapa categoría -> lista de indicadores.
const CATALOG = {
  'favoritos':            FAVORITES_INDICATORS,
  'mis-scripts':          [],
  'requiere':             [],
  'comprados':            [],
  'datos-tecnicos':       TECH_INDICATORS,
  'datos-fundamentales':  [],
  'selecciones':          [],
  'parte-superior':       [],
  'tendencias':           [],
  'tienda':               [],
};

// ---------------------------------------------------------------------------
// Iconos SVG (sidebar). Strokes sobre 18x18, color heredado vía currentColor.
// ---------------------------------------------------------------------------
const ICONS = {
  star:     '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 2.5l1.94 4.05 4.46.5-3.3 3.06.91 4.39L9 12.4l-4.01 2.1.91-4.39-3.3-3.06 4.46-.5L9 2.5z"/></svg>',
  script:   '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 3h7l3 3v9H4z"/><path d="M11 3v3h3"/><path d="M6 9h6M6 11.5h6M6 7h3"/></svg>',
  lock:     '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="8" width="10" height="7" rx="1"/><path d="M6 8V6a3 3 0 016 0v2"/></svg>',
  cart:     '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 3.5h2l1.5 8h7l1.5-5.5H6"/><circle cx="7" cy="14" r="1"/><circle cx="13" cy="14" r="1"/></svg>',
  chart:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 14V4M3 14h12"/><path d="M6 11l2.5-3 2 2L14 6"/></svg>',
  building: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="3" width="10" height="12"/><path d="M6.5 6h1M10.5 6h1M6.5 8.5h1M10.5 8.5h1M6.5 11h1M10.5 11h1"/></svg>',
  medal:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="9" cy="11" r="3.5"/><path d="M6.5 8L5 3h3l1.5 3M11.5 8L13 3h-3l-1.5 3"/></svg>',
  flame:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 15c2.5 0 4.5-1.8 4.5-4.3 0-2-1.3-3.2-2.4-4.7C10 4.5 9.3 3 9.3 2c-1 1.5-3.8 3.8-3.8 6.7C5.5 12 7 15 9 15z"/></svg>',
  trend:    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 12l4-4 3 3 5-6"/><path d="M11 5h4v4"/></svg>',
  shop:     '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 6h10l-.7 8.3a1 1 0 01-1 .9H5.7a1 1 0 01-1-.9L4 6z"/><path d="M6.5 6V4.5a2.5 2.5 0 015 0V6"/></svg>',
  search:   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/></svg>',
  close:    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 3l8 8M11 3l-8 8"/></svg>',
  pin:      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9.5 1.5l3 3-2 1-2.5 2.5L8.5 10 4 5.5l1.5-.5L8 2.5z"/><path d="M4 5.5L1.5 12.5"/></svg>',
};

// ---------------------------------------------------------------------------
// CSS scopeado .tvind-*
// ---------------------------------------------------------------------------
const CSS = `
.tvind-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9998;
  font-family: 'Trebuchet MS', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #dbdbdb;
  animation: tvind-fade .12s ease-out;
}
@keyframes tvind-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tvind-pop  {
  from { opacity: 0; transform: scale(.97) }
  to   { opacity: 1; transform: scale(1) }
}
.tvind-dialog {
  width: 836px; max-width: 94vw;
  height: 700px; max-height: 90vh;
  background: #1f1f1f;
  border-radius: 12px;
  box-shadow: 0 2px 2px rgba(0,0,0,0.4), 0 18px 60px rgba(0,0,0,0.5);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: tvind-pop .14s ease-out;
}
.tvind-header {
  display: flex; align-items: center;
  padding: 17px 20px;
  flex-shrink: 0;
}
.tvind-title {
  flex: 1 1 auto;
  font-family: 'Trebuchet MS', sans-serif;
  font-weight: 700;
  font-size: 20px;
  line-height: 28px;
  color: #dbdbdb;
}
.tvind-close {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; border-radius: 4px;
  color: #b4b4b4; cursor: pointer;
  padding: 8px;
}
.tvind-close:hover { background: #2e2e2e; color: #dbdbdb; }

.tvind-searchwrap {
  padding: 0 20px;
  flex-shrink: 0;
}
.tvind-search {
  display: flex; align-items: center;
  border: 1px solid #4a4a4a;
  border-radius: 8px;
  padding: 1px;
  background: transparent;
}
.tvind-search:focus-within { border-color: #6f6f6f; }
.tvind-search-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  color: #8c8c8c;
  margin: 2px 0 2px 6px;
}
.tvind-search-input {
  flex: 1 1 auto;
  background: transparent;
  border: 0; outline: none;
  height: 34px;
  color: #dbdbdb;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 14px;
  padding: 0 8px 0 4px;
}
.tvind-search-input::placeholder { color: #8c8c8c; }

.tvind-body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  overflow: hidden;
  margin-top: 12px;
}
.tvind-sidebar {
  width: 230px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 8px 10px 16px 20px;
  display: flex; flex-direction: column;
  gap: 8px;
}
.tvind-sidebar-group { display: flex; flex-direction: column; }
.tvind-sidebar-grouptitle {
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 0.4px;
  color: #8c8c8c;
  text-transform: uppercase;
  padding: 7px 0 7px 12px;
}
.tvind-side-item {
  display: flex; align-items: center;
  height: 40px;
  padding: 0 8px;
  border-radius: 8px;
  color: #dbdbdb;
  cursor: pointer;
  user-select: none;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 14px;
  line-height: 18px;
}
.tvind-side-item:hover { background: #2e2e2e; }
.tvind-side-item.is-active { background: #3d3d3d; }
.tvind-side-item.is-active .tvind-side-label { font-weight: 700; }
.tvind-side-icon {
  width: 28px; height: 28px;
  padding-right: 8px;
  color: #b4b4b4;
  display: inline-flex; align-items: center;
}
.tvind-side-item.is-active .tvind-side-icon { color: #dbdbdb; }

.tvind-right {
  flex: 1 1 auto;
  min-width: 0;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.tvind-tabs {
  display: flex;
  gap: 0;
  padding: 0 24px;
  border-bottom: 1px solid #2e2e2e;
  flex-shrink: 0;
}
.tvind-tab {
  background: transparent; border: 0;
  color: #8c8c8c;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 14px; line-height: 18px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tvind-tab:hover { color: #dbdbdb; }
.tvind-tab.is-active {
  color: #dbdbdb;
  font-weight: 700;
  border-bottom-color: #dbdbdb;
}

.tvind-listcol {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 0;
}
.tvind-listheader {
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 0.4px;
  color: #8c8c8c;
  text-transform: uppercase;
  padding: 8px 40px 8px 40px;
}
.tvind-listitem {
  display: flex; align-items: center;
  height: 32px;
  margin: 0 10px;
  padding: 0 12px 0 36px;
  border-radius: 8px;
  cursor: pointer;
  color: #dbdbdb;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 14px;
  line-height: 18px;
  gap: 8px;
}
.tvind-listitem:hover { background: #2e2e2e; }
.tvind-listitem-name { flex: 0 0 auto; }
.tvind-pin {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #6f6f6f;
  border-radius: 4px;
  visibility: hidden;
  margin-left: auto;
}
.tvind-listitem:hover .tvind-pin { visibility: visible; }
.tvind-pin:hover { background: #3d3d3d; color: #dbdbdb; }
.tvind-badge {
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 14px;
}
.tvind-badge.is-new     { color: #ff9800; border: 1px solid #ff9800; }
.tvind-badge.is-updated { color: #5a9cf8; border: 1px solid #5a9cf8; }

.tvind-empty {
  padding: 40px;
  color: #8c8c8c;
  text-align: center;
  font-size: 13px;
}
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function injectStyleOnce() {
  if (document.querySelector('style[data-tvind]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-tvind', '');
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export function createIndicatorsFigmaModal(opts = {}) {
  const onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;
  const initialCategory = opts.category || 'favoritos';

  // Estado interno
  const state = {
    category: initialCategory,
    tab: 'Indicadores',
    query: '',
    mounted: false,
  };

  // Nodos DOM (creados al abrir)
  let backdrop = null;
  let dialog = null;
  let sidebarEl = null;
  let listColEl = null;
  let tabsEl = null;
  let searchInputEl = null;
  let keydownHandler = null;

  function build() {
    injectStyleOnce();

    backdrop = el('div', 'tvind-backdrop');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Indicadores, métricas y estrategias');

    dialog = el('div', 'tvind-dialog');
    backdrop.appendChild(dialog);

    // Header
    const header = el('div', 'tvind-header');
    const title = el('div', 'tvind-title');
    title.textContent = 'Indicadores, métricas y estrategias';
    const closeBtn = el('button', 'tvind-close', ICONS.close);
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', close);
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Search
    const searchWrap = el('div', 'tvind-searchwrap');
    const searchBox = el('span', 'tvind-search');
    searchBox.appendChild(el('span', 'tvind-search-icon', ICONS.search));
    searchInputEl = document.createElement('input');
    searchInputEl.type = 'text';
    searchInputEl.className = 'tvind-search-input';
    searchInputEl.placeholder = 'Buscar';
    searchInputEl.id = 'indicators-dialog-search-input';
    searchInputEl.value = state.query;
    searchInputEl.addEventListener('input', () => {
      state.query = searchInputEl.value;
      renderList();
    });
    searchBox.appendChild(searchInputEl);
    searchWrap.appendChild(searchBox);
    dialog.appendChild(searchWrap);

    // Body: sidebar + right panel
    const body = el('div', 'tvind-body');
    sidebarEl = el('div', 'tvind-sidebar');
    body.appendChild(sidebarEl);

    const right = el('div', 'tvind-right');
    tabsEl = el('div', 'tvind-tabs');
    right.appendChild(tabsEl);
    listColEl = el('div', 'tvind-listcol');
    right.appendChild(listColEl);
    body.appendChild(right);

    dialog.appendChild(body);

    // Cierre por backdrop
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close();
    });

    // Escape
    keydownHandler = (e) => {
      if (e.key === 'Escape') { close(); }
    };
    document.addEventListener('keydown', keydownHandler);

    renderSidebar();
    renderTabs();
    renderList();

    document.body.appendChild(backdrop);
    state.mounted = true;
  }

  function renderSidebar() {
    sidebarEl.innerHTML = '';
    SIDEBAR.forEach(group => {
      const g = el('div', 'tvind-sidebar-group');
      const gt = el('div', 'tvind-sidebar-grouptitle');
      gt.textContent = group.group;
      g.appendChild(gt);
      group.items.forEach(item => {
        const row = el('div', 'tvind-side-item' + (item.id === state.category ? ' is-active' : ''));
        row.dataset.cat = item.id;
        const ic = el('span', 'tvind-side-icon', ICONS[item.icon] || '');
        const lb = el('span', 'tvind-side-label');
        lb.textContent = item.label;
        row.appendChild(ic);
        row.appendChild(lb);
        row.addEventListener('click', () => setCategory(item.id));
        g.appendChild(row);
      });
      sidebarEl.appendChild(g);
    });
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    TABS.forEach(t => {
      const b = el('button', 'tvind-tab' + (t === state.tab ? ' is-active' : ''));
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', () => {
        state.tab = t;
        renderTabs();
        renderList();
      });
      tabsEl.appendChild(b);
    });
  }

  function renderList() {
    listColEl.innerHTML = '';

    // Header de la lista (Nombre / Nombre del script según pestaña)
    const headerLabel = (state.category === 'mis-scripts') ? 'Nombre del script' : 'Nombre';
    const hdr = el('div', 'tvind-listheader');
    hdr.textContent = headerLabel;
    listColEl.appendChild(hdr);

    // Solo "Indicadores" tiene catálogo poblado; el resto muestra vacío.
    let items = [];
    if (state.tab === 'Indicadores') {
      items = CATALOG[state.category] || [];
    }

    // Filtrado por query (case + diacritic insensitive)
    const q = normalize(state.query.trim());
    const filtered = q
      ? items.filter(it => normalize(it.name).includes(q))
      : items;

    if (filtered.length === 0) {
      const empty = el('div', 'tvind-empty');
      empty.textContent = q
        ? 'Sin resultados para "' + state.query + '".'
        : 'No hay elementos en esta categoría.';
      listColEl.appendChild(empty);
      return;
    }

    filtered.forEach(it => {
      const row = el('div', 'tvind-listitem');
      const nm = el('span', 'tvind-listitem-name');
      nm.textContent = it.name;
      row.appendChild(nm);
      if (it.badge === 'New') {
        row.appendChild(el('span', 'tvind-badge is-new', 'New'));
      } else if (it.badge === 'Updated') {
        row.appendChild(el('span', 'tvind-badge is-updated', 'Updated'));
      }
      const pin = el('span', 'tvind-pin', ICONS.pin);
      pin.title = 'Anclar';
      row.appendChild(pin);
      row.addEventListener('click', () => {
        if (onSelect) {
          try { onSelect({ name: it.name, category: state.category, tab: state.tab }); }
          catch (e) { /* swallow */ }
        }
      });
      listColEl.appendChild(row);
    });
  }

  // ---- Acciones públicas ----
  function open() {
    if (state.mounted) return;
    build();
  }

  function close() {
    if (!state.mounted) return;
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    backdrop = dialog = sidebarEl = listColEl = tabsEl = searchInputEl = null;
    state.mounted = false;
  }

  function destroy() {
    close();
    const s = document.querySelector('style[data-tvind]');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  function setCategory(name) {
    // Acepta tanto el id ("favoritos") como la etiqueta ("Favoritos").
    const found = SIDEBAR.flatMap(g => g.items).find(i =>
      i.id === name || normalize(i.label) === normalize(name)
    );
    state.category = found ? found.id : name;
    if (state.mounted) {
      renderSidebar();
      renderList();
    }
  }

  function setQuery(text) {
    state.query = String(text || '');
    if (searchInputEl) searchInputEl.value = state.query;
    if (state.mounted) renderList();
  }

  return { open, close, destroy, setCategory, setQuery };
}

export default createIndicatorsFigmaModal;
