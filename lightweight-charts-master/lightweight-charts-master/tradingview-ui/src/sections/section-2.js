// src/sections/section-2.js
// TradingView "Acciones españolas" market overview section.
// Figma file: 2QhXqtb66hdeKvlZAZE4fS, node 1:33031 (1315x3267)
//
// Layout (top → bottom):
//   H1  "Acciones españolas" with ES flag
//   W1  Tendencias de la comunidad  — horizontal scroll of 10 mini ticker cards
//   W2  Ideas de trading            — horizontal scroll of 9 idea cards + "Ver mas"
//   W3+W4  Mayor volumen / Mas volatiles — 2 columns, 6 rows each
//   W5+W6  Acciones ganadoras / perdedoras — 2 columns, 6 rows each (with sparklines)
//   W7  Calendario de beneficios    — horizontal scroll of 4 earnings cards + "Ver mas"
//   W8  Calendario de las OPV        — empty state
//   W9  Noticias sobre acciones espanolas — 4x3 grid of 12 news items
//
// Self-contained: own CSS namespace (mo2-*), own icons in ../icons/.

import { createChart, LineSeries, AreaSeries } from 'lightweight-charts';
import { generateSparkline } from '../data.js';

/* ---------------------------------------------------------------- */
/* Asset paths                                                      */
/* ---------------------------------------------------------------- */
const I = {
  chevron:  '/src/icons/sec2-chevron.svg',
};

/* ---------------------------------------------------------------- */
/* Data — extracted/inspired from Figma node 1:33031                */
/* ---------------------------------------------------------------- */

// W1 — Tendencias de la comunidad (10 mini cards)
const TRENDS = [
  { tic: 'FER',   name: 'Ferrovial N.V.',         price: '58,46',  chg: '+0,34%', up: true,  c1: '#0077c8', c2: '#fff', glyph: 'F' },
  { tic: 'SAN',   name: 'Banco Santander',        price: '9,468',  chg: '−0,32%', up: false, c1: '#ec1c24', c2: '#fff', glyph: 'S' },
  { tic: 'IBE',   name: 'Iberdrola, S.A.',        price: '19,295', chg: '+0,34%', up: true,  c1: '#7bc143', c2: '#fff', glyph: 'I' },
  { tic: 'IDR',   name: 'Indra Sistemas',         price: '123,6',  chg: '−0,48%', up: false, c1: '#003a78', c2: '#fff', glyph: 'I' },
  { tic: 'PUIG',  name: 'Puig Brands',            price: '15,25',  chg: '+2,14%', up: true,  c1: '#000',    c2: '#fff', glyph: 'P' },
  { tic: 'TEF',   name: 'Telefónica',             price: '1,428',  chg: '0,00%',  up: null,  c1: '#0066ff', c2: '#fff', glyph: 'T' },
  { tic: 'REP',   name: 'Repsol',                 price: '23,80',  chg: '+0,25%', up: true,  c1: '#ee7d11', c2: '#fff', glyph: 'R' },
  { tic: 'BBVA',  name: 'BBVA',                   price: '10,15',  chg: '−0,49%', up: false, c1: '#004481', c2: '#fff', glyph: 'B' },
  { tic: 'SAB',   name: 'Banco Sabadell',         price: '0,1940', chg: '−0,10%', up: false, c1: '#005ca9', c2: '#fff', glyph: 'S' },
  { tic: 'ACS',   name: 'ACS, Actividades',       price: '51,46',  chg: '−0,89%', up: false, c1: '#e2231a', c2: '#fff', glyph: 'A' },
];

// W2 — Ideas de trading (9 cards)
const IDEAS = [
  { tic: 'PUIG', author: 'MrOskama',     date: 'Mayo 22', title: 'Puig pinta muy mal',                            up: false, likes: 1,  seed: 101, c1: '#000',    glyph: 'P' },
  { tic: 'IAG',  author: 'AlphaTrader',  date: 'Mayo 20', title: 'IAG — Ruptura del canal alcista',               up: true,  likes: 28, seed: 102, c1: '#dc0e15', glyph: 'I' },
  { tic: 'SAN',  author: 'BancaPro',     date: 'Mayo 18', title: 'Santander: zona de soporte clave',             up: true,  likes: 47, seed: 103, c1: '#ec1c24', glyph: 'S' },
  { tic: 'BBVA', author: 'IberiaCharts', date: 'Mayo 17', title: 'BBVA: doble techo confirmado',                  up: false, likes: 19, seed: 104, c1: '#004481', glyph: 'B' },
  { tic: 'IBE',  author: 'GreenWatts',   date: 'Mayo 15', title: 'Iberdrola — Acumulación de largo plazo',        up: true,  likes: 62, seed: 105, c1: '#7bc143', glyph: 'I' },
  { tic: 'TEF',  author: 'SpainTrader',  date: 'Mayo 14', title: 'Telefónica buscando suelo',                     up: false, likes: 12, seed: 106, c1: '#0066ff', glyph: 'T' },
  { tic: 'REP',  author: 'OilWatch',     date: 'Mayo 12', title: 'Repsol: triángulo descendente',                 up: false, likes: 33, seed: 107, c1: '#ee7d11', glyph: 'R' },
  { tic: 'CLNX', author: 'TowerBet',     date: 'Mayo 11', title: 'Cellnex — Soporte horario muy fuerte',         up: true,  likes: 24, seed: 108, c1: '#003a78', glyph: 'C' },
  { tic: 'AENA', author: 'TravelBull',   date: 'Mayo 09', title: 'AENA — Continuación alcista',                   up: true,  likes: 41, seed: 109, c1: '#0c2c5c', glyph: 'A' },
];

// W3 — Acciones con el mayor volumen (12, 2 cols × 6)
const VOLUME = [
  { tic: 'SAN',  name: 'Banco Santander',  price: '9,468',  unit: 'EUR', chg: '−0,32%', up: false, vol: '125,4M', c1: '#ec1c24', glyph: 'S' },
  { tic: 'BBVA', name: 'BBVA',             price: '10,15',  unit: 'EUR', chg: '−0,49%', up: false, vol: '98,1M',  c1: '#004481', glyph: 'B' },
  { tic: 'IBE',  name: 'Iberdrola',        price: '19,295', unit: 'EUR', chg: '+0,34%', up: true,  vol: '84,7M',  c1: '#7bc143', glyph: 'I' },
  { tic: 'TEF',  name: 'Telefónica',       price: '1,428',  unit: 'EUR', chg: '0,00%',  up: null,  vol: '76,2M',  c1: '#0066ff', glyph: 'T' },
  { tic: 'CABK', name: 'CaixaBank',        price: '5,162',  unit: 'EUR', chg: '+0,68%', up: true,  vol: '64,5M',  c1: '#0e3a73', glyph: 'C' },
  { tic: 'REP',  name: 'Repsol',           price: '14,80',  unit: 'EUR', chg: '+0,25%', up: true,  vol: '52,1M',  c1: '#ee7d11', glyph: 'R' },
];
const VOLATILE = [
  { tic: 'GRF',  name: 'Grifols',          price: '11,42',  unit: 'EUR', chg: '+5,84%', up: true,  vol: '5,21%',  c1: '#0b5394', glyph: 'G' },
  { tic: 'PUIG', name: 'Puig Brands',      price: '15,25',  unit: 'EUR', chg: '+2,14%', up: true,  vol: '4,12%',  c1: '#000',    glyph: 'P' },
  { tic: 'IAG',  name: 'IAG',              price: '3,124',  unit: 'EUR', chg: '−1,87%', up: false, vol: '3,98%',  c1: '#dc0e15', glyph: 'I' },
  { tic: 'IDR',  name: 'Indra Sistemas',   price: '17,84',  unit: 'EUR', chg: '−3,42%', up: false, vol: '3,75%',  c1: '#003a78', glyph: 'I' },
  { tic: 'MTS',  name: 'ArcelorMittal',    price: '21,18',  unit: 'EUR', chg: '−4,12%', up: false, vol: '3,62%',  c1: '#ff7900', glyph: 'M' },
  { tic: 'CLNX', name: 'Cellnex',          price: '32,40',  unit: 'EUR', chg: '+2,98%', up: true,  vol: '3,21%',  c1: '#003a78', glyph: 'C' },
];

// W5+W6 — Gainers/Losers with sparklines
const GAINERS = [
  { tic: 'GRF',  name: 'Grifols',         price: '11,42',  unit: 'EUR', chg: '+5,84%', up: true, seed: 201, c1: '#0b5394', glyph: 'G' },
  { tic: 'ELE',  name: 'Endesa',          price: '20,18',  unit: 'EUR', chg: '+4,21%', up: true, seed: 202, c1: '#005bbb', glyph: 'E' },
  { tic: 'REP',  name: 'Repsol',          price: '14,80',  unit: 'EUR', chg: '+3,87%', up: true, seed: 203, c1: '#ee7d11', glyph: 'R' },
  { tic: 'ACS',  name: 'ACS',             price: '46,12',  unit: 'EUR', chg: '+3,12%', up: true, seed: 204, c1: '#e2231a', glyph: 'A' },
  { tic: 'CLNX', name: 'Cellnex',         price: '32,40',  unit: 'EUR', chg: '+2,98%', up: true, seed: 205, c1: '#003a78', glyph: 'C' },
  { tic: 'PUIG', name: 'Puig Brands',     price: '15,25',  unit: 'EUR', chg: '+2,14%', up: true, seed: 206, c1: '#000',    glyph: 'P' },
];
const LOSERS = [
  { tic: 'MTS',  name: 'ArcelorMittal',   price: '21,18',  unit: 'EUR', chg: '−4,12%', up: false, seed: 211, c1: '#ff7900', glyph: 'M' },
  { tic: 'IDR',  name: 'Indra Sistemas',  price: '17,84',  unit: 'EUR', chg: '−3,42%', up: false, seed: 212, c1: '#003a78', glyph: 'I' },
  { tic: 'AENA', name: 'Aena',            price: '186,40', unit: 'EUR', chg: '−2,86%', up: false, seed: 213, c1: '#0c2c5c', glyph: 'A' },
  { tic: 'NTGY', name: 'Naturgy',         price: '22,12',  unit: 'EUR', chg: '−2,18%', up: false, seed: 214, c1: '#e60028', glyph: 'N' },
  { tic: 'AMS',  name: 'Amadeus',         price: '64,80',  unit: 'EUR', chg: '−1,98%', up: false, seed: 215, c1: '#0a3a82', glyph: 'A' },
  { tic: 'IAG',  name: 'IAG',             price: '3,124',  unit: 'EUR', chg: '−1,87%', up: false, seed: 216, c1: '#dc0e15', glyph: 'I' },
];

// W7 — Calendario de beneficios
const EARNINGS = [
  { tic: 'SAN',  name: 'Banco Santander',  date: '28 May, antes',   eps: '0,165 EUR', c1: '#ec1c24', glyph: 'S' },
  { tic: 'BBVA', name: 'BBVA',             date: '29 May, despues', eps: '0,221 EUR', c1: '#004481', glyph: 'B' },
  { tic: 'IBE',  name: 'Iberdrola',        date: '04 Jun, antes',   eps: '0,348 EUR', c1: '#7bc143', glyph: 'I' },
  { tic: 'TEF',  name: 'Telefonica',       date: '07 Jun, despues', eps: '0,051 EUR', c1: '#0066ff', glyph: 'T' },
];

// W9 — Noticias (12 items)
const NEWS = [
  { src: 'Reuters',     date: 'hace 2 h',  title: 'IBEX 35 cierra plano lastrado por la banca',                      c1: '#ff6600', glyph: 'R' },
  { src: 'Expansion',   date: 'hace 3 h',  title: 'Santander supera previsiones de beneficio del trimestre',         c1: '#003a78', glyph: 'E' },
  { src: 'Cinco Dias',  date: 'hace 4 h',  title: 'Iberdrola amplia su programa de inversion en renovables',         c1: '#c8102e', glyph: 'C' },
  { src: 'El Pais',     date: 'hace 5 h',  title: 'Telefonica revisa al alza sus objetivos para 2026',               c1: '#000',    glyph: 'P' },
  { src: 'El Mundo',    date: 'hace 6 h',  title: 'Repsol acelera transicion energetica con nueva planta',           c1: '#bf1e2e', glyph: 'M' },
  { src: 'ABC',         date: 'hace 7 h',  title: 'BBVA confirma plan de recompra de acciones por 1.000 M EUR',      c1: '#1b5fa9', glyph: 'A' },
  { src: 'Bloomberg',   date: 'hace 8 h',  title: 'Grifols sufre tras informe critico de un fondo bajista',          c1: '#000',    glyph: 'B' },
  { src: 'Financial T.',date: 'hace 9 h',  title: 'Aena bate record de pasajeros en mayo',                           c1: '#fcd0b1', glyph: 'F' },
  { src: 'Europa Press',date: 'hace 10 h', title: 'Indra firma contrato con Defensa por 350 M EUR',                  c1: '#003a78', glyph: 'E' },
  { src: 'El Economist',date: 'hace 12 h', title: 'CaixaBank reduce su exposicion a deuda soberana',                 c1: '#d62828', glyph: 'E' },
  { src: 'La Vanguard.',date: 'hace 14 h', title: 'Cellnex vende torres en Francia por 800 M EUR',                   c1: '#7a1f2b', glyph: 'L' },
  { src: 'Invertia',    date: 'hace 18 h', title: 'Naturgy estudia escision de su negocio internacional',            c1: '#e60028', glyph: 'I' },
];

/* ---------------------------------------------------------------- */
/* CSS                                                              */
/* ---------------------------------------------------------------- */
let _cssInjected = false;
const CSS = `
.mo2-sec, .mo2-sec *, .mo2-sec *::before, .mo2-sec *::after { box-sizing: border-box; }
.mo2-sec {
  width: 100%;
  background: var(--grey-6, #0f0f0f);
  color: var(--grey-86, #dbdbdb);
  font-family: var(--font-ui, 'Trebuchet MS', Trebuchet, 'Lucida Sans', Arial, sans-serif);
  padding: 24px 40px 64px;
}

/* ===== Section header (ES flag + title) ===== */
.mo2-h1 { display: flex; align-items: center; gap: 8px; height: 44px; margin-bottom: 8px; }
.mo2-h1__flag {
  width: 36px; height: 36px; border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column; flex-shrink: 0;
  background: #fdd835;
}
.mo2-h1__flag::before {
  content: ""; display: block; height: 10px; background: #ef5350;
}
.mo2-h1__flag::after {
  content: ""; display: block; height: 10px; background: #ef5350; margin-top: auto;
}
.mo2-h1__title {
  font-size: 28px; font-weight: 700; line-height: 36px;
  color: var(--grey-86, #dbdbdb); cursor: pointer; text-decoration: none;
}
.mo2-h1__title:hover { color: #fff; }

/* ===== Widget block ===== */
.mo2-w { margin-top: 16px; }
.mo2-w__head {
  display: flex; align-items: center; height: 36px;
  margin-bottom: 16px;
}
.mo2-w__title {
  font-size: 22px; font-weight: 700; line-height: 28px;
  color: var(--grey-86, #dbdbdb); text-decoration: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
}
.mo2-w__title:hover { color: #fff; }
.mo2-w__title::after {
  content: "›"; font-size: 22px; line-height: 1; color: var(--grey-55, #8c8c8c);
  display: inline-block; transform: translateY(-1px);
}
.mo2-w__footer { display: flex; align-items: center; height: 48px; padding-top: 24px; }
.mo2-w__more {
  font-size: 14px; line-height: 24px; color: var(--azure-58, #2962ff);
  text-decoration: none; cursor: pointer;
}
.mo2-w__more:hover { text-decoration: underline; }

/* ===== Horizontal scroll wrapper ===== */
.mo2-hscroll {
  position: relative;
  overflow: hidden;
  margin: 0 -8px;
}
.mo2-hscroll__inner {
  display: flex;
  gap: 32px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 8px;
  scrollbar-width: none;
}
.mo2-hscroll__inner::-webkit-scrollbar { display: none; }
.mo2-hscroll__btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 48px; height: 48px;
  border-radius: 24px;
  background: var(--grey-18, #2e2e2e);
  border: 1px solid var(--grey-29, #4a4a4a);
  color: var(--grey-86, #dbdbdb);
  font-size: 24px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
  transition: background-color .12s ease;
}
.mo2-hscroll__btn:hover { background: var(--grey-24, #3d3d3d); }

/* ===== Avatar (ticker logo circle) ===== */
.mo2-av {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 18px;
  font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0;
  font-family: var(--font-ui);
}
.mo2-av--sm { width: 24px; height: 24px; border-radius: 12px; font-size: 12px; }
.mo2-av--lg { width: 40px; height: 40px; border-radius: 20px; font-size: 20px; }

/* ===== W1: Trends mini ticker card ===== */
.mo2-trend {
  flex: 0 0 237px;
  height: 148px;
  border: 1px solid var(--grey-29, #4a4a4a);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: 42px 52px;
  column-gap: 8px;
  row-gap: 20px;
  background: transparent;
  cursor: pointer;
  transition: background-color .12s ease;
}
.mo2-trend:hover { background: var(--grey-11, #1c1c1c); }
.mo2-trend__title {
  display: flex; flex-direction: column; gap: 0;
  min-width: 0;
}
.mo2-trend__tic {
  font-size: 16px; line-height: 24px; color: var(--grey-86, #dbdbdb);
  display: inline-flex; align-items: center; gap: 4px;
}
.mo2-trend__mode {
  font-size: 10px; font-weight: 700; color: var(--orange, #ff9800);
  text-transform: uppercase;
}
.mo2-trend__name {
  font-size: 14px; line-height: 18px; color: var(--grey-55, #8c8c8c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mo2-trend__vc { grid-column: 1 / span 2; display: flex; flex-direction: column; gap: 4px; }
.mo2-trend__price-row { display: flex; align-items: baseline; gap: 2px; min-height: 24px; color: var(--grey-86, #dbdbdb); }
.mo2-trend__price { font-size: 16px; line-height: 24px; }
.mo2-trend__unit { font-size: 11px; line-height: 16px; letter-spacing: 0.4px; text-transform: uppercase; }
.mo2-trend__chg { font-size: 16px; line-height: 24px; }
.mo2-up   { color: #22ab94; }
.mo2-down { color: #f7525f; }
.mo2-flat { color: var(--grey-55, #8c8c8c); }

/* ===== W2: Idea card ===== */
.mo2-idea {
  flex: 0 0 422px;
  height: 408px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid transparent;
  padding: 0;
  position: relative;
  cursor: pointer;
}
.mo2-idea__img {
  margin: 8px;
  height: 228px;
  border-radius: 8px;
  background: var(--grey-11, #1c1c1c);
  border: 1px solid rgba(140,140,140,.2);
  position: relative;
  overflow: hidden;
}
.mo2-idea__chart {
  position: absolute; inset: 0;
}
.mo2-idea__badges {
  position: absolute; left: 8px; bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.mo2-idea__dir {
  width: 24px; height: 24px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #fff; font-weight: 700;
}
.mo2-idea__dir--up   { background: #22ab94; }
.mo2-idea__dir--down { background: #f7525f; }
.mo2-idea__text { padding: 12px 16px 0; }
.mo2-idea__title {
  font-size: 18px; font-weight: 700; line-height: 24px;
  color: var(--grey-86, #dbdbdb);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-bottom: 8px;
}
.mo2-idea__bottom {
  position: absolute; left: 16px; right: 16px; bottom: 16px;
  display: flex; align-items: center; justify-content: space-between;
}
.mo2-idea__by {
  font-size: 14px; line-height: 18px; color: var(--grey-86, #dbdbdb);
}
.mo2-idea__date { font-size: 14px; line-height: 18px; color: var(--grey-55, #8c8c8c); margin-top: 4px; }
.mo2-idea__likes {
  display: inline-flex; align-items: center; gap: 4px;
  height: 40px; padding: 0 14px;
  border: 1px solid var(--grey-29, #4a4a4a);
  border-radius: 8px;
  color: var(--grey-86, #dbdbdb);
  font-size: 16px;
}
.mo2-idea__heart { color: #f7525f; font-size: 14px; }

/* "Ver mas" terminal card */
.mo2-more-card {
  flex: 0 0 422px;
  height: 408px;
  border-radius: 16px;
  border: 1px dashed var(--grey-29, #4a4a4a);
  display: flex; align-items: center; justify-content: center;
  color: var(--azure-58, #2962ff);
  font-size: 16px; cursor: pointer;
}
.mo2-more-card:hover { background: var(--grey-11, #1c1c1c); }

/* ===== W3/W4: Two-column rows ===== */
.mo2-2col {
  display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
}
.mo2-rows { display: flex; flex-direction: column; }
.mo2-row {
  display: grid;
  grid-template-columns: 40px minmax(0,1fr) auto auto;
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 4px;
  border-top: 1px solid transparent;
  cursor: pointer;
}
.mo2-row + .mo2-row { border-top: 1px solid var(--grey-18, #2e2e2e); }
.mo2-row:hover { background: var(--grey-11, #1c1c1c); }
.mo2-row__name { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.mo2-row__tic { font-size: 14px; font-weight: 700; color: var(--grey-86, #dbdbdb); }
.mo2-row__sub { font-size: 12px; color: var(--grey-55, #8c8c8c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo2-row__price { font-size: 14px; color: var(--grey-86, #dbdbdb); text-align: right; }
.mo2-row__unit { font-size: 10px; color: var(--grey-55, #8c8c8c); text-transform: uppercase; letter-spacing: 0.4px; margin-left: 2px; }
.mo2-row__chg {
  font-size: 14px; line-height: 22px;
  padding: 0 8px; border-radius: 4px;
  min-width: 76px; text-align: right;
}
.mo2-row__chg--up   { color: #fff; background: #22ab94; }
.mo2-row__chg--down { color: #fff; background: #f7525f; }
.mo2-row__chg--flat { color: var(--grey-55, #8c8c8c); background: transparent; }
.mo2-row__vol { font-size: 14px; color: var(--grey-86, #dbdbdb); text-align: right; min-width: 70px; }

/* ===== W5/W6: Gainers/Losers with sparkline ===== */
.mo2-row--spark {
  grid-template-columns: 40px minmax(0,1fr) 110px auto auto;
}
.mo2-spark {
  width: 100px; height: 36px;
  background: transparent;
}

/* ===== W7: Earnings card ===== */
.mo2-earn {
  flex: 0 0 305px;
  height: 156px;
  border: 1px solid var(--grey-29, #4a4a4a);
  border-radius: 16px;
  padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
  cursor: pointer;
  background: transparent;
  transition: background-color .12s ease;
}
.mo2-earn:hover { background: var(--grey-11, #1c1c1c); }
.mo2-earn__top { display: flex; align-items: center; gap: 12px; }
.mo2-earn__name { font-size: 14px; color: var(--grey-86, #dbdbdb); display: flex; flex-direction: column; }
.mo2-earn__tic { font-weight: 700; }
.mo2-earn__sub { color: var(--grey-55, #8c8c8c); font-size: 12px; }
.mo2-earn__date { font-size: 13px; color: var(--grey-55, #8c8c8c); }
.mo2-earn__eps { font-size: 14px; color: var(--grey-86, #dbdbdb); margin-top: auto; }

/* ===== W8: Empty IPO state ===== */
.mo2-empty {
  height: 156px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  color: var(--grey-55, #8c8c8c);
  font-size: 14px;
}
.mo2-empty__icon {
  width: 72px; height: 72px; border-radius: 36px;
  border: 1px solid var(--grey-29, #4a4a4a);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: var(--grey-55, #8c8c8c);
}

/* ===== W9: News grid ===== */
.mo2-newsgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 64px;
  row-gap: 32px;
}
.mo2-news {
  display: flex; gap: 12px; align-items: flex-start;
  cursor: pointer;
}
.mo2-news:hover .mo2-news__title { color: #fff; }
.mo2-news__text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mo2-news__title {
  font-size: 14px; line-height: 18px; color: var(--grey-86, #dbdbdb);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  transition: color .12s ease;
}
.mo2-news__meta {
  font-size: 12px; line-height: 16px; color: var(--grey-55, #8c8c8c);
  display: flex; align-items: center; gap: 6px;
}
.mo2-news__sep { color: var(--grey-29, #4a4a4a); }
`;

/* ---------------------------------------------------------------- */
/* Helpers                                                          */
/* ---------------------------------------------------------------- */
function chgClass(item) {
  if (item.up === true) return 'mo2-up';
  if (item.up === false) return 'mo2-down';
  return 'mo2-flat';
}
function chgBadge(item) {
  if (item.up === true) return 'mo2-row__chg mo2-row__chg--up';
  if (item.up === false) return 'mo2-row__chg mo2-row__chg--down';
  return 'mo2-row__chg mo2-row__chg--flat';
}
function avatar(item, size = '') {
  const cls = size ? `mo2-av mo2-av--${size}` : 'mo2-av';
  return `<span class="${cls}" style="background:${item.c1}">${item.glyph}</span>`;
}

/* ---------------------------------------------------------------- */
/* Markup builders                                                  */
/* ---------------------------------------------------------------- */
function renderHeader() {
  return `
    <div class="mo2-h1">
      <span class="mo2-h1__flag" aria-hidden="true"></span>
      <a class="mo2-h1__title" href="https://es.tradingview.com/markets/stocks-spain/" target="_blank" rel="noopener">Acciones españolas</a>
    </div>
  `;
}

function renderWidgetHead(title, href) {
  return `
    <div class="mo2-w__head">
      <a class="mo2-w__title" href="${href}" target="_blank" rel="noopener">${title}</a>
    </div>
  `;
}

function renderFooter(label, href) {
  return `
    <div class="mo2-w__footer">
      <a class="mo2-w__more" href="${href}" target="_blank" rel="noopener">${label}</a>
    </div>
  `;
}

function renderTrendCard(t) {
  const cls = chgClass(t);
  return `
    <div class="mo2-trend" data-ticker="${t.tic}">
      ${avatar(t)}
      <div class="mo2-trend__title">
        <span class="mo2-trend__tic">${t.tic}<span class="mo2-trend__mode">D</span></span>
        <span class="mo2-trend__name">${t.name}</span>
      </div>
      <div class="mo2-trend__vc">
        <span class="mo2-trend__price-row">
          <span class="mo2-trend__price">${t.price}</span>
          <span class="mo2-trend__unit">EUR</span>
        </span>
        <span class="mo2-trend__chg ${cls}">${t.chg}</span>
      </div>
    </div>
  `;
}

function renderW1() {
  const cards = TRENDS.map(renderTrendCard).join('');
  return `
    <section class="mo2-w" id="mo2-trends">
      ${renderWidgetHead('Tendencias de la comunidad', 'https://es.tradingview.com/markets/stocks-spain/')}
      <div class="mo2-hscroll">
        <div class="mo2-hscroll__inner">${cards}</div>
        <button type="button" class="mo2-hscroll__btn" data-dir="right" aria-label="Desplazar a la derecha">›</button>
      </div>
    </section>
  `;
}

function renderIdeaCard(i) {
  const dirCls = i.up ? 'mo2-idea__dir--up' : 'mo2-idea__dir--down';
  const arrow = i.up ? '▲' : '▼';
  return `
    <div class="mo2-idea" data-ticker="${i.tic}" data-seed="${i.seed}">
      <div class="mo2-idea__img">
        <div class="mo2-idea__chart" data-spark-seed="${i.seed}" data-spark-up="${i.up}"></div>
        <div class="mo2-idea__badges">
          ${avatar(i, 'sm')}
          <span class="mo2-idea__dir ${dirCls}">${arrow}</span>
        </div>
      </div>
      <div class="mo2-idea__text">
        <div class="mo2-idea__title">${i.title}</div>
      </div>
      <div class="mo2-idea__bottom">
        <div>
          <div class="mo2-idea__by">por ${i.author}</div>
          <div class="mo2-idea__date">${i.date}</div>
        </div>
        <div class="mo2-idea__likes"><span class="mo2-idea__heart">♥</span> ${i.likes}</div>
      </div>
    </div>
  `;
}

function renderW2() {
  const cards = IDEAS.map(renderIdeaCard).join('');
  return `
    <section class="mo2-w" id="mo2-ideas">
      ${renderWidgetHead('Ideas de trading', 'https://es.tradingview.com/markets/stocks-spain/ideas/')}
      <div class="mo2-hscroll">
        <div class="mo2-hscroll__inner">
          ${cards}
          <div class="mo2-more-card" data-more="ideas">Ver más ideas →</div>
        </div>
        <button type="button" class="mo2-hscroll__btn" data-dir="right" aria-label="Desplazar a la derecha">›</button>
      </div>
    </section>
  `;
}

function renderRow(r, opts = {}) {
  const cls = chgBadge(r);
  const rightCol = opts.spark
    ? `<div class="mo2-spark" data-spark-seed="${r.seed}" data-spark-up="${r.up}"></div>`
    : `<div class="mo2-row__vol">${r.vol || ''}</div>`;
  const sparkCls = opts.spark ? 'mo2-row mo2-row--spark' : 'mo2-row';
  return `
    <div class="${sparkCls}" data-ticker="${r.tic}">
      ${avatar(r)}
      <div class="mo2-row__name">
        <span class="mo2-row__tic">${r.tic}</span>
        <span class="mo2-row__sub">${r.name}</span>
      </div>
      ${opts.spark ? rightCol : `<div class="mo2-row__price">${r.price}<span class="mo2-row__unit">${r.unit}</span></div>`}
      ${opts.spark ? `<div class="mo2-row__price">${r.price}<span class="mo2-row__unit">${r.unit}</span></div>` : ''}
      <div class="${cls}">${r.chg}</div>
      ${opts.spark ? '' : rightCol}
    </div>
  `;
}

function renderW3W4() {
  const vol = VOLUME.map(r => renderRow(r)).join('');
  const vlt = VOLATILE.map(r => renderRow(r)).join('');
  return `
    <section class="mo2-w mo2-2col" id="mo2-active-volatile">
      <div>
        ${renderWidgetHead('Acciones con el mayor volumen', 'https://es.tradingview.com/markets/stocks-spain/market-movers-active/')}
        <div class="mo2-rows">${vol}</div>
        ${renderFooter('Ver todas las acciones con el mayor volumen →', 'https://es.tradingview.com/markets/stocks-spain/market-movers-active/')}
      </div>
      <div>
        ${renderWidgetHead('Acciones más volátiles', 'https://es.tradingview.com/markets/stocks-spain/market-movers-most-volatile/')}
        <div class="mo2-rows">${vlt}</div>
        ${renderFooter('Ver todas las acciones más volátiles →', 'https://es.tradingview.com/markets/stocks-spain/market-movers-most-volatile/')}
      </div>
    </section>
  `;
}

function renderW5W6() {
  const g = GAINERS.map(r => renderRow(r, { spark: true })).join('');
  const l = LOSERS.map(r => renderRow(r, { spark: true })).join('');
  return `
    <section class="mo2-w mo2-2col" id="mo2-gainers-losers">
      <div>
        ${renderWidgetHead('Acciones ganadoras', 'https://es.tradingview.com/markets/stocks-spain/market-movers-gainers/')}
        <div class="mo2-rows">${g}</div>
        ${renderFooter('Ver todas las acciones que más están subiendo →', 'https://es.tradingview.com/markets/stocks-spain/market-movers-gainers/')}
      </div>
      <div>
        ${renderWidgetHead('Acciones perdedoras', 'https://es.tradingview.com/markets/stocks-spain/market-movers-losers/')}
        <div class="mo2-rows">${l}</div>
        ${renderFooter('Ver todas las acciones que más están bajando →', 'https://es.tradingview.com/markets/stocks-spain/market-movers-losers/')}
      </div>
    </section>
  `;
}

function renderEarningsCard(e) {
  return `
    <div class="mo2-earn" data-ticker="${e.tic}">
      <div class="mo2-earn__top">
        ${avatar(e, 'lg')}
        <div class="mo2-earn__name">
          <span class="mo2-earn__tic">${e.tic}</span>
          <span class="mo2-earn__sub">${e.name}</span>
        </div>
      </div>
      <div class="mo2-earn__date">${e.date}</div>
      <div class="mo2-earn__eps">BPA estimado: ${e.eps}</div>
    </div>
  `;
}

function renderW7() {
  const cards = EARNINGS.map(renderEarningsCard).join('');
  return `
    <section class="mo2-w" id="mo2-earnings">
      ${renderWidgetHead('Calendario de beneficios', 'https://es.tradingview.com/earnings-calendar/')}
      <div class="mo2-hscroll">
        <div class="mo2-hscroll__inner">
          ${cards}
          <div class="mo2-more-card" style="flex:0 0 305px; height:156px;" data-more="earnings">Ver más →</div>
        </div>
        <button type="button" class="mo2-hscroll__btn" data-dir="right" aria-label="Desplazar a la derecha">›</button>
      </div>
      ${renderFooter('Ver el calendario de beneficios completo →', 'https://es.tradingview.com/earnings-calendar/')}
    </section>
  `;
}

function renderW8() {
  return `
    <section class="mo2-w" id="mo2-ipo">
      ${renderWidgetHead('Calendario de las OPV', 'https://es.tradingview.com/ipo-calendar/')}
      <div class="mo2-empty">
        <div class="mo2-empty__icon">📅</div>
        <div>Ningún informe programado</div>
      </div>
      ${renderFooter('Ver el calendario de las OPV completo →', 'https://es.tradingview.com/ipo-calendar/')}
    </section>
  `;
}

function renderNewsCard(n) {
  return `
    <a class="mo2-news" href="https://es.tradingview.com/markets/stocks-spain/news/" target="_blank" rel="noopener">
      ${avatar(n, 'sm')}
      <div class="mo2-news__text">
        <span class="mo2-news__title">${n.title}</span>
        <span class="mo2-news__meta">${n.src}<span class="mo2-news__sep">·</span>${n.date}</span>
      </div>
    </a>
  `;
}

function renderW9() {
  const items = NEWS.map(renderNewsCard).join('');
  return `
    <section class="mo2-w" id="mo2-news">
      ${renderWidgetHead('Noticias sobre acciones españolas', 'https://es.tradingview.com/markets/stocks-spain/news/')}
      <div class="mo2-newsgrid">${items}</div>
      ${renderFooter('Ver más →', 'https://es.tradingview.com/markets/stocks-spain/news/')}
    </section>
  `;
}

/* ---------------------------------------------------------------- */
/* Sparkline mounter                                                */
/* ---------------------------------------------------------------- */
function mountSparkline(el) {
  const seed = parseInt(el.dataset.sparkSeed, 10) || 1;
  const up = el.dataset.sparkUp === 'true';
  const color = up ? '#22ab94' : '#f7525f';

  try {
    const chart = createChart(el, {
      width: el.clientWidth || 100,
      height: el.clientHeight || 36,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: 'transparent' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const data = generateSparkline(seed, up);
    series.setData(data);
    chart.timeScale().fitContent();
  } catch (e) {
    // noop — sparkline failure shouldn't break section
  }
}

/* ---------------------------------------------------------------- */
/* Public render                                                    */
/* ---------------------------------------------------------------- */
export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const s = document.createElement('style');
    s.id = 'sec-2-css';
    s.textContent = CSS;
    document.head.appendChild(s);
    _cssInjected = true;
  }

  container.innerHTML = `
    <section class="mo2-sec mo2-sec--spanish">
      ${renderHeader()}
      ${renderW1()}
      ${renderW2()}
      ${renderW3W4()}
      ${renderW5W6()}
      ${renderW7()}
      ${renderW8()}
      ${renderW9()}
    </section>
  `;

  // Mount sparklines for gainers/losers and idea card thumbnails
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-spark-seed]').forEach(mountSparkline);
  });

  // Horizontal scroll buttons
  container.querySelectorAll('.mo2-hscroll').forEach(scroller => {
    const inner = scroller.querySelector('.mo2-hscroll__inner');
    const btn = scroller.querySelector('.mo2-hscroll__btn');
    if (btn && inner) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        inner.scrollBy({ left: inner.clientWidth * 0.8, behavior: 'smooth' });
      });
    }
  });

  // Ticker click → onSelectSymbol
  container.querySelectorAll('[data-ticker]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (typeof ctx.onSelectSymbol === 'function') {
        ctx.onSelectSymbol(el.dataset.ticker);
      }
    });
  });
}

export default { render };
