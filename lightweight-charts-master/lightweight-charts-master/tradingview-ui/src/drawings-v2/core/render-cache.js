// drawings-v2/core/render-cache.js
// Dirty-checking + projection cache for drawing renders.
// A drawing is considered dirty when any of the following holds:
//   - drawing._dirty === true            (mutated externally)
//   - drawing._lastViewKey !== viewKey   (chart viewport changed)
//   - drawing._lastVersion !== drawing.version (points/options changed)
//
// `viewKey` is an opaque string composed by the caller; typically:
//   `${fromTime}-${toTime}|${priceMin}-${priceMax}`
//
// Usage:
//   const cache = new RenderCache();
//   if (cache.isDirty(drawing, viewKey)) {
//     drawing.render(...);
//     cache.commit(drawing, viewKey);
//   }

export class RenderCache {
    constructor() {
        // weak references to per-drawing render metadata so GC can reclaim
        // metadata when a drawing instance is dropped without explicit cleanup.
        this._meta = new WeakMap();
        this._globalDirty = false;
        // perf accounting (consumed by __tvDrawingsProfile)
        this._frameSamples = [];      // ms per render pass
        this._maxSamples = 60;
        this._lastFrameMs = 0;
    }

    /**
     * Returns true if `drawing` needs to be re-rendered for the given viewKey.
     */
    isDirty(drawing, viewKey) {
        if (!drawing) return false;
        if (this._globalDirty) return true;
        if (drawing._dirty === true) return true;

        const meta = this._meta.get(drawing);
        if (!meta) return true;

        if (meta.viewKey !== viewKey) return true;

        // version: bump from outside to invalidate (e.g. options changed).
        const v = drawing.version === undefined ? 0 : drawing.version;
        if (meta.version !== v) return true;

        return false;
    }

    /**
     * Force a drawing to be re-rendered on the next pass.
     */
    markDirty(drawing) {
        if (!drawing) return;
        drawing._dirty = true;
    }

    /**
     * Force every cached drawing to re-render on the next pass.
     * Cheap: just flips a flag.
     */
    markAllDirty() {
        this._globalDirty = true;
    }

    /**
     * Mark `drawing` as freshly rendered for `viewKey`.
     */
    commit(drawing, viewKey) {
        if (!drawing) return;
        const v = drawing.version === undefined ? 0 : drawing.version;
        this._meta.set(drawing, { viewKey, version: v });
        drawing._dirty = false;
        drawing._lastViewKey = viewKey;
        drawing._lastVersion = v;
        // Once we've committed at least one drawing for the current pass, the
        // global dirty flag has done its job; let the caller clear it via
        // `clear()` or naturally on next pass.
    }

    /**
     * Drop all cached metadata.
     */
    clear() {
        this._meta = new WeakMap();
        this._globalDirty = false;
    }

    /**
     * Called at the end of a full render pass to consume the global flag.
     */
    endPass() {
        this._globalDirty = false;
    }

    /**
     * Record perf samples — called by the manager around each render pass.
     */
    recordFrame(ms) {
        this._lastFrameMs = ms;
        this._frameSamples.push(ms);
        if (this._frameSamples.length > this._maxSamples) {
            this._frameSamples.shift();
        }
    }

    avgFrameMs() {
        if (!this._frameSamples.length) return 0;
        let s = 0;
        for (let i = 0; i < this._frameSamples.length; i++) s += this._frameSamples[i];
        return s / this._frameSamples.length;
    }

    lastFrameMs() { return this._lastFrameMs; }
}

/**
 * Convenience helper to compute a stable viewKey from a chart time scale +
 * price range. Pure function so the manager can call it cheaply per frame.
 */
export function computeViewKey(fromTime, toTime, priceMin, priceMax, width, height) {
    // Round to integers for stability across sub-pixel jitter.
    const ft = Math.round(Number(fromTime) || 0);
    const tt = Math.round(Number(toTime) || 0);
    const pmin = Number.isFinite(priceMin) ? priceMin.toFixed(4) : '0';
    const pmax = Number.isFinite(priceMax) ? priceMax.toFixed(4) : '0';
    const w = Math.round(Number(width) || 0);
    const h = Math.round(Number(height) || 0);
    return `${ft}-${tt}|${pmin}-${pmax}|${w}x${h}`;
}

export default RenderCache;
