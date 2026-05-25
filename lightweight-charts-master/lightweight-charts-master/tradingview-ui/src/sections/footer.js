// src/sections/footer.js — TradingView footer (Figma 1:41099)
let _cssInjected = false;

const CSS = `
.mo-footer {
  width: 100%;
  background: var(--grey-6);
  color: var(--grey-86);
  font-family: var(--font-ui);
  border-top: 1px solid var(--grey-18);
  padding: 56px 40px 32px;
}
.mo-footer-inner {
  width: 100%;
  display: grid;
  grid-template-columns: 280px repeat(4, 1fr);
  gap: 48px;
}
.mo-footer-brand { display: flex; flex-direction: column; gap: 20px; }
.mo-footer-logo {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 20px;
  color: #fff;
}
.mo-footer-logo-mark {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--azure-58);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 800; font-size: 16px;
}
.mo-footer-tag {
  font-size: 13px;
  color: var(--grey-55);
  line-height: 1.5;
}
.mo-footer-social {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-top: 4px;
}
.mo-footer-social a {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--grey-18);
  display: flex; align-items: center; justify-content: center;
  color: var(--grey-86);
  transition: background .15s, color .15s;
}
.mo-footer-social a:hover { background: var(--grey-24); color: #fff; }
.mo-footer-social svg { width: 16px; height: 16px; fill: currentColor; }

.mo-footer-lang {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--grey-18);
  border-radius: 6px;
  background: transparent;
  color: var(--grey-86);
  font-size: 13px;
  width: fit-content;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.mo-footer-lang:hover { border-color: var(--grey-29); background: var(--grey-11); }
.mo-footer-lang svg { width: 16px; height: 16px; fill: currentColor; }

.mo-footer-col h4 {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 16px;
}
.mo-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.mo-footer-col a {
  font-size: 13px;
  color: var(--grey-86);
  transition: color .15s;
}
.mo-footer-col a:hover { color: var(--azure-58); }

.mo-footer-bottom {
  width: 100%;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--grey-18);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px;
  color: var(--grey-55);
}
.mo-footer-bottom a { color: var(--grey-55); }
.mo-footer-bottom a:hover { color: var(--grey-86); }

@media (max-width: 980px) {
  .mo-footer-inner {
    grid-template-columns: 1fr 1fr;
  }
  .mo-footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 560px) {
  .mo-footer { padding: 40px 20px 24px; }
  .mo-footer-inner { grid-template-columns: 1fr; gap: 32px; }
  .mo-footer-bottom { flex-direction: column; gap: 8px; }
}
`;

// Inline SVG icons (Figma-style stroke/fill simplified social glyphs)
const ICON = {
  x: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M23.5 6.51a3 3 0 0 0-2.12-2.12C19.5 4 12 4 12 4s-7.5 0-9.38.39A3 3 0 0 0 .5 6.51 31.4 31.4 0 0 0 .1 12a31.4 31.4 0 0 0 .4 5.49 3 3 0 0 0 2.12 2.12C4.5 20 12 20 12 20s7.5 0 9.38-.39a3 3 0 0 0 2.12-2.12A31.4 31.4 0 0 0 23.9 12a31.4 31.4 0 0 0-.4-5.49zM9.75 15.5v-7l6.5 3.5z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.73 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38c.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.05.86.13V9.4a6.33 6.33 0 0 0-5.94 10.35 6.33 6.33 0 0 0 10.86-4.4V8.83a8.16 8.16 0 0 0 4.76 1.52V6.92a4.83 4.83 0 0 1-.43-.23z"/></svg>',
  reddit: '<svg viewBox="0 0 24 24"><path d="M24 12.07a2.34 2.34 0 0 0-3.97-1.66 11.5 11.5 0 0 0-6.18-1.95l1.06-4.97 3.45.73a1.66 1.66 0 1 0 .17-.81l-3.86-.82a.4.4 0 0 0-.47.3l-1.18 5.54a11.5 11.5 0 0 0-6.26 1.94 2.34 2.34 0 1 0-2.59 3.85 4.62 4.62 0 0 0-.06.79c0 4 4.66 7.25 10.4 7.25S20.9 19 20.9 15a4.6 4.6 0 0 0-.05-.79A2.34 2.34 0 0 0 24 12.07zM6 13.74a1.66 1.66 0 1 1 3.33 0 1.66 1.66 0 0 1-3.33 0zm9.31 4.4a5.95 5.95 0 0 1-3.91 1.21 5.95 5.95 0 0 1-3.91-1.21.42.42 0 0 1 .6-.6 5.13 5.13 0 0 0 3.31.98 5.13 5.13 0 0 0 3.31-.98.42.42 0 1 1 .6.6zm-.31-2.74a1.66 1.66 0 1 1 1.66-1.66 1.66 1.66 0 0 1-1.66 1.66z"/></svg>',
  discord: '<svg viewBox="0 0 24 24"><path d="M20.32 4.37A19.79 19.79 0 0 0 15.43 3a.07.07 0 0 0-.08.04 13.94 13.94 0 0 0-.6 1.23 18.27 18.27 0 0 0-5.5 0 12.7 12.7 0 0 0-.62-1.23.07.07 0 0 0-.08-.04A19.74 19.74 0 0 0 3.66 4.37a.06.06 0 0 0-.03.03A20.26 20.26 0 0 0 .1 18.04a.08.08 0 0 0 .03.06 19.94 19.94 0 0 0 6 3.03.08.08 0 0 0 .08-.03 14.2 14.2 0 0 0 1.23-2 .07.07 0 0 0-.04-.1 13.13 13.13 0 0 1-1.87-.9.07.07 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01 14.21 14.21 0 0 0 12.06 0 .07.07 0 0 1 .08.01l.37.29a.07.07 0 0 1-.01.13 12.32 12.32 0 0 1-1.87.9.07.07 0 0 0-.04.1 16 16 0 0 0 1.23 2 .08.08 0 0 0 .08.03 19.88 19.88 0 0 0 6.01-3.03.08.08 0 0 0 .03-.06 20.13 20.13 0 0 0-3.53-13.64.05.05 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><path d="M11.94 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.06 0zm4.96 7.22c.16 0 .51.04.74.23.16.13.2.32.22.45.02.13.04.42.02.65-.18 1.92-.96 6.59-1.36 8.74-.17.91-.5 1.22-.83 1.25-.7.07-1.23-.46-1.92-.91l-2.66-1.74c-1.04-.68-.36-1.06.23-1.67.16-.16 2.83-2.6 2.88-2.82.01-.03.01-.13-.05-.18s-.15-.04-.21-.02c-.09.02-1.55 1-4.38 2.91-.41.28-.79.42-1.13.42-.37 0-1.09-.21-1.62-.39-.65-.21-1.17-.32-1.13-.68.03-.19.28-.38.77-.58 3.01-1.32 5.02-2.19 6.04-2.61 2.88-1.2 3.47-1.41 3.86-1.42z"/></svg>',
};

const GLOBE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.97 7.97 0 0 1 0-4h3.38a16.5 16.5 0 0 0-.14 2c0 .68.06 1.34.14 2zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a7.99 7.99 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38a7.97 7.97 0 0 1 0 4z"/></svg>';

const SOCIAL = [
  { name: 'X',         svg: ICON.x,         href: 'https://x.com/tradingview' },
  { name: 'Facebook',  svg: ICON.facebook,  href: 'https://facebook.com/tradingview' },
  { name: 'YouTube',   svg: ICON.youtube,   href: 'https://youtube.com/tradingview' },
  { name: 'Instagram', svg: ICON.instagram, href: 'https://instagram.com/tradingview' },
  { name: 'LinkedIn',  svg: ICON.linkedin,  href: 'https://linkedin.com/company/tradingview' },
  { name: 'TikTok',    svg: ICON.tiktok,    href: 'https://tiktok.com/@tradingview' },
  { name: 'Reddit',    svg: ICON.reddit,    href: 'https://reddit.com/r/TradingView' },
  { name: 'Discord',   svg: ICON.discord,   href: 'https://discord.gg/tradingview' },
  { name: 'Telegram',  svg: ICON.telegram,  href: 'https://t.me/tradingview' },
];

const COLUMNS = [
  {
    title: 'PRODUCTOS',
    links: [
      { label: 'Supercharts',         href: '#' },
      { label: 'Pine Script',         href: '#' },
      { label: 'Screener de acciones', href: '#' },
      { label: 'Screener de ETFs',    href: '#' },
      { label: 'Screener de cripto',  href: '#' },
      { label: 'Screener de forex',   href: '#' },
      { label: 'Calendario económico', href: '#' },
      { label: 'Calendario de ganancias', href: '#' },
      { label: 'Heatmap de acciones', href: '#' },
      { label: 'Heatmap de cripto',   href: '#' },
    ],
  },
  {
    title: 'EMPRESA',
    links: [
      { label: 'Sobre nosotros',      href: '#' },
      { label: 'Características',     href: '#' },
      { label: 'Precios',             href: '#' },
      { label: 'Wall of Love',        href: '#' },
      { label: 'Atención al cliente', href: '#' },
      { label: 'Sala de prensa',      href: '#' },
      { label: 'Manual de marca',     href: '#' },
      { label: 'Empleo - 22',         href: '#' },
      { label: 'Blog',                href: '#' },
    ],
  },
  {
    title: 'POLÍTICAS Y SEGURIDAD',
    links: [
      { label: 'Términos de uso',             href: '#' },
      { label: 'Exoneración de responsabilidad', href: '#' },
      { label: 'Política de privacidad',      href: '#' },
      { label: 'Política de cookies',         href: '#' },
      { label: 'Manifiesto de seguridad',     href: '#' },
      { label: 'Reglamento del sitio',        href: '#' },
      { label: 'Programa Bug Bounty',         href: '#' },
      { label: 'Estado del sistema',          href: '#' },
      { label: 'Reportar un problema',        href: '#' },
      { label: 'Accesibilidad',               href: '#' },
    ],
  },
  {
    title: 'MÁS PRODUCTOS',
    links: [
      { label: 'CME Group futuros',           href: '#' },
      { label: 'Eurex futuros',               href: '#' },
      { label: 'Bonos',                       href: '#' },
      { label: 'Pronósticos',                 href: '#' },
      { label: 'Acciones de EE. UU.',         href: '#' },
      { label: 'Aplicación de escritorio',    href: '#' },
      { label: 'Aplicaciones móviles',        href: '#' },
      { label: 'Widgets',                     href: '#' },
      { label: 'Soluciones de gráficos',      href: '#' },
      { label: 'Biblioteca de gráficos ligera', href: '#' },
      { label: 'Recomendar broker',           href: '#' },
    ],
  },
];

export function render(container, ctx = {}) {
  if (!_cssInjected) {
    const style = document.createElement('style');
    style.setAttribute('data-mo-footer', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  const socialHTML = SOCIAL.map(s =>
    `<a href="${s.href}" aria-label="${s.name}" title="${s.name}" target="_blank" rel="noopener">${s.svg}</a>`
  ).join('');

  const colsHTML = COLUMNS.map(col => `
    <div class="mo-footer-col">
      <h4>${col.title}</h4>
      <ul>
        ${col.links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}
      </ul>
    </div>
  `).join('');

  container.innerHTML = `
    <footer class="mo-footer">
      <div class="mo-footer-inner">
        <div class="mo-footer-brand">
          <div class="mo-footer-logo">
            <span class="mo-footer-logo-mark">TV</span>
            <span>TradingView</span>
          </div>
          <p class="mo-footer-tag">
            Mira los mercados financieros en una plataforma intuitiva. Únete a 100M+ traders e inversores que toman mejores decisiones.
          </p>
          <div class="mo-footer-social">${socialHTML}</div>
          <button type="button" class="mo-footer-lang" aria-label="Cambiar idioma">
            ${GLOBE_SVG}
            <span>Español</span>
          </button>
        </div>
        ${colsHTML}
      </div>
      <div class="mo-footer-bottom">
        <span>Seleccione el mercado</span>
        <span>&copy; 2026 TradingView, Inc.</span>
      </div>
    </footer>
  `;
}
