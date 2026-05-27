#!/usr/bin/env node
// figma-trim.mjs — Post-process figma-to-html output by dropping
// absolutely-positioned elements whose local `top:` exceeds a threshold.
// Relies on the parser's clean 2-space indentation: when we drop a line,
// we also drop every following line whose indent is strictly greater
// (i.e. the descendants), plus the matching closing tag at the same indent.
//
// Usage:
//   node scripts/figma-trim.mjs --input <html> --max-y <px> --output <html>

import fs from 'node:fs';

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const input = arg('--input');
const output = arg('--output');
const maxY = parseFloat(arg('--max-y') ?? '3000');
const minY = parseFloat(arg('--min-y') ?? '-200');

if (!input || !output || !Number.isFinite(maxY)) {
  console.error('Usage: figma-trim.mjs --input <html> --max-y <px> --output <html>');
  process.exit(1);
}

const src = fs.readFileSync(input, 'utf8');
const lines = src.split(/\r?\n/);

const indentOf = (line) => {
  let i = 0;
  while (i < line.length && line[i] === ' ') i++;
  return i;
};

const topRe = /top:(-?\d+(?:\.\d+)?)px/;
// Open tag (no self-close, no immediate close on same line)
const openTagRe = /^\s*<([a-zA-Z][\w-]*)\b[^>]*>\s*$/;
// Self-closed: <foo .../> OR <foo ...></foo> on same line OR void empty <foo ...>
const sameLineCloseRe = /<\/[a-zA-Z][\w-]*>\s*$/;

// Track cumulative top by indent depth. When we open an element at indent N
// with local top T, cumulative[N] = cumulative[parent] + T. Drop if cumulative > maxY.
const out = [];
let dropDepth = -1; // indent at which we started dropping; -1 = not dropping
let droppedCount = 0;
const cumByIndent = new Map(); // indent -> cumulative top of element OPENED at that indent

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const ind = indentOf(line);

  if (dropDepth >= 0) {
    if (ind > dropDepth) continue;
    if (ind === dropDepth && /^\s*<\//.test(line)) {
      dropDepth = -1;
      continue;
    }
    dropDepth = -1;
  }

  const m = line.match(topRe);
  if (m) {
    const localTop = parseFloat(m[1]);
    // Find nearest ancestor cumulative
    let parentCum = 0;
    for (let p = ind - 2; p >= 0; p -= 2) {
      if (cumByIndent.has(p)) { parentCum = cumByIndent.get(p); break; }
    }
    const cum = parentCum + localTop;
    const isOpen = openTagRe.test(line) && !sameLineCloseRe.test(line);
    if (isOpen) {
      cumByIndent.set(ind, cum);
    }
    if (cum > maxY || cum < minY) {
      droppedCount++;
      if (isOpen) dropDepth = ind;
      continue;
    }
  }

  // Clamp oversized heights so the dropped subtree doesn't leave a giant
  // empty wrapper behind (those break scrollHeight).
  let kept = line;
  kept = kept.replace(/height:(\d+(?:\.\d+)?)px/g, (full, h) => {
    const v = parseFloat(h);
    return v > maxY ? `height:${maxY}px` : full;
  });
  out.push(kept);
}

fs.writeFileSync(output, out.join('\n'));
console.error(`Dropped ${droppedCount} top-level elements (max-y=${maxY}).`);
console.error(`Lines: ${lines.length} -> ${out.length}`);
console.error(`Bytes: ${src.length} -> ${out.join('\n').length}`);
