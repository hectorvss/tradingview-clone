#!/usr/bin/env node
// figma-to-html.mjs — convert a Figma get_design_context dump into HTML+CSS.
// Usage: node figma-to-html.mjs <input-dump.txt> <output-dir>

import fs from 'node:fs';
import path from 'node:path';

const KNOWN_TAGS = new Set(['div', 'span', 'li', 'ul', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'section', 'header', 'footer', 'nav', 'main', 'article', 'aside', 'i', 'b', 'em', 'strong', 'label', 'input', 'form', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'svg']);

const SELF_CLOSING = new Set(['instance', 'text']);

function round2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attrEscape(s) {
  return htmlEscape(s);
}

// Tokenizer/parser for the subset of XML we get.
function parseXML(src) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const full = m[0];
    const isClose = full.startsWith('</');
    const name = m[1];
    const attrStr = m[2] || '';
    const selfClose = m[3] === '/' || SELF_CLOSING.has(name) && full.endsWith('/>');

    if (isClose) {
      // pop until we find a matching tag
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrs = {};
    const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(attrStr)) !== null) {
      attrs[am[1]] = am[2];
    }

    const node = {
      type: 'element',
      tag: name,
      attrs,
      children: [],
    };
    stack[stack.length - 1].children.push(node);
    if (!selfClose && !SELF_CLOSING.has(name)) {
      stack.push(node);
    }
  }
  return root;
}

// Parse a frame "name" into { htmlTag, classes, label, rawName }.
function parseFrameName(rawName) {
  if (rawName == null) return { htmlTag: 'div', classes: [], rawName: '' };
  const trimmed = rawName.trim();
  // CSS-selector form: e.g. "div.tv-header", "li.tv-header__main-menu-item",
  // "span.foo:hover", possibly multiple class chunks like "div.a.b".
  const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*)\.([^\s]+)$/);
  if (m) {
    const tag = m[1].toLowerCase();
    // strip pseudo-class suffixes (`:hover`, `:margin`, etc.)
    const rest = m[2].replace(/:[^.]*$/, '');
    const classes = rest.split('.').filter(Boolean);
    if (KNOWN_TAGS.has(tag)) {
      return { htmlTag: tag, classes, rawName: trimmed };
    }
    return { htmlTag: 'div', classes, rawName: trimmed, unknownTag: tag };
  }
  // No "tag.classes" form: treat as a label.
  return { htmlTag: 'div', classes: ['figma-label'], label: trimmed, rawName: trimmed };
}

function styleFor(attrs) {
  const x = round2(attrs.x || 0);
  const y = round2(attrs.y || 0);
  const w = round2(attrs.width || 0);
  const h = round2(attrs.height || 0);
  return `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
}

function renderNode(node, depth) {
  if (node.type !== 'element') return '';
  const indent = '  '.repeat(depth);
  const attrs = node.attrs || {};
  const id = attrs.id || '';

  if (node.tag === 'text') {
    const txt = attrs.name || '';
    return `${indent}<span class="figma-text" style="${styleFor(attrs)}" data-figma-id="${attrEscape(id)}">${htmlEscape(txt)}</span>\n`;
  }

  if (node.tag === 'instance') {
    const comp = attrs.name || '';
    return `${indent}<div class="figma-icon" data-component="${attrEscape(comp)}" style="${styleFor(attrs)}" data-figma-id="${attrEscape(id)}"></div>\n`;
  }

  if (node.tag === 'frame') {
    const parsed = parseFrameName(attrs.name || '');
    const cls = parsed.classes.join(' ');
    const extras = [];
    extras.push(`style="${styleFor(attrs)}"`);
    extras.push(`data-figma-id="${attrEscape(id)}"`);
    if (parsed.label) extras.push(`data-label="${attrEscape(parsed.label)}"`);
    if (parsed.unknownTag) extras.push(`data-figma-name="${attrEscape(parsed.rawName)}"`);
    const tag = parsed.htmlTag;
    const open = `${indent}<${tag} class="${attrEscape(cls)}" ${extras.join(' ')}>`;
    let inner = '';
    for (const c of node.children) inner += renderNode(c, depth + 1);
    const close = inner ? `${indent}</${tag}>\n` : `</${tag}>\n`;
    return inner ? `${open}\n${inner}${close}` : `${open}${close}`;
  }

  // section or unknown: just recurse into children
  let out = '';
  for (const c of node.children) out += renderNode(c, depth);
  return out;
}

function findRenderRoots(root) {
  // Skip the outer <section> and the <frame name="1440w default"> wrapper.
  // Render children of the "1440w default" frame.
  const out = [];
  function walk(n) {
    if (!n) return;
    if (n.type === 'element' && n.tag === 'frame' && (n.attrs.name || '').trim() === '1440w default') {
      for (const c of n.children) out.push(c);
      return;
    }
    if (n.children) for (const c of n.children) walk(c);
  }
  walk(root);
  // Fallback: if we didn't find "1440w default", just take section's frame children.
  if (out.length === 0) {
    function walk2(n) {
      if (!n) return;
      if (n.type === 'element' && n.tag === 'section') {
        for (const c of n.children) out.push(c);
        return;
      }
      if (n.children) for (const c of n.children) walk2(c);
    }
    walk2(root);
  }
  return out;
}

// Plain JSON view of the tree (used for figma-tree.json).
function toJSON(node) {
  if (node.type === 'root') {
    return { type: 'root', children: node.children.map(toJSON) };
  }
  return {
    tag: node.tag,
    attrs: node.attrs,
    children: (node.children || []).map(toJSON),
  };
}

function main() {
  const [, , inputArg, outDirArg] = process.argv;
  if (!inputArg || !outDirArg) {
    process.stderr.write('Usage: node figma-to-html.mjs <input-dump.txt> <output-dir>\n');
    process.exit(1);
  }
  const inputPath = path.resolve(inputArg);
  const outDir = path.resolve(outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const raw = fs.readFileSync(inputPath, 'utf8');
  let xml = '';
  if (raw.trimStart().startsWith('<')) {
    // Raw XML dump.
    xml = raw;
  } else {
    // JSON-array dump: [{type:"text", text:"<xml>"}, ...]
    const chunks = JSON.parse(raw);
    for (const c of chunks) {
      if (c && typeof c.text === 'string') xml += c.text;
    }
  }

  const tree = parseXML(xml);
  const renderRoots = findRenderRoots(tree);

  let inner = '';
  for (const n of renderRoots) inner += renderNode(n, 2);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Figma export</title>
  <link rel="stylesheet" href="../styles/tv-tokens.css">
  <link rel="stylesheet" href="../styles/figma-icon-replacements.css">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="figma-root" style="position:relative;width:1395px;height:900px">
${inner}  </div>
</body>
</html>
`;

  const css = `/* Generated by figma-to-html.mjs. Hand-tune per-class overrides below. */
body { margin: 0; background: #000; font-family: Inter, Roboto, sans-serif; color: #fff; }
.figma-root { box-sizing: border-box; }
.figma-text { display: inline-block; white-space: nowrap; }
.figma-icon { display: inline-block; }

/* per-class overrides go here */
`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(outDir, 'styles.css'), css, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'figma-tree.json'),
    JSON.stringify(toJSON(tree), null, 2),
    'utf8'
  );
}

main();
