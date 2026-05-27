import { Primitives } from '../core/primitives.js';

// Forecast — projects a price path from p1 (current) to p2 (target) with a
// widening confidence cone (1σ / 2σ / 3σ) representing volatility uncertainty.
export default {
  type: 'forecast',
  label: 'Proyección',
  icon: '⤴',
  category: 'predict',
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
    pathColor: '#2962ff',
    coneColor: '#2962ff',
    pathWidth: 2,
    pathStyle: 'dashed',
    coneAlpha: 0.12,
    confidenceLevel: 2,   // 1σ, 2σ, 3σ
    volatility: 0.02,     // ~2% per bar
    showLabel: true,
    showCone: true,
    showInnerSigma: true,
  },
  schema: {
    estilo: [
      { key: 'pathColor', type: 'color', label: 'Color de proyección' },
      { key: 'coneColor', type: 'color', label: 'Color del cono' },
      { key: 'pathWidth', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
      { key: 'pathStyle', type: 'select', label: 'Estilo línea', options: [
        { value: 'solid', label: 'Sólida' },
        { value: 'dashed', label: 'Discontinua' },
        { value: 'dotted', label: 'Punteada' },
      ]},
      { key: 'coneAlpha', type: 'slider', label: 'Opacidad cono', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'confidenceLevel', type: 'select', label: 'Nivel de confianza', options: [
        { value: 1, label: '1σ (68%)' },
        { value: 2, label: '2σ (95%)' },
        { value: 3, label: '3σ (99.7%)' },
      ]},
      { key: 'volatility', type: 'number', label: 'Volatilidad por barra', min: 0, max: 1, step: 0.005 },
      { key: 'showCone', type: 'toggle', label: 'Mostrar cono' },
      { key: 'showInnerSigma', type: 'toggle', label: 'Mostrar bandas internas' },
      { key: 'showLabel', type: 'toggle', label: 'Mostrar etiqueta' },
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

    // estimate bars in projected window
    const candles = (this.manager && typeof this.manager.getCandles === 'function')
      ? (this.manager.getCandles() || []) : [];
    let barSeconds = 60;
    if (candles.length >= 2) {
      barSeconds = Math.max(1, candles[1].time - candles[0].time);
    }
    const futureBars = Math.max(1, Math.abs(p2.time - p1.time) / barSeconds);
    const sigmaPct = opts.volatility * Math.sqrt(futureBars);
    // convert sigma in price space (% of entry price)
    const sigmaPrice = Math.abs(p1.price) * sigmaPct;

    // Cone — sample N points along time axis, expand sigma proportionally to sqrt(t)
    if (opts.showCone) {
      const N = 24;
      const upperOuter = [], lowerOuter = [];
      const upperInner = [], lowerInner = [];
      const maxSigma = opts.confidenceLevel * sigmaPrice;
      const innerSigma = sigmaPrice; // 1σ
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const px = x1 + (x2 - x1) * t;
        const interpPrice = p1.price + (p2.price - p1.price) * t;
        const sigT = maxSigma * Math.sqrt(t);
        const sigInner = innerSigma * Math.sqrt(t);
        const yU = ctx.projectY(interpPrice + sigT);
        const yL = ctx.projectY(interpPrice - sigT);
        if (yU != null && yL != null) {
          upperOuter.push({ x: px, y: yU });
          lowerOuter.push({ x: px, y: yL });
        }
        if (opts.showInnerSigma) {
          const yUi = ctx.projectY(interpPrice + sigInner);
          const yLi = ctx.projectY(interpPrice - sigInner);
          if (yUi != null && yLi != null) {
            upperInner.push({ x: px, y: yUi });
            lowerInner.push({ x: px, y: yLi });
          }
        }
      }
      if (upperOuter.length >= 2) {
        const polyPts = upperOuter.concat(lowerOuter.slice().reverse());
        g.appendChild(Primitives.polygon({
          points: polyPts,
          fill: opts.coneColor,
          fillOpacity: opts.coneAlpha,
          stroke: opts.coneColor,
          strokeOpacity: 0.5,
          width: 1,
        }));
      }
      if (opts.showInnerSigma && upperInner.length >= 2) {
        const polyIn = upperInner.concat(lowerInner.slice().reverse());
        g.appendChild(Primitives.polygon({
          points: polyIn,
          fill: opts.coneColor,
          fillOpacity: Math.min(1, opts.coneAlpha * 1.8),
          stroke: 'none',
          width: 0,
        }));
      }
    }

    // Projected path
    g.appendChild(Primitives.line({
      x1, y1, x2, y2,
      stroke: opts.pathColor,
      width: opts.pathWidth,
      dashArray: Primitives.dashFromStyle(opts.pathStyle),
    }));

    // Label
    if (opts.showLabel) {
      const pct = p1.price !== 0 ? ((p2.price - p1.price) / p1.price) * 100 : 0;
      const totalSeconds = Math.abs(p2.time - p1.time);
      const timeStr = formatRelative(totalSeconds);
      const text = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% · ${timeStr} · ±${(opts.confidenceLevel * sigmaPct * 100).toFixed(1)}%`;
      g.appendChild(Primitives.label({
        x: x2,
        y: y2 - 10,
        text,
        bg: opts.pathColor,
        color: '#ffffff',
        fontSize: 11,
        align: 'right',
        anchor: 'bottom',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const [p1, p2] = this.points;
    const x1 = ctx.projectX(p1.time);
    const y1 = ctx.projectY(p1.price);
    const x2 = ctx.projectX(p2.time);
    const y2 = ctx.projectY(p2.price);
    if (x1 == null || x2 == null || y1 == null || y2 == null) return false;
    return pointToSegmentDistance(x, y, x1, y1, x2, y2) < 8;
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

function formatRelative(seconds) {
  const s = Math.abs(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h) parts.push(h + 'h');
  if (m && !d) parts.push(m + 'm');
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
