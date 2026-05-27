import { Primitives } from '../core/primitives.js';

export default {
  type: 'path-bezier',
  label: 'Curva Bezier cúbica',
  icon: '∿',
  category: 'curves',
  pointsRequired: 4,
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
    showHandles: true,
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
      { key: 'showHandles', type: 'toggle', label: 'Mostrar líneas de control al seleccionar' },
    ],
    coord: 'auto',
  },

  // anchor color (azul), control color (gris) — used by handle layer when supported
  handleStyles: [
    { color: '#2962ff', kind: 'anchor' },
    { color: '#787b86', kind: 'control' },
    { color: '#787b86', kind: 'control' },
    { color: '#2962ff', kind: 'anchor' },
  ],

  render(g, ctx) {
    if (this.points.length < 4) return;
    const [a1, c1, c2, a2] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if ([a1, c1, c2, a2].some(p => p.x == null)) return;
    const opts = this.options;
    g.appendChild(Primitives.bezier({
      p0: a1, p1: c1, p2: c2, p3: a2,
      stroke: opts.color,
      width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));
    if (opts.showHandles && this.selected) {
      // dashed lines anchor → control
      g.appendChild(Primitives.line({
        x1: a1.x, y1: a1.y, x2: c1.x, y2: c1.y,
        stroke: '#787b86', width: 1, dashArray: '3,3', opacity: 0.7,
      }));
      g.appendChild(Primitives.line({
        x1: a2.x, y1: a2.y, x2: c2.x, y2: c2.y,
        stroke: '#787b86', width: 1, dashArray: '3,3', opacity: 0.7,
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 4) return false;
    const [a1, c1, c2, a2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if ([a1, c1, c2, a2].some(p => p.x == null)) return false;
    // Sample bezier and check segment distance
    const steps = 32;
    let prev = a1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const pt = cubicBezier(a1, c1, c2, a2, t);
      if (pointToSegmentDist(x, y, prev.x, prev.y, pt.x, pt.y) < 6) return true;
      prev = pt;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 4) return [];
    const styles = this.handleStyles || [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
      kind: styles[i] && styles[i].kind,
      color: styles[i] && styles[i].color,
    })).filter(h => h.x != null);
  },
};

function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t, uu = u * u;
  const uuu = uu * u, ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
