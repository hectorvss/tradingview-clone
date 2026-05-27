import { Primitives } from '../core/primitives.js';

const LABELS = ['0', 'D1', 'R1', 'D2', 'R2', 'D3', 'R3'];

export default {
  type: 'three-drives',
  label: 'Three Drives',
  icon: '3D',
  category: 'patterns',
  pointsRequired: 7,
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
    driveColor: '#f23645',
    retraceColor: '#26a69a',
    lineWidth: 2,
    labelFontSize: 12,
    showLabels: true,
    showRatios: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color base' },
      { key: 'driveColor', type: 'color', label: 'Color drives' },
      { key: 'retraceColor', type: 'color', label: 'Color retraces' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas D1-D3' },
      { key: 'showRatios', type: 'toggle', label: 'Mostrar ratios de extensión Fib' },
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

    // Draw zigzag segments, alternating colors: 0-D1 drive, D1-R1 retrace, ...
    for (let i = 0; i < pts.length - 1; i++) {
      const isDrive = i % 2 === 0;
      g.appendChild(Primitives.line({
        x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
        stroke: isDrive ? opts.driveColor : opts.retraceColor,
        width: opts.lineWidth, dashArray: dash,
      }));
    }

    if (opts.showLabels) {
      for (let i = 0; i < pts.length; i++) {
        const above = i % 2 === 0;
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y + (above ? -14 : 14),
          text: LABELS[i] || String(i),
          color: '#ffffff',
          bg: i === 0 ? opts.color : (i % 2 === 1 ? opts.driveColor : opts.retraceColor),
          fontSize: opts.labelFontSize,
        }));
      }
    }

    if (opts.showRatios && this.points.length >= 7) {
      const prices = this.points.map(p => p.price);
      // Drives: 0->1, 2->3, 4->5
      const d1 = Math.abs(prices[1] - prices[0]);
      const d2 = Math.abs(prices[3] - prices[2]);
      const d3 = Math.abs(prices[5] - prices[4]);
      // Retraces: 1->2, 3->4, 5->6
      const r1 = Math.abs(prices[2] - prices[1]);
      const r2 = Math.abs(prices[4] - prices[3]);
      const r3 = Math.abs(prices[6] - prices[5]);
      const ext1 = d1 > 0 ? d2 / d1 : 0;
      const ext2 = d2 > 0 ? d3 / d2 : 0;
      const ret1 = d1 > 0 ? r1 / d1 : 0;
      const ret2 = d2 > 0 ? r2 / d2 : 0;
      const ret3 = d3 > 0 ? r3 / d3 : 0;
      // Ideal: drives extend ~1.272 or 1.618; retraces ~0.618 or 0.786
      const idealExt = (e) => Math.abs(e - 1.272) < 0.1 || Math.abs(e - 1.618) < 0.1;
      const idealRet = (r) => Math.abs(r - 0.618) < 0.1 || Math.abs(r - 0.786) < 0.1;
      const valid = idealExt(ext1) && idealExt(ext2) && idealRet(ret1) && idealRet(ret2);

      const last = pts[6];
      const badge = valid
        ? `✓ Three Drives · ext ${ext1.toFixed(3)}/${ext2.toFixed(3)} · ret ${ret1.toFixed(3)}/${ret2.toFixed(3)}/${ret3.toFixed(3)}`
        : `Three Drives · ext ${ext1.toFixed(3)}/${ext2.toFixed(3)} · ret ${ret1.toFixed(3)}/${ret2.toFixed(3)}/${ret3.toFixed(3)} · ideal ext≈1.272/1.618, ret≈0.618/0.786`;
      g.appendChild(Primitives.label({
        x: last.x + 14, y: last.y,
        text: badge,
        color: '#ffffff',
        bg: valid ? '#26a69a' : '#787b86',
        fontSize: opts.labelFontSize, align: 'left',
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
