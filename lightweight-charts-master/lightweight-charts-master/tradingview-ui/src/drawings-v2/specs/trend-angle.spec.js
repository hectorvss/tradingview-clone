import { Primitives } from '../core/primitives.js';

export default {
  type: 'trend-angle',
  label: 'Ángulo de tendencia',
  icon: '∠',
  category: 'lines',
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
    width: 2,
    style: 'solid',
    showAngle: true,
    showArc: true,
    angleFontSize: 14,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'angleFontSize', type: 'slider', label: 'Tamaño del ángulo', min: 10, max: 24, step: 1 },
    ],
    especifico: [
      { key: 'showAngle', type: 'toggle', label: 'Mostrar ángulo' },
      { key: 'showArc', type: 'toggle', label: 'Mostrar arco' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;

    // Línea base horizontal de referencia (rayo a la derecha desde p1)
    g.appendChild(Primitives.line({
      x1: p1.x, y1: p1.y, x2: ctx.width, y2: p1.y,
      stroke: opts.color, width: 1, opacity: 0.4,
      dashArray: '2,3',
    }));

    // Línea principal
    g.appendChild(Primitives.line({
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));

    const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angleDeg = -angleRad * 180 / Math.PI;

    if (opts.showArc) {
      const radius = Math.min(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.4);
      if (radius > 4) {
        const start = 0;
        const end = angleRad;
        g.appendChild(Primitives.arc({
          cx: p1.x, cy: p1.y, r: radius,
          startAngle: Math.min(start, end),
          endAngle: Math.max(start, end),
          stroke: opts.color, width: 1, opacity: 0.7,
        }));
      }
    }

    if (opts.showAngle) {
      const labelRadius = Math.min(60, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.5) + 16;
      const labelAngle = angleRad / 2;
      const lx = p1.x + Math.cos(labelAngle) * labelRadius;
      const ly = p1.y + Math.sin(labelAngle) * labelRadius;
      g.appendChild(Primitives.label({
        x: lx, y: ly,
        text: `${angleDeg.toFixed(1)}°`,
        bg: opts.color,
        color: '#ffffff',
        fontSize: opts.angleFontSize,
        align: 'center',
        anchor: 'middle',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return false;
    return pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y) < 6;
  },

  getHandles(ctx) {
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
