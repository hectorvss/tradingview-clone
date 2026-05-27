// Shared right icon sidebar partial. SVGs inlined from ../../icons/*.svg.

const SVG_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2.5" y="3.5" width="13" height="12" rx="1.5"/>
  <line x1="2.5" y1="7" x2="15.5" y2="7"/>
  <line x1="6" y1="2" x2="6" y2="5"/>
  <line x1="12" y1="2" x2="12" y2="5"/>
</svg>`;

const SVG_BELL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 9a6 6 0 0 1 12 0c0 4 2 5 2 5H3s2-1 2-5z"/>
  <path d="M9.5 18a2 2 0 0 0 3 0"/>
</svg>`;

const SVG_CHAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V5z"/>
</svg>`;

const SVG_CHART_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3,17 8,11 12,14 19,5"/>
  <polyline points="14,5 19,5 19,10"/>
</svg>`;

const SVG_COMMUNITY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="8" cy="8" r="3"/>
  <circle cx="16" cy="9" r="2.5"/>
  <path d="M2.5 18c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5"/>
  <path d="M14 18c0-2 1.5-3.5 4-3.5 1.5 0 2.5 0.7 3 1.5"/>
</svg>`;

const SVG_RSS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 5a13 13 0 0 1 13 13"/>
  <path d="M4 11a7 7 0 0 1 7 7"/>
  <circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none"/>
</svg>`;

const SVG_GRID = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" stroke="none">
  <circle cx="5" cy="5" r="1.6"/>
  <circle cx="11" cy="5" r="1.6"/>
  <circle cx="17" cy="5" r="1.6"/>
  <circle cx="5" cy="11" r="1.6"/>
  <circle cx="11" cy="11" r="1.6"/>
  <circle cx="17" cy="11" r="1.6"/>
  <circle cx="5" cy="17" r="1.6"/>
  <circle cx="11" cy="17" r="1.6"/>
  <circle cx="17" cy="17" r="1.6"/>
</svg>`;

const SVG_HELP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <path d="M8.5 8.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
  <circle cx="11" cy="15.5" r="0.6" fill="currentColor" stroke="none"/>
</svg>`;

function button(id, svg, label) {
  return `<div class="toolbar-button toolbar-S4V6IoxY" role="button" tabindex="0" data-icon="${id}" aria-label="${label}" title="${label}">${svg}</div>`;
}

export function renderSidebar() {
  return `<div class="layout__area--right">
    <div class="widgetbar-wrap">
      <div class="widgetbar-tabs">
        <div class="wrap-Z4M3tWHb">
          <div class="scrollWrap-Z4M3tWHb">
            <div class="content-Z4M3tWHb">
              ${button('calendar', SVG_CALENDAR, 'Calendario')}
              ${button('bell', SVG_BELL, 'Alertas')}
              ${button('chat', SVG_CHAT, 'Chat')}
              <div class="separator-gZVyfVJP"></div>
              ${button('chart-up', SVG_CHART_UP, 'Analizadores')}
              ${button('community', SVG_COMMUNITY, 'Comunidad')}
              ${button('rss', SVG_RSS, 'Noticias')}
              ${button('grid', SVG_GRID, 'Productos')}
              ${button('help', SVG_HELP, 'Ayuda')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export default renderSidebar;
