'use server';

import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { toggleRepertoireLike } from '@/lib/repertoires/like-actions';

/**
 * Toggle the current user's like on a repertoire. `topicKey` (CatalogListCard's
 * 3rd argument) is unused — a repertoire's id is its like target.
 */
export async function toggleLike(repertoireId: string, locale: string): Promise<ToggleLikeResult> {
  return toggleRepertoireLike(repertoireId, locale);
}
