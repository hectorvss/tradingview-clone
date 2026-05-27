import { Primitives } from '../core/primitives.js';

// Bar Pattern — marks a temporal range of bars as a noteworthy setup.
// Renders a translucent overlay with a configurable border and a top label.
export default {
  type: 'bar-pattern',
  label: 'Patrón de barras',
  icon: '┃┃┃',
  category: 'measure',
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
    color: '#ffb300',
    fillAlpha: 0.12,
    borderWidth: 1,
    borderStyle: 'dashed',
    label: 'Pattern',
    showLabel: true,
    showBarCount: true,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad', min: 0, max: 1, step: 0.05 },
      { key: 'borderWidth', type: 'slider', label: 'Grosor borde', min: 0, max: 5, step: 1 },
      { key: 'borderStyle', type: 'select', label: 'Estilo borde', options: [
        { value: 'solid', label: 'Sólido' },
        { value: 'dashed', label: 'Discontinuo' },
        { value: 'dotted', label: 'Punteado' },
      ]},
    ],
    especifico: [
      { key: 'label', type: 'text', label: 'Etiqueta' },
      { key: 'showLabel', type: 'toggle', label: 'Mostrar etiqueta' },
      { key: 'showBarCount', type: 'toggle', label: 'Mostrar nº de barras' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points;
    const x1 = ctx.projectX(p1.time);
    const x2 = ctx.projectX(p2.time);
    if (x1 == null || x2 == null) return;
    const opts = this.options;
    const xLeft = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);
    const y = 0;
    const h = ctx.height;
    g.appendChild(Primitives.rect({
      x: xLeft, y, w: xRight - xLeft, h,
      fill: opts.color, fillOpacity: opts.fillAlpha,
      stroke: opts.color, width: opts.borderWidth,
      dashArray: Primitives.dashFromStyle(opts.borderStyle),
    }));
    if (opts.showLabel || opts.showBarCount) {
      let txt = '';
      if (opts.showLabel && opts.label) txt += opts.label;
      if (opts.showBarCount) {
        const n = countBars(this, p1.time, p2.time);
        if (n != null) {
          if (txt) txt += ' · ';
          txt += `${n} bars`;
        }
      }
      if (txt) {
        g.appendChild(Primitives.label({
          x: (xLeft + xRight) / 2, y: 14,
          text: txt, bg: opts.color, color: '#fff',
          fontSize: 11, align: 'center', anchor: 'middle',
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null) return false;
    const xLeft = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);
    const tol = 4;
    if (Math.abs(x - xLeft) < tol || Math.abs(x - xRight) < tol) return true;
    return x >= xLeft && x <= xRight && y >= 0 && y <= ctx.height;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const yMid = ctx.height / 2;
    return this.points.map((p, i) => {
      const x = ctx.projectX(p.time);
      if (x == null) return null;
      return { x, y: yMid, anchorIdx: i };
    }).filter(Boolean);
  },
};

function countBars(drawing, t1, t2) {
  if (!drawing.manager || typeof drawing.manager.getCandles !== 'function') return null;
  const candles = drawing.manager.getCandles() || [];
  if (!candles.length) return null;
  const lo = Math.min(t1, t2);
  const hi = Math.max(t1, t2);
  let n = 0;
  for (const c of candles) {
    if (c.time >= lo && c.time <= hi) n++;
  }
  return n;
}
