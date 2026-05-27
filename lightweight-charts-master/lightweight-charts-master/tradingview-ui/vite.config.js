import { defineConfig } from 'vite';
import { resolve } from 'path';

// SPA fallback para rutas limpias (History API): /community, /markets, /markets/world/spain,
// /markets/corporate-actions. Las otras subaplicaciones (portfolio/, options/, etc.) tienen
// su propio index.html y se sirven directamente.
const SPA_PATHS = [
  /^\/community(?:\/|$)/,
  /^\/markets(?:\/|$)/,
];
function spaFallback() {
  return {
    name: 'tv-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url || '').split('?')[0];
        if (req.method === 'GET' && SPA_PATHS.some(r => r.test(url))) {
          req.url = '/index.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: { port: 5174 },
  plugins: [spaFallback()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        yieldCurve: resolve(__dirname, 'yield-curve-demo.html'),
        portfolio: resolve(__dirname, 'portfolio/index.html'),
        options: resolve(__dirname, 'options/index.html'),
        financialCharts: resolve(__dirname, 'financial-charts/index.html'),
        earningsCalendar: resolve(__dirname, 'earnings-calendar/index.html'),
        ipoCalendar: resolve(__dirname, 'ipo-calendar/index.html'),
        heatmapInflation: resolve(__dirname, 'heatmap-inflation/index.html'),
      },
    },
  },
});
