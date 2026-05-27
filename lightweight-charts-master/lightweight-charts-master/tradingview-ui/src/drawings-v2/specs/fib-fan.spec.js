import { Primitives } from '../core/primitives.js';

const DEFAULT_LEVELS = [
  { value: 0.236, enabled: true, color: '#f23645' },
  { value: 0.382, enabled: true, color: '#ff9800' },
  { value: 0.5,   enabled: true, color: '#4caf50' },
  { value: 0.618, enabled: true, color: '#089981' },
  { value: 0.786, enabled: true, color: '#2962ff' },
];

export default {
  type: 'fib-fan',
  label: 'Abanico de Fibonacci',
  icon: 'F⩘',
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
    color: '#2962ff',
    width: 1,
    style: 'solid',
    levels: DEFAULT_LEVELS.map(l => ({ ...l })),
    showLabels: true,
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
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const p1 = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const p2 = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([p1.x, p1.y, p2.x, p2.y].some(v => v == null || !isFinite(v))) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const vb = { w: ctx.width, h: ctx.height };

    // base reference line p1→p2 (faded)
    g.appendChild(Primitives.line({
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: opts.color, width: opts.width, dashArray: '2,3', opacity: 0.5,
    }));

    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      // ray from p1 toward (p2.x, p1.y + dy*lvl)
      const targetY = p1.y + dy * lvl.value;
      const rdx = (p2.x - p1.x);
      const rdy = (targetY - p1.y);
      if (rdx === 0 && rdy === 0) continue;
      g.appendChild(Primitives.ray({
        origin: { x: p1.x, y: p1.y },
        direction: { dx: rdx, dy: rdy },
        viewBox: vb,
        stroke: lvl.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showLabels) {
        // place label slightly along the ray
        const t = 1.05;
        g.appendChild(Primitives.label({
          x: p1.x + rdx * t, y: p1.y + rdy * t,
          text: `${(lvl.value * 100).toFixed(1)}%`,
          color: '#fff', bg: lvl.color, align: 'center', anchor: 'middle',
          fontSize: 10,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const p1 = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const p2 = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([p1.x, p1.y, p2.x, p2.y].some(v => v == null || !isFinite(v))) return false;
    const dy = p2.y - p1.y;
    for (const lvl of this.options.levels) {
      if (!lvl.enabled) continue;
      const targetY = p1.y + dy * lvl.value;
      const rdx = p2.x - p1.x;
      const rdy = targetY - p1.y;
      // distance from (x,y) to ray starting at p1
      const len2 = rdx * rdx + rdy * rdy || 1;
      const t = ((x - p1.x) * rdx + (y - p1.y) * rdy) / len2;
      if (t < 0) continue;
      const ix = p1.x + rdx * t;
      const iy = p1.y + rdy * t;
      if (Math.hypot(x - ix, y - iy) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null && isFinite(h.x));
  },
};
