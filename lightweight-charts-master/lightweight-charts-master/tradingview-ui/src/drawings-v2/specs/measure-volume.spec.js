import { Primitives } from '../core/primitives.js';

// Measure + Volume — same as measure-distance but also aggregates volume
// over the bars inside the temporal range.
export default {
  type: 'measure-volume',
  label: 'Medir + Volumen',
  icon: '📊',
  category: 'measure',
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
    width: 1,
    style: 'solid',
    fillAlpha: 0.15,
    showPrice: true,
    showPercent: true,
    showTime: true,
    showBars: true,
    showVolume: true,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad caja', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'showPrice', type: 'toggle', label: 'Mostrar Δprecio' },
      { key: 'showPercent', type: 'toggle', label: 'Mostrar Δ%' },
      { key: 'showTime', type: 'toggle', label: 'Mostrar Δtiempo' },
      { key: 'showBars', type: 'toggle', label: 'Mostrar nº barras' },
      { key: 'showVolume', type: 'toggle', label: 'Mostrar volumen' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points;
    const x1 = ctx.projectX(p1.time);
    const y1 = ctx.projectY(p1.price);
    const x2 = ctx.projectX(p2.time);
    const y2 = ctx.projectY(p2.price);
    if (x1 == null || x2 == null || y1 == null || y2 == null) return;
    const opts = this.options;
    const xLeft = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);
    const yTop = Math.min(y1, y2);
    const yBot = Math.max(y1, y2);
    const goingUp = p2.price >= p1.price;
    const tint = goingUp ? '#089981' : '#f23645';
    g.appendChild(Primitives.rect({
      x: xLeft, y: yTop, w: xRight - xLeft, h: yBot - yTop,
      fill: tint, fillOpacity: opts.fillAlpha,
      stroke: tint, width: 1, strokeOpacity: 0.6,
    }));
    g.appendChild(Primitives.line({
      x1, y1, x2, y2,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));

    const dPrice = p2.price - p1.price;
    const pct = p1.price !== 0 ? (dPrice / p1.price) * 100 : 0;
    const dTime = Math.abs(p2.time - p1.time);
    const agg = aggregateRange(this, p1.time, p2.time);
    const lines = [];
    if (opts.showPrice) lines.push(`${dPrice >= 0 ? '+' : ''}${formatPrice(dPrice)}`);
    if (opts.showPercent) lines.push(`${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
    if (opts.showTime) lines.push(formatRelative(dTime));
    if (opts.showBars && agg) lines.push(`${agg.bars} bars`);
    if (opts.showVolume && agg) lines.push(`vol ${formatVolume(agg.volume)}`);
    if (lines.length) {
      g.appendChild(Primitives.label({
        x: (xLeft + xRight) / 2, y: yTop - 6,
        text: lines.join('  ·  '),
        bg: tint, color: '#fff',
        fontSize: 11, align: 'center', anchor: 'bottom',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const x1 = ctx.projectX(this.points[0].time);
    const y1 = ctx.projectY(this.points[0].price);
    const x2 = ctx.projectX(this.points[1].time);
    const y2 = ctx.projectY(this.points[1].price);
    if (x1 == null || x2 == null || y1 == null || y2 == null) return false;
    if (pointToSegmentDistance(x, y, x1, y1, x2, y2) < 8) return true;
    const xLeft = Math.min(x1, x2), xRight = Math.max(x1, x2);
    const yTop = Math.min(y1, y2), yBot = Math.max(y1, y2);
    return x >= xLeft && x <= xRight && y >= yTop && y <= yBot;
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function aggregateRange(drawing, t1, t2) {
  if (!drawing.manager || typeof drawing.manager.getCandles !== 'function') return null;
  const candles = drawing.manager.getCandles() || [];
  if (!candles.length) return null;
  const lo = Math.min(t1, t2), hi = Math.max(t1, t2);
  let bars = 0, volume = 0;
  for (const c of candles) {
    if (c.time >= lo && c.time <= hi) {
      bars++;
      volume += (c.volume || 0);
    }
  }
  return { bars, volume };
}

function formatPrice(v) {
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(2);
  if (a >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatVolume(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return v.toFixed(0);
}

function formatRelative(seconds) {
  const s = Math.abs(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h) parts.push(h + 'h');
  if (m) parts.push(m + 'm');
  if (!parts.length) parts.push(Math.floor(s) + 's');
  return parts.join(' ');
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
