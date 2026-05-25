import './styles.css';
import { renderMarketOverview } from './market-overview.js';
import { renderChartView } from './chart-view.js';

const app = document.getElementById('app');

function navigate() {
  const hash = window.location.hash || '#/';

  if (hash.startsWith('#/chart')) {
    renderChartView(app);
  } else {
    renderMarketOverview(app, () => {
      window.location.hash = '#/chart/NVDA';
    });
  }
}

window.addEventListener('hashchange', navigate);
navigate();
