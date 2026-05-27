import { Primitives } from '../core/primitives.js';

export default {
  type: 'cross-line',
  label: 'Línea cruzada',
  icon: '✚',
  category: 'lines',
  pointsRequired: 1,
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
    width: 1,
    style: 'solid',
    showH: true,
    showV: true,
    showPriceLabel: true,
    showTimeLabel: true,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showH', type: 'toggle', label: 'Mostrar horizontal' },
      { key: 'showV', type: 'toggle', label: 'Mostrar vertical' },
      { key: 'showPriceLabel', type: 'toggle', label: 'Etiqueta de precio' },
      { key: 'showTimeLabel', type: 'toggle', label: 'Etiqueta de tiempo' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    const y = ctx.projectY(p.price);
    if (x == null || y == null) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);

    if (opts.showH) {
      g.appendChild(Primitives.line({
        x1: 0, y1: y, x2: ctx.width, y2: y,
        stroke: opts.color, width: opts.width, dashArray: dash,
      }));
    }
    if (opts.showV) {
      g.appendChild(Primitives.line({
        x1: x, y1: 0, x2: x, y2: ctx.height,
        stroke: opts.color, width: opts.width, dashArray: dash,
      }));
    }
    if (opts.showPriceLabel && opts.showH) {
      g.appendChild(Primitives.priceLabel({
        y, price: p.price, color: opts.color,
        axis: 'right', viewBox: { w: ctx.width },
      }));
    }
    if (opts.showTimeLabel && opts.showV) {
      g.appendChild(Primitives.dateLabel({
        x, time: formatTime(p.time), color: opts.color,
        axis: 'bottom', viewBox: { h: ctx.height },
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const p = this.points[0];
    const px = ctx.projectX(p.time);
    const py = ctx.projectY(p.price);
    if (px == null || py == null) return false;
    const opts = this.options;
    if (opts.showH && Math.abs(y - py) < 6) return true;
    if (opts.showV && Math.abs(x - px) < 6) return true;
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    const y = ctx.projectY(p.price);
    if (x == null || y == null) return [];
    return [{ x, y, anchorIdx: 0 }];
  },
};

function formatTime(t) {
  if (typeof t !== 'number') return String(t);
  const d = new Date(t * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
