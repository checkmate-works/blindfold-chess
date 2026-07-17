'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { getOptionalUser } from '@/lib/auth';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { isValidUUID } from '@/lib/validations/uuid';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { clampCommentOffset } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';

import { RepertoireCommentTreeBatch } from '../_components/RepertoireCommentTreeBatch';

/**
 * Fetch + render the next comment-tree batch for `/repertoires/[id]`
 * (issue #81). Returns the batch as server-rendered JSX so the client
 * wrapper appends exactly what the page itself would SSR — see
 * `LoadMoreCommentsResult`.
 *
 * `repertoireId`, `locale` and `sort` are bound server-side at render time
 * (`loadMoreRepertoireComments.bind(null, repertoireId, locale, sortBy)`),
 * but arrive over the wire like any action argument, so they are
 * re-validated here.
 */
export async function loadMoreRepertoireComments(
  repertoireId: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  assertSupportedLocale(locale);
  const sortBy = validateSort(sort);
  const safeOffset = clampCommentOffset(offset);

  if (!isValidUUID(repertoireId) || !(await getRepertoireById(repertoireId))) {
    // Malformed key or deleted between render and click — nothing to
    // append, stop the loader.
    return { node: null, hasMore: false, nextOffset: safeOffset };
  }

  const user = await getOptionalUser();
  const { posts, hasMore } = await getCommentTreePageForTopic(
    'repertoire',
    repertoireId,
    { sortBy, offset: safeOffset, limit: COMMENT_TREE_PAGE_SIZE },
    user?.id
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

  return {
    node: (
      <RepertoireCommentTreeBatch
        locale={locale}
        repertoireId={repertoireId}
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
