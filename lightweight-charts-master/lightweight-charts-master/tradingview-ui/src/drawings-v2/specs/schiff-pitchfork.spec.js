// drawings-v2/specs/schiff-pitchfork.spec.js
// Schiff Pitchfork — explicit variant where the median origin is the
// midpoint of P1-P2, projected toward midpoint(P2,P3).
import { Primitives } from '../core/primitives.js';

export default {
  type: 'schiff-pitchfork',
  label: 'Horquilla de Schiff',
  icon: 'YS',
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
    color: '#2962ff',
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

    // Schiff: origin is midpoint(P1, P2); target is midpoint(P2, P3)
    const origin = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const target = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;

    // Reference base
    if (opts.showBase) {
      g.appendChild(Primitives.line({
        x1: b.x, y1: b.y, x2: c.x, y2: c.y,
        stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.7,
      }));
    }
    g.appendChild(Primitives.line({
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.5,
    }));
    g.appendChild(Primitives.line({
      x1: a.x, y1: a.y, x2: c.x, y2: c.y,
      stroke: '#787b86', width: 1, dashArray: '4,3', opacity: 0.5,
    }));

    // Fill between tines
    if (opts.showFill && opts.showTines) {
      const farB = clipPoint(b, dx, dy, vb);
      const farC = clipPoint(c, dx, dy, vb);
      g.appendChild(Primitives.polygon({
        points: [b, farB, farC, c],
        fill: opts.color, stroke: 'none', alpha: opts.fillAlpha,
      }));
    }

    // Median: origin -> target, extended
    if (opts.showMedian) {
      g.appendChild(Primitives.extendedLine({
        a: origin, b: target, viewBox: vb,
        stroke: opts.color, width: opts.width + 0.5, dashArray: dash,
        leftCap: true, rightCap: !opts.extendRight,
      }));
    }

    // Tines through P2 and P3
    if (opts.showTines) {
      const upperEnd = { x: b.x + dx, y: b.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: b, b: upperEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.9,
      }));
      const lowerEnd = { x: c.x + dx, y: c.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: c, b: lowerEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.9,
      }));
    }

    // Origin marker (visualizes the Schiff offset)
    g.appendChild(Primitives.circle({
      cx: origin.x, cy: origin.y, r: 3,
      fill: '#fff', stroke: opts.color, width: 1.5,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [a, b, c] = pts;
    const origin = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const target = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    return pointToSegmentDist(x, y, origin.x, origin.y, target.x, target.y) < 8;
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
