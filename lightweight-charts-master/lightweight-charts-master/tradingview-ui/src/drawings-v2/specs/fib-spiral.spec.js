import { Primitives } from '../core/primitives.js';

// Logarithmic (golden) spiral: r(theta) = a * phi^(theta / (pi/2))
// 2 points: center + reference radius/angle.
// Rendered as a polyline path (200 segments) — light enough for SVG;
// renderMode 'canvas' is supported by the engine for heavier shapes.
const PHI = 1.6180339887498949;
const SEGMENTS = 200;
const TURNS = 4; // total winding count

export default {
  type: 'fib-spiral',
  label: 'Espiral de Fibonacci',
  icon: 'F✺',
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
  renderMode: 'canvas',
  defaultOptions: {
    color: '#2962ff',
    width: 1.5,
    style: 'solid',
    direction: 'ccw', // 'ccw' | 'cw'
    showCenter: true,
    fill: false,
    fillOpacity: 0.05,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 0.5 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'direction', type: 'select', label: 'Dirección', options: [
        { value: 'ccw', label: 'Antihoraria' },
        { value: 'cw', label: 'Horaria' },
      ]},
      { key: 'showCenter', type: 'toggle', label: 'Mostrar centro' },
      { key: 'fill', type: 'toggle', label: 'Rellenar interior' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.25, step: 0.01 },
    ],
    coord: 'auto',
  },

  _computePoints(ctx) {
    if (this.points.length < 2) return null;
    const c = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const r = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if ([c.x, c.y, r.x, r.y].some(v => v == null || !isFinite(v))) return null;
    const baseR = Math.hypot(r.x - c.x, r.y - c.y);
    if (baseR < 1) return null;
    const theta0 = Math.atan2(r.y - c.y, r.x - c.x);
    const dir = this.options.direction === 'cw' ? -1 : 1;
    // growth factor: r doubles by phi every quarter turn
    const k = Math.log(PHI) / (Math.PI / 2);
    const pts = new Array(SEGMENTS + 1);
    const totalAngle = TURNS * 2 * Math.PI;
    // anchor so that at t=0 spiral passes through r
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const dtheta = dir * t * totalAngle;
      const theta = theta0 + dtheta;
      const rad = baseR * Math.exp(k * dtheta);
      pts[i] = { x: c.x + Math.cos(theta) * rad, y: c.y + Math.sin(theta) * rad };
    }
    return { c, r, baseR, pts };
  },

  render(g, ctx) {
    const data = this._computePoints(ctx);
    if (!data) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    if (opts.fill) {
      g.appendChild(Primitives.polygon({
        points: data.pts.concat([{ x: data.c.x, y: data.c.y }]),
        fill: opts.color, stroke: 'none', alpha: opts.fillOpacity,
      }));
    }

    g.appendChild(Primitives.polyline({
      points: data.pts,
      stroke: opts.color, width: opts.width, dashArray: dash, fill: 'none',
    }));

    if (opts.showCenter) {
      g.appendChild(Primitives.circle({
        cx: data.c.x, cy: data.c.y, r: 2.5,
        fill: opts.color, stroke: 'none',
      }));
    }
  },

  hitTest(x, y, ctx) {
    const data = this._computePoints(ctx);
    if (!data) return false;
    // sample a coarser polyline for hit test
    const step = 4;
    for (let i = 0; i < data.pts.length - step; i += step) {
      const a = data.pts[i];
      const b = data.pts[i + step];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
      const ix = a.x + t * dx, iy = a.y + t * dy;
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
