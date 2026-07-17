'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { getOptionalUser } from '@/lib/auth';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionById } from '@/lib/positions/queries';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { clampCommentOffset } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';

import { PositionMemoryCommentTreeBatch } from '../_components/PositionMemoryCommentTreeBatch';

/**
 * Fetch + render the next comment-tree batch for
 * `/practice/position-memory/[id]` (issue #81). Returns the batch as
 * server-rendered JSX so the client wrapper appends exactly what the page
 * itself would SSR — see `LoadMoreCommentsResult`.
 *
 * `positionId`, `locale` and `sort` are bound server-side at render time
 * (`loadMorePositionMemoryComments.bind(null, position.id, locale, sortBy)`),
 * but arrive over the wire like any action argument, so they are
 * re-validated here.
 */
export async function loadMorePositionMemoryComments(
  positionId: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  assertSupportedLocale(locale);
  const sortBy = validateSort(sort);
  const safeOffset = clampCommentOffset(offset);

  // `getPositionById` UUID-checks the id before touching SQL (returns null
  // for malformed input) and the `type` filter guards against a memory
  // action being pointed at a puzzle position's comments.
  const position = await getPositionById({ id: positionId, type: 'memory' });
  if (!position) {
    // Deleted between render and click — nothing to append, stop the loader.
    return { node: null, hasMore: false, nextOffset: safeOffset };
  }

  const user = await getOptionalUser();
  const { posts, hasMore } = await getCommentTreePageForTopic(
    'position_memory',
    position.id,
    { sortBy, offset: safeOffset, limit: COMMENT_TREE_PAGE_SIZE },
    user?.id
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

  return {
    node: (
      <PositionMemoryCommentTreeBatch
        locale={locale}
        positionId={position.id}
        userId={user?.id}
        comments={posts}
        attachments={attachments}
        sortBy={sortBy}
      />
    ),
    hasMore,
    nextOffset: safeOffset + COMMENT_TREE_PAGE_SIZE,
  };
}
