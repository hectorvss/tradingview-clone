#!/usr/bin/env node
// figma-stitch.mjs — replace <instance id="X:Y" .../> self-closing tags in a
// sparse Figma dump with the inflated subtree stored in
// <instances-dir>/X-Y.xml. The inflation file contents are inserted in place
// (with its outer <section ...>...</section> wrapper stripped) and indented
// to match the original tag's indent. If no inflation file exists, the
// instance tag is left intact.
//
// Usage:
//   node figma-stitch.mjs --dump path/to/dump.xml \
//       --instances path/to/instances-dir --out path/to/expanded.xml

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dump') out.dump = argv[++i];
    else if (a === '--instances') out.instances = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

function stripSectionWrapper(xml) {
  // Strip <section ...> opening tag at start and </section> at end if present.
  let s = xml;
  const open = s.match(/^\s*<section\b[^>]*>/);
  if (open) s = s.slice(open[0].length);
  const close = s.match(/<\/section>\s*$/);
  if (close) s = s.slice(0, s.length - close[0].length);
  return s;
}

function indentBlock(block, indent) {
  // Trim only the outer leading/trailing newlines so we can re-indent each
  // non-empty line with `indent` (preserving relative inner indentation).
  const trimmed = block.replace(/^\n+/, '').replace(/\n+$/, '');
  const lines = trimmed.split('\n');
  // Compute min leading-whitespace among non-empty lines.
  let min = Infinity;
  for (const ln of lines) {
    if (!ln.trim()) continue;
    const m = ln.match(/^[ \t]*/);
    const w = m ? m[0].length : 0;
    if (w < min) min = w;
  }
  if (!Number.isFinite(min)) min = 0;
  return lines
    .map((ln) => (ln.trim() ? indent + ln.slice(min) : ''))
    .join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.dump || !args.instances || !args.out) {
    process.stderr.write(
      'Usage: figma-stitch.mjs --dump <path> --instances <dir> --out <path>\n'
    );
    process.exit(1);
  }
  const dumpPath = path.resolve(args.dump);
  const instDir = path.resolve(args.instances);
  const outPath = path.resolve(args.out);

  const src = fs.readFileSync(dumpPath, 'utf8');
  // Match self-closing <instance id="X:Y" ... /> tags including their leading
  // indent on the line.
  const re = /([ \t]*)<instance\b([^>]*?)\/>/g;
  let replaced = 0;
  let kept = 0;
  const out = src.replace(re, (full, indent, attrStr) => {
    const idm = attrStr.match(/\bid="([^"]+)"/);
    if (!idm) {
      kept++;
      return full;
    }
    const id = idm[1];
    const fname = id.replace(/:/g, '-') + '.xml';
    const fpath = path.join(instDir, fname);
    if (!fs.existsSync(fpath)) {
      kept++;
      return full;
    }
    const raw = fs.readFileSync(fpath, 'utf8');
    const inner = stripSectionWrapper(raw);
    const indented = indentBlock(inner, indent);
    replaced++;
    return indented;
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out, 'utf8');
  process.stdout.write(
    `figma-stitch: replaced=${replaced} kept=${kept} out=${path.relative(process.cwd(), outPath)}\n`
  );
}

main();
