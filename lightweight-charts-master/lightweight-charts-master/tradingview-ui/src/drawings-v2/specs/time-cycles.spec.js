import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Time cycles — two anchors define a base radius (Euclidean distance
// between them). Concentric circles are drawn at multiples taken from a
// configurable sequence (Fibonacci by default).
// ---------------------------------------------------------------------------

const SEQUENCES = {
  fibonacci: [1, 2, 3, 5, 8, 13, 21],
  natural:   [1, 2, 3, 4, 5, 6, 7, 8],
  square:    [1, 2, 4, 8, 16],
  pi:        [1, 3.14, 6.28, 9.42, 12.56],
};

export default {
  type: 'time-cycles',
  label: 'Ciclos temporales',
  icon: '◎',
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
    style: 'solid',
    opacity: 0.8,
    sequence: 'fibonacci',
    fillCircles: false,
    fillAlpha: 0.05,
    showLabels: true,
    showCenter: true,
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
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 0.5, step: 0.01 },
    ],
    especifico: [
      { key: 'sequence', type: 'select', label: 'Secuencia', options: [
        { value: 'fibonacci', label: 'Fibonacci' },
        { value: 'natural', label: 'Natural (1,2,3…)' },
        { value: 'square', label: 'Potencias de 2' },
        { value: 'pi', label: 'Múltiplos de π' },
      ]},
      { key: 'fillCircles', type: 'toggle', label: 'Rellenar círculos' },
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'showCenter', type: 'toggle', label: 'Marcar centro' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const cx = ctx.projectX(this.points[0].time);
    const cy = ctx.projectY(this.points[0].price);
    const px = ctx.projectX(this.points[1].time);
    const py = ctx.projectY(this.points[1].price);
    if (cx == null || px == null) return;

    const r = Math.hypot(px - cx, py - cy);
    if (r < 1) return;

    const opts = this.options;
    const seq = SEQUENCES[opts.sequence] || SEQUENCES.fibonacci;
    const dash = Primitives.dashFromStyle(opts.style);

    for (let i = 0; i < seq.length; i++) {
      const radius = r * seq[i];
      // Skip circles that are entirely outside the viewport for efficiency.
      if (radius > ctx.width + ctx.height) continue;
      g.appendChild(Primitives.circle({
        cx, cy, r: radius,
        stroke: opts.color, width: opts.width, opacity: opts.opacity,
        fill: opts.fillCircles ? opts.color : 'none',
        alpha: opts.fillCircles ? opts.fillAlpha : 0,
        dashArray: dash,
      }));
      if (opts.showLabels) {
        const t = Primitives.el('text');
        t.setAttribute('x', cx + radius + 4);
        t.setAttribute('y', cy);
        t.setAttribute('fill', opts.color);
        t.setAttribute('font-size', 10);
        t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('opacity', opts.opacity);
        t.textContent = String(seq[i]);
        g.appendChild(t);
      }
    }

    if (opts.showCenter) {
      g.appendChild(Primitives.circle({
        cx, cy, r: 3,
        fill: opts.color, stroke: '#fff', width: 1, opacity: 1,
      }));
    }

    this._cx = cx; this._cy = cy; this._r = r; this._seq = seq;
  },

  hitTest(x, y) {
    if (this._cx == null) return false;
    const d = Math.hypot(x - this._cx, y - this._cy);
    // Hit any concentric ring within ±5px.
    for (const k of this._seq) {
      if (Math.abs(d - this._r * k) < 5) return true;
    }
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
