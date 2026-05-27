import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Price label — single anchor; an optional horizontal guide line plus a
// formatted price tag at the right edge of the chart.
// ---------------------------------------------------------------------------

export default {
  type: 'price-label',
  label: 'Etiqueta de precio',
  icon: '⊢',
  category: 'annotation',
  pointsRequired: 1,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
    'contextMenuable',
  ],
  defaultOptions: {
    color: '#2962ff',
    textColor: '#ffffff',
    width: 1,
    style: 'dashed',
    showLine: true,
    decimals: 2,
    fontSize: 11,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'textColor', type: 'color', label: 'Color del texto' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 20, step: 1 },
    ],
    especifico: [
      { key: 'showLine', type: 'toggle', label: 'Mostrar línea guía' },
      { key: 'decimals', type: 'slider', label: 'Decimales', min: 0, max: 8, step: 1 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const p = this.points[0];
    const y = ctx.projectY(p.price);
    if (y == null) return;
    const opts = this.options;

    if (opts.showLine) {
      g.appendChild(Primitives.line({
        x1: 0, y1: y, x2: ctx.width, y2: y,
        stroke: opts.color, width: opts.width,
        dashArray: Primitives.dashFromStyle(opts.style),
      }));
    }

    g.appendChild(Primitives.priceLabel({
      y, price: p.price, color: opts.color,
      axis: 'right', viewBox: { w: ctx.width },
      fontSize: opts.fontSize,
      format: (v) => Number(v).toFixed(opts.decimals),
    }));

    this._y = y;
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const py = ctx.projectY(this.points[0].price);
    if (py == null) return false;
    if (this.options.showLine) return Math.abs(y - py) < 6;
    // label-only: hit-test the right-edge label area.
    return Math.abs(y - py) < 10 && x > ctx.width - 80;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const y = ctx.projectY(this.points[0].price);
    if (y == null) return [];
    const x = ctx.projectX(this.points[0].time);
    return [{ x: x != null ? x : ctx.width / 2, y, anchorIdx: 0 }];
  },
};
