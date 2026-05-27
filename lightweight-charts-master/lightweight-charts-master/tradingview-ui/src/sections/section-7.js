// src/sections/section-7.js
// Section 7 — "Trading y brokers"
// Reuses existing classes from styles.css (mo-broker-card, mo-bls, mo-brokers-row, etc.)
// Adds a new filter bar + sort dropdown (scoped CSS prefix: mo7-*).
//
// Public API:
//   render(container, ctx = {})  ->  { destroy() }

/* ---------------------------------------------------------------- */
/* Data: 6 brokers (3 originals + 3 new)                            */
/* ---------------------------------------------------------------- */
const BROKERS = [
  {
    bg: '#2a2a2a',
    logoColors: ['#0d0d0d', '#1a1a1a', '#000'],
    logoText: 'X', logoTextColor: '#fff',
    name: 'OKX', tag: 'Cripto',
    ratingScore: 4.8, ratingLabel: 'Excelente',
    categories: ['cripto'],
  },
  {
    bg: '#2a2a2a',
    logoColors: ['#1c8eff', '#1278d6', '#0a5aa8'],
    logoText: '↑', logoTextColor: '#fff',
    name: 'AMP Futures', tag: 'Futuros',
    ratingScore: 4.6, ratingLabel: 'Excelente',
    categories: ['futuros'],
  },
  {
    bg: '#2a2a2a',
    logoColors: ['#cdf500', '#a8c800', '#7a9300'],
    logoText: '◆', logoTextColor: '#000',
    name: 'WhiteBIT', tag: 'Cripto',
    ratingScore: 4.4, ratingLabel: 'Muy bueno',
    categories: ['cripto'],
  },
  {
    bg: '#2a2a2a',
    logoColors: ['#d91f26', '#a8181d', '#7a1014'],
    logoText: 'IB', logoTextColor: '#fff',
    name: 'Interactive Brokers', tag: 'Acciones · Futuros · Forex',
    ratingScore: 4.7, ratingLabel: 'Excelente',
    categories: ['acciones', 'futuros', 'forex'],
  },
  {
    bg: '#2a2a2a',
    logoColors: ['#f3ba2f', '#c79626', '#8e6c1a'],
    logoText: 'B', logoTextColor: '#000',
    name: 'Binance', tag: 'Cripto',
    ratingScore: 4.5, ratingLabel: 'Muy bueno',
    categories: ['cripto'],
  },
  {
    bg: '#2a2a2a',
    logoColors: ['#13c2c2', '#0f9c9c', '#0a6e6e'],
    logoText: 'e', logoTextColor: '#fff',
    name: 'eToro', tag: 'Acciones · Cripto · Forex',
    ratingScore: 4.3, ratingLabel: 'Muy bueno',
    categories: ['acciones', 'cripto', 'forex'],
  },
];

const FILTERS = [
  { key: 'all',      label: 'Todos'    },
  { key: 'cripto',   label: 'Cripto'   },
  { key: 'futuros',  label: 'Futuros'  },
  { key: 'forex',    label: 'Forex'    },
  { key: 'acciones', label: 'Acciones' },
];

const SORTS = [
  { key: 'rating', label: 'Rating ↓'  },
  { key: 'name',   label: 'Nombre A-Z' },
];

/* ---------------------------------------------------------------- */
/* CSS (only for NEW elements: filter bar + sort dropdown)          */
/* ---------------------------------------------------------------- */
let _cssInjected = false;
const CSS = `
.mo7-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 16px 0 20px;
  flex-wrap: wrap;
}
.mo7-filters { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.mo7-filter {
  display: inline-flex; align-items: center;
  height: 32px; padding: 0 14px;
  background: transparent;
  color: var(--grey-86, #dbdbdb);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 16px;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.mo7-filter:hover { border-color: var(--grey-29, #4a4a4a); background: rgba(255,255,255,.04); }
.mo7-filter.is-active {
  background: #2962ff;
  border-color: #2962ff;
  color: #fff;
}
.mo7-sort {
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--grey-55, #8c8c8c); font-size: 12px;
}
.mo7-sort__select {
  height: 32px;
  padding: 0 28px 0 10px;
  background: #181818 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%238c8c8c' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>") no-repeat right 10px center;
  color: var(--grey-86, #dbdbdb);
  border: 1px solid var(--grey-18, #2e2e2e);
  border-radius: 6px;
  font-size: 13px; font-family: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.mo7-sort__select:hover { border-color: var(--grey-29, #4a4a4a); }
.mo7-sort__select:focus { outline: none; border-color: #2962ff; }

/* Make existing broker cards interactive */
.mo-broker-card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
.mo-broker-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.mo-broker-card.is-hidden { display: none !important; }

.mo-broker-btn { cursor: pointer; transition: filter .15s ease, transform .1s ease, opacity .1s ease; }
.mo-broker-btn:hover { filter: brightness(1.1); }
.mo-broker-btn:active { transform: translateY(1px); opacity: .8; }

/* ---------------- Polish layer (UI/UX) ---------------- */
.mo-broker-card { cursor: pointer; }
.mo-broker-card:hover { border-color: #2962ff; }
.mo-broker-card:active { opacity: .85; transform: translateY(-1px); }

.mo7-filter,
.mo7-sort__select { transition: background-color 100ms ease, color 100ms ease, border-color 100ms ease, opacity 100ms ease; }
.mo7-filter:active { opacity: .7; }

/* Empty state */
.mo7-empty {
  display: flex; align-items: center; justify-content: center;
  min-height: 160px; color: #787b86; font-size: 14px; text-align: center;
  grid-column: 1 / -1;
}

/* Responsive — broker grid 4-col -> 2-col -> 1-col */
@media (max-width: 1200px) {
  .mo-broker-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 768px) {
  .mo-broker-grid { grid-template-columns: 1fr !important; }
  .mo7-filter { min-height: 36px; padding: 8px 14px; }
  .mo7-sort__select { min-height: 36px; }
  .mo-broker-btn { min-height: 44px; }
}
`;

/* ---------------------------------------------------------------- */
/* Render helpers                                                   */
/* ---------------------------------------------------------------- */
function starString(score) {
  // 5-star visual ★★★★★ with score numeric
  const full = Math.round(score);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}

function brokerCardHTML(b) {
  const cats = b.categories.join(' ');
  return `
    <div class="mo-broker-card"
         data-name="${b.name}"
         data-rating="${b.ratingScore}"
         data-categories="${cats}"
         style="background:${b.bg}">
      <div class="mo-broker-logo-stack">
        <span class="mo-bls mo-bls-3" style="background:${b.logoColors[2]}"></span>
        <span class="mo-bls mo-bls-2" style="background:${b.logoColors[1]}"></span>
        <span class="mo-bls mo-bls-1" style="background:${b.logoColors[0]};color:${b.logoTextColor}">${b.logoText}</span>
      </div>
      <div class="mo-broker-info">
        <div class="mo-broker-name">${b.name}</div>
        <div class="mo-broker-tag">${b.tag}</div>
      </div>
      <div class="mo-broker-rating">
        <span class="mo-broker-stars" aria-label="${b.ratingScore} de 5">${starString(b.ratingScore)}</span>
        ${b.ratingScore.toFixed(1)} • ${b.ratingLabel}
        <span class="mo-verified" title="Broker verificado">✓</span>
      </div>
      <button class="mo-broker-btn" type="button" data-broker="${b.name}">Abrir cuenta ↗</button>
    </div>`;
}

function filterBarHTML(activeFilter, activeSort) {
  const filters = FILTERS.map(f => `
    <button class="mo7-filter ${f.key === activeFilter ? 'is-active' : ''}"
            type="button" data-filter="${f.key}">${f.label}</button>
  `).join('');
  const sorts = SORTS.map(s => `
    <option value="${s.key}" ${s.key === activeSort ? 'selected' : ''}>${s.label}</option>
  `).join('');
  return `
    <div class="mo7-controls">
      <div class="mo7-filters" role="tablist" aria-label="Filtrar brokers">${filters}</div>
      <label class="mo7-sort">
        Ordenar por
        <select class="mo7-sort__select" aria-label="Ordenar brokers">${sorts}</select>
      </label>
    </div>`;
}

/* ---------------------------------------------------------------- */
/* State helpers                                                    */
/* ---------------------------------------------------------------- */
function sortBrokers(list, sortKey) {
  const arr = list.slice();
  if (sortKey === 'name') {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    arr.sort((a, b) => b.ratingScore - a.ratingScore);
  }
  return arr;
}

function applyFilter(rowEl, filterKey) {
  const cards = rowEl.querySelectorAll('.mo-broker-card');
  cards.forEach((card) => {
    if (filterKey === 'all') {
      card.classList.remove('is-hidden');
      return;
    }
    const cats = (card.getAttribute('data-categories') || '').split(/\s+/);
    if (cats.indexOf(filterKey) !== -1) {
      card.classList.remove('is-hidden');
    } else {
      card.classList.add('is-hidden');
    }
  });
}

function rerenderCards(rowEl, sortKey) {
  const sorted = sortBrokers(BROKERS, sortKey);
  rowEl.innerHTML = sorted.map(brokerCardHTML).join('');
}

/* ---------------------------------------------------------------- */
/* Public render                                                    */
/* ---------------------------------------------------------------- */
export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-section', '7');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const state = { filter: 'all', sort: 'rating' };

  const initialBrokers = sortBrokers(BROKERS, state.sort).map(brokerCardHTML).join('');

  container.innerHTML = `
    <section class="mo-section mo7-section">
      <div class="mo-section-header">
        <h2 class="mo-section-title">Trading y brokers</h2>
      </div>
      <p class="mo-lead">
        Opere directamente en los Supergráficos a través de nuestros brokers
        compatibles, totalmente verificados y evaluados por los usuarios.
      </p>
      ${filterBarHTML(state.filter, state.sort)}
      <div class="mo-brokers-row" data-mo7-row>${initialBrokers}</div>
    </section>
  `;

  const rowEl    = container.querySelector('[data-mo7-row]');
  const filtersEl = container.querySelector('.mo7-filters');
  const sortSelect = container.querySelector('.mo7-sort__select');

  /* ---------- Event handlers ---------- */
  const onFilterClick = (ev) => {
    const btn = ev.target.closest('.mo7-filter');
    if (!btn || !filtersEl.contains(btn)) return;
    const key = btn.getAttribute('data-filter');
    if (!key || key === state.filter) return;
    state.filter = key;
    filtersEl.querySelectorAll('.mo7-filter').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-filter') === key);
    });
    applyFilter(rowEl, key);
  };

  const onSortChange = (ev) => {
    const key = ev.target.value;
    if (!key || key === state.sort) return;
    state.sort = key;
    rerenderCards(rowEl, key);
    applyFilter(rowEl, state.filter);
  };

  const onRowClick = (ev) => {
    const btn = ev.target.closest('.mo-broker-btn');
    if (btn && rowEl.contains(btn)) {
      ev.stopPropagation();
      const name = btn.getAttribute('data-broker');
      console.log('open broker', name);
      if (typeof ctx.onOpenBroker === 'function') {
        try { ctx.onOpenBroker(name); } catch (_) {}
      }
      return;
    }
    const card = ev.target.closest('.mo-broker-card');
    if (card && rowEl.contains(card)) {
      const name = card.getAttribute('data-name');
      if (typeof ctx.onSelectBroker === 'function') {
        try { ctx.onSelectBroker(name); } catch (_) {}
      }
    }
  };

  filtersEl.addEventListener('click', onFilterClick);
  sortSelect.addEventListener('change', onSortChange);
  rowEl.addEventListener('click', onRowClick);

  /* ---------- Cleanup ---------- */
  return {
    destroy() {
      try { filtersEl.removeEventListener('click', onFilterClick); } catch (_) {}
      try { sortSelect.removeEventListener('change', onSortChange); } catch (_) {}
      try { rowEl.removeEventListener('click', onRowClick); } catch (_) {}
      try { container.innerHTML = ''; } catch (_) {}
    },
  };
}

export default { render };
