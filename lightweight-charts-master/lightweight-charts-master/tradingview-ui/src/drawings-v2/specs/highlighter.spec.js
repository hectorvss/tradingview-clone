import { Primitives } from '../core/primitives.js';

export default {
  type: 'highlighter',
  label: 'Marcador',
  icon: '⌇',
  category: 'brushes',
  pointsRequired: 'variable',
  creationMode: 'drag',
  cursorHint: { create: 'crosshair', hover: 'grab' },
  renderMode: 'canvas',
  behaviors: [
    'selectable',
    'draggable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    color: '#ffeb3b',
    width: 14,
    opacity: 0.4,
    smoothing: true,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 5, max: 30, step: 1 },
      { key: 'opacity', type: 'slider', label: 'Opacidad', min: 0.1, max: 0.8, step: 0.05 },
    ],
    especifico: [
      { key: 'smoothing', type: 'toggle', label: 'Suavizado' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    })).filter(p => p.x != null);
    if (pts.length < 2) return;
    const opts = this.options;
    const path = Primitives.el('path');
    path.setAttribute('d', opts.smoothing && pts.length >= 3
      ? smoothPath(pts)
      : linearPath(pts));
    path.setAttribute('stroke', opts.color);
    path.setAttribute('stroke-width', opts.width);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('opacity', opts.opacity);
    g.appendChild(path);
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    })).filter(p => p.x != null);
    const tol = Math.max(8, (this.options.width || 14) / 2);
    for (let i = 0; i < pts.length - 1; i++) {
      if (pointToSegmentDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < tol) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const pts = this.points;
    const last = pts.length - 1;
    return [
      { x: ctx.projectX(pts[0].time), y: ctx.projectY(pts[0].price), anchorIdx: 0 },
      { x: ctx.projectX(pts[last].time), y: ctx.projectY(pts[last].price), anchorIdx: last },
    ].filter(h => h.x != null);
  },
};

function linearPath(pts) {
  return `M ${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
}

function smoothPath(points) {
  if (points.length < 3) return linearPath(points);
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
