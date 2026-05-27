// drawings-v2/specs/gann-square144.spec.js
// Gann Square 144 — variant of the Square of 9: 12x12 = 144 cells.
// Adds both diagonals and concentric sub-squares at 1/4, 1/2 and 3/4
// (i.e. 36 / 72 / 108 cell sub-squares) centered on the box.
import { Primitives } from '../core/primitives.js';

export default {
  type: 'gann-square-144',
  label: 'Cuadrado de Gann 144',
  icon: 'G144',
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
    majorColor: '#2962ff',
    minorColor: '#787b86',
    diagonalColor: '#f23645',
    subSquareColor: '#9c27b0',
    width: 1,
    style: 'solid',
    showGrid: true,
    showDiagonals: true,
    showSubSquares: true,
    showFill: true,
    fillAlpha: 0.03,
  },
  schema: {
    estilo: [
      { key: 'majorColor', type: 'color', label: 'Líneas mayores (4)' },
      { key: 'minorColor', type: 'color', label: 'Líneas menores' },
      { key: 'diagonalColor', type: 'color', label: 'Diagonales' },
      { key: 'subSquareColor', type: 'color', label: 'Sub-cuadrados' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 3, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 0.3, step: 0.01 },
    ],
    especifico: [
      { key: 'showGrid', type: 'toggle', label: 'Mostrar cuadrícula 12x12' },
      { key: 'showDiagonals', type: 'toggle', label: 'Mostrar diagonales' },
      { key: 'showSubSquares', type: 'toggle', label: 'Sub-cuadrados concéntricos' },
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
    if (side < 6) return;
    const x1 = p1.x, y1 = p1.y;
    const x2 = x1 + sx * side, y2 = y1 + sy * side;
    const bx = Math.min(x1, x2);
    const by = Math.min(y1, y2);
    const dash = Primitives.dashFromStyle(opts.style);
    const N = 12;
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

    // Grid 12x12 with majors every 4
    if (opts.showGrid) {
      for (let i = 1; i < N; i++) {
        const isMajor = i % 4 === 0;
        const stroke = isMajor ? opts.majorColor : opts.minorColor;
        const w = isMajor ? opts.width : Math.max(0.5, opts.width - 0.25);
        const opacity = isMajor ? 0.85 : 0.45;
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

    // Concentric sub-squares (50% center, 25% & 75% rings)
    if (opts.showSubSquares) {
      const fractions = [0.25, 0.5, 0.75];
      for (const f of fractions) {
        const sub = side * f;
        const ox = bx + (side - sub) / 2;
        const oy = by + (side - sub) / 2;
        g.appendChild(Primitives.rect({
          x: ox, y: oy, w: sub, h: sub,
          fill: 'none',
          stroke: opts.subSquareColor,
          width: opts.width,
          dashArray: '4,3',
          opacity: 0.8,
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
    const cx = bx + side / 2;
    const cy = by + side / 2;
    g.appendChild(Primitives.circle({
      cx, cy, r: 3,
      fill: '#fff', stroke: opts.diagonalColor, width: 1.5,
    }));
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
