// Options → Volatility sub-tab
// Matches Figma frame 17:156881 (.figma-cache/09-17-156881.png)
// Date strip + large volatility-smile chart rendered with the real
// `lightweight-charts` library (same engine used by the chart-view page).

import { createChart, LineSeries, LineStyle, CrosshairMode } from 'lightweight-charts';

const STYLES = `
.optv-root{
  display:flex;flex-direction:column;width:100%;min-height:calc(100vh - 220px);
  background:var(--tv-bg-0,#0f0f0f);color:var(--tv-text,#d1d4dc);
  font-family:'Trebuchet MS',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  padding:8px 24px 24px;box-sizing:border-box;
}
.optv-datebar{
  display:flex;flex-direction:column;gap:4px;padding:4px 0 10px;
  position:relative;
}
.optv-month-row{
  display:flex;align-items:center;height:18px;padding:0 36px;
  position:relative;
}
.optv-month-row .optv-month-label{
  position:absolute;font-size:12px;color:var(--tv-text-muted,#787b86);
  text-transform:lowercase;line-height:18px;
}
.optv-month-row .optv-month-label.is-muted{color:var(--tv-text-dim,#5d6168);}
.optv-day-row{
  display:flex;align-items:center;gap:4px;height:28px;position:relative;
}
.optv-nav{
  width:24px;height:24px;display:flex;align-items:center;justify-content:center;
  border:none;border-radius:4px;
  background:transparent;color:var(--tv-text-muted,#787b86);cursor:pointer;
  font-size:11px;line-height:1;flex-shrink:0;padding:0;
}
.optv-nav:hover{background:var(--tv-bg-2,#1e222d);color:var(--tv-text,#d1d4dc);}
.optv-days-track{
  display:flex;flex:1;gap:4px;overflow:hidden;align-items:center;
}
.optv-day{
  min-width:26px;height:22px;padding:0 6px;display:flex;align-items:center;
  justify-content:center;border-radius:11px;background:transparent;
  color:var(--tv-text,#d1d4dc);font-size:11px;cursor:pointer;
  border:1px solid transparent;
  flex-shrink:0;transition:background 120ms,color 120ms,border-color 120ms;
  box-sizing:border-box;line-height:1;
}
.optv-day:hover{background:var(--tv-bg-2,#1e222d);}
.optv-day.is-selected{
  background:#ffffff;color:#0f0f0f;font-weight:600;border-color:#ffffff;
}
.optv-day.is-muted{color:var(--tv-text-dim,#5d6168);}
.optv-chart-wrap{
  position:relative;flex:1;min-height:540px;margin-top:4px;
  background:#0f0f0f;
}
.optv-chart-host{position:absolute;inset:0;}
.optv-grid-line{stroke:rgba(255,255,255,0.06);stroke-width:1;}
.optv-axis-text{
  fill:var(--tv-text-muted,#787b86);font-size:11px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
.optv-axis-text.is-x{font-size:11px;}
.optv-curve{fill:none;stroke:#2962ff;stroke-width:1.5;stroke-linejoin:round;}
.optv-strike-line{stroke:rgba(255,255,255,0.35);stroke-width:1;stroke-dasharray:3 3;}
.optv-watermark{
  fill:#22a6c4;font-size:14px;font-weight:600;opacity:0.95;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
`;

// Continuous day strip — labels mark where month boundaries fall.
// Each entry: { day, month|null, muted? }
// Built from Figma: leading "3 4 5" (no month label above them — prior month residue),
// then jun (9..30), then jul (1,7,10,17,24,31), then ago (7,21,28,31), then sept dimmed.
const DAYS = [
  { day:3,  month:null },
  { day:4,  month:null },
  { day:5,  month:null, muted:true },
  { day:9,  month:'jun' },
  { day:10, month:'jun' },
  { day:11, month:'jun' },
  { day:12, month:'jun' },
  { day:15, month:'jun' },
  { day:16, month:'jun' },
  { day:17, month:'jun' },
  { day:18, month:'jun' },
  { day:22, month:'jun' },
  { day:23, month:'jun' },
  { day:24, month:'jun' },
  { day:25, month:'jun', selected:true },
  { day:26, month:'jun' },
  { day:29, month:'jun' },
  { day:30, month:'jun' },
  { day:1,  month:'jul' },
  { day:7,  month:'jul' },
  { day:10, month:'jul' },
  { day:17, month:'jul' },
  { day:24, month:'jul' },
  { day:31, month:'jul' },
  { day:7,  month:'ago' },
  { day:21, month:'ago' },
  { day:28, month:'ago' },
  { day:31, month:'ago' },
  { day:1,  month:'sept', muted:true },
];

// Month label anchors (computed as group start index into DAYS).
function monthSpans(){
  const spans = [];
  let curr = null;
  DAYS.forEach((d, i) => {
    if (d.month !== curr){
      if (spans.length) spans[spans.length-1].end = i - 1;
      spans.push({ month:d.month, start:i, muted: d.muted && d.month === 'sept' });
      curr = d.month;
    }
  });
  if (spans.length) spans[spans.length-1].end = DAYS.length - 1;
  return spans.filter(s => s.month);
}

// Y-axis labels top→bottom (every 40%)
const Y_LABELS = [600,560,520,480,440,400,360,320,280,240,200,160,120,80,40,0,-40];
// X-axis ticks (faithful to Figma)
const X_TICKS = [100,5000,5700,6200,6550,6800,6975,7150,7325,7500,7675,7850,8000,8600];

// Volatility-smile curve: very steep drop 100→5000, then near-flat floor with
// imperceptible rise toward 8600. Mirrors Figma exactly.
const CURVE = [
  [100,480],[300,380],[600,280],[1000,190],[1500,130],[2200,90],
  [3000,60],[4000,45],[5000,40],
  [5700,36],[6200,34],[6550,33],[6800,33],[6975,33],[7150,33],
  [7325,34],[7500,35],[7675,36],[7850,37],[8000,39],[8300,42],[8600,46],
];

const STRIKE_LINE = 7500;

export function renderOptionsVolatilityTab(mount, opts = {}) {
  mount.innerHTML = `
    <style>${STYLES}</style>
    <div class="optv-root">
      <div class="optv-datebar">
        <div class="optv-month-row">${renderMonthLabels()}</div>
        <div class="optv-day-row">
          <button class="optv-nav optv-prev" aria-label="Anterior">&#10094;</button>
          <div class="optv-days-track">${renderDays()}</div>
          <button class="optv-nav optv-next" aria-label="Siguiente">&#10095;</button>
        </div>
      </div>
      <div class="optv-chart-wrap"><div class="optv-chart-host" data-chart></div></div>
    </div>
  `;

  // ----- Real lightweight-charts volatility smile -----
  const chartHost = mount.querySelector('[data-chart]');
  let chart = null;
  let series = null;
  let chartRO = null;
  function mountChart() {
    if (!chartHost) return;
    chart = createChart(chartHost, {
      layout: {
        background: { type: 'solid', color: '#0f0f0f' },
        textColor: '#9598a1',
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      rightPriceScale: {
        borderColor: '#2e2e2e',
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: '#2e2e2e',
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: (time) => String(time),  // raw strike value
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: '#4a4a4a', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
        horzLine: { color: '#4a4a4a', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
      },
      width:  chartHost.clientWidth  || 1400,
      height: chartHost.clientHeight || 540,
      handleScroll: false,
      handleScale: false,
      watermark: {
        visible: true,
        text: 'TradingView',
        fontSize: 14,
        color: 'rgba(34, 166, 196, 0.65)',
        horzAlign: 'left',
        vertAlign: 'bottom',
      },
    });
    series = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      priceFormat: { type: 'custom', formatter: (v) => v.toFixed(2) + '%' },
    });
    // Build the volatility smile from CURVE — strike as synthetic time so
    // lightweight-charts plots strike on X and IV% on Y.
    const data = CURVE
      .slice()
      .sort((a, b) => a[0] - b[0])
      .map(([strike, iv]) => ({ time: strike, value: iv }));
    series.setData(data);

    // Dashed vertical at the at-the-money strike, plus a horizontal at IV=0
    // for reference. lightweight-charts doesn't natively support vertical
    // price lines, so we add a price line on the series instead.
    const strikeIv = (data.find(d => d.time === STRIKE_LINE) || data[Math.floor(data.length/2)]).value;
    series.createPriceLine({
      price: strikeIv,
      color: 'rgba(255,255,255,0.35)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Strike ' + STRIKE_LINE,
    });

    chart.timeScale().fitContent();

    // Resize chart with its container.
    chartRO = new ResizeObserver(() => {
      if (!chartHost.clientWidth || !chartHost.clientHeight) return;
      chart.applyOptions({ width: chartHost.clientWidth, height: chartHost.clientHeight });
    });
    chartRO.observe(chartHost);
  }
  // Defer to next frame so flex layout has computed real dimensions.
  requestAnimationFrame(mountChart);

  const track = mount.querySelector('.optv-days-track');
  const labelRow = mount.querySelector('.optv-month-row');

  // Position month labels above their first-day button (after layout).
  const positionLabels = () => {
    const buttons = track.querySelectorAll('.optv-day');
    const trackRect = track.getBoundingClientRect();
    monthSpans().forEach(span => {
      const label = labelRow.querySelector(`[data-month="${span.month}"]`);
      const btn = buttons[span.start];
      if (label && btn){
        const r = btn.getBoundingClientRect();
        label.style.left = `${(r.left - trackRect.left) + 36 /*nav width+gap*/}px`;
      }
    });
  };
  requestAnimationFrame(positionLabels);
  const ro = new ResizeObserver(positionLabels);
  ro.observe(track);

  const onClick = (e) => {
    const btn = e.target.closest('.optv-day');
    if (!btn) return;
    track.querySelectorAll('.optv-day.is-selected').forEach(n => n.classList.remove('is-selected'));
    btn.classList.add('is-selected');
  };
  track.addEventListener('click', onClick);

  return {
    destroy(){
      ro.disconnect();
      try { chartRO && chartRO.disconnect(); } catch {}
      try { chart && chart.remove(); } catch {}
      chart = null; series = null; chartRO = null;
      track.removeEventListener('click', onClick);
      mount.innerHTML = '';
    }
  };
}

function renderMonthLabels(){
  return monthSpans().map(s =>
    `<div class="optv-month-label${s.muted?' is-muted':''}" data-month="${s.month}">${s.month}</div>`
  ).join('');
}

function renderDays(){
  return DAYS.map((d, i) => {
    const cls = `optv-day${d.selected?' is-selected':''}${d.muted?' is-muted':''}`;
    return `<button class="${cls}" data-i="${i}" data-day="${d.day}">${d.day}</button>`;
  }).join('');
}

function renderChart(){
  // Use viewBox in pixels — scales to container via SVG.
  const W = 1400, H = 560;
  const padL = 20, padR = 80, padT = 12, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yMin = -40, yMax = 600;
  const xMin = 100, xMax = 8600;

  const xToPx = (v) => padL + ((v - xMin) / (xMax - xMin)) * plotW;
  const yToPx = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  // Horizontal grid + Y labels (right-aligned with % suffix)
  const gridLines = Y_LABELS.map(v => {
    const y = yToPx(v);
    return `<line class="optv-grid-line" x1="${padL}" x2="${padL+plotW}" y1="${y}" y2="${y}"/>
            <text class="optv-axis-text" x="${padL+plotW+8}" y="${y+4}">${v.toFixed(2)}%</text>`;
  }).join('');

  // X-axis labels (below plot)
  const xLabels = X_TICKS.map(v => {
    const x = xToPx(v);
    return `<text class="optv-axis-text is-x" x="${x}" y="${H-12}" text-anchor="middle">${v}</text>`;
  }).join('');

  // Strike dashed vertical
  const sx = xToPx(STRIKE_LINE);
  const strikeLine = `<line class="optv-strike-line" x1="${sx}" x2="${sx}" y1="${padT}" y2="${padT+plotH}"/>`;

  // Curve polyline
  const pts = CURVE.map(([x,y]) => `${xToPx(x).toFixed(1)},${yToPx(y).toFixed(1)}`).join(' ');
  const curve = `<polyline class="optv-curve" points="${pts}"/>`;

  // TradingView watermark — bottom-left, just above x-axis ticks (near 0% line).
  const wmY = yToPx(0) + 4;
  const watermark = `<g class="optv-watermark-g">
    <rect x="${padL+6}" y="${wmY-12}" width="14" height="14" fill="#22a6c4" opacity="0.9"/>
    <text class="optv-watermark" x="${padL+26}" y="${wmY}">TradingView</text>
  </g>`;

  return `
    <svg class="optv-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${gridLines}
      ${strikeLine}
      ${curve}
      ${xLabels}
      ${watermark}
    </svg>
  `;
}

export default renderOptionsVolatilityTab;
