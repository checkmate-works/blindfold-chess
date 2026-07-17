'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { getOptionalUser } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { clampCommentOffset } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import {
  COMMENT_TREE_PAGE_SIZE,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { getCommentTreePageForTopic } from '@/app/[locale]/(public)/topics/_lib/queries';

import { ChunkCommentTreeBatch } from '../_components/ChunkCommentTreeBatch';

/**
 * Fetch + render the next comment-tree batch for `/chunks/[slug]`
 * (issue #81). Returns the batch as server-rendered JSX so the client
 * wrapper appends exactly what the page itself would SSR — see
 * `LoadMoreCommentsResult`.
 *
 * `slug`, `locale` and `sort` are bound server-side at render time
 * (`loadMoreChunkComments.bind(null, slug, locale, sortBy)`), but arrive
 * over the wire like any action argument, so they are re-validated here.
 */
export async function loadMoreChunkComments(
  slug: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  assertSupportedLocale(locale);
  const sortBy = validateSort(sort);
  const safeOffset = clampCommentOffset(offset);

  const chunk = await getChunkBySlug(slug);
  if (!chunk) {
    // Deleted between render and click — nothing to append, stop the loader.
    return { node: null, hasMore: false, nextOffset: safeOffset };
  }

  const user = await getOptionalUser();
  const { posts, hasMore } = await getCommentTreePageForTopic(
    'chunk',
    slug,
    { sortBy, offset: safeOffset, limit: COMMENT_TREE_PAGE_SIZE },
    user?.id
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

  return {
    node: (
      <ChunkCommentTreeBatch
        locale={locale}
        slug={slug}
        userId={user?.id}
        comments={posts}
        attachments={attachments}
        sortBy={sortBy}
        representativeFen={chunk.representativeFen}
      />
    ),
    hasMore,
    nextOffset: safeOffset + COMMENT_TREE_PAGE_SIZE,
  };
}
