import { Primitives } from '../core/primitives.js';

export default {
  type: 'info-line',
  label: 'Línea informativa',
  icon: 'ⓘ',
  category: 'lines',
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
    showAngle: true,
    showDistance: true,
    showPercent: true,
    labelBg: 'rgba(30, 34, 45, 0.92)',
    labelColor: '#ffffff',
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo de línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'labelBg', type: 'color', label: 'Fondo etiqueta' },
      { key: 'labelColor', type: 'color', label: 'Texto etiqueta' },
    ],
    especifico: [
      { key: 'showAngle', type: 'toggle', label: 'Mostrar ángulo' },
      { key: 'showDistance', type: 'toggle', label: 'Mostrar Δprecio / Δtiempo' },
      { key: 'showPercent', type: 'toggle', label: 'Mostrar Δ%' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [pa, pb] = this.points;
    const p1 = { x: ctx.projectX(pa.time), y: ctx.projectY(pa.price) };
    const p2 = { x: ctx.projectX(pb.time), y: ctx.projectY(pb.price) };
    if (p1.x == null || p2.x == null) return;
    const opts = this.options;
    g.appendChild(Primitives.line({
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));

    const parts = [];
    if (opts.showAngle) {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      parts.push(`${(-angle).toFixed(2)}°`);
    }
    if (opts.showDistance) {
      const dPrice = pb.price - pa.price;
      const dTime = (pb.time - pa.time);
      parts.push(`Δ ${dPrice >= 0 ? '+' : ''}${dPrice.toFixed(2)}`);
      const bars = formatTimeDelta(dTime);
      if (bars) parts.push(bars);
    }
    if (opts.showPercent && pa.price) {
      const pct = ((pb.price - pa.price) / pa.price) * 100;
      parts.push(`${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
    }
    if (parts.length) {
      const text = parts.join('   ');
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const offset = 16;
      g.appendChild(Primitives.label({
        x: mx + nx * offset,
        y: my + ny * offset,
        text,
        bg: opts.labelBg,
        color: opts.labelColor,
        fontSize: 11,
        align: 'center',
        anchor: 'middle',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points.map(p => ({
      x: ctx.projectX(p.time), y: ctx.projectY(p.price),
    }));
    if (p1.x == null || p2.x == null) return false;
    return pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y) < 6;
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

function formatTimeDelta(dtSec) {
  const s = Math.abs(dtSec);
  if (!isFinite(s) || s === 0) return '';
  const sign = dtSec >= 0 ? '' : '-';
  if (s < 3600) return `${sign}${Math.round(s / 60)}m`;
  if (s < 86400) return `${sign}${(s / 3600).toFixed(1)}h`;
  if (s < 86400 * 30) return `${sign}${(s / 86400).toFixed(1)}d`;
  return `${sign}${(s / (86400 * 30)).toFixed(1)}mo`;
}
