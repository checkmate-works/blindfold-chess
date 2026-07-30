import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { getOptionalUser } from '@/lib/auth';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { CommentThreadWiring } from '../_components/CommentTreeBatch';
import { CommentTreeBatch } from '../_components/CommentTreeBatch';
import type { TopicType } from './constants';
import type { LoadMoreCommentsResult } from './load-more-comments';
import { clampCommentOffset } from './load-more-comments';
import { COMMENT_TREE_PAGE_SIZE } from './pagination';
import { getCommentTreePageForTopic } from './queries';
import type { SortMode } from './shared';

type Params = {
  /** Bound at render time; re-validated here because it arrives over the wire. */
  locale: string;
  /**
   * Sort mode, already resolved by the caller — either `validateSort(sort)` on
   * a bound client value, or a literal for surfaces with no sort control.
   */
  sortBy: SortMode;
  offset: number;
  topicType: TopicType;
  /**
   * Re-resolve the thread's owner entity and derive this surface's wiring
   * from it. Receives the viewer's id for visibility-scoped lookups, and the
   * locale already narrowed by this function's `assertSupportedLocale` — so
   * callers building a locale-prefixed `redirectPath` need no cast.
   *
   * Return `null` for anything that means "there is no thread to append to":
   * the entity was deleted between render and click, or a bound argument
   * failed re-validation. The loader then stops cleanly.
   */
  resolveWiring: (ctx: {
    viewerId: string | undefined;
    locale: Locale;
  }) => Promise<CommentThreadWiring | null>;
};

/**
 * Fetch + render the next comment-tree batch for a commentable surface.
 *
 * Every `loadMoreXComments` Server Action (issue #81) was the same sequence —
 * validate the bound locale / sort / offset, re-resolve the owner entity,
 * read the viewer, page the tree, batch-load attachments, render the batch as
 * JSX for the client wrapper to append verbatim. Only the entity lookup and
 * the thread's wiring ever differed, so those are the only things a caller
 * supplies.
 *
 * The viewer is read before `resolveWiring` so visibility-scoped lookups
 * (a repertoire line the owner can see but the public cannot) get the id they
 * need. This costs one cached auth read on the rare deleted-entity path,
 * where the previous per-surface copies returned before reading the user.
 *
 * Lives in a plain module — `'use server'` files may only export async
 * functions, so the shared implementation cannot live in one of them.
 */
export async function loadMoreCommentsBase({
  locale,
  sortBy,
  offset,
  topicType,
  resolveWiring,
}: Params): Promise<LoadMoreCommentsResult> {
  assertSupportedLocale(locale);
  const safeOffset = clampCommentOffset(offset);

  const user = await getOptionalUser();
  const wiring = await resolveWiring({ viewerId: user?.id, locale });
  if (!wiring) {
    return { node: null, hasMore: false, nextOffset: safeOffset };
  }

  const { posts, hasMore } = await getCommentTreePageForTopic(
    topicType,
    wiring.topicKey,
    { sortBy, offset: safeOffset, limit: COMMENT_TREE_PAGE_SIZE },
    user?.id
  );
  const attachments =
    posts.length > 0 ? await getAttachmentsForPosts(posts.map((p) => p.id)) : new Map();

  return {
    node: (
      <CommentTreeBatch
        {...wiring}
        locale={locale}
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
