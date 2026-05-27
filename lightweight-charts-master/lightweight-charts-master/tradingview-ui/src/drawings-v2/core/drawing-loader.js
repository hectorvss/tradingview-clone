// drawings-v2/core/drawing-loader.js
// Loads declarative drawing specs and turns them into runnable classes.
//
//   loadSpec(spec)     -> a SpecDrawing subclass bound to that spec
//   registerSpec(spec) -> registers + returns the class (also pushes into SPEC_REGISTRY)
//   SPEC_REGISTRY      -> { [type]: SpecDrawingSubclass }
//
// Spec format (see request):
//   {
//     type, label, icon, pointsRequired,
//     behaviors: [...],
//     defaultOptions: {...},
//     schema: { estilo, especifico, coord },
//     render(svgGroup, ctx),
//     hitTest(x, y, ctx),
//     getHandles(ctx),
//     onCommit?(), onEdit?(), onDrag?(handleIdx, newPoint),
//   }
//
// We DO NOT import primitives.js here — the spec's render() pulls them directly.
// This keeps the loader decoupled and avoids a hard dep on a sibling module.

let _idSeq = 1;
function nextId() { return `d_${Date.now().toString(36)}_${(_idSeq++).toString(36)}`; }

/**
 * Generic base class — every loaded spec produces a subclass of this.
 */
export class SpecDrawing {
    constructor(initial = {}) {
        // subclass overrides `static spec`
        const spec = this.constructor.spec || {};
        this.spec = spec;
        this.type = spec.type;
        this.id = initial.id || nextId();
        this.points = Array.isArray(initial.points) ? initial.points.map(p => ({ ...p })) : [];
        this.options = Object.assign({}, spec.defaultOptions || {}, initial.options || {});
        this.zIndex = Number.isFinite(initial.zIndex) ? initial.zIndex : 0;
        this.locked = !!initial.locked;
        // render-cache markers
        this.version = 0;
        this._dirty = true;
        this._lastViewKey = null;
        this._lastVersion = -1;
        // ephemeral state (creation, etc.)
        this._committed = (this.points.length >= (spec.pointsRequired || 0));
    }

    // ------------------------------------------------------------------------
    // serialization
    // ------------------------------------------------------------------------
    serialize() {
        return {
            id: this.id,
            type: this.type,
            points: this.points.map(p => ({ ...p })),
            options: { ...this.options },
            zIndex: this.zIndex,
            locked: this.locked,
            // version sentinel so loadFromStorage can detect "new" format
            schemaVersion: 2,
        };
    }

    static deserialize(data, SpecClass) {
        const Klass = SpecClass || this;
        const inst = new Klass({
            id: data.id,
            points: data.points || [],
            options: data.options || {},
            zIndex: data.zIndex,
            locked: !!data.locked,
        });
        inst._committed = true;
        return inst;
    }

    // ------------------------------------------------------------------------
    // delegate to spec
    // ------------------------------------------------------------------------
    render(svgGroup, ctx) {
        const spec = this.constructor.spec;
        if (!spec || typeof spec.render !== 'function') return;
        try {
            spec.render.call(this, svgGroup, ctx);
        } catch (e) {
            console.warn(`[drawings-v2] render(${this.type}) threw`, e);
        }
    }

    hitTest(x, y, ctx) {
        const spec = this.constructor.spec;
        if (!spec || typeof spec.hitTest !== 'function') return false;
        try { return !!spec.hitTest.call(this, x, y, ctx); } catch (e) { return false; }
    }

    getHandles(ctx) {
        const spec = this.constructor.spec;
        if (!spec || typeof spec.getHandles !== 'function') {
            // default: project each anchor point
            if (!ctx || typeof ctx.projectX !== 'function' || typeof ctx.projectY !== 'function') return [];
            return this.points.map((p, i) => {
                const x = ctx.projectX(p.time);
                const y = ctx.projectY(p.price);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                return { x, y, anchorIdx: i };
            }).filter(Boolean);
        }
        try { return spec.getHandles.call(this, ctx) || []; } catch (e) { return []; }
    }

    onCommit() {
        const spec = this.constructor.spec;
        if (spec && typeof spec.onCommit === 'function') {
            try { spec.onCommit.call(this); } catch (e) { /* ignore */ }
        }
        this._committed = true;
        this._dirty = true;
    }

    onEdit() {
        const spec = this.constructor.spec;
        if (spec && typeof spec.onEdit === 'function') {
            try { spec.onEdit.call(this); } catch (e) { /* ignore */ }
        }
        this.version++;
        this._dirty = true;
    }

    onDrag(handleIdx, newPoint) {
        const spec = this.constructor.spec;
        if (spec && typeof spec.onDrag === 'function') {
            try { spec.onDrag.call(this, handleIdx, newPoint); }
            catch (e) { /* fall through */ }
        } else {
            // default: replace anchor
            if (handleIdx >= 0 && handleIdx < this.points.length) {
                this.points[handleIdx] = { ...this.points[handleIdx], ...newPoint };
            }
        }
        this.version++;
        this._dirty = true;
    }

    hasBehavior(name) {
        const b = (this.constructor.spec && this.constructor.spec.behaviors) || [];
        return b.indexOf(name) !== -1;
    }
}

// ----------------------------------------------------------------------------
// Loader / registry
// ----------------------------------------------------------------------------

export const SPEC_REGISTRY = Object.create(null);

/**
 * Build a SpecDrawing subclass bound to `spec`. Does NOT register it.
 */
export function loadSpec(spec) {
    if (!spec || typeof spec !== 'object') {
        throw new Error('[drawings-v2] loadSpec: spec must be an object');
    }
    if (!spec.type || typeof spec.type !== 'string') {
        throw new Error('[drawings-v2] loadSpec: spec.type required');
    }

    class Bound extends SpecDrawing {}
    Bound.spec = spec;
    // Friendly name for stack traces
    try {
        Object.defineProperty(Bound, 'name', { value: `SpecDrawing<${spec.type}>` });
    } catch (e) { /* ignore */ }
    return Bound;
}

/**
 * Load + register in SPEC_REGISTRY. Overwrites any existing entry of the same type.
 */
export function registerSpec(spec) {
    const Klass = loadSpec(spec);
    SPEC_REGISTRY[spec.type] = Klass;
    return Klass;
}

/**
 * Look up a class by type id.
 */
export function getSpecClass(type) {
    return SPEC_REGISTRY[type] || null;
}

/**
 * Instantiate a drawing of `type` with `initial` data. Returns null if unknown.
 */
export function instantiate(type, initial) {
    const Klass = SPEC_REGISTRY[type];
    if (!Klass) return null;
    return new Klass(initial || {});
}

export default { SpecDrawing, loadSpec, registerSpec, SPEC_REGISTRY, getSpecClass, instantiate };
