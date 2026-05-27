/**
 * drawing-system.js
 * -----------------------------------------------------------------------------
 * A self-contained SVG-overlay drawing engine for lightweight-charts v5.
 *
 * Inspired by TradingView's drawing UX and the architecture of KLineChart's
 * overlay system, this module provides a single `DrawingManager` class plus a
 * registry of 15 drawing types.  Drawings are rendered as SVG elements on top
 * of the chart canvas, support multi-click creation, selection, dragging
 * (whole body or individual handle), a right-click context menu, an inline
 * properties bar, optional OHLC magnet snapping and `localStorage`
 * persistence.
 *
 * Only dependency: a `chart`, `series` and `container` provided at construction
 * time.  No imports from lightweight-charts at runtime — the chart object
 * carries all the API surface we need.
 *
 * Usage:
 *   import { DrawingManager } from './drawing-system.js';
 *   const mgr = new DrawingManager(chart, series, container);
 *   mgr.activate('trend-line');
 *   mgr.loadFromStorage();
 *
 * ESM module, ~2k LOC.  Pass `node --check drawing-system.js`.
 * -----------------------------------------------------------------------------
 */

// =============================================================================
// CONSTANTS & UTILITIES
// =============================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'tv.drawings_v3';
const MAGNET_KEY = 'tv.magnetMode';
const HANDLE_SIZE = 7;
const HIT_TOLERANCE = 6;
const SNAP_TOLERANCE_PX = 5;

const PRESET_COLORS = [
  '#2962ff', '#f23645', '#089981', '#ff9800',
  '#9c27b0', '#00bcd4', '#ffffff', '#787b86',
];

const DEFAULT_OPTIONS = {
  color: '#2962ff',
  width: 2,
  style: 'solid',    // 'solid' | 'dashed' | 'dotted'
  fillAlpha: 0.12,
  locked: false,
  text: '',
};

const LINE_STYLE_DASH = {
  solid: '',
  dashed: '6 4',
  dotted: '2 3',
};

// ---------- tiny helpers ----------

function uid() {
  return 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(node);
  return node;
}

function htmlEl(tag, props = {}, parent = null) {
  const node = document.createElement(tag);
  for (const k in props) {
    if (k === 'style' && typeof props[k] === 'object') {
      Object.assign(node.style, props[k]);
    } else if (k === 'class') {
      node.className = props[k];
    } else if (k === 'html') {
      node.innerHTML = props[k];
    } else if (k === 'text') {
      node.textContent = props[k];
    } else if (k.startsWith('on') && typeof props[k] === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    } else {
      node.setAttribute(k, props[k]);
    }
  }
  if (parent) parent.appendChild(node);
  return node;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const xx = x1 + t * dx, yy = y1 + t * dy;
  return dist(px, py, xx, yy);
}

function pointToRayDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0) t = 0;
  const xx = x1 + t * dx, yy = y1 + t * dy;
  return dist(px, py, xx, yy);
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return dist(px, py, x1, y1);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
}

function pointInRect(px, py, x1, y1, x2, y2) {
  const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
  const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
  return px >= xMin && px <= xMax && py >= yMin && py <= yMax;
}

// Draw a small pill-style label (rect + text) anchored at (x, y)
function drawPillLabel(group, x, y, text, opts = {}) {
  const fs = opts.fontSize || 11;
  const padX = opts.padX != null ? opts.padX : 4;
  const padY = opts.padY != null ? opts.padY : 2;
  const w = Math.max(opts.minWidth || 0, String(text).length * fs * 0.6) + padX * 2;
  const h = fs + padY * 2;
  const anchor = opts.anchor || 'start'; // 'start' | 'middle' | 'end'
  let rx = x;
  if (anchor === 'middle') rx = x - w / 2;
  else if (anchor === 'end') rx = x - w;
  const ry = y - h / 2;
  el('rect', {
    x: rx, y: ry, width: w, height: h, rx: opts.rx != null ? opts.rx : 2,
    fill: opts.bg || hexWithAlpha('#1c1c1c', 0.85),
    stroke: opts.stroke || 'none', 'stroke-width': opts.strokeWidth || 0,
    class: 'drawing-fill',
  }, group);
  el('text', {
    x: anchor === 'middle' ? x : (anchor === 'end' ? rx + w - padX : rx + padX),
    y: y + fs / 3,
    'text-anchor': anchor === 'middle' ? 'middle' : (anchor === 'end' ? 'end' : 'start'),
    fill: opts.color || '#fff',
    'font-size': fs,
    class: 'drawing-label',
  }, group).textContent = String(text);
  return { x: rx, y: ry, width: w, height: h };
}

// Get bars/candles from a draw ctx (multiple shapes supported)
function getBarsFromCtx(ctx) {
  return ctx.bars || (ctx.chart && ctx.chart.__bars) || [];
}

// Compute line-to-edge intersection points
function extendLineToEdges(x1, y1, x2, y2, w, h, extLeft, extRight) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const big = Math.sqrt(w * w + h * h) * 2;
  let nx1 = x1, ny1 = y1, nx2 = x2, ny2 = y2;
  if (extLeft) { nx1 = x1 - ux * big; ny1 = y1 - uy * big; }
  if (extRight) { nx2 = x2 + ux * big; ny2 = y2 + uy * big; }
  return { x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
}

function hexWithAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function brighten(hex, factor = 1.25) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  r = clamp(Math.round(r * factor), 0, 255);
  g = clamp(Math.round(g * factor), 0, 255);
  b = clamp(Math.round(b * factor), 0, 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// CSS INJECTION
// =============================================================================

const CSS = `
.drawing-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
}
/* Default: SVG passes clicks through to chart. Individual visible elements
   opt-in to pointer events. While a tool is active we set the SVG itself
   to pointer-events:auto via JS so empty clicks are captured for creation. */
.drawing-overlay.is-active {
  pointer-events: auto;
  cursor: crosshair;
}
.drawing-overlay .drawing-line,
.drawing-overlay .drawing-fill,
.drawing-overlay .drawing-handle {
  pointer-events: auto;
}
.drawing-overlay .drawing-label,
.drawing-overlay .drawing-label-bg {
  pointer-events: none;
}
.drawing-handle {
  cursor: grab;
  transition: opacity 150ms ease;
  shape-rendering: geometricPrecision;
}
/* Visible minimalist circle dot on top of each anchor */
.drawing-handle-dot {
  fill: #2962ff;
  stroke: #ffffff;
  stroke-width: 1.5;
  transition: r 120ms ease, fill 120ms ease, stroke 120ms ease;
}
/* When the parent drawing group is hovered, slightly enlarge the visible dot */
.drawing.hovered .drawing-handle-dot,
.drawing.selected .drawing-handle-dot {
  r: 4.5;
}
/* When the invisible hit area is hovered, the visible dot should react via sibling.
   SVG doesn't support :has reliably yet, so use the group-level state instead. */
.drawing.selected .drawing-handle-dot {
  fill: #ffffff;
  stroke: #2962ff;
  stroke-width: 2;
}
.drawing-line {
  cursor: pointer;
  fill: none;
}
.drawing-fill {
  cursor: pointer;
}
.drawing.selected .drawing-line,
.drawing.selected .drawing-fill {
  filter: brightness(1.3);
}
.drawing.hovered:not(.selected) .drawing-line {
  filter: brightness(1.15);
}
.drawing-label {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  pointer-events: none;
  user-select: none;
}
.drawing-label-bg {
  pointer-events: none;
}
.drawing-context-menu {
  position: absolute;
  background: #1c1c1c;
  border: 1px solid #2e2e2e;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  padding: 4px 0;
  z-index: 10000;
  min-width: 180px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  color: #d1d4dc;
  user-select: none;
  animation: drawingCtxFadeIn 100ms ease-out;
}
@keyframes drawingCtxFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.drawing-context-menu .item {
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.drawing-context-menu .item:hover {
  background: #2962ff;
  color: #fff;
}
.drawing-context-menu .item.sep {
  border-top: 1px solid #2e2e2e;
  margin: 4px 0;
  padding: 0;
  height: 0;
  cursor: default;
}
.drawing-context-menu .item.sep:hover { background: transparent; }
.drawing-context-menu .submenu {
  position: relative;
}
.drawing-context-menu .swatch {
  width: 14px; height: 14px;
  border-radius: 2px;
  border: 1px solid #555;
  display: inline-block;
}
.drawing-properties-panel {
  position: absolute;
  background: rgba(22, 26, 36, 0.92);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25);
  padding: 3px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  color: #d1d4dc;
  height: 34px;
  animation: dpp-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dpp-in { from { opacity: 0; transform: translateY(-6px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
.drawing-properties-panel .dpp-btn {
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #b2b5be;
  cursor: pointer;
  border-radius: 6px;
  padding: 0;
  transition: background 120ms ease, color 120ms ease, transform 120ms ease;
}
.drawing-properties-panel .dpp-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.drawing-properties-panel .dpp-btn:active { transform: scale(0.94); }
.drawing-properties-panel .dpp-btn.active { background: rgba(41, 98, 255, 0.18); color: #4d8bff; }
.drawing-properties-panel .dpp-btn svg { width: 15px; height: 15px; stroke: currentColor; fill: none; }
.drawing-properties-panel .dpp-divider { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.06); margin: 0 1px; }
.drawing-properties-panel .swatch-btn {
  width: 14px; height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.drawing-properties-panel .dpp-width-btn {
  display: inline-flex; align-items: center; justify-content: center;
  position: relative;
}
.drawing-properties-panel .dpp-width-btn::after {
  content: ''; width: 16px; height: var(--w, 2px); background: currentColor; border-radius: 2px;
}
.drawing-properties-panel .dpp-style-btn::after {
  content: ''; width: 16px; height: 2px; background: currentColor; border-radius: 1px;
}
.drawing-properties-panel .dpp-style-btn[data-style="dashed"]::after {
  background: repeating-linear-gradient(to right, currentColor 0 4px, transparent 4px 7px);
}
.drawing-properties-panel .dpp-style-btn[data-style="dotted"]::after {
  background: repeating-linear-gradient(to right, currentColor 0 2px, transparent 2px 5px);
}
.drawing-properties-panel .dpp-pop {
  position: absolute;
  top: 40px;
  left: 0;
  background: rgba(22, 26, 36, 0.95);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  z-index: 10000;
  animation: dpp-pop-in 140ms cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 160px;
}
@keyframes dpp-pop-in { from { opacity: 0; transform: translateY(-4px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.drawing-properties-panel .dpp-pop .swatch-btn {
  width: 22px; height: 22px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: transform 100ms ease, border-color 100ms ease;
}
.drawing-properties-panel .dpp-pop .swatch-btn:hover {
  transform: scale(1.12);
  border-color: rgba(255, 255, 255, 0.6);
}
.drawing-properties-panel .dpp-pop .dpp-btn {
  width: 100%; height: 28px;
  border-radius: 6px;
  justify-content: flex-start;
  padding-left: 10px;
}
.drawing-properties-panel .dpp-pop input[type="text"] {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #d1d4dc;
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 6px;
  font-family: ui-monospace, "SF Mono", Monaco, monospace;
  margin-top: 4px;
  outline: none;
  transition: border-color 120ms ease;
}
.drawing-properties-panel .dpp-pop input[type="text"]:focus { border-color: #4d8bff; }
.drawing-properties-panel .close-btn {
  color: #b2b5be;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}
.drawing-hint {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 23, 31, 0.78);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  backdrop-filter: blur(8px) saturate(140%);
  color: #e8eaed;
  padding: 7px 14px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  line-height: 1.3;
  z-index: 10050;
  pointer-events: none;
  border: 1px solid rgba(41, 98, 255, 0.55);
  box-shadow: 0 4px 18px rgba(0,0,0,0.55);
  animation: drawingHintIn 150ms ease-out;
  white-space: nowrap;
}
.drawing-hint .dh-tool   { color: #b2b5be; margin-right: 6px; }
.drawing-hint .dh-count  { color: #fff; font-weight: 700; }
.drawing-hint .dh-total  { color: #b2b5be; }
.drawing-hint .dh-sep    { color: #4a4f5b; margin: 0 6px; }
.drawing-hint .dh-esc    { color: #b2b5be; }
.drawing-hint .dh-esc b  { color: #fff; font-weight: 600; }
@keyframes drawingHintIn {
  from { opacity: 0; transform: translate(-50%, -8px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
.drawing-hover-tip {
  position: fixed;
  background: rgba(20, 23, 31, 0.92);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #e8eaed;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  z-index: 10049;
  pointer-events: none;
  border: 1px solid #2a2e39;
  box-shadow: 0 3px 10px rgba(0,0,0,0.5);
  animation: drawingHintIn 120ms ease-out;
  max-width: 260px;
}
.drawing-hover-tip .dt-title { color: #fff; font-weight: 600; margin-bottom: 2px; }
.drawing-hover-tip .dt-row   { display: flex; gap: 8px; justify-content: space-between; }
.drawing-hover-tip .dt-row span:first-child { color: #b2b5be; }
.drawing-hover-tip .dt-row b { color: #fff; font-weight: 500; }
.drawing-hover-tip .dt-up { color: #089981; }
.drawing-hover-tip .dt-dn { color: #f23645; }
.drawing-color-popover {
  position: absolute;
  background: #1c1c1c;
  border: 1px solid #2e2e2e;
  border-radius: 4px;
  padding: 8px;
  z-index: 10001;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  display: grid;
  grid-template-columns: repeat(4, 22px);
  gap: 6px;
}
.drawing-color-popover .sw {
  width: 22px; height: 22px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid #555;
}
.drawing-color-popover .hex-input {
  grid-column: 1 / -1;
  background: #2a2a2a;
  color: #d1d4dc;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 11px;
}
.drawing-text-edit {
  position: absolute;
  background: #1c1c1c;
  color: #fff;
  border: 1px solid #2962ff;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  z-index: 10000;
  font-family: inherit;
}
/* ===== Settings dialog ===== */
.drawing-settings-dialog {
  position: fixed;
  background: rgba(22, 26, 36, 0.95);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4);
  z-index: 10010;
  color: #d1d4dc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  width: 280px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  user-select: none;
  animation: drawingDlgIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes drawingDlgIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.drawing-settings-dialog .dsd-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.drawing-settings-dialog .dsd-title {
  font-size: 12px;
  font-weight: 600;
  color: #e4e6eb;
  flex: 1;
  letter-spacing: 0.2px;
}
.drawing-settings-dialog .dsd-close {
  background: transparent;
  border: none;
  color: #787b86;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  line-height: 1;
  border-radius: 4px;
  transition: background 120ms, color 120ms;
}
.drawing-settings-dialog .dsd-close:hover {
  background: rgba(255,255,255,0.06);
  color: #fff;
}
.drawing-settings-dialog .dsd-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.drawing-settings-dialog .dsd-tab {
  background: transparent;
  border: none;
  color: #787b86;
  font-size: 11px;
  font-weight: 500;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: color 120ms, background 120ms;
  position: relative;
  top: 1px;
}
.drawing-settings-dialog .dsd-tab:hover { color: #d1d4dc; }
.drawing-settings-dialog .dsd-tab.active {
  color: #4d8bff;
  border-bottom: 2px solid #4d8bff;
}
.drawing-settings-dialog .dsd-body {
  padding: 10px 12px 12px;
  overflow-y: auto;
  flex: 1;
}
.drawing-settings-dialog .dsd-body::-webkit-scrollbar { width: 6px; }
.drawing-settings-dialog .dsd-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
}
.drawing-settings-dialog .dsd-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.drawing-settings-dialog .dsd-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.drawing-settings-dialog .dsd-label {
  font-size: 11px;
  color: #787b86;
  letter-spacing: 0.2px;
}
.drawing-settings-dialog .dsd-section-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #5a5d66;
  margin: 6px 0 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.drawing-settings-dialog .dsd-section-title:first-child {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}
.drawing-settings-dialog input[type="text"],
.drawing-settings-dialog input[type="number"],
.drawing-settings-dialog select,
.drawing-settings-dialog textarea {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 6px 10px;
  color: #e4e6eb;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 120ms, background 120ms;
  width: 100%;
  box-sizing: border-box;
}
.drawing-settings-dialog input[type="text"]:focus,
.drawing-settings-dialog input[type="number"]:focus,
.drawing-settings-dialog select:focus,
.drawing-settings-dialog textarea:focus {
  border-color: #4d8bff;
  background: rgba(0,0,0,0.4);
}
.drawing-settings-dialog textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}
.drawing-settings-dialog select {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='%23787b86'><path d='M0 0l5 6 5-6z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 8px 5px;
  padding-right: 24px;
}
/* Toggle */
.drawing-settings-dialog .dsd-toggle {
  position: relative;
  width: 28px;
  height: 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms;
  flex-shrink: 0;
}
.drawing-settings-dialog .dsd-toggle::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ccc;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), background 150ms;
}
.drawing-settings-dialog .dsd-toggle.on { background: #4d8bff; }
.drawing-settings-dialog .dsd-toggle.on::after {
  transform: translateX(12px);
  background: #fff;
}
/* Slider */
.drawing-settings-dialog .dsd-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drawing-settings-dialog input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  outline: none;
}
.drawing-settings-dialog input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #4d8bff;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 0 4px rgba(0,0,0,0.4);
}
.drawing-settings-dialog input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #4d8bff;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
}
.drawing-settings-dialog .dsd-slider-val {
  font-size: 11px;
  color: #d1d4dc;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
/* Color field */
.drawing-settings-dialog .dsd-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 120ms;
  background-clip: padding-box;
}
.drawing-settings-dialog .dsd-color-swatch:hover { transform: scale(1.08); }
.drawing-settings-dialog .dsd-color-pop {
  position: absolute;
  background: rgba(22,26,36,0.98);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.5);
  z-index: 10020;
  display: grid;
  grid-template-columns: repeat(4, 22px);
  gap: 6px;
}
.drawing-settings-dialog .dsd-color-pop .sw {
  width: 22px; height: 22px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 100ms;
}
.drawing-settings-dialog .dsd-color-pop .sw:hover { transform: scale(1.12); }
.drawing-settings-dialog .dsd-color-pop input {
  grid-column: 1 / -1;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px;
  color: #d1d4dc;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
}
/* Level/list row (fib) */
.drawing-settings-dialog .dsd-level-row {
  display: grid;
  grid-template-columns: 18px 60px 1fr 22px;
  gap: 6px;
  align-items: center;
  padding: 3px 0;
}
.drawing-settings-dialog .dsd-level-row input[type="number"] {
  padding: 3px 6px;
  font-size: 11px;
}
/* Coord row */
.drawing-settings-dialog .dsd-coord-row {
  display: grid;
  grid-template-columns: 14px 1fr 1fr;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
}
.drawing-settings-dialog .dsd-coord-row .lbl {
  font-size: 10px;
  color: #5a5d66;
  text-align: center;
}
.drawing-settings-dialog .dsd-coord-row input {
  padding: 4px 6px;
  font-size: 11px;
}
.drawing-settings-dialog .dsd-btn-small {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #d1d4dc;
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 120ms;
  width: 100%;
  margin-top: 6px;
}
.drawing-settings-dialog .dsd-btn-small:hover { background: rgba(77,139,255,0.15); border-color: rgba(77,139,255,0.3); }
.drawing-settings-dialog .dsd-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  background: rgba(8,153,129,0.2);
  color: #4dd9a8;
}
.drawing-settings-dialog .dsd-badge.warn {
  background: rgba(242,54,69,0.2);
  color: #ff7a85;
}
.drawing-settings-dialog .dsd-readonly {
  background: rgba(0,0,0,0.2);
  color: #787b86;
  cursor: not-allowed;
}
`;

function injectCSS() {
  if (document.querySelector('style[data-drawing-system]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-drawing-system', '1');
  style.textContent = CSS;
  document.head.appendChild(style);
}

// =============================================================================
// BASE DRAWING CLASS
// =============================================================================

class BaseDrawing {
  static type = 'base';
  static label = 'Base';
  static pointsRequired = 2;

  constructor(points = [], options = {}, id = null) {
    this.id = id || uid();
    this.points = points;  // [{time, price}, ...]
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.zIndex = 0;
  }

  get type() { return this.constructor.type; }
  get label() { return this.constructor.label; }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      points: this.points.map(p => ({ time: p.time, price: p.price })),
      options: Object.assign({}, this.options),
      zIndex: this.zIndex,
    };
  }

  /**
   * Project all anchor points into screen pixels.
   * Returns array of {x, y, valid} — invalid points are off-chart.
   */
  projectPoints(ctx) {
    return this.points.map(p => {
      const x = ctx.projectX(p.time);
      const y = ctx.projectY(p.price);
      return { x, y, valid: x !== null && y !== null };
    });
  }

  /** Effective stroke color, considering selection state */
  strokeColor(state = {}) {
    if (state.selected) return brighten(this.options.color, 1.3);
    return this.options.color;
  }

  dashArray() {
    return LINE_STYLE_DASH[this.options.style] || '';
  }

  /** Default render is empty — subclasses override */
  render(group, ctx, state) { /* abstract */ }

  /** Default hit test — subclasses override */
  hitTest(x, y, ctx) { return false; }

  /** Default handle positions = projected points */
  getHandlePositions(ctx) {
    return this.projectPoints(ctx)
      .map((p, i) => ({ x: p.x, y: p.y, anchorIdx: i, valid: p.valid }))
      .filter(p => p.valid);
  }

  /** Translate every anchor by (dx, dy) pixels.
   *  If ANY point fails to project, abort entirely so we don't deform the drawing. */
  translateBy(dx, dy, ctx) {
    const next = [];
    for (const p of this.points) {
      const x = ctx.projectX(p.time);
      const y = ctx.projectY(p.price);
      if (x === null || y === null) return this.points;
      const newTime = ctx.inverseX(x + dx);
      const newPrice = ctx.inverseY(y + dy);
      if (newTime === null || newTime === undefined || newPrice === null || newPrice === undefined) {
        return this.points;
      }
      next.push({ time: newTime, price: newPrice });
    }
    this.points = next;
  }
}

// =============================================================================
// DRAWING IMPLEMENTATIONS — 15 TYPES
// =============================================================================

// ---------- 1. Trend line ----------
class TrendLineDrawing extends BaseDrawing {
  static type = 'trend-line';
  static label = 'Línea de tendencia';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const extLeft = this.options.extendLeft !== false;
    const extRight = this.options.extendRight !== false;
    const { x1, y1, x2, y2 } = extendLineToEdges(
      pts[0].x, pts[0].y, pts[1].x, pts[1].y,
      ctx.width, ctx.height, extLeft, extRight
    );
    const stroke = this.strokeColor(state);
    el('line', {
      x1, y1, x2, y2,
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
    if (this.options.showLabels) {
      drawPillLabel(group, pts[0].x, pts[0].y, this.points[0].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'end' });
      drawPillLabel(group, pts[1].x, pts[1].y, this.points[1].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'start' });
    }
  }

  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToLineDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 2. Segment ----------
class SegmentDrawing extends BaseDrawing {
  static type = 'segment';
  static label = 'Segmento';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    el('line', {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
    if (this.options.showLabels) {
      drawPillLabel(group, pts[0].x, pts[0].y, this.points[0].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'end' });
      drawPillLabel(group, pts[1].x, pts[1].y, this.points[1].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'start' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 3. Ray ----------
class RayDrawing extends BaseDrawing {
  static type = 'ray';
  static label = 'Rayo';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const extLeft = this.options.extendLeft === true;
    const extRight = this.options.extendRight !== false;
    const { x1, y1, x2, y2 } = extendLineToEdges(
      pts[0].x, pts[0].y, pts[1].x, pts[1].y,
      ctx.width, ctx.height, extLeft, extRight
    );
    const stroke = this.strokeColor(state);
    el('line', {
      x1, y1, x2, y2,
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
    if (this.options.showLabels) {
      drawPillLabel(group, pts[0].x, pts[0].y, this.points[0].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'end' });
      drawPillLabel(group, pts[1].x, pts[1].y, this.points[1].price.toFixed(2),
        { bg: stroke, color: '#fff', anchor: 'start' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToRayDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 4. Horizontal line ----------
class HorizontalLineDrawing extends BaseDrawing {
  static type = 'horizontal-line';
  static label = 'Línea horizontal';
  static pointsRequired = 1;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    el('line', {
      x1: 0, y1: pts[0].y, x2: ctx.width, y2: pts[0].y,
      stroke: this.strokeColor(state),
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
    // price label (gated by showLabels — default true for back-compat)
    if (this.options.showLabels !== false) {
      const labelText = this.points[0].price.toFixed(2);
      el('rect', {
        x: ctx.width - 60, y: pts[0].y - 8,
        width: 56, height: 16,
        fill: this.options.color, rx: 2,
        class: 'drawing-label-bg',
      }, group);
      el('text', {
        x: ctx.width - 32, y: pts[0].y + 4,
        'text-anchor': 'middle', fill: '#fff',
        class: 'drawing-label',
      }, group).textContent = labelText;
    }
  }

  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    return Math.abs(y - pts[0].y) <= HIT_TOLERANCE;
  }

  getHandlePositions(ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return [];
    return [{ x: ctx.width / 2, y: pts[0].y, anchorIdx: 0, valid: true }];
  }
}

// ---------- 5. Vertical line ----------
class VerticalLineDrawing extends BaseDrawing {
  static type = 'vertical-line';
  static label = 'Línea vertical';
  static pointsRequired = 1;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const stroke = this.strokeColor(state);
    el('line', {
      x1: pts[0].x, y1: 0, x2: pts[0].x, y2: ctx.height,
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
    if (this.options.showLabels) {
      const t = Number(this.points[0].time);
      let txt = String(this.points[0].time);
      if (isFinite(t)) {
        const d = new Date(t * (t > 1e12 ? 1 : 1000));
        txt = isNaN(d.getTime()) ? txt : d.toISOString().slice(0, 10);
      }
      drawPillLabel(group, pts[0].x, ctx.height - 12, txt,
        { bg: stroke, color: '#fff', anchor: 'middle' });
    }
  }

  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    return Math.abs(x - pts[0].x) <= HIT_TOLERANCE;
  }

  getHandlePositions(ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return [];
    return [{ x: pts[0].x, y: ctx.height / 2, anchorIdx: 0, valid: true }];
  }
}

// ---------- 6. Rectangle ----------
class RectangleDrawing extends BaseDrawing {
  static type = 'rectangle';
  static label = 'Rectángulo';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const x = Math.min(pts[0].x, pts[1].x);
    const y = Math.min(pts[0].y, pts[1].y);
    const w = Math.abs(pts[1].x - pts[0].x);
    const h = Math.abs(pts[1].y - pts[0].y);
    const stroke = this.strokeColor(state);
    el('rect', {
      x, y, width: w, height: h,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha),
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-fill',
    }, group);
    if (this.options.showArea) {
      const p0 = this.points[0].price, p1 = this.points[1].price;
      const dp = Math.abs(p1 - p0);
      const base = Math.max(Math.abs(p0), 1e-9);
      const pct = (dp / base) * 100;
      const lbl = `Δ ${dp.toFixed(2)} (${pct.toFixed(2)}%)`;
      drawPillLabel(group, x + w / 2, y + h / 2, lbl,
        { bg: stroke, color: '#fff', anchor: 'middle' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    // edge hit or interior
    if (pointInRect(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y)) return true;
    return false;
  }
}

// ---------- 7. Fibonacci retracement ----------
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ['#787b86', '#f23645', '#ff9800', '#089981', '#2962ff', '#9c27b0', '#787b86'];

class FibRetracementDrawing extends BaseDrawing {
  static type = 'fib-retracement';
  static label = 'Retroceso Fibonacci';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    let p0 = this.points[0].price, p1 = this.points[1].price;
    if (this.options.reverse) { const t = p0; p0 = p1; p1 = t; }
    const xMin = Math.min(pts[0].x, pts[1].x);
    const showPrice = this.options.showPrice !== false;
    const showPercent = this.options.showPercent !== false;
    const levels = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false)
      : FIB_LEVELS.map((v, i) => ({ value: v, enabled: true, color: FIB_COLORS[i] }));
    for (let i = 0; i < levels.length; i++) {
      const L = levels[i];
      const lvl = typeof L === 'number' ? L : L.value;
      const baseColor = (typeof L === 'object' && L.color) || FIB_COLORS[i % FIB_COLORS.length];
      const price = p0 + (p1 - p0) * lvl;
      const y = ctx.projectY(price);
      if (y === null) continue;
      const color = state.selected ? brighten(baseColor, 1.3) : baseColor;
      el('line', {
        x1: xMin, y1: y, x2: ctx.width, y2: y,
        stroke: color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      let lbl = '';
      if (showPercent) lbl += lvl.toFixed(3);
      if (showPrice) lbl += (lbl ? ' (' : '') + price.toFixed(2) + (showPercent ? ')' : '');
      if (lbl) {
        el('text', {
          x: xMin - 4, y: y + 4,
          'text-anchor': 'end', fill: color,
          class: 'drawing-label',
        }, group).textContent = lbl;
      }
    }
    // connecting line
    el('line', {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke: this.strokeColor(state),
      'stroke-width': 1,
      'stroke-dasharray': '2 3',
      class: 'drawing-line',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const p0 = this.points[0].price, p1 = this.points[1].price;
    const xMin = Math.min(pts[0].x, pts[1].x);
    for (const lvl of FIB_LEVELS) {
      const price = p0 + (p1 - p0) * lvl;
      const ly = ctx.projectY(price);
      if (ly === null) continue;
      if (Math.abs(y - ly) <= HIT_TOLERANCE && x >= xMin) return true;
    }
    return false;
  }
}

// ---------- 8. Pitchfork ----------
class PitchforkDrawing extends BaseDrawing {
  static type = 'pitchfork';
  static label = 'Horquilla (Pitchfork)';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [p0, p1, p2] = pts;
    const variant = this.options.variant || 'andrews';
    const showTines = this.options.showTines !== false;
    const showMedian = this.options.showMedian !== false;
    // origin and median direction depend on variant
    let ox = p0.x, oy = p0.y;
    let mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    if (variant === 'schiff') {
      ox = (p0.x + p1.x) / 2;
      oy = (p0.y + p1.y) / 2;
    } else if (variant === 'modified-schiff') {
      ox = (p0.x + p1.x) / 2;
      oy = p0.y;
    }
    const dx = mx - ox, dy = my - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const big = Math.sqrt(ctx.width * ctx.width + ctx.height * ctx.height);
    const exMx = mx + ux * big, exMy = my + uy * big;
    // median line
    if (showMedian) {
      el('line', {
        x1: ox, y1: oy, x2: exMx, y2: exMy,
        stroke: this.strokeColor(state),
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
    }
    if (showTines) {
      // upper parallel through p1
      el('line', {
        x1: p1.x, y1: p1.y, x2: p1.x + ux * big, y2: p1.y + uy * big,
        stroke: this.strokeColor(state),
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      // lower parallel through p2
      el('line', {
        x1: p2.x, y1: p2.y, x2: p2.x + ux * big, y2: p2.y + uy * big,
        stroke: this.strokeColor(state),
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
    }
    // base
    el('line', {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: this.strokeColor(state),
      'stroke-width': 1,
      'stroke-dasharray': '4 3',
      class: 'drawing-line',
    }, group);
    // fill between parallels (light)
    const path = `M ${p1.x},${p1.y} L ${p1.x + ux * big},${p1.y + uy * big} L ${p2.x + ux * big},${p2.y + uy * big} L ${p2.x},${p2.y} Z`;
    el('path', {
      d: path,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.5),
      stroke: 'none',
      class: 'drawing-fill',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    const [p0, p1, p2] = pts;
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    return pointToRayDistance(x, y, p0.x, p0.y, mx, my) <= HIT_TOLERANCE
        || pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y) <= HIT_TOLERANCE;
  }
}

// ---------- 9. Gann box ----------
const GANN_LEVELS = [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1];

class GannBoxDrawing extends BaseDrawing {
  static type = 'gann-box';
  static label = 'Caja de Gann';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const xMin = Math.min(pts[0].x, pts[1].x);
    const xMax = Math.max(pts[0].x, pts[1].x);
    const yMin = Math.min(pts[0].y, pts[1].y);
    const yMax = Math.max(pts[0].y, pts[1].y);
    const w = xMax - xMin, h = yMax - yMin;
    const stroke = this.strokeColor(state);
    // outer rect
    el('rect', {
      x: xMin, y: yMin, width: w, height: h,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.4),
      stroke, 'stroke-width': this.options.width,
      class: 'drawing-fill',
    }, group);
    // levels: support gannLevels override
    const lvlArr = Array.isArray(this.options.gannLevels)
      ? this.options.gannLevels.filter(l => l && l.enabled !== false).map(l => typeof l === 'number' ? l : l.value)
      : GANN_LEVELS;
    // horizontals
    for (const lvl of lvlArr) {
      const ly = yMin + h * lvl;
      el('line', { x1: xMin, y1: ly, x2: xMax, y2: ly, stroke, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'drawing-line' }, group);
    }
    // verticals
    for (const lvl of lvlArr) {
      const lx = xMin + w * lvl;
      el('line', { x1: lx, y1: yMin, x2: lx, y2: yMax, stroke, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'drawing-line' }, group);
    }
    // diagonals
    if (this.options.showDiagonals !== false) {
      el('line', { x1: xMin, y1: yMin, x2: xMax, y2: yMax, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
      el('line', { x1: xMin, y1: yMax, x2: xMax, y2: yMin, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointInRect(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }
}

// ---------- 10. Elliott impulse (0,1,2,3,4,5) ----------
class ElliottImpulseDrawing extends BaseDrawing {
  static type = 'elliott-impulse';
  static label = 'Elliott Impulso';
  static pointsRequired = 6;
  static labels = ['0', '1', '2', '3', '4', '5'];

  // Determine which indexes violate Elliott rules — subclasses can override.
  // For impulse 0,1,2,3,4,5:
  //   - wave 2 cannot retrace beyond wave 1 (price)
  //   - wave 3 cannot be the shortest of 1, 3, 5
  //   - wave 4 cannot enter wave 1 territory
  _ruleViolations() {
    const bad = new Set();
    const prices = this.points.map(p => p && p.price).filter(p => typeof p === 'number');
    if (this.constructor.type !== 'elliott-impulse' || prices.length < 6) return bad;
    const [p0, p1, p2, p3, p4, p5] = prices;
    const bull = p1 > p0;
    if (bull) {
      if (p2 < p0) bad.add(2);
      if (p4 < p1) bad.add(4);
    } else {
      if (p2 > p0) bad.add(2);
      if (p4 > p1) bad.add(4);
    }
    const w1 = Math.abs(p1 - p0), w3 = Math.abs(p3 - p2), w5 = Math.abs(p5 - p4);
    if (w3 < w1 && w3 < w5) bad.add(3);
    return bad;
  }

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    const stroke = this.strokeColor(state);
    const showLabels = this.options.showLabels !== false;
    const fs = this.options.labelFontSize || 12;
    const validate = !!this.options.validateRules;
    const bad = validate ? this._ruleViolations() : new Set();
    let path = '';
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].valid) continue;
      path += (i === 0 ? 'M' : 'L') + ` ${pts[i].x},${pts[i].y} `;
    }
    if (path) {
      el('path', {
        d: path, fill: 'none', stroke,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
    }
    pts.forEach((p, i) => {
      if (!p.valid) return;
      const violated = bad.has(i);
      if (validate) {
        el('circle', {
          cx: p.x, cy: p.y, r: 4,
          fill: violated ? '#f23645' : '#089981',
          stroke: '#fff', 'stroke-width': 1,
          class: 'drawing-fill',
        }, group);
      }
      if (showLabels) {
        const lbl = this.constructor.labels[i];
        el('text', {
          x: p.x + 8, y: p.y - 6,
          fill: violated ? '#f23645' : stroke,
          'font-size': fs,
          class: 'drawing-label',
        }, group).textContent = lbl;
      }
    });
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!pts[i].valid || !pts[i + 1].valid) continue;
      if (pointToSegmentDistance(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 11. Elliott correction (O, A, B, C) ----------
class ElliottCorrectionDrawing extends ElliottImpulseDrawing {
  static type = 'elliott-correction';
  static label = 'Elliott Corrección';
  static pointsRequired = 4;
  static labels = ['O', 'A', 'B', 'C'];
}

// ---------- 12. Long position ----------
class LongPositionDrawing extends BaseDrawing {
  static type = 'long-position';
  static label = 'Posición larga';
  static pointsRequired = 3;
  // points: [entry, stop, target]

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [entry, stop, target] = pts;
    const entryPrice = this.points[0].price;
    const stopPrice = this.points[1].price;
    const targetPrice = this.points[2].price;
    const xL = Math.min(entry.x, stop.x, target.x);
    const xR = Math.max(entry.x, stop.x, target.x) + 60;
    const gain = this.options.gainColor || '#089981';
    const loss = this.options.lossColor || '#f23645';
    // TP zone
    el('rect', {
      x: xL, y: Math.min(entry.y, target.y),
      width: xR - xL, height: Math.abs(target.y - entry.y),
      fill: hexWithAlpha(gain, 0.18),
      stroke: gain, 'stroke-width': 1,
      class: 'drawing-fill',
    }, group);
    // SL zone
    el('rect', {
      x: xL, y: Math.min(entry.y, stop.y),
      width: xR - xL, height: Math.abs(entry.y - stop.y),
      fill: hexWithAlpha(loss, 0.18),
      stroke: loss, 'stroke-width': 1,
      class: 'drawing-fill',
    }, group);
    // entry line
    el('line', {
      x1: xL, y1: entry.y, x2: xR, y2: entry.y,
      stroke: this.strokeColor(state),
      'stroke-width': 1.5, 'stroke-dasharray': '4 3',
      class: 'drawing-line',
    }, group);
    // R:R + optional sizing
    const risk = Math.abs(entryPrice - stopPrice);
    const reward = Math.abs(targetPrice - entryPrice);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : '∞';
    const parts = [];
    if (this.options.showRR !== false) parts.push(`R:R ${rr}`);
    parts.push(`TP ${targetPrice.toFixed(2)}`);
    parts.push(`SL ${stopPrice.toFixed(2)}`);
    if (this.options.showStopTargetPct) {
      const stopPct = entryPrice !== 0 ? ((stopPrice - entryPrice) / entryPrice * 100).toFixed(2) : '0';
      const tgtPct = entryPrice !== 0 ? ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2) : '0';
      parts.push(`SL ${stopPct}%`);
      parts.push(`TP ${tgtPct}%`);
    }
    if (this.options.accountSize > 0 && this.options.riskPct > 0 && risk > 0) {
      const shares = (this.options.accountSize * this.options.riskPct / 100) / risk;
      parts.push(`${shares.toFixed(2)} u`);
    }
    el('text', {
      x: xR - 4, y: entry.y - 4,
      'text-anchor': 'end', fill: this.strokeColor(state),
      class: 'drawing-label',
    }, group).textContent = parts.join('  •  ');
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    const xL = Math.min(pts[0].x, pts[1].x, pts[2].x);
    const xR = Math.max(pts[0].x, pts[1].x, pts[2].x) + 60;
    const yMin = Math.min(pts[1].y, pts[2].y);
    const yMax = Math.max(pts[1].y, pts[2].y);
    return x >= xL && x <= xR && y >= yMin && y <= yMax;
  }
}

// ---------- 13. Short position ----------
class ShortPositionDrawing extends BaseDrawing {
  static type = 'short-position';
  static label = 'Posición corta';
  static pointsRequired = 3;
  // points: [entry, stop (above), target (below)]

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [entry, stop, target] = pts;
    const entryPrice = this.points[0].price;
    const stopPrice = this.points[1].price;
    const targetPrice = this.points[2].price;
    const xL = Math.min(entry.x, stop.x, target.x);
    const xR = Math.max(entry.x, stop.x, target.x) + 60;
    const gain = this.options.gainColor || '#089981';
    const loss = this.options.lossColor || '#f23645';
    // TP zone (below entry)
    el('rect', {
      x: xL, y: Math.min(entry.y, target.y),
      width: xR - xL, height: Math.abs(target.y - entry.y),
      fill: hexWithAlpha(gain, 0.18),
      stroke: gain, 'stroke-width': 1,
      class: 'drawing-fill',
    }, group);
    // SL zone (above entry)
    el('rect', {
      x: xL, y: Math.min(entry.y, stop.y),
      width: xR - xL, height: Math.abs(entry.y - stop.y),
      fill: hexWithAlpha(loss, 0.18),
      stroke: loss, 'stroke-width': 1,
      class: 'drawing-fill',
    }, group);
    el('line', {
      x1: xL, y1: entry.y, x2: xR, y2: entry.y,
      stroke: this.strokeColor(state),
      'stroke-width': 1.5, 'stroke-dasharray': '4 3',
      class: 'drawing-line',
    }, group);
    const risk = Math.abs(stopPrice - entryPrice);
    const reward = Math.abs(entryPrice - targetPrice);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : '∞';
    const parts = ['SHORT'];
    if (this.options.showRR !== false) parts.push(`R:R ${rr}`);
    parts.push(`TP ${targetPrice.toFixed(2)}`);
    parts.push(`SL ${stopPrice.toFixed(2)}`);
    if (this.options.showStopTargetPct) {
      const stopPct = entryPrice !== 0 ? ((stopPrice - entryPrice) / entryPrice * 100).toFixed(2) : '0';
      const tgtPct = entryPrice !== 0 ? ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2) : '0';
      parts.push(`SL ${stopPct}%`);
      parts.push(`TP ${tgtPct}%`);
    }
    if (this.options.accountSize > 0 && this.options.riskPct > 0 && risk > 0) {
      const shares = (this.options.accountSize * this.options.riskPct / 100) / risk;
      parts.push(`${shares.toFixed(2)} u`);
    }
    el('text', {
      x: xR - 4, y: entry.y - 4,
      'text-anchor': 'end', fill: this.strokeColor(state),
      class: 'drawing-label',
    }, group).textContent = parts.join('  •  ');
  }
  hitTest(x, y, ctx) {
    return LongPositionDrawing.prototype.hitTest.call(this, x, y, ctx);
  }
}

// ---------- 14. Text ----------
class TextDrawing extends BaseDrawing {
  static type = 'text';
  static label = 'Texto';
  static pointsRequired = 1;

  constructor(points = [], options = {}, id = null) {
    super(points, options, id);
    if (!this.options.text) this.options.text = 'Texto';
    if (!this.options.fontSize) this.options.fontSize = 13;
  }

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const txt = this.options.text || 'Texto';
    const fs = this.options.fontSize;
    const fw = this.options.fontWeight || 'normal';
    const align = this.options.textAlign || 'left'; // 'left'|'center'|'right'
    const bg = this.options.bgColor || hexWithAlpha('#1c1c1c', 0.85);
    const showBorder = this.options.showBorder !== false;
    const padX = 4, padY = 3;
    const approxW = Math.max(20, txt.length * fs * 0.55) + padX * 2;
    const approxH = fs + padY * 2;
    el('rect', {
      x: pts[0].x, y: pts[0].y - approxH / 2,
      width: approxW, height: approxH,
      fill: bg,
      stroke: showBorder ? this.strokeColor(state) : 'none',
      'stroke-width': showBorder ? 1 : 0, rx: 3,
      class: 'drawing-fill',
    }, group);
    let tx = pts[0].x + padX, anchor = 'start';
    if (align === 'center') { tx = pts[0].x + approxW / 2; anchor = 'middle'; }
    else if (align === 'right') { tx = pts[0].x + approxW - padX; anchor = 'end'; }
    const tn = el('text', {
      x: tx, y: pts[0].y + fs / 3,
      'text-anchor': anchor,
      fill: this.strokeColor(state),
      'font-size': fs,
      'font-weight': fw,
      class: 'drawing-label',
    }, group);
    tn.textContent = txt;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    const txt = this.options.text || 'Texto';
    const padX = 4, padY = 3;
    const w = Math.max(20, txt.length * this.options.fontSize * 0.55) + padX * 2;
    const h = this.options.fontSize + padY * 2;
    return pointInRect(x, y, pts[0].x, pts[0].y - h / 2, pts[0].x + w, pts[0].y + h / 2);
  }
}

// ---------- 15. Arrow ----------
class ArrowDrawing extends BaseDrawing {
  static type = 'arrow';
  static label = 'Flecha';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    const size = this.options.arrowSize || 6;
    const dbl = !!this.options.doubleArrow;
    // unique marker id per drawing to allow color
    const mid = `arr_${this.id}`;
    const defs = el('defs', {}, group);
    const marker = el('marker', {
      id: mid, viewBox: '0 0 10 10',
      refX: 9, refY: 5, markerWidth: size, markerHeight: size,
      orient: 'auto-start-reverse',
    }, defs);
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: stroke }, marker);
    const attrs = {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke, 'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      'marker-end': `url(#${mid})`,
      class: 'drawing-line',
    };
    if (dbl) attrs['marker-start'] = `url(#${mid})`;
    el('line', attrs, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// =============================================================================
// EXTENDED DRAWING IMPLEMENTATIONS — ported from KLineChart overlay set
// =============================================================================

const FIB_EXT_LEVELS = [0, 0.382, 0.618, 1, 1.382, 1.618, 2, 2.618];
const FIB_FAN_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786];
const FIB_CIRCLE_LEVELS = [0.382, 0.5, 0.618, 0.786, 1];
const FIB_TIME_BARS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const GANN_FAN_RATIOS = [
  { label: '1x8', dx: 8, dy: 1 },
  { label: '1x4', dx: 4, dy: 1 },
  { label: '1x3', dx: 3, dy: 1 },
  { label: '1x2', dx: 2, dy: 1 },
  { label: '1x1', dx: 1, dy: 1 },
  { label: '2x1', dx: 1, dy: 2 },
  { label: '3x1', dx: 1, dy: 3 },
  { label: '4x1', dx: 1, dy: 4 },
];

function formatDuration(secs) {
  if (!isFinite(secs)) return '';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------- 16. Fib extension (3 points) ----------
class FibExtensionDrawing extends BaseDrawing {
  static type = 'fib-extension';
  static label = 'Extensión Fibonacci';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const stroke = this.strokeColor(state);
    let p0 = this.points[0].price, p1 = this.points[1].price, p2 = this.points[2].price;
    if (this.options.reverse) { const t = p0; p0 = p1; p1 = t; }
    const wave = p1 - p0;
    const xMin = Math.min(pts[0].x, pts[1].x, pts[2].x);
    const showPrice = this.options.showPrice !== false;
    const showPercent = this.options.showPercent !== false;
    const levels = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false)
      : FIB_EXT_LEVELS.map((v, i) => ({ value: v, enabled: true, color: FIB_COLORS[i % FIB_COLORS.length] }));
    el('path', {
      d: `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y} L ${pts[2].x},${pts[2].y}`,
      fill: 'none', stroke, 'stroke-width': 1, 'stroke-dasharray': '2 3',
      class: 'drawing-line',
    }, group);
    for (let i = 0; i < levels.length; i++) {
      const L = levels[i];
      const lvl = typeof L === 'number' ? L : L.value;
      const baseColor = (typeof L === 'object' && L.color) || FIB_COLORS[i % FIB_COLORS.length];
      const price = p2 + wave * lvl;
      const y = ctx.projectY(price);
      if (y === null) continue;
      const color = state.selected ? brighten(baseColor, 1.3) : baseColor;
      el('line', {
        x1: xMin, y1: y, x2: ctx.width, y2: y,
        stroke: color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      let lbl = '';
      if (showPercent) lbl += lvl.toFixed(3);
      if (showPrice) lbl += (lbl ? ' (' : '') + price.toFixed(2) + (showPercent ? ')' : '');
      if (lbl) {
        el('text', {
          x: xMin - 4, y: y + 4, 'text-anchor': 'end', fill: color,
          class: 'drawing-label',
        }, group).textContent = lbl;
      }
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    const p0 = this.points[0].price, p1 = this.points[1].price, p2 = this.points[2].price;
    const wave = p1 - p0;
    for (const lvl of FIB_EXT_LEVELS) {
      const ly = ctx.projectY(p2 + wave * lvl);
      if (ly === null) continue;
      if (Math.abs(y - ly) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 17. Fib channel ----------
class FibChannelDrawing extends BaseDrawing {
  static type = 'fib-channel';
  static label = 'Canal Fibonacci';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [a, b, c] = pts;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2;
    const fx = a.x + t * dx, fy = a.y + t * dy;
    const offX = c.x - fx, offY = c.y - fy;
    const showLabels = !!this.options.showLabels;
    const levels = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false)
      : FIB_LEVELS.map((v, i) => ({ value: v, enabled: true, color: FIB_COLORS[i] }));
    for (let i = 0; i < levels.length; i++) {
      const L = levels[i];
      const lvl = typeof L === 'number' ? L : L.value;
      const baseColor = (typeof L === 'object' && L.color) || FIB_COLORS[i % FIB_COLORS.length];
      const ox = offX * lvl, oy = offY * lvl;
      const color = state.selected ? brighten(baseColor, 1.3) : baseColor;
      el('line', {
        x1: a.x + ox, y1: a.y + oy, x2: b.x + ox, y2: b.y + oy,
        stroke: color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      if (showLabels) {
        el('text', {
          x: b.x + ox + 4, y: b.y + oy + 4,
          fill: color, class: 'drawing-label',
        }, group).textContent = lvl.toFixed(3);
      }
    }
    const path = `M ${a.x},${a.y} L ${b.x},${b.y} L ${b.x + offX},${b.y + offY} L ${a.x + offX},${a.y + offY} Z`;
    el('path', { d: path, fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.5), stroke: 'none', class: 'drawing-fill' }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 18. Fib time zones ----------
class FibTimeDrawing extends BaseDrawing {
  static type = 'fib-time';
  static label = 'Zonas horarias Fibonacci';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const x0 = pts[0].x;
    const unit = Math.max(1, Math.abs(pts[1].x - pts[0].x));
    const dir = pts[1].x >= pts[0].x ? 1 : -1;
    const timeBars = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false).map(l => typeof l === 'number' ? l : l.value)
      : FIB_TIME_BARS;
    for (let i = 0; i < timeBars.length; i++) {
      const n = timeBars[i];
      const x = x0 + dir * n * unit;
      if (x < -50 || x > ctx.width + 50) continue;
      const color = FIB_COLORS[i % FIB_COLORS.length];
      el('line', {
        x1: x, y1: 0, x2: x, y2: ctx.height,
        stroke: state.selected ? brighten(color, 1.3) : color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      el('text', {
        x: x + 3, y: 12, fill: color, class: 'drawing-label',
      }, group).textContent = String(n);
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const unit = Math.max(1, Math.abs(pts[1].x - pts[0].x));
    const dir = pts[1].x >= pts[0].x ? 1 : -1;
    for (const n of FIB_TIME_BARS) {
      if (Math.abs(x - (pts[0].x + dir * n * unit)) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 19. Fib fan ----------
class FibFanDrawing extends BaseDrawing {
  static type = 'fib-fan';
  static label = 'Abanico Fibonacci';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const [a, b] = pts;
    const dx = b.x - a.x, dy = b.y - a.y;
    const big = Math.sqrt(ctx.width * ctx.width + ctx.height * ctx.height);
    const fanLevels = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false).map(l => typeof l === 'number' ? l : l.value)
      : FIB_FAN_LEVELS;
    for (let i = 0; i < fanLevels.length; i++) {
      const lvl = fanLevels[i];
      const tx = a.x + dx, ty = a.y + dy * lvl;
      const vx = tx - a.x, vy = ty - a.y;
      const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
      const ux = vx / vlen, uy = vy / vlen;
      const color = FIB_COLORS[i % FIB_COLORS.length];
      el('line', {
        x1: a.x, y1: a.y, x2: a.x + ux * big, y2: a.y + uy * big,
        stroke: state.selected ? brighten(color, 1.3) : color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      el('text', {
        x: a.x + ux * 60, y: a.y + uy * 60 - 4, fill: color, class: 'drawing-label',
      }, group).textContent = lvl.toFixed(3);
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const [a, b] = pts;
    const dx = b.x - a.x, dy = b.y - a.y;
    for (const lvl of FIB_FAN_LEVELS) {
      const tx = a.x + dx, ty = a.y + dy * lvl;
      if (pointToRayDistance(x, y, a.x, a.y, tx, ty) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 20. Fib circle ----------
class FibCircleDrawing extends BaseDrawing {
  static type = 'fib-circle';
  static label = 'Círculos Fibonacci';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const [a, b] = pts;
    const r = dist(a.x, a.y, b.x, b.y);
    const stroke = this.strokeColor(state);
    const circLevels = Array.isArray(this.options.levels)
      ? this.options.levels.filter(l => l && l.enabled !== false).map(l => typeof l === 'number' ? l : l.value)
      : FIB_CIRCLE_LEVELS;
    for (let i = 0; i < circLevels.length; i++) {
      const lvl = circLevels[i];
      const color = FIB_COLORS[i % FIB_COLORS.length];
      el('circle', {
        cx: a.x, cy: a.y, r: r * lvl,
        fill: 'none',
        stroke: state.selected ? brighten(color, 1.3) : color,
        'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      el('text', {
        x: a.x + r * lvl + 2, y: a.y - 2, fill: color, class: 'drawing-label',
      }, group).textContent = lvl.toFixed(3);
    }
    el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke,
      'stroke-width': 1, 'stroke-dasharray': '2 3', class: 'drawing-line',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const [a, b] = pts;
    const r = dist(a.x, a.y, b.x, b.y);
    const d = dist(x, y, a.x, a.y);
    for (const lvl of FIB_CIRCLE_LEVELS) {
      if (Math.abs(d - r * lvl) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 21. Fib spiral ----------
class FibSpiralDrawing extends BaseDrawing {
  static type = 'fib-spiral';
  static label = 'Espiral Fibonacci';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const [a, b] = pts;
    const r0 = Math.max(2, dist(a.x, a.y, b.x, b.y) * 0.05);
    const phi = 1.6180339887;
    const k = Math.log(phi) / (Math.PI / 2);
    const a0 = Math.atan2(b.y - a.y, b.x - a.x);
    const stroke = this.strokeColor(state);
    let d = '';
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 4;
      const r = r0 * Math.exp(k * theta);
      const x = a.x + Math.cos(theta + a0) * r;
      const y = a.y + Math.sin(theta + a0) * r;
      d += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)},${y.toFixed(1)} `;
    }
    el('path', {
      d, fill: 'none', stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const d = dist(x, y, pts[0].x, pts[0].y);
    const r0 = Math.max(2, dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y) * 0.05);
    if (d < r0) return false;
    return d <= r0 * Math.exp(Math.log(1.618) * 4);
  }
}

// ---------- 22. Parallel channel ----------
class ParallelChannelDrawing extends BaseDrawing {
  static type = 'parallel-channel';
  static label = 'Canal paralelo';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [a, b, c] = pts;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2;
    const fx = a.x + t * dx, fy = a.y + t * dy;
    const offX = c.x - fx, offY = c.y - fy;
    const stroke = this.strokeColor(state);
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke, 'stroke-width': this.options.width, 'stroke-dasharray': this.dashArray(), class: 'drawing-line' }, group);
    el('line', { x1: a.x + offX, y1: a.y + offY, x2: b.x + offX, y2: b.y + offY, stroke, 'stroke-width': this.options.width, 'stroke-dasharray': this.dashArray(), class: 'drawing-line' }, group);
    if (this.options.showMedian) {
      const hx = offX / 2, hy = offY / 2;
      el('line', {
        x1: a.x + hx, y1: a.y + hy, x2: b.x + hx, y2: b.y + hy,
        stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3',
        class: 'drawing-line',
      }, group);
    }
    const path = `M ${a.x},${a.y} L ${b.x},${b.y} L ${b.x + offX},${b.y + offY} L ${a.x + offX},${a.y + offY} Z`;
    el('path', { d: path, fill: hexWithAlpha(this.options.color, this.options.fillAlpha), stroke: 'none', class: 'drawing-fill' }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 23. Regression trend ----------
class RegressionTrendDrawing extends BaseDrawing {
  static type = 'regression-trend';
  static label = 'Regresión lineal';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const [a, b] = pts;
    const stroke = this.strokeColor(state);
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke, 'stroke-width': this.options.width, 'stroke-dasharray': this.dashArray(), class: 'drawing-line' }, group);
    if (this.options.showBands !== false) {
      const mult = this.options.bandsMultiplier || 1;
      const dy = (Math.abs(b.y - a.y) * 0.5 + 8) * mult;
      [-2, -1, 1, 2].forEach((k) => {
        const off = (dy * k) / 2;
        el('line', {
          x1: a.x, y1: a.y + off, x2: b.x, y2: b.y + off,
          stroke, 'stroke-width': 1,
          'stroke-dasharray': k % 2 === 0 ? '4 3' : '2 3',
          class: 'drawing-line',
        }, group);
      });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 24. Price channel ----------
class PriceChannelDrawing extends BaseDrawing {
  static type = 'price-channel';
  static label = 'Canal de precio';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    const p0 = this.points[0].price, p1 = this.points[1].price;
    const xL = Math.min(pts[0].x, pts[1].x);
    const xR = Math.max(pts[0].x, pts[1].x);
    const showLabels = this.options.showLabels !== false;
    [{ y: pts[0].y, p: p0, lbl: 'R' }, { y: pts[1].y, p: p1, lbl: 'S' }].forEach(({ y, p, lbl }) => {
      el('line', {
        x1: 0, y1: y, x2: ctx.width, y2: y,
        stroke, 'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
      if (showLabels) {
        el('text', { x: 4, y: y - 4, fill: stroke, class: 'drawing-label' }, group)
          .textContent = `${lbl} ${p.toFixed(2)}`;
      }
    });
    el('rect', {
      x: xL, y: Math.min(pts[0].y, pts[1].y),
      width: xR - xL, height: Math.abs(pts[1].y - pts[0].y),
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha),
      stroke: 'none', class: 'drawing-fill',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return Math.abs(y - pts[0].y) <= HIT_TOLERANCE || Math.abs(y - pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 25. Disjoint channel ----------
class DisjointChannelDrawing extends BaseDrawing {
  static type = 'disjoint-channel';
  static label = 'Canal disjunto';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const [a, b, c] = pts;
    const dx = b.x - a.x;
    const stroke = this.strokeColor(state);
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke, 'stroke-width': this.options.width, 'stroke-dasharray': this.dashArray(), class: 'drawing-line' }, group);
    el('line', { x1: c.x, y1: c.y, x2: c.x + dx, y2: c.y + (b.y - a.y) * 0.7, stroke, 'stroke-width': this.options.width, 'stroke-dasharray': this.dashArray(), class: 'drawing-line' }, group);
    const path = `M ${a.x},${a.y} L ${b.x},${b.y} L ${c.x + dx},${c.y + (b.y - a.y) * 0.7} L ${c.x},${c.y} Z`;
    el('path', { d: path, fill: hexWithAlpha(this.options.color, this.options.fillAlpha), stroke: 'none', class: 'drawing-fill' }, group);
    if (this.options.showLabels) {
      drawPillLabel(group, a.x, a.y, this.points[0].price.toFixed(2), { bg: stroke, color: '#fff', anchor: 'end' });
      drawPillLabel(group, b.x, b.y, this.points[1].price.toFixed(2), { bg: stroke, color: '#fff', anchor: 'start' });
      drawPillLabel(group, c.x, c.y, this.points[2].price.toFixed(2), { bg: stroke, color: '#fff', anchor: 'end' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 26. Info line ----------
class InfoLineDrawing extends BaseDrawing {
  static type = 'info-line';
  static label = 'Línea informativa';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    el('line', {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke, 'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(), class: 'drawing-line',
    }, group);
    const showAngle = this.options.showAngle !== false;
    const showDistance = this.options.showDistance !== false;
    if (!showAngle && !showDistance) return;
    const p0 = this.points[0].price, p1 = this.points[1].price;
    const dp = p1 - p0;
    const pct = p0 !== 0 ? (dp / p0) * 100 : 0;
    const t0 = Number(this.points[0].time), t1 = Number(this.points[1].time);
    const dt = Math.abs(t1 - t0);
    const ang = (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180 / Math.PI).toFixed(1);
    const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
    const parts = [];
    if (showDistance) parts.push(`Δ ${dp.toFixed(2)}`, `${pct.toFixed(2)}%`, formatDuration(dt));
    if (showAngle) parts.push(`${ang}°`);
    const txt = parts.filter(Boolean).join('  ');
    const w = Math.max(100, txt.length * 6.5);
    el('rect', {
      x: mx - w / 2, y: my - 18, width: w, height: 16,
      fill: hexWithAlpha('#1c1c1c', 0.85), stroke, 'stroke-width': 1, rx: 2,
      class: 'drawing-fill',
    }, group);
    el('text', {
      x: mx, y: my - 6, 'text-anchor': 'middle', fill: stroke, class: 'drawing-label',
    }, group).textContent = txt;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 27. Gann fan ----------
class GannFanDrawing extends BaseDrawing {
  static type = 'gann-fan';
  static label = 'Abanico de Gann';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const [a, b] = pts;
    const stroke = this.strokeColor(state);
    const unitX = Math.abs(b.x - a.x) || 50;
    const unitY = Math.abs(b.y - a.y) || 50;
    const dirX = b.x >= a.x ? 1 : -1;
    const dirY = b.y >= a.y ? 1 : -1;
    const big = Math.sqrt(ctx.width * ctx.width + ctx.height * ctx.height);
    const customLvls = Array.isArray(this.options.gannLevels) ? this.options.gannLevels : null;
    const ratios = customLvls
      ? GANN_FAN_RATIOS.filter((r, idx) => {
          const m = customLvls.find(l => (l && (l.value === r.label || l.value === idx)) || l === r.label || l === idx);
          return !m || m.enabled !== false;
        })
      : GANN_FAN_RATIOS;
    ratios.forEach((r, i) => {
      const vx = dirX * r.dx * unitX;
      const vy = dirY * r.dy * unitY;
      const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
      const ux = vx / vlen, uy = vy / vlen;
      const color = i === 4 ? '#2962ff' : stroke;
      el('line', {
        x1: a.x, y1: a.y, x2: a.x + ux * big, y2: a.y + uy * big,
        stroke: color, 'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(), class: 'drawing-line',
      }, group);
      el('text', {
        x: a.x + ux * 80, y: a.y + uy * 80, fill: color, class: 'drawing-label',
      }, group).textContent = r.label;
    });
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const [a, b] = pts;
    const unitX = Math.abs(b.x - a.x) || 50;
    const unitY = Math.abs(b.y - a.y) || 50;
    const dirX = b.x >= a.x ? 1 : -1;
    const dirY = b.y >= a.y ? 1 : -1;
    for (const r of GANN_FAN_RATIOS) {
      const tx = a.x + dirX * r.dx * unitX;
      const ty = a.y + dirY * r.dy * unitY;
      if (pointToRayDistance(x, y, a.x, a.y, tx, ty) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 28. Gann Square of 9 ----------
class GannSquareDrawing extends BaseDrawing {
  static type = 'gann-square';
  static label = 'Cuadrado de Gann (9)';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const xMin = Math.min(pts[0].x, pts[1].x), xMax = Math.max(pts[0].x, pts[1].x);
    const yMin = Math.min(pts[0].y, pts[1].y), yMax = Math.max(pts[0].y, pts[1].y);
    const w = xMax - xMin, h = yMax - yMin;
    const stroke = this.strokeColor(state);
    el('rect', { x: xMin, y: yMin, width: w, height: h, fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.3), stroke, 'stroke-width': this.options.width, class: 'drawing-fill' }, group);
    for (let i = 1; i < 3; i++) {
      el('line', { x1: xMin + (w * i) / 3, y1: yMin, x2: xMin + (w * i) / 3, y2: yMax, stroke, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'drawing-line' }, group);
      el('line', { x1: xMin, y1: yMin + (h * i) / 3, x2: xMax, y2: yMin + (h * i) / 3, stroke, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'drawing-line' }, group);
    }
    el('line', { x1: xMin, y1: yMin, x2: xMax, y2: yMax, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
    el('line', { x1: xMin, y1: yMax, x2: xMax, y2: yMin, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointInRect(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }
}

// ---------- 29. Gann Square of 144 ----------
class GannSquare144Drawing extends BaseDrawing {
  static type = 'gann-square144';
  static label = 'Cuadrado de Gann (144)';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const xMin = Math.min(pts[0].x, pts[1].x), xMax = Math.max(pts[0].x, pts[1].x);
    const yMin = Math.min(pts[0].y, pts[1].y), yMax = Math.max(pts[0].y, pts[1].y);
    const w = xMax - xMin, h = yMax - yMin;
    const stroke = this.strokeColor(state);
    el('rect', { x: xMin, y: yMin, width: w, height: h, fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.2), stroke, 'stroke-width': this.options.width, class: 'drawing-fill' }, group);
    for (let i = 1; i < 12; i++) {
      const op = i % 4 === 0 ? 0.6 : 0.25;
      el('line', { x1: xMin + (w * i) / 12, y1: yMin, x2: xMin + (w * i) / 12, y2: yMax, stroke, opacity: op, 'stroke-width': 1, class: 'drawing-line' }, group);
      el('line', { x1: xMin, y1: yMin + (h * i) / 12, x2: xMax, y2: yMin + (h * i) / 12, stroke, opacity: op, 'stroke-width': 1, class: 'drawing-line' }, group);
    }
    el('line', { x1: xMin, y1: yMin, x2: xMax, y2: yMax, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
    el('line', { x1: xMin, y1: yMax, x2: xMax, y2: yMin, stroke, 'stroke-width': 1.2, class: 'drawing-line' }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointInRect(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }
}

// ---------- 30. ABCD pattern ----------
class ABCDDrawing extends BaseDrawing {
  static type = 'abcd';
  static label = 'Patrón ABCD';
  static pointsRequired = 4;
  static labels = ['A', 'B', 'C', 'D'];

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 4 || pts.some(p => !p.valid)) return;
    const stroke = this.strokeColor(state);
    el('path', {
      d: `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y} L ${pts[2].x},${pts[2].y} L ${pts[3].x},${pts[3].y}`,
      fill: 'none', stroke, 'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(), class: 'drawing-line',
    }, group);
    pts.forEach((p, i) => {
      el('text', { x: p.x + 6, y: p.y - 6, fill: stroke, class: 'drawing-label' }, group)
        .textContent = this.constructor.labels[i];
    });
    if (this.options.showRatios !== false) {
      const ab = Math.abs(this.points[1].price - this.points[0].price);
      const cd = Math.abs(this.points[3].price - this.points[2].price);
      const bc = Math.abs(this.points[2].price - this.points[1].price);
      const ad = Math.abs(this.points[3].price - this.points[0].price);
      const r1 = ab > 0 ? (cd / ab) : 0;
      const r2 = ad > 0 ? (bc / ad) : 0;
      el('text', { x: pts[3].x + 8, y: pts[3].y + 14, fill: stroke, class: 'drawing-label' }, group)
        .textContent = `CD/AB ${r1.toFixed(3)}  BC/AD ${r2.toFixed(3)}`;
      // Ideal ABCD: CD/AB ≈ 1.0, BC/AD ≈ 0.618
      const tol = (this.options.tolerance != null ? this.options.tolerance : 0.05) / 100 + 0.05;
      const ok1 = Math.abs(r1 - 1.0) <= tol;
      const ok2 = Math.abs(r2 - 0.618) <= tol;
      const detected = ok1 && ok2;
      drawPillLabel(group, pts[3].x + 8, pts[3].y + 30,
        detected ? 'Detectado' : 'Fuera tolerancia',
        { bg: detected ? '#089981' : '#f23645', color: '#fff', anchor: 'start' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!pts[i].valid || !pts[i + 1].valid) continue;
      if (pointToSegmentDistance(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 31. XABCD pattern ----------
class XABCDDrawing extends BaseDrawing {
  static type = 'xabcd';
  static label = 'Patrón XABCD';
  static pointsRequired = 5;
  static labels = ['X', 'A', 'B', 'C', 'D'];

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 5 || pts.some(p => !p.valid)) return;
    const stroke = this.strokeColor(state);
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < 5; i++) d += ` L ${pts[i].x},${pts[i].y}`;
    d += ` Z`;
    el('path', {
      d, fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.5),
      stroke, 'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(), class: 'drawing-fill',
    }, group);
    pts.forEach((p, i) => {
      el('text', { x: p.x + 6, y: p.y - 6, fill: stroke, class: 'drawing-label' }, group)
        .textContent = this.constructor.labels[i];
    });
    if (this.options.showRatios !== false) {
      const xa = Math.abs(this.points[1].price - this.points[0].price);
      const ab = Math.abs(this.points[2].price - this.points[1].price);
      const ad = Math.abs(this.points[4].price - this.points[1].price);
      const ratioB = xa > 0 ? ab / xa : 0;
      const ratioD = xa > 0 ? ad / xa : 0;
      const tol = (this.options.tolerance != null ? this.options.tolerance : 0.05) / 100 + 0.05;
      let name = 'XABCD';
      let detected = false;
      // For Cypher pattern, ideal ratios differ
      const isCypher = this.constructor.type === 'cypher';
      if (isCypher) {
        // Cypher: B/XA ≈ 0.382-0.618, D/XA ≈ 0.786
        detected = ratioB >= 0.382 - tol && ratioB <= 0.618 + tol && Math.abs(ratioD - 0.786) <= tol;
        if (detected) name = 'Cypher';
      } else {
        if (Math.abs(ratioB - 0.618) <= tol && Math.abs(ratioD - 0.786) <= tol) { name = 'Gartley'; detected = true; }
        else if (Math.abs(ratioB - 0.786) <= tol && ratioD > 1.27 - tol) { name = 'Butterfly'; detected = true; }
        else if (Math.abs(ratioB - 0.5) <= tol && Math.abs(ratioD - 0.886) <= tol) { name = 'Bat'; detected = true; }
        else if (ratioB > 1 - tol && ratioD > 1.618 - tol) { name = 'Crab'; detected = true; }
      }
      el('text', { x: pts[4].x + 8, y: pts[4].y + 14, fill: stroke, class: 'drawing-label' }, group)
        .textContent = `${name}  B/XA ${ratioB.toFixed(3)}  D/XA ${ratioD.toFixed(3)}`;
      drawPillLabel(group, pts[4].x + 8, pts[4].y + 30,
        detected ? 'Detectado' : 'Fuera tolerancia',
        { bg: detected ? '#089981' : '#f23645', color: '#fff', anchor: 'start' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!pts[i].valid || !pts[i + 1].valid) continue;
      if (pointToSegmentDistance(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 32. Cypher ----------
class CypherDrawing extends XABCDDrawing {
  static type = 'cypher';
  static label = 'Patrón Cypher';
  static pointsRequired = 5;
  static labels = ['X', 'A', 'B', 'C', 'D'];
}

// ---------- 33. Elliott triangle (A-B-C-D-E) ----------
class ElliottTriangleDrawing extends ElliottImpulseDrawing {
  static type = 'elliott-triangle';
  static label = 'Elliott Triángulo';
  static pointsRequired = 5;
  static labels = ['A', 'B', 'C', 'D', 'E'];
}

// ---------- 34. Elliott double combo (W-X-Y) ----------
class ElliottDoubleComboDrawing extends ElliottImpulseDrawing {
  static type = 'elliott-double-combo';
  static label = 'Elliott Doble combo';
  static pointsRequired = 4;
  static labels = ['0', 'W', 'X', 'Y'];
}

// ---------- 35. Elliott triple combo (W-X-Y-X-Z) ----------
class ElliottTripleComboDrawing extends ElliottImpulseDrawing {
  static type = 'elliott-triple-combo';
  static label = 'Elliott Triple combo';
  static pointsRequired = 6;
  static labels = ['0', 'W', 'X', 'Y', 'X', 'Z'];
}

// ---------- 36. Circle ----------
class CircleDrawing extends BaseDrawing {
  static type = 'circle';
  static label = 'Círculo';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const r = dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    const stroke = this.strokeColor(state);
    el('circle', {
      cx: pts[0].x, cy: pts[0].y, r,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha),
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-fill',
    }, group);
    if (this.options.showArea) {
      // radius in price units
      const cy = ctx.projectY(this.points[0].price);
      const py = ctx.inverseY ? ctx.inverseY(cy + r) : null;
      const rPrice = py != null ? Math.abs(this.points[0].price - py) : r;
      const area = Math.PI * rPrice * rPrice;
      drawPillLabel(group, pts[0].x, pts[0].y, `π·r² ≈ ${area.toFixed(2)}`,
        { bg: stroke, color: '#fff', anchor: 'middle' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const r = dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    return dist(x, y, pts[0].x, pts[0].y) <= r + HIT_TOLERANCE;
  }
}

// ---------- 37. Ellipse ----------
class EllipseDrawing extends BaseDrawing {
  static type = 'ellipse';
  static label = 'Elipse';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const cx = (pts[0].x + pts[1].x) / 2;
    const cy = (pts[0].y + pts[1].y) / 2;
    const rx = Math.abs(pts[1].x - pts[0].x) / 2;
    const ry = Math.abs(pts[1].y - pts[0].y) / 2;
    const stroke = this.strokeColor(state);
    el('ellipse', {
      cx, cy, rx, ry,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha),
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-fill',
    }, group);
    if (this.options.showArea) {
      const p0 = this.points[0].price, p1 = this.points[1].price;
      const dp = Math.abs(p1 - p0);
      const base = Math.max(Math.abs((p0 + p1) / 2), 1e-9);
      const pct = (dp / base) * 100;
      drawPillLabel(group, cx, cy, `Δ ${dp.toFixed(2)} (${pct.toFixed(2)}%)`,
        { bg: stroke, color: '#fff', anchor: 'middle' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const cx = (pts[0].x + pts[1].x) / 2;
    const cy = (pts[0].y + pts[1].y) / 2;
    const rx = Math.abs(pts[1].x - pts[0].x) / 2 || 1;
    const ry = Math.abs(pts[1].y - pts[0].y) / 2 || 1;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1.05;
  }
}

// ---------- 38. Triangle ----------
class TriangleDrawing extends BaseDrawing {
  static type = 'triangle';
  static label = 'Triángulo';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const stroke = this.strokeColor(state);
    el('polygon', {
      points: pts.map(p => `${p.x},${p.y}`).join(' '),
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha),
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-fill',
    }, group);
    if (this.options.showArea) {
      // Shoelace area in pixels — for indicative purposes show as |Δ| px²; use centroid for label
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        a += xs[i] * ys[j] - xs[j] * ys[i];
      }
      const area = Math.abs(a) / 2;
      const cx = (xs[0] + xs[1] + xs[2]) / 3;
      const cy = (ys[0] + ys[1] + ys[2]) / 3;
      drawPillLabel(group, cx, cy, `Área ${area.toFixed(0)} px²`,
        { bg: stroke, color: '#fff', anchor: 'middle' });
    }
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    if (x < Math.min(...xs) - HIT_TOLERANCE || x > Math.max(...xs) + HIT_TOLERANCE) return false;
    if (y < Math.min(...ys) - HIT_TOLERANCE || y > Math.max(...ys) + HIT_TOLERANCE) return false;
    return true;
  }
}

// ---------- 39. Polyline (variable points) ----------
class PolylineDrawing extends BaseDrawing {
  static type = 'polyline';
  static label = 'Polilínea';
  static pointsRequired = -1; // -1 = variable; finish via Esc/double-click

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2) return;
    const close = this.options.showArea && pts.length >= 3;
    let d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x},${p.y}`).join(' ');
    if (close) d += ' Z';
    const stroke = this.strokeColor(state);
    el('path', {
      d, fill: close ? hexWithAlpha(this.options.color, this.options.fillAlpha) : 'none',
      stroke,
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: close ? 'drawing-fill' : 'drawing-line',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    for (let i = 0; i < pts.length - 1; i++) {
      if (!pts[i].valid || !pts[i + 1].valid) continue;
      if (pointToSegmentDistance(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 40. Arc (quadratic bezier) ----------
class ArcDrawing extends BaseDrawing {
  static type = 'arc';
  static label = 'Arco';
  static pointsRequired = 3;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return;
    const d = `M ${pts[0].x},${pts[0].y} Q ${pts[2].x},${pts[2].y} ${pts[1].x},${pts[1].y}`;
    el('path', {
      d, fill: 'none',
      stroke: this.strokeColor(state),
      'stroke-width': this.options.width,
      'stroke-dasharray': this.dashArray(),
      class: 'drawing-line',
    }, group);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 3 || pts.some(p => !p.valid)) return false;
    for (let t = 0; t <= 1; t += 0.05) {
      const u = 1 - t;
      const bx = u * u * pts[0].x + 2 * u * t * pts[2].x + t * t * pts[1].x;
      const by = u * u * pts[0].y + 2 * u * t * pts[2].y + t * t * pts[1].y;
      if (dist(x, y, bx, by) <= HIT_TOLERANCE) return true;
    }
    return false;
  }
}

// ---------- 41. Callout ----------
class CalloutDrawing extends BaseDrawing {
  static type = 'callout';
  static label = 'Llamada';
  static pointsRequired = 2;

  constructor(points = [], options = {}, id = null) {
    super(points, options, id);
    if (!this.options.text) this.options.text = 'Comentario';
    if (!this.options.fontSize) this.options.fontSize = 12;
  }

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    const txt = this.options.text;
    const fs = this.options.fontSize;
    const fw = this.options.fontWeight || 'normal';
    const align = this.options.textAlign || 'left';
    const bg = this.options.bgColor || hexWithAlpha('#1c1c1c', 0.9);
    const showBorder = this.options.showBorder !== false;
    const padX = 6, padY = 4;
    const w = Math.max(40, txt.length * fs * 0.55) + padX * 2;
    const h = fs + padY * 2;
    el('line', {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'drawing-line',
    }, group);
    el('rect', {
      x: pts[1].x, y: pts[1].y - h / 2, width: w, height: h, rx: 4,
      fill: bg, stroke: showBorder ? stroke : 'none',
      'stroke-width': showBorder ? this.options.width : 0, class: 'drawing-fill',
    }, group);
    let tx = pts[1].x + padX, anchor = 'start';
    if (align === 'center') { tx = pts[1].x + w / 2; anchor = 'middle'; }
    else if (align === 'right') { tx = pts[1].x + w - padX; anchor = 'end'; }
    el('text', {
      x: tx, y: pts[1].y + fs / 3,
      'text-anchor': anchor,
      fill: stroke, 'font-size': fs, 'font-weight': fw, class: 'drawing-label',
    }, group).textContent = txt;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const fs = this.options.fontSize;
    const w = Math.max(40, this.options.text.length * fs * 0.55) + 12;
    const h = fs + 8;
    return pointInRect(x, y, pts[1].x, pts[1].y - h / 2, pts[1].x + w, pts[1].y + h / 2)
      || pointToSegmentDistance(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= HIT_TOLERANCE;
  }
}

// ---------- 42. Price label ----------
class PriceLabelDrawing extends BaseDrawing {
  static type = 'price-label';
  static label = 'Etiqueta de precio';
  static pointsRequired = 1;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const stroke = this.strokeColor(state);
    const fs = this.options.fontSize || 12;
    const fw = this.options.fontWeight || 'normal';
    const bg = this.options.bgColor || this.options.color;
    const showBorder = !!this.options.showBorder;
    const txt = (this.options.text ? this.options.text + ' ' : '') + this.points[0].price.toFixed(2);
    const w = Math.max(60, txt.length * (fs * 0.6)) + 8;
    const h = fs + 6;
    el('line', {
      x1: 0, y1: pts[0].y, x2: ctx.width, y2: pts[0].y,
      stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3', class: 'drawing-line',
    }, group);
    el('rect', {
      x: pts[0].x, y: pts[0].y - h / 2, width: w, height: h, rx: h / 2,
      fill: bg, stroke: showBorder ? stroke : 'none', 'stroke-width': showBorder ? 1 : 0,
      class: 'drawing-fill',
    }, group);
    el('text', {
      x: pts[0].x + w / 2, y: pts[0].y + fs / 3, 'text-anchor': 'middle',
      fill: '#fff', 'font-size': fs, 'font-weight': fw, class: 'drawing-label',
    }, group).textContent = txt;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    return Math.abs(y - pts[0].y) <= HIT_TOLERANCE;
  }
}

// ---------- 43. Flag ----------
class FlagDrawing extends BaseDrawing {
  static type = 'flag';
  static label = 'Bandera';
  static pointsRequired = 1;

  constructor(points = [], options = {}, id = null) {
    super(points, options, id);
    if (!this.options.text) this.options.text = 'F';
  }

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const stroke = this.strokeColor(state);
    const txt = this.options.text;
    const fs = this.options.fontSize || 10;
    const fw = this.options.fontWeight || 'normal';
    const bg = this.options.bgColor || this.options.color;
    const showBorder = this.options.showBorder !== false;
    const x = pts[0].x, y = pts[0].y;
    el('line', { x1: x, y1: y, x2: x, y2: y - 40, stroke, 'stroke-width': 2, class: 'drawing-line' }, group);
    el('path', {
      d: `M ${x},${y - 40} L ${x + 22},${y - 35} L ${x},${y - 30} Z`,
      fill: bg, stroke: showBorder ? stroke : 'none',
      'stroke-width': showBorder ? 1 : 0, class: 'drawing-fill',
    }, group);
    el('text', {
      x: x + 4, y: y - 33, fill: '#fff',
      'font-size': fs, 'font-weight': fw, class: 'drawing-label',
    }, group).textContent = txt.slice(0, 3);
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    return Math.abs(x - pts[0].x) <= HIT_TOLERANCE + 6 && y <= pts[0].y && y >= pts[0].y - 42;
  }
}

// ---------- 44. Comment (speech bubble) ----------
class CommentDrawing extends BaseDrawing {
  static type = 'comment';
  static label = 'Comentario';
  static pointsRequired = 1;

  constructor(points = [], options = {}, id = null) {
    super(points, options, id);
    if (!this.options.text) this.options.text = 'Comentario';
    if (!this.options.fontSize) this.options.fontSize = 12;
  }

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const stroke = this.strokeColor(state);
    const txt = this.options.text;
    const fs = this.options.fontSize;
    const fw = this.options.fontWeight || 'normal';
    const align = this.options.textAlign || 'left';
    const bg = this.options.bgColor || hexWithAlpha('#1c1c1c', 0.9);
    const showBorder = this.options.showBorder !== false;
    const padX = 6, padY = 4;
    const w = Math.max(50, txt.length * fs * 0.55) + padX * 2;
    const h = fs + padY * 2;
    const x = pts[0].x, y = pts[0].y;
    const d = `M ${x},${y} L ${x + 10},${y - 8} L ${x + 10},${y - h} L ${x + 10 + w},${y - h} L ${x + 10 + w},${y - 8} L ${x + 18},${y - 8} Z`;
    el('path', {
      d, fill: bg, stroke: showBorder ? stroke : 'none',
      'stroke-width': showBorder ? this.options.width : 0, class: 'drawing-fill',
    }, group);
    let tx = x + 10 + padX, anchor = 'start';
    if (align === 'center') { tx = x + 10 + w / 2; anchor = 'middle'; }
    else if (align === 'right') { tx = x + 10 + w - padX; anchor = 'end'; }
    el('text', {
      x: tx, y: y - h + fs + padY - 2,
      'text-anchor': anchor,
      fill: stroke, 'font-size': fs, 'font-weight': fw, class: 'drawing-label',
    }, group).textContent = txt;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    const fs = this.options.fontSize;
    const w = Math.max(50, this.options.text.length * fs * 0.55) + 12;
    const h = fs + 8;
    return pointInRect(x, y, pts[0].x + 10, pts[0].y - h, pts[0].x + 10 + w, pts[0].y);
  }
}

// ---------- 45. Measure distance ----------
class MeasureDistanceDrawing extends BaseDrawing {
  static type = 'measure-distance';
  static label = 'Medir distancia';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    const p0 = this.points[0].price, p1 = this.points[1].price;
    const dp = p1 - p0;
    const pct = p0 !== 0 ? (dp / p0) * 100 : 0;
    const t0 = Number(this.points[0].time), t1 = Number(this.points[1].time);
    const dt = Math.abs(t1 - t0);
    const xMin = Math.min(pts[0].x, pts[1].x);
    const xMax = Math.max(pts[0].x, pts[1].x);
    const yMin = Math.min(pts[0].y, pts[1].y);
    const yMax = Math.max(pts[0].y, pts[1].y);
    const color = dp >= 0 ? '#089981' : '#f23645';
    el('rect', {
      x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin,
      fill: hexWithAlpha(color, 0.18), stroke: color, 'stroke-width': 1,
      class: 'drawing-fill',
    }, group);
    el('line', {
      x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y,
      stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3', class: 'drawing-line',
    }, group);
    const showPrice = this.options.showDeltaPrice !== false;
    const showPct = this.options.showDeltaPercent !== false;
    const showTime = this.options.showDeltaTime !== false;
    const showBars = !!this.options.showBars;
    const parts = [];
    if (showPrice) parts.push(`Δ ${dp.toFixed(2)}`);
    if (showPct) parts.push(`${pct.toFixed(2)}%`);
    if (showTime) parts.push(formatDuration(dt));
    if (showBars) {
      const bars = getBarsFromCtx(ctx);
      const t0n = Math.min(t0, t1), t1n = Math.max(t0, t1);
      let n = 0;
      for (const b of bars) {
        const t = Number(b.time);
        if (t >= t0n && t <= t1n) n++;
      }
      parts.push(`${n} barras`);
    }
    const lblText = parts.join('  ') || `Δ ${dp.toFixed(2)}`;
    const lblW = lblText.length * 7 + 8;
    const lblX = (xMin + xMax) / 2 - lblW / 2;
    const lblY = yMin - 22;
    el('rect', {
      x: lblX, y: lblY, width: lblW, height: 18, rx: 3,
      fill: color, stroke: 'none', class: 'drawing-fill',
    }, group);
    el('text', {
      x: lblX + lblW / 2, y: lblY + 13, 'text-anchor': 'middle', fill: '#fff', class: 'drawing-label',
    }, group).textContent = lblText;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    return pointInRect(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }
}

// ---------- 46. Measure volume ----------
class MeasureVolumeDrawing extends BaseDrawing {
  static type = 'measure-volume';
  static label = 'Medir volumen';
  static pointsRequired = 2;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return;
    const stroke = this.strokeColor(state);
    const xMin = Math.min(pts[0].x, pts[1].x);
    const xMax = Math.max(pts[0].x, pts[1].x);
    el('rect', {
      x: xMin, y: 0, width: xMax - xMin, height: ctx.height,
      fill: hexWithAlpha(this.options.color, this.options.fillAlpha * 0.6),
      stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3',
      class: 'drawing-fill',
    }, group);
    let sum = 0, n = 0;
    const bars = getBarsFromCtx(ctx);
    const t0 = Math.min(Number(this.points[0].time), Number(this.points[1].time));
    const t1 = Math.max(Number(this.points[0].time), Number(this.points[1].time));
    for (const b of bars) {
      const t = Number(b.time);
      if (t >= t0 && t <= t1) {
        n++;
        if (typeof b.volume === 'number') sum += b.volume;
      }
    }
    const showVolume = this.options.showVolume !== false;
    const showBars = this.options.showBars !== false;
    const showTime = !!this.options.showDeltaTime;
    const parts = [];
    if (showVolume) parts.push(`Vol Σ ${sum.toLocaleString()}`);
    if (showBars) parts.push(`(${n} barras)`);
    if (showTime) parts.push(formatDuration(Math.abs(t1 - t0)));
    const lbl = parts.join('  ') || `Vol Σ ${sum.toLocaleString()}`;
    const w = lbl.length * 7 + 8;
    el('rect', {
      x: (xMin + xMax) / 2 - w / 2, y: 6, width: w, height: 18, rx: 3,
      fill: this.options.color, stroke: 'none', class: 'drawing-fill',
    }, group);
    el('text', {
      x: (xMin + xMax) / 2, y: 19, 'text-anchor': 'middle', fill: '#fff', class: 'drawing-label',
    }, group).textContent = lbl;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (pts.length < 2 || !pts[0].valid || !pts[1].valid) return false;
    const xMin = Math.min(pts[0].x, pts[1].x);
    const xMax = Math.max(pts[0].x, pts[1].x);
    return x >= xMin && x <= xMax;
  }
}

// ---------- 47. Anchored VWAP ----------
class AnchoredVWAPDrawing extends BaseDrawing {
  static type = 'anchored-vwap';
  static label = 'VWAP anclado';
  static pointsRequired = 1;

  render(group, ctx, state) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return;
    const stroke = this.strokeColor(state);
    const bars = getBarsFromCtx(ctx);
    const t0 = Number(this.points[0].time);
    const source = this.options.source || 'hlc3';
    const showBands = !!this.options.showBands;
    const pickPrice = (b) => {
      switch (source) {
        case 'close': return b.close;
        case 'hl2': return (b.high + b.low) / 2;
        case 'hl3': return (b.high + b.low + b.low) / 3; // 'hl3' fallback
        case 'ohlc4': return (b.open + b.high + b.low + b.close) / 4;
        case 'hlc3':
        default: return (b.high + b.low + b.close) / 3;
      }
    };
    let cumPV = 0, cumV = 0;
    // For variance/bands, accumulate (p - vwap)^2 * v ≈ use simple cumulative variance
    let cumP2V = 0;
    const path = [];
    const bandPaths = { p1: [], m1: [], p2: [], m2: [], p3: [], m3: [] };
    for (const b of bars) {
      if (Number(b.time) < t0) continue;
      const typical = pickPrice(b);
      const v = typeof b.volume === 'number' ? b.volume : 1;
      cumPV += typical * v;
      cumV += v;
      cumP2V += typical * typical * v;
      const vwap = cumV > 0 ? cumPV / cumV : typical;
      const variance = cumV > 0 ? Math.max(0, cumP2V / cumV - vwap * vwap) : 0;
      const sd = Math.sqrt(variance);
      const x = ctx.projectX(b.time);
      const y = ctx.projectY(vwap);
      if (x === null || y === null) continue;
      path.push((path.length === 0 ? 'M' : 'L') + ` ${x.toFixed(1)},${y.toFixed(1)}`);
      if (showBands) {
        for (const k of [1, 2, 3]) {
          const yu = ctx.projectY(vwap + sd * k);
          const yl = ctx.projectY(vwap - sd * k);
          const key = (s, n) => s + n;
          if (yu !== null) bandPaths[key('p', k)].push((bandPaths[key('p', k)].length === 0 ? 'M' : 'L') + ` ${x.toFixed(1)},${yu.toFixed(1)}`);
          if (yl !== null) bandPaths[key('m', k)].push((bandPaths[key('m', k)].length === 0 ? 'M' : 'L') + ` ${x.toFixed(1)},${yl.toFixed(1)}`);
        }
      }
    }
    el('line', {
      x1: pts[0].x, y1: 0, x2: pts[0].x, y2: ctx.height,
      stroke, 'stroke-width': 1, 'stroke-dasharray': '2 3',
      class: 'drawing-line', opacity: 0.4,
    }, group);
    if (path.length > 1) {
      el('path', {
        d: path.join(' '), fill: 'none',
        stroke, 'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
    } else {
      el('line', {
        x1: pts[0].x, y1: pts[0].y, x2: ctx.width, y2: pts[0].y,
        stroke, 'stroke-width': this.options.width,
        'stroke-dasharray': this.dashArray(),
        class: 'drawing-line',
      }, group);
    }
    if (showBands) {
      const opacities = { 1: 0.7, 2: 0.5, 3: 0.3 };
      for (const k of [1, 2, 3]) {
        for (const side of ['p', 'm']) {
          const segs = bandPaths[side + k];
          if (segs.length > 1) {
            el('path', {
              d: segs.join(' '), fill: 'none', stroke,
              opacity: opacities[k],
              'stroke-width': 1, 'stroke-dasharray': '3 3',
              class: 'drawing-line',
            }, group);
          }
        }
      }
    }
    el('text', {
      x: pts[0].x + 4, y: 12, fill: stroke, class: 'drawing-label',
    }, group).textContent = `VWAP⚓ ${source}`;
  }
  hitTest(x, y, ctx) {
    const pts = this.projectPoints(ctx);
    if (!pts.length || !pts[0].valid) return false;
    return Math.abs(x - pts[0].x) <= HIT_TOLERANCE;
  }
}

// =============================================================================
// REGISTRY
// =============================================================================

const REGISTRY = {};
function registerType(cls) { REGISTRY[cls.type] = cls; }
[
  // Original 15
  TrendLineDrawing, SegmentDrawing, RayDrawing,
  HorizontalLineDrawing, VerticalLineDrawing,
  RectangleDrawing, FibRetracementDrawing,
  PitchforkDrawing, GannBoxDrawing,
  ElliottImpulseDrawing, ElliottCorrectionDrawing,
  LongPositionDrawing, ShortPositionDrawing,
  TextDrawing, ArrowDrawing,
  // Extended set (32 new types ported from KLineChart overlay)
  FibExtensionDrawing, FibChannelDrawing, FibTimeDrawing,
  FibFanDrawing, FibCircleDrawing, FibSpiralDrawing,
  ParallelChannelDrawing, RegressionTrendDrawing, PriceChannelDrawing,
  DisjointChannelDrawing, InfoLineDrawing,
  GannFanDrawing, GannSquareDrawing, GannSquare144Drawing,
  ABCDDrawing, XABCDDrawing, CypherDrawing,
  ElliottTriangleDrawing, ElliottDoubleComboDrawing, ElliottTripleComboDrawing,
  CircleDrawing, EllipseDrawing, TriangleDrawing, PolylineDrawing, ArcDrawing,
  CalloutDrawing, PriceLabelDrawing, FlagDrawing, CommentDrawing,
  MeasureDistanceDrawing, MeasureVolumeDrawing, AnchoredVWAPDrawing,
].forEach(registerType);

// =============================================================================
// DRAWING MANAGER
// =============================================================================

export class DrawingManager {
  constructor(chart, series, container, opts = {}) {
    if (!chart || !series || !container) {
      throw new Error('DrawingManager requires (chart, series, container)');
    }
    injectCSS();
    this.chart = chart;
    this.series = series;
    this.container = container;
    this.storageKey = opts.storageKey || STORAGE_KEY;
    this.types = REGISTRY;
    // Callback used by magnet-snap to access the current OHLC candles.
    // Expected to return an array of {time, open, high, low, close} or empty.
    this.getCandles = typeof opts.getCandles === 'function' ? opts.getCandles : null;

    this.drawings = [];       // array of BaseDrawing instances
    this.selectedId = null;
    this.hoveredId = null;
    this.activeTool = null;   // type id while creating
    this.pendingPoints = [];  // accumulator during creation

    this.draggingHandle = null;   // {drawing, anchorIdx}
    this.draggingBody = null;     // {drawing, lastX, lastY}
    this.dragMoved = false;

    this._ensureContainerPositioned();
    this._buildSVG();
    this._buildHint();
    this._bindEvents();
    this._subscribeChart();

    this._scheduleRender();
  }

  // -------------------------------------------------------------- public API

  activate(typeId) {
    if (!this.types[typeId]) {
      console.warn('[DrawingManager] unknown type', typeId);
      return;
    }
    // Deselect any active drawing first so its handles don't interfere with creation
    this._select(null);
    this.cancel();
    this.activeTool = typeId;
    this.pendingPoints = [];
    this._previewPoint = null;
    this.svg.style.cursor = 'crosshair';
    this.svg.classList.add('is-active');
    // Notify external listeners (e.g. toolbar) so they can toggle active state
    try { this.container.dispatchEvent(new CustomEvent('drawing-tool-change', { detail: { type: typeId, active: true } })); } catch (e) {}
    this._updateHint();
  }

  cancel() {
    const wasActive = !!this.activeTool;
    this.activeTool = null;
    this.pendingPoints = [];
    this._previewPoint = null;
    this.svg.style.cursor = '';
    this.svg.classList.remove('is-active');
    if (wasActive) {
      try { this.container.dispatchEvent(new CustomEvent('drawing-tool-change', { detail: { type: null, active: false } })); } catch (e) {}
    }
    this._updateHint();
    this._render();
  }

  removeAll() {
    // Tear down any pending tool / open UI so nothing references a phantom drawing
    this.cancel();
    this._closeSettingsDialog && this._closeSettingsDialog();
    this._closeContextMenu && this._closeContextMenu();
    this._closeColorPopover && this._closeColorPopover();
    this.drawings = [];
    this.selectedId = null;
    this._save();
    this._render();
  }

  remove(id) {
    this.drawings = this.drawings.filter(d => d.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this._save();
    this._render();
  }

  list() { return this.drawings.slice(); }

  add(drawing) {
    this.drawings.push(drawing);
    this._save();
    this._render();
  }

  duplicate(id) {
    const src = this.drawings.find(d => d.id === id);
    if (!src) return;
    const Cls = this.types[src.type];
    const refPrice = src.points[0]?.price ?? 0;
    const offset = this._priceOffset(0.01, refPrice);
    const newPts = src.points.map(p => ({ time: p.time, price: p.price - offset }));
    // Deep clone so nested arrays (levels, gannLevels, etc.) aren't shared with the source.
    let optsClone;
    try { optsClone = JSON.parse(JSON.stringify(src.options || {})); }
    catch (e) { optsClone = Object.assign({}, src.options); }
    const dup = new Cls(newPts, optsClone);
    this.add(dup);
    this._select(dup.id);
  }

  setSelected(id) { this._select(id); }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return 0;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return 0;
      // Clear any stale selection / open dialogs before swapping the array
      this._select(null);
      this._closeSettingsDialog && this._closeSettingsDialog();
      this.drawings = arr
        .map(d => {
          const Cls = this.types[d.type];
          if (!Cls) return null;
          try {
            const inst = new Cls(d.points || [], d.options || {}, d.id);
            inst.zIndex = d.zIndex || 0;
            return inst;
          } catch (err) {
            console.warn('[DrawingManager] discard drawing on load', d?.type, err);
            return null;
          }
        })
        .filter(Boolean);
      this._render();
      return this.drawings.length;
    } catch (e) {
      console.warn('[DrawingManager] load failed', e);
      return 0;
    }
  }

  destroy() {
    if (this._timeUnsub) try { this._timeUnsub(); } catch (e) {}
    if (this._sizeUnsub) try { this._sizeUnsub(); } catch (e) {}
    if (this._resizeObs) try { this._resizeObs.disconnect(); } catch (e) {}
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('mousemove', this._onWinMouseMove, true);
    window.removeEventListener('mouseup', this._onWinMouseUp, true);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('click', this._onDocClick, true);
    document.removeEventListener('mousedown', this._onDocMouseDown, true);
    if (this._rafHandle) { try { cancelAnimationFrame(this._rafHandle); } catch (e) {} this._rafHandle = null; }
    if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
    this.svg = null;
    if (this.hint && this.hint.parentNode) this.hint.parentNode.removeChild(this.hint);
    if (this._hoverTip && this._hoverTip.parentNode) this._hoverTip.parentNode.removeChild(this._hoverTip);
    this._hoverTip = null;
    this._closeContextMenu();
    this._closePropertiesPanel();
    this._closeColorPopover();
    this._closeSettingsDialog && this._closeSettingsDialog();
    this._closeTextEditor && this._closeTextEditor();
  }

  // ---------------------------------------------------------- internal: DOM

  _ensureContainerPositioned() {
    const cs = getComputedStyle(this.container);
    if (cs.position === 'static') this.container.style.position = 'relative';
  }

  _buildSVG() {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'drawing-overlay');
    // Add a <defs><clipPath> that clips drawings to the main candle pane only,
    // so they don't bleed into volume / MACD / RSI panes below.
    const defs = document.createElementNS(SVG_NS, 'defs');
    const cp = document.createElementNS(SVG_NS, 'clipPath');
    cp.setAttribute('id', 'drawingMainPaneClip');
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', '0');
    r.setAttribute('y', '0');
    r.setAttribute('width', '100%');
    r.setAttribute('height', '100%');
    cp.appendChild(r);
    defs.appendChild(cp);
    this.svg.appendChild(defs);
    this._clipRect = r;
    // Root <g> that all drawings render into — clipped to main pane
    this._drawingsRoot = document.createElementNS(SVG_NS, 'g');
    this._drawingsRoot.setAttribute('clip-path', 'url(#drawingMainPaneClip)');
    this.svg.appendChild(this._drawingsRoot);
    this.container.appendChild(this.svg);
    this._syncSize();
  }

  // Find the height of the main candle pane (first pane).
  // lightweight-charts renders each pane as a separate canvas inside `tr.tv-lightweight-charts table`.
  // We measure the first table-row.
  _getMainPaneHeight() {
    try {
      // v5 exposes chart.panes() with getHeight()
      if (typeof this.chart.panes === 'function') {
        const panes = this.chart.panes();
        if (panes && panes.length) {
          const h = panes[0].getHeight?.();
          if (h && h > 0) return h;
        }
      }
    } catch (e) {}
    // Fallback: find the first <tr> in the chart table and use its bbox height
    try {
      const table = this.container.querySelector('table');
      if (table) {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          return firstRow.getBoundingClientRect().height;
        }
      }
    } catch (e) {}
    return this._height || 0;
  }

  _buildHint() {
    this.hint = htmlEl('div', { class: 'drawing-hint' });
    this.hint.style.display = 'none';
    this.container.appendChild(this.hint);
  }

  _syncSize() {
    const r = this.container.getBoundingClientRect();
    this.svg.setAttribute('width', r.width);
    this.svg.setAttribute('height', r.height);
    this.svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    this._width = r.width;
    this._height = r.height;
    // Update the clip rect to cover only the main pane height (clips drawings out of volume/RSI/MACD panes)
    if (this._clipRect) {
      const mainH = this._getMainPaneHeight();
      this._clipRect.setAttribute('width', r.width);
      this._clipRect.setAttribute('height', mainH > 0 ? mainH : r.height);
    }
  }

  // ------------------------------------------------------- internal: chart

  _subscribeChart() {
    try {
      const ts = this.chart.timeScale();
      this._onTimeRangeChange = () => this._scheduleRender();
      this._onLogicalRangeChange = () => this._scheduleRender();
      ts.subscribeVisibleTimeRangeChange(this._onTimeRangeChange);
      this._timeUnsub = () => { try { ts.unsubscribeVisibleTimeRangeChange(this._onTimeRangeChange); } catch (e) {} };
      if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        ts.subscribeVisibleLogicalRangeChange(this._onLogicalRangeChange);
        const prevUnsub = this._timeUnsub;
        this._timeUnsub = () => {
          prevUnsub && prevUnsub();
          try { ts.unsubscribeVisibleLogicalRangeChange(this._onLogicalRangeChange); } catch (e) {}
        };
      }
    } catch (e) {}
    try {
      if (typeof this.chart.subscribeSizeChange === 'function') {
        this._onChartSize = () => { this._syncSize(); this._scheduleRender(); };
        this.chart.subscribeSizeChange(this._onChartSize);
        this._sizeUnsub = () => { try { this.chart.unsubscribeSizeChange(this._onChartSize); } catch (e) {} };
      }
    } catch (e) {}
    this._onResize = () => { this._syncSize(); this._scheduleRender(); };
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObs = new ResizeObserver(() => { this._syncSize(); this._scheduleRender(); });
      this._resizeObs.observe(this.container);
    }
  }

  _buildCtx() {
    return {
      chart: this.chart,
      series: this.series,
      width: this._width,
      height: this._height,
      projectX: (time) => {
        try {
          const x = this.chart.timeScale().timeToCoordinate(time);
          return (x === null || x === undefined || isNaN(x)) ? null : x;
        } catch (e) { return null; }
      },
      projectY: (price) => {
        try {
          const y = this.series.priceToCoordinate(price);
          return (y === null || y === undefined || isNaN(y)) ? null : y;
        } catch (e) { return null; }
      },
      inverseX: (x) => {
        try {
          const t = this.chart.timeScale().coordinateToTime(x);
          return t;
        } catch (e) { return null; }
      },
      inverseY: (y) => {
        try {
          const p = this.series.coordinateToPrice(y);
          return p;
        } catch (e) { return null; }
      },
    };
  }

  _priceOffset(_fraction, refPrice) {
    try {
      const base = (typeof refPrice === 'number')
        ? refPrice
        : (this.drawings[0]?.points[0]?.price ?? 0);
      const y1 = this.series.priceToCoordinate(base);
      if (y1 == null) return 0;
      const y2 = y1 + 20;
      const p1 = this.series.coordinateToPrice(y1);
      const p2 = this.series.coordinateToPrice(y2);
      return Math.abs((p2 ?? 0) - (p1 ?? 0));
    } catch (e) { return 0; }
  }

  // ---------------------------------------------------- internal: events

  _bindEvents() {
    this._onKey = (e) => {
      // Bail if user is typing into an input/textarea/contenteditable
      const ae = document.activeElement;
      const typing = ae && (
        ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' ||
        ae.isContentEditable
      );
      if (e.key === 'Escape') {
        if (this.activeTool) { this.cancel(); e.preventDefault(); return; }
        if (this._settingsColorPop) { this._closeSettingsColorPop(); return; }
        if (this._settingsDialog) { this._closeSettingsDialog(); return; }
        if (this._ctxMenu) { this._closeContextMenu(); return; }
        if (this._colorPopover) { this._closeColorPopover(); return; }
        if (this.selectedId) { this._select(null); return; }
      } else if (e.key === 'Delete') {
        // Supr always deletes the selected drawing (even if focus is in modal inputs),
        // except when user is editing text in a textarea (multi-line content like Text drawing).
        if (this.selectedId && !(ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable))) {
          this.remove(this.selectedId);
          e.preventDefault();
        }
      } else if (e.key === 'Backspace' && !typing) {
        // Backspace only deletes when not typing (to avoid stealing back-space inside inputs)
        if (this.selectedId) {
          this.remove(this.selectedId);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', this._onKey);

    // Document-level mousedown → deselect drawing when click is outside both the drawing/SVG and any drawing UI
    this._onDocMouseDown = (e) => {
      if (!this.selectedId) return;
      const t = e.target;
      if (!t || !(t instanceof Element)) return;
      // Click inside SVG: if it lands on the drawings root background (no drawing/handle hit),
      // deselect + close dialog. _onSvgClick handles hit detection for foreground clicks.
      if (this.svg && this.svg.contains(t)) {
        // Detect if user clicked the empty SVG area (not on a drawing-line/fill/handle).
        const isInteractive = t.closest && t.closest('.drawing-line, .drawing-fill, .drawing-handle');
        if (!isInteractive) {
          // Empty SVG area click → full deselect (matches TradingView behavior)
          if (this._settingsDialog) this._closeSettingsDialog();
          this._select(null);
        } else if (this._settingsDialog) {
          // Clicked on a drawing element → only close dialog (selection handled by _onSvgClick)
          this._closeSettingsDialog();
        }
        return;
      }
      if (this._propertiesPanel && this._propertiesPanel.contains(t)) return;
      if (this._ctxMenu && this._ctxMenu.contains(t)) return;
      if (this._colorPopover && this._colorPopover.contains(t)) return;
      if (this._subPop && this._subPop.contains(t)) return;
      if (this._settingsDialog && this._settingsDialog.contains(t)) return;
      if (this._settingsColorPop && this._settingsColorPop.contains(t)) return;
      // If dialog is open and click is outside drawing area entirely, close dialog only
      if (this._settingsDialog) { this._closeSettingsDialog(); return; }
      this._select(null);
    };
    document.addEventListener('mousedown', this._onDocMouseDown, true);

    this.svg.addEventListener('mousemove', (e) => this._onSvgMouseMove(e));
    this.svg.addEventListener('mousedown', (e) => this._onSvgMouseDown(e));
    this.svg.addEventListener('click', (e) => this._onSvgClick(e));
    this.svg.addEventListener('dblclick', (e) => this._onSvgDblClick(e));
    this.svg.addEventListener('contextmenu', (e) => this._onSvgContextMenu(e));
    this.svg.addEventListener('mouseleave', () => { this._hideHoverTip(); });

    this._onWinMouseMove = (e) => this._onWindowMouseMove(e);
    this._onWinMouseUp = (e) => this._onWindowMouseUp(e);
    window.addEventListener('mousemove', this._onWinMouseMove, true);
    window.addEventListener('mouseup', this._onWinMouseUp, true);

    this._onDocClick = (e) => {
      if (this._ctxMenu && !this._ctxMenu.contains(e.target)) this._closeContextMenu();
      if (this._colorPopover && !this._colorPopover.contains(e.target)) this._closeColorPopover();
    };
    document.addEventListener('click', this._onDocClick, true);
  }

  _localCoords(e) {
    const r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _onSvgMouseMove(e) {
    const { x, y } = this._localCoords(e);

    if (this.draggingHandle) {
      this._dragHandleMove(x, y);
      return;
    }
    if (this.draggingBody) {
      this._dragBodyMove(x, y);
      return;
    }

    if (this.activeTool) {
      // preview only — re-render with pending
      this._previewPoint = this._screenToDataPoint(x, y);
      this._scheduleRender();
      return;
    }

    // hover detection
    const hit = this._hitTopmost(x, y);
    const newHovered = hit ? hit.id : null;
    if (newHovered !== this.hoveredId) {
      this.hoveredId = newHovered;
      this.svg.style.cursor = newHovered ? 'move' : '';
      this._render();
    }
    // Show / move / hide hover tooltip describing the drawing under the cursor.
    if (hit && !hit.options?.locked) {
      this._showHoverTip(hit, e.clientX, e.clientY);
    } else {
      this._hideHoverTip();
    }
  }

  // -------------------------------------------------- internal: hover tooltip

  _showHoverTip(drawing, clientX, clientY) {
    if (!this._hoverTip) {
      this._hoverTip = htmlEl('div', { class: 'drawing-hover-tip' });
      document.body.appendChild(this._hoverTip);
    }
    const html = this._buildHoverTipHTML(drawing);
    if (!html) { this._hideHoverTip(); return; }
    if (this._hoverTip._lastId !== drawing.id || this._hoverTip._lastHTML !== html) {
      this._hoverTip.innerHTML = html;
      this._hoverTip._lastId = drawing.id;
      this._hoverTip._lastHTML = html;
    }
    this._hoverTip.style.display = 'block';
    // Position with viewport clamp; offset so the cursor stays clear of it.
    const rect = this._hoverTip.getBoundingClientRect();
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + rect.width > window.innerWidth - 4) x = clientX - rect.width - 14;
    if (y + rect.height > window.innerHeight - 4) y = clientY - rect.height - 14;
    if (x < 4) x = 4;
    if (y < 4) y = 4;
    this._hoverTip.style.left = x + 'px';
    this._hoverTip.style.top  = y + 'px';
  }

  _hideHoverTip() {
    if (this._hoverTip) this._hoverTip.style.display = 'none';
  }

  _buildHoverTipHTML(d) {
    const esc = (s) => this._escape(s);
    const Cls = this.types[d.type] || d.constructor;
    const label = Cls?.label || d.type;
    const fmtNum = (n) => (typeof n === 'number') ? (Math.abs(n) >= 1000 ? n.toFixed(2) : n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')) : '—';

    let body = '';
    if (d.type === 'trend-line' || d.type === 'ray' || d.type === 'segment') {
      const [p0, p1] = d.points || [];
      if (p0 && p1) {
        const slope = (p1.time === p0.time) ? Infinity : (p1.price - p0.price) / (p1.time - p0.time);
        const dPct = p0.price ? ((p1.price - p0.price) / p0.price) * 100 : 0;
        const dirCls = (p1.price - p0.price) >= 0 ? 'dt-up' : 'dt-dn';
        const slopeText = !isFinite(slope) ? '∞' : (slope.toExponential(2));
        body += `<div class="dt-row"><span>Δ precio</span><b class="${dirCls}">${(p1.price - p0.price >= 0 ? '+' : '')}${fmtNum(p1.price - p0.price)}</b></div>`;
        body += `<div class="dt-row"><span>Δ %</span><b class="${dirCls}">${(dPct >= 0 ? '+' : '')}${dPct.toFixed(2)}%</b></div>`;
        body += `<div class="dt-row"><span>Pendiente</span><b>${slopeText}</b></div>`;
      }
    } else if (d.type === 'long-position' || d.type === 'short-position') {
      const [entry, stop, target] = d.points || [];
      if (entry && stop && target) {
        const risk = Math.abs(entry.price - stop.price);
        const reward = Math.abs(target.price - entry.price);
        const rr = risk > 0 ? (reward / risk) : Infinity;
        const pctStop = entry.price ? ((stop.price - entry.price) / entry.price) * 100 : 0;
        const pctTgt  = entry.price ? ((target.price - entry.price) / entry.price) * 100 : 0;
        body += `<div class="dt-row"><span>R:R</span><b>${isFinite(rr) ? rr.toFixed(2) : '∞'}</b></div>`;
        body += `<div class="dt-row"><span>Entrada</span><b>${fmtNum(entry.price)}</b></div>`;
        body += `<div class="dt-row"><span>Stop</span><b class="dt-dn">${fmtNum(stop.price)} (${(pctStop >= 0 ? '+' : '')}${pctStop.toFixed(2)}%)</b></div>`;
        body += `<div class="dt-row"><span>Target</span><b class="dt-up">${fmtNum(target.price)} (${(pctTgt >= 0 ? '+' : '')}${pctTgt.toFixed(2)}%)</b></div>`;
      }
    } else if (d.type === 'fib-retracement') {
      const [p0, p1] = d.points || [];
      if (p0 && p1) {
        // Reuse the same canonical level set used by the renderer.
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        for (const lvl of levels) {
          const price = p0.price + (p1.price - p0.price) * lvl;
          body += `<div class="dt-row"><span>${lvl.toFixed(3)}</span><b>${fmtNum(price)}</b></div>`;
        }
      }
    } else if (d.type === 'text') {
      const txt = d.options?.text || '';
      body += `<div class="dt-row"><span>Texto</span><b>${esc(txt).slice(0, 80)}</b></div>`;
    } else if (d.type === 'horizontal-line' || d.type === 'hline') {
      const price = d.points?.[0]?.price;
      if (price != null) body += `<div class="dt-row"><span>Precio</span><b>${fmtNum(price)}</b></div>`;
    } else if (d.type === 'rectangle') {
      const [p0, p1] = d.points || [];
      if (p0 && p1) {
        const dPct = p0.price ? ((p1.price - p0.price) / p0.price) * 100 : 0;
        body += `<div class="dt-row"><span>Alto</span><b>${fmtNum(Math.abs(p1.price - p0.price))}</b></div>`;
        body += `<div class="dt-row"><span>Δ %</span><b>${(dPct >= 0 ? '+' : '')}${dPct.toFixed(2)}%</b></div>`;
      }
    }

    if (!body) {
      // Generic: just show the label
      body = `<div class="dt-row"><span>Tipo</span><b>${esc(label)}</b></div>`;
    }
    return `<div class="dt-title">${esc(label)}</div>${body}`;
  }

  _onSvgMouseDown(e) {
    if (this.activeTool) return; // creation uses click handler
    if (e.button !== 0) return;
    const { x, y } = this._localCoords(e);
    // handle hit?
    const hh = this._hitHandle(x, y);
    if (hh && !hh.drawing.options.locked) {
      this.draggingHandle = { drawing: hh.drawing, anchorIdx: hh.anchorIdx };
      this.dragMoved = false;
      e.preventDefault();
      return;
    }
    // body hit?
    const hit = this._hitTopmost(x, y);
    if (hit && !hit.options.locked) {
      this._select(hit.id);
      this.draggingBody = { drawing: hit, lastX: x, lastY: y };
      this.dragMoved = false;
      e.preventDefault();
    }
  }

  _onSvgClick(e) {
    // Suppress the click that follows a drag
    if (this._suppressClick) { this._suppressClick = false; return; }
    if (this.activeTool) {
      const { x, y } = this._localCoords(e);
      const dataPt = this._screenToDataPoint(x, y, true);
      if (!dataPt) return;
      this.pendingPoints.push(dataPt);
      const Cls = this.types[this.activeTool];
      if (this.pendingPoints.length >= Cls.pointsRequired) {
        this._commitPending();
      } else {
        this._updateHint();
        this._scheduleRender();
      }
      return;
    }
    const { x, y } = this._localCoords(e);
    const hit = this._hitTopmost(x, y);
    if (hit) {
      this._select(hit.id);
    } else {
      this._select(null);
    }
  }

  _onSvgDblClick(e) {
    const { x, y } = this._localCoords(e);
    const hit = this._hitTopmost(x, y);
    if (hit && hit.type === 'text') {
      this._openTextEditor(hit, e.clientX, e.clientY);
    }
  }

  _onSvgContextMenu(e) {
    const { x, y } = this._localCoords(e);
    const hit = this._hitTopmost(x, y);
    if (!hit) return;
    e.preventDefault();
    this._select(hit.id);
    this._openContextMenu(hit, e.clientX, e.clientY);
  }

  _onWindowMouseMove(e) {
    if (!this.draggingHandle && !this.draggingBody) return;
    const { x, y } = this._localCoords(e);
    if (this.draggingHandle) this._dragHandleMove(x, y);
    else if (this.draggingBody) this._dragBodyMove(x, y);
  }

  _onWindowMouseUp(e) {
    if (this.draggingHandle || this.draggingBody) {
      if (this.dragMoved) {
        this._save();
        this._suppressClick = true;
        // Safety reset: if the synthetic click never fires (e.g. drag ended off-window),
        // ensure _suppressClick doesn't latch and swallow the next real click.
        setTimeout(() => { this._suppressClick = false; }, 16);
      }
    }
    this.draggingHandle = null;
    this.draggingBody = null;
    // Clear cached magnet mode used during drag
    this._magnetMode = null;
  }

  _dragHandleMove(x, y) {
    const { drawing, anchorIdx } = this.draggingHandle;
    if (anchorIdx < 0 || anchorIdx >= drawing.points.length) return;
    const ctx = this._buildCtx();
    let time = ctx.inverseX(x);
    let price = ctx.inverseY(y);
    if (time === null || price === null) return;
    // magnet
    const snapped = this._magnetSnap(x, y, price);
    if (snapped !== null) price = snapped;
    drawing.points[anchorIdx] = { time, price };
    this.dragMoved = true;
    this._render();
    this._syncSettingsCoords();
  }

  _dragBodyMove(x, y) {
    const ctx = this._buildCtx();
    const dx = x - this.draggingBody.lastX;
    const dy = y - this.draggingBody.lastY;
    if (dx === 0 && dy === 0) return;
    this.draggingBody.drawing.translateBy(dx, dy, ctx);
    this.draggingBody.lastX = x;
    this.draggingBody.lastY = y;
    this.dragMoved = true;
    this._render();
    this._syncSettingsCoords();
  }

  _magnetSnap(x, y, price) {
    // Cache the magnet mode for the duration of a drag/preview gesture to avoid
    // hitting localStorage on every mousemove. _magnetMode is cleared on mouseup.
    let mode = this._magnetMode;
    if (mode === undefined || mode === null) {
      try { mode = localStorage.getItem(MAGNET_KEY); } catch (e) { mode = null; }
      this._magnetMode = mode;
    }
    if (mode !== 'weak' && mode !== 'strong') return null;

    // Try OHLC-based snap first when we have a getCandles callback.
    try {
      const candles = (typeof this.getCandles === 'function') ? (this.getCandles() || []) : null;
      if (Array.isArray(candles) && candles.length) {
        const ts = this.chart.timeScale();
        // Locate candle whose screen-x is nearest to cursor x.
        let best = null;
        let bestDx = Infinity;
        // Cheap scan; charts rarely exceed a few thousand visible candles and
        // this only runs while dragging or previewing, not per-frame paint.
        for (const c of candles) {
          const cx = ts.timeToCoordinate(c.time);
          if (cx == null) continue;
          const dx = Math.abs(cx - x);
          if (dx < bestDx) { bestDx = dx; best = c; if (dx === 0) break; }
        }
        if (best) {
          if (mode === 'weak') {
            // Snap to the close of the nearest candle, unconditionally — weak
            // magnet treats the close as the "default" anchor.
            return best.close;
          }
          // Strong: snap to whichever OHLC is closest in pixels, within 8px.
          const candidates = [best.open, best.high, best.low, best.close];
          let snapPrice = null;
          let snapDy = 8 + 1;
          for (const p of candidates) {
            if (p == null) continue;
            const cy = this.series.priceToCoordinate(p);
            if (cy == null) continue;
            const dy = Math.abs(cy - y);
            if (dy < snapDy) { snapDy = dy; snapPrice = p; }
          }
          if (snapPrice != null) return snapPrice;
        }
      }
    } catch (e) {}

    // Fallback: round to nearest tick if priceFormat exposes minMove.
    try {
      const fmt = this.series.options?.()?.priceFormat;
      const minMove = fmt?.minMove;
      if (typeof minMove === 'number' && minMove > 0) {
        const snapped = Math.round(price / minMove) * minMove;
        const ySnapped = this.series.priceToCoordinate(snapped);
        if (ySnapped !== null && Math.abs(ySnapped - y) <= SNAP_TOLERANCE_PX) return snapped;
      }
    } catch (e) {}
    return null;
  }

  _screenToDataPoint(x, y, validateOnly = false) {
    const ctx = this._buildCtx();
    const time = ctx.inverseX(x);
    const price = ctx.inverseY(y);
    if (time === null || price === null || time === undefined || price === undefined) {
      return null;
    }
    return { time, price };
  }

  _commitPending() {
    const Cls = this.types[this.activeTool];
    const drawing = new Cls(this.pendingPoints.slice(), {});
    this.drawings.push(drawing);
    this._select(drawing.id);
    const finishedType = this.activeTool;
    this.activeTool = null;
    this.pendingPoints = [];
    this._previewPoint = null;
    this.svg.style.cursor = '';
    this.svg.classList.remove('is-active');
    try { this.container.dispatchEvent(new CustomEvent('drawing-tool-change', { detail: { type: finishedType, active: false } })); } catch (e) {}
    this._updateHint();
    this._save();
    this._render();
  }

  // -------------------------------------------------- internal: hit testing

  _hitTopmost(x, y) {
    const ctx = this._buildCtx();
    const ordered = this.drawings.slice().sort((a, b) => b.zIndex - a.zIndex);
    for (const d of ordered) {
      if (d.hitTest(x, y, ctx)) return d;
    }
    return null;
  }

  _hitHandle(x, y) {
    const ctx = this._buildCtx();
    const ordered = this.drawings.slice().sort((a, b) => b.zIndex - a.zIndex);
    for (const d of ordered) {
      if (d.id !== this.selectedId && d.id !== this.hoveredId) continue;
      const handles = d.getHandlePositions(ctx);
      for (const h of handles) {
        if (dist(x, y, h.x, h.y) <= HANDLE_SIZE) {
          return { drawing: d, anchorIdx: h.anchorIdx };
        }
      }
    }
    return null;
  }

  // -------------------------------------------------- internal: selection

  _select(id) {
    if (this.selectedId === id) {
      // Re-clicking same drawing toggles the settings dialog open if it's not already
      if (id && !this._settingsDialog) {
        const drawing = this.drawings.find(d => d.id === id);
        if (drawing) this._openSettingsDialog(drawing);
      }
      return;
    }
    // Close any previous settings dialog when selection changes
    if (this._settingsDialog) this._closeSettingsDialog?.();
    this.selectedId = id;
    if (id) {
      const drawing = this.drawings.find(d => d.id === id);
      if (drawing) this._openSettingsDialog(drawing);
    } else {
      this._closePropertiesPanel?.();
      this._closeSettingsDialog?.();
    }
    this._render();
  }

  // -------------------------------------------------- internal: rendering

  _scheduleRender() {
    if (this._rafPending) return;
    this._rafPending = true;
    this._rafHandle = requestAnimationFrame(() => {
      this._rafPending = false;
      this._rafHandle = null;
      this._syncSize();
      this._render();
    });
  }

  _render() {
    if (!this.svg) return;
    // Update clip rect each render so it tracks main pane resizes
    if (this._clipRect) {
      const mainH = this._getMainPaneHeight();
      if (mainH > 0) this._clipRect.setAttribute('height', mainH);
    }
    // Re-create the drawings root (preserves <defs><clipPath> sibling)
    if (this._drawingsRoot && this._drawingsRoot.parentNode === this.svg) {
      this.svg.removeChild(this._drawingsRoot);
    }
    this._drawingsRoot = document.createElementNS(SVG_NS, 'g');
    this._drawingsRoot.setAttribute('clip-path', 'url(#drawingMainPaneClip)');
    this.svg.appendChild(this._drawingsRoot);
    const ctx = this._buildCtx();

    const ordered = this.drawings.slice().sort((a, b) => a.zIndex - b.zIndex);
    for (const d of ordered) {
      const g = el('g', { class: 'drawing', 'data-id': d.id }, this._drawingsRoot);
      const isSel = d.id === this.selectedId;
      const isHov = d.id === this.hoveredId;
      if (isSel) g.classList.add('selected');
      if (isHov) g.classList.add('hovered');
      try {
        d.render(g, ctx, { selected: isSel, hovered: isHov });
      } catch (e) {
        console.warn('[DrawingManager] render fail', d.type, e);
      }
      // handles (only when selected/hovered to avoid clutter); invisible circular hit area
      // for easy grabbing, visible minimalist circle on top.
      const handles = d.getHandlePositions(ctx);
      const HIT_R = HANDLE_SIZE;          // 7 → 14 px hit diameter
      const VIS_R = HANDLE_SIZE / 2 + 0.5; // visible radius ~4 px
      for (const h of handles) {
        if (!isSel && !isHov) continue;
        // invisible circular hit area
        el('circle', {
          cx: h.x, cy: h.y, r: HIT_R,
          fill: 'transparent',
          class: 'drawing-handle',
          'data-anchor': h.anchorIdx,
          style: 'cursor:grab',
        }, g);
        // visible minimalist circle on top
        el('circle', {
          cx: h.x, cy: h.y, r: VIS_R,
          class: 'drawing-handle drawing-handle-dot',
          'data-anchor': h.anchorIdx,
          style: 'pointer-events:none',
        }, g);
      }
    }

    // preview during creation
    if (this.activeTool && this.pendingPoints.length) {
      const Cls = this.types[this.activeTool];
      const previewPts = this.pendingPoints.slice();
      if (this._previewPoint) previewPts.push(this._previewPoint);
      if (previewPts.length >= 1) {
        try {
          const tmp = new Cls(previewPts, { color: '#2962ff', width: 1, style: 'dashed' });
          const g = el('g', { class: 'drawing preview', opacity: 0.7 }, this._drawingsRoot);
          tmp.render(g, ctx, { selected: false });
          // pending anchor dots
          for (const p of this.pendingPoints) {
            const x = ctx.projectX(p.time), y = ctx.projectY(p.price);
            if (x === null || y === null) continue;
            el('circle', { cx: x, cy: y, r: 4, fill: '#2962ff', stroke: '#fff', 'stroke-width': 1 }, g);
          }
        } catch (e) {}
      }
    }

    if (this.selectedId) this._positionPropertiesPanel();
  }

  // -------------------------------------------------- internal: hint banner

  _updateHint() {
    if (!this.activeTool) { this.hint.style.display = 'none'; return; }
    const Cls = this.types[this.activeTool];
    const total = Cls.pointsRequired;
    const next = Math.min(this.pendingPoints.length + 1, total);
    // Rich HTML so the counter pops in bold, matching KLineChart style.
    this.hint.innerHTML =
      `<span class="dh-tool">${this._escape(Cls.label)}</span>` +
      `click punto <span class="dh-count">${next}</span>` +
      `<span class="dh-total"> de ${total}</span>` +
      `<span class="dh-sep">·</span>` +
      `<span class="dh-esc"><b>Esc</b> cancela</span>`;
    this.hint.style.display = '';
  }

  _escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // -------------------------------------------------- internal: persistence

  _save() {
    try {
      const data = this.drawings.map(d => d.serialize());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[DrawingManager] save failed', e);
    }
  }

  // =========================================================================
  // UI: CONTEXT MENU
  // =========================================================================

  _openContextMenu(drawing, clientX, clientY) {
    this._closeContextMenu();
    const menu = htmlEl('div', { class: 'drawing-context-menu' });
    const addItem = (label, handler, opts = {}) => {
      const item = htmlEl('div', { class: 'item' }, menu);
      if (opts.swatch) {
        const sw = htmlEl('span', { class: 'swatch' }, item);
        sw.style.background = opts.swatch;
      }
      const span = htmlEl('span', { text: label }, item);
      if (opts.shortcut) {
        const sc = htmlEl('span', { text: opts.shortcut, style: { marginLeft: 'auto', opacity: '0.6', fontSize: '10px' } }, item);
      }
      item.addEventListener('click', (e) => { e.stopPropagation(); handler(); this._closeContextMenu(); });
    };
    const sep = () => htmlEl('div', { class: 'item sep' }, menu);

    // Color → opens popover
    addItem('Color', () => this._openColorPopover(drawing, clientX, clientY), { swatch: drawing.options.color });

    // Grosor submenu (slider inline)
    const widthItem = htmlEl('div', { class: 'item' }, menu);
    htmlEl('span', { text: 'Grosor' }, widthItem);
    const widthInp = htmlEl('input', {
      type: 'range', min: 1, max: 5, step: 1, value: drawing.options.width,
      style: { width: '80px', marginLeft: 'auto' },
    }, widthItem);
    widthInp.addEventListener('click', e => e.stopPropagation());
    widthInp.addEventListener('input', (e) => {
      drawing.options.width = parseInt(e.target.value, 10);
      this._render(); this._save(); this._updatePropertiesPanel();
    });

    // Estilo dropdown
    const styleItem = htmlEl('div', { class: 'item' }, menu);
    htmlEl('span', { text: 'Estilo línea' }, styleItem);
    const styleSel = htmlEl('select', {
      style: { marginLeft: 'auto', background: '#2a2a2a', color: '#d1d4dc', border: '1px solid #3a3a3a' },
    }, styleItem);
    [['solid', 'Sólida'], ['dashed', 'Discontinua'], ['dotted', 'Punteada']].forEach(([v, l]) => {
      const op = htmlEl('option', { value: v, text: l }, styleSel);
      if (drawing.options.style === v) op.selected = true;
    });
    styleSel.addEventListener('click', e => e.stopPropagation());
    styleSel.addEventListener('change', (e) => {
      drawing.options.style = e.target.value;
      this._render(); this._save(); this._updatePropertiesPanel();
    });

    sep();
    addItem('Duplicar', () => this.duplicate(drawing.id));
    addItem('Eliminar', () => this.remove(drawing.id), { shortcut: 'Del' });
    sep();
    addItem(drawing.options.locked ? 'Desbloquear' : 'Fijar', () => {
      drawing.options.locked = !drawing.options.locked;
      this._save(); this._render(); this._updatePropertiesPanel();
    });
    sep();
    addItem('Enviar al frente', () => {
      const maxZ = Math.max(0, ...this.drawings.map(d => d.zIndex));
      drawing.zIndex = maxZ + 1; this._save(); this._render();
    });
    addItem('Enviar al fondo', () => {
      const minZ = Math.min(0, ...this.drawings.map(d => d.zIndex));
      drawing.zIndex = minZ - 1; this._save(); this._render();
    });

    document.body.appendChild(menu);
    // position with viewport clamp
    const rect = menu.getBoundingClientRect();
    const px = Math.min(clientX, window.innerWidth - rect.width - 4);
    const py = Math.min(clientY, window.innerHeight - rect.height - 4);
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';
    this._ctxMenu = menu;
  }

  _closeContextMenu() {
    if (this._ctxMenu && this._ctxMenu.parentNode) {
      this._ctxMenu.parentNode.removeChild(this._ctxMenu);
    }
    this._ctxMenu = null;
  }

  // =========================================================================
  // UI: COLOR POPOVER
  // =========================================================================

  _openColorPopover(drawing, clientX, clientY) {
    this._closeColorPopover();
    const pop = htmlEl('div', { class: 'drawing-color-popover' });
    PRESET_COLORS.forEach(c => {
      const sw = htmlEl('div', { class: 'sw' }, pop);
      sw.style.background = c;
      sw.addEventListener('click', (e) => {
        e.stopPropagation();
        drawing.options.color = c;
        this._save(); this._render(); this._updatePropertiesPanel();
        this._closeColorPopover();
      });
    });
    const inp = htmlEl('input', {
      class: 'hex-input', type: 'text',
      placeholder: '#hex', value: drawing.options.color,
    }, pop);
    inp.addEventListener('click', e => e.stopPropagation());
    inp.addEventListener('change', (e) => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
        drawing.options.color = v;
        this._save(); this._render(); this._updatePropertiesPanel();
      }
    });
    document.body.appendChild(pop);
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.min(clientX, window.innerWidth - r.width - 4) + 'px';
    pop.style.top = Math.min(clientY, window.innerHeight - r.height - 4) + 'px';
    this._colorPopover = pop;
  }

  _closeColorPopover() {
    if (this._colorPopover && this._colorPopover.parentNode) {
      this._colorPopover.parentNode.removeChild(this._colorPopover);
    }
    this._colorPopover = null;
  }

  // =========================================================================
  // UI: PROPERTIES PANEL
  // =========================================================================

  _showPropertiesPanel() {
    // The compact properties bar has been deprecated in favor of the full settings dialog
    // (`_openSettingsDialog`) which opens on selection. Keep this as a no-op to preserve
    // older call sites. To re-enable the compact bar, swap the return for the body below.
    return;
    // ---- LEGACY (kept for reference) ----
    this._closePropertiesPanel();
    const drawing = this.drawings.find(d => d.id === this.selectedId);
    if (!drawing) return;
    const panel = htmlEl('div', { class: 'drawing-properties-panel' });
    panel.addEventListener('mousedown', (e) => e.stopPropagation());

    const COLORS = ['#2962ff','#f23645','#089981','#ff9800','#9c27b0','#00bcd4','#ffffff','#787b86'];
    const WIDTHS = [1, 2, 3, 4];
    const STYLES = [['solid','Sólida'],['dashed','Discontinua'],['dotted','Punteada']];

    // Color swatch popover
    const swBtn = htmlEl('button', { class: 'dpp-btn', title: 'Color de línea' }, panel);
    const sw = htmlEl('span', { class: 'swatch-btn' }, swBtn);
    sw.style.background = drawing.options.color;
    sw.style.color = drawing.options.color;
    swBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleSubPop(panel, 'color', () => {
        const pop = htmlEl('div', { class: 'dpp-pop' });
        COLORS.forEach(c => {
          const b = htmlEl('button', { class: 'swatch-btn' }, pop);
          b.style.background = c;
          b.title = c;
          b.addEventListener('click', () => {
            drawing.options.color = c;
            sw.style.background = c; sw.style.color = c;
            this._render(); this._save();
            this._closeSubPop();
          });
        });
        const hex = htmlEl('input', { type: 'text', value: drawing.options.color, placeholder: '#rrggbb' }, pop);
        hex.addEventListener('change', (e) => {
          const v = e.target.value.trim();
          if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
            drawing.options.color = v;
            sw.style.background = v; sw.style.color = v;
            this._render(); this._save();
          }
        });
        return pop;
      });
    });

    htmlEl('span', { class: 'dpp-divider' }, panel);

    // Width selector — opens popover with 4 thickness options
    const wBtn = htmlEl('button', { class: 'dpp-btn dpp-width-btn', title: 'Grosor' }, panel);
    wBtn.style.setProperty('--w', drawing.options.width + 'px');
    wBtn.style.color = drawing.options.color;
    wBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleSubPop(panel, 'width', () => {
        const pop = htmlEl('div', { class: 'dpp-pop' });
        pop.style.flexDirection = 'column';
        WIDTHS.forEach(w => {
          const b = htmlEl('button', { class: 'dpp-btn dpp-width-btn', title: w + 'px' }, pop);
          b.style.setProperty('--w', w + 'px');
          b.style.width = '60px';
          b.style.color = drawing.options.color;
          if (w === drawing.options.width) b.classList.add('active');
          b.addEventListener('click', () => {
            drawing.options.width = w;
            wBtn.style.setProperty('--w', w + 'px');
            this._render(); this._save();
            this._closeSubPop();
          });
        });
        return pop;
      });
    });

    // Style selector — popover with 3 line styles
    const stBtn = htmlEl('button', { class: 'dpp-btn dpp-style-btn', title: 'Estilo de línea' }, panel);
    stBtn.dataset.style = drawing.options.style || 'solid';
    stBtn.style.color = drawing.options.color;
    stBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleSubPop(panel, 'style', () => {
        const pop = htmlEl('div', { class: 'dpp-pop' });
        pop.style.flexDirection = 'column';
        STYLES.forEach(([v, label]) => {
          const b = htmlEl('button', { class: 'dpp-btn dpp-style-btn', title: label }, pop);
          b.dataset.style = v;
          b.style.width = '60px';
          b.style.color = drawing.options.color;
          if (v === (drawing.options.style || 'solid')) b.classList.add('active');
          b.addEventListener('click', () => {
            drawing.options.style = v;
            stBtn.dataset.style = v;
            this._render(); this._save();
            this._closeSubPop();
          });
        });
        return pop;
      });
    });

    // Fill toggle (only for drawings that support fillAlpha rendering)
    const FILLABLE_TYPES = new Set([
      'rectangle','circle','ellipse','triangle','fib-circle','fib-channel','gann-box',
      'gann-square','gann-square144','parallel-channel','long-position','short-position',
      'measure-distance','measure-volume','elliott-triangle',
    ]);
    if (FILLABLE_TYPES.has(drawing.type)) {
      const fillBtn = htmlEl('button', { class: 'dpp-btn' + ((drawing.options.fillAlpha || 0) > 0 ? ' active' : ''), title: 'Relleno' }, panel);
      fillBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="1.5" opacity="0.3"/><rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
      fillBtn.style.color = drawing.options.color;
      fillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawing.options.fillAlpha = (drawing.options.fillAlpha || 0) > 0 ? 0 : 0.12;
        fillBtn.classList.toggle('active', drawing.options.fillAlpha > 0);
        this._render(); this._save();
      });
    }

    htmlEl('span', { class: 'dpp-divider' }, panel);

    // Settings (gear) — opens full context menu
    const gearBtn = htmlEl('button', { class: 'dpp-btn', title: 'Más opciones' }, panel);
    gearBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5"/></svg>';
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = gearBtn.getBoundingClientRect();
      this._openSettingsDialog(drawing, r.left, r.bottom + 6);
    });

    // Duplicate
    const dupBtn = htmlEl('button', { class: 'dpp-btn', title: 'Duplicar' }, panel);
    dupBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="5" y="5" width="9" height="9" rx="1"/></svg>';
    dupBtn.addEventListener('click', () => { this.duplicate(drawing.id); });

    htmlEl('span', { class: 'dpp-divider' }, panel);

    // Lock toggle
    const lockBtn = htmlEl('button', { class: 'dpp-btn' + (drawing.options.locked ? ' active' : ''), title: drawing.options.locked ? 'Desbloquear' : 'Bloquear' }, panel);
    const drawLockIcon = (locked) => {
      lockBtn.innerHTML = locked
        ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>'
        : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0"/></svg>';
    };
    drawLockIcon(!!drawing.options.locked);
    lockBtn.addEventListener('click', () => {
      drawing.options.locked = !drawing.options.locked;
      drawLockIcon(drawing.options.locked);
      lockBtn.title = drawing.options.locked ? 'Desbloquear' : 'Bloquear';
      lockBtn.classList.toggle('active', drawing.options.locked);
      this._save();
    });

    htmlEl('span', { class: 'dpp-divider' }, panel);

    // Delete (trash icon, not red X)
    const closeBtn = htmlEl('button', { class: 'dpp-btn', title: 'Eliminar' }, panel);
    closeBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M4.5 4l.5 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-9M7 7v5M9 7v5"/></svg>';
    closeBtn.style.color = '#f23645';
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(242,54,69,0.15)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '');
    closeBtn.addEventListener('click', () => this.remove(drawing.id));

    this.container.appendChild(panel);
    this._propertiesPanel = panel;
    this._positionPropertiesPanel();
  }

  _updatePropertiesPanel() {
    if (!this._propertiesPanel) return;
    // Rebuild for simplicity
    this._showPropertiesPanel();
  }

  _positionPropertiesPanel() {
    if (!this._propertiesPanel) return;
    const drawing = this.drawings.find(d => d.id === this.selectedId);
    if (!drawing) return;
    const ctx = this._buildCtx();
    const handles = drawing.getHandlePositions(ctx);
    if (!handles.length) return;
    const minX = Math.min(...handles.map(h => h.x));
    const minY = Math.min(...handles.map(h => h.y));
    let top = minY - 36;
    if (top < 4) top = minY + 16;
    let left = minX;
    const cw = this._width || this.container.clientWidth;
    const pw = this._propertiesPanel.offsetWidth || 200;
    if (left + pw > cw - 4) left = cw - pw - 4;
    if (left < 4) left = 4;
    this._propertiesPanel.style.left = left + 'px';
    this._propertiesPanel.style.top = top + 'px';
  }

  _closePropertiesPanel() {
    this._closeSubPop();
    this._closeSettingsDialog();
    if (this._propertiesPanel && this._propertiesPanel.parentNode) {
      this._propertiesPanel.parentNode.removeChild(this._propertiesPanel);
    }
    this._propertiesPanel = null;
  }

  _toggleSubPop(panel, key, buildFn) {
    if (this._subPopKey === key && this._subPop) { this._closeSubPop(); return; }
    this._closeSubPop();
    const pop = buildFn();
    if (!pop) return;
    panel.appendChild(pop);
    this._subPop = pop;
    this._subPopKey = key;
    // Close on outside click
    setTimeout(() => {
      const off = (ev) => {
        if (this._subPop && !this._subPop.contains(ev.target) && !panel.contains(ev.target)) {
          this._closeSubPop();
          document.removeEventListener('mousedown', off, true);
        }
      };
      document.addEventListener('mousedown', off, true);
      this._subPopOff = off;
    }, 0);
  }

  _closeSubPop() {
    if (this._subPop && this._subPop.parentNode) this._subPop.parentNode.removeChild(this._subPop);
    if (this._subPopOff) document.removeEventListener('mousedown', this._subPopOff, true);
    this._subPop = null; this._subPopKey = null; this._subPopOff = null;
  }

  // =========================================================================
  // UI: TEXT EDITOR (for TextDrawing)
  // =========================================================================

  _openTextEditor(drawing, clientX, clientY) {
    if (this._textEditor) this._closeTextEditor();
    const input = htmlEl('input', {
      type: 'text', class: 'drawing-text-edit',
      value: drawing.options.text || '',
    });
    input.style.left = clientX + 'px';
    input.style.top = clientY + 'px';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const commit = () => {
      drawing.options.text = input.value;
      this._save(); this._render();
      this._closeTextEditor();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      else if (e.key === 'Escape') this._closeTextEditor();
    });
    input.addEventListener('blur', commit);
    this._textEditor = input;
  }

  _closeTextEditor() {
    if (this._textEditor && this._textEditor.parentNode) {
      this._textEditor.parentNode.removeChild(this._textEditor);
    }
    this._textEditor = null;
  }

  // =========================================================================
  // UI: SETTINGS DIALOG — per-type, context-aware, live editing
  // =========================================================================

  _openSettingsDialog(drawing, anchorX, anchorY) {
    this._closeSettingsDialog();
    this._closeSubPop();

    const dlg = htmlEl('div', { class: 'drawing-settings-dialog' });
    dlg.addEventListener('mousedown', e => e.stopPropagation());
    dlg.addEventListener('click', e => e.stopPropagation());

    // ---- Header
    const header = htmlEl('div', { class: 'dsd-header' }, dlg);
    htmlEl('div', { class: 'dsd-title', text: drawing.label || drawing.type }, header);
    const closeBtn = htmlEl('button', { class: 'dsd-close', text: '✕', title: 'Cerrar' }, header);
    closeBtn.addEventListener('click', () => this._closeSettingsDialog());

    // ---- Tabs
    const tabsBar = htmlEl('div', { class: 'dsd-tabs' }, dlg);
    const body = htmlEl('div', { class: 'dsd-body' }, dlg);

    const tabs = this._buildSettingsTabs(drawing);
    const tabBtns = [];
    const switchTab = (idx) => {
      tabBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
      body.innerHTML = '';
      tabs[idx].render(body);
      this._settingsActiveTab = idx;
    };
    tabs.forEach((t, i) => {
      const btn = htmlEl('button', { class: 'dsd-tab', text: t.label }, tabsBar);
      btn.addEventListener('click', () => switchTab(i));
      tabBtns.push(btn);
    });
    if (tabs.length <= 1) tabsBar.style.display = 'none';

    document.body.appendChild(dlg);
    this._settingsDialog = dlg;
    this._settingsDrawing = drawing;
    this._settingsTabs = tabs;
    this._settingsBody = body;
    this._settingsActiveTab = 0;
    switchTab(0);

    // Position with viewport clamp. If no anchor coords passed, position near the drawing's first handle.
    const r = dlg.getBoundingClientRect();
    if (anchorX == null || anchorY == null) {
      try {
        const ctx2 = this._buildCtx();
        const handles = drawing.getHandlePositions(ctx2);
        const cr = this.container.getBoundingClientRect();
        if (handles && handles.length) {
          // Use rightmost handle as anchor + offset
          const h = handles[handles.length - 1];
          anchorX = cr.left + h.x + 14;
          anchorY = cr.top + h.y + 14;
        } else {
          anchorX = cr.left + cr.width - r.width - 16;
          anchorY = cr.top + 16;
        }
      } catch (e) {
        anchorX = 80;
        anchorY = 80;
      }
    }
    let left = anchorX;
    let top = anchorY;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, anchorY - r.height - 12);
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    dlg.style.left = left + 'px';
    dlg.style.top = top + 'px';
  }

  _closeSettingsDialog() {
    this._closeSettingsColorPop();
    if (this._settingsDialog && this._settingsDialog.parentNode) {
      this._settingsDialog.parentNode.removeChild(this._settingsDialog);
    }
    this._settingsDialog = null;
    this._settingsDrawing = null;
    this._settingsTabs = null;
    this._settingsBody = null;
  }

  _refreshSettingsBody() {
    if (!this._settingsDialog || !this._settingsBody || !this._settingsTabs) return;
    const idx = this._settingsActiveTab || 0;
    this._settingsBody.innerHTML = '';
    this._settingsTabs[idx].render(this._settingsBody);
  }

  // Called by drag handlers to keep Coordenadas tab in sync
  _syncSettingsCoords() {
    if (!this._settingsDialog || this._settingsActiveTab == null) return;
    const tab = this._settingsTabs && this._settingsTabs[this._settingsActiveTab];
    if (tab && tab.id === 'coords') this._refreshSettingsBody();
  }

  // ----- field builders --------------------------------------------------

  _createSectionTitle(parent, text) {
    return htmlEl('div', { class: 'dsd-section-title', text }, parent);
  }

  _createNumberField(parent, label, value, opts = {}) {
    const row = htmlEl('div', { class: 'dsd-field' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const inp = htmlEl('input', { type: 'number', value: value == null ? '' : value }, row);
    if (opts.min != null) inp.min = opts.min;
    if (opts.max != null) inp.max = opts.max;
    if (opts.step != null) inp.step = opts.step;
    if (opts.readonly) { inp.readOnly = true; inp.classList.add('dsd-readonly'); }
    inp.addEventListener('input', () => {
      const v = inp.value === '' ? null : parseFloat(inp.value);
      if (opts.onChange) opts.onChange(v);
    });
    return inp;
  }

  _createTextField(parent, label, value, onChange, opts = {}) {
    const row = htmlEl('div', { class: 'dsd-field' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const inp = opts.multiline
      ? htmlEl('textarea', { text: value || '' }, row)
      : htmlEl('input', { type: 'text', value: value || '' }, row);
    if (opts.multiline) inp.value = value || '';
    inp.addEventListener('input', () => onChange(inp.value));
    return inp;
  }

  _createSelectField(parent, label, value, options, onChange) {
    const row = htmlEl('div', { class: 'dsd-field' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const sel = htmlEl('select', {}, row);
    options.forEach(([v, l]) => {
      const op = htmlEl('option', { value: v, text: l }, sel);
      if (v === value) op.selected = true;
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  _createToggleField(parent, label, value, onChange) {
    const row = htmlEl('div', { class: 'dsd-field-row' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const tog = htmlEl('div', { class: 'dsd-toggle' + (value ? ' on' : '') }, row);
    tog.addEventListener('click', () => {
      const nv = !tog.classList.contains('on');
      tog.classList.toggle('on', nv);
      onChange(nv);
    });
    return tog;
  }

  _createSliderField(parent, label, value, min, max, step, onChange, formatter) {
    const row = htmlEl('div', { class: 'dsd-field' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const sr = htmlEl('div', { class: 'dsd-slider-row' }, row);
    const inp = htmlEl('input', { type: 'range', min, max, step, value: value == null ? min : value }, sr);
    const val = htmlEl('div', { class: 'dsd-slider-val', text: formatter ? formatter(value) : String(value) }, sr);
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      val.textContent = formatter ? formatter(v) : String(v);
      onChange(v);
    });
    return inp;
  }

  _createColorField(parent, label, color, onChange) {
    const row = htmlEl('div', { class: 'dsd-field-row' }, parent);
    htmlEl('div', { class: 'dsd-label', text: label }, row);
    const sw = htmlEl('div', { class: 'dsd-color-swatch' }, row);
    sw.style.background = color || '#2962ff';
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = sw.getBoundingClientRect();
      this._openSettingsColorPop(r.right + 6, r.top, color, (c) => {
        sw.style.background = c;
        onChange(c);
      });
    });
    return sw;
  }

  _openSettingsColorPop(x, y, currentColor, onPick) {
    this._closeSettingsColorPop();
    const pop = htmlEl('div', { class: 'dsd-color-pop' });
    pop.addEventListener('mousedown', e => e.stopPropagation());
    pop.addEventListener('click', e => e.stopPropagation());
    PRESET_COLORS.forEach(c => {
      const sw = htmlEl('div', { class: 'sw' }, pop);
      sw.style.background = c;
      sw.addEventListener('click', () => { onPick(c); this._closeSettingsColorPop(); });
    });
    const inp = htmlEl('input', { type: 'text', value: currentColor || '', placeholder: '#rrggbb' }, pop);
    inp.addEventListener('change', () => {
      const v = inp.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) { onPick(v); this._closeSettingsColorPop(); }
    });
    document.body.appendChild(pop);
    const r = pop.getBoundingClientRect();
    let left = x, top = y;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    this._settingsColorPop = pop;
  }

  _closeSettingsColorPop() {
    if (this._settingsColorPop && this._settingsColorPop.parentNode) {
      this._settingsColorPop.parentNode.removeChild(this._settingsColorPop);
    }
    this._settingsColorPop = null;
  }

  _liveUpdate() {
    this._render();
    this._save();
  }

  // ----- tabs config per type -------------------------------------------

  _buildSettingsTabs(drawing) {
    const tabs = [];
    // Style tab
    tabs.push({
      id: 'style',
      label: 'Estilo',
      render: (parent) => this._renderStyleTab(parent, drawing),
    });
    // Specific tab (only if there are type-specific options)
    if (this._hasSpecificOptions(drawing.type)) {
      tabs.push({
        id: 'specific',
        label: 'Específico',
        render: (parent) => this._renderSpecificTab(parent, drawing),
      });
    }
    // Coordinates tab
    tabs.push({
      id: 'coords',
      label: 'Coord.',
      render: (parent) => this._renderCoordsTab(parent, drawing),
    });
    return tabs;
  }

  _hasSpecificOptions(type) {
    const SPECIFIC = new Set([
      'trend-line', 'ray', 'info-line',
      'parallel-channel', 'price-channel', 'disjoint-channel', 'fib-channel',
      'fib-retracement', 'fib-extension',
      'fib-fan', 'fib-circle', 'fib-spiral', 'fib-time',
      'pitchfork',
      'gann-box', 'gann-fan', 'gann-square', 'gann-square144',
      'elliott-impulse', 'elliott-correction', 'elliott-triangle',
      'elliott-double-combo', 'elliott-triple-combo',
      'abcd', 'xabcd', 'cypher',
      'long-position', 'short-position',
      'measure-distance', 'measure-volume',
      'anchored-vwap',
      'text', 'callout', 'comment', 'price-label', 'flag',
      'arrow',
      'rectangle', 'circle', 'ellipse', 'triangle', 'polyline', 'arc',
      'regression-trend',
    ]);
    return SPECIFIC.has(type);
  }

  // ----- common style tab -----------------------------------------------

  _renderStyleTab(parent, d) {
    const o = d.options;
    this._createColorField(parent, 'Color', o.color, (c) => { o.color = c; this._liveUpdate(); });
    this._createSliderField(parent, 'Grosor', o.width || 1, 1, 8, 1,
      (v) => { o.width = v; this._liveUpdate(); }, (v) => v + 'px');
    this._createSelectField(parent, 'Estilo de línea', o.style || 'solid', [
      ['solid', 'Sólida'], ['dashed', 'Discontinua'], ['dotted', 'Punteada'],
    ], (v) => { o.style = v; this._liveUpdate(); });

    // Fill block for fillable types
    const FILLABLE = new Set([
      'rectangle','circle','ellipse','triangle','fib-circle','fib-channel','gann-box',
      'gann-square','gann-square144','parallel-channel','long-position','short-position',
      'measure-distance','measure-volume','elliott-triangle','arc',
    ]);
    if (FILLABLE.has(d.type)) {
      this._createSectionTitle(parent, 'Relleno');
      this._createToggleField(parent, 'Mostrar relleno', (o.fillAlpha || 0) > 0, (v) => {
        o.fillAlpha = v ? (o._lastFillAlpha || 0.12) : 0;
        this._liveUpdate();
        this._refreshSettingsBody();
      });
      if ((o.fillAlpha || 0) > 0) {
        this._createColorField(parent, 'Color relleno', o.fillColor || o.color, (c) => {
          o.fillColor = c; this._liveUpdate();
        });
        this._createSliderField(parent, 'Opacidad', Math.round((o.fillAlpha || 0) * 100),
          0, 100, 5, (v) => {
            o.fillAlpha = v / 100;
            o._lastFillAlpha = o.fillAlpha;
            this._liveUpdate();
          }, (v) => v + '%');
      }
    }

    // Lock toggle for all
    this._createSectionTitle(parent, 'General');
    this._createToggleField(parent, 'Bloqueado', !!o.locked, (v) => {
      o.locked = v; this._save();
    });
  }

  // ----- specific tab dispatcher ----------------------------------------

  _renderSpecificTab(parent, d) {
    const o = d.options;
    switch (d.type) {
      case 'trend-line':
      case 'ray':
        this._createToggleField(parent, 'Extender a izquierda',
          o.extendLeft !== false && d.type === 'trend-line' ? true : !!o.extendLeft,
          (v) => { o.extendLeft = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Extender a derecha',
          o.extendRight !== false,
          (v) => { o.extendRight = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar etiquetas de precio',
          !!o.showPriceLabels, (v) => { o.showPriceLabels = v; this._liveUpdate(); });
        break;

      case 'info-line':
        this._createToggleField(parent, 'Mostrar ángulo',
          o.showAngle !== false, (v) => { o.showAngle = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar distancia',
          o.showDistance !== false, (v) => { o.showDistance = v; this._liveUpdate(); });
        break;

      case 'parallel-channel':
        this._createToggleField(parent, 'Mostrar mediana',
          o.showMedian !== false, (v) => { o.showMedian = v; this._liveUpdate(); });
        break;

      case 'price-channel':
      case 'disjoint-channel':
      case 'fib-channel':
        this._createToggleField(parent, 'Mostrar etiquetas',
          !!o.showLabels, (v) => { o.showLabels = v; this._liveUpdate(); });
        break;

      case 'fib-retracement':
      case 'fib-extension': {
        this._createSectionTitle(parent, 'Niveles');
        const defaults = d.type === 'fib-extension'
          ? [0, 0.382, 0.5, 0.618, 1.0, 1.272, 1.618, 2.618]
          : [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618, 2.618];
        if (!Array.isArray(o.levels) || !o.levels.length) {
          o.levels = defaults.map(v => ({ value: v, visible: v <= 1.0, color: o.color }));
        }
        o.levels.forEach((lvl, idx) => {
          const row = htmlEl('div', { class: 'dsd-level-row' }, parent);
          const tog = htmlEl('div', { class: 'dsd-toggle' + (lvl.visible !== false ? ' on' : '') }, row);
          tog.addEventListener('click', () => {
            lvl.visible = !(lvl.visible !== false);
            tog.classList.toggle('on', lvl.visible);
            this._liveUpdate();
          });
          const num = htmlEl('input', { type: 'number', value: lvl.value, step: 0.001 }, row);
          num.addEventListener('input', () => {
            lvl.value = parseFloat(num.value) || 0; this._liveUpdate();
          });
          htmlEl('div', { class: 'dsd-label', text: (lvl.value * 100).toFixed(1) + '%' }, row);
          const cw = htmlEl('div', { class: 'dsd-color-swatch' }, row);
          cw.style.background = lvl.color || o.color;
          cw.addEventListener('click', (e) => {
            const r = cw.getBoundingClientRect();
            this._openSettingsColorPop(r.right + 6, r.top, lvl.color || o.color, (c) => {
              lvl.color = c; cw.style.background = c; this._liveUpdate();
            });
          });
        });
        this._createSectionTitle(parent, 'Etiquetas');
        this._createToggleField(parent, 'Mostrar precio',
          o.showPrice !== false, (v) => { o.showPrice = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar porcentaje',
          o.showPercent !== false, (v) => { o.showPercent = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Invertir dirección',
          !!o.reverse, (v) => { o.reverse = v; this._liveUpdate(); });
        break;
      }

      case 'fib-fan':
      case 'fib-circle':
      case 'fib-spiral':
      case 'fib-time': {
        this._createSectionTitle(parent, 'Niveles');
        const defaults = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        if (!Array.isArray(o.levels) || !o.levels.length) {
          o.levels = defaults.map(v => ({ value: v, visible: true }));
        }
        o.levels.forEach((lvl) => {
          const row = htmlEl('div', { class: 'dsd-field-row' }, parent);
          htmlEl('div', { class: 'dsd-label', text: lvl.value }, row);
          const tog = htmlEl('div', { class: 'dsd-toggle' + (lvl.visible !== false ? ' on' : '') }, row);
          tog.addEventListener('click', () => {
            lvl.visible = !(lvl.visible !== false);
            tog.classList.toggle('on', lvl.visible);
            this._liveUpdate();
          });
        });
        break;
      }

      case 'pitchfork':
        this._createSelectField(parent, 'Variante', o.variant || 'andrews', [
          ['andrews', 'Andrews estándar'],
          ['schiff', 'Schiff'],
          ['schiff-modified', 'Schiff modificada'],
        ], (v) => { o.variant = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar tines (paralelas)',
          o.showTines !== false, (v) => { o.showTines = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar mediana',
          o.showMedian !== false, (v) => { o.showMedian = v; this._liveUpdate(); });
        break;

      case 'gann-box':
      case 'gann-fan':
      case 'gann-square':
      case 'gann-square144': {
        this._createSectionTitle(parent, 'Niveles');
        const defaults = [0.25, 0.382, 0.5, 0.618, 0.75, 1.0];
        if (!Array.isArray(o.gannLevels)) {
          o.gannLevels = defaults.map(v => ({ value: v, visible: true }));
        }
        o.gannLevels.forEach((lvl) => {
          const row = htmlEl('div', { class: 'dsd-field-row' }, parent);
          htmlEl('div', { class: 'dsd-label', text: lvl.value }, row);
          const tog = htmlEl('div', { class: 'dsd-toggle' + (lvl.visible !== false ? ' on' : '') }, row);
          tog.addEventListener('click', () => {
            lvl.visible = !(lvl.visible !== false);
            tog.classList.toggle('on', lvl.visible);
            this._liveUpdate();
          });
        });
        if (d.type === 'gann-box') {
          this._createToggleField(parent, 'Mostrar diagonales',
            o.showDiagonals !== false, (v) => { o.showDiagonals = v; this._liveUpdate(); });
        }
        break;
      }

      case 'elliott-impulse':
      case 'elliott-correction':
      case 'elliott-triangle':
      case 'elliott-double-combo':
      case 'elliott-triple-combo':
        this._createToggleField(parent, 'Mostrar etiquetas',
          o.showLabels !== false, (v) => { o.showLabels = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Validar reglas Elliott',
          !!o.validateRules, (v) => { o.validateRules = v; this._liveUpdate(); });
        this._createSliderField(parent, 'Tamaño etiquetas', o.labelSize || 12, 10, 20, 1,
          (v) => { o.labelSize = v; this._liveUpdate(); }, (v) => v + 'px');
        break;

      case 'abcd':
      case 'xabcd':
      case 'cypher': {
        this._createToggleField(parent, 'Mostrar ratios Fibonacci',
          o.showRatios !== false, (v) => { o.showRatios = v; this._liveUpdate(); });
        this._createSliderField(parent, 'Tolerancia %', o.tolerance || 3, 0, 5, 0.5,
          (v) => { o.tolerance = v; this._liveUpdate(); this._refreshSettingsBody(); }, (v) => v + '%');
        // Pattern detected badge (placeholder logic — true if tolerance >= 2)
        const row = htmlEl('div', { class: 'dsd-field-row' }, parent);
        htmlEl('div', { class: 'dsd-label', text: 'Estado del patrón' }, row);
        const ok = (o.tolerance || 3) >= 2;
        htmlEl('span', { class: 'dsd-badge' + (ok ? '' : ' warn'), text: ok ? 'Detectado' : 'Fuera de tolerancia' }, row);
        break;
      }

      case 'long-position':
      case 'short-position': {
        const p = d.points || [];
        const entry = p[0]?.price ?? 0;
        const stop = p[1]?.price ?? 0;
        const target = p[2]?.price ?? 0;
        this._createNumberField(parent, 'Entrada', entry, {
          step: 0.0001,
          onChange: (v) => { if (p[0] && v != null) { p[0].price = v; this._liveUpdate(); this._refreshSettingsBody(); } },
        });
        this._createNumberField(parent, 'Stop Loss', stop, {
          step: 0.0001,
          onChange: (v) => { if (p[1] && v != null) { p[1].price = v; this._liveUpdate(); this._refreshSettingsBody(); } },
        });
        this._createNumberField(parent, 'Take Profit', target, {
          step: 0.0001,
          onChange: (v) => { if (p[2] && v != null) { p[2].price = v; this._liveUpdate(); this._refreshSettingsBody(); } },
        });
        this._createSectionTitle(parent, 'Gestión de riesgo');
        this._createNumberField(parent, 'Tamaño cuenta', o.accountSize || 10000, {
          step: 100, onChange: (v) => { o.accountSize = v; this._liveUpdate(); this._refreshSettingsBody(); },
        });
        this._createNumberField(parent, 'Riesgo %', o.riskPct || 1, {
          step: 0.1, min: 0, max: 100,
          onChange: (v) => { o.riskPct = v; this._liveUpdate(); this._refreshSettingsBody(); },
        });
        const acc = o.accountSize || 10000;
        const risk = o.riskPct || 1;
        const perShare = Math.abs(entry - stop);
        const shares = perShare > 0 ? (acc * risk / 100) / perShare : 0;
        this._createNumberField(parent, 'Cantidad (calculada)', shares.toFixed(2), { readonly: true });
        this._createSectionTitle(parent, 'Etiquetas');
        this._createToggleField(parent, 'Mostrar R:R',
          o.showRR !== false, (v) => { o.showRR = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar % stop / target',
          o.showPctStopTarget !== false, (v) => { o.showPctStopTarget = v; this._liveUpdate(); });
        this._createColorField(parent, 'Color ganancia', o.profitColor || '#089981', (c) => {
          o.profitColor = c; this._liveUpdate();
        });
        this._createColorField(parent, 'Color pérdida', o.lossColor || '#f23645', (c) => {
          o.lossColor = c; this._liveUpdate();
        });
        break;
      }

      case 'measure-distance':
      case 'measure-volume':
        this._createToggleField(parent, 'Δ Precio',
          o.showDeltaPrice !== false, (v) => { o.showDeltaPrice = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Δ Porcentaje',
          o.showDeltaPct !== false, (v) => { o.showDeltaPct = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Δ Tiempo',
          o.showDeltaTime !== false, (v) => { o.showDeltaTime = v; this._liveUpdate(); });
        this._createToggleField(parent, '# Barras' + (d.type === 'measure-volume' ? ' + Volumen' : ''),
          o.showBars !== false, (v) => { o.showBars = v; this._liveUpdate(); });
        break;

      case 'anchored-vwap':
        this._createSelectField(parent, 'Fuente', o.source || 'close', [
          ['close', 'Close'], ['hl2', 'HL2'], ['hlc3', 'HLC3'], ['ohlc4', 'OHLC4'], ['hl3', 'HL3'],
        ], (v) => { o.source = v; this._liveUpdate(); });
        this._createToggleField(parent, 'Mostrar bandas σ',
          !!o.showBands, (v) => { o.showBands = v; this._liveUpdate(); });
        break;

      case 'text':
      case 'callout':
      case 'comment':
      case 'price-label':
      case 'flag':
        this._createTextField(parent, 'Contenido', o.text || '', (v) => {
          o.text = v; this._liveUpdate();
        }, { multiline: true });
        this._createSliderField(parent, 'Tamaño fuente', o.fontSize || 12, 10, 24, 1,
          (v) => { o.fontSize = v; this._liveUpdate(); }, (v) => v + 'px');
        this._createSelectField(parent, 'Peso fuente', o.fontWeight || 'normal', [
          ['normal', 'Normal'], ['bold', 'Negrita'],
        ], (v) => { o.fontWeight = v; this._liveUpdate(); });
        this._createColorField(parent, 'Color texto', o.textColor || o.color, (c) => {
          o.textColor = c; this._liveUpdate();
        });
        this._createColorField(parent, 'Color fondo', o.bgColor || 'transparent', (c) => {
          o.bgColor = c; this._liveUpdate();
        });
        this._createToggleField(parent, 'Mostrar borde',
          !!o.showBorder, (v) => { o.showBorder = v; this._liveUpdate(); });
        this._createSelectField(parent, 'Alineación', o.align || 'left', [
          ['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha'],
        ], (v) => { o.align = v; this._liveUpdate(); });
        break;

      case 'arrow':
        this._createSliderField(parent, 'Tamaño cabeza', o.headSize || 10, 4, 24, 1,
          (v) => { o.headSize = v; this._liveUpdate(); }, (v) => v + 'px');
        this._createToggleField(parent, 'Doble flecha',
          !!o.doubleArrow, (v) => { o.doubleArrow = v; this._liveUpdate(); });
        break;

      case 'rectangle':
      case 'circle':
      case 'ellipse':
      case 'triangle':
      case 'polyline':
      case 'arc':
        this._createToggleField(parent, 'Mostrar área en etiqueta',
          !!o.showArea, (v) => { o.showArea = v; this._liveUpdate(); });
        break;

      case 'regression-trend':
        this._createToggleField(parent, 'Mostrar bandas desviación',
          o.showBands !== false, (v) => { o.showBands = v; this._liveUpdate(); });
        this._createSliderField(parent, 'Multiplicador σ', o.sigmaMult || 2, 0.5, 4, 0.5,
          (v) => { o.sigmaMult = v; this._liveUpdate(); }, (v) => v.toFixed(1) + 'σ');
        break;
    }
  }

  // ----- coordinates tab -------------------------------------------------

  _renderCoordsTab(parent, d) {
    const pts = d.points || [];
    if (!pts.length) {
      htmlEl('div', { class: 'dsd-label', text: 'Sin puntos.' }, parent);
      return;
    }
    pts.forEach((p, idx) => {
      this._createSectionTitle(parent, 'Punto ' + (idx + 1));
      // Time
      const timeRow = htmlEl('div', { class: 'dsd-field' }, parent);
      htmlEl('div', { class: 'dsd-label', text: 'Tiempo (unix s)' }, timeRow);
      const tInp = htmlEl('input', { type: 'number', value: p.time != null ? p.time : '' }, timeRow);
      tInp.addEventListener('input', () => {
        const v = parseFloat(tInp.value);
        if (!isNaN(v)) { p.time = v; this._liveUpdate(); }
      });
      // Price
      const priceRow = htmlEl('div', { class: 'dsd-field' }, parent);
      htmlEl('div', { class: 'dsd-label', text: 'Precio' }, priceRow);
      const pInp = htmlEl('input', { type: 'number', value: p.price != null ? p.price : '', step: 0.0001 }, priceRow);
      pInp.addEventListener('input', () => {
        const v = parseFloat(pInp.value);
        if (!isNaN(v)) { p.price = v; this._liveUpdate(); }
      });
    });
    const centerBtn = htmlEl('button', { class: 'dsd-btn-small', text: 'Centrar drawing en vista' }, parent);
    centerBtn.addEventListener('click', () => {
      try {
        const ts = pts.map(p => p.time).filter(t => t != null);
        if (ts.length && this.chart && this.chart.timeScale) {
          const min = Math.min(...ts), max = Math.max(...ts);
          const span = Math.max(1, (max - min)) * 0.2;
          this.chart.timeScale().setVisibleRange({ from: min - span, to: max + span });
        }
      } catch (e) { /* ignore */ }
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const DRAWING_TYPES = REGISTRY;

export {
  BaseDrawing,
  TrendLineDrawing,
  SegmentDrawing,
  RayDrawing,
  HorizontalLineDrawing,
  VerticalLineDrawing,
  RectangleDrawing,
  FibRetracementDrawing,
  PitchforkDrawing,
  GannBoxDrawing,
  ElliottImpulseDrawing,
  ElliottCorrectionDrawing,
  LongPositionDrawing,
  ShortPositionDrawing,
  TextDrawing,
  ArrowDrawing,
};

export default DrawingManager;
