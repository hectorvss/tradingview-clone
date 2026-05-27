// Multi-chart layout manager
// Provides 1x1, 1x2, 2x1, 2x2, 1x3, 3x1 grid layouts of synchronized
// lightweight-charts instances with synced crosshair (and optional time-scale sync).

import { createChart, CandlestickSeries, CrosshairMode } from 'lightweight-charts';
import { loadCandles } from './data.js';

let _styleInjected = false;
function injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    const css = `
.multi-grid {
    display: grid;
    gap: 8px;
    width: 100%;
    height: 100%;
    background: var(--grey-18, #18191d);
    box-sizing: border-box;
    padding: 4px;
}
.multi-cell {
    background: var(--azure-10, #0d1117);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--grey-25, #25272d);
    border-radius: 3px;
    min-width: 0;
    min-height: 0;
    transition: border-color 100ms ease;
}
.multi-cell:hover { border-color: #34384a; }
.multi-cell.active {
    border-color: var(--blue-50, #2962ff);
}
.multi-cell-head {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 24px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    font: 11px/1 -apple-system, system-ui, sans-serif;
    color: var(--text-primary, #d1d4dc);
    background: rgba(20, 22, 26, 0.9);
    border-bottom: 1px solid var(--grey-25, #25272d);
    z-index: 2;
    user-select: none;
    gap: 6px;
}
.multi-cell-symbol { font-weight: 600; font-size: 11px; letter-spacing: 0.2px; }
.multi-cell-tf {
    color: var(--text-secondary, #787b86);
    font-size: 10px;
    padding: 1px 5px;
    background: rgba(255,255,255,0.05);
    border-radius: 2px;
}
.multi-cell-spacer { flex: 1; }
.multi-cell-close {
    background: none;
    border: none;
    color: var(--text-secondary, #787b86);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 3px;
}
.multi-cell-close:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text-primary, #d1d4dc);
}
.multi-cell-chart {
    position: absolute;
    inset: 24px 0 0 0;
}
`;
    const s = document.createElement('style');
    s.setAttribute('data-multi-chart', '');
    s.textContent = css;
    document.head.appendChild(s);
}

function defaultChartOptions() {
    return {
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#d1d4dc',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(70,76,90,0.25)' },
            horzLines: { color: 'rgba(70,76,90,0.25)' },
        },
        rightPriceScale: { borderColor: '#2a2e39' },
        timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
        crosshair: { mode: CrosshairMode.Normal },
        autoSize: false,
    };
}

export function createMultiChartLayout(container, options = {}) {
    if (!container) throw new Error('createMultiChartLayout: container required');
    injectStyles();

    const state = {
        rows: options.rows || 1,
        cols: options.cols || 1,
        charts: Array.isArray(options.charts) ? options.charts.slice() : [],
        syncTimeScale: !!options.syncTimeScale,
        bars: options.bars || 500,
        cells: [], // { wrap, head, chartDiv, chart, series, symbol, tf, ro, unsubCrosshair, unsubRange }
        syncing: false,
        destroyed: false,
    };

    const grid = document.createElement('div');
    grid.className = 'multi-grid';
    container.appendChild(grid);

    function gridCount() { return state.rows * state.cols; }

    function ensureChartsLength() {
        const want = gridCount();
        while (state.charts.length < want) {
            state.charts.push({ symbol: 'NVDA', tf: '1D' });
        }
    }

    function applyGridTemplate() {
        grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${state.rows}, 1fr)`;
    }

    function disposeCell(cell) {
        try { cell.unsubCrosshair && cell.unsubCrosshair(); } catch (_) {}
        try { cell.unsubRange && cell.unsubRange(); } catch (_) {}
        try { cell.ro && cell.ro.disconnect(); } catch (_) {}
        try { cell.chart && cell.chart.remove(); } catch (_) {}
        if (cell.wrap && cell.wrap.parentNode) cell.wrap.parentNode.removeChild(cell.wrap);
    }

    function disposeAllCells() {
        for (const c of state.cells) disposeCell(c);
        state.cells = [];
    }

    async function loadCellData(cell) {
        try {
            const candles = await loadCandles(cell.symbol, cell.tf, state.bars);
            if (state.destroyed) return;
            if (candles && candles.length) {
                cell.series.setData(candles);
                cell.chart.timeScale().fitContent();
            }
        } catch (e) {
            console.warn('[multi-chart] loadCandles failed', cell.symbol, cell.tf, e);
        }
    }

    function buildCell(index, conf) {
        const wrap = document.createElement('div');
        wrap.className = 'multi-cell';
        wrap.dataset.index = String(index);

        const head = document.createElement('div');
        head.className = 'multi-cell-head';
        const symEl = document.createElement('span');
        symEl.className = 'multi-cell-symbol';
        symEl.textContent = conf.symbol;
        const tfEl = document.createElement('span');
        tfEl.className = 'multi-cell-tf';
        tfEl.textContent = conf.tf;
        const spacer = document.createElement('span');
        spacer.className = 'multi-cell-spacer';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'multi-cell-close';
        closeBtn.title = 'Maximize (1x1)';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            api.maximizeCell(index);
        });
        head.appendChild(symEl);
        head.appendChild(tfEl);
        head.appendChild(spacer);
        head.appendChild(closeBtn);

        const chartDiv = document.createElement('div');
        chartDiv.className = 'multi-cell-chart';

        wrap.appendChild(head);
        wrap.appendChild(chartDiv);
        grid.appendChild(wrap);

        const w = Math.max(50, chartDiv.clientWidth || 200);
        const h = Math.max(50, chartDiv.clientHeight || 150);
        const chart = createChart(chartDiv, { ...defaultChartOptions(), width: w, height: h });
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        const cell = {
            wrap, head, chartDiv, chart, series,
            symEl, tfEl,
            symbol: conf.symbol, tf: conf.tf,
            ro: null,
            unsubCrosshair: null,
            unsubRange: null,
            index,
        };

        // ResizeObserver for this cell (rAF-debounced to avoid flicker)
        let _resizeRaf = 0;
        let _pendingSize = null;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect;
                if (cr.width > 0 && cr.height > 0) {
                    _pendingSize = { w: cr.width, h: cr.height };
                }
            }
            if (_resizeRaf || !_pendingSize) return;
            _resizeRaf = requestAnimationFrame(() => {
                _resizeRaf = 0;
                const s = _pendingSize;
                _pendingSize = null;
                if (s) { try { chart.resize(s.w, s.h); } catch (_) {} }
            });
        });
        ro.observe(chartDiv);
        cell.ro = ro;

        // Crosshair subscription
        const crosshairHandler = (param) => {
            if (state.syncing || state.destroyed) return;
            state.syncing = true;
            try {
                for (const other of state.cells) {
                    if (other === cell) continue;
                    if (!param || !param.time) {
                        try { other.chart.clearCrosshairPosition && other.chart.clearCrosshairPosition(); } catch (_) {}
                        continue;
                    }
                    let price;
                    if (param.seriesData && typeof param.seriesData.get === 'function') {
                        const sd = param.seriesData.get(cell.series);
                        if (sd) price = sd.close ?? sd.value ?? sd.price;
                    }
                    if (price == null) price = 0;
                    try {
                        other.chart.setCrosshairPosition(price, param.time, other.series);
                    } catch (_) {}
                }
            } finally {
                state.syncing = false;
            }
        };
        chart.subscribeCrosshairMove(crosshairHandler);
        cell.unsubCrosshair = () => chart.unsubscribeCrosshairMove(crosshairHandler);

        // Time-scale sync (optional)
        if (state.syncTimeScale) {
            const rangeHandler = (range) => {
                if (state.syncing || state.destroyed || !range) return;
                state.syncing = true;
                try {
                    for (const other of state.cells) {
                        if (other === cell) continue;
                        try { other.chart.timeScale().setVisibleLogicalRange(
                            cell.chart.timeScale().getVisibleLogicalRange()
                        ); } catch (_) {}
                    }
                } finally {
                    state.syncing = false;
                }
            };
            chart.timeScale().subscribeVisibleTimeRangeChange(rangeHandler);
            cell.unsubRange = () => {
                try { chart.timeScale().unsubscribeVisibleTimeRangeChange(rangeHandler); } catch (_) {}
            };
        }

        state.cells.push(cell);
        loadCellData(cell);
        return cell;
    }

    function rebuild() {
        if (state.destroyed) return;
        ensureChartsLength();
        disposeAllCells();
        applyGridTemplate();
        const n = gridCount();
        for (let i = 0; i < n; i++) {
            buildCell(i, state.charts[i]);
        }
    }

    const api = {
        setLayout(rows, cols) {
            state.rows = Math.max(1, rows | 0);
            state.cols = Math.max(1, cols | 0);
            rebuild();
        },
        setSymbolAt(index, symbol) {
            if (index < 0 || index >= state.cells.length) return;
            const cell = state.cells[index];
            cell.symbol = symbol;
            state.charts[index] = { ...state.charts[index], symbol };
            cell.symEl.textContent = symbol;
            loadCellData(cell);
        },
        setTimeframeAt(index, tf) {
            if (index < 0 || index >= state.cells.length) return;
            const cell = state.cells[index];
            cell.tf = tf;
            state.charts[index] = { ...state.charts[index], tf };
            cell.tfEl.textContent = tf;
            loadCellData(cell);
        },
        setSyncTimeScale(on) {
            state.syncTimeScale = !!on;
            rebuild();
        },
        maximizeCell(index) {
            if (index < 0 || index >= state.cells.length) return;
            const keep = state.charts[index];
            state.charts = [keep];
            state.rows = 1;
            state.cols = 1;
            rebuild();
        },
        getLayout() { return { rows: state.rows, cols: state.cols }; },
        getCellCount() { return state.cells.length; },
        destroy() {
            if (state.destroyed) return;
            state.destroyed = true;
            disposeAllCells();
            if (grid.parentNode) grid.parentNode.removeChild(grid);
        },
    };

    rebuild();
    return api;
}

export default createMultiChartLayout;
