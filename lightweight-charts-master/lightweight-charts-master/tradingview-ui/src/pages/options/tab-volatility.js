// Options → Volatility sub-tab
// Matches Figma frame 17:156881 (.figma-cache/09-17-156881.png)
// Date strip + large volatility-smile chart rendered with the real
// `lightweight-charts` library (same engine used by the chart-view page).

import { createChart, LineSeries, LineStyle, CrosshairMode } from 'lightweight-charts';

const STYLES = `
.optv-root{
  display:flex;flex-direction:column;width:100%;height:100%;min-height:0;
  background:var(--tv-bg-0,#0f0f0f);color:var(--tv-text,#d1d4dc);
  font-family:'Trebuchet MS',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  padding:8px 24px 16px;box-sizing:border-box;overflow:hidden;
}
.optv-datebar{
  display:flex;flex-direction:column;gap:4px;padding:4px 0 10px;
  position:sticky;top:0;z-index:5;background:var(--tv-bg-0,#0f0f0f);
  flex-shrink:0;
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
  position:relative;flex:1 1 auto;min-height:0;width:100%;
  margin-top:4px;background:#0f0f0f;overflow:hidden;
}
.optv-chart-host{position:absolute;inset:0;width:100%;height:100%;}
.optv-tooltip{
  position:absolute;pointer-events:none;z-index:10;
  background:rgba(20,22,28,0.96);color:var(--tv-text,#d1d4dc);
  border:1px solid var(--tv-border,#2a2e39);border-radius:4px;
  padding:6px 8px;font-size:11px;line-height:1.4;
  box-shadow:0 4px 12px rgba(0,0,0,0.45);
  display:none;white-space:nowrap;
}
.optv-tooltip.is-visible{display:block;}
.optv-tooltip .row{display:flex;justify-content:space-between;gap:10px;}
.optv-tooltip .lbl{color:var(--tv-text-muted,#787b86);}
.optv-tooltip .val{color:var(--tv-text,#d1d4dc);font-weight:600;}
.optv-tooltip .val.is-iv{color:#2962ff;}
`;

// Continuous day strip — labels mark where month boundaries fall.
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

// Volatility-smile curve: steep drop 100→5000, near-flat floor with imperceptible rise.
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
      <div class="optv-chart-wrap">
        <div class="optv-chart-host" data-chart></div>
        <div class="optv-tooltip" data-tt>
          <div class="row"><span class="lbl">Strike</span><span class="val" data-tt-strike>—</span></div>
          <div class="row"><span class="lbl">IV</span><span class="val is-iv" data-tt-iv>—</span></div>
        </div>
      </div>
    </div>
  `;

  const chartHost = mount.querySelector('[data-chart]');
  const chartWrap = mount.querySelector('.optv-chart-wrap');
  const tooltipEl = mount.querySelector('[data-tt]');
  const ttStrike = mount.querySelector('[data-tt-strike]');
  const ttIv     = mount.querySelector('[data-tt-iv]');
  let chart = null;
  let series = null;
  let chartRO = null;
  let onCrosshairMove = null;
  let onMouseLeave = null;

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
        tickMarkFormatter: (time) => String(time),
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
    const data = CURVE
      .slice()
      .sort((a, b) => a[0] - b[0])
      .map(([strike, iv]) => ({ time: strike, value: iv }));
    series.setData(data);

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

    chartRO = new ResizeObserver(() => {
      if (!chartHost.clientWidth || !chartHost.clientHeight) return;
      chart.applyOptions({ width: chartHost.clientWidth, height: chartHost.clientHeight });
      chart.timeScale().fitContent();
    });
    chartRO.observe(chartHost);

    // Custom hover tooltip — follows cursor, shows strike + IV.
    onCrosshairMove = (param) => {
      if (!param || !param.point || param.point.x < 0 || param.point.y < 0 || !param.seriesData) {
        tooltipEl.classList.remove('is-visible');
        return;
      }
      const sData = param.seriesData.get(series);
      if (!sData) {
        tooltipEl.classList.remove('is-visible');
        return;
      }
      ttStrike.textContent = String(param.time != null ? param.time : sData.time);
      ttIv.textContent = (sData.value != null ? sData.value.toFixed(2) : '—') + '%';
      tooltipEl.classList.add('is-visible');
      // Position relative to chart-wrap (which is offsetParent of tooltip).
      const wrapW = chartWrap.clientWidth;
      const ttW = tooltipEl.offsetWidth || 120;
      let left = param.point.x + 14;
      if (left + ttW > wrapW - 4) left = param.point.x - ttW - 14;
      const top = Math.max(6, param.point.y - 36);
      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top  = top + 'px';
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    onMouseLeave = () => tooltipEl.classList.remove('is-visible');
    chartHost.addEventListener('mouseleave', onMouseLeave);
  }
  requestAnimationFrame(mountChart);

  const track = mount.querySelector('.optv-days-track');
  const labelRow = mount.querySelector('.optv-month-row');

  const positionLabels = () => {
    const buttons = track.querySelectorAll('.optv-day');
    const trackRect = track.getBoundingClientRect();
    monthSpans().forEach(span => {
      const label = labelRow.querySelector(`[data-month="${span.month}"]`);
      const btn = buttons[span.start];
      if (label && btn){
        const r = btn.getBoundingClientRect();
        label.style.left = `${(r.left - trackRect.left) + 36}px`;
      }
    });
  };
  requestAnimationFrame(positionLabels);
  const ro = new ResizeObserver(positionLabels);
  ro.observe(track);

  const onClick = (e) => {
    const btn = e.target.closest('.optv-day');
    if (!btn) return;
    const wasSelected = btn.classList.contains('is-selected');
    track.querySelectorAll('.optv-day.is-selected').forEach(n => n.classList.remove('is-selected'));
    if (!wasSelected) btn.classList.add('is-selected');
  };
  track.addEventListener('click', onClick);

  return {
    destroy(){
      ro.disconnect();
      try { chartRO && chartRO.disconnect(); } catch {}
      try { onCrosshairMove && chart && chart.unsubscribeCrosshairMove(onCrosshairMove); } catch {}
      try { onMouseLeave && chartHost && chartHost.removeEventListener('mouseleave', onMouseLeave); } catch {}
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

export default renderOptionsVolatilityTab;
