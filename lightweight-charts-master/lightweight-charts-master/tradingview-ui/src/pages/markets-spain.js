// /markets/world/spain — Agent C (Figma 25:237231). Exporta renderMarketsSpain.
import './markets-spain.css';

// -------------------- Datos derivados de Figma --------------------
// Verbatim from Figma 25:233037 (Principales índices). 11 indices total.
const INDICES = [
  { id: 'IBEX 35',                       short: '35', price: '18.380,90', unit: 'POINT', delta: '−0,04%', neg: true,  active: true, bg: '#2962ff' },
  { id: 'Latibex All Share',             short: 'X',  price: '2.789,40',  unit: 'POINT', delta: '−1,07%', neg: true,  bg: '#2962ff' },
  { id: 'IBEX Medium Cap',               short: 'X',  price: '19.072,60', unit: 'POINT', delta: '−0,35%', neg: true,  bg: '#2962ff' },
  { id: 'IBEX Small Cap',                short: 'X',  price: '11.009,30', unit: 'POINT', delta: '−0,12%', neg: true,  bg: '#2962ff' },
  { id: 'VIBEX',                         short: 'V',  price: '22,00',     unit: 'POINT', delta: '+0,46%', neg: false, bg: '#2962ff' },
  { id: 'IGBM',                          short: 'X',  price: '1.814,10',  unit: 'POINT', delta: '+0,02%', neg: false, bg: '#2962ff' },
  { id: 'IBEX 35 Construcción',          short: '35', price: '4.388,70',  unit: 'POINT', delta: '−0,30%', neg: true,  bg: '#2962ff' },
  { id: 'IBEX 35 Bancos',                short: '35', price: '1.846,70',  unit: 'POINT', delta: '−0,29%', neg: true,  bg: '#2962ff' },
  { id: 'IBEX 35 Energía',               short: '35', price: '2.210,60',  unit: 'POINT', delta: '+1,01%', neg: false, bg: '#2962ff' },
  { id: 'IGBM Servicios Financieros',    short: 'X',  price: '1.476,60',  unit: 'POINT', delta: '−0,30%', neg: true,  bg: '#2962ff' },
  { id: 'IGBM Petróleo y Energía',       short: 'X',  price: '2.855,10',  unit: 'POINT', delta: '+1,33%', neg: false, bg: '#2962ff' },
];

// 10 cards verbatim from Figma 25:233398 (Acciones tendencia).
const TRENDING = [
  { tk: 'SAN', name: 'Banco Santander, S.A.', price: '10,792', unit: 'EUR', delta: '−0,55%', neg: true, bg: '#ec0000' },
  { tk: 'SAB', name: 'Banco de Sabadell SA', price: '3,497', unit: 'EUR', delta: '+0,34%', neg: false, bg: '#eaf0f7', fg: '#0067ac' },
  { tk: 'IBE', name: 'Iberdrola SA', price: '20,070', unit: 'EUR', delta: '+1,72%', neg: false, bg: '#08361a' },
  { tk: 'BBVA', name: 'Banco Bilbao Vizcaya Argentaria, S.A.', price: '20,08', unit: 'EUR', delta: '−0,05%', neg: true, bg: '#072f5f' },
  { tk: 'IDR', name: 'Indra Sistemas, S.A. Class A', price: '53,90', unit: 'EUR', delta: '−0,52%', neg: true, bg: '#ffffff', fg: '#0a4a8f' },
  { tk: 'LOG', name: 'Logista Integral, S.A.', price: '33,68', unit: 'EUR', delta: '+0,48%', neg: false, bg: '#0a5340' },
  { tk: 'OHLA', name: 'Obrascon Huarte Lain SA', price: '0,4920', unit: 'EUR', delta: '+1,53%', neg: false, bg: '#0a3a72' },
  { tk: 'AMP', name: 'Amper, S.A.', price: '0,1988', unit: 'EUR', delta: '+0,20%', neg: false, bg: '#1c3a5b' },
  { tk: 'GRF', name: 'Grifols, S.A. Class A', price: '9,618', unit: 'EUR', delta: '−0,80%', neg: true, bg: '#1e6cc7' },
  { tk: 'ENC', name: 'ENCE Energia y Celulosa SA', price: '2,440', unit: 'EUR', delta: '−1,77%', neg: true, bg: '#0e8a3a' },
];

// Verbatim from Figma 25:233652 (Acciones con el mayor volumen). 6 rows.
const VOLUMEN = [
  { tk: 'SAN', name: 'Banco Santander, S.A.', price: '10,792', delta: '−0,55%', neg: true, bg: '#ec0000' },
  { tk: 'SAB', name: 'Banco de Sabadell SA', price: '3,497', delta: '+0,34%', neg: false, bg: '#eaf0f7', fg: '#0067ac' },
  { tk: 'IBE', name: 'Iberdrola SA', price: '20,070', delta: '+1,72%', neg: false, bg: '#08361a' },
  { tk: 'BBVA', name: 'Banco Bilbao Vizcaya Argentaria, S.A.', price: '20,08', delta: '−0,05%', neg: true, bg: '#072f5f' },
  { tk: 'IDR', name: 'Indra Sistemas, S.A. Class A', price: '53,90', delta: '−0,52%', neg: true, bg: '#ffffff', fg: '#0a4a8f' },
  { tk: 'REP', name: 'Repsol SA', price: '21,91', delta: '+0,74%', neg: false, bg: '#ff7a00' },
];

// Verbatim from Figma 25:233835 (Acciones con mayores variaciones de precio). 6 rows.
const VOLATILES = [
  { tk: 'CLR', name: 'Clerhp Estructuras SA', price: '10,70', delta: '−1,38%', neg: true, bg: '#cfcfcf', fg: '#222' },
  { tk: 'AGIL', name: 'Agile Content SA', price: '2,20', delta: '+7,84%', neg: false, bg: '#00a16d' },
  { tk: 'GGR', name: 'Greening Group Global S.A.', price: '3,26', delta: '+0,31%', neg: false, bg: '#e7f0e4', fg: '#5fb14b' },
  { tk: 'ADZ', name: 'Adolfo Dominguez, S.A.', price: '5,75', delta: '+5,50%', neg: false, bg: '#ffffff', fg: '#222' },
  { tk: 'OHLA', name: 'Obrascon Huarte Lain SA', price: '0,4920', delta: '+1,53%', neg: false, bg: '#0a3a72' },
  { tk: 'CITY', name: 'Club De Futbol Intercity SAD', price: '0,0324', delta: '−2,99%', neg: true, bg: '#1c1c1c', fg: '#e0c46c' },
];

// Verbatim from Figma 25:234021 (Acciones con mayor crecimiento diario). 6 rows.
const GANADORAS = [
  { tk: 'AGIL', name: 'Agile Content SA', price: '2,20', delta: '+7,84%', bg: '#00a16d' },
  { tk: 'ADZ', name: 'Adolfo Dominguez, S.A.', price: '5,75', delta: '+5,50%', bg: '#ffffff', fg: '#222' },
  { tk: 'ETC', name: 'Energy Solar Tech, S.A.', price: '2,19', delta: '+4,29%', bg: '#e2e2e2', fg: '#cc4040' },
  { tk: 'VYT', name: 'Vytrus Biotech SA', price: '16,70', delta: '+3,09%', bg: '#072f5f' },
  { tk: 'LLN', name: 'LleidaNetworks Serveis Telematics SA', price: '1,060', delta: '+2,91%', bg: '#e8d8c4' },
  { tk: 'GIGA', name: 'Gigas Hosting SA', price: '3,20', delta: '+2,56%', bg: '#0a0a0a' },
];
// Verbatim from Figma 25:234209 (Acciones con mayor caída diaria). 6 rows.
const PERDEDORAS = [
  { tk: 'RIO', name: 'Bodegas Riojanas, S.A.', price: '1,34', delta: '−2,90%', bg: '#dddddd', fg: '#222' },
  { tk: 'MAP', name: 'Mapfre SA', price: '4,088', delta: '−2,85%', bg: '#dc2626' },
  { tk: 'TUB', name: 'Tubacex, S.A.', price: '2,900', delta: '−2,85%', bg: '#e0d8c8', fg: '#7a3d00' },
  { tk: 'END', name: 'Endurance Motive SA', price: '3,17', delta: '−2,16%', bg: '#dddddd', fg: '#222' },
  { tk: 'MEL', name: 'Melia Hotels International, S.A.', price: '11,28', delta: '−2,08%', bg: '#ffffff', fg: '#444' },
  { tk: 'COM', name: 'Catenon SA', price: '1,010', delta: '−1,94%', bg: '#22a0c8' },
];

// Verbatim from Figma 25:234401 (Resultados financieros próximos). 4 rows.
const CAL_RESULTS = [
  { date: 'Hoy', tk: 'GRE', name: 'Grenergy Renovables S.A', real: '—', est: '−0,58 EUR', bg: '#066b3b' },
  { date: '28 may', tk: 'EDR', name: 'eDreams ODIGEO', real: '—', est: '0,17 EUR', bg: '#2962ff', tag: 'sun' },
  { date: '3 jun', tk: 'ITX', name: 'Industria de Diseno Textil, S.A.', real: '—', est: '0,44 EUR', bg: '#e63b3b' },
  { date: '3 jun', tk: 'AEDAS', name: 'AEDAS Homes SA', real: '—', est: '—', bg: '#0a0a0a' },
];

// Verbatim from Figma 25:234610 (Futuros y materias primas). 2 cards.
const FUTUROS = [
  { tk: 'SPB1!', name: 'Futuros de electricidad base', price: '50,83', unit: 'EUR / MWH', delta: '+0,28%', neg: false, bg: '#2962ff', icon: '⚡' },
  { tk: 'SWM1!', name: 'Eólica terrestre',             price: '16,39', unit: 'EUR / HOUR', delta: '0,00%', neg: null,  bg: '#2e2e2e', fg: '#636363', icon: 'E' },
];

// Verbatim from Figma 25:234683 (Forex y divisas). 6 rows.
const FOREX = [
  { sym: 'USD a EUR', cc: 'US', price: '0,8592', d:['+0,05%','+0,21%','+0,44%','−0,36%','−2,25%','+5,29%'] },
  { sym: 'JPY a EUR', cc: 'JP', price: '0,0054', d:['−0,15%','−0,05%','+0,74%','−2,05%','−12,57%','−28,07%'] },
  { sym: 'GBP a EUR', cc: 'GB', price: '1,1576', d:['−0,18%','+0,51%','+0,45%','+1,42%','−2,76%','+0,28%'] },
  { sym: 'CHF a EUR', cc: 'CH', price: '1,0948', d:['−0,16%','+0,16%','+0,59%','+2,16%','+2,23%','+20,15%'] },
  { sym: 'AUD a EUR', cc: 'AU', price: '0,6155', d:['−0,08%','+0,10%','+0,87%','+9,54%','+8,21%','−3,05%'] },
  { sym: 'CNY a EUR', cc: 'CN', price: '0,1266', d:['−0,01%','+0,39%','+1,01%','+3,92%','+3,52%','−0,53%'] },
];

// ------------------ Flag SVGs (16x16 circular, simplified canonical designs) ------------------
const FLAG_SVG = {
  ES: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fES"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fES)"><rect width="16" height="16" fill="#c60b1e"/><rect y="4" width="16" height="8" fill="#ffc400"/><rect width="2" height="3" x="3" y="6.5" fill="#ad1519" rx="0.3"/></g></svg>`,
  US: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fUS"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fUS)"><rect width="16" height="16" fill="#b22234"/><g fill="#fff"><rect y="1.2" width="16" height="1.2"/><rect y="3.7" width="16" height="1.2"/><rect y="6.2" width="16" height="1.2"/><rect y="8.7" width="16" height="1.2"/><rect y="11.2" width="16" height="1.2"/><rect y="13.7" width="16" height="1.2"/></g><rect width="7" height="8" fill="#3c3b6e"/></g></svg>`,
  JP: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fJP"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fJP)"><rect width="16" height="16" fill="#fff"/><circle cx="8" cy="8" r="4" fill="#bc002d"/></g></svg>`,
  GB: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fGB"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fGB)"><rect width="16" height="16" fill="#012169"/><path d="M0 0L16 16M16 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0L16 16M16 0L0 16" stroke="#c8102e" stroke-width="1.6"/><path d="M8 0V16M0 8H16" stroke="#fff" stroke-width="4"/><path d="M8 0V16M0 8H16" stroke="#c8102e" stroke-width="2.4"/></g></svg>`,
  CH: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fCH"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fCH)"><rect width="16" height="16" fill="#d52b1e"/><rect x="6.8" y="3.6" width="2.4" height="8.8" fill="#fff"/><rect x="3.6" y="6.8" width="8.8" height="2.4" fill="#fff"/></g></svg>`,
  AU: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fAU"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fAU)"><rect width="16" height="16" fill="#012169"/><rect width="8" height="8" fill="#012169"/><path d="M0 0L8 8M8 0L0 8" stroke="#fff" stroke-width="1.4"/><path d="M0 0L8 8M8 0L0 8" stroke="#e4002b" stroke-width="0.7"/><path d="M4 0V8M0 4H8" stroke="#fff" stroke-width="2"/><path d="M4 0V8M0 4H8" stroke="#e4002b" stroke-width="1.1"/><circle cx="11.5" cy="11.5" r="0.9" fill="#fff"/><circle cx="13" cy="6" r="0.6" fill="#fff"/><circle cx="14" cy="9.5" r="0.6" fill="#fff"/><circle cx="11" cy="14" r="0.5" fill="#fff"/></g></svg>`,
  CN: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="fCN"><circle cx="8" cy="8" r="8"/></clipPath></defs><g clip-path="url(#fCN)"><rect width="16" height="16" fill="#de2910"/><g fill="#ffde00"><polygon points="3.4,1.6 4,3.4 5.7,3.4 4.3,4.4 4.8,6.1 3.4,5.1 2,6.1 2.5,4.4 1.1,3.4 2.8,3.4"/><circle cx="6.5" cy="1.5" r="0.5"/><circle cx="7.2" cy="3" r="0.5"/><circle cx="7.2" cy="5" r="0.5"/><circle cx="6.5" cy="6.4" r="0.5"/></g></g></svg>`,
};

const flagSvg = (cc, size = 16) => `<span class="es-flagSvg" style="width:${size}px;height:${size}px">${FLAG_SVG[cc] || ''}</span>`;

// Verbatim from Figma 25:234984 (Bonos deuda pública). 6 rows. Tickers row 2-6 inferred (only ES03MY rendered concretely).
const BONOS_GOV = [
  { tk: 'ES03MY', term: '3 meses', cup: '0%',    yield: '2,289%', date: '7 ago 2026',  price: '99,550', dy: '+4,81%', dp: '+0,105' },
  { tk: 'ES06MY', term: '6 meses', cup: '0%',    yield: '2,419%', date: '6 nov 2026',  price: '98,923', dy: '+4,63%', dp: '+0,041' },
  { tk: 'ES01Y',  term: '1 año',   cup: '0%',    yield: '2,533%', date: '9 abr 2027',  price: '97,824', dy: '+3,14%', dp: '+0,077' },
  { tk: 'ES02Y',  term: '2 años',  cup: '2,40%', yield: '2,660%', date: '31 may 2028', price: '99,502', dy: '+2,39%', dp: '+0,062' },
  { tk: 'ES10Y',  term: '10 años', cup: '3,30%', yield: '3,416%', date: '30 abr 2036', price: '99,038', dy: '+1,40%', dp: '+0,046' },
  { tk: 'ES30Y',  term: '30 años', cup: '3,95%', yield: '4,168%', date: '31 oct 2056', price: '96,281', dy: '+0,87%', dp: '+0,037' },
];

// Verbatim from Figma 25:235252 (Bonos corporativos). 4 rows.
const BONOS_CORP = [
  { tk: 'T4EC',         name: 'Telefonica Emisiones, S.A.U. 5.52% 01-MAR-2049',  yield: '6,26%', date: '1 mar 2049', icon: 'T' },
  { tk: 'US87938WAW3',  name: 'Telefonica Emisiones, S.A.U. 4.895% 06-MAR-2048', yield: '6,24%', date: '6 mar 2048', icon: 'T' },
  { tk: 'T4EJ',         name: 'Telefonica Emisiones, S.A.U. 5.213% 08-MAR-2047', yield: '6,23%', date: '8 mar 2047', icon: 'T' },
  { tk: 'CLLNY5214227', name: 'Cellnex Finance Co. SA 3.875% 07-JUL-2041',       yield: '6,10%', date: '7 jul 2041', icon: 'C', bg: '#bce4dc', fg: '#0a8a78' },
];

// Verbatim from Figma 25:235388 (ETFs). 3 cards.
const ETFS = [
  { tk: 'BBVAI', name: 'Accion IBEX 35 ETF',         price: '18,582', delta: '−0,09%', neg: true,  bg: '#063a5e' },
  { tk: 'BBVAE', name: 'Accion Eurostoxx 50 ETF, FI', price: '62,00',  delta: '−0,72%', neg: true,  bg: '#063a5e' },
  { tk: 'AMIBX', name: 'Amundi IBEX 35 UCITS ETF',   price: '475,00', delta: '+0,21%', neg: false, bg: '#2683c1' },
];

const ECON_PIB = [
  { name: 'PIB',                          period: '2024',    last: '1,72 T', unit: 'USD' },
  { name: 'PIB real',                     period: 'T4 2025', last: '434,6 B', unit: 'EUR' },
  { name: 'PIB per cápita PPA',           period: '2024',    last: '48,37 K', unit: 'USD' },
  { name: 'Crecimiento del PIB',          period: 'T1 2026', last: '2,7%' },
  { name: 'Tasa de crecimiento del PIB',  period: 'T1 2026', last: '0,6%' },
];
const ECON_GOV = [
  { name: 'Gasto público',                period: 'T4 2025', last: '84,04 B', unit: 'EUR' },
  { name: 'Valor del presupuesto público',period: 'mar 2026',last: '−14,24 M', unit: 'EUR' },
  { name: 'Deuda pública',                period: 'T4 2025', last: '1,7 T',   unit: 'EUR' },
  { name: 'Deuda pública/PIB',            period: '2025',    last: '100,7%' },
  { name: 'Gasto público/PIB',            period: '2025',    last: '45,3%' },
];
const ECON_PRICES = [
  { name: 'Tasa de inflación MoM',                 period: 'abr 2026', last: '0,4%' },
  { name: 'Tasa de inflación',                     period: 'abr 2026', last: '3,2%' },
  { name: 'Tasa de inflación subyacente YoY',      period: 'abr 2026', last: '2,8%' },
  { name: 'Índice de precios del productor YoY',   period: 'mar 2026', last: '8,3%' },
  { name: 'Inflación de los alimentos YoY',        period: 'abr 2026', last: '2,6%' },
  { name: 'Índice de precios al consumo',          period: 'abr 2026', last: '102,88', unit: 'POINT' },
];
const ECON_LABOR = [
  { name: 'Personas empleadas',           period: 'T1 2026', last: '22,29 M', unit: 'PSN' },
  { name: 'Desempleados',                 period: 'abr 2026', last: '2,36 M', unit: 'PSN' },
  { name: 'Tasa de desempleo',            period: 'T1 2026', last: '10,83%' },
  { name: 'Salarios mínimos',             period: '—',       last: '1,38 K',  unit: 'EUR / MONTH' },
  { name: 'Salarios',                     period: 'T4 2025', last: '2,53 K',  unit: 'EUR / MONTH' },
  { name: 'Crecimiento de los salarios YoY', period: 'T4 2025', last: '3,63%' },
];

// Calendario económico from Figma 25:236175 — 8 Component 24 cards. Content TBD (sub-component fetch needed).
const CAL_ECON = [
  { date: '28 may', time: '09:00', name: 'Retail Sales MoM',     real: '—', prev: '—', ant: '1,2%' },
  { date: '28 may', time: '09:00', name: 'Retail Sales YoY',     real: '—', prev: '—', ant: '4,1%' },
  { date: '28 may', time: '12:00', name: 'Business Confidence',  real: '—', prev: '—', ant: '−5' },
  { date: '29 may', time: '09:00', name: 'Core Inflation Rate YoY Prel', real: '—', prev: '—', ant: '2,8%' },
];

// ------------------ Helpers ------------------
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deltaCls = (neg) => neg === true ? 'es-neg' : (neg === false ? 'es-pos' : 'es-flat');
const iconStyle = (bg, fg) => `background:${bg};color:${fg || '#fff'}`;

function iconSpan(item) {
  const fg = item.fg || '#ffffff';
  const label = item.tk ? item.tk.slice(0,1) : 'X';
  return `<span class="es-iconCircle" style="${iconStyle(item.bg || '#1f1f1f', fg)}">${esc(label)}</span>`;
}

function stockCard(item) {
  return `
  <div class="es-card es-trendCard">
    <div class="es-trendTop">
      ${iconSpan(item)}
      <div class="es-trendName">
        <div class="es-tk"><a href="#/chart/${esc(item.tk)}" style="color:inherit;text-decoration:none">${esc(item.tk)}</a><sup class="es-D">D</sup></div>
        <div class="es-name">${esc(item.name)}</div>
      </div>
    </div>
    <div class="es-trendBottom">
      <div class="es-priceLine"><span class="es-price">${esc(item.price)}</span> <span class="es-unit">${esc(item.unit || 'EUR')}</span></div>
      <div class="es-delta ${deltaCls(item.neg)}">${esc(item.delta)}</div>
    </div>
  </div>`;
}

function rankRow(item, withPill = false) {
  const pill = withPill
    ? `<div class="es-pill ${item.delta.startsWith('-') ? 'es-pillNeg' : 'es-pillPos'}">${esc(item.delta)}</div>`
    : `<div class="es-delta ${deltaCls(item.delta.startsWith('-'))}">${esc(item.delta)}</div>`;
  return `
  <div class="es-rankRow">
    <div class="es-rankLeft">
      ${iconSpan(item)}
      <div class="es-rankName">
        <span class="es-rankTitle">${esc(item.name)} <sup class="es-D">D</sup></span>
        <a class="es-rankTk" href="#/chart/${esc(item.tk)}" style="color:inherit;text-decoration:none">${esc(item.tk)}</a>
      </div>
    </div>
    <div class="es-rankPrice">${esc(item.price)} <span class="es-unit">EUR</span></div>
    ${pill}
  </div>`;
}

function rankCol(title, rows, link, withPill) {
  return `
  <div class="es-rankCol">
    <div class="es-subHead"><a href="#" class="es-subTitle">${esc(title)} <span class="es-chev">›</span></a></div>
    <div class="es-rankList">${rows.map(r => rankRow(r, withPill)).join('')}</div>
    <a href="#" class="es-link">${esc(link)} <span>›</span></a>
  </div>`;
}

function calResultCard(it) {
  return `
  <div class="es-card es-calCard">
    <div class="es-calTop"><span class="es-calDate">${esc(it.date)}</span>${it.tag ? '<span class="es-calBadge">☀</span>' : ''}</div>
    <div class="es-calMid">
      ${iconSpan(it)}
      <div class="es-calName">
        <div class="es-tk">${esc(it.tk)}</div>
        <div class="es-name">${esc(it.name)}</div>
      </div>
    </div>
    <div class="es-calFoot">
      <div><div class="es-calLbl">Real</div><div class="es-calVal">${esc(it.real)}</div></div>
      <div><div class="es-calLbl">Estimación</div><div class="es-calVal">${esc(it.est)}</div></div>
    </div>
  </div>`;
}

function futCard(it) {
  return `
  <div class="es-futRow">
    <div class="es-futLeft">
      ${iconSpan({ ...it, fg: it.fg })}
      <div class="es-rankName">
        <span class="es-rankTitle">${esc(it.name)} <sup class="es-D">D</sup></span>
        <span class="es-rankTk">${esc(it.tk)}</span>
      </div>
    </div>
    <div class="es-rankPrice">${esc(it.price)} <span class="es-unit">${esc(it.unit)}</span></div>
    <div class="es-delta ${deltaCls(it.neg)}">${esc(it.delta)}</div>
  </div>`;
}

function forexCell(v) {
  const neg = v.startsWith('-');
  const abs = parseFloat(v.replace(',', '.').replace(/[%+−]/g,'').replace('-',''));
  const sat = Math.min(1, abs / 15);
  const bg = neg
    ? `rgba(242,54,69,${0.18 + sat*0.55})`
    : `rgba(8,153,129,${0.18 + sat*0.55})`;
  return `<td class="es-fxCell" style="background:${bg}"><span>${esc(v.replace('%',''))}</span><span class="es-fxPct">%</span></td>`;
}

function forexRow(r) {
  return `<tr>
    <td class="es-fxSym">${flagSvg(r.cc, 18)} ${esc(r.sym)}</td>
    <td class="es-fxPrice">${esc(r.price)}</td>
    ${r.d.map(forexCell).join('')}
  </tr>`;
}

function bondGovRow(r) {
  return `<tr>
    <td><span class="es-tagSym">${esc(r.tk)}</span><span class="es-bondTerm">${esc(r.term)}</span></td>
    <td>${esc(r.cup)}</td>
    <td>${esc(r.yield)}</td>
    <td>${esc(r.date)}</td>
    <td>${esc(r.price)} <span class="es-unit">% DE PAR</span></td>
    <td class="es-pos">${esc(r.dy)}</td>
    <td class="es-pos">${esc(r.dp)} <span class="es-unit">% DE PAR</span></td>
  </tr>`;
}

function bondCorpRow(r) {
  return `<div class="es-corpRow">
    <span class="es-iconCircle" style="${iconStyle(r.bg || '#1f1f1f', r.fg || '#fff')}">${esc(r.icon)}</span>
    <div class="es-corpName">${esc(r.name)}<div class="es-rankTk">${esc(r.tk)}</div></div>
    <div class="es-corpYield">${esc(r.yield)}</div>
    <div class="es-corpDate">${esc(r.date)}</div>
  </div>`;
}

function etfRow(r) {
  return `<div class="es-futRow">
    <div class="es-futLeft">
      ${iconSpan(r)}
      <div class="es-rankName">
        <span class="es-rankTitle">${esc(r.name)} <sup class="es-D">D</sup></span>
        <span class="es-rankTk">${esc(r.tk)}</span>
      </div>
    </div>
    <div class="es-rankPrice">${esc(r.price)} <span class="es-unit">EUR</span></div>
    <div class="es-delta ${deltaCls(r.neg)}">${esc(r.delta)}</div>
  </div>`;
}

function econTable(rows) {
  return `<table class="es-econTbl">
    <thead><tr><th>INDICADOR</th><th>PERIODO</th><th class="es-ta-r">ÚLTIMA</th></tr></thead>
    <tbody>${rows.map(r => `
      <tr>
        <td>${esc(r.name)}</td>
        <td>${esc(r.period)}</td>
        <td class="es-ta-r">${esc(r.last)}${r.unit ? ` <span class="es-unit">${esc(r.unit)}</span>` : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function calEconCard(it) {
  return `<div class="es-card es-calCard">
    <div class="es-calTop"><span class="es-calDate">${esc(it.date)} • ${esc(it.time)}</span><span class="es-calChart">📊</span></div>
    <div class="es-calMid">
      ${flagSvg('ES', 20)}
      <div class="es-calName"><div class="es-name">${esc(it.name)}</div></div>
    </div>
    <div class="es-calFoot es-calFoot3">
      <div><div class="es-calLbl">Real</div><div class="es-calVal">${esc(it.real)}</div></div>
      <div><div class="es-calLbl">Previsión</div><div class="es-calVal">${esc(it.prev)}</div></div>
      <div><div class="es-calLbl">Anterior</div><div class="es-calVal">${esc(it.ant)}</div></div>
    </div>
  </div>`;
}

// ---------- Indices chart (SVG sparkline) ----------
function indicesChart() {
  // Sample IBEX intraday-like data
  const pts = [70,55,40,30,45,38,25,42,55,68,62,58,72,80,78,75,68,82,90,76,65,72,58,68,75,62,55,70,82,74,80,86,68,72,80,76,82];
  const w = 1170, h = 240;
  const max = Math.max(...pts), min = Math.min(...pts);
  const xStep = w / (pts.length - 1);
  const norm = (v) => h - ((v - min) / (max - min)) * (h - 20) - 10;
  const linePath = pts.map((v,i) => `${i ? 'L' : 'M'}${(i*xStep).toFixed(1)},${norm(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return `<svg class="es-chartSvg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="esGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f23645" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#f23645" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#esGrad)"/>
    <path d="${linePath}" fill="none" stroke="#f23645" stroke-width="1.5"/>
  </svg>`;
}

// ---------- Bonds chart (3 curves) ----------
function bondsChart() {
  const w = 1240, h = 320;
  // Yield-like curves
  const xs = ['1M','1Y','2Y','3Y','4Y','5Y','6Y','7Y','8Y','9Y','10Y','15Y','20Y','25Y','30Y'];
  const curves = {
    actual: [2.0,2.3,2.5,2.62,2.7,2.78,2.85,2.95,3.08,3.18,3.28,3.85,3.88,4.05,4.12],
    mes:    [2.05,2.34,2.55,2.66,2.75,2.82,2.9,3.0,3.12,3.22,3.32,3.88,3.92,4.08,4.15],
    anio:   [1.85,2.0,2.05,2.05,2.1,2.18,2.3,2.45,2.66,2.85,3.05,3.7,3.75,3.92,4.02],
  };
  const all = [...curves.actual, ...curves.mes, ...curves.anio];
  const min = 1.8, max = 4.3;
  const xStep = w / (xs.length - 1);
  const norm = v => h - ((v - min) / (max - min)) * (h - 30) - 15;
  const mkPath = (arr) => arr.map((v,i)=>`${i?'L':'M'}${(i*xStep).toFixed(1)},${norm(v).toFixed(1)}`).join(' ');
  const mkDots = (arr, color) => arr.map((v,i)=>`<circle cx="${(i*xStep).toFixed(1)}" cy="${norm(v).toFixed(1)}" r="4" fill="${color}"/>`).join('');
  const yLabels = [2,2.5,3,3.5,4].map(v => `<text x="${w-2}" y="${norm(v)+4}" text-anchor="end" class="es-axisLbl">${v.toFixed(1)}%</text>`).join('');
  const xLabels = xs.map((l,i)=>`<text x="${(i*xStep).toFixed(1)}" y="${h-2}" text-anchor="middle" class="es-axisLbl">${l}</text>`).join('');
  return `<svg class="es-bondsSvg" viewBox="0 0 ${w} ${h}">
    ${yLabels}${xLabels}
    <path d="${mkPath(curves.anio)}" fill="none" stroke="#ff9800" stroke-width="2"/>
    <path d="${mkPath(curves.mes)}"  fill="none" stroke="#089981" stroke-width="2"/>
    <path d="${mkPath(curves.actual)}" fill="none" stroke="#2962ff" stroke-width="2"/>
    ${mkDots(curves.anio, '#ff9800')}
    ${mkDots(curves.mes, '#089981')}
    ${mkDots(curves.actual, '#2962ff')}
  </svg>`;
}

// ---------- PIB chart (green line) ----------
function pibChart() {
  const w = 1240, h = 360;
  const years = ['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
  const vals = [1.4, 1.2, 1.25, 1.32, 1.45, 1.42, 1.28, 1.46, 1.46, 1.6, 1.72];
  const min = 1.15, max = 1.78;
  const xStep = w / (vals.length - 1);
  const norm = v => h - ((v - min) / (max - min)) * (h - 60) - 30;
  const path = vals.map((v,i)=>`${i?'L':'M'}${(i*xStep).toFixed(1)},${norm(v).toFixed(1)}`).join(' ');
  const dots = vals.map((v,i)=>`<circle cx="${(i*xStep).toFixed(1)}" cy="${norm(v).toFixed(1)}" r="6" fill="#089981"/>`).join('');
  const xLabels = years.map((y,i)=>`<text x="${(i*xStep).toFixed(1)}" y="${h-4}" text-anchor="middle" class="es-axisLbl">${y}</text>`).join('');
  const yLabels = [1.2,1.3,1.4,1.5,1.6].map(v=>`<text x="${w-2}" y="${norm(v)+4}" text-anchor="end" class="es-axisLbl">${v.toFixed(1)} T</text>`).join('');
  yLabels;
  return `<svg class="es-pibSvg" viewBox="0 0 ${w} ${h}">
    ${yLabels}${xLabels}
    <path d="${path}" fill="none" stroke="#089981" stroke-width="2.5"/>
    ${dots}
    <g transform="translate(${(vals.length-1)*xStep - 36}, ${norm(vals[vals.length-1]) - 18})">
      <rect width="56" height="20" rx="4" fill="#089981"/>
      <text x="28" y="14" text-anchor="middle" fill="#fff" font-weight="700" font-size="12">${vals[vals.length-1].toFixed(2)} T</text>
    </g>
  </svg>`;
}

// ---------- Main HTML ----------
function buildHTML() {
  return `
  <div class="es-root">
    <!-- Header / breadcrumbs / title -->
    <header class="es-pageHead">
      <nav class="es-crumbs"><a href="/markets">Mercados</a> <span>/</span> <span class="es-crumbCur">España</span></nav>
      <div class="es-titleWrap">
        <h1 class="es-title">${flagSvg('ES', 56)}<span>España</span> <span class="es-titleArr">⌄</span></h1>
      </div>
    </header>

    <!-- Sección 1: Principales índices -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Principales índices <span class="es-chev">›</span></h2></div>
      <div class="es-idxWrap">
        <div class="es-idxList">
          ${INDICES.map((idx,i) => `
            <div class="es-idxCard ${idx.active ? 'es-idxActive' : ''}">
              <div class="es-idxRow1">
                <span class="es-idxIcon" style="background:${idx.bg}">${esc(idx.short)}</span>
                <div class="es-idxName">Índice ${esc(idx.id)} <sup class="es-D">D</sup></div>
              </div>
              <div class="es-idxRow2">
                <span class="es-idxPrice">${esc(idx.price)}</span>
                <span class="es-unit">${esc(idx.unit)}</span>
                <span class="es-delta ${deltaCls(idx.neg)}">${esc(idx.delta)}</span>
              </div>
            </div>`).join('')}
          <button class="es-arrowBtn es-arrowRight">›</button>
        </div>
        <div class="es-chart">
          ${indicesChart()}
          <div class="es-yAxis">
            <span>18.410,00</span><span>18.400,00</span><span>18.390,00</span>
            <span class="es-yHl">18.380,90</span>
            <span>18.370,00</span><span>18.360,00</span>
          </div>
          <div class="es-xAxis">
            ${['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','17:35'].map(t => `<span>${t}</span>`).join('')}
          </div>
        </div>
        <div class="es-chartFoot">
          <div class="es-rangeBtns">
            <button class="es-rngBtn es-rngActive">1D</button>
            <button class="es-rngBtn">1M</button>
            <button class="es-rngBtn">3M</button>
            <button class="es-rngBtn">1A</button>
            <button class="es-rngBtn">5A</button>
            <button class="es-rngBtn">Todos</button>
          </div>
          <div class="es-chartIcons">
            <button class="es-iconBtn">&lt;/&gt;</button>
            <button class="es-iconBtn es-iconActive">📈</button>
            <button class="es-iconBtn">⛶</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Sección 2: Acciones españolas -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Acciones españolas <span class="es-chev">›</span></h2></div>

      <div class="es-subHead"><a href="#" class="es-subTitle">Tendencias de la comunidad <span class="es-chev">›</span></a></div>
      <div class="es-trendRow">
        ${TRENDING.map(stockCard).join('')}
        <button class="es-arrowBtn es-arrowOverlay">›</button>
      </div>

      <div class="es-twoCol">
        ${rankCol('Acciones con el mayor volumen', VOLUMEN, 'Ver todas las acciones más negociadas', false)}
        ${rankCol('Acciones más volátiles', VOLATILES, 'Ver todas las acciones con mayores variaciones de precio', false)}
      </div>

      <div class="es-twoCol">
        ${rankCol('Acciones ganadoras', GANADORAS, 'Ver todas las acciones con mayor crecimiento diario', true)}
        ${rankCol('Acciones perdedoras', PERDEDORAS, 'Ver todas las acciones con mayor caída diaria', true)}
      </div>

      <div class="es-subHead"><a href="#" class="es-subTitle">Calendario de resultados <span class="es-chev">›</span></a></div>
      <div class="es-calRow">
        ${CAL_RESULTS.map(calResultCard).join('')}
        <button class="es-arrowBtn es-arrowOverlay">›</button>
      </div>
      <a href="#" class="es-link">Ver todos los eventos <span>›</span></a>

      <div class="es-subHead"><a href="#" class="es-subTitle">Calendario de las OPV <span class="es-chev">›</span></a></div>
      <div class="es-emptyState">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M14 16c0-5 4.5-10 10-10s10 5 10 10v18l-3-3-3 3-2-3-2 3-3-3-3 3-2-3-2 3V16z" stroke="#dadada" stroke-width="2" fill="none"/>
          <circle cx="20" cy="20" r="1.5" fill="#dadada"/><circle cx="28" cy="20" r="1.5" fill="#dadada"/>
        </svg>
        <p>Ningún informe programado</p>
      </div>
      <a href="#" class="es-link">Ver todos los eventos <span>›</span></a>
    </section>

    <!-- Sección 3: Futuros y materias primas -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Futuros y materias primas <span class="es-chev">›</span></h2></div>
      <div class="es-futList">
        ${FUTUROS.map(futCard).join('')}
      </div>
      <a href="#" class="es-link">Ver todos los futuros <span>›</span></a>
    </section>

    <!-- Sección 4: Forex y divisas -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Forex y divisas <span class="es-chev">›</span></h2></div>
      <table class="es-forexTbl">
        <thead>
          <tr><th></th><th>Precio</th><th>Hoy</th><th>Semana</th><th>Mes</th><th>6 meses</th><th>Año</th><th>5 años</th></tr>
        </thead>
        <tbody>${FOREX.map(forexRow).join('')}</tbody>
      </table>
      <a href="#" class="es-link">Ver todos los tipos <span>›</span></a>
    </section>

    <!-- Sección 5: Bonos de deuda pública -->
    <section class="es-section">
      <div class="es-bondsHeader">
        <h2 class="es-secTitle es-secTitleMulti">Rendimiento de los bonos de deuda<br/>pública española <span class="es-chev">›</span></h2>
        <button class="es-customBtn">⊞ Personalice curvas</button>
      </div>
      <div class="es-bondsChartWrap">${bondsChart()}</div>
      <div class="es-bondsLegend">
        <span><span class="es-dot" style="background:#2962ff"></span>Actual</span>
        <span><span class="es-dot" style="background:#089981"></span>Hace 1 mes</span>
        <span><span class="es-dot" style="background:#ff9800"></span>Hace 1 año</span>
      </div>
      <table class="es-bondsTbl">
        <thead><tr><th>Símbolo</th><th>Cupón</th><th>Rendimiento en %</th><th>Fecha de vencimiento</th><th>Precio</th><th>Cambio de rendimiento 1 día</th><th>Cambio de precio 1 día</th></tr></thead>
        <tbody>${BONOS_GOV.map(bondGovRow).join('')}</tbody>
      </table>
      <a href="#" class="es-link">Ver todos los bonos <span>›</span></a>
    </section>

    <!-- Sección 6: Bonos corporativos -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Bonos corporativos españoles <span class="es-chev">›</span></h2></div>
      <div class="es-twoCol es-twoColCorp">
        <div class="es-rankCol">
          <div class="es-corpHead"><span>SÍMBOLO</span><span class="es-corpHead-r">RENDIMIENTO AL VENCIMIENTO</span><span class="es-corpHead-r">FECHA DE VENCIMIENTO</span></div>
          ${[BONOS_CORP[0], BONOS_CORP[1]].map(bondCorpRow).join('')}
        </div>
        <div class="es-rankCol">
          <div class="es-corpHead"><span>SÍMBOLO</span><span class="es-corpHead-r">RENDIMIENTO AL VENCIMIENTO</span><span class="es-corpHead-r">FECHA DE VENCIMIENTO</span></div>
          ${[BONOS_CORP[2], BONOS_CORP[3]].map(bondCorpRow).join('')}
        </div>
      </div>
      <a href="#" class="es-link">Ver todos los bonos <span>›</span></a>
    </section>

    <!-- Sección 7: ETFs -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">ETFs <span class="es-chev">›</span></h2></div>
      <div class="es-etfList">${ETFS.map(etfRow).join('')}</div>
      <a href="#" class="es-link">Ver todos los ETF <span>›</span></a>
    </section>

    <!-- Sección 8: Economía española -->
    <section class="es-section">
      <div class="es-secHead"><h2 class="es-secTitle">Economía española <span class="es-chev">›</span></h2></div>
      <div class="es-subHead"><a href="#" class="es-subTitle">Indicadores económicos clave</a></div>

      <div class="es-pibTabs">
        <button class="es-pibTab es-pibActive"><div class="es-pibTabName">PIB</div><div class="es-pibTabVal">1,72 T <span class="es-unit">USD</span></div></button>
        <button class="es-pibTab"><div class="es-pibTabName">Crecimiento del PIB durante todo el año</div><div class="es-pibTabVal">2,8 %</div></button>
        <button class="es-pibTab"><div class="es-pibTabName">PIB real</div><div class="es-pibTabVal">434,6 B <span class="es-unit">EUR</span></div></button>
        <button class="es-pibTab"><div class="es-pibTabName">Tipo de interés</div><div class="es-pibTabVal">2,15 %</div></button>
        <button class="es-arrowBtn es-arrowOverlay">›</button>
      </div>
      <div class="es-pibChartWrap">${pibChart()}</div>
      <div class="es-pibFoot">
        <div class="es-rangeBtns">
          <button class="es-rngBtn">1A</button>
          <button class="es-rngBtn">5A</button>
          <button class="es-rngBtn es-rngActive">10A</button>
          <button class="es-rngBtn">Todos</button>
        </div>
        <div class="es-chartIcons">
          <button class="es-iconBtn">&lt;/&gt;</button>
          <button class="es-iconBtn es-iconActive">📈</button>
          <button class="es-iconBtn">📊</button>
          <button class="es-iconBtn">⛶</button>
        </div>
      </div>

      <div class="es-econGrid">
        <div>
          <div class="es-subHead"><a href="#" class="es-subTitle">PIB <span class="es-chev">›</span></a></div>
          ${econTable(ECON_PIB)}
          <a href="#" class="es-link">Ver todos los indicadores del PIB <span>›</span></a>
        </div>
        <div>
          <div class="es-subHead"><a href="#" class="es-subTitle">Gobierno <span class="es-chev">›</span></a></div>
          ${econTable(ECON_GOV)}
          <a href="#" class="es-link">Ver todos los indicadores gubernamentales <span>›</span></a>
        </div>
        <div>
          <div class="es-subHead"><a href="#" class="es-subTitle">Precios <span class="es-chev">›</span></a></div>
          ${econTable(ECON_PRICES)}
          <a href="#" class="es-link">Ver todos los indicadores de precios <span>›</span></a>
        </div>
        <div>
          <div class="es-subHead"><a href="#" class="es-subTitle">Trabajo <span class="es-chev">›</span></a></div>
          ${econTable(ECON_LABOR)}
          <a href="#" class="es-link">Ver todos los indicadores laborales <span>›</span></a>
        </div>
      </div>

      <div class="es-subHead"><a href="#" class="es-subTitle">Calendario económico <span class="es-chev">›</span></a></div>
      <div class="es-calRow">
        ${CAL_ECON.map(calEconCard).join('')}
        <button class="es-arrowBtn es-arrowOverlay">›</button>
      </div>
      <a href="#" class="es-link">Ver los eventos del mercado <span>›</span></a>
    </section>
  </div>`;
}

export function renderMarketsSpain(mount) {
  mount.innerHTML = buildHTML();
  return { destroy() { mount.innerHTML = ''; } };
}
