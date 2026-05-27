import { Primitives } from '../core/primitives.js';

export default {
  type: 'rotated-rectangle',
  label: 'Rectángulo rotado',
  icon: '◰',
  category: 'shapes',
  pointsRequired: 3,
  cursorHint: { rotateHandle: 'grab' },
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
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const [p1, p2, p3] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null || p3.x == null) return;
    const opts = this.options;
    const geom = computeRotatedRect(p1, p2, p3);
    const poly = Primitives.polygon({
      points: geom.corners,
      stroke: opts.color,
      width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
      fill: opts.showArea ? opts.fillColor : 'none',
      fillOpacity: opts.showArea ? opts.fillAlpha : 0,
    });
    g.appendChild(poly);
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const [p1, p2, p3] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null || p3.x == null) return false;
    const geom = computeRotatedRect(p1, p2, p3);
    if (this.options.showArea && pointInPolygon(x, y, geom.corners)) return true;
    for (let i = 0; i < 4; i++) {
      const a = geom.corners[i], b = geom.corners[(i + 1) % 4];
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

function computeRotatedRect(p1, p2, p3) {
  const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const angle = Math.atan2(p3.y - center.y, p3.x - center.x);
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  // unrotate p1, p2 around center
  const u1 = rotateAround(p1, center, cosA, sinA);
  const u2 = rotateAround(p2, center, cosA, sinA);
  const minX = Math.min(u1.x, u2.x);
  const maxX = Math.max(u1.x, u2.x);
  const minY = Math.min(u1.y, u2.y);
  const maxY = Math.max(u1.y, u2.y);
  const localCorners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  const cosB = Math.cos(angle);
  const sinB = Math.sin(angle);
  const corners = localCorners.map(c => rotateAround(c, center, cosB, sinB));
  return { center, angle, corners };
}

function rotateAround(p, center, cosA, sinA) {
  const dx = p.x - center.x, dy = p.y - center.y;
  return {
    x: center.x + dx * cosA - dy * sinA,
    y: center.y + dx * sinA + dy * cosA,
  };
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
