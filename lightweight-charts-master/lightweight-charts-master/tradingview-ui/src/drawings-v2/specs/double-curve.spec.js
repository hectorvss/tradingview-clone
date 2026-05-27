import { Primitives } from '../core/primitives.js';

export default {
  type: 'double-curve',
  label: 'Doble curva',
  icon: '∽',
  category: 'curves',
  pointsRequired: 5,
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

  // points order: start, control1, mid, control2, end
  handleStyles: [
    { color: '#2962ff', kind: 'anchor' },
    { color: '#787b86', kind: 'control' },
    { color: '#2962ff', kind: 'anchor' },
    { color: '#787b86', kind: 'control' },
    { color: '#2962ff', kind: 'anchor' },
  ],

  render(g, ctx) {
    if (this.points.length < 5) return;
    const [s, c1, m, c2, e] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if ([s, c1, m, c2, e].some(p => p.x == null)) return;
    const opts = this.options;
    const path = Primitives.el('path');
    path.setAttribute('d',
      `M ${s.x} ${s.y} Q ${c1.x} ${c1.y} ${m.x} ${m.y} Q ${c2.x} ${c2.y} ${e.x} ${e.y}`);
    path.setAttribute('stroke', opts.color);
    path.setAttribute('stroke-width', opts.width);
    path.setAttribute('fill', 'none');
    const dash = Primitives.dashFromStyle(opts.style);
    if (dash) path.setAttribute('stroke-dasharray', dash);
    g.appendChild(path);
    if (opts.showHandles && this.selected) {
      const lines = [
        [s, c1], [m, c1], [m, c2], [e, c2],
      ];
      for (const [a, b] of lines) {
        g.appendChild(Primitives.line({
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          stroke: '#787b86', width: 1, dashArray: '3,3', opacity: 0.7,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 5) return false;
    const [s, c1, m, c2, e] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if ([s, c1, m, c2, e].some(p => p.x == null)) return false;
    if (sampleQuadHit(x, y, s, c1, m)) return true;
    if (sampleQuadHit(x, y, m, c2, e)) return true;
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 5) return [];
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

function quadBezier(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function sampleQuadHit(x, y, p0, p1, p2) {
  const steps = 24;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = quadBezier(p0, p1, p2, t);
    if (pointToSegmentDist(x, y, prev.x, prev.y, pt.x, pt.y) < 6) return true;
    prev = pt;
  }
  return false;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
