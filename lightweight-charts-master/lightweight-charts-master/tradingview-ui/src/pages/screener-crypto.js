// /screeners/crypto — Analizador de criptos. Plantilla idéntica a Acciones, datos cripto reales.
import './screeners.css';

/* ---------- Assets (logos descargados desde TradingView CDN) ---------- */
// Vite globbing → URLs estáticas
const logoModules = import.meta.glob('./screener-crypto-assets/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
});
const LOGOS = {};
for (const path in logoModules) {
  const ticker = path.split('/').pop().replace('.svg', '');
  LOGOS[ticker] = logoModules[path];
}

/* ---------- Brand colours (fallback cuando no hay logo) ---------- */
const BRAND_COLOR = {
  BTC: '#f7931a', ETH: '#627eea', USDT: '#26a17b', BNB: '#f3ba2f',
  SOL: '#9945ff', XRP: '#00aae4', USDC: '#2775ca', ADA: '#0033ad',
  DOGE: '#c2a633', AVAX: '#e84142', TRX: '#ff060a', LINK: '#2a5ada',
  MATIC: '#8247e5', DOT: '#e6007a', LTC: '#345d9d', BCH: '#0ac18e',
  NEAR: '#00c08b', UNI: '#ff007a', ATOM: '#2e3148', XLM: '#7d00ff',
  ETC: '#328332', ICP: '#ed1e79', FIL: '#0090ff', HBAR: '#222',
  APT: '#000', ARB: '#28a0f0', OP: '#ff0420', IMX: '#0b0e17',
  INJ: '#00f2fe', RUNE: '#33ff99', AAVE: '#b6509e', MKR: '#1aab9b',
  PEPE: '#3d8c40', SHIB: '#ffa409', WLD: '#000', RNDR: '#cf1f49',
  FET: '#1d3b87', TIA: '#7b2bf9'
};

/* ---------- Dataset — 38 cryptos with realistic 2026-ish data ---------- */
const CRYPTOS = [
  { t: 'BTC',   name: 'Bitcoin',              price: 67234.50,  c24: +1.24, c7d: +3.81,  cap: 1.32e12,  vol: 28.4e9,  circ: 19.68e6,    max: 21e6,        cat: 'Layer 1',  algo: 'SHA-256',     launch: 2009 },
  { t: 'ETH',   name: 'Ethereum',             price: 3421.80,   c24: +0.87, c7d: +2.45,  cap: 411.5e9,  vol: 14.2e9,  circ: 120.21e6,   max: null,        cat: 'Layer 1',  algo: 'Ethash/PoS',  launch: 2015 },
  { t: 'USDT',  name: 'Tether USDt',          price: 1.0001,    c24: +0.01, c7d: -0.02,  cap: 117.8e9,  vol: 52.6e9,  circ: 117.79e9,   max: null,        cat: 'Stablecoin',algo: 'Omni/ERC20',  launch: 2014 },
  { t: 'BNB',   name: 'BNB',                  price: 612.40,    c24: +2.11, c7d: +5.62,  cap: 89.4e9,   vol: 1.85e9,  circ: 145.93e6,   max: 200e6,       cat: 'Layer 1',  algo: 'PoSA',        launch: 2017 },
  { t: 'SOL',   name: 'Solana',               price: 178.92,    c24: -1.45, c7d: +8.73,  cap: 84.2e9,   vol: 3.41e9,  circ: 470.6e6,    max: null,        cat: 'Layer 1',  algo: 'PoH/PoS',     launch: 2020 },
  { t: 'XRP',   name: 'XRP',                  price: 0.5421,    c24: +0.32, c7d: -1.20,  cap: 30.1e9,   vol: 1.42e9,  circ: 55.5e9,     max: 100e9,       cat: 'Payments', algo: 'RPCA',        launch: 2012 },
  { t: 'USDC',  name: 'USD Coin',             price: 1.0000,    c24: +0.00, c7d: -0.01,  cap: 28.9e9,   vol: 6.14e9,  circ: 28.91e9,    max: null,        cat: 'Stablecoin',algo: 'ERC-20',      launch: 2018 },
  { t: 'ADA',   name: 'Cardano',              price: 0.4612,    c24: +1.84, c7d: +4.12,  cap: 16.4e9,   vol: 412e6,   circ: 35.6e9,     max: 45e9,        cat: 'Layer 1',  algo: 'Ouroboros',   launch: 2017 },
  { t: 'DOGE',  name: 'Dogecoin',             price: 0.1234,    c24: -2.61, c7d: -5.43,  cap: 17.8e9,   vol: 980e6,   circ: 144.3e9,    max: null,        cat: 'Meme',     algo: 'Scrypt',      launch: 2013 },
  { t: 'AVAX',  name: 'Avalanche',            price: 36.78,     c24: +3.42, c7d: +12.51, cap: 14.2e9,   vol: 612e6,   circ: 386.1e6,    max: 720e6,       cat: 'Layer 1',  algo: 'Avalanche',   launch: 2020 },
  { t: 'TRX',   name: 'TRON',                 price: 0.1182,    c24: +0.62, c7d: +1.45,  cap: 10.3e9,   vol: 421e6,   circ: 87.1e9,     max: null,        cat: 'Layer 1',  algo: 'DPoS',        launch: 2017 },
  { t: 'LINK',  name: 'Chainlink',            price: 16.42,     c24: -0.94, c7d: +2.81,  cap: 9.65e9,   vol: 392e6,   circ: 587.7e6,    max: 1e9,         cat: 'Oracle',   algo: 'ERC-20',      launch: 2017 },
  { t: 'MATIC', name: 'Polygon',              price: 0.7842,    c24: +1.15, c7d: -3.21,  cap: 7.78e9,   vol: 312e6,   circ: 9.92e9,     max: 10e9,        cat: 'Layer 2',  algo: 'PoS',         launch: 2017 },
  { t: 'DOT',   name: 'Polkadot',             price: 6.91,      c24: +0.45, c7d: +1.92,  cap: 9.84e9,   vol: 218e6,   circ: 1.42e9,     max: null,        cat: 'Layer 0',  algo: 'NPoS',        launch: 2020 },
  { t: 'LTC',   name: 'Litecoin',             price: 84.12,     c24: -1.08, c7d: -2.45,  cap: 6.31e9,   vol: 412e6,   circ: 75.0e6,     max: 84e6,        cat: 'Payments', algo: 'Scrypt',      launch: 2011 },
  { t: 'BCH',   name: 'Bitcoin Cash',         price: 412.30,    c24: +2.34, c7d: +6.81,  cap: 8.12e9,   vol: 248e6,   circ: 19.71e6,    max: 21e6,        cat: 'Payments', algo: 'SHA-256',     launch: 2017 },
  { t: 'NEAR',  name: 'NEAR Protocol',        price: 6.42,      c24: +4.21, c7d: +14.32, cap: 6.89e9,   vol: 318e6,   circ: 1.07e9,     max: null,        cat: 'Layer 1',  algo: 'Doomslug',    launch: 2020 },
  { t: 'UNI',   name: 'Uniswap',              price: 9.82,      c24: -0.71, c7d: +3.42,  cap: 5.89e9,   vol: 184e6,   circ: 599.6e6,    max: 1e9,         cat: 'DeFi',     algo: 'ERC-20',      launch: 2020 },
  { t: 'ATOM',  name: 'Cosmos',               price: 8.74,      c24: +1.52, c7d: -0.91,  cap: 3.42e9,   vol: 142e6,   circ: 391.2e6,    max: null,        cat: 'Layer 0',  algo: 'Tendermint',  launch: 2019 },
  { t: 'XLM',   name: 'Stellar',              price: 0.1184,    c24: +0.82, c7d: +2.14,  cap: 3.41e9,   vol: 98e6,    circ: 28.8e9,     max: 50e9,        cat: 'Payments', algo: 'SCP',         launch: 2014 },
  { t: 'ETC',   name: 'Ethereum Classic',     price: 26.84,     c24: -1.42, c7d: -4.31,  cap: 3.96e9,   vol: 184e6,   circ: 147.6e6,    max: 210.7e6,     cat: 'Layer 1',  algo: 'Etchash',     launch: 2016 },
  { t: 'ICP',   name: 'Internet Computer',    price: 11.42,     c24: +3.81, c7d: +8.92,  cap: 5.31e9,   vol: 142e6,   circ: 464.8e6,    max: null,        cat: 'Layer 1',  algo: 'Threshold',   launch: 2021 },
  { t: 'FIL',   name: 'Filecoin',             price: 5.42,      c24: +0.92, c7d: +1.84,  cap: 3.08e9,   vol: 168e6,   circ: 568.4e6,    max: 1.96e9,      cat: 'Storage',  algo: 'PoSt/PoRep',  launch: 2020 },
  { t: 'HBAR',  name: 'Hedera',               price: 0.0892,    c24: -0.42, c7d: +5.81,  cap: 3.21e9,   vol: 132e6,   circ: 36.0e9,     max: 50e9,        cat: 'Layer 1',  algo: 'Hashgraph',   launch: 2019 },
  { t: 'APT',   name: 'Aptos',                price: 9.12,      c24: +5.42, c7d: +18.34, cap: 4.21e9,   vol: 234e6,   circ: 461.7e6,    max: null,        cat: 'Layer 1',  algo: 'AptosBFT',    launch: 2022 },
  { t: 'ARB',   name: 'Arbitrum',             price: 1.18,      c24: -2.14, c7d: -6.42,  cap: 3.84e9,   vol: 312e6,   circ: 3.25e9,     max: 10e9,        cat: 'Layer 2',  algo: 'Optimistic',  launch: 2023 },
  { t: 'OP',    name: 'Optimism',             price: 2.31,      c24: -1.81, c7d: -4.92,  cap: 2.62e9,   vol: 218e6,   circ: 1.13e9,     max: 4.29e9,      cat: 'Layer 2',  algo: 'Optimistic',  launch: 2022 },
  { t: 'IMX',   name: 'Immutable',            price: 1.84,      c24: +2.41, c7d: +7.81,  cap: 2.61e9,   vol: 84e6,    circ: 1.42e9,     max: 2e9,         cat: 'Gaming',   algo: 'StarkEx',     launch: 2021 },
  { t: 'INJ',   name: 'Injective',            price: 28.42,     c24: +6.31, c7d: +21.42, cap: 2.71e9,   vol: 312e6,   circ: 95.4e6,     max: 100e6,       cat: 'DeFi',     algo: 'Tendermint',  launch: 2020 },
  { t: 'RUNE',  name: 'THORChain',            price: 4.82,      c24: -1.32, c7d: +2.81,  cap: 1.62e9,   vol: 142e6,   circ: 336.2e6,    max: 500e6,       cat: 'DeFi',     algo: 'Tendermint',  launch: 2019 },
  { t: 'AAVE',  name: 'Aave',                 price: 112.34,    c24: +1.82, c7d: +6.12,  cap: 1.68e9,   vol: 98e6,    circ: 14.95e6,    max: 16e6,        cat: 'DeFi',     algo: 'ERC-20',      launch: 2020 },
  { t: 'MKR',   name: 'Maker',                price: 1842.50,   c24: +0.62, c7d: +3.41,  cap: 1.71e9,   vol: 64e6,    circ: 927.4e3,    max: 1.005e6,     cat: 'DeFi',     algo: 'ERC-20',      launch: 2017 },
  { t: 'PEPE',  name: 'Pepe',                 price: 0.0000098, c24: +8.42, c7d: +24.81, cap: 4.12e9,   vol: 1.21e9,  circ: 420.69e12,  max: 420.69e12,   cat: 'Meme',     algo: 'ERC-20',      launch: 2023 },
  { t: 'SHIB',  name: 'Shiba Inu',            price: 0.0000184, c24: -3.12, c7d: -8.42,  cap: 10.84e9,  vol: 412e6,   circ: 589.3e12,   max: null,        cat: 'Meme',     algo: 'ERC-20',      launch: 2020 },
  { t: 'WLD',   name: 'Worldcoin',            price: 4.92,      c24: +3.81, c7d: +12.41, cap: 1.42e9,   vol: 184e6,   circ: 288.7e6,    max: 10e9,        cat: 'Identity', algo: 'ERC-20',      launch: 2023 },
  { t: 'RNDR',  name: 'Render',               price: 7.42,      c24: +4.21, c7d: +18.92, cap: 3.84e9,   vol: 218e6,   circ: 517.6e6,    max: 644e6,       cat: 'AI',       algo: 'ERC-20',      launch: 2020 },
  { t: 'FET',   name: 'Fetch.ai',             price: 1.42,      c24: +6.12, c7d: +22.31, cap: 1.38e9,   vol: 142e6,   circ: 972.4e6,    max: 1.15e9,      cat: 'AI',       algo: 'ERC-20',      launch: 2019 },
  { t: 'TIA',   name: 'Celestia',             price: 8.12,      c24: -1.42, c7d: +3.81,  cap: 1.74e9,   vol: 184e6,   circ: 214.3e6,    max: null,        cat: 'Modular',  algo: 'Tendermint',  launch: 2023 }
];

/* ---------- Formatters (es-ES) ---------- */
const nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const nfPrice = (v) => {
  if (v >= 1000) return nf2.format(v);
  if (v >= 1)    return nf2.format(v);
  if (v >= 0.01) return nf4.format(v);
  // micro precios (PEPE / SHIB)
  return v.toLocaleString('es-ES', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
};
const nfPct = (v) => (v >= 0 ? '+' : '') + nf2.format(v) + ' %';
const nfCap = (v) => {
  if (v >= 1e12) return nf2.format(v / 1e12) + ' T USD';
  if (v >= 1e9)  return nf2.format(v / 1e9)  + ' B USD';
  if (v >= 1e6)  return nf2.format(v / 1e6)  + ' M USD';
  return nf2.format(v) + ' USD';
};
const nfSupply = (v) => {
  if (v === null || v === undefined) return '—';
  if (v >= 1e12) return nf2.format(v / 1e12) + ' T';
  if (v >= 1e9)  return nf2.format(v / 1e9)  + ' B';
  if (v >= 1e6)  return nf2.format(v / 1e6)  + ' M';
  if (v >= 1e3)  return nf2.format(v / 1e3)  + ' K';
  return nf2.format(v);
};

/* ---------- Inline SVG icons ---------- */
const ICON = {
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>',
  star:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  more:  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  grid:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  list:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  coin:  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>',
  chev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
};

const PILLS = [
  { icon: '💱', label: 'Tipo', value: 'Todas' },
  { label: 'Categoría' },
  { label: 'Cap. de mercado' },
  { label: 'Volumen 24h' },
  { label: 'Cbo % 24h' },
  { label: 'Cbo % 7D' },
  { label: 'Cbo % 30D' },
  { label: 'Suministro circulante' },
  { label: 'Suministro máximo' },
  { label: 'Lanzamiento' },
  { label: 'Algoritmo' }
];

const TABS = ['Resumen', 'Rendimiento', 'Oscilador', 'Tendencias', 'Supply', 'Más'];

/* ---------- Render helpers ---------- */
function logoCell(c) {
  const url = LOGOS[c.t];
  const inner = url
    ? `<img src="${url}" alt="${c.t}" loading="lazy" onerror="this.parentNode.textContent='${c.t.slice(0,3)}'">`
    : c.t.slice(0, 3);
  const bg = url ? 'transparent' : (BRAND_COLOR[c.t] || '#2962ff');
  return `<span class="sc-sym-logo" style="background:${bg}">${inner}</span>`;
}

function changePill(v) {
  if (v === null || v === undefined) return '<span class="sc-muted">—</span>';
  const cls = v > 0 ? 'sc-pos' : (v < 0 ? 'sc-neg' : 'sc-flat');
  return `<span class="sc-chg ${cls}">${nfPct(v)}</span>`;
}

function row(c) {
  const ratio = c.max ? (c.circ / c.max) : null;
  const ratioStr = ratio !== null ? nf2.format(ratio * 100) + ' %' : '—';
  return `
    <tr>
      <td>
        <a class="sc-sym" href="#">
          ${logoCell(c)}
          <span class="sc-sym-ticker">${c.t}</span>
          <span class="sc-sym-name">${c.name}</span>
        </a>
      </td>
      <td><span class="sc-price-cell">${nfPrice(c.price)} <span class="sc-price-cur">USD</span></span></td>
      <td>${changePill(c.c24)}</td>
      <td>${changePill(c.c7d)}</td>
      <td>${nfCap(c.cap)}</td>
      <td>${nfCap(c.vol)}</td>
      <td>${nfSupply(c.circ)} ${c.t}</td>
      <td>${nfSupply(c.max)}${c.max ? ' ' + c.t : ''}</td>
      <td><span class="sc-muted">${c.cat}</span></td>
      <td>${ratioStr}</td>
    </tr>
  `;
}

export function renderScreenerCrypto(mount) {
  // Sort by market cap desc by default
  const rows = [...CRYPTOS].sort((a, b) => b.cap - a.cap);

  const pillsHTML = PILLS.map((p, i) => {
    const iconHTML = p.icon ? `<span class="sc-pill-icon" style="color:#dbdbdb">${p.icon}</span>` : '';
    const label = p.value ? `${p.label}: ${p.value}` : p.label;
    return `<button class="sc-pill" data-pill="${i}">${iconHTML}${label}<span class="sc-pill-chev">${ICON.chev}</span></button>`;
  }).join('');

  const tabsHTML = TABS.map((t, i) =>
    `<button class="sc-tab ${i === 0 ? 'is-active' : ''}" data-tab="${i}">${t}</button>`
  ).join('');

  const tbody = rows.map(row).join('');

  mount.innerHTML = `
    <div class="sc-root">
      <div class="sc-container">

        <nav class="sc-breadcrumb" aria-label="Breadcrumb">
          <a href="/">Inicio</a>
          <span class="sc-bc-sep">›</span>
          <a href="/screeners/crypto">Analizador de criptos</a>
          <span class="sc-bc-sep">›</span>
          <span class="sc-bc-current">Todas las criptos</span>
        </nav>

        <div class="sc-title-bar">
          <h1 class="sc-title">
            Todas las criptos
            <span class="sc-title-chev">${ICON.chev}</span>
          </h1>
          <div class="sc-title-actions">
            <button class="sc-action-btn" title="Compartir" aria-label="Compartir">${ICON.share}</button>
            <button class="sc-action-btn" title="Favoritos" aria-label="Favoritos">${ICON.star}</button>
            <button class="sc-action-btn" title="Más opciones" aria-label="Más opciones">${ICON.more}</button>
          </div>
        </div>

        <div class="sc-pills">
          ${pillsHTML}
          <button class="sc-pill sc-pill-square" title="Vista en cuadrícula" aria-label="Vista en cuadrícula">${ICON.grid}</button>
          <button class="sc-pill sc-pill-square" title="Más opciones" aria-label="Más opciones">${ICON.more}</button>
        </div>

        <div class="sc-tabs-wrap">
          <div class="sc-view-toggle">
            <button class="is-active" title="Lista" aria-label="Lista">${ICON.list}</button>
            <button title="Cuadrícula" aria-label="Cuadrícula">${ICON.grid}</button>
          </div>
          <div class="sc-tabs">
            ${tabsHTML}
          </div>
        </div>

        <div class="sc-result-count">
          Mostrando <strong style="color:#dbdbdb">${rows.length}</strong> de 28.917 resultados
        </div>

        <div class="sc-table-wrap">
          <table class="sc-table">
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Precio</th>
                <th>Cbo % 24h</th>
                <th>Cbo % 7D</th>
                <th class="sc-th-sorted">Cap. de mercado <span class="sc-sort-arrow">▼</span></th>
                <th>Volumen 24h</th>
                <th>Suministro circulante</th>
                <th>Suministro máx</th>
                <th>Categoría</th>
                <th>Cap/Supply ratio</th>
              </tr>
            </thead>
            <tbody>
              ${tbody}
            </tbody>
          </table>
        </div>

        <a class="sc-footer-cta" href="#">Cargar más resultados →</a>

      </div>
    </div>
  `;

  // Interactivity — tab switching (visual only)
  const tabs = mount.querySelectorAll('.sc-tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
  }));

  // Pill click (visual only)
  mount.querySelectorAll('.sc-pill[data-pill]').forEach(p => {
    p.addEventListener('click', () => p.classList.toggle('sc-pill-active'));
  });

  return {
    destroy() { mount.innerHTML = ''; }
  };
}
