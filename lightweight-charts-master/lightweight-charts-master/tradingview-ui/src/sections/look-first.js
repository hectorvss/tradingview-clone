// src/sections/look-first.js
// Look-first strip: large brand banner with a slow horizontal marquee of the
// phrase "LOOK FIRST / THEN LEAP.", followed by a 3-card row of feature
// highlights. Extends (does NOT duplicate) `.mo-look-first` from styles.css.
//
// Self-contained: own CSS namespace (mo-lf-*), no external deps beyond the
// browser. Pure CSS animation (no JS rAF needed) — `destroy()` simply tears
// down DOM, listeners and the injected <style> tag.
//
// API:
//   render(container, ctx?) -> { destroy() }

const STYLE_ID = 'mo-look-first-extra';

const FEATURES = [
  {
    key: 'institucional',
    icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    title: 'Análisis institucional',
    desc: 'Flujo de órdenes, niveles clave y datos de nivel profesional.',
  },
  {
    key: 'backtesting',
    icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5m0 14h16M7 15l4-4 3 3 5-6" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="7" cy="15" r="1.4" fill="currentColor"/>
      <circle cx="11" cy="11" r="1.4" fill="currentColor"/>
      <circle cx="14" cy="14" r="1.4" fill="currentColor"/>
      <circle cx="19" cy="8"  r="1.4" fill="currentColor"/>
    </svg>`,
    title: 'Backtesting avanzado',
    desc: 'Pon a prueba tus estrategias con datos históricos de calidad.',
  },
  {
    key: 'alertas',
    icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" stroke="currentColor"
        stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round"/>
    </svg>`,
    title: 'Alertas inteligentes',
    desc: 'Notificaciones en tiempo real basadas en precio, volumen e IA.',
  },
];

const CSS = `
/* Extend .mo-look-first (defined in styles.css) — only add what's new. */
.mo-look-first { position: relative; overflow: hidden; }
.mo-look-first > span { display: none; }   /* replaced by marquee */

.mo-lf-marquee {
  position: relative;
  width: 100%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.mo-lf-marquee-track {
  display: flex;
  width: max-content;
  gap: 80px;
  animation: mo-lf-scroll 38s linear infinite;
  will-change: transform;
}
.mo-lf-marquee:hover .mo-lf-marquee-track { animation-play-state: paused; }
.mo-lf-marquee-item {
  font-family: var(--font-inter, 'Inter', system-ui, sans-serif);
  font-weight: 200;
  font-size: 56px;
  letter-spacing: 12px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.08);
  white-space: nowrap;
  flex: 0 0 auto;
}
@keyframes mo-lf-scroll {
  from { transform: translate3d(0,0,0); }
  to   { transform: translate3d(-50%,0,0); }
}

/* Feature cards row */
.mo-lf-cards {
  max-width: 1240px;
  margin: 24px auto 48px;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) {
  .mo-lf-cards { grid-template-columns: 1fr; }
  .mo-lf-marquee-item { font-size: 36px; letter-spacing: 8px; }
}
.mo-lf-card {
  background: var(--grey-12, #131722);
  border: 1px solid var(--grey-29, #2a2e39);
  border-radius: 14px;
  padding: 22px 22px 20px;
  text-align: left;
  color: #d1d4dc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform .18s ease, border-color .18s ease, background .18s ease;
  font: inherit;
}
.mo-lf-card:hover {
  transform: translateY(-2px);
  border-color: #2962ff;
  background: #161b27;
}
.mo-lf-card:focus-visible {
  outline: 2px solid #2962ff;
  outline-offset: 2px;
}
.mo-lf-card-icon {
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #2962ff;
  background: rgba(41,98,255,0.12);
  border-radius: 10px;
}
.mo-lf-card-icon svg { width: 22px; height: 22px; }
.mo-lf-card-title { font-size: 16px; font-weight: 600; color: #fff; }
.mo-lf-card-desc  { font-size: 13px; line-height: 1.45; color: #a3a6af; }

@media (prefers-reduced-motion: reduce) {
  .mo-lf-marquee-track { animation: none; }
}

/* ---------------- Polish layer (UI/UX) ---------------- */
.mo-lf-card { transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease; }
.mo-lf-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
}
.mo-lf-card:active { opacity: .85; transform: translateY(-1px); }
.mo-lf-card-icon { transition: background-color 100ms ease, color 100ms ease, transform 150ms ease; }
.mo-lf-card:hover .mo-lf-card-icon { transform: scale(1.06); background: rgba(41,98,255,0.2); }

/* Responsive */
@media (max-width: 1200px) {
  .mo-lf-cards { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .mo-lf-cards { grid-template-columns: 1fr; padding: 0 16px; margin: 20px auto 32px; }
  .mo-lf-card { min-height: 44px; padding: 18px; }
  .mo-lf-marquee-item { font-size: 28px; letter-spacing: 6px; }
}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return false;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
  return true;
}

function buildMarqueeHTML() {
  // Duplicate items so the -50% translate loop is seamless.
  const phrase = `<span class="mo-lf-marquee-item">LOOK FIRST&nbsp;&nbsp;/&nbsp;&nbsp;THEN LEAP.</span>`;
  const half = Array.from({ length: 6 }, () => phrase).join('');
  return `
    <div class="mo-lf-marquee" aria-hidden="true">
      <div class="mo-lf-marquee-track">${half}${half}</div>
    </div>`;
}

function buildCardsHTML() {
  return `
    <div class="mo-lf-cards">
      ${FEATURES.map(f => `
        <button type="button" class="mo-lf-card" data-key="${f.key}"
                aria-label="${f.title}">
          <span class="mo-lf-card-icon">${f.icon}</span>
          <span class="mo-lf-card-title">${f.title}</span>
          <span class="mo-lf-card-desc">${f.desc}</span>
        </button>
      `).join('')}
    </div>`;
}

export function render(container, ctx = {}) {
  if (!container) throw new Error('look-first: container required');
  const injectedHere = injectStyle();

  container.innerHTML = `
    <div class="mo-look-first">
      ${buildMarqueeHTML()}
    </div>
    ${buildCardsHTML()}
  `;

  const track = container.querySelector('.mo-lf-marquee-track');
  const cards = Array.from(container.querySelectorAll('.mo-lf-card'));

  const onCardClick = (ev) => {
    const btn = ev.currentTarget;
    const key = btn.getAttribute('data-key');
    const meta = FEATURES.find(f => f.key === key);
    const name = meta ? meta.title : key;
    // Required side-effect:
    // eslint-disable-next-line no-console
    console.log('feature card', name);
    if (typeof ctx.onFeatureClick === 'function') {
      try { ctx.onFeatureClick(key, meta); } catch (_) { /* swallow */ }
    }
  };

  cards.forEach(c => c.addEventListener('click', onCardClick));

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      // Cancel the CSS animation explicitly so any pending frame stops.
      if (track) track.style.animation = 'none';
      cards.forEach(c => c.removeEventListener('click', onCardClick));
      container.innerHTML = '';
      // Only remove the injected stylesheet if this render injected it,
      // so concurrent instances on the page keep working.
      if (injectedHere) {
        const el = document.getElementById(STYLE_ID);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    },
  };
}

export default { render };
