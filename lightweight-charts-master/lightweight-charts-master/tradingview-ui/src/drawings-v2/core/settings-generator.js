// drawings-v2/core/settings-generator.js
// Auto-generates the per-drawing Settings modal from a declarative `schema`.
//
// Public API:
//   buildSettingsDialog(drawing, schema, opts) -> { root, close(), refresh() }
//
// schema = {
//   estilo:    [...fields],
//   especifico:[...fields],
//   coord:     'auto' | [...fields],
// }
//
// field types: color | slider | select | toggle | text | number | levels | group
//
// All changes are LIVE: each input mutates `drawing.options[key]`, sets
// `drawing._dirty = true`, calls `opts.onChange(key, value, drawing)`.

const SWATCH_PALETTE = [
    '#2962FF', '#FF6B6B', '#26A69A', '#FFC107',
    '#AB47BC', '#EF5350', '#42A5F5', '#FFFFFF',
];

let _activeDialog = null;

/**
 * Build & mount the settings dialog. Returns a handle with .close() / .refresh().
 */
export function buildSettingsDialog(drawing, schema, opts = {}) {
    if (_activeDialog) {
        try { _activeDialog.close(); } catch (e) { /* ignore */ }
        _activeDialog = null;
    }

    const container = opts.container || document.body;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    const onClose = typeof opts.onClose === 'function' ? opts.onClose : () => {};

    const root = document.createElement('div');
    root.className = 'dmgr-v2-settings';
    root.style.cssText = [
        'position:fixed', 'z-index:10050',
        'min-width:320px', 'max-width:420px',
        'background:rgba(20,22,28,0.92)',
        'backdrop-filter:blur(14px) saturate(140%)',
        '-webkit-backdrop-filter:blur(14px) saturate(140%)',
        'border:1px solid rgba(255,255,255,0.08)',
        'border-radius:10px',
        'box-shadow:0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
        'color:#e6e6e6',
        'font:13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'padding:0', 'opacity:0',
        'transform:translateY(-6px) scale(0.98)',
        'transition:opacity 180ms cubic-bezier(.2,.8,.2,1), transform 180ms cubic-bezier(.2,.8,.2,1)',
        'overflow:hidden',
    ].join(';');

    // Anchor positioning
    const ax = Number.isFinite(opts.anchorX) ? opts.anchorX : window.innerWidth / 2 - 160;
    const ay = Number.isFinite(opts.anchorY) ? opts.anchorY : window.innerHeight / 2 - 200;
    root.style.left = `${Math.max(8, Math.min(ax, window.innerWidth - 340))}px`;
    root.style.top = `${Math.max(8, Math.min(ay, window.innerHeight - 420))}px`;

    // ---------- Header ----------
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06)';
    const title = document.createElement('div');
    title.textContent = (drawing && drawing.spec && drawing.spec.label) || (drawing && drawing.type) || 'Drawing settings';
    title.style.cssText = 'font-weight:600;font-size:13px;color:#fff';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'background:transparent;border:0;color:#aaa;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#aaa'; });
    header.appendChild(title);
    header.appendChild(closeBtn);
    root.appendChild(header);

    // ---------- Tabs ----------
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0;padding:0 8px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)';
    const tabs = [
        { key: 'estilo', label: 'Estilo' },
        { key: 'especifico', label: 'Específico' },
        { key: 'coord', label: 'Coord.' },
    ];
    const bodies = {};
    const tabButtons = {};

    tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = t.label;
        btn.dataset.tab = t.key;
        btn.style.cssText = 'flex:0 0 auto;background:transparent;border:0;color:#aaa;padding:9px 14px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;transition:color 120ms,border-color 120ms';
        btn.addEventListener('click', () => setActive(t.key));
        tabBar.appendChild(btn);
        tabButtons[t.key] = btn;
    });
    root.appendChild(tabBar);

    const body = document.createElement('div');
    body.style.cssText = 'max-height:min(70vh,520px);overflow-y:auto;padding:14px 16px';
    root.appendChild(body);

    function setActive(key) {
        Object.keys(bodies).forEach(k => { bodies[k].style.display = (k === key) ? 'block' : 'none'; });
        Object.keys(tabButtons).forEach(k => {
            const b = tabButtons[k];
            const active = (k === key);
            b.style.color = active ? '#fff' : '#aaa';
            b.style.borderBottomColor = active ? '#2962FF' : 'transparent';
        });
    }

    // Build per-tab content
    ['estilo', 'especifico', 'coord'].forEach(tabKey => {
        const wrap = document.createElement('div');
        wrap.style.display = 'none';
        let fields = schema && schema[tabKey];
        if (tabKey === 'coord' && fields === 'auto') {
            renderCoordAuto(wrap, drawing, onChange);
        } else if (Array.isArray(fields) && fields.length) {
            fields.forEach(f => renderField(wrap, f, drawing, onChange));
        } else {
            const empty = document.createElement('div');
            empty.textContent = '— Sin opciones —';
            empty.style.cssText = 'color:#666;font-size:12px;padding:20px;text-align:center';
            wrap.appendChild(empty);
        }
        body.appendChild(wrap);
        bodies[tabKey] = wrap;
    });

    // First non-empty tab active
    const firstKey = (schema && Array.isArray(schema.estilo) && schema.estilo.length) ? 'estilo'
        : (schema && Array.isArray(schema.especifico) && schema.especifico.length) ? 'especifico'
        : 'coord';
    setActive(firstKey);

    container.appendChild(root);

    // Animate in
    requestAnimationFrame(() => {
        root.style.opacity = '1';
        root.style.transform = 'translateY(0) scale(1)';
    });

    // ---------- Close handling ----------
    let closed = false;
    function close() {
        if (closed) return;
        closed = true;
        root.style.opacity = '0';
        root.style.transform = 'translateY(-6px) scale(0.98)';
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('mousedown', onDocDown, true);
        setTimeout(() => {
            if (root.parentNode) root.parentNode.removeChild(root);
        }, 180);
        if (_activeDialog && _activeDialog.root === root) _activeDialog = null;
        try { onClose(); } catch (e) { /* ignore */ }
    }
    closeBtn.addEventListener('click', close);

    function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        if (e.key === 'Tab') {
            // basic focus trap
            const focusables = root.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0]; const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
            else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
        }
    }
    function onDocDown(e) {
        if (!root.contains(e.target)) close();
    }
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => document.addEventListener('mousedown', onDocDown, true), 0);

    function refresh() {
        // re-render coord tab in particular (point list changes after drag)
        const coordWrap = bodies.coord;
        if (coordWrap && schema && schema.coord === 'auto') {
            coordWrap.innerHTML = '';
            renderCoordAuto(coordWrap, drawing, onChange);
        }
    }

    const handle = { root, close, refresh };
    _activeDialog = handle;
    return handle;
}

// ----------------------------------------------------------------------------
// Field renderers
// ----------------------------------------------------------------------------

function rowWrap(label) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px';
    const lbl = document.createElement('label');
    lbl.textContent = label || '';
    lbl.style.cssText = 'flex:1;color:#bbb;font-size:12px;user-select:none';
    row.appendChild(lbl);
    return { row, lbl };
}

function ensureOptions(drawing) {
    if (!drawing.options) drawing.options = {};
    return drawing.options;
}

function commitChange(drawing, key, value, onChange) {
    ensureOptions(drawing)[key] = value;
    drawing._dirty = true;
    if (typeof drawing.version === 'number') drawing.version++;
    try { onChange(key, value, drawing); } catch (e) { console.warn('[settings] onChange threw', e); }
}

function renderField(host, field, drawing, onChange) {
    if (!field || !field.type) return;
    switch (field.type) {
        case 'color':   return host.appendChild(renderColor(field, drawing, onChange));
        case 'slider':  return host.appendChild(renderSlider(field, drawing, onChange));
        case 'select':  return host.appendChild(renderSelect(field, drawing, onChange));
        case 'toggle':  return host.appendChild(renderToggle(field, drawing, onChange));
        case 'text':    return host.appendChild(renderText(field, drawing, onChange));
        case 'number':  return host.appendChild(renderNumber(field, drawing, onChange));
        case 'levels':  return host.appendChild(renderLevels(field, drawing, onChange));
        case 'group':   return host.appendChild(renderGroup(field, drawing, onChange));
        default:        return; // unknown type, ignore
    }
}

function renderColor(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const current = (drawing.options && drawing.options[field.key]) || '#2962FF';
    const ctl = document.createElement('div');
    ctl.style.cssText = 'display:flex;align-items:center;gap:6px;position:relative';

    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.style.cssText = `width:22px;height:22px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);background:${current};cursor:pointer;padding:0`;
    const hex = document.createElement('input');
    hex.type = 'text'; hex.value = current; hex.spellcheck = false;
    hex.style.cssText = 'width:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:4px 6px;font-size:12px;font-family:monospace';

    function update(v) {
        swatch.style.background = v;
        hex.value = v;
        commitChange(drawing, field.key, v, onChange);
    }

    let pop = null;
    swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pop) { pop.remove(); pop = null; return; }
        pop = document.createElement('div');
        pop.style.cssText = 'position:absolute;top:26px;right:0;display:grid;grid-template-columns:repeat(4,22px);gap:4px;padding:6px;background:rgba(30,32,40,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:6px;z-index:10';
        SWATCH_PALETTE.forEach(col => {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.style.cssText = `width:22px;height:22px;border-radius:3px;border:1px solid rgba(255,255,255,0.1);background:${col};cursor:pointer;padding:0`;
            sw.addEventListener('click', (ev) => { ev.stopPropagation(); update(col); pop.remove(); pop = null; });
            pop.appendChild(sw);
        });
        ctl.appendChild(pop);
        const offDoc = (ev) => { if (pop && !pop.contains(ev.target) && ev.target !== swatch) { pop.remove(); pop = null; document.removeEventListener('mousedown', offDoc, true); } };
        setTimeout(() => document.addEventListener('mousedown', offDoc, true), 0);
    });
    hex.addEventListener('change', () => {
        const v = hex.value.trim();
        if (/^#?[0-9a-fA-F]{3,8}$/.test(v)) update(v.startsWith('#') ? v : '#' + v);
        else hex.value = drawing.options[field.key];
    });

    ctl.appendChild(swatch); ctl.appendChild(hex);
    row.appendChild(ctl);
    return row;
}

function renderSlider(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const min = Number.isFinite(field.min) ? field.min : 0;
    const max = Number.isFinite(field.max) ? field.max : 100;
    const step = Number.isFinite(field.step) ? field.step : 1;
    const current = Number((drawing.options && drawing.options[field.key]) ?? min);

    const ctl = document.createElement('div');
    ctl.style.cssText = 'display:flex;align-items:center;gap:8px';
    const range = document.createElement('input');
    range.type = 'range'; range.min = min; range.max = max; range.step = step; range.value = current;
    range.style.cssText = 'width:140px;accent-color:#2962FF';
    const num = document.createElement('input');
    num.type = 'number'; num.min = min; num.max = max; num.step = step; num.value = current;
    num.style.cssText = 'width:54px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:3px 5px;font-size:12px;text-align:right';

    range.addEventListener('input', () => { num.value = range.value; commitChange(drawing, field.key, Number(range.value), onChange); });
    num.addEventListener('change', () => {
        let v = Number(num.value); if (!Number.isFinite(v)) v = min;
        v = Math.max(min, Math.min(max, v)); num.value = v; range.value = v;
        commitChange(drawing, field.key, v, onChange);
    });

    ctl.appendChild(range); ctl.appendChild(num);
    row.appendChild(ctl);
    return row;
}

function renderSelect(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const current = (drawing.options && drawing.options[field.key]);
    const sel = document.createElement('select');
    sel.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:4px 6px;font-size:12px;min-width:120px';
    (field.options || []).forEach(o => {
        const op = document.createElement('option');
        op.value = String(o.value); op.textContent = o.label;
        if (String(o.value) === String(current)) op.selected = true;
        sel.appendChild(op);
    });
    sel.addEventListener('change', () => {
        // try to coerce numeric strings back to numbers if original was numeric
        const raw = sel.value;
        const opt = (field.options || []).find(o => String(o.value) === raw);
        const v = opt ? opt.value : raw;
        commitChange(drawing, field.key, v, onChange);
    });
    row.appendChild(sel);
    return row;
}

function renderToggle(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const current = !!(drawing.options && drawing.options[field.key]);
    const wrap = document.createElement('label');
    wrap.style.cssText = 'position:relative;display:inline-block;width:34px;height:18px;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = current;
    cb.style.cssText = 'opacity:0;width:0;height:0';
    const track = document.createElement('span');
    track.style.cssText = `position:absolute;inset:0;background:${current ? '#2962FF' : 'rgba(255,255,255,0.15)'};border-radius:18px;transition:background 120ms`;
    const knob = document.createElement('span');
    knob.style.cssText = `position:absolute;top:2px;left:${current ? '18px' : '2px'};width:14px;height:14px;border-radius:50%;background:#fff;transition:left 120ms`;
    track.appendChild(knob);
    wrap.appendChild(cb); wrap.appendChild(track);
    cb.addEventListener('change', () => {
        track.style.background = cb.checked ? '#2962FF' : 'rgba(255,255,255,0.15)';
        knob.style.left = cb.checked ? '18px' : '2px';
        commitChange(drawing, field.key, cb.checked, onChange);
    });
    row.appendChild(wrap);
    return row;
}

function renderText(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const current = (drawing.options && drawing.options[field.key]) ?? '';
    let input;
    if (field.multiline) {
        input = document.createElement('textarea');
        input.rows = 3;
        input.style.cssText = 'flex:1;min-width:180px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:5px 7px;font-size:12px;resize:vertical;font-family:inherit';
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = 'flex:1;min-width:140px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:4px 6px;font-size:12px';
    }
    input.value = String(current);
    input.addEventListener('input', () => commitChange(drawing, field.key, input.value, onChange));
    row.appendChild(input);
    return row;
}

function renderNumber(field, drawing, onChange) {
    const { row } = rowWrap(field.label);
    const current = (drawing.options && drawing.options[field.key]) ?? 0;
    const input = document.createElement('input');
    input.type = 'number';
    if (Number.isFinite(field.min)) input.min = field.min;
    if (Number.isFinite(field.max)) input.max = field.max;
    if (Number.isFinite(field.step)) input.step = field.step;
    input.value = current;
    input.style.cssText = 'width:90px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:4px;padding:4px 6px;font-size:12px;text-align:right';
    input.addEventListener('change', () => {
        let v = Number(input.value);
        if (!Number.isFinite(v)) v = 0;
        if (Number.isFinite(field.min) && v < field.min) v = field.min;
        if (Number.isFinite(field.max) && v > field.max) v = field.max;
        input.value = v;
        commitChange(drawing, field.key, v, onChange);
    });
    row.appendChild(input);
    return row;
}

function renderLevels(field, drawing, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:10px';
    const head = document.createElement('div');
    head.textContent = field.label || 'Niveles';
    head.style.cssText = 'color:#bbb;font-size:12px;margin-bottom:6px';
    wrap.appendChild(head);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:5px;max-height:180px;overflow-y:auto;padding-right:4px';
    wrap.appendChild(list);

    const levels = (drawing.options && Array.isArray(drawing.options[field.key]))
        ? drawing.options[field.key].slice()
        : [];

    function commitLevels() {
        commitChange(drawing, field.key, levels.slice(), onChange);
    }

    function rebuild() {
        list.innerHTML = '';
        levels.forEach((lvl, idx) => {
            const r = document.createElement('div');
            r.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);padding:4px 6px;border-radius:4px';
            const tog = document.createElement('input');
            tog.type = 'checkbox'; tog.checked = lvl.visible !== false;
            tog.title = 'Visible';
            tog.addEventListener('change', () => { lvl.visible = tog.checked; commitLevels(); });

            const val = document.createElement('input');
            val.type = 'number'; val.step = 'any'; val.value = Number(lvl.value) || 0;
            val.style.cssText = 'width:60px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:3px;padding:2px 4px;font-size:11px;text-align:right';
            val.addEventListener('change', () => { lvl.value = Number(val.value) || 0; commitLevels(); });

            const col = document.createElement('input');
            col.type = 'color'; col.value = lvl.color || '#2962FF';
            col.style.cssText = 'width:22px;height:22px;border:0;padding:0;background:transparent;cursor:pointer';
            col.addEventListener('input', () => { lvl.color = col.value; commitLevels(); });

            const lbl = document.createElement('input');
            lbl.type = 'text'; lbl.value = lvl.label || '';
            lbl.placeholder = 'Label';
            lbl.style.cssText = 'flex:1;min-width:40px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:3px;padding:2px 4px;font-size:11px';
            lbl.addEventListener('input', () => { lvl.label = lbl.value; commitLevels(); });

            const rm = document.createElement('button');
            rm.type = 'button'; rm.textContent = '✖';
            rm.style.cssText = 'background:transparent;border:0;color:#888;cursor:pointer;font-size:11px;padding:0 4px';
            rm.addEventListener('click', () => { levels.splice(idx, 1); commitLevels(); rebuild(); });

            r.appendChild(tog); r.appendChild(val); r.appendChild(col); r.appendChild(lbl); r.appendChild(rm);
            list.appendChild(r);
        });
    }
    rebuild();

    const add = document.createElement('button');
    add.type = 'button'; add.textContent = '+ Añadir nivel';
    add.style.cssText = 'margin-top:6px;background:rgba(41,98,255,0.15);border:1px solid rgba(41,98,255,0.4);color:#7aa6ff;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer';
    add.addEventListener('click', () => {
        levels.push({ value: 0, color: '#2962FF', label: '', visible: true });
        commitLevels(); rebuild();
    });
    wrap.appendChild(add);

    return wrap;
}

function renderGroup(field, drawing, onChange) {
    const wrap = document.createElement('fieldset');
    wrap.style.cssText = 'border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px 4px;margin:4px 0 12px';
    const lg = document.createElement('legend');
    lg.textContent = field.label || '';
    lg.style.cssText = 'color:#aaa;font-size:11px;padding:0 6px;text-transform:uppercase;letter-spacing:0.04em';
    wrap.appendChild(lg);
    (field.fields || []).forEach(f => renderField(wrap, f, drawing, onChange));
    return wrap;
}

// ----------------------------------------------------------------------------
// Coord tab — auto: one editable row per anchor point
// ----------------------------------------------------------------------------

function renderCoordAuto(host, drawing, onChange) {
    const points = Array.isArray(drawing.points) ? drawing.points : [];
    if (!points.length) {
        const empty = document.createElement('div');
        empty.textContent = '— Sin puntos —';
        empty.style.cssText = 'color:#666;font-size:12px;padding:20px;text-align:center';
        host.appendChild(empty);
        return;
    }
    const intro = document.createElement('div');
    intro.textContent = 'Edita los anclajes (time / price):';
    intro.style.cssText = 'color:#888;font-size:11px;margin-bottom:8px';
    host.appendChild(intro);

    points.forEach((p, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;background:rgba(255,255,255,0.03);padding:5px 8px;border-radius:4px';

        const tag = document.createElement('div');
        tag.textContent = `P${idx + 1}`;
        tag.style.cssText = 'color:#aaa;font-size:11px;font-weight:600;width:24px';
        row.appendChild(tag);

        const tLbl = document.createElement('span'); tLbl.textContent = 't:'; tLbl.style.cssText = 'color:#777;font-size:11px';
        const tInp = document.createElement('input');
        tInp.type = 'number'; tInp.value = p.time ?? 0;
        tInp.style.cssText = 'width:110px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:3px;padding:3px 5px;font-size:11px;font-family:monospace';
        tInp.addEventListener('change', () => {
            const v = Number(tInp.value);
            if (Number.isFinite(v)) {
                p.time = v;
                drawing._dirty = true;
                if (typeof drawing.version === 'number') drawing.version++;
                try { onChange('point', { idx, point: p }, drawing); } catch (e) {}
            }
        });

        const pLbl = document.createElement('span'); pLbl.textContent = 'p:'; pLbl.style.cssText = 'color:#777;font-size:11px;margin-left:4px';
        const pInp = document.createElement('input');
        pInp.type = 'number'; pInp.step = 'any'; pInp.value = p.price ?? 0;
        pInp.style.cssText = 'width:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;border-radius:3px;padding:3px 5px;font-size:11px;font-family:monospace;text-align:right';
        pInp.addEventListener('change', () => {
            const v = Number(pInp.value);
            if (Number.isFinite(v)) {
                p.price = v;
                drawing._dirty = true;
                if (typeof drawing.version === 'number') drawing.version++;
                try { onChange('point', { idx, point: p }, drawing); } catch (e) {}
            }
        });

        row.appendChild(tLbl); row.appendChild(tInp);
        row.appendChild(pLbl); row.appendChild(pInp);
        host.appendChild(row);
    });
}

export default buildSettingsDialog;
