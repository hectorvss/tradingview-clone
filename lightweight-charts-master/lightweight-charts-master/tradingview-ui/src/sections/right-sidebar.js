// src/sections/right-sidebar.js — TradingView right widget bar (Figma 1:41584)
// Pixel-perfect 45px vertical icon column, matching chart-view's right sidebar.

let _cssInjected = false;

const CSS = `
.mo-rb {
  position: sticky;
  top: 0;
  right: 0;
  flex: 0 0 45px;
  width: 45px;
  height: 100vh;
  min-height: 900px;
  background: var(--grey-6, #0f0f0f);
  border-left: 1px solid var(--grey-18, #2e2e2e);
  box-sizing: border-box;
  z-index: 50;
  overflow: hidden;
}
.mo-rb-inner {
  position: relative;
  width: 45px;
  height: 900px;
}
.mo-rb .rb-icon {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--alto, #dbdbdb);
  border-radius: 4px;
  transition: background-color .12s ease;
}
.mo-rb .rb-icon:hover {
  background: var(--grey-18, #2e2e2e);
}
.mo-rb .rb-icon img,
.mo-rb .rb-icon svg {
  width: 28px;
  height: 28px;
  display: block;
  pointer-events: none;
}
.mo-rb .rb-sep {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 847px;
  height: 1px;
  background: var(--grey-29, #4a4a4a);
}

/* ---------------- Polish layer (UI/UX) ---------------- */
.mo-rb .rb-icon { transition: background-color 100ms ease, color 100ms ease, transform 100ms ease, opacity 100ms ease; }
.mo-rb .rb-icon:hover { color: #2962ff; }
.mo-rb .rb-icon:active { opacity: .6; transform: translateX(-50%) scale(.92); }
.mo-rb .rb-icon:focus-visible { outline: 2px solid #2962ff; outline-offset: -2px; }

@media (max-width: 1200px) {
  .mo-rb { display: none; }
}
`;

// 11 icons — mirrors chart-view.js RIGHT_ICONS so behavior is identical.
const ICONS = [
  { y: 2,   src: '/src/icons/ec725f13-772a-4f9b-aec3-29ea40f498e7.svg', title: 'Lista de seguimiento' },
  { y: 46,  src: '/src/icons/82b20457-7ccb-4235-8f44-6a6bdcb0eb97.svg', title: 'Alertas' },
  { y: 92,  src: '/src/icons/efa9d9f5-48e0-4204-a42d-a52ece5c08e4.svg', title: 'Árbol de objetos y ventana de datos' },
  { y: 138, src: '/src/icons/cccb7bf3-a5e7-4936-b47e-bdb38f4015eb.svg', title: 'Chats' },
  { y: 529, src: '/src/icons/4fb30348-ed6a-4519-8c81-2f8cfde70992.svg', title: 'Calendario económico' },
  { y: 573, src: '/src/icons/208d5a0f-a1a3-428f-a833-57a8a04ccb5a.svg', title: 'Calendario de noticias' },
  { y: 617, src: '/src/icons/380f8103-cdc8-48b7-b4ac-542c5c9672a4.svg', title: 'Ideas publicadas' },
  { y: 661, src: '/src/icons/c7e6d694-7df2-4ae2-996e-9e149466ff4a.svg', title: 'Comunidad' },
  { y: 707, src: '/src/icons/0f3cee29-0e15-43e8-8497-bef1fdbf420e.svg', title: 'Notificaciones' },
  { y: 753, src: '/src/icons/88fb87a6-d2b9-4b58-988d-8e3568d63f95.svg', title: 'Productos' },
  { y: 812, src: '/src/icons/5470c460-fc80-40a1-b961-003c5ecfb0c6.svg', title: 'Ajustes panel derecho' },
];

function iconHTML(src, alt = '') {
  const m = src && src.match(/^\/src\/icons\/([a-f0-9-]+)\.svg$/);
  if (m) {
    return `<svg width="28" height="28" aria-label="${alt}" class="ic"><use href="/src/icons-sprite.svg#i-${m[1]}"/></svg>`;
  }
  return `<img src="${src}" width="28" height="28" alt="${alt}" loading="lazy" />`;
}

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-right-sidebar', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const buttons = ICONS.map((ic, i) =>
    `<button class="rb-icon" data-idx="${i}" style="top:${ic.y}px" title="${ic.title}" aria-label="${ic.title}">${iconHTML(ic.src, ic.title)}</button>`
  ).join('');

  container.innerHTML = `
<aside class="mo-rb" role="toolbar" aria-label="Panel derecho">
  <div class="mo-rb-inner">
    ${buttons}
    <div class="rb-sep" aria-hidden="true"></div>
  </div>
</aside>`;

  // Optional: dispatch click events so the host page can wire up panels.
  const root = container.querySelector('.mo-rb');
  if (root && ctx && typeof ctx.onIconClick === 'function') {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.rb-icon');
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      ctx.onIconClick(ICONS[idx], idx, e);
    });
  }
}

export default { render };
