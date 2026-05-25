// src/sections/section-6.js — "Economía" section for QuantMaster TradingView clone.
//
// Improvements over the in-place buildSection6 in market-overview.js:
//   * Real (stylized) SVG world map built from simplified continent paths,
//     each region tinted by its inflation bucket.
//   * Hover tooltip on every country region showing inflation %.
//   * 8 economic-calendar events (vs. the original 4), with country &
//     importance filter controls.
//   * Clicking a country region cross-highlights any related calendar events.
//
// Reuses existing class names from styles.css (mo-section, mo-map-card,
// mo-cal-row, mo-cal-card, mo-link, etc.). A scoped <style> tag is injected
// only for the new map/calendar enhancements.

let _cssInjected = false;

const CSS = `
.s6-wrap { position: relative; }

/* --- World map ------------------------------------------------------ */
.s6-map {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
  background: linear-gradient(180deg, #0d1117 0%, #0a0e14 100%);
  border-radius: 10px;
  overflow: hidden;
}
.s6-map svg { display: block; width: 100%; height: 100%; }
.s6-country {
  cursor: pointer;
  stroke: #0a0e14;
  stroke-width: 0.6;
  transition: opacity .15s ease, filter .15s ease;
}
.s6-country:hover { filter: brightness(1.35); }
.s6-country.is-active {
  stroke: #fff;
  stroke-width: 1.2;
  filter: brightness(1.45);
}
.s6-map-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0,0,0,0.55);
  border: 1px solid #2a2e39;
  border-radius: 6px;
  font: 11px/1 var(--font-ui, system-ui, sans-serif);
  color: #d1d4dc;
}
.s6-map-legend .s6-sw {
  display: inline-block;
  width: 14px; height: 10px;
  border-radius: 2px;
}
.s6-tooltip {
  position: absolute;
  pointer-events: none;
  padding: 6px 9px;
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  color: #fff;
  font: 12px/1.2 var(--font-ui, system-ui, sans-serif);
  white-space: nowrap;
  transform: translate(-50%, -130%);
  opacity: 0;
  transition: opacity .12s ease;
  z-index: 5;
}
.s6-tooltip.is-on { opacity: 1; }
.s6-tooltip b { font-weight: 600; }
.s6-tooltip span { color: #9aa0aa; margin-left: 6px; }

/* --- Calendar filters ---------------------------------------------- */
.s6-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
}
.s6-filters label {
  font: 12px/1 var(--font-ui, system-ui, sans-serif);
  color: #9aa0aa;
}
.s6-filters select {
  appearance: none;
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  padding: 5px 22px 5px 8px;
  font: 12px/1 var(--font-ui, system-ui, sans-serif);
  cursor: pointer;
}
.s6-filters select:focus { outline: 1px solid #2962ff; }
.s6-count {
  margin-left: auto;
  font: 12px/1 var(--font-ui, system-ui, sans-serif);
  color: #6a6f78;
}

/* --- Calendar cards ------------------------------------------------- */
.mo-cal-card.s6-related {
  outline: 1.5px solid #2962ff;
  outline-offset: -1px;
}
.mo-cal-card.s6-hidden { display: none; }
.s6-imp {
  display: inline-flex;
  gap: 2px;
  vertical-align: middle;
  margin-left: 6px;
}
.s6-imp i {
  width: 4px; height: 4px; border-radius: 50%;
  background: #3a3e48; display: inline-block;
}
.s6-imp.l3 i:nth-child(-n+3),
.s6-imp.l2 i:nth-child(-n+2),
.s6-imp.l1 i:nth-child(-n+1) { background: #f7525f; }
`;

// Inflation buckets -> colour swatches (matches legend below).
const BUCKETS = [
  { max:  2, color: '#1b5e20', label: '< 2%'   },
  { max:  5, color: '#558b2f', label: '2–5%'   },
  { max: 10, color: '#f9a825', label: '5–10%'  },
  { max: 25, color: '#ef6c00', label: '10–25%' },
  { max: Infinity, color: '#b71c1c', label: '> 25%' },
];

function bucketColor(infl) {
  for (const b of BUCKETS) if (infl < b.max) return b.color;
  return BUCKETS[BUCKETS.length - 1].color;
}

// Stylized country regions. Coordinates are in a 1000x440 viewBox laid out
// as a schematic world map (NOT geographically exact — just recognisable
// continent silhouettes). Each entry = code, name, inflation %, polygon.
const COUNTRIES = [
  { code:'US', name:'Estados Unidos', infl:  3.4, points:'120,120 250,110 280,150 270,200 180,210 120,180' },
  { code:'CA', name:'Canadá',         infl:  2.7, points:'120,60 290,55 280,108 250,110 120,118' },
  { code:'MX', name:'México',         infl:  4.6, points:'180,212 240,212 260,250 210,260 175,240' },
  { code:'BR', name:'Brasil',         infl:  4.1, points:'290,280 360,275 380,340 320,370 280,330' },
  { code:'AR', name:'Argentina',      infl:117.8, points:'280,332 320,372 310,420 285,415 275,380' },
  { code:'UK', name:'Reino Unido',    infl:  3.2, points:'470,120 495,118 498,140 478,148 468,135' },
  { code:'DE', name:'Alemania',       infl:  2.4, points:'500,140 540,138 545,175 510,180 498,160' },
  { code:'FR', name:'Francia',        infl:  2.3, points:'470,160 510,158 515,195 480,200 465,180' },
  { code:'ES', name:'España',         infl:  3.1, points:'430,200 480,200 485,235 440,238 425,222' },
  { code:'RU', name:'Rusia',          infl:  7.7, points:'560,80 880,85 880,170 600,165 555,130' },
  { code:'TR', name:'Turquía',        infl: 75.5, points:'545,200 615,198 620,235 555,238 540,220' },
  { code:'CN', name:'China',          infl:  0.3, points:'740,170 870,168 880,250 760,255 735,210' },
  { code:'JP', name:'Japón',          infl:  2.8, points:'895,180 925,178 930,225 905,232 893,210' },
  { code:'IN', name:'India',          infl:  4.8, points:'700,220 770,222 775,290 720,295 695,260' },
  { code:'EG', name:'Egipto',         infl: 32.5, points:'525,240 575,238 580,275 530,278 518,260' },
  { code:'NG', name:'Nigeria',        infl: 33.2, points:'475,280 525,278 530,315 480,320 468,300' },
  { code:'ZA', name:'Sudáfrica',      infl:  5.2, points:'505,365 555,365 560,400 510,410 495,388' },
  { code:'AU', name:'Australia',      infl:  3.6, points:'810,330 905,328 915,395 825,400 800,370' },
];

// 8 calendar events. `cc` references country codes from COUNTRIES above so
// clicking the map can cross-highlight related events. `imp` 1-3 = low/med/high.
const EVENTS = [
  { flag:'🇰🇷', cc:'KR', when:'Mañana · 02:00', name:"Buddha's Birthday",        imp:1, real:'—',     fcst:'—',     prev:'—'    },
  { flag:'🇺🇸', cc:'US', when:'Mañana · 14:30', name:'Memorial Day',              imp:2, real:'—',     fcst:'—',     prev:'—'    },
  { flag:'🇦🇷', cc:'AR', when:'Mañana · 20:00', name:'CPI YoY',                   imp:3, real:'117.8%',fcst:'120.0%',prev:'124.4%' },
  { flag:'🇫🇷', cc:'FR', when:'Mañana · 08:45', name:'Producción industrial',     imp:2, real:'0.4%',  fcst:'0.2%',  prev:'-0.1%' },
  { flag:'🇪🇸', cc:'ES', when:'Mié · 09:00',    name:'IPC armonizado',            imp:3, real:'3.1%',  fcst:'3.0%',  prev:'2.9%'  },
  { flag:'🇩🇪', cc:'DE', when:'Mié · 08:00',    name:'IFO clima empresarial',     imp:3, real:'88.6',  fcst:'88.1',  prev:'87.8'  },
  { flag:'🇹🇷', cc:'TR', when:'Jue · 11:00',    name:'Decisión tipos BCRT',       imp:3, real:'50.0%', fcst:'50.0%', prev:'50.0%' },
  { flag:'🇨🇳', cc:'CN', when:'Vie · 03:30',    name:'PMI manufacturero',         imp:2, real:'50.4',  fcst:'50.5',  prev:'50.8'  },
];

function impDots(level) {
  return `<span class="s6-imp l${level}" title="Importancia ${level}/3"><i></i><i></i><i></i></span>`;
}

function legendHtml() {
  return BUCKETS.map(b =>
    `<span class="s6-sw" style="background:${b.color}"></span><span>${b.label}</span>`
  ).join('');
}

function mapSvg() {
  const regions = COUNTRIES.map(c =>
    `<polygon class="s6-country"
              data-cc="${c.code}"
              data-name="${c.name}"
              data-infl="${c.infl}"
              fill="${bucketColor(c.infl)}"
              points="${c.points}"/>`
  ).join('');
  return `
    <svg viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" aria-label="Mapa mundial de la inflación">
      <rect width="1000" height="440" fill="transparent"/>
      ${regions}
    </svg>`;
}

function calendarHtml() {
  return EVENTS.map((e, i) => `
    <div class="mo-cal-card"
         data-idx="${i}"
         data-cc="${e.cc}"
         data-imp="${e.imp}">
      <div class="mo-cal-when">${e.when} ${impDots(e.imp)}</div>
      <div class="mo-cal-name">${e.flag} ${e.name}</div>
      <div class="mo-cal-foot">
        <span>Real ${e.real}</span>
        <span>Prev. ${e.fcst}</span>
        <span>Ant. ${e.prev}</span>
      </div>
    </div>`).join('');
}

function countryFilterOptions() {
  const codes = [...new Set(EVENTS.map(e => e.cc))].sort();
  return ['<option value="">Todos</option>']
    .concat(codes.map(c => {
      const ev = EVENTS.find(x => x.cc === c);
      return `<option value="${c}">${ev.flag} ${c}</option>`;
    }))
    .join('');
}

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-section6', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  container.innerHTML = `
<section class="mo-section s6-wrap">
  <h2 class="mo-section-title">Economía</h2>

  <h3 class="mo-sub-title">Mapa mundial de la inflación</h3>
  <div class="mo-map-card">
    <div class="s6-map" data-role="map">
      ${mapSvg()}
      <div class="s6-map-legend">${legendHtml()}</div>
      <div class="s6-tooltip" data-role="tip"></div>
    </div>
  </div>
  <a class="mo-link" href="#">Ver más tendencias mundiales ›</a>

  <h3 class="mo-sub-title">Calendario económico</h3>
  <div class="s6-filters">
    <label for="s6-f-country">País</label>
    <select id="s6-f-country" data-role="f-country">${countryFilterOptions()}</select>
    <label for="s6-f-imp">Importancia</label>
    <select id="s6-f-imp" data-role="f-imp">
      <option value="0">Todas</option>
      <option value="1">≥ Baja</option>
      <option value="2">≥ Media</option>
      <option value="3">Alta</option>
    </select>
    <span class="s6-count" data-role="count"></span>
  </div>
  <div class="mo-cal-row" data-role="cal">${calendarHtml()}</div>
  <a class="mo-link" href="#">Ver todos los eventos del mercado ›</a>
</section>`;

  // ---- Wire up interactivity ----
  const root      = container;
  const mapEl     = root.querySelector('[data-role="map"]');
  const tipEl     = root.querySelector('[data-role="tip"]');
  const calEl     = root.querySelector('[data-role="cal"]');
  const fCountry  = root.querySelector('[data-role="f-country"]');
  const fImp      = root.querySelector('[data-role="f-imp"]');
  const countEl   = root.querySelector('[data-role="count"]');
  const regions   = root.querySelectorAll('.s6-country');
  const cards     = () => calEl.querySelectorAll('.mo-cal-card');

  let activeCC = null;

  function applyFilters() {
    const cc  = fCountry.value;
    const imp = Number(fImp.value) || 0;
    let visible = 0;
    cards().forEach(card => {
      const okCC  = !cc  || card.dataset.cc === cc;
      const okImp = !imp || Number(card.dataset.imp) >= imp;
      const show  = okCC && okImp;
      card.classList.toggle('s6-hidden', !show);
      if (show) visible++;
    });
    countEl.textContent = `${visible} de ${EVENTS.length} eventos`;
  }

  function highlightForCountry(cc) {
    activeCC = (activeCC === cc) ? null : cc;
    regions.forEach(r => r.classList.toggle('is-active', activeCC && r.dataset.cc === activeCC));
    cards().forEach(card => {
      const match = activeCC && card.dataset.cc === activeCC;
      card.classList.toggle('s6-related', !!match);
    });
    ctx.onCountrySelect?.(activeCC);
  }

  function onRegionEnter(e) {
    const r = e.currentTarget;
    const name = r.dataset.name;
    const infl = r.dataset.infl;
    tipEl.innerHTML = `<b>${name}</b><span>Inflación ${infl}%</span>`;
    tipEl.classList.add('is-on');
    positionTip(e);
  }
  function onRegionMove(e) { positionTip(e); }
  function onRegionLeave() { tipEl.classList.remove('is-on'); }
  function positionTip(e) {
    const rect = mapEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    tipEl.style.left = `${x}px`;
    tipEl.style.top  = `${y}px`;
  }
  function onRegionClick(e) {
    highlightForCountry(e.currentTarget.dataset.cc);
  }

  regions.forEach(r => {
    r.addEventListener('mouseenter', onRegionEnter);
    r.addEventListener('mousemove',  onRegionMove);
    r.addEventListener('mouseleave', onRegionLeave);
    r.addEventListener('click',      onRegionClick);
  });
  fCountry.addEventListener('change', applyFilters);
  fImp.addEventListener('change',     applyFilters);

  applyFilters();

  return {
    destroy() {
      regions.forEach(r => {
        r.removeEventListener('mouseenter', onRegionEnter);
        r.removeEventListener('mousemove',  onRegionMove);
        r.removeEventListener('mouseleave', onRegionLeave);
        r.removeEventListener('click',      onRegionClick);
      });
      fCountry.removeEventListener('change', applyFilters);
      fImp.removeEventListener('change',     applyFilters);
      container.innerHTML = '';
    }
  };
}

export default { render };
