/**
 * drawing-templates.js
 * Drawing Templates Manager — TradingView-style "Plantillas de dibujo".
 *
 * Exports:
 *   createDrawingTemplateManager(opts) -> {
 *     open(currentDrawings),
 *     saveCurrent(currentDrawings, name),
 *     loadTemplate(name),
 *     listTemplates(),
 *     deleteTemplate(name),
 *     exportTemplate(name),
 *     importTemplate(json),
 *     destroy(),
 *   }
 *
 * Self-contained — no external deps. Dark theme matching TradingView modal style.
 * Persists to localStorage key "tv.drawing_templates".
 */

'use strict';

const STORAGE_KEY = 'tv.drawing_templates';
const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

const BUILTIN_TEMPLATES = [
    {
        name: 'Soporte/Resistencia básico',
        builtin: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        drawings: [
            { type: 'horizontalLine', price: 0, color: '#26a69a', lineWidth: 2, lineStyle: 0, label: 'Soporte 1' },
            { type: 'horizontalLine', price: 0, color: '#26a69a', lineWidth: 1, lineStyle: 2, label: 'Soporte 2' },
            { type: 'horizontalLine', price: 0, color: '#ef5350', lineWidth: 2, lineStyle: 0, label: 'Resistencia 1' },
            { type: 'horizontalLine', price: 0, color: '#ef5350', lineWidth: 1, lineStyle: 2, label: 'Resistencia 2' },
        ],
    },
    {
        name: 'Fibonacci completo',
        builtin: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        drawings: [
            {
                type: 'fibRetracement',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618],
                colors: ['#787b86', '#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#26a69a', '#2196f3', '#9c27b0', '#e91e63', '#795548'],
                lineWidth: 1,
                lineStyle: 0,
            },
            {
                type: 'fibExtension',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                levels: [0, 0.618, 1.0, 1.618, 2.618],
                colors: ['#787b86', '#26a69a', '#2196f3', '#9c27b0', '#e91e63'],
                lineWidth: 1,
                lineStyle: 1,
            },
        ],
    },
    {
        name: 'Order Blocks SMC',
        builtin: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        drawings: [
            {
                type: 'rectangle',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                color: 'rgba(38, 166, 154, 0.25)',
                borderColor: '#26a69a',
                lineWidth: 1,
                lineStyle: 0,
                label: 'Bullish OB',
            },
            {
                type: 'rectangle',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                color: 'rgba(239, 83, 80, 0.25)',
                borderColor: '#ef5350',
                lineWidth: 1,
                lineStyle: 0,
                label: 'Bearish OB',
            },
            {
                type: 'rectangle',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                color: 'rgba(255, 193, 7, 0.20)',
                borderColor: '#ffc107',
                lineWidth: 1,
                lineStyle: 2,
                label: 'FVG (Fair Value Gap)',
            },
            {
                type: 'horizontalLine',
                price: 0,
                color: '#2196f3',
                lineWidth: 1,
                lineStyle: 1,
                label: 'BOS / Liquidity',
            },
        ],
    },
    {
        name: 'Pitchfork + canales',
        builtin: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        drawings: [
            {
                type: 'pitchfork',
                p1: { time: 0, price: 0 },
                p2: { time: 0, price: 0 },
                p3: { time: 0, price: 0 },
                color: '#9c27b0',
                lineWidth: 2,
                lineStyle: 0,
                medianColor: '#e91e63',
            },
            {
                type: 'parallelChannel',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                width: 0,
                color: 'rgba(33, 150, 243, 0.15)',
                borderColor: '#2196f3',
                lineWidth: 1,
                lineStyle: 0,
            },
            {
                type: 'trendLine',
                start: { time: 0, price: 0 },
                end: { time: 0, price: 0 },
                color: '#4caf50',
                lineWidth: 2,
                lineStyle: 0,
                extendRight: true,
            },
        ],
    },
    {
        name: 'Análisis Elliott',
        builtin: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        drawings: [
            {
                type: 'elliottWave',
                degree: 'intermediate',
                points: [
                    { time: 0, price: 0, label: '1' },
                    { time: 0, price: 0, label: '2' },
                    { time: 0, price: 0, label: '3' },
                    { time: 0, price: 0, label: '4' },
                    { time: 0, price: 0, label: '5' },
                ],
                color: '#2196f3',
                lineWidth: 2,
                lineStyle: 0,
                showLabels: true,
            },
            {
                type: 'elliottWave',
                degree: 'minor',
                points: [
                    { time: 0, price: 0, label: 'A' },
                    { time: 0, price: 0, label: 'B' },
                    { time: 0, price: 0, label: 'C' },
                ],
                color: '#ef5350',
                lineWidth: 2,
                lineStyle: 1,
                showLabels: true,
            },
        ],
    },
];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function safeStorage() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch (e) { /* ignored */ }
    // In-memory fallback so the module never crashes server-side.
    const mem = {};
    return {
        getItem: (k) => (k in mem ? mem[k] : null),
        setItem: (k, v) => { mem[k] = String(v); },
        removeItem: (k) => { delete mem[k]; },
    };
}

function loadAll() {
    const store = safeStorage();
    try {
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return seedBuiltins();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.templates)) {
            return seedBuiltins();
        }
        // Always ensure builtins exist by name.
        const map = new Map(parsed.templates.map((t) => [t.name, t]));
        for (const b of BUILTIN_TEMPLATES) {
            if (!map.has(b.name)) map.set(b.name, deepClone(b));
        }
        return { version: SCHEMA_VERSION, templates: Array.from(map.values()) };
    } catch (e) {
        return seedBuiltins();
    }
}

function seedBuiltins() {
    return {
        version: SCHEMA_VERSION,
        templates: BUILTIN_TEMPLATES.map(deepClone),
    };
}

function persist(state) {
    const store = safeStorage();
    try {
        store.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (e) {
        return false;
    }
}

function deepClone(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(deepClone);
    const out = {};
    for (const k of Object.keys(value)) out[k] = deepClone(value[k]);
    return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateTemplate(tpl) {
    if (!tpl || typeof tpl !== 'object') return 'Plantilla no es un objeto';
    if (typeof tpl.name !== 'string' || !tpl.name.trim()) return 'Falta el nombre';
    if (!Array.isArray(tpl.drawings)) return 'drawings debe ser un array';
    for (let i = 0; i < tpl.drawings.length; i++) {
        const d = tpl.drawings[i];
        if (!d || typeof d !== 'object') return `Dibujo ${i} inválido`;
        if (typeof d.type !== 'string' || !d.type) return `Dibujo ${i} sin tipo`;
    }
    return null; // ok
}

function serializeDrawings(drawings) {
    if (!Array.isArray(drawings)) return [];
    return drawings.map((d) => {
        if (!d || typeof d !== 'object') return null;
        return deepClone(d);
    }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
        for (const k of Object.keys(attrs)) {
            const v = attrs[k];
            if (k === 'style' && v && typeof v === 'object') {
                Object.assign(node.style, v);
            } else if (k === 'class' || k === 'className') {
                node.className = v;
            } else if (k === 'dataset' && v && typeof v === 'object') {
                for (const dk of Object.keys(v)) node.dataset[dk] = v[dk];
            } else if (k.startsWith('on') && typeof v === 'function') {
                node.addEventListener(k.slice(2).toLowerCase(), v);
            } else if (v === true) {
                node.setAttribute(k, '');
            } else if (v !== false && v != null) {
                node.setAttribute(k, String(v));
            }
        }
    }
    if (children != null) {
        const list = Array.isArray(children) ? children : [children];
        for (const c of list) {
            if (c == null || c === false) continue;
            node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        }
    }
    return node;
}

function injectStylesOnce() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tv-drawing-templates-styles')) return;
    const css = `
@keyframes tv-dtm-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tv-dtm-pop-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
}
.tv-dtm-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif;
    color: #d1d4dc;
    animation: tv-dtm-fade-in .15s ease-out;
}
.tv-dtm-modal {
    width: min(720px, 94vw);
    max-width: 720px;
    max-height: 90vh;
    background: #131722;
    border: 1px solid #2a2e39;
    border-radius: 8px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.6);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: tv-dtm-pop-in .15s ease-out;
}
.tv-dtm-modal:focus { outline: none; }
.tv-dtm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #2a2e39;
    background: #131722;
}
.tv-dtm-title { font-size: 14px; font-weight: 600; color: #f0f3fa; }
.tv-dtm-close {
    width: 24px; height: 24px;
    background: transparent; border: 0; color: #787b86; cursor: pointer;
    font-size: 22px; line-height: 1; padding: 0; border-radius: 4px;
    display: inline-flex; align-items: center; justify-content: center;
}
.tv-dtm-close:hover { background: #2a2e39; color: #f0f3fa; }
.tv-dtm-close:focus-visible { outline: 2px solid #2962ff; outline-offset: 1px; }
.tv-dtm-toolbar {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 12px 18px;
    border-bottom: 1px solid #2a2e39;
    background: #1a1d29;
}
.tv-dtm-btn {
    background: #2a2e39; color: #d1d4dc;
    border: 1px solid #363a45; border-radius: 4px;
    height: 32px; padding: 0 14px; font-size: 13px; cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
    font-family: inherit;
    display: inline-flex; align-items: center; justify-content: center;
}
.tv-dtm-btn:hover { background: #363a45; border-color: #4a4f5c; }
.tv-dtm-btn:focus-visible { outline: 2px solid #2962ff; outline-offset: 1px; }
.tv-dtm-btn.primary { background: #2962ff; border-color: #2962ff; color: #fff; }
.tv-dtm-btn.primary:hover { background: #1976d2; border-color: #1976d2; }
.tv-dtm-btn.danger { color: #ef5350; }
.tv-dtm-btn.danger:hover { background: #3a2326; border-color: #ef5350; }
.tv-dtm-list {
    flex: 1; overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2e39 transparent;
}
.tv-dtm-list::-webkit-scrollbar { width: 8px; }
.tv-dtm-list::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
.tv-dtm-list::-webkit-scrollbar-thumb:hover { background: #363a45; }
.tv-dtm-list::-webkit-scrollbar-track { background: transparent; }
.tv-dtm-empty {
    padding: 32px 18px; text-align: center; color: #787b86; font-size: 13px;
}
.tv-dtm-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 12px 18px;
    border-bottom: 1px solid #2a2e39;
    align-items: center;
}
.tv-dtm-row:hover { background: #232733; }
.tv-dtm-row-info { min-width: 0; }
.tv-dtm-row-name {
    font-size: 13px; font-weight: 600; color: #f0f3fa;
    display: flex; align-items: center; gap: 8px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tv-dtm-badge {
    display: inline-block;
    background: #2962ff; color: #fff;
    font-size: 10px; font-weight: 600;
    padding: 2px 6px; border-radius: 3px;
    text-transform: uppercase; letter-spacing: 0.5px;
}
.tv-dtm-row-meta {
    margin-top: 4px;
    font-size: 11px; color: #787b86;
    display: flex; gap: 12px;
}
.tv-dtm-row-actions {
    display: flex; gap: 6px; align-items: center;
}
.tv-dtm-icon-btn {
    background: transparent; border: 1px solid transparent;
    color: #b2b5be; cursor: pointer;
    padding: 5px 9px; border-radius: 4px;
    font-size: 11px; font-family: inherit;
}
.tv-dtm-icon-btn:hover { background: #2a2e39; border-color: #363a45; color: #f0f3fa; }
.tv-dtm-icon-btn.danger:hover { color: #ef5350; border-color: #ef5350; background: #3a2326; }
.tv-dtm-name-input {
    background: #131722; color: #f0f3fa;
    border: 1px solid #2962ff; border-radius: 3px;
    font-size: 13px; font-weight: 600;
    padding: 4px 6px; outline: none; width: 100%;
    font-family: inherit;
}
.tv-dtm-footer {
    padding: 10px 18px;
    border-top: 1px solid #2a2e39;
    background: #131722;
    display: flex; justify-content: flex-end; gap: 8px;
}
.tv-dtm-prompt {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: tv-dtm-fade-in .15s ease-out;
}
.tv-dtm-prompt-box {
    background: #131722; border: 1px solid #2a2e39; border-radius: 8px;
    padding: 18px; width: min(380px, 92vw);
    box-shadow: 0 12px 48px rgba(0,0,0,0.6);
    animation: tv-dtm-pop-in .15s ease-out;
}
.tv-dtm-prompt-title { font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #f0f3fa; }
.tv-dtm-prompt-input {
    width: 100%; background: #131722; color: #f0f3fa;
    border: 1px solid #2a2e39; border-radius: 4px;
    padding: 8px 10px; font-size: 13px; outline: none;
    font-family: inherit;
}
.tv-dtm-prompt-input:focus { border-color: #2962ff; }
.tv-dtm-prompt-actions {
    margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;
}
.tv-dtm-builtin-menu {
    position: absolute;
    background: #1e222d; border: 1px solid #363a45; border-radius: 4px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    min-width: 240px; padding: 4px 0; z-index: 100001;
}
.tv-dtm-builtin-item {
    padding: 8px 14px; font-size: 12px; cursor: pointer; color: #d1d4dc;
}
.tv-dtm-builtin-item:hover { background: #2962ff; color: #fff; }
`;
    const style = document.createElement('style');
    style.id = 'tv-drawing-templates-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Prompt modal (replaces window.prompt for in-app feel)
// ---------------------------------------------------------------------------

function promptModal(title, defaultValue) {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') { resolve(null); return; }
        const input = el('input', {
            class: 'tv-dtm-prompt-input',
            type: 'text',
            value: defaultValue || '',
        });
        const cancel = el('button', { class: 'tv-dtm-btn' }, 'Cancelar');
        const ok = el('button', { class: 'tv-dtm-btn primary' }, 'Aceptar');
        const box = el('div', { class: 'tv-dtm-prompt-box' }, [
            el('div', { class: 'tv-dtm-prompt-title' }, title),
            input,
            el('div', { class: 'tv-dtm-prompt-actions' }, [cancel, ok]),
        ]);
        const overlay = el('div', { class: 'tv-dtm-prompt' }, [box]);
        function close(value) {
            overlay.remove();
            document.removeEventListener('keydown', onKey);
            resolve(value);
        }
        function onKey(ev) {
            if (ev.key === 'Escape') close(null);
            else if (ev.key === 'Enter' && document.activeElement === input) close(input.value.trim() || null);
        }
        cancel.addEventListener('click', () => close(null));
        ok.addEventListener('click', () => close(input.value.trim() || null));
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(null); });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        setTimeout(() => { input.focus(); input.select(); }, 0);
    });
}

function confirmModal(message) {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') { resolve(false); return; }
        const cancel = el('button', { class: 'tv-dtm-btn' }, 'Cancelar');
        const ok = el('button', { class: 'tv-dtm-btn danger' }, 'Confirmar');
        const box = el('div', { class: 'tv-dtm-prompt-box' }, [
            el('div', { class: 'tv-dtm-prompt-title' }, message),
            el('div', { class: 'tv-dtm-prompt-actions' }, [cancel, ok]),
        ]);
        const overlay = el('div', { class: 'tv-dtm-prompt' }, [box]);
        function close(v) { overlay.remove(); resolve(v); }
        cancel.addEventListener('click', () => close(false));
        ok.addEventListener('click', () => close(true));
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(false); });
        document.body.appendChild(overlay);
    });
}

// ---------------------------------------------------------------------------
// Date format
// ---------------------------------------------------------------------------

function formatDate(iso) {
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yy} ${hh}:${mi}`;
    } catch (e) { return '—'; }
}

// ---------------------------------------------------------------------------
// File download / upload
// ---------------------------------------------------------------------------

function downloadJSON(filename, data) {
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);
        return true;
    } catch (e) { return false; }
}

function pickJSONFile() {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') { resolve(null); return; }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.style.display = 'none';
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload = () => {
                try { resolve(JSON.parse(String(reader.result))); }
                catch (e) { resolve({ __error: 'JSON inválido' }); }
            };
            reader.onerror = () => resolve({ __error: 'Error al leer archivo' });
            reader.readAsText(file);
        });
        document.body.appendChild(input);
        input.click();
        setTimeout(() => { try { document.body.removeChild(input); } catch (e) {} }, 1000);
    });
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

function createDrawingTemplateManager(opts = {}) {
    const onLoad = typeof opts.onLoad === 'function' ? opts.onLoad : null;
    const onClear = typeof opts.onClear === 'function' ? opts.onClear : null;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    const getCurrentDrawings = typeof opts.getCurrentDrawings === 'function' ? opts.getCurrentDrawings : null;

    let state = loadAll();
    let overlayEl = null;
    let listEl = null;
    let lastCurrentDrawings = null;
    let prevFocusEl = null;

    function emitChange() {
        if (onChange) {
            try { onChange(listTemplates()); } catch (e) { /* ignored */ }
        }
    }

    function findTemplate(name) {
        return state.templates.find((t) => t.name === name) || null;
    }

    function listTemplates() {
        return state.templates.map((t) => ({
            name: t.name,
            builtin: !!t.builtin,
            createdAt: t.createdAt,
            count: Array.isArray(t.drawings) ? t.drawings.length : 0,
        }));
    }

    function saveCurrent(currentDrawings, name) {
        const trimmed = (name || '').trim();
        if (!trimmed) throw new Error('Nombre de plantilla requerido');
        const drawings = serializeDrawings(currentDrawings);
        const existingIdx = state.templates.findIndex((t) => t.name === trimmed);
        const record = {
            name: trimmed,
            builtin: false,
            createdAt: new Date().toISOString(),
            drawings,
        };
        if (existingIdx >= 0) {
            // Preserve original creation date on overwrite of user template.
            const prev = state.templates[existingIdx];
            if (!prev.builtin && prev.createdAt) record.createdAt = prev.createdAt;
            record.updatedAt = new Date().toISOString();
            state.templates[existingIdx] = record;
        } else {
            state.templates.push(record);
        }
        persist(state);
        emitChange();
        return record;
    }

    function loadTemplate(name) {
        const tpl = findTemplate(name);
        if (!tpl) throw new Error(`Plantilla no encontrada: ${name}`);
        if (onClear) {
            try { onClear(); } catch (e) { /* ignored */ }
        }
        if (onLoad) {
            try { onLoad(deepClone(tpl.drawings), { name: tpl.name, builtin: !!tpl.builtin }); }
            catch (e) { /* ignored */ }
        }
        return deepClone(tpl);
    }

    function deleteTemplate(name) {
        const idx = state.templates.findIndex((t) => t.name === name);
        if (idx < 0) return false;
        const tpl = state.templates[idx];
        if (tpl.builtin) {
            // Allow delete but re-seed next load — for safety, refuse.
            return false;
        }
        state.templates.splice(idx, 1);
        persist(state);
        emitChange();
        return true;
    }

    function renameTemplate(oldName, newName) {
        const trimmed = (newName || '').trim();
        if (!trimmed) return false;
        if (trimmed === oldName) return true;
        const tpl = findTemplate(oldName);
        if (!tpl) return false;
        if (tpl.builtin) return false;
        if (findTemplate(trimmed)) return false; // collision
        tpl.name = trimmed;
        tpl.updatedAt = new Date().toISOString();
        persist(state);
        emitChange();
        return true;
    }

    function exportTemplate(name) {
        const tpl = findTemplate(name);
        if (!tpl) throw new Error(`Plantilla no encontrada: ${name}`);
        const payload = {
            schema: 'tv.drawing_template',
            version: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            template: deepClone(tpl),
        };
        const safeName = name.replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 80) || 'template';
        downloadJSON(`drawing-template-${safeName}.json`, payload);
        return payload;
    }

    function importTemplate(json) {
        if (!json || typeof json !== 'object') throw new Error('JSON inválido');
        // Accept either wrapped { template: {...} } or a raw template.
        const tpl = json.template && typeof json.template === 'object' ? json.template : json;
        const err = validateTemplate(tpl);
        if (err) throw new Error(err);
        let finalName = tpl.name;
        let suffix = 1;
        while (findTemplate(finalName)) {
            suffix += 1;
            finalName = `${tpl.name} (${suffix})`;
            if (suffix > 999) throw new Error('Demasiadas colisiones de nombre');
        }
        const record = {
            name: finalName,
            builtin: false,
            createdAt: tpl.createdAt || new Date().toISOString(),
            importedAt: new Date().toISOString(),
            drawings: serializeDrawings(tpl.drawings),
        };
        state.templates.push(record);
        persist(state);
        emitChange();
        return record;
    }

    // -----------------------------------------------------------------------
    // UI
    // -----------------------------------------------------------------------

    function renderList() {
        if (!listEl) return;
        listEl.innerHTML = '';
        const templates = [...state.templates].sort((a, b) => {
            if (a.builtin !== b.builtin) return a.builtin ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        if (!templates.length) {
            listEl.appendChild(el('div', { class: 'tv-dtm-empty' },
                'No hay plantillas. Guarda la actual o importa una.'));
            return;
        }
        for (const tpl of templates) {
            listEl.appendChild(renderRow(tpl));
        }
    }

    function renderRow(tpl) {
        const nameWrap = el('div', { class: 'tv-dtm-row-name' });
        nameWrap.appendChild(document.createTextNode(tpl.name));
        if (tpl.builtin) {
            nameWrap.appendChild(el('span', { class: 'tv-dtm-badge' }, 'Preset'));
        }
        const meta = el('div', { class: 'tv-dtm-row-meta' }, [
            el('span', {}, `${Array.isArray(tpl.drawings) ? tpl.drawings.length : 0} dibujos`),
            el('span', {}, `Creada: ${formatDate(tpl.createdAt)}`),
        ]);
        const info = el('div', { class: 'tv-dtm-row-info' }, [nameWrap, meta]);

        const loadBtn = el('button', { class: 'tv-dtm-icon-btn', title: 'Cargar plantilla' }, 'Cargar');
        loadBtn.addEventListener('click', async () => {
            try {
                loadTemplate(tpl.name);
                closeModal();
            } catch (e) {
                alert('Error al cargar: ' + e.message);
            }
        });

        const editBtn = el('button', {
            class: 'tv-dtm-icon-btn',
            title: tpl.builtin ? 'No se puede renombrar un preset' : 'Editar nombre',
            disabled: tpl.builtin,
        }, 'Editar');
        editBtn.addEventListener('click', async () => {
            if (tpl.builtin) return;
            const newName = await promptModal('Nuevo nombre de plantilla:', tpl.name);
            if (!newName) return;
            if (!renameTemplate(tpl.name, newName)) {
                alert('No se pudo renombrar (¿nombre duplicado?).');
            } else {
                renderList();
            }
        });

        const delBtn = el('button', {
            class: 'tv-dtm-icon-btn danger',
            title: tpl.builtin ? 'No se puede eliminar un preset' : 'Eliminar',
            disabled: tpl.builtin,
        }, 'Eliminar');
        delBtn.addEventListener('click', async () => {
            if (tpl.builtin) return;
            const ok = await confirmModal(`¿Eliminar plantilla "${tpl.name}"?`);
            if (!ok) return;
            if (deleteTemplate(tpl.name)) renderList();
        });

        const expBtn = el('button', { class: 'tv-dtm-icon-btn', title: 'Exportar como JSON' }, 'Exportar');
        expBtn.addEventListener('click', () => {
            try { exportTemplate(tpl.name); }
            catch (e) { alert('Error al exportar: ' + e.message); }
        });

        const actions = el('div', { class: 'tv-dtm-row-actions' }, [loadBtn, editBtn, delBtn, expBtn]);
        return el('div', { class: 'tv-dtm-row' }, [info, actions]);
    }

    function showBuiltinMenu(anchor) {
        // Remove any prior menu
        const prior = document.querySelector('.tv-dtm-builtin-menu');
        if (prior) prior.remove();

        const rect = anchor.getBoundingClientRect();
        const menu = el('div', { class: 'tv-dtm-builtin-menu' });
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.left = `${rect.left}px`;
        for (const b of BUILTIN_TEMPLATES) {
            const item = el('div', { class: 'tv-dtm-builtin-item' }, b.name);
            item.addEventListener('click', () => {
                menu.remove();
                try {
                    loadTemplate(b.name);
                    closeModal();
                } catch (e) { alert('Error: ' + e.message); }
            });
            menu.appendChild(item);
        }
        document.body.appendChild(menu);
        const dismiss = (ev) => {
            if (!menu.contains(ev.target) && ev.target !== anchor) {
                menu.remove();
                document.removeEventListener('mousedown', dismiss, true);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', dismiss, true), 0);
    }

    function buildModal() {
        injectStylesOnce();

        const closeBtn = el('button', { class: 'tv-dtm-close', title: 'Cerrar' }, '×');
        closeBtn.addEventListener('click', closeModal);

        const header = el('div', { class: 'tv-dtm-header' }, [
            el('div', { class: 'tv-dtm-title' }, 'Plantillas de dibujo'),
            closeBtn,
        ]);

        const saveBtn = el('button', { class: 'tv-dtm-btn primary' }, 'Guardar plantilla actual');
        saveBtn.addEventListener('click', async () => {
            const name = await promptModal('Nombre de la nueva plantilla:', '');
            if (!name) return;
            const drawings = lastCurrentDrawings != null
                ? lastCurrentDrawings
                : (getCurrentDrawings ? getCurrentDrawings() : []);
            try {
                saveCurrent(drawings, name);
                renderList();
            } catch (e) { alert('Error: ' + e.message); }
        });

        const importBtn = el('button', { class: 'tv-dtm-btn' }, 'Importar plantilla');
        importBtn.addEventListener('click', async () => {
            const json = await pickJSONFile();
            if (!json) return;
            if (json.__error) { alert(json.__error); return; }
            try {
                importTemplate(json);
                renderList();
            } catch (e) { alert('Error al importar: ' + e.message); }
        });

        const builtinBtn = el('button', { class: 'tv-dtm-btn' }, 'Plantillas predefinidas');
        builtinBtn.addEventListener('click', () => showBuiltinMenu(builtinBtn));

        const toolbar = el('div', { class: 'tv-dtm-toolbar' }, [saveBtn, importBtn, builtinBtn]);

        listEl = el('div', { class: 'tv-dtm-list' });

        const footerClose = el('button', { class: 'tv-dtm-btn' }, 'Cerrar');
        footerClose.addEventListener('click', closeModal);
        const footer = el('div', { class: 'tv-dtm-footer' }, [footerClose]);

        const modal = el('div', {
            class: 'tv-dtm-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': 'Plantillas de dibujo',
            tabindex: '-1',
        }, [header, toolbar, listEl, footer]);
        modal.addEventListener('mousedown', (ev) => ev.stopPropagation());
        overlayEl = el('div', { class: 'tv-dtm-overlay' }, [modal]);
        overlayEl.addEventListener('mousedown', (ev) => {
            if (ev.target === overlayEl) closeModal();
        });
        document.addEventListener('keydown', onGlobalKey);
        document.body.appendChild(overlayEl);
        renderList();
    }

    function onGlobalKey(ev) {
        if (ev.key === 'Escape' && overlayEl) { closeModal(); return; }
        if (ev.key === 'Tab' && overlayEl) {
            const modal = overlayEl.querySelector('.tv-dtm-modal');
            if (!modal) return;
            const focusable = Array.from(modal.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(n => n.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
            else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
    }

    function closeModal() {
        if (overlayEl) {
            overlayEl.remove();
            overlayEl = null;
            listEl = null;
        }
        document.removeEventListener('keydown', onGlobalKey);
        const menu = document.querySelector('.tv-dtm-builtin-menu');
        if (menu) menu.remove();
        try { if (prevFocusEl && typeof prevFocusEl.focus === 'function') prevFocusEl.focus(); } catch (e) {}
        prevFocusEl = null;
    }

    function open(currentDrawings) {
        if (typeof document === 'undefined') return;
        lastCurrentDrawings = Array.isArray(currentDrawings) ? currentDrawings : null;
        if (overlayEl) { closeModal(); }
        prevFocusEl = document.activeElement;
        buildModal();
        // focus first interactive: the close button in header
        setTimeout(() => {
            try {
                const first = overlayEl && overlayEl.querySelector('.tv-dtm-close');
                if (first) first.focus();
            } catch (e) {}
        }, 0);
    }

    function destroy() {
        closeModal();
        const styles = document.getElementById('tv-drawing-templates-styles');
        // Leave styles in place in case another instance is alive; cheap to keep.
        if (styles && styles.dataset.refs === '0') styles.remove();
    }

    return {
        open,
        saveCurrent,
        loadTemplate,
        listTemplates,
        deleteTemplate,
        renameTemplate,
        exportTemplate,
        importTemplate,
        destroy,
    };
}

// ---------------------------------------------------------------------------
// Exports (UMD-ish: ESM + CommonJS + global)
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDrawingTemplateManager, BUILTIN_TEMPLATES, STORAGE_KEY };
}
if (typeof window !== 'undefined') {
    window.createDrawingTemplateManager = createDrawingTemplateManager;
}

export { createDrawingTemplateManager, BUILTIN_TEMPLATES, STORAGE_KEY };
export default createDrawingTemplateManager;
