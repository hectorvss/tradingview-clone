// /options/finder — Buscador de estrategias (Figma 17:144150 collapsed + 17:155446 expanded)
// Exports renderOptionsFinderTab(mount, opts) => { destroy }
// Pixel-polished against real Figma design tokens (file 2QhXqtb66hdeKvlZAZE4fS):
//   action badges: Long bg rgba(68,138,255,.2) #82b1ff, Short bg rgba(255,64,129,.2) #ff4081
//   strike chip: bg rgba(179,136,255,.2) #b388ff, 11px Bold uppercase, "7.725,00 Call"
//   filter pills: transparent 1px border #4a4a4a, 17px radius, 34px tall
//   Detail row layout (Figma): 4 columns at x=20/265/510/940-ish; columns gap 20-40px

const FILTERS_ROW_1 = [
  { label: 'Próximo mes', icon: 'cal' },
  { label: 'Rango de precios esperado', value: '+5% a +10%' },
  { label: 'Tipos de estrategias' },
  { label: 'Volumen' },
  { label: 'Amplitud del spread' },
  { label: 'Valor intrínseco' },
];
const FILTERS_ROW_2 = [
  { label: 'Ejercicios simétricos' },
  { label: 'Spread compra/venta' },
];

// Rows from Figma — collapsed view (Bull Call Spread row 2 is expandable)
const ROWS = [
  { date: '10 jun 2026', days: 15, type: 'Long Call', strikes: ['7.610C'], benMax: '630,25', perdMax: '-44,25', br: '9,99', eq: '7.654,25', teor: '44,00', bid: '43,75', ask: '44' },
  { date: '17 jun 2026', days: 22, type: 'Bull Call Spread', strikes: ['7.725C','8.000C'], benMax: '251,00', perdMax: '-24,00', br: '9,99', eq: '7.749,00', teor: '24,15', bid: '23,50', ask: '24', detailable: true },
  { date: '16 jun 2026', days: 21, type: 'Long Call', strikes: ['7.660C'], benMax: '584,75', perdMax: '-39,75', br: '9,97', eq: '7.699,75', teor: '39,50', bid: '39,25', ask: '40' },
  { date: '18 jun 2026', days: 23, type: 'Long Call', strikes: ['7.800C'], benMax: '457,50', perdMax: '-27,00', br: '9,97', eq: '7.827,00', teor: '26,25', bid: '26,50', ask: '27' },
  { date: '17 jun 2026', days: 22, type: 'Long Call', strikes: ['7.680C'], benMax: '566,50', perdMax: '-38,00', br: '9,95', eq: '7.718,00', teor: '38,00', bid: '37,50', ask: '38' },
  { date: '11 jun 2026', days: 16, type: 'Long Call', strikes: ['7.620C'], benMax: '621,00', perdMax: '-43,50', br: '9,94', eq: '7.663,50', teor: '43,50', bid: '43,25', ask: '43' },
  { date: '18 jun 2026', days: 23, type: 'Bull Call Spread', strikes: ['7.725C','8.025C'], benMax: '274,25', perdMax: '-25,75', br: '9,94', eq: '7.750,75', teor: '25,65', bid: '25,25', ask: '26' },
  { date: '12 jun 2026', days: 17, type: 'Long Call', strikes: ['7.630C'], benMax: '611,75', perdMax: '-42,75', br: '9,90', eq: '7.672,75', teor: '42,75', bid: '42,50', ask: '43' },
  { date: '10 jun 2026', days: 15, type: 'Bull Call Spread', strikes: ['7.730C','7.825C'], benMax: '86,25', perdMax: '-8,75', br: '9,85', eq: '7.738,75', teor: '8,75', bid: '8,35', ask: '9' },
  { date: '22 jun 2026', days: 27, type: 'Long Call', strikes: ['7.825C'], benMax: '434,50', perdMax: '-25,00', br: '9,85', eq: '7.850,00', teor: '24,25', bid: '24,50', ask: '25' },
  { date: '18 jun 2026', days: 23, type: 'Bull Call Spread', strikes: ['7.790C','8.250C'], benMax: '431,75', perdMax: '-28,25', br: '9,78', eq: '7.818,00', teor: '27,65', bid: '27,65', ask: '28' },
  { date: '16 jun 2026', days: 21, type: 'Bull Call Spread', strikes: ['7.750C','7.900C'], benMax: '136,00', perdMax: '-14,00', br: '9,72', eq: '7.764,00', teor: '13,95', bid: '13,50', ask: '14' },
  { date: '12 jun 2026', days: 17, type: 'Bull Call Spread', strikes: ['7.725C','7.880C'], benMax: '140,50', perdMax: '-14,50', br: '9,69', eq: '7.739,50', teor: '14,40', bid: '14,20', ask: '14' },
  { date: '11 jun 2026', days: 16, type: 'Bull Call Spread', strikes: ['7.730C','7.850C'], benMax: '108,75', perdMax: '-11,25', br: '9,67', eq: '7.741,25', teor: '11,20', bid: '10,80', ask: '11' },
];

function styleBlock() {
  return `
  <style>
    /* Root fills slot; page doesn't scroll, table scrolls internally; toolbar/filters sticky */
    .optf-wrap{width:100%;height:100%;display:flex;flex-direction:column;color:#dbdbdb;font:13px/1.4 'Trebuchet MS',-apple-system,BlinkMacSystemFont,Roboto,Ubuntu,sans-serif;padding:8px 0 0;box-sizing:border-box;overflow:hidden}
    .optf-filters{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding:0 0 14px;position:sticky;top:0;background:transparent;z-index:2}
    .optf-frow{display:flex;flex-wrap:wrap;gap:8px}
    /* Filter pill: 34px tall, 17px radius, transparent bg, 1px #4a4a4a border, padding 12px */
    .optf-pill{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #4a4a4a;color:#dbdbdb;border-radius:17px;height:34px;padding:0 12px;font:400 13px/18px Roboto,sans-serif;cursor:pointer;user-select:none;transition:background .12s ease-out,border-color .12s ease-out,color .12s ease-out}
    .optf-pill:hover{border-color:#8c8c8c;background:rgba(184,184,184,0.04)}
    .optf-pill.is-active{border-color:#dbdbdb;background:rgba(219,219,219,0.08)}
    .optf-pill .caret{color:#b8b8b8;font-size:10px;margin-left:2px}
    .optf-pill .pill-val{color:#fff;margin-left:4px;font-weight:500}
    .optf-pill .pill-icon{color:#b8b8b8;display:inline-flex;align-items:center}

    .optf-table-wrap{flex:1 1 auto;min-height:0;overflow-x:auto;overflow-y:auto;width:100%}
    .optf-table-wrap::-webkit-scrollbar{width:8px;height:8px}
    .optf-table-wrap::-webkit-scrollbar-thumb{background:#3d3d3d;border-radius:4px}
    .optf-table{width:100%;border-collapse:collapse;font:400 13px/18px Roboto,sans-serif;min-width:1280px;table-layout:fixed}
    .optf-table col.c-venc{width:110px}
    .optf-table col.c-dias{width:60px}
    .optf-table col.c-tipo{width:148px}
    .optf-table col.c-form{width:160px}
    .optf-table col.c-ben{width:115px}
    .optf-table col.c-perd{width:108px}
    .optf-table col.c-br{width:130px}
    .optf-table col.c-eq{width:150px}
    .optf-table col.c-teor{width:100px}
    .optf-table col.c-bid{width:70px}
    .optf-table col.c-ask{width:70px}

    .optf-table thead th{position:sticky;top:0;background:#0f0f0f;z-index:1}
    .optf-table th{font-weight:400;color:#b8b8b8;text-align:right;padding:14px 12px 10px;border-bottom:1px solid #2e2e2e;white-space:nowrap;font-size:13px}
    .optf-table th:nth-child(1),.optf-table th:nth-child(2),.optf-table th:nth-child(3),.optf-table th:nth-child(4){text-align:left}
    .optf-table th.sort{color:#dbdbdb;cursor:pointer;user-select:none;transition:color .12s ease-out}
    .optf-table th.sort:hover{color:#fff}
    .optf-table th.sort .sort-arrow{display:inline-block;margin-right:4px;color:#dbdbdb;transition:transform .15s ease-out}
    .optf-table th.sort.asc .sort-arrow{transform:rotate(180deg)}
    .optf-table td{padding:12px;text-align:right;border-bottom:1px solid #2e2e2e;color:#dbdbdb;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:13px}
    .optf-table td:nth-child(1),.optf-table td:nth-child(2),.optf-table td:nth-child(3),.optf-table td:nth-child(4){text-align:left}
    .optf-table tr.row-main{cursor:pointer}
    .optf-table tr.row-main td{transition:background .12s ease-out}
    .optf-table tr.row-main:hover td{background:rgba(184,184,184,0.04)}
    .optf-table tr.row-main.is-open td{background:rgba(41,98,255,0.08)}

    /* Strike chip in Fórmula column */
    .optf-strike{display:inline-flex;align-items:center;justify-content:center;height:20px;background:rgba(179,136,255,0.20);color:#b388ff;border-radius:4px;padding:0 6px;font:700 11px/1 Roboto,sans-serif;letter-spacing:.55px;text-transform:uppercase;margin-right:4px;font-variant-numeric:tabular-nums}

    /* Detail row — fade in on toggle */
    .optf-detail-row td{padding:0;background:rgba(41,98,255,0.08);border-bottom:1px solid #2e2e2e}
    .optf-detail{display:grid;grid-template-columns:minmax(240px,265px) minmax(220px,245px) minmax(360px,1.6fr) 1fr;gap:20px;padding:14px 20px 24px;position:relative;animation:optf-fadein .18s ease-out}
    @keyframes optf-fadein{from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:translateY(0)}}
    .optf-detail::before{content:'';position:absolute;top:-1px;left:50%;transform:translateX(-50%) translateY(-50%) rotate(45deg);width:10px;height:10px;background:rgba(41,98,255,0.08);border-left:1px solid #2e2e2e;border-top:1px solid #2e2e2e}
    .optf-detail-title{grid-column:1/-1;display:flex;align-items:center;gap:8px;font:500 16px/24px Roboto,sans-serif;color:#dbdbdb;margin-bottom:14px}
    .optf-detail-title .chip{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:4px;background:rgba(184,184,184,0.20);color:#dbdbdb;font:700 10.5px/1 Roboto,sans-serif;letter-spacing:.55px;text-transform:uppercase}

    .optf-section{padding:0;min-width:0}
    .optf-section h4{font:500 14px/18px Roboto,sans-serif;color:#dbdbdb;margin:0 0 4px;padding:0 0 8px}

    .optf-kv{display:flex;flex-direction:column;gap:6px;font:400 13px/18px Roboto,sans-serif}
    .optf-kv .row{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .optf-kv .k{color:#b8b8b8;flex:1;min-width:0}
    .optf-kv .v{color:#dbdbdb;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}

    /* Components table */
    .optf-comp-table{width:100%;border-collapse:collapse;font:400 12px/16px Roboto,sans-serif}
    .optf-comp-table th{color:#b8b8b8;font:400 11px/16px Roboto,sans-serif;letter-spacing:.4px;text-transform:uppercase;text-align:left;padding:0 8px 6px;border:0}
    .optf-comp-table th.r,.optf-comp-table td.r{text-align:right}
    .optf-comp-table td{padding:6px 8px;color:#dbdbdb;font-variant-numeric:tabular-nums;border:0;vertical-align:middle}
    .optf-action{display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 6px;border-radius:4px;font:700 11px/1 Roboto,sans-serif;letter-spacing:.55px;text-transform:uppercase}
    .optf-action.long{background:rgba(68,138,255,0.20);color:#82b1ff}
    .optf-action.short{background:rgba(255,64,129,0.20);color:#ff4081}
    .optf-comp-strike{display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 6px;border-radius:4px;background:rgba(179,136,255,0.20);color:#b388ff;font:700 11px/1 Roboto,sans-serif;letter-spacing:.55px;text-transform:uppercase}

    .optf-edit-btn{margin-top:14px;background:transparent;color:#dbdbdb;border:1px solid #dbdbdb;font:400 14px/18px Roboto,sans-serif;height:28px;padding:0 12px;border-radius:6px;cursor:pointer;transition:background .12s ease-out,border-color .12s ease-out}
    .optf-edit-btn:hover{background:rgba(219,219,219,0.08)}

    .optf-mini-chart{background:transparent;border:0;border-radius:0;padding:0;width:100%}
    .optf-mini-chart svg{width:100%;height:auto;display:block}
  </style>`;
}

function renderPill(p, active) {
  const icon = p.icon === 'cal'
    ? `<span class="pill-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg></span>`
    : '';
  const val = p.value ? `<span class="pill-val">${p.value}</span>` : '';
  return `<button class="optf-pill ${active?'is-active':''}" type="button" data-pill="${p.label}">${icon}<span>${p.label}</span>${val}<span class="caret">▾</span></button>`;
}

function renderRow(r, idx, openIdx) {
  const isOpen = idx === openIdx;
  const strikesHtml = r.strikes.map(s => `<span class="optf-strike">${s}</span>`).join('');
  return `
    <tr class="row-main ${isOpen ? 'is-open':''}" data-idx="${idx}">
      <td>${r.date}</td>
      <td>${r.days}</td>
      <td>${r.type}</td>
      <td>${strikesHtml}</td>
      <td>${r.benMax}</td>
      <td>${r.perdMax}</td>
      <td>${r.br}</td>
      <td>${r.eq}</td>
      <td>${r.teor}</td>
      <td>${r.bid}</td>
      <td>${r.ask}</td>
    </tr>
    ${isOpen ? renderDetailRow(r) : ''}`;
}

function renderMiniChart(r) {
  // Mini payoff for Bull Call Spread
  const grid = [0,1,2].map(i => `<line x1="42" y1="${20+i*60}" x2="430" y2="${20+i*60}" stroke="#2e2e2e"/>`).join('');
  const xt = ['7105','7460','7815','8170','8525'];
  const xL = xt.map((t,i)=>`<text x="${50+i*95}" y="198" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8" text-anchor="middle">${t}</text>`).join('');
  return `
  <div class="optf-mini-chart">
    <svg viewBox="0 0 470 215" preserveAspectRatio="xMidYMid meet">
      ${grid}
      <text x="38" y="24" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8" text-anchor="end">200.00</text>
      <text x="38" y="84" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8" text-anchor="end">100.00</text>
      <text x="38" y="144" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8" text-anchor="end">0.00</text>
      <text x="434" y="24" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8">0.40</text>
      <text x="434" y="84" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8">0.20</text>
      <text x="434" y="144" font-size="10" font-family="Roboto,sans-serif" fill="#b8b8b8">0.00</text>
      ${xL}

      <line x1="242" y1="20" x2="242" y2="140" stroke="#8c8c8c" stroke-dasharray="2,3"/>
      <line x1="316" y1="20" x2="316" y2="140" stroke="#8c8c8c" stroke-dasharray="2,3"/>

      <path d="M42 140 L242 140 L242 154 L42 154 Z" fill="#d500f9" opacity="0.28"/>
      <path d="M42 140 L242 140" stroke="#d500f9" stroke-width="2"/>

      <path d="M42 140 L242 140 L316 50 L430 50" stroke="#00bce6" stroke-width="2" fill="none"/>
      <path d="M242 140 L316 50 L430 50 L430 140 Z" fill="#22ab94" opacity="0.10"/>

      <path d="M42 138 C140 135, 210 125, 245 95 S 290 55, 320 50 L430 48" stroke="#2962ff" stroke-width="1.4" fill="none" stroke-dasharray="2,3"/>
      <path d="M42 138 C140 132, 200 100, 245 60 S 305 105, 360 130 L430 138" stroke="#fb8c00" stroke-width="1.6" fill="none" stroke-dasharray="5,4"/>

      <g transform="translate(242,156)"><rect x="-15" y="0" width="30" height="14" rx="2" fill="#22ab94"/><text x="0" y="11" font-size="10" font-family="Roboto,sans-serif" fill="#fff" text-anchor="middle">+5%</text></g>
      <g transform="translate(316,156)"><rect x="-18" y="0" width="36" height="14" rx="2" fill="#22ab94"/><text x="0" y="11" font-size="10" font-family="Roboto,sans-serif" fill="#fff" text-anchor="middle">+10%</text></g>
    </svg>
  </div>`;
}

function renderDetailRow(r) {
  return `
    <tr class="optf-detail-row"><td colspan="11">
      <div class="optf-detail">
        <div class="optf-detail-title">
          ${r.type}
          <span class="chip">${r.days} DTE</span>
          <span class="chip">${r.date}</span>
        </div>

        <div class="optf-section">
          <h4>Resumen rápido</h4>
          <div class="optf-kv">
            <div class="row"><span class="k">Precio subyacente</span><span class="v">7.531,25</span></div>
            <div class="row"><span class="k">Precio teór.</span><span class="v">${r.teor}</span></div>
            <div class="row"><span class="k">Bid</span><span class="v">${r.bid}</span></div>
            <div class="row"><span class="k">Ask</span><span class="v">24,55</span></div>
            <div class="row"><span class="k">Puntos de equilibrio</span><span class="v">${r.eq}</span></div>
            <div class="row"><span class="k">Probabilidad de obtener<br/>beneficios</span><span class="v">84,91%</span></div>
          </div>
        </div>

        <div class="optf-section">
          <h4>Análisis de riesgos</h4>
          <div class="optf-kv">
            <div class="row"><span class="k">Ganancia esp.</span><span class="v">239,69</span></div>
            <div class="row"><span class="k">Beneficio máximo</span><span class="v">${r.benMax}</span></div>
            <div class="row"><span class="k">Pérdida máxima (90 %)</span><span class="v">${r.perdMax}</span></div>
            <div class="row"><span class="k">Pérdida máxima (99 %)</span><span class="v">${r.perdMax}</span></div>
            <div class="row"><span class="k">Beneficio/Riesgo</span><span class="v">${r.br}</span></div>
          </div>
          <button class="optf-edit-btn" type="button">Editar estrategia</button>
        </div>

        <div class="optf-section">
          <h4>Información de los componentes</h4>
          <table class="optf-comp-table">
            <thead><tr>
              <th>Acción</th><th class="r">Cantidad</th><th>Strike</th>
              <th class="r">Bid</th><th class="r">Ask</th><th class="r">Spread</th>
            </tr></thead>
            <tbody>
              <tr>
                <td><span class="optf-action long">Long</span></td>
                <td class="r">1</td>
                <td><span class="optf-comp-strike">7.725,00 Call</span></td>
                <td class="r">26,0</td><td class="r">26,8</td><td class="r">2,84%</td>
              </tr>
              <tr>
                <td><span class="optf-action short">Short</span></td>
                <td class="r">1</td>
                <td><span class="optf-comp-strike">8.000,00 Call</span></td>
                <td class="r">2,2</td><td class="r">2,5</td><td class="r">12,77%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="optf-section">
          ${renderMiniChart(r)}
        </div>
      </div>
    </td></tr>`;
}

export function renderOptionsFinderTab(mount, opts = {}) {
  // First row expanded by default per Figma; clicking another row collapses prior (single-open accordion)
  let openIdx = 0;
  let sortAsc = false;
  let activePills = new Set();

  function render() {
    mount.innerHTML = `
      ${styleBlock()}
      <div class="optf-wrap">
        <div class="optf-filters">
          <div class="optf-frow">${FILTERS_ROW_1.map(p => renderPill(p, activePills.has(p.label))).join('')}</div>
          <div class="optf-frow">${FILTERS_ROW_2.map(p => renderPill(p, activePills.has(p.label))).join('')}</div>
        </div>
        <div class="optf-table-wrap">
          <table class="optf-table">
            <colgroup>
              <col class="c-venc"><col class="c-dias"><col class="c-tipo"><col class="c-form">
              <col class="c-ben"><col class="c-perd"><col class="c-br"><col class="c-eq">
              <col class="c-teor"><col class="c-bid"><col class="c-ask">
            </colgroup>
            <thead><tr>
              <th>Vencimiento</th>
              <th>Días</th>
              <th>Tipo de estrategia</th>
              <th>Fórmula</th>
              <th>Beneficio máximo</th>
              <th>Pérdida máxima</th>
              <th class="sort ${sortAsc?'asc':''}" data-sort="br"><span class="sort-arrow">↓</span>Beneficio/Riesgo</th>
              <th>Punto(s) de equilibrio</th>
              <th>Precio teór.</th>
              <th>Bid</th>
              <th>A...</th>
            </tr></thead>
            <tbody>
              ${ROWS.map((r,i) => renderRow(r,i,openIdx)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    mount.querySelectorAll('tr.row-main').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = parseInt(tr.dataset.idx, 10);
        // Single-open accordion: prior expanded row collapses automatically because render() re-emits with new openIdx
        openIdx = openIdx === idx ? -1 : idx;
        render();
      });
    });

    mount.querySelectorAll('.optf-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.pill;
        if (activePills.has(label)) activePills.delete(label);
        else activePills.add(label);
        render();
      });
    });

    const sortHeader = mount.querySelector('.optf-table th.sort');
    if (sortHeader) {
      sortHeader.addEventListener('click', () => {
        sortAsc = !sortAsc;
        render();
      });
    }
  }

  render();

  return {
    destroy() { mount.innerHTML = ''; },
  };
}
