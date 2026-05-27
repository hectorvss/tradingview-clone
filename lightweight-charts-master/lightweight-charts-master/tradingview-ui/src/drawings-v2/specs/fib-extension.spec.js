import { Primitives } from '../core/primitives.js';

const DEFAULT_LEVELS = [
  { value: 0,     enabled: true,  color: '#787b86' },
  { value: 0.618, enabled: true,  color: '#f44336' },
  { value: 1,     enabled: true,  color: '#ff9800' },
  { value: 1.382, enabled: true,  color: '#ffeb3b' },
  { value: 1.618, enabled: true,  color: '#4caf50' },
  { value: 2,     enabled: false, color: '#00bcd4' },
  { value: 2.618, enabled: false, color: '#3f51b5' },
  { value: 3.618, enabled: false, color: '#9c27b0' },
];

export default {
  type: 'fib-extension',
  label: 'Extensión de Fibonacci',
  icon: 'F⊕',
  category: 'fib',
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
    levels: DEFAULT_LEVELS.map(l => ({ ...l })),
    showPrice: true,
    showPercent: true,
    reverse: false,
    extendRight: true,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color base' },
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
      { key: 'reverse', type: 'toggle', label: 'Invertir dirección' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      price: p.price,
    }));
    if (pts.some(p => p.x == null || !isFinite(p.x))) return;
    const [pA, pB, pC] = pts;
    const opts = this.options;
    const range = (opts.reverse ? -1 : 1) * (pB.price - pA.price);
    const dash = Primitives.dashFromStyle(opts.style);
    const xLeft = Math.min(pA.x, pB.x, pC.x);
    const xRight = opts.extendRight ? ctx.width : Math.max(pA.x, pB.x, pC.x);

    // construction lines A→B→C (faded)
    g.appendChild(Primitives.line({
      x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y,
      stroke: opts.color, width: opts.width, dashArray: '2,3', opacity: 0.55,
    }));
    g.appendChild(Primitives.line({
      x1: pB.x, y1: pB.y, x2: pC.x, y2: pC.y,
      stroke: opts.color, width: opts.width, dashArray: '2,3', opacity: 0.55,
    }));

    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const price = pC.price + range * lvl.value;
      const y = ctx.projectY(price);
      if (y == null || !isFinite(y)) continue;
      g.appendChild(Primitives.line({
        x1: xLeft, y1: y, x2: xRight, y2: y,
        stroke: lvl.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showPercent || opts.showPrice) {
        const parts = [];
        if (opts.showPercent) parts.push(`${(lvl.value * 100).toFixed(1)}%`);
        if (opts.showPrice) parts.push(price.toFixed(2));
        g.appendChild(Primitives.label({
          x: xLeft + 4, y: y - 8, text: parts.join('  '),
          color: '#fff', bg: lvl.color, align: 'left', anchor: 'middle',
          fontSize: 10,
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
    if (this.points.length < 3) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price), price: p.price,
    }));
    if (pts.some(p => p.x == null)) return false;
    const [pA, pB, pC] = pts;
    const opts = this.options;
    const xLeft = Math.min(pA.x, pB.x, pC.x);
    const xRight = opts.extendRight ? ctx.width : Math.max(pA.x, pB.x, pC.x);
    if (x < xLeft - 6 || x > xRight + 6) return false;
    const range = (opts.reverse ? -1 : 1) * (pB.price - pA.price);
    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const price = pC.price + range * lvl.value;
      const ly = ctx.projectY(price);
      if (ly != null && Math.abs(y - ly) < 6) return true;
    }
    return false;
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
