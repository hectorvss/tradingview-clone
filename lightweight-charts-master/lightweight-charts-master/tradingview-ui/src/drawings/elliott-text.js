/* =========================================================================
   Elliott Wave + Text Drawing Tools
   ---------------------------------------------------------------------------
   Self-contained SVG-overlay drawing tools intended to plug into the same
   architectural pattern used by `src/drawing-tools.js`. Each factory function
   returns an object exposing:

       { id, type, activate(), deactivate(), destroy(),
         hitTest(x,y), serialize(), render(), sync() }

   The factories accept:
       svgOverlay → an <svg> element absolutely positioned over the chart area
       chart      → an IChartApi (lightweight-charts v5.2.0)
       series     → an ISeriesApi used for price↔coordinate conversions

   All drawings persist to localStorage under `tv.drawings_elliott_text`.
   The registry `ELLIOTT_TEXT_TOOLS` exposes every factory so callers can
   wire toolbar buttons by id.
   ========================================================================= */

const STORAGE_KEY = 'tv.drawings_elliott_text';
const DEFAULT_COLOR = '#2962ff';
const DEFAULT_TEXT_COLOR = '#dbdbdb';
const DEFAULT_FONT_SIZE = 13;
const HIT_THRESHOLD_PX = 6;
const HANDLE_SIZE = 10;
const ARROW_HEAD_SIZE = 10;
const CALLOUT_PADDING = 6;
const POLYLINE_MIN_DIST_PX = 2;

const SVG_NS = 'http://www.w3.org/2000/svg';

let _uid = 0;
const uniqueId = (prefix = 'd') =>
  `${prefix}_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

/* ------------------------------------------------------------------ */
/* Persistence — keyed by drawing id, grouped by tool type             */
/* ------------------------------------------------------------------ */
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[elliott-text] load failed', e);
    return {};
  }
}

function saveAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[elliott-text] save failed', e);
  }
}

function persistDrawing(type, id, payload) {
  const all = loadAll();
  if (!all[type]) all[type] = {};
  all[type][id] = payload;
  saveAll(all);
}

function removePersisted(type, id) {
  const all = loadAll();
  if (all[type] && all[type][id]) {
    delete all[type][id];
    saveAll(all);
  }
}

function loadType(type) {
  const all = loadAll();
  return (all[type] && typeof all[type] === 'object') ? all[type] : {};
}

/* ------------------------------------------------------------------ */
/* UI feedback helpers — floating hint + cursor                         */
/* ------------------------------------------------------------------ */
const HINT_LABELS = {
  elliott_impulse: 'Elliott Impulse',
  elliott_correction: 'Elliott Corrección',
  text: 'Texto',
  arrow: 'Flecha',
  callout: 'Callout',
  polyline: 'Pincel libre',
};

function showHint(svgOverlay, toolType, stepText) {
  let hint = svgOverlay._drawingHint;
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'tv-drawing-hint';
    hint.style.cssText = `
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(28, 28, 28, 0.92);
      color: #dbdbdb;
      border: 1px solid #2962ff;
      border-radius: 4px;
      padding: 4px 10px;
      font: 12px/1.4 system-ui, sans-serif;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    const parent = svgOverlay.parentElement || document.body;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(hint);
    svgOverlay._drawingHint = hint;
  }
  const label = HINT_LABELS[toolType] || toolType;
  hint.textContent = `${label} — ${stepText} — Esc para cancelar`;
}

function hideHint(svgOverlay) {
  if (svgOverlay._drawingHint) {
    svgOverlay._drawingHint.remove();
    svgOverlay._drawingHint = null;
  }
}

function setCursor(svgOverlay, on) {
  svgOverlay.style.cursor = on ? 'crosshair' : '';
}

/* ------------------------------------------------------------------ */
/* SVG helpers                                                         */
/* ------------------------------------------------------------------ */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined) continue;
    el.setAttribute(k, attrs[k]);
  }
  return el;
}

function ensureArrowMarker(svgOverlay, color) {
  // Marker id is color-keyed so multiple colors can coexist.
  const safeColor = color.replace(/[^a-z0-9]/gi, '');
  const markerId = `elliott-arrowhead-${safeColor}`;
  if (svgOverlay.querySelector(`#${markerId}`)) return markerId;
  let defs = svgOverlay.querySelector('defs');
  if (!defs) {
    defs = svgEl('defs');
    svgOverlay.insertBefore(defs, svgOverlay.firstChild);
  }
  const marker = svgEl('marker', {
    id: markerId,
    viewBox: '0 0 10 10',
    refX: '8',
    refY: '5',
    markerWidth: ARROW_HEAD_SIZE,
    markerHeight: ARROW_HEAD_SIZE,
    orient: 'auto-start-reverse',
  });
  marker.appendChild(svgEl('path', {
    d: 'M0,0 L10,5 L0,10 z',
    fill: color,
  }));
  defs.appendChild(marker);
  return markerId;
}

/* ------------------------------------------------------------------ */
/* Coordinate helpers                                                  */
/* ------------------------------------------------------------------ */
function toCoord(chart, series, point) {
  if (!point) return null;
  const x = chart.timeScale().timeToCoordinate(point.time);
  const y = series.priceToCoordinate(point.price);
  if (x == null || y == null) return null;
  return { x, y };
}

function fromEvent(svgOverlay, chart, series, ev) {
  const rect = svgOverlay.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const time = chart.timeScale().coordinateToTime(x);
  const price = series.coordinateToPrice(y);
  if (time == null || price == null) return null;
  return { time, price, x, y };
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ------------------------------------------------------------------ */
/* Handle factory — shared draggable square handle for any drawing     */
/* ------------------------------------------------------------------ */
function makeHandle(svgOverlay, chart, series, drawing, anchorIdx, opts = {}) {
  const handle = svgEl('rect', {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    fill: '#ffffff',
    stroke: opts.color || DEFAULT_COLOR,
    'stroke-width': 2,
    rx: 2,
    ry: 2,
    style: 'cursor: move; pointer-events: auto; display: none;',
    'data-handle-for': drawing.id,
    'data-anchor-idx': anchorIdx,
  });
  svgOverlay.appendChild(handle);

  let dragging = false;
  handle.addEventListener('mousedown', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    dragging = true;
  });
  function onMove(ev) {
    if (!dragging) return;
    const pt = fromEvent(svgOverlay, chart, series, ev);
    if (!pt) return;
    drawing.points[anchorIdx] = { time: pt.time, price: pt.price };
    drawing.render();
    drawing.setSelected(true);
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    drawing._persist();
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  handle._cleanup = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    handle.remove();
  };
  return handle;
}

function syncHandle(handle, coord, selected) {
  if (!coord) {
    handle.style.display = 'none';
    return;
  }
  handle.style.display = selected ? 'block' : 'none';
  handle.setAttribute('x', coord.x - HANDLE_SIZE / 2);
  handle.setAttribute('y', coord.y - HANDLE_SIZE / 2);
}

/* ------------------------------------------------------------------ */
/* Base — common scaffolding for SVG-overlay drawings                  */
/* ------------------------------------------------------------------ */
function createBaseDrawing(type, svgOverlay, chart, series, opts = {}) {
  const drawing = {
    id: opts.id || uniqueId(type),
    type,
    points: opts.points ? opts.points.slice() : [],
    style: Object.assign({
      color: DEFAULT_COLOR,
      lineWidth: 1.5,
      fontSize: DEFAULT_FONT_SIZE,
      textColor: DEFAULT_TEXT_COLOR,
      text: '',
    }, opts.style || {}),
    selected: false,
    _nodes: [],
    _handles: [],
    _disposers: [],

    _addNode(node) {
      this._nodes.push(node);
      svgOverlay.appendChild(node);
      return node;
    },

    _clearNodes() {
      this._nodes.forEach(n => n.remove());
      this._nodes = [];
    },

    _clearHandles() {
      this._handles.forEach(h => h._cleanup && h._cleanup());
      this._handles = [];
    },

    setSelected(sel) {
      this.selected = sel;
      this._handles.forEach((h, i) => {
        syncHandle(h, toCoord(chart, series, this.points[i]), sel);
      });
    },

    sync() {
      // Re-render keeps SVG coords in sync with the chart's time/price axes.
      this.render();
    },

    destroy() {
      this._clearNodes();
      this._clearHandles();
      this._disposers.forEach(fn => { try { fn(); } catch {} });
      this._disposers = [];
      removePersisted(this.type, this.id);
    },

    _persist() {
      persistDrawing(this.type, this.id, this.serialize());
    },

    serialize() {
      return {
        id: this.id,
        type: this.type,
        points: this.points,
        style: this.style,
      };
    },

    hitTest() { return false },
    render() { /* overridden */ },
  };
  return drawing;
}

/* ================================================================== */
/* 1) Elliott Impulse — 5-wave (6 anchors)                             */
/* ================================================================== */
function buildElliottImpulse(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('elliott_impulse', svgOverlay, chart, series, opts);

  d.render = function () {
    this._clearNodes();
    if (this.points.length < 2) return;
    const coords = this.points.map(p => toCoord(chart, series, p));
    if (coords.some(c => !c)) return;

    // Validate wave rules (only meaningful with all 6 anchors).
    let warning = null;
    if (this.points.length === 6) {
      warning = validateImpulse(this.points);
    }
    const strokeColor = warning ? '#f23645' : this.style.color;

    // Connecting polyline
    const poly = svgEl('polyline', {
      points: coords.map(c => `${c.x},${c.y}`).join(' '),
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': this.style.lineWidth,
      'stroke-linejoin': 'round',
      'pointer-events': 'stroke',
      style: 'cursor: pointer;',
    });
    this._addNode(poly);

    // Pivot circles + numeric labels (skip index 0 = wave origin).
    const labels = ['0', '1', '2', '3', '4', '5'];
    coords.forEach((c, i) => {
      const dot = svgEl('circle', {
        cx: c.x, cy: c.y, r: 3,
        fill: strokeColor, stroke: '#000', 'stroke-width': 0.5,
        'pointer-events': 'none',
      });
      this._addNode(dot);
      if (i === 0) return;
      // Place label offset perpendicular to wave direction (above if going up).
      const prev = coords[i - 1];
      const goingUp = c.y < prev.y;
      const labelY = goingUp ? c.y - 8 : c.y + 16;
      const label = svgEl('text', {
        x: c.x, y: labelY,
        fill: strokeColor,
        'font-size': this.style.fontSize,
        'font-family': 'system-ui, sans-serif',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'pointer-events': 'none',
      });
      label.textContent = labels[i];
      this._addNode(label);
    });

    // Warning badge for invalid wave rules
    if (warning) {
      const last = coords[coords.length - 1];
      const warn = svgEl('text', {
        x: last.x + 10, y: last.y,
        fill: '#f23645',
        'font-size': 11,
        'font-family': 'system-ui, sans-serif',
        'pointer-events': 'none',
      });
      warn.textContent = `⚠ ${warning}`;
      this._addNode(warn);
    }

    // Refresh handles
    this._clearHandles();
    this.points.forEach((_, i) => {
      const h = makeHandle(svgOverlay, chart, series, this, i, { color: strokeColor });
      this._handles.push(h);
      syncHandle(h, coords[i], this.selected);
    });
  };

  d.hitTest = function (x, y) {
    const coords = this.points.map(p => toCoord(chart, series, p));
    if (coords.some(c => !c)) return false;
    for (let i = 0; i < coords.length - 1; i++) {
      if (distanceToSegment(x, y, coords[i].x, coords[i].y,
                            coords[i + 1].x, coords[i + 1].y) <= HIT_THRESHOLD_PX) {
        return true;
      }
    }
    return false;
  };

  return d;
}

function validateImpulse(pts) {
  // pts: [0,1,2,3,4,5]. Determine direction from price of 0 → 1.
  const up = pts[1].price > pts[0].price;
  // Wave magnitudes (price-only proxy).
  const w1 = Math.abs(pts[1].price - pts[0].price);
  const w3 = Math.abs(pts[3].price - pts[2].price);
  const w5 = Math.abs(pts[5].price - pts[4].price);
  // Rule 1: wave 3 cannot be the shortest among 1, 3, 5.
  if (w3 < w1 && w3 < w5) return 'Onda 3 más corta';
  // Rule 2: wave 4 cannot overlap wave 1's territory.
  if (up) {
    if (pts[4].price <= pts[1].price) return 'Onda 4 invade onda 1';
  } else {
    if (pts[4].price >= pts[1].price) return 'Onda 4 invade onda 1';
  }
  return null;
}

export function createElliottImpulse(svgOverlay, chart, series) {
  return makeTool({
    svgOverlay, chart, series,
    type: 'elliott_impulse',
    expectedPoints: 6,
    builder: buildElliottImpulse,
  });
}

/* ================================================================== */
/* 2) Elliott Correction — A,B,C (3 anchors)                           */
/* ================================================================== */
function buildElliottCorrection(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('elliott_correction', svgOverlay, chart, series, opts);

  d.render = function () {
    this._clearNodes();
    if (this.points.length < 2) return;
    const coords = this.points.map(p => toCoord(chart, series, p));
    if (coords.some(c => !c)) return;

    const poly = svgEl('polyline', {
      points: coords.map(c => `${c.x},${c.y}`).join(' '),
      fill: 'none',
      stroke: this.style.color,
      'stroke-width': this.style.lineWidth,
      'stroke-dasharray': '4 3',
      'stroke-linejoin': 'round',
      'pointer-events': 'stroke',
      style: 'cursor: pointer;',
    });
    this._addNode(poly);

    const labels = ['', 'A', 'B', 'C'];
    coords.forEach((c, i) => {
      const dot = svgEl('circle', {
        cx: c.x, cy: c.y, r: 3,
        fill: this.style.color, stroke: '#000', 'stroke-width': 0.5,
        'pointer-events': 'none',
      });
      this._addNode(dot);
      if (i === 0) return;
      const prev = coords[i - 1];
      const goingUp = c.y < prev.y;
      const label = svgEl('text', {
        x: c.x, y: goingUp ? c.y - 8 : c.y + 16,
        fill: this.style.color,
        'font-size': this.style.fontSize,
        'font-family': 'system-ui, sans-serif',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'pointer-events': 'none',
      });
      label.textContent = labels[i] || '';
      this._addNode(label);
    });

    this._clearHandles();
    this.points.forEach((_, i) => {
      const h = makeHandle(svgOverlay, chart, series, this, i, { color: this.style.color });
      this._handles.push(h);
      syncHandle(h, coords[i], this.selected);
    });
  };

  d.hitTest = function (x, y) {
    const coords = this.points.map(p => toCoord(chart, series, p));
    if (coords.some(c => !c)) return false;
    for (let i = 0; i < coords.length - 1; i++) {
      if (distanceToSegment(x, y, coords[i].x, coords[i].y,
                            coords[i + 1].x, coords[i + 1].y) <= HIT_THRESHOLD_PX) {
        return true;
      }
    }
    return false;
  };

  return d;
}

export function createElliottCorrection(svgOverlay, chart, series) {
  return makeTool({
    svgOverlay, chart, series,
    type: 'elliott_correction',
    expectedPoints: 4, // origin + A + B + C
    builder: buildElliottCorrection,
  });
}

/* ================================================================== */
/* 3) Text tool — single anchor, double-click to edit                  */
/* ================================================================== */
function buildText(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('text', svgOverlay, chart, series, opts);
  d.style.text = d.style.text || 'Texto';

  d.render = function () {
    this._clearNodes();
    if (this.points.length < 1) return;
    const c = toCoord(chart, series, this.points[0]);
    if (!c) return;

    const text = svgEl('text', {
      x: c.x, y: c.y,
      fill: this.style.textColor,
      'font-size': this.style.fontSize,
      'font-family': 'system-ui, sans-serif',
      'pointer-events': 'auto',
      style: 'cursor: text; user-select: none;',
    });
    text.textContent = this.style.text;
    this._addNode(text);

    // Double-click to edit
    const onDblClick = (ev) => {
      ev.stopPropagation();
      this._beginEdit(c);
    };
    text.addEventListener('dblclick', onDblClick);
    this._disposers.push(() => text.removeEventListener('dblclick', onDblClick));

    this._clearHandles();
    const h = makeHandle(svgOverlay, chart, series, this, 0, { color: this.style.color });
    this._handles.push(h);
    syncHandle(h, c, this.selected);
  };

  d._beginEdit = function (coord) {
    const rect = svgOverlay.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.style.text;
    input.style.cssText = `
      position: fixed;
      left: ${rect.left + coord.x}px;
      top: ${rect.top + coord.y - this.style.fontSize}px;
      font-size: ${this.style.fontSize}px;
      color: ${this.style.textColor};
      background: #1c1c1c;
      border: 1px solid ${this.style.color};
      padding: 2px 4px;
      z-index: 1000;
      font-family: system-ui, sans-serif;
      min-width: 120px;
    `;
    document.body.appendChild(input);
    input.focus();
    input.select();
    const commit = () => {
      this.style.text = input.value;
      input.remove();
      this.render();
      this._persist();
    };
    input.addEventListener('blur', commit, { once: true });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') { input.value = this.style.text; input.blur(); }
    });
  };

  d.hitTest = function (x, y) {
    const c = toCoord(chart, series, this.points[0]);
    if (!c) return false;
    // Approximate text bbox by font size × char count
    const w = (this.style.text || '').length * this.style.fontSize * 0.55;
    const h = this.style.fontSize;
    return x >= c.x - 2 && x <= c.x + w + 2 &&
           y >= c.y - h && y <= c.y + 2;
  };

  return d;
}

export function createTextTool(svgOverlay, chart, series) {
  return makeTool({
    svgOverlay, chart, series,
    type: 'text',
    expectedPoints: 1,
    builder: buildText,
  });
}

/* ================================================================== */
/* 4) Arrow — 2 anchors, arrowhead at end                              */
/* ================================================================== */
function buildArrow(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('arrow', svgOverlay, chart, series, opts);

  d.render = function () {
    this._clearNodes();
    if (this.points.length < 2) return;
    const c1 = toCoord(chart, series, this.points[0]);
    const c2 = toCoord(chart, series, this.points[1]);
    if (!c1 || !c2) return;

    const markerId = ensureArrowMarker(svgOverlay, this.style.color);
    const line = svgEl('line', {
      x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y,
      stroke: this.style.color,
      'stroke-width': this.style.lineWidth + 0.5,
      'marker-end': `url(#${markerId})`,
      'pointer-events': 'stroke',
      style: 'cursor: pointer;',
    });
    this._addNode(line);

    this._clearHandles();
    [c1, c2].forEach((c, i) => {
      const h = makeHandle(svgOverlay, chart, series, this, i, { color: this.style.color });
      this._handles.push(h);
      syncHandle(h, c, this.selected);
    });
  };

  d.hitTest = function (x, y) {
    const c1 = toCoord(chart, series, this.points[0]);
    const c2 = toCoord(chart, series, this.points[1]);
    if (!c1 || !c2) return false;
    return distanceToSegment(x, y, c1.x, c1.y, c2.x, c2.y) <= HIT_THRESHOLD_PX;
  };

  return d;
}

export function createArrowTool(svgOverlay, chart, series) {
  return makeTool({
    svgOverlay, chart, series,
    type: 'arrow',
    expectedPoints: 2,
    builder: buildArrow,
  });
}

/* ================================================================== */
/* 5) Callout — box with leader line pointing at anchor                */
/* ================================================================== */
function buildCallout(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('callout', svgOverlay, chart, series, opts);
  d.style.text = d.style.text || 'Nota';
  // points: [0] = anchor (target), [1] = box center
  d.render = function () {
    this._clearNodes();
    if (this.points.length < 2) return;
    const anchor = toCoord(chart, series, this.points[0]);
    const boxCenter = toCoord(chart, series, this.points[1]);
    if (!anchor || !boxCenter) return;

    const txt = this.style.text || '';
    const charW = this.style.fontSize * 0.6;
    const boxW = Math.max(60, txt.length * charW + CALLOUT_PADDING * 2);
    const boxH = this.style.fontSize + CALLOUT_PADDING * 2;
    const boxX = boxCenter.x - boxW / 2;
    const boxY = boxCenter.y - boxH / 2;

    // Leader line from box edge to anchor
    const leader = svgEl('line', {
      x1: boxCenter.x, y1: boxCenter.y,
      x2: anchor.x, y2: anchor.y,
      stroke: this.style.color,
      'stroke-width': 1,
      'stroke-dasharray': '3 2',
      'pointer-events': 'none',
    });
    this._addNode(leader);

    // Anchor target dot
    const target = svgEl('circle', {
      cx: anchor.x, cy: anchor.y, r: 3,
      fill: this.style.color,
      'pointer-events': 'none',
    });
    this._addNode(target);

    // Box
    const box = svgEl('rect', {
      x: boxX, y: boxY,
      width: boxW, height: boxH,
      rx: 3, ry: 3,
      fill: '#1c1c1c',
      stroke: this.style.color,
      'stroke-width': 1,
      'pointer-events': 'auto',
      style: 'cursor: move;',
    });
    this._addNode(box);

    const label = svgEl('text', {
      x: boxCenter.x, y: boxCenter.y + this.style.fontSize / 3,
      fill: this.style.textColor,
      'font-size': this.style.fontSize,
      'font-family': 'system-ui, sans-serif',
      'text-anchor': 'middle',
      'pointer-events': 'auto',
      style: 'cursor: text; user-select: none;',
    });
    label.textContent = txt;
    this._addNode(label);

    // Edit text on dblclick
    const onDbl = (ev) => { ev.stopPropagation(); this._beginEdit(boxCenter); };
    label.addEventListener('dblclick', onDbl);
    box.addEventListener('dblclick', onDbl);
    this._disposers.push(() => {
      label.removeEventListener('dblclick', onDbl);
      box.removeEventListener('dblclick', onDbl);
    });

    this._clearHandles();
    [anchor, boxCenter].forEach((c, i) => {
      const h = makeHandle(svgOverlay, chart, series, this, i, { color: this.style.color });
      this._handles.push(h);
      syncHandle(h, c, this.selected);
    });

    // Cache hit-test geometry
    this._bbox = { x: boxX, y: boxY, w: boxW, h: boxH };
    this._anchorPx = anchor;
    this._boxPx = boxCenter;
  };

  d._beginEdit = function (coord) {
    const rect = svgOverlay.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.style.text;
    input.style.cssText = `
      position: fixed;
      left: ${rect.left + coord.x - 80}px;
      top: ${rect.top + coord.y - this.style.fontSize}px;
      width: 160px;
      font-size: ${this.style.fontSize}px;
      color: ${this.style.textColor};
      background: #1c1c1c;
      border: 1px solid ${this.style.color};
      padding: 2px 4px;
      z-index: 1000;
      font-family: system-ui, sans-serif;
      text-align: center;
    `;
    document.body.appendChild(input);
    input.focus();
    input.select();
    const commit = () => {
      this.style.text = input.value;
      input.remove();
      this.render();
      this._persist();
    };
    input.addEventListener('blur', commit, { once: true });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') { input.value = this.style.text; input.blur(); }
    });
  };

  d.hitTest = function (x, y) {
    if (!this._bbox) return false;
    const b = this._bbox;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    if (this._anchorPx && this._boxPx) {
      return distanceToSegment(x, y,
        this._boxPx.x, this._boxPx.y,
        this._anchorPx.x, this._anchorPx.y) <= HIT_THRESHOLD_PX;
    }
    return false;
  };

  return d;
}

export function createCalloutTool(svgOverlay, chart, series) {
  return makeTool({
    svgOverlay, chart, series,
    type: 'callout',
    expectedPoints: 2,
    builder: buildCallout,
  });
}

/* ================================================================== */
/* 6) Polyline brush — freehand stroke                                 */
/* ================================================================== */
function buildPolyline(svgOverlay, chart, series, opts = {}) {
  const d = createBaseDrawing('polyline', svgOverlay, chart, series, opts);

  d.render = function () {
    this._clearNodes();
    if (this.points.length < 2) return;
    const coords = this.points.map(p => toCoord(chart, series, p)).filter(Boolean);
    if (coords.length < 2) return;

    // Catmull-Rom-ish smoothing: quadratic curves through midpoints.
    let path = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length - 1; i++) {
      const c = coords[i];
      const n = coords[i + 1];
      const midX = (c.x + n.x) / 2;
      const midY = (c.y + n.y) / 2;
      path += ` Q ${c.x},${c.y} ${midX},${midY}`;
    }
    const last = coords[coords.length - 1];
    path += ` L ${last.x},${last.y}`;

    const stroke = svgEl('path', {
      d: path,
      fill: 'none',
      stroke: this.style.color,
      'stroke-width': this.style.lineWidth + 0.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'pointer-events': 'stroke',
      style: 'cursor: pointer;',
    });
    this._addNode(stroke);

    // Only show handles at endpoints (not every brush vertex).
    this._clearHandles();
    [0, this.points.length - 1].forEach((idx) => {
      const c = toCoord(chart, series, this.points[idx]);
      const h = makeHandle(svgOverlay, chart, series, this, idx, { color: this.style.color });
      this._handles.push(h);
      syncHandle(h, c, this.selected);
    });
  };

  d.hitTest = function (x, y) {
    const coords = this.points.map(p => toCoord(chart, series, p));
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i], b = coords[i + 1];
      if (!a || !b) continue;
      if (distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= HIT_THRESHOLD_PX) return true;
    }
    return false;
  };

  return d;
}

export function createPolylineBrush(svgOverlay, chart, series) {
  // Polyline has a unique drag-based creation flow, not click-step.
  const drawings = [];
  let active = false;
  let current = null;
  let lastPx = null;

  function onMouseDown(ev) {
    if (!active) return;
    if (ev.button !== 0) return;
    const pt = fromEvent(svgOverlay, chart, series, ev);
    if (!pt) return;
    ev.preventDefault();
    current = buildPolyline(svgOverlay, chart, series, {});
    current.points.push({ time: pt.time, price: pt.price });
    lastPx = { x: pt.x, y: pt.y };
    current.render();
  }
  function onMouseMove(ev) {
    if (!active || !current) return;
    const pt = fromEvent(svgOverlay, chart, series, ev);
    if (!pt) return;
    if (lastPx && Math.hypot(pt.x - lastPx.x, pt.y - lastPx.y) < POLYLINE_MIN_DIST_PX) return;
    current.points.push({ time: pt.time, price: pt.price });
    lastPx = { x: pt.x, y: pt.y };
    current.render();
  }
  function onMouseUp() {
    if (!current) return;
    if (current.points.length >= 2) {
      drawings.push(current);
      current._persist();
    } else {
      current.destroy();
    }
    current = null;
    lastPx = null;
    deactivate();
  }

  function onKeyDown(ev) {
    if (ev.key === 'Escape') {
      if (current) { current.destroy(); current = null; lastPx = null; }
      deactivate();
    }
  }

  function activate() {
    active = true;
    svgOverlay.style.pointerEvents = 'auto';
    setCursor(svgOverlay, true);
    showHint(svgOverlay, 'polyline', 'mantén pulsado y arrastra para dibujar');
    svgOverlay.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
  }
  function deactivate() {
    active = false;
    svgOverlay.style.pointerEvents = '';
    setCursor(svgOverlay, false);
    hideHint(svgOverlay);
    svgOverlay.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
  }
  function destroy() {
    deactivate();
    drawings.forEach(d => d.destroy());
    drawings.length = 0;
  }
  function restore() {
    const saved = loadType('polyline');
    Object.values(saved).forEach(payload => {
      const d = buildPolyline(svgOverlay, chart, series, payload);
      d.render();
      drawings.push(d);
    });
  }
  function syncAll() { drawings.forEach(d => d.sync()); }
  function hitTest(x, y) {
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (drawings[i].hitTest(x, y)) return drawings[i];
    }
    return null;
  }

  return {
    type: 'polyline',
    activate, deactivate, destroy, restore, syncAll, hitTest,
    get drawings() { return drawings.slice(); },
  };
}

/* ================================================================== */
/* Click-step tool wrapper — shared creation flow                      */
/* ================================================================== */
function makeTool({ svgOverlay, chart, series, type, expectedPoints, builder }) {
  const drawings = [];
  let active = false;
  let pending = null; // in-progress drawing
  let previewMoveHandler = null;

  function stepText() {
    const n = pending ? pending.points.length : 0;
    return `clic ${n + 1} de ${expectedPoints}`;
  }

  function onMouseDown(ev) {
    if (!active) return;
    if (ev.button !== 0) return;
    const pt = fromEvent(svgOverlay, chart, series, ev);
    if (!pt) return;
    ev.stopPropagation();
    ev.preventDefault();

    if (!pending) {
      pending = builder(svgOverlay, chart, series, {});
    }
    pending.points.push({ time: pt.time, price: pt.price });
    pending.render();

    if (pending.points.length >= expectedPoints) {
      drawings.push(pending);
      pending._persist();
      pending = null;
      deactivate();
    } else {
      showHint(svgOverlay, type, stepText());
    }
  }

  function onMouseMove(ev) {
    if (!active || !pending || pending.points.length < 1) return;
    const pt = fromEvent(svgOverlay, chart, series, ev);
    if (!pt) return;
    // Push a temporary preview point at the end and re-render, then pop.
    pending.points.push({ time: pt.time, price: pt.price });
    pending.render();
    pending.points.pop();
  }

  function onKeyDown(ev) {
    if (ev.key === 'Escape') {
      if (pending) { pending.destroy(); pending = null; }
      deactivate();
    }
  }

  function activate() {
    active = true;
    svgOverlay.style.pointerEvents = 'auto';
    setCursor(svgOverlay, true);
    showHint(svgOverlay, type, stepText());
    svgOverlay.addEventListener('mousedown', onMouseDown);
    previewMoveHandler = onMouseMove;
    svgOverlay.addEventListener('mousemove', previewMoveHandler);
    document.addEventListener('keydown', onKeyDown);
  }

  function deactivate() {
    active = false;
    svgOverlay.style.pointerEvents = '';
    setCursor(svgOverlay, false);
    hideHint(svgOverlay);
    svgOverlay.removeEventListener('mousedown', onMouseDown);
    if (previewMoveHandler) {
      svgOverlay.removeEventListener('mousemove', previewMoveHandler);
      previewMoveHandler = null;
    }
    document.removeEventListener('keydown', onKeyDown);
  }

  function destroy() {
    deactivate();
    drawings.forEach(d => d.destroy());
    drawings.length = 0;
  }

  function restore() {
    const saved = loadType(type);
    Object.values(saved).forEach(payload => {
      const d = builder(svgOverlay, chart, series, payload);
      d.render();
      drawings.push(d);
    });
  }

  function syncAll() { drawings.forEach(d => d.sync()); }

  function hitTest(x, y) {
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (drawings[i].hitTest(x, y)) return drawings[i];
    }
    return null;
  }

  function remove(id) {
    const idx = drawings.findIndex(d => d.id === id);
    if (idx < 0) return;
    drawings[idx].destroy();
    drawings.splice(idx, 1);
  }

  return {
    type,
    activate, deactivate, destroy, restore, syncAll, hitTest, remove,
    get drawings() { return drawings.slice(); },
  };
}

/* ================================================================== */
/* Public registry                                                     */
/* ================================================================== */
export const ELLIOTT_TEXT_TOOLS = {
  elliott_impulse:    { label: 'Elliott Impulse (1-5)', create: createElliottImpulse },
  elliott_correction: { label: 'Elliott Corrección (A-B-C)', create: createElliottCorrection },
  text:               { label: 'Texto', create: createTextTool },
  arrow:              { label: 'Flecha', create: createArrowTool },
  callout:            { label: 'Callout', create: createCalloutTool },
  polyline:           { label: 'Pincel libre', create: createPolylineBrush },
};

export default ELLIOTT_TEXT_TOOLS;
