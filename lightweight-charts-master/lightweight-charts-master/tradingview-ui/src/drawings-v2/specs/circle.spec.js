import { Primitives } from '../core/primitives.js';

export default {
  type: 'circle',
  label: 'Círculo',
  icon: '◯',
  category: 'shapes',
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
    fillAlpha: 0.15,
    showArea: true,
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
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad de relleno', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'showArea', type: 'toggle', label: 'Mostrar área rellena' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [c, r] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (c.x == null || r.x == null) return;
    const opts = this.options;
    const radius = Math.hypot(r.x - c.x, r.y - c.y);
    g.appendChild(Primitives.circle({
      cx: c.x, cy: c.y, r: radius,
      stroke: opts.color,
      width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
      fill: opts.showArea ? opts.fillColor : 'none',
      fillOpacity: opts.showArea ? opts.fillAlpha : 0,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [c, r] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (c.x == null || r.x == null) return false;
    const radius = Math.hypot(r.x - c.x, r.y - c.y);
    const d = Math.hypot(x - c.x, y - c.y);
    if (this.options.showArea && d <= radius) return true;
    return Math.abs(d - radius) < 6;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};
