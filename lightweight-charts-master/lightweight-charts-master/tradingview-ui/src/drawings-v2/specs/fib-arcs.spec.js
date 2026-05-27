import { Primitives } from '../core/primitives.js';

// Speed Resistance Arcs (Fibonacci arcs): 2 points define a baseline whose
// length is the unit radius. Semi-arcs are drawn below the baseline at
// Fibonacci ratios of that radius, centered at p1.
const DEFAULT_LEVELS = [
  { value: 0.382, enabled: true, color: '#ff9800' },
  { value: 0.5,   enabled: true, color: '#4caf50' },
  { value: 0.618, enabled: true, color: '#089981' },
  { value: 0.786, enabled: true, color: '#2962ff' },
  { value: 1,     enabled: true, color: '#787b86' },
];

export default {
  type: 'fib-arcs',
  label: 'Arcos de Fibonacci',
  icon: 'F⌒',
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
    showBaseline: true,
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
      { key: 'showBaseline', type: 'toggle', label: 'Mostrar línea base' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const a = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const b = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([a.x, a.y, b.x, b.y].some(v => v == null || !isFinite(v))) return;
    const baseR = Math.hypot(b.x - a.x, b.y - a.y);
    if (baseR < 1) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    // angle along baseline
    const phi = Math.atan2(b.y - a.y, b.x - a.x);
    // draw half-arc on one side of baseline (below it): from phi to phi+PI
    const startAngle = phi;
    const endAngle = phi + Math.PI;

    if (opts.showBaseline) {
      g.appendChild(Primitives.line({
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: opts.color, width: 1, dashArray: '2,3', opacity: 0.5,
      }));
    }

    for (const lvl of opts.levels) {
      if (!lvl.enabled) continue;
      const r = baseR * lvl.value;
      g.appendChild(Primitives.arc({
        cx: a.x, cy: a.y, r,
        startAngle, endAngle,
        stroke: lvl.color, width: opts.width, dashArray: dash, fill: 'none',
      }));
      if (opts.showLabels) {
        // place label at the midpoint of the arc
        const mid = (startAngle + endAngle) / 2;
        g.appendChild(Primitives.label({
          x: a.x + Math.cos(mid) * r,
          y: a.y + Math.sin(mid) * r,
          text: `${(lvl.value * 100).toFixed(1)}%`,
          color: '#fff', bg: lvl.color, align: 'center', anchor: 'middle',
          fontSize: 10,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const a = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const b = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([a.x, a.y, b.x, b.y].some(v => v == null || !isFinite(v))) return false;
    const baseR = Math.hypot(b.x - a.x, b.y - a.y);
    if (baseR < 1) return false;
    const phi = Math.atan2(b.y - a.y, b.x - a.x);
    // is point on the correct half-plane? rotate (x-a) by -phi and check y' > 0
    const dx = x - a.x, dy = y - a.y;
    const yRot = -Math.sin(phi) * dx + Math.cos(phi) * dy;
    if (yRot < -2) return false;
    const d = Math.hypot(dx, dy);
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
