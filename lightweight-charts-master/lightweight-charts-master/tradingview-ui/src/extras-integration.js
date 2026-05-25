/**
 * Extras integration — wires all newly-built modules (plugins, chart-types,
 * advanced drawings, SMC indicators, native lightweight-charts APIs) into the
 * main chart. Exposes a single `wireExtras(chart, series, container, ctx)`
 * entrypoint plus a façade returned on `ctx.extras`.
 *
 * Called once after the chart mounts (from chart-view.js).
 */

import { createHoverTooltip, createDeltaTooltip } from './plugins/tooltips.js';
import { createSessionShading, createVerticalLines } from './plugins/shading.js';
import { attachUpDownMarkers, createHighLowBand } from './plugins/series-ext.js';
import { enableBrushZoom, createAnchoredText } from './plugins/interactions.js';

// Mass-ported plugins (Phase 4)
import { addRoundedCandlesSeries, addPrettyHistogramSeries } from './plugins/custom-series-1.js';
import { addStackedAreaSeries, addStackedBarsSeries, addGroupedBarsSeries } from './plugins/custom-series-2.js';
import { addBoxWhiskerSeries, addLollipopSeries } from './plugins/custom-series-3.js';
import { addHlcAreaSeries, addDualRangeHistogramSeries, attachBandsIndicator } from './plugins/custom-series-4.js';
import { addHeatmapSeries, attachImageWatermark } from './plugins/heatmap-native.js';
import { attachHighlightBarCrosshair, attachBackgroundShade, attachOverlayPriceScale } from './plugins/visual-extras.js';
import { createUserPriceLines, createUserPriceAlerts, createPartialPriceLine, createExpiringAlerts } from './plugins/price-lines.js';

import { toHeikinAshi, toRenko, toLineBreak, applyChartType }   from './chart-types/ha-renko-lb.js';
import { toRangeBars, toPointAndFigure, toKagi, applyAltChartType } from './chart-types/rb-pf-kagi.js';

import { POSITION_RANGE_TOOLS }   from './drawings/position-range.js';
import { PITCHFORK_GANN_TOOLS }   from './drawings/pitchfork-gann.js';
import { ELLIOTT_TEXT_TOOLS }     from './drawings/elliott-text.js';

import {
  FairValueGap, OrderBlocks, BreakOfStructure, ChangeOfCharacter,
  LiquiditySweeps, VolumeDelta, AnchoredVolumeProfile,
  SMC_INDICATOR_CATALOG,
} from './indicators-smc.js';

// ============================================================
// PUBLIC: wireExtras — call once after the chart mounts
// ============================================================
export function wireExtras(chart, series, container, ctx = {}) {
  const handles = {
    hoverTooltip: null,
    deltaTooltip: null,
    sessionShading: null,
    verticalLines: null,
    upDownMarkers: null,
    highLowBand: null,
    brushZoom: null,
    anchoredText: null,
    activeDrawings: [],
    smcOverlays: [],
  };

  // --- Hover & delta tooltips (off by default; enable via façade)
  const facade = {
    // Tooltips
    toggleHoverTooltip(on) {
      if (on && !handles.hoverTooltip) {
        handles.hoverTooltip = createHoverTooltip(chart, series, container);
      } else if (!on && handles.hoverTooltip) {
        handles.hoverTooltip.destroy(); handles.hoverTooltip = null;
      }
    },
    toggleDeltaTooltip(on) {
      if (on && !handles.deltaTooltip) {
        handles.deltaTooltip = createDeltaTooltip(chart, series, container);
      } else if (!on && handles.deltaTooltip) {
        handles.deltaTooltip.destroy(); handles.deltaTooltip = null;
      }
    },

    // Session shading + vertical event lines
    toggleSessionShading(on) {
      if (on && !handles.sessionShading) {
        handles.sessionShading = createSessionShading(chart, container);
      } else if (!on && handles.sessionShading) {
        handles.sessionShading.destroy(); handles.sessionShading = null;
      }
    },
    addVerticalLine(opts) {
      if (!handles.verticalLines) {
        handles.verticalLines = createVerticalLines(chart, series, container);
      }
      return handles.verticalLines.addLine(opts);
    },
    clearVerticalLines() {
      if (handles.verticalLines) handles.verticalLines.clear();
    },

    // Up/Down markers + high/low band
    toggleUpDownMarkers(on, candles) {
      if (on && !handles.upDownMarkers) {
        handles.upDownMarkers = attachUpDownMarkers(chart, series, { initialData: candles || ctx.candles });
      } else if (!on && handles.upDownMarkers) {
        handles.upDownMarkers.destroy(); handles.upDownMarkers = null;
      }
    },
    showHighLowBand(highs, lows, paneIndex = 0) {
      if (handles.highLowBand) handles.highLowBand.destroy();
      handles.highLowBand = createHighLowBand(chart, paneIndex);
      handles.highLowBand.setData({ highs, lows });
    },
    hideHighLowBand() {
      if (handles.highLowBand) { handles.highLowBand.destroy(); handles.highLowBand = null; }
    },

    // Brush-zoom + anchored text
    toggleBrushZoom(on) {
      if (on && !handles.brushZoom) {
        handles.brushZoom = enableBrushZoom(chart, container);
      } else if (!on && handles.brushZoom) {
        handles.brushZoom.destroy(); handles.brushZoom = null;
      }
    },
    addAnchoredText(opts) {
      if (!handles.anchoredText) handles.anchoredText = createAnchoredText(chart, series, container);
      return handles.anchoredText.add(opts);
    },
    clearAnchoredText() { if (handles.anchoredText) handles.anchoredText.clear(); },

    // Chart-type transforms — apply to current series
    setChartType(type, candles, opts) {
      const c = candles || ctx.candles;
      try {
        if (['heikin-ashi', 'renko', 'line-break'].includes(type)) {
          return applyChartType(series, c, type, opts);
        }
        if (['range', 'pf', 'kagi'].includes(type)) {
          return applyAltChartType(series, c, type, opts);
        }
        if (type === 'candles') {
          series.setData(c);
          return c;
        }
      } catch (e) { console.error('[extras] setChartType', e); }
    },

    // Drawing tools façade — caller passes the existing SVG overlay element
    drawings: {
      registries: {
        position: POSITION_RANGE_TOOLS,
        pitchfork: PITCHFORK_GANN_TOOLS,
        elliott: ELLIOTT_TEXT_TOOLS,
      },
      start(toolId, svgOverlay) {
        const all = { ...POSITION_RANGE_TOOLS, ...PITCHFORK_GANN_TOOLS, ...ELLIOTT_TEXT_TOOLS };
        const entry = all[toolId];
        if (!entry) { console.warn('[extras] unknown tool', toolId); return null; }
        const factory = entry.factory || entry.create;
        const tool = factory(svgOverlay, chart, series);
        if (tool.startDraw) tool.startDraw();
        else if (tool.activate) tool.activate();
        else if (tool.beginCreate) tool.beginCreate();
        handles.activeDrawings.push(tool);
        return tool;
      },
    },

    // SMC indicators — compute and return data (rendering left to caller)
    smc: {
      catalog: SMC_INDICATOR_CATALOG,
      fvg: (candles, opts) => FairValueGap(candles || ctx.candles, opts),
      orderBlocks: (candles, opts) => OrderBlocks(candles || ctx.candles, opts),
      bos: (candles, opts) => BreakOfStructure(candles || ctx.candles, opts),
      choch: (candles, opts) => ChangeOfCharacter(candles || ctx.candles, opts),
      sweeps: (candles, opts) => LiquiditySweeps(candles || ctx.candles, opts),
      volumeDelta: (candles) => VolumeDelta(candles || ctx.candles),
      anchoredVP: (candles, anchorTime, opts) =>
        AnchoredVolumeProfile(candles || ctx.candles, anchorTime, opts),
    },

    // ===== NATIVE lightweight-charts APIs =====

    /** Export chart to PNG (download or return blob). */
    takeScreenshot(opts = {}) {
      try {
        const canvas = chart.takeScreenshot();
        if (opts.asBlob) {
          return new Promise(res => canvas.toBlob(res, 'image/png'));
        }
        if (opts.download !== false) {
          const a = document.createElement('a');
          a.download = opts.filename || `chart-${Date.now()}.png`;
          a.href = canvas.toDataURL('image/png');
          document.body.appendChild(a); a.click(); a.remove();
        }
        return canvas;
      } catch (e) { console.error('[extras] screenshot', e); return null; }
    },

    /** Enable infinite-scroll: when user scrolls to the left edge, fire onLoadMore. */
    enableInfiniteScroll(onLoadMore, opts = {}) {
      const thresholdBars = opts.thresholdBars || 50;
      let loading = false;
      const unsub = chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || loading) return;
        if (range.from < thresholdBars) {
          loading = true;
          Promise.resolve(onLoadMore(range)).finally(() => { loading = false; });
        }
      });
      return { destroy() { try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(unsub); } catch {} } };
    },

    /** Set custom price/time formatters (i18n). */
    setLocalization({ priceFormatter, timeFormatter, locale } = {}) {
      const opts = {};
      if (locale) opts.locale = locale;
      if (priceFormatter) opts.priceFormatter = priceFormatter;
      if (timeFormatter) opts.timeFormatter = timeFormatter;
      try { chart.applyOptions({ localization: opts }); } catch (e) { console.warn('[extras] localization', e); }
    },

    /** Set image watermark (logo) over the chart. */
    setImageWatermark(imageUrl, opts = {}) {
      // lightweight-charts v5 exposes createImageWatermark via the library if requested.
      // We implement a lightweight DOM overlay equivalent that respects pane resizes.
      const existing = container.querySelector('[data-extras-watermark]');
      if (existing) existing.remove();
      if (!imageUrl) return;
      const img = document.createElement('img');
      img.dataset.extrasWatermark = '1';
      img.src = imageUrl;
      Object.assign(img.style, {
        position: 'absolute',
        bottom: (opts.bottom || 24) + 'px',
        right: (opts.right || 60) + 'px',
        width: (opts.width || 90) + 'px',
        opacity: opts.opacity || 0.15,
        pointerEvents: 'none',
        zIndex: 2,
      });
      const cs = getComputedStyle(container);
      if (cs.position === 'static') container.style.position = 'relative';
      container.appendChild(img);
    },

    // ===== MASS-PORT PLUGINS =====

    /** Add a custom series of any of the imported types. */
    addCustomSeries(type, opts = {}) {
      const map = {
        'rounded-candles':   addRoundedCandlesSeries,
        'pretty-histogram':  addPrettyHistogramSeries,
        'stacked-area':      addStackedAreaSeries,
        'stacked-bars':      addStackedBarsSeries,
        'grouped-bars':      addGroupedBarsSeries,
        'box-whisker':       addBoxWhiskerSeries,
        'lollipop':          addLollipopSeries,
        'hlc-area':          addHlcAreaSeries,
        'dual-histogram':    addDualRangeHistogramSeries,
        'heatmap-native':    addHeatmapSeries,
      };
      const fn = map[type];
      if (!fn) { console.warn('[extras] unknown custom series', type); return null; }
      try { return fn(chart, opts); } catch (e) { console.error('[extras] addCustomSeries', e); return null; }
    },

    /** Attach Bollinger-style bands as a native primitive to the main series. */
    attachBands(opts) {
      try { return attachBandsIndicator(series, opts); } catch (e) { console.error('[extras] bands', e); return null; }
    },

    /** Toggle highlight-bar crosshair (vertical band on hover). */
    toggleHighlightBar(on, opts) {
      if (on && !handles.highlightBar) {
        handles.highlightBar = attachHighlightBarCrosshair(chart, container, opts || {});
      } else if (!on && handles.highlightBar) {
        handles.highlightBar.destroy(); handles.highlightBar = null;
      }
    },

    /** Background-shade region API. */
    background: {
      _h: null,
      add(region) {
        if (!this._h) this._h = attachBackgroundShade(chart, container);
        return this._h.addRegion(region);
      },
      remove(id) { if (this._h) this._h.removeRegion(id); },
      clear() { if (this._h) this._h.clear(); },
      destroy() { if (this._h) { this._h.destroy(); this._h = null; } },
    },

    /** Move a series to an overlay price scale (its own visible scale). */
    overlayPriceScale(targetSeries, opts) {
      try { return attachOverlayPriceScale(chart, targetSeries || series, opts || {}); }
      catch (e) { console.error('[extras] overlayPriceScale', e); return null; }
    },

    /** Image watermark on a pane. */
    setImageWatermarkNative(imageUrl, paneIndex = 0, opts) {
      try {
        if (handles.imageWatermark) handles.imageWatermark.destroy();
        handles.imageWatermark = attachImageWatermark(chart, paneIndex, imageUrl, opts || {});
      } catch (e) { console.error('[extras] imageWatermark', e); }
    },

    /** User price lines / alerts — auto-initialized for right-click context menu. */
    userLines: {
      _h: null,
      _alerts: null,
      lines() { if (!this._h) this._h = createUserPriceLines(chart, series, container); return this._h; },
      alerts() { if (!this._alerts) this._alerts = createUserPriceAlerts(chart, series, container); return this._alerts; },
      addLine(opts) { return this.lines().add(opts); },
      addAlert(opts) { return this.alerts().add(opts); },
      onAlertTrigger(cb) { return this.alerts().onTrigger(cb); },
      destroy() {
        if (this._h) { this._h.destroy(); this._h = null; }
        if (this._alerts) { this._alerts.destroy(); this._alerts = null; }
      },
    },

    /** Partial price line (only renders between two times). */
    addPartialPriceLine(opts) {
      try { return createPartialPriceLine(series, opts); }
      catch (e) { console.error('[extras] partialPriceLine', e); return null; }
    },

    /** Expiring alerts that auto-remove after TTL. */
    expiringAlerts: {
      _h: null,
      get handle() {
        if (!this._h) this._h = createExpiringAlerts(chart, series, container);
        return this._h;
      },
      add(opts) { return this.handle.add(opts); },
      destroy() { if (this._h) { this._h.destroy(); this._h = null; } },
    },

    // Cleanup everything
    destroyAll() {
      Object.keys(handles).forEach(k => {
        const h = handles[k];
        if (h && typeof h.destroy === 'function') { try { h.destroy(); } catch {} }
        if (Array.isArray(h)) h.forEach(x => { try { x.destroy && x.destroy(); } catch {} });
        handles[k] = Array.isArray(h) ? [] : null;
      });
    },
  };

  // Defaults: tooltips OFF (user toggles them from the crosshair dropdown).
  // Brush-zoom is silent (only activates on Alt+drag) so it stays on.
  try { facade.toggleBrushZoom(true); } catch {}
  // Auto-enable right-click context menu for user price lines/alerts (matches TradingView UX)
  try { facade.userLines.lines(); facade.userLines.alerts(); } catch {}

  return facade;
}

// Re-export raw modules so consumers can deep-import if needed
export {
  // Plugins
  createHoverTooltip, createDeltaTooltip,
  createSessionShading, createVerticalLines,
  attachUpDownMarkers, createHighLowBand,
  enableBrushZoom, createAnchoredText,
  // Chart-type transforms
  toHeikinAshi, toRenko, toLineBreak, applyChartType,
  toRangeBars, toPointAndFigure, toKagi, applyAltChartType,
  // Drawing registries
  POSITION_RANGE_TOOLS, PITCHFORK_GANN_TOOLS, ELLIOTT_TEXT_TOOLS,
  // SMC indicators
  FairValueGap, OrderBlocks, BreakOfStructure, ChangeOfCharacter,
  LiquiditySweeps, VolumeDelta, AnchoredVolumeProfile,
  SMC_INDICATOR_CATALOG,
};
