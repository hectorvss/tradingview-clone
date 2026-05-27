import { Primitives } from '../core/primitives.js';

export default {
  type: 'vertical-line',
  label: 'Línea vertical',
  icon: '│',
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
    showLabel: false,
    labelText: '',
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
      { key: 'showLabel', type: 'toggle', label: 'Mostrar etiqueta de tiempo' },
      { key: 'labelText', type: 'text', label: 'Texto de etiqueta' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    if (x == null) return;
    const opts = this.options;
    g.appendChild(Primitives.line({
      x1: x, y1: 0, x2: x, y2: ctx.height,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));
    if (opts.showLabel) {
      g.appendChild(Primitives.dateLabel({
        x, time: opts.labelText || p.time, color: opts.color,
        axis: 'bottom', viewBox: { h: ctx.height },
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const px = ctx.projectX(this.points[0].time);
    if (px == null) return false;
    return Math.abs(x - px) < 6;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    if (x == null) return [];
    return [{ x, y: ctx.height / 2, anchorIdx: 0 }];
  },
};
