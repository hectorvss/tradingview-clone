// volume-profile.js
// Canvas overlay Volume Profile for lightweight-charts.
// Public API: createVolumeProfile(chart, series, container, options) -> { show, hide, setRange, destroy }

const DEFAULTS = {
    bins: 60,
    side: 'right',        // 'right' | 'left'
    width: 100,           // pixel width of the longest bar
    opacity: 0.6,
    color: '#9c27b0',
    pocColor: '#ffeb3b',
    vaColor: '#f7a600',
    showPOC: true,
    showVA: true,
    valueAreaPct: 0.70,
    barGap: 1,            // pixels between bars
};

export function createVolumeProfile(chart, series, container, userOptions = {}) {
    const opts = Object.assign({}, DEFAULTS, userOptions);

    // ---- State ----
    let visible = true;
    let manualRange = null;   // { from, to } in chart time units; null = use visible range
    let candleData = [];      // cached candle dataset (set via setData or grabbed from series)
    let lastBins = null;      // computed bin metadata for tooltip
    let pocBin = -1;
    let vahBin = -1;
    let valBin = -1;
    let totalVolume = 0;

    // ---- DOM ----
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '5';
    container.appendChild(canvas);

    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '6';
    tooltip.style.padding = '4px 8px';
    tooltip.style.background = 'rgba(20,20,28,0.92)';
    tooltip.style.color = '#fff';
    tooltip.style.font = '11px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
    tooltip.style.border = '1px solid rgba(255,255,255,0.15)';
    tooltip.style.borderRadius = '4px';
    tooltip.style.display = 'none';
    tooltip.style.whiteSpace = 'nowrap';
    container.appendChild(tooltip);

    const ctx = canvas.getContext('2d');

    // ---- Data grab ----
    // The user may not call setData; try to scrape from the chart's series in known shapes.
    function pullDataFromSeries() {
        try {
            if (typeof series.data === 'function') {
                const d = series.data();
                if (Array.isArray(d) && d.length) return d;
            }
        } catch (_) {}
        // common pattern: user attaches the array to series under a custom key
        if (Array.isArray(series.__vpData)) return series.__vpData;
        return candleData;
    }

    function setData(d) {
        candleData = Array.isArray(d) ? d : [];
        render();
    }

    // ---- Sizing ----
    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---- Time helpers ----
    function timeToNumber(t) {
        if (t == null) return NaN;
        if (typeof t === 'number') return t;
        if (typeof t === 'string') {
            // 'YYYY-MM-DD' business day strings
            const d = Date.parse(t);
            return isNaN(d) ? NaN : Math.floor(d / 1000);
        }
        if (typeof t === 'object') {
            // BusinessDay { year, month, day }
            if (t.year != null && t.month != null && t.day != null) {
                return Math.floor(Date.UTC(t.year, t.month - 1, t.day) / 1000);
            }
        }
        return NaN;
    }

    // ---- Core compute ----
    function compute() {
        const data = pullDataFromSeries();
        if (!data || !data.length) return null;

        let from, to;
        if (manualRange) {
            from = timeToNumber(manualRange.from);
            to = timeToNumber(manualRange.to);
        } else {
            const vr = chart.timeScale().getVisibleRange();
            if (!vr) return null;
            from = timeToNumber(vr.from);
            to = timeToNumber(vr.to);
        }
        if (!isFinite(from) || !isFinite(to) || to <= from) return null;

        // Filter candles in range
        const inRange = [];
        let hi = -Infinity, lo = Infinity;
        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            const t = timeToNumber(c.time);
            if (!isFinite(t) || t < from || t > to) continue;
            if (c.high > hi) hi = c.high;
            if (c.low < lo) lo = c.low;
            inRange.push(c);
        }
        if (!inRange.length || !isFinite(hi) || !isFinite(lo) || hi <= lo) return null;

        const nBins = Math.max(2, opts.bins | 0);
        const binSize = (hi - lo) / nBins;
        const bins = new Float64Array(nBins);
        const bullBins = new Float64Array(nBins);
        const bearBins = new Float64Array(nBins);
        let total = 0;

        for (let i = 0; i < inRange.length; i++) {
            const c = inRange[i];
            const v = +c.volume || 0;
            if (v <= 0) continue;
            const cl = +c.low, ch = +c.high;
            const isBull = (+c.close >= +c.open);
            if (ch === cl) {
                const b = Math.min(nBins - 1, Math.max(0, Math.floor((cl - lo) / binSize)));
                bins[b] += v;
                (isBull ? bullBins : bearBins)[b] += v;
                total += v;
                continue;
            }
            // Uniform distribution across the candle's price span
            const startBin = Math.min(nBins - 1, Math.max(0, Math.floor((cl - lo) / binSize)));
            const endBin = Math.min(nBins - 1, Math.max(0, Math.floor((ch - lo) / binSize)));
            const span = endBin - startBin + 1;
            const share = v / span;
            for (let b = startBin; b <= endBin; b++) {
                bins[b] += share;
                (isBull ? bullBins : bearBins)[b] += share;
            }
            total += v;
        }

        // POC
        let poc = 0, maxV = -1;
        for (let i = 0; i < nBins; i++) {
            if (bins[i] > maxV) { maxV = bins[i]; poc = i; }
        }

        // Value area: expand around POC until 70% volume captured
        let vah = poc, val = poc;
        let captured = bins[poc];
        const target = total * opts.valueAreaPct;
        while (captured < target && (val > 0 || vah < nBins - 1)) {
            const up1 = vah + 1 < nBins ? bins[vah + 1] : -1;
            const up2 = vah + 2 < nBins ? bins[vah + 2] : 0;
            const dn1 = val - 1 >= 0 ? bins[val - 1] : -1;
            const dn2 = val - 2 >= 0 ? bins[val - 2] : 0;
            const upSum = (up1 < 0 ? -Infinity : up1 + (up2 || 0));
            const dnSum = (dn1 < 0 ? -Infinity : dn1 + (dn2 || 0));
            if (upSum >= dnSum && up1 >= 0) {
                vah += 1; captured += up1;
                if (vah + 1 < nBins && captured < target) { vah += 1; captured += up2; }
            } else if (dn1 >= 0) {
                val -= 1; captured += dn1;
                if (val - 1 >= 0 && captured < target) { val -= 1; captured += dn2; }
            } else {
                break;
            }
        }

        return { bins, bullBins, bearBins, nBins, binSize, hi, lo, maxV, poc, vah, val, total };
    }

    // ---- Render ----
    function render() {
        if (!visible) return;
        resize();
        const w = container.clientWidth;
        const h = container.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const res = compute();
        lastBins = res;
        if (!res) return;
        pocBin = res.poc; vahBin = res.vah; valBin = res.val; totalVolume = res.total;

        // Determine vertical pixel extent from price-to-coordinate
        const yHi = series.priceToCoordinate(res.hi);
        const yLo = series.priceToCoordinate(res.lo);
        if (yHi == null || yLo == null) return;
        const yTop = Math.min(yHi, yLo);
        const yBot = Math.max(yHi, yLo);
        if (yBot - yTop < 2) return;

        const barHeight = Math.max(1, (yBot - yTop) / res.nBins - opts.barGap);
        const isRight = opts.side !== 'left';
        const edge = isRight ? w : 0;

        ctx.globalAlpha = opts.opacity;

        for (let i = 0; i < res.nBins; i++) {
            const v = res.bins[i];
            if (v <= 0) continue;
            const len = (v / res.maxV) * opts.width;
            // bin index 0 corresponds to lo (bottom)
            const yBinBottom = yBot - (i / res.nBins) * (yBot - yTop);
            const yBinTop = yBinBottom - barHeight;

            const inVA = (i >= res.val && i <= res.vah);
            let fill = opts.color;
            if (opts.showPOC && i === res.poc) fill = opts.pocColor;
            else if (opts.showVA && inVA) fill = opts.vaColor;

            ctx.fillStyle = fill;
            const x = isRight ? (edge - len) : edge;
            ctx.fillRect(x, yBinTop, len, barHeight);
        }

        // VA boundary lines
        if (opts.showVA) {
            ctx.globalAlpha = Math.min(1, opts.opacity + 0.3);
            ctx.strokeStyle = opts.vaColor;
            ctx.lineWidth = 1;
            const drawLine = (binIdx) => {
                const y = yBot - (binIdx / res.nBins) * (yBot - yTop);
                ctx.beginPath();
                if (isRight) { ctx.moveTo(edge - opts.width, y); ctx.lineTo(edge, y); }
                else         { ctx.moveTo(0, y); ctx.lineTo(opts.width, y); }
                ctx.stroke();
            };
            drawLine(res.vah + 1);
            drawLine(res.val);
        }

        // POC line
        if (opts.showPOC) {
            ctx.globalAlpha = Math.min(1, opts.opacity + 0.3);
            ctx.strokeStyle = opts.pocColor;
            ctx.lineWidth = 1.5;
            const y = yBot - ((res.poc + 0.5) / res.nBins) * (yBot - yTop);
            ctx.beginPath();
            if (isRight) { ctx.moveTo(edge - opts.width, y); ctx.lineTo(edge, y); }
            else         { ctx.moveTo(0, y); ctx.lineTo(opts.width, y); }
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    // ---- Tooltip ----
    function onCrosshair(param) {
        if (!visible || !lastBins || !param || !param.point) {
            tooltip.style.display = 'none';
            return;
        }
        const { x, y } = param.point;
        const w = container.clientWidth;
        const isRight = opts.side !== 'left';
        const inX = isRight ? (x >= w - opts.width && x <= w) : (x >= 0 && x <= opts.width);
        if (!inX) { tooltip.style.display = 'none'; return; }

        const res = lastBins;
        const yHi = series.priceToCoordinate(res.hi);
        const yLo = series.priceToCoordinate(res.lo);
        if (yHi == null || yLo == null) { tooltip.style.display = 'none'; return; }
        const yTop = Math.min(yHi, yLo);
        const yBot = Math.max(yHi, yLo);
        if (y < yTop || y > yBot) { tooltip.style.display = 'none'; return; }

        const frac = (yBot - y) / (yBot - yTop);
        const binIdx = Math.min(res.nBins - 1, Math.max(0, Math.floor(frac * res.nBins)));
        const priceLo = res.lo + binIdx * res.binSize;
        const priceHi = priceLo + res.binSize;
        const v = res.bins[binIdx];
        const pct = res.total > 0 ? (v / res.total * 100) : 0;
        let tag = '';
        if (binIdx === res.poc) tag = ' POC';
        else if (binIdx === res.vah) tag = ' VAH';
        else if (binIdx === res.val) tag = ' VAL';
        else if (binIdx > res.val && binIdx < res.vah) tag = ' VA';

        tooltip.innerHTML =
            `<b>${priceLo.toFixed(2)} - ${priceHi.toFixed(2)}</b>${tag}<br>` +
            `Vol: ${formatVol(v)} (${pct.toFixed(2)}%)`;
        tooltip.style.display = 'block';
        // Position tooltip near cursor but inside container
        const tx = isRight ? (w - opts.width - 8 - tooltip.offsetWidth) : (opts.width + 8);
        tooltip.style.left = Math.max(4, tx) + 'px';
        tooltip.style.top = Math.max(4, y - 20) + 'px';
    }

    function formatVol(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(0);
    }

    // ---- Subscriptions ----
    const ts = chart.timeScale();
    const onRangeChange = () => render();
    const onSizeChange = () => render();
    ts.subscribeVisibleTimeRangeChange(onRangeChange);
    if (typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        ts.subscribeVisibleLogicalRangeChange(onRangeChange);
    }
    if (typeof ts.subscribeSizeChange === 'function') {
        ts.subscribeSizeChange(onSizeChange);
    }
    chart.subscribeCrosshairMove(onCrosshair);

    const ro = new ResizeObserver(() => render());
    ro.observe(container);

    // Initial render (next tick so chart has dimensions)
    setTimeout(render, 0);

    // ---- Public API ----
    return {
        show() {
            visible = true;
            canvas.style.display = 'block';
            render();
        },
        hide() {
            visible = false;
            canvas.style.display = 'none';
            tooltip.style.display = 'none';
        },
        setRange(fromTime, toTime) {
            if (fromTime == null && toTime == null) manualRange = null;
            else manualRange = { from: fromTime, to: toTime };
            render();
        },
        setData,
        render,
        destroy() {
            try { ts.unsubscribeVisibleTimeRangeChange(onRangeChange); } catch (_) {}
            try { ts.unsubscribeVisibleLogicalRangeChange && ts.unsubscribeVisibleLogicalRangeChange(onRangeChange); } catch (_) {}
            try { ts.unsubscribeSizeChange && ts.unsubscribeSizeChange(onSizeChange); } catch (_) {}
            try { chart.unsubscribeCrosshairMove(onCrosshair); } catch (_) {}
            try { ro.disconnect(); } catch (_) {}
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        },
    };
}

export default { createVolumeProfile };
