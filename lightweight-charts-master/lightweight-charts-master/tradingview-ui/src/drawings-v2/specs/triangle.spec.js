import { Primitives } from '../core/primitives.js';

export default {
  type: 'triangle',
  label: 'Triángulo',
  icon: '△',
  category: 'shapes',
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
    width: 2,
    style: 'solid',
    fillColor: '#2962ff',
    fillAlpha: 0.15,
    showArea: true,
    showAngles: false,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color del borde' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillColor', type: 'color', label: 'Color de relleno' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad de relleno', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'showArea', type: 'toggle', label: 'Mostrar área rellena' },
      { key: 'showAngles', type: 'toggle', label: 'Mostrar ángulos en vértices' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    g.appendChild(Primitives.polygon({
      points: pts,
      stroke: opts.color,
      width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
      fill: opts.showArea ? opts.fillColor : 'none',
      fillOpacity: opts.showArea ? opts.fillAlpha : 0,
    }));
    if (opts.showAngles) {
      for (let i = 0; i < 3; i++) {
        const a = pts[(i + 2) % 3];
        const b = pts[i];
        const c = pts[(i + 1) % 3];
        const v1 = { x: a.x - b.x, y: a.y - b.y };
        const v2 = { x: c.x - b.x, y: c.y - b.y };
        const cosT = (v1.x * v2.x + v1.y * v2.y) /
          ((Math.hypot(v1.x, v1.y) || 1) * (Math.hypot(v2.x, v2.y) || 1));
        const angle = Math.acos(Math.max(-1, Math.min(1, cosT))) * 180 / Math.PI;
        g.appendChild(Primitives.label({
          x: b.x, y: b.y - 14,
          text: angle.toFixed(1) + '°',
          color: '#fff', bg: opts.color,
          fontSize: 10,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    if (this.options.showArea && pointInTriangle(x, y, pts[0], pts[1], pts[2])) return true;
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      if (pointToSegmentDist(x, y, a.x, a.y, b.x, b.y) < 6) return true;
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

function pointInTriangle(px, py, a, b, c) {
  const d1 = sign(px, py, a, b);
  const d2 = sign(px, py, b, c);
  const d3 = sign(px, py, c, a);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function sign(px, py, a, b) {
  return (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y);
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
