import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Arrow down ▼ — single anchor triangular marker, useful for sell signals.
// ---------------------------------------------------------------------------

export default {
  type: 'arrow-down',
  label: 'Flecha abajo',
  icon: '▼',
  category: 'arrows',
  pointsRequired: 1,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
    'contextMenuable',
  ],
  defaultOptions: {
    color: '#ef5350',
    strokeColor: '#8e1c1c',
    width: 1,
    size: 14,
    showLabel: false,
    labelText: 'SELL',
    labelColor: '#ffffff',
    fontSize: 10,
    offsetY: 6,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color de relleno' },
      { key: 'strokeColor', type: 'color', label: 'Color de borde' },
      { key: 'width', type: 'slider', label: 'Grosor borde', min: 0, max: 4, step: 1 },
      { key: 'size', type: 'slider', label: 'Tamaño', min: 6, max: 36, step: 1 },
    ],
    especifico: [
      { key: 'showLabel', type: 'toggle', label: 'Mostrar etiqueta' },
      { key: 'labelText', type: 'text', label: 'Texto etiqueta' },
      { key: 'labelColor', type: 'color', label: 'Color etiqueta' },
      { key: 'fontSize', type: 'slider', label: 'Tamaño fuente', min: 8, max: 18, step: 1 },
      { key: 'offsetY', type: 'slider', label: 'Separación vertical', min: 0, max: 40, step: 1 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const x = ctx.projectX(this.points[0].time);
    const y = ctx.projectY(this.points[0].price);
    if (x == null || y == null) return;
    const opts = this.options;
    const s = opts.size;
    // Tip below, base above.
    const tipY = y + opts.offsetY;
    const baseY = tipY - s;
    const half = s * 0.55;
    g.appendChild(Primitives.polygon({
      points: [
        { x: x, y: tipY },
        { x: x + half, y: baseY },
        { x: x - half, y: baseY },
      ],
      fill: opts.color, alpha: 0.95,
      stroke: opts.width > 0 ? opts.strokeColor : 'none',
      width: opts.width, lineJoin: 'round',
    }));

    if (opts.showLabel && opts.labelText) {
      const t = Primitives.el('text');
      t.setAttribute('x', x);
      t.setAttribute('y', baseY - 4);
      t.setAttribute('fill', opts.labelColor);
      t.setAttribute('font-size', opts.fontSize);
      t.setAttribute('font-weight', 'bold');
      t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
      t.setAttribute('text-anchor', 'middle');
      t.textContent = opts.labelText;
      g.appendChild(t);
    }

    this._bbox = {
      x: x - half - 2,
      y: baseY - (opts.showLabel ? opts.fontSize + 6 : 2),
      w: half * 2 + 4,
      h: s + (opts.showLabel ? opts.fontSize + 8 : 4),
    };
  },

  hitTest(x, y) {
    if (!this._bbox) return false;
    const b = this._bbox;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const x = ctx.projectX(this.points[0].time);
    const y = ctx.projectY(this.points[0].price);
    if (x == null || y == null) return [];
    return [{ x, y, anchorIdx: 0 }];
  },
};
