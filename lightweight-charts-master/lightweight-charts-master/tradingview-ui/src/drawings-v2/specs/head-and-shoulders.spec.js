import { Primitives } from '../core/primitives.js';

const LABELS = ['HI', 'V1', 'CB', 'V2', 'HD', 'NL', 'NR'];

export default {
  type: 'head-and-shoulders',
  label: 'Hombro-Cabeza-Hombro',
  icon: 'HCH',
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
    necklineColor: '#f23645',
    targetColor: '#26a69a',
    lineWidth: 2,
    labelFontSize: 11,
    showLabels: true,
    showNeckline: true,
    showTarget: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color figura' },
      { key: 'necklineColor', type: 'color', label: 'Color neckline' },
      { key: 'targetColor', type: 'color', label: 'Color target' },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'showNeckline', type: 'toggle', label: 'Mostrar neckline' },
      { key: 'showTarget', type: 'toggle', label: 'Mostrar zona target' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price), price: p.price,
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    // Figure outline: HI -> V1 -> CB -> V2 -> HD (indices 0..4)
    const figIdx = [0, 1, 2, 3, 4];
    for (let i = 0; i < figIdx.length - 1 && figIdx[i + 1] < pts.length; i++) {
      const a = pts[figIdx[i]], b = pts[figIdx[i + 1]];
      g.appendChild(Primitives.line({
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: opts.color, width: opts.lineWidth, dashArray: dash,
      }));
    }

    // Neckline: NL (5) -> NR (6) extended
    if (opts.showNeckline && pts.length >= 7) {
      const nl = pts[5], nr = pts[6];
      const vb = { w: ctx.width, h: ctx.height };
      g.appendChild(Primitives.extendedLine({
        a: nl, b: nr, viewBox: vb,
        stroke: opts.necklineColor, width: opts.lineWidth, dashArray: '6,4',
      }));

      // Target zone: target_price = neckline_at_HD_x - (head - neckline_at_head_x)
      if (opts.showTarget && pts.length >= 7) {
        const head = this.points[2];
        const nlP1 = this.points[5];
        const nlP2 = this.points[6];
        const slope = (nlP2.price - nlP1.price) / Math.max(1, (nlP2.time - nlP1.time));
        const necklineAtHead = nlP1.price + slope * (head.time - nlP1.time);
        const headDist = head.price - necklineAtHead;
        const targetPrice = necklineAtHead - headDist;
        const yTarget = ctx.projectY(targetPrice);
        const yNeck = ctx.projectY(necklineAtHead);
        if (yTarget != null && yNeck != null) {
          const xLeft = Math.min(nl.x, nr.x);
          const xRight = ctx.width;
          const yTop = Math.min(yTarget, yNeck);
          const yBot = Math.max(yTarget, yNeck);
          g.appendChild(Primitives.rect({
            x: xLeft, y: yTop, w: xRight - xLeft, h: yBot - yTop,
            fill: opts.targetColor + '33',
            stroke: opts.targetColor, width: 1, dashArray: '4,3',
          }));
          g.appendChild(Primitives.label({
            x: xRight - 6, y: yTarget,
            text: `Target ${targetPrice.toFixed(2)}`,
            color: '#ffffff', bg: opts.targetColor,
            fontSize: opts.labelFontSize, align: 'right',
          }));
        }
      }
    }

    if (opts.showLabels) {
      for (let i = 0; i < pts.length; i++) {
        const above = (i === 0 || i === 2 || i === 4);
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y + (above ? -14 : 14),
          text: LABELS[i] || String(i),
          color: '#ffffff', bg: i >= 5 ? opts.necklineColor : opts.color,
          fontSize: opts.labelFontSize,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const figIdx = [0, 1, 2, 3, 4];
    for (let i = 0; i < figIdx.length - 1 && figIdx[i + 1] < pts.length; i++) {
      const a = pts[figIdx[i]], b = pts[figIdx[i + 1]];
      if (pointToSegmentDist(x, y, a.x, a.y, b.x, b.y) < 8) return true;
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
