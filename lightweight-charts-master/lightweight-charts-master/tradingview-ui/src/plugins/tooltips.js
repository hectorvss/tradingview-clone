// tooltips.js — self-contained hover + delta tooltip plugins for lightweight-charts v5
// Public API:
//   createHoverTooltip(chart, series, container, opts?) -> { destroy() }
//   createDeltaTooltip(chart, series, container, opts?) -> { destroy() }

const STYLE_ATTR = 'data-tv-tooltip-plugin';

const CSS = `
.tv-tt {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  padding: 8px 10px;
  font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  min-width: 150px;
  max-width: 260px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 90ms linear;
}
.tv-tt.tv-tt-visible { opacity: 1; }
.tv-tt-time {
  color: #9598a1;
  font-size: 11px;
  margin-bottom: 4px;
  letter-spacing: 0.2px;
}
.tv-tt-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.55;
}
.tv-tt-label { color: #9598a1; }
.tv-tt-val { color: #d1d4dc; font-variant-numeric: tabular-nums; }
.tv-tt-val.up { color: #26a69a; }
.tv-tt-val.down { color: #ef5350; }

.tv-tt-delta {
  position: absolute;
  z-index: 1001;
  background: #1e222d;
  color: #d1d4dc;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  padding: 8px 10px;
  font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  min-width: 170px;
  pointer-events: none;
}
.tv-tt-delta-line {
  position: absolute;
  z-index: 1000;
  height: 1px;
  background: rgba(120, 130, 150, 0.55);
  pointer-events: none;
  transform-origin: 0 50%;
}
.tv-tt-delta-anchor {
  position: absolute;
  z-index: 1001;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  margin-top: -4px;
  border-radius: 50%;
  background: #d1d4dc;
  border: 1px solid #1e222d;
  pointer-events: none;
}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[' + STYLE_ATTR + ']')) return;
  const s = document.createElement('style');
  s.setAttribute(STYLE_ATTR, '');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// Accepts a lightweight-charts Time value: number (UTCTimestamp seconds),
// BusinessDay {year,month,day}, or 'YYYY-MM-DD' string.
function timeToDate(time) {
  if (time == null) return null;
  if (typeof time === 'number') return new Date(time * 1000);
  if (typeof time === 'string') {
    // 'YYYY-MM-DD' — interpret as UTC midnight
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(time);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const d = new Date(time);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof time === 'object' && time.year != null) {
    return new Date(Date.UTC(time.year, (time.month || 1) - 1, time.day || 1));
  }
  return null;
}

function formatTime(time, withTime) {
  const d = timeToDate(time);
  if (!d) return '';
  const dd = pad2(d.getUTCDate());
  const mon = MONTHS[d.getUTCMonth()];
  const yyyy = d.getUTCFullYear();
  if (withTime === false) return dd + ' ' + mon + ' ' + yyyy;
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  // If time is at exact midnight UTC and time is a date-only form, drop HH:mm
  if (withTime == null) {
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
      return dd + ' ' + mon + ' ' + yyyy;
    }
  }
  return dd + ' ' + mon + ' ' + yyyy + ' ' + hh + ':' + mm;
}

function formatPrice(v, digits) {
  if (v == null || !isFinite(v)) return '—';
  const d = digits != null ? digits : (Math.abs(v) >= 100 ? 2 : (Math.abs(v) >= 1 ? 4 : 6));
  return Number(v).toFixed(d);
}

function formatVolume(v) {
  if (v == null || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return String(Math.round(v));
}

function formatPct(p) {
  if (p == null || !isFinite(p)) return '—';
  const s = (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
  return s;
}

function ensurePositioned(container) {
  if (typeof window === 'undefined') return;
  const cs = window.getComputedStyle(container);
  if (cs.position === 'static' || !cs.position) container.style.position = 'relative';
}

function getSeriesDataMap(series) {
  // Cache built lazily per call; small wrapper to look up bar by time key.
  try {
    const data = series.data ? series.data() : [];
    const map = new Map();
    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      map.set(timeKey(bar.time), { bar, index: i, prev: i > 0 ? data[i - 1] : null });
    }
    return { map, data };
  } catch (_) {
    return { map: new Map(), data: [] };
  }
}

function timeKey(t) {
  if (t == null) return '';
  if (typeof t === 'number' || typeof t === 'string') return String(t);
  if (typeof t === 'object' && t.year != null) {
    return t.year + '-' + (t.month || 1) + '-' + (t.day || 1);
  }
  return String(t);
}

// =====================================================================
// createHoverTooltip
// =====================================================================
export function createHoverTooltip(chart, series, container, opts) {
  ensureStyle();
  ensurePositioned(container);
  const options = Object.assign({
    offsetX: 14,
    offsetY: 14,
    edgePadding: 8,
    priceDigits: null,
  }, opts || {});

  const el = document.createElement('div');
  el.className = 'tv-tt';
  el.innerHTML = '';
  container.appendChild(el);

  function render(bar, prevBar) {
    const o = bar.open, h = bar.high, l = bar.low, c = bar.close;
    const hasOHLC = o != null && h != null && l != null && c != null;
    const refClose = prevBar && prevBar.close != null ? prevBar.close
      : (prevBar && prevBar.value != null ? prevBar.value : null);
    const last = c != null ? c : (bar.value != null ? bar.value : null);
    let pct = null;
    if (refClose != null && last != null && refClose !== 0) {
      pct = ((last - refClose) / refClose) * 100;
    }
    const upDown = (last != null && o != null) ? (last >= o ? 'up' : 'down') : '';
    const pctClass = pct == null ? '' : (pct >= 0 ? 'up' : 'down');
    const vol = bar.volume != null ? bar.volume : (bar.customValues && bar.customValues.volume);

    const rows = [];
    rows.push('<div class="tv-tt-time">' + formatTime(bar.time) + '</div>');
    if (hasOHLC) {
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">O</span><span class="tv-tt-val">' + formatPrice(o, options.priceDigits) + '</span></div>');
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">H</span><span class="tv-tt-val">' + formatPrice(h, options.priceDigits) + '</span></div>');
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">L</span><span class="tv-tt-val">' + formatPrice(l, options.priceDigits) + '</span></div>');
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">C</span><span class="tv-tt-val ' + upDown + '">' + formatPrice(c, options.priceDigits) + '</span></div>');
    } else if (last != null) {
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">Price</span><span class="tv-tt-val">' + formatPrice(last, options.priceDigits) + '</span></div>');
    }
    rows.push('<div class="tv-tt-row"><span class="tv-tt-label">%chg</span><span class="tv-tt-val ' + pctClass + '">' + formatPct(pct) + '</span></div>');
    if (vol != null) {
      rows.push('<div class="tv-tt-row"><span class="tv-tt-label">Vol</span><span class="tv-tt-val">' + formatVolume(vol) + '</span></div>');
    }
    el.innerHTML = rows.join('');
  }

  function position(x, y) {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Prefer top-right of cursor
    let left = x + options.offsetX;
    let top = y - h - options.offsetY;
    if (left + w + options.edgePadding > cw) {
      left = x - w - options.offsetX;
    }
    if (top < options.edgePadding) {
      top = y + options.offsetY;
    }
    if (left < options.edgePadding) left = options.edgePadding;
    if (top + h + options.edgePadding > ch) top = ch - h - options.edgePadding;
    if (top < options.edgePadding) top = options.edgePadding;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function hide() { el.classList.remove('tv-tt-visible'); }
  function show() { el.classList.add('tv-tt-visible'); }

  const handler = (param) => {
    if (!param || !param.point || !param.time) { hide(); return; }
    const sd = param.seriesData && param.seriesData.get ? param.seriesData.get(series) : null;
    if (!sd) { hide(); return; }
    // Find prev bar for %change
    let prev = null;
    try {
      const allData = series.data ? series.data() : [];
      for (let i = 0; i < allData.length; i++) {
        if (timeKey(allData[i].time) === timeKey(param.time)) {
          prev = i > 0 ? allData[i - 1] : null;
          break;
        }
      }
    } catch (_) {}
    render(sd, prev);
    show();
    position(param.point.x, param.point.y);
  };

  chart.subscribeCrosshairMove(handler);

  return {
    destroy() {
      try { chart.unsubscribeCrosshairMove(handler); } catch (_) {}
      if (el.parentNode) el.parentNode.removeChild(el);
    },
  };
}

// =====================================================================
// createDeltaTooltip — Shift+drag to measure
// =====================================================================
export function createDeltaTooltip(chart, series, container, opts) {
  ensureStyle();
  ensurePositioned(container);
  const options = Object.assign({
    priceDigits: null,
    minDragPx: 4,
  }, opts || {});

  // Persistent DOM nodes
  const box = document.createElement('div');
  box.className = 'tv-tt-delta';
  box.style.display = 'none';
  const line = document.createElement('div');
  line.className = 'tv-tt-delta-line';
  line.style.display = 'none';
  const anchorA = document.createElement('div');
  anchorA.className = 'tv-tt-delta-anchor';
  anchorA.style.display = 'none';
  const anchorB = document.createElement('div');
  anchorB.className = 'tv-tt-delta-anchor';
  anchorB.style.display = 'none';
  container.appendChild(line);
  container.appendChild(anchorA);
  container.appendChild(anchorB);
  container.appendChild(box);

  let state = {
    active: false,        // currently dragging
    persisted: false,     // box stays visible after release
    startX: 0, startY: 0,
    startTime: null, startPrice: null,
    endX: 0, endY: 0,
    endTime: null, endPrice: null,
  };

  function hideAll() {
    box.style.display = 'none';
    line.style.display = 'none';
    anchorA.style.display = 'none';
    anchorB.style.display = 'none';
  }

  function containerPoint(evt) {
    const rect = container.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function computeRange(t1, t2) {
    // Returns { bars, minP, maxP } using series data
    let data = [];
    try { data = series.data ? series.data() : []; } catch (_) { data = []; }
    if (!data.length) return { bars: 0, minP: null, maxP: null };
    const k1 = timeKey(t1), k2 = timeKey(t2);
    let i1 = -1, i2 = -1;
    // Find closest indices
    for (let i = 0; i < data.length; i++) {
      const k = timeKey(data[i].time);
      if (k === k1) i1 = i;
      if (k === k2) i2 = i;
    }
    if (i1 < 0 || i2 < 0) {
      // Fall back: scan numerically by Date
      const d1 = timeToDate(t1), d2 = timeToDate(t2);
      if (d1 && d2) {
        let best1 = Infinity, best2 = Infinity;
        for (let i = 0; i < data.length; i++) {
          const di = timeToDate(data[i].time);
          if (!di) continue;
          const a = Math.abs(di.getTime() - d1.getTime());
          const b = Math.abs(di.getTime() - d2.getTime());
          if (a < best1) { best1 = a; i1 = i; }
          if (b < best2) { best2 = b; i2 = i; }
        }
      }
    }
    if (i1 < 0 || i2 < 0) return { bars: 0, minP: null, maxP: null };
    const lo = Math.min(i1, i2), hi = Math.max(i1, i2);
    let minP = Infinity, maxP = -Infinity;
    for (let i = lo; i <= hi; i++) {
      const b = data[i];
      const h = b.high != null ? b.high : (b.value != null ? b.value : b.close);
      const l = b.low != null ? b.low : (b.value != null ? b.value : b.close);
      if (h != null && h > maxP) maxP = h;
      if (l != null && l < minP) minP = l;
    }
    if (!isFinite(minP)) minP = null;
    if (!isFinite(maxP)) maxP = null;
    return { bars: hi - lo + 1, minP, maxP };
  }

  function render() {
    const { startTime, endTime, startPrice, endPrice, startX, startY, endX, endY } = state;
    if (startTime == null || endTime == null || startPrice == null || endPrice == null) {
      hideAll();
      return;
    }
    const delta = endPrice - startPrice;
    const pct = startPrice !== 0 ? (delta / startPrice) * 100 : null;
    const dir = delta >= 0 ? 'up' : 'down';
    const range = computeRange(startTime, endTime);

    const rows = [];
    rows.push('<div class="tv-tt-time">' + formatTime(startTime) + '  &rarr;  ' + formatTime(endTime) + '</div>');
    rows.push('<div class="tv-tt-row"><span class="tv-tt-label">&Delta;</span><span class="tv-tt-val ' + dir + '">' + (delta >= 0 ? '+' : '') + formatPrice(delta, options.priceDigits) + '  (' + formatPct(pct) + ')</span></div>');
    rows.push('<div class="tv-tt-row"><span class="tv-tt-label">Bars</span><span class="tv-tt-val">' + range.bars + '</span></div>');
    rows.push('<div class="tv-tt-row"><span class="tv-tt-label">Min</span><span class="tv-tt-val">' + formatPrice(range.minP, options.priceDigits) + '</span></div>');
    rows.push('<div class="tv-tt-row"><span class="tv-tt-label">Max</span><span class="tv-tt-val">' + formatPrice(range.maxP, options.priceDigits) + '</span></div>');
    box.innerHTML = rows.join('');

    // Anchors
    anchorA.style.left = startX + 'px';
    anchorA.style.top = startY + 'px';
    anchorA.style.display = 'block';
    anchorB.style.left = endX + 'px';
    anchorB.style.top = endY + 'px';
    anchorB.style.display = 'block';

    // Connecting line between (startX,startY) and (endX,endY)
    const dx = endX - startX, dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.left = startX + 'px';
    line.style.top = startY + 'px';
    line.style.width = len + 'px';
    line.style.transform = 'rotate(' + angle + 'deg)';
    line.style.display = 'block';

    // Position box near midpoint, above the line
    box.style.display = 'block';
    const bw = box.offsetWidth;
    const bh = box.offsetHeight;
    const cw = container.clientWidth, ch = container.clientHeight;
    const midX = (startX + endX) / 2;
    const topY = Math.min(startY, endY);
    let bx = midX - bw / 2;
    let by = topY - bh - 12;
    if (by < 4) by = Math.max(startY, endY) + 12;
    if (bx < 4) bx = 4;
    if (bx + bw > cw - 4) bx = cw - bw - 4;
    if (by + bh > ch - 4) by = ch - bh - 4;
    box.style.left = bx + 'px';
    box.style.top = by + 'px';
  }

  function coordsToTimePrice(x, y) {
    let t = null, p = null;
    try { t = chart.timeScale().coordinateToTime(x); } catch (_) {}
    try { p = series.coordinateToPrice(y); } catch (_) {}
    return { t, p };
  }

  function onMouseDown(evt) {
    if (!evt.shiftKey) return;
    if (evt.button !== 0) return;
    const { x, y } = containerPoint(evt);
    const { t, p } = coordsToTimePrice(x, y);
    if (t == null || p == null) return;
    state.active = true;
    state.persisted = false;
    state.startX = x; state.startY = y;
    state.endX = x; state.endY = y;
    state.startTime = t; state.startPrice = p;
    state.endTime = t; state.endPrice = p;
    evt.preventDefault();
  }

  function onMouseMove(evt) {
    if (!state.active) return;
    const { x, y } = containerPoint(evt);
    const { t, p } = coordsToTimePrice(x, y);
    if (t == null || p == null) return;
    state.endX = x; state.endY = y;
    state.endTime = t; state.endPrice = p;
    const dx = Math.abs(state.endX - state.startX);
    const dy = Math.abs(state.endY - state.startY);
    if (dx < options.minDragPx && dy < options.minDragPx) return;
    render();
  }

  function onMouseUp(evt) {
    if (!state.active) return;
    state.active = false;
    const dx = Math.abs(state.endX - state.startX);
    if (dx < options.minDragPx) {
      hideAll();
      return;
    }
    state.persisted = true;
    render();
  }

  function onKeyUp(evt) {
    if (evt.key === 'Shift' && state.active) {
      // Treat shift release like mouseup
      onMouseUp(evt);
    }
  }

  function onClickAway(evt) {
    if (!state.persisted) return;
    // Any non-shift click (anywhere) dismisses
    if (evt.shiftKey) return;
    state.persisted = false;
    hideAll();
  }

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onClickAway, true);

  return {
    destroy() {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onClickAway, true);
      [box, line, anchorA, anchorB].forEach(n => { if (n.parentNode) n.parentNode.removeChild(n); });
    },
  };
}
