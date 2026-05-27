import { Primitives } from '../core/primitives.js';

// Fibonacci time zones: 2 points define unit bar spacing (x2 - x1 = 1 unit).
// Vertical lines are drawn at multiples of unit by Fibonacci numbers.
const FIB_SEQUENCE = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

export default {
  type: 'fib-time',
  label: 'Zonas de tiempo de Fibonacci',
  icon: 'F|t',
  category: 'fib',
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
    width: 1,
    style: 'solid',
    showLabels: true,
    labelPosition: 'top', // 'top' | 'bottom'
    sequence: FIB_SEQUENCE.slice(),
    fill: true,
    fillOpacity: 0.04,
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
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'labelPosition', type: 'select', label: 'Posición etiqueta', options: [
        { value: 'top', label: 'Arriba' },
        { value: 'bottom', label: 'Abajo' },
      ]},
      { key: 'fill', type: 'toggle', label: 'Bandas alternadas' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad banda', min: 0, max: 0.25, step: 0.01 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null || !isFinite(x1) || !isFinite(x2)) return;
    if (x1 === x2) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    const unit = x2 - x1; // pixels per "bar unit"
    const seq = opts.sequence && opts.sequence.length ? opts.sequence : FIB_SEQUENCE;

    // compute positions and clip those outside view (with margin)
    const xs = seq.map(n => ({ n, x: x1 + n * unit }))
                  .filter(p => p.x >= -50 && p.x <= ctx.width + 50);

    // alternating bands
    if (opts.fill && xs.length >= 2) {
      for (let i = 0; i < xs.length - 1; i++) {
        if (i % 2 !== 0) continue;
        const xa = Math.max(0, xs[i].x);
        const xb = Math.min(ctx.width, xs[i + 1].x);
        if (xb <= xa) continue;
        g.appendChild(Primitives.rect({
          x: xa, y: 0, w: xb - xa, h: ctx.height,
          fill: opts.color, stroke: 'none', alpha: opts.fillOpacity,
        }));
      }
    }

    for (const p of xs) {
      g.appendChild(Primitives.verticalLine({
        x: p.x, y1: 0, y2: ctx.height,
        stroke: opts.color, width: opts.width, dashArray: dash,
      }));
      if (opts.showLabels) {
        const y = opts.labelPosition === 'top' ? 12 : ctx.height - 12;
        g.appendChild(Primitives.label({
          x: p.x, y, text: String(p.n),
          color: '#fff', bg: opts.color, align: 'center', anchor: 'middle',
          fontSize: 10,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null) return false;
    if (x1 === x2) return false;
    const unit = x2 - x1;
    const seq = this.options.sequence && this.options.sequence.length ? this.options.sequence : FIB_SEQUENCE;
    for (const n of seq) {
      if (Math.abs(x - (x1 + n * unit)) < 5) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null && isFinite(h.x));
  },
};
