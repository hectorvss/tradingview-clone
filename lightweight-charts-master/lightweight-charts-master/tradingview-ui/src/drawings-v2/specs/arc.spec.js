import { Primitives } from '../core/primitives.js';

export default {
  type: 'arc',
  label: 'Arco',
  icon: '⌒',
  category: 'shapes',
  pointsRequired: 3,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    color: '#2962ff',
    width: 2,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const [a, b, c] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (a.x == null || b.x == null || c.x == null) return;
    const opts = this.options;
    const path = arcPath(a, b, c);
    if (!path) {
      // Collinear → render straight line
      g.appendChild(Primitives.line({
        x1: a.x, y1: a.y, x2: c.x, y2: c.y,
        stroke: opts.color, width: opts.width,
        dashArray: Primitives.dashFromStyle(opts.style),
      }));
      return;
    }
    const p = Primitives.el('path');
    p.setAttribute('d', path);
    p.setAttribute('stroke', opts.color);
    p.setAttribute('stroke-width', opts.width);
    p.setAttribute('fill', 'none');
    const dash = Primitives.dashFromStyle(opts.style);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    g.appendChild(p);
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const [a, b, c] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (a.x == null || b.x == null || c.x == null) return false;
    const circ = circleThroughThreePoints(a, b, c);
    if (!circ) return pointToSegmentDist(x, y, a.x, a.y, c.x, c.y) < 6;
    const d = Math.hypot(x - circ.cx, y - circ.cy);
    if (Math.abs(d - circ.r) > 6) return false;
    // restrict to arc swept between a and c via b
    const angA = Math.atan2(a.y - circ.cy, a.x - circ.cx);
    const angB = Math.atan2(b.y - circ.cy, b.x - circ.cx);
    const angC = Math.atan2(c.y - circ.cy, c.x - circ.cx);
    const angP = Math.atan2(y - circ.cy, x - circ.cx);
    return angleOnArc(angP, angA, angC, angB);
  },

  getHandles(ctx) {
    if (this.points.length < 3) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function arcPath(a, b, c) {
  const circ = circleThroughThreePoints(a, b, c);
  if (!circ) return null;
  // Determine sweep direction: go from a to c passing through b
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const sweep = cross > 0 ? 1 : 0;
  // Large arc: angle from a to c through b
  const angA = Math.atan2(a.y - circ.cy, a.x - circ.cx);
  const angC = Math.atan2(c.y - circ.cy, c.x - circ.cx);
  let delta = angC - angA;
  if (sweep === 1) {
    while (delta < 0) delta += Math.PI * 2;
  } else {
    while (delta > 0) delta -= Math.PI * 2;
  }
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  return `M ${a.x} ${a.y} A ${circ.r} ${circ.r} 0 ${large} ${sweep} ${c.x} ${c.y}`;
}

function circleThroughThreePoints(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const r = Math.hypot(a.x - cx, a.y - cy);
  return { cx, cy, r };
}

function angleOnArc(p, a, c, viaB) {
  // Normalize to [0, 2pi) relative to a
  const norm = (v) => { let x = v - a; while (x < 0) x += Math.PI * 2; while (x >= Math.PI * 2) x -= Math.PI * 2; return x; };
  const pn = norm(p);
  const cn = norm(c);
  const bn = norm(viaB);
  // If b lies before c in CCW order, arc spans 0..cn; else spans cn..2pi
  if (bn <= cn) return pn <= cn + 0.05;
  return pn >= cn - 0.05;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
