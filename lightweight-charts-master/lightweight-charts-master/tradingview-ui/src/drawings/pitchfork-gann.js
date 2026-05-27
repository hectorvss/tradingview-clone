/* =========================================================================
   Pitchfork & Gann drawing tools — self-contained SVG-overlay drawings.

   Exports:
     createAndrewsPitchfork(svgOverlay, chart, series, opts?) → tool
     createGannBox(svgOverlay, chart, series, opts?)          → tool
     createGannFan(svgOverlay, chart, series, opts?)          → tool
     createGannSquare(svgOverlay, chart, series, opts?)       → tool
     PITCHFORK_GANN_TOOLS  registry { id, label, factory }

   Each factory returns a "tool" object:
     {
       id, type, points,
       beginCreate(), addAnchor({time,price}),
       commit(), cancel(),
       render(), destroy(), setSelected(bool),
       hitTest(x,y), move(dt,dp),
       toJSON(), fromJSON(obj),
       onChange(cb)
     }

   Persistence: all instances created via the registry are auto-saved to
     localStorage key 'tv.drawings_pitchfork_gann' as { id, type, points,
     style, variant }. Call PITCHFORK_GANN_TOOLS.loadAll(svgOverlay, chart,
     series) to rehydrate.

   Coordinate model:
     - Anchors stored as { time, price } in chart space.
     - Rendering: each frame, project anchors → pixels via chart.timeScale()
       .timeToCoordinate(time) and series.priceToCoordinate(price). All
       geometry math (pitchfork median, parallels, Gann angles, Gann box
       subdivisions, square-of-9 grid) is computed in PIXEL space so the
       slopes look right on a non-uniform time/price scale.
     - sync() is called on crosshair move + visible-range change.

   Handles: 1 draggable SVG <circle class="pg-handle"> per anchor. The
     drag listener converts pixel → (time, price) and updates the anchor,
     triggering a re-render + persistence save (debounced via mouseup).
   ========================================================================= */

const STORAGE_KEY = 'tv.drawings_pitchfork_gann';
const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_STYLE = {
  color: '#2962ff',
  fillOpacity: 0.06,
  lineWidth: 1.25,
  handleColor: '#2962ff',
  handleRadius: 5,
};

const GANN_LEVELS = [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1.0];
// (rise, run) pairs — Gann fan classic angles
const GANN_FAN_ANGLES = [
  { label: '1x8', rise: 1, run: 8 },
  { label: '1x4', rise: 1, run: 4 },
  { label: '1x3', rise: 1, run: 3 },
  { label: '1x2', rise: 1, run: 2 },
  { label: '1x1', rise: 1, run: 1 },
  { label: '2x1', rise: 2, run: 1 },
  { label: '3x1', rise: 3, run: 1 },
  { label: '4x1', rise: 4, run: 1 },
  { label: '8x1', rise: 8, run: 1 },
];

let _uid = 0;
const uniqueId = (prefix = 'pg') => `${prefix}_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

/* ============================ Base Class ============================ */

class BaseDrawing {
  constructor({ svgOverlay, chart, series, type, points, style, variant, id }) {
    this.id = id || uniqueId(type);
    this.type = type;
    this.svg = svgOverlay;
    this.chart = chart;
    this.series = series;
    this.points = points || [];
    this.style = Object.assign({}, DEFAULT_STYLE, style || {});
    this.variant = variant || 'standard';
    this.group = null;     // <g> holding rendered primitives
    this.handles = [];     // <circle> elements
    this.selected = false;
    this._listeners = [];
    this._onChange = null;
    this._dragState = null;
    this._ensureSvgSized();
  }

  _ensureSvgSized() {
    // SVG overlay must be present and sized to chart container.
    if (!this.svg) return;
    if (!this.svg.hasAttribute('width')) {
      const parent = this.svg.parentElement;
      if (parent) {
        const r = parent.getBoundingClientRect();
        this.svg.setAttribute('width', r.width);
        this.svg.setAttribute('height', r.height);
        this.svg.style.position = this.svg.style.position || 'absolute';
        this.svg.style.inset = '0';
        this.svg.style.pointerEvents = 'none';
      }
    }
  }

  onChange(cb) { this._onChange = cb; }
  _emit() { if (typeof this._onChange === 'function') this._onChange(this); }

  /** Project anchor to pixel coords; returns null if off-screen. */
  _project(p) {
    if (!p) return null;
    const x = this.chart.timeScale().timeToCoordinate(p.time);
    const y = this.series.priceToCoordinate(p.price);
    if (x == null || y == null) return null;
    return { x, y };
  }

  /** Inverse: pixel → {time, price}. */
  _unproject(x, y) {
    const time = this.chart.timeScale().coordinateToTime(x);
    const price = this.series.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time, price };
  }

  /** Subclasses override to add SVG primitives into this.group. */
  _draw() { /* abstract */ }

  /** Width / height of the SVG overlay in px. */
  _viewport() {
    const w = parseFloat(this.svg.getAttribute('width')) || (this.svg.parentElement?.clientWidth || 800);
    const h = parseFloat(this.svg.getAttribute('height')) || (this.svg.parentElement?.clientHeight || 600);
    return { w, h };
  }

  render() {
    this.destroy(/*keepListeners*/true);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `pg-drawing pg-${this.type}`);
    g.dataset.id = this.id;
    this.group = g;
    this.svg.appendChild(g);
    this._draw();
    this._drawHandles();
  }

  _drawHandles() {
    this.points.forEach((p, idx) => {
      const proj = this._project(p);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', this.style.handleRadius);
      c.setAttribute('fill', this.style.handleColor);
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', '2');
      c.setAttribute('class', 'pg-handle');
      c.style.cursor = 'move';
      c.style.pointerEvents = 'all';
      c.style.display = this.selected ? 'block' : 'none';
      if (proj) {
        c.setAttribute('cx', proj.x);
        c.setAttribute('cy', proj.y);
      } else {
        c.style.display = 'none';
      }
      this.group.appendChild(c);
      this.handles.push(c);
      this._attachHandleDrag(c, idx);
    });
  }

  _attachHandleDrag(el, idx) {
    const onDown = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      this._dragState = { idx, type: 'handle' };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    const onMove = (ev) => {
      if (!this._dragState || this._dragState.type !== 'handle') return;
      const rect = (this.svg.parentElement || this.svg).getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const np = this._unproject(x, y);
      if (!np) return;
      this.points[this._dragState.idx] = np;
      this.render();
      this.setSelected(true);
    };
    const onUp = () => {
      if (!this._dragState) return;
      this._dragState = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this._emit();
    };
    el.addEventListener('mousedown', onDown);
    this._listeners.push(() => el.removeEventListener('mousedown', onDown));
  }

  setSelected(sel) {
    this.selected = !!sel;
    this.handles.forEach(h => { h.style.display = this.selected ? 'block' : 'none'; });
  }

  /** Move all anchors by (dt time, dp price). */
  move(dt, dp) {
    this.points = this.points.map(p => ({ time: p.time + dt, price: p.price + dp }));
    this.render();
    this._emit();
  }

  sync() { this.render(); }

  destroy(keepListeners = false) {
    if (this.group && this.group.parentNode) this.group.parentNode.removeChild(this.group);
    this.group = null;
    this.handles = [];
    if (!keepListeners) {
      this._listeners.forEach(off => { try { off(); } catch {} });
      this._listeners = [];
    }
  }

  /** Default hit-test: scan all <line>/<polyline> children of group. */
  hitTest(x, y, threshold = 6) {
    if (!this.group) return false;
    const els = this.group.querySelectorAll('line, polyline, polygon, rect');
    for (const el of els) {
      if (el.tagName === 'line') {
        const x1 = +el.getAttribute('x1'), y1 = +el.getAttribute('y1');
        const x2 = +el.getAttribute('x2'), y2 = +el.getAttribute('y2');
        if (distanceToSegment(x, y, x1, y1, x2, y2) <= threshold) return true;
      } else if (el.tagName === 'rect') {
        const rx = +el.getAttribute('x'), ry = +el.getAttribute('y');
        const rw = +el.getAttribute('width'), rh = +el.getAttribute('height');
        const onEdge = (
          (Math.abs(y - ry) <= threshold && x >= rx && x <= rx + rw) ||
          (Math.abs(y - (ry + rh)) <= threshold && x >= rx && x <= rx + rw) ||
          (Math.abs(x - rx) <= threshold && y >= ry && y <= ry + rh) ||
          (Math.abs(x - (rx + rw)) <= threshold && y >= ry && y <= ry + rh)
        );
        if (onEdge) return true;
      }
    }
    return false;
  }

  toJSON() {
    return {
      id: this.id, type: this.type, points: this.points,
      style: this.style, variant: this.variant,
    };
  }
}

/* ============================ Andrews Pitchfork ============================ */
/*
   Geometry:
     standard:        median origin = P1, target = midpoint(P2, P3).
     schiff:          median origin = midpoint(P1, P2), target = midpoint(P2, P3).
     modified-schiff: median origin = midpoint of horizontal-segment(P1, P2)
                      (i.e. midpoint shifted to mid-time but at P1.price),
                      target = midpoint(P2, P3).
     The two parallel "tines" pass through P2 and P3 respectively with the
     same direction vector as the median. All three lines are extended to
     the right edge of the SVG viewport.
*/
class AndrewsPitchfork extends BaseDrawing {
  constructor(opts) { super({ ...opts, type: 'andrews_pitchfork' }); }

  _medianOrigin() {
    const [p1, p2, p3] = this.points;
    const a = this._project(p1), b = this._project(p2), c = this._project(p3);
    if (!a || !b || !c) return null;
    if (this.variant === 'schiff') {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    if (this.variant === 'modified-schiff') {
      // mid-time at P1's price (mid-x of P1/P2, y of P1)
      return { x: (a.x + b.x) / 2, y: a.y };
    }
    return a; // standard
  }

  _draw() {
    if (this.points.length < 3) return;
    const a = this._project(this.points[0]);
    const b = this._project(this.points[1]);
    const c = this._project(this.points[2]);
    if (!a || !b || !c) return;

    const origin = this._medianOrigin();
    const target = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    // Direction vector of median.
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;

    const { w } = this._viewport();
    // Extend each line from its base point all the way to the right edge
    // (or until x leaves [0, w]). Parametric: x(t) = base.x + t*ux.
    const extend = (base) => {
      // pick t so that base.x + t*ux == w  (if going right) or 0 (if going left)
      const tRight = ux > 0 ? (w - base.x) / ux : (ux < 0 ? -base.x / ux : 1e6);
      const tLeft  = ux < 0 ? (w - base.x) / ux : (ux > 0 ? -base.x / ux : -1e6);
      // We want the median to extend forward (in direction of ux,uy) from base.
      const tFwd = Math.max(tRight, tLeft, 1000);
      const tBwd = 0; // anchored at base going forward only
      return {
        x1: base.x + tBwd * ux, y1: base.y + tBwd * uy,
        x2: base.x + tFwd * ux, y2: base.y + tFwd * uy,
      };
    };

    // Median: draw from P1 (or true origin) forward through target and beyond.
    const medSeg = extend(origin);
    // The two parallel tines through P2 and P3.
    const tine1 = extend(b);
    const tine2 = extend(c);

    // Connecting line P2 → P3 (the "trigger line"), drawn dashed.
    const trigger = mkLine(a.x, a.y, b.x, b.y, this.style.color, 1, '4 4');
    const trigger2 = mkLine(a.x, a.y, c.x, c.y, this.style.color, 1, '4 4');
    const connector = mkLine(b.x, b.y, c.x, c.y, this.style.color, 1, '4 4');

    const median = mkLine(medSeg.x1, medSeg.y1, medSeg.x2, medSeg.y2, this.style.color, this.style.lineWidth + 0.5);
    const lineU  = mkLine(tine1.x1, tine1.y1, tine1.x2, tine1.y2, this.style.color, this.style.lineWidth);
    const lineL  = mkLine(tine2.x1, tine2.y1, tine2.x2, tine2.y2, this.style.color, this.style.lineWidth);

    // Filled channel between the two tines (semi-transparent).
    const poly = document.createElementNS(SVG_NS, 'polygon');
    poly.setAttribute('points',
      `${tine1.x1},${tine1.y1} ${tine1.x2},${tine1.y2} ${tine2.x2},${tine2.y2} ${tine2.x1},${tine2.y1}`);
    poly.setAttribute('fill', this.style.color);
    poly.setAttribute('fill-opacity', this.style.fillOpacity);
    poly.setAttribute('stroke', 'none');

    [poly, trigger, trigger2, connector, median, lineU, lineL].forEach(el => this.group.appendChild(el));
  }
}

/* ============================ Gann Box ============================ */
/*
   Geometry:
     Defined by 2 anchors P1, P2 → forms a bounding rectangle in pixel
     space (x0,y0)–(x1,y1). Subdivided by horizontal lines at each Gann
     ratio (0, .25, .382, .5, .618, .75, 1.0) of the box height, and
     vertical lines at the same ratios of the box width. Both diagonals
     (top-left↔bottom-right and top-right↔bottom-left) are drawn for
     time-price symmetry analysis.
*/
class GannBox extends BaseDrawing {
  constructor(opts) { super({ ...opts, type: 'gann_box' }); }

  _draw() {
    if (this.points.length < 2) return;
    const a = this._project(this.points[0]);
    const b = this._project(this.points[1]);
    if (!a || !b) return;
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const w = x1 - x0, h = y1 - y0;

    // Fill
    const fill = document.createElementNS(SVG_NS, 'rect');
    fill.setAttribute('x', x0); fill.setAttribute('y', y0);
    fill.setAttribute('width', w); fill.setAttribute('height', h);
    fill.setAttribute('fill', this.style.color);
    fill.setAttribute('fill-opacity', this.style.fillOpacity);
    fill.setAttribute('stroke', 'none');
    this.group.appendChild(fill);

    // Outline
    const outline = document.createElementNS(SVG_NS, 'rect');
    outline.setAttribute('x', x0); outline.setAttribute('y', y0);
    outline.setAttribute('width', w); outline.setAttribute('height', h);
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', this.style.color);
    outline.setAttribute('stroke-width', this.style.lineWidth);
    this.group.appendChild(outline);

    // Horizontal subdivisions
    GANN_LEVELS.forEach(lvl => {
      const y = y0 + h * lvl;
      const ln = mkLine(x0, y, x1, y, this.style.color, 0.8,
        (lvl === 0 || lvl === 1) ? null : '3 3');
      ln.setAttribute('opacity', '0.7');
      this.group.appendChild(ln);
      // level label
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', x0 + 3);
      t.setAttribute('y', y - 2);
      t.setAttribute('font-size', '10');
      t.setAttribute('fill', this.style.color);
      t.textContent = lvl.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      this.group.appendChild(t);
    });
    // Vertical subdivisions
    GANN_LEVELS.forEach(lvl => {
      const x = x0 + w * lvl;
      const ln = mkLine(x, y0, x, y1, this.style.color, 0.8,
        (lvl === 0 || lvl === 1) ? null : '3 3');
      ln.setAttribute('opacity', '0.7');
      this.group.appendChild(ln);
    });
    // Diagonals
    this.group.appendChild(mkLine(x0, y0, x1, y1, this.style.color, this.style.lineWidth));
    this.group.appendChild(mkLine(x1, y0, x0, y1, this.style.color, this.style.lineWidth));
  }
}

/* ============================ Gann Fan ============================ */
/*
   Geometry:
     2 anchors: P1 = pivot, P2 = reference point. Pixel vector v = P2 - P1
     defines the unit (1x1 angle). Each other angle is computed by scaling
     the (dx, dy) components: a "RxC" angle has slope (R * |dy|) / (C * |dx|)
     in the same quadrant as v. Each fan ray is extended from P1 to the
     right edge of the viewport.
*/
class GannFan extends BaseDrawing {
  constructor(opts) { super({ ...opts, type: 'gann_fan' }); }

  _draw() {
    if (this.points.length < 2) return;
    const p = this._project(this.points[0]);
    const r = this._project(this.points[1]);
    if (!p || !r) return;
    const dx = r.x - p.x, dy = r.y - p.y;
    const sx = dx >= 0 ? 1 : -1;
    const sy = dy >= 0 ? 1 : -1;
    const ax = Math.abs(dx) || 1;
    const ay = Math.abs(dy) || 1;
    const { w, h } = this._viewport();

    GANN_FAN_ANGLES.forEach(({ label, rise, run }) => {
      // direction (vx, vy): vx ∝ run*ax, vy ∝ rise*ay (preserve sign of dx/dy)
      const vx = sx * run * ax;
      const vy = sy * rise * ay;
      // Extend to viewport edges.
      const tCandidates = [];
      if (vx !== 0) {
        tCandidates.push((0 - p.x) / vx, (w - p.x) / vx);
      }
      if (vy !== 0) {
        tCandidates.push((0 - p.y) / vy, (h - p.y) / vy);
      }
      const tPos = tCandidates.filter(t => t > 0);
      const t = tPos.length ? Math.min(...tPos) : 1;
      const ex = p.x + vx * t;
      const ey = p.y + vy * t;
      const isMain = label === '1x1';
      const ln = mkLine(p.x, p.y, ex, ey, this.style.color,
        isMain ? this.style.lineWidth + 0.5 : this.style.lineWidth,
        isMain ? null : '4 3');
      ln.setAttribute('opacity', isMain ? '1' : '0.85');
      this.group.appendChild(ln);
      // label near end
      const tx = document.createElementNS(SVG_NS, 'text');
      const lx = p.x + vx * t * 0.92;
      const ly = p.y + vy * t * 0.92;
      tx.setAttribute('x', lx);
      tx.setAttribute('y', ly);
      tx.setAttribute('font-size', '10');
      tx.setAttribute('fill', this.style.color);
      tx.textContent = label;
      this.group.appendChild(tx);
    });
  }
}

/* ============================ Gann Square ============================ */
/*
   Geometry (Square of 9 / Square of 144):
     2 anchors define a square in pixel space — the box is forced square by
     taking max(|dx|, |dy|) for both width AND height (anchored at P1).
     Subdivided into an NxN grid (N = 9 by default, override via opts to 12
     for Square of 144 = 12x12). Both diagonals drawn. Inner concentric
     squares from the center to corner emphasise the "square root" levels
     (Gann's square-of-9 angular relationships).
*/
class GannSquare extends BaseDrawing {
  constructor(opts) {
    super({ ...opts, type: 'gann_square' });
    this.grid = (opts && opts.grid) || (this.variant === 'sq144' ? 12 : 9);
  }

  _draw() {
    if (this.points.length < 2) return;
    const a = this._project(this.points[0]);
    const b = this._project(this.points[1]);
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    const sx = dx >= 0 ? 1 : -1;
    const sy = dy >= 0 ? 1 : -1;
    const x0 = sx > 0 ? a.x : a.x - side;
    const y0 = sy > 0 ? a.y : a.y - side;
    const x1 = x0 + side, y1 = y0 + side;

    // Fill
    const fill = document.createElementNS(SVG_NS, 'rect');
    fill.setAttribute('x', x0); fill.setAttribute('y', y0);
    fill.setAttribute('width', side); fill.setAttribute('height', side);
    fill.setAttribute('fill', this.style.color);
    fill.setAttribute('fill-opacity', this.style.fillOpacity);
    fill.setAttribute('stroke', this.style.color);
    fill.setAttribute('stroke-width', this.style.lineWidth);
    this.group.appendChild(fill);

    // Grid
    const N = this.grid;
    for (let i = 1; i < N; i++) {
      const f = i / N;
      const x = x0 + side * f;
      const y = y0 + side * f;
      const isMajor = (i % Math.max(1, Math.round(N / 3)) === 0);
      const ln1 = mkLine(x, y0, x, y1, this.style.color,
        isMajor ? 0.9 : 0.5, isMajor ? null : '2 2');
      const ln2 = mkLine(x0, y, x1, y, this.style.color,
        isMajor ? 0.9 : 0.5, isMajor ? null : '2 2');
      ln1.setAttribute('opacity', isMajor ? '0.85' : '0.5');
      ln2.setAttribute('opacity', isMajor ? '0.85' : '0.5');
      this.group.appendChild(ln1);
      this.group.appendChild(ln2);
    }
    // Both diagonals
    this.group.appendChild(mkLine(x0, y0, x1, y1, this.style.color, this.style.lineWidth + 0.3));
    this.group.appendChild(mkLine(x1, y0, x0, y1, this.style.color, this.style.lineWidth + 0.3));

    // Concentric squares (sqrt levels) — center → corner
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const rings = [0.25, 0.5, 0.75];
    rings.forEach(f => {
      const half = (side / 2) * f;
      const rr = document.createElementNS(SVG_NS, 'rect');
      rr.setAttribute('x', cx - half);
      rr.setAttribute('y', cy - half);
      rr.setAttribute('width', half * 2);
      rr.setAttribute('height', half * 2);
      rr.setAttribute('fill', 'none');
      rr.setAttribute('stroke', this.style.color);
      rr.setAttribute('stroke-width', '0.7');
      rr.setAttribute('stroke-dasharray', '2 2');
      rr.setAttribute('opacity', '0.6');
      this.group.appendChild(rr);
    });
    // Center dot
    const cdot = document.createElementNS(SVG_NS, 'circle');
    cdot.setAttribute('cx', cx); cdot.setAttribute('cy', cy);
    cdot.setAttribute('r', '2');
    cdot.setAttribute('fill', this.style.color);
    this.group.appendChild(cdot);
  }
}

/* ============================ Factory wrapper ============================ */
/*
   makeTool wraps a Drawing class with the creation flow + persistence
   bookkeeping that all 4 tools share:
     - beginCreate() arms anchor capture
     - addAnchor() pushes one anchor; when count reached, render + commit
     - commit() saves to storage
     - cancel() destroys
*/
function _labelForType(type) {
  switch (type) {
    case 'andrews_pitchfork': return 'Pitchfork';
    case 'gann_box':          return 'Gann Box';
    case 'gann_fan':          return 'Gann Fan';
    case 'gann_square':       return 'Gann Square';
    default:                  return 'Drawing';
  }
}

function _ensureHintEl(container) {
  let el = container.querySelector('.pg-create-hint');
  if (!el) {
    el = document.createElement('div');
    el.className = 'pg-create-hint';
    el.style.cssText = [
      'position:absolute',
      'top:10px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9999',
      'padding:6px 12px',
      'background:rgba(20,22,28,0.92)',
      'color:#fff',
      'font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'border-radius:6px',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
      'pointer-events:none',
      'user-select:none',
    ].join(';');
    container.appendChild(el);
  }
  return el;
}

function makeTool(Cls, requiredAnchors, svgOverlay, chart, series, opts = {}) {
  const inst = new Cls({ svgOverlay, chart, series, points: [], ...opts });
  inst._required = requiredAnchors;
  inst._creating = false;
  inst._createCtx = null;

  const _updateHint = () => {
    const ctx = inst._createCtx;
    if (!ctx || !ctx.hintEl) return;
    const next = inst.points.length + 1;
    const total = inst._required;
    const label = _labelForType(inst.type);
    ctx.hintEl.textContent = `${label}: click para colocar punto ${next} de ${total} · Esc cancela`;
  };

  const _teardownCreate = () => {
    const ctx = inst._createCtx;
    if (!ctx) return;
    try { if (ctx.unsubClick) ctx.unsubClick(); } catch {}
    try { window.removeEventListener('keydown', ctx.onKey, true); } catch {}
    if (ctx.container && ctx.prevCursor !== undefined) {
      ctx.container.style.cursor = ctx.prevCursor || '';
    }
    if (ctx.hintEl && ctx.hintEl.parentNode) {
      ctx.hintEl.parentNode.removeChild(ctx.hintEl);
    }
    inst._createCtx = null;
    inst._creating = false;
  };

  inst.beginCreate = function () {
    this._creating = true;
    this.points = [];

    // Locate chart container (parent of the SVG overlay is the natural choice).
    const container =
      (this.svg && this.svg.parentElement) ||
      (this.chart && typeof this.chart.chartElement === 'function' ? this.chart.chartElement() : null) ||
      document.body;

    const prevCursor = container.style.cursor;
    container.style.cursor = 'crosshair';

    const hintEl = _ensureHintEl(container);

    const handler = (param) => {
      if (!this._creating) return;
      if (!param || !param.point) return;
      const { x, y } = param.point;
      let time = null;
      try { time = this.chart.timeScale().coordinateToTime(x); } catch {}
      // Fallback: param.time is sometimes provided directly.
      if (time == null && param.time != null) time = param.time;
      let price = null;
      try { price = this.series.coordinateToPrice(y); } catch {}
      if (time == null || price == null) return;
      this.addAnchor({ time, price });
      if (this._creating) {
        _updateHint();
      } else {
        _teardownCreate();
      }
    };

    let unsubClick = null;
    try {
      this.chart.subscribeClick(handler);
      unsubClick = () => { try { this.chart.unsubscribeClick(handler); } catch {} };
    } catch (e) {
      console.warn('[pitchfork-gann] subscribeClick failed', e);
    }

    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        this.cancel();
      }
    };
    window.addEventListener('keydown', onKey, true);

    this._createCtx = { container, prevCursor, hintEl, unsubClick, onKey };
    _updateHint();
  };
  inst.addAnchor = function (pt) {
    // Allow programmatic use even if beginCreate wasn't called.
    if (!this._creating && this.points.length === 0) {
      this._creating = true;
    }
    if (!this._creating) return false;
    this.points.push({ time: pt.time, price: pt.price });
    if (this.points.length >= this._required) {
      this._creating = false;
      this.render();
      this.commit();
      // Teardown click flow if active.
      if (this._createCtx) _teardownCreate();
      return true; // done
    }
    return false;
  };
  inst.commit = function () {
    saveOneToStorage(this);
    this._emit();
  };
  inst.cancel = function () {
    this._creating = false;
    if (this._createCtx) _teardownCreate();
    this.destroy();
    removeFromStorage(this.id);
  };
  inst.fromJSON = function (obj) {
    this.id = obj.id || this.id;
    this.points = obj.points || [];
    this.style = Object.assign({}, this.style, obj.style || {});
    this.variant = obj.variant || this.variant;
    this.render();
    return this;
  };

  // Auto-persist on changes
  inst.onChange(() => saveOneToStorage(inst));

  return inst;
}

/* ============================ Public factories ============================ */

export function createAndrewsPitchfork(svgOverlay, chart, series, opts) {
  return makeTool(AndrewsPitchfork, 3, svgOverlay, chart, series, opts);
}
export function createGannBox(svgOverlay, chart, series, opts) {
  return makeTool(GannBox, 2, svgOverlay, chart, series, opts);
}
export function createGannFan(svgOverlay, chart, series, opts) {
  return makeTool(GannFan, 2, svgOverlay, chart, series, opts);
}
export function createGannSquare(svgOverlay, chart, series, opts) {
  return makeTool(GannSquare, 2, svgOverlay, chart, series, opts);
}

/* ============================ Persistence ============================ */

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeStore(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
  catch (e) { console.warn('[pitchfork-gann] save failed', e); }
}
function saveOneToStorage(drawing) {
  const arr = readStore();
  const idx = arr.findIndex(x => x.id === drawing.id);
  const json = drawing.toJSON();
  if (idx >= 0) arr[idx] = json; else arr.push(json);
  writeStore(arr);
}
function removeFromStorage(id) {
  writeStore(readStore().filter(x => x.id !== id));
}

const CLASS_BY_TYPE = {
  andrews_pitchfork: AndrewsPitchfork,
  gann_box: GannBox,
  gann_fan: GannFan,
  gann_square: GannSquare,
};

function loadAll(svgOverlay, chart, series) {
  const arr = readStore();
  const out = [];
  arr.forEach(obj => {
    const Cls = CLASS_BY_TYPE[obj.type];
    if (!Cls) return;
    const required = obj.type === 'andrews_pitchfork' ? 3 : 2;
    const t = makeTool(Cls, required, svgOverlay, chart, series, {
      variant: obj.variant, style: obj.style, id: obj.id,
    });
    t.fromJSON(obj);
    out.push(t);
  });
  return out;
}

function clearAll() { writeStore([]); }

/* ============================ Helpers ============================ */

function mkLine(x1, y1, x2, y2, color, width, dash) {
  const ln = document.createElementNS(SVG_NS, 'line');
  ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
  ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
  ln.setAttribute('stroke', color);
  ln.setAttribute('stroke-width', width);
  if (dash) ln.setAttribute('stroke-dasharray', dash);
  return ln;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ============================ Registry ============================ */

export const PITCHFORK_GANN_TOOLS = {
  storageKey: STORAGE_KEY,
  items: [
    { id: 'andrews_pitchfork', label: 'Andrews Pitchfork', anchors: 3, factory: createAndrewsPitchfork },
    { id: 'gann_box',          label: 'Gann Box',          anchors: 2, factory: createGannBox },
    { id: 'gann_fan',          label: 'Gann Fan',          anchors: 2, factory: createGannFan },
    { id: 'gann_square',       label: 'Gann Square',       anchors: 2, factory: createGannSquare },
  ],
  create(id, svgOverlay, chart, series, opts) {
    const item = this.items.find(i => i.id === id);
    if (!item) throw new Error(`[pitchfork-gann] unknown tool: ${id}`);
    return item.factory(svgOverlay, chart, series, opts);
  },
  loadAll,
  clearAll,
};

export default PITCHFORK_GANN_TOOLS;
