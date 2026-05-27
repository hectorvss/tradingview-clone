import { Primitives } from '../core/primitives.js';

export default {
  type: 'disjoint-channel',
  label: 'Canal disjunto',
  icon: '⬡',
  category: 'channels',
  pointsRequired: 4,
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
    fillAlpha: 0.12,
    fillBetween: true,
    showLabels: false,
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
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'fillBetween', type: 'toggle', label: 'Rellenar canal' },
      { key: 'showLabels', type: 'toggle', label: 'Etiquetas de precio' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 4) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    // Convención: p1,p2 = línea superior;  p3,p4 = línea inferior
    // Polígono se cierra como p1→p2→p3→p4 → p1
    const [a, b, c, d] = pts;
    if (opts.fillBetween) {
      g.appendChild(Primitives.polygon({
        points: [a, b, c, d],
        fill: opts.fillColor,
        alpha: opts.fillAlpha,
        stroke: 'none', width: 0,
      }));
    }
    // Top line p1-p2
    g.appendChild(Primitives.line({
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));
    // Right side p2-p3
    g.appendChild(Primitives.line({
      x1: b.x, y1: b.y, x2: c.x, y2: c.y,
      stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.5,
    }));
    // Bottom p3-p4
    g.appendChild(Primitives.line({
      x1: c.x, y1: c.y, x2: d.x, y2: d.y,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));
    // Left side p4-p1
    g.appendChild(Primitives.line({
      x1: d.x, y1: d.y, x2: a.x, y2: a.y,
      stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.5,
    }));
    if (opts.showLabels) {
      for (let i = 0; i < 4; i++) {
        g.appendChild(Primitives.priceLabel({
          y: pts[i].y, price: this.points[i].price,
          color: opts.color, axis: 'right',
          viewBox: { w: ctx.width },
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 4) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [a, b, c, d] = pts;
    if (pointToSegmentDist(x, y, a.x, a.y, b.x, b.y) < 6) return true;
    if (pointToSegmentDist(x, y, b.x, b.y, c.x, c.y) < 6) return true;
    if (pointToSegmentDist(x, y, c.x, c.y, d.x, d.y) < 6) return true;
    if (pointToSegmentDist(x, y, d.x, d.y, a.x, a.y) < 6) return true;
    if (this.options.fillBetween && pointInPolygon(x, y, [a, b, c, d])) return true;
    return false;
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

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
