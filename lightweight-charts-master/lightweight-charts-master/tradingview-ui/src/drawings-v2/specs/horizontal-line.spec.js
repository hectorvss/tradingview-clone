import { Primitives } from '../core/primitives.js';

export default {
  type: 'horizontal-line',
  label: 'Línea horizontal',
  icon: '─',
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
    width: 1,
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
    const y = ctx.projectY(p.price);
    if (y == null) return;
    const opts = this.options;
    g.appendChild(Primitives.line({
      x1: 0, y1: y, x2: ctx.width, y2: y,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
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
    const py = ctx.projectY(this.points[0].price);
    if (py == null) return false;
    return Math.abs(y - py) < 6;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const p = this.points[0];
    const y = ctx.projectY(p.price);
    if (y == null) return [];
    return [{ x: ctx.width / 2, y, anchorIdx: 0 }];
  },
};
