import { Primitives } from '../core/primitives.js';

export default {
  type: 'regression-trend',
  label: 'Tendencia de regresión',
  icon: '⟋',
  category: 'channels',
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
    bandColor: '#2962ff',
    bandAlpha: 0.12,
    showBands: true,
    bandsMultiplier: 2,
    source: 'close',
    showLabels: false,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color línea' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'bandColor', type: 'color', label: 'Color bandas' },
      { key: 'bandAlpha', type: 'slider', label: 'Opacidad bandas', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'showBands', type: 'toggle', label: 'Mostrar bandas ±σ' },
      { key: 'bandsMultiplier', type: 'slider', label: 'Multiplicador σ', min: 1, max: 3, step: 0.5 },
      { key: 'source', type: 'select', label: 'Fuente', options: [
        { value: 'close', label: 'Cierre' },
        { value: 'open', label: 'Apertura' },
        { value: 'high', label: 'Máximo' },
        { value: 'low', label: 'Mínimo' },
        { value: 'hl2', label: '(H+L)/2' },
        { value: 'hlc3', label: '(H+L+C)/3' },
      ]},
      { key: 'showLabels', type: 'toggle', label: 'Mostrar etiquetas' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [pa, pb] = this.points;
    const tStart = Math.min(pa.time, pb.time);
    const tEnd = Math.max(pa.time, pb.time);
    const opts = this.options;

    const bars = getBars(this, ctx);
    if (!bars || bars.length === 0) return;

    const sample = bars.filter(b => b && b.time != null && b.time >= tStart && b.time <= tEnd);
    if (sample.length < 2) return;

    const ys = sample.map(b => sourceValue(b, opts.source));
    const xs = sample.map(b => b.time);
    // OLS: ŷ = a + b·x
    const n = sample.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i];
      sxx += xs[i] * xs[i];
      sxy += xs[i] * ys[i];
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return;
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;

    // sigma
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const yhat = intercept + slope * xs[i];
      ss += (ys[i] - yhat) ** 2;
    }
    const sigma = Math.sqrt(ss / Math.max(1, n - 2));

    const yLeftPrice = intercept + slope * tStart;
    const yRightPrice = intercept + slope * tEnd;

    const x1 = ctx.projectX(tStart);
    const x2 = ctx.projectX(tEnd);
    const y1 = ctx.projectY(yLeftPrice);
    const y2 = ctx.projectY(yRightPrice);
    if (x1 == null || x2 == null || y1 == null || y2 == null) return;

    const k = opts.bandsMultiplier || 2;

    if (opts.showBands && sigma > 0) {
      const upL = ctx.projectY(yLeftPrice + k * sigma);
      const upR = ctx.projectY(yRightPrice + k * sigma);
      const dnL = ctx.projectY(yLeftPrice - k * sigma);
      const dnR = ctx.projectY(yRightPrice - k * sigma);
      if (upL != null && upR != null && dnL != null && dnR != null) {
        g.appendChild(Primitives.polygon({
          points: [
            { x: x1, y: upL }, { x: x2, y: upR },
            { x: x2, y: dnR }, { x: x1, y: dnL },
          ],
          fill: opts.bandColor,
          alpha: opts.bandAlpha,
          stroke: 'none', width: 0,
        }));
        // upper / lower line
        g.appendChild(Primitives.line({
          x1, y1: upL, x2, y2: upR,
          stroke: opts.bandColor, width: 1,
          dashArray: '4,3', opacity: 0.8,
        }));
        g.appendChild(Primitives.line({
          x1, y1: dnL, x2, y2: dnR,
          stroke: opts.bandColor, width: 1,
          dashArray: '4,3', opacity: 0.8,
        }));
      }
    }

    // Línea principal de regresión
    g.appendChild(Primitives.line({
      x1, y1, x2, y2,
      stroke: opts.color, width: opts.width,
      dashArray: Primitives.dashFromStyle(opts.style),
    }));

    if (opts.showLabels) {
      g.appendChild(Primitives.priceLabel({
        y: y2, price: yRightPrice, color: opts.color,
        axis: 'right', viewBox: { w: ctx.width },
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [pa, pb] = this.points;
    const tStart = Math.min(pa.time, pb.time);
    const tEnd = Math.max(pa.time, pb.time);
    const x1 = ctx.projectX(tStart);
    const x2 = ctx.projectX(tEnd);
    if (x1 == null || x2 == null) return false;
    // hit test simple: bounding band ±10 alrededor del segmento aproximado por los handles
    const p1 = { x: ctx.projectX(pa.time), y: ctx.projectY(pa.price) };
    const p2 = { x: ctx.projectX(pb.time), y: ctx.projectY(pb.price) };
    if (p1.x == null || p2.x == null) return false;
    return pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y) < 8;
  },

  getHandles(ctx) {
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function getBars(self, ctx) {
  if (ctx && Array.isArray(ctx.bars)) return ctx.bars;
  if (ctx && typeof ctx.getCandles === 'function') {
    try { return ctx.getCandles(); } catch (_) { /* ignore */ }
  }
  const mgr = self.manager;
  if (mgr) {
    if (typeof mgr.getCandles === 'function') {
      try { return mgr.getCandles(); } catch (_) { /* ignore */ }
    }
    if (Array.isArray(mgr.candles)) return mgr.candles;
    if (Array.isArray(mgr.bars)) return mgr.bars;
  }
  return null;
}

function sourceValue(bar, source) {
  switch (source) {
    case 'open': return bar.open;
    case 'high': return bar.high;
    case 'low': return bar.low;
    case 'hl2': return (bar.high + bar.low) / 2;
    case 'hlc3': return (bar.high + bar.low + bar.close) / 3;
    case 'close':
    default: return bar.close;
  }
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const ix = x1 + t * dx, iy = y1 + t * dy;
  return Math.hypot(px - ix, py - iy);
}
