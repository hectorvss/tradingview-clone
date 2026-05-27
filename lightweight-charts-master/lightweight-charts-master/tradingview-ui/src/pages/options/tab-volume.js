// Options → Volume sub-tab (Heatmap)
// Matches Figma frame 19:122725 (.figma-cache/08-19-122725.png)
// Sub-tabs: Mapa de calor / Por vencimiento / Por strike
// Right-side controls + heatmap table (strikes × date×{calls,puts})

const STYLES = `
.optvol-root{
  display:flex;flex-direction:column;width:100%;height:100%;min-height:0;
  background:var(--tv-bg-0,#0f0f0f);color:var(--tv-text,#d1d4dc);
  font-family:'Trebuchet MS',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  padding:8px 24px 16px;box-sizing:border-box;overflow:hidden;
}
.optvol-toolbar{
  display:flex;align-items:center;gap:8px;padding:8px 0 12px;
  flex-shrink:0;
}
.optvol-subtabs{display:flex;gap:4px;}
.optvol-subtab{
  background:transparent;border:none;color:var(--tv-text-muted,#787b86);
  padding:6px 12px;border-radius:6px;font-size:13px;cursor:pointer;
  line-height:1.4;
}
.optvol-subtab:hover{color:var(--tv-text,#d1d4dc);background:var(--tv-bg-2,#1e222d);}
.optvol-subtab.is-active{
  background:#dbdbdb;color:#0f0f0f;font-weight:600;
}
.optvol-spacer{flex:1;}
.optvol-select{
  display:inline-flex;align-items:center;gap:6px;padding:5px 10px;
  background:transparent;border:1px solid var(--tv-border,#2a2e39);
  border-radius:6px;color:var(--tv-text,#d1d4dc);font-size:12px;cursor:pointer;
  line-height:1.4;height:28px;box-sizing:border-box;
}
.optvol-select .caret{color:var(--tv-text-muted,#787b86);font-size:10px;margin-left:2px;}
.optvol-select:hover{background:var(--tv-bg-2,#1e222d);}
.optvol-icon-btn{
  width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;
  border:none;background:transparent;
  border-radius:6px;color:var(--tv-text-muted,#787b86);cursor:pointer;
  font-size:14px;line-height:1;padding:0;box-sizing:border-box;
}
.optvol-icon-btn:hover{background:var(--tv-bg-2,#1e222d);color:var(--tv-text,#d1d4dc);}
.optvol-body{
  flex:1 1 auto;min-height:0;width:100%;display:flex;position:relative;
}
.optvol-table-wrap{
  flex:1 1 auto;min-height:0;width:100%;overflow:auto;
  border:1px solid var(--tv-border,#2a2e39);
  border-radius:6px;background:var(--tv-bg-0,#0f0f0f);
}
.optvol-table{border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed;min-width:max-content;}
.optvol-table th, .optvol-table td{
  border-right:1px solid rgba(255,255,255,0.04);
  border-bottom:1px solid rgba(255,255,255,0.04);
  text-align:center;padding:6px 4px;white-space:nowrap;height:30px;
  box-sizing:border-box;
}
.optvol-table thead th{
  background:var(--tv-bg-0,#0f0f0f);color:var(--tv-text-muted,#787b86);
  font-weight:400;position:sticky;z-index:2;
}
.optvol-table thead tr.row-dates th{
  top:0;font-size:12px;color:var(--tv-text-muted,#787b86);
  border-bottom:1px solid rgba(255,255,255,0.06);
}
.optvol-table thead tr.row-cp th{
  top:31px;font-size:11px;color:var(--tv-text-muted,#787b86);font-weight:400;
}
.optvol-th-strikes{
  position:sticky;left:0;top:0;z-index:4;background:var(--tv-bg-0,#0f0f0f);
  text-align:left;padding-left:16px;width:130px;min-width:130px;
  color:var(--tv-text,#d1d4dc);font-weight:400;
  border-right:1px solid rgba(255,255,255,0.06);
}
.optvol-td-strike{
  position:sticky;left:0;background:var(--tv-bg-0,#0f0f0f);
  color:var(--tv-text,#d1d4dc);text-align:left;padding-left:16px;
  font-weight:400;z-index:1;
  border-right:1px solid rgba(255,255,255,0.06);
}
.optvol-cell-empty{color:var(--tv-text-dim,#5d6168);}
.optvol-cell-val{
  color:var(--tv-text,#d1d4dc);font-weight:500;cursor:pointer;
  background:rgba(242,54,69,var(--tint,0.2));
  transition:outline 90ms;
}
.optvol-cell-val:hover{outline:1px solid rgba(255,255,255,0.4);outline-offset:-1px;}
.optvol-date-col{width:120px;min-width:120px;}
.optvol-cp-col{width:60px;min-width:60px;}
.optvol-placeholder{
  flex:1 1 auto;min-height:0;width:100%;
  display:flex;align-items:center;justify-content:center;
  border:1px dashed var(--tv-border,#2a2e39);border-radius:6px;
  color:var(--tv-text-muted,#787b86);font-size:13px;
  background:var(--tv-bg-0,#0f0f0f);
}
.optvol-placeholder .tag{
  padding:8px 18px;border-radius:14px;
  background:var(--tv-bg-2,#1e222d);color:var(--tv-text,#d1d4dc);
  font-size:12px;letter-spacing:.3px;
}
.optvol-tooltip{
  position:fixed;pointer-events:none;z-index:50;
  background:rgba(20,22,28,0.96);color:var(--tv-text,#d1d4dc);
  border:1px solid var(--tv-border,#2a2e39);border-radius:4px;
  padding:6px 8px;font-size:11px;line-height:1.45;
  box-shadow:0 4px 12px rgba(0,0,0,0.45);
  display:none;white-space:nowrap;
}
.optvol-tooltip.is-visible{display:block;}
.optvol-tooltip .ttl{color:var(--tv-text-muted,#787b86);margin-right:6px;}
.optvol-tooltip .val{color:var(--tv-text,#d1d4dc);font-weight:600;}
`;

// Strikes (left column) — using dot as thousands separator per Figma
const STRIKES = [
  '100','500','1.000','1.100','1.200','1.300','1.400','1.500',
  '1.600','1.700','1.800','1.900','2.000','2.100','2.200','2.300',
  '2.400','2.500','2.600','2.700','2.800','2.900','3.000','3.100',
];

// Date columns
const DATES = [
  '26 may','27 may','28 may','29 may','1 jun','2 jun','3 jun','4 jun','5 jun','8 jun',
];

// Hardcoded heatmap values from Figma: key = "strike|date|side"
const VALUES = {
  '100|26 may|P': 101,
  '1.400|29 may|P': 35,
  '1.600|29 may|P': 2,
  '1.800|29 may|P': 2,
  '2.000|29 may|P': 4,
  '2.100|29 may|P': 6,
};

const MAX_VAL = 101;

const SIDE_LABEL = { C:'Calls', P:'Puts' };

export function renderOptionsVolumeTab(mount, opts = {}) {
  mount.innerHTML = `
    <style>${STYLES}</style>
    <div class="optvol-root">
      <div class="optvol-toolbar">
        <div class="optvol-subtabs">
          <button class="optvol-subtab is-active" data-tab="heatmap">Mapa de calor</button>
          <button class="optvol-subtab" data-tab="byexp">Por vencimiento</button>
          <button class="optvol-subtab" data-tab="bystrike">Por strike</button>
        </div>
        <div class="optvol-spacer"></div>
        <button class="optvol-select">1 mes <span class="caret">▾</span></button>
        <button class="optvol-select">Calls y puts <span class="caret">▾</span></button>
        <button class="optvol-icon-btn" title="Captura" aria-label="Captura">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
        <button class="optvol-icon-btn" title="Ampliar" aria-label="Ampliar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
      <div class="optvol-body" data-body></div>
      <div class="optvol-tooltip" data-tt></div>
    </div>
  `;

  const tabsEl  = mount.querySelector('.optvol-subtabs');
  const bodyEl  = mount.querySelector('[data-body]');
  const ttEl    = mount.querySelector('[data-tt]');
  let current   = 'heatmap';

  const renderBody = (mode) => {
    if (mode === 'heatmap'){
      bodyEl.innerHTML = `<div class="optvol-table-wrap" data-wrap>${renderTable()}</div>`;
      attachCellHover();
    } else {
      const label = mode === 'byexp' ? 'Por vencimiento' : 'Por strike';
      bodyEl.innerHTML = `
        <div class="optvol-placeholder">
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
            <span class="tag">${label}</span>
            <span>Próximamente</span>
          </div>
        </div>`;
    }
  };

  // ---- cell hover tooltip (heatmap only) ----
  let cellMove = null;
  let cellLeave = null;
  function attachCellHover(){
    const wrap = bodyEl.querySelector('[data-wrap]');
    if (!wrap) return;
    cellMove = (e) => {
      const td = e.target.closest('.optvol-cell-val');
      if (!td){ ttEl.classList.remove('is-visible'); return; }
      const strike = td.getAttribute('data-strike');
      const date   = td.getAttribute('data-date');
      const side   = td.getAttribute('data-side');
      const val    = td.getAttribute('data-val');
      ttEl.innerHTML =
        `<div><span class="ttl">Strike</span><span class="val">${strike}</span></div>` +
        `<div><span class="ttl">${SIDE_LABEL[side]||side}</span><span class="val">${date}</span></div>` +
        `<div><span class="ttl">Volumen</span><span class="val">${val} contratos</span></div>`;
      ttEl.classList.add('is-visible');
      const pad = 14;
      const w = ttEl.offsetWidth || 160;
      const h = ttEl.offsetHeight || 60;
      let left = e.clientX + pad;
      let top  = e.clientY + pad;
      if (left + w > window.innerWidth - 4)  left = e.clientX - w - pad;
      if (top  + h > window.innerHeight - 4) top  = e.clientY - h - pad;
      ttEl.style.left = left + 'px';
      ttEl.style.top  = top  + 'px';
    };
    cellLeave = () => ttEl.classList.remove('is-visible');
    wrap.addEventListener('mousemove', cellMove);
    wrap.addEventListener('mouseleave', cellLeave);
  }
  function detachCellHover(){
    const wrap = bodyEl.querySelector('[data-wrap]');
    if (!wrap) return;
    if (cellMove)  wrap.removeEventListener('mousemove', cellMove);
    if (cellLeave) wrap.removeEventListener('mouseleave', cellLeave);
    cellMove = cellLeave = null;
  }

  renderBody(current);

  const onTabClick = (e) => {
    const b = e.target.closest('.optvol-subtab');
    if (!b) return;
    const tab = b.getAttribute('data-tab');
    if (tab === current) return;
    tabsEl.querySelectorAll('.optvol-subtab').forEach(n => n.classList.remove('is-active'));
    b.classList.add('is-active');
    detachCellHover();
    ttEl.classList.remove('is-visible');
    current = tab;
    renderBody(current);
  };
  tabsEl.addEventListener('click', onTabClick);

  return {
    destroy(){
      detachCellHover();
      tabsEl.removeEventListener('click', onTabClick);
      mount.innerHTML = '';
    }
  };
}

function renderTable(){
  const dateHeads = DATES.map(d =>
    `<th class="optvol-date-col" colspan="2">${d}</th>`
  ).join('');

  const cpHeads = DATES.map(() =>
    `<th class="optvol-cp-col">Calls</th><th class="optvol-cp-col">Puts</th>`
  ).join('');

  const rows = STRIKES.map(strike => {
    const cells = DATES.map(date => {
      const cKey = `${strike}|${date}|C`;
      const pKey = `${strike}|${date}|P`;
      return cell(VALUES[cKey], strike, date, 'C') + cell(VALUES[pKey], strike, date, 'P');
    }).join('');
    return `<tr><td class="optvol-td-strike">${strike}</td>${cells}</tr>`;
  }).join('');

  return `
    <table class="optvol-table">
      <thead>
        <tr class="row-dates">
          <th class="optvol-th-strikes" rowspan="2">Strikes</th>
          ${dateHeads}
        </tr>
        <tr class="row-cp">${cpHeads}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function cell(v, strike, date, side){
  if (v == null) return `<td class="optvol-cell-empty">—</td>`;
  const norm = Math.min(1, Math.log(v+1) / Math.log(MAX_VAL+1));
  const tint = (0.18 + norm * 0.65).toFixed(3);
  return `<td class="optvol-cell-val" style="--tint:${tint}" data-strike="${strike}" data-date="${date}" data-side="${side}" data-val="${v}">${v}</td>`;
}

export default renderOptionsVolumeTab;
