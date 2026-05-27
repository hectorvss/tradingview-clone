import { Primitives } from '../core/primitives.js';

export default {
  type: 'text',
  label: 'Texto',
  icon: 'T',
  category: 'text',
  pointsRequired: 1,
  cursorHint: 'text',
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    text: 'Texto',
    fontSize: 14,
    fontWeight: 'normal',
    textColor: '#e0e3eb',
    bgColor: '#1e222d',
    bgAlpha: 0.8,
    showBorder: false,
    borderColor: '#787b86',
    textAlign: 'left',
    padding: 6,
  },
  schema: {
    estilo: [
      { key: 'textColor', type: 'color', label: 'Color de texto' },
      { key: 'bgColor', type: 'color', label: 'Color de fondo' },
      { key: 'bgAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 1, step: 0.05 },
      { key: 'borderColor', type: 'color', label: 'Color de borde' },
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 48, step: 1 },
      { key: 'fontWeight', type: 'select', label: 'Peso', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Negrita' },
      ]},
      { key: 'textAlign', type: 'select', label: 'Alineación', options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ]},
    ],
    especifico: [
      { key: 'text', type: 'textarea', label: 'Texto' },
      { key: 'showBorder', type: 'toggle', label: 'Mostrar borde' },
      { key: 'padding', type: 'slider', label: 'Padding', min: 0, max: 20, step: 1 },
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
    const lines = String(opts.text || '').split('\n');
    const fs = opts.fontSize;
    const lineH = Math.round(fs * 1.25);
    const pad = opts.padding;
    // approximate width: 0.6em per char of widest line
    const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const boxW = Math.round(maxLen * fs * 0.6) + pad * 2;
    const boxH = lines.length * lineH + pad * 2;
    let boxX = x;
    if (opts.textAlign === 'center') boxX = x - boxW / 2;
    else if (opts.textAlign === 'right') boxX = x - boxW;
    const boxY = y - boxH / 2;
    g.appendChild(Primitives.rect({
      x: boxX, y: boxY, w: boxW, h: boxH,
      fill: opts.bgColor, fillOpacity: opts.bgAlpha,
      stroke: opts.showBorder ? opts.borderColor : 'none',
      width: opts.showBorder ? 1 : 0,
    }));
    let textAnchorX;
    if (opts.textAlign === 'center') textAnchorX = boxX + boxW / 2;
    else if (opts.textAlign === 'right') textAnchorX = boxX + boxW - pad;
    else textAnchorX = boxX + pad;
    lines.forEach((line, i) => {
      const t = Primitives.el('text');
      const anchorAttr = opts.textAlign === 'center' ? 'middle' : (opts.textAlign === 'right' ? 'end' : 'start');
      t.setAttribute('x', textAnchorX);
      t.setAttribute('y', boxY + pad + (i + 1) * lineH - Math.round(fs * 0.3));
      t.setAttribute('fill', opts.textColor);
      t.setAttribute('font-size', fs);
      t.setAttribute('font-weight', opts.fontWeight || 'normal');
      t.setAttribute('text-anchor', anchorAttr);
      t.setAttribute('font-family', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
      t.textContent = line;
      g.appendChild(t);
    });
    // stash for hitTest
    this._bbox = { x: boxX, y: boxY, w: boxW, h: boxH };
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const px = ctx.projectX(this.points[0].time);
    const py = ctx.projectY(this.points[0].price);
    if (px == null || py == null) return false;
    if (this._bbox) {
      const b = this._bbox;
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
    return Math.abs(x - px) < 20 && Math.abs(y - py) < 12;
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
