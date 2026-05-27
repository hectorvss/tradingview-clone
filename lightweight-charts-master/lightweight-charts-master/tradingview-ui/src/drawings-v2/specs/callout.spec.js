import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Callout
//
// Two anchors:
//   points[0] = anchor — the point the callout is "calling out".
//   points[1] = box center — where the labelled box sits.
//
// A leader line runs from the nearest edge of the box back to the anchor.
// Double-click the box to edit the text inline (handled by the editableText
// behavior in the engine).
// ---------------------------------------------------------------------------

export default {
  type: 'callout',
  label: 'Callout',
  icon: '💬',
  category: 'annotation',
  pointsRequired: 2,
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
    text: 'Callout',
    fontSize: 13,
    fontWeight: 'normal',
    textColor: '#e0e3eb',
    bgColor: '#1e222d',
    bgAlpha: 0.92,
    showBorder: true,
    borderColor: '#2962ff',
    borderWidth: 1,
    leaderColor: '#2962ff',
    leaderWidth: 1,
    leaderStyle: 'solid',
    textAlign: 'left',
    padding: 8,
    cornerRadius: 4,
  },
  schema: {
    estilo: [
      { key: 'textColor', type: 'color', label: 'Color de texto' },
      { key: 'bgColor', type: 'color', label: 'Color de fondo' },
      { key: 'bgAlpha', type: 'slider', label: 'Opacidad fondo', min: 0, max: 1, step: 0.05 },
      { key: 'borderColor', type: 'color', label: 'Color de borde' },
      { key: 'borderWidth', type: 'slider', label: 'Grosor borde', min: 0, max: 4, step: 1 },
      { key: 'leaderColor', type: 'color', label: 'Color guía' },
      { key: 'leaderWidth', type: 'slider', label: 'Grosor guía', min: 1, max: 4, step: 1 },
      { key: 'leaderStyle', type: 'select', label: 'Estilo guía', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fontSize', type: 'slider', label: 'Tamaño de fuente', min: 8, max: 32, step: 1 },
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
      { key: 'padding', type: 'slider', label: 'Padding', min: 0, max: 24, step: 1 },
      { key: 'cornerRadius', type: 'slider', label: 'Radio esquinas', min: 0, max: 16, step: 1 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const ax = ctx.projectX(this.points[0].time);
    const ay = ctx.projectY(this.points[0].price);
    const bx = ctx.projectX(this.points[1].time);
    const by = ctx.projectY(this.points[1].price);
    if (ax == null || bx == null) return;

    const opts = this.options;
    const lines = String(opts.text || '').split('\n');
    const fs = opts.fontSize;
    const lineH = Math.round(fs * 1.3);
    const pad = opts.padding;
    const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const boxW = Math.max(40, Math.round(maxLen * fs * 0.6) + pad * 2);
    const boxH = lines.length * lineH + pad * 2;
    const boxX = bx - boxW / 2;
    const boxY = by - boxH / 2;

    // Leader line: from anchor to nearest edge intersection of the box.
    const edge = rectEdgeIntersection(boxX, boxY, boxW, boxH, bx, by, ax, ay);
    g.appendChild(Primitives.line({
      x1: ax, y1: ay, x2: edge.x, y2: edge.y,
      stroke: opts.leaderColor, width: opts.leaderWidth,
      dashArray: Primitives.dashFromStyle(opts.leaderStyle),
      lineCap: 'round',
    }));
    // small anchor dot
    g.appendChild(Primitives.circle({
      cx: ax, cy: ay, r: 3,
      fill: opts.leaderColor, stroke: '#fff', width: 1,
    }));

    // Box.
    g.appendChild(Primitives.rect({
      x: boxX, y: boxY, w: boxW, h: boxH,
      rx: opts.cornerRadius, ry: opts.cornerRadius,
      fill: opts.bgColor, alpha: opts.bgAlpha,
      stroke: opts.showBorder ? opts.borderColor : 'none',
      width: opts.showBorder ? opts.borderWidth : 0,
    }));

    // Text.
    let textX;
    if (opts.textAlign === 'center') textX = boxX + boxW / 2;
    else if (opts.textAlign === 'right') textX = boxX + boxW - pad;
    else textX = boxX + pad;
    const anchor = opts.textAlign === 'center' ? 'middle'
                  : opts.textAlign === 'right' ? 'end' : 'start';
    lines.forEach((line, i) => {
      const t = Primitives.el('text');
      t.setAttribute('x', textX);
      t.setAttribute('y', boxY + pad + (i + 1) * lineH - Math.round(fs * 0.35));
      t.setAttribute('fill', opts.textColor);
      t.setAttribute('font-size', fs);
      t.setAttribute('font-weight', opts.fontWeight);
      t.setAttribute('font-family', Primitives.DEFAULTS.fontFamily);
      t.setAttribute('text-anchor', anchor);
      t.textContent = line;
      g.appendChild(t);
    });

    this._bbox = { x: boxX, y: boxY, w: boxW, h: boxH };
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    if (this._bbox) {
      const b = this._bbox;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    const ax = ctx.projectX(this.points[0].time);
    const ay = ctx.projectY(this.points[0].price);
    const bx = ctx.projectX(this.points[1].time);
    const by = ctx.projectY(this.points[1].price);
    if (ax == null || bx == null) return false;
    return pointToSegmentDist(x, y, ax, ay, bx, by) < 6;
  },

  getHandles(ctx) {
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function rectEdgeIntersection(rx, ry, rw, rh, cx, cy, tx, ty) {
  // Cast a ray from box center (cx,cy) towards (tx,ty) and intersect with
  // the rectangle. Returns the exit point on the rectangle's edge.
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: ry };
  const hx = rw / 2;
  const hy = rh / 2;
  let tMin = Infinity;
  if (dx !== 0) {
    const t1 = (rx - cx) / dx;
    const t2 = (rx + rw - cx) / dx;
    const t = Math.max(t1, t2);
    if (t > 0) tMin = Math.min(tMin, t);
  }
  if (dy !== 0) {
    const t1 = (ry - cy) / dy;
    const t2 = (ry + rh - cy) / dy;
    const t = Math.max(t1, t2);
    if (t > 0) tMin = Math.min(tMin, t);
  }
  if (!isFinite(tMin)) return { x: cx + hx, y: cy };
  // clamp to <= 1 so the leader stops at the edge, not past the target.
  tMin = Math.min(tMin, 1);
  return { x: cx + dx * tMin, y: cy + dy * tMin };
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
