// news.js — TradingView clone "Flujo de noticias" page
// Public API: createNewsPage(mount, opts) -> { render, destroy }
//
// Visual reference: Figma file 2QhXqtb66hdeKvlZAZE4fS
//   16:109496  Noticias
//
// Components extracted from Figma:
//   Component 7  (16:108729)  filter pill / dropdown
//   Component 8  (16:108837)  news feed item (link row)
//   Component 10 (16:109346)  source provider chip (top of article)
//   Component 11           icon button (right rail)
//   Component 12 (16:109416) tag chip
//
// Assets reused from /figma/fundamental-graphs/: logo, search, right-rail icons.
// New assets in /figma/news/: pill-caret.svg, hero-openai.png.

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const T = {
  bg0:  '#0f0f0f',
  bg1:  '#121212',
  bg2:  '#1a1e21',
  bg3:  '#1e222d',
  bdr1: '#2e2e2e',
  bdr2: '#3d3d3d',
  bdr3: '#4a4a4a',
  txt0: '#f2f2f2',
  txt1: '#dbdbdb',
  txt2: '#8c8c8c',
  txt3: '#767676',
  blue: '#2962ff',
};

// ---------------------------------------------------------------------------
// Reused / new asset paths
// ---------------------------------------------------------------------------
const FG  = '/figma/fundamental-graphs';
const NWS = '/figma/news';
const IMG = {
  logoMarkBg:   `${FG}/logo-mark-bg.svg`,
  logoMarkDot:  `${FG}/logo-mark-dot.svg`,
  logoWordmark: `${FG}/logo-wordmark.svg`,
  search:       `${FG}/search-icon.svg`,
  railWatchA:   `${FG}/rail-watchlist-a.svg`,
  railWatchB:   `${FG}/rail-watchlist-b.svg`,
  railAlertA:   `${FG}/rail-alertas-a.svg`,
  railAlertB:   `${FG}/rail-alertas-b.svg`,
  railChatA:    `${FG}/rail-chats-a.svg`,
  railChatB:    `${FG}/rail-chats-b.svg`,
  railInd:      `${FG}/rail-indicators.svg`,
  railCal:      `${FG}/rail-calendarios.svg`,
  railComm:     `${FG}/rail-comunidad.svg`,
  railNotifA:   `${FG}/rail-notif-a.svg`,
  railNotifB:   `${FG}/rail-notif-b.svg`,
  railNotifC:   `${FG}/rail-notif-c.svg`,
  railNotifD:   `${FG}/rail-notif-d.svg`,
  railProd:     `${FG}/rail-productos.svg`,
  railHelp:     `${FG}/rail-help.svg`,
  // News-specific
  pillCaret:    `${NWS}/pill-caret.svg`,
  heroOpenAI:   `${NWS}/hero-openai.png`,
  // Instrument logos (Figma feed leading icons)
  instDoge:      `${NWS}/sources/instrument-doge.png`,
  instDxc:       `${NWS}/sources/instrument-dxc.png`,
  instIberdrola: `${NWS}/sources/instrument-iberdrola.png`,
  instMelrose:   `${NWS}/sources/instrument-melrose.png`,
};

// ---------------------------------------------------------------------------
// Style injection (scoped by tv-news-)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-news-root {
  position: fixed; inset: 0;
  background: ${T.bg0};
  color: ${T.txt1};
  font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}
.tv-news-root *, .tv-news-root *::before, .tv-news-root *::after { box-sizing: border-box; }
.tv-news-root button { font-family: inherit; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; }
.tv-news-root a { color: inherit; text-decoration: none; }

/* ------ Header (64h) ------ */
.tv-news-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px 0 20px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bdr1};
  gap: 8px;
}
.tv-news-logo { display: flex; align-items: center; gap: 8px; color: ${T.txt0}; margin-right: 16px; }
.tv-news-logo-mark { position: relative; width: 36px; height: 28px; flex-shrink: 0; }
.tv-news-logo-mark img { position: absolute; max-width: none; display: block; }
.tv-news-logo-mark .bg  { top: 14.29%; right: 1.39%; bottom: 21.43%; left: 0; width: auto; height: auto; }
.tv-news-logo-mark .dot { top: 14.29%; right: 33.33%; bottom: 57.14%; left: 44.44%; width: auto; height: auto; }
.tv-news-logo-word { width: 147px; height: 28px; }

.tv-news-search {
  display: flex; align-items: center;
  width: 200px; height: 40px;
  background: ${T.bg2};
  border-radius: 6px;
  padding: 0 12px;
  color: ${T.txt2};
  font-size: 13px;
  gap: 8px;
  cursor: text;
}
.tv-news-search img { opacity: 0.75; }

.tv-news-nav { display: flex; align-items: center; margin-left: 8px; }
.tv-news-nav a {
  padding: 0 16px; height: 40px;
  display: inline-flex; align-items: center;
  color: ${T.txt1};
  font-size: 14px; font-weight: 500;
  border-radius: 6px;
}
.tv-news-nav a:hover { background: ${T.bg2}; }

.tv-news-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tv-news-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #d23f57;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 14px;
}
.tv-news-offer {
  height: 40px;
  padding: 0 16px;
  background: ${T.blue};
  color: #fff;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}
.tv-news-offer:hover { filter: brightness(1.08); }

/* ------ Body layout (main + right rail) ------ */
.tv-news-body { flex: 1; display: flex; min-height: 0; }
.tv-news-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; background: ${T.bg0}; }

/* ------ Title header ------ */
.tv-news-header2 {
  flex-shrink: 0;
  padding: 12px 20px 0;
}
.tv-news-product-name {
  font-size: 12px;
  font-weight: 500;
  color: ${T.txt2};
  margin: 0 0 6px;
  text-transform: none;
}
.tv-news-title-bar {
  display: flex; align-items: center;
  height: 34px;
  margin-bottom: 8px;
}
.tv-news-title-pill {
  display: inline-flex; align-items: center; gap: 4px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid ${T.bdr3};
  border-radius: 6px;
  background: transparent;
  color: ${T.txt0};
  font-size: 16px; font-weight: 500;
}
.tv-news-title-pill img { display: block; }

/* ------ Filter bar (pills) ------ */
.tv-news-filters {
  flex-shrink: 0;
  padding: 4px 20px 12px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bdr1};
}
.tv-news-pills {
  display: flex; flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tv-news-pill {
  display: inline-flex; align-items: center; gap: 4px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid ${T.bdr3};
  border-radius: 6px;
  background: transparent;
  color: ${T.txt2};
  font-size: 16px;
  white-space: nowrap;
}
.tv-news-pill:hover { background: ${T.bg2}; color: ${T.txt1}; }
.tv-news-pill img { display: block; }
.tv-news-pill-text { padding: 0 4px; line-height: 24px; }

/* ------ Two-column area: feed (left) + featured (right) ------ */
.tv-news-cols {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 550px;
  min-height: 0;
  border-top: 1px solid ${T.bdr1};
}
.tv-news-feed {
  overflow-y: auto;
  border-right: 1px solid ${T.bdr1};
  background: ${T.bg0};
}
.tv-news-feed::-webkit-scrollbar { width: 10px; }
.tv-news-feed::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }

/* Feed item (Component 8) */
.tv-news-item {
  display: block;
  padding: 12px 40px;
  border-bottom: 1px solid ${T.bdr1};
  cursor: pointer;
  background: transparent;
}
.tv-news-item:hover { background: ${T.bg2}; }
.tv-news-item.is-active { background: ${T.bdr2}; }
.tv-news-item-head {
  display: flex; align-items: center;
  gap: 0;
  min-height: 18px;
  color: ${T.txt2};
  font-size: 14px;
  line-height: 18px;
  margin-bottom: 4px;
}
.tv-news-item-instruments {
  display: inline-flex; align-items: center;
  margin-right: 8px;
  height: 18px;
}
.tv-news-item-instruments:empty { display: none; }
.tv-news-item-instrument {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: ${T.bdr1};
  display: inline-flex; align-items: center; justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.tv-news-item-instrument + .tv-news-item-instrument { margin-left: -3px; }
.tv-news-item-instrument img {
  width: 18px; height: 18px;
  display: block;
  object-fit: cover;
}
.tv-news-item-date { color: ${T.txt2}; }
.tv-news-item-date-pad { padding-left: 99px; }
.tv-news-item-sep { color: ${T.txt2}; }
.tv-news-item-provider { color: ${T.txt2}; }
.tv-news-item-title {
  color: ${T.txt1};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  max-height: 96px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* ------ Featured article (right panel) ------ */
.tv-news-featured {
  overflow-y: auto;
  background: ${T.bg0};
  padding: 20px 36px;
}
.tv-news-featured::-webkit-scrollbar { width: 10px; }
.tv-news-featured::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
.tv-news-featured-close {
  position: sticky; top: 0;
  margin-left: auto;
  display: block;
  width: 24px; height: 24px;
  color: ${T.txt2};
}
.tv-news-featured-inner { padding: 28px 0; }
.tv-news-featured-provider {
  display: inline-flex; align-items: center;
  height: 28px;
  color: ${T.txt0};
  font-size: 20px; font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}
.tv-news-featured-title {
  font-size: 24px;
  font-weight: 600;
  line-height: 28px;
  color: ${T.txt0};
  margin: 0 0 24px;
  font-family: 'Inter', -apple-system, sans-serif;
}
.tv-news-featured-meta {
  display: flex; align-items: center;
  gap: 4px;
  height: 18px;
  color: ${T.txt2};
  font-size: 14px;
  margin-bottom: 24px;
}
.tv-news-featured-meta .sep { padding: 0 4px; }
.tv-news-featured-hero {
  width: 100%; height: auto;
  display: block;
  border-radius: 4px;
  margin-bottom: 24px;
}
.tv-news-featured-body p {
  font-size: 16px;
  line-height: 28px;
  color: ${T.txt1};
  margin: 0 0 16px;
}
.tv-news-featured-body h3 {
  font-size: 18px;
  line-height: 28px;
  color: ${T.txt0};
  font-weight: 600;
  margin: 24px 0 12px;
}
.tv-news-featured-tags {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 24px;
}
.tv-news-tag {
  height: 28px;
  display: inline-flex; align-items: center;
  padding: 0 12px;
  border-radius: 6px;
  background: ${T.bdr1};
  color: #fff;
  font-size: 14px;
  line-height: 18px;
}
.tv-news-tag:hover { background: ${T.bdr2}; }

/* ------ Right rail (45w, reused from fundamental-graphs) ------ */
.tv-news-rail {
  flex-shrink: 0;
  width: 45px;
  background: ${T.bg0};
  border-left: 1px solid ${T.bdr1};
  display: flex; flex-direction: column;
  padding: 2px 0;
}
.tv-news-rail-btn {
  width: 44px; height: 44px;
  margin: 0 auto 2px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${T.txt2};
}
.tv-news-rail-btn:hover { background: ${T.bg2}; color: ${T.txt1}; }
.tv-news-rail-btn.is-active { background: ${T.bg2}; color: #fff; }
.tv-news-rail-glyph { position: relative; width: 24px; height: 24px; display: block; }
.tv-news-rail-glyph img { position: absolute; max-width: none; display: block; }
.tv-news-rail-spacer { flex: 1; }
.tv-news-rail-sep { width: 33px; height: 1px; background: ${T.bdr1}; margin: 6px auto; }

@media (max-width: 1100px) {
  .tv-news-cols { grid-template-columns: minmax(0, 1fr) 420px; }
  .tv-news-featured { padding: 16px 20px; }
  .tv-news-item { padding: 12px 20px; }
}
`;
  const tag = document.createElement('style');
  tag.setAttribute('data-tv-news', '');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
// In Figma, source publications (Invezz, Reuters, etc.) appear as plain text —
// there are no source-publication logos at all. The colored circle that shows
// before some rows is actually a *stack of instrument/ticker logos* relevant to
// the article. We extracted 4 real instrument icons from the Figma feed.
const INSTRUMENTS = {
  doge:      { src: IMG.instDoge,      alt: 'DOGE' },
  dxc:       { src: IMG.instDxc,       alt: 'DXC' },
  iberdrola: { src: IMG.instIberdrola, alt: 'Iberdrola' },
  melrose:   { src: IMG.instMelrose,   alt: 'Melrose' },
};

// `inst`: array of instrument-icon keys shown at the leading edge of the row.
// Rows without `inst` render text-only (matching Figma's actual design).
const FEED = [
  { src: 'Invezz',     date: '26 may, 10:03', title: 'CEO de OpenAI minimiza los temores de un apocalipsis laboral por la IA', active: true },
  { src: 'NewsBTC',    date: 'hace 14 min',   inst: ['doge'],                    title: 'Dogecoin podría necesitar mantenerse por encima de 0,1020 $ para evitar un retest del nivel inferior del canal paralelo' },
  { src: 'PR Newswire',date: 'hace 28 min',   inst: ['dxc'],                     title: 'DXC moderniza el servicio al cliente y las aplicaciones para Telenor Sweden' },
  { src: 'Invezz',     date: 'hace 42 min',   title: 'Por qué el 18 de junio podría ser un punto de inflexión para AAPL' },
  { src: 'Reuters',    date: 'hace 1 h',      inst: ['dxc','doge','iberdrola','melrose'], title: 'El CEO de OpenAI dice que es poco probable que la IA provoque un "apocalipsis laboral"' },
  { src: 'Estrategias de Inversión', date: 'hace 1 h', inst: ['iberdrola'],      title: 'Iberdrola supera niveles de resistencia, ¿continuidad alcista?' },
  { src: 'Reuters',    date: 'hace 2 h',      inst: ['melrose'],                 title: 'Melrose, propietaria de GKN Aerospace, cae un 7 % tras un incidente en una planta de California' },
  { src: 'Reuters',    date: 'hace 2 h',      inst: ['iberdrola','dxc','melrose','doge'], title: 'Apollo, Phillips 66, Valero Energy: las energéticas lideran las subidas en Wall Street' },
  { src: 'Reuters',    date: 'hace 3 h',      title: 'El BCE recorta su previsión de crecimiento de la zona euro al 1,1 % para 2026' },
  { src: 'Bloomberg',  date: 'hace 3 h',      title: 'La Fed mantiene los tipos sin cambios y Powell sugiere paciencia antes del próximo movimiento' },
  { src: 'CNBC',       date: 'hace 4 h',      title: 'Apple acelera la producción del iPhone 17 Pro en India ante una demanda mayor de lo previsto' },
  { src: 'ForexLive',  date: 'hace 4 h',      title: 'El dólar cae frente al euro tras los datos de empleo más débiles en EE. UU.' },
  { src: 'TipRanks',   date: 'hace 5 h',      title: 'Microsoft amplía su acuerdo con OpenAI con 10.000 millones adicionales para entrenamiento de modelos' },
  { src: 'MarketWatch',date: 'hace 6 h',      title: 'Bitcoin supera los 95.000 $ tras la aprobación de nuevos ETF de futuros en Hong Kong' },
  { src: 'Benzinga',   date: 'hace 7 h',      title: 'TSMC anuncia una segunda fábrica en Arizona valorada en 25.000 millones de dólares' },
  { src: 'WSJ',        date: 'hace 8 h',      title: 'Tesla retrasa el lanzamiento del Cybertruck en Europa por requisitos de homologación' },
  { src: 'FT',         date: 'hace 9 h',      title: 'Saudi Aramco estudia una nueva colocación de acciones de 13.000 millones para financiar Vision 2030' },
  { src: 'Cointelegraph', date: 'hace 10 h',  title: 'Ethereum activa la actualización Pectra: comisiones medias caen un 38 % en mainnet' },
  { src: 'Decrypt',    date: 'hace 11 h',     title: 'Coinbase obtiene licencia MiCA paneuropea y ampliará operativa desde Irlanda' },
];

const FILTERS = [
  { label: 'Lista de seguimiento', w: 191 },
  { label: 'Mercado',              w: 129 },
  { label: 'Empresa',              w: 105 },
  { label: 'Sector',               w: 88  },
  { label: 'Tipo de actividad',    w: 197 },
  { label: 'Hoy',                  w: 72  },
  { label: 'Importancia',          w: 115 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function instrumentStackHtml(keys) {
  if (!keys || !keys.length) return '';
  const icons = keys.map((k) => {
    const inst = INSTRUMENTS[k];
    if (!inst) return '';
    return `<span class="tv-news-item-instrument"><img src="${inst.src}" width="18" height="18" alt="${escapeHtml(inst.alt)}" /></span>`;
  }).join('');
  return `<span class="tv-news-item-instruments">${icons}</span>`;
}

function pillHtml(label) {
  return `
    <button class="tv-news-pill" type="button">
      <span class="tv-news-pill-text">${escapeHtml(label)}</span>
      <img src="${IMG.pillCaret}" width="10" height="6" alt="" />
    </button>`;
}

function feedItemHtml(item, idx) {
  const hasIcon = !!(item.inst && item.inst.length);
  return `
    <a class="tv-news-item${item.active ? ' is-active' : ''}" data-idx="${idx}" href="#">
      <div class="tv-news-item-head">
        ${instrumentStackHtml(item.inst)}
        <span class="tv-news-item-date${hasIcon ? '' : ' tv-news-item-date-pad'}">${escapeHtml(item.date)}</span>
        <span class="tv-news-item-sep">&nbsp;·&nbsp;</span>
        <span class="tv-news-item-provider">${escapeHtml(item.src)}</span>
      </div>
      <div class="tv-news-item-title">${escapeHtml(item.title)}</div>
    </a>`;
}

function railIcon(title, layers, active = false) {
  const imgs = layers.map((l) => {
    const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;width:auto;height:auto;`;
    return `<img src="${l.src}" alt="" style="${style}" />`;
  }).join('');
  return `<button class="tv-news-rail-btn${active ? ' is-active' : ''}" title="${escapeHtml(title)}"><span class="tv-news-rail-glyph">${imgs}</span></button>`;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------
export function createNewsPage(mount, opts = {}) {
  ensureStyles();

  function render() {
    mount.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'tv-news-root';
    root.innerHTML = `
      <div class="tv-news-header">
        <a href="#/" class="tv-news-logo" aria-label="TradingView">
          <span class="tv-news-logo-mark">
            <img class="bg"  src="${IMG.logoMarkBg}"  alt="" />
            <img class="dot" src="${IMG.logoMarkDot}" alt="" />
          </span>
          <img class="tv-news-logo-word" src="${IMG.logoWordmark}" alt="TradingView" />
        </a>
        <div class="tv-news-search"><img src="${IMG.search}" width="16" height="16" alt="" /><span>Buscar (Ctrl+K)</span></div>
        <nav class="tv-news-nav">
          <a href="#/">Productos</a>
          <a href="#/news">Comunidad</a>
          <a href="#/markets">Mercados</a>
          <a href="#/brokers">Brókeres</a>
          <a href="#/">Más</a>
        </nav>
        <div class="tv-news-header-right">
          <div class="tv-news-avatar" title="Perfil">H</div>
          <button class="tv-news-offer">Ampliar</button>
        </div>
      </div>

      <div class="tv-news-body">
        <div class="tv-news-main">
          <div class="tv-news-header2">
            <p class="tv-news-product-name">Flujo de noticias</p>
            <div class="tv-news-title-bar">
              <button class="tv-news-title-pill" type="button">
                <span class="tv-news-pill-text">Datos completos</span>
                <img src="${IMG.pillCaret}" width="10" height="6" alt="" />
              </button>
            </div>
          </div>

          <div class="tv-news-filters">
            <div class="tv-news-pills">
              ${FILTERS.map((f) => pillHtml(f.label)).join('')}
            </div>
          </div>

          <div class="tv-news-cols">
            <div class="tv-news-feed" data-feed>
              ${FEED.map((it, i) => feedItemHtml(it, i)).join('')}
            </div>

            <div class="tv-news-featured" data-featured>
              <div class="tv-news-featured-inner">
                <div class="tv-news-featured-provider">Invezz</div>
                <h1 class="tv-news-featured-title">CEO de OpenAI minimiza los temores de un apocalipsis laboral por la IA</h1>
                <div class="tv-news-featured-meta">
                  <span>26 may 2026, 10:03 GMT+2</span>
                  <span class="sep">·</span>
                  <span>2 minutos de lectura</span>
                </div>
                <img class="tv-news-featured-hero" src="${IMG.heroOpenAI}" alt="Sam Altman, CEO de OpenAI" />
                <div class="tv-news-featured-body">
                  <p>El director ejecutivo de OpenAI, Sam Altman, dijo el martes que el rápido crecimiento y la adopción de la inteligencia artificial no habían provocado el nivel de pérdidas de empleo que temía inicialmente, especialmente entre los trabajadores de cuello blanco de nivel inicial.</p>
                  <p>Hablando en una conferencia organizada por Commonwealth Bank of Australia en Sídney, Altman afirmó que sus preocupaciones anteriores sobre el impacto de la IA en el empleo global no se habían materializado por completo.</p>
                  <p>Altman dijo que él y otros directivos de OpenAI habían estado aproximadamente en lo cierto respecto a los avances tecnológicos previstos cuando ChatGPT se lanzó en 2022. Sin embargo, admitió que habían estado bastante equivocados en cuanto a las implicaciones sociales y económicas más amplias.</p>
                  <p>«Me alegra estar equivocado en esto. Pensé que para ahora habría habido un mayor impacto con la eliminación de empleos de cuello blanco de nivel inicial de lo que realmente ha ocurrido», dijo Altman al consejero delegado de CBA, Matt Comyn, durante la entrevista.</p>
                  <h3>El jefe de OpenAI reflexiona sobre preocupaciones anteriores</h3>
                  <p>Altman reconoció que las advertencias anteriores sobre el potencial de la IA para afectar al empleo habían contribuido a las preocupaciones generalizadas en torno a la tecnología.</p>
                  <p>Aunque Altman no aportó datos específicos de empleo durante la discusión, anteriormente se ha manifestado públicamente sobre la posibilidad de reducciones de plantilla en toda la industria impulsadas por los avances en la tecnología de IA.</p>
                  <h3>La parte humana del trabajo sigue importando</h3>
                  <p>Varias grandes empresas globales, incluidas HSBC, Amazon, Standard Chartered y Commonwealth Bank of Australia, han anunciado que algunos puestos dentro de sus organizaciones están siendo reemplazados o redefinidos mediante el uso de herramientas de IA y automatización.</p>
                  <p>Esa experiencia, señaló Altman, cambió su perspectiva sobre cómo la IA podría afectar al mercado laboral a largo plazo.</p>
                </div>
                <div class="tv-news-featured-tags">
                  <a class="tv-news-tag" href="#">Invezz</a>
                  <a class="tv-news-tag" href="#">OpenAI</a>
                  <a class="tv-news-tag" href="#">Inteligencia Artificial</a>
                  <a class="tv-news-tag" href="#">Mercado Laboral</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="tv-news-rail">
          ${railIcon('Listas',     [{ src: IMG.railWatchA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railWatchB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
          ${railIcon('Alertas',    [{ src: IMG.railAlertA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railAlertB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
          ${railIcon('Chats',      [{ src: IMG.railChatA,  t: 20.45, r: 20.45, b: 45.45, l: 20.45 }, { src: IMG.railChatB,  t: 25, r: 25,    b: 25,    l: 25 }])}
          <div class="tv-news-rail-spacer"></div>
          ${railIcon('Selector de datos', [{ src: IMG.railInd, t: 25, r: 22.7, b: 18.84, l: 22.73 }])}
          ${railIcon('Calendarios',[{ src: IMG.railCal,  t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
          ${railIcon('Comunidad',  [{ src: IMG.railComm, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
          ${railIcon('Notificaciones', [
            { src: IMG.railNotifA, t: 22.73, r: 25,    b: 27.27, l: 25 },
            { src: IMG.railNotifB, t: 36.36, r: 38.64, b: 27.27, l: 25 },
            { src: IMG.railNotifC, t: 50,    r: 52.27, b: 27.27, l: 25 },
            { src: IMG.railNotifD, t: 63.64, r: 65.91, b: 27.27, l: 25 },
          ])}
          <div class="tv-news-rail-sep"></div>
          ${railIcon('Productos',  [{ src: IMG.railProd, t: 11.36, r: 11.36, b: 11.36, l: 11.36 }], true)}
          ${railIcon('Ayuda',      [{ src: IMG.railHelp, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
        </aside>
      </div>
    `;
    mount.appendChild(root);

    // Click handler — make feed items selectable (purely visual)
    const feed = root.querySelector('[data-feed]');
    feed.addEventListener('click', (e) => {
      const item = e.target.closest('.tv-news-item');
      if (!item) return;
      e.preventDefault();
      feed.querySelectorAll('.tv-news-item.is-active').forEach((n) => n.classList.remove('is-active'));
      item.classList.add('is-active');
    });
  }

  function destroy() {
    mount.innerHTML = '';
  }

  return { render, destroy };
}

export default createNewsPage;
