import { Primitives } from '../core/primitives.js';

const DEFAULT_LEVELS = [
  { value: 0.382, enabled: true, color: '#ff9800' },
  { value: 0.5,   enabled: true, color: '#4caf50' },
  { value: 0.618, enabled: true, color: '#089981' },
  { value: 0.786, enabled: true, color: '#2962ff' },
  { value: 1,     enabled: true, color: '#787b86' },
  { value: 1.618, enabled: true, color: '#9c27b0' },
];

export default {
  type: 'fib-circle',
  label: 'Círculos de Fibonacci',
  icon: 'F○',
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
    fill: false,
    fillOpacity: 0.04,
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
      { key: 'fill', type: 'toggle', label: 'Rellenar círculos' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.25, step: 0.01 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const c = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const r = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([c.x, c.y, r.x, r.y].some(v => v == null || !isFinite(v))) return;
    const baseR = Math.hypot(r.x - c.x, r.y - c.y);
    if (baseR < 1) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    // sort levels by value so fills stack correctly
    const active = opts.levels.filter(l => l.enabled).slice().sort((a, b) => b.value - a.value);

    if (opts.fill) {
      for (const lvl of active) {
        const rr = baseR * lvl.value;
        g.appendChild(Primitives.circle({
          cx: c.x, cy: c.y, r: rr,
          fill: lvl.color, stroke: 'none', alpha: opts.fillOpacity,
        }));
      }
    }

    for (const lvl of active) {
      const rr = baseR * lvl.value;
      g.appendChild(Primitives.circle({
        cx: c.x, cy: c.y, r: rr,
        fill: 'none', stroke: lvl.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showLabels) {
        // label at top of arc
        g.appendChild(Primitives.label({
          x: c.x, y: c.y - rr, text: `${(lvl.value * 100).toFixed(1)}%`,
          color: '#fff', bg: lvl.color, align: 'center', anchor: 'middle',
          fontSize: 10,
        }));
      }
    }

    // radius construction line (faded)
    g.appendChild(Primitives.line({
      x1: c.x, y1: c.y, x2: r.x, y2: r.y,
      stroke: opts.color, width: 1, dashArray: '2,3', opacity: 0.5,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const c = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const r = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([c.x, c.y, r.x, r.y].some(v => v == null || !isFinite(v))) return false;
    const baseR = Math.hypot(r.x - c.x, r.y - c.y);
    if (baseR < 1) return false;
    const d = Math.hypot(x - c.x, y - c.y);
    for (const lvl of this.options.levels) {
      if (!lvl.enabled) continue;
      if (Math.abs(d - baseR * lvl.value) < 6) return true;
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
