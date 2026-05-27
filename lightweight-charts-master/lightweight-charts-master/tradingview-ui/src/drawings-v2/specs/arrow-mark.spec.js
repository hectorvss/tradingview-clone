import { Primitives } from '../core/primitives.js';

// ---------------------------------------------------------------------------
// Arrow mark — single anchor, stylised body + chevron head. Drawn pointing
// down at the anchor by default; rotate via `direction` (deg, 0 = up).
// ---------------------------------------------------------------------------

export default {
  type: 'arrow-mark',
  label: 'Marca flecha',
  icon: '⇩',
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
    color: '#ff9800',
    strokeColor: '#8c4d00',
    width: 1,
    size: 18,
    direction: 180, // 0 = up, 90 = right, 180 = down, 270 = left
    offset: 8,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color de relleno' },
      { key: 'strokeColor', type: 'color', label: 'Color de borde' },
      { key: 'width', type: 'slider', label: 'Grosor borde', min: 0, max: 4, step: 1 },
      { key: 'size', type: 'slider', label: 'Tamaño', min: 8, max: 48, step: 1 },
    ],
    especifico: [
      { key: 'direction', type: 'slider', label: 'Dirección (°)', min: 0, max: 359, step: 1 },
      { key: 'offset', type: 'slider', label: 'Separación', min: 0, max: 40, step: 1 },
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

    // Build the arrow in local coords pointing up (-Y), tip at origin.
    // Body (rectangle stem) + arrowhead (triangle wider than the stem).
    const half = s * 0.18;        // stem half-width
    const headHalf = s * 0.45;    // head half-width
    const headLen = s * 0.45;     // head length
    const bodyLen = s - headLen;  // remaining length
    const pts = [
      { x: 0, y: 0 },                      // tip
      { x: headHalf, y: headLen },         // head right
      { x: half, y: headLen },             // head-stem joint right
      { x: half, y: s },                   // stem bottom right
      { x: -half, y: s },                  // stem bottom left
      { x: -half, y: headLen },            // head-stem joint left
      { x: -headHalf, y: headLen },        // head left
    ];

    // The tip should sit `offset` pixels from the anchor along the direction.
    // Translate so tip is at (x, y) offset outward, then rotate.
    const wrap = Primitives.el('g');
    wrap.setAttribute('transform',
      `translate(${x},${y}) rotate(${opts.direction}) translate(0,${-opts.offset - s})`);
    wrap.appendChild(Primitives.polygon({
      points: pts, fill: opts.color, alpha: 0.95,
      stroke: opts.width > 0 ? opts.strokeColor : 'none',
      width: opts.width, lineJoin: 'round',
    }));
    g.appendChild(wrap);

    // Approximate bbox: a square of side s+offset centred on the anchor.
    const r = s + opts.offset;
    this._bbox = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
    this._cx = x; this._cy = y; this._r = r;
  },

  hitTest(x, y) {
    if (!this._bbox) return false;
    // Circular hit area is more forgiving than the rectangular bbox.
    const dx = x - this._cx;
    const dy = y - this._cy;
    return dx * dx + dy * dy <= this._r * this._r;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const x = ctx.projectX(this.points[0].time);
    const y = ctx.projectY(this.points[0].price);
    if (x == null || y == null) return [];
    return [{ x, y, anchorIdx: 0 }];
  },
};
