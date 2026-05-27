// drawings-v2/specs/gann-square.spec.js
// Gann Square (Square of 9 reference grid) — two anchor points define a
// forced square (side = max(|dx|,|dy|)). A 9x9 grid is drawn with major
// lines every 3 cells, both diagonals and a center marker.
import { Primitives } from '../core/primitives.js';

export default {
  type: 'gann-square',
  label: 'Cuadrado de Gann (9)',
  icon: 'G9',
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
    color: '#2962ff',
    majorColor: '#2962ff',
    minorColor: '#787b86',
    diagonalColor: '#f23645',
    width: 1,
    style: 'solid',
    showGrid: true,
    showDiagonals: true,
    showCenter: true,
    showFill: true,
    fillAlpha: 0.04,
  },
  schema: {
    estilo: [
      { key: 'majorColor', type: 'color', label: 'Color líneas mayores' },
      { key: 'minorColor', type: 'color', label: 'Color líneas menores' },
      { key: 'diagonalColor', type: 'color', label: 'Color diagonales' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 3, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 0.3, step: 0.01 },
    ],
    especifico: [
      { key: 'showGrid', type: 'toggle', label: 'Mostrar cuadrícula 9x9' },
      { key: 'showDiagonals', type: 'toggle', label: 'Mostrar diagonales' },
      { key: 'showCenter', type: 'toggle', label: 'Marcar centro' },
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
    const sx = p2.x >= p1.x ? 1 : -1;
    const sy = p2.y >= p1.y ? 1 : -1;
    const side = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    if (side < 4) return;
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = x1 + sx * side;
    const y2 = y1 + sy * side;
    const bx = Math.min(x1, x2);
    const by = Math.min(y1, y2);
    const dash = Primitives.dashFromStyle(opts.style);
    const N = 9;
    const cell = side / N;

    // Fill
    if (opts.showFill) {
      g.appendChild(Primitives.rect({
        x: bx, y: by, w: side, h: side,
        fill: opts.majorColor || '#2962ff',
        alpha: opts.fillAlpha,
        stroke: 'none',
      }));
    }

    // Outer border
    g.appendChild(Primitives.rect({
      x: bx, y: by, w: side, h: side,
      fill: 'none',
      stroke: opts.majorColor || '#2962ff',
      width: opts.width + 0.5,
      dashArray: dash,
    }));

    // Grid
    if (opts.showGrid) {
      for (let i = 1; i < N; i++) {
        const isMajor = i % 3 === 0;
        const stroke = isMajor ? opts.majorColor : opts.minorColor;
        const w = isMajor ? opts.width : Math.max(0.5, opts.width - 0.25);
        const opacity = isMajor ? 0.9 : 0.55;
        const x = bx + i * cell;
        const y = by + i * cell;
        g.appendChild(Primitives.line({
          x1: x, y1: by, x2: x, y2: by + side,
          stroke, width: w, dashArray: dash, opacity,
        }));
        g.appendChild(Primitives.line({
          x1: bx, y1: y, x2: bx + side, y2: y,
          stroke, width: w, dashArray: dash, opacity,
        }));
      }
    }

    // Diagonals
    if (opts.showDiagonals) {
      g.appendChild(Primitives.line({
        x1: bx, y1: by, x2: bx + side, y2: by + side,
        stroke: opts.diagonalColor, width: opts.width, opacity: 0.9,
      }));
      g.appendChild(Primitives.line({
        x1: bx, y1: by + side, x2: bx + side, y2: by,
        stroke: opts.diagonalColor, width: opts.width, opacity: 0.9,
      }));
    }

    // Center marker
    if (opts.showCenter) {
      const cx = bx + side / 2;
      const cy = by + side / 2;
      g.appendChild(Primitives.circle({
        cx, cy, r: 4,
        fill: '#fff', stroke: opts.diagonalColor, width: 1.5,
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
    const sx = p2.x >= p1.x ? 1 : -1;
    const sy = p2.y >= p1.y ? 1 : -1;
    const side = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    const x1 = p1.x, x2 = x1 + sx * side;
    const y1 = p1.y, y2 = y1 + sy * side;
    const bx = Math.min(x1, x2), by = Math.min(y1, y2);
    return x >= bx - 4 && x <= bx + side + 4 && y >= by - 4 && y <= by + side + 4;
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
