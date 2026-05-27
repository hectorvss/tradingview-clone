// ui-polish.js — shared UI polish for standalone TradingView-style panels.
//
// Provides:
//   - ensurePolishStyles()  : injects a single global stylesheet exposing
//                             palette utilities + class overrides keyed off the
//                             panel-specific prefixes (.scr-, .am-, .wlm-,
//                             .nip-, .ec-, .tcalc-, .pt-).
//   - showToast(msg, opts)  : bottom-right toast, auto-dismiss (default 2000ms).
//   - debounce(fn, wait)    : trailing debounce helper (default 200ms).
//   - emptyStateHTML(...)   : standardised empty-state HTML snippet.
//   - skeletonRowsHTML(...) : skeleton table rows with shimmer animation.
//   - PALETTE               : the canonical color tokens.
//
// Importing this module is side-effect free; styles are injected lazily on
// first ensurePolishStyles() call.

export const PALETTE = Object.freeze({
  bg: '#0f0f0f',
  card: '#131722',
  hover: '#1e222d',
  border: '#2a2e39',
  accent: '#2962ff',
  accentHover: '#1976d2',
  up: '#089981',
  down: '#f23645',
  text: '#d1d4dc',
  muted: '#787b86',
  rowAlt: '#15191e',
});

const STYLE_ID = 'tv-ui-polish-styles';

export function ensurePolishStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
/* ---------- shared keyframes ---------- */
@keyframes tv-polish-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes tv-polish-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tv-polish-toast-in {
  from { opacity: 0; transform: translate(0, 12px); }
  to   { opacity: 1; transform: translate(0, 0); }
}
@keyframes tv-polish-toast-out {
  from { opacity: 1; transform: translate(0, 0); }
  to   { opacity: 0; transform: translate(0, 12px); }
}

/* ---------- empty state ---------- */
.tv-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: ${PALETTE.muted};
  font-size: 13px;
  text-align: center;
  min-height: 160px;
  animation: tv-polish-fade-in 180ms ease;
}
.tv-empty-state .tv-empty-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${PALETTE.hover};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${PALETTE.muted};
  font-size: 20px;
  margin-bottom: 4px;
}
.tv-empty-state .tv-empty-title {
  color: ${PALETTE.text};
  font-weight: 500;
  font-size: 14px;
}
.tv-empty-state .tv-empty-hint {
  color: ${PALETTE.muted};
  font-size: 12px;
  max-width: 320px;
  line-height: 1.4;
}

/* ---------- skeleton shimmer ---------- */
.tv-skeleton {
  display: inline-block;
  background: linear-gradient(
    90deg,
    ${PALETTE.hover} 0%,
    #262a35 50%,
    ${PALETTE.hover} 100%
  );
  background-size: 800px 100%;
  animation: tv-polish-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
  height: 12px;
  min-width: 40px;
}
.tv-skeleton.tv-skeleton-row {
  display: block;
  width: 100%;
  height: 16px;
  margin: 6px 0;
}

/* ---------- toast ---------- */
.tv-toast-container {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.tv-toast {
  background: ${PALETTE.card};
  color: ${PALETTE.text};
  border: 1px solid ${PALETTE.border};
  border-left: 3px solid ${PALETTE.accent};
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 6px 18px rgba(0,0,0,0.45);
  animation: tv-polish-toast-in 180ms ease;
  pointer-events: auto;
  max-width: 360px;
  word-break: break-word;
}
.tv-toast.is-success { border-left-color: ${PALETTE.up}; }
.tv-toast.is-error   { border-left-color: ${PALETTE.down}; }
.tv-toast.is-leaving { animation: tv-polish-toast-out 180ms ease forwards; }

/* ---------- search field with icon ---------- */
.tv-search-field {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.tv-search-field > input {
  background: ${PALETTE.hover};
  border: 1px solid ${PALETTE.border};
  color: ${PALETTE.text};
  border-radius: 4px;
  padding: 8px 12px 8px 30px;
  font-size: 13px;
  outline: none;
  min-width: 200px;
  transition: border-color 100ms ease;
}
.tv-search-field > input::placeholder { color: ${PALETTE.muted}; }
.tv-search-field > input:focus { border-color: ${PALETTE.accent}; }
.tv-search-field::before {
  content: "";
  position: absolute;
  left: 10px;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23787b86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>");
  background-repeat: no-repeat;
  background-size: contain;
  pointer-events: none;
  opacity: 0.85;
}

/* =================================================================== */
/* ===  Per-panel polish overrides keyed off existing class prefixes  === */
/* =================================================================== */

/* numeric cells use tabular-nums everywhere */
.scr-root, .am-root, .wlm-root, .nip-root, .ec-root, .tcalc-root, .pt-root {
  font-variant-numeric: tabular-nums;
}
.scr-table td, .am-table td, .wlm-table td, .ec-table td, .pt-root table td {
  font-variant-numeric: tabular-nums;
}

/* sticky table headers across all panels */
.scr-table thead th,
.am-table thead th,
.wlm-table thead th,
.ec-table thead th,
.pt-root table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${PALETTE.card};
  border-bottom: 1px solid ${PALETTE.border};
}

/* alternating row backgrounds (subtle) + hover */
.scr-table tbody tr:nth-child(even),
.am-table tbody tr:nth-child(even),
.wlm-table tbody tr:nth-child(even),
.ec-table tbody tr:nth-child(even),
.pt-root table tbody tr:nth-child(even) {
  background: ${PALETTE.rowAlt};
}
.scr-table tbody tr:hover,
.am-table tbody tr:hover,
.wlm-table tbody tr:hover,
.ec-table tbody tr:hover,
.pt-root table tbody tr:hover {
  background: ${PALETTE.hover};
}

/* primary buttons normalisation (only for buttons explicitly tagged primary) */
.scr-btn.is-primary,
.am-btn.is-primary,
.wlm-btn.is-primary,
.nip-btn.is-primary,
.ec-btn.is-primary,
.tcalc-btn.is-primary,
.pt-btn.is-primary {
  background: ${PALETTE.accent};
  color: #fff;
  border: 1px solid ${PALETTE.accent};
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease;
}
.scr-btn.is-primary:hover,
.am-btn.is-primary:hover,
.wlm-btn.is-primary:hover,
.nip-btn.is-primary:hover,
.ec-btn.is-primary:hover,
.tcalc-btn.is-primary:hover,
.pt-btn.is-primary:hover {
  background: ${PALETTE.accentHover};
  border-color: ${PALETTE.accentHover};
}
.scr-btn.is-primary:disabled,
.am-btn.is-primary:disabled,
.wlm-btn.is-primary:disabled,
.nip-btn.is-primary:disabled,
.ec-btn.is-primary:disabled,
.tcalc-btn.is-primary:disabled,
.pt-btn.is-primary:disabled {
  background: ${PALETTE.border};
  border-color: ${PALETTE.border};
  color: ${PALETTE.muted};
  cursor: not-allowed;
}

/* chip-style filters */
.tv-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${PALETTE.hover};
  color: ${PALETTE.text};
  border: 1px solid ${PALETTE.border};
  font-size: 12px;
  cursor: pointer;
  transition: background 100ms ease, color 100ms ease, border-color 100ms ease;
  user-select: none;
}
.tv-chip:hover { background: #262a35; }
.tv-chip.is-active {
  background: ${PALETTE.accent};
  color: #fff;
  border-color: ${PALETTE.accent};
}

/* form input normalisation (opt-in via .tv-input class, non-destructive) */
.tv-input {
  background: ${PALETTE.hover};
  border: 1px solid ${PALETTE.border};
  color: ${PALETTE.text};
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 100ms ease;
}
.tv-input:focus { border-color: ${PALETTE.accent}; }

/* modal backdrops (opt-in via .tv-modal-backdrop / .tv-modal) */
.tv-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: tv-polish-fade-in 160ms ease;
}
.tv-modal {
  background: ${PALETTE.card};
  border: 1px solid ${PALETTE.border};
  border-radius: 8px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.55);
  animation: tv-polish-fade-in 200ms ease;
  max-width: 92vw;
  max-height: 86vh;
  overflow: auto;
}

/* responsive grid utility */
@media (max-width: 900px) {
  .tv-responsive-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
}
@media (max-width: 560px) {
  .tv-responsive-grid { grid-template-columns: 1fr !important; }
}
`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function ensureToastContainer() {
  ensurePolishStyles();
  let c = document.querySelector('.tv-toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'tv-toast-container';
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message, opts = {}) {
  if (typeof document === 'undefined') return;
  const { duration = 2000, type = 'default' } = opts;
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = 'tv-toast' + (type !== 'default' ? ' is-' + type : '');
  el.textContent = message;
  container.appendChild(el);
  const remove = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  };
  setTimeout(remove, duration);
  return el;
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

export function debounce(fn, wait = 200) {
  let t = null;
  const debounced = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = () => { if (t) { clearTimeout(t); t = null; } };
  return debounced;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function emptyStateHTML(title, hint = '', icon = '∅') {
  ensurePolishStyles();
  return (
    '<div class="tv-empty-state">' +
      '<div class="tv-empty-icon">' + esc(icon) + '</div>' +
      '<div class="tv-empty-title">' + esc(title) + '</div>' +
      (hint ? '<div class="tv-empty-hint">' + esc(hint) + '</div>' : '') +
    '</div>'
  );
}

export function skeletonRowsHTML(rows = 6, cols = 4) {
  ensurePolishStyles();
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr>';
    for (let j = 0; j < cols; j++) {
      const w = 40 + ((i * 7 + j * 13) % 60);
      html += '<td><span class="tv-skeleton" style="width:' + w + '%"></span></td>';
    }
    html += '</tr>';
  }
  return html;
}
