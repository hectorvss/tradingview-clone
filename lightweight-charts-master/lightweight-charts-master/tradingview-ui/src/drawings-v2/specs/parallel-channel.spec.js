import { Primitives } from '../core/primitives.js';

export default {
  type: 'parallel-channel',
  label: 'Canal paralelo',
  icon: '▱',
  category: 'channels',
  pointsRequired: 3,
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
    fillAlpha: 0.12,
    fillBetween: true,
    showMedian: false,
    medianStyle: 'dashed',
    showLabels: false,
    extend: false,
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
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad relleno', min: 0, max: 1, step: 0.05 },
      { key: 'medianStyle', type: 'select', label: 'Estilo de mediana', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'fillBetween', type: 'toggle', label: 'Rellenar canal' },
      { key: 'showMedian', type: 'toggle', label: 'Mostrar mediana' },
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
      { key: 'extend', type: 'toggle', label: 'Extender en ambos sentidos' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return;
    const [p1, p2, p3] = pts;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };

    // Vector dirección de la línea base
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Offset perpendicular = proyección de (p3-p1) sobre normal a (p1-p2),
    // pero como queremos que la paralela PASE por p3, sólo necesitamos
    // el offset vertical (en y) entre p3 y la línea p1-p2 en x=p3.x.
    // La paralela se define como p3 + t*(dx,dy).
    const p3b = { x: p3.x + dx, y: p3.y + dy };
    const p3a = { x: p3.x - dx, y: p3.y - dy };

    // Vértices del polígono (a precio constante en x recortado).
    // Para coherencia visual, recortamos al rango x [min(p1,p2), max(p1,p2)]
    // (o extendido si opts.extend).
    let xL, xR, q1, q2, q3, q4;
    if (opts.extend) {
      // extender: usar línea infinita en ambas direcciones.
      const baseStart = clipLineToBox(p1, p2, vb, -1);
      const baseEnd = clipLineToBox(p1, p2, vb, 1);
      const parStart = clipLineToBox(p3a, p3b, vb, -1);
      const parEnd = clipLineToBox(p3a, p3b, vb, 1);
      q1 = baseStart; q2 = baseEnd;
      q3 = parEnd; q4 = parStart;
    } else {
      xL = Math.min(p1.x, p2.x);
      xR = Math.max(p1.x, p2.x);
      const baseY = (xv) => p1.y + ((xv - p1.x) / (dx || 1)) * dy;
      const parY = (xv) => p3.y + ((xv - p3.x) / (dx || 1)) * dy;
      q1 = { x: xL, y: baseY(xL) };
      q2 = { x: xR, y: baseY(xR) };
      q3 = { x: xR, y: parY(xR) };
      q4 = { x: xL, y: parY(xL) };
    }

    if (opts.fillBetween) {
      g.appendChild(Primitives.polygon({
        points: [q1, q2, q3, q4],
        fill: opts.fillColor,
        alpha: opts.fillAlpha,
        stroke: 'none',
        width: 0,
      }));
    }

    // Línea base
    g.appendChild(Primitives.line({
      x1: q1.x, y1: q1.y, x2: q2.x, y2: q2.y,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));
    // Línea paralela
    g.appendChild(Primitives.line({
      x1: q4.x, y1: q4.y, x2: q3.x, y2: q3.y,
      stroke: opts.color, width: opts.width, dashArray: dash,
    }));

    if (opts.showMedian) {
      const m1 = { x: (q1.x + q4.x) / 2, y: (q1.y + q4.y) / 2 };
      const m2 = { x: (q2.x + q3.x) / 2, y: (q2.y + q3.y) / 2 };
      g.appendChild(Primitives.line({
        x1: m1.x, y1: m1.y, x2: m2.x, y2: m2.y,
        stroke: opts.color, width: Math.max(1, opts.width - 1),
        dashArray: Primitives.dashFromStyle(opts.medianStyle),
        opacity: 0.85,
      }));
    }

    if (opts.showLabels) {
      g.appendChild(Primitives.priceLabel({ y: q2.y, price: this.points[1].price, color: opts.color, axis: 'right', viewBox: { w: ctx.width } }));
      g.appendChild(Primitives.priceLabel({ y: q3.y, price: this.points[2].price, color: opts.color, axis: 'right', viewBox: { w: ctx.width } }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    const [p1, p2, p3] = pts;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    if (pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y) < 6) return true;
    if (pointToSegmentDist(x, y, p3.x, p3.y, p3.x + dx, p3.y + dy) < 6) return true;
    if (this.options.fillBetween) {
      // hit test poligonal aproximado: bands entre las dos líneas (en y)
      const xL = Math.min(p1.x, p2.x), xR = Math.max(p1.x, p2.x);
      if (x >= xL && x <= xR) {
        const baseY = p1.y + ((x - p1.x) / (dx || 1)) * dy;
        const parY = p3.y + ((x - p3.x) / (dx || 1)) * dy;
        if (y >= Math.min(baseY, parY) && y <= Math.max(baseY, parY)) return true;
      }
    }
    return false;
  },

  getHandles(ctx) {
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}

function clipLineToBox(a, b, vb, sign) {
  const dx = (b.x - a.x) * sign;
  const dy = (b.y - a.y) * sign;
  let tMax = Infinity;
  if (dx > 0) tMax = Math.min(tMax, (vb.w - a.x) / dx);
  else if (dx < 0) tMax = Math.min(tMax, (0 - a.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (vb.h - a.y) / dy);
  else if (dy < 0) tMax = Math.min(tMax, (0 - a.y) / dy);
  if (!isFinite(tMax) || tMax < 0) tMax = 0;
  return { x: a.x + dx * tMax, y: a.y + dy * tMax };
}
