import { Primitives } from '../core/primitives.js';

export default {
  type: 'rectangle',
  label: 'Rectángulo',
  icon: '▭',
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
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    g.appendChild(Primitives.rect({
      x, y, w, h,
      stroke: opts.color,
      width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
      fill: opts.showArea ? opts.fillColor : 'none',
      fillOpacity: opts.showArea ? opts.fillAlpha : 0,
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return false;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    if (this.options.showArea && x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
    const tol = 6;
    const onLeft = Math.abs(x - minX) < tol && y >= minY - tol && y <= maxY + tol;
    const onRight = Math.abs(x - maxX) < tol && y >= minY - tol && y <= maxY + tol;
    const onTop = Math.abs(y - minY) < tol && x >= minX - tol && x <= maxX + tol;
    const onBottom = Math.abs(y - maxY) < tol && x >= minX - tol && x <= maxX + tol;
    return onLeft || onRight || onTop || onBottom;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return [];
    return [
      { x: p1.x, y: p1.y, anchorIdx: 0 },
      { x: p2.x, y: p2.y, anchorIdx: 1 },
    ];
  },
};
