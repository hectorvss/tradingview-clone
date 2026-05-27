// drawings-v2/specs/inside-pitchfork.spec.js
// Inside Pitchfork — a variant where the median runs from the midpoint
// of (P2,P3) back through P1, with internal tines anchored on the inner
// halves of the base. This produces a "reversed" tridente useful for
// channels that compress instead of expand.
import { Primitives } from '../core/primitives.js';

export default {
  type: 'inside-pitchfork',
  label: 'Horquilla interna',
  icon: 'Yi',
  category: 'channels',
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
    color: '#9c27b0',
    width: 1,
    style: 'solid',
    fillAlpha: 0.06,
    showTines: true,
    showMedian: true,
    showBase: true,
    showFill: true,
    extendRight: true,
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
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.5, step: 0.01 },
    ],
    especifico: [
      { key: 'showMedian', type: 'toggle', label: 'Mostrar mediana' },
      { key: 'showTines', type: 'toggle', label: 'Mostrar líneas exteriores' },
      { key: 'showBase', type: 'toggle', label: 'Mostrar base P2-P3' },
      { key: 'showFill', type: 'toggle', label: 'Mostrar relleno' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const [a, b, c] = pts;
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };

    // Inside variant: median starts at midpoint(P2,P3) and passes through P1.
    const target = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    const origin = target;
    const through = a;
    const dx = through.x - origin.x;
    const dy = through.y - origin.y;

    // Base line P2-P3 (dashed grey reference)
    if (opts.showBase) {
      g.appendChild(Primitives.line({
        x1: b.x, y1: b.y, x2: c.x, y2: c.y,
        stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.7,
      }));
    }

    // Reference rays back to P1 (so the user sees the construction)
    g.appendChild(Primitives.line({
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.5,
    }));
    g.appendChild(Primitives.line({
      x1: a.x, y1: a.y, x2: c.x, y2: c.y,
      stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.5,
    }));

    // Inner anchors: midpoints between P1 and base endpoints (interior tines)
    const innerB = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const innerC = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };

    // Optional fill between tines
    if (opts.showFill && opts.showTines) {
      const farB = clipPoint(innerB, dx, dy, vb);
      const farC = clipPoint(innerC, dx, dy, vb);
      const poly = Primitives.polygon({
        points: [innerB, farB, farC, innerC],
        fill: opts.color,
        stroke: 'none',
        alpha: opts.fillAlpha,
      });
      g.appendChild(poly);
    }

    // Median: origin (mid B-C) through P1, extended
    if (opts.showMedian) {
      g.appendChild(Primitives.extendedLine({
        a: origin, b: through, viewBox: vb,
        stroke: opts.color, width: opts.width + 0.5, dashArray: dash,
      }));
    }

    // Inner tines parallel to median
    if (opts.showTines) {
      const upperEnd = { x: innerB.x + dx, y: innerB.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: innerB, b: upperEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.9,
      }));
      const lowerEnd = { x: innerC.x + dx, y: innerC.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: innerC, b: lowerEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.9,
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [a, b, c] = pts;
    const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    return pointToSegmentDist(x, y, mid.x, mid.y, a.x, a.y) < 8;
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

function clipPoint(p, dx, dy, vb) {
  let tMax = Infinity;
  if (dx > 0) tMax = Math.min(tMax, (vb.w - p.x) / dx);
  else if (dx < 0) tMax = Math.min(tMax, (0 - p.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (vb.h - p.y) / dy);
  else if (dy < 0) tMax = Math.min(tMax, (0 - p.y) / dy);
  if (!isFinite(tMax) || tMax < 0) tMax = 0;
  return { x: p.x + dx * tMax, y: p.y + dy * tMax };
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
