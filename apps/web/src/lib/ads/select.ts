import type { AdSelection } from './registry';

/**
 * Choose one creative from a slot's active, priority-ordered pool.
 *
 * - `priority` → the first (top `sort_order`) creative, deterministic.
 * - `rotation` → a uniformly random pick. Callers on a single fixed slot run
 *   this at render time, so an ISR-cached render freezes the choice until the
 *   next revalidation (the agreed "rotates on revalidate" semantics). The
 *   feed does its own per-interleave-index rotation and does not use this.
 *
 * Precondition: `creatives` is non-empty (callers fall back to AdSense when
 * the pool is empty, so this is never asked to pick from nothing).
 */
export function pickCreative<T>(creatives: readonly T[], selection: AdSelection): T {
  if (selection === 'rotation') {
    return creatives[Math.floor(Math.random() * creatives.length)];
  }
  return creatives[0];
}
