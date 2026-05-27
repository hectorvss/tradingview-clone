import { Primitives } from '../core/primitives.js';

export default {
  type: 'price-channel',
  label: 'Canal de precio',
  icon: '⊟',
  category: 'channels',
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
    width: 2,
    style: 'solid',
    fillColor: '#2962ff',
    fillAlpha: 0.12,
    fillBetween: true,
    extend: true,
    showLabels: true,
    showMedian: false,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color del borde' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillColor', type: 'color', label: 'Color de relleno' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'fillBetween', type: 'toggle', label: 'Rellenar canal' },
      { key: 'extend', type: 'toggle', label: 'Extender horizontalmente' },
      { key: 'showLabels', type: 'toggle', label: 'Etiquetas de precio' },
      { key: 'showMedian', type: 'toggle', label: 'Mostrar mediana' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [pa, pb] = this.points;
    const x1 = ctx.projectX(pa.time);
    const x2 = ctx.projectX(pb.time);
    const ya = ctx.projectY(pa.price);
    const yb = ctx.projectY(pb.price);
    if (x1 == null || x2 == null || ya == null || yb == null) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    const yTop = Math.min(ya, yb);
    const yBot = Math.max(ya, yb);
    const xL = opts.extend ? 0 : Math.min(x1, x2);
    const xR = opts.extend ? ctx.width : Math.max(x1, x2);

    if (opts.fillBetween) {
      g.appendChild(Primitives.rect({
        x: xL, y: yTop, w: xR - xL, h: yBot - yTop,
        fill: opts.fillColor, alpha: opts.fillAlpha,
        stroke: 'none', width: 0,
      }));
    }
    // upper
    g.appendChild(Primitives.line({
      x1: xL, y1: yTop, x2: xR, y2: yTop,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));
    // lower
    g.appendChild(Primitives.line({
      x1: xL, y1: yBot, x2: xR, y2: yBot,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));

    if (opts.showMedian) {
      const ym = (yTop + yBot) / 2;
      g.appendChild(Primitives.line({
        x1: xL, y1: ym, x2: xR, y2: ym,
        stroke: opts.color, width: 1,
        dashArray: '4,3', opacity: 0.8,
      }));
    }

    if (opts.showLabels) {
      const priceTop = ya < yb ? pa.price : pb.price;
      const priceBot = ya < yb ? pb.price : pa.price;
      g.appendChild(Primitives.priceLabel({
        y: yTop, price: priceTop, color: opts.color,
        axis: 'right', viewBox: { w: ctx.width },
      }));
      g.appendChild(Primitives.priceLabel({
        y: yBot, price: priceBot, color: opts.color,
        axis: 'right', viewBox: { w: ctx.width },
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [pa, pb] = this.points;
    const ya = ctx.projectY(pa.price);
    const yb = ctx.projectY(pb.price);
    if (ya == null || yb == null) return false;
    const yTop = Math.min(ya, yb);
    const yBot = Math.max(ya, yb);
    if (Math.abs(y - yTop) < 6 || Math.abs(y - yBot) < 6) return true;
    if (this.options.fillBetween && y >= yTop && y <= yBot) {
      if (this.options.extend) return true;
      const x1 = ctx.projectX(pa.time);
      const x2 = ctx.projectX(pb.time);
      if (x1 == null || x2 == null) return false;
      return x >= Math.min(x1, x2) && x <= Math.max(x1, x2);
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
