import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Cyclic lines — two anchors define a period (distance between them).
// Vertical lines are drawn repeatedly at that period, extending both forward
// and backward across the visible chart area.
// ---------------------------------------------------------------------------

export default {
  type: 'cyclic-lines',
  label: 'Líneas cíclicas',
  icon: '|||',
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
    width: 1,
    style: 'dashed',
    opacity: 0.7,
    numCycles: 20,
    highlightAnchors: true,
    showLabels: false,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'opacity', type: 'slider', label: 'Opacidad', min: 0.1, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'numCycles', type: 'slider', label: 'Número de ciclos', min: 1, max: 100, step: 1 },
      { key: 'highlightAnchors', type: 'toggle', label: 'Resaltar anclas' },
      { key: 'showLabels', type: 'toggle', label: 'Mostrar índices' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null) return;
    const period = x2 - x1;
    if (Math.abs(period) < 1) return; // degenerate

    const opts = this.options;
    const W = ctx.width;
    const H = ctx.height;
    const N = Math.max(1, opts.numCycles | 0);
    const dash = Primitives.dashFromStyle(opts.style);

    // Draw N cycles in each direction from x1, clipped to viewport.
    for (let k = -N; k <= N; k++) {
      const x = x1 + k * period;
      if (x < -2 || x > W + 2) continue;

      const isAnchor = opts.highlightAnchors && (k === 0 || k === 1);
      g.appendChild(Primitives.line({
        x1: x, y1: 0, x2: x, y2: H,
        stroke: opts.color,
        width: isAnchor ? opts.width + 0.5 : opts.width,
        opacity: isAnchor ? Math.min(1, opts.opacity + 0.2) : opts.opacity,
        dashArray: isAnchor ? null : dash,
      }));

      if (opts.showLabels) {
        const t = Primitives.el('text');
        t.setAttribute('x', x + 3);
        t.setAttribute('y', 12);
        t.setAttribute('fill', opts.color);
        t.setAttribute('font-size', 10);
        t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
        t.setAttribute('opacity', opts.opacity);
        t.textContent = String(k);
        g.appendChild(t);
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null) return false;
    const period = x2 - x1;
    if (Math.abs(period) < 1) return false;
    // Hit any drawn vertical line within ±6px.
    const k = Math.round((x - x1) / period);
    const N = Math.max(1, (this.options.numCycles | 0));
    if (k < -N || k > N) return false;
    const lineX = x1 + k * period;
    return Math.abs(x - lineX) < 6;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const H = ctx.height;
    return this.points.map((p, i) => {
      const x = ctx.projectX(p.time);
      const y = ctx.projectY(p.price);
      if (x == null) return null;
      return { x, y: y != null ? y : H / 2, anchorIdx: i };
    }).filter(Boolean);
  },
};
