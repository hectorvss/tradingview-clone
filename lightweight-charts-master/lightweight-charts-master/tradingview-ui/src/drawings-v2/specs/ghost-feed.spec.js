import { Primitives } from '../core/primitives.js';

// Ghost feed — emits N synthetic candles starting at the anchor point.
// Uses a deterministic (seeded) GBM random walk so the silhouette is stable
// across re-renders and only refreshes when the user clicks "regenerate".
export default {
  type: 'ghost-feed',
  label: 'Velas fantasma',
  icon: '👻',
  category: 'predict',
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
    bullColor: '#26a69a',
    bearColor: '#ef5350',
    bodyAlpha: 0.45,
    wickAlpha: 0.55,
    width: 1,
    numBars: 30,
    volatility: 0.012,
    drift: 0.0,
    seed: 0,        // 0 ⇒ auto-pick on first render
  },
  schema: {
    estilo: [
      { key: 'bullColor', type: 'color', label: 'Color alcista' },
      { key: 'bearColor', type: 'color', label: 'Color bajista' },
      { key: 'bodyAlpha', type: 'slider', label: 'Opacidad cuerpo', min: 0, max: 1, step: 0.05 },
      { key: 'wickAlpha', type: 'slider', label: 'Opacidad mecha', min: 0, max: 1, step: 0.05 },
      { key: 'width', type: 'slider', label: 'Grosor mecha', min: 1, max: 3, step: 1 },
    ],
    especifico: [
      { key: 'numBars', type: 'number', label: 'Nº de velas', min: 1, max: 500, step: 1 },
      { key: 'volatility', type: 'number', label: 'Volatilidad', min: 0, max: 1, step: 0.001 },
      { key: 'drift', type: 'number', label: 'Sesgo (drift)', min: -1, max: 1, step: 0.0005 },
      { key: 'seed', type: 'number', label: 'Semilla (0 = aleatoria)', min: 0, max: 1e9, step: 1 },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 1) return;
    const anchor = this.points[0];
    const ax = ctx.projectX(anchor.time);
    const ay = ctx.projectY(anchor.price);
    if (ax == null || ay == null) return;
    const opts = this.options;

    const candles = (this.manager && typeof this.manager.getCandles === 'function')
      ? (this.manager.getCandles() || []) : [];
    let barSeconds = 60;
    if (candles.length >= 2) {
      barSeconds = Math.max(1, candles[1].time - candles[0].time);
    }
    const barPx = estimateBarWidth(ctx, barSeconds);
    const halfBody = Math.max(1, Math.floor(barPx * 0.38));

    // resolve seed (cached on the drawing so reseed only when user changes it)
    if (!this._seed || this._seed !== opts.seed) {
      this._seed = opts.seed && opts.seed > 0
        ? (opts.seed >>> 0)
        : ((Math.random() * 1e9) >>> 0);
    }
    const rng = mulberry32(this._seed);
    const gauss = () => {
      // Box-Muller (clamped)
      let u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return Math.max(-4, Math.min(4, z));
    };

    let prev = anchor.price;
    const N = Math.max(1, Math.min(2000, Math.floor(opts.numBars)));
    for (let i = 0; i < N; i++) {
      const time = anchor.time + (i + 1) * barSeconds;
      const ret = opts.drift + opts.volatility * gauss();
      const close = Math.max(1e-9, prev * (1 + ret));
      const wHi = Math.abs(opts.volatility * rng());
      const wLo = Math.abs(opts.volatility * rng());
      const high = Math.max(prev, close) * (1 + wHi);
      const low = Math.min(prev, close) * (1 - wLo);
      const open = prev;
      prev = close;

      const cx = ctx.projectX(time);
      if (cx == null) continue;
      const yO = ctx.projectY(open);
      const yC = ctx.projectY(close);
      const yH = ctx.projectY(high);
      const yL = ctx.projectY(low);
      if (yO == null || yC == null || yH == null || yL == null) continue;
      const up = close >= open;
      const color = up ? opts.bullColor : opts.bearColor;
      // wick
      g.appendChild(Primitives.line({
        x1: cx, y1: yH, x2: cx, y2: yL,
        stroke: color, width: opts.width, strokeOpacity: opts.wickAlpha,
      }));
      // body
      const top = Math.min(yO, yC);
      const h = Math.max(1, Math.abs(yC - yO));
      g.appendChild(Primitives.rect({
        x: cx - halfBody, y: top, w: halfBody * 2, h,
        fill: color, fillOpacity: opts.bodyAlpha,
        stroke: color, width: 1, strokeOpacity: opts.bodyAlpha,
      }));
    }

    // anchor label
    g.appendChild(Primitives.label({
      x: ax, y: ay - 14,
      text: `Ghost · n=${N} · σ=${(opts.volatility * 100).toFixed(2)}%`,
      bg: 'rgba(80,80,120,0.85)', color: '#fff', fontSize: 10,
      align: 'center', anchor: 'bottom',
    }));
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 1) return false;
    const ax = ctx.projectX(this.points[0].time);
    const ay = ctx.projectY(this.points[0].price);
    if (ax == null || ay == null) return false;
    return Math.hypot(x - ax, y - ay) < 10;
  },

  getHandles(ctx) {
    if (this.points.length < 1) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};

function mulberry32(a) {
  let t = a >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function estimateBarWidth(ctx, barSeconds) {
  if (!ctx || typeof ctx.projectX !== 'function') return 6;
  // sample two adjacent bar-spaced times and measure distance
  const tNow = Math.floor(Date.now() / 1000);
  const a = ctx.projectX(tNow);
  const b = ctx.projectX(tNow + barSeconds);
  if (a != null && b != null && isFinite(a) && isFinite(b)) {
    const d = Math.abs(b - a);
    if (d > 0.5 && d < 200) return d;
  }
  return 6;
}
