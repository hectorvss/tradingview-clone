// object-tree-data-window.js
// Two TradingView-style right-sidebar widgets: Object Tree + Data Window.
// Standalone, dark theme, CSS injected once. No external deps.

// ---------- shared CSS ----------
const STYLE_ID = '__otdw_styles__';
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const css = `
@keyframes otdw-slide-in {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}
.otdw-widget{font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#d1d4dc;background:#131722;border:1px solid #2a2e39;border-radius:4px;display:flex;flex-direction:column;overflow:hidden;user-select:none;animation:otdw-slide-in .2s ease-out}
.otdw-widget *{box-sizing:border-box}
.otdw-header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#1e222d;border-bottom:1px solid #2a2e39;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#787b86;flex-shrink:0}
.otdw-header-actions{display:flex;gap:4px}
.otdw-iconbtn{background:transparent;border:0;color:#787b86;cursor:pointer;padding:2px 4px;border-radius:2px;font-size:12px;line-height:1}
.otdw-iconbtn:hover{background:#2a2e39;color:#d1d4dc}
.otdw-iconbtn:focus-visible{outline:2px solid #2962ff;outline-offset:1px}
.otdw-body{overflow-y:auto;flex:1;min-height:0;scrollbar-width:thin;scrollbar-color:#2a2e39 transparent}
.otdw-body::-webkit-scrollbar{width:8px}
.otdw-body::-webkit-scrollbar-thumb{background:#2a2e39;border-radius:4px}
.otdw-body::-webkit-scrollbar-thumb:hover{background:#363a45}
.otdw-body::-webkit-scrollbar-track{background:transparent}

/* Object Tree */
.otdw-tree-node{display:flex;align-items:center;padding:4px 8px;cursor:pointer;border-left:2px solid transparent;gap:4px;min-height:26px}
.otdw-tree-node:hover{background:#1e222d}
.otdw-tree-node.otdw-selected{background:#2962ff22;border-left-color:#2962ff}
.otdw-tree-node.otdw-dragging{opacity:.4}
.otdw-tree-node.otdw-drop-target{border-top:2px solid #2962ff}
.otdw-twisty{width:14px;text-align:center;color:#787b86;font-size:10px;cursor:pointer;flex-shrink:0}
.otdw-twisty.otdw-empty{visibility:hidden}
.otdw-tree-icon{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#787b86;flex-shrink:0}
.otdw-tree-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d1d4dc}
.otdw-tree-node.otdw-hidden .otdw-tree-label{color:#5d606b;font-style:italic}
.otdw-tree-actions{display:flex;gap:2px;opacity:0;transition:opacity .1s}
.otdw-tree-node:hover .otdw-tree-actions{opacity:1}
.otdw-eye{cursor:pointer;color:#787b86;font-size:12px;padding:2px}
.otdw-eye:hover{color:#d1d4dc}
.otdw-eye.otdw-eye-off{color:#4a4d57}
.otdw-del{cursor:pointer;color:#787b86;font-size:12px;padding:2px}
.otdw-del:hover{color:#f23645}
.otdw-tree-category{display:flex;align-items:center;padding:6px 8px;background:#1a1e28;border-top:1px solid #2a2e39;border-bottom:1px solid #2a2e39;font-size:11px;font-weight:600;color:#787b86;text-transform:uppercase;letter-spacing:.4px;cursor:pointer;gap:4px}
.otdw-tree-category:first-child{border-top:0}
.otdw-tree-category .otdw-twisty{color:#787b86}
.otdw-tree-count{margin-left:auto;color:#5d606b;font-weight:400}
.otdw-tree-empty{padding:12px;text-align:center;color:#5d606b;font-style:italic}
.otdw-children{padding-left:14px}

/* Context menu */
.otdw-ctxmenu{position:fixed;background:#1e222d;border:1px solid #363a45;border-radius:3px;padding:4px 0;min-width:180px;box-shadow:0 6px 20px rgba(0,0,0,.5);z-index:999999;font-size:12px}
.otdw-ctxmenu-item{padding:6px 14px;cursor:pointer;color:#d1d4dc;display:flex;align-items:center;justify-content:space-between;gap:12px}
.otdw-ctxmenu-item:hover{background:#2962ff;color:#fff}
.otdw-ctxmenu-sep{height:1px;background:#2a2e39;margin:4px 0}
.otdw-submenu{position:relative}
.otdw-submenu::after{content:'▸';color:#787b86;font-size:9px}
.otdw-submenu-panel{position:absolute;left:100%;top:-5px;background:#1e222d;border:1px solid #363a45;border-radius:3px;padding:4px 0;min-width:160px;box-shadow:0 6px 20px rgba(0,0,0,.5);display:none}
.otdw-submenu:hover .otdw-submenu-panel{display:block}

/* Data Window */
.otdw-dw-section{padding:0}
.otdw-dw-section-title{padding:6px 10px;background:#1a1e28;border-top:1px solid #2a2e39;border-bottom:1px solid #2a2e39;font-size:10px;font-weight:600;color:#787b86;text-transform:uppercase;letter-spacing:.5px}
.otdw-dw-section-title:first-child{border-top:0}
.otdw-dw-row{display:flex;align-items:center;padding:4px 10px;gap:8px;border-bottom:1px solid rgba(42,46,57,.4);min-height:24px}
.otdw-dw-row:hover{background:#1e222d}
.otdw-dw-swatch{width:8px;height:8px;border-radius:2px;flex-shrink:0}
.otdw-dw-label{flex:1;color:#d1d4dc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.otdw-dw-value{font-family:"SF Mono",Consolas,Menlo,monospace;font-size:11px;color:#d1d4dc;text-align:right;min-width:60px}
.otdw-dw-value.otdw-up{color:#26a69a}
.otdw-dw-value.otdw-down{color:#ef5350}
.otdw-dw-value.otdw-na{color:#5d606b}
.otdw-dw-ohlc{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:6px 10px;font-family:"SF Mono",Consolas,Menlo,monospace;font-size:11px}
.otdw-dw-ohlc-k{color:#787b86}
.otdw-dw-ohlc-v{color:#d1d4dc;text-align:right}
.otdw-dw-empty{padding:14px;text-align:center;color:#5d606b;font-style:italic}
`;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

// ---------- helpers ----------
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function iconFor(type) {
  switch (type) {
    case 'indicator': return 'ƒ';
    case 'drawing':   return '◢';
    case 'compare':   return '⇌';
    case 'alert':     return '🔔';
    default:          return '•';
  }
}
function fmtNum(v, digits) {
  if (v == null || Number.isNaN(v)) return '—';
  if (typeof v !== 'number') return String(v);
  const d = digits == null ? (Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 4 : 6) : digits;
  return v.toFixed(d);
}
function closeAllMenus() {
  document.querySelectorAll('.otdw-ctxmenu').forEach(n => n.remove());
}

// ==========================================================
//   1) OBJECT TREE
// ==========================================================
export function createObjectTree(container, opts = {}) {
  injectStyles();
  if (!container) throw new Error('createObjectTree: container required');

  const state = {
    items: [],
    collapsedCategories: new Set(),
    collapsedNodes: new Set(),
    selectedId: null,
    panes: opts.panes || [0, 1],
  };

  const root = el('div', 'otdw-widget otdw-tree');
  const header = el('div', 'otdw-header');
  header.appendChild(el('span', null, 'Object Tree'));
  const actions = el('div', 'otdw-header-actions');
  const btnCollapse = el('button', 'otdw-iconbtn', '⊟');
  btnCollapse.title = 'Collapse all';
  btnCollapse.onclick = () => {
    state.collapsedCategories = new Set(['indicator','drawing','compare','alert']);
    paint();
  };
  const btnExpand = el('button', 'otdw-iconbtn', '⊞');
  btnExpand.title = 'Expand all';
  btnExpand.onclick = () => {
    state.collapsedCategories.clear();
    state.collapsedNodes.clear();
    paint();
  };
  actions.appendChild(btnExpand);
  actions.appendChild(btnCollapse);
  header.appendChild(actions);
  root.appendChild(header);

  const body = el('div', 'otdw-body');
  root.appendChild(body);
  container.appendChild(root);

  // Document-level listeners we install:
  const onDocClick = () => closeAllMenus();
  document.addEventListener('click', onDocClick);

  // ---------- drag state ----------
  let dragId = null;
  let dragCategory = null;

  function categorize(items) {
    const groups = {
      indicator: { label: 'Indicators', items: [] },
      drawing:   { label: 'Drawings',   items: [] },
      compare:   { label: 'Compares',   items: [] },
      alert:     { label: 'Alerts',     items: [] },
    };
    for (const it of items) {
      if (groups[it.type]) groups[it.type].items.push(it);
    }
    return groups;
  }

  function paint() {
    body.innerHTML = '';
    const groups = categorize(state.items);

    for (const key of ['indicator','drawing','compare','alert']) {
      const g = groups[key];
      const cat = el('div', 'otdw-tree-category');
      const twisty = el('span', 'otdw-twisty', state.collapsedCategories.has(key) ? '▸' : '▾');
      cat.appendChild(twisty);
      cat.appendChild(el('span', 'otdw-tree-icon', iconFor(key)));
      cat.appendChild(el('span', null, g.label));
      cat.appendChild(el('span', 'otdw-tree-count', String(g.items.length)));
      cat.onclick = () => {
        if (state.collapsedCategories.has(key)) state.collapsedCategories.delete(key);
        else state.collapsedCategories.add(key);
        paint();
      };
      body.appendChild(cat);

      if (state.collapsedCategories.has(key)) continue;
      if (!g.items.length) {
        body.appendChild(el('div', 'otdw-tree-empty', 'No items'));
        continue;
      }
      const list = el('div', 'otdw-children otdw-cat-list');
      list.dataset.category = key;
      for (const it of g.items) renderNode(list, it, 0, key);
      body.appendChild(list);
    }
  }

  function renderNode(parent, item, depth, category) {
    const node = el('div', 'otdw-tree-node');
    node.dataset.id = item.id;
    node.dataset.category = category;
    node.style.paddingLeft = `${8 + depth * 12}px`;
    if (state.selectedId === item.id) node.classList.add('otdw-selected');
    if (item.visible === false) node.classList.add('otdw-hidden');

    const hasChildren = item.children && item.children.length;
    const expanded = !state.collapsedNodes.has(item.id);
    const twisty = el('span', 'otdw-twisty' + (hasChildren ? '' : ' otdw-empty'),
      hasChildren ? (expanded ? '▾' : '▸') : '•');
    twisty.onclick = (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      if (state.collapsedNodes.has(item.id)) state.collapsedNodes.delete(item.id);
      else state.collapsedNodes.add(item.id);
      paint();
    };
    node.appendChild(twisty);
    node.appendChild(el('span', 'otdw-tree-icon', iconFor(item.type)));
    const label = el('span', 'otdw-tree-label', escapeHtml(item.name || '(unnamed)'));
    if (item.paneIndex != null) label.title = `${item.name} — pane ${item.paneIndex}`;
    node.appendChild(label);

    const actionsBox = el('div', 'otdw-tree-actions');
    const eye = el('span', 'otdw-eye' + (item.visible === false ? ' otdw-eye-off' : ''),
      item.visible === false ? '◌' : '👁');
    eye.title = 'Toggle visibility';
    eye.onclick = (e) => {
      e.stopPropagation();
      const newVis = !(item.visible !== false);
      item.visible = newVis;
      paint();
      if (opts.onToggleVisibility) opts.onToggleVisibility(item.id, newVis);
    };
    actionsBox.appendChild(eye);
    const del = el('span', 'otdw-del', '✕');
    del.title = 'Delete';
    del.onclick = (e) => {
      e.stopPropagation();
      removeItem(item.id);
      if (opts.onDelete) opts.onDelete(item.id);
    };
    actionsBox.appendChild(del);
    node.appendChild(actionsBox);

    node.onclick = () => {
      state.selectedId = item.id;
      paint();
      if (opts.onSelect) opts.onSelect(item.id);
    };
    node.oncontextmenu = (e) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, item);
    };

    // drag & drop reorder within category
    node.draggable = true;
    node.ondragstart = (e) => {
      dragId = item.id;
      dragCategory = category;
      node.classList.add('otdw-dragging');
      try { e.dataTransfer.setData('text/plain', item.id); } catch (_) {}
      e.dataTransfer.effectAllowed = 'move';
    };
    node.ondragend = () => {
      node.classList.remove('otdw-dragging');
      document.querySelectorAll('.otdw-drop-target').forEach(n => n.classList.remove('otdw-drop-target'));
      dragId = null; dragCategory = null;
    };
    node.ondragover = (e) => {
      if (dragId && dragCategory === category && dragId !== item.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        node.classList.add('otdw-drop-target');
      }
    };
    node.ondragleave = () => node.classList.remove('otdw-drop-target');
    node.ondrop = (e) => {
      e.preventDefault();
      node.classList.remove('otdw-drop-target');
      if (dragId && dragCategory === category && dragId !== item.id) {
        reorder(dragId, item.id);
      }
    };

    parent.appendChild(node);

    if (hasChildren && expanded) {
      const childBox = el('div', 'otdw-children');
      for (const ch of item.children) renderNode(childBox, ch, depth + 1, category);
      parent.appendChild(childBox);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function findItem(id, arr = state.items) {
    for (const it of arr) {
      if (it.id === id) return it;
      if (it.children) {
        const r = findItem(id, it.children);
        if (r) return r;
      }
    }
    return null;
  }

  function removeItem(id, arr = state.items) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { arr.splice(i, 1); paint(); return true; }
      if (arr[i].children && removeItem(id, arr[i].children)) return true;
    }
    return false;
  }

  function reorder(srcId, targetId) {
    const src = findItem(srcId);
    const tgt = findItem(targetId);
    if (!src || !tgt || src.type !== tgt.type) return;
    // Only reorders within top-level same category
    const idxSrc = state.items.indexOf(src);
    const idxTgt = state.items.indexOf(tgt);
    if (idxSrc < 0 || idxTgt < 0) return;
    state.items.splice(idxSrc, 1);
    const newIdx = state.items.indexOf(tgt);
    state.items.splice(newIdx, 0, src);
    paint();
    if (opts.onReorder) opts.onReorder(srcId, targetId);
  }

  function openContextMenu(x, y, item) {
    closeAllMenus();
    const menu = el('div', 'otdw-ctxmenu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const addItem = (label, fn) => {
      const it = el('div', 'otdw-ctxmenu-item', label);
      it.onclick = (e) => { e.stopPropagation(); closeAllMenus(); fn(); };
      menu.appendChild(it);
    };

    addItem('Renombrar', () => {
      const next = prompt('Nuevo nombre', item.name || '');
      if (next != null && next.trim()) {
        item.name = next.trim();
        paint();
        if (opts.onRename) opts.onRename(item.id, item.name);
      }
    });
    addItem('Duplicar', () => {
      const copy = JSON.parse(JSON.stringify(item));
      copy.id = item.id + '_copy_' + Date.now();
      copy.name = (item.name || 'item') + ' (copia)';
      const idx = state.items.indexOf(item);
      if (idx >= 0) state.items.splice(idx + 1, 0, copy);
      else state.items.push(copy);
      paint();
      if (opts.onDuplicate) opts.onDuplicate(item.id, copy);
    });
    addItem('Eliminar', () => {
      removeItem(item.id);
      if (opts.onDelete) opts.onDelete(item.id);
    });

    menu.appendChild(el('div', 'otdw-ctxmenu-sep'));

    // Move to pane submenu
    const sub = el('div', 'otdw-ctxmenu-item otdw-submenu', 'Mover a otro pane');
    const subPanel = el('div', 'otdw-submenu-panel');
    for (const p of state.panes) {
      const opt = el('div', 'otdw-ctxmenu-item',
        `Pane ${p}` + (item.paneIndex === p ? ' ✓' : ''));
      opt.onclick = (e) => {
        e.stopPropagation();
        closeAllMenus();
        item.paneIndex = p;
        paint();
        if (opts.onMovePane) opts.onMovePane(item.id, p);
      };
      subPanel.appendChild(opt);
    }
    sub.appendChild(subPanel);
    menu.appendChild(sub);

    document.body.appendChild(menu);
    // clamp to viewport
    const r = menu.getBoundingClientRect();
    if (r.right > innerWidth) menu.style.left = (innerWidth - r.width - 4) + 'px';
    if (r.bottom > innerHeight) menu.style.top = (innerHeight - r.height - 4) + 'px';
  }

  function render(items) {
    state.items = Array.isArray(items) ? items.slice() : [];
    paint();
  }

  function refresh() { paint(); }

  function destroy() {
    document.removeEventListener('click', onDocClick);
    closeAllMenus();
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  paint();
  return { render, refresh, destroy };
}

// ==========================================================
//   2) DATA WINDOW
// ==========================================================
export function createDataWindow(container, opts = {}) {
  injectStyles();
  if (!container) throw new Error('createDataWindow: container required');

  const state = {
    ohlc: null,      // {time, open, high, low, close, volume, prevClose}
    indicators: [],  // [{id, name, color, value, digits?}]
  };

  const root = el('div', 'otdw-widget otdw-dw');
  const header = el('div', 'otdw-header');
  header.appendChild(el('span', null, 'Data Window'));
  root.appendChild(header);
  const body = el('div', 'otdw-body');
  root.appendChild(body);
  container.appendChild(root);

  function paint() {
    body.innerHTML = '';

    // ---- OHLC section ----
    const oTitle = el('div', 'otdw-dw-section-title', 'OHLC');
    body.appendChild(oTitle);
    const o = state.ohlc;
    if (!o) {
      body.appendChild(el('div', 'otdw-dw-empty', 'Hover the chart…'));
    } else {
      const grid = el('div', 'otdw-dw-ohlc');
      const pct = (o.prevClose != null && o.close != null && o.prevClose !== 0)
        ? ((o.close - o.prevClose) / o.prevClose) * 100 : null;
      const upDown = pct == null ? '' : (pct >= 0 ? ' otdw-up' : ' otdw-down');

      const rows = [
        ['O', fmtNum(o.open)],
        ['H', fmtNum(o.high)],
        ['L', fmtNum(o.low)],
        ['C', fmtNum(o.close)],
        ['Vol', o.volume != null ? fmtNum(o.volume, 0) : '—'],
        ['%chg', pct == null ? '—' : (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'],
      ];
      for (const [k, v] of rows) {
        grid.appendChild(el('div', 'otdw-dw-ohlc-k', k));
        const vEl = el('div', 'otdw-dw-ohlc-v' + (k === '%chg' ? upDown : ''), v);
        grid.appendChild(vEl);
      }
      body.appendChild(grid);
    }

    // ---- Indicators section ----
    const iTitle = el('div', 'otdw-dw-section-title', 'Indicators');
    body.appendChild(iTitle);
    if (!state.indicators.length) {
      body.appendChild(el('div', 'otdw-dw-empty', 'No active indicators'));
    } else {
      for (const ind of state.indicators) {
        const row = el('div', 'otdw-dw-row');
        const sw = el('span', 'otdw-dw-swatch');
        sw.style.background = ind.color || '#787b86';
        row.appendChild(sw);
        row.appendChild(el('span', 'otdw-dw-label', escapeText(ind.name || ind.id || '—')));
        const v = ind.value;
        const cls = v == null || Number.isNaN(v) ? ' otdw-na' : '';
        row.appendChild(el('span', 'otdw-dw-value' + cls, fmtNum(v, ind.digits)));
        body.appendChild(row);
      }
    }
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  /**
   * updateValues({ ohlc, indicators })
   *  ohlc: {time,open,high,low,close,volume,prevClose}
   *  indicators: [{id,name,color,value,digits}]
   * Either field is optional; missing fields keep previous state.
   */
  function updateValues(values) {
    if (!values) return;
    if (values.ohlc !== undefined) state.ohlc = values.ohlc;
    if (values.indicators !== undefined) state.indicators = values.indicators.slice();
    paint();
  }

  function render() { paint(); }

  function destroy() {
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  paint();
  return { render, updateValues, destroy };
}

export default { createObjectTree, createDataWindow };
