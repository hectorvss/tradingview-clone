import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Comment — speech-bubble annotation anchored to a single point.
//
// The bubble floats above-right of the anchor by a fixed pixel offset.
// A triangular "tail" connects the bubble back to the anchor.
// Double-click edits the text inline (handled by editableText behavior).
// ---------------------------------------------------------------------------

export default {
  type: 'comment',
  label: 'Comentario',
  icon: '🗨',
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
    text: 'Comentario',
    fontSize: 12,
    fontWeight: 'normal',
    textColor: '#ffffff',
    bgColor: '#2962ff',
    bgAlpha: 0.95,
    showBorder: false,
    borderColor: '#1e3a8a',
    padding: 8,
    cornerRadius: 8,
    offsetX: 28,
    offsetY: -36,
  },
  schema: {
    estilo: [
      { key: 'textColor', type: 'color', label: 'Color de texto' },
      { key: 'bgColor', type: 'color', label: 'Color de fondo' },
      { key: 'bgAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 1, step: 0.05 },
      { key: 'borderColor', type: 'color', label: 'Color de borde' },
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 24, step: 1 },
      { key: 'fontWeight', type: 'select', label: 'Peso', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Negrita' },
      ]},
    ],
    especifico: [
      { key: 'text', type: 'textarea', label: 'Texto' },
      { key: 'showBorder', type: 'toggle', label: 'Mostrar borde' },
      { key: 'padding', type: 'slider', label: 'Padding', min: 2, max: 24, step: 1 },
      { key: 'cornerRadius', type: 'slider', label: 'Radio esquinas', min: 0, max: 20, step: 1 },
      { key: 'offsetX', type: 'slider', label: 'Offset X', min: -200, max: 200, step: 2 },
      { key: 'offsetY', type: 'slider', label: 'Offset Y', min: -200, max: 200, step: 2 },
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
    const boxW = Math.max(32, Math.round(maxLen * fs * 0.6) + pad * 2);
    const boxH = lines.length * lineH + pad * 2;
    const boxX = ax + opts.offsetX - boxW / 2;
    const boxY = ay + opts.offsetY - boxH / 2;
    const r = Math.min(opts.cornerRadius, Math.min(boxW, boxH) / 2);

    // Decide which edge the tail attaches to based on anchor location.
    const cx = boxX + boxW / 2;
    const cy = boxY + boxH / 2;
    const dx = ax - cx;
    const dy = ay - cy;
    const tailW = 12; // half-width at the base of the tail
    let basePts;
    if (Math.abs(dx) * boxH > Math.abs(dy) * boxW) {
      // tail attaches to left/right edge
      const ex = dx > 0 ? boxX + boxW : boxX;
      const ey = Math.max(boxY + r + tailW, Math.min(boxY + boxH - r - tailW, cy + dy * 0.3));
      basePts = [{ x: ex, y: ey - tailW }, { x: ex, y: ey + tailW }];
    } else {
      // tail attaches to top/bottom edge
      const ey = dy > 0 ? boxY + boxH : boxY;
      const ex = Math.max(boxX + r + tailW, Math.min(boxX + boxW - r - tailW, cx + dx * 0.3));
      basePts = [{ x: ex - tailW, y: ey }, { x: ex + tailW, y: ey }];
    }

    // Bubble path: rounded-rect outline merged with the tail triangle.
    const bubblePath = roundedRectPath(boxX, boxY, boxW, boxH, r);
    const bubble = Primitives.el('path');
    bubble.setAttribute('d', bubblePath);
    bubble.setAttribute('fill', opts.bgColor);
    bubble.setAttribute('fill-opacity', opts.bgAlpha);
    bubble.setAttribute('stroke', opts.showBorder ? opts.borderColor : 'none');
    bubble.setAttribute('stroke-width', opts.showBorder ? 1 : 0);
    g.appendChild(bubble);

    const tail = Primitives.polygon({
      points: [basePts[0], { x: ax, y: ay }, basePts[1]],
      fill: opts.bgColor, fillOpacity: opts.bgAlpha,
      stroke: opts.showBorder ? opts.borderColor : 'none',
      width: opts.showBorder ? 1 : 0,
    });
    // The triangle's fill blends with the bubble's fill; cover the seam.
    g.appendChild(tail);

    // Text on top.
    lines.forEach((line, i) => {
      const t = Primitives.el('text');
      t.setAttribute('x', boxX + boxW / 2);
      t.setAttribute('y', boxY + pad + (i + 1) * lineH - Math.round(fs * 0.35));
      t.setAttribute('fill', opts.textColor);
      t.setAttribute('font-size', fs);
      t.setAttribute('font-weight', opts.fontWeight);
      t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
      t.setAttribute('text-anchor', 'middle');
      t.textContent = line;
      g.appendChild(t);
    });

    this._bbox = { x: Math.min(boxX, ax - 2), y: Math.min(boxY, ay - 2),
                   w: Math.max(boxX + boxW, ax + 2) - Math.min(boxX, ax - 2),
                   h: Math.max(boxY + boxH, ay + 2) - Math.min(boxY, ay - 2) };
    this._anchor = { x: ax, y: ay };
  },

  hitTest(x, y) {
    if (this._bbox) {
      const b = this._bbox;
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const x = ctx.projectX(this.points[0].time);
    const y = ctx.projectY(this.points[0].price);
    if (x == null || y == null) return [];
    return [{ x, y, anchorIdx: 0 }];
  },
};

function roundedRectPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  return `M ${x + r} ${y}
          H ${x + w - r}
          A ${r} ${r} 0 0 1 ${x + w} ${y + r}
          V ${y + h - r}
          A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}
          H ${x + r}
          A ${r} ${r} 0 0 1 ${x} ${y + h - r}
          V ${y + r}
          A ${r} ${r} 0 0 1 ${x + r} ${y}
          Z`;
}
