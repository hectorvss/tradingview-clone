import { Primitives } from '../core/primitives.js';

// Fixed Range Volume Profile — bins volume across a price range over a
// temporal window defined by 2 anchors. Renders horizontal bars, POC, VAH/VAL.
export default {
  type: 'fixed-range-volume-profile',
  label: 'Perfil de volumen fijo',
  icon: '▮',
  category: 'anchored',
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
    bins: 50,
    side: 'right',          // 'right' | 'left'
    widthPx: 140,
    upColor: '#26a69a',
    downColor: '#ef5350',
    barAlpha: 0.7,
    pocColor: '#ffeb3b',
    showPoc: true,
    showValueArea: true,
    valueAreaPct: 0.7,
    vaColor: '#2962ff',
    vaAlpha: 0.12,
    showRangeOutline: true,
  },
  schema: {
    estilo: [
      { key: 'upColor', type: 'color', label: 'Color alcista' },
      { key: 'downColor', type: 'color', label: 'Color bajista' },
      { key: 'barAlpha', type: 'slider', label: 'Opacidad barras', min: 0, max: 1, step: 0.05 },
      { key: 'pocColor', type: 'color', label: 'Color POC' },
      { key: 'vaColor', type: 'color', label: 'Color área de valor' },
      { key: 'vaAlpha', type: 'slider', label: 'Opacidad área valor', min: 0, max: 1, step: 0.05 },
    ],
    especifico: [
      { key: 'bins', type: 'number', label: 'Nº de bins', min: 5, max: 250, step: 1 },
      { key: 'side', type: 'select', label: 'Lado', options: [
        { value: 'right', label: 'Derecha' },
        { value: 'left', label: 'Izquierda' },
      ]},
      { key: 'widthPx', type: 'number', label: 'Anchura (px)', min: 30, max: 400, step: 5 },
      { key: 'showPoc', type: 'toggle', label: 'Mostrar POC' },
      { key: 'showValueArea', type: 'toggle', label: 'Mostrar área de valor' },
      { key: 'valueAreaPct', type: 'slider', label: 'Área de valor %', min: 0.5, max: 0.95, step: 0.05 },
      { key: 'showRangeOutline', type: 'toggle', label: 'Mostrar borde del rango' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 2) return;
    const [p1, p2] = this.points;
    const x1 = ctx.projectX(p1.time);
    const x2 = ctx.projectX(p2.time);
    if (x1 == null || x2 == null) return;
    const opts = this.options;
    const xLeft = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);

    const candles = (this.manager && typeof this.manager.getCandles === 'function')
      ? (this.manager.getCandles() || []) : [];
    if (!candles.length) return;
    const lo = Math.min(p1.time, p2.time);
    const hi = Math.max(p1.time, p2.time);
    const inRange = candles.filter(c => c.time >= lo && c.time <= hi);
    if (!inRange.length) return;

    // price extents
    let pMin = Infinity, pMax = -Infinity;
    for (const c of inRange) {
      if (c.low < pMin) pMin = c.low;
      if (c.high > pMax) pMax = c.high;
    }
    if (!isFinite(pMin) || !isFinite(pMax) || pMin === pMax) return;

    const nBins = Math.max(5, Math.min(250, Math.floor(opts.bins)));
    const step = (pMax - pMin) / nBins;
    const bins = new Array(nBins).fill(0);
    const upBins = new Array(nBins).fill(0);
    const downBins = new Array(nBins).fill(0);

    // distribute each bar's volume evenly across the bins it spans
    for (const c of inRange) {
      const vol = c.volume || 0;
      if (vol <= 0) continue;
      const idxLo = Math.max(0, Math.floor((c.low - pMin) / step));
      const idxHi = Math.min(nBins - 1, Math.floor((c.high - pMin) / step));
      const span = Math.max(1, idxHi - idxLo + 1);
      const share = vol / span;
      const up = c.close >= c.open;
      for (let i = idxLo; i <= idxHi; i++) {
        bins[i] += share;
        if (up) upBins[i] += share;
        else downBins[i] += share;
      }
    }

    let maxVol = 0, pocIdx = 0;
    for (let i = 0; i < nBins; i++) {
      if (bins[i] > maxVol) { maxVol = bins[i]; pocIdx = i; }
    }
    if (maxVol <= 0) return;

    // Value area: expand from POC outward until sum >= valueAreaPct * total
    const total = bins.reduce((a, b) => a + b, 0);
    const target = total * opts.valueAreaPct;
    let lo2 = pocIdx, hi2 = pocIdx, acc = bins[pocIdx];
    while (acc < target && (lo2 > 0 || hi2 < nBins - 1)) {
      const left = lo2 > 0 ? bins[lo2 - 1] : -1;
      const right = hi2 < nBins - 1 ? bins[hi2 + 1] : -1;
      if (right >= left) { hi2++; acc += bins[hi2]; }
      else { lo2--; acc += bins[lo2]; }
    }

    const widthPx = Math.max(20, Math.min(opts.widthPx, (xRight - xLeft) * 0.9));
    const profileLeft = opts.side === 'left'
      ? xLeft - widthPx - 2
      : xRight + 2;

    // Range outline
    if (opts.showRangeOutline) {
      const yTop = ctx.projectY(pMax);
      const yBot = ctx.projectY(pMin);
      if (yTop != null && yBot != null) {
        g.appendChild(Primitives.rect({
          x: xLeft, y: Math.min(yTop, yBot),
          w: xRight - xLeft, h: Math.abs(yBot - yTop),
          fill: 'none', stroke: '#787b86', width: 1, dashArray: '2,3',
        }));
      }
    }

    // Value area shaded behind bars
    if (opts.showValueArea) {
      const yVAH = ctx.projectY(pMin + (hi2 + 1) * step);
      const yVAL = ctx.projectY(pMin + lo2 * step);
      if (yVAH != null && yVAL != null) {
        const yT = Math.min(yVAH, yVAL);
        const yB = Math.max(yVAH, yVAL);
        g.appendChild(Primitives.rect({
          x: profileLeft, y: yT, w: widthPx, h: yB - yT,
          fill: opts.vaColor, fillOpacity: opts.vaAlpha,
          stroke: opts.vaColor, width: 1, strokeOpacity: 0.4,
        }));
      }
    }

    // Bars
    for (let i = 0; i < nBins; i++) {
      const v = bins[i];
      if (v <= 0) continue;
      const yTop = ctx.projectY(pMin + (i + 1) * step);
      const yBot = ctx.projectY(pMin + i * step);
      if (yTop == null || yBot == null) continue;
      const h = Math.max(1, Math.abs(yBot - yTop));
      const w = (v / maxVol) * widthPx;
      const up = upBins[i], down = downBins[i];
      const upW = v > 0 ? (up / v) * w : 0;
      const downW = w - upW;
      // bull part
      const xUp = opts.side === 'left' ? profileLeft + widthPx - upW : profileLeft;
      g.appendChild(Primitives.rect({
        x: xUp, y: Math.min(yTop, yBot), w: upW, h,
        fill: opts.upColor, fillOpacity: opts.barAlpha,
        stroke: 'none', width: 0,
      }));
      // bear part
      const xDown = opts.side === 'left' ? profileLeft + widthPx - upW - downW : profileLeft + upW;
      g.appendChild(Primitives.rect({
        x: xDown, y: Math.min(yTop, yBot), w: downW, h,
        fill: opts.downColor, fillOpacity: opts.barAlpha,
        stroke: 'none', width: 0,
      }));
    }

    // POC line
    if (opts.showPoc) {
      const pocPrice = pMin + (pocIdx + 0.5) * step;
      const yPoc = ctx.projectY(pocPrice);
      if (yPoc != null) {
        g.appendChild(Primitives.line({
          x1: xLeft, y1: yPoc, x2: profileLeft + widthPx, y2: yPoc,
          stroke: opts.pocColor, width: 1.5,
        }));
        g.appendChild(Primitives.label({
          x: profileLeft + widthPx, y: yPoc,
          text: `POC ${pocPrice.toFixed(2)}`,
          bg: opts.pocColor, color: '#000',
          fontSize: 10, align: 'right', anchor: 'middle',
        }));
      }
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 2) return false;
    const x1 = ctx.projectX(this.points[0].time);
    const x2 = ctx.projectX(this.points[1].time);
    if (x1 == null || x2 == null) return false;
    const xLeft = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);
    const w = this.options.widthPx;
    const profLeft = this.options.side === 'left' ? xLeft - w - 2 : xRight + 2;
    const profRight = profLeft + w;
    if (x >= profLeft - 4 && x <= profRight + 4 && y >= 0 && y <= ctx.height) return true;
    return x >= xLeft - 4 && x <= xRight + 4 && y >= 0 && y <= ctx.height &&
      (Math.abs(x - xLeft) < 6 || Math.abs(x - xRight) < 6);
  },

  getHandles(ctx) {
    if (this.points.length < 2) return [];
    const yMid = ctx.height / 2;
    return this.points.map((p, i) => {
      const x = ctx.projectX(p.time);
      if (x == null) return null;
      return { x, y: yMid, anchorIdx: i };
    }).filter(Boolean);
  },
};
