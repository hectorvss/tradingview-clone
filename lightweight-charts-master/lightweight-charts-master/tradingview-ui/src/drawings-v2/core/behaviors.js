// drawings-v2/core/behaviors.js
// Composable behavior mixins for v2 drawings.
//
// A "behavior" is a function (drawingInstance, manager) => void that
// augments an existing drawing with capabilities such as drag, snap,
// lock, etc. Each behavior pushes a cleanup function onto
// drawing._behaviorCleanups so that the drawing can later be torn down
// without leaking listeners.
//
// Behaviors expect a minimal duck-typed drawing API:
//   drawing.anchors           : [{x,y,price?,time?}]      // mutable points
//   drawing.node              : SVGGElement              // root group
//   drawing.handles?          : [SVGElement]             // optional handles
//   drawing.locked?           : boolean
//   drawing.selected?         : boolean
//   drawing.hovered?          : boolean
//   drawing.options           : object                   // visual opts
//   drawing.invalidate()      : queue a redraw
//   drawing.redraw()          : immediate redraw
//   drawing.toJSON()/fromJSON(): for persistence
//
// And a manager (chart-side) with:
//   manager.snap(point) -> point        // OHLC magnet
//   manager.toChartCoords(evt) -> {x,y}
//   manager.requestRedraw(drawing)
//   manager.persist()
//   manager.openContextMenu(drawing, x, y)
//   manager.duplicate(drawing)
//   manager.remove(drawing)
//   manager.beginEditText(drawing)

// ---------------------------------------------------------------------------
// Shared visual CSS (selection glow, hover outline, cursors, hint banner)
// Injected once on first import so the manager and specs get consistent looks.
// ---------------------------------------------------------------------------

let _cssInjected = false;
export function ensureDrawingCss() {
    if (_cssInjected || typeof document === 'undefined') return;
    _cssInjected = true;
    const s = document.createElement('style');
    s.setAttribute('data-d2-core-css', '1');
    s.textContent = `
.dmgr-v2-drawing[data-selected="1"] {
  filter: drop-shadow(0 0 4px #2962ff) drop-shadow(0 0 1.5px #2962ff);
}
.dmgr-v2-drawing[data-hovered="1"]:not([data-selected="1"]) {
  filter: drop-shadow(0 0 1.5px rgba(255,255,255,0.55));
  cursor: pointer;
}
.dmgr-v2-drawing[data-selected="1"] { cursor: move; }
.dmgr-v2-handles circle { cursor: grab; transition: r 80ms ease-out, fill 80ms ease-out; }
.dmgr-v2-handles circle:hover { r: 6.5; }
.dmgr-v2-handles.is-dragging circle[data-active="1"] { cursor: grabbing; fill: #2962ff; }
.dmgr-v2-tool-active { cursor: crosshair !important; }
.d2-hint-banner {
  position: absolute; top: 12px; left: 50%; transform: translate(-50%, -8px);
  z-index: 11000; pointer-events: none;
  background: rgba(20,22,28,0.78); color: #e6e6e6;
  backdrop-filter: blur(10px) saturate(160%);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 6px 12px;
  font: 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  display: flex; align-items: center; gap: 8px;
  opacity: 0; animation: d2HintIn 200ms ease-out forwards;
}
.d2-hint-banner .d2-hint-cursor {
  width: 14px; height: 14px; display: inline-block; flex: 0 0 14px;
  background:
    linear-gradient(#2962ff,#2962ff) center/2px 14px no-repeat,
    linear-gradient(#2962ff,#2962ff) center/14px 2px no-repeat;
  opacity: 0.9;
}
.d2-hint-banner .d2-hint-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: rgba(41,98,255,0.25);
  color: #8fb3ff; font-weight: 600;
  transition: transform 120ms ease-out, background 120ms ease-out;
}
.d2-hint-banner .d2-hint-count.is-bump {
  transform: scale(1.25); background: rgba(41,98,255,0.45);
}
.d2-hint-banner kbd {
  font-family: SF Mono, Menlo, Consolas, monospace; font-size: 10px;
  background: rgba(255,255,255,0.08); color: #c0c4cc;
  padding: 1px 5px; border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.1);
}
@keyframes d2HintIn {
  from { opacity: 0; transform: translate(-50%, -16px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes d2HintOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to   { opacity: 0; transform: translate(-50%, -16px); }
}
.dmgr-v2-ghost { opacity: 0.3; pointer-events: none; }
.dmgr-v2-context-menu {
  position: fixed; z-index: 11050; min-width: 200px;
  background: rgba(20,22,28,0.94);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.55);
  color: #e6e6e6; padding: 4px;
  font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.dmgr-v2-context-menu .item {
  padding: 7px 12px; border-radius: 5px; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
}
.dmgr-v2-context-menu .item:hover { background: rgba(41,98,255,0.18); }
.dmgr-v2-context-menu .sep {
  height: 1px; background: rgba(255,255,255,0.07); margin: 4px 2px;
}
`;
    document.head.appendChild(s);
}
// inject eagerly so it's ready when manager mounts
ensureDrawingCss();

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function pushCleanup(drawing, fn) {
    if (!drawing._behaviorCleanups) drawing._behaviorCleanups = [];
    drawing._behaviorCleanups.push(fn);
}

function on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    return () => target.removeEventListener(type, handler, opts);
}

function wrapMethod(obj, name, wrapper) {
    const orig = typeof obj[name] === 'function' ? obj[name].bind(obj) : null;
    obj[name] = function (...args) { return wrapper.call(this, orig, ...args); };
    return () => { obj[name] = orig; };
}

function eventPoint(evt, manager) {
    if (manager && typeof manager.toChartCoords === 'function') {
        return manager.toChartCoords(evt);
    }
    const t = evt.touches ? evt.touches[0] : evt;
    return { x: t.clientX, y: t.clientY };
}

// ---------------------------------------------------------------------------
// Behavior: selectable
// ---------------------------------------------------------------------------

function behaviorSelectable(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    const off1 = on(node, 'mouseenter', () => {
        if (drawing.locked) return;
        drawing.hovered = true;
        node.classList.add('d2-hovered');
        drawing.invalidate && drawing.invalidate();
    });
    const off2 = on(node, 'mouseleave', () => {
        drawing.hovered = false;
        node.classList.remove('d2-hovered');
        drawing.invalidate && drawing.invalidate();
    });
    const off3 = on(node, 'mousedown', (evt) => {
        if (evt.button !== 0) return;
        drawing.selected = true;
        node.classList.add('d2-selected');
        if (manager && manager.select) manager.select(drawing);
        drawing.invalidate && drawing.invalidate();
    });
    pushCleanup(drawing, off1);
    pushCleanup(drawing, off2);
    pushCleanup(drawing, off3);
}

// ---------------------------------------------------------------------------
// Behavior: draggable (body drag)
// ---------------------------------------------------------------------------

function behaviorDraggable(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    let dragging = false;
    let start = null;
    let originAnchors = null;

    const onDown = (evt) => {
        if (drawing.locked) return;
        if (evt.target.closest('.d2-handle, .d2-handle-hit')) return;
        if (evt.button !== undefined && evt.button !== 0) return;
        dragging = true;
        start = eventPoint(evt, manager);
        originAnchors = drawing.anchors.map(a => ({ ...a }));
        evt.preventDefault();
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    };
    const onMove = (evt) => {
        if (!dragging) return;
        const p = eventPoint(evt, manager);
        const dx = p.x - start.x;
        const dy = p.y - start.y;
        for (let i = 0; i < drawing.anchors.length; i++) {
            drawing.anchors[i].x = originAnchors[i].x + dx;
            drawing.anchors[i].y = originAnchors[i].y + dy;
        }
        drawing.invalidate && drawing.invalidate();
        evt.preventDefault();
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        if (manager && manager.persist) manager.persist();
    };

    pushCleanup(drawing, on(node, 'mousedown', onDown));
    pushCleanup(drawing, on(node, 'touchstart', onDown, { passive: false }));
}

// ---------------------------------------------------------------------------
// Behavior: handle-draggable (per-anchor drag)
// ---------------------------------------------------------------------------

function behaviorHandleDraggable(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    let activeIdx = -1;

    const onDown = (evt) => {
        if (drawing.locked) return;
        const hit = evt.target.closest('[data-anchor]');
        if (!hit || !node.contains(hit)) return;
        activeIdx = parseInt(hit.getAttribute('data-anchor'), 10);
        if (isNaN(activeIdx)) return;
        evt.preventDefault();
        evt.stopPropagation();
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    };
    const onMove = (evt) => {
        if (activeIdx < 0) return;
        let p = eventPoint(evt, manager);
        if (drawing._snap && manager && manager.snap) p = manager.snap(p) || p;
        drawing.anchors[activeIdx].x = p.x;
        drawing.anchors[activeIdx].y = p.y;
        drawing.invalidate && drawing.invalidate();
        evt.preventDefault();
    };
    const onUp = () => {
        if (activeIdx < 0) return;
        activeIdx = -1;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        if (manager && manager.persist) manager.persist();
    };

    pushCleanup(drawing, on(node, 'mousedown', onDown, true));
    pushCleanup(drawing, on(node, 'touchstart', onDown, { passive: false, capture: true }));
}

// ---------------------------------------------------------------------------
// Behavior: snappable
// ---------------------------------------------------------------------------

function behaviorSnappable(drawing /*, manager*/) {
    drawing._snap = drawing._snap !== false;
    drawing.setSnap = function (on) { drawing._snap = !!on; };
    pushCleanup(drawing, () => { delete drawing._snap; delete drawing.setSnap; });
}

// ---------------------------------------------------------------------------
// Behavior: lockable
// ---------------------------------------------------------------------------

function behaviorLockable(drawing, manager) {
    drawing.locked = !!drawing.locked;
    drawing.toggleLock = function () {
        drawing.locked = !drawing.locked;
        if (drawing.node) drawing.node.classList.toggle('d2-locked', drawing.locked);
        drawing.invalidate && drawing.invalidate();
        if (manager && manager.persist) manager.persist();
    };
    drawing.setLocked = function (v) {
        drawing.locked = !!v;
        if (drawing.node) drawing.node.classList.toggle('d2-locked', drawing.locked);
        drawing.invalidate && drawing.invalidate();
    };
    if (drawing.node) drawing.node.classList.toggle('d2-locked', drawing.locked);
    pushCleanup(drawing, () => {
        delete drawing.toggleLock;
        delete drawing.setLocked;
    });
}

// ---------------------------------------------------------------------------
// Behavior: duplicatable
// ---------------------------------------------------------------------------

function behaviorDuplicatable(drawing, manager) {
    drawing.duplicate = function (offset = { x: 20, y: 20 }) {
        if (manager && manager.duplicate) return manager.duplicate(drawing, offset);
        const json = drawing.toJSON ? drawing.toJSON() : null;
        if (!json) return null;
        if (Array.isArray(json.anchors)) {
            json.anchors = json.anchors.map(a => ({
                ...a,
                x: (a.x || 0) + offset.x,
                y: (a.y || 0) + offset.y,
            }));
        }
        return json;
    };
    pushCleanup(drawing, () => { delete drawing.duplicate; });
}

// ---------------------------------------------------------------------------
// Behavior: extendable
// ---------------------------------------------------------------------------

function behaviorExtendable(drawing /*, manager*/) {
    drawing.options = drawing.options || {};
    if (drawing.options.extendLeft === undefined) drawing.options.extendLeft = false;
    if (drawing.options.extendRight === undefined) drawing.options.extendRight = false;
    drawing.setExtend = function (side, on) {
        if (side === 'left') drawing.options.extendLeft = !!on;
        else if (side === 'right') drawing.options.extendRight = !!on;
        else if (side === 'both') {
            drawing.options.extendLeft = !!on;
            drawing.options.extendRight = !!on;
        }
        drawing.invalidate && drawing.invalidate();
    };
    pushCleanup(drawing, () => { delete drawing.setExtend; });
}

// ---------------------------------------------------------------------------
// Behavior: labelable
// ---------------------------------------------------------------------------

function behaviorLabelable(drawing /*, manager*/) {
    drawing.options = drawing.options || {};
    if (drawing.options.showLabels === undefined) drawing.options.showLabels = true;
    drawing.toggleLabels = function (on) {
        drawing.options.showLabels = on === undefined ? !drawing.options.showLabels : !!on;
        drawing.invalidate && drawing.invalidate();
    };
    pushCleanup(drawing, () => { delete drawing.toggleLabels; });
}

// ---------------------------------------------------------------------------
// Behavior: persistent
// ---------------------------------------------------------------------------

function behaviorPersistent(drawing, manager) {
    if (!drawing.toJSON) {
        drawing.toJSON = function () {
            return {
                type: drawing.type || 'unknown',
                anchors: drawing.anchors ? drawing.anchors.map(a => ({ ...a })) : [],
                options: drawing.options ? { ...drawing.options } : {},
                locked: !!drawing.locked,
            };
        };
    }
    if (!drawing.fromJSON) {
        drawing.fromJSON = function (json) {
            if (!json) return;
            if (Array.isArray(json.anchors)) drawing.anchors = json.anchors.map(a => ({ ...a }));
            if (json.options) drawing.options = { ...drawing.options, ...json.options };
            if (typeof json.locked === 'boolean') drawing.locked = json.locked;
            drawing.invalidate && drawing.invalidate();
        };
    }
    const restoreInvalidate = wrapMethod(drawing, 'invalidate', function (orig) {
        if (orig) orig();
        if (manager && manager.persist) manager.persistDebounced ? manager.persistDebounced() : manager.persist();
    });
    pushCleanup(drawing, restoreInvalidate);
}

// ---------------------------------------------------------------------------
// Behavior: contextMenuable
// ---------------------------------------------------------------------------

function behaviorContextMenuable(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    const handler = (evt) => {
        evt.preventDefault();
        if (manager && manager.openContextMenu) {
            manager.openContextMenu(drawing, evt.clientX, evt.clientY);
        }
    };
    pushCleanup(drawing, on(node, 'contextmenu', handler));
}

// ---------------------------------------------------------------------------
// Behavior: editableText
// ---------------------------------------------------------------------------

function behaviorEditableText(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    const handler = (evt) => {
        if (drawing.locked) return;
        evt.preventDefault();
        evt.stopPropagation();
        if (manager && manager.beginEditText) {
            manager.beginEditText(drawing);
            return;
        }
        // fallback inline prompt
        const next = window.prompt('Edit text:', drawing.options && drawing.options.text || '');
        if (next !== null) {
            drawing.options = drawing.options || {};
            drawing.options.text = next;
            drawing.invalidate && drawing.invalidate();
        }
    };
    pushCleanup(drawing, on(node, 'dblclick', handler));
}

// ---------------------------------------------------------------------------
// Behavior: cropToMainPane
// ---------------------------------------------------------------------------

function behaviorCropToMainPane(drawing, manager) {
    const node = drawing.node;
    if (!node) return;
    const clipId = (manager && manager.mainPaneClipId) || 'd2-main-pane-clip';
    const prev = node.getAttribute('clip-path');
    node.setAttribute('clip-path', `url(#${clipId})`);
    pushCleanup(drawing, () => {
        if (prev) node.setAttribute('clip-path', prev);
        else node.removeAttribute('clip-path');
    });
}

// ---------------------------------------------------------------------------
// Registry / public API
// ---------------------------------------------------------------------------

export const BEHAVIORS = {
    'selectable': behaviorSelectable,
    'draggable': behaviorDraggable,
    'handle-draggable': behaviorHandleDraggable,
    'snappable': behaviorSnappable,
    'lockable': behaviorLockable,
    'duplicatable': behaviorDuplicatable,
    'extendable': behaviorExtendable,
    'labelable': behaviorLabelable,
    'persistent': behaviorPersistent,
    'contextMenuable': behaviorContextMenuable,
    'editableText': behaviorEditableText,
    'cropToMainPane': behaviorCropToMainPane,
};

export function applyBehaviors(drawing, behaviorList, manager) {
    if (!drawing || !Array.isArray(behaviorList)) return drawing;
    drawing._behaviors = drawing._behaviors || [];
    for (const name of behaviorList) {
        const fn = BEHAVIORS[name];
        if (!fn) {
            console.warn('[drawings-v2] unknown behavior:', name);
            continue;
        }
        if (drawing._behaviors.indexOf(name) !== -1) continue;
        fn(drawing, manager);
        drawing._behaviors.push(name);
    }
    return drawing;
}

export function cleanupBehaviors(drawing) {
    if (!drawing || !drawing._behaviorCleanups) return;
    for (const fn of drawing._behaviorCleanups) {
        try { fn(); } catch (e) { console.warn('[drawings-v2] cleanup error:', e); }
    }
    drawing._behaviorCleanups = [];
    drawing._behaviors = [];
}

export function compose(BaseClass, ...behaviorNames) {
    return class extends BaseClass {
        constructor(...args) {
            super(...args);
            // manager is expected on `this.manager` if any
            applyBehaviors(this, behaviorNames, this.manager || null);
        }
        destroy() {
            cleanupBehaviors(this);
            if (typeof super.destroy === 'function') super.destroy();
        }
    };
}

export default { BEHAVIORS, applyBehaviors, cleanupBehaviors, compose };
