import { Primitives } from '../core/primitives.js';

export default {
  type: 'triangle-pattern',
  label: 'Patrón triángulo',
  icon: '◁',
  category: 'patterns',
  pointsRequired: 4,
  behaviors: [
    'selectable',
    'handle-draggable',
    'draggable',
    'snappable',
    'lockable',
    'persistent',
  ],
  defaultOptions: {
    upperColor: '#f23645',
    lowerColor: '#26a69a',
    fillColor: '#2962ff',
    fillOpacity: 0.08,
    lineWidth: 2,
    labelFontSize: 12,
    showFill: true,
    showLabels: true,
    showType: true,
    extendRight: true,
    style: 'solid',
  },
  schema: {
    estilo: [
      { key: 'upperColor', type: 'color', label: 'Color resistencia' },
      { key: 'lowerColor', type: 'color', label: 'Color soporte' },
      { key: 'fillColor', type: 'color', label: 'Color relleno' },
      { key: 'fillOpacity', type: 'slider', label: 'Opacidad relleno', min: 0, max: 1, step: 0.05 },
      { key: 'lineWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'labelFontSize', type: 'slider', label: 'Tamaño etiquetas', min: 8, max: 20, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
    ],
    especifico: [
      { key: 'showFill', type: 'toggle', label: 'Mostrar relleno' },
      { key: 'showLabels', type: 'toggle', label: 'Mostrar puntos' },
      { key: 'showType', type: 'toggle', label: 'Detectar tipo (ascendente/descendente/simétrico)' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price), price: p.price,
    }));
    if (pts.some(p => p.x == null)) return;
    const opts = this.options;
    const dash = Primitives.dashFromStyle(opts.style);
    const vb = { w: ctx.width, h: ctx.height };

    // Assume order: upper1, lower1, upper2, lower2
    // Pairs: upper line = (0,2), lower line = (1,3)
    if (pts.length >= 4) {
      const u1 = pts[0], u2 = pts[2];
      const l1 = pts[1], l2 = pts[3];

      // Detect type
      let type = 'simétrico';
      const upperSlope = (u2.price - u1.price) / Math.max(1, (this.points[2].time - this.points[0].time));
      const lowerSlope = (l2.price - l1.price) / Math.max(1, (this.points[3].time - this.points[1].time));
      const flat = (s) => Math.abs(s) < Math.abs((u1.price + l1.price) / 2) * 1e-5 + 1e-9;
      if (flat(upperSlope) && lowerSlope > 0) type = 'ascendente';
      else if (flat(lowerSlope) && upperSlope < 0) type = 'descendente';
      else if (upperSlope < 0 && lowerSlope > 0) type = 'simétrico';
      else if (upperSlope > 0 && lowerSlope > 0) type = 'ascendente';
      else if (upperSlope < 0 && lowerSlope < 0) type = 'descendente';

      // Fill polygon between the two lines
      if (opts.showFill) {
        // Use line segments u1-u2 and l1-l2 as polygon corners
        const poly = [u1, u2, l2, l1];
        g.appendChild(Primitives.polygon({
          points: poly,
          fill: opts.fillColor,
          stroke: 'none',
          alpha: opts.fillOpacity,
        }));
      }

      // Upper line
      if (opts.extendRight) {
        g.appendChild(Primitives.extendedLine({
          a: u1, b: u2, viewBox: vb,
          stroke: opts.upperColor, width: opts.lineWidth, dashArray: dash,
        }));
        g.appendChild(Primitives.extendedLine({
          a: l1, b: l2, viewBox: vb,
          stroke: opts.lowerColor, width: opts.lineWidth, dashArray: dash,
        }));
      } else {
        g.appendChild(Primitives.line({
          x1: u1.x, y1: u1.y, x2: u2.x, y2: u2.y,
          stroke: opts.upperColor, width: opts.lineWidth, dashArray: dash,
        }));
        g.appendChild(Primitives.line({
          x1: l1.x, y1: l1.y, x2: l2.x, y2: l2.y,
          stroke: opts.lowerColor, width: opts.lineWidth, dashArray: dash,
        }));
      }

      if (opts.showType) {
        const lastX = Math.max(u2.x, l2.x);
        const midY = (u2.y + l2.y) / 2;
        g.appendChild(Primitives.label({
          x: lastX + 14, y: midY,
          text: `Triángulo ${type}`,
          color: '#ffffff', bg: opts.fillColor,
          fontSize: opts.labelFontSize, align: 'left',
        }));
      }
    } else {
      // partial: draw segments
      for (let i = 0; i < pts.length - 1; i++) {
        g.appendChild(Primitives.line({
          x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y,
          stroke: opts.upperColor, width: opts.lineWidth, dashArray: dash,
        }));
      }
    }

    if (opts.showLabels) {
      const names = ['U1', 'L1', 'U2', 'L2'];
      for (let i = 0; i < pts.length; i++) {
        g.appendChild(Primitives.label({
          x: pts[i].x, y: pts[i].y - 14,
          text: names[i] || String(i),
          color: '#ffffff', bg: i % 2 === 0 ? opts.upperColor : opts.lowerColor,
          fontSize: opts.labelFontSize,
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const pts = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (pts.some(p => p.x == null)) return false;
    if (pts.length >= 4) {
      const u1 = pts[0], u2 = pts[2], l1 = pts[1], l2 = pts[3];
      if (pointToSegmentDist(x, y, u1.x, u1.y, u2.x, u2.y) < 8) return true;
      if (pointToSegmentDist(x, y, l1.x, l1.y, l2.x, l2.y) < 8) return true;
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
