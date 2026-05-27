// Página /ideas/recent — Figma frame 25-169732.
// Wrapper sobre src/ideas-community.js (extraído componente a componente con Figma MCP).
import { createIdeasCommunity } from '../ideas-community.js';

export function renderIdeasRecent(mount) {
  const inst = createIdeasCommunity(mount, {});
  if (typeof inst.render === 'function') inst.render();
  return { destroy: () => { try { inst.destroy && inst.destroy(); } catch {} } };
}
