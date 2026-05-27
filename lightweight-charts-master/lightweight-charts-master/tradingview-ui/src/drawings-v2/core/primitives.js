// drawings-v2/core/primitives.js
// Reusable SVG primitive factory for the v2 drawing engine.
// Each function creates and returns an SVG element (or <g>) ready to be
// appended to a parent. No side effects, no DOM mutation outside of the
// returned subtree.
//
// All factories accept a plain options object. Common visual options:
//   stroke, fill, width (=strokeWidth), opacity, dashArray | dashStyle,
//   classes (string of class names), dataset ({key:value} -> data-key).
//
// Conventions:
//   - Coordinates are in chart-pixel space.
//   - Fonts: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
//     for labels, monospace ('SF Mono, Menlo, Consolas, monospace') for
//     numeric price/date readouts.
//   - Handles default to TradingView-blue (#2962ff).

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
    stroke: '#2962ff',
    fill: 'none',
    width: 1,
    opacity: 1,
    handleFill: '#ffffff',
    handleStroke: '#2962ff',
    handleSize: 7,
    handleHit: 14,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    monoFamily: 'SF Mono, Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: 11,
    labelBg: 'rgba(30, 34, 45, 0.92)',
    labelColor: '#d1d4dc',
    labelPad: 4,
    labelRadius: 2,
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function el(tag) {
    return document.createElementNS(SVG_NS, tag);
}

function setAttrs(node, attrs) {
    for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        node.setAttribute(k, String(v));
    }
    return node;
}

function applyDataset(node, dataset) {
    if (!dataset) return;
    for (const k in dataset) {
        const v = dataset[k];
        if (v === null || v === undefined) continue;
        node.setAttribute('data-' + k, String(v));
    }
}

function applyClasses(node, classes) {
    if (!classes) return;
    node.setAttribute('class', Array.isArray(classes) ? classes.join(' ') : String(classes));
}

function dashFromStyle(style) {
    if (!style) return null;
    if (Array.isArray(style)) return style.join(',');
    if (typeof style === 'number') return String(style);
    switch (String(style).toLowerCase()) {
        case 'solid':
        case '':
            return null;
        case 'dashed':
            return '6,4';
        case 'dotted':
            return '2,3';
        case 'dash-dot':
        case 'dashdot':
            return '6,3,2,3';
        case 'long-dash':
        case 'longdash':
            return '10,5';
        default:
            return String(style);
    }
}

function applyOptions(node, opts) {
    if (!opts) return node;
    if (opts.stroke !== undefined) node.setAttribute('stroke', opts.stroke);
    if (opts.fill !== undefined) node.setAttribute('fill', opts.fill);
    if (opts.width !== undefined) node.setAttribute('stroke-width', opts.width);
    else if (opts.strokeWidth !== undefined) node.setAttribute('stroke-width', opts.strokeWidth);
    if (opts.opacity !== undefined) node.setAttribute('opacity', opts.opacity);
    if (opts.alpha !== undefined) node.setAttribute('fill-opacity', opts.alpha);
    if (opts.strokeOpacity !== undefined) node.setAttribute('stroke-opacity', opts.strokeOpacity);
    if (opts.lineCap) node.setAttribute('stroke-linecap', opts.lineCap);
    if (opts.lineJoin) node.setAttribute('stroke-linejoin', opts.lineJoin);
    const dash = opts.dashArray !== undefined ? opts.dashArray : dashFromStyle(opts.dashStyle || opts.style);
    if (dash) node.setAttribute('stroke-dasharray', dash);
    if (opts.cursor) node.style.cursor = opts.cursor;
    if (opts.pointerEvents) node.setAttribute('pointer-events', opts.pointerEvents);
    applyClasses(node, opts.classes);
    applyDataset(node, opts.dataset);
    return node;
}

function clipToViewBox(x, y, dx, dy, vb) {
    // Intersect a parametric ray origin+(dx,dy)*t with the rectangle
    // [0,0,vb.w,vb.h]. Returns farthest point reachable inside the box.
    let tMax = Infinity;
    if (dx > 0) tMax = Math.min(tMax, (vb.w - x) / dx);
    else if (dx < 0) tMax = Math.min(tMax, (0 - x) / dx);
    if (dy > 0) tMax = Math.min(tMax, (vb.h - y) / dy);
    else if (dy < 0) tMax = Math.min(tMax, (0 - y) / dy);
    if (!isFinite(tMax) || tMax < 0) tMax = 0;
    return { x: x + dx * tMax, y: y + dy * tMax };
}

function catmullRomToBezierPath(points) {
    if (!points || points.length < 2) return '';
    const p = points;
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] || p[i];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
}

function pointsToStr(points) {
    if (!points) return '';
    if (typeof points === 'string') return points;
    return points.map(p => `${p.x},${p.y}`).join(' ');
}

function group(attrs, opts) {
    const g = el('g');
    if (attrs) setAttrs(g, attrs);
    if (opts) applyOptions(g, opts);
    return g;
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

function line(opts) {
    const o = Object.assign({}, opts);
    const n = el('line');
    setAttrs(n, { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 });
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function polyline(opts) {
    const o = Object.assign({}, opts);
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    if (o.fill === undefined) o.fill = 'none';
    let n;
    if (o.smooth && Array.isArray(o.points) && o.points.length > 2) {
        n = el('path');
        n.setAttribute('d', catmullRomToBezierPath(o.points));
    } else {
        n = el('polyline');
        n.setAttribute('points', pointsToStr(o.points));
    }
    applyOptions(n, o);
    return n;
}

function ray(opts) {
    const { origin, direction, viewBox } = opts;
    const end = clipToViewBox(origin.x, origin.y, direction.dx, direction.dy, viewBox);
    return line(Object.assign({}, opts, {
        x1: origin.x, y1: origin.y, x2: end.x, y2: end.y,
    }));
}

function extendedLine(opts) {
    const { a, b, viewBox } = opts;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fwd = clipToViewBox(a.x, a.y, dx, dy, viewBox);
    const bwd = clipToViewBox(a.x, a.y, -dx, -dy, viewBox);
    return line(Object.assign({}, opts, {
        x1: bwd.x, y1: bwd.y, x2: fwd.x, y2: fwd.y,
    }));
}

function horizontalLine(opts) {
    const x1 = opts.x1 !== undefined ? opts.x1 : 0;
    const x2 = opts.x2 !== undefined ? opts.x2 : (opts.viewBox ? opts.viewBox.w : 0);
    return line(Object.assign({}, opts, { x1, y1: opts.y, x2, y2: opts.y }));
}

function verticalLine(opts) {
    const y1 = opts.y1 !== undefined ? opts.y1 : 0;
    const y2 = opts.y2 !== undefined ? opts.y2 : (opts.viewBox ? opts.viewBox.h : 0);
    return line(Object.assign({}, opts, { x1: opts.x, y1, x2: opts.x, y2 }));
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

function rect(opts) {
    const o = Object.assign({}, opts);
    const n = el('rect');
    setAttrs(n, { x: o.x, y: o.y, width: o.w, height: o.h, rx: o.rx, ry: o.ry });
    if (o.fill === undefined) o.fill = 'rgba(41, 98, 255, 0.12)';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function ellipse(opts) {
    const o = Object.assign({}, opts);
    const n = el('ellipse');
    setAttrs(n, { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry });
    if (o.fill === undefined) o.fill = 'none';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function circle(opts) {
    const o = Object.assign({}, opts);
    const n = el('circle');
    setAttrs(n, { cx: o.cx, cy: o.cy, r: o.r });
    if (o.fill === undefined) o.fill = 'none';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function polygon(opts) {
    const o = Object.assign({}, opts);
    const n = el('polygon');
    n.setAttribute('points', pointsToStr(o.points));
    if (o.fill === undefined) o.fill = 'rgba(41, 98, 255, 0.12)';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function arc(opts) {
    const o = Object.assign({}, opts);
    const { cx, cy, r, startAngle, endAngle } = o;
    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const sweep = endAngle > startAngle ? 1 : 0;
    const n = el('path');
    n.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`);
    if (o.fill === undefined) o.fill = 'none';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

function bezier(opts) {
    const o = Object.assign({}, opts);
    const { p0, p1, p2, p3 } = o;
    const n = el('path');
    n.setAttribute('d', `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`);
    if (o.fill === undefined) o.fill = 'none';
    if (o.stroke === undefined) o.stroke = DEFAULTS.stroke;
    if (o.width === undefined) o.width = DEFAULTS.width;
    applyOptions(n, o);
    return n;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function _measureText(text, font, size) {
    // Cheap monospace-ish heuristic; SVG would otherwise need a layout pass.
    const avg = 0.6;
    return { w: String(text).length * size * avg, h: size * 1.2 };
}

function label(opts) {
    const o = Object.assign({
        color: DEFAULTS.labelColor,
        bg: DEFAULTS.labelBg,
        font: DEFAULTS.fontFamily,
        fontSize: DEFAULTS.fontSize,
        padding: DEFAULTS.labelPad,
        align: 'center',
        anchor: 'middle',
        borderRadius: DEFAULTS.labelRadius,
        borderColor: null,
        borderWidth: 0,
    }, opts);
    const g = group({ class: 'd2-label' });
    const text = String(o.text);
    const size = o.fontSize;
    const m = _measureText(text, o.font, size);
    const w = m.w + o.padding * 2;
    const h = m.h + o.padding * 2;

    let bx = o.x;
    if (o.align === 'left') bx = o.x;
    else if (o.align === 'right') bx = o.x - w;
    else bx = o.x - w / 2;

    let by = o.y;
    if (o.anchor === 'top') by = o.y;
    else if (o.anchor === 'bottom') by = o.y - h;
    else by = o.y - h / 2;

    const bg = el('rect');
    setAttrs(bg, {
        x: bx, y: by, width: w, height: h,
        rx: o.borderRadius, ry: o.borderRadius,
        fill: o.bg,
        stroke: o.borderColor || 'none',
        'stroke-width': o.borderWidth,
    });
    g.appendChild(bg);

    const t = el('text');
    setAttrs(t, {
        x: bx + w / 2,
        y: by + h / 2,
        fill: o.color,
        'font-family': o.font,
        'font-size': size,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
    });
    t.textContent = text;
    g.appendChild(t);

    applyClasses(g, o.classes);
    applyDataset(g, o.dataset);
    return g;
}

function priceLabel(opts) {
    const { y, price, axis = 'right', viewBox, format } = opts;
    const text = format ? format(price) : (typeof price === 'number' ? price.toFixed(2) : String(price));
    const x = axis === 'left' ? 2 : (viewBox ? viewBox.w - 2 : 0);
    return label(Object.assign({}, opts, {
        x, y, text,
        font: DEFAULTS.monoFamily,
        align: axis === 'left' ? 'left' : 'right',
        anchor: 'middle',
        bg: opts.color || DEFAULTS.stroke,
        color: '#ffffff',
        classes: 'd2-price-label',
    }));
}

function dateLabel(opts) {
    const { x, time, axis = 'bottom', viewBox, format } = opts;
    const text = format ? format(time) : String(time);
    const y = axis === 'top' ? 2 : (viewBox ? viewBox.h - 2 : 0);
    return label(Object.assign({}, opts, {
        x, y, text,
        font: DEFAULTS.monoFamily,
        align: 'center',
        anchor: axis === 'top' ? 'top' : 'bottom',
        bg: opts.color || DEFAULTS.stroke,
        color: '#ffffff',
        classes: 'd2-date-label',
    }));
}

// ---------------------------------------------------------------------------
// Arrows
// ---------------------------------------------------------------------------

let _markerId = 0;
function _arrowMarker(parent, color, size) {
    const id = `d2-arrow-${++_markerId}`;
    let defs = parent.querySelector(':scope > defs');
    if (!defs) { defs = el('defs'); parent.insertBefore(defs, parent.firstChild); }
    const marker = el('marker');
    setAttrs(marker, {
        id, viewBox: '0 0 10 10', refX: 8, refY: 5,
        markerWidth: size, markerHeight: size, orient: 'auto-start-reverse',
    });
    const p = el('path');
    setAttrs(p, { d: 'M0,0 L10,5 L0,10 z', fill: color });
    marker.appendChild(p);
    defs.appendChild(marker);
    return id;
}

function arrow(opts) {
    const o = Object.assign({
        headSize: 8, double: false, stroke: DEFAULTS.stroke, width: DEFAULTS.width,
    }, opts);
    const g = group({ class: 'd2-arrow' });
    const mid = _arrowMarker(g, o.stroke, o.headSize);
    const ln = line({
        x1: o.from.x, y1: o.from.y, x2: o.to.x, y2: o.to.y,
        stroke: o.stroke, width: o.width, dashStyle: o.dashStyle,
    });
    ln.setAttribute('marker-end', `url(#${mid})`);
    if (o.double) ln.setAttribute('marker-start', `url(#${mid})`);
    g.appendChild(ln);
    applyClasses(g, o.classes);
    applyDataset(g, o.dataset);
    return g;
}

function triangleHead(opts) {
    const o = Object.assign({ size: 8, fill: DEFAULTS.stroke }, opts);
    const half = o.size / 2;
    const pts = [
        { x: 0, y: -half },
        { x: o.size, y: 0 },
        { x: 0, y: half },
    ];
    const g = group({
        transform: `translate(${o.x},${o.y}) rotate(${o.direction || 0})`,
        class: 'd2-arrowhead',
    });
    const poly = polygon({ points: pts, fill: o.fill, stroke: o.stroke || o.fill });
    g.appendChild(poly);
    applyClasses(g, o.classes);
    applyDataset(g, o.dataset);
    return g;
}

// ---------------------------------------------------------------------------
// Handles
// ---------------------------------------------------------------------------

function handle(opts) {
    const o = Object.assign({
        size: DEFAULTS.handleSize,
        fillColor: DEFAULTS.handleFill,
        strokeColor: DEFAULTS.handleStroke,
        strokeWidth: 1.5,
    }, opts);
    const c = el('circle');
    setAttrs(c, {
        cx: o.x, cy: o.y, r: o.size / 2,
        fill: o.fillColor,
        stroke: o.strokeColor,
        'stroke-width': o.strokeWidth,
        class: ['d2-handle', o.classes || ''].join(' ').trim(),
    });
    if (o.anchorIdx !== undefined) c.setAttribute('data-anchor', String(o.anchorIdx));
    applyDataset(c, o.dataset);
    c.style.cursor = o.cursor || 'pointer';
    return c;
}

function handleHitArea(opts) {
    const o = Object.assign({ radius: DEFAULTS.handleHit }, opts);
    const c = el('circle');
    setAttrs(c, {
        cx: o.x, cy: o.y, r: o.radius,
        fill: 'transparent', stroke: 'none',
        class: ['d2-handle-hit', o.classes || ''].join(' ').trim(),
    });
    if (o.anchorIdx !== undefined) c.setAttribute('data-anchor', String(o.anchorIdx));
    applyDataset(c, o.dataset);
    c.style.cursor = o.cursor || 'move';
    if (typeof o.onMouseDown === 'function') {
        c.addEventListener('mousedown', o.onMouseDown);
        c.addEventListener('touchstart', o.onMouseDown, { passive: false });
    }
    return c;
}

// ---------------------------------------------------------------------------
// Composite: Fibonacci levels
// ---------------------------------------------------------------------------

const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const DEFAULT_FIB_COLORS = [
    '#787b86', '#f23645', '#ff9800', '#4caf50',
    '#2962ff', '#9c27b0', '#787b86',
];

function fibLevels(opts) {
    const {
        a, b,
        levels = DEFAULT_FIB_LEVELS,
        colors = DEFAULT_FIB_COLORS,
        showPrice = false,
        showPercent = true,
        reverse = false,
        viewBox,
        priceFn = null,
    } = opts;
    const g = group({ class: 'd2-fib' });
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    const yTop = reverse ? b.y : a.y;
    const yBot = reverse ? a.y : b.y;
    const range = yBot - yTop;
    for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const y = yTop + range * lvl;
        const color = colors[i % colors.length];
        g.appendChild(line({
            x1, y1: y, x2: viewBox ? viewBox.w : x2, y2: y,
            stroke: color, width: 1, opacity: 0.9,
        }));
        if (showPercent || showPrice) {
            const parts = [];
            if (showPercent) parts.push((lvl * 100).toFixed(1) + '%');
            if (showPrice && priceFn) parts.push(priceFn(y));
            g.appendChild(label({
                x: x1 + 4, y, text: parts.join('  '),
                color: '#fff', bg: color, align: 'left', anchor: 'middle',
                fontSize: 10,
            }));
        }
    }
    return g;
}

// ---------------------------------------------------------------------------
// Composite: Gann grid
// ---------------------------------------------------------------------------

function gannGrid(opts) {
    const {
        rect: r,
        divisions = [0.25, 0.382, 0.5, 0.618, 0.75],
        stroke = '#787b86',
    } = opts;
    const g = group({ class: 'd2-gann' });
    g.appendChild(line({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h, stroke, width: 1 }));
    g.appendChild(line({ x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y, stroke, width: 1 }));
    for (const d of divisions) {
        const dx = r.x + r.w * d;
        const dy = r.y + r.h * d;
        g.appendChild(line({ x1: dx, y1: r.y, x2: dx, y2: r.y + r.h, stroke, width: 0.5, opacity: 0.6 }));
        g.appendChild(line({ x1: r.x, y1: dy, x2: r.x + r.w, y2: dy, stroke, width: 0.5, opacity: 0.6 }));
    }
    return g;
}

// ---------------------------------------------------------------------------
// Composite: Pitchfork
// ---------------------------------------------------------------------------

function pitchforkBundle(opts) {
    const {
        p1, p2, p3,
        variant = 'andrews',
        stroke = DEFAULTS.stroke,
        showTines = true,
        showMedian = true,
        viewBox,
    } = opts;
    const g = group({ class: 'd2-pitchfork d2-pitchfork-' + variant });

    let pivot;
    if (variant === 'schiff') {
        pivot = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    } else if (variant === 'modified-schiff') {
        pivot = { x: (p1.x + p2.x) / 2, y: p1.y };
    } else {
        pivot = { x: p1.x, y: p1.y };
    }
    const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const dx = mid.x - pivot.x;
    const dy = mid.y - pivot.y;

    if (showMedian) {
        g.appendChild(ray({
            origin: pivot, direction: { dx, dy }, viewBox,
            stroke, width: 1.5,
        }));
    }
    if (showTines) {
        g.appendChild(ray({
            origin: p2, direction: { dx, dy }, viewBox,
            stroke, width: 1, opacity: 0.85,
        }));
        g.appendChild(ray({
            origin: p3, direction: { dx, dy }, viewBox,
            stroke, width: 1, opacity: 0.85,
        }));
    }
    return g;
}

// ---------------------------------------------------------------------------
// Smart label placement — avoid overlap with existing labels
// ---------------------------------------------------------------------------

/**
 * Place a label so it doesn't overlap with previously placed labels.
 *
 *   Primitives.placeLabel({
 *     x, y, w, h,                          // desired position + measured size
 *     placed: [{x,y,w,h}, ...],            // already-positioned label bboxes
 *     viewBox: { w, h },                   // optional clipping bounds
 *     prefer: 'below'|'above'|'right'|'left',
 *     gap: 2,                              // pixels between labels
 *     maxShift: 200,                       // give up after this many px
 *   })
 *
 * Returns { x, y, bbox } with the chosen position; mutates `placed` by pushing
 * the new bbox so subsequent calls keep avoiding it.
 */
function placeLabel(opts) {
    const o = Object.assign({
        prefer: 'below',
        gap: 2,
        maxShift: 200,
    }, opts);
    const placed = o.placed || [];
    const w = o.w || 0;
    const h = o.h || 0;
    const gap = o.gap;
    const vb = o.viewBox;

    const intersects = (a, b) =>
        !(a.x + a.w + gap <= b.x ||
          b.x + b.w + gap <= a.x ||
          a.y + a.h + gap <= b.y ||
          b.y + b.h + gap <= a.y);

    const clip = (x, y) => {
        if (!vb) return { x, y };
        return {
            x: Math.max(0, Math.min(x, vb.w - w)),
            y: Math.max(0, Math.min(y, vb.h - h)),
        };
    };

    // ordered displacement vectors based on preferred direction
    let dirs;
    switch (o.prefer) {
        case 'above': dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }]; break;
        case 'right': dirs = [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]; break;
        case 'left':  dirs = [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }]; break;
        default:      dirs = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];
    }

    const step = Math.max(2, Math.floor((h + gap) / 2));
    const maxK = Math.ceil(o.maxShift / step);

    // Try the requested origin first, then expand outward.
    for (let k = 0; k <= maxK; k++) {
        const order = k === 0 ? [{ dx: 0, dy: 0 }] : dirs;
        for (const d of order) {
            const c = clip(o.x + d.dx * k * step, o.y + d.dy * k * step);
            const bbox = { x: c.x, y: c.y, w, h };
            let collide = false;
            for (let i = 0; i < placed.length; i++) {
                if (intersects(bbox, placed[i])) { collide = true; break; }
            }
            if (!collide) {
                placed.push(bbox);
                return { x: c.x, y: c.y, bbox };
            }
        }
    }
    // give up — return original, no entry pushed
    return { x: o.x, y: o.y, bbox: { x: o.x, y: o.y, w, h } };
}

// ---------------------------------------------------------------------------
// Magnet snap visual indicator (pulsing circle on snap target)
// ---------------------------------------------------------------------------

/**
 *   Primitives.snapIndicator({ x, y, active: true, confidence: 'high'|'low' })
 *
 * Returns a pulsing circle <g> ready to drop into the handles/preview layer.
 * Color: green (#26a69a) for high confidence, amber (#ffb300) for low.
 */
function snapIndicator(opts) {
    const o = Object.assign({
        active: true, confidence: 'high', radius: 7, dataset: null, classes: 'd2-snap-indicator',
    }, opts);
    const color = o.confidence === 'low' ? '#ffb300' : '#26a69a';
    const g = group({ class: o.classes });
    // outer pulse ring
    const ring = el('circle');
    setAttrs(ring, {
        cx: o.x, cy: o.y, r: o.radius * 2,
        fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.6,
    });
    // CSS keyframe animation injected once
    _ensureSnapKeyframes();
    ring.style.animation = 'd2SnapPulse 900ms ease-out infinite';
    ring.style.transformOrigin = `${o.x}px ${o.y}px`;
    g.appendChild(ring);
    // inner solid dot
    const dot = el('circle');
    setAttrs(dot, {
        cx: o.x, cy: o.y, r: o.radius,
        fill: color, stroke: '#fff', 'stroke-width': 1.5, opacity: 0.95,
    });
    g.appendChild(dot);
    applyDataset(g, o.dataset);
    return g;
}

let _snapKeyframesInjected = false;
function _ensureSnapKeyframes() {
    if (_snapKeyframesInjected || typeof document === 'undefined') return;
    _snapKeyframesInjected = true;
    const s = document.createElement('style');
    s.setAttribute('data-d2-snap-css', '1');
    s.textContent = `
@keyframes d2SnapPulse {
  0%   { transform: scale(0.6); opacity: 0.9; }
  70%  { transform: scale(1.4); opacity: 0.1; }
  100% { transform: scale(1.6); opacity: 0; }
}`;
    document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const Primitives = {
    // namespacing helpers
    SVG_NS,
    DEFAULTS,
    el,
    group,
    applyOptions,
    applyClasses,
    applyDataset,
    dashFromStyle,

    // lines
    line,
    polyline,
    ray,
    extendedLine,
    horizontalLine,
    verticalLine,

    // shapes
    rect,
    ellipse,
    circle,
    polygon,
    arc,
    bezier,

    // labels
    label,
    priceLabel,
    dateLabel,

    // arrows
    arrow,
    triangleHead,

    // handles
    handle,
    handleHitArea,

    // composites
    fibLevels,
    gannGrid,
    pitchforkBundle,

    // placement & feedback helpers
    placeLabel,
    snapIndicator,
};

export default Primitives;
