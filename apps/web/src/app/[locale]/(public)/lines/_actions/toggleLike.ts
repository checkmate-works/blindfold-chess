'use server';

import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { toggleLineLike } from '@/lib/lines/like-actions';

/**
 * Toggle the current user's like on a line. `topicKey` (CatalogListCard's 3rd
 * argument) is unused — a line's id is its like target.
 */
export async function toggleLike(lineId: string, locale: string): Promise<ToggleLikeResult> {
  return toggleLineLike(lineId, locale);
}
