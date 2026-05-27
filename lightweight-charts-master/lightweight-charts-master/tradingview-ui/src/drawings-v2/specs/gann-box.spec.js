// drawings-v2/specs/gann-box.spec.js
// Gann Box — two opposite corners define a rectangle; renders
// fibonacci-style horizontal & vertical level lines plus the two
// diagonals. Each level is independently colorable and toggleable.
import { Primitives } from '../core/primitives.js';

const DEFAULT_LEVELS = [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1];
const DEFAULT_COLORS = [
  '#787b86', // 0
  '#f23645', // 0.25
  '#ff9800', // 0.382
  '#4caf50', // 0.5
  '#2962ff', // 0.618
  '#9c27b0', // 0.75
  '#787b86', // 1
];

export default {
  type: 'gann-box',
  label: 'Caja de Gann',
  icon: 'GB',
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
    showHorizontals: true,
    showVerticals: true,
    showDiagonals: true,
    showLabels: true,
    showFill: true,
    fillAlpha: 0.04,
    fillColor: '#2962ff',
    backgroundColor: '#2962ff',
    levels: DEFAULT_LEVELS.slice(),
    colors: DEFAULT_COLORS.slice(),
  },
  schema: {
    estilo: [
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillColor', type: 'color', label: 'Color de fondo' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 0.4, step: 0.01 },
    ],
    especifico: [
      { key: 'showHorizontals', type: 'toggle', label: 'Niveles horizontales' },
      { key: 'showVerticals', type: 'toggle', label: 'Niveles verticales' },
      { key: 'showDiagonals', type: 'toggle', label: 'Diagonales' },
      { key: 'showLabels', type: 'toggle', label: 'Etiquetas' },
      { key: 'showFill', type: 'toggle', label: 'Relleno' },
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
    const levels = opts.levels || DEFAULT_LEVELS;
    const colors = opts.colors || DEFAULT_COLORS;

    // Background fill
    if (opts.showFill) {
      g.appendChild(Primitives.rect({
        x: x1, y: y1, w, h,
        fill: opts.fillColor || '#2962ff',
        alpha: opts.fillAlpha,
        stroke: 'none',
      }));
    }

    // Outer border
    g.appendChild(Primitives.rect({
      x: x1, y: y1, w, h,
      fill: 'none',
      stroke: colors[0] || '#787b86',
      width: opts.width,
      dashArray: dash,
    }));

    // Horizontal levels
    if (opts.showHorizontals) {
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        if (lvl === 0 || lvl === 1) continue;
        const y = y1 + h * lvl;
        const color = colors[i % colors.length];
        g.appendChild(Primitives.line({
          x1, y1: y, x2, y2: y,
          stroke: color, width: opts.width, dashArray: dash, opacity: 0.85,
        }));
        if (opts.showLabels) {
          g.appendChild(Primitives.label({
            x: x1 + 4, y, text: (lvl * 100).toFixed(1) + '%',
            color: '#fff', bg: color, align: 'left', anchor: 'middle',
            fontSize: 10,
          }));
        }
      }
    }

    // Vertical levels (time-Fibs across the box)
    if (opts.showVerticals) {
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        if (lvl === 0 || lvl === 1) continue;
        const x = x1 + w * lvl;
        const color = colors[i % colors.length];
        g.appendChild(Primitives.line({
          x1: x, y1, x2: x, y2,
          stroke: color, width: opts.width, dashArray: dash, opacity: 0.85,
        }));
        if (opts.showLabels) {
          g.appendChild(Primitives.label({
            x, y: y1 + 8, text: (lvl * 100).toFixed(0) + '%',
            color: '#fff', bg: color, align: 'center', anchor: 'top',
            fontSize: 10,
          }));
        }
      }
    }

    // Diagonals
    if (opts.showDiagonals) {
      const diagColor = colors[4] || '#2962ff';
      g.appendChild(Primitives.line({
        x1, y1, x2, y2: y2,
        stroke: diagColor, width: opts.width, dashArray: dash, opacity: 0.9,
      }));
      g.appendChild(Primitives.line({
        x1, y1: y2, x2, y2: y1,
        stroke: diagColor, width: opts.width, dashArray: dash, opacity: 0.9,
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
    const onEdge =
      (Math.abs(y - y1) < 6 && x >= x1 - 6 && x <= x2 + 6) ||
      (Math.abs(y - y2) < 6 && x >= x1 - 6 && x <= x2 + 6) ||
      (Math.abs(x - x1) < 6 && y >= y1 - 6 && y <= y2 + 6) ||
      (Math.abs(x - x2) < 6 && y >= y1 - 6 && y <= y2 + 6);
    if (onEdge) return true;
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const pts = this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
    if (pts.length < 2) return pts;
    // Add the other two corners as visual handles (not anchor-bound)
    const [a, b] = pts;
    return [
      a,
      b,
      { x: a.x, y: b.y, anchorIdx: -1 },
      { x: b.x, y: a.y, anchorIdx: -1 },
    ];
  },
};
