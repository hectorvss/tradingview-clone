import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Arrow — 2-point line with an arrowhead on one (or both) ends.
// Wraps Primitives.arrow which generates an <svg:marker> for the head.
// ---------------------------------------------------------------------------

export default {
  type: 'arrow',
  label: 'Flecha',
  icon: '→',
  category: 'arrows',
  pointsRequired: 2,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
    'contextMenuable',
  ],
  defaultOptions: {
    color: '#2962ff',
    width: 2,
    style: 'solid',
    arrowSize: 8,
    doubleArrow: false,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 6, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'arrowSize', type: 'slider', label: 'Tamaño de cabeza', min: 4, max: 20, step: 1 },
    ],
    especifico: [
      { key: 'doubleArrow', type: 'toggle', label: 'Cabeza en ambos extremos' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const p1 = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const p2 = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;

    g.appendChild(Primitives.arrow({
      from: p1, to: p2,
      stroke: opts.color, width: opts.width,
      headSize: opts.arrowSize,
      double: opts.doubleArrow,
      dashStyle: opts.style,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const p1 = { x: ctx.projectX(this.points[0].time), y: ctx.projectY(this.points[0].price) };
    const p2 = { x: ctx.projectX(this.points[1].time), y: ctx.projectY(this.points[1].price) };
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
