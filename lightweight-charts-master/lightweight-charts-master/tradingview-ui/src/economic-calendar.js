// economic-calendar.js — TradingView-style Economic Calendar full page widget
//
// Public API:
//   createEconomicCalendar(container, opts = {}) -> { render(), destroy() }
//
// Self-contained: synthetic data, inline CSS, mini lightweight-chart for history.

import { createChart, LineSeries } from 'lightweight-charts';
import { ensurePolishStyles, emptyStateHTML } from './ui-polish.js';

// ---------------------------------------------------------------------------
// One-time CSS injection (TradingView dark palette)
// ---------------------------------------------------------------------------
let _ecStylesInjected = false;
function ensureStyles() {
  if (_ecStylesInjected) return;
  _ecStylesInjected = true;
  const css = `
.ec-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #d1d4dc;
  background: #0f0f0f;
  padding: 14px 18px;
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
}
.ec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
}
.ec-title {
  font-size: 18px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0;
  letter-spacing: 0.2px;
}
.ec-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ec-btn {
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: background 80ms ease, border-color 80ms ease;
}
.ec-btn:hover { background: #2a2e39; border-color: #363a45; }
.ec-btn.ec-btn-primary { background: #2962ff; border-color: #2962ff; color: #fff; }
.ec-btn.ec-btn-primary:hover { background: #1e53e5; }

.ec-filters {
  background: #131722;
  border: 1px solid #1e222d;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.ec-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ec-filter-label {
  color: #787b86;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  width: 90px;
  flex-shrink: 0;
}
.ec-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #1e222d;
  color: #b2b5be;
  border: 1px solid #2a2e39;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  transition: all 80ms ease;
}
.ec-chip:hover { border-color: #4a4e59; color: #d1d4dc; }
.ec-chip.ec-active {
  background: #2962ff;
  border-color: #2962ff;
  color: #fff;
}
.ec-chip-imp.ec-imp-h.ec-active { background: #f23645; border-color: #f23645; }
.ec-chip-imp.ec-imp-m.ec-active { background: #ff9800; border-color: #ff9800; }
.ec-chip-imp.ec-imp-l.ec-active { background: #4caf50; border-color: #4caf50; }
.ec-pill {
  background: transparent;
  color: #b2b5be;
  border: 1px solid #2a2e39;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.ec-pill.ec-active { background: #2962ff; color: #fff; border-color: #2962ff; }
.ec-select, .ec-input {
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 4px;
  font-family: inherit;
  outline: none;
}
.ec-input { min-width: 220px; }
.ec-input:focus, .ec-select:focus { border-color: #2962ff; }

.ec-table-wrap {
  background: #131722;
  border: 1px solid #1e222d;
  border-radius: 6px;
  overflow: hidden;
}
.ec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ec-table thead th {
  background: #1e222d;
  color: #787b86;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 9px 10px;
  text-align: left;
  border-bottom: 1px solid #2a2e39;
  position: sticky;
  top: 0;
  z-index: 2;
}
.ec-table tbody td {
  padding: 10px;
  border-bottom: 1px solid #1a1d27;
  color: #d1d4dc;
  font-variant-numeric: tabular-nums;
  vertical-align: middle;
}
.ec-table tbody tr { cursor: pointer; transition: background 60ms ease; }
.ec-table tbody tr:hover { background: #1a1d27; }
.ec-table tbody tr.ec-selected { background: #1e2638; }
.ec-table tbody tr.ec-today td { background: rgba(41, 98, 255, 0.07); }
.ec-table tbody tr.ec-today.ec-selected td { background: #1e2638; }
.ec-table tbody tr.ec-past td { opacity: 0.55; }
.ec-table tbody tr.ec-next-event td { box-shadow: inset 3px 0 0 #2962ff; }

.ec-day {
  color: #787b86;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.ec-time { color: #b2b5be; font-weight: 500; }
.ec-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ec-flag-circle {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #2a2e39;
  color: #d1d4dc;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ec-event-name { color: #d1d4dc; }
.ec-imp-dots { display: inline-flex; gap: 2px; }
.ec-imp-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #2a2e39;
}
.ec-imp-dot.on { background: #f23645; }
.ec-num { font-variant-numeric: tabular-nums; }
.ec-num.ec-pending { color: #555 }
.ec-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  min-width: 38px;
  text-align: center;
}
.ec-badge.ec-pos { background: rgba(38,166,154,0.16); color: #26a69a; }
.ec-badge.ec-neg { background: rgba(239,83,80,0.16); color: #ef5350; }
.ec-badge.ec-neu { background: rgba(120,123,134,0.16); color: #b2b5be; }

.ec-detail {
  margin-top: 14px;
  background: #131722;
  border: 1px solid #1e222d;
  border-radius: 6px;
  padding: 14px;
  display: none;
}
.ec-detail.ec-open { display: block; }
.ec-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  gap: 10px;
}
.ec-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #d1d4dc;
  margin: 0;
}
.ec-detail-sub {
  font-size: 11px;
  color: #787b86;
  margin-top: 2px;
}
.ec-detail-close {
  background: transparent;
  border: none;
  color: #787b86;
  font-size: 18px;
  cursor: pointer;
  padding: 0 6px;
  line-height: 1;
}
.ec-detail-close:hover { color: #d1d4dc; }
.ec-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 10px;
}
.ec-detail-panel {
  background: #0f0f0f;
  border: 1px solid #1e222d;
  border-radius: 4px;
  padding: 10px;
}
.ec-detail-panel h4 {
  margin: 0 0 8px 0;
  font-size: 11px;
  text-transform: uppercase;
  color: #787b86;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.ec-desc { font-size: 12px; line-height: 1.55; color: #b2b5be; }
.ec-mini-chart { width: 100%; height: 160px; }
.ec-impact-list { list-style: none; margin: 0; padding: 0; font-size: 12px; }
.ec-impact-list li {
  display: flex; justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #1a1d27;
}
.ec-impact-list li:last-child { border-bottom: none; }
.ec-impact-pair { color: #d1d4dc; font-weight: 500; }

.ec-empty {
  padding: 40px;
  text-align: center;
  color: #787b86;
  font-size: 13px;
}
`;
  const style = document.createElement('style');
  style.setAttribute('data-ec-styles', '');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------
const COUNTRIES = [
  { code: 'US', name: 'EE.UU.',     flag: '🇺🇸', currency: 'USD' },
  { code: 'EU', name: 'Eurozona',   flag: '🇪🇺', currency: 'EUR' },
  { code: 'UK', name: 'Reino Unido',flag: '🇬🇧', currency: 'GBP' },
  { code: 'JP', name: 'Japón',      flag: '🇯🇵', currency: 'JPY' },
  { code: 'CN', name: 'China',      flag: '🇨🇳', currency: 'CNY' },
  { code: 'CA', name: 'Canadá',     flag: '🇨🇦', currency: 'CAD' },
  { code: 'AU', name: 'Australia',  flag: '🇦🇺', currency: 'AUD' },
  { code: 'CH', name: 'Suiza',      flag: '🇨🇭', currency: 'CHF' },
  { code: 'ES', name: 'España',     flag: '🇪🇸', currency: 'EUR' },
  { code: 'DE', name: 'Alemania',   flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'Francia',    flag: '🇫🇷', currency: 'EUR' },
  { code: 'IT', name: 'Italia',     flag: '🇮🇹', currency: 'EUR' },
];
const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

const CATEGORIES = ['Inflación', 'Empleo', 'PIB', 'Tipos', 'Sentimiento', 'Comercio', 'Industria'];

// Event templates: name, category, importance(1-3), unit, baseValue, volatility, descripción
const EVENT_TEMPLATES = [
  { name: 'IPC (interanual)',           cat: 'Inflación',   imp: 3, unit: '%',   base: 3.2,  vol: 0.4, desc: 'Variación del Índice de Precios al Consumo respecto al mismo mes del año anterior. Principal medida de inflación seguida por bancos centrales.' },
  { name: 'IPC subyacente',             cat: 'Inflación',   imp: 3, unit: '%',   base: 3.5,  vol: 0.3, desc: 'IPC excluyendo energía y alimentos. Muestra la tendencia inflacionaria de fondo.' },
  { name: 'IPP',                        cat: 'Inflación',   imp: 2, unit: '%',   base: 2.1,  vol: 0.5, desc: 'Índice de Precios al Productor. Mide la inflación a nivel mayorista y suele anticipar el IPC.' },
  { name: 'PCE subyacente (m/m)',       cat: 'Inflación',   imp: 3, unit: '%',   base: 0.3,  vol: 0.15,desc: 'Medida de inflación favorita de la Fed.' },
  { name: 'Nóminas no agrícolas (NFP)', cat: 'Empleo',      imp: 3, unit: 'K',   base: 180,  vol: 75,  desc: 'Cambio mensual en el empleo no agrícola en EE.UU. El indicador laboral más seguido del mercado.' },
  { name: 'Tasa de desempleo',          cat: 'Empleo',      imp: 3, unit: '%',   base: 3.9,  vol: 0.2, desc: 'Porcentaje de la fuerza laboral desempleada.' },
  { name: 'Peticiones desempleo',       cat: 'Empleo',      imp: 2, unit: 'K',   base: 220,  vol: 18,  desc: 'Solicitudes iniciales semanales de subsidio por desempleo.' },
  { name: 'Salarios medios (m/m)',      cat: 'Empleo',      imp: 2, unit: '%',   base: 0.3,  vol: 0.15,desc: 'Variación mensual de los salarios por hora.' },
  { name: 'PIB (trimestral)',           cat: 'PIB',         imp: 3, unit: '%',   base: 2.1,  vol: 0.8, desc: 'Producto Interior Bruto trimestral anualizado.' },
  { name: 'PIB (interanual)',           cat: 'PIB',         imp: 3, unit: '%',   base: 1.8,  vol: 0.6, desc: 'PIB respecto al mismo trimestre del año anterior.' },
  { name: 'Decisión de tipos (Fed)',    cat: 'Tipos',       imp: 3, unit: '%',   base: 5.25, vol: 0.1, desc: 'Decisión del FOMC sobre el tipo de interés de referencia.' },
  { name: 'Decisión de tipos (BCE)',    cat: 'Tipos',       imp: 3, unit: '%',   base: 4.0,  vol: 0.1, desc: 'Decisión de tipos del Banco Central Europeo.' },
  { name: 'Decisión de tipos (BoE)',    cat: 'Tipos',       imp: 3, unit: '%',   base: 5.0,  vol: 0.1, desc: 'Decisión del Banco de Inglaterra.' },
  { name: 'Decisión de tipos (BoJ)',    cat: 'Tipos',       imp: 3, unit: '%',   base: 0.25, vol: 0.05,desc: 'Decisión de política monetaria del Banco de Japón.' },
  { name: 'Actas de la Fed',            cat: 'Tipos',       imp: 2, unit: '',    base: 0,    vol: 0,   desc: 'Publicación de las actas de la última reunión del FOMC.' },
  { name: 'PMI manufacturero',          cat: 'Sentimiento', imp: 2, unit: '',    base: 50.5, vol: 1.8, desc: 'Índice de Gestores de Compras del sector manufacturero. >50 expansión, <50 contracción.' },
  { name: 'PMI servicios',              cat: 'Sentimiento', imp: 2, unit: '',    base: 52.0, vol: 1.5, desc: 'Índice de Gestores de Compras del sector servicios.' },
  { name: 'ISM manufacturero',          cat: 'Sentimiento', imp: 2, unit: '',    base: 48.5, vol: 2.0, desc: 'Indicador adelantado del sector industrial en EE.UU.' },
  { name: 'Confianza del consumidor',   cat: 'Sentimiento', imp: 2, unit: '',    base: 104,  vol: 5,   desc: 'Confianza de los consumidores medida por The Conference Board.' },
  { name: 'IFO clima empresarial',      cat: 'Sentimiento', imp: 2, unit: '',    base: 86.5, vol: 2.0, desc: 'Indicador alemán de confianza empresarial.' },
  { name: 'Ventas minoristas (m/m)',    cat: 'Comercio',    imp: 2, unit: '%',   base: 0.4,  vol: 0.6, desc: 'Variación mensual de las ventas del sector minorista.' },
  { name: 'Balanza comercial',          cat: 'Comercio',    imp: 2, unit: 'B',   base: -65,  vol: 8,   desc: 'Diferencia entre exportaciones e importaciones en miles de millones.' },
  { name: 'Producción industrial',      cat: 'Industria',   imp: 2, unit: '%',   base: 0.3,  vol: 0.5, desc: 'Variación mensual de la producción industrial.' },
  { name: 'Pedidos fábrica',            cat: 'Industria',   imp: 1, unit: '%',   base: 0.5,  vol: 1.0, desc: 'Pedidos a las fábricas.' },
  { name: 'Utilización capacidad',      cat: 'Industria',   imp: 1, unit: '%',   base: 78.3, vol: 0.6, desc: 'Porcentaje de capacidad productiva utilizada.' },
];

// Country-event eligibility map (which countries publish each)
const COUNTRY_EVENT_ELIGIBLE = {
  'Decisión de tipos (Fed)': ['US'],
  'Decisión de tipos (BCE)': ['EU'],
  'Decisión de tipos (BoE)': ['UK'],
  'Decisión de tipos (BoJ)': ['JP'],
  'Actas de la Fed': ['US'],
  'Nóminas no agrícolas (NFP)': ['US'],
  'PCE subyacente (m/m)': ['US'],
  'ISM manufacturero': ['US'],
  'IFO clima empresarial': ['DE'],
};

const PERIODS = [
  { id: 'today',    label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'thisWeek', label: 'Esta semana' },
  { id: 'nextWeek', label: 'Próxima semana' },
  { id: 'thisMonth',label: 'Este mes' },
];

// ---------------------------------------------------------------------------
// Synthetic data generation
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateEvents(count = 100, daysAhead = 30, seed = 20260525) {
  const rnd = mulberry32(seed);
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // 30 days window: cover 7 days back + ~23 forward for "past + upcoming"
  const events = [];
  for (let i = 0; i < count; i++) {
    const tpl = EVENT_TEMPLATES[Math.floor(rnd() * EVENT_TEMPLATES.length)];
    const eligible = COUNTRY_EVENT_ELIGIBLE[tpl.name];
    let country;
    if (eligible) {
      country = eligible[Math.floor(rnd() * eligible.length)];
    } else {
      country = COUNTRIES[Math.floor(rnd() * COUNTRIES.length)].code;
    }
    const dayOffset = Math.floor(rnd() * daysAhead) - 7; // -7..+22
    const hour = 7 + Math.floor(rnd() * 12); // 07..18
    const minute = [0, 15, 30, 45][Math.floor(rnd() * 4)];
    const dt = new Date(startDay);
    dt.setDate(dt.getDate() + dayOffset);
    dt.setHours(hour, minute, 0, 0);

    const previous = +(tpl.base + (rnd() - 0.5) * tpl.vol * 2).toFixed(2);
    const forecast = +(previous + (rnd() - 0.5) * tpl.vol).toFixed(2);
    // Real only set if event in past (or today before now)
    let real = null;
    if (dt.getTime() < now.getTime()) {
      real = +(forecast + (rnd() - 0.5) * tpl.vol * 1.4).toFixed(2);
    }

    // History: 12 prior occurrences
    const history = [];
    for (let h = 11; h >= 0; h--) {
      const hDt = new Date(dt);
      hDt.setMonth(hDt.getMonth() - (h + 1));
      const val = +(tpl.base + (rnd() - 0.5) * tpl.vol * 2.2).toFixed(2);
      history.push({ time: Math.floor(hDt.getTime() / 1000), value: val });
    }
    history.sort((a, b) => a.time - b.time);

    events.push({
      id: `ev_${i}`,
      datetime: dt,
      country,
      name: tpl.name,
      category: tpl.cat,
      importance: tpl.imp,
      unit: tpl.unit,
      previous,
      forecast,
      real,
      desc: tpl.desc,
      history,
    });
  }
  events.sort((a, b) => a.datetime - b.datetime);
  return events;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d) {
  // Monday start
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}
function periodRange(periodId, now = new Date()) {
  const today = startOfDay(now);
  switch (periodId) {
    case 'today':     return [today, addDays(today, 1)];
    case 'tomorrow':  return [addDays(today, 1), addDays(today, 2)];
    case 'thisWeek': { const s = startOfWeek(today); return [s, addDays(s, 7)]; }
    case 'nextWeek': { const s = addDays(startOfWeek(today), 7); return [s, addDays(s, 7)]; }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return [s, e];
    }
    default: return [addDays(today, -7), addDays(today, 30)];
  }
}
function fmtDay(d) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]}`;
}
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtNum(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (unit === '') return v.toFixed(1);
  if (unit === 'K') return v.toFixed(0) + 'K';
  if (unit === 'B') return (v >= 0 ? '+' : '') + v.toFixed(1) + 'B';
  if (unit === '%') return v.toFixed(2) + '%';
  return v.toString();
}

// Impact: green if real beats forecast (better economy generally => green)
// For unemployment & jobless claims lower-is-better; treat by name hint.
function computeImpact(ev) {
  if (ev.real === null || ev.forecast === null) return null;
  const diff = ev.real - ev.forecast;
  const lowerBetter = /desempleo|peticiones/i.test(ev.name);
  const positive = lowerBetter ? diff < 0 : diff > 0;
  if (Math.abs(diff) < 1e-6) return { label: 'IGUAL', cls: 'ec-neu', diff };
  return positive
    ? { label: (lowerBetter ? '' : '+') + diff.toFixed(2), cls: 'ec-pos', diff }
    : { label: diff.toFixed(2), cls: 'ec-neg', diff };
}

// ---------------------------------------------------------------------------
// Main exported factory
// ---------------------------------------------------------------------------
export function createEconomicCalendar(container, opts = {}) {
  if (!container) throw new Error('createEconomicCalendar: container required');
  ensureStyles();
  ensurePolishStyles();

  const eventCount = opts.eventCount || 100;
  const daysAhead  = opts.daysAhead  || 30;
  const seed       = opts.seed       || 20260525;

  const events = generateEvents(eventCount, daysAhead, seed);

  // Filter state
  const state = {
    countries: new Set(),                     // empty == all
    importance: new Set([3, 2, 1]),           // 3=Alta,2=Media,1=Baja
    category: 'all',
    period: 'thisWeek',
    search: '',
    selectedId: null,
  };

  // Build DOM skeleton
  const root = document.createElement('div');
  root.className = 'ec-root';
  root.innerHTML = `
    <div class="ec-header">
      <h2 class="ec-title">Calendario económico</h2>
      <div class="ec-actions">
        <input type="text" class="ec-input" placeholder="Buscar evento..." data-el="search" />
        <button class="ec-btn" data-el="csv">Exportar CSV</button>
      </div>
    </div>
    <div class="ec-filters">
      <div class="ec-filter-row" data-el="countries-row">
        <div class="ec-filter-label">Países</div>
      </div>
      <div class="ec-filter-row" data-el="importance-row">
        <div class="ec-filter-label">Importancia</div>
      </div>
      <div class="ec-filter-row">
        <div class="ec-filter-label">Categoría</div>
        <select class="ec-select" data-el="category">
          <option value="all">Todas</option>
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="ec-filter-row" data-el="period-row">
        <div class="ec-filter-label">Periodo</div>
      </div>
    </div>
    <div class="ec-table-wrap">
      <table class="ec-table">
        <thead>
          <tr>
            <th style="width:90px">Día</th>
            <th style="width:60px">Hora</th>
            <th style="width:120px">País</th>
            <th>Evento</th>
            <th style="width:80px">Importancia</th>
            <th style="width:80px;text-align:right">Real</th>
            <th style="width:80px;text-align:right">Previsión</th>
            <th style="width:80px;text-align:right">Anterior</th>
            <th style="width:80px;text-align:center">Impacto</th>
          </tr>
        </thead>
        <tbody data-el="tbody"></tbody>
      </table>
    </div>
    <div class="ec-detail" data-el="detail"></div>
  `;
  container.innerHTML = '';
  container.appendChild(root);

  // Mount filter chips/pills
  const countriesRow = root.querySelector('[data-el="countries-row"]');
  COUNTRIES.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'ec-chip';
    chip.dataset.country = c.code;
    chip.innerHTML = `<span>${c.flag}</span><span>${c.code}</span>`;
    chip.addEventListener('click', () => {
      if (state.countries.has(c.code)) state.countries.delete(c.code);
      else state.countries.add(c.code);
      chip.classList.toggle('ec-active', state.countries.has(c.code));
      renderTable();
    });
    countriesRow.appendChild(chip);
  });

  const impRow = root.querySelector('[data-el="importance-row"]');
  const impDefs = [
    { lvl: 3, label: 'Alta',  cls: 'ec-imp-h' },
    { lvl: 2, label: 'Media', cls: 'ec-imp-m' },
    { lvl: 1, label: 'Baja',  cls: 'ec-imp-l' },
  ];
  impDefs.forEach(d => {
    const chip = document.createElement('button');
    chip.className = `ec-chip ec-chip-imp ${d.cls} ec-active`;
    chip.textContent = d.label;
    chip.addEventListener('click', () => {
      if (state.importance.has(d.lvl)) state.importance.delete(d.lvl);
      else state.importance.add(d.lvl);
      chip.classList.toggle('ec-active', state.importance.has(d.lvl));
      renderTable();
    });
    impRow.appendChild(chip);
  });

  const periodRow = root.querySelector('[data-el="period-row"]');
  PERIODS.forEach(p => {
    const pill = document.createElement('button');
    pill.className = 'ec-pill' + (p.id === state.period ? ' ec-active' : '');
    pill.textContent = p.label;
    pill.dataset.period = p.id;
    pill.addEventListener('click', () => {
      state.period = p.id;
      periodRow.querySelectorAll('.ec-pill').forEach(el => el.classList.toggle('ec-active', el.dataset.period === p.id));
      renderTable();
    });
    periodRow.appendChild(pill);
  });

  const searchEl = root.querySelector('[data-el="search"]');
  searchEl.addEventListener('input', () => {
    state.search = searchEl.value.trim().toLowerCase();
    renderTable();
  });
  const catEl = root.querySelector('[data-el="category"]');
  catEl.addEventListener('change', () => {
    state.category = catEl.value;
    renderTable();
  });
  root.querySelector('[data-el="csv"]').addEventListener('click', () => exportCsv(getFiltered()));

  const tbody  = root.querySelector('[data-el="tbody"]');
  const detail = root.querySelector('[data-el="detail"]');

  // mini chart bookkeeping
  let miniChart = null;
  let miniRO    = null;
  function disposeMini() {
    if (miniRO) { try { miniRO.disconnect(); } catch(_) {} miniRO = null; }
    if (miniChart) { try { miniChart.remove(); } catch(_) {} miniChart = null; }
  }

  function getFiltered() {
    const [from, to] = periodRange(state.period);
    return events.filter(e => {
      if (e.datetime < from || e.datetime >= to) return false;
      if (state.countries.size && !state.countries.has(e.country)) return false;
      if (!state.importance.has(e.importance)) return false;
      if (state.category !== 'all' && e.category !== state.category) return false;
      if (state.search && !e.name.toLowerCase().includes(state.search)) return false;
      return true;
    });
  }

  function renderRow(ev, isToday, isPast, isNext) {
    const c = COUNTRY_MAP[ev.country];
    const impact = computeImpact(ev);
    const impactCell = impact
      ? `<span class="ec-badge ${impact.cls}">${impact.label}</span>`
      : `<span class="ec-num ec-pending">—</span>`;
    const dots = [1,2,3].map(i =>
      `<span class="ec-imp-dot${i <= ev.importance ? ' on' : ''}"></span>`
    ).join('');
    const cls = [
      isToday ? 'ec-today' : '',
      isPast  ? 'ec-past'  : '',
      isNext  ? 'ec-next-event' : '',
      ev.id === state.selectedId ? 'ec-selected' : '',
    ].filter(Boolean).join(' ');
    return `
      <tr class="${cls}" data-id="${ev.id}">
        <td><span class="ec-day">${fmtDay(ev.datetime)}</span></td>
        <td><span class="ec-time">${fmtTime(ev.datetime)}</span></td>
        <td>
          <span class="ec-flag">
            <span class="ec-flag-circle" title="${c.name}">${c.code}</span>
            <span>${c.flag}</span>
          </span>
        </td>
        <td><span class="ec-event-name">${escapeHtml(ev.name)}</span>
            <span style="color:#5a5e69;margin-left:6px;font-size:11px">· ${ev.category}</span></td>
        <td><span class="ec-imp-dots">${dots}</span></td>
        <td style="text-align:right" class="ec-num">${fmtNum(ev.real, ev.unit)}</td>
        <td style="text-align:right" class="ec-num">${fmtNum(ev.forecast, ev.unit)}</td>
        <td style="text-align:right" class="ec-num">${fmtNum(ev.previous, ev.unit)}</td>
        <td style="text-align:center">${impactCell}</td>
      </tr>
    `;
  }

  function renderTable() {
    const filtered = getFiltered();
    const now = new Date();

    // identify next upcoming event id
    let nextId = null;
    for (const ev of filtered) {
      if (ev.datetime >= now) { nextId = ev.id; break; }
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="ec-empty">${emptyStateHTML('No hay eventos disponibles', 'Ajusta filtros de país, importancia o fecha para ver más eventos.', '📅')}</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(ev => {
      const isToday = sameDay(ev.datetime, now);
      const isPast  = ev.datetime < now && !isToday;
      const isNext  = ev.id === nextId;
      return renderRow(ev, isToday, isPast, isNext);
    }).join('');

    // Row click
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const ev = events.find(e => e.id === tr.dataset.id);
        if (ev) selectEvent(ev);
      });
    });

    // Auto-scroll to next event
    if (nextId) {
      const tr = tbody.querySelector(`tr[data-id="${nextId}"]`);
      if (tr) {
        // Scroll within container without yanking page
        const rect = tr.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const offset = rect.top - rootRect.top + root.scrollTop - 120;
        try { root.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' }); } catch(_) { root.scrollTop = offset; }
      }
    }
  }

  function selectEvent(ev) {
    state.selectedId = ev.id;
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.classList.toggle('ec-selected', tr.dataset.id === ev.id);
    });
    renderDetail(ev);
  }

  function renderDetail(ev) {
    disposeMini();
    const c = COUNTRY_MAP[ev.country];
    const impact = computeImpact(ev);
    detail.classList.add('ec-open');
    detail.innerHTML = `
      <div class="ec-detail-head">
        <div>
          <h3 class="ec-detail-title">${c.flag} ${escapeHtml(ev.name)}</h3>
          <div class="ec-detail-sub">${c.name} · ${ev.category} · ${fmtDay(ev.datetime)} ${fmtTime(ev.datetime)}</div>
        </div>
        <button class="ec-detail-close" data-el="close" title="Cerrar">×</button>
      </div>
      <div class="ec-detail-grid">
        <div class="ec-detail-panel">
          <h4>Descripción</h4>
          <div class="ec-desc">${escapeHtml(ev.desc)}</div>
          <h4 style="margin-top:14px">Valores</h4>
          <ul class="ec-impact-list">
            <li><span>Anterior</span><span class="ec-num">${fmtNum(ev.previous, ev.unit)}</span></li>
            <li><span>Previsión</span><span class="ec-num">${fmtNum(ev.forecast, ev.unit)}</span></li>
            <li><span>Real</span><span class="ec-num">${fmtNum(ev.real, ev.unit)}</span></li>
            <li><span>Sorpresa</span><span>${impact ? `<span class="ec-badge ${impact.cls}">${impact.label}</span>` : '—'}</span></li>
          </ul>
        </div>
        <div class="ec-detail-panel">
          <h4>Histórico (últimas 12 publicaciones)</h4>
          <div class="ec-mini-chart" data-el="mini"></div>
          <h4 style="margin-top:10px">Impacto en pares principales</h4>
          <ul class="ec-impact-list" data-el="impact"></ul>
        </div>
      </div>
    `;

    detail.querySelector('[data-el="close"]').addEventListener('click', () => {
      detail.classList.remove('ec-open');
      state.selectedId = null;
      tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('ec-selected'));
      disposeMini();
    });

    // Mini chart
    const miniHost = detail.querySelector('[data-el="mini"]');
    try {
      miniChart = createChart(miniHost, {
        width:  miniHost.clientWidth || 400,
        height: 160,
        layout: { background: { color: '#0f0f0f' }, textColor: '#787b86', fontSize: 10 },
        grid:   { vertLines: { color: '#1a1d27' }, horzLines: { color: '#1a1d27' } },
        timeScale: { borderColor: '#1e222d', timeVisible: false },
        rightPriceScale: { borderColor: '#1e222d' },
        handleScroll: false,
        handleScale: false,
      });
      const series = miniChart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2 });
      series.setData(ev.history);
      miniChart.timeScale().fitContent();
      if (typeof ResizeObserver !== 'undefined') {
        miniRO = new ResizeObserver(() => {
          if (miniChart && miniHost.clientWidth) {
            miniChart.applyOptions({ width: miniHost.clientWidth });
          }
        });
        miniRO.observe(miniHost);
      }
    } catch (err) {
      miniHost.innerHTML = `<div style="color:#787b86;font-size:11px;padding:10px">No se pudo cargar el gráfico: ${escapeHtml(String(err.message || err))}</div>`;
    }

    // Impact on majors — synthetic, deterministic from event
    const impactList = detail.querySelector('[data-el="impact"]');
    const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'XAU/USD'];
    const magnitude = impact ? Math.min(0.9, Math.abs(impact.diff) * 0.18 + 0.05) : 0;
    const sign = impact ? (impact.cls === 'ec-pos' ? 1 : impact.cls === 'ec-neg' ? -1 : 0) : 0;
    // Currency-aware sign for the event country
    const ccy = c.currency;
    impactList.innerHTML = pairs.map((p, idx) => {
      const base = p.split('/')[0], quote = p.split('/')[1];
      let dir = 0;
      if (sign !== 0) {
        if (base === ccy) dir = sign;
        else if (quote === ccy) dir = -sign;
        else dir = (idx % 2 === 0 ? 1 : -1) * sign * 0.35;
      }
      const pct = (dir * magnitude * (0.6 + 0.4 * ((idx + 1) / pairs.length))).toFixed(2);
      const cls = parseFloat(pct) > 0 ? 'ec-pos' : parseFloat(pct) < 0 ? 'ec-neg' : 'ec-neu';
      const lbl = (parseFloat(pct) > 0 ? '+' : '') + pct + '%';
      return `<li><span class="ec-impact-pair">${p}</span><span class="ec-badge ${cls}">${lbl}</span></li>`;
    }).join('');
  }

  function exportCsv(rows) {
    const header = ['Fecha','Hora','Pais','Evento','Categoria','Importancia','Real','Prevision','Anterior','Unidad'];
    const lines = [header.join(',')];
    rows.forEach(ev => {
      const c = COUNTRY_MAP[ev.country];
      const cells = [
        fmtDay(ev.datetime),
        fmtTime(ev.datetime),
        c.code,
        `"${ev.name.replace(/"/g, '""')}"`,
        ev.category,
        ev.importance,
        ev.real ?? '',
        ev.forecast ?? '',
        ev.previous ?? '',
        ev.unit || '',
      ];
      lines.push(cells.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `economic-calendar-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function render() {
    renderTable();
  }

  function destroy() {
    disposeMini();
    container.innerHTML = '';
  }

  // Initial render
  render();

  return { render, destroy };
}

export default createEconomicCalendar;
