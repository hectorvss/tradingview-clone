import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Anchored note — post-it style sticky note pinned to a time+price coord.
// As the chart pans/zooms, the note tracks its anchor.
// Double-click to edit the text inline.
// ---------------------------------------------------------------------------

export default {
  type: 'anchored-note',
  label: 'Nota fijada',
  icon: '📝',
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
    text: 'Nota',
    fontSize: 12,
    fontWeight: 'normal',
    textColor: '#1e222d',
    bgColor: '#fff59d', // post-it yellow
    bgAlpha: 0.95,
    showBorder: true,
    borderColor: '#f9a825',
    padding: 8,
    cornerRadius: 2,
    pinColor: '#e53935',
    showPin: true,
  },
  schema: {
    estilo: [
      { key: 'textColor', type: 'color', label: 'Color de texto' },
      { key: 'bgColor', type: 'color', label: 'Color de fondo' },
      { key: 'bgAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 1, step: 0.05 },
      { key: 'borderColor', type: 'color', label: 'Color de borde' },
      { key: 'pinColor', type: 'color', label: 'Color de chincheta' },
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 24, step: 1 },
      { key: 'fontWeight', type: 'select', label: 'Peso', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Negrita' },
      ]},
    ],
    especifico: [
      { key: 'text', type: 'textarea', label: 'Texto' },
      { key: 'showPin', type: 'toggle', label: 'Mostrar chincheta' },
      { key: 'showBorder', type: 'toggle', label: 'Mostrar borde' },
      { key: 'padding', type: 'slider', label: 'Padding', min: 2, max: 24, step: 1 },
      { key: 'cornerRadius', type: 'slider', label: 'Radio esquinas', min: 0, max: 12, step: 1 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const ax = ctx.projectX(this.points[0].time);
    const ay = ctx.projectY(this.points[0].price);
    if (ax == null || ay == null) return;

    const opts = this.options;
    const lines = String(opts.text || '').split('\n');
    const fs = opts.fontSize;
    const lineH = Math.round(fs * 1.3);
    const pad = opts.padding;
    const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const boxW = Math.max(60, Math.round(maxLen * fs * 0.6) + pad * 2);
    const boxH = lines.length * lineH + pad * 2;
    // Note anchors with its top-left at the pin point, slightly offset.
    const boxX = ax + 10;
    const boxY = ay - boxH / 2;

    // Subtle drop shadow.
    g.appendChild(Primitives.rect({
      x: boxX + 2, y: boxY + 2, w: boxW, h: boxH,
      rx: opts.cornerRadius, ry: opts.cornerRadius,
      fill: '#000', alpha: 0.15, stroke: 'none', width: 0,
    }));
    // Sticky note body.
    g.appendChild(Primitives.rect({
      x: boxX, y: boxY, w: boxW, h: boxH,
      rx: opts.cornerRadius, ry: opts.cornerRadius,
      fill: opts.bgColor, alpha: opts.bgAlpha,
      stroke: opts.showBorder ? opts.borderColor : 'none',
      width: opts.showBorder ? 1 : 0,
    }));

    // Text.
    lines.forEach((line, i) => {
      const t = Primitives.el('text');
      t.setAttribute('x', boxX + pad);
      t.setAttribute('y', boxY + pad + (i + 1) * lineH - Math.round(fs * 0.35));
      t.setAttribute('fill', opts.textColor);
      t.setAttribute('font-size', fs);
      t.setAttribute('font-weight', opts.fontWeight);
      t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
      t.setAttribute('text-anchor', 'start');
      t.textContent = line;
      g.appendChild(t);
    });

    // Pin / chincheta at the anchor.
    if (opts.showPin) {
      // pin shadow
      g.appendChild(Primitives.circle({
        cx: ax + 1, cy: ay + 1, r: 5,
        fill: '#000', alpha: 0.3, stroke: 'none', width: 0,
      }));
      g.appendChild(Primitives.circle({
        cx: ax, cy: ay, r: 5,
        fill: opts.pinColor, stroke: '#fff', width: 1.5,
      }));
      // highlight
      g.appendChild(Primitives.circle({
        cx: ax - 1.5, cy: ay - 1.5, r: 1.5,
        fill: '#fff', alpha: 0.6, stroke: 'none', width: 0,
      }));
    }

    this._bbox = { x: Math.min(boxX, ax - 6), y: Math.min(boxY, ay - 6),
                   w: Math.max(boxX + boxW, ax + 6) - Math.min(boxX, ax - 6),
                   h: Math.max(boxY + boxH, ay + 6) - Math.min(boxY, ay - 6) };
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
