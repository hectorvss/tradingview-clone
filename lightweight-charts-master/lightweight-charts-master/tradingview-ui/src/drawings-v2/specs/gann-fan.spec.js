// drawings-v2/specs/gann-fan.spec.js
// Gann Fan — pivot (P1) + reference point (P2) define a unit;
// 9 classic Gann angles radiate from the pivot in screen space.
// Each angle is independently colorable and toggleable.
import { Primitives } from '../core/primitives.js';

const GANN_ANGLES = [
  { label: '1x8', dx: 1, dy: 8, color: '#f23645' },
  { label: '1x4', dx: 1, dy: 4, color: '#ff9800' },
  { label: '1x3', dx: 1, dy: 3, color: '#ffeb3b' },
  { label: '1x2', dx: 1, dy: 2, color: '#4caf50' },
  { label: '1x1', dx: 1, dy: 1, color: '#2962ff' },
  { label: '2x1', dx: 2, dy: 1, color: '#4caf50' },
  { label: '3x1', dx: 3, dy: 1, color: '#ffeb3b' },
  { label: '4x1', dx: 4, dy: 1, color: '#ff9800' },
  { label: '8x1', dx: 8, dy: 1, color: '#f23645' },
];

export default {
  type: 'gann-fan',
  label: 'Abanico de Gann',
  icon: 'GF',
  category: 'gann',
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
    width: 1,
    style: 'solid',
    showLabels: true,
    showFill: false,
    fillAlpha: 0.04,
    angles: GANN_ANGLES.map(a => ({ ...a, enabled: true })),
  },
  schema: {
    estilo: [
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.3, step: 0.01 },
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'showFill', type: 'toggle', label: 'Rellenar entre rayos' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const [pivot, ref] = pts;
    const ux = Math.abs(ref.x - pivot.x);
    const uy = Math.abs(ref.y - pivot.y);
    if (ux < 0.5 || uy < 0.5) return;
    // direction signs (which quadrant the fan opens into)
    const sx = ref.x >= pivot.x ? 1 : -1;
    const sy = ref.y >= pivot.y ? 1 : -1;
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };
    const angles = opts.angles && opts.angles.length ? opts.angles : GANN_ANGLES;

    // The 1x1 diagonal corresponds to the unit defined by (ux,uy).
    // For an angle dx:dy we want a slope (sy * uy * dy) / (sx * ux * dx).
    for (const ang of angles) {
      if (ang.enabled === false) continue;
      const dirX = sx * ux * ang.dx;
      const dirY = sy * uy * ang.dy;
      g.appendChild(Primitives.ray({
        origin: pivot,
        direction: { dx: dirX, dy: dirY },
        viewBox: vb,
        stroke: ang.color,
        width: ang.label === '1x1' ? opts.width + 0.5 : opts.width,
        dashArray: dash,
        opacity: ang.label === '1x1' ? 1 : 0.85,
      }));
      if (opts.showLabels) {
        // Label slightly along the ray (15% of the way to the edge)
        const t = 0.15;
        const end = endOnViewBox(pivot, dirX, dirY, vb);
        const lx = pivot.x + (end.x - pivot.x) * t;
        const ly = pivot.y + (end.y - pivot.y) * t;
        g.appendChild(Primitives.label({
          x: lx, y: ly, text: ang.label,
          color: '#fff', bg: ang.color,
          fontSize: 10, align: 'center', anchor: 'middle',
        }));
      }
    }

    // Pivot marker
    g.appendChild(Primitives.circle({
      cx: pivot.x, cy: pivot.y, r: 3,
      fill: '#fff', stroke: '#2962ff', width: 1.5,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [pivot, ref] = pts;
    const ux = Math.abs(ref.x - pivot.x);
    const uy = Math.abs(ref.y - pivot.y);
    if (ux < 0.5 || uy < 0.5) return false;
    const sx = ref.x >= pivot.x ? 1 : -1;
    const sy = ref.y >= pivot.y ? 1 : -1;
    const angles = this.options.angles && this.options.angles.length ? this.options.angles : GANN_ANGLES;
    const vb = { w: ctx.width, h: ctx.height };
    for (const ang of angles) {
      if (ang.enabled === false) continue;
      const dx = sx * ux * ang.dx;
      const dy = sy * uy * ang.dy;
      const end = endOnViewBox(pivot, dx, dy, vb);
      if (pointToSegmentDist(x, y, pivot.x, pivot.y, end.x, end.y) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function endOnViewBox(origin, dx, dy, vb) {
  let tMax = Infinity;
  if (dx > 0) tMax = Math.min(tMax, (vb.w - origin.x) / dx);
  else if (dx < 0) tMax = Math.min(tMax, (0 - origin.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (vb.h - origin.y) / dy);
  else if (dy < 0) tMax = Math.min(tMax, (0 - origin.y) / dy);
  if (!isFinite(tMax) || tMax < 0) tMax = 0;
  return { x: origin.x + dx * tMax, y: origin.y + dy * tMax };
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
