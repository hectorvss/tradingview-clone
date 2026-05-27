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
// Pase 3 (Agent D3, 2026-05-26): 11/30 of `all` verified verbatim against Figma 25:242044.
// Pase 4 (Agent D4-all, 2026-05-27): remaining 19/30 of `all` (rows 11-29, Figma nodes
// 25:240843 → 25:241454) extracted verbatim. The full `fin` (30) and `esg` (20) tabs
// still carry the Pase 2 plausible fillers in the same style.
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
    { time: 'anteayer',       tags: [{s:'uber',l:'U'},{s:'doordash',l:'DD'},{s:'delivery-hero',l:'DH'}], headline: 'Según informa el FT, Uber y DoorDash están sondeando a los inversionistas para una posible oferta por Delivery Hero', provider: 'Reuters' }, /*F 25:240843*/
    { time: 'hace 3 días',    tags: [{s:'jd-com',l:'JD'},{s:'sainsbury-s',l:'S'},{s:'the-carlyle-group',l:'C'}], headline: 'Según informa Sky News, la empresa china JD.com está barajando una oferta de 2.000 millones de libras por la cadena minorista británica The Very Group', provider: 'Reuters' }, /*F 25:240881*/
    { time: 'hace 3 días',    tags: [{s:'lantheus',l:'L'}], headline: 'Según informa Bloomberg News, Lantheus está valorando una posible venta por valor de 7.000 millones de dólares tras la oferta de Curium', provider: 'Reuters' }, /*F 25:240925*/
    { time: 'hace 3 días',    tags: [{s:'estee-lauder',l:'EL'},{s:'puig-brands',l:'P'}], headline: 'Filtraciones, exigencias y una llamada telefónica: cómo se vino abajo el acuerdo entre Estée Lauder y Puig', provider: 'Reuters' }, /*F 25:240948*/
    { time: 'hace 3 días',    tags: [{s:'uber',l:'U'},{s:'delivery-hero',l:'DH'}], headline: 'Según informa Bloomberg News, Uber está estudiando la posibilidad de adquirir la totalidad de la empresa alemana Delivery Hero', provider: 'Reuters' }, /*F 25:240976*/
    { time: 'hace 3 días',    tags: [{s:'jd-com',l:'JD'},{s:'sainsbury-s',l:'S'},{s:'the-carlyle-group',l:'C'}], headline: 'Según informa Sky News, la empresa china JD.com está barajando una oferta de 2000 millones de libras por la cadena minorista británica The Very Group', provider: 'Reuters' }, /*F 25:241005*/
    { time: 'hace 3 días',    tags: [], headline: 'Shein comprará la cadena de ropa Everlane', provider: 'Reuters' }, /*F 25:241049*/
    { time: 'hace 3 días',    tags: [{s:'microsoft',l:'M'}], headline: 'Los accionistas de Activision llegan a un acuerdo de 250 millones de dólares por la adquisición de Microsoft', provider: 'Reuters' }, /*F 25:241062*/
    { time: 'hace 3 días',    tags: [{s:'dell',l:'D'},{s:'jazz-pharmaceuticals',l:'JZ'},{s:'target',l:'T'},{s:'workday',l:'W'}], headline: 'Jazz Pharmaceuticals, Target, Workday', provider: 'Reuters' }, /*F 25:241084*/
    { time: 'hace 3 días',    tags: [{s:'tuas-limited',l:'T'},{s:'cvc-capital-partners-plc',l:'C'},{s:'gbl',l:'G'},{s:'inpost-s-a',l:'I'}], headline: 'Fusiones y adquisiciones', provider: 'Reuters' }, /*F 25:241134*/
    { time: 'hace 3 días',    tags: [{s:'bodycote-plc',l:'B'},{s:'apollo',l:'AP'},{s:'intertek',l:'I'},{s:'tate-and-lyle-plc-ord-25p',l:'T'}], headline: 'La empresa británica Bodycote recibe una oferta de compra por parte de Apollo por valor de 2000 millones de dólares', provider: 'Reuters' }, /*F 25:241181*/
    { time: 'hace 3 días',    tags: [{s:'bodycote-plc',l:'B'},{s:'apollo',l:'AP'}], headline: 'La empresa británica Bodycote confirma la propuesta de adquisición por parte de Apollo por valor de 2.040 millones de dólares', provider: 'Reuters' }, /*F 25:241231*/
    { time: 'hace 3 días',    tags: [{s:'colgate-palmolive',l:'CL'}], headline: 'Los beneficios trimestrales ajustados de Colgate Palmoilve India aumentan gracias a la demanda de productos de gama alta', provider: 'Reuters' }, /*F 25:241260*/
    { time: 'hace 3 días',    tags: [{s:'chart-industries',l:'C'},{s:'baker-hughes',l:'BH'}], headline: 'Las autoridades reguladoras de la UE tomarán una decisión sobre la operación de Baker Hughes con Chart, por valor de 13 600 millones de dólares, antes del 26 de junio', provider: 'Reuters' }, /*F 25:241279*/
    { time: 'hace 4 días',    tags: [{s:'puig-brands',l:'P'},{s:'estee-lauder',l:'EL'},{s:'stoxx-600',l:'SX'},{s:'',l:'S'}], headline: 'Las acciones de Puig se hunden tras el fracaso del acuerdo con Estée Lauder', provider: 'Reuters' }, /*F 25:241311*/
    { time: 'hace 4 días',    tags: [], headline: 'El fondo canadiense OMERS vende su participación del 25% en Exolum', provider: 'Reuters' }, /*F 25:241355*/
    { time: 'hace 4 días',    tags: [{s:'estee-lauder',l:'EL'},{s:'puig-brands',l:'P'},{s:'stoxx-600',l:'SX'}], headline: 'Estée Lauder se dispara, mientras que Puig cae tras el fracaso de las negociaciones de fusión', provider: 'Reuters' }, /*F 25:241368*/
    { time: 'hace 4 días',    tags: [{s:'puig-brands',l:'P'},{s:'estee-lauder',l:'EL'}], headline: 'Las acciones de Puig apuntan a una caída tras el fracaso del acuerdo con Estée Lauder', provider: 'Reuters' }, /*F 25:241405*/
    { time: 'hace 4 días',    tags: [{s:'grupo-emprerial-jose',l:'GS'}], headline: 'Grupo San José registra un beneficio de 12,5 mln eur en el primer trimestre', provider: 'Reuters' }, /*F 25:241433*/
    { time: 'hace 4 días',    tags: [{s:'estee-lauder',l:'EL'},{s:'puig-brands',l:'P'},{s:'l-oreal',l:'L'}], headline: 'Estée Lauder y Puig abandonan las conversaciones de fusión', provider: 'Reuters' }, /*F 25:241454*/
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
    { time: '12 may',       tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia la aprobación del Acuerdo SO1 por la FOMB', provider: 'Access Newswire' }, /*F 25:248842*/
    { time: '7 may',        tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia resultados del primer trimestre de 2026', provider: 'Access Newswire' }, /*F 25:248871*/
    { time: '27 feb',       tags: [{s:'bactech-environmental',l:'B'}], headline: 'Dr. Paul Miller to Present Zero Tailings Technology at PDAC', provider: 'The newswire.ca' }, /*F 25:248900*/
    { time: '24 feb',       tags: [{s:'bactech-environmental',l:'B'}], headline: 'BacTech Environmental to Attend PDAC 2026 in Toronto', provider: 'The newswire.ca' }, /*F 25:248920*/
    { time: '19 feb',       tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia los resultados del cuarto trimestre y del ejercicio anual 2025', provider: 'Acceswire' }, /*F 25:248940*/
    { time: '20 ene',       tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy declara dividendo trimestral', provider: 'Acceswire' }, /*F 25:248969*/
    { time: '30 oct 2025',  tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia los resultados del tercer trimestre de 2025', provider: 'Acceswire' }, /*F 25:248998*/
    { time: '30 oct 2025',  tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy declara un dividendo trimestral', provider: 'Acceswire' }, /*F 25:249027*/
    { time: '14 oct 2025',  tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy firma nuevo crédito, refuerza su equipo ejecutivo y anuncia resultados del Q3-2025', provider: 'Acceswire' }, /*F 25:249056*/
    { time: '2 oct 2025',   tags: [], headline: 'Posibles, más reclamos de EU a México tras negativa a inmunidad antitrust de Delta-Aeroméxico', provider: 'Reuters' }, /*F 25:249085*/
    { time: '4 sept 2025',  tags: [], headline: '¿Cómo avanza Chile en la meta al Net Zero?', provider: 'Reuters' }, /*F 25:249098*/
    { time: '15 ago 2025',  tags: [], headline: 'Yutong planta 1.000 árboles, como parte de su iniciativa Bosque Net Zero de Chile para impulsar la sostenibilidad ecológica', provider: 'Reuters' }, /*F 25:249111*/
    { time: '11 ago 2025',  tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia la presentación del acuerdo SO1 al Negociado de Energía de Puerto Rico', provider: 'Acceswire' }, /*F 25:249124*/
    { time: '6 ago 2025',   tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia los resultados del segundo trimestre de 2025', provider: 'Acceswire' }, /*F 25:249153*/
    { time: '17 jul 2025',  tags: [{s:'enagas',l:'E'}], headline: 'Scale Green Energy podrá construir seis estaciones de repostaje de hidrógeno en España', provider: 'Reuters' }, /*F 25:249182*/
    { time: '17 jul 2025',  tags: [], headline: 'Delatores recompensados: nueva vertiente del antitrust', provider: 'Reuters' }, /*F 25:249203*/
    { time: '8 may 2025',   tags: [], headline: 'Dow Argentina obtuvo sus primeros Certificados IREC por parte de MSU Green Energy', provider: 'Reuters' }, /*F 25:249216*/
    { time: '2 may 2025',   tags: [{s:'polaris-renewable-energy',l:'P'}], headline: 'Polaris Renewable Energy anuncia sus resultados del primer trimestre de 2025', provider: 'Acceswire' }, /*F 25:249229*/
    { time: '21 abr 2025',  tags: [], headline: 'Atlas Renewable Energy cierra financiamiento por US$ 510 millones para proyecto híbrido', provider: 'Reuters' }, /*F 25:249258*/
    { time: '9 abr 2025',   tags: [], headline: 'Atlas Renewable Energy y Colbún acuerdan contrato de compraventa de energía para proyecto de almacenamiento con baterías', provider: 'Reuters' }, /*F 25:249271*/
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
