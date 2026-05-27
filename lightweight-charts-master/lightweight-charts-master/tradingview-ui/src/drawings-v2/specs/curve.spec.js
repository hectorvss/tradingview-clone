import { Primitives } from '../core/primitives.js';

export default {
  type: 'curve',
  label: 'Curva',
  icon: '⌒',
  category: 'curves',
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
      { key: 'showHandles', type: 'toggle', label: 'Mostrar línea de control al seleccionar' },
    ],
    coord: 'auto',
  },

  handleStyles: [
    { color: '#2962ff', kind: 'anchor' },
    { color: '#787b86', kind: 'control' },
    { color: '#2962ff', kind: 'anchor' },
  ],

  render(g, ctx) {
    if (this.points.length < 3) return;
    const [start, control, end] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (start.x == null || control.x == null || end.x == null) return;
    const opts = this.options;
    const path = Primitives.el('path');
    path.setAttribute('d', `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`);
    path.setAttribute('stroke', opts.color);
    path.setAttribute('stroke-width', opts.width);
    path.setAttribute('fill', 'none');
    const dash = Primitives.dashFromStyle(opts.style);
    if (dash) path.setAttribute('stroke-dasharray', dash);
    g.appendChild(path);
    if (opts.showHandles && this.selected) {
      g.appendChild(Primitives.line({
        x1: start.x, y1: start.y, x2: control.x, y2: control.y,
        stroke: '#787b86', width: 1, dashArray: '3,3', opacity: 0.7,
      }));
      g.appendChild(Primitives.line({
        x1: end.x, y1: end.y, x2: control.x, y2: control.y,
        stroke: '#787b86', width: 1, dashArray: '3,3', opacity: 0.7,
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const [start, control, end] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (start.x == null || control.x == null || end.x == null) return false;
    const steps = 24;
    let prev = start;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const pt = quadBezier(start, control, end, t);
      if (pointToSegmentDist(x, y, prev.x, prev.y, pt.x, pt.y) < 6) return true;
      prev = pt;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 3) return [];
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

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
