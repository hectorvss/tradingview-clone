import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Flag — vertical pole at a time anchor with a coloured pennant.
// Common preset colours (red/yellow/green/blue) for marking events such as
// earnings, dividends, splits, news.
// ---------------------------------------------------------------------------

const PRESETS = {
  red:    { color: '#ef5350', textColor: '#ffffff' },
  yellow: { color: '#ffca28', textColor: '#1e222d' },
  green:  { color: '#26a69a', textColor: '#ffffff' },
  blue:   { color: '#2962ff', textColor: '#ffffff' },
};

export default {
  type: 'flag',
  label: 'Bandera',
  icon: '⚑',
  category: 'annotation',
  pointsRequired: 1,
  cursorHint: 'text',
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
    'editableText',
    'contextMenuable',
  ],
  defaultOptions: {
    preset: 'red',
    color: '#ef5350',
    textColor: '#ffffff',
    poleColor: '#787b86',
    text: 'E',
    fontSize: 11,
    fontWeight: 'bold',
    flagWidth: 22,
    flagHeight: 16,
    poleHeight: 40,
    anchorTop: false,
  },
  schema: {
    estilo: [
      { key: 'preset', type: 'select', label: 'Preset', options: [
        { value: 'red', label: 'Rojo' },
        { value: 'yellow', label: 'Amarillo' },
        { value: 'green', label: 'Verde' },
        { value: 'blue', label: 'Azul' },
        { value: 'custom', label: 'Personalizado' },
      ]},
      { key: 'color', type: 'color', label: 'Color bandera' },
      { key: 'textColor', type: 'color', label: 'Color texto' },
      { key: 'poleColor', type: 'color', label: 'Color del mástil' },
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 20, step: 1 },
      { key: 'fontWeight', type: 'select', label: 'Peso', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Negrita' },
      ]},
    ],
    especifico: [
      { key: 'text', type: 'text', label: 'Texto' },
      { key: 'flagWidth', type: 'slider', label: 'Ancho bandera', min: 12, max: 60, step: 1 },
      { key: 'flagHeight', type: 'slider', label: 'Alto bandera', min: 10, max: 40, step: 1 },
      { key: 'poleHeight', type: 'slider', label: 'Alto mástil', min: 20, max: 120, step: 2 },
      { key: 'anchorTop', type: 'toggle', label: 'Anclar en la parte superior' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const p = this.points[0];
    const x = ctx.projectX(p.time);
    let y = ctx.projectY(p.price);
    if (x == null || y == null) return;

    const opts = this.options;
    const preset = PRESETS[opts.preset];
    const flagColor = preset ? preset.color : opts.color;
    const textColor = preset ? preset.textColor : opts.textColor;

    const poleH = opts.poleHeight;
    const flagW = opts.flagWidth;
    const flagH = opts.flagHeight;

    // Pole: extends downward by default; upward if anchorTop.
    const poleY1 = y;
    const poleY2 = opts.anchorTop ? y + poleH : y - poleH;
    g.appendChild(Primitives.line({
      x1: x, y1: poleY1, x2: x, y2: poleY2,
      stroke: opts.poleColor, width: 1.5, lineCap: 'round',
    }));

    // Flag (pennant) attached at the far end of the pole.
    const flagY = opts.anchorTop ? poleY2 - flagH : poleY2;
    const pts = [
      { x: x, y: flagY },
      { x: x + flagW, y: flagY + flagH * 0.35 },
      { x: x, y: flagY + flagH * 0.7 },
    ];
    g.appendChild(Primitives.polygon({
      points: pts, fill: flagColor, alpha: 0.95,
      stroke: flagColor, width: 1, lineJoin: 'round',
    }));

    // Optional text — first character drawn over the flag.
    const txt = String(opts.text || '').slice(0, 3);
    if (txt) {
      const t = Primitives.el('text');
      t.setAttribute('x', x + 4);
      t.setAttribute('y', flagY + flagH * 0.4);
      t.setAttribute('fill', textColor);
      t.setAttribute('font-size', opts.fontSize);
      t.setAttribute('font-weight', opts.fontWeight);
      t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
      t.setAttribute('dominant-baseline', 'central');
      t.textContent = txt;
      g.appendChild(t);
    }

    this._bbox = {
      x: x - 4,
      y: Math.min(poleY1, poleY2) - 2,
      w: flagW + 8,
      h: Math.abs(poleY2 - poleY1) + flagH + 4,
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
