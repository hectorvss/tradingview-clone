// Brokers page — Figma 25:265272
// Self-contained: scoped styles + DOM in a single module.
// Public API: createBrokersPage(mount, opts) -> { destroy }

// Broker logos — downloaded from Figma node 25:265272 (rendered PNG per card image-wrapper).
// These are local assets so they no longer depend on Figma's 7-day asset URL TTL.
import logoFeatured from '../assets/brokers/featured.png';
import logoAmp from '../assets/brokers/amp-futures.png';
import logoAva from '../assets/brokers/avafutures.png';
import logoColmex from '../assets/brokers/colmexpro.png';
import logoWhiteBit from '../assets/brokers/whitebit.png';
import logoIB from '../assets/brokers/interactive-brokers.png';
import logoCoinbase from '../assets/brokers/coinbase-advanced.png';
import logoIBroker from '../assets/brokers/ibroker.png';
import logoMexem from '../assets/brokers/mexem.png';
import logoSkilling from '../assets/brokers/skilling.png';
import logoRobo from '../assets/brokers/robomarkets.png';

const STYLE_ID = 'brk-styles-v1';

const CSS = `
.brk-root {
  --brk-bg: #0f0f0f;
  --brk-bg-2: #121212;
  --brk-card: #1a1a1a;
  --brk-card-2: #181818;
  --brk-border: #2e2e2e;
  --brk-border-soft: #232323;
  --brk-text: #ffffff;
  --brk-text-dim: #b8b8b8;
  --brk-text-mute: #8c8c8c;
  --brk-text-faint: #707070;
  --brk-blue: #2962ff;
  --brk-blue-2: #1d4f90;
  --brk-yellow: #f9e92e;
  --brk-orange: #ff4200;
  --brk-magenta: #d500f9;
  --brk-cyan: #1abc9c;
  --brk-green: #5cffbe;

  font-family: 'Inter', 'Roboto', system-ui, -apple-system, Segoe UI, sans-serif;
  background: var(--brk-bg);
  color: var(--brk-text);
  min-height: 100vh;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  box-sizing: border-box;
}
body.has-global-header  .brk-header { display: none !important; }
.brk-root .brk-logo, .brk-root .brk-logo-mark { display: none !important; }
.brk-root img { max-width: 100%; max-height: 100%; }
.brk-root *, .brk-root *::before, .brk-root *::after { box-sizing: border-box; }
.brk-root a { color: inherit; text-decoration: none; }
.brk-root button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }

/* ===== Header ===== */
.brk-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(15,15,15,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--brk-border-soft);
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
}
.brk-logo {
  display: flex; align-items: center; gap: 6px;
  font-weight: 600; font-size: 16px; color: #fff;
}
.brk-logo-mark {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #2962ff, #2962ff);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 13px;
}
.brk-search {
  flex: 0 0 280px;
  height: 36px;
  background: #1e1e1e;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  display: flex; align-items: center;
  padding: 0 12px;
  color: var(--brk-text-mute);
  font-size: 13px;
  gap: 8px;
}
.brk-search svg { width: 14px; height: 14px; opacity: 0.6; }
.brk-nav {
  display: flex; align-items: center; gap: 4px;
  flex: 1;
}
.brk-nav-item {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--brk-text-dim);
  border-radius: 4px;
  font-weight: 500;
  transition: color .15s, background .15s;
}
.brk-nav-item:hover { color: #fff; background: #1e1e1e; }
.brk-nav-item.is-active { color: var(--brk-blue); }
.brk-nav-spacer { flex: 1; }
.brk-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #d500f9, #2962ff);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 13px;
}
.brk-ampliar {
  height: 32px; padding: 0 14px;
  border-radius: 16px;
  background: linear-gradient(90deg, #2962ff 0%, #1abc9c 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  display: flex; align-items: center;
}

/* ===== Hero ===== */
.brk-hero {
  padding: 88px 24px 32px;
  text-align: center;
  max-width: 1480px;
  margin: 0 auto;
}
.brk-hero h1 {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 98px;
  line-height: 1;
  letter-spacing: -2.88px;
  color: #fff;
}
.brk-hero p {
  margin: 24px auto 0;
  font-family: 'Roboto', sans-serif;
  font-size: 18px;
  line-height: 28px;
  color: var(--brk-text-dim);
  max-width: 640px;
  font-weight: 400;
}

/* ===== Filter chips ===== */
.brk-chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 40px auto 32px;
  max-width: 1000px;
  padding: 0 24px;
}
.brk-chip {
  height: 34px;
  padding: 0 16px;
  border-radius: 17px;
  border: 1px solid var(--brk-border);
  background: transparent;
  color: var(--brk-text-dim);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  transition: background .15s, color .15s, border-color .15s;
}
.brk-chip:hover { color: #fff; border-color: #4a4a4a; }
.brk-chip.is-active {
  background: #2e2e2e;
  color: #fff;
  border-color: transparent;
}

/* ===== Broker list ===== */
.brk-list {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brk-card {
  position: relative;
  background: linear-gradient(180deg, #1a1a1a 0%, #131313 100%);
  border: 1px solid var(--brk-border-soft);
  border-radius: 14px;
  padding: 24px 28px;
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 24px;
  align-items: center;
  min-height: 140px;
  overflow: hidden;
}
.brk-card.is-featured {
  min-height: 220px;
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(41,98,255,0.18) 0%, transparent 50%),
    linear-gradient(180deg, #1c1c1c 0%, #0f0f0f 100%);
}
.brk-card-body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.brk-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.brk-card-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.2px;
}
.brk-card.is-featured .brk-card-name { font-size: 14px; color: var(--brk-text-dim); font-weight: 500; }

.brk-tag-partner {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--brk-blue);
  background: rgba(41,98,255,0.15);
  border: 1px solid rgba(41,98,255,0.35);
  padding: 3px 7px;
  border-radius: 4px;
  text-transform: uppercase;
}
.brk-tag-promo {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #f9e92e;
  background: rgba(249,233,46,0.12);
  padding: 3px 7px;
  border-radius: 4px;
  text-transform: uppercase;
}

.brk-card-sub {
  font-size: 12px;
  color: var(--brk-text-mute);
}
.brk-card-headline {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 4px 0 0;
}
.brk-card-promo-line {
  font-size: 12px;
  color: var(--brk-text-dim);
}

.brk-stats { display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-start; }
.brk-stat { display: flex; flex-direction: column; gap: 2px; }
.brk-stat-value { font-size: 13px; color: #fff; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.brk-stat-label { font-size: 11px; color: var(--brk-text-faint); }
.brk-stars { display: inline-flex; align-items: center; gap: 1px; color: #f9e92e; }
.brk-stars svg { width: 11px; height: 11px; display: block; }

.brk-cta-row { display: flex; gap: 12px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.brk-cta-primary {
  height: 32px; padding: 0 16px;
  border-radius: 4px;
  background: var(--brk-blue);
  color: #fff;
  font-weight: 600; font-size: 13px;
  display: inline-flex; align-items: center;
}
.brk-cta-primary:hover { filter: brightness(1.1); }
.brk-cta-link {
  color: var(--brk-text-dim);
  font-size: 13px;
  font-weight: 500;
}
.brk-cta-link:hover { color: #fff; }

.brk-card-art {
  width: 100%; height: 100%;
  min-height: 140px;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.brk-logo-3d {
  width: 132px; height: 132px;
  border-radius: 22px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 36px;
  letter-spacing: -1px;
  box-shadow:
    0 24px 48px -16px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.18),
    inset 0 -24px 32px -16px rgba(0,0,0,0.35);
  transform: perspective(800px) rotateY(-14deg) rotateX(6deg);
  position: relative;
}
.brk-logo-3d::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 40%);
  pointer-events: none;
}
.brk-logo-img {
  width: 132px;
  height: 132px;
  object-fit: contain;
  display: block;
}
.brk-card.is-featured .brk-logo-img {
  width: 168px;
  height: 168px;
}

/* ===== Compare CTA ===== */
.brk-compare-wrap {
  display: flex; justify-content: center;
  padding: 48px 24px 64px;
}
.brk-compare-btn {
  height: 40px; padding: 0 24px;
  border-radius: 20px;
  background: #f0f3fa;
  color: #0f0f0f;
  font-weight: 600; font-size: 14px;
  display: inline-flex; align-items: center;
}
.brk-compare-btn:hover { background: #fff; }

/* ===== Big stat ===== */
.brk-megastat {
  text-align: center;
  padding: 64px 24px 96px;
  max-width: 1480px;
  margin: 0 auto;
}
.brk-megastat-label {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 56px;
  line-height: 1.05;
  letter-spacing: -1.6px;
  background: linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.4) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.brk-megastat-num {
  margin-top: 16px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 80px;
  line-height: 1;
  letter-spacing: -2px;
  background: linear-gradient(90deg,
    #d500f9 0%,
    #5151ff 20%,
    #1abc9c 40%,
    #5cffbe 55%,
    #f9e92e 75%,
    #ff4200 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* ===== Footer ===== */
.brk-footer {
  background: #0a0a0a;
  border-top: 1px solid var(--brk-border-soft);
  padding: 64px 24px 32px;
}
.brk-footer-inner {
  max-width: 1480px; margin: 0 auto;
  display: grid;
  grid-template-columns: 240px repeat(5, 1fr);
  gap: 32px;
}
.brk-footer-brand { display: flex; flex-direction: column; gap: 12px; color: var(--brk-text-mute); font-size: 12px; line-height: 1.6; }
.brk-footer-col h4 {
  margin: 0 0 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brk-text-mute);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.brk-footer-col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.brk-footer-col a { font-size: 13px; color: var(--brk-text-dim); }
.brk-footer-col a:hover { color: #fff; }
.brk-footer-legal {
  max-width: 1480px;
  margin: 48px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--brk-border-soft);
  font-size: 11px;
  color: var(--brk-text-faint);
  line-height: 1.6;
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .brk-hero h1 { font-size: 56px; letter-spacing: -1.5px; }
  .brk-megastat-num { font-size: 44px; }
  .brk-megastat-label { font-size: 32px; }
  .brk-card { grid-template-columns: 1fr; }
  .brk-card-art { min-height: 120px; }
  .brk-footer-inner { grid-template-columns: 1fr 1fr; }
  .brk-nav { display: none; }
  .brk-search { flex: 1; }
}
`;

// Broker data — mirrors the Figma frame
const BROKERS = [
  { name: 'AMP Futures', partner: true, sub: 'Activos negociados: Futuros', regs: 4, rating: 4.5, votes: '17 k', followers: '2.3 k', logo: { text: 'AMP', bg: 'linear-gradient(135deg, #4FA8E0, #2962ff)', img: logoAmp } },
  { name: 'AvaFutures',  partner: true, sub: 'Activos negociados: Futuros', regs: 6, rating: 4.5, votes: '12 k', followers: '8.1 k', logo: { text: 'AVA', bg: 'linear-gradient(135deg, #f5f5f5, #b8b8b8)', color: '#111', img: logoAva } },
  { name: 'ColmexPro',   partner: true, sub: 'Activos negociados: Acciones, Forex, CFDs', headline: '10 operaciones gratuitas!', promo: true, regs: 3, rating: 4.5, votes: '8 k', followers: '4 k', logo: { text: 'C', bg: 'linear-gradient(135deg, #ffffff, #d8d8d8)', color: '#0a3d91', img: logoColmex } },
  { name: 'WhiteBIT',    partner: true, sub: 'Activos negociados: Cripto', regs: 2, rating: 3.8, votes: '6 k', followers: '4.1 k', logo: { text: 'W', bg: 'linear-gradient(135deg, #abfe05, #5cffbe)', color: '#0d2a00', img: logoWhiteBit } },
  { name: 'Interactive Brokers', partner: true, sub: 'Activos negociados: Acciones, Forex, Futuros, CFDs, Opciones', regs: 12, rating: 4.7, votes: '27 k', followers: '203k', logo: { text: 'IB', bg: 'linear-gradient(135deg, #d81222, #8a0a14)', img: logoIB } },
  { name: 'Coinbase Advanced', sub: 'Activos negociados: Cripto, Futuros', regs: 5, rating: 4.5, votes: '21 k', followers: '94k', logo: { text: 'C', bg: 'linear-gradient(135deg, #2962ff, #003488)', img: logoCoinbase } },
  { name: 'iBroker',     partner: true, sub: 'Activos negociados: Acciones, Futuros, Forex', regs: 4, rating: 4.5, votes: '7.4 k', followers: '12 k', logo: { text: 'O', bg: 'linear-gradient(135deg, #6cdaf2, #00adb5)', img: logoIBroker } },
  { name: 'MEXEM',       partner: true, sub: 'Activos negociados: Acciones, Futuros, Forex, Cripto, CFDs', regs: 6, rating: 4.0, votes: '11 k', followers: '2.4 k', logo: { text: 'M', bg: 'linear-gradient(135deg, #2e2b2b, #0f0f0f)', img: logoMexem } },
  { name: 'Skilling',    partner: true, sub: 'Activos negociados: Forex, CFDs', regs: 3, rating: 3.9, votes: '5.4 k', followers: '3.6 k', logo: { text: 'S', bg: 'linear-gradient(135deg, #24e9c2, #1abc9c)', color: '#062d24', img: logoSkilling } },
  { name: 'RoboMarkets', partner: true, sub: 'Activos negociados: Acciones, Forex, CFDs', regs: 4, rating: 4.2, votes: '9.1 k', followers: '5.8 k', logo: { text: 'R', bg: 'linear-gradient(135deg, #3773f5, #1d4f90)', img: logoRobo } },
];

const CHIPS = ['Regs. estrictos', 'Acciones', 'Forex', 'CFDs', 'Cripto', 'Opciones', 'Servicios'];

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STAR_FULL = '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 .8l1.55 3.45 3.78.36-2.86 2.5.86 3.7L6 8.9l-3.33 1.91.86-3.7L.67 4.61l3.78-.36z"/></svg>';
const STAR_HALF = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.55 3.45 3.78.36-2.86 2.5.86 3.7L6 8.9l-3.33 1.91.86-3.7L.67 4.61l3.78-.36z" fill="currentColor" fill-opacity="0.25"/><path d="M6 .8l1.55 3.45 3.78.36-2.86 2.5.86 3.7L6 8.9V.8z" fill="currentColor"/></svg>';
const STAR_EMPTY = '<svg viewBox="0 0 12 12" fill="currentColor" fill-opacity="0.25" aria-hidden="true"><path d="M6 .8l1.55 3.45 3.78.36-2.86 2.5.86 3.7L6 8.9l-3.33 1.91.86-3.7L.67 4.61l3.78-.36z"/></svg>';

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let out = '';
  for (let i = 0; i < full; i++) out += STAR_FULL;
  if (half) out += STAR_HALF;
  for (let i = full + (half ? 1 : 0); i < 5; i++) out += STAR_EMPTY;
  return out;
}

function logo3D(logo, name) {
  if (logo && logo.img) {
    // Fallback to CSS monogram if the image fails to load (e.g. asset missing).
    const color = logo.color || '#fff';
    const fallbackBg = (logo.bg || '#1a1a1a').replace(/"/g, '&quot;');
    const onerr = `this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'brk-logo-3d',style:'background:${fallbackBg};color:${color}',textContent:${JSON.stringify(logo.text || '')}}))`;
    return `<img class="brk-logo-img" src="${escapeHTML(logo.img)}" alt="${escapeHTML(name || logo.text || 'broker logo')}" onerror="${escapeHTML(onerr)}" />`;
  }
  const color = logo.color || '#fff';
  return `<div class="brk-logo-3d" style="background:${logo.bg};color:${color}">${escapeHTML(logo.text)}</div>`;
}

function brokerCardHTML(b) {
  return `
    <article class="brk-card">
      <div class="brk-card-body">
        <div class="brk-card-head">
          <span class="brk-card-name">${escapeHTML(b.name)}</span>
          ${b.partner ? '<span class="brk-tag-partner">Partner</span>' : ''}
          ${b.promo ? '<span class="brk-tag-promo">Promoción</span>' : ''}
        </div>
        <div class="brk-card-sub">${escapeHTML(b.sub)}</div>
        ${b.headline ? `<div class="brk-card-headline">${escapeHTML(b.headline)}</div>` : ''}
        <div class="brk-stats">
          <div class="brk-stat">
            <div class="brk-stat-value">${b.rating.toFixed(1)} <span class="brk-stars">${stars(b.rating)}</span></div>
            <div class="brk-stat-label">${b.regs} regulaciones</div>
          </div>
          <div class="brk-stat">
            <div class="brk-stat-value"><svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M7 .5L1.5 7h3L4 11.5 10 5H7z"/></svg> ${escapeHTML(b.votes)}</div>
            <div class="brk-stat-label">Votos</div>
          </div>
          <div class="brk-stat">
            <div class="brk-stat-value"><svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="2.4"/><path d="M1.5 11c0-2.2 2-3.6 4.5-3.6S10.5 8.8 10.5 11z"/></svg> ${escapeHTML(b.followers)}</div>
            <div class="brk-stat-label">Seguidores</div>
          </div>
        </div>
        <div class="brk-cta-row">
          <a class="brk-cta-primary" href="#/brokers" role="button">Abrir cuenta</a>
          <a class="brk-cta-link" href="#/brokers">Más información</a>
        </div>
      </div>
      <div class="brk-card-art">${logo3D(b.logo, b.name)}</div>
    </article>
  `;
}

function featuredCardHTML() {
  return `
    <article class="brk-card is-featured">
      <div class="brk-card-body">
        <div class="brk-card-head">
          <span class="brk-card-name" style="font-size:14px;color:#b8b8b8;font-weight:500">DXX</span>
          <span class="brk-tag-partner">Partner</span>
          <span class="brk-tag-promo" style="margin-left:auto">Promoción</span>
        </div>
        <h2 style="margin:8px 0 0;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#fff">Active TradingView Plus</h2>
        <div class="brk-card-promo-line" style="margin-top:6px">Operadores con futuros + acciones · Promoción exclusiva para nuevas cuentas</div>
        <div class="brk-cta-row" style="margin-top:18px">
          <a class="brk-cta-primary" href="#/brokers" role="button">Abrir cuenta</a>
          <a class="brk-cta-link" href="#/brokers">Más información</a>
        </div>
      </div>
      <div class="brk-card-art">
        <img class="brk-logo-img" src="${logoFeatured}" alt="Active TradingView Plus"
             onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'brk-logo-3d',style:'background:linear-gradient(135deg,#1f1f1f,#0a0a0a);color:#fff;font-size:14px;letter-spacing:1px',textContent:'DXX'}))" />
      </div>
    </article>
  `;
}

function headerHTML() {
  return `
    <header class="brk-header">
      <a class="brk-logo" href="#/">
        <span class="brk-logo-mark">TV</span>
        <span>TradingView</span>
      </a>
      <div class="brk-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Buscar (Ctrl+K)</span>
      </div>
      <nav class="brk-nav">
        <a class="brk-nav-item" href="#/">Productos</a>
        <a class="brk-nav-item" href="#/community">Comunidad</a>
        <a class="brk-nav-item" href="#/markets">Mercados</a>
        <a class="brk-nav-item is-active" href="#/brokers">Brokers</a>
        <a class="brk-nav-item" href="#/">Más</a>
      </nav>
      <div class="brk-nav-spacer"></div>
      <div class="brk-avatar">U</div>
      <button type="button" class="brk-ampliar">Ampliar</button>
    </header>
  `;
}

function footerHTML() {
  const cols = [
    { h: 'Productos', items: ['Supercharts', 'Pine Script', 'Heatmaps', 'Stock Screener', 'Forex Screener', 'Crypto Pairs Screener', 'Economic Calendar'] },
    { h: 'Comunidad', items: ['Ideas', 'Streams', 'Educación', 'Casas de bolsa', 'Wall of Love'] },
    { h: 'Para empresas', items: ['Widgets', 'Charting Libraries', 'API Lightweight Charts', 'Soluciones de Bolsa y Datos', 'Programa de afiliados'] },
    { h: 'TradingView', items: ['Sobre nosotros', 'Funcionalidades', 'Precios', 'Casas de bolsa', 'Athletes', 'Carreras', 'Blog'] },
    { h: 'Política y servicios', items: ['Términos de uso', 'Exoneraciones', 'Política de privacidad', 'Política de cookies', 'Seguridad', 'Estado del sistema', 'Reportar problema'] },
  ];
  return `
    <footer class="brk-footer">
      <div class="brk-footer-inner">
        <div class="brk-footer-brand">
          <div class="brk-logo"><span class="brk-logo-mark">TV</span><span>TradingView</span></div>
          <p>Vea los mercados como nadie más los ve. Las herramientas que te dan ventaja.</p>
        </div>
        ${cols.map(c => `
          <div class="brk-footer-col">
            <h4>${escapeHTML(c.h)}</h4>
            <ul>${c.items.map(i => `<li><a href="#">${escapeHTML(i)}</a></li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
      <div class="brk-footer-legal">
        Seleccione el mercado donde quiera operar. © 2014–2026 TradingView, Inc. TradingView® es una marca comercial registrada de TradingView, Inc.
      </div>
    </footer>
  `;
}

function pageHTML() {
  return `
    ${headerHTML()}
    <section class="brk-hero">
      <h1>Hecho para el trading</h1>
      <p>Comience a operar con brokers verificados hoy mismo.</p>
    </section>
    <div class="brk-chips">
      ${CHIPS.map((c, i) => `<button type="button" class="brk-chip${i === 1 ? ' is-active' : ''}" data-chip="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('')}
    </div>
    <div class="brk-list">
      ${featuredCardHTML()}
      ${BROKERS.map(brokerCardHTML).join('')}
    </div>
    <div class="brk-compare-wrap">
      <button type="button" class="brk-compare-btn">Comparar brokers</button>
    </div>
    <section class="brk-megastat">
      <div class="brk-megastat-label">Cada operación un<br/>#TradingView</div>
      <div class="brk-megastat-num">4 528 635 400 360 714</div>
    </section>
    ${footerHTML()}
  `;
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function createBrokersPage(mount, _opts = {}) {
  injectStyles();

  const root = document.createElement('div');
  root.className = 'brk-root';
  root.innerHTML = pageHTML();

  mount.innerHTML = '';
  mount.appendChild(root);

  // Chip toggle interactivity
  const chipHandler = (e) => {
    const btn = e.target.closest('.brk-chip');
    if (!btn) return;
    root.querySelectorAll('.brk-chip').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
  };
  root.addEventListener('click', chipHandler);

  return {
    destroy() {
      root.removeEventListener('click', chipHandler);
      if (mount.contains(root)) mount.removeChild(root);
    }
  };
}

export default createBrokersPage;
