import { Primitives } from '../core/primitives.js';

const LABELS = ['0', '1', '2', '3', '4', '5'];

export default {
  type: 'elliott-impulse',
  label: 'Onda de Elliott — Impulso',
  icon: '5W',
  category: 'elliott',
  pointsRequired: 6,
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
    invalidColor: '#f23645',
    lineWidth: 2,
    labelFontSize: 12,
    showLabels: true,
    validateRules: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'invalidColor', type: 'color', label: 'Color inválido' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas 0-5' },
      { key: 'validateRules', type: 'toggle', label: 'Validar reglas de Elliott' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      price: p.price,
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    let valid = true;
    let invalidReason = '';
    if (opts.validateRules && this.points.length >= 6) {
      const prices = this.points.map(p => p.price);
      const direction = prices[1] >= prices[0] ? 1 : -1;
      const w1 = Math.abs(prices[1] - prices[0]);
      const w3 = Math.abs(prices[3] - prices[2]);
      const w5 = Math.abs(prices[5] - prices[4]);
      const wave3NotShortest = !(w3 < w1 && w3 < w5);
      const wave4NoOverlap = direction > 0 ? prices[4] > prices[1] : prices[4] < prices[1];
      valid = wave3NotShortest && wave4NoOverlap;
      if (!wave3NotShortest) invalidReason = 'Wave 3 más corta';
      else if (!wave4NoOverlap) invalidReason = 'Wave 4 solapa con 1';
    }
    const strokeColor = valid ? opts.color : opts.invalidColor;

    for (let i = 0; i < pts.length - 1; i++) {
      g.appendChild(Primitives.line({
        x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
        stroke: strokeColor, width: opts.lineWidth, dashArray: dash,
      }));
    }

    if (opts.showLabels) {
      for (let i = 0; i < pts.length; i++) {
        const labelText = LABELS[i] || String(i);
        const above = i % 2 === 0;
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y + (above ? -14 : 14),
          text: labelText,
          color: '#ffffff', bg: strokeColor,
          fontSize: opts.labelFontSize,
          align: 'center', anchor: 'middle',
        }));
      }
    }

    if (opts.validateRules && !valid && pts.length >= 6) {
      const last = pts[pts.length - 1];
      g.appendChild(Primitives.label({
        x: last.x + 14, y: last.y,
        text: '⚠ Inválido: ' + invalidReason,
        color: '#ffffff', bg: opts.invalidColor,
        fontSize: opts.labelFontSize,
        align: 'left', anchor: 'middle',
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
