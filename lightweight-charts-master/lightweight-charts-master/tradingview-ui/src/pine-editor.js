// pine-editor.js
// Pine Script-style code editor + library browser (UI only).
// Exports two factories: createPineEditor and createPineLibrary.
// Self-contained: injects its own CSS, has no external dependencies.

const STYLE_ID = 'tv-pine-editor-styles';
const STORAGE_KEY = 'tv.pine_scripts';

const STARTER_SCRIPT =
    '//@version=5\n' +
    'indicator("Mi indicador", overlay=true)\n' +
    'length = input.int(20, "Longitud")\n' +
    'ma = ta.sma(close, length)\n' +
    'plot(ma, color=color.blue, linewidth=2)\n';

// ---------- CSS ----------
function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.tv-pine-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #131722;
    color: #d1d4dc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    box-sizing: border-box;
    overflow: hidden;
}
.tv-pine-root *, .tv-pine-root *::before, .tv-pine-root *::after { box-sizing: border-box; }

/* Toolbar */
.tv-pine-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #1e222d;
    border-bottom: 1px solid #2a2e39;
    flex: 0 0 auto;
    flex-wrap: wrap;
}
.tv-pine-btn {
    background: #2a2e39;
    color: #d1d4dc;
    border: 1px solid #363a45;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 500;
    transition: background .15s, border-color .15s;
}
.tv-pine-btn:hover { background: #363a45; border-color: #4a4e5a; }
.tv-pine-btn.primary { background: #2962ff; border-color: #2962ff; color: #fff; }
.tv-pine-btn.primary:hover { background: #1e53e5; border-color: #1e53e5; }
.tv-pine-btn.ghost { background: transparent; }
.tv-pine-select {
    background: #2a2e39;
    color: #d1d4dc;
    border: 1px solid #363a45;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    cursor: pointer;
    outline: none;
}
.tv-pine-select:focus { border-color: #2962ff; }
.tv-pine-toolbar-spacer { flex: 1 1 auto; }
.tv-pine-script-name {
    background: #2a2e39;
    border: 1px solid #363a45;
    border-radius: 4px;
    color: #d1d4dc;
    padding: 6px 10px;
    font-size: 12px;
    min-width: 160px;
    outline: none;
}
.tv-pine-script-name:focus { border-color: #2962ff; }

/* Editor body */
.tv-pine-body {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}
.tv-pine-editor-wrap {
    flex: 1 1 auto;
    display: flex;
    min-height: 0;
    position: relative;
    background: #0e1118;
    overflow: hidden;
}
.tv-pine-gutter {
    flex: 0 0 auto;
    width: 48px;
    background: #131722;
    border-right: 1px solid #2a2e39;
    color: #5d606b;
    font-family: "SF Mono", Monaco, Consolas, "Courier New", monospace;
    font-size: 12.5px;
    line-height: 18px;
    padding: 8px 6px 8px 0;
    text-align: right;
    overflow: hidden;
    user-select: none;
    white-space: pre;
}
.tv-pine-editor-area {
    flex: 1 1 auto;
    position: relative;
    overflow: auto;
}
.tv-pine-highlight,
.tv-pine-textarea {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 8px 12px;
    border: 0;
    width: 100%;
    min-height: 100%;
    font-family: "SF Mono", Monaco, Consolas, "Courier New", monospace;
    font-size: 12.5px;
    line-height: 18px;
    white-space: pre;
    overflow-wrap: normal;
    tab-size: 4;
}
.tv-pine-highlight {
    color: #d1d4dc;
    pointer-events: none;
    z-index: 1;
}
.tv-pine-textarea {
    color: transparent;
    background: transparent;
    caret-color: #d1d4dc;
    resize: none;
    outline: none;
    z-index: 2;
    overflow: hidden;
}
.tv-pine-textarea::selection { background: rgba(41, 98, 255, 0.35); }

/* Syntax colors */
.tv-pk { color: #c678dd; font-weight: 500; }   /* keyword */
.tv-pb { color: #61afef; }                      /* builtin */
.tv-ps { color: #98c379; }                      /* string */
.tv-pc { color: #5c6370; font-style: italic; }  /* comment */
.tv-pn { color: #d19a66; }                      /* number */
.tv-po { color: #56b6c2; }                      /* operator/punct */
.tv-pa { color: #e5c07b; }                      /* annotation //@ */

/* Console */
.tv-pine-console {
    flex: 0 0 auto;
    height: 140px;
    background: #0b0e14;
    border-top: 1px solid #2a2e39;
    display: flex;
    flex-direction: column;
    min-height: 0;
}
.tv-pine-console-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    background: #131722;
    border-bottom: 1px solid #2a2e39;
    font-size: 11px;
    color: #868993;
    text-transform: uppercase;
    letter-spacing: .5px;
    flex: 0 0 auto;
}
.tv-pine-console-status {
    margin-left: auto;
    font-size: 11px;
    color: #26a69a;
}
.tv-pine-console-status.err { color: #ef5350; }
.tv-pine-console-status.warn { color: #ffb74d; }
.tv-pine-console-body {
    flex: 1 1 auto;
    overflow: auto;
    padding: 6px 12px;
    font-family: "SF Mono", Monaco, Consolas, monospace;
    font-size: 11.5px;
    line-height: 16px;
    color: #b2b5be;
}
.tv-pine-log { margin: 0; padding: 1px 0; }
.tv-pine-log.err { color: #ef5350; }
.tv-pine-log.ok { color: #26a69a; }
.tv-pine-log.warn { color: #ffb74d; }
.tv-pine-log.muted { color: #5d606b; }

/* Library */
.tv-plib-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #131722;
    color: #d1d4dc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    overflow: hidden;
}
.tv-plib-root *, .tv-plib-root *::before, .tv-plib-root *::after { box-sizing: border-box; }
.tv-plib-header {
    flex: 0 0 auto;
    padding: 12px 16px;
    background: #1e222d;
    border-bottom: 1px solid #2a2e39;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.tv-plib-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
}
.tv-plib-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}
.tv-plib-search {
    flex: 1 1 220px;
    min-width: 180px;
    background: #2a2e39;
    border: 1px solid #363a45;
    color: #d1d4dc;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 12px;
    outline: none;
}
.tv-plib-search:focus { border-color: #2962ff; }
.tv-plib-cat {
    background: #2a2e39;
    border: 1px solid #363a45;
    color: #d1d4dc;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
}
.tv-plib-body {
    flex: 1 1 auto;
    display: flex;
    min-height: 0;
    overflow: hidden;
}
.tv-plib-grid {
    flex: 1 1 auto;
    overflow: auto;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
    align-content: start;
}
.tv-plib-card {
    background: #1e222d;
    border: 1px solid #2a2e39;
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color .15s, transform .15s;
}
.tv-plib-card:hover { border-color: #2962ff; transform: translateY(-1px); }
.tv-plib-card.sel { border-color: #2962ff; box-shadow: 0 0 0 1px #2962ff inset; }
.tv-plib-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
}
.tv-plib-card-name {
    font-weight: 600;
    color: #fff;
    font-size: 13px;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.tv-plib-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #2962ff22;
    color: #2962ff;
    text-transform: uppercase;
    letter-spacing: .5px;
}
.tv-plib-card-author { color: #868993; font-size: 11px; }
.tv-plib-card-desc {
    color: #b2b5be;
    font-size: 12px;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
.tv-plib-card-stats {
    display: flex;
    gap: 12px;
    color: #5d606b;
    font-size: 11px;
    margin-top: auto;
}
.tv-plib-card-stats span { display: inline-flex; align-items: center; gap: 3px; }
.tv-plib-cat-tag {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #2a2e39;
    color: #b2b5be;
    text-transform: uppercase;
    letter-spacing: .5px;
}

/* Library preview */
.tv-plib-preview {
    flex: 0 0 380px;
    border-left: 1px solid #2a2e39;
    background: #0e1118;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.tv-plib-preview.empty {
    align-items: center;
    justify-content: center;
    color: #5d606b;
    font-size: 12px;
    padding: 16px;
    text-align: center;
}
.tv-plib-preview-header {
    padding: 12px 14px;
    background: #1e222d;
    border-bottom: 1px solid #2a2e39;
    flex: 0 0 auto;
}
.tv-plib-preview-name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
}
.tv-plib-preview-sub {
    font-size: 11px;
    color: #868993;
}
.tv-plib-preview-desc {
    padding: 10px 14px;
    color: #b2b5be;
    font-size: 12px;
    line-height: 1.5;
    border-bottom: 1px solid #2a2e39;
    flex: 0 0 auto;
}
.tv-plib-preview-code {
    flex: 1 1 auto;
    overflow: auto;
    padding: 10px 14px;
    font-family: "SF Mono", Monaco, Consolas, monospace;
    font-size: 11.5px;
    line-height: 16px;
    color: #d1d4dc;
    white-space: pre;
    margin: 0;
}
.tv-plib-preview-actions {
    padding: 10px 14px;
    border-top: 1px solid #2a2e39;
    display: flex;
    gap: 8px;
    flex: 0 0 auto;
}
.tv-plib-empty-state {
    grid-column: 1 / -1;
    padding: 40px;
    text-align: center;
    color: #5d606b;
    font-size: 13px;
}
@media (max-width: 820px) {
    .tv-plib-preview { flex-basis: 280px; }
}
@media (max-width: 640px) {
    .tv-plib-body { flex-direction: column; }
    .tv-plib-preview { flex: 0 0 auto; border-left: 0; border-top: 1px solid #2a2e39; max-height: 50%; }
}
`;
    document.head.appendChild(style);
}

// ---------- Syntax highlight ----------
const PINE_KEYWORDS = new Set([
    'if', 'else', 'for', 'to', 'by', 'while', 'switch', 'case', 'default',
    'var', 'varip', 'and', 'or', 'not', 'true', 'false', 'na',
    'return', 'break', 'continue', 'export', 'import', 'method', 'type',
    'series', 'simple', 'const', 'input', 'enum', 'matrix', 'array', 'map'
]);
const PINE_BUILTINS = new Set([
    'study', 'strategy', 'indicator', 'library', 'plot', 'plotshape', 'plotchar',
    'plotcandle', 'plotbar', 'plotarrow', 'plothline', 'hline', 'fill', 'bgcolor',
    'barcolor', 'alert', 'alertcondition', 'label', 'line', 'box', 'table',
    'open', 'high', 'low', 'close', 'volume', 'time', 'bar_index', 'hl2', 'hlc3', 'ohlc4',
    'ta', 'math', 'array', 'matrix', 'map', 'str', 'color', 'request', 'syminfo',
    'timeframe', 'session', 'dayofweek', 'na', 'nz', 'fixnan', 'log', 'runtime'
]);

function escHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function highlightPine(src) {
    // Token-by-token. Order matters.
    const out = [];
    let i = 0;
    const n = src.length;
    while (i < n) {
        const c = src[i];
        // Annotation //@version=5
        if (c === '/' && src[i + 1] === '/' && src[i + 2] === '@') {
            let j = i;
            while (j < n && src[j] !== '\n') j++;
            out.push('<span class="tv-pa">' + escHtml(src.slice(i, j)) + '</span>');
            i = j;
            continue;
        }
        // Comment
        if (c === '/' && src[i + 1] === '/') {
            let j = i;
            while (j < n && src[j] !== '\n') j++;
            out.push('<span class="tv-pc">' + escHtml(src.slice(i, j)) + '</span>');
            i = j;
            continue;
        }
        // String
        if (c === '"' || c === "'") {
            const q = c;
            let j = i + 1;
            while (j < n) {
                if (src[j] === '\\' && j + 1 < n) { j += 2; continue; }
                if (src[j] === q) { j++; break; }
                if (src[j] === '\n') break;
                j++;
            }
            out.push('<span class="tv-ps">' + escHtml(src.slice(i, j)) + '</span>');
            i = j;
            continue;
        }
        // Number
        if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
            let j = i;
            while (j < n && /[0-9._eE+\-]/.test(src[j])) {
                // Allow + - only after e/E
                if ((src[j] === '+' || src[j] === '-') && !(src[j - 1] === 'e' || src[j - 1] === 'E')) break;
                j++;
            }
            out.push('<span class="tv-pn">' + escHtml(src.slice(i, j)) + '</span>');
            i = j;
            continue;
        }
        // Identifier
        if (/[A-Za-z_]/.test(c)) {
            let j = i;
            while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
            // Handle qualified names like ta.sma — tokenize per segment
            const word = src.slice(i, j);
            if (PINE_KEYWORDS.has(word)) {
                out.push('<span class="tv-pk">' + escHtml(word) + '</span>');
            } else if (PINE_BUILTINS.has(word)) {
                out.push('<span class="tv-pb">' + escHtml(word) + '</span>');
            } else {
                out.push(escHtml(word));
            }
            i = j;
            continue;
        }
        // Operators / punct
        if (/[+\-*/%=<>!&|^~?:,;(){}\[\].]/.test(c)) {
            // Arrow =>
            if (c === '=' && src[i + 1] === '>') {
                out.push('<span class="tv-pk">=&gt;</span>');
                i += 2;
                continue;
            }
            out.push('<span class="tv-po">' + escHtml(c) + '</span>');
            i++;
            continue;
        }
        // Whitespace / other
        out.push(escHtml(c));
        i++;
    }
    return out.join('');
}

// ---------- Validation ----------
function validatePine(src) {
    const errors = [];
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const lines = src.split('\n');
    for (let ln = 0; ln < lines.length; ln++) {
        const line = lines[ln];
        let inStr = null;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inStr) {
                if (c === '\\') { i++; continue; }
                if (c === inStr) inStr = null;
                continue;
            }
            if (c === '"' || c === "'") { inStr = c; continue; }
            if (c === '/' && line[i + 1] === '/') break; // comment to EOL
            if (c === '(' || c === '[' || c === '{') {
                stack.push({ c, line: ln + 1, col: i + 1 });
            } else if (c === ')' || c === ']' || c === '}') {
                if (!stack.length || stack[stack.length - 1].c !== pairs[c]) {
                    errors.push({ line: ln + 1, col: i + 1, msg: `Bracket no balanceado: '${c}'` });
                } else {
                    stack.pop();
                }
            }
        }
        if (inStr) {
            errors.push({ line: ln + 1, col: line.length, msg: `String sin cerrar (${inStr})` });
        }
    }
    while (stack.length) {
        const s = stack.shift();
        errors.push({ line: s.line, col: s.col, msg: `Bracket sin cerrar: '${s.c}'` });
    }
    return errors;
}

// ---------- localStorage helpers ----------
function loadStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { current: '', scripts: {} };
        const obj = JSON.parse(raw);
        return {
            current: typeof obj.current === 'string' ? obj.current : '',
            scripts: obj.scripts && typeof obj.scripts === 'object' ? obj.scripts : {}
        };
    } catch (e) {
        return { current: '', scripts: {} };
    }
}
function saveStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

// ---------- createPineEditor ----------
export function createPineEditor(container, opts = {}) {
    injectStyles();
    let root, textarea, highlightEl, gutterEl, consoleBody, consoleStatus, nameInput, versionSel;
    let debounceTimer = null;
    let store = loadStore();
    const onAddToChart = typeof opts.onAddToChart === 'function' ? opts.onAddToChart : null;

    function log(msg, cls) {
        if (!consoleBody) return;
        const p = document.createElement('p');
        p.className = 'tv-pine-log' + (cls ? ' ' + cls : '');
        const ts = new Date().toLocaleTimeString();
        p.textContent = `[${ts}] ${msg}`;
        consoleBody.appendChild(p);
        consoleBody.scrollTop = consoleBody.scrollHeight;
    }

    function setStatus(text, kind) {
        if (!consoleStatus) return;
        consoleStatus.textContent = text;
        consoleStatus.className = 'tv-pine-console-status' + (kind ? ' ' + kind : '');
    }

    function syncHighlight() {
        const src = textarea.value;
        highlightEl.innerHTML = highlightPine(src) + '\n';
        const lineCount = Math.max(1, src.split('\n').length);
        let gut = '';
        for (let i = 1; i <= lineCount; i++) gut += i + '\n';
        gutterEl.textContent = gut;
        // Match textarea height to content for proper scrolling
        const lh = 18;
        const padV = 16;
        const desired = lineCount * lh + padV;
        textarea.style.height = desired + 'px';
        highlightEl.style.height = desired + 'px';
    }

    function syncScroll() {
        gutterEl.scrollTop = textarea.parentElement.scrollTop;
    }

    function runValidation() {
        const src = textarea.value;
        const errors = validatePine(src);
        if (!errors.length) {
            setStatus('Compilación correcta', 'ok');
        } else if (errors.length === 1) {
            setStatus(`1 error de sintaxis`, 'err');
        } else {
            setStatus(`${errors.length} errores de sintaxis`, 'err');
        }
        return errors;
    }

    function scheduleValidation() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const errs = runValidation();
            // Persist as current draft
            store.current = textarea.value;
            saveStore(store);
            if (errs.length) {
                errs.slice(0, 5).forEach(e => log(`Línea ${e.line}:${e.col} — ${e.msg}`, 'err'));
            }
        }, 400);
    }

    function newScript() {
        if (textarea.value && !confirm('¿Descartar cambios actuales y crear un script nuevo?')) return;
        textarea.value = STARTER_SCRIPT;
        nameInput.value = '';
        syncHighlight();
        runValidation();
        log('Nuevo script creado a partir de plantilla.', 'muted');
    }

    function saveScript() {
        const name = (nameInput.value || '').trim();
        if (!name) {
            log('Indica un nombre antes de guardar.', 'warn');
            nameInput.focus();
            return;
        }
        store.scripts[name] = {
            code: textarea.value,
            version: versionSel.value,
            updated: Date.now()
        };
        store.current = textarea.value;
        saveStore(store);
        log(`Script "${name}" guardado.`, 'ok');
    }

    function loadScriptPrompt() {
        const names = Object.keys(store.scripts);
        if (!names.length) {
            log('No hay scripts guardados.', 'warn');
            return;
        }
        const choice = prompt('Cargar script — escribe el nombre:\n\n' + names.join('\n'));
        if (!choice) return;
        const s = store.scripts[choice];
        if (!s) { log(`No se encontró "${choice}".`, 'err'); return; }
        textarea.value = s.code;
        nameInput.value = choice;
        if (s.version) versionSel.value = s.version;
        syncHighlight();
        runValidation();
        log(`Script "${choice}" cargado.`, 'ok');
    }

    function addToChart() {
        const errs = runValidation();
        if (errs.length) {
            log('No se puede añadir: corrige los errores primero.', 'err');
            return;
        }
        log('Añadido al gráfico (simulado).', 'ok');
        if (onAddToChart) {
            try { onAddToChart({ code: textarea.value, version: versionSel.value, name: nameInput.value || 'Sin título' }); }
            catch (e) { log('onAddToChart lanzó: ' + e.message, 'err'); }
        }
    }

    function build() {
        root = document.createElement('div');
        root.className = 'tv-pine-root';

        // Toolbar
        const tb = document.createElement('div');
        tb.className = 'tv-pine-toolbar';

        const btnSave = document.createElement('button');
        btnSave.className = 'tv-pine-btn'; btnSave.textContent = 'Guardar';
        btnSave.addEventListener('click', saveScript);

        const btnNew = document.createElement('button');
        btnNew.className = 'tv-pine-btn'; btnNew.textContent = 'Nuevo';
        btnNew.addEventListener('click', newScript);

        const btnLoad = document.createElement('button');
        btnLoad.className = 'tv-pine-btn'; btnLoad.textContent = 'Cargar';
        btnLoad.addEventListener('click', loadScriptPrompt);

        nameInput = document.createElement('input');
        nameInput.className = 'tv-pine-script-name';
        nameInput.type = 'text';
        nameInput.placeholder = 'Nombre del script…';

        versionSel = document.createElement('select');
        versionSel.className = 'tv-pine-select';
        ['v5', 'v6'].forEach(v => {
            const o = document.createElement('option');
            o.value = v; o.textContent = 'Pine ' + v;
            versionSel.appendChild(o);
        });
        versionSel.value = 'v5';

        const spacer = document.createElement('div');
        spacer.className = 'tv-pine-toolbar-spacer';

        const btnAdd = document.createElement('button');
        btnAdd.className = 'tv-pine-btn primary'; btnAdd.textContent = 'Añadir al gráfico';
        btnAdd.addEventListener('click', addToChart);

        tb.append(btnSave, btnNew, btnLoad, nameInput, versionSel, spacer, btnAdd);

        // Body
        const body = document.createElement('div'); body.className = 'tv-pine-body';
        const ed = document.createElement('div'); ed.className = 'tv-pine-editor-wrap';
        gutterEl = document.createElement('div'); gutterEl.className = 'tv-pine-gutter';

        const area = document.createElement('div'); area.className = 'tv-pine-editor-area';
        highlightEl = document.createElement('pre'); highlightEl.className = 'tv-pine-highlight';
        textarea = document.createElement('textarea');
        textarea.className = 'tv-pine-textarea';
        textarea.spellcheck = false;
        textarea.autocapitalize = 'off';
        textarea.autocorrect = 'off';
        textarea.wrap = 'off';
        textarea.value = store.current || STARTER_SCRIPT;

        textarea.addEventListener('input', () => { syncHighlight(); scheduleValidation(); });
        textarea.addEventListener('scroll', syncScroll);
        area.addEventListener('scroll', syncScroll);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = textarea.selectionStart, en = textarea.selectionEnd;
                textarea.value = textarea.value.slice(0, s) + '    ' + textarea.value.slice(en);
                textarea.selectionStart = textarea.selectionEnd = s + 4;
                syncHighlight();
                scheduleValidation();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveScript();
            }
        });

        area.append(highlightEl, textarea);
        ed.append(gutterEl, area);

        // Console
        const cons = document.createElement('div'); cons.className = 'tv-pine-console';
        const ch = document.createElement('div'); ch.className = 'tv-pine-console-header';
        const chLbl = document.createElement('span'); chLbl.textContent = 'Consola';
        consoleStatus = document.createElement('span');
        consoleStatus.className = 'tv-pine-console-status';
        consoleStatus.textContent = 'Listo';
        ch.append(chLbl, consoleStatus);
        consoleBody = document.createElement('div'); consoleBody.className = 'tv-pine-console-body';
        cons.append(ch, consoleBody);

        body.append(ed, cons);
        root.append(tb, body);
        container.appendChild(root);

        syncHighlight();
        runValidation();
        log('Editor Pine listo. Escribe tu script y pulsa "Añadir al gráfico".', 'muted');
    }

    function destroy() {
        clearTimeout(debounceTimer);
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = textarea = highlightEl = gutterEl = consoleBody = consoleStatus = nameInput = versionSel = null;
    }

    return {
        render() { if (!root) build(); },
        destroy
    };
}

// ---------- Synthesized library ----------
const LIB_CATEGORIES = ['Trend', 'Oscillator', 'Volume', 'Volatility', 'Strategy', 'Custom'];

const LIB_AUTHORS = [
    'tradingview', 'LonesomeTheBlue', 'LuxAlgo', 'KivancOzbilgic', 'ChrisMoody',
    'QuantNomad', 'RicardoSantos', 'alexgrover', 'fikira', 'wugamlo',
    'capissimo', 'HeWhoMustNotBeNamed', 'sbtnc', 'PineCoders', 'jaggedsoft'
];

function buildLibrary() {
    const seeds = [
        ['Trend', 'SuperTrend Pro', 'SuperTrend con multi-timeframe y alertas optimizadas.'],
        ['Trend', 'EMA Ribbon X10', '10 medias exponenciales con codificación de color por pendiente.'],
        ['Trend', 'Ichimoku Cloud+', 'Ichimoku ampliado con detección automática de Kumo twist.'],
        ['Trend', 'Heikin Ashi Smoothed', 'Heikin Ashi suavizado con doble EMA para tendencia limpia.'],
        ['Trend', 'ADX & DMI Pack', 'ADX direccional con bandas y señales de cruce.'],
        ['Trend', 'Parabolic SAR Pro', 'PSAR con filtro ATR adaptativo.'],
        ['Trend', 'Linear Regression Channel', 'Canal de regresión con desviación configurable.'],
        ['Oscillator', 'RSI Divergence Hunter', 'Detecta divergencias regulares y ocultas en RSI.'],
        ['Oscillator', 'Stochastic RSI Pro', 'Stoch RSI con suavizado adaptativo y zonas dinámicas.'],
        ['Oscillator', 'MACD Histogram Color', 'MACD con histograma coloreado por momentum.'],
        ['Oscillator', 'Awesome Oscillator+', 'AO ampliado con detección de saucer y twin peaks.'],
        ['Oscillator', 'CCI Multi-TF', 'CCI con confluencia entre 3 timeframes.'],
        ['Oscillator', 'Williams %R Bands', '%R con bandas adaptativas de sobrecompra/sobreventa.'],
        ['Oscillator', 'TSI Smart', 'True Strength Index con cruce de señal coloreado.'],
        ['Volume', 'Volume Profile Lite', 'Perfil de volumen ligero con POC y Value Area.'],
        ['Volume', 'OBV Trend', 'On-Balance Volume con media y detección de divergencia.'],
        ['Volume', 'Chaikin Money Flow Pro', 'CMF con bandas y filtro de tendencia.'],
        ['Volume', 'Accumulation/Distribution+', 'A/D con detección de divergencias frente al precio.'],
        ['Volume', 'VWAP Sessions', 'VWAP con bandas y reinicio por sesión.'],
        ['Volume', 'Money Flow Index Bands', 'MFI con bandas adaptativas y zonas extremas.'],
        ['Volatility', 'ATR Bands', 'Bandas envolventes basadas en ATR multi-período.'],
        ['Volatility', 'Bollinger Bands Pro', 'BB con squeeze, expansión y porcentaje %B.'],
        ['Volatility', 'Keltner Channels+', 'Keltner con detección de breakout y squeeze.'],
        ['Volatility', 'Donchian Channel Pro', 'Donchian con mid-line y señales de ruptura.'],
        ['Volatility', 'Historical Volatility Cone', 'Cono de volatilidad histórica con percentiles.'],
        ['Volatility', 'Chaikin Volatility', 'Volatilidad de Chaikin con suavizado.'],
        ['Strategy', 'EMA Cross Strategy', 'Estrategia de cruce EMA rápida/lenta con stop ATR.'],
        ['Strategy', 'RSI Mean Reversion', 'Estrategia de reversión a la media con RSI < 30 / > 70.'],
        ['Strategy', 'Bollinger Breakout', 'Ruptura de Bandas de Bollinger con filtro de volumen.'],
        ['Strategy', 'Turtle Trader 20/55', 'Sistema de tortugas clásico con dos canales Donchian.'],
        ['Strategy', 'SuperTrend Strategy', 'Estrategia long/short basada en SuperTrend.'],
        ['Strategy', 'Grid Trading Bot', 'Estrategia de rejilla para mercados laterales.'],
        ['Strategy', 'MACD Trend Following', 'Estrategia tendencial con MACD y EMA200.'],
        ['Custom', 'Smart Money Concepts', 'BOS, CHoCH, order blocks y liquidity pools.'],
        ['Custom', 'Auto Fib Retracement', 'Fibonacci automático sobre swings detectados.'],
        ['Custom', 'Order Block Finder', 'Localiza bloques de órdenes institucionales.'],
        ['Custom', 'Liquidity Sweeps', 'Detecta barridos de liquidez en máximos/mínimos.'],
        ['Custom', 'Market Structure', 'Estructura de mercado con HH/HL/LL/LH automático.'],
        ['Custom', 'Session Boxes', 'Cajas de sesiones Asia/Londres/Nueva York.'],
        ['Custom', 'Pivot Points HLC', 'Puntos pivote clásicos, Fibonacci y Camarilla.']
    ];

    // Deterministic pseudo-random for stable metrics
    let seed = 1337;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    return seeds.map((s, idx) => {
        const [cat, name, desc] = s;
        const author = LIB_AUTHORS[idx % LIB_AUTHORS.length];
        const lang = rand() > 0.45 ? 'v5' : 'v6';
        return {
            id: 'lib_' + idx,
            name,
            author,
            description: desc,
            category: cat,
            language: lang,
            likes: Math.floor(rand() * 8500 + 120),
            views: Math.floor(rand() * 180000 + 2000),
            uses: Math.floor(rand() * 25000 + 200),
            code: sampleCode(cat, name, lang)
        };
    });
}

function sampleCode(cat, name, lang) {
    const ver = lang === 'v6' ? '6' : '5';
    const ind = `indicator("${name}", overlay=${cat === 'Volume' || cat === 'Oscillator' ? 'false' : 'true'})`;
    const body = {
        Trend:
            'length = input.int(20, "Longitud")\n' +
            'src = input.source(close, "Fuente")\n' +
            'ma = ta.ema(src, length)\n' +
            'trendUp = src > ma\n' +
            'plot(ma, color=trendUp ? color.green : color.red, linewidth=2)\n',
        Oscillator:
            'length = input.int(14, "Longitud")\n' +
            'src = input.source(close, "Fuente")\n' +
            'osc = ta.rsi(src, length)\n' +
            'hline(70, "OB", color=color.red)\n' +
            'hline(30, "OS", color=color.green)\n' +
            'plot(osc, color=color.purple, linewidth=2)\n',
        Volume:
            'length = input.int(20, "Longitud")\n' +
            'vol_ma = ta.sma(volume, length)\n' +
            'plot(volume, style=plot.style_columns, color=volume > vol_ma ? color.teal : color.gray)\n' +
            'plot(vol_ma, color=color.orange, linewidth=2)\n',
        Volatility:
            'length = input.int(14, "Longitud ATR")\n' +
            'mult = input.float(2.0, "Multiplicador")\n' +
            'atr = ta.atr(length)\n' +
            'upper = close + atr * mult\n' +
            'lower = close - atr * mult\n' +
            'plot(upper, color=color.red)\n' +
            'plot(lower, color=color.green)\n',
        Strategy: null, // handled below
        Custom:
            'length = input.int(50, "Lookback")\n' +
            'src = input.source(close, "Fuente")\n' +
            'pivotH = ta.pivothigh(src, length, length)\n' +
            'pivotL = ta.pivotlow(src, length, length)\n' +
            'plotshape(pivotH, style=shape.triangledown, color=color.red, location=location.abovebar)\n' +
            'plotshape(pivotL, style=shape.triangleup, color=color.green, location=location.belowbar)\n'
    };
    if (cat === 'Strategy') {
        return `//@version=${ver}\n` +
            `strategy("${name}", overlay=true, initial_capital=10000)\n` +
            'fast = input.int(9, "EMA rápida")\n' +
            'slow = input.int(21, "EMA lenta")\n' +
            'emaF = ta.ema(close, fast)\n' +
            'emaS = ta.ema(close, slow)\n' +
            'longCond = ta.crossover(emaF, emaS)\n' +
            'shortCond = ta.crossunder(emaF, emaS)\n' +
            'if longCond\n' +
            '    strategy.entry("Long", strategy.long)\n' +
            'if shortCond\n' +
            '    strategy.entry("Short", strategy.short)\n' +
            'plot(emaF, color=color.blue)\n' +
            'plot(emaS, color=color.orange)\n';
    }
    return `//@version=${ver}\n` + ind + '\n' + body[cat];
}

// ---------- createPineLibrary ----------
export function createPineLibrary(container, opts = {}) {
    injectStyles();
    const onLoadScript = typeof opts.onLoadScript === 'function' ? opts.onLoadScript : null;
    const items = buildLibrary();
    let root, searchInput, catSel, gridEl, previewEl;
    let filter = { q: '', cat: 'all' };
    let selectedId = null;

    function getFiltered() {
        const q = filter.q.trim().toLowerCase();
        return items.filter(it => {
            if (filter.cat !== 'all' && it.category !== filter.cat) return false;
            if (!q) return true;
            return it.name.toLowerCase().includes(q)
                || it.author.toLowerCase().includes(q)
                || it.description.toLowerCase().includes(q)
                || it.category.toLowerCase().includes(q);
        });
    }

    function fmtNum(n) {
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(n);
    }

    function renderGrid() {
        const list = getFiltered();
        gridEl.innerHTML = '';
        if (!list.length) {
            const e = document.createElement('div');
            e.className = 'tv-plib-empty-state';
            e.textContent = 'Sin resultados para tu búsqueda.';
            gridEl.appendChild(e);
            return;
        }
        list.forEach(it => {
            const card = document.createElement('div');
            card.className = 'tv-plib-card' + (it.id === selectedId ? ' sel' : '');
            card.dataset.id = it.id;

            const top = document.createElement('div'); top.className = 'tv-plib-card-top';
            const nm = document.createElement('div'); nm.className = 'tv-plib-card-name'; nm.textContent = it.name;
            const lang = document.createElement('span'); lang.className = 'tv-plib-badge'; lang.textContent = 'Pine ' + it.language;
            top.append(nm, lang);

            const cat = document.createElement('span'); cat.className = 'tv-plib-cat-tag'; cat.textContent = it.category;

            const author = document.createElement('div'); author.className = 'tv-plib-card-author';
            author.textContent = 'por ' + it.author;

            const desc = document.createElement('div'); desc.className = 'tv-plib-card-desc';
            desc.textContent = it.description;

            const stats = document.createElement('div'); stats.className = 'tv-plib-card-stats';
            const sLikes = document.createElement('span'); sLikes.textContent = '♥ ' + fmtNum(it.likes);
            const sViews = document.createElement('span'); sViews.textContent = '👁 ' + fmtNum(it.views);
            const sUses = document.createElement('span'); sUses.textContent = '⚙ ' + fmtNum(it.uses);
            stats.append(sLikes, sViews, sUses);

            card.append(top, cat, author, desc, stats);
            card.addEventListener('click', () => {
                selectedId = it.id;
                renderGrid();
                renderPreview();
            });
            gridEl.appendChild(card);
        });
    }

    function renderPreview() {
        previewEl.innerHTML = '';
        const it = items.find(x => x.id === selectedId);
        if (!it) {
            previewEl.classList.add('empty');
            previewEl.textContent = 'Selecciona un indicador para ver su código.';
            return;
        }
        previewEl.classList.remove('empty');

        const h = document.createElement('div'); h.className = 'tv-plib-preview-header';
        const nm = document.createElement('div'); nm.className = 'tv-plib-preview-name'; nm.textContent = it.name;
        const sub = document.createElement('div'); sub.className = 'tv-plib-preview-sub';
        sub.textContent = `por ${it.author} · ${it.category} · Pine ${it.language} · ♥ ${fmtNum(it.likes)} · ⚙ ${fmtNum(it.uses)}`;
        h.append(nm, sub);

        const desc = document.createElement('div'); desc.className = 'tv-plib-preview-desc';
        desc.textContent = it.description;

        const pre = document.createElement('pre'); pre.className = 'tv-plib-preview-code';
        pre.innerHTML = highlightPine(it.code);

        const actions = document.createElement('div'); actions.className = 'tv-plib-preview-actions';
        const btnLoad = document.createElement('button');
        btnLoad.className = 'tv-pine-btn primary';
        btnLoad.textContent = 'Cargar en editor';
        btnLoad.addEventListener('click', () => {
            if (onLoadScript) {
                try { onLoadScript(it.code, it); } catch (e) { /* ignore */ }
            } else {
                // Fallback: stash into store so editor picks it up on next open
                const store = loadStore();
                store.current = it.code;
                saveStore(store);
            }
        });
        const btnCopy = document.createElement('button');
        btnCopy.className = 'tv-pine-btn';
        btnCopy.textContent = 'Copiar';
        btnCopy.addEventListener('click', () => {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(it.code);
                    btnCopy.textContent = '¡Copiado!';
                    setTimeout(() => { btnCopy.textContent = 'Copiar'; }, 1200);
                }
            } catch (e) { /* ignore */ }
        });
        actions.append(btnLoad, btnCopy);

        previewEl.append(h, desc, pre, actions);
    }

    function build() {
        root = document.createElement('div'); root.className = 'tv-plib-root';

        const head = document.createElement('div'); head.className = 'tv-plib-header';
        const title = document.createElement('div'); title.className = 'tv-plib-title';
        title.textContent = 'Biblioteca Pine — Indicadores de la comunidad';

        const ctrls = document.createElement('div'); ctrls.className = 'tv-plib-controls';
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar por nombre, autor, descripción…';
        searchInput.className = 'tv-plib-search';
        searchInput.addEventListener('input', () => {
            filter.q = searchInput.value;
            renderGrid();
        });

        catSel = document.createElement('select'); catSel.className = 'tv-plib-cat';
        const optAll = document.createElement('option');
        optAll.value = 'all'; optAll.textContent = 'Todas las categorías';
        catSel.appendChild(optAll);
        LIB_CATEGORIES.forEach(c => {
            const o = document.createElement('option');
            o.value = c; o.textContent = c;
            catSel.appendChild(o);
        });
        catSel.addEventListener('change', () => {
            filter.cat = catSel.value;
            renderGrid();
        });

        ctrls.append(searchInput, catSel);
        head.append(title, ctrls);

        const body = document.createElement('div'); body.className = 'tv-plib-body';
        gridEl = document.createElement('div'); gridEl.className = 'tv-plib-grid';
        previewEl = document.createElement('div'); previewEl.className = 'tv-plib-preview empty';
        previewEl.textContent = 'Selecciona un indicador para ver su código.';

        body.append(gridEl, previewEl);
        root.append(head, body);
        container.appendChild(root);

        renderGrid();
    }

    function destroy() {
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = searchInput = catSel = gridEl = previewEl = null;
    }

    return {
        render() { if (!root) build(); },
        destroy
    };
}

export default { createPineEditor, createPineLibrary };
