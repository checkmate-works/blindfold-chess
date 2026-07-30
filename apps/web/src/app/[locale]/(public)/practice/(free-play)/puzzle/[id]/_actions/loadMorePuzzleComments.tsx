'use server';

import { getPositionById } from '@/lib/positions/queries';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { loadMoreCommentsBase } from '@/app/[locale]/(public)/topics/_lib/load-more-comments-base';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';

import { puzzleCommentThread } from '../_lib/comment-thread';

/**
 * Fetch + render the next comment-tree batch for `/practice/puzzle/[id]`
 * (issue #81).
 *
 * `positionId`, `locale` and `sort` are bound server-side at render time
 * (`loadMorePuzzleComments.bind(null, position.id, locale, sortBy)`), but
 * arrive over the wire like any action argument, so they are re-validated
 * here.
 */
export async function loadMorePuzzleComments(
  positionId: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  return loadMoreCommentsBase({
    locale,
    sortBy: validateSort(sort),
    offset,
    topicType: 'position_puzzle',
    resolveWiring: async ({ locale }) => {
      // `getPositionById` UUID-checks the id before touching SQL (returns
      // null for malformed input) and the `type` filter guards against a
      // puzzle action being pointed at a memory position's comments.
      const position = await getPositionById({ id: positionId, type: 'puzzle' });
      return position ? puzzleCommentThread(locale, position.id) : null;
    },
  });
}
