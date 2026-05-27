// Página /scripts/editors-picks — Figma frame 25-177804.
// Wrapper sobre src/scripts-editors-picks.js (extraído componente a componente con Figma MCP).
import { createScriptsEditorsPicks } from '../scripts-editors-picks.js';

export function renderScriptsEditorsPicks(mount) {
  const inst = createScriptsEditorsPicks(mount, {});
  if (typeof inst.render === 'function') inst.render();
  return { destroy: () => { try { inst.destroy && inst.destroy(); } catch {} } };
}
