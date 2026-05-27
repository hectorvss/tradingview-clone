import { Primitives } from '../core/primitives.js';

export default {
  type: 'polyline',
  label: 'Polilínea',
  icon: '⟋',
  category: 'brushes',
  pointsRequired: 'variable',
  creationMode: 'click',
  finishOn: ['dblclick', 'escape'],
  renderMode: 'canvas',
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
    closePath: false,
    fillColor: '#2962ff',
    fillAlpha: 0.15,
    showArea: false,
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
      { key: 'fillColor', type: 'color', label: 'Color de relleno' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad de relleno', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'closePath', type: 'toggle', label: 'Cerrar polígono' },
      { key: 'showArea', type: 'toggle', label: 'Mostrar área rellena (requiere cerrado)' },
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
    if (opts.closePath && pts.length >= 3) {
      g.appendChild(Primitives.polygon({
        points: pts,
        stroke: opts.color,
        width: opts.width,
        dashArray: Primitives.dashFromStyle(opts.style),
        fill: opts.showArea ? opts.fillColor : 'none',
        fillOpacity: opts.showArea ? opts.fillAlpha : 0,
      }));
    } else {
      g.appendChild(Primitives.polyline({
        points: pts,
        stroke: opts.color,
        width: opts.width,
        dashArray: Primitives.dashFromStyle(opts.style),
        fill: 'none',
        lineJoin: 'round',
        lineCap: 'round',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    })).filter(p => p.x != null);
    const opts = this.options;
    if (opts.closePath && opts.showArea && pts.length >= 3 && pointInPolygon(x, y, pts)) return true;
    const n = pts.length;
    const lim = opts.closePath ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (pointToSegmentDist(x, y, a.x, a.y, b.x, b.y) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

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
