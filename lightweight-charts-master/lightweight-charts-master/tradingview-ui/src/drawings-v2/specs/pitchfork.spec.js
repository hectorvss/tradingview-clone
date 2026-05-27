import { Primitives } from '../core/primitives.js';

export default {
  type: 'pitchfork',
  label: 'Horquilla de Andrews',
  icon: 'Y',
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
    variant: 'andrews',
    showTines: true,
    showMedian: true,
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
    ],
    especifico: [
      { key: 'variant', type: 'select', label: 'Variante', options: [
        { value: 'andrews', label: 'Andrews' },
        { value: 'schiff', label: 'Schiff' },
        { value: 'modified-schiff', label: 'Schiff modificada' },
      ]},
      { key: 'showTines', type: 'toggle', label: 'Mostrar líneas exteriores' },
      { key: 'showMedian', type: 'toggle', label: 'Mostrar línea mediana' },
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
    let [a, b, c] = pts;
    // pivot calculation per variant
    let pivot;
    if (opts.variant === 'andrews') {
      pivot = { x: a.x, y: a.y };
    } else if (opts.variant === 'schiff') {
      pivot = { x: a.x, y: (a.y + ((b.y + c.y) / 2)) / 2 };
    } else {
      // modified-schiff: pivot midway between A and midpoint of BC, horizontally too
      const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      pivot = { x: (a.x + mid.x) / 2, y: (a.y + mid.y) / 2 };
    }
    const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };
    if (opts.showMedian) {
      g.appendChild(Primitives.extendedLine({
        a: pivot, b: mid, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash,
        leftCap: true, rightCap: !opts.extendRight,
      }));
    }
    if (opts.showTines) {
      const dx = mid.x - pivot.x;
      const dy = mid.y - pivot.y;
      // upper tine: parallel through B
      const upperEnd = { x: b.x + dx, y: b.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: b, b: upperEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash,
        leftCap: true, rightCap: !opts.extendRight,
      }));
      // lower tine: parallel through C
      const lowerEnd = { x: c.x + dx, y: c.y + dy };
      g.appendChild(Primitives.extendedLine({
        a: c, b: lowerEnd, viewBox: vb,
        stroke: opts.color, width: opts.width, dashArray: dash,
        leftCap: true, rightCap: !opts.extendRight,
      }));
      // base line B-C
      g.appendChild(Primitives.line({
        x1: b.x, y1: b.y, x2: c.x, y2: c.y,
        stroke: opts.color, width: opts.width, dashArray: dash,
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
    return pointToSegmentDist(x, y, a.x, a.y, mid.x, mid.y) < 8;
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

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
