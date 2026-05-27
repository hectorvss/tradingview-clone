// drawings-v2/specs/gann-grid.spec.js
// Gann Grid — simple rectangular grid between two anchor points with a
// configurable NxN division (3, 4, 5, 6, 7, 8, 12).
import { Primitives } from '../core/primitives.js';

const GRID_SIZES = [3, 4, 5, 6, 7, 8, 12];

export default {
  type: 'gann-grid',
  label: 'Cuadrícula de Gann',
  icon: 'GG',
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
    color: '#787b86',
    accentColor: '#2962ff',
    width: 1,
    style: 'solid',
    divisions: 4,
    showDiagonals: true,
    showFill: false,
    fillAlpha: 0.03,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color cuadrícula' },
      { key: 'accentColor', type: 'color', label: 'Color borde/diagonal' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 3, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 0.3, step: 0.01 },
    ],
    especifico: [
      { key: 'divisions', type: 'select', label: 'Divisiones (NxN)',
        options: GRID_SIZES.map(n => ({ value: n, label: `${n} x ${n}` })) },
      { key: 'showDiagonals', type: 'toggle', label: 'Mostrar diagonales' },
      { key: 'showFill', type: 'toggle', label: 'Mostrar relleno' },
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
    const [p1, p2] = pts;
    const x1 = Math.min(p1.x, p2.x);
    const x2 = Math.max(p1.x, p2.x);
    const y1 = Math.min(p1.y, p2.y);
    const y2 = Math.max(p1.y, p2.y);
    const w = x2 - x1;
    const h = y2 - y1;
    if (w <= 0 || h <= 0) return;
    const dash = Primitives.dashFromStyle(opts.style);
    const N = clampDivisions(opts.divisions);
    const cw = w / N;
    const ch = h / N;

    if (opts.showFill) {
      g.appendChild(Primitives.rect({
        x: x1, y: y1, w, h,
        fill: opts.accentColor || '#2962ff',
        alpha: opts.fillAlpha,
        stroke: 'none',
      }));
    }

    // Outer border
    g.appendChild(Primitives.rect({
      x: x1, y: y1, w, h,
      fill: 'none',
      stroke: opts.accentColor || '#2962ff',
      width: opts.width + 0.5,
      dashArray: dash,
    }));

    // Interior grid lines
    for (let i = 1; i < N; i++) {
      const x = x1 + i * cw;
      const y = y1 + i * ch;
      g.appendChild(Primitives.line({
        x1: x, y1, x2: x, y2,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.75,
      }));
      g.appendChild(Primitives.line({
        x1, y1: y, x2, y2: y,
        stroke: opts.color, width: opts.width, dashArray: dash, opacity: 0.75,
      }));
    }

    if (opts.showDiagonals) {
      g.appendChild(Primitives.line({
        x1, y1, x2, y2,
        stroke: opts.accentColor, width: opts.width, opacity: 0.85,
      }));
      g.appendChild(Primitives.line({
        x1, y1: y2, x2, y2: y1,
        stroke: opts.accentColor, width: opts.width, opacity: 0.85,
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [p1, p2] = pts;
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
    const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
    return x >= x1 - 4 && x <= x2 + 4 && y >= y1 - 4 && y <= y2 + 4;
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

function clampDivisions(n) {
  const v = parseInt(n, 10);
  if (!GRID_SIZES.includes(v)) return 4;
  return v;
}
