import { Primitives } from '../core/primitives.js';

export default {
  type: 'ext-line',
  label: 'Línea extendida',
  icon: '⇿',
  category: 'lines',
  pointsRequired: 2,
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
    showLabels: false,
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
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas de precio' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;
    g.appendChild(Primitives.extendedLine({
      a: p1, b: p2,
      viewBox: { w: ctx.width, h: ctx.height },
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));
    if (opts.showLabels) {
      g.appendChild(Primitives.priceLabel({ y: p1.y, price: this.points[0].price, color: opts.color, axis: 'right', viewBox: { w: ctx.width } }));
      g.appendChild(Primitives.priceLabel({ y: p2.y, price: this.points[1].price, color: opts.color, axis: 'right', viewBox: { w: ctx.width } }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return false;
    return pointToLineDist(x, y, p1.x, p1.y, p2.x, p2.y) < 6;
  },

  getHandles(ctx) {
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function pointToLineDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((py - y1) * dx - (px - x1) * dy) / len;
}
