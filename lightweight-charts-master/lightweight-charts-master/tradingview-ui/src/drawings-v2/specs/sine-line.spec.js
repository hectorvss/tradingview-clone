import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Sine line — two anchors define amplitude (Δy / 2) and base period (Δx).
// Renders y = midY + amplitude * sin(2π * (x - x1) / period + phase)
// across the visible area beyond the anchors as well.
// ---------------------------------------------------------------------------

export default {
  type: 'sine-line',
  label: 'Línea senoidal',
  icon: '∿',
  category: 'cycles',
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
    opacity: 0.9,
    amplitudeMultiplier: 1,
    periodMultiplier: 1,
    phase: 0,
    extendLeft: true,
    extendRight: true,
    showGuides: false,
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
      { key: 'opacity', type: 'slider', label: 'Opacidad', min: 0.1, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'amplitudeMultiplier', type: 'slider', label: 'Multiplicador amplitud', min: 0.1, max: 5, step: 0.1 },
      { key: 'periodMultiplier', type: 'slider', label: 'Multiplicador período', min: 0.1, max: 5, step: 0.1 },
      { key: 'phase', type: 'slider', label: 'Fase (rad)', min: 0, max: 6.283, step: 0.05 },
      { key: 'extendLeft', type: 'toggle', label: 'Extender a la izquierda' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
      { key: 'showGuides', type: 'toggle', label: 'Mostrar guías' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const p1x = ctx.projectX(this.points[0].time);
    const p1y = ctx.projectY(this.points[0].price);
    const p2x = ctx.projectX(this.points[1].time);
    const p2y = ctx.projectY(this.points[1].price);
    if (p1x == null || p2x == null) return;

    const opts = this.options;
    const midY = (p1y + p2y) / 2;
    const amplitude = (Math.abs(p2y - p1y) / 2) * opts.amplitudeMultiplier;
    const basePeriod = Math.max(2, Math.abs(p2x - p1x));
    const period = basePeriod * opts.periodMultiplier;

    const W = ctx.width;
    const xStart = opts.extendLeft ? 0 : Math.min(p1x, p2x);
    const xEnd = opts.extendRight ? W : Math.max(p1x, p2x);
    const step = 2;

    const pts = [];
    for (let x = xStart; x <= xEnd; x += step) {
      const y = midY + amplitude * Math.sin(2 * Math.PI * ((x - p1x) / period) + opts.phase);
      pts.push({ x, y });
    }
    // Ensure last sample lands exactly on xEnd for crisp edges.
    if (pts.length === 0 || pts[pts.length - 1].x < xEnd) {
      const y = midY + amplitude * Math.sin(2 * Math.PI * ((xEnd - p1x) / period) + opts.phase);
      pts.push({ x: xEnd, y });
    }

    if (opts.showGuides) {
      // mid line
      g.appendChild(Primitives.line({
        x1: xStart, y1: midY, x2: xEnd, y2: midY,
        stroke: opts.color, width: 1, opacity: 0.3,
        dashArray: '2,4',
      }));
      // amplitude envelope
      g.appendChild(Primitives.line({
        x1: xStart, y1: midY - amplitude, x2: xEnd, y2: midY - amplitude,
        stroke: opts.color, width: 1, opacity: 0.2,
        dashArray: '2,4',
      }));
      g.appendChild(Primitives.line({
        x1: xStart, y1: midY + amplitude, x2: xEnd, y2: midY + amplitude,
        stroke: opts.color, width: 1, opacity: 0.2,
        dashArray: '2,4',
      }));
    }

    g.appendChild(Primitives.polyline({
      points: pts, stroke: opts.color, width: opts.width,
      opacity: opts.opacity,
      dashArray: Primitives.dashFromStyle(opts.style),
      fill: 'none',
    }));

    // Cache curve samples for hit-testing.
    this._samples = pts;
  },

  hitTest(x, y) {
    const pts = this._samples;
    if (!pts || pts.length < 2) return false;
    // Quick scan: find the two samples bracketing x and check segment distance.
    const step = pts[1].x - pts[0].x || 2;
    const idx = Math.floor((x - pts[0].x) / step);
    if (idx < 0 || idx >= pts.length - 1) return false;
    const a = pts[idx];
    const b = pts[idx + 1];
    return pointToSegmentDist(x, y, a.x, a.y, b.x, b.y) < 6;
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
