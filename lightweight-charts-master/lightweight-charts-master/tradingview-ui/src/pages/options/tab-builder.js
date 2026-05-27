// /options/builder — Creador de estrategias (Figma 17:133001)
// Exports renderOptionsBuilderTab(mount, opts) => { destroy }
// Pixel-polished against real Figma design tokens (file 2QhXqtb66hdeKvlZAZE4fS):
//   palette: cyan/45 #00bce6, magenta/49 #d500f9, azure/58 #2962ff, orange #fb8c00,
//            grey/55 #8c8c8c (borders), grey/86 #dbdbdb (text), grey/6 #0f0f0f (bg)
//   typography: Roboto 13/14/16, line-height 18/24
//   Strategy card body widths (Figma): 558.6px content, 41px head, 48px body

const STRATEGIES = [
  { id: 'custom', title: 'Cree su propia estrategia desde cero', custom: true },
  {
    id: 'long-call',
    title: 'Long Call',
    tag: 'ALCISTA',
    desc: 'La estrategia más sencilla para materializar una perspectiva alcista sobre el precio del instrumento subyacente.',
  },
  { id: 'short-call', title: 'Short Call', tag: 'BAJISTA' },
  { id: 'long-put', title: 'Long Put', tag: 'BAJISTA' },
  { id: 'short-put', title: 'Short Put', tag: 'ALCISTA' },
  { id: 'bull-call-spread', title: 'Bull Call Spread', tag: 'ALCISTA' },
  { id: 'bear-call-spread', title: 'Bear Call Spread', tag: 'BAJISTA' },
  { id: 'bear-put-spread', title: 'Bear Put Spread', tag: 'BAJISTA' },
  { id: 'bull-put-spread', title: 'Bull Put Spread', tag: 'ALCISTA' },
  { id: 'long-straddle', title: 'Long Straddle', tag: 'NEUTRAL' },
  { id: 'short-straddle', title: 'Short Straddle', tag: 'NEUTRAL' },
  { id: 'long-strangle', title: 'Long Strangle', tag: 'NEUTRAL' },
  { id: 'short-strangle', title: 'Short Strangle', tag: 'NEUTRAL' },
];

const FILTER_TABS = ['Todo', 'Alcista', 'Neutral', 'Bajista'];

function styleBlock() {
  return `
  <style>
    /* Root fills the slot the shell provides; page doesn't scroll, tab content scrolls internally */
    .optb-wrap{width:100%;height:100%;display:flex;gap:20px;padding:8px 0 0;color:#dbdbdb;font:13px/1.4 'Trebuchet MS',-apple-system,BlinkMacSystemFont,Roboto,Ubuntu,sans-serif;box-sizing:border-box;overflow:hidden}
    .optb-left{flex:0 0 38%;min-width:320px;max-width:480px;display:flex;flex-direction:column;gap:8px}
    .optb-right{flex:1;min-width:0;display:flex;flex-direction:column;gap:0;overflow:hidden}

    /* Filter tabs row — right-aligned per Figma (Todo / Alcista / Neutral / Bajista). 4px gap, 28px tall pills */
    .optb-filters{flex:0 0 auto;display:flex;justify-content:flex-end;gap:4px;padding:4px 4px 8px;color:#b8b8b8;font-size:13px}
    .optb-filter{cursor:pointer;padding:5px 12px;border-radius:14px;user-select:none;line-height:18px;font:13px Roboto,sans-serif;color:#b8b8b8;transition:background .12s ease-out,color .12s ease-out}
    .optb-filter:hover{color:#dbdbdb;background:rgba(184,184,184,0.06)}
    .optb-filter.is-active{background:rgba(184,184,184,0.12);color:#dbdbdb}

    /* Strategy cards: 1px solid #8c8c8c border, 8px radius, head 41px, padding 15px */
    .optb-list{flex:1 1 auto;display:flex;flex-direction:column;gap:8px;overflow-y:auto;min-height:0;padding-right:4px}
    .optb-list::-webkit-scrollbar{width:6px}
    .optb-list::-webkit-scrollbar-thumb{background:#3d3d3d;border-radius:3px}
    .optb-card{border:1px solid #4a4a4a;border-radius:8px;background:transparent;cursor:pointer;transition:border-color .12s ease-out,background .12s ease-out;padding:0.8px}
    .optb-card:hover{border-color:#8c8c8c;background:rgba(184,184,184,0.03)}
    .optb-card.is-expanded{border-color:#8c8c8c}
    .optb-card.is-flash{background:rgba(34,171,148,0.18);border-color:#22ab94;transition:background .18s ease-out,border-color .18s ease-out}
    .optb-card.is-custom .optb-card-head{padding:11px 15px}
    .optb-card-head{display:flex;align-items:center;gap:8px;min-height:41px;padding:8px 15px;border-radius:7px}
    .optb-card-title{font:500 16px/24px Roboto,sans-serif;color:#dbdbdb}
    /* Tag/badge: uniform grey per Figma (color/grey/72 20%, text grey/86 #dbdbdb). 10.5px bold uppercase */
    .optb-tag{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:4px;background:rgba(184,184,184,0.20);color:#dbdbdb;font:700 10.5px/1 Roboto,sans-serif;letter-spacing:.55px;text-transform:uppercase}
    .optb-card-body{padding:0 16px 12px;overflow:hidden}
    .optb-card-desc{color:#dbdbdb;font:400 14px/18px Roboto,sans-serif;padding-top:0}
    /* CTA: white pill, 28px tall, 6px radius (NOT 14px pill) */
    .optb-card-cta{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;background:#fff;color:#0f0f0f;border:1px solid #fff;font:400 14px/18px Roboto,sans-serif;padding:4px 12px;border-radius:6px;cursor:pointer;height:28px;transition:background .12s ease-out,border-color .12s ease-out}
    .optb-card-cta:hover{background:#e6e6e6;border-color:#e6e6e6}
    .optb-card-cta:active{transform:translateY(1px)}

    /* Right panel toolbar — Vencimiento 204w, Strike 69w, Tamaño 100w, Griega 70w */
    .optb-toolbar{flex:0 0 auto;display:flex;align-items:flex-start;gap:8px;padding:4px 0 0;flex-wrap:wrap}
    .optb-field{display:flex;flex-direction:column;gap:2px}
    .optb-field-label{font:400 13px/18px Roboto,sans-serif;color:#b8b8b8;display:flex;align-items:center;gap:4px}
    .optb-field-q{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1px solid #575757;color:#8c8c8c;font-size:9px;line-height:1;cursor:help}
    .optb-select{background:transparent;border:1px solid #4a4a4a;color:#dbdbdb;font:400 13px/18px Roboto,sans-serif;height:28px;padding:0 22px 0 8px;border-radius:4px;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path d='M1 1l3 3 3-3' stroke='%23b8b8b8' stroke-width='1.2' fill='none'/></svg>");background-repeat:no-repeat;background-position:right 8px center;transition:border-color .12s ease-out}
    .optb-select:hover{border-color:#8c8c8c}
    .optb-size{display:inline-flex;align-items:center;border:1px solid #4a4a4a;border-radius:4px;background:transparent;height:28px;overflow:hidden;transition:border-color .12s ease-out}
    .optb-size:hover{border-color:#8c8c8c}
    .optb-size input{width:54px;text-align:left;padding:0 8px;background:transparent;border:0;color:#dbdbdb;font:400 13px/18px Roboto,sans-serif;outline:none;transition:transform .14s ease-out,color .14s ease-out}
    .optb-size input.bump{transform:scale(1.18);color:#fff}
    .optb-size button{width:22px;height:22px;border:0;background:transparent;color:#dbdbdb;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;transition:background .12s ease-out}
    .optb-size button:hover{background:rgba(184,184,184,0.12)}
    .optb-size .sep{width:1px;height:16px;background:#4a4a4a}

    /* Icon trio under toolbar: 28x28 each, gap 8px */
    .optb-iconbar{flex:0 0 auto;display:flex;gap:8px;padding:8px 0 12px}
    .optb-iconbtn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;color:#b8b8b8;cursor:pointer;background:transparent;border:0;border-radius:4px;transition:background .12s ease-out,color .12s ease-out}
    .optb-iconbtn:hover{color:#dbdbdb;background:rgba(184,184,184,0.08)}

    /* Chart — fills available vertical space inside the right panel */
    .optb-chart{flex:1 1 auto;min-height:0;background:transparent;border:0;border-radius:4px;padding:0;position:relative;display:flex;flex-direction:column}
    .optb-chart svg{flex:1 1 auto;min-height:0;width:100%;height:100%;display:block}
    .optb-chart-legend{flex:0 0 auto;display:flex;justify-content:center;gap:18px;font:400 12px/16px Roboto,sans-serif;color:#b8b8b8;padding:8px 0}
    .optb-chart-legend .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fb8c00;margin-right:6px;vertical-align:middle}

    /* Stats row — 54px tall, items 150w (166w with gap). Scroll horizontally if overflow. */
    .optb-stats-wrap{flex:0 0 auto;position:relative;border-top:1px solid #2e2e2e;padding-top:0}
    .optb-stats{display:flex;align-items:flex-start;gap:16px;padding:8px 0;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
    .optb-stats::-webkit-scrollbar{height:6px}
    .optb-stats::-webkit-scrollbar-thumb{background:#3d3d3d;border-radius:3px}
    .optb-stat{display:flex;flex-direction:column;gap:4px;flex:0 0 150px;min-width:0}
    .optb-stat-label{font:400 13px/18px Roboto,sans-serif;color:#b8b8b8;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .optb-stat-val{font:400 20px/28px Roboto,sans-serif;color:#dbdbdb;font-variant-numeric:tabular-nums;white-space:nowrap}
    .optb-stat-val.pos{color:#22ab94}
    .optb-stat-val.neg{color:#f7525f}
    .optb-stat-val .inf{font-family:Inter,Roboto,sans-serif;font-size:28px;line-height:28px}
    .optb-stat-unit{font:400 12px/16px Roboto,sans-serif;color:#b8b8b8;margin-left:4px}
    .optb-scroll-r{position:absolute;right:-4px;top:3px;width:48px;height:48px;border-radius:50%;background:rgba(15,15,15,0.92);border:1px solid #3d3d3d;color:#dbdbdb;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;box-shadow:0 0 10px rgba(0,0,0,.45);transition:background .12s ease-out,border-color .12s ease-out}
    .optb-scroll-r:hover{background:rgba(30,30,30,0.95);border-color:#8c8c8c}
  </style>`;
}

function renderCard(s, expandedId) {
  if (s.custom) {
    return `<div class="optb-card is-custom" data-id="${s.id}"><div class="optb-card-head"><span class="optb-card-title">${s.title}</span></div></div>`;
  }
  const expanded = expandedId === s.id;
  return `
    <div class="optb-card ${expanded ? 'is-expanded' : ''}" data-id="${s.id}">
      <div class="optb-card-head">
        <span class="optb-card-title">${s.title}</span>
        <span class="optb-tag">${s.tag}</span>
      </div>
      ${expanded && s.desc ? `
        <div class="optb-card-body">
          <div class="optb-card-desc">${s.desc}</div>
          <button class="optb-card-cta" type="button">Crear estrategia</button>
        </div>
      ` : ''}
    </div>`;
}

function renderChart() {
  // SVG payoff diagram for Long Call. viewBox 0 0 750 504.
  // Colors locked to Figma tokens:
  //   profit/payoff: cyan/45 #00bce6 (teal-cyan)
  //   loss area: magenta/49 #d500f9
  //   delta dashed: orange #fb8c00
  //   blue dashed (gamma-like): azure/58 #2962ff
  const yTicksLeft = ['650.00','600.00','550.00','500.00','450.00','400.00','350.00','300.00','250.00','200.00','150.00','100.00','50.00','0.00','-50.00'];
  const yTicksRight = ['1.20','1.10','1.00','0.90','0.80','0.70','0.60','0.50','0.40','0.30','0.20','0.10','0.00','-0.10'];
  const xTicks = ['6890','7035','7180','7325','7470','7615','7760','7910','8060','8225'];
  const top = 20, plotH = 420, plotW = 580, left = 58, right = left + plotW; // 58..638
  const stepY = plotH / 14;
  const stepRy = plotH / 13;
  const stepX = plotW / 9;
  const baseline = top + 13 * stepY;
  let leftY = yTicksLeft.map((t,i)=>`<text x="${left-6}" y="${top + i*stepY + 4}" fill="#b8b8b8" font-size="11" font-family="Roboto,sans-serif" text-anchor="end">${t}</text>`).join('');
  let rightY = yTicksRight.map((t,i)=>`<text x="${right+6}" y="${top + i*stepRy + 4}" fill="#b8b8b8" font-size="11" font-family="Roboto,sans-serif">${t}</text>`).join('');
  let xL = xTicks.map((t,i)=>`<text x="${left + i*stepX}" y="${top + plotH + 18}" fill="#b8b8b8" font-size="11" font-family="Roboto,sans-serif" text-anchor="middle">${t}</text>`).join('');
  let grid = '';
  for (let i=0;i<15;i++) grid += `<line x1="${left}" y1="${top + i*stepY}" x2="${right}" y2="${top + i*stepY}" stroke="#2e2e2e" stroke-width="1"/>`;

  const strikeX = left + 5*stepX;
  const lossY = baseline + 14;

  return `
    <div class="optb-chart">
      <svg viewBox="0 0 750 460" preserveAspectRatio="xMidYMid meet">
        <rect x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="#0f0f0f"/>
        ${grid}
        ${leftY}${rightY}${xL}

        <!-- strike vertical dashed -->
        <line x1="${strikeX}" y1="${top}" x2="${strikeX}" y2="${top+plotH}" stroke="#8c8c8c" stroke-width="1" stroke-dasharray="2,3"/>

        <!-- loss filled area (magenta) below baseline, left of strike -->
        <path d="M ${left} ${baseline} L ${strikeX} ${baseline} L ${strikeX} ${lossY} L ${left} ${lossY} Z" fill="#d500f9" opacity="0.28"/>
        <path d="M ${left} ${baseline} L ${strikeX} ${baseline}" stroke="#d500f9" stroke-width="2" fill="none"/>
        <path d="M ${left} ${lossY} L ${strikeX} ${lossY}" stroke="#d500f9" stroke-width="1.6" fill="none"/>

        <!-- payoff line cyan/teal -->
        <path d="M ${left} ${baseline} L ${strikeX} ${baseline} L ${right} ${top + 0.5*stepY}" stroke="#00bce6" stroke-width="2.2" fill="none"/>
        <path d="M ${strikeX} ${baseline} L ${right} ${top + 0.5*stepY} L ${right} ${baseline} Z" fill="#22ab94" opacity="0.10"/>

        <!-- blue dashed S-curve -->
        <path d="M ${left} ${baseline-2} C ${left+180} ${baseline-3}, ${strikeX-40} ${baseline-30}, ${strikeX} ${baseline-50} S ${right-80} ${top+50}, ${right} ${top+18}" stroke="#2962ff" stroke-width="1.6" fill="none" stroke-dasharray="2,3"/>

        <!-- delta orange dashed S-curve -->
        <path d="M ${left} ${baseline-8} C ${left+200} ${baseline-12}, ${strikeX-30} ${baseline-90}, ${strikeX+10} ${top+plotH*0.45} S ${right-60} ${top+plotH*0.10}, ${right} ${top+plotH*0.07}" stroke="#fb8c00" stroke-width="1.8" fill="none" stroke-dasharray="5,4"/>

        <!-- breakeven dot -->
        <circle cx="${strikeX}" cy="${baseline}" r="3.5" fill="#b8b8b8"/>

        <!-- inline +/- size pill on chart near strike -->
        <g transform="translate(${strikeX-2},${baseline-3})">
          <rect width="60" height="22" rx="4" fill="#0f0f0f" stroke="#4a4a4a"/>
          <text x="15" y="15" fill="#dbdbdb" font-size="14" font-family="Roboto,sans-serif" text-anchor="middle">−</text>
          <line x1="30" y1="5" x2="30" y2="17" stroke="#4a4a4a"/>
          <text x="45" y="15" fill="#dbdbdb" font-size="14" font-family="Roboto,sans-serif" text-anchor="middle">+</text>
        </g>
      </svg>
      <div class="optb-chart-legend"><span><span class="dot"></span>Delta</span></div>
    </div>`;
}

function renderToolbar() {
  return `
    <div class="optb-toolbar">
      <div class="optb-field" style="width:204px">
        <span class="optb-field-label">Vencimiento</span>
        <select class="optb-select" style="width:204px"><option>9 jun 2026 (14) ESM26 E2B</option></select>
      </div>
      <div class="optb-field" style="width:69px">
        <span class="optb-field-label">Strike</span>
        <select class="optb-select" style="width:69px"><option>7530</option></select>
      </div>
      <div class="optb-field" style="width:100px">
        <span class="optb-field-label">Tamaño <span class="optb-field-q">?</span></span>
        <div class="optb-size" style="width:100px">
          <input type="text" value="1" />
          <span class="sep"></span>
          <button type="button" data-act="dec" aria-label="Disminuir">−</button>
          <button type="button" data-act="inc" aria-label="Aumentar">+</button>
        </div>
      </div>
      <div class="optb-field" style="width:70px">
        <span class="optb-field-label">Griega</span>
        <select class="optb-select" style="width:70px"><option>Delta</option></select>
      </div>
    </div>
    <div class="optb-iconbar">
      <button class="optb-iconbtn" title="Captura" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
      </button>
      <button class="optb-iconbtn" title="Expandir" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7"/></svg>
      </button>
      <button class="optb-iconbtn" title="Ajustes" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.7 1 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      </button>
    </div>`;
}

function renderStats() {
  const items = [
    { l:'Precio subyacente', v:'7.531,25', unit:'USD' },
    { l:'Beneficio máximo', q:true, v:'∞', cls:'pos', isInf:true },
    { l:'Pérdida máxima', q:true, v:'−77,00' },
    { l:'Porcentaje de acierto', q:true, v:'34.47%' },
    { l:'Punto de equilibrio', q:true, v:'7.607' },
    { l:'Tamaño del lote', v:'1' },
    { l:'Delta', q:true, v:'0,51' },
    { l:'Gamma', q:true, v:'0,0021' },
    { l:'Theta', q:true, v:'−2,64' },
    { l:'Vega', q:true, v:'6,02' },
    { l:'Rho', q:true, v:'1,49' },
  ];
  return `
    <div class="optb-stats-wrap">
      <div class="optb-stats">
        ${items.map(it => `
          <div class="optb-stat">
            <span class="optb-stat-label">${it.l}${it.q?` <span class="optb-field-q">?</span>`:''}</span>
            <span class="optb-stat-val ${it.cls||''}">${it.isInf?`<span class="inf">${it.v}</span>`:it.v}${it.unit?`<span class="optb-stat-unit">${it.unit}</span>`:''}</span>
          </div>`).join('')}
      </div>
      <button class="optb-scroll-r" type="button" aria-label="Más">›</button>
    </div>`;
}

export function renderOptionsBuilderTab(mount, opts = {}) {
  let activeFilter = 'Todo';
  let expandedId = 'long-call';

  function render() {
    const filtered = STRATEGIES.filter(s => {
      if (s.custom) return true;
      if (activeFilter === 'Todo') return true;
      return s.tag && s.tag.toLowerCase() === activeFilter.toLowerCase();
    });

    mount.innerHTML = `
      ${styleBlock()}
      <div class="optb-wrap">
        <div class="optb-left">
          <div class="optb-filters">
            ${FILTER_TABS.map(f => `<span class="optb-filter ${f===activeFilter?'is-active':''}" data-filter="${f}">${f}</span>`).join('')}
          </div>
          <div class="optb-list">
            ${filtered.map(s => renderCard(s, expandedId)).join('')}
          </div>
        </div>
        <div class="optb-right">
          ${renderToolbar()}
          ${renderChart()}
          ${renderStats()}
        </div>
      </div>`;

    mount.querySelectorAll('.optb-filter').forEach(el => {
      el.addEventListener('click', () => {
        activeFilter = el.dataset.filter;
        render();
      });
    });
    mount.querySelectorAll('.optb-card').forEach(el => {
      el.addEventListener('click', (e) => {
        // Crear estrategia CTA → flash confirmation tint on the card (mock)
        if (e.target.classList.contains('optb-card-cta')) {
          e.stopPropagation();
          el.classList.add('is-flash');
          setTimeout(() => el.classList.remove('is-flash'), 360);
          return;
        }
        const id = el.dataset.id;
        if (id === 'custom') return;
        expandedId = expandedId === id ? null : id;
        render();
      });
    });
    const sizeInput = mount.querySelector('.optb-size input');
    mount.querySelectorAll('.optb-size button').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = parseInt(sizeInput.value || '0', 10) || 0;
        sizeInput.value = btn.dataset.act === 'inc' ? v + 1 : Math.max(0, v - 1);
        // briefly animate the digit
        sizeInput.classList.remove('bump');
        // force reflow so re-adding the class restarts the animation
        // eslint-disable-next-line no-unused-expressions
        sizeInput.offsetWidth;
        sizeInput.classList.add('bump');
        setTimeout(() => sizeInput.classList.remove('bump'), 160);
      });
    });
  }

  render();

  return {
    destroy() {
      mount.innerHTML = '';
    },
  };
}
