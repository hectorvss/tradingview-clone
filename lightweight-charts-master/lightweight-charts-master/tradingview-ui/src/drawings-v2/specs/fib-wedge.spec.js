import { Primitives } from '../core/primitives.js';

// Fibonacci wedge: 3 points. p1 is the apex; p2 defines the upper reference
// ray (level 1.0); p3 defines the lower reference ray (level 0.0). Wedge lines
// are drawn from apex at angles linearly interpolated between the two refs.
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
  type: 'fib-wedge',
  label: 'Cuña de Fibonacci',
  icon: 'F◁',
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
    showLabels: true,
    extendRight: true,
    fill: false,
    fillOpacity: 0.05,
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
      { key: 'fill', type: 'toggle', label: 'Rellenar cuña' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.25, step: 0.01 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const apex = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const pUp  = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    const pLo  = { x: ctx.projectX(this.points[2].time), y: ctx.projectY(this.points[2].price) };
    if ([apex.x, apex.y, pUp.x, pUp.y, pLo.x, pLo.y].some(v => v == null || !isFinite(v))) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };

    const aUp = Math.atan2(pUp.y - apex.y, pUp.x - apex.x);
    let aLo = Math.atan2(pLo.y - apex.y, pLo.x - apex.x);
    // normalize delta to shortest path
    let delta = aLo - aUp;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    // helper to compute ray endpoint at angle
    const rayAt = (angle, color, width, dashArr) => {
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      return Primitives.ray({
        origin: apex, direction: { dx, dy }, viewBox: vb,
        stroke: color, width, dashArray: dashArr,
      });
    };

    // sorted active levels for fill polygons
    const active = opts.levels.filter(l => l.enabled).slice().sort((a, b) => a.value - b.value);

    // fill between consecutive levels: use ray clipping endpoints
    if (opts.fill && active.length >= 2) {
      const endpointAt = (angle) => {
        const dx = Math.cos(angle), dy = Math.sin(angle);
        // intersect with viewbox
        let tMax = Infinity;
        if (dx > 0) tMax = Math.min(tMax, (vb.w - apex.x) / dx);
        else if (dx < 0) tMax = Math.min(tMax, -apex.x / dx);
        if (dy > 0) tMax = Math.min(tMax, (vb.h - apex.y) / dy);
        else if (dy < 0) tMax = Math.min(tMax, -apex.y / dy);
        if (!isFinite(tMax) || tMax < 0) tMax = 0;
        return { x: apex.x + dx * tMax, y: apex.y + dy * tMax };
      };
      for (let i = 0; i < active.length - 1; i++) {
        const a1 = aUp + delta * (1 - active[i].value);
        const a2 = aUp + delta * (1 - active[i + 1].value);
        const e1 = endpointAt(a1);
        const e2 = endpointAt(a2);
        g.appendChild(Primitives.polygon({
          points: [apex, e1, e2],
          fill: active[i].color, stroke: 'none', alpha: opts.fillOpacity,
        }));
      }
    }

    for (const lvl of active) {
      // interpolate angle: value 0 → aLo, value 1 → aUp
      const angle = aUp + delta * (1 - lvl.value);
      g.appendChild(rayAt(angle, lvl.color, opts.width, dash));
      if (opts.showLabels) {
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const lx = apex.x + dx * 80;
        const ly = apex.y + dy * 80;
        if (lx >= 0 && lx <= vb.w && ly >= 0 && ly <= vb.h) {
          g.appendChild(Primitives.label({
            x: lx, y: ly, text: `${(lvl.value * 100).toFixed(1)}%`,
            color: '#fff', bg: lvl.color, align: 'center', anchor: 'middle',
            fontSize: 10,
          }));
        }
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const apex = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const pUp  = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    const pLo  = { x: ctx.projectX(this.points[2].time), y: ctx.projectY(this.points[2].price) };
    if ([apex.x, apex.y, pUp.x, pUp.y, pLo.x, pLo.y].some(v => v == null || !isFinite(v))) return false;
    const aUp = Math.atan2(pUp.y - apex.y, pUp.x - apex.x);
    let aLo = Math.atan2(pLo.y - apex.y, pLo.x - apex.x);
    let delta = aLo - aUp;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    for (const lvl of this.options.levels) {
      if (!lvl.enabled) continue;
      const angle = aUp + delta * (1 - lvl.value);
      const dx = Math.cos(angle), dy = Math.sin(angle);
      // distance from (x,y) to ray apex+t*(dx,dy), t>=0
      const t = (x - apex.x) * dx + (y - apex.y) * dy;
      if (t < 0) continue;
      const ix = apex.x + dx * t;
      const iy = apex.y + dy * t;
      if (Math.hypot(x - ix, y - iy) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 3) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null && isFinite(h.x));
  },
};
