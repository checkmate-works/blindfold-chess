'use server';

import type { ToggleLikeResult } from '@/lib/positions/like-actions';
import { togglePositionLike } from '@/lib/positions/like-actions';

/**
 * Shared `"use server"` wrapper for toggling a like on a position-backed
 * practice entity (puzzles, position-memory positions, fork views of either).
 *
 * The underlying `togglePositionLike` is targetType-polymorphic on the
 * positions table, so a single wrapper works for every free-play surface
 * that displays a position card. Hosted at the `(free-play)/_actions` level
 * because callers come from sibling routes (`puzzle/...`, `position-memory/...`,
 * `(home)/...` feeds, and `mypage/problems/...` aggregates).
 */
export async function toggleLike(positionId: string, locale: string): Promise<ToggleLikeResult> {
  return togglePositionLike(positionId, locale);
}
