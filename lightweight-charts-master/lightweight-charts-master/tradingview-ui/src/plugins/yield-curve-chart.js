// yield-curve-chart.js
//
// Thin Vite-friendly wrappers around two specialized chart modes in
// lightweight-charts v5.2.0:
//
//   1. createYieldCurveChart  -> X axis = months-to-maturity (linear, integer).
//      Source: src/api/create-yield-curve-chart.ts
//
//   2. createOptionsChart     -> X axis = price (HorzScaleBehaviorPrice).
//      Source: src/api/create-options-chart.ts
//      Behavior: src/model/horz-scale-behavior-price/horz-scale-behaviour-price.ts
//
// Both factories accept a container element (or id) plus a DeepPartial options
// object and return chart instances whose `addSeries` API matches the rest of
// the library. The wrappers here just bake in sane defaults so callers don't
// need to repeat boilerplate.

import {
	createYieldCurveChart,
	createOptionsChart,
	LineSeries,
	AreaSeries,
} from 'lightweight-charts';

const DEFAULT_LAYOUT = {
	background: { type: 'solid', color: '#0d1117' },
	textColor: '#c9d1d9',
	fontFamily: "'Trebuchet MS', -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
};

const DEFAULT_GRID = {
	vertLines: { color: 'rgba(255,255,255,0.04)' },
	horzLines: { color: 'rgba(255,255,255,0.06)' },
};

function mergeOptions(base, user) {
	if (!user) return base;
	const out = { ...base };
	for (const key of Object.keys(user)) {
		const v = user[key];
		if (v && typeof v === 'object' && !Array.isArray(v) && typeof base[key] === 'object') {
			out[key] = mergeOptions(base[key] || {}, v);
		} else {
			out[key] = v;
		}
	}
	return out;
}

function resolveContainer(container) {
	if (typeof container === 'string') {
		const el = document.getElementById(container);
		if (!el) throw new Error(`yield-curve-chart: container #${container} not found`);
		return el;
	}
	if (!container || !(container instanceof HTMLElement)) {
		throw new Error('yield-curve-chart: container must be an HTMLElement or element id');
	}
	return container;
}

// ---------------------------------------------------------------------------
// Yield curve chart
// ---------------------------------------------------------------------------

/**
 * Create a yield-curve chart (X axis = months to maturity).
 *
 * @param {HTMLElement|string} container
 * @param {object} [opts]
 * @param {string} [opts.lineColor]       Line/area stroke color.
 * @param {string} [opts.baselineColor]   Area baseline color (top-of-gradient).
 * @param {string} [opts.bottomColor]     Area gradient bottom color.
 * @param {boolean} [opts.smooth]         Curved (true) vs straight segments.
 * @param {boolean} [opts.area]           Use AreaSeries instead of LineSeries.
 * @param {number} [opts.lineWidth]
 * @param {object} [opts.chartOptions]    Extra chart-level options (merged).
 * @returns {{ chart: object, series: object }}
 */
export function createYieldCurve(container, opts = {}) {
	const el = resolveContainer(container);

	const lineColor = opts.lineColor || '#4f8bff';
	const baselineColor = opts.baselineColor || 'rgba(79,139,255,0.45)';
	const bottomColor = opts.bottomColor || 'rgba(79,139,255,0.02)';
	const smooth = opts.smooth !== false; // default true
	const useArea = opts.area === true;
	const lineWidth = opts.lineWidth || 2;

	const baseChartOptions = {
		layout: DEFAULT_LAYOUT,
		grid: DEFAULT_GRID,
		rightPriceScale: {
			borderColor: 'rgba(255,255,255,0.08)',
			scaleMargins: { top: 0.12, bottom: 0.12 },
		},
		timeScale: {
			borderColor: 'rgba(255,255,255,0.08)',
		},
		crosshair: { mode: 1 },
		yieldCurve: {
			baseResolution: 1,       // 1 month per unit
			minimumTimeRange: 12,    // show at least 12 months
			startTimeRange: 0,
		},
		handleScroll: true,
		handleScale: true,
		autoSize: true,
	};

	const chartOptions = mergeOptions(baseChartOptions, opts.chartOptions);
	const chart = createYieldCurveChart(el, chartOptions);

	const seriesOpts = useArea
		? {
				lineColor,
				topColor: baselineColor,
				bottomColor,
				lineWidth,
				lineType: smooth ? 2 : 0, // 2 = curved, 0 = simple
				priceLineVisible: false,
				lastValueVisible: true,
				crosshairMarkerVisible: true,
		  }
		: {
				color: lineColor,
				lineWidth,
				lineType: smooth ? 2 : 0,
				priceLineVisible: false,
				lastValueVisible: true,
				crosshairMarkerVisible: true,
		  };

	const series = chart.addSeries(useArea ? AreaSeries : LineSeries, seriesOpts);

	// Attach for convenience so callers can pass either the wrapper return or
	// the chart instance into setYieldCurveData.
	chart.__yieldCurveSeries = series;
	return { chart, series };
}

/**
 * Push a curve into a chart created by `createYieldCurve`.
 *
 * @param {object} chartOrWrapper  Either the chart instance or the {chart,series} wrapper.
 * @param {Array<{time:number,value:number}>} points
 *        time = months-to-maturity (integer >= 0),
 *        value = yield in percent (e.g. 4.25 for 4.25%).
 */
export function setYieldCurveData(chartOrWrapper, points) {
	if (!Array.isArray(points)) {
		throw new Error('setYieldCurveData: points must be an array');
	}
	let series = null;
	if (chartOrWrapper && chartOrWrapper.series && typeof chartOrWrapper.series.setData === 'function') {
		series = chartOrWrapper.series;
	} else if (chartOrWrapper && chartOrWrapper.__yieldCurveSeries) {
		series = chartOrWrapper.__yieldCurveSeries;
	} else if (chartOrWrapper && typeof chartOrWrapper.setData === 'function') {
		series = chartOrWrapper;
	}
	if (!series) {
		throw new Error('setYieldCurveData: could not locate series on argument');
	}

	// Normalize + sort ascending by maturity. The yield-curve horz-scale
	// behavior expects integer month offsets.
	const normalized = points
		.filter((p) => p && Number.isFinite(p.time) && Number.isFinite(p.value))
		.map((p) => ({ time: Math.round(p.time), value: Number(p.value) }))
		.sort((a, b) => a.time - b.time);

	series.setData(normalized);

	// Fit the visible range to the data we just pushed.
	const chart = chartOrWrapper.chart || chartOrWrapper;
	if (chart && typeof chart.timeScale === 'function') {
		try {
			chart.timeScale().fitContent();
		} catch (_) {
			/* ignore — chart may be disposed */
		}
	}
	return series;
}

// ---------------------------------------------------------------------------
// Price-axis (HorzScaleBehaviorPrice) chart
// ---------------------------------------------------------------------------

/**
 * Create a chart whose horizontal axis is a numeric price (not time).
 * Useful for option chains, depth-of-market, IV smiles, vol surfaces, etc.
 *
 * @param {HTMLElement|string} container
 * @param {object} [opts]
 * @param {string} [opts.lineColor]
 * @param {string} [opts.topColor]
 * @param {string} [opts.bottomColor]
 * @param {boolean} [opts.area]           Use AreaSeries instead of LineSeries.
 * @param {number} [opts.lineWidth]
 * @param {number} [opts.priceMinMove]    Granularity of the price horz scale.
 * @param {object} [opts.chartOptions]    Extra chart-level options (merged).
 * @returns {{ chart: object, series: object }}
 */
export function createPriceAxisChart(container, opts = {}) {
	const el = resolveContainer(container);

	const lineColor = opts.lineColor || '#ffb547';
	const topColor = opts.topColor || 'rgba(255,181,71,0.40)';
	const bottomColor = opts.bottomColor || 'rgba(255,181,71,0.02)';
	const useArea = opts.area === true;
	const lineWidth = opts.lineWidth || 2;

	const baseChartOptions = {
		layout: DEFAULT_LAYOUT,
		grid: DEFAULT_GRID,
		rightPriceScale: {
			borderColor: 'rgba(255,255,255,0.08)',
			scaleMargins: { top: 0.12, bottom: 0.12 },
		},
		timeScale: {
			borderColor: 'rgba(255,255,255,0.08)',
		},
		crosshair: { mode: 1 },
		horzScale: {
			// HorzScaleBehaviorPrice-specific options.
			minMove: opts.priceMinMove || 0.01,
		},
		handleScroll: true,
		handleScale: true,
		autoSize: true,
	};

	const chartOptions = mergeOptions(baseChartOptions, opts.chartOptions);
	const chart = createOptionsChart(el, chartOptions);

	const seriesOpts = useArea
		? {
				lineColor,
				topColor,
				bottomColor,
				lineWidth,
				priceLineVisible: false,
				lastValueVisible: true,
		  }
		: {
				color: lineColor,
				lineWidth,
				priceLineVisible: false,
				lastValueVisible: true,
		  };

	const series = chart.addSeries(useArea ? AreaSeries : LineSeries, seriesOpts);
	chart.__priceAxisSeries = series;
	return { chart, series };
}

/**
 * Push data into a price-axis chart series.
 *
 * @param {object} seriesOrWrapper   ISeriesApi, or wrapper from createPriceAxisChart.
 * @param {Array<{time:number,value:number}>} points
 *        time = price (number on the horizontal axis),
 *        value = metric (e.g. open interest, IV, depth size).
 */
export function setPriceAxisData(seriesOrWrapper, points) {
	if (!Array.isArray(points)) {
		throw new Error('setPriceAxisData: points must be an array');
	}
	let series = null;
	if (seriesOrWrapper && seriesOrWrapper.series && typeof seriesOrWrapper.series.setData === 'function') {
		series = seriesOrWrapper.series;
	} else if (seriesOrWrapper && seriesOrWrapper.__priceAxisSeries) {
		series = seriesOrWrapper.__priceAxisSeries;
	} else if (seriesOrWrapper && typeof seriesOrWrapper.setData === 'function') {
		series = seriesOrWrapper;
	}
	if (!series) {
		throw new Error('setPriceAxisData: could not locate series on argument');
	}

	const normalized = points
		.filter((p) => p && Number.isFinite(p.time) && Number.isFinite(p.value))
		.map((p) => ({ time: Number(p.time), value: Number(p.value) }))
		.sort((a, b) => a.time - b.time);

	series.setData(normalized);

	const chart = seriesOrWrapper.chart;
	if (chart && typeof chart.timeScale === 'function') {
		try {
			chart.timeScale().fitContent();
		} catch (_) {
			/* ignore */
		}
	}
	return series;
}

export default {
	createYieldCurve,
	setYieldCurveData,
	createPriceAxisChart,
	setPriceAxisData,
};
