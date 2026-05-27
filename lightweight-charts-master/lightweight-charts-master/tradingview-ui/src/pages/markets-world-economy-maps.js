// Página /markets/world-economy/maps — Figma frames 25-151876, 25-155064, 25-158174, 25-161248.
// Wrapper sobre src/macro-maps.js (extraído componente a componente con Figma MCP).
import { createMacroMaps } from '../macro-maps.js';

export function renderMarketsWorldEconomyMaps(mount) {
  const inst = createMacroMaps(mount, {});
  if (typeof inst.render === 'function') inst.render();
  return { destroy: () => { try { inst.destroy && inst.destroy(); } catch {} } };
}
