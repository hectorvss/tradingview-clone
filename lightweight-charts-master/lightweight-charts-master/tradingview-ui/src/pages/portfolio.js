// portfolio.js — TradingView clone "Carteras" landing page
// Public API: createPortfolioPage(mount, opts) -> { render, destroy }
//
// Visual reference: Figma file 2QhXqtb66hdeKvlZAZE4fS, node 16:110390
//   sub-frames extracted:
//     16:110217  cards grid (4× Component 6) — card icons Vector..Vector4
//     16:110262  onboarding text container (5× Component 7 list items)
//     16:110287  mediaWrapper (right preview, captured as PNG screenshot)
//     16:110310  slider button (Component 8 + arrow Vector)
//     16:110329  right rail (45w, 9× Component 8 instances) — reused from fundamental-graphs

// ---------------------------------------------------------------------------
// Design tokens (extracted from Figma color/* variables)
// ---------------------------------------------------------------------------
const T = {
  bg0: '#0f0f0f',
  bg1: '#000000',          // card background (Figma bg-black)
  bg2: '#1a1e21',
  bg3: '#1e222d',
  bd1: '#2a2e39',
  bd2: '#363a45',
  bdCard: '#4a4a4a',       // dashed card border from Figma
  txt0: '#ffffff',          // grey/100 white — active title
  txt1: '#dbdbdb',          // grey/86 — body
  txt2: '#b8b8b8',          // grey/72 — subtext
  txtMuted: '#8c8c8c',      // grey/55 — card description
  txtInactive: '#707070',   // grey/44 — inactive list items
  blue: '#2962ff',
  magenta: '#d500f9',
  railIcon: '#949494',
  pillBg: 'rgba(46,46,46,0.4)',
};

// ---------------------------------------------------------------------------
// Style injection (scoped by tv-port- prefix)
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-port-root {
  position: fixed;
  inset: 0;
  background: ${T.bg0};
  color: ${T.txt1};
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Trebuchet MS", Ubuntu, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}
.tv-port-root *, .tv-port-root *::before, .tv-port-root *::after { box-sizing: border-box; }
.tv-port-root button { font-family: inherit; }

/* ------ Top header ------ */
.tv-port-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px 0 40px;
  background: ${T.bg0};
  border-bottom: 1px solid ${T.bd1};
  gap: 8px;
}
.tv-port-logo { display: flex; align-items: center; gap: 8px; color: ${T.txt0}; text-decoration: none; margin-right: 24px; }
.tv-port-logo img { display: block; }
.tv-port-logo-mark { position: relative; width: 36px; height: 28px; flex-shrink: 0; }
.tv-port-logo-mark img { position: absolute; max-width: none; }
.tv-port-logo-mark .bg  { top: 14.29%; right: 1.39%; bottom: 21.43%; left: 0; width: auto; height: auto; }
.tv-port-logo-mark .dot { top: 14.29%; right: 33.33%; bottom: 57.14%; left: 44.44%; width: auto; height: auto; }
.tv-port-logo-word { width: 147px; height: 28px; flex-shrink: 0; }
.tv-port-search {
  display: flex; align-items: center; width: 200px; height: 40px;
  background: ${T.bg2}; border-radius: 6px; padding: 0 12px;
  color: ${T.txtMuted}; font-size: 13px; gap: 8px; cursor: text;
}
.tv-port-search img { opacity: 0.75; }
.tv-port-nav { display: flex; align-items: center; margin-left: 8px; }
.tv-port-nav a {
  padding: 0 16px; height: 40px;
  display: inline-flex; align-items: center;
  color: ${T.txt1}; text-decoration: none;
  font-size: 14px; font-weight: 500; border-radius: 6px;
}
.tv-port-nav a:hover { background: ${T.bg2}; }
.tv-port-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.tv-port-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #d500f9 0%, #5d2bff 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.tv-port-offer {
  height: 32px; padding: 0 14px; border-radius: 6px;
  background: linear-gradient(90deg, ${T.magenta} 0%, ${T.blue} 100%);
  color: #fff; border: none; font-weight: 600; font-size: 13px; cursor: pointer;
}

/* ------ Body layout ------ */
.tv-port-body { flex: 1; display: flex; min-height: 0; }
.tv-port-main {
  flex: 1; min-width: 0; overflow-y: auto;
  padding: 0 40px 64px;
}
.tv-port-rail {
  flex-shrink: 0; width: 45px; background: ${T.bg0};
  border-left: 1px solid ${T.bd1};
  display: flex; flex-direction: column; align-items: center;
  padding: 2px 0; gap: 0;
}
.tv-port-rail-btn {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: ${T.txtMuted};
  cursor: pointer; border-radius: 4px;
}
.tv-port-rail-btn:hover { background: ${T.bg2}; color: ${T.txt0}; }
.tv-port-rail-btn.is-active { color: ${T.txt0}; background: ${T.bg2}; }
.tv-port-rail-glyph {
  position: relative; width: 28px; height: 28px; display: block;
  filter: invert(63%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(95%) contrast(85%);
}
.tv-port-rail-btn:hover .tv-port-rail-glyph,
.tv-port-rail-btn.is-active .tv-port-rail-glyph {
  filter: invert(98%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(102%) contrast(101%);
}
.tv-port-rail-spacer { flex: 1; }
.tv-port-rail-sep { width: 33px; height: 1px; background: ${T.bd2}; margin: 6px 0; }

/* ------ Title bar ------ */
.tv-port-title-bar { padding: 15px 0; }
.tv-port-title {
  font-family: Roboto, sans-serif;
  font-size: 22px; font-weight: 700;
  color: ${T.txt1};
  line-height: 28px;
  margin: 0;
}

/* ------ Cards grid (4 creation options) ------ */
.tv-port-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
  margin-bottom: 56px;
}
.tv-port-card {
  background: ${T.bg1};
  border: 1px dashed ${T.bdCard};
  border-radius: 16px;
  min-height: 188px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 42px 17px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}
.tv-port-card:hover {
  border-color: ${T.blue};
  border-style: solid;
  background: #0a0d12;
}
.tv-port-card-icon {
  position: relative;
  width: 28px; height: 28px;
  margin-bottom: 8px;
}
.tv-port-card-icon img {
  position: absolute; display: block; max-width: none;
  width: auto; height: auto;
}
.tv-port-card-title {
  font-weight: 700;
  font-size: 18px;
  line-height: 24px;
  color: ${T.txt1};
  text-align: center;
  padding: 8px 0;
  white-space: nowrap;
}
.tv-port-card-desc {
  font-size: 14px;
  line-height: 18px;
  color: ${T.txtMuted};
  text-align: center;
  min-height: 36px;
  padding: 0 4px 4px;
}

/* ------ Onboarding "Empiece en segundos" panel ------ */
.tv-port-onboard {
  background: ${T.bg1};
  border-radius: 16px;
  padding: 57px 52px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;
  position: relative;
  min-height: 580px;
}
.tv-port-onboard-text {
  display: flex; flex-direction: column; gap: 32px;
}
.tv-port-onboard-item {
  display: flex; flex-direction: column; justify-content: center;
  padding-right: 28px;
}
.tv-port-onboard-item-title {
  font-family: Roboto, sans-serif;
  font-weight: 700;
  font-size: 36px;
  line-height: 44px;
  color: ${T.txtInactive};
  margin: 0;
  cursor: pointer;
  transition: color 120ms ease;
}
.tv-port-onboard-item.is-active .tv-port-onboard-item-title {
  color: ${T.txt0};
}
.tv-port-onboard-item-sub {
  font-weight: 400;
  font-size: 18px;
  line-height: 28px;
  color: ${T.txt2};
  margin: 16px 0 0;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 200ms ease, opacity 200ms ease, margin 200ms ease;
}
.tv-port-onboard-item.is-active .tv-port-onboard-item-sub {
  max-height: 100px;
  opacity: 1;
  margin: 16px 0 0;
}

.tv-port-onboard-media {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0;
}
.tv-port-onboard-preview {
  position: relative;
  width: 100%;
  max-width: 520px;
  height: 360px;
  border-radius: 12px;
  overflow: hidden;
  background: ${T.bg0};
  border: 1px solid ${T.bd1};
}
.tv-port-preview-carousel {
  position: relative;
  width: 100%;
  height: 100%;
}
.tv-port-preview-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 280ms ease;
  pointer-events: none;
}
.tv-port-preview-frame.is-active {
  opacity: 1;
}
.tv-port-onboard-preview::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 70px;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, ${T.bg1} 100%);
  pointer-events: none;
}

/* ------ Onboarding slider controls (Component 8 row) ------ */
.tv-port-slider {
  position: absolute;
  right: 52px;
  bottom: 32px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tv-port-slider-btn {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: ${T.pillBg};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 5px;
}
.tv-port-slider-btn:hover { background: rgba(70,70,70,0.6); }
.tv-port-slider-btn img {
  width: 18px; height: 18px; display: block;
  filter: invert(98%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(102%) contrast(101%);
}
.tv-port-slider-btn.tv-port-slider-prev img { transform: rotate(180deg); }
.tv-port-slider-text {
  min-width: 37px;
  height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
  color: ${T.txt1};
  padding: 0 6px;
}
.tv-port-slider-pause {
  position: relative;
  margin-left: 8px;
}
.tv-port-slider-pause::before,
.tv-port-slider-pause::after {
  content: "";
  position: absolute;
  top: 8px; bottom: 8px; width: 3px;
  background: ${T.txt0};
  border-radius: 1px;
}
.tv-port-slider-pause::before { left: 10px; }
.tv-port-slider-pause::after  { right: 10px; }
`;
  const tag = document.createElement('style');
  tag.setAttribute('data-tv-port', '');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Figma-extracted assets
// ---------------------------------------------------------------------------
const FIG_FG = '/figma/fundamental-graphs';
const FIG    = '/figma/portfolio';

const IMG = {
  // Reused header / rail (from fundamental-graphs)
  logoMarkBg:   `${FIG_FG}/logo-mark-bg.svg`,
  logoMarkDot:  `${FIG_FG}/logo-mark-dot.svg`,
  logoWordmark: `${FIG_FG}/logo-wordmark.svg`,
  search:       `${FIG_FG}/search-icon.svg`,
  railWatchA:   `${FIG_FG}/rail-watchlist-a.svg`,
  railWatchB:   `${FIG_FG}/rail-watchlist-b.svg`,
  railAlertA:   `${FIG_FG}/rail-alertas-a.svg`,
  railAlertB:   `${FIG_FG}/rail-alertas-b.svg`,
  railChatA:    `${FIG_FG}/rail-chats-a.svg`,
  railChatB:    `${FIG_FG}/rail-chats-b.svg`,
  railInd:      `${FIG_FG}/rail-indicators.svg`,
  railCal:      `${FIG_FG}/rail-calendarios.svg`,
  railComm:     `${FIG_FG}/rail-comunidad.svg`,
  railNotifA:   `${FIG_FG}/rail-notif-a.svg`,
  railNotifB:   `${FIG_FG}/rail-notif-b.svg`,
  railNotifC:   `${FIG_FG}/rail-notif-c.svg`,
  railNotifD:   `${FIG_FG}/rail-notif-d.svg`,
  railProd:     `${FIG_FG}/rail-productos.svg`,
  railHelp:     `${FIG_FG}/rail-help.svg`,

  // Portfolio-specific (downloaded from Figma node 16:110217 vectors)
  cardCsv:       `${FIG}/card-icon-csv.svg`,
  cardManual:    `${FIG}/card-icon-manual.svg`,
  cardWatchlist: `${FIG}/card-icon-watchlist.svg`,
  cardWatchlist2:`${FIG}/card-icon-watchlist-2.svg`,
  cardPaper:     `${FIG}/card-icon-paper.svg`,
  sliderArrow:   `${FIG}/slider-arrow.svg`,
  preview:       `${FIG}/preview.png`,
  // 5 video poster frames extracted from Figma node 16:110287 (mediaWrapper)
  // Map 1:1 with ONBOARD_ITEMS:
  //   16:110292 my-portfolio-dark.webm     -> preview-1.png  ("Empiece en segundos")
  //   16:110296 portfolio-change-dark.webm -> preview-2.png  ("Controlar el rendimiento")
  //   16:110300 performance-dark.webm      -> preview-3.png  ("Mida el potencial")
  //   16:110304 distribution-dark.webm     -> preview-4.png  ("Gestione la diversificación")
  //   16:110308 risks-dark.webm            -> preview-5.png  ("Analizar riesgos")
  previewFrames: [
    `${FIG}/preview-1.png`,
    `${FIG}/preview-2.png`,
    `${FIG}/preview-3.png`,
    `${FIG}/preview-4.png`,
    `${FIG}/preview-5.png`,
  ],
};

// Rail icon: same layered <img> approach used in fundamental-graphs.
function railIcon(title, layers) {
  const imgs = layers.map((l) => {
    const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;`;
    return `<img src="${l.src}" alt="" style="${style}width:auto;height:auto;display:block;max-width:none;" />`;
  }).join('');
  return `<button class="tv-port-rail-btn" title="${title}"><span class="tv-port-rail-glyph">${imgs}</span></button>`;
}

// ---------------------------------------------------------------------------
// Card config — insets from Figma vector layer captures (Component 1 variants)
// ---------------------------------------------------------------------------
const CARDS = [
  {
    title: 'Cargar archivo CSV',
    desc: 'Transfiera rápidamente todas las transacciones desde un archivo',
    layers: [{ src: IMG.cardCsv, t: 19.43, r: 17.86, b: 17.86, l: 21.43 }],
  },
  {
    title: 'Crear manualmente',
    desc: 'Añada a mano solo las transacciones que desee',
    layers: [{ src: IMG.cardManual, t: 17.86, r: 17.86, b: 17.86, l: 17.86 }],
  },
  {
    title: 'Añadir de la lista de seguimiento',
    desc: 'Elija entre las listas de seguimiento guardadas y personalice las transacciones',
    layers: [
      { src: IMG.cardWatchlist,   t: 25,    r: 32.14, b: 41.07, l: 32.14 },
      { src: IMG.cardWatchlist2, t: 10.71, r: 17.86, b: 10.71, l: 17.86 },
    ],
  },
  {
    title: 'Importar desde Paper Trading',
    desc: 'Seleccione una cuenta desde la que añadir operaciones',
    layers: [{ src: IMG.cardPaper, t: 17.86, r: 10.71, b: 14.28, l: 14.29 }],
  },
];

// ---------------------------------------------------------------------------
// Onboarding list — captured from node 16:110262 (5× Component 7)
// ---------------------------------------------------------------------------
const ONBOARD_ITEMS = [
  {
    title: 'Empiece en segundos',
    sub: 'Cree su cartera y cargue su histórico de operaciones: rápido, sencillo y sin complicaciones.',
  },
  { title: 'Controlar el rendimiento de las inversiones' },
  { title: 'Mida el potencial' },
  { title: 'Gestione la diversificación' },
  { title: 'Analizar riesgos y resultados' },
];

// ---------------------------------------------------------------------------
// Main page factory
// ---------------------------------------------------------------------------
export function createPortfolioPage(mount, opts = {}) {
  ensureStyles();
  mount.innerHTML = '';

  const state = {
    activeItem: 0,
    autoplay: true,
  };

  const root = document.createElement('div');
  root.className = 'tv-port-root';

  function cardLayersHTML(layers) {
    return layers.map((l) => {
      const style = `position:absolute;top:${l.t}%;right:${l.r}%;bottom:${l.b}%;left:${l.l}%;`;
      return `<img src="${l.src}" alt="" style="${style}width:auto;height:auto;max-width:none;" />`;
    }).join('');
  }

  function cardHTML(c) {
    return `
      <button class="tv-port-card" type="button" data-card-title="${c.title}">
        <span class="tv-port-card-icon">${cardLayersHTML(c.layers)}</span>
        <span class="tv-port-card-title">${c.title}</span>
        <span class="tv-port-card-desc">${c.desc}</span>
      </button>`;
  }

  function onboardItemHTML(it, i) {
    const active = i === state.activeItem ? ' is-active' : '';
    const sub = it.sub ? `<p class="tv-port-onboard-item-sub">${it.sub}</p>` : '';
    return `
      <div class="tv-port-onboard-item${active}" data-onboard-idx="${i}">
        <h2 class="tv-port-onboard-item-title">${it.title}</h2>
        ${sub}
      </div>`;
  }

  root.innerHTML = `
    <div class="tv-port-header">
      <a href="#/" class="tv-port-logo" aria-label="TradingView">
        <span class="tv-port-logo-mark">
          <img class="bg"  src="${IMG.logoMarkBg}"  alt="" />
          <img class="dot" src="${IMG.logoMarkDot}" alt="" />
        </span>
        <img class="tv-port-logo-word" src="${IMG.logoWordmark}" alt="TradingView" />
      </a>
      <div class="tv-port-search"><img src="${IMG.search}" width="16" height="16" alt="" /><span>Buscar (Ctrl+K)</span></div>
      <nav class="tv-port-nav">
        <a href="#/">Productos</a>
        <a href="#/news">Comunidad</a>
        <a href="#/screener">Mercados</a>
        <a href="#/">Brókeres</a>
        <a href="#/">Más</a>
      </nav>
      <div class="tv-port-header-right">
        <div class="tv-port-avatar" title="Perfil">H</div>
        <button class="tv-port-offer">Ampliar</button>
      </div>
    </div>

    <div class="tv-port-body">
      <div class="tv-port-main">
        <div class="tv-port-title-bar">
          <h1 class="tv-port-title">Carteras</h1>
        </div>

        <div class="tv-port-cards" data-cards>
          ${CARDS.map(cardHTML).join('')}
        </div>

        <section class="tv-port-onboard">
          <div class="tv-port-onboard-text" data-onboard-text>
            ${ONBOARD_ITEMS.map(onboardItemHTML).join('')}
          </div>

          <div class="tv-port-onboard-media">
            <div class="tv-port-onboard-preview">
              <div class="tv-port-preview-carousel" data-preview-carousel data-active="0">
                ${IMG.previewFrames.map((src, i) => `
                  <img class="tv-port-preview-frame${i === 0 ? ' is-active' : ''}"
                       data-preview-idx="${i}"
                       src="${src}"
                       alt="Vista previa ${i + 1}" />`).join('')}
              </div>
            </div>
          </div>

          <div class="tv-port-slider">
            <button class="tv-port-slider-btn tv-port-slider-prev" type="button" data-slider="prev" title="Anterior">
              <img src="${IMG.sliderArrow}" alt="" />
            </button>
            <span class="tv-port-slider-text" data-slider-text>1 / ${ONBOARD_ITEMS.length}</span>
            <button class="tv-port-slider-btn tv-port-slider-next" type="button" data-slider="next" title="Siguiente">
              <img src="${IMG.sliderArrow}" alt="" />
            </button>
            <button class="tv-port-slider-btn tv-port-slider-pause" type="button" data-slider="pause" title="Pausar" aria-label="Pausar"></button>
          </div>
        </section>
      </div>

      <aside class="tv-port-rail">
        ${railIcon('Listas',         [{ src: IMG.railWatchA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railWatchB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Alertas',        [{ src: IMG.railAlertA, t: 36.36, r: 36.36, b: 43.18, l: 36.36 }, { src: IMG.railAlertB, t: 25, r: 27.27, b: 22.73, l: 27.27 }])}
        ${railIcon('Chats',          [{ src: IMG.railChatA,  t: 20.45, r: 20.45, b: 45.45, l: 20.45 }, { src: IMG.railChatB,  t: 25, r: 25,    b: 25,    l: 25 }])}
        <div class="tv-port-rail-spacer"></div>
        ${railIcon('Selector de datos', [{ src: IMG.railInd, t: 25, r: 22.7, b: 18.84, l: 22.73 }])}
        ${railIcon('Calendarios',    [{ src: IMG.railCal, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
        ${railIcon('Comunidad',      [{ src: IMG.railComm, t: 22.73, r: 22.73, b: 22.73, l: 22.73 }])}
        ${railIcon('Notificaciones', [
          { src: IMG.railNotifA, t: 22.73, r: 25,    b: 27.27, l: 25 },
          { src: IMG.railNotifB, t: 36.36, r: 38.64, b: 27.27, l: 25 },
          { src: IMG.railNotifC, t: 50,    r: 52.27, b: 27.27, l: 25 },
          { src: IMG.railNotifD, t: 63.64, r: 65.91, b: 27.27, l: 25 },
        ])}
        <div class="tv-port-rail-sep"></div>
        <button class="tv-port-rail-btn is-active" title="Productos"><span class="tv-port-rail-glyph"><img src="${IMG.railProd}" alt="" style="position:absolute;top:11.36%;right:11.36%;bottom:11.36%;left:11.36%;width:auto;height:auto;display:block;max-width:none;" /></span></button>
        ${railIcon('Ayuda', [{ src: IMG.railHelp, t: 18.18, r: 18.18, b: 18.18, l: 18.18 }])}
      </aside>
    </div>
  `;

  mount.appendChild(root);

  // ---- Interactions ----
  const textEl = root.querySelector('[data-onboard-text]');
  const sliderText = root.querySelector('[data-slider-text]');
  const carouselEl = root.querySelector('[data-preview-carousel]');
  const frameEls = carouselEl ? carouselEl.querySelectorAll('.tv-port-preview-frame') : [];

  function setActive(i) {
    state.activeItem = (i + ONBOARD_ITEMS.length) % ONBOARD_ITEMS.length;
    textEl.querySelectorAll('.tv-port-onboard-item').forEach((el, idx) => {
      el.classList.toggle('is-active', idx === state.activeItem);
    });
    if (carouselEl) carouselEl.dataset.active = String(state.activeItem);
    frameEls.forEach((el, idx) => {
      el.classList.toggle('is-active', idx === state.activeItem);
    });
    if (sliderText) sliderText.textContent = `${state.activeItem + 1} / ${ONBOARD_ITEMS.length}`;
  }

  textEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-onboard-idx]');
    if (!item) return;
    setActive(parseInt(item.dataset.onboardIdx, 10));
  });

  root.querySelectorAll('[data-slider]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.slider;
      if (a === 'prev') setActive(state.activeItem - 1);
      else if (a === 'next') setActive(state.activeItem + 1);
      else if (a === 'pause') {
        state.autoplay = !state.autoplay;
        btn.style.opacity = state.autoplay ? '1' : '0.5';
      }
    });
  });

  // Autoplay
  let autoTimer = setInterval(() => {
    if (state.autoplay) setActive(state.activeItem + 1);
  }, 4500);

  function destroy() {
    clearInterval(autoTimer);
    autoTimer = null;
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  function render() {
    // No-op; constructor already rendered. Provided to satisfy the page API.
  }

  return { render, destroy };
}

export default createPortfolioPage;
