import { Primitives } from '../core/primitives.js';

const LABELS = ['A', 'B', 'C', 'D'];

export default {
  type: 'abcd',
  label: 'Patrón ABCD',
  icon: 'ABCD',
  category: 'harmonics',
  pointsRequired: 4,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    color: '#26a69a',
    detectColor: '#26a69a',
    idealColor: '#787b86',
    lineWidth: 2,
    labelFontSize: 12,
    showLabels: true,
    showRatios: true,
    tolerance: 5,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'detectColor', type: 'color', label: 'Color detectado' },
      { key: 'idealColor', type: 'color', label: 'Color ideal' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas A-D' },
      { key: 'showRatios', type: 'toggle', label: 'Mostrar ratios' },
      { key: 'tolerance', type: 'slider', label: 'Tolerancia (%)', min: 0, max: 10, step: 0.5 },
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

    let detected = false;
    let ratioAB = 0, ratioCD = 0, ratioBC = 0, ratioAD = 0, cdAB = 0, bcAD = 0;
    if (this.points.length >= 4) {
      const prices = this.points.map(p => p.price);
      const ab = Math.abs(prices[1] - prices[0]);
      const bc = Math.abs(prices[2] - prices[1]);
      const cd = Math.abs(prices[3] - prices[2]);
      const ad = Math.abs(prices[3] - prices[0]);
      cdAB = ab > 0 ? cd / ab : 0;
      bcAD = ad > 0 ? bc / ad : 0;
      const tol = opts.tolerance / 100;
      const cdOk = Math.abs(cdAB - 1.0) <= tol;
      const bcOk = Math.abs(bcAD - 0.618) <= tol;
      detected = cdOk && bcOk;
    }

    const stroke = opts.color;
    for (let i = 0; i < pts.length - 1; i++) {
      g.appendChild(Primitives.line({
        x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
        stroke, width: opts.lineWidth, dashArray: dash,
      }));
    }
    // AD diagonal (lighter)
    if (pts.length >= 4) {
      g.appendChild(Primitives.line({
        x1: pts[0].x, y1: pts[0].y, x2: pts[3].x, y2: pts[3].y,
        stroke, width: 1, dashArray: '4,3', opacity: 0.5,
      }));
    }

    if (opts.showLabels) {
      for (let i = 0; i < pts.length; i++) {
        const above = i % 2 === 0;
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y + (above ? -14 : 14),
          text: LABELS[i] || String(i),
          color: '#ffffff', bg: stroke,
          fontSize: opts.labelFontSize,
        }));
      }
    }

    if (opts.showRatios && pts.length >= 4) {
      const last = pts[3];
      const badgeText = detected
        ? `✓ ABCD detectado · CD/AB=${cdAB.toFixed(3)} · BC/AD=${bcAD.toFixed(3)}`
        : `Ideal: CD/AB ≈ 1.0, BC/AD ≈ 0.618 · actual ${cdAB.toFixed(3)}/${bcAD.toFixed(3)}`;
      g.appendChild(Primitives.label({
        x: last.x + 14, y: last.y,
        text: badgeText,
        color: '#ffffff',
        bg: detected ? opts.detectColor : opts.idealColor,
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
