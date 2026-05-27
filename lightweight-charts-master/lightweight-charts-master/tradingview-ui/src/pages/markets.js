// /markets — agregador. Importa top + bottom (Figma 25:223621). CSS compartido en markets.css.
// Además inyecta una sección superior derivada de Figma 25:261346 (Actividad corporativa /
// Corporate-activity news table) con un popup informativo y una tabla de cambios de
// recomendación de analistas. Todos los estilos van con prefijo .mkt- y se inyectan
// inline para no tocar src/styles.css.
import './markets.css';
import { renderMarketsTop } from './markets-top.js';
import { renderMarketsBottom } from './markets-bottom.js';

// ---------------------------------------------------------------------------
// Datos mock derivados del frame Figma 25:261346 (titulares de Reuters /
// cambios de recomendación de analistas). Se conserva la estructura original
// (Hora | Instrumento | Titular | Proveedor) y se añaden algunas filas con
// banderas + valores numéricos para conectar con el tema "Markets" pedido.
// ---------------------------------------------------------------------------
const MKT_HEADLINES = [
  { time: '10:44', flag: '🇺🇸', symbol: 'APO',  headline: 'Apollo: Piper Sandler eleva el precio objetivo de 146 a 157 dólares', provider: 'Reuters', value: '157.00', change: '+2.4%', up: true },
  { time: '10:42', flag: '🇺🇸', symbol: 'PSX',  headline: 'Phillips 66: Jefferies eleva el precio objetivo de 173 a 191 dólares', provider: 'Reuters', value: '191.00', change: '+1.8%', up: true },
  { time: '10:38', flag: '🇺🇸', symbol: 'VLO',  headline: 'Valero Energy: Jefferies rebaja el precio objetivo de 290 a 284 dólares', provider: 'Reuters', value: '284.00', change: '-0.6%', up: false },
  { time: '10:31', flag: '🇺🇸', symbol: 'ALNT', headline: 'Allient Inc: JP Morgan eleva la calificación de «neutral» a «sobreponderar»', provider: 'Reuters', value: '80.00',  change: '+3.1%', up: true },
  { time: '10:24', flag: '🇺🇸', symbol: 'TTAN', headline: 'ServiceTitan Inc: TD Cowen rebaja el precio objetivo de 135 a 110 dólares', provider: 'Reuters', value: '110.00', change: '-2.9%', up: false },
  { time: '10:18', flag: '🇺🇸', symbol: 'AFL',  headline: 'Aflac Inc: Piper Sandler eleva el precio objetivo de 125 a 130 dólares', provider: 'Reuters', value: '130.00', change: '+0.9%', up: true },
  { time: '10:11', flag: '🇺🇸', symbol: 'ALB',  headline: 'Albemarle: RBC eleva el precio objetivo de 253 a 257 dólares', provider: 'Reuters', value: '257.00', change: '+0.4%', up: true },
  { time: '10:05', flag: '🇺🇸', symbol: 'AFG',  headline: 'American Financial Group: Piper Sandler eleva el precio objetivo de 135 a 140 dólares', provider: 'Reuters', value: '140.00', change: '+0.7%', up: true },
  { time: '09:58', flag: '🇺🇸', symbol: 'ARR',  headline: 'Array Digital Infrastructure: JP Morgan rebaja el precio objetivo de 60 a 54 dólares', provider: 'Reuters', value: '54.00',  change: '-1.5%', up: false },
  { time: '09:51', flag: '🇺🇸', symbol: 'AIZ',  headline: 'Assurant Inc: Piper Sandler eleva el precio objetivo de 268 a 290 dólares', provider: 'Reuters', value: '290.00', change: '+1.2%', up: true },
  { time: '09:44', flag: '🇺🇸', symbol: 'BJ',   headline: "BJ's Wholesale Club: JP Morgan eleva el precio objetivo en su revisión trimestral", provider: 'Reuters', value: '118.40', change: '+0.5%', up: true },
];

const MKT_STYLE_ID = 'mkt-figma-styles';
const MKT_STYLE = `
  .mkt-figma-root {
    font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif);
    color: var(--grey-86, #dbdbdb);
    background: var(--grey-12, #0f0f0f);
    padding: 24px 40px 12px;
    max-width: 1395px;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .mkt-figma-root *, .mkt-figma-root *::before, .mkt-figma-root *::after { box-sizing: border-box; }

  /* Popup / modal — derivado del recuadro superior del frame Figma */
  .mkt-popup {
    position: relative;
    background: var(--grey-18, #1e1e1e);
    border: 1px solid var(--grey-29, #2a2e39);
    border-radius: 8px;
    padding: 16px 44px 16px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 720px;
  }
  .mkt-popup-icon {
    width: 36px; height: 36px; flex: 0 0 36px;
    border-radius: 50%;
    background: var(--azure-58, #2962ff);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 18px;
  }
  .mkt-popup-body { flex: 1; min-width: 0; }
  .mkt-popup-title { font-size: 14px; font-weight: 600; color: #fff; margin: 0 0 2px; line-height: 18px; }
  .mkt-popup-text  { font-size: 13px; color: var(--grey-86, #b4b4b4); margin: 0; line-height: 18px; }
  .mkt-popup-close {
    position: absolute; top: 8px; right: 8px;
    width: 24px; height: 24px; border: 0; background: transparent;
    color: var(--grey-86, #b4b4b4); cursor: pointer; font-size: 16px; line-height: 1;
    border-radius: 4px;
  }
  .mkt-popup-close:hover { background: var(--grey-29, #2a2e39); color: #fff; }

  /* Encabezado de la sección — h1 del frame Figma "Actividad corporativa" */
  .mkt-head { margin: 0 0 4px; }
  .mkt-head h1 {
    font-family: Roboto, var(--font-ui);
    font-size: 32px; line-height: 40px; font-weight: 700; color: #fff;
    margin: 0 0 8px;
  }
  .mkt-head p {
    margin: 0 0 16px;
    font-size: 14px; line-height: 22px;
    color: var(--grey-86, #b4b4b4);
    max-width: 760px;
  }

  /* Tabla de titulares — columnas Hora | Instrumento | Titular | Proveedor */
  .mkt-table-wrap {
    border: 1px solid var(--grey-29, #2a2e39);
    border-radius: 8px;
    overflow: hidden;
    background: var(--grey-12, #0f0f0f);
    margin-bottom: 24px;
  }
  .mkt-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .mkt-table thead th {
    text-align: left;
    font-weight: 500;
    color: #8c8c8c;
    font-size: 12px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 14px 16px;
    background: var(--grey-18, #1e1e1e);
    border-bottom: 1px solid var(--grey-29, #2a2e39);
    white-space: nowrap;
  }
  .mkt-table tbody td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--grey-29, #2a2e39);
    color: var(--grey-86, #dbdbdb);
    line-height: 18px;
    vertical-align: middle;
  }
  .mkt-table tbody tr:last-child td { border-bottom: 0; }
  .mkt-table tbody tr:hover td { background: rgba(255,255,255,0.025); }

  .mkt-col-time  { width: 80px; color: #8c8c8c; font-variant-numeric: tabular-nums; }
  .mkt-col-instr { width: 140px; }
  .mkt-col-val   { width: 96px;  text-align: right; font-variant-numeric: tabular-nums; }
  .mkt-col-chg   { width: 88px;  text-align: right; font-variant-numeric: tabular-nums; }
  .mkt-col-prov  { width: 110px; color: #8c8c8c; }

  .mkt-instr { display: inline-flex; align-items: center; gap: 8px; }
  .mkt-flag  { font-size: 16px; line-height: 1; }
  .mkt-sym   { font-weight: 600; color: #fff; }
  .mkt-headline { color: var(--grey-86, #dbdbdb); }
  .mkt-up   { color: #26a69a; }
  .mkt-down { color: #ef5350; }

  @media (max-width: 900px) {
    .mkt-figma-root { padding: 16px 16px 8px; }
    .mkt-head h1 { font-size: 24px; line-height: 30px; }
    .mkt-col-val, .mkt-col-prov { display: none; }
  }
`;

function ensureStyle() {
  if (document.getElementById(MKT_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = MKT_STYLE_ID;
  s.textContent = MKT_STYLE;
  document.head.appendChild(s);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderFigmaSection(container) {
  const rows = MKT_HEADLINES.map(r => `
    <tr>
      <td class="mkt-col-time">${escapeHtml(r.time)}</td>
      <td class="mkt-col-instr">
        <span class="mkt-instr"><span class="mkt-flag">${r.flag}</span><span class="mkt-sym">${escapeHtml(r.symbol)}</span></span>
      </td>
      <td class="mkt-headline">${escapeHtml(r.headline)}</td>
      <td class="mkt-col-val">${escapeHtml(r.value)}</td>
      <td class="mkt-col-chg ${r.up ? 'mkt-up' : 'mkt-down'}">${escapeHtml(r.change)}</td>
      <td class="mkt-col-prov">${escapeHtml(r.provider)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <section class="mkt-figma-root" aria-label="Actividad corporativa">
      <div class="mkt-popup" role="status">
        <div class="mkt-popup-icon" aria-hidden="true">i</div>
        <div class="mkt-popup-body">
          <p class="mkt-popup-title">Lo más destacado del día</p>
          <p class="mkt-popup-text">Cambios recientes de recomendación y precios objetivo de los principales analistas.</p>
        </div>
        <button class="mkt-popup-close" type="button" aria-label="Cerrar">×</button>
      </div>

      <header class="mkt-head">
        <h1>Actividad corporativa</h1>
        <p>Descubra cómo se toman las grandes decisiones empresariales, desde los cambios de liderazgo hasta los estratégicos, pasando por todo lo demás.</p>
      </header>

      <div class="mkt-table-wrap">
        <table class="mkt-table">
          <thead>
            <tr>
              <th class="mkt-col-time">Hora</th>
              <th class="mkt-col-instr">Instrumento</th>
              <th>Titular</th>
              <th class="mkt-col-val">Valor</th>
              <th class="mkt-col-chg">Cambio</th>
              <th class="mkt-col-prov">Proveedor</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;

  const closeBtn = container.querySelector('.mkt-popup-close');
  const popup = container.querySelector('.mkt-popup');
  if (closeBtn && popup) {
    closeBtn.addEventListener('click', () => {
      popup.style.display = 'none';
      // Remove from DOM on next tick so the hide takes effect first.
      setTimeout(() => popup.remove(), 0);
    });
  }
}

export function renderMarkets(mount) {
  ensureStyle();
  mount.innerHTML = `<div class="mk-page">
    <div id="mk-figma"></div>
    <div id="mk-top"></div>
    <div id="mk-bottom"></div>
  </div>`;
  renderFigmaSection(mount.querySelector('#mk-figma'));
  renderMarketsTop(mount.querySelector('#mk-top'));
  renderMarketsBottom(mount.querySelector('#mk-bottom'));
  return {
    destroy() {
      const s = document.getElementById(MKT_STYLE_ID);
      if (s) s.remove();
    }
  };
}
