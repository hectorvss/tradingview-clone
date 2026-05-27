import { Primitives } from '../core/primitives.js';

// Anchored VWAP — VWAP computed from an anchor bar through the end of data,
// with optional ±σ bands. Single anchor handle.
export default {
  type: 'anchored-vwap',
  label: 'VWAP anclado',
  icon: '⚓',
  category: 'anchored',
  pointsRequired: 1,
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
    source: 'hlc3',
    showBands: true,
    showSigma1: true,
    showSigma2: true,
    showSigma3: false,
    bandColor: '#2962ff',
    bandAlpha: 0.12,
  },
  schema: {
    estilo: [
      { key: 'color', type: 'color', label: 'Color VWAP' },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 4, step: 1 },
      { key: 'style', type: 'select', label: 'Estilo línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'bandColor', type: 'color', label: 'Color bandas' },
      { key: 'bandAlpha', type: 'slider', label: 'Opacidad bandas', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'source', type: 'select', label: 'Fuente de precio', options: [
        { value: 'close', label: 'Close' },
        { value: 'hl2', label: '(H+L)/2' },
        { value: 'hlc3', label: '(H+L+C)/3' },
        { value: 'ohlc4', label: '(O+H+L+C)/4' },
      ]},
      { key: 'showBands', type: 'toggle', label: 'Mostrar bandas' },
      { key: 'showSigma1', type: 'toggle', label: '±1σ' },
      { key: 'showSigma2', type: 'toggle', label: '±2σ' },
      { key: 'showSigma3', type: 'toggle', label: '±3σ' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const anchor = this.points[0];
    const ax = ctx.projectX(anchor.time);
    if (ax == null) return;
    const opts = this.options;
    const candles = (this.manager && typeof this.manager.getCandles === 'function')
      ? (this.manager.getCandles() || []) : [];
    if (!candles.length) return;

    let anchorIdx = -1;
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].time >= anchor.time) { anchorIdx = i; break; }
    }
    if (anchorIdx < 0) return;

    const series = anchoredVWAP(candles, anchorIdx, opts.source);
    if (!series.length) return;

    // VWAP polyline
    const pts = [];
    for (const s of series) {
      const x = ctx.projectX(s.time);
      const y = ctx.projectY(s.value);
      if (x != null && y != null) pts.push({ x, y });
    }
    if (pts.length >= 2) {
      g.appendChild(Primitives.polyline({
        points: pts,
        stroke: opts.color, width: opts.width, fill: 'none',
        dashArray: Primitives.dashFromStyle(opts.style),
      }));
    }

    // Bands
    if (opts.showBands) {
      const sigmaLevels = [];
      if (opts.showSigma1) sigmaLevels.push(1);
      if (opts.showSigma2) sigmaLevels.push(2);
      if (opts.showSigma3) sigmaLevels.push(3);
      for (const k of sigmaLevels) {
        const upper = [], lower = [];
        for (const s of series) {
          const x = ctx.projectX(s.time);
          const yU = ctx.projectY(s.value + k * s.std);
          const yL = ctx.projectY(s.value - k * s.std);
          if (x != null && yU != null && yL != null) {
            upper.push({ x, y: yU });
            lower.push({ x, y: yL });
          }
        }
        if (upper.length >= 2) {
          const poly = upper.concat(lower.slice().reverse());
          g.appendChild(Primitives.polygon({
            points: poly,
            fill: opts.bandColor,
            fillOpacity: opts.bandAlpha / k,
            stroke: 'none', width: 0,
          }));
        }
      }
    }

    // Anchor marker
    const ay = ctx.projectY(series[0].value);
    if (ay != null) {
      g.appendChild(Primitives.line({
        x1: ax, y1: 0, x2: ax, y2: ctx.height,
        stroke: opts.color, width: 1, strokeOpacity: 0.35, dashArray: '2,3',
      }));
      g.appendChild(Primitives.label({
        x: ax + 4, y: ay - 8,
        text: `VWAP · ${opts.source.toUpperCase()}`,
        bg: opts.color, color: '#fff',
        fontSize: 10, align: 'left', anchor: 'bottom',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const ax = ctx.projectX(this.points[0].time);
    if (ax == null) return false;
    // anchor column
    if (Math.abs(x - ax) < 6) return true;
    // sample VWAP near pointer
    const candles = (this.manager && typeof this.manager.getCandles === 'function')
      ? (this.manager.getCandles() || []) : [];
    if (!candles.length) return false;
    let anchorIdx = -1;
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].time >= this.points[0].time) { anchorIdx = i; break; }
    }
    if (anchorIdx < 0) return false;
    const series = anchoredVWAP(candles, anchorIdx, this.options.source);
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1], b = series[i];
      const xa = ctx.projectX(a.time), ya = ctx.projectY(a.value);
      const xb = ctx.projectX(b.time), yb = ctx.projectY(b.value);
      if (xa == null || xb == null || ya == null || yb == null) continue;
      if (x < Math.min(xa, xb) - 4 || x > Math.max(xa, xb) + 4) continue;
      if (pointToSegmentDistance(x, y, xa, ya, xb, yb) < 6) return true;
    }
    return false;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    const ax = ctx.projectX(this.points[0].time);
    if (ax == null) return [];
    const ay = ctx.projectY(this.points[0].price);
    return [{ x: ax, y: ay != null ? ay : ctx.height / 2, anchorIdx: 0 }];
  },
};

function sourcePrice(b, src) {
  switch (src) {
    case 'close': return b.close;
    case 'hl2': return (b.high + b.low) / 2;
    case 'ohlc4': return (b.open + b.high + b.low + b.close) / 4;
    case 'hlc3':
    default: return (b.high + b.low + b.close) / 3;
  }
}

function anchoredVWAP(bars, anchorIdx, source = 'hlc3') {
  let cumPV = 0, cumV = 0;
  let cumP2V = 0; // for running variance
  const out = [];
  for (let i = anchorIdx; i < bars.length; i++) {
    const b = bars[i];
    const p = sourcePrice(b, source);
    const v = b.volume || 1;
    cumPV += p * v;
    cumV += v;
    cumP2V += p * p * v;
    const vwap = cumV > 0 ? cumPV / cumV : p;
    const variance = cumV > 0 ? Math.max(0, (cumP2V / cumV) - vwap * vwap) : 0;
    out.push({ time: b.time, value: vwap, std: Math.sqrt(variance) });
  }
  return out;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
