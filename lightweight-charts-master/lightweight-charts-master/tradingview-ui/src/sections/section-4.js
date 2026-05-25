// src/sections/section-4.js — TradingView "Futuros y materias primas" (Figma 1:37126)
// Three sub-widgets, pixel-perfect from Figma fileKey 2QhXqtb66hdeKvlZAZE4fS:
//   (1) Ideas de trading              → horizontal carousel of 10 idea cards
//   (2) Futuros de energía + metales  → two side-by-side 2×3 quote tables
//   (3) Noticias sobre futuros        → 4×3 grid of news cards
// Spanish labels are taken verbatim from the Figma source.

let _cssInjected = false;

/* ──────────────────────────── DATA ──────────────────────────── */

// Idea cards (carousel). Title, body excerpt and author are Figma-verbatim.
// Chart preview is a procedurally generated mini-sparkline (no external image deps).
const IDEAS = [
  {
    title: 'OILUSD 1S - Las señales del Petróleo son "preocupantes".',
    body:  '💻 UN CONFLICTO QUE POCO A POCO CRECE  EASYMARKETS:OILUSD La situación entre Estados Unidos…',
    author: 'por easyMarkets', date: 'Mayo 22', comments: 1, likes: 8,
    ticker: 'OILUSD', tickerColor: '#000000', up: false, seed: 11,
    href: 'https://es.tradingview.com/chart/OILUSD/gTqtMCpn/',
    brokerStripe: 'linear-gradient(90deg,#003488 5%,#057cda 39.94%,#0067af 78.94%,#083976 100%)',
  },
  {
    title: 'Análisis del Oro y Estrategia de Trading | 22–23 de Mayo',
    body:  '🌐¡Hola, traders! Soy Jack Blackwell, con 15 años de experiencia en análisis y trading en los mercados de…',
    author: 'por GoldTrend_Master', date: 'Mayo 22', likes: 2,
    ticker: 'XAUUSD', tickerColor: '#D69A00', up: true, seed: 22,
    href: 'https://es.tradingview.com/chart/XAUUSD/tZYyNkM0/',
  },
  {
    title: 'Xuusd la semana en estructura lateral podria ver una correccion',
    body:  'Estamos aun en una temporalida bajista pero el precio podria hacer una correcion el dia martes el precio en…',
    author: 'por julianjrbtrading', date: 'Actualizado Mayo 22', comments: 6, likes: 9,
    ticker: 'XAUUSD', tickerColor: '#D69A00', up: false, seed: 33,
    href: 'https://es.tradingview.com/chart/XAUUSD/l1YAHFQt/',
  },
  {
    title: 'WTI: zona de demanda comprando alrededor de 62$',
    body:  'Estructura técnica del crudo: el barril rebota desde la base del rango lateral, mientras la volatilidad…',
    author: 'por CrudeWatcher', date: 'Mayo 21', comments: 3, likes: 14,
    ticker: 'USOIL', tickerColor: '#000000', up: true, seed: 44,
    href: '#',
  },
  {
    title: 'Plata cerca de máximos — ¿continuación o corrección?',
    body:  'La plata se acerca a la resistencia clave en 32$. Los volúmenes apoyan la continuación pero el RSI está…',
    author: 'por SilverHunter', date: 'Mayo 21', likes: 5,
    ticker: 'XAGUSD', tickerColor: '#ADABB8', up: true, seed: 55,
    href: '#',
  },
  {
    title: 'Brent: ruptura del rango bajista en 1H',
    body:  'El petróleo Brent rompe la resistencia diaria con volumen significativo. Próximo objetivo: 105$/bll.',
    author: 'por BrentTrader', date: 'Mayo 20', comments: 2, likes: 18,
    ticker: 'BRENT', tickerColor: '#000000', up: true, seed: 66,
    href: '#',
  },
  {
    title: 'Cobre — patrón cabeza y hombros invertido',
    body:  'El cobre forma un patrón de reversión en gráfico semanal. Soporte clave: 13.500$/tne.',
    author: 'por MetalsView', date: 'Mayo 20', likes: 11,
    ticker: 'COPPER', tickerColor: '#C26A44', up: true, seed: 77,
    href: '#',
  },
  {
    title: 'Gas natural en zona de demanda crítica',
    body:  'TFM1! mantiene presión bajista pero la zona de 45 EUR/MWh ha defendido el precio en varias sesiones…',
    author: 'por GasAnalyst', date: 'Mayo 19', comments: 4, likes: 7,
    ticker: 'NATGAS', tickerColor: '#42A5F5', up: false, seed: 88,
    href: '#',
  },
  {
    title: 'Oro: triángulo simétrico en gráfico 4H',
    body:  'El oro consolida en triángulo simétrico. Próxima ruptura definirá tendencia para final de mes.',
    author: 'por GoldenEye', date: 'Mayo 19', likes: 22,
    ticker: 'XAUUSD', tickerColor: '#D69A00', up: true, seed: 99,
    href: '#',
  },
  {
    title: 'Maíz: divergencia bajista en RSI semanal',
    body:  'El maíz muestra debilidad estructural. Posible movimiento correctivo hacia el soporte de medio plazo.',
    author: 'por CropsTrader', date: 'Mayo 18', comments: 1, likes: 6,
    ticker: 'CORN', tickerColor: '#FBC02D', up: false, seed: 110,
    href: '#',
  },
];

// Energy futures (Figma 1:37744 — 6 tickers, 2 cols × 3 rows)
const ENERGY = [
  { name:'Petróleo crudo Brent',                  ticker:'BRN1!', price:'103,54',   unit:'USD / BLL', chg:'+0,94%', up:true,  icon:'oil',     mode:'D', modeColor:'#FF9800' },
  { name:'Gas natural',                           ticker:'TFM1!', price:'48,683',   unit:'EUR / MWH', chg:'−1,47%', up:false, icon:'gas',     mode:'D', modeColor:'#FF9800' },
  { name:'Petróleo crudo WTI',                    ticker:'WBS1!', price:'96,60',    unit:'USD',       chg:'+0,26%', up:true,  icon:'oil',     mode:'D', modeColor:'#FF9800' },
  { name:'Gasolina RBOB',                         ticker:'UHU1!', price:'3,4539',   unit:'USD',       chg:'+2,20%', up:true,  icon:'gasoline',mode:'D', modeColor:'#FF9800' },
  { name:'Emisiones de carbono',                  ticker:'ECF1!', price:'76,92',    unit:'EUR / TNE', chg:'+2,66%', up:true,  icon:'carbon',  mode:'D', modeColor:'#FF9800' },
  { name:'Gasóleo con bajo contenido en azufre',  ticker:'ULS1!', price:'1.135,25', unit:'USD',       chg:'−3,18%', up:false, icon:'diesel',  mode:'D', modeColor:'#FF9800' },
];

// Metals futures (Figma 1:37976 — 6 tickers, 2 cols × 3 rows)
const METALS = [
  { name:'Oro',                       ticker:'GC1!', price:'4.523,2',  unit:'USD / APZ', chg:'−0,42%', up:false, icon:'gold',     mode:'D', modeColor:'#FF9800' },
  { name:'Plata',                     ticker:'SI1!', price:'76,200',   unit:'USD / APZ', chg:'−0,69%', up:false, icon:'silver',   mode:'D', modeColor:'#FF9800' },
  { name:'Níquel',                    ticker:'NI1!', price:'18.779,63',unit:'USD / TNE', chg:'+0,98%', up:true,  icon:'nickel',   mode:'E', modeColor:'#AB47BC' },
  { name:'Cobre de clase A',          ticker:'CA1!', price:'13.654,51',unit:'USD / TNE', chg:'+1,17%', up:true,  icon:'copper',   mode:'E', modeColor:'#AB47BC' },
  { name:'Estaño',                    ticker:'SN1!', price:'54.119,00',unit:'USD / TNE', chg:'+1,85%', up:true,  icon:'tin',      mode:'E', modeColor:'#AB47BC' },
  { name:'Aluminio de alta calidad',  ticker:'AH1!', price:'3.675,86', unit:'USD / TNE', chg:'+0,41%', up:true,  icon:'aluminum', mode:'E', modeColor:'#AB47BC' },
];

// News grid (Figma 1:38219 — 4 rows × 3 cols)
const NEWS = [
  { date:'hace 20 horas', source:'Reuters', icon:null,           title:'Al menos 90 muertos deja el peor accidente minero ocurrido en China en más de 16 años' },
  { date:'anteayer',      source:'Reuters', icon:'bp',           title:'La refinería de BP en Whiting presenta una propuesta revisada al sindicato en el marco de las negociaciones en curso' },
  { date:'anteayer',      source:'Reuters', icon:null,           title:'Cuatro muertos y 90 personas atrapadas en accidente en una mina de carbón del norte de China: Xinhua' },
  { date:'anteayer',      source:'Reuters', icon:'plains',       title:'Plains reanudará el funcionamiento de algunos tramos del oleoducto roto en el este de Los Ángeles en unas horas' },
  { date:'anteayer',      source:'Reuters', icon:'devon',        title:'La adquisición de Devon en el Pérmico ampliará su cartera de proyectos de perforación y consolidará su liderazgo' },
  { date:'anteayer',      source:'Reuters', icon:'oil',          title:'Barril sube ante dudas del mercado sobre avances en negociaciones de paz EEUU-Irán' },
  { date:'anteayer',      source:'Reuters', icon:'agri',         title:'Maíz y soja de Chicago suben por buen ritmo de las exportaciones' },
  { date:'anteayer',      source:'Reuters', icon:'baker-oil',    title:'Las empresas petroleras estadounidenses aumentan el número de plataformas de petróleo y gas por quinta semana consecutiva, según Baker Hughes' },
  { date:'anteayer',      source:'Reuters', icon:'plains',       title:'El oleoducto de Plains se ha cerrado parcialmente tras una rotura en el este de Los Ángeles, según informa la empresa' },
  { date:'anteayer',      source:'Reuters', icon:null,           title:'Crudo del Mar del Norte: los precios se mantienen estables tras un periodo de cotización tranquilo en Platts' },
  { date:'anteayer',      source:'Reuters', icon:null,           title:'Condición de cultivos en Francia se mantiene estable ante ola de calor prevista' },
  { date:'anteayer',      source:'Reuters', icon:'oil',          title:'Barril sube ante dudas de los inversionistas sobre avances en negociaciones de paz EEUU-Irán' },
];

/* ────────────────────── INLINE ICON LIBRARY ──────────────────── */
// Round 36 px commodity icons synthesized from Figma color tokens.
const ICON_36 = {
  oil:      `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#000"/><path d="M18 8c-3 5-6 8-6 12a6 6 0 0 0 12 0c0-4-3-7-6-12z" fill="#fff"/></svg>`,
  gas:      `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#42A5F5"/><path d="M18 8c-2 4-5 6-5 11a5 5 0 0 0 10 0c0-5-3-7-5-11z" fill="#fff"/></svg>`,
  gasoline: `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#ED6E28"/><rect x="11" y="11" width="11" height="14" rx="1.5" fill="#fff"/><path d="M22 14l3 1v8a1.5 1.5 0 0 1-3 0V18" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  carbon:   `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#000"/><path d="M22 14a5 5 0 1 0 0 8h-2a3 3 0 1 1 0-8h2z" fill="#fff"/></svg>`,
  diesel:   `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#181C1F"/><rect x="11" y="11" width="11" height="14" rx="1.5" fill="#fff"/><path d="M22 14l3 1v8a1.5 1.5 0 0 1-3 0V18" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  gold:     `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#D69A00"/><path d="M9 16l9-5 9 5v3l-9 5-9-5z" fill="#fff" opacity=".9"/></svg>`,
  silver:   `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#ADABB8"/><path d="M9 16l9-5 9 5v3l-9 5-9-5z" fill="#fff" opacity=".9"/></svg>`,
  nickel:   `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#88887B"/><circle cx="18" cy="18" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="#fff"/></svg>`,
  copper:   `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#C26A44"/><circle cx="18" cy="18" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="#fff"/></svg>`,
  tin:      `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#D4D3C9"/><circle cx="18" cy="18" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="#fff"/></svg>`,
  aluminum: `<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#A9ACB6"/><circle cx="18" cy="18" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="2" fill="#fff"/></svg>`,
};

// Round 18 px brand icons for news cards (color-faithful approximations of Figma vectors).
const ICON_18 = {
  oil:        `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="9" fill="#000"/><path d="M9 4c-1.5 2.5-3 4-3 6a3 3 0 0 0 6 0c0-2-1.5-3.5-3-6z" fill="#fff"/></svg>`,
  bp:         `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="9" fill="#168A44"/><path d="M9 3l1.5 4.5L15 9l-4.5 1.5L9 15l-1.5-4.5L3 9l4.5-1.5z" fill="#FEDC00"/></svg>`,
  plains:     `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="9" fill="#083970"/><path d="M5 9h8M9 5v8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  devon:      `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="9" fill="#F1471D"/><path d="M5 7h8M5 11h8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  agri:       `<svg viewBox="0 0 26 18" width="26" height="18">`
              + `<circle cx="9" cy="9" r="9" fill="#FBC02D"/><circle cx="9" cy="9" r="5.5" fill="#FFD600"/>`
              + `<circle cx="14" cy="9" r="9" fill="#388E3C" mask="url(#agri-m)"/>`
              + `<defs><mask id="agri-m"><rect width="26" height="18" fill="#fff"/><circle cx="9" cy="9" r="9.5" fill="#000"/></mask></defs>`
              + `</svg>`,
  'baker-oil':`<svg viewBox="0 0 26 18" width="26" height="18">`
              + `<circle cx="9" cy="9" r="9" fill="#023D2F"/><path d="M5 7c2 0 3-2 4-2s2 2 4 2v4c-2 0-3 2-4 2s-2-2-4-2z" fill="#22C49A"/>`
              + `<circle cx="14" cy="9" r="9" fill="#000" mask="url(#bo-m)"/>`
              + `<path d="M14 5c-1 2-2 3-2 4a2 2 0 0 0 4 0c0-1-1-2-2-4z" fill="#fff" mask="url(#bo-m)"/>`
              + `<defs><mask id="bo-m"><rect width="26" height="18" fill="#fff"/><circle cx="9" cy="9" r="9.5" fill="#000"/></mask></defs>`
              + `</svg>`,
};

// Generic 24 px round logo for idea-card overlay
function tickerLogo(color) {
  return `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="${color}"/>`
       + `<path d="M12 5c-2 3.5-4 5.5-4 8a4 4 0 0 0 8 0c0-2.5-2-4.5-4-8z" fill="#fff"/></svg>`;
}

// TradingView "editor's pick" rocket flag (Figma 1:37155 — corner of card 1)
const ROCKET_SVG = `<svg viewBox="0 0 20 24" width="20" height="24" fill="none">`
                 + `<path d="M0 0h20v18l-10-5-10 5z" fill="#2962ff"/></svg>`;

// Comment + reaction icons used in idea-card footer
const COMMENT_SVG = `<svg viewBox="0 0 28 28" width="20" height="20"><path d="M5 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12l-5 4v-4H7a2 2 0 0 1-2-2z" fill="none" stroke="#8c8c8c" stroke-width="1.5"/></svg>`;
const BOOST_SVG   = `<svg viewBox="0 0 28 28" width="20" height="20"><path d="M9 19l-4 4 1-5a8 8 0 0 1 12-12l5-1-4 4-4 4a4 4 0 0 1-6 6z" fill="none" stroke="#8c8c8c" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

// Light right-chevron used in "ver todos" link and titles
const CHEV_SVG = `<svg viewBox="0 0 18 18" width="10" height="16"><path d="M6 4l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ───────────────────────────── DRAW ────────────────────────────── */

// Light mini sparkline used in idea-card preview (deterministic from seed).
function previewSvg(seed, up) {
  const n = 60;
  const stroke = up ? '#22ab94' : '#f7525f';
  const fill   = up ? 'rgba(34,171,148,.18)' : 'rgba(247,82,95,.18)';
  let x = 0, y = 50, vy = 0;
  const pts = [];
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const r = (s & 0xffff) / 0xffff - 0.5;
    vy = vy * 0.85 + r * 6 + (up ? -0.18 : 0.18);
    y = Math.max(6, Math.min(94, y + vy));
    pts.push([i, y]);
    x++;
  }
  const w = 406.33, h = 228.55;
  const sx = w / (n - 1);
  const sy = h / 100;
  const line = pts.map(([i, y], k) => `${k ? 'L' : 'M'}${(i * sx).toFixed(1)},${(y * sy).toFixed(1)}`).join(' ');
  const area = `${line} L${w.toFixed(1)},${h.toFixed(1)} L0,${h.toFixed(1)} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none">`
       + `<rect width="100%" height="100%" fill="#0f0f0f"/>`
       + `<path d="${area}" fill="${fill}"/>`
       + `<path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`
       + `</svg>`;
}

function ideaCardHtml(idea, isFirst) {
  return `
    <article class="s4-idea" data-href="${idea.href}">
      <div class="s4-idea-preview">
        <div class="s4-idea-img">${previewSvg(idea.seed, idea.up)}</div>
        ${isFirst ? `<div class="s4-idea-rocket">${ROCKET_SVG}</div>` : ''}
        <div class="s4-idea-logo">${tickerLogo(idea.tickerColor)}</div>
        ${isFirst ? `<div class="s4-idea-broker" style="background:${idea.brokerStripe}"></div>` : ''}
      </div>
      <div class="s4-idea-text">
        <a class="s4-idea-title" href="${idea.href}" target="_blank" rel="noopener">${idea.title}</a>
        <p class="s4-idea-body">${idea.body}</p>
      </div>
      <div class="s4-idea-footer">
        <div class="s4-idea-meta">
          <span class="s4-idea-author">${idea.author}</span>
          <span class="s4-idea-date">${idea.date}</span>
        </div>
        <div class="s4-idea-actions">
          ${idea.comments != null
              ? `<span class="s4-idea-btn s4-idea-btn--ghost">${COMMENT_SVG}<span>${idea.comments}</span></span>`
              : `<span class="s4-idea-btn s4-idea-btn--ghost s4-idea-btn--icon">${COMMENT_SVG}</span>`}
          <span class="s4-idea-btn s4-idea-btn--bordered">${BOOST_SVG}<span>${idea.likes}</span></span>
        </div>
      </div>
    </article>
  `;
}

function quoteRowHtml(q) {
  const chgClass = q.up ? 's4-up' : 's4-down';
  return `
    <a class="s4-q-row" href="#" data-ticker="${q.ticker}">
      <div class="s4-q-icon">${ICON_36[q.icon] || ICON_36.oil}</div>
      <div class="s4-q-meta">
        <div class="s4-q-title-row">
          <span class="s4-q-name">${q.name}</span>
          <span class="s4-q-mode" style="color:${q.modeColor}">${q.mode}</span>
          <span class="s4-q-status"></span>
        </div>
        <div class="s4-q-ticker"><span>${q.ticker}</span></div>
      </div>
      <div class="s4-q-right">
        <div class="s4-q-price">
          <span class="s4-q-num">${q.price}</span>
          <span class="s4-q-unit">${q.unit}</span>
        </div>
        <div class="s4-q-chg ${chgClass}">${q.chg}</div>
      </div>
    </a>
  `;
}

function newsCardHtml(n) {
  const iconHtml = n.icon ? `<span class="s4-news-icon">${ICON_18[n.icon] || ICON_18.oil}</span>` : '';
  return `
    <a class="s4-news" href="#" target="_blank" rel="noopener">
      <div class="s4-news-head">
        ${iconHtml}
        <span class="s4-news-date">${n.date} ·</span>
        <span class="s4-news-source">${n.source}</span>
      </div>
      <div class="s4-news-title">${n.title}</div>
    </a>
  `;
}

/* ─────────────────────────────── CSS ─────────────────────────────── */

const CSS = `
.s4 { width: 100%; padding: 0 40px; box-sizing: border-box; font-family: var(--font-ui); color: var(--grey-86, #dbdbdb); }
.s4-inner { max-width: 1397px; margin: 0 auto; width: 100%; }

.s4-h1 { font: 700 36px/44px var(--font-ui); color: var(--grey-86, #dbdbdb); margin: 0; padding: 22px 0 6px; display: inline-flex; align-items: baseline; gap: 6px; text-decoration: none; }
.s4-h1 .s4-chev { color: var(--grey-86, #dbdbdb); }
.s4-h2 { font: 700 28px/36px var(--font-ui); color: var(--grey-86, #dbdbdb); margin: 0; padding: 15px 0 5px; display: inline-flex; align-items: baseline; gap: 6px; text-decoration: none; }
.s4-h2 .s4-chev { color: var(--grey-86, #dbdbdb); }
.s4-section { padding: 0 0 24px; }

/* ───── Ideas carousel ───── */
.s4-ideas-wrap { position: relative; }
.s4-ideas-scroller { display: flex; gap: 32px; overflow-x: auto; overflow-y: hidden; padding: 6px 0 12px; scrollbar-width: none; scroll-snap-type: x mandatory; }
.s4-ideas-scroller::-webkit-scrollbar { display: none; }
.s4-idea { flex: 0 0 422px; height: 408px; border-radius: 16px; background: var(--grey-7, #121212); border: 1px solid rgba(140,140,140,.2); padding: 8px; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; scroll-snap-align: start; }
.s4-idea-preview { position: relative; width: 100%; height: 228px; border-radius: 8px; overflow: hidden; background: var(--grey-18, #2e2e2e); }
.s4-idea-img { position: absolute; inset: 0; }
.s4-idea-img svg { display: block; width: 100%; height: 100%; }
.s4-idea-broker { position: absolute; top: 0; left: 0; right: 0; height: 6px; border-top-left-radius: 8px; border-top-right-radius: 8px; }
.s4-idea-rocket { position: absolute; top: 0; left: 8px; }
.s4-idea-logo { position: absolute; bottom: 8px; left: 8px; }
.s4-idea-text { flex: 1; padding: 8px 0 0; overflow: hidden; }
.s4-idea-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font: 700 18px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); text-decoration: none; }
.s4-idea-body { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 8px 0 0; font: 400 16px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); }
.s4-idea-footer { display: flex; align-items: center; justify-content: space-between; height: 40px; padding-top: 8px; }
.s4-idea-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.s4-idea-author { font: 400 14px/18px var(--font-ui); color: var(--grey-86, #dbdbdb); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s4-idea-date { font: 400 14px/18px var(--font-ui); color: var(--grey-55, #8c8c8c); }
.s4-idea-actions { display: flex; gap: 8px; }
.s4-idea-btn { display: inline-flex; align-items: center; gap: 4px; height: 40px; padding: 0 12px; border-radius: 8px; font: 400 16px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); box-sizing: border-box; }
.s4-idea-btn--ghost { background: transparent; border: 1px solid transparent; }
.s4-idea-btn--icon { padding: 0 6px; }
.s4-idea-btn--bordered { border: 1px solid var(--grey-29, #4a4a4a); }

.s4-scroll-btn { position: absolute; top: 50%; transform: translateY(-50%); right: -24px; width: 48px; height: 48px; border-radius: 50%; background: var(--grey-11, #1c1c1c); border: 1px solid var(--grey-29, #4a4a4a); color: var(--grey-86, #dbdbdb); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.4); z-index: 2; }
.s4-scroll-btn:hover { background: var(--grey-18, #2e2e2e); }

/* ───── Quotes (energy / metals) ───── */
.s4-quotes-row { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
.s4-quotes-col { display: flex; flex-direction: column; }
.s4-quotes-table { display: grid; grid-template-columns: 1fr 1fr; column-gap: 64px; row-gap: 9px; padding-top: 5px; }
.s4-q-row { display: grid; grid-template-columns: 36px 1fr auto; column-gap: 8px; align-items: center; height: 52px; padding: 8px 0; border-top: 1px solid var(--grey-18, #2e2e2e); text-decoration: none; color: inherit; }
.s4-q-icon { width: 36px; height: 36px; border-radius: 18px; overflow: hidden; }
.s4-q-meta { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.s4-q-title-row { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.s4-q-name { font: 400 16px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s4-q-mode { font: 700 10px/16px var(--font-ui); text-transform: uppercase; }
.s4-q-status { width: 18px; height: 18px; display: inline-block; mask: radial-gradient(circle, #000 50%, transparent 52%) center / 8px 8px no-repeat; background: var(--grey-55, #8c8c8c); -webkit-mask: radial-gradient(circle, #000 50%, transparent 52%) center / 8px 8px no-repeat; }
.s4-q-ticker { display: inline-flex; }
.s4-q-ticker span { display: inline-block; padding: 4px 8px; background: var(--grey-18, #2e2e2e); border-radius: 6px; font: 700 12px/16px var(--font-ui); color: var(--grey-86, #dbdbdb); }
.s4-q-right { text-align: right; }
.s4-q-price { display: flex; align-items: baseline; justify-content: flex-end; gap: 2px; font: 400 16px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); }
.s4-q-unit { font: 400 11px/16px var(--font-ui); letter-spacing: .4px; text-transform: uppercase; color: var(--grey-86, #dbdbdb); }
.s4-q-chg { font: 400 16px/24px var(--font-ui); }
.s4-up { color: #22ab94; }
.s4-down { color: #f7525f; }

.s4-foot-link { display: inline-flex; align-items: center; gap: 4px; height: 24px; margin-top: 24px; font: 700 16px/24px var(--font-ui); color: #5b9cf6; text-decoration: none; }
.s4-foot-link:hover { text-decoration: underline; }

/* ───── News grid ───── */
.s4-news-grid { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 64px; row-gap: 32px; padding-top: 0; }
.s4-news { display: flex; flex-direction: column; gap: 8px; height: 114px; padding: 8px; border-radius: 12px; text-decoration: none; color: inherit; box-sizing: border-box; }
.s4-news:hover { background: rgba(255,255,255,.03); }
.s4-news-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 18px; font: 400 14px/18px var(--font-ui); color: var(--grey-55, #8c8c8c); }
.s4-news-icon { display: inline-flex; align-items: center; padding-right: 4px; }
.s4-news-title { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; font: 400 15.9px/24px var(--font-ui); color: var(--grey-86, #dbdbdb); }

@media (max-width: 1024px) {
  .s4-quotes-row { grid-template-columns: 1fr; gap: 32px; }
  .s4-news-grid  { grid-template-columns: repeat(2, 1fr); column-gap: 32px; }
}
@media (max-width: 640px) {
  .s4 { padding: 0 16px; }
  .s4-quotes-table { grid-template-columns: 1fr; column-gap: 0; }
  .s4-news-grid    { grid-template-columns: 1fr; }
  .s4-idea { flex-basis: 320px; }
}
`;

/* ────────────────────────── ENTRY POINT ─────────────────────────── */

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-section-4', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const ideasHtml  = IDEAS.map((it, i) => ideaCardHtml(it, i === 0)).join('');
  const energyHtml = ENERGY.map(quoteRowHtml).join('');
  const metalsHtml = METALS.map(quoteRowHtml).join('');
  const newsHtml   = NEWS.map(newsCardHtml).join('');

  container.innerHTML = `
    <section class="s4" aria-label="Futuros y materias primas">
      <div class="s4-inner">

        <a class="s4-h1" href="https://es.tradingview.com/markets/futures/" target="_blank" rel="noopener">
          Futuros y materias primas <span class="s4-chev">${CHEV_SVG}</span>
        </a>

        <!-- (1) Ideas de trading -->
        <div class="s4-section">
          <a class="s4-h2" href="https://es.tradingview.com/markets/futures/ideas/" target="_blank" rel="noopener">
            Ideas de trading <span class="s4-chev">${CHEV_SVG}</span>
          </a>
          <div class="s4-ideas-wrap">
            <div class="s4-ideas-scroller" id="s4-ideas-scroller">${ideasHtml}</div>
            <button type="button" class="s4-scroll-btn" id="s4-ideas-next" aria-label="Siguiente">${CHEV_SVG}</button>
          </div>
        </div>

        <!-- (2) Quotes: energy + metals -->
        <div class="s4-section s4-quotes-row">
          <div class="s4-quotes-col">
            <a class="s4-h2" href="https://es.tradingview.com/markets/futures/quotes-energy/" target="_blank" rel="noopener">
              Futuros de energía <span class="s4-chev">${CHEV_SVG}</span>
            </a>
            <div class="s4-quotes-table">${energyHtml}</div>
            <a class="s4-foot-link" href="https://es.tradingview.com/markets/futures/quotes-energy/" target="_blank" rel="noopener">
              Ver todos los futuros de energía <span class="s4-chev">${CHEV_SVG}</span>
            </a>
          </div>
          <div class="s4-quotes-col">
            <a class="s4-h2" href="https://es.tradingview.com/markets/futures/quotes-metals/" target="_blank" rel="noopener">
              Futuros de metales <span class="s4-chev">${CHEV_SVG}</span>
            </a>
            <div class="s4-quotes-table">${metalsHtml}</div>
            <a class="s4-foot-link" href="https://es.tradingview.com/markets/futures/quotes-metals/" target="_blank" rel="noopener">
              Ver todos los futuros de metales <span class="s4-chev">${CHEV_SVG}</span>
            </a>
          </div>
        </div>

        <!-- (3) News -->
        <div class="s4-section">
          <a class="s4-h2" href="https://es.tradingview.com/markets/futures/news/" target="_blank" rel="noopener">
            Noticias sobre futuros <span class="s4-chev">${CHEV_SVG}</span>
          </a>
          <div class="s4-news-grid">${newsHtml}</div>
          <a class="s4-foot-link" href="https://es.tradingview.com/markets/futures/news/" target="_blank" rel="noopener">
            Seguir leyendo <span class="s4-chev">${CHEV_SVG}</span>
          </a>
        </div>

      </div>
    </section>
  `;

  // Idea-card click → route via ctx if provided
  container.querySelectorAll('.s4-idea').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const href = el.dataset.href;
      if (href && href !== '#') window.open(href, '_blank', 'noopener');
      ctx.onIdea?.(href);
    });
  });

  // Carousel "next" button
  const scroller = container.querySelector('#s4-ideas-scroller');
  const next = container.querySelector('#s4-ideas-next');
  next?.addEventListener('click', () => {
    scroller?.scrollBy({ left: 454, behavior: 'smooth' });
  });

  // Quote row click → emit via ctx
  container.querySelectorAll('.s4-q-row').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      ctx.onTicker?.(el.dataset.ticker);
    });
  });
}
