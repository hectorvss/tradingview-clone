import { Primitives } from '../core/primitives.js';

const LABELS = ['A', 'B', 'C', 'D', 'E'];

export default {
  type: 'elliott-triangle',
  label: 'Onda de Elliott — Triángulo',
  icon: '△',
  category: 'elliott',
  pointsRequired: 5,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    color: '#9c27b0',
    invalidColor: '#f23645',
    convergeColor: '#787b86',
    lineWidth: 2,
    labelFontSize: 12,
    showLabels: true,
    validateRules: true,
    showConvergence: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'invalidColor', type: 'color', label: 'Color inválido' },
      { key: 'convergeColor', type: 'color', label: 'Color convergencia' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas A-E' },
      { key: 'validateRules', type: 'toggle', label: 'Validar reglas' },
      { key: 'showConvergence', type: 'toggle', label: 'Mostrar líneas convergencia' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    let valid = true;
    let reason = '';
    if (opts.validateRules && this.points.length >= 5) {
      const prices = this.points.map(p => p.price);
      // contracting triangle: highs descending, lows ascending
      // Tops are at A,C,E or B,D depending on direction
      const direction = prices[1] >= prices[0] ? 1 : -1;
      let tops, bots;
      if (direction > 0) {
        tops = [prices[1], prices[3]];
        bots = [prices[0], prices[2], prices[4]];
      } else {
        tops = [prices[0], prices[2], prices[4]];
        bots = [prices[1], prices[3]];
      }
      const topsDesc = tops.every((v, i, a) => i === 0 || v <= a[i - 1]);
      const botsAsc = bots.every((v, i, a) => i === 0 || v >= a[i - 1]);
      if (!topsDesc) { valid = false; reason = 'Topes no descienden'; }
      else if (!botsAsc) { valid = false; reason = 'Suelos no ascienden'; }
    }
    const strokeColor = valid ? opts.color : opts.invalidColor;

    for (let i = 0; i < pts.length - 1; i++) {
      g.appendChild(Primitives.line({
        x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
        stroke: strokeColor, width: opts.lineWidth, dashArray: dash,
      }));
    }

    if (opts.showConvergence && this.points.length >= 5) {
      const prices = this.points.map(p => p.price);
      const direction = prices[1] >= prices[0] ? 1 : -1;
      let topIdx, botIdx;
      if (direction > 0) { topIdx = [1, 3]; botIdx = [0, 2, 4]; }
      else { topIdx = [0, 2, 4]; botIdx = [1, 3]; }
      const tA = pts[topIdx[0]], tB = pts[topIdx[topIdx.length - 1]];
      const bA = pts[botIdx[0]], bB = pts[botIdx[botIdx.length - 1]];
      const vb = { w: ctx.width, h: ctx.height };
      g.appendChild(Primitives.extendedLine({
        a: tA, b: tB, viewBox: vb,
        stroke: opts.convergeColor, width: 1, dashArray: '4,3', opacity: 0.7,
      }));
      g.appendChild(Primitives.extendedLine({
        a: bA, b: bB, viewBox: vb,
        stroke: opts.convergeColor, width: 1, dashArray: '4,3', opacity: 0.7,
      }));
    }

    if (opts.showLabels) {
      for (let i = 0; i < pts.length; i++) {
        const above = i % 2 === 0;
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y + (above ? -14 : 14),
          text: LABELS[i] || String(i),
          color: '#ffffff', bg: strokeColor,
          fontSize: opts.labelFontSize,
        }));
      }
    }

    if (opts.validateRules && !valid && pts.length >= 5) {
      const last = pts[pts.length - 1];
      g.appendChild(Primitives.label({
        x: last.x + 14, y: last.y,
        text: '⚠ Inválido: ' + reason,
        color: '#ffffff', bg: opts.invalidColor,
        fontSize: opts.labelFontSize,
        align: 'left',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    for (let i = 0; i < pts.length - 1; i++) {
      if (pointToSegmentDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < 8) return true;
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

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
