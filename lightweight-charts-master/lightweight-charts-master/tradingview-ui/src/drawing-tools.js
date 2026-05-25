/* =========================================================================
   Drawing Tools Module — self-contained drawing primitives for the chart.

   Exports:
     createDrawingManager(chart, candleSeries, containerEl) → manager

   Tools currently supported:
     - 'hline'    Horizontal line at a single price.
     - 'fib'      Fibonacci retracement between two (time, price) anchors.
     - 'rect'     Rectangle between two (time, price) anchors.
     - 'trendline' (optional — coexists with the trendline agent's inline impl).

   Each drawing is persisted to `localStorage.tv.drawings` as:
     { id, type, points: [{time, price}, ...], style: { color, lineWidth } }

   The manager hooks into the lightweight-charts API for series rendering and
   uses DOM overlays for the rectangle vertical edges + handles + context menu.
   ========================================================================= */

import { LineSeries, LineStyle } from 'lightweight-charts';

// Use a dedicated key — `tv.drawings` is already used by the inline trendline
// implementation in chart-view.js. This module manages hline/fib/rect only.
const STORAGE_KEY = 'tv.drawings_dm';
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#787b86', '#f23645', '#ff9800', '#4caf50', '#26a69a', '#2962ff', '#9c27b0'];
const DEFAULT_COLOR = '#2962ff';
const HIT_THRESHOLD_PX = 6;

let _uid = 0;
const uniqueId = () => `d_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

export function createDrawingManager(chart, candleSeries, containerEl) {
  if (!chart || !candleSeries || !containerEl) {
    console.warn('[drawing-tools] createDrawingManager: missing chart/series/container');
    return null;
  }

  /** Active drawings on the chart: array of Drawing instances. */
  const drawings = [];
  /** Currently selected drawing (or null). */
  let selected = null;
  /** Active drawing mode ('hline' | 'fib' | 'rect' | 'trendline' | null). */
  let mode = null;
  /** Anchor points captured during creation. */
  let anchors = [];
  /** DOM overlay layer (for rectangle edges, handles, ctx menu). */
  const overlay = createOverlay(containerEl);

  /* ------------ Drawing class ------------ */
  class Drawing {
    constructor({ id, type, points, style }) {
      this.id = id || uniqueId();
      this.type = type;
      this.points = points;                          // [{time, price}, ...]
      this.style = { color: DEFAULT_COLOR, lineWidth: 1.5, ...(style || {}) };
      this.seriesList = [];                          // lightweight-charts series
      this.handles = [];                             // DOM divs for endpoint handles
      this.selected = false;
    }

    render() {
      this.destroy();                                // clear any prior render
      if (this.type === 'hline')      this._renderHLine();
      else if (this.type === 'fib')   this._renderFib();
      else if (this.type === 'rect')  this._renderRect();
      else if (this.type === 'trendline') this._renderTrendline();
      this._renderHandles();
    }

    _renderHLine() {
      // 1 LineSeries spanning the visible time range at constant price.
      const s = chart.addSeries(LineSeries, {
        color: this.style.color,
        lineWidth: this.style.lineWidth,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: '',
      });
      const p = this.points[0];
      const range = chart.timeScale().getVisibleRange();
      const t1 = range ? range.from : p.time;
      const t2 = range ? range.to : p.time + 86400 * 50;
      s.setData([
        { time: t1, value: p.price },
        { time: t2, value: p.price },
      ]);
      this.seriesList.push(s);
    }

    _renderTrendline() {
      const [p1, p2] = this.points;
      const s = chart.addSeries(LineSeries, {
        color: this.style.color,
        lineWidth: this.style.lineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // lightweight-charts requires data in chronological order
      const pts = [p1, p2].sort((a, b) => a.time - b.time);
      s.setData(pts.map(p => ({ time: p.time, value: p.price })));
      this.seriesList.push(s);
    }

    _renderFib() {
      const [p1, p2] = this.points;
      const t1 = Math.min(p1.time, p2.time);
      const t2 = Math.max(p1.time, p2.time);
      const high = Math.max(p1.price, p2.price);
      const low = Math.min(p1.price, p2.price);
      const range = high - low;
      FIB_LEVELS.forEach((lvl, i) => {
        const price = high - range * lvl;
        const s = chart.addSeries(LineSeries, {
          color: FIB_COLORS[i % FIB_COLORS.length],
          lineWidth: 1,
          lineStyle: lvl === 0 || lvl === 1 ? LineStyle.Solid : LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          title: `${(lvl * 100).toFixed(1)}%`,
        });
        s.setData([
          { time: t1, value: price },
          { time: t2, value: price },
        ]);
        this.seriesList.push(s);
      });
    }

    _renderRect() {
      // Top + bottom rendered as LineSeries (horizontal). Left/right + fill
      // rendered as DOM overlay rect that syncs on each crosshair move / resize.
      const [p1, p2] = this.points;
      const t1 = Math.min(p1.time, p2.time);
      const t2 = Math.max(p1.time, p2.time);
      const high = Math.max(p1.price, p2.price);
      const low = Math.min(p1.price, p2.price);

      const topSeries = chart.addSeries(LineSeries, {
        color: this.style.color, lineWidth: this.style.lineWidth,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const botSeries = chart.addSeries(LineSeries, {
        color: this.style.color, lineWidth: this.style.lineWidth,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      topSeries.setData([{ time: t1, value: high }, { time: t2, value: high }]);
      botSeries.setData([{ time: t1, value: low  }, { time: t2, value: low  }]);
      this.seriesList.push(topSeries, botSeries);

      // Overlay rect div
      const rectDiv = document.createElement('div');
      rectDiv.className = 'drawing-rect-overlay';
      rectDiv.style.cssText = `
        position: absolute;
        border-left: ${this.style.lineWidth}px solid ${this.style.color};
        border-right: ${this.style.lineWidth}px solid ${this.style.color};
        background: ${this.style.color}1a;
        pointer-events: none;
        z-index: 4;
      `;
      overlay.appendChild(rectDiv);
      this._rectDiv = rectDiv;
      this._syncRectOverlay();
    }

    _syncRectOverlay() {
      if (!this._rectDiv) return;
      const [p1, p2] = this.points;
      const t1 = Math.min(p1.time, p2.time);
      const t2 = Math.max(p1.time, p2.time);
      const high = Math.max(p1.price, p2.price);
      const low = Math.min(p1.price, p2.price);
      const ts = chart.timeScale();
      const x1 = ts.timeToCoordinate(t1);
      const x2 = ts.timeToCoordinate(t2);
      const y1 = candleSeries.priceToCoordinate(high);
      const y2 = candleSeries.priceToCoordinate(low);
      if (x1 == null || x2 == null || y1 == null || y2 == null) {
        this._rectDiv.style.display = 'none';
        return;
      }
      this._rectDiv.style.display = 'block';
      this._rectDiv.style.left = `${Math.min(x1, x2)}px`;
      this._rectDiv.style.top = `${Math.min(y1, y2)}px`;
      this._rectDiv.style.width = `${Math.abs(x2 - x1)}px`;
      this._rectDiv.style.height = `${Math.abs(y2 - y1)}px`;
    }

    _renderHandles() {
      // DOM handles for each anchor (only shown when selected).
      this.points.forEach((p, idx) => {
        const h = document.createElement('div');
        h.className = 'drawing-handle';
        h.dataset.drawingId = this.id;
        h.dataset.anchorIdx = idx;
        h.style.cssText = `
          position: absolute;
          width: 10px; height: 10px;
          background: ${this.style.color};
          border: 2px solid #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          cursor: move;
          z-index: 11;
          display: ${this.selected ? 'block' : 'none'};
        `;
        overlay.appendChild(h);
        this.handles.push(h);
        attachHandleDrag(this, idx, h);
      });
      this._syncHandlePositions();
    }

    _syncHandlePositions() {
      this.handles.forEach((h, idx) => {
        const p = this.points[idx];
        const x = chart.timeScale().timeToCoordinate(p.time);
        const y = candleSeries.priceToCoordinate(p.price);
        if (x == null || y == null) {
          h.style.display = 'none';
          return;
        }
        h.style.display = this.selected ? 'block' : 'none';
        h.style.left = `${x}px`;
        h.style.top = `${y}px`;
      });
    }

    sync() {
      this._syncHandlePositions();
      this._syncRectOverlay();
    }

    setSelected(sel) {
      this.selected = sel;
      this.handles.forEach(h => { h.style.display = sel ? 'block' : 'none'; });
      this.seriesList.forEach(s => {
        s.applyOptions({ lineWidth: sel ? this.style.lineWidth + 0.5 : this.style.lineWidth });
      });
    }

    /** Pixel-space hit-test. Returns true if (x, y) is within HIT_THRESHOLD_PX. */
    hitTest(x, y) {
      const ts = chart.timeScale();
      if (this.type === 'hline') {
        const yp = candleSeries.priceToCoordinate(this.points[0].price);
        return yp != null && Math.abs(y - yp) <= HIT_THRESHOLD_PX;
      }
      if (this.type === 'trendline') {
        const [p1, p2] = this.points;
        const x1 = ts.timeToCoordinate(p1.time);
        const y1 = candleSeries.priceToCoordinate(p1.price);
        const x2 = ts.timeToCoordinate(p2.time);
        const y2 = candleSeries.priceToCoordinate(p2.price);
        if ([x1, y1, x2, y2].some(v => v == null)) return false;
        return distanceToSegment(x, y, x1, y1, x2, y2) <= HIT_THRESHOLD_PX;
      }
      if (this.type === 'rect') {
        const [p1, p2] = this.points;
        const x1 = ts.timeToCoordinate(Math.min(p1.time, p2.time));
        const x2 = ts.timeToCoordinate(Math.max(p1.time, p2.time));
        const y1 = candleSeries.priceToCoordinate(Math.max(p1.price, p2.price));
        const y2 = candleSeries.priceToCoordinate(Math.min(p1.price, p2.price));
        if ([x1, y1, x2, y2].some(v => v == null)) return false;
        // Hit any of the 4 edges
        return (
          (Math.abs(y - y1) <= HIT_THRESHOLD_PX && x >= x1 && x <= x2) ||
          (Math.abs(y - y2) <= HIT_THRESHOLD_PX && x >= x1 && x <= x2) ||
          (Math.abs(x - x1) <= HIT_THRESHOLD_PX && y >= y1 && y <= y2) ||
          (Math.abs(x - x2) <= HIT_THRESHOLD_PX && y >= y1 && y <= y2)
        );
      }
      if (this.type === 'fib') {
        // Hit if click is on any of the 7 horizontal levels and inside [t1, t2]
        const [p1, p2] = this.points;
        const t1 = Math.min(p1.time, p2.time);
        const t2 = Math.max(p1.time, p2.time);
        const x1 = ts.timeToCoordinate(t1);
        const x2 = ts.timeToCoordinate(t2);
        if (x1 == null || x2 == null || x < x1 || x > x2) return false;
        const high = Math.max(p1.price, p2.price);
        const low = Math.min(p1.price, p2.price);
        const range = high - low;
        return FIB_LEVELS.some(lvl => {
          const lvlPrice = high - range * lvl;
          const yp = candleSeries.priceToCoordinate(lvlPrice);
          return yp != null && Math.abs(y - yp) <= HIT_THRESHOLD_PX;
        });
      }
      return false;
    }

    update(newPoints) {
      this.points = newPoints;
      this.render();
    }

    destroy() {
      this.seriesList.forEach(s => { try { chart.removeSeries(s); } catch {} });
      this.seriesList = [];
      this.handles.forEach(h => h.remove());
      this.handles = [];
      if (this._rectDiv) { this._rectDiv.remove(); this._rectDiv = null; }
    }

    toJSON() {
      return { id: this.id, type: this.type, points: this.points, style: this.style };
    }
  }

  /* ------------ Drag handles ------------ */
  function attachHandleDrag(drawing, anchorIdx, handleEl) {
    let dragging = false;
    handleEl.addEventListener('mousedown', (ev) => {
      ev.stopPropagation();
      dragging = true;
      handleEl.style.cursor = 'grabbing';
    });
    function onMove(ev) {
      if (!dragging) return;
      const rect = containerEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const time = chart.timeScale().coordinateToTime(x);
      const price = candleSeries.coordinateToPrice(y);
      if (time == null || price == null) return;
      drawing.points[anchorIdx] = { time, price };
      drawing.render();
      drawing.setSelected(true);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      handleEl.style.cursor = 'move';
      saveToStorage();
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  /* ------------ Body drag (move the whole drawing) ------------ */
  // Detects mousedown anywhere on the chart container when there's a selected
  // drawing AND the click is on the drawing's body (not on a handle, not in
  // create mode). Holds the starting cursor (time, price) and starting points,
  // updates points by the delta on mousemove.
  let _bodyDrag = null;  // { drawing, startPts, startTime, startPrice }
  // Capture phase on window so lightweight-charts' canvas mousedown doesn't
  // stopPropagation us. We check if click is inside chart bounds + on a drawing.
  window.addEventListener('mousedown', (ev) => {
    if (mode) return;
    if (ev.target && typeof ev.target.closest === 'function' && ev.target.closest('.drawing-handle')) return;
    if (ev.button !== 0) return;
    const r = containerEl.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    if (x < 0 || x > r.width || y < 0 || y > r.height) return;
    let hit = null;
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (drawings[i].hitTest(x, y)) { hit = drawings[i]; break; }
    }
    if (!hit) return;
    selectDrawing(hit.id);
    const startTime = chart.timeScale().coordinateToTime(x);
    const startPrice = candleSeries.coordinateToPrice(y);
    if (startTime == null || startPrice == null) return;
    _bodyDrag = {
      drawing: hit,
      startPts: hit.points.map(p => ({ ...p })),
      startTime, startPrice,
      moved: false,
    };
    containerEl.style.cursor = 'grabbing';
  }, true);  // capture phase
  window.addEventListener('mousemove', (ev) => {
    if (!_bodyDrag) return;
    const r = containerEl.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);
    if (time == null || price == null) return;
    const dt = time - _bodyDrag.startTime;
    const dp = price - _bodyDrag.startPrice;
    _bodyDrag.drawing.points = _bodyDrag.startPts.map(p => ({
      time: p.time + dt,
      price: p.price + dp,
    }));
    _bodyDrag.drawing.render();
    _bodyDrag.drawing.setSelected(true);
  });
  window.addEventListener('mouseup', () => {
    if (!_bodyDrag) return;
    _bodyDrag = null;
    containerEl.style.cursor = '';
    saveToStorage();
  });

  /* ------------ Mode / creation flow ------------ */
  function activate(toolId) {
    mode = toolId;
    anchors = [];
    containerEl.style.cursor = 'crosshair';
    clearSelection();
    document.body.dispatchEvent(new CustomEvent('drawing:activate', { detail: { mode } }));
  }

  function deactivate() {
    mode = null;
    anchors = [];
    containerEl.style.cursor = '';
    hidePreview();
    document.body.dispatchEvent(new CustomEvent('drawing:deactivate'));
  }

  /** Live preview series during creation. */
  let previewSeries = null;
  function showPreview(p1, p2, type) {
    hidePreview();
    if (!p1 || !p2) return;
    previewSeries = chart.addSeries(LineSeries, {
      color: DEFAULT_COLOR,
      lineWidth: 1.5,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const pts = [p1, p2].sort((a, b) => a.time - b.time);
    if (type === 'hline') {
      previewSeries.setData(pts.map(p => ({ time: p.time, value: p1.price })));
    } else {
      previewSeries.setData(pts.map(p => ({ time: p.time, value: p.price })));
    }
  }

  function hidePreview() {
    if (previewSeries) {
      try { chart.removeSeries(previewSeries); } catch {}
      previewSeries = null;
    }
  }

  /** Chart-relative click → derive (time, price). */
  function chartClickToPoint(ev) {
    const rect = containerEl.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time, price, x, y };
  }

  function onContainerClick(ev) {
    if (!mode) {
      // Selection mode: check hit-test against all drawings.
      const rect = containerEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      let hit = null;
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (drawings[i].hitTest(x, y)) { hit = drawings[i]; break; }
      }
      if (hit) selectDrawing(hit.id);
      else clearSelection();
      return;
    }
    const pt = chartClickToPoint(ev);
    if (!pt) return;
    anchors.push({ time: pt.time, price: pt.price });
    if (mode === 'hline') {
      // Single click creates an hline at clicked price.
      addDrawing({ type: 'hline', points: [{ time: pt.time, price: pt.price }] });
      deactivate();
    } else {
      // 2-click tools: trendline, fib, rect
      if (anchors.length === 2) {
        addDrawing({ type: mode, points: anchors.slice() });
        deactivate();
      }
    }
  }

  function onContainerMouseMove(ev) {
    if (!mode || anchors.length === 0) return;
    const pt = chartClickToPoint(ev);
    if (!pt) return;
    showPreview(anchors[0], { time: pt.time, price: pt.price }, mode);
  }

  /* ------------ CRUD ------------ */
  function addDrawing({ type, points, style }) {
    const d = new Drawing({ type, points, style });
    drawings.push(d);
    d.render();
    saveToStorage();
    return d;
  }

  function removeDrawing(id) {
    const idx = drawings.findIndex(d => d.id === id);
    if (idx < 0) return;
    drawings[idx].destroy();
    drawings.splice(idx, 1);
    if (selected && selected.id === id) selected = null;
    saveToStorage();
  }

  function selectDrawing(id) {
    drawings.forEach(d => d.setSelected(d.id === id));
    selected = drawings.find(d => d.id === id) || null;
  }

  function clearSelection() {
    drawings.forEach(d => d.setSelected(false));
    selected = null;
  }

  function getAll() {
    return drawings.map(d => d.toJSON());
  }

  function removeAll() {
    drawings.slice().forEach(d => { d.destroy(); });
    drawings.length = 0;
    selected = null;
    saveToStorage();
  }

  /* ------------ Persistence ------------ */
  function saveToStorage() {
    try {
      const json = drawings.map(d => d.toJSON());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
    } catch (e) { console.warn('[drawing-tools] save failed', e); }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      arr.forEach(({ id, type, points, style }) => {
        const d = new Drawing({ id, type, points, style });
        drawings.push(d);
        d.render();
      });
    } catch (e) { console.warn('[drawing-tools] load failed', e); }
  }

  /* ------------ Wire events ------------ */
  // Use BOTH chart.subscribeClick (for real chart clicks) and DOM addEventListener
  // (fallback for synthetic events). Either path leads to onContainerClick.
  // Guard against double-firing within a single tick via a flag.
  let _clickHandledThisTick = false;
  function safeClick(ev) {
    if (_clickHandledThisTick) return;
    _clickHandledThisTick = true;
    setTimeout(() => { _clickHandledThisTick = false; }, 50);
    onContainerClick(ev);
  }
  containerEl.addEventListener('click', safeClick);
  chart.subscribeClick((param) => {
    if (!param || !param.point) return;
    const r = containerEl.getBoundingClientRect();
    safeClick({ clientX: r.left + param.point.x, clientY: r.top + param.point.y });
  });
  containerEl.addEventListener('mousemove', onContainerMouseMove);

  // Esc cancels active mode + clears selection
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (mode) deactivate();
      else clearSelection();
    }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && selected) {
      // Only delete drawings if not focused on an input
      if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/i.test(document.activeElement.tagName)) return;
      removeDrawing(selected.id);
    }
  });

  // Right-click on selected drawing → context menu
  containerEl.addEventListener('contextmenu', (ev) => {
    const rect = containerEl.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    let hit = null;
    for (let i = drawings.length - 1; i >= 0; i--) {
      if (drawings[i].hitTest(x, y)) { hit = drawings[i]; break; }
    }
    if (!hit) return;
    ev.preventDefault();
    selectDrawing(hit.id);
    showContextMenu(ev.clientX, ev.clientY, hit);
  });

  // Re-sync handles + rect overlays on chart events
  chart.subscribeCrosshairMove(() => {
    drawings.forEach(d => d.sync());
  });
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    drawings.forEach(d => d.sync());
    // Also re-render hlines (they span visible range)
    drawings.filter(d => d.type === 'hline').forEach(d => d.render());
  });

  /* ------------ Context menu ------------ */
  function showContextMenu(clientX, clientY, drawing) {
    const existing = document.getElementById('drawing-ctx-menu');
    if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.id = 'drawing-ctx-menu';
    menu.className = 'drawing-ctx-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${clientY}px; left: ${clientX}px;
      background: #1c1c1c; border: 1px solid #2e2e2e;
      border-radius: 4px; padding: 4px 0; min-width: 160px;
      box-shadow: 0 6px 16px rgba(0,0,0,.5);
      z-index: 1000; font-size: 13px; color: #dbdbdb;
    `;
    const labels = {
      hline: 'línea horizontal',
      fib: 'fibonacci',
      rect: 'rectángulo',
      trendline: 'línea de tendencia',
    };
    menu.innerHTML = `
      <div data-act="delete" style="padding:8px 14px;cursor:pointer">Eliminar ${labels[drawing.type] || 'dibujo'}</div>
      <div data-act="delete-all" style="padding:8px 14px;cursor:pointer">Eliminar todos los dibujos</div>
    `;
    document.body.appendChild(menu);
    menu.querySelectorAll('[data-act]').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.background = '#2962ff'; el.style.color = '#fff'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; el.style.color = '#dbdbdb'; });
      el.addEventListener('click', () => {
        const act = el.dataset.act;
        if (act === 'delete') removeDrawing(drawing.id);
        else if (act === 'delete-all') removeAll();
        menu.remove();
      });
    });
    const closeMenu = (ev) => {
      if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', closeMenu); }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
  }

  /* ------------ Public API ------------ */
  return {
    activate, deactivate,
    addDrawing, removeDrawing, selectDrawing, clearSelection, getAll, removeAll,
    saveToStorage, loadFromStorage,
    get mode() { return mode; },
    get selected() { return selected; },
  };
}

/* ------------ Helpers ------------ */
function createOverlay(containerEl) {
  let overlay = containerEl.querySelector('.drawing-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'drawing-overlay';
    overlay.style.cssText = `
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 3;
    `;
    containerEl.appendChild(overlay);
  }
  // Children with pointer-events: auto can capture events (handles, ctx menu).
  return overlay;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}
