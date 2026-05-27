// src/sidebars/sidebar-actions.js
// Shared action map for the global right-sidebar (11 icons).
// Used by both `sections/right-sidebar.js` (home) and the global injector in
// `main.js`. Each icon either navigates to a route or opens a stub panel.
//
// The chart-view page has its OWN richer handlers that hook into chart state
// (Trading Panel, Object Tree, etc.) and bypasses this map.

export const ICON_ACTIONS = [
  { idx: 0,  title: 'Lista de seguimiento',            kind: 'route', href: '#/portfolio' },
  { idx: 1,  title: 'Alertas',                          kind: 'panel', panel: 'alerts',   label: 'Alertas activas' },
  { idx: 2,  title: 'Árbol de objetos y ventana de datos', kind: 'panel', panel: 'objects', label: 'Árbol de objetos' },
  { idx: 3,  title: 'Chats',                            kind: 'panel', panel: 'chat',     label: 'Chat' },
  { idx: 4,  title: 'Calendario económico',             kind: 'route', href: '#/calendar' },
  { idx: 5,  title: 'Calendario de noticias',           kind: 'route', href: '#/news' },
  { idx: 6,  title: 'Ideas publicadas',                 kind: 'path',  href: '/ideas/recent' },
  { idx: 7,  title: 'Comunidad',                        kind: 'path',  href: '/community' },
  { idx: 8,  title: 'Notificaciones',                   kind: 'panel', panel: 'notif',    label: 'Notificaciones' },
  { idx: 9,  title: 'Productos',                        kind: 'route', href: '#/screener' },
  { idx: 10, title: 'Ajustes panel derecho',            kind: 'panel', panel: 'settings', label: 'Ajustes' },
];

const PANEL_ID = 'tv-global-sidebar-panel';

function ensurePanelStyles() {
  if (document.getElementById('tv-global-sidebar-panel-css')) return;
  const s = document.createElement('style');
  s.id = 'tv-global-sidebar-panel-css';
  s.textContent = `
    #${PANEL_ID} {
      position: fixed;
      top: 48px; right: 45px;
      width: 320px; max-width: 90vw;
      max-height: calc(100vh - 64px);
      background: #161a24;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      box-shadow: -8px 8px 32px rgba(0,0,0,0.5);
      z-index: 700;
      display: flex; flex-direction: column;
      font-family: 'Trebuchet MS', system-ui, sans-serif;
      color: #d1d4dc;
      animation: tv-gsp-in 140ms ease;
    }
    @keyframes tv-gsp-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #${PANEL_ID} header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    #${PANEL_ID} header h3 {
      margin: 0; font-size: 14px; font-weight: 600;
    }
    #${PANEL_ID} header button {
      background: none; border: 0; color: #787b86;
      cursor: pointer; font-size: 18px; line-height: 1;
      padding: 0 4px;
    }
    #${PANEL_ID} header button:hover { color: #fff; }
    #${PANEL_ID} .gsp-body {
      padding: 14px;
      overflow-y: auto;
      font-size: 13px; line-height: 1.55;
      color: #b2b5be;
    }
    #${PANEL_ID} .gsp-body em { color: #787b86; }
  `;
  document.head.appendChild(s);
}

function panelBodyHtml(panel) {
  switch (panel) {
    case 'alerts':
      return `<p>No tienes alertas activas todavía.</p>
              <p><em>Crea alertas desde el gráfico → botón <b>Alerta</b> en el topbar.</em></p>`;
    case 'objects':
      return `<p>El árbol de objetos muestra series, indicadores y dibujos del gráfico activo.</p>
              <p><em>Abre un gráfico (Productos → Supergráficos) para ver el contenido.</em></p>`;
    case 'chat':
      return `<p>Chat de la comunidad — próximamente.</p>`;
    case 'notif':
      return `<p>No tienes notificaciones nuevas.</p>`;
    case 'settings':
      return `<p>Ajustes del panel derecho.</p>
              <p><em>Aquí se podrá personalizar qué iconos aparecen en la barra y su orden.</em></p>`;
    default:
      return `<p>Panel sin contenido.</p>`;
  }
}

function openStubPanel(label, panel) {
  ensurePanelStyles();
  closePanel();
  const el = document.createElement('div');
  el.id = PANEL_ID;
  el.innerHTML = `
    <header>
      <h3>${label}</h3>
      <button aria-label="Cerrar" data-close>×</button>
    </header>
    <div class="gsp-body">${panelBodyHtml(panel)}</div>
  `;
  document.body.appendChild(el);
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  setTimeout(() => {
    document.addEventListener('mousedown', _outsideHandler, true);
  }, 0);
}

function _outsideHandler(e) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) {
    document.removeEventListener('mousedown', _outsideHandler, true);
    return;
  }
  if (!panel.contains(e.target) && !e.target.closest('.rb-icon')) closePanel();
}

function closePanel() {
  const el = document.getElementById(PANEL_ID);
  if (el) el.remove();
  document.removeEventListener('mousedown', _outsideHandler, true);
}

export function runSidebarAction(idx) {
  const action = ICON_ACTIONS[idx];
  if (!action) return;
  if (action.kind === 'route') {
    closePanel();
    window.location.hash = action.href.replace(/^#/, '');
    return;
  }
  if (action.kind === 'path') {
    closePanel();
    history.pushState({}, '', action.href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  if (action.kind === 'panel') {
    openStubPanel(action.label, action.panel);
  }
}

export function attachSidebarHandlers(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.rb-icon[data-idx]').forEach(btn => {
    if (btn.__tvActionsWired) return;
    btn.__tvActionsWired = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runSidebarAction(Number(btn.dataset.idx));
    });
  });
}
