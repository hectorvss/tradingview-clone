import { Primitives } from '../core/primitives.js';

export default {
  type: 'h-ray',
  label: 'Rayo horizontal',
  icon: '⇢',
  category: 'lines',
  pointsRequired: 1,
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
    showLabel: true,
    labelText: '',
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
      { key: 'showLabel', type: 'toggle', label: 'Mostrar etiqueta de precio' },
      { key: 'labelText', type: 'text', label: 'Texto de etiqueta' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    const y = ctx.projectY(p.price);
    if (x == null || y == null) return;
    const opts = this.options;
    g.appendChild(Primitives.line({
      x1: x, y1: y, x2: ctx.width, y2: y,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));
    // small origin marker
    g.appendChild(Primitives.circle({
      cx: x, cy: y, r: 3,
      fill: opts.color, stroke: opts.color, width: 1,
    }));
    if (opts.showLabel) {
      g.appendChild(Primitives.priceLabel({
        y, price: p.price, color: opts.color,
        axis: 'right', viewBox: { w: ctx.width },
        text: opts.labelText || undefined,
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const p = this.points[0];
    const px = ctx.projectX(p.time);
    const py = ctx.projectY(p.price);
    if (px == null || py == null) return false;
    return Math.abs(y - py) < 6 && x >= px - 6;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    const y = ctx.projectY(p.price);
    if (x == null || y == null) return [];
    return [{ x, y, anchorIdx: 0 }];
  },
};
