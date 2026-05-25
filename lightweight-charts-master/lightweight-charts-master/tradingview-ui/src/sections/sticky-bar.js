// src/sections/sticky-bar.js — TradingView sticky nav (Figma 1:41058)
// Pixel-perfect tab bar extracted from Figma fileKey 2QhXqtb66hdeKvlZAZE4fS.
// Spanish labels are exact. First tab ("Resumen de mercado") is the
// canonical landing tab; the rest mirror the Figma source order.

let _cssInjected = false;

const CSS = `
.mo-sticky {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 40px;
  box-sizing: border-box;
  font-family: var(--font-ui);
}
.mo-sticky-pill {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 1397px;
  width: 100%;
  height: 52px;
  padding: 8px 7px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--grey-29, #4a4a4a);
  border-radius: 36px;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  overflow: hidden;
}
.mo-sticky-scroll {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px;
  box-sizing: border-box;
}
.mo-sticky-scroll::-webkit-scrollbar { display: none; }

.mo-sticky-tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--grey-86, #dbdbdb);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 18px;
  font-weight: 400;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease, border-color .15s ease;
  user-select: none;
}
.mo-sticky-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.mo-sticky-tab.is-active {
  background: #f2f2f2;
  border-color: #dbdbdb;
  color: var(--grey-6, #0f0f0f);
}
.mo-sticky-tab.is-active:hover {
  background: #f2f2f2;
  color: var(--grey-6, #0f0f0f);
}
`;

const TABS = [
  { id: 'overview',  label: 'Resumen de mercado',  active: true  },
  { id: 'stocks-es', label: 'Acciones españolas',  active: false },
  { id: 'crypto',    label: 'Cripto',              active: false },
  { id: 'futures',   label: 'Futuros',             active: false },
  { id: 'forex',     label: 'Forex',               active: false },
  { id: 'economy',   label: 'Economía',            active: false },
  { id: 'brokers',   label: 'Brokers',             active: false }
];

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-sticky', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const tabsHtml = TABS.map(t => (
    `<button type="button" class="mo-sticky-tab${t.active ? ' is-active' : ''}" data-tab="${t.id}">${t.label}</button>`
  )).join('');

  container.innerHTML = `
    <div class="mo-sticky">
      <div class="mo-sticky-pill">
        <div class="mo-sticky-scroll" id="sticky-navigation-tabs" role="tablist">
          ${tabsHtml}
        </div>
      </div>
    </div>
  `;

  const tabs = container.querySelectorAll('.mo-sticky-tab');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.toggle('is-active', x === t));
      ctx.onTabChange?.(t.dataset.tab);
    });
  });
}
