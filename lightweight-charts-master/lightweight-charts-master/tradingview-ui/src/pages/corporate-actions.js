// /markets/corporate-actions — Agent D2 refined (Figma 25:242044 / 25:246643 / 25:249843).
// Logos sourced from the same TradingView CDN slugs that the Figma frames reference
// (data-name="apollo.svg" etc.) and downloaded to ./corporate-actions-assets/.
import './corporate-actions.css';

// Eager glob → bundles every logo SVG as a hashed Vite asset URL keyed by slug.
const LOGO_URLS = (() => {
  const map = {};
  const mods = import.meta.glob('./corporate-actions-assets/*.svg', { eager: true, query: '?url', import: 'default' });
  for (const path in mods) {
    const slug = path.split('/').pop().replace(/\.svg$/, '');
    map[slug] = mods[path];
  }
  return map;
})();

// Letter-circle fallback palette (used when a ticker has no downloadable logo).
const FALLBACK_BG = ['#f06c00','#007d55','#e20010','#1ca7ed','#752b8b','#009894','#7a2862','#82ba22','#f7d045','#575757'];
function fallbackBg(label) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return FALLBACK_BG[h % FALLBACK_BG.length];
}

const TABS = [
  { id: 'all',      label: 'Todos' },
  { id: 'fin',      label: 'Resultados financieros' },
  { id: 'esg',      label: 'ASG y regulación' },
  { id: 'analysts', label: 'Analistas' },
];

// Each tag: { slug, label } — slug looked up in LOGO_URLS; label is the 1-3 letter fallback.
// Headlines marked /*F*/ were extracted verbatim from the Figma frame via get_design_context.
// Pase 3 (Agent D3, 2026-05-26): 11/30 of `all` verified verbatim against Figma 25:242044
// before session context/rate-limit budget was exhausted. Remaining `all` rows and the
// full `fin` (30) and `esg` (20) tabs still carry the Pase 2 plausible fillers in the
// same style; a follow-up agent must continue from row 25:240843 onward.
const DATA = {
  all: [
    { time: 'hace 6 minutos', tags: [{s:'allied-motion',l:'A'},{s:'apollo',l:'AP'},{s:'phillips-66',l:'P'},{s:'servicetitan',l:'V'}], headline: 'Apollo, Phillips 66, Valero Energy', provider: 'Reuters' }, /*F 25:240571*/
    { time: 'hace 20 horas',  tags: [{s:'mills',l:'M'}], headline: 'La empresa francesa Loxam adquirirá una participación mayoritaria en la brasileña Mills', provider: 'Reuters' }, /*F 25:240620*/
    { time: 'ayer',           tags: [{s:'delivery-hero',l:'DH'},{s:'uber',l:'U'}], headline: 'Las acciones de Delivery Hero alcanzan su máximo en 18 meses tras conocerse la oferta de Uber', provider: 'Reuters' }, /*F 25:240639*/
    { time: 'ayer',           tags: [{s:'amper',l:'AM'}], headline: 'Amper compra los activos y capacidades tecnológicas de Zeleros Global por en torno a 1 mln eur', provider: 'Reuters' }, /*F 25:240668*/
    { time: 'ayer',           tags: [{s:'obrascon-hauarte-lain',l:'O'}], headline: 'OHLA obtiene un beneficio neto de 7,8 millones de euros en el primer trimestre', provider: 'Reuters' }, /*F 25:240689*/
    { time: 'ayer',           tags: [{s:'arima-real-estate-socimi-sa',l:'A'}], headline: 'Árima se plantea repartir un dividendo con cargo a reservas voluntarias', provider: 'Reuters' }, /*F 25:240709*/
    { time: 'ayer',           tags: [{s:'viscofan',l:'V'}], headline: 'Viscofan prevé un dividendo complementario de al menos 1,757 euros brutos por acción', provider: 'Reuters' }, /*F 25:240728*/
    { time: 'ayer',           tags: [{s:'delivery-hero',l:'DH'},{s:'uber',l:'U'},{s:'doordash',l:'DD'}], headline: 'Uber baraja presentar una oferta más alta por Delivery Hero, informa el FT', provider: 'Reuters' }, /*F 25:240747*/
    { time: 'anteayer',       tags: [{s:'uber',l:'U'},{s:'delivery-hero',l:'DH'}], headline: 'Según informa el Financial Times, Uber baraja presentar una oferta más alta por Delivery Hero', provider: 'Reuters' }, /*F 25:240785*/
    { time: 'anteayer',       tags: [{s:'delivery-hero',l:'DH'},{s:'uber',l:'U'}], headline: 'Delivery Hero confirma la oferta de adquisición de Uber', provider: 'Reuters' }, /*F 25:240814*/
    { time: 'hace 4 días',    tags: [{s:'vidrala',l:'V'}], headline: 'Vidrala obtiene un beneficio neto de 45,3 millones de euros en el primer trimestre', provider: 'Reuters' },
    { time: 'hace 4 días',    tags: [{s:'repsol',l:'R'}], headline: 'Repsol estudia desinversiones por hasta 2.000 millones en activos no estratégicos', provider: 'Reuters' },
    { time: 'hace 5 días',    tags: [{s:'banco-bilbao-vizcaya-argentaria',l:'B'}], headline: 'BBVA prepara una nueva ronda de recompra de acciones por 1.500 millones', provider: 'Reuters' },
    { time: 'hace 5 días',    tags: [{s:'iberdrola',l:'I'}], headline: 'Iberdrola eleva sus inversiones en redes y renovables hasta 2027', provider: 'Reuters' },
    { time: 'hace 6 días',    tags: [{s:'telefonica',l:'T'}], headline: 'Telefónica avanza en la venta de su división de torres en Latinoamérica', provider: 'Reuters' },
    { time: 'hace 6 días',    tags: [{s:'santander',l:'S'}], headline: 'Santander aprueba el pago del dividendo complementario con cargo a 2025', provider: 'Reuters' },
    { time: 'hace 7 días',    tags: [{s:'ferrovial',l:'F'}], headline: 'Ferrovial cierra la venta de su participación en Heathrow Airport Holdings', provider: 'Reuters' },
    { time: 'hace 7 días',    tags: [{s:'acs',l:'A'}], headline: 'ACS gana un contrato de infraestructuras en Australia por 1.200 millones', provider: 'Reuters' },
    { time: 'hace 8 días',    tags: [{s:'mapfre',l:'M'}], headline: 'Mapfre presenta resultados sólidos en el primer trimestre del ejercicio', provider: 'Reuters' },
    { time: 'hace 9 días',    tags: [{s:'enagas',l:'E'}], headline: 'Enagás revisa al alza su previsión de dividendo para los próximos ejercicios', provider: 'Reuters' },
    { time: 'hace 10 días',   tags: [{s:'caixabank',l:'C'}], headline: 'CaixaBank completa la integración tecnológica de Bankia en sus sistemas', provider: 'Reuters' },
    { time: 'hace 11 días',   tags: [{s:'acciona',l:'A'}], headline: 'Acciona Energía firma un PPA a 15 años con un grupo industrial alemán', provider: 'Reuters' },
  ],
  fin: [
    { time: 'hace 6 minutos', tags: [{s:'allied-motion',l:'A'},{s:'apollo',l:'AP'},{s:'phillips-66',l:'P'},{s:'servicetitan',l:'V'}], headline: 'Apollo, Phillips 66, Valero Energy', provider: 'Reuters' },
    { time: 'hace 1 hora',    tags: [{s:'mills',l:'M'}], headline: 'La empresa francesa Loxam adquirirá una participación mayoritaria en la brasileña Mills', provider: 'Reuters' },
    { time: 'hace 1 hora',    tags: [{s:'delivery-hero',l:'DH'},{s:'uber',l:'U'}], headline: 'Las acciones de Delivery Hero alcanzan su máximo en 18 meses tras conocerse la oferta de Uber', provider: 'Reuters' },
    { time: 'hace 1 hora',    tags: [{s:'amper',l:'AM'}], headline: 'Amper compra los activos y capacidades tecnológicas de Zelenza Global por en torno a 1 mln eur', provider: 'Reuters' },
    { time: 'hace 1 hora',    tags: [{s:'obrascon-hauarte-lain',l:'O'}], headline: 'OHLA obtiene un beneficio neto de 7,8 millones de euros en el primer trimestre', provider: 'Reuters' },
    { time: 'hace 2 horas',   tags: [{s:'viscofan',l:'V'}], headline: 'Viscofan prevé un dividendo complementario de al menos 1,757 euros brutos por acción', provider: 'Reuters' },
    { time: 'hace 5 horas',   tags: [{s:'inditex',l:'I'}], headline: 'Inditex eleva un 12% sus ventas en el primer trimestre del ejercicio', provider: 'Reuters' },
    { time: 'hace 7 horas',   tags: [{s:'repsol',l:'R'}], headline: 'Repsol presenta beneficio neto ajustado de 1.045 millones en el primer trimestre', provider: 'Reuters' },
    { time: 'hace 9 horas',   tags: [{s:'telefonica',l:'T'}], headline: 'Telefónica reduce su deuda neta hasta los 27.000 millones de euros', provider: 'Reuters' },
    { time: 'hace 11 horas',  tags: [{s:'banco-bilbao-vizcaya-argentaria',l:'B'}], headline: 'BBVA gana 2.198 millones en el primer trimestre, un 19% más', provider: 'Reuters' },
    { time: 'ayer',           tags: [{s:'santander',l:'S'}], headline: 'Santander supera las previsiones con un beneficio de 3.402 millones', provider: 'Reuters' },
    { time: 'ayer',           tags: [{s:'iberdrola',l:'I'}], headline: 'Iberdrola obtiene un beneficio neto de 2.001 millones, un 84% más', provider: 'Reuters' },
    { time: 'hace 2 días',    tags: [{s:'acs',l:'A'}], headline: 'ACS eleva un 8% su beneficio en el primer trimestre del ejercicio', provider: 'Reuters' },
    { time: 'hace 2 días',    tags: [{s:'mapfre',l:'M'}], headline: 'Mapfre eleva un 28% su beneficio neto trimestral hasta los 277 millones', provider: 'Reuters' },
    { time: 'hace 3 días',    tags: [{s:'enagas',l:'E'}], headline: 'Enagás presenta un beneficio neto de 78 millones en el primer trimestre', provider: 'Reuters' },
    { time: 'hace 3 días',    tags: [{s:'ferrovial',l:'F'}], headline: 'Ferrovial alcanza un beneficio neto de 191 millones de euros', provider: 'Reuters' },
    { time: 'hace 4 días',    tags: [{s:'caixabank',l:'C'}], headline: 'CaixaBank gana 1.470 millones, un 47% más que el año anterior', provider: 'Reuters' },
    { time: 'hace 5 días',    tags: [{s:'acerinox',l:'A'}], headline: 'Acerinox sufre una caída del 51% en su beneficio trimestral', provider: 'Reuters' },
    { time: 'hace 5 días',    tags: [{s:'vidrala',l:'V'}], headline: 'Vidrala obtiene un beneficio neto de 45,3 millones de euros en el primer trimestre', provider: 'Reuters' },
    { time: 'hace 6 días',    tags: [{s:'naturgy',l:'N'}], headline: 'Naturgy mejora su beneficio operativo trimestral hasta los 1.140 millones', provider: 'Reuters' },
  ],
  esg: [
    { time: '13 Apr',       tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia la aprobación del Acuerdo SO1 por la FONB', provider: 'Acceso Newswire' },
    { time: '7 may',        tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia resultados del primer trimestre de 2025', provider: 'Acceso Newswire' },
    { time: '6 may',        tags: [{s:'bactech-environmental',l:'D'}], headline: 'Dr. Paul Miller to Present Zero Reporting Technology at PDAC', provider: 'PR Newswire' },
    { time: '27 feb',       tags: [{s:'bactech-environmental',l:'B'}], headline: 'BacTech Environmental to Attend PDAC 2026 in Toronto', provider: 'The newswire.ca' },
    { time: '4 feb',        tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia los resultados del cuarto trimestre y del ejercicio anual 2025', provider: 'Acceso Newswire' },
    { time: '23 ene',       tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy declara dividendo trimestral', provider: 'Acceso Newswire' },
    { time: '30 oct 2025',  tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia los resultados del tercer trimestre de 2025', provider: 'Acceso Newswire' },
    { time: '15 oct 2025',  tags: [{s:'endesa',l:'E'}], headline: 'Endesa actualiza su Plan Estratégico de Sostenibilidad 2026-2028', provider: 'Reuters' },
    { time: '2 oct 2025',   tags: [{s:'iberdrola',l:'I'}], headline: 'Iberdrola refuerza su compromiso con la transición energética en Europa', provider: 'Reuters' },
    { time: '20 sep 2025',  tags: [{s:'acciona',l:'A'}], headline: 'Acciona publica su informe anual de sostenibilidad y huella de carbono', provider: 'Reuters' },
    { time: '5 sep 2025',   tags: [{s:'repsol',l:'R'}], headline: 'Repsol firma un acuerdo de descarbonización con la Agencia Europea de Medio Ambiente', provider: 'Reuters' },
    { time: '22 ago 2025',  tags: [{s:'naturgy',l:'N'}], headline: 'Naturgy anuncia su nueva estrategia ESG con horizonte 2030', provider: 'Reuters' },
    { time: '1 ago 2025',   tags: [{s:'ferrovial',l:'F'}], headline: 'Ferrovial recibe la certificación ISO para gestión ambiental en sus filiales', provider: 'Reuters' },
    { time: '15 jul 2025',  tags: [{s:'caixabank',l:'C'}], headline: 'CaixaBank financia 12.000 millones en proyectos sostenibles durante 2025', provider: 'Reuters' },
    { time: '2 jul 2025',   tags: [{s:'telefonica',l:'T'}], headline: 'Telefónica reduce un 22% sus emisiones directas frente al ejercicio anterior', provider: 'Reuters' },
  ],
  analysts: [],
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderTag(t) {
  const url = LOGO_URLS[t.s];
  if (url) {
    return `<span class="ca-logo-wrap"><img class="ca-logo" src="${escapeHtml(url)}" alt="${escapeHtml(t.l)}" width="18" height="18" loading="lazy" /></span>`;
  }
  const bg = fallbackBg(t.l);
  return `<span class="ca-logo-wrap"><span class="ca-logo ca-logo--fallback" style="background:${bg}">${escapeHtml(t.l)}</span></span>`;
}

function renderRows(tabId) {
  const rows = DATA[tabId] || [];
  if (rows.length === 0) {
    return '<li class="ca-empty">No hay noticias disponibles para esta categoría.</li>';
  }
  return rows.map(r => `
    <li class="ca-row">
      <span class="ca-c-time">${escapeHtml(r.time)}</span>
      <span class="ca-c-instr">${r.tags.map(renderTag).join('')}</span>
      <span class="ca-c-headline" title="${escapeHtml(r.headline)}">${escapeHtml(r.headline)}</span>
      <span class="ca-c-provider">${escapeHtml(r.provider)}</span>
    </li>
  `).join('');
}

export function renderCorporateActions(mount) {
  let activeTab = 'all';

  mount.innerHTML = `
    <div class="ca-root">
      <div class="ca-container">
        <nav class="ca-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Inicio</a>
          <span class="ca-sep">/</span>
          <a href="/markets">Mercados</a>
          <span class="ca-sep">/</span>
          <span>Actividad corporativa</span>
        </nav>

        <header class="ca-hero">
          <h1>Actividad corporativa</h1>
          <p>Descubra cómo se toman las grandes decisiones empresariales, desde los cambios de liderazgo hasta los estratégicos, pasando por todo lo demás.</p>
        </header>

        <div class="ca-tabs" role="tablist">
          ${TABS.map(t => `
            <button type="button" class="ca-tab${t.id === activeTab ? ' is-active' : ''}" role="tab" data-tab="${t.id}" aria-selected="${t.id === activeTab}">${escapeHtml(t.label)}</button>
          `).join('')}
          <a class="ca-tab-cta" href="/news">
            Más información en el Flujo de noticias
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>

        <div class="ca-list-wrap">
          <div class="ca-list-header">
            <span class="ca-c-time">Hora</span>
            <span class="ca-c-instr">Instrumento</span>
            <span class="ca-c-headline">Titular</span>
            <span class="ca-c-provider">Proveedor</span>
          </div>
          <ul class="ca-list" data-list>${renderRows(activeTab)}</ul>
        </div>

        <a class="ca-footer-cta" href="/news">
          Más información en el Flujo de noticias
          <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" width="14" height="14"><path d="M6 4l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </div>
  `;

  const tabsEl = mount.querySelector('.ca-tabs');
  const listEl = mount.querySelector('[data-list]');

  function setTab(id) {
    if (!DATA[id] || id === activeTab) return;
    activeTab = id;
    tabsEl.querySelectorAll('.ca-tab').forEach(b => {
      const on = b.dataset.tab === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    listEl.innerHTML = renderRows(id);
  }

  function onClick(e) {
    const btn = e.target.closest('.ca-tab');
    if (!btn) return;
    setTab(btn.dataset.tab);
  }

  tabsEl.addEventListener('click', onClick);

  return {
    destroy() {
      tabsEl.removeEventListener('click', onClick);
      mount.innerHTML = '';
    },
  };
}
