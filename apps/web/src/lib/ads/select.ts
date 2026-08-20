import type { RandomSource } from '@blindfold-chess/features/common';

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
 *
 * `rng` follows the injected-`RandomSource` convention the quiz generators in
 * `@blindfold-chess/features` already use: the route handler keeps calling
 * this with no argument, and a test can pin the pick instead of spying on the
 * global `Math.random`.
 */
export function pickCreative<T>(
  creatives: readonly T[],
  selection: AdSelection,
  rng: RandomSource = Math.random
): T {
  if (selection === 'rotation') {
    return creatives[Math.floor(rng() * creatives.length)];
  }
  return creatives[0];
}
