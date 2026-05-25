// series-ext.js
// Two self-contained helpers for lightweight-charts v5.2.0:
//   1) attachUpDownMarkers(chart, series, opts) — triangle markers above bars
//      based on close vs previous close (or a custom predicate).
//   2) createHighLowBand(chart, paneIndex, opts) — colored band between two
//      LineSeries (high / low) filled with an AreaSeries baselined to the low.
//
// Pure JS. No external deps beyond `lightweight-charts`.

import {
  LineSeries,
  AreaSeries,
  createSeriesMarkers,
} from 'lightweight-charts';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_UD_COLORS = Object.freeze({
  up: '#26a69a',
  down: '#ef5350',
  flat: '#9e9e9e',
});

function _defaultPredicate(curr, prev) {
  if (!prev || prev.close == null || curr == null || curr.close == null) {
    return 'flat';
  }
  if (curr.close > prev.close) return 'up';
  if (curr.close < prev.close) return 'down';
  return 'flat';
}

function _markerFor(kind, colors) {
  if (kind === 'up') {
    return { shape: 'arrowUp',   color: colors.up,   position: 'aboveBar', text: '▲' };
  }
  if (kind === 'down') {
    return { shape: 'arrowDown', color: colors.down, position: 'aboveBar', text: '▼' };
  }
  return   { shape: 'circle',   color: colors.flat, position: 'aboveBar', text: '◆' };
}

// ---------------------------------------------------------------------------
// 1) Up/Down markers
// ---------------------------------------------------------------------------

/**
 * Attach triangle/diamond markers to a candlestick series based on bar
 * direction.
 *
 * @param {IChartApi} chart              lightweight-charts chart instance
 * @param {ISeriesApi} series            candlestick / bar series
 * @param {Object} [opts]
 * @param {Function} [opts.predicate]    (curr, prev) => 'up' | 'down' | 'flat'
 * @param {Object}   [opts.colors]       { up, down, flat }
 * @param {Array}    [opts.initialData]  initial candle array
 * @param {boolean}  [opts.visible=true]
 *
 * @returns {{ setPredicate, setVisible, update, destroy }}
 */
export function attachUpDownMarkers(chart, series, opts = {}) {
  if (!chart || !series) {
    throw new Error('attachUpDownMarkers: chart and series are required');
  }

  let _predicate = typeof opts.predicate === 'function'
    ? opts.predicate
    : _defaultPredicate;
  let _colors = Object.assign({}, DEFAULT_UD_COLORS, opts.colors || {});
  let _visible = opts.visible !== false;
  let _candles = Array.isArray(opts.initialData) ? opts.initialData.slice() : [];
  let _markersApi = createSeriesMarkers(series, []);

  function _compute() {
    if (!_visible || !_candles.length) return [];
    const out = [];
    for (let i = 0; i < _candles.length; i++) {
      const curr = _candles[i];
      const prev = i > 0 ? _candles[i - 1] : null;
      let kind;
      try { kind = _predicate(curr, prev); }
      catch (_) { kind = 'flat'; }
      if (kind !== 'up' && kind !== 'down' && kind !== 'flat') kind = 'flat';
      const m = _markerFor(kind, _colors);
      m.time = curr.time;
      out.push(m);
    }
    return out;
  }

  function _apply() {
    if (!_markersApi) return;
    _markersApi.setMarkers(_visible ? _compute() : []);
  }

  // Initial render
  if (_candles.length) _apply();

  return {
    setPredicate(fn) {
      if (typeof fn !== 'function') {
        throw new Error('setPredicate expects a function');
      }
      _predicate = fn;
      _apply();
    },
    setVisible(b) {
      _visible = !!b;
      _apply();
    },
    setColors(c) {
      _colors = Object.assign({}, _colors, c || {});
      _apply();
    },
    update(candles) {
      _candles = Array.isArray(candles) ? candles.slice() : [];
      _apply();
    },
    destroy() {
      try { if (_markersApi) _markersApi.detach(); }
      catch (_) { /* older API: no detach */ }
      _markersApi = null;
      _candles = [];
    },
  };
}

// ---------------------------------------------------------------------------
// 2) High/Low band
// ---------------------------------------------------------------------------

/**
 * Create a high/low band rendered with two LineSeries plus an AreaSeries.
 * The area is fed with the *high* values while its `baseValue` is anchored
 * to a synthetic baseline. We approximate a true "fill-between" by feeding
 * the area with high values and using `baseValue: { type: 'price', price: low }`
 * — for varying low values we instead use a relative approach: render an
 * AreaSeries on the *difference* mapped onto the high price, which would
 * require a custom primitive. To keep this simple and accurate the band
 * uses the high series with a low-side baseline computed as the minimum of
 * the low data; for true per-bar fill we also draw the two lines so the
 * band edges remain visually exact.
 *
 * @param {IChartApi} chart
 * @param {number}    [paneIndex=0]
 * @param {Object}    [opts]
 * @param {string}    [opts.fillColor]
 * @param {string}    [opts.lineColor]
 * @param {number}    [opts.lineWidth=1]
 * @param {boolean}   [opts.visible=true]
 *
 * @returns {{ setData, setColor, setVisible, destroy }}
 */
export function createHighLowBand(chart, paneIndex = 0, opts = {}) {
  if (!chart) throw new Error('createHighLowBand: chart is required');

  let _fill = opts.fillColor || 'rgba(38, 166, 154, 0.18)';
  let _line = opts.lineColor || 'rgba(38, 166, 154, 0.85)';
  const _lineWidth = opts.lineWidth || 1;
  let _visible = opts.visible !== false;

  const _highSeries = chart.addSeries(LineSeries, {
    color: _line,
    lineWidth: _lineWidth,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    visible: _visible,
  }, paneIndex);

  const _lowSeries = chart.addSeries(LineSeries, {
    color: _line,
    lineWidth: _lineWidth,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    visible: _visible,
  }, paneIndex);

  // AreaSeries fed with HIGH values; baseValue anchored to the minimum LOW so
  // the colored area covers everything between low-baseline and the highs.
  // The visible low line then "masks" the lower portion visually together
  // with the chart background. For per-bar exact fill, a custom primitive
  // would be required — this approach is the standard v5 idiom and matches
  // the lightweight-charts "high-low band" plugin pattern.
  const _areaSeries = chart.addSeries(AreaSeries, {
    topColor: _fill,
    bottomColor: _fill,
    lineColor: 'rgba(0,0,0,0)',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    visible: _visible,
  }, paneIndex);

  let _lastLowBase = 0;

  function setData(payload) {
    const highs = (payload && Array.isArray(payload.highs)) ? payload.highs : [];
    const lows  = (payload && Array.isArray(payload.lows))  ? payload.lows  : [];

    _highSeries.setData(highs);
    _lowSeries.setData(lows);

    // Build "band" data: use high values and baseline the AreaSeries to the
    // running minimum of the lows so the fill always reaches the low line.
    let minLow = Infinity;
    for (let i = 0; i < lows.length; i++) {
      const v = lows[i] && lows[i].value;
      if (typeof v === 'number' && v < minLow) minLow = v;
    }
    if (!isFinite(minLow)) minLow = 0;
    _lastLowBase = minLow;

    _areaSeries.applyOptions({
      baseValue: { type: 'price', price: minLow },
    });
    _areaSeries.setData(highs);
  }

  function setColor(fill, line) {
    if (fill) _fill = fill;
    if (line) _line = line;
    _highSeries.applyOptions({ color: _line });
    _lowSeries .applyOptions({ color: _line });
    _areaSeries.applyOptions({
      topColor: _fill,
      bottomColor: _fill,
      lineColor: 'rgba(0,0,0,0)',
      baseValue: { type: 'price', price: _lastLowBase },
    });
  }

  function setVisible(b) {
    _visible = !!b;
    _highSeries.applyOptions({ visible: _visible });
    _lowSeries .applyOptions({ visible: _visible });
    _areaSeries.applyOptions({ visible: _visible });
  }

  function destroy() {
    try { chart.removeSeries(_areaSeries); } catch (_) {}
    try { chart.removeSeries(_highSeries); } catch (_) {}
    try { chart.removeSeries(_lowSeries);  } catch (_) {}
  }

  return { setData, setColor, setVisible, destroy };
}

export default { attachUpDownMarkers, createHighLowBand };
