import { Primitives } from '../core/primitives.js';

const DEFAULT_LEVELS = [
  { value: 0,     enabled: true, color: '#787b86' },
  { value: 0.236, enabled: true, color: '#f23645' },
  { value: 0.382, enabled: true, color: '#ff9800' },
  { value: 0.5,   enabled: true, color: '#4caf50' },
  { value: 0.618, enabled: true, color: '#089981' },
  { value: 0.786, enabled: true, color: '#2962ff' },
  { value: 1,     enabled: true, color: '#787b86' },
];

export default {
  type: 'fib-retracement',
  label: 'Retroceso de Fibonacci',
  icon: 'Fib',
  category: 'fib',
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
    width: 1,
    style: 'solid',
    levels: DEFAULT_LEVELS.map(l => ({ ...l })),
    showPrice: true,
    showPercent: true,
    reverse: false,
    extendRight: false,
  },
  schema: {
    estilo: [
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'levels', type: 'fib-levels', label: 'Niveles' },
    ],
    especifico: [
      { key: 'showPrice', type: 'toggle', label: 'Mostrar precios' },
      { key: 'showPercent', type: 'toggle', label: 'Mostrar porcentajes' },
      { key: 'reverse', type: 'toggle', label: 'Invertir' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      price: p.price,
    }));
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;
    const xLeft = Math.min(p1.x, p2.x);
    const xRight = opts.extendRight ? ctx.width : Math.max(p1.x, p2.x);
    const priceA = opts.reverse ? this.points[1].price : this.points[0].price;
    const priceB = opts.reverse ? this.points[0].price : this.points[1].price;
    const dash = Primitives.dashFromStyle(opts.style);
    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const price = priceA + (priceB - priceA) * lvl.value;
      const y = ctx.projectY(price);
      if (y == null) continue;
      g.appendChild(Primitives.line({
        x1: xLeft, y1: y, x2: xRight, y2: y,
        stroke: lvl.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showPercent || opts.showPrice) {
        const parts = [];
        if (opts.showPercent) parts.push(`${(lvl.value * 100).toFixed(1)}%`);
        if (opts.showPrice) parts.push(price.toFixed(2));
        g.appendChild(Primitives.label({
          x: xLeft + 4, y: y - 4,
          text: parts.join('  '),
          color: '#ffffff', bg: lvl.color,
          fontSize: 11, align: 'left', anchor: 'middle',
        }));
      }
      if (opts.showPrice) {
        g.appendChild(Primitives.priceLabel({
          y, price, color: lvl.color,
          axis: 'right', viewBox: { w: ctx.width },
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return false;
    const opts = this.options;
    const xLeft = Math.min(p1.x, p2.x);
    const xRight = opts.extendRight ? ctx.width : Math.max(p1.x, p2.x);
    if (x < xLeft - 6 || x > xRight + 6) return false;
    const priceA = opts.reverse ? this.points[1].price : this.points[0].price;
    const priceB = opts.reverse ? this.points[0].price : this.points[1].price;
    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const price = priceA + (priceB - priceA) * lvl.value;
      const ly = ctx.projectY(price);
      if (ly != null && Math.abs(y - ly) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};
