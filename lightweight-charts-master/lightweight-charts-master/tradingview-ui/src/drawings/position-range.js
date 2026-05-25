/* =========================================================================
   Position & Range Drawing Tools — self-contained SVG-overlay primitives.

   Exports (factories — no global side effects):
     createLongPositionTool(svgOverlay, chart, series, opts?)  → handle
     createShortPositionTool(svgOverlay, chart, series, opts?) → handle
     createDateRangeTool(svgOverlay, chart, series, opts?)     → handle
     createPriceRangeTool(svgOverlay, chart, series, opts?)    → handle

   Registry:
     POSITION_RANGE_TOOLS = { long, short, dateRange, priceRange }
       each entry → { label, icon, factory }

   Each handle:
     { startDraw(), cancel(), destroy() }

   Persistence: localStorage["tv.drawings_pr_range"]  (array of {id,kind,points,opts})

   Drawing kinds & anchors:
     long        : 3 points  [entry, stopLoss, takeProfit]   (points share a common time)
     short       : 3 points  [entry, stopLoss, takeProfit]
     dateRange   : 2 points  [{time:t1}, {time:t2}]
     priceRange  : 2 points  [{price:p1}, {price:p2}]

   Coordinate conversion:
     x = chart.timeScale().timeToCoordinate(time)
     y = series.priceToCoordinate(price)
     inverses analogously.

   ========================================================================= */

const STORAGE_KEY = 'tv.drawings_pr_range';
const SVG_NS = 'http://www.w3.org/2000/svg';

const COLOR_LONG_REWARD   = '#26a69a';
const COLOR_LONG_RISK     = '#ef5350';
const COLOR_SHORT_REWARD  = '#26a69a';
const COLOR_SHORT_RISK    = '#ef5350';
const COLOR_RANGE         = '#2962ff';
const COLOR_HANDLE_STROKE = '#ffffff';
const FILL_OPACITY        = 0.18;
const STROKE_WIDTH        = 1.25;
const HIT_PX              = 7;

let _uid = 0;
const uid = (k) => `pr_${k}_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

/* ===== Shared persistence (per overlay) ============================== */
// All drawings created across the four factories on the SAME chart should
// share storage. We key by chart instance via a WeakMap so multiple charts
// stay independent.
const _sharedStateByChart = new WeakMap();

function getShared(chart, svgOverlay, series) {
  let shared = _sharedStateByChart.get(chart);
  if (shared) return shared;
  shared = {
    svgOverlay,
    series,
    drawings: [],   // active Drawing instances on this chart
    selected: null,
    syncAll() {
      this.drawings.forEach(d => d.sync());
    },
    save() {
      try {
        const json = this.drawings.map(d => d.toJSON());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      } catch (e) { console.warn('[position-range] save failed', e); }
    },
    loaded: false,
  };
  _sharedStateByChart.set(chart, shared);

  // Re-sync on chart events.
  try {
    chart.subscribeCrosshairMove(() => shared.syncAll());
    chart.timeScale().subscribeVisibleTimeRangeChange(() => shared.syncAll());
    chart.timeScale().subscribeSizeChange(() => shared.syncAll());
  } catch {}

  // Keyboard: Esc clears selection, Delete removes selected.
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      shared.drawings.forEach(d => d.setSelected(false));
      shared.selected = null;
    } else if ((ev.key === 'Delete' || ev.key === 'Backspace') && shared.selected) {
      if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/i.test(document.activeElement.tagName)) return;
      const id = shared.selected.id;
      removeFromShared(shared, id);
    }
  });

  return shared;
}

function removeFromShared(shared, id) {
  const i = shared.drawings.findIndex(d => d.id === id);
  if (i < 0) return;
  shared.drawings[i].destroy();
  shared.drawings.splice(i, 1);
  if (shared.selected && shared.selected.id === id) shared.selected = null;
  shared.save();
}

/* ===== SVG helpers ===================================================== */
function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function ensureOverlayBox(svgOverlay) {
  // We need to know overlay pixel size for label clamping.
  const r = svgOverlay.getBoundingClientRect();
  return { width: r.width, height: r.height, left: r.left, top: r.top };
}

function clientToOverlay(svgOverlay, clientX, clientY) {
  const r = svgOverlay.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

/* ===== Drawing base class ============================================== */
class PRDrawing {
  /**
   * @param {object} cfg
   * @param {'long'|'short'|'dateRange'|'priceRange'} cfg.kind
   * @param {Array<{time?:number, price?:number}>} cfg.points
   * @param {object} cfg.opts
   * @param {SVGSVGElement} cfg.svgOverlay
   * @param {object} cfg.chart
   * @param {object} cfg.series
   * @param {object} cfg.shared
   * @param {string} [cfg.id]
   */
  constructor(cfg) {
    this.id = cfg.id || uid(cfg.kind);
    this.kind = cfg.kind;
    this.points = cfg.points.map(p => ({ ...p }));
    this.opts = { ...(cfg.opts || {}) };
    this.svg = cfg.svgOverlay;
    this.chart = cfg.chart;
    this.series = cfg.series;
    this.shared = cfg.shared;

    /** @type {SVGGElement} group containing all visual elements. */
    this.group = svgEl('g', { 'data-drawing-id': this.id, 'data-kind': this.kind });
    this.group.style.pointerEvents = 'auto';
    this.svg.appendChild(this.group);

    /** @type {SVGElement[]} background shapes (zones / lines). */
    this.shapes = [];
    /** @type {SVGCircleElement[]} draggable handles. */
    this.handles = [];
    /** @type {SVGElement[]} text/label elements. */
    this.labels = [];

    this.selected = false;
    this._build();
    this.sync();
    this._attachBodyDrag();
  }

  /* ---- build (called once on construction) ---- */
  _build() {
    if (this.kind === 'long' || this.kind === 'short') {
      this._buildPosition();
    } else if (this.kind === 'dateRange') {
      this._buildDateRange();
    } else if (this.kind === 'priceRange') {
      this._buildPriceRange();
    }
    this._buildHandles();
  }

  _buildPosition() {
    // Two filled rects (risk / reward) + center entry line.
    const isLong = this.kind === 'long';
    const rewardColor = isLong ? COLOR_LONG_REWARD : COLOR_SHORT_REWARD;
    const riskColor   = isLong ? COLOR_LONG_RISK   : COLOR_SHORT_RISK;

    this.rewardRect = svgEl('rect', {
      fill: rewardColor, 'fill-opacity': FILL_OPACITY,
      stroke: rewardColor, 'stroke-opacity': 0.6, 'stroke-width': STROKE_WIDTH,
    });
    this.riskRect = svgEl('rect', {
      fill: riskColor, 'fill-opacity': FILL_OPACITY,
      stroke: riskColor, 'stroke-opacity': 0.6, 'stroke-width': STROKE_WIDTH,
    });
    this.entryLine = svgEl('line', {
      stroke: '#ffeb3b', 'stroke-width': 1.5, 'stroke-dasharray': '4 3',
    });
    this.group.appendChild(this.rewardRect);
    this.group.appendChild(this.riskRect);
    this.group.appendChild(this.entryLine);
    this.shapes.push(this.rewardRect, this.riskRect, this.entryLine);

    // Labels: TP %, SL %, R:R, risk $
    this.lblTP    = this._mkLabel(rewardColor);
    this.lblSL    = this._mkLabel(riskColor);
    this.lblRR    = this._mkLabel('#dbdbdb');
    this.lblRisk  = this._mkLabel('#9ca3af');
    this.labels.push(this.lblTP, this.lblSL, this.lblRR, this.lblRisk);
  }

  _buildDateRange() {
    this.leftLine  = svgEl('line', { stroke: COLOR_RANGE, 'stroke-width': STROKE_WIDTH });
    this.rightLine = svgEl('line', { stroke: COLOR_RANGE, 'stroke-width': STROKE_WIDTH });
    this.rangeRect = svgEl('rect', {
      fill: COLOR_RANGE, 'fill-opacity': FILL_OPACITY * 0.6,
    });
    this.group.appendChild(this.rangeRect);
    this.group.appendChild(this.leftLine);
    this.group.appendChild(this.rightLine);
    this.shapes.push(this.rangeRect, this.leftLine, this.rightLine);

    this.lblBars     = this._mkLabel('#dbdbdb');
    this.lblDuration = this._mkLabel('#9ca3af');
    this.labels.push(this.lblBars, this.lblDuration);
  }

  _buildPriceRange() {
    this.topLine    = svgEl('line', { stroke: COLOR_RANGE, 'stroke-width': STROKE_WIDTH });
    this.bottomLine = svgEl('line', { stroke: COLOR_RANGE, 'stroke-width': STROKE_WIDTH });
    this.rangeRect  = svgEl('rect', {
      fill: COLOR_RANGE, 'fill-opacity': FILL_OPACITY * 0.6,
    });
    this.group.appendChild(this.rangeRect);
    this.group.appendChild(this.topLine);
    this.group.appendChild(this.bottomLine);
    this.shapes.push(this.rangeRect, this.topLine, this.bottomLine);

    this.lblDelta    = this._mkLabel('#dbdbdb');
    this.lblDeltaPct = this._mkLabel('#9ca3af');
    this.labels.push(this.lblDelta, this.lblDeltaPct);
  }

  _mkLabel(color) {
    const g = svgEl('g', { 'pointer-events': 'none' });
    const bg = svgEl('rect', {
      fill: '#1c1c1c', 'fill-opacity': 0.85,
      stroke: '#2e2e2e', 'stroke-width': 1, rx: 2, ry: 2,
    });
    const text = svgEl('text', {
      fill: color,
      'font-family': 'system-ui, -apple-system, "Segoe UI", sans-serif',
      'font-size': '11', 'dominant-baseline': 'middle',
    });
    g.appendChild(bg);
    g.appendChild(text);
    this.group.appendChild(g);
    g._bg = bg;
    g._text = text;
    g.setLabel = (str) => {
      text.textContent = str;
      // Defer measure to next frame (SVG getBBox needs to be in DOM).
      const b = text.getBBox();
      bg.setAttribute('x', b.x - 4);
      bg.setAttribute('y', b.y - 2);
      bg.setAttribute('width', b.width + 8);
      bg.setAttribute('height', b.height + 4);
    };
    g.setPos = (x, y) => {
      g.setAttribute('transform', `translate(${x}, ${y})`);
    };
    g.hide = () => { g.style.display = 'none'; };
    g.show = () => { g.style.display = ''; };
    return g;
  }

  _buildHandles() {
    this.points.forEach((_p, idx) => {
      const c = svgEl('circle', {
        r: 5,
        fill: '#2962ff',
        stroke: COLOR_HANDLE_STROKE,
        'stroke-width': 2,
        'data-anchor': idx,
      });
      c.style.cursor = (this.kind === 'dateRange') ? 'ew-resize'
                     : (this.kind === 'priceRange') ? 'ns-resize'
                     : 'move';
      c.style.display = 'none';
      this.group.appendChild(c);
      this.handles.push(c);
      this._attachHandleDrag(c, idx);
    });
  }

  /* ---- coord helpers ---- */
  _x(time) {
    if (time == null) return null;
    const x = this.chart.timeScale().timeToCoordinate(time);
    return (typeof x === 'number' && isFinite(x)) ? x : null;
  }
  _y(price) {
    if (price == null) return null;
    const y = this.series.priceToCoordinate(price);
    return (typeof y === 'number' && isFinite(y)) ? y : null;
  }
  _timeFromX(x) {
    const t = this.chart.timeScale().coordinateToTime(x);
    return t == null ? null : t;
  }
  _priceFromY(y) {
    const p = this.series.coordinateToPrice(y);
    return p == null ? null : p;
  }
  _overlayWidth()  { return this.svg.clientWidth  || this.svg.getBoundingClientRect().width; }
  _overlayHeight() { return this.svg.clientHeight || this.svg.getBoundingClientRect().height; }

  /* ---- sync (positions visual elements based on current points) ---- */
  sync() {
    if (this.kind === 'long' || this.kind === 'short') this._syncPosition();
    else if (this.kind === 'dateRange') this._syncDateRange();
    else if (this.kind === 'priceRange') this._syncPriceRange();
    this._syncHandles();
  }

  _syncPosition() {
    // points: [entry, stopLoss, takeProfit] — entry.time defines horizontal anchor;
    // the box extends from entry.time to entry.time + (entry.spanBars * barSize) OR
    // we use a 2nd time stored on entry as `endTime`. We use entry.endTime if present
    // else span the visible range to the right of entry.time.
    const [entry, sl, tp] = this.points;
    const xEntry = this._x(entry.time);
    let xEnd;
    if (entry.endTime != null) xEnd = this._x(entry.endTime);
    if (xEnd == null) {
      // Fall back: extend to right edge of overlay.
      xEnd = this._overlayWidth();
    }
    const yEntry = this._y(entry.price);
    const ySL    = this._y(sl.price);
    const yTP    = this._y(tp.price);

    if (xEntry == null || yEntry == null || ySL == null || yTP == null) {
      this.shapes.forEach(s => s.setAttribute('opacity', '0'));
      this.labels.forEach(l => l.hide());
      return;
    }
    this.shapes.forEach(s => s.removeAttribute('opacity'));

    const x1 = Math.min(xEntry, xEnd);
    const x2 = Math.max(xEntry, xEnd);
    const w  = Math.max(1, x2 - x1);

    // Reward zone: from entry → TP
    const yRewardTop    = Math.min(yEntry, yTP);
    const yRewardBottom = Math.max(yEntry, yTP);
    this.rewardRect.setAttribute('x', x1);
    this.rewardRect.setAttribute('y', yRewardTop);
    this.rewardRect.setAttribute('width', w);
    this.rewardRect.setAttribute('height', Math.max(0, yRewardBottom - yRewardTop));

    // Risk zone: from entry → SL
    const yRiskTop    = Math.min(yEntry, ySL);
    const yRiskBottom = Math.max(yEntry, ySL);
    this.riskRect.setAttribute('x', x1);
    this.riskRect.setAttribute('y', yRiskTop);
    this.riskRect.setAttribute('width', w);
    this.riskRect.setAttribute('height', Math.max(0, yRiskBottom - yRiskTop));

    // Entry centerline.
    this.entryLine.setAttribute('x1', x1);
    this.entryLine.setAttribute('x2', x2);
    this.entryLine.setAttribute('y1', yEntry);
    this.entryLine.setAttribute('y2', yEntry);

    // Stats.
    const e  = entry.price;
    const slP = sl.price;
    const tpP = tp.price;
    const riskPerUnit   = Math.abs(e - slP);
    const rewardPerUnit = Math.abs(tpP - e);
    const rr = riskPerUnit > 0 ? (rewardPerUnit / riskPerUnit) : 0;
    const pctSL = e !== 0 ? ((slP - e) / e) * 100 : 0;
    const pctTP = e !== 0 ? ((tpP - e) / e) * 100 : 0;
    const accountSize = Number(this.opts.accountSize) || 0;
    const riskPct     = Number(this.opts.riskPct) || 1;
    const riskAmount  = accountSize > 0 ? (accountSize * (riskPct / 100)) : 0;

    this.lblTP.setLabel(`TP ${tpP.toFixed(2)}  ${pctTP >= 0 ? '+' : ''}${pctTP.toFixed(2)}%`);
    this.lblSL.setLabel(`SL ${slP.toFixed(2)}  ${pctSL >= 0 ? '+' : ''}${pctSL.toFixed(2)}%`);
    this.lblRR.setLabel(`R:R 1:${rr.toFixed(2)}`);
    if (accountSize > 0) {
      this.lblRisk.setLabel(`Risk $${riskAmount.toFixed(2)}`);
      this.lblRisk.show();
    } else {
      this.lblRisk.hide();
    }
    this.lblTP.show(); this.lblSL.show(); this.lblRR.show();

    // Position labels just outside box edges, clamped to overlay.
    const W = this._overlayWidth();
    const labelX = Math.min(x2 + 6, W - 4);
    this.lblTP.setPos(labelX, (yEntry + yTP) / 2);
    this.lblSL.setPos(labelX, (yEntry + ySL) / 2);
    this.lblRR.setPos(labelX, yEntry - 14);
    this.lblRisk.setPos(labelX, yEntry + 14);
  }

  _syncDateRange() {
    const [a, b] = this.points;
    const xA = this._x(a.time);
    const xB = this._x(b.time);
    if (xA == null || xB == null) {
      this.shapes.forEach(s => s.setAttribute('opacity', '0'));
      this.labels.forEach(l => l.hide());
      return;
    }
    this.shapes.forEach(s => s.removeAttribute('opacity'));
    const x1 = Math.min(xA, xB);
    const x2 = Math.max(xA, xB);
    const H  = this._overlayHeight();
    this.rangeRect.setAttribute('x', x1);
    this.rangeRect.setAttribute('y', 0);
    this.rangeRect.setAttribute('width', Math.max(1, x2 - x1));
    this.rangeRect.setAttribute('height', H);
    this.leftLine.setAttribute('x1', x1);
    this.leftLine.setAttribute('x2', x1);
    this.leftLine.setAttribute('y1', 0);
    this.leftLine.setAttribute('y2', H);
    this.rightLine.setAttribute('x1', x2);
    this.rightLine.setAttribute('x2', x2);
    this.rightLine.setAttribute('y1', 0);
    this.rightLine.setAttribute('y2', H);

    // Stats.
    const dtSec = Math.abs(Number(b.time) - Number(a.time));
    const barSec = guessBarSeconds(this.chart) || dtSec;
    const bars = barSec > 0 ? Math.round(dtSec / barSec) : 0;
    this.lblBars.setLabel(`${bars} bars`);
    this.lblDuration.setLabel(humanDuration(dtSec));
    this.lblBars.show(); this.lblDuration.show();

    const mid = (x1 + x2) / 2;
    this.lblBars.setPos(mid, 16);
    this.lblDuration.setPos(mid, 34);
  }

  _syncPriceRange() {
    const [a, b] = this.points;
    const yA = this._y(a.price);
    const yB = this._y(b.price);
    if (yA == null || yB == null) {
      this.shapes.forEach(s => s.setAttribute('opacity', '0'));
      this.labels.forEach(l => l.hide());
      return;
    }
    this.shapes.forEach(s => s.removeAttribute('opacity'));
    const y1 = Math.min(yA, yB);
    const y2 = Math.max(yA, yB);
    const W  = this._overlayWidth();
    this.rangeRect.setAttribute('x', 0);
    this.rangeRect.setAttribute('y', y1);
    this.rangeRect.setAttribute('width', W);
    this.rangeRect.setAttribute('height', Math.max(1, y2 - y1));
    this.topLine.setAttribute('x1', 0);
    this.topLine.setAttribute('x2', W);
    this.topLine.setAttribute('y1', y1);
    this.topLine.setAttribute('y2', y1);
    this.bottomLine.setAttribute('x1', 0);
    this.bottomLine.setAttribute('x2', W);
    this.bottomLine.setAttribute('y1', y2);
    this.bottomLine.setAttribute('y2', y2);

    const dp = Math.abs(Number(b.price) - Number(a.price));
    const base = Math.min(Number(a.price), Number(b.price));
    const pct = base !== 0 ? (dp / base) * 100 : 0;
    this.lblDelta.setLabel(`Δ ${dp.toFixed(4)}`);
    this.lblDeltaPct.setLabel(`Δ ${pct.toFixed(2)}%`);
    this.lblDelta.show(); this.lblDeltaPct.show();

    const midY = (y1 + y2) / 2;
    this.lblDelta.setPos(W - 90, midY - 8);
    this.lblDeltaPct.setPos(W - 90, midY + 10);
  }

  _syncHandles() {
    this.handles.forEach((h, idx) => {
      const p = this.points[idx];
      let cx, cy;
      if (this.kind === 'dateRange') {
        cx = this._x(p.time);
        cy = this._overlayHeight() / 2;
      } else if (this.kind === 'priceRange') {
        cx = this._overlayWidth() / 2;
        cy = this._y(p.price);
      } else {
        // Position tools — handles on the LEFT edge (entry.time) of the box.
        const entry = this.points[0];
        cx = this._x(entry.time);
        cy = this._y(p.price);
      }
      if (cx == null || cy == null) {
        h.style.display = 'none';
        return;
      }
      h.setAttribute('cx', cx);
      h.setAttribute('cy', cy);
      h.style.display = this.selected ? 'block' : 'none';
    });
  }

  setSelected(sel) {
    this.selected = sel;
    this.handles.forEach(h => { h.style.display = sel ? 'block' : 'none'; });
    this.group.setAttribute('data-selected', sel ? '1' : '0');
  }

  /* ---- drag: single handle ---- */
  _attachHandleDrag(handleEl, anchorIdx) {
    let dragging = false;
    handleEl.addEventListener('mousedown', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      dragging = true;
      this.shared.drawings.forEach(d => d.setSelected(d.id === this.id));
      this.shared.selected = this;
    });
    const onMove = (ev) => {
      if (!dragging) return;
      const { x, y } = clientToOverlay(this.svg, ev.clientX, ev.clientY);
      if (this.kind === 'dateRange') {
        const t = this._timeFromX(x);
        if (t == null) return;
        this.points[anchorIdx] = { ...this.points[anchorIdx], time: t };
      } else if (this.kind === 'priceRange') {
        const p = this._priceFromY(y);
        if (p == null) return;
        this.points[anchorIdx] = { ...this.points[anchorIdx], price: p };
      } else {
        // long/short — handle 0 = entry (time + price draggable), 1 = SL (price), 2 = TP (price)
        if (anchorIdx === 0) {
          const t = this._timeFromX(x);
          const p = this._priceFromY(y);
          if (t == null || p == null) return;
          this.points[0] = { ...this.points[0], time: t, price: p };
        } else {
          const p = this._priceFromY(y);
          if (p == null) return;
          this.points[anchorIdx] = { ...this.points[anchorIdx], price: p };
        }
      }
      this.sync();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      this.shared.save();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this._cleanup = this._cleanup || [];
    this._cleanup.push(() => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
  }

  /* ---- drag: whole body (move) ---- */
  _attachBodyDrag() {
    let drag = null;
    const onDown = (ev) => {
      // ignore clicks on a handle (they have their own listener that stops prop)
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-anchor') != null) return;
      if (ev.button !== 0) return;
      const { x, y } = clientToOverlay(this.svg, ev.clientX, ev.clientY);
      if (!this._hitTest(x, y)) return;
      ev.stopPropagation();
      this.shared.drawings.forEach(d => d.setSelected(d.id === this.id));
      this.shared.selected = this;
      const startTime = this._timeFromX(x);
      const startPrice = this._priceFromY(y);
      drag = {
        startTime, startPrice,
        startPts: this.points.map(p => ({ ...p })),
      };
    };
    const onMove = (ev) => {
      if (!drag) return;
      const { x, y } = clientToOverlay(this.svg, ev.clientX, ev.clientY);
      const t = this._timeFromX(x);
      const p = this._priceFromY(y);
      if (t == null || p == null) return;
      const dt = (drag.startTime != null && t != null) ? (Number(t) - Number(drag.startTime)) : 0;
      const dp = (drag.startPrice != null && p != null) ? (p - drag.startPrice) : 0;
      this.points = drag.startPts.map((sp, idx) => {
        const out = { ...sp };
        if (this.kind === 'dateRange') {
          if (sp.time != null) out.time = Number(sp.time) + dt;
        } else if (this.kind === 'priceRange') {
          if (sp.price != null) out.price = sp.price + dp;
        } else {
          // long/short — translate entry time + all prices
          if (idx === 0 && sp.time != null) out.time = Number(sp.time) + dt;
          if (sp.price != null) out.price = sp.price + dp;
          // endTime, if set on entry, also shifts
          if (idx === 0 && sp.endTime != null) out.endTime = Number(sp.endTime) + dt;
        }
        return out;
      });
      this.sync();
    };
    const onUp = () => {
      if (!drag) return;
      drag = null;
      this.shared.save();
    };
    this.group.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this._cleanup = this._cleanup || [];
    this._cleanup.push(() => {
      this.group.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
  }

  /* ---- hit-test (pixel space) ---- */
  _hitTest(x, y) {
    if (this.kind === 'dateRange') {
      const [a, b] = this.points;
      const xA = this._x(a.time);
      const xB = this._x(b.time);
      if (xA == null || xB == null) return false;
      const x1 = Math.min(xA, xB), x2 = Math.max(xA, xB);
      // hit if on either vertical line OR inside the band (loose)
      return (Math.abs(x - x1) <= HIT_PX) || (Math.abs(x - x2) <= HIT_PX)
          || (x >= x1 && x <= x2 && y >= 0 && y <= this._overlayHeight());
    }
    if (this.kind === 'priceRange') {
      const [a, b] = this.points;
      const yA = this._y(a.price);
      const yB = this._y(b.price);
      if (yA == null || yB == null) return false;
      const y1 = Math.min(yA, yB), y2 = Math.max(yA, yB);
      return (Math.abs(y - y1) <= HIT_PX) || (Math.abs(y - y2) <= HIT_PX)
          || (y >= y1 && y <= y2 && x >= 0 && x <= this._overlayWidth());
    }
    // long/short
    const [entry, sl, tp] = this.points;
    const xEntry = this._x(entry.time);
    let xEnd = entry.endTime != null ? this._x(entry.endTime) : null;
    if (xEnd == null) xEnd = this._overlayWidth();
    const yE = this._y(entry.price);
    const yS = this._y(sl.price);
    const yT = this._y(tp.price);
    if (xEntry == null || yE == null || yS == null || yT == null) return false;
    const x1 = Math.min(xEntry, xEnd), x2 = Math.max(xEntry, xEnd);
    const yMin = Math.min(yE, yS, yT), yMax = Math.max(yE, yS, yT);
    return x >= x1 && x <= x2 && y >= yMin && y <= yMax;
  }

  toJSON() {
    return { id: this.id, kind: this.kind, points: this.points, opts: this.opts };
  }

  destroy() {
    (this._cleanup || []).forEach(fn => { try { fn(); } catch {} });
    this._cleanup = [];
    if (this.group && this.group.parentNode) this.group.parentNode.removeChild(this.group);
  }
}

/* ===== Factories ======================================================= */
/**
 * Generic factory that produces {startDraw, cancel, destroy}. `kind` selects
 * the drawing type; `pointsRequired` selects how many overlay clicks are
 * needed before instantiating a Drawing.
 */
function makeFactory(kind, pointsRequired, svgOverlay, chart, series, opts = {}) {
  const shared = getShared(chart, svgOverlay, series);
  loadFromStorage(shared, svgOverlay, chart, series);

  let active = false;
  let anchors = [];
  let previewLine = null;
  const localCleanup = [];

  function chartCoordsFromEvent(ev) {
    const { x, y } = clientToOverlay(svgOverlay, ev.clientX, ev.clientY);
    const time  = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    return { x, y, time, price };
  }

  function showPreview(x1, y1, x2, y2) {
    if (!previewLine) {
      previewLine = svgEl('line', {
        stroke: '#2962ff', 'stroke-width': 1, 'stroke-dasharray': '4 3',
      });
      svgOverlay.appendChild(previewLine);
    }
    previewLine.setAttribute('x1', x1);
    previewLine.setAttribute('y1', y1);
    previewLine.setAttribute('x2', x2);
    previewLine.setAttribute('y2', y2);
  }
  function hidePreview() {
    if (previewLine && previewLine.parentNode) previewLine.parentNode.removeChild(previewLine);
    previewLine = null;
  }

  function onClick(ev) {
    if (!active) return;
    const { x, y, time, price } = chartCoordsFromEvent(ev);
    if (time == null || price == null) return;
    anchors.push({ x, y, time, price });
    if (anchors.length >= pointsRequired) {
      finishDrawing();
    }
  }

  function onMove(ev) {
    if (!active || anchors.length === 0) return;
    const { x, y } = clientToOverlay(svgOverlay, ev.clientX, ev.clientY);
    const a = anchors[0];
    showPreview(a.x, a.y, x, y);
  }

  function finishDrawing() {
    let points;
    if (kind === 'long' || kind === 'short') {
      // anchors: [entry, sl, tp]
      const entry = anchors[0];
      const sl    = anchors[1];
      const tp    = anchors[2];
      const entryPoint = {
        time: entry.time,
        price: entry.price,
        // endTime: last click's time, giving the box a horizontal extent.
        endTime: tp.time,
      };
      points = [
        entryPoint,
        { price: sl.price },
        { price: tp.price },
      ];
    } else if (kind === 'dateRange') {
      points = [{ time: anchors[0].time }, { time: anchors[1].time }];
    } else if (kind === 'priceRange') {
      points = [{ price: anchors[0].price }, { price: anchors[1].price }];
    }
    const d = new PRDrawing({
      kind, points, opts, svgOverlay, chart, series, shared,
    });
    shared.drawings.push(d);
    shared.save();
    cancel();
  }

  function startDraw() {
    if (active) return;
    active = true;
    anchors = [];
    // Make overlay interactive while drawing.
    const prevPE = svgOverlay.style.pointerEvents;
    svgOverlay.style.pointerEvents = 'auto';
    svgOverlay.style.cursor = 'crosshair';
    svgOverlay.addEventListener('click', onClick);
    svgOverlay.addEventListener('mousemove', onMove);
    const onKey = (ev) => { if (ev.key === 'Escape') cancel(); };
    document.addEventListener('keydown', onKey);
    localCleanup.length = 0;
    localCleanup.push(() => {
      svgOverlay.removeEventListener('click', onClick);
      svgOverlay.removeEventListener('mousemove', onMove);
      document.removeEventListener('keydown', onKey);
      svgOverlay.style.pointerEvents = prevPE;
      svgOverlay.style.cursor = '';
    });
  }

  function cancel() {
    active = false;
    anchors = [];
    hidePreview();
    while (localCleanup.length) { try { localCleanup.pop()(); } catch {} }
  }

  function destroy() {
    cancel();
    // Note: does NOT remove already-placed drawings (those live in shared state).
  }

  return { startDraw, cancel, destroy };
}

/* ---- Public factory exports ---- */
export function createLongPositionTool(svgOverlay, chart, series, opts) {
  return makeFactory('long', 3, svgOverlay, chart, series, opts || {});
}
export function createShortPositionTool(svgOverlay, chart, series, opts) {
  return makeFactory('short', 3, svgOverlay, chart, series, opts || {});
}
export function createDateRangeTool(svgOverlay, chart, series, opts) {
  return makeFactory('dateRange', 2, svgOverlay, chart, series, opts || {});
}
export function createPriceRangeTool(svgOverlay, chart, series, opts) {
  return makeFactory('priceRange', 2, svgOverlay, chart, series, opts || {});
}

/* ===== Persistence load ================================================ */
function loadFromStorage(shared, svgOverlay, chart, series) {
  if (shared.loaded) return;
  shared.loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    arr.forEach(rec => {
      if (!rec || !rec.kind || !Array.isArray(rec.points)) return;
      const d = new PRDrawing({
        id: rec.id,
        kind: rec.kind,
        points: rec.points,
        opts: rec.opts || {},
        svgOverlay, chart, series, shared,
      });
      shared.drawings.push(d);
    });
  } catch (e) { console.warn('[position-range] load failed', e); }
}

/* ===== Misc utils ====================================================== */
function humanDuration(sec) {
  const s = Math.abs(Number(sec) || 0);
  if (s < 60)            return `${s.toFixed(0)}s`;
  if (s < 3600)          return `${(s / 60).toFixed(1)}m`;
  if (s < 86400)         return `${(s / 3600).toFixed(1)}h`;
  if (s < 86400 * 7)     return `${(s / 86400).toFixed(1)}d`;
  if (s < 86400 * 30)    return `${(s / (86400 * 7)).toFixed(1)}w`;
  if (s < 86400 * 365)   return `${(s / (86400 * 30)).toFixed(1)}mo`;
  return `${(s / (86400 * 365)).toFixed(1)}y`;
}

function guessBarSeconds(chart) {
  // Heuristic: look at the visible time range and the number of bars in view.
  try {
    const ts = chart.timeScale();
    const range = ts.getVisibleRange();
    if (!range) return 0;
    const span = Number(range.to) - Number(range.from);
    const logical = ts.getVisibleLogicalRange();
    if (!logical) return 0;
    const bars = Math.max(1, Math.abs(logical.to - logical.from));
    return span / bars;
  } catch { return 0; }
}

/* ===== Registry ======================================================== */
export const POSITION_RANGE_TOOLS = {
  long: {
    label: 'Long Position',
    icon: 'M3 14l4-4 4 4 6-6 4 4',  // up-right arrow path (suggestive)
    factory: createLongPositionTool,
  },
  short: {
    label: 'Short Position',
    icon: 'M3 6l4 4 4-4 6 6 4-4',   // down-right arrow path
    factory: createShortPositionTool,
  },
  dateRange: {
    label: 'Date Range',
    icon: 'M5 4v16M19 4v16M5 12h14', // two vertical bars + horiz connector
    factory: createDateRangeTool,
  },
  priceRange: {
    label: 'Price Range',
    icon: 'M4 5h16M4 19h16M12 5v14', // two horizontal bars + vert connector
    factory: createPriceRangeTool,
  },
};

export default POSITION_RANGE_TOOLS;
