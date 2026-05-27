import { Primitives } from '../core/primitives.js';

const LABELS = ['X', 'A', 'B', 'C', 'D'];

function inRange(v, lo, hi) { return v >= lo && v <= hi; }

export default {
  type: 'cypher',
  label: 'Patrón Cypher',
  icon: 'CYP',
  category: 'harmonics',
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
    color: '#e91e63',
    detectColor: '#26a69a',
    noMatchColor: '#787b86',
    lineWidth: 2,
    labelFontSize: 12,
    showLabels: true,
    showRatios: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'detectColor', type: 'color', label: 'Color detectado' },
      { key: 'noMatchColor', type: 'color', label: 'Color sin match' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas X-A-B-C-D' },
      { key: 'showRatios', type: 'toggle', label: 'Mostrar ratios y badge' },
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

    let matched = false;
    let ratios = null;
    if (this.points.length >= 5) {
      const prices = this.points.map(p => p.price);
      const xa = Math.abs(prices[1] - prices[0]);
      const ab = Math.abs(prices[2] - prices[1]);
      const bc = Math.abs(prices[3] - prices[2]);
      const cd = Math.abs(prices[4] - prices[3]);
      const ad = Math.abs(prices[4] - prices[1]);
      ratios = {
        abXA: xa > 0 ? ab / xa : 0,
        bcAB: ab > 0 ? bc / ab : 0,
        cdBC: bc > 0 ? cd / bc : 0,
        adXA: xa > 0 ? ad / xa : 0,
      };
      matched =
        inRange(ratios.abXA, 0.382, 0.618) &&
        inRange(ratios.bcAB, 1.13, 1.414) &&
        Math.abs(ratios.cdBC - 0.786) <= 0.05 &&
        Math.abs(ratios.adXA - 0.786) <= 0.05;
    }
    const stroke = matched ? opts.detectColor : opts.color;

    for (let i = 0; i < pts.length - 1; i++) {
      g.appendChild(Primitives.line({
        x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
        stroke, width: opts.lineWidth, dashArray: dash,
      }));
    }
    if (pts.length >= 5) {
      g.appendChild(Primitives.line({
        x1: pts[0].x, y1: pts[0].y, x2: pts[4].x, y2: pts[4].y,
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

    if (opts.showRatios && pts.length >= 5 && ratios) {
      const last = pts[4];
      const badge = matched
        ? `✓ Cypher · AB/XA=${ratios.abXA.toFixed(3)} · BC/AB=${ratios.bcAB.toFixed(3)} · CD/BC=${ratios.cdBC.toFixed(3)} · AD/XA=${ratios.adXA.toFixed(3)}`
        : `Sin Cypher · ideal AB/XA∈[0.382,0.618], BC/AB∈[1.13,1.414], CD/BC≈0.786, AD/XA≈0.786`;
      g.appendChild(Primitives.label({
        x: last.x + 14, y: last.y,
        text: badge,
        color: '#ffffff',
        bg: matched ? opts.detectColor : opts.noMatchColor,
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
