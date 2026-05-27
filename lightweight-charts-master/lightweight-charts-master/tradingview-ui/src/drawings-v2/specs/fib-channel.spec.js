import { Primitives } from '../core/primitives.js';

// Fibonacci channel: 3 points → A,B define base line; C defines parallel reference.
// Levels are projected perpendicular (in price space) from the base, sized by the
// AC vertical offset.
const DEFAULT_LEVELS = [
  { value: 0,     enabled: true,  color: '#787b86' },
  { value: 0.382, enabled: true,  color: '#ff9800' },
  { value: 0.5,   enabled: true,  color: '#4caf50' },
  { value: 0.618, enabled: true,  color: '#089981' },
  { value: 1,     enabled: true,  color: '#2962ff' },
  { value: 1.618, enabled: false, color: '#9c27b0' },
  { value: 2,     enabled: false, color: '#f23645' },
];

export default {
  type: 'fib-channel',
  label: 'Canal de Fibonacci',
  icon: '⫽F',
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
    extendRight: true,
    fill: true,
    fillOpacity: 0.06,
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
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
      { key: 'fill', type: 'toggle', label: 'Rellenar canal' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.5, step: 0.02 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const pA = this.points[0], pB = this.points[1], pC = this.points[2];
    const xA = ctx.projectX(pA.time);
    const xB = ctx.projectX(pB.time);
    const xC = ctx.projectX(pC.time);
    if ([xA, xB, xC].some(v => v == null || !isFinite(v))) return;
    if (xA === xB) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    // base slope (price per unit x)
    const slope = (pB.price - pA.price) / (xB - xA);
    // vertical offset of C from base line at its x
    const baseAtC = pA.price + slope * (xC - xA);
    const offset = pC.price - baseAtC;

    const xLeft = Math.min(xA, xB, xC);
    const xRight = opts.extendRight ? ctx.width : Math.max(xA, xB, xC);

    // helper to build a parallel line at level k * offset
    const lineForLevel = (k) => {
      const p1 = pA.price + slope * (xLeft - xA) + offset * k;
      const p2 = pA.price + slope * (xRight - xA) + offset * k;
      const y1 = ctx.projectY(p1);
      const y2 = ctx.projectY(p2);
      return { y1, y2, p1, p2 };
    };

    const active = opts.levels.filter(l => l.enabled);

    // fill between consecutive enabled levels
    if (opts.fill && active.length >= 2) {
      for (let i = 0; i < active.length - 1; i++) {
        const a = lineForLevel(active[i].value);
        const b = lineForLevel(active[i + 1].value);
        if ([a.y1, a.y2, b.y1, b.y2].some(v => v == null || !isFinite(v))) continue;
        g.appendChild(Primitives.polygon({
          points: [
            { x: xLeft, y: a.y1 },
            { x: xRight, y: a.y2 },
            { x: xRight, y: b.y2 },
            { x: xLeft, y: b.y1 },
          ],
          fill: active[i].color,
          stroke: 'none',
          alpha: opts.fillOpacity,
        }));
      }
    }

    for (const lvl of active) {
      const L = lineForLevel(lvl.value);
      if ([L.y1, L.y2].some(v => v == null || !isFinite(v))) continue;
      g.appendChild(Primitives.line({
        x1: xLeft, y1: L.y1, x2: xRight, y2: L.y2,
        stroke: lvl.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showPercent || opts.showPrice) {
        const parts = [];
        if (opts.showPercent) parts.push(`${(lvl.value * 100).toFixed(1)}%`);
        if (opts.showPrice) parts.push(L.p1.toFixed(2));
        g.appendChild(Primitives.label({
          x: xLeft + 4, y: L.y1 - 8, text: parts.join('  '),
          color: '#fff', bg: lvl.color, align: 'left', anchor: 'middle',
          fontSize: 10,
        }));
      }
      if (opts.showPrice) {
        g.appendChild(Primitives.priceLabel({
          y: L.y2, price: L.p2, color: lvl.color,
          axis: 'right', viewBox: { w: ctx.width },
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const pA = this.points[0], pB = this.points[1], pC = this.points[2];
    const xA = ctx.projectX(pA.time);
    const xB = ctx.projectX(pB.time);
    const xC = ctx.projectX(pC.time);
    if ([xA, xB, xC].some(v => v == null || !isFinite(v))) return false;
    if (xA === xB) return false;
    const opts = this.options;
    const xLeft = Math.min(xA, xB, xC);
    const xRight = opts.extendRight ? ctx.width : Math.max(xA, xB, xC);
    if (x < xLeft - 6 || x > xRight + 6) return false;
    const slope = (pB.price - pA.price) / (xB - xA);
    const baseAtC = pA.price + slope * (xC - xA);
    const offset = pC.price - baseAtC;
    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const price = pA.price + slope * (x - xA) + offset * lvl.value;
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
