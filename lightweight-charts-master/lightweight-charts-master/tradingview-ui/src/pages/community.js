// Página /community — clon de https://es.tradingview.com/social-network/
// Figma: file 2QhXqtb66hdeKvlZAZE4fS, frame 25:183747 (1440w default, 14859px alto)
// Renderiza llamando a renderCommunity(mount). Prefijo CSS: .cm-
//
// Secciones (en orden vertical):
//   1. header                         (25:180768) — Hero "Trading, jamás solo"
//   2. dé rienda suelta                (25:180859) — 3 tarjetas (Ideas / Scripts / Pensamientos)
//   3. usted ha creado universo        (25:180938) — Contador 16.441.124 + 3 stats
//   4. finanzas sociales (slider)      (25:180972) — Card con 4 tabs (Crear/Compartir/Aprenda/Colabore)
//   5. The Leap                        (25:181635) — Hero + 3 features
//   6. Pine, programando juntos        (25:181947) — Título + 5 chevron-cards + animación pine
//   7. Aquí hay wizards                (25:182134) — 3 filas de avatares con scroll
//   8. Dulces beneficios +$13M         (25:182887) — Hearts/Dollars + dos CTAs
//   9. Síganos                         (25:182986) — Profile + botón "Seguir a TradingView"
//  10. Amor en cada #TradingView       (25:183003) — Wall of love (17 tarjetas)
//  11. Planes para todos los niveles   (25:183169) — CTA "Empezar ahora" + astronauta
//  12. promoLinks footer mini          (25:183189) — Disclaimers

import './community.css';

// ---------------------------------------------------------------------------
// Datos extraídos del Figma
// ---------------------------------------------------------------------------

const STAT_ITEMS = [
  { count: '5.300 publicaciones', period: 'cada día',    icon: 'doc'   },
  { count: '221 publicaciones',   period: 'cada hora',   icon: 'clock' },
  { count: '4 publicaciones',     period: 'cada minuto', icon: 'bolt'  },
];

const LEAP_FEATURES = [
  {
    icon: 'chevronUp',
    title: 'Sencillo y accesible',
    desc:  'No se necesita dinero real ni una cuenta de broker, ni tampoco existen condiciones ocultas.',
  },
  {
    icon: 'cup',
    title: 'Competición verdadera',
    desc:  'Desafíe a otros traders y siga sus resultados.',
  },
  {
    icon: 'people',
    title: 'El poder de la comunidad',
    desc:  'Aprenda, practique y crezca junto a nuestra comunidad mundial.',
  },
];

const PINE_CARDS = [
  {
    icon: 'script',
    title: 'Scripts destacados',
    href:  '#/',
    desc:  'Analice scripts seleccionados por nuestros editores junto con las herramientas más populares de nuestra comunidad.',
  },
  {
    icon: 'code',
    title: ['Con código abierto en el', 'ADN'],
    href:  null,
    desc:  'Toneladas de scripts ingeniosos de los que aprender, porque en eso consiste la comunidad.',
  },
  {
    icon: 'book',
    title: 'Documentación sencilla',
    href:  '#/',
    desc:  'Estos manuales le ayudarán a iniciar su viaje por el mundo de los scripts y le guiarán por el camino.',
  },
  {
    icon: 'chat',
    title: 'La comunidad a su servicio',
    href:  null,
    desc:  'Los programadores de Pine se apoyan mutuamente, colaboran, revisan el código, responden preguntas y mucho más.',
  },
  {
    icon: 'freelance',
    title: 'Autónomos disponibles',
    href:  '#/',
    desc:  'Pida ayuda a un profesional para elaborar sus scripts o hágase autónomo para dar vida a las ideas de otros.',
  },
];

// Wizards: el Figma solo asigna 12 handles reales repartidos en la cabecera de
// las 3 filas (4 por fila). Los otros 50 contenedores se renderizan en Figma
// con el placeholder vacío (avatar + badge "Wizard" sin nombre), porque la
// pista se desplaza horizontalmente y los handles vacíos son tipográficamente
// suaves a propósito. Replicamos exactamente esa estructura: 22/20/20 cards,
// solo los primeros 4 de cada fila tienen nombre.
const WIZARDS_ROW_1 = [
  'HPotter', 'Madrid', 'glaz', 'UDAY_C_Santhakumar',
  ...Array.from({ length: 18 }, () => ''),
];
const WIZARDS_ROW_2 = [
  'DonovanWall', 'everget', 'e2e4', 'BacktestRookies',
  ...Array.from({ length: 16 }, () => ''),
];
const WIZARDS_ROW_3 = [
  'dgtrd', 'fikira', 'ImmortalFreedom', 'skinra',
  ...Array.from({ length: 16 }, () => ''),
];

// Wall of Love: 18 tarjetas en Figma, todas extraídas con handle real + imagen
// real desde Figma MCP (14 en pase 2 + 4 en pase 3). Imágenes descargadas en
// community-assets/wall-*.png.
const ASSETS = '/src/pages/community-assets';
const WALL_CARDS = [
  { handle: '@neo_inversion',                     img: `${ASSETS}/wall-neo_inversion.png`,        href: 'https://www.instagram.com/p/CQ78pekLHED/' },
  { handle: '@swingtradersociety',                img: `${ASSETS}/wall-swingtradersociety.png`,   href: 'https://www.instagram.com/p/BbZs0qeBH3w/' },
  { handle: '@sethsickness',                      img: `${ASSETS}/wall-sethsickness.png`,         href: 'https://www.instagram.com/p/CJvt68YDHCw/' },
  { handle: '@chartfeed',                         img: `${ASSETS}/wall-chartfeed.png`,            href: 'https://www.instagram.com/p/CW-eyvHsuo8/' },
  { handle: '@ftmocomx',                          img: `${ASSETS}/wall-ftmocomx.png`,             href: 'https://www.instagram.com/p/CUQA_ttI_3n/' },
  { handle: '@setupstrading',                     img: `${ASSETS}/wall-setupstrading-1.png`,      href: 'https://www.instagram.com/p/CK_ywGJLWPt/' },
  { handle: '@akamenyar',                         img: `${ASSETS}/wall-akamenyar.png`,            href: 'https://www.instagram.com/p/CpcDf3ooAuk/' },
  { handle: '@setupstrading',                     img: `${ASSETS}/wall-setupstrading-2.png`,      href: 'https://www.instagram.com/p/CKB_rICLKDq/' },
  { handle: '@trading.is.mylife',                 img: `${ASSETS}/wall-trading_is_mylife.png`,    href: 'https://www.instagram.com/p/CG53lcMgQ29/' },
  { handle: '@voyager_far_and_wide',              img: `${ASSETS}/wall-15.png`,                   href: 'https://www.instagram.com/p/CNyf4wQFMzg/' },
  { handle: '@half_bake_chef',                    img: `${ASSETS}/wall-16.png`,                   href: 'https://www.instagram.com/p/CZesx3GAMe2/' },
  { handle: '@ankushbajaj111',                    img: `${ASSETS}/wall-ankushbajaj111.png`,       href: 'https://x.com/ankushbajaj111/status/1802912107509256270' },
  { handle: '@hiramedina',                        img: `${ASSETS}/wall-17.png`,                   href: 'https://www.instagram.com/p/B5SvzQ8gtcp/' },
  { handle: 'Investing with Mike @michael_b_wang', img: `${ASSETS}/wall-18.png`,                  href: 'https://twitter.com/michael_b_wang/status/1349906095431507970' },
  { handle: '@kornevs',                           img: `${ASSETS}/wall-kornevs.png`,              href: 'https://www.instagram.com/p/B2QpX6jDkRI/' },
  { handle: '@TradingView',                       img: `${ASSETS}/wall-TradingView.png`,          href: 'https://twitter.com/tradingview/status/1344279492181811202' },
  { handle: '@mytradingsetup',                    img: `${ASSETS}/wall-mytradingsetup.png`,       href: 'https://www.instagram.com/p/BwmxzgMHe7U/' },
  { handle: '@investment_expertt',                img: `${ASSETS}/wall-investment_expertt.png`,   href: 'https://www.instagram.com/p/CA_d0T4h6gd/' },
];

// ---------------------------------------------------------------------------
// Iconos SVG (inline)
// ---------------------------------------------------------------------------

const ICONS = {
  // Iconos de las 3 cards "Dé rienda suelta"
  lightbulb: `<svg viewBox="0 0 28 28" fill="none"><path d="M14 3a8 8 0 0 0-5 14.3v3.2c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-3.2A8 8 0 0 0 14 3Z" stroke="currentColor" stroke-width="1.6"/><path d="M11 25h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  brackets: `<svg viewBox="0 0 28 28" fill="none"><path d="M11 5L6 14l5 9M17 5l5 9-5 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  speech: `<svg viewBox="0 0 28 28" fill="none"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h15A2.5 2.5 0 0 1 24 6.5v10A2.5 2.5 0 0 1 21.5 19H12l-6 5v-5H6.5A2.5 2.5 0 0 1 4 16.5v-10Z" stroke="currentColor" stroke-width="1.6"/></svg>`,

  // Iconos de stats (universo)
  doc: `<svg viewBox="0 0 56 56" fill="none"><rect x="14" y="10" width="24" height="32" rx="3" stroke="#2962ff" stroke-width="2"/><path d="M20 20h12M20 26h12M20 32h8" stroke="#2962ff" stroke-width="2" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="14" stroke="#00bce6" stroke-width="2"/><path d="M28 20v8l5 3" stroke="#00bce6" stroke-width="2" stroke-linecap="round"/></svg>`,
  bolt: `<svg viewBox="0 0 56 56" fill="none"><path d="M30 12l-12 18h8l-2 14 12-18h-8l2-14Z" fill="#d500f9" stroke="#d500f9" stroke-width="1.5" stroke-linejoin="round"/></svg>`,

  // Iconos para "The Leap"
  chevronUp: `<svg viewBox="0 0 44 44" fill="none"><path d="M14 26l8-8 8 8" stroke="#dbdbdb" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cup: `<svg viewBox="0 0 44 44" fill="none"><path d="M16 10h12v10a6 6 0 0 1-12 0V10Z" stroke="#dbdbdb" stroke-width="2"/><path d="M16 14h-3a3 3 0 0 0 0 6h3M28 14h3a3 3 0 0 1 0 6h-3M18 30h8M22 26v4" stroke="#dbdbdb" stroke-width="2" stroke-linecap="round"/></svg>`,
  people: `<svg viewBox="0 0 44 44" fill="none"><circle cx="22" cy="18" r="5" stroke="#dbdbdb" stroke-width="2"/><path d="M12 34c0-5 5-9 10-9s10 4 10 9" stroke="#dbdbdb" stroke-width="2" stroke-linecap="round"/></svg>`,

  // Iconos chevron-cards de Pine
  script: `<svg viewBox="0 0 44 44" fill="none"><path d="M14 10h12l6 6v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" stroke="#dbdbdb" stroke-width="1.8"/><path d="M16 22h12M16 28h12" stroke="#dbdbdb" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  code: `<svg viewBox="0 0 45 44" fill="none"><path d="M16 16l-6 6 6 6M29 16l6 6-6 6M26 12l-7 20" stroke="#dbdbdb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  book: `<svg viewBox="0 0 45 44" fill="none"><path d="M12 10h12a4 4 0 0 1 4 4v20H16a4 4 0 0 1-4-4V10Z" stroke="#dbdbdb" stroke-width="1.8"/><path d="M28 14h7v20H28" stroke="#dbdbdb" stroke-width="1.8"/></svg>`,
  chat: `<svg viewBox="0 0 45 44" fill="none"><path d="M10 14a4 4 0 0 1 4-4h17a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H20l-7 6v-6h-3v-16Z" stroke="#dbdbdb" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  freelance: `<svg viewBox="0 0 45 44" fill="none"><circle cx="22" cy="16" r="6" stroke="#dbdbdb" stroke-width="1.8"/><path d="M10 36c0-7 6-12 12-12s12 5 12 12" stroke="#dbdbdb" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  externalLink: `<svg viewBox="0 0 12 12" fill="none"><path d="M4 1h7v7M11 1L4 8M9 7v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3" stroke="#8c8c8c" stroke-width="1.2" stroke-linecap="round"/></svg>`,

  // Wall of love arrows
  arrowLeft:  `<svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#dbdbdb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#dbdbdb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Hearts & dollars (sección +$13M)
  heart:  `<svg viewBox="0 0 64 64" fill="none"><path d="M32 56s-22-13-22-30a12 12 0 0 1 22-7 12 12 0 0 1 22 7c0 17-22 30-22 30Z" fill="#ff3b3b" stroke="#ff3b3b" stroke-width="2" stroke-linejoin="round"/></svg>`,
  dollar: `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" fill="#22c55e"/><path d="M32 14v36M40 22c0-3-4-5-8-5s-8 2-8 6 4 5 8 6 8 2 8 6-4 6-8 6-8-2-8-5" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
  pause:  `<svg viewBox="0 0 28 28" fill="none"><rect x="9" y="7" width="3" height="14" rx="1" fill="#dbdbdb"/><rect x="16" y="7" width="3" height="14" rx="1" fill="#dbdbdb"/></svg>`,

  // Astronaut placeholder (último CTA)
  astronaut: `<svg viewBox="0 0 220 220" fill="none">
    <defs>
      <radialGradient id="ast-glow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#7339fd" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#7339fd" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="110" cy="110" r="110" fill="url(#ast-glow)"/>
    <circle cx="110" cy="95" r="46" fill="#f5f5f5" stroke="#dbdbdb" stroke-width="2"/>
    <ellipse cx="110" cy="95" rx="32" ry="30" fill="#1a1a1a"/>
    <ellipse cx="100" cy="88" rx="9" ry="6" fill="#2962ff" opacity="0.6"/>
    <rect x="80" y="138" width="60" height="60" rx="14" fill="#f5f5f5" stroke="#dbdbdb" stroke-width="2"/>
    <rect x="92" y="150" width="36" height="36" rx="4" fill="#2962ff"/>
    <path d="M40 150l40-10M180 150l-40-10" stroke="#f5f5f5" stroke-width="6" stroke-linecap="round"/>
  </svg>`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[c]));

function btn(label, opts = {}) {
  const cls = ['cm-btn'];
  if (opts.primary) cls.push('cm-btn-primary');
  if (opts.big)     cls.push('cm-btn-big');
  const href = opts.href || '#';
  return `<a class="${cls.join(' ')}" href="${esc(href)}" ${opts.href ? 'target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;
}

function chevronCard(c) {
  const titleHtml = Array.isArray(c.title)
    ? c.title.map((t) => `<span>${esc(t)}</span>`).join('')
    : `<span>${esc(c.title)}</span>`;
  const link = c.href
    ? `<a class="cm-chev-title cm-chev-title-link" href="${esc(c.href)}" target="_blank" rel="noopener">${titleHtml}${ICONS.externalLink}</a>`
    : `<div class="cm-chev-title">${titleHtml}</div>`;
  return `<div class="cm-chev-card">
    <div class="cm-chev-icon">${ICONS[c.icon] || ''}</div>
    ${link}
    <p class="cm-chev-desc">${esc(c.desc)}</p>
  </div>`;
}

function statItem(s) {
  return `<div class="cm-stat-item">
    <div class="cm-stat-icon">${ICONS[s.icon] || ''}</div>
    <div class="cm-stat-count">${esc(s.count)}</div>
    <div class="cm-stat-period">${esc(s.period)}</div>
  </div>`;
}

function wizardItem(name) {
  const empty = !name;
  return `<div class="cm-wiz${empty ? ' cm-wiz-empty' : ''}">
    <div class="cm-wiz-avatar">
      <img src="${ASSETS}/wizard-avatar.png" alt="" loading="lazy"/>
    </div>
    <div class="cm-wiz-text">
      <div class="cm-wiz-name">${esc(name)}</div>
      <div class="cm-wiz-badge">
        <img class="cm-wiz-wand" src="${ASSETS}/wizard-wand.svg" alt=""/>
        <span class="cm-wiz-badge-text">Wizard</span>
      </div>
    </div>
  </div>`;
}

function wallCard(card) {
  return `<a class="cm-wall-card" href="${esc(card.href)}" target="_blank" rel="noopener">
    <div class="cm-wall-img">
      <img src="${esc(card.img)}" alt="${esc(card.handle)}" loading="lazy"/>
    </div>
    <div class="cm-wall-handle">${esc(card.handle)}</div>
  </a>`;
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

function sectionHero() {
  return `<section class="cm-sec cm-hero" data-node-id="25:180768">
    <h1 class="cm-hero-title">
      <span class="cm-hero-line cm-hero-line-1">Trading,</span>
      <span class="cm-hero-line cm-hero-line-2">jamás solo</span>
    </h1>
    <p class="cm-hero-desc">
      Únase a la red social de 100 millones de traders con<br>visión global.
    </p>
    <div class="cm-hero-media">
      <div class="cm-hero-stars"></div>
      <div class="cm-hero-panel cm-hero-panel-left">
        <img class="cm-hero-mock-img cm-hero-mock-img-chart"
             src="${ASSETS}/hero-chart.png"
             alt="Gráfico de TradingView"
             loading="eager" decoding="async"/>
      </div>
      <div class="cm-hero-panel cm-hero-panel-right">
        <img class="cm-hero-mock-img cm-hero-mock-img-feed"
             src="${ASSETS}/hero-feed.png"
             alt="Feed social de TradingView"
             loading="eager" decoding="async"/>
      </div>
    </div>
  </section>`;
}

function sectionUnleash() {
  return `<section class="cm-sec cm-unleash" data-node-id="25:180859">
    <h2 class="cm-h2 cm-h2-center">
      <span>Dé rienda suela al</span><span>poder</span><span>de la comunidad</span>
    </h2>
    <div class="cm-unleash-grid">
      <article class="cm-card cm-card-ideas">
        <div class="cm-card-body">
          <h3 class="cm-card-h3">Ideas de trading <span class="cm-card-icon">${ICONS.lightbulb}</span></h3>
          <p class="cm-card-desc">Comparta su análisis de mercado y obtenga comentarios de traders e inversores de todas las disciplinas, mientras ayuda a otros a aprender.</p>
          ${btn('Explore ideas', { href: '#/news' })}
        </div>
        <div class="cm-card-media cm-card-media-ideas">
          <div class="cm-mini-post"><div class="cm-mock-avatar"></div><div class="cm-mock-lines"><div class="cm-mock-line"></div><div class="cm-mock-line cm-mock-line-short"></div></div></div>
          <div class="cm-mini-chart">
            <svg viewBox="0 0 500 220" preserveAspectRatio="none">
              <path d="M0,170 L80,140 L160,160 L240,100 L320,130 L400,60 L500,90" stroke="#00bce6" stroke-width="2" fill="none"/>
              <circle cx="320" cy="130" r="4" fill="#d500f9"/>
            </svg>
          </div>
        </div>
      </article>

      <article class="cm-card cm-card-scripts">
        <div class="cm-card-body">
          <h3 class="cm-card-h3">Scripts de la<br>comunidad <span class="cm-card-icon">${ICONS.brackets}</span></h3>
          <p class="cm-card-desc">Explore los cientos de indicadores integrados que hemos desarrollado, así como los más de 100 000 indicadores gratuitos creados por la comunidad. Todos estos scripts están listos para incorporarse a sus estrategias.</p>
          ${btn('Explore los scripts de la comunidad', { href: '#/' })}
        </div>
        <div class="cm-card-media cm-card-media-scripts">
          <pre class="cm-mock-code">//@version=5
indicator("RSI Divergence")
length = input.int(14)
src = close
rsi = ta.rsi(src, length)
plot(rsi, color=color.aqua)
hline(70, "Top")
hline(30, "Bottom")</pre>
        </div>
      </article>

      <article class="cm-card cm-card-thoughts">
        <div class="cm-card-body">
          <h3 class="cm-card-h3">Pensamientos <span class="cm-card-icon">${ICONS.speech}</span></h3>
          <p class="cm-card-desc">Participe en directo en una red social y converse sobre símbolos específicos: traders de todo el mundo se reúnen para charlar, seguir y debatir temas en tiempo real.</p>
        </div>
        <div class="cm-card-media cm-card-media-thoughts">
          <div class="cm-bubble cm-bubble-1">¿Algún movimiento en BTC hoy?</div>
          <div class="cm-bubble cm-bubble-2">Soporte en 28k aguanta 💪</div>
          <div class="cm-bubble cm-bubble-3">Watch out, FED a las 14h</div>
        </div>
      </article>
    </div>
  </section>`;
}

function sectionUniverse() {
  return `<section class="cm-sec cm-universe" data-node-id="25:180938">
    <div class="cm-universe-glow"></div>
    <h2 class="cm-h2 cm-h2-center cm-universe-h2"><span>Usted ha creado este</span><span>universo</span></h2>
    <div class="cm-universe-count">16.441.124</div>
    <div class="cm-universe-stats">
      ${STAT_ITEMS.map(statItem).join('')}
    </div>
  </section>`;
}

function sectionSocialFinance() {
  return `<section class="cm-sec cm-social" data-node-id="25:180972">
    <h2 class="cm-h2 cm-h2-center cm-social-h2"><span>Porque las finanzas</span><span>deben ser sociales</span></h2>
    <p class="cm-social-desc">¿Quién tiene la mejor visión: un ejecutivo de Wall Street o un millón de traders conectados?</p>
    <div class="cm-social-card">
      <div class="cm-social-tabs">
        <div class="cm-social-tab cm-social-tab-active">
          <div class="cm-social-tab-title">Crear</div>
          <p class="cm-social-tab-sub">Genere ideas, opiniones y estrategias mediante herramientas colaborativas en tiempo real. Desarrolle contenido directamente en nuestros gráficos y mercados en directo.</p>
        </div>
        <div class="cm-social-tab"><div class="cm-social-tab-title">Compartir</div></div>
        <div class="cm-social-tab"><div class="cm-social-tab-title">Aprenda</div></div>
        <div class="cm-social-tab"><div class="cm-social-tab-title">Colabore</div></div>
      </div>
      <div class="cm-social-media">
        <div class="cm-social-media-inner">
          <div class="cm-mock-toolbar"></div>
          <svg viewBox="0 0 620 380" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cm-ar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2962ff" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#2962ff" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,280 L80,250 L160,260 L240,200 L320,220 L400,150 L480,180 L560,110 L620,140 L620,380 L0,380 Z" fill="url(#cm-ar)"/>
            <path d="M0,280 L80,250 L160,260 L240,200 L320,220 L400,150 L480,180 L560,110 L620,140" stroke="#2962ff" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </div>
      <div class="cm-social-controls">
        <button class="cm-social-ctrl" aria-label="Anterior">${ICONS.arrowLeft}</button>
        <div class="cm-social-counter">1 / 4</div>
        <button class="cm-social-ctrl" aria-label="Siguiente">${ICONS.arrowRight}</button>
        <button class="cm-social-ctrl cm-social-pause" aria-label="Pausar">${ICONS.pause}</button>
      </div>
    </div>
  </section>`;
}

function sectionLeap() {
  return `<section class="cm-sec cm-leap" data-node-id="25:181635">
    <h2 class="cm-h2 cm-h2-center">The Leap</h2>
    <p class="cm-leap-desc">Compita sin riesgos por premios de dinero real con la mayor comunidad de<br>traders del mundo.</p>
    <div class="cm-leap-btn-wrap">${btn('Únase a The Leap', { href: '#/', big: true })}</div>
    <div class="cm-leap-banner">
      <svg viewBox="0 0 1360 405" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cm-leap-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#00bce6"/>
            <stop offset="50%" stop-color="#2962ff"/>
            <stop offset="100%" stop-color="#d500f9"/>
          </linearGradient>
        </defs>
        <path d="M40,330 C200,330 280,260 420,240 C580,220 700,290 860,260 C1020,230 1120,140 1320,80" stroke="url(#cm-leap-grad)" stroke-width="4" fill="none"/>
        <circle cx="1320" cy="80" r="14" fill="#d500f9"/>
        <circle cx="1320" cy="80" r="28" fill="#d500f9" opacity="0.18"/>
        <text x="680" y="200" text-anchor="middle" fill="#ffffff" font-family="Inter, Trebuchet MS, sans-serif" font-weight="700" font-size="64" opacity="0.85">THE LEAP</text>
      </svg>
    </div>
    <div class="cm-leap-features">
      ${LEAP_FEATURES.map((f) => `<div class="cm-leap-feat">
        <div class="cm-leap-feat-icon">${ICONS[f.icon]}</div>
        <div class="cm-leap-feat-title">${esc(f.title)}</div>
        <p class="cm-leap-feat-desc">${esc(f.desc)}</p>
      </div>`).join('')}
    </div>
  </section>`;
}

function sectionPine() {
  return `<section class="cm-sec cm-pine" data-node-id="25:181947">
    <h2 class="cm-h2 cm-h2-center"><span>Pine, programando juntos</span></h2>
    <p class="cm-pine-desc">El poder del trading y de la programación combinados: una comunidad mundial masiva de programadores que superan los límites. Analice, aprenda y colabore para hacer realidad sus ideas de análisis de trading.</p>
    <div class="cm-pine-tree">
      <div class="cm-pine-orbit"></div>
      <div class="cm-pine-orbit cm-pine-orbit-2"></div>
      <div class="cm-pine-orbit cm-pine-orbit-3"></div>
      <svg viewBox="0 0 400 360" class="cm-pine-svg">
        <path d="M200 20 L100 200 L160 200 L60 340 L340 340 L240 200 L300 200 Z" fill="#0f6e2c" stroke="#22c55e" stroke-width="1"/>
        <path d="M200 60 L130 200 L170 200 L100 320 L300 320 L230 200 L270 200 Z" fill="#15803d" opacity="0.7"/>
        <rect x="188" y="340" width="24" height="20" fill="#4a2c14"/>
      </svg>
    </div>
    <div class="cm-pine-cards">
      ${PINE_CARDS.map(chevronCard).join('')}
    </div>
  </section>`;
}

function sectionWizards() {
  const rowHtml = (arr) =>
    `<div class="cm-wiz-row">
      <div class="cm-wiz-track">
        ${arr.map(wizardItem).join('')}
        ${arr.map(wizardItem).join('')}
      </div>
    </div>`;
  return `<section class="cm-sec cm-wizards" data-node-id="25:182134">
    <h2 class="cm-h2 cm-h2-center">Aquí hay wizards</h2>
    <p class="cm-wiz-desc">Maestros de Pine Script™ y héroes del arte de los gráficos. Conozca a los mejores desarrolladores que diseñan herramientas para que los traders cautiven los mercados.</p>
    <div class="cm-wiz-rows">
      ${rowHtml(WIZARDS_ROW_1)}
      ${rowHtml(WIZARDS_ROW_2)}
      ${rowHtml(WIZARDS_ROW_3)}
      <div class="cm-wiz-fade cm-wiz-fade-left"></div>
      <div class="cm-wiz-fade cm-wiz-fade-right"></div>
    </div>
  </section>`;
}

function sectionDollars() {
  const heartsLeft  = Array.from({ length: 6 }).map((_, i) => `<span class="cm-anim-icon cm-anim-icon-h cm-anim-icon-${i+1}">${ICONS.heart}</span>`).join('');
  const dollarsRight = Array.from({ length: 6 }).map((_, i) => `<span class="cm-anim-icon cm-anim-icon-d cm-anim-icon-${i+1}">${ICONS.dollar}</span>`).join('');
  return `<section class="cm-sec cm-dollars" data-node-id="25:182887">
    <div class="cm-dollars-side cm-dollars-side-left">${heartsLeft}</div>
    <div class="cm-dollars-side cm-dollars-side-right">${dollarsRight}</div>
    <h2 class="cm-h2 cm-h2-center cm-dollars-h2"><span>Dulces, dulces beneficios</span><span>por parte de TradingView</span></h2>
    <div class="cm-dollars-price">+$13M</div>
    <p class="cm-dollars-sub">Recibidos por nuestros usuarios y sus amigos a través de nuestros programas Recomiende a un amigo y de socios.</p>
    <div class="cm-dollars-btns">
      ${btn('Recomendar a un amigo', { href: '#/', big: true })}
      ${btn('Conviértase en socio',  { href: '#/', big: true })}
    </div>
  </section>`;
}

function sectionFollow() {
  return `<section class="cm-sec cm-follow" data-node-id="25:182986">
    <h2 class="cm-h2 cm-h2-center">Síganos</h2>
    <p class="cm-follow-desc">Suscríbase a la cuenta oficial de TradingView para recibir las últimas publicaciones.</p>
    <div class="cm-follow-btn-wrap">${btn('Seguir a TradingView', { href: '#/', big: true })}</div>
    <div class="cm-follow-profile">
      <div class="cm-follow-card">
        <div class="cm-follow-card-header">
          <div class="cm-follow-card-avatar">TV</div>
          <div class="cm-follow-card-meta">
            <div class="cm-follow-card-name">TradingView <span class="cm-follow-card-check">✓</span></div>
            <div class="cm-follow-card-handle">@TradingView · 100M seguidores</div>
          </div>
          <button class="cm-follow-card-btn">Siguiendo</button>
        </div>
        <p class="cm-follow-card-text">Cargando los gráficos del mundo desde 2011. Síguenos para análisis diario, novedades de producto y mucho más 📈</p>
        <div class="cm-follow-card-img">
          <svg viewBox="0 0 600 240" preserveAspectRatio="none">
            <path d="M0,180 L80,160 L160,170 L240,120 L320,140 L400,80 L480,100 L560,40 L600,60" stroke="#00bce6" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
  </section>`;
}

function sectionWallOfLove() {
  return `<section class="cm-sec cm-wall" data-node-id="25:183003">
    <h2 class="cm-h2 cm-h2-center cm-wall-h2"><span>Amor en cada</span><span>#TradingView</span></h2>
    <p class="cm-wall-desc">100 millones de traders que toman el control de su futuro.</p>
    <div class="cm-wall-strip">
      <div class="cm-wall-track">
        ${WALL_CARDS.map(wallCard).join('')}
      </div>
      <button class="cm-wall-scroll" aria-label="Siguiente">${ICONS.arrowRight}</button>
    </div>
  </section>`;
}

function sectionKeyCTA() {
  return `<section class="cm-sec cm-keycta" data-node-id="25:183169">
    <h2 class="cm-h2 cm-h2-center cm-keycta-h2"><span>Planes para todos los</span><span>niveles de ambición</span></h2>
    <p class="cm-keycta-desc">Con perspicacia se consiguen oportunidades. Le ayudaremos a negociar e<br>invertir mejor desde el principio</p>
    <div class="cm-keycta-btn-wrap">
      <a class="cm-keycta-btn" href="#/">Empezar ahora</a>
    </div>
    <div class="cm-keycta-astronaut">${ICONS.astronaut}</div>
  </section>`;
}

function sectionPromoLinks() {
  return `<section class="cm-sec cm-promo" data-node-id="25:183189">
    <p class="cm-promo-disclaimer">Los datos de mercado seleccionados los proporciona <a href="#">ICE Data Services</a>. Los documentos presentados ante la SEC y otros, los facilita <a href="#">Edgar Online</a>.</p>
    <nav class="cm-promo-links">
      <strong>Más que un producto</strong>
      <a href="#">Analizadores</a><a href="#">Mapas de calor</a><a href="#">Calendarios</a>
      <strong>Más productos</strong>
      <a href="#">Aplicaciones</a><a href="#">Herramientas y suscripciones</a><a href="#">Trading</a>
      <a href="#">Ofertas especiales</a><a href="#">Acerca de la empresa</a><a href="#">Tienda</a>
      <a href="#">Políticas y seguridad</a><a href="#">Comunidad</a>
    </nav>
  </section>`;
}

// ---------------------------------------------------------------------------
// renderCommunity
// ---------------------------------------------------------------------------

export function renderCommunity(mount) {
  mount.innerHTML = `<div class="cm-root">
    ${sectionHero()}
    ${sectionUnleash()}
    ${sectionUniverse()}
    ${sectionSocialFinance()}
    ${sectionLeap()}
    ${sectionPine()}
    ${sectionWizards()}
    ${sectionDollars()}
    ${sectionFollow()}
    ${sectionWallOfLove()}
    ${sectionKeyCTA()}
    ${sectionPromoLinks()}
  </div>`;

  // ---- mini interactividad: scroll horizontal del Wall of Love ----
  const wallTrack = mount.querySelector('.cm-wall-track');
  const wallScrollBtn = mount.querySelector('.cm-wall-scroll');
  if (wallTrack && wallScrollBtn) {
    wallScrollBtn.addEventListener('click', () => {
      wallTrack.scrollBy({ left: 340, behavior: 'smooth' });
    });
  }

  // ---- mini interactividad: contador animado del universo (16.441.124) ----
  const counterEl = mount.querySelector('.cm-universe-count');
  if (counterEl && 'IntersectionObserver' in window) {
    const target = 16441124;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || started) return;
        started = true;
        const start = performance.now();
        const duration = 1800;
        const tick = (t) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.floor(target * eased);
          counterEl.textContent = val.toLocaleString('es-ES');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      });
    }, { threshold: 0.5 });
    io.observe(counterEl);
  }

  // ---- mini interactividad: tabs del slider "Crear / Compartir / Aprenda / Colabore" ----
  const tabs = mount.querySelectorAll('.cm-social-tab');
  if (tabs.length) {
    const tabContent = [
      {
        title: 'Crear',
        sub:  'Genere ideas, opiniones y estrategias mediante herramientas colaborativas en tiempo real. Desarrolle contenido directamente en nuestros gráficos y mercados en directo.',
      },
      {
        title: 'Compartir',
        sub:  'Publique sus ideas y scripts ante 100 millones de traders. Reciba feedback al instante y construya su reputación.',
      },
      {
        title: 'Aprenda',
        sub:  'Aprenda de millones de publicaciones y miles de educadores. Asista a streams en directo y participe.',
      },
      {
        title: 'Colabore',
        sub:  'Co-edite gráficos con otros traders. Trabaje en estrategias en equipo y compárta las en tiempo real.',
      },
    ];
    let activeIdx = 0;
    const counterDom = mount.querySelector('.cm-social-counter');
    const setActive = (idx) => {
      activeIdx = ((idx % tabs.length) + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        tab.classList.toggle('cm-social-tab-active', i === activeIdx);
        // reset structure
        const titleNode = tab.querySelector('.cm-social-tab-title');
        if (titleNode) titleNode.textContent = tabContent[i].title;
        let subNode = tab.querySelector('.cm-social-tab-sub');
        if (i === activeIdx) {
          if (!subNode) {
            subNode = document.createElement('p');
            subNode.className = 'cm-social-tab-sub';
            tab.appendChild(subNode);
          }
          subNode.textContent = tabContent[i].sub;
        } else if (subNode) {
          subNode.remove();
        }
      });
      if (counterDom) counterDom.textContent = `${activeIdx + 1} / ${tabs.length}`;
    };
    tabs.forEach((tab, i) => {
      tab.style.cursor = 'pointer';
      tab.addEventListener('click', () => setActive(i));
    });
    const [prevBtn, , nextBtn] = mount.querySelectorAll('.cm-social-ctrl');
    if (prevBtn) prevBtn.addEventListener('click', () => setActive(activeIdx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setActive(activeIdx + 1));
  }

  return {
    destroy() {
      mount.innerHTML = '';
    },
  };
}
