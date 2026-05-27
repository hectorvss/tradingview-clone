import { Primitives } from '../core/primitives.js';

export default {
  type: 'long-position',
  label: 'Posición larga',
  icon: '▲',
  category: 'predict',
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
    accountSize: 10000,
    riskPct: 1,
    showRR: true,
    showStopTargetPct: true,
    gainColor: '#089981',
    lossColor: '#f23645',
    fillAlpha: 0.2,
    entryColor: '#ffffff',
    width: 1,
    extendRight: false,
  },
  schema: {
    estilo: [
      { key: 'gainColor', type: 'color', label: 'Color de ganancia' },
      { key: 'lossColor', type: 'color', label: 'Color de pérdida' },
      { key: 'entryColor', type: 'color', label: 'Color de entrada' },
      { key: 'fillAlpha', type: 'slider', label: 'Opacidad', min: 0, max: 1, step: 0.05 },
      { key: 'width', type: 'slider', label: 'Grosor', min: 1, max: 5, step: 1 },
    ],
    especifico: [
      { key: 'accountSize', type: 'number', label: 'Tamaño de cuenta' },
      { key: 'riskPct', type: 'number', label: 'Riesgo %', min: 0, max: 100, step: 0.1 },
      { key: 'showRR', type: 'toggle', label: 'Mostrar R:R' },
      { key: 'showStopTargetPct', type: 'toggle', label: 'Mostrar % SL / TP' },
      { key: 'extendRight', type: 'toggle', label: 'Extender a la derecha' },
    ],
    coord: 'auto',
  },

  render(g, ctx) {
    if (this.points.length < 3) return;
    const [entry, sl, tp] = this.points;
    const ex = ctx.projectX(entry.time);
    const ey = ctx.projectY(entry.price);
    const slY = ctx.projectY(sl.price);
    const tpY = ctx.projectY(tp.price);
    const endX = ctx.projectX(tp.time);
    if (ex == null || endX == null || ey == null || slY == null || tpY == null) return;
    const opts = this.options;
    const xLeft = Math.min(ex, endX);
    const xRight = opts.extendRight ? ctx.width : Math.max(ex, endX);
    // TP rect (green, between entry and tp)
    const tpTop = Math.min(ey, tpY);
    const tpH = Math.abs(tpY - ey);
    g.appendChild(Primitives.rect({
      x: xLeft, y: tpTop, w: xRight - xLeft, h: tpH,
      stroke: opts.gainColor, width: opts.width,
      fill: opts.gainColor, fillOpacity: opts.fillAlpha,
    }));
    // SL rect (red, between entry and sl)
    const slTop = Math.min(ey, slY);
    const slH = Math.abs(slY - ey);
    g.appendChild(Primitives.rect({
      x: xLeft, y: slTop, w: xRight - xLeft, h: slH,
      stroke: opts.lossColor, width: opts.width,
      fill: opts.lossColor, fillOpacity: opts.fillAlpha,
    }));
    // Entry line (white)
    g.appendChild(Primitives.line({
      x1: xLeft, y1: ey, x2: xRight, y2: ey,
      stroke: opts.entryColor, width: opts.width,
    }));
    // Labels
    const risk = Math.abs(entry.price - sl.price);
    const reward = Math.abs(tp.price - entry.price);
    const rr = risk > 0 ? reward / risk : 0;
    const stopPct = entry.price !== 0 ? Math.abs((sl.price - entry.price) / entry.price) * 100 : 0;
    const targetPct = entry.price !== 0 ? Math.abs((tp.price - entry.price) / entry.price) * 100 : 0;
    const labelLines = [];
    if (opts.showRR) labelLines.push(`R:R ${rr.toFixed(2)}`);
    if (opts.showStopTargetPct) {
      labelLines.push(`TP ${targetPct.toFixed(2)}%`);
      labelLines.push(`SL ${stopPct.toFixed(2)}%`);
    }
    if (labelLines.length) {
      g.appendChild(Primitives.label({
        x: (xLeft + xRight) / 2,
        y: ey - 6,
        text: labelLines.join('  •  '),
        color: opts.entryColor,
        bg: 'rgba(30,34,45,0.92)',
        fontSize: 11,
        align: 'center', anchor: 'bottom',
      }));
    }
  },

  hitTest(x, y, ctx) {
    if (this.points.length < 3) return false;
    const [entry, sl, tp] = this.points;
    const ex = ctx.projectX(entry.time);
    const endX = ctx.projectX(tp.time);
    const ey = ctx.projectY(entry.price);
    const slY = ctx.projectY(sl.price);
    const tpY = ctx.projectY(tp.price);
    if (ex == null || endX == null || ey == null || slY == null || tpY == null) return false;
    const opts = this.options;
    const xLeft = Math.min(ex, endX);
    const xRight = opts.extendRight ? ctx.width : Math.max(ex, endX);
    if (x < xLeft - 4 || x > xRight + 4) return false;
    const top = Math.min(slY, tpY);
    const bottom = Math.max(slY, tpY);
    return y >= top - 4 && y <= bottom + 4;
  },

  getHandles(ctx) {
    if (this.points.length < 3) return [];
    return this.points.map((p, i) => ({
      x: ctx.projectX(p.time),
      y: ctx.projectY(p.price),
      anchorIdx: i,
    })).filter(h => h.x != null);
  },
};
