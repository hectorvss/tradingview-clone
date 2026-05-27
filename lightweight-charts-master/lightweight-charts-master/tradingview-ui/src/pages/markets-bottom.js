// /markets — mitad INFERIOR (Agent B2). Figma 25:223621 (sections con y >= 9975):
// Asset base path (Vite serves /src/pages/markets-assets/* via dynamic import URL).
import worldMapPng from './markets-assets/mkb-worldmap.png';
import worldLegendPng from './markets-assets/mkb-worldlegend.png';
import yieldChartPng from './markets-assets/mkb-chart-yield.png';
import forexChartPng from './markets-assets/mkb-chart-forex.png';
import etfChartPng from './markets-assets/mkb-chart-etf.png';
import econChartPng from './markets-assets/mkb-chart-econ.png';
const SECTION_CHART_PNG = { forex: forexChartPng, etf: etfChartPng, econ: econChartPng };
//
//   25:217304  Forex y divisas
//   25:218156  Bonos de deuda pública
//   25:218636  Bonos corporativos
//   25:219603  ETFs
//   25:221164  Economía
// Exporta renderMarketsBottom(mount). Estilos en markets.css con prefijo .mkb-.

export function renderMarketsBottom(mount) {
  mount.innerHTML = `
    <div class="mkb-root">
      ${forexSection()}
      ${govBondsSection()}
      ${corpBondsSection()}
      ${etfsSection()}
      ${economySection()}
    </div>
  `;
  wireSparklines(mount);
}

// ---------------------------------------------------------------------------
// Common partials
// ---------------------------------------------------------------------------
const arrow = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;
const chev = `<svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 3 L9 7 L5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chevR = `<svg width="18" height="18" viewBox="0 0 18 18"><path d="M7 4 L11 9 L7 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function sectionHeader(title, sub = '') {
  return `
    <div class="mkb-secHead">
      <h2 class="mkb-secTitle">${title} <span class="mkb-secChev">${chev}</span></h2>
      ${sub ? `<div class="mkb-secSub">${sub} <span class="mkb-secChev">${chev}</span></div>` : ''}
    </div>`;
}

function viewAllLink(label) {
  return `<a class="mkb-viewAll" href="#">${label} <span>${chev}</span></a>`;
}

function flagSvg(country) {
  const f = {
    us:  `<rect width="24" height="24" rx="12" fill="#b22234"/><rect x="0" y="3" width="24" height="2" fill="#fff"/><rect x="0" y="7" width="24" height="2" fill="#fff"/><rect x="0" y="11" width="24" height="2" fill="#fff"/><rect x="0" y="15" width="24" height="2" fill="#fff"/><rect x="0" y="19" width="24" height="2" fill="#fff"/><rect x="0" y="0" width="10" height="11" fill="#3c3b6e"/>`,
    eu:  `<rect width="24" height="24" rx="12" fill="#003399"/><circle cx="12" cy="12" r="5" fill="none" stroke="#ffcc00" stroke-width="0.8" stroke-dasharray="0.7 1.3"/>`,
    jp:  `<rect width="24" height="24" rx="12" fill="#fff"/><circle cx="12" cy="12" r="6" fill="#bc002d"/>`,
    gb:  `<rect width="24" height="24" rx="12" fill="#012169"/><path d="M0 0 L24 24 M24 0 L0 24" stroke="#fff" stroke-width="3"/><path d="M12 0 V24 M0 12 H24" stroke="#fff" stroke-width="5"/><path d="M12 0 V24 M0 12 H24" stroke="#c8102e" stroke-width="3"/>`,
    ch:  `<rect width="24" height="24" rx="12" fill="#d52b1e"/><rect x="10" y="5" width="4" height="14" fill="#fff"/><rect x="5" y="10" width="14" height="4" fill="#fff"/>`,
    ca:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="7" height="24" fill="#d52b1e"/><rect x="17" width="7" height="24" fill="#d52b1e"/><path d="M12 7 L13 10 L16 10 L13.5 12 L14.5 15 L12 13.2 L9.5 15 L10.5 12 L8 10 L11 10 Z" fill="#d52b1e"/>`,
    au:  `<rect width="24" height="24" rx="12" fill="#012169"/><rect width="12" height="12" fill="#012169"/><path d="M0 0 L12 12 M12 0 L0 12" stroke="#fff" stroke-width="1.4"/><path d="M6 0 V12 M0 6 H12" stroke="#fff" stroke-width="2.2"/><path d="M6 0 V12 M0 6 H12" stroke="#c8102e" stroke-width="1.4"/><circle cx="18" cy="17" r="1.3" fill="#fff"/><circle cx="20" cy="13" r="1" fill="#fff"/><circle cx="16" cy="20" r="0.9" fill="#fff"/>`,
    es:  `<rect width="24" height="24" rx="12" fill="#aa151b"/><rect y="6" width="24" height="12" fill="#f1bf00"/>`,
    de:  `<rect width="24" height="24" rx="12" fill="#000"/><rect y="8" width="24" height="8" fill="#dd0000"/><rect y="16" width="24" height="8" fill="#ffce00"/>`,
    fr:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="8" height="24" fill="#002395"/><rect x="16" width="8" height="24" fill="#ed2939"/>`,
    it:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="8" height="24" fill="#008c45"/><rect x="16" width="8" height="24" fill="#cd212a"/>`,
    cn:  `<rect width="24" height="24" rx="12" fill="#de2910"/><path d="M6 6 L7 8 L9 7.5 L7.5 9 L8 11 L6 9.8 L4 11 L4.5 9 L3 7.5 L5 8 Z" fill="#ffde00"/>`,
    in:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="24" height="8" fill="#ff9933"/><rect y="16" width="24" height="8" fill="#138808"/><circle cx="12" cy="12" r="2.2" fill="none" stroke="#000080" stroke-width="0.6"/>`,
    ru:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect y="8" width="24" height="8" fill="#0039a6"/><rect y="16" width="24" height="8" fill="#d52b1e"/>`,
    mx:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="8" height="24" fill="#006847"/><rect x="16" width="8" height="24" fill="#ce1126"/>`,
    ie:  `<rect width="24" height="24" rx="12" fill="#fff"/><rect width="8" height="24" fill="#169b62"/><rect x="16" width="8" height="24" fill="#ff883e"/>`,
  };
  return `<svg viewBox="0 0 24 24" class="mkb-flag">${f[country] || `<rect width="24" height="24" rx="12" fill="#444"/>`}</svg>`;
}

function letterIcon(letter, color) {
  return `<span class="mkb-licon" style="background:${color}">${letter}</span>`;
}

// ---------------------------------------------------------------------------
// 1) FOREX Y DIVISAS  (25:217304)
// ---------------------------------------------------------------------------
function forexSection() {
  const cards = [
    { sel: true,  flag: '',         label: 'USD a EUR', price: '0,8593', unit: 'EUR', chg: '+0,06%', pos: true,  flags: ['us'] },
    { flag: '',   label: 'JPY a EUR', price: '0,0053975', unit: 'EUR', chg: '-0,16%', pos: false, flags: ['jp'] },
    { flag: '',   label: 'GBP a EUR', price: '1,1575', unit: 'EUR', chg: '-0,19%', pos: false, flags: ['gb'] },
    { flag: '',   label: 'CHF a EUR', price: '1,0948', unit: 'EUR', chg: '-0,16%', pos: false, flags: ['ch'] },
  ];
  const princ = [
    ['us','EUR a USD','EURUSD','1,16349','USD','-0,03%'],
    ['us','USD a JPY','USDJPY','159,212','JPY','+0,19%'],
    ['gb','GBP a USD','GBPUSD','1,3473','USD','-0,20%'],
    ['au','AUD a USD','AUDUSD','0,71623','USD','-0,11%'],
    ['ca','USD a CAD','USDCAD','1,38026','CAD','+0,01%'],
    ['us','USD a CHF','USDCHF','0,78464','CHF','+0,26%'],
  ];
  const indices = [
    ['$','#0d47a1','Índice del dólar estadounidense','DXY','116,02','USD','+0,08%'],
    ['€','#1565c0','Índice del euro','EXY','116,02','USD','-0,13%'],
    ['¥','#22ab94','Índice del yen japonés','JXY','62,81','USD','-0,17%'],
    ['£','#6a1b9a','Libra esterlina','BXY','134,31','USD','-0,02%'],
    ['F','#ef5350','Franco suizo','SXY','127,40','USD','+0,27%'],
    ['C$','#ff9800','Dólar canadiense','CXY','72,36','USD','-0,32%'],
  ];
  return `
  <section class="mkb-section mkb-forex">
    ${sectionHeader('Forex y divisas')}
    <div class="mkb-cardRow">
      ${cards.map((c,i)=>`
        <div class="mkb-quoteCard ${c.sel?'is-sel':''}">
          ${flagSvg(c.flags[0])}
          <div class="mkb-qcBody">
            <div class="mkb-qcLabel">${c.label}</div>
            <div class="mkb-qcPrice">${c.price} <span class="mkb-qcUnit">${c.unit}</span> <span class="${c.pos?'mkb-pos':'mkb-neg'}">${c.chg}</span></div>
          </div>
        </div>`).join('')}
      <button class="mkb-cardNext" aria-label="next">${chevR}</button>
    </div>
    <div class="mkb-chartWrap" data-spark="forex"></div>
    <div class="mkb-chartCtl">
      <div class="mkb-tfRow">
        ${['1D','1M','3M','1A','5A','Todos'].map(t=>`<button class="mkb-tf ${t==='1A'?'is-on':''}">${t}</button>`).join('')}
      </div>
      <div class="mkb-chartTools">
        <button class="mkb-iconBtn"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8 L6 11 L13 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button>
        <button class="mkb-iconBtn is-on"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 12 L5 8 L8 10 L14 3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <button class="mkb-iconBtn"><svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="6" width="2" height="6" fill="currentColor"/><rect x="7" y="3" width="2" height="9" fill="currentColor"/><rect x="11" y="8" width="2" height="4" fill="currentColor"/></svg></button>
        <button class="mkb-iconBtn"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3 H7 V5 H5 V7 H3 Z M9 3 H13 V7 H11 V5 H9 Z M3 9 H5 V11 H7 V13 H3 Z M11 9 H13 V13 H9 V11 H11 Z" fill="currentColor"/></svg></button>
      </div>
    </div>

    <div class="mkb-twoCol">
      <div>
        ${sectionHeader('Principales')}
        ${tableHeader(['SÍMBOLO','PRECIO Y CAMBIO',''])}
        <div class="mkb-rowList">
          ${princ.map(([fl,name,sym,price,unit,chg])=>quoteRow(fl,name,sym,price,unit,chg)).join('')}
        </div>
        ${viewAllLink('Ver todos los pares principales')}
      </div>
      <div>
        ${sectionHeader('Índices de divisas')}
        ${tableHeader(['SÍMBOLO','PRECIO Y CAMBIO',''])}
        <div class="mkb-rowList">
          ${indices.map(([l,c,name,sym,price,unit,chg])=>`
            <div class="mkb-qRow">
              ${letterIcon(l,c)}
              <div class="mkb-qRowName"><div class="mkb-qRowTitle">${name}</div><span class="mkb-tag">${sym}</span></div>
              <div class="mkb-qRowPrice">${price} <span class="mkb-unit">${unit}</span></div>
              <div class="mkb-qRowChg ${chg.startsWith('+')?'mkb-pos':'mkb-neg'}">${chg}</div>
            </div>`).join('')}
        </div>
        ${viewAllLink('Ver todos los índices de divisas')}
      </div>
    </div>
  </section>`;
}

function quoteRow(flag, name, sym, price, unit, chg) {
  return `
    <div class="mkb-qRow">
      ${flagSvg(flag)}
      <div class="mkb-qRowName"><div class="mkb-qRowTitle">${name}</div><span class="mkb-tag">${sym}</span></div>
      <div class="mkb-qRowPrice">${price} <span class="mkb-unit">${unit}</span></div>
      <div class="mkb-qRowChg ${chg.startsWith('+')?'mkb-pos':'mkb-neg'}">${chg}</div>
    </div>`;
}

function tableHeader(cols) {
  return `<div class="mkb-tableHead">${cols.map(c=>`<span>${c}</span>`).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// 2) BONOS DE DEUDA PÚBLICA (25:218156)
// ---------------------------------------------------------------------------
function govBondsSection() {
  const esp = [
    ['3 meses','ES03MY','99,550%','-0,02%','2,287%'],
    ['6 meses','ES06MY','98,924%','-0,04%','2,417%'],
    ['1 año','ES01Y','97,845%','-0,04%','2,508%'],
    ['2 años','ES02Y','99,510%','-0,11%','2,656%'],
    ['10 años','ES10Y','99,072%','-0,36%','3,412%'],
    ['30 años','ES30Y','96,304%','-0,59%','4,167%'],
  ];
  const main = [
    ['es','España','ES10Y','99,072%','-0,36%','3,412%'],
    ['us','EE. UU.','US10Y','98,910%','+0,35%','4,512%'],
    ['eu','Unión Europea','EU10Y','99,316%','-0,37%','2,980%'],
    ['gb','Reino Unido','GB10Y','99,091%','+0,29%','4,871%'],
    ['de','Alemania','DE10Y','99,316%','-0,37%','2,980%'],
    ['fr','Francia','FR10Y','80,081%','-0,41%','3,667%'],
  ];
  const yieldCurve = [
    { c:'#1e88e5', label:'España',          data:[2.0,2.3,2.5,2.6,2.7,2.8,2.9,3.0,3.1,3.2,3.4,3.6,3.8,3.9,4.0] },
    { c:'#ef5350', label:'EE. UU.',         data:[3.9,3.8,3.8,3.8,3.85,3.9,3.95,4.0,4.05,4.1,4.15,4.2,4.25,4.3,4.3] },
    { c:'#ff9800', label:'Reino Unido',     data:[3.8,3.9,4.0,4.1,4.3,4.5,4.7,4.8,5.0,5.1,5.2,5.3,5.4,5.5,5.5] },
    { c:'#43a047', label:'Alemania',        data:[3.0,3.2,3.4,3.5,3.6,3.7,3.8,3.9,4.0,4.1,4.3,4.5,4.7,4.9,5.0] },
    { c:'#5b9cf6', label:'Francia',         data:[2.8,2.9,3.0,3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9,3.95,4.0,4.05] },
    { c:'#c62828', label:'Italia',          data:[2.5,2.7,2.9,3.1,3.3,3.5,3.6,3.7,3.8,3.85,3.9,3.95,4.0,4.05,4.1] },
    { c:'#26c6da', label:'Canadá',          data:[2.2,2.4,2.55,2.7,2.85,3.0,3.1,3.2,3.3,3.4,3.5,3.55,3.6,3.6,3.6] },
    { c:'#ec407a', label:'Japón',           data:[0.9,1.4,1.8,2.1,2.4,2.7,2.9,3.1,3.3,3.5,3.7,3.85,3.9,3.95,4.0] },
    { c:'#90caf9', label:'China continental',data:[1.0,1.2,1.4,1.5,1.7,1.8,1.9,2.0,2.0,2.05,2.1,2.1,2.15,2.15,2.2] },
  ];
  return `
  <section class="mkb-section">
    ${sectionHeader('Bonos de deuda pública')}
    <div class="mkb-yieldBox">
      <div class="mkb-yieldHead">
        <h3 class="mkb-subTitle">Curva de rendimiento <span class="mkb-secChev">${chev}</span></h3>
        <div class="mkb-search"><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor"/><path d="M9.5 9.5 L13 13" stroke="currentColor" stroke-linecap="round"/></svg> Buscar país</div>
      </div>
      <div class="mkb-yieldChart" data-yield='${JSON.stringify(yieldCurve)}'></div>
      <div class="mkb-yieldLegend">
        ${yieldCurve.map(s=>`<span class="mkb-legend"><i style="background:${s.c}"></i>${s.label}</span>`).join('')}
      </div>
    </div>
    <div class="mkb-twoCol">
      <div>
        ${sectionHeader('Bonos españoles')}
        ${tableHeader(['SÍMBOLO','PRECIO Y CAMBIO','RENDIMIENTO'])}
        <div class="mkb-rowList">
          ${esp.map(([name,sym,price,chg,yld])=>bondRow('es',name,sym,price,chg,yld)).join('')}
        </div>
        ${viewAllLink('Ver todo Bonos españoles')}
      </div>
      <div>
        ${sectionHeader('Principales bonos a 10A')}
        ${tableHeader(['SÍMBOLO','PRECIO Y CAMBIO','RENDIMIENTO'])}
        <div class="mkb-rowList">
          ${main.map(([fl,name,sym,price,chg,yld])=>bondRow(fl,name,sym,price,chg,yld)).join('')}
        </div>
        ${viewAllLink('Ver los principales bonos a 10A')}
      </div>
    </div>
  </section>`;
}

function bondRow(flag, name, sym, price, chg, yld) {
  return `
    <div class="mkb-bRow">
      ${flagSvg(flag)}
      <div class="mkb-qRowName"><div class="mkb-qRowTitle">${name}</div><span class="mkb-tag">${sym}</span></div>
      <div class="mkb-qRowPrice">${price}</div>
      <div class="mkb-qRowChg ${chg.startsWith('+')?'mkb-pos':'mkb-neg'}">${chg}</div>
      <div class="mkb-bYield">${yld}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// 3) BONOS CORPORATIVOS (25:218636)
// ---------------------------------------------------------------------------
function corpBondsSection() {
  const cards = [
    { sel:true,  ic:['T','#222'],  sym:'US40049JBC09', body:'Grupo Televisa, S.A.B. 6.125% 31-JAN-2046', vto:'31 ene 2046', cup:'6,13% (Fijo)' },
    { ic:['P','#5b9cf6'],          sym:'PEMX5055132',  body:'Petroleos Mexicanos 6.95% 28-JAN-2060',     vto:'28 ene 2060', cup:'6,95% (Fijo)' },
    { ic:['P','#5b9cf6'],          sym:'US71654QDD16', body:'Petroleos Mexicanos 7.69% 23-JAN-2050',     vto:'23 ene 2050', cup:'7,69% (Fijo)' },
    { ic:['T','#222'],             sym:'TV4837441',    body:'Grupo Televisa, S.A.B. 5.25% 24-MAY-2049',  vto:'24 may 2049', cup:'5,25% (Fijo)' },
  ];
  const shortTerm = [
    ['#fdd835','P','PACCAR Financial Corp. 4.5% 25-NOV-2026','PCAR5942864','3,88%','25 nov 2026'],
    ['#e0e3eb','S','State Street Bank and Trust Company 4.594% 25','STT5945591','3,85%','25 nov 2026'],
    ['#43a047','C','Commonwealth Bank of Australia, New York Bra','CBAU5945370','3,99%','27 nov 2026'],
    ['#5b9cf6','D','DTE Electric Company 4.85% 01-DEC-2026','DTE5757411','3,99%','1 dic 2026'],
    ['#ef5350','A','ANZ Banking Group Ltd. (New York Branch) 4.42','ANZ5958333','4,15%','16 dic 2026'],
    ['#1e88e5','TD','Toronto-Dominion Bank 4.568% 17-DEC-2026','TD5958208','4,04%','17 dic 2026'],
  ];
  const longTerm = [
    ['#1e88e5','N','Norfolk Southern Corporation 4.1% 15-MAY-2121','US655844CJ5','5,94%','15 may 2121'],
    ['#1e88e5','N','Norfolk Southern Corporation 5.1% 01-AUG-211','NFSE','5,93%','1 ago 2118'],
    ['#43a047','C','Canadian Pacific Railway Company 6.125% 15-S','US13645RAX2','5,96%','15 sept 2115'],
    ['#ef5350','E','Electricite de France, Societe Anonyme 6.0% 22-','ELEN','6,38%','22 ene 2114'],
    ['#fdd835','R','Cooperatieve Rabobank U.A. 5.8% 30-SEP-2110','RABO.WL','5,93%','30 sept 2110'],
    ['#ef5350','C','Cummins Inc. 5.65% 01-MAR-2098','CMI3671567','6,12%','1 mar 2098'],
  ];
  const variable = [
    ['#5b9cf6','M','MetLife, Inc. 10.75% 01-AUG-2039','MET.IS','—','10,75%'],
    ['#1e88e5','C','Credit Suisse Group AG 9.016% 15-NOV-2033','CS5501682','—','9,02%'],
    ['#1e88e5','C','Credit Suisse Group AG 9.016% 15-NOV-2033','US225401BB3','—','9,02%'],
    ['#ef5350','S','Bank of Nova Scotia 8.625% 27-OCT-2082','BNS5491221','—','8,63%'],
    ['#fdd835','E','Enbridge Inc. 8.5% 15-JAN-2084','US29250NBT19','—','8,50%'],
    ['#222','M','Magellan Capital Holdings PLC 8.375% 08-JUL-','XS285296650','—','8,38%'],
  ];
  const fixed = [
    ['#43a047','V','Valero Energy Corporation 10.5% 15-MAR-2039','VLO.IF','5,59%','10,50%'],
    ['#ef5350','M','Altria Group, Inc. 10.2% 06-FEB-2039','MO.HH','6,01%','10,20%'],
    ['#5b9cf6','P','Petroleos Mexicanos 10.0% 07-FEB-2033','PEMX5666477','6,93%','10,00%'],
    ['#1e88e5','F','Ford Motor Company 9.98% 15-FEB-2047','F.GU','7,23%','9,98%'],
    ['#fdd835','A','Altria Group, Inc. 9.95% 10-NOV-2038','MO.HA','6,03%','9,95%'],
    ['#ef5350','A','ACE Capital Trust II 9.7 % 2000-1.4.30 Gtd','ACE.GD','4,80%','9,70%'],
  ];

  return `
  <section class="mkb-section">
    ${sectionHeader('Bonos corporativos')}
    <div class="mkb-cardRow">
      ${cards.map(c=>`
        <div class="mkb-corpCard ${c.sel?'is-sel':''}">
          ${letterIcon(c.ic[0],c.ic[1])}
          <div class="mkb-ccBody">
            <div class="mkb-ccTitle">${c.sym}</div>
            <div class="mkb-ccDesc">${c.body}</div>
            <div class="mkb-ccMeta"><span>Fecha de vencimiento</span><span>${c.vto}</span></div>
            <div class="mkb-ccMeta"><span>Cupón</span><span>${c.cup}</span></div>
          </div>
        </div>`).join('')}
      <button class="mkb-cardNext" aria-label="next">${chevR}</button>
    </div>

    <div class="mkb-twoCol">
      ${corpCol('Corto plazo', shortTerm, 'RENDIMIENTO AL VENCIMIENTO','FECHA DE VENCIMIENTO','Ver todos los bonos a corto plazo')}
      ${corpCol('Largo plazo', longTerm, 'RENDIMIENTO AL VENCIMIENTO','FECHA DE VENCIMIENTO','Ver todos los bonos con vencimiento a largo plazo')}
    </div>
    <div class="mkb-twoCol">
      ${corpCol('Tipo variable', variable, 'RENDIMIENTO AL VENCIMIENTO','CUPÓN','Ver todos los bonos con tipo de interés variable')}
      ${corpCol('Tipo fijo', fixed, 'RENDIMIENTO AL VENCIMIENTO','CUPÓN','Ver todos los bonos con cupón fijo')}
    </div>
  </section>`;
}

function corpCol(title, rows, h2, h3, viewAll) {
  return `
    <div>
      ${sectionHeader(title)}
      ${tableHeader(['SÍMBOLO', h2, h3])}
      <div class="mkb-rowList">
        ${rows.map(([col,l,name,sym,a,b])=>`
          <div class="mkb-cRow">
            ${letterIcon(l,col)}
            <div class="mkb-qRowName"><div class="mkb-qRowTitle">${name}</div><span class="mkb-tag">${sym}</span></div>
            <div class="mkb-cVal">${a}</div>
            <div class="mkb-cVal">${b}</div>
          </div>`).join('')}
      </div>
      ${viewAllLink(viewAll)}
    </div>`;
}

// ---------------------------------------------------------------------------
// 4) ETFs (25:219603)
// ---------------------------------------------------------------------------
function etfsSection() {
  const cards = [
    { sel:true,  ic:['S','#222'],   sym:'State Street SPDR S&P 500 E', price:'745,64 USD', chg:'+0,39%', pos:true },
    { ic:['I','#5b9cf6'],           sym:'iShares Bitcoin Trust ETF',   price:'42,96 USD',  chg:'-2,36%', pos:false },
    { ic:['V','#43a047'],           sym:'Vanguard Total Stock Market', price:'366,79 USD', chg:'+0,47%', pos:true },
    { ic:['I','#5b9cf6'],           sym:'Invesco QQQ Trust Series',    price:'717,54 USD', chg:'+0,42%', pos:true },
  ];
  const trends = [
    ['#5b9cf6','D','Direxion Daily South Korea Bull 3X ETF','780,135 USD','-6,99%',false],
    ['#fdd835','T','Tema Space Innovators ETF','38,76 USD','+6,13%',true],
    ['#222','S','State Street SPDR Dow Jones Indust','506,12 USD','+0,60%',true],
    ['#43a047','U','United States Oil Fund','140,92 USD','-1,14%',false],
    ['#ef5350','R','Roundhill Memory ETF','52,82 USD','-2,80%',false],
  ];
  const most = [
    ['#222','S','State Street SPDR','SPY','745,64','+0,39%',true],
    ['#5b9cf6','I','Invesco QQQ Trust','QQQ','717,54','+0,42%',true],
    ['#ef5350','D','Direxion Daily Sem','SOXL','190,56','+6,82%',true],
    ['#5b9cf6','I','iShares Russell 20','IWM','285,12','+0,93%',true],
    ['#43a047','P','ProShares UltraPro','TQQQ','77,84','+1,16%',true],
    ['#1e88e5','V','VanEck Semicondu','SMH','576,32','+1,49%',true],
  ];
  const aum = [
    ['#000','T','Tradr 2X Long AXTI','AXTX','73,02','+32,55%',true],
    ['#222','C','Corgi Lithography &','EUV','27,51','+2,08%',true],
    ['#5b9cf6','A','AllianzIM U.S. Equit','MAYT','38,78','+0,10%',true],
    ['#43a047','J','John Hancock Disci','JDVI','38,88','-0,56%',false],
    ['#fdd835','G','GraniteShares 2x Lo','QCML','35,72','+23,34%',true],
    ['#222','A','AllianzIM U.S. Equit','MAYW','34,65','+0,10%',true],
  ];
  const profit = [
    ['#fdd835','S','NH -Amundi HANARO K-Semiconductor ETF','395270','67.270 KRW','+8,58%',true,'567,68%'],
    ['#000','TE','Mirae Asset Tiger IT ETF','139260','163.530 KRW','+5,74%',true,'510,76%'],
    ['#000','TE','Csop Sk Hynix Daily 2X Leveraged Product I','7709','108,60 HKD','+11,94%',true,'498,61%'],
    ['#ef5350','O','SAMSUNG KODEX Al Electric Power Core F','487240','54.565 KRW','-0,95%',false,'487,49%'],
    ['#000','TE','MIRAE ASSET TIGER SEMICON ETF','091230','168.925 KRW','+3,53%',true,'422,91%'],
    ['#fdd835','O','Samsung KODEX Semicon ETF','091160','162.660 KRW','+4,60%',true,'411,61%'],
  ];
  const yieldR = [
    ['#222','TS','GraniteShares YieldBOOST TSLA ETF','TSYY','3,06','-0,33%',false,'265,16%'],
    ['#000','TE','YieldMax MSTR Option Income Strategy ETF','MSTY','22,72','-2,61%',false,'218,06%'],
    ['#000','TE','YieldMax COIN Option Income Strategy ETF','CONY','24,58','-4,02%',false,'196,54%'],
    ['#fdd835','A','YieldMax SMCI Option Income Strategy ETF','SMCY','6,57','+3,30%',true,'186,16%'],
    ['#ef5350','R','Roundhill HOOD WeeklyPay ETF','HOOW','21,77','-3,59%',false,'180,25%'],
    ['#ef5350','R','Roundhill PLTR WeeklyPay ETF','PLTW','21,53','-0,60%',false,'127,58%'],
  ];

  return `
  <section class="mkb-section">
    ${sectionHeader('ETFs')}
    <div class="mkb-cardRow">
      ${cards.map(c=>`
        <div class="mkb-quoteCard ${c.sel?'is-sel':''}">
          ${letterIcon(c.ic[0],c.ic[1])}
          <div class="mkb-qcBody">
            <div class="mkb-qcLabel">${c.sym}</div>
            <div class="mkb-qcPrice">${c.price.split(' ')[0]} <span class="mkb-qcUnit">${c.price.split(' ')[1]||''}</span> <span class="${c.pos?'mkb-pos':'mkb-neg'}">${c.chg}</span></div>
          </div>
        </div>`).join('')}
      <button class="mkb-cardNext" aria-label="next">${chevR}</button>
    </div>
    <div class="mkb-chartWrap" data-spark="etf"></div>
    <div class="mkb-chartCtl">
      <div class="mkb-tfRow">
        ${['1D','1M','3M','1A','5A','Todos'].map(t=>`<button class="mkb-tf ${t==='1D'?'is-on':''}">${t}</button>`).join('')}
      </div>
      <div class="mkb-chartTools">
        <button class="mkb-iconBtn"></button>
        <button class="mkb-iconBtn is-on"></button>
        <button class="mkb-iconBtn"></button>
      </div>
    </div>

    <h3 class="mkb-subTitle">Tendencias de la comunidad <span class="mkb-secChev">${chev}</span></h3>
    <div class="mkb-trendRow">
      ${trends.map(([c,l,name,price,chg,pos])=>`
        <div class="mkb-trendCard">
          ${letterIcon(l,c)}
          <div class="mkb-tcBody">
            <div class="mkb-tcName">${name}</div>
            <div class="mkb-tcPrice">${price}</div>
            <div class="mkb-tcChg ${pos?'mkb-pos':'mkb-neg'}">${chg}</div>
          </div>
        </div>`).join('')}
      <button class="mkb-cardNext" aria-label="next">${chevR}</button>
    </div>

    <div class="mkb-twoCol">
      ${etfCol('Más negociados', most, 'PRECIO Y CAMBIO','','Ver todos los fondos más negociados')}
      ${etfCol('Mayor crecimiento activos gestionados (AUM)', aum, 'PRECIO Y CAMBIO','','Ver todos los fondos con mayor crecimiento en activos gestionados')}
    </div>
    <div class="mkb-twoCol">
      ${etfCol('Mayor rentabilidad', profit, 'PRECIO Y CAMBIO','RENTABILIDAD TOTAL ACUMULATIVA 1 AÑO','Ver todos los fondos de mayor rentabilidad', true)}
      ${etfCol('Rentabilidades por dividendo más altas', yieldR, 'PRECIO Y CAMBIO','RENTABILIDAD POR DIVIDENDO','Ver todos los fondos de alto dividendo', true)}
    </div>
  </section>`;
}

function etfCol(title, rows, h2, h3, viewAll, fourCol = false) {
  return `
    <div>
      ${sectionHeader(title)}
      ${tableHeader(['SÍMBOLO', h2, ...(h3?[h3]:[])])}
      <div class="mkb-rowList">
        ${rows.map(r=>{
          const [col,l,name,sym,price,chg,pos,extra]=r;
          return `
          <div class="mkb-eRow ${fourCol?'mkb-eRow4':''}">
            ${letterIcon(l,col)}
            <div class="mkb-qRowName"><div class="mkb-qRowTitle">${name}</div><span class="mkb-tag">${sym}</span></div>
            <div class="mkb-qRowPrice">${price}</div>
            <div class="mkb-qRowChg ${pos?'mkb-pos':'mkb-neg'}">${chg}</div>
            ${extra?`<div class="mkb-cVal">${extra}</div>`:''}
          </div>`;
        }).join('')}
      </div>
      ${viewAllLink(viewAll)}
    </div>`;
}

// ---------------------------------------------------------------------------
// 5) ECONOMÍA (25:221164)
// ---------------------------------------------------------------------------
function economySection() {
  const cards = [
    { sel:true, flag:'es', label:'PIB de España', price:'1,72 T', unit:'USD' },
    { flag:'es', label:'Crecimiento del PIB de España', price:'2,8', unit:'%' },
    { flag:'es', label:'PIB real de España', price:'434,6 B', unit:'EUR' },
    { flag:'es', label:'Tipo de interés de España', price:'2,15', unit:'%' },
  ];
  // heatmap data: rows = countries, cols = metrics — verbatim Figma 25:221164
  const heatRows = [
    ['us','EE. UU.',     ['29,18 T USD','2,7 %','-5,9 % del PIB','123,3 % del PIB','3,75 %','3,8 %','4,3 %','-3,6 % del PIB']],
    ['cn','China continental',['18,74 T USD','5 %','-6,5 % del PIB','99,2 % del PIB','3 %','1,2 %','5,2 %','3,3 % del PIB']],
    ['eu','UE',          ['16,41 T USD','0,8 %','-2,9 % del PIB','87,8 % del PIB','2,15 %','3 %','6,2 %','1,7 % del PIB']],
    ['de','Alemania',    ['4,66 T USD','0,4 %','-2,7 % del PIB','63,5 % del PIB','2,15 %','2,9 %','6,4 %','4,5 % del PIB']],
    ['jp','Japón',       ['4,03 T USD','0,6 %','-2,3 % del PIB','248,7 % del PIB','0,75 %','1,4 %','2,7 %','4,7 % del PIB']],
    ['in','India',       ['3,91 T USD','7,8 %','-4,4 % del PIB','81,92 % del PIB','5,25 %','3,48 %','5,2 %','-0,6 % del PIB']],
    ['gb','Reino Unido', ['3,64 T USD','1,1 %','-4,3 % del PIB','94,3 % del PIB','3,75 %','2,8 %','5 %','-2,4 % del PIB']],
    ['fr','Francia',     ['3,16 T USD','1,1 %','-5,1 % del PIB','115,6 % del PIB','2,15 %','2,2 %','8,1 %','-0,3 % del PIB']],
    ['ru','Rusia',       ['2,17 T USD','-0,2 %','-2,6 % del PIB','18,3 % del PIB','14,5 %','5,6 %','2,2 %','2 % del PIB']],
    ['es','España',      ['1,72 T USD','2,7 %','-2,4 % del PIB','100,7 % del PIB','2,15 %','3,2 %','10,83 %','2,9 % del PIB']],
  ];
  const heatCols = ['PIB','Crecimiento del PIB','Presupuesto sobre PIB','Deuda pública/PIB','Tipo de interés','Tasa de inflación','Tasa de desempleo','Cuenta corriente/PIB'];

  const events = [
    { fl:'it',time:'11:10',name:'12-Year BTP Short Term Auction',cur:'EUR',prev:'2,8%',forc:'',act:'21:20' },
    { fl:'it',time:'11:10',name:'20-Year BTP€i Auction',cur:'EUR',prev:'2,297%',forc:'',act:'21:20' },
    { fl:'it',time:'11:10',name:'5-Year BTP€i Auction',cur:'EUR',prev:'0,97%',forc:'',act:'21:20' },
    { fl:'us',time:'11:30',name:'2037 Bond Auction',cur:'USD',prev:'9,035%',forc:'',act:'' },
  ];

  return `
  <section class="mkb-section">
    ${sectionHeader('Economía')}
    <div class="mkb-cardRow">
      ${cards.map(c=>`
        <div class="mkb-quoteCard ${c.sel?'is-sel':''}">
          ${flagSvg(c.flag)}
          <div class="mkb-qcBody">
            <div class="mkb-qcLabel">${c.label}</div>
            ${c.price?`<div class="mkb-qcPrice">${c.price} <span class="mkb-qcUnit">${c.unit}</span></div>`:''}
          </div>
        </div>`).join('')}
      <button class="mkb-cardNext" aria-label="next">${chevR}</button>
    </div>
    <div class="mkb-chartWrap" data-spark="econ"></div>
    <div class="mkb-chartCtl">
      <div class="mkb-tfRow"><button class="mkb-tf is-on">10A</button></div>
      <div class="mkb-chartTools"><button class="mkb-iconBtn is-on"></button><button class="mkb-iconBtn"></button></div>
    </div>

    <h3 class="mkb-subTitle">Mapa de calor de indicadores económicos <span class="mkb-secChev">${chev}</span></h3>
    <div class="mkb-heatmap">
      <table>
        <thead>
          <tr><th></th>${heatCols.map(c=>`<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${heatRows.map(([fl,name,vals])=>`
            <tr>
              <td class="mkb-hmCountry">${flagSvg(fl)}<span>${name}</span></td>
              ${vals.map((v,i)=>{
                const cls = heatClass(i,v);
                return `<td class="mkb-hmCell ${cls}">${v}</td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="mkb-subTitle">Mapa mundial de la inflación <span class="mkb-secChev">${chev}</span></h3>
    <div class="mkb-worldMap">
      <img class="mkb-worldImg" src="${worldMapPng}" alt="World inflation map" />
      <img class="mkb-worldLegendImg" src="${worldLegendPng}" alt="Inflation scale" />
    </div>

    <h3 class="mkb-subTitle">Calendario económico <span class="mkb-secChev">${chev}</span></h3>
    <div class="mkb-eventRow">
      ${events.map(e=>`
        <div class="mkb-eventCard">
          ${flagSvg(e.fl)}
          <div class="mkb-evBody">
            <div class="mkb-evTime">${e.time} <span class="mkb-evDot"></span></div>
            <div class="mkb-evName">${e.name}</div>
            <div class="mkb-evMeta">
              <div><div class="mkb-evMetaLabel">Prev.</div><div>${e.prev}</div></div>
              <div><div class="mkb-evMetaLabel">Previsión</div><div>${e.forc||'—'}</div></div>
              <div><div class="mkb-evMetaLabel">Actual</div><div>${e.act||'—'}</div></div>
            </div>
          </div>
        </div>`).join('')}
    </div>
    ${viewAllLink('Ver todos los eventos del mercado')}
  </section>`;
}

// Heatmap coloring heuristic
function heatClass(colIdx, v) {
  const s = String(v);
  if (s === '—') return '';
  // negative red, large positive bright
  if (s.startsWith('-')) return 'mkb-hmRed';
  const num = parseFloat(s.replace(',', '.'));
  if (colIdx === 1 && num >= 5) return 'mkb-hmTeal';
  if (colIdx === 4 && num >= 5) return 'mkb-hmTeal';
  if (colIdx === 5 && num >= 4) return 'mkb-hmOrange';
  if (colIdx === 6 && num >= 8) return 'mkb-hmOrange';
  if (colIdx === 3 && num >= 100) return 'mkb-hmOrange';
  return '';
}

// worldMapSvg removed — replaced by real Figma PNG (mkb-worldmap.png).

// ---------------------------------------------------------------------------
// Sparkline / yield curve renderer
// ---------------------------------------------------------------------------
function wireSparklines(root) {
  // Section charts use real Figma raster (no synthetic data)
  root.querySelectorAll('[data-spark]').forEach(host => {
    const src = SECTION_CHART_PNG[host.dataset.spark];
    if (src) host.innerHTML = `<img class="mkb-chartImg" src="${src}" alt="chart" />`;
  });
  // Yield curve also uses Figma raster
  root.querySelectorAll('.mkb-yieldChart').forEach(host => {
    host.innerHTML = `<img class="mkb-chartImg mkb-yieldImg" src="${yieldChartPng}" alt="Yield curve" />`;
  });
  return;
  // ---- legacy synthetic renderer kept below but unreachable ----
  // eslint-disable-next-line no-unreachable
  root.querySelectorAll('[data-spark]').forEach(host => {
    const kind = host.dataset.spark;
    const w = host.clientWidth || 1200;
    const h = 320;
    const pts = genSpark(kind, 120);
    const min = Math.min(...pts), max = Math.max(...pts);
    const pad = 30;
    const x = i => pad + i * (w - pad*2) / (pts.length-1);
    const y = v => pad + (1 - (v - min) / (max - min)) * (h - pad*2);
    const path = pts.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const area = path + ` L${x(pts.length-1).toFixed(1)} ${(h-pad).toFixed(1)} L${pad} ${(h-pad).toFixed(1)} Z`;
    const colorMap = { forex:'#ef5350', etf:'#22ab94', econ:'#22ab94' };
    const c = colorMap[kind] || '#22ab94';
    const fillMap = { forex:'rgba(239,83,80,0.15)', etf:'rgba(34,171,148,0.15)', econ:'rgba(34,171,148,0.15)' };
    host.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;width:100%;height:${h}px">
        ${gridLines(w,h,pad)}
        <path d="${area}" fill="${fillMap[kind]||fillMap.etf}" />
        <path d="${path}" fill="none" stroke="${c}" stroke-width="1.4" />
        <line x1="${pad+20}" y1="${pad}" x2="${pad+20}" y2="${h-pad}" stroke="#444" stroke-dasharray="3 3"/>
        <g font-family="Trebuchet MS" font-size="10" fill="#787b86">
          ${axisLabels(kind, w, h, pad)}
        </g>
        <g>
          <rect x="${w-pad-60}" y="${y(pts[pts.length-1])-9}" width="56" height="18" fill="${c}" rx="2"/>
          <text x="${w-pad-32}" y="${y(pts[pts.length-1])+4}" text-anchor="middle" fill="#fff" font-size="11" font-family="Trebuchet MS">${pts[pts.length-1].toFixed(4)}</text>
        </g>
      </svg>`;
  });
  // Yield curve
  root.querySelectorAll('.mkb-yieldChart').forEach(host => {
    const series = JSON.parse(host.dataset.yield);
    const w = host.clientWidth || 1200;
    const h = 360;
    const pad = { l: 36, r: 24, t: 16, b: 36 };
    const n = series[0].data.length;
    const all = series.flatMap(s=>s.data);
    const min = Math.floor(Math.min(...all)*10)/10;
    const max = Math.ceil(Math.max(...all)*10)/10;
    const x = i => pad.l + i*(w-pad.l-pad.r)/(n-1);
    const y = v => pad.t + (1 - (v-min)/(max-min))*(h-pad.t-pad.b);
    const xLabels = ['1M','1Y','2Y','3Y','4Y','5Y','6Y','7Y','8Y','9Y','10Y','12Y','15Y','20Y','25Y','30Y'];
    let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;width:100%;height:${h}px">`;
    // Y grid
    const yTicks = [];
    for (let v = min; v <= max + 0.001; v += 0.5) yTicks.push(+v.toFixed(1));
    yTicks.forEach(v=>{
      svg += `<line x1="${pad.l}" x2="${w-pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#2a2e39" stroke-dasharray="2 3"/>`;
      svg += `<text x="${pad.l-8}" y="${(y(v)+3).toFixed(1)}" text-anchor="end" fill="#787b86" font-size="10" font-family="Trebuchet MS">${v.toFixed(1)}%</text>`;
    });
    // X labels
    for (let i = 0; i < n; i++) {
      svg += `<text x="${x(i).toFixed(1)}" y="${h-pad.b+18}" text-anchor="middle" fill="#787b86" font-size="10" font-family="Trebuchet MS">${xLabels[i]||''}</text>`;
    }
    // Series
    series.forEach(s=>{
      const path = s.data.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
      svg += `<path d="${path}" fill="none" stroke="${s.c}" stroke-width="1.4"/>`;
      s.data.forEach((v,i)=>{
        svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2" fill="${s.c}"/>`;
      });
    });
    svg += `</svg>`;
    host.innerHTML = svg;
  });
}

function gridLines(w, h, pad) {
  let g = '';
  for (let i = 1; i < 6; i++) {
    const yy = pad + i*(h-pad*2)/6;
    g += `<line x1="${pad}" x2="${w-pad}" y1="${yy}" y2="${yy}" stroke="#1e222d" stroke-dasharray="1 3"/>`;
  }
  return g;
}

function axisLabels(kind, w, h, pad) {
  const months = ['jun','jul','ago','sep','oct','nov','dic','2026','feb','mar','abr','may','26'];
  let g = '';
  months.forEach((m,i)=>{
    const xx = pad + i*(w-pad*2)/(months.length-1);
    g += `<text x="${xx}" y="${h-pad+18}" text-anchor="middle">${m}</text>`;
  });
  return g;
}

function genSpark(kind, n) {
  const seeds = { forex:0.85, etf:740, econ:1.4 };
  const amp = { forex:0.02, etf:30, econ:0.4 };
  let v = seeds[kind] || 1, out = [];
  let r = 1234;
  const rand = () => { r = (r*9301+49297) % 233280; return r/233280; };
  for (let i = 0; i < n; i++) {
    v += (rand()-0.5) * amp[kind] * 0.3;
    out.push(v);
  }
  return out;
}
