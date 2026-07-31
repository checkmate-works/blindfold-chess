import { getLinkedChunksForPosition } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { countPositions, getPositionLineageMetaById } from '@/lib/positions/queries';
import { parsePositionType } from '@/lib/positions/types';
import { getLinkedThemesForPosition } from '@/lib/themes/queries';

import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreePageForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type { SortMode } from '@/app/[locale]/(public)/topics/_lib/shared';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Position kind backing this detail page. Drives the `topicType` used
 * for comment fetches and the `forkedFromId` filter applied to the
 * forks counter.
 */
export type PositionKind = 'memory' | 'puzzle';

/**
 * Minimal position-row shape the loader reads. Accepting a structural
 * input (rather than the runtime `Position` from drizzle) keeps the
 * helper decoupled from puzzle-specific overlays — the puzzle page
 * resolves its row through `loadPuzzleWithSolutions` (which carries
 * extra puzzle-solution columns) while the memory page resolves
 * through `getPositionWithProfileById`.
 */
type PositionRow = {
  id: string;
  userId: string | null;
  forkedFromId: string | null;
  forksDisabledAt: Date | null;
};

/**
 * Single-pass data load for the position-detail page (used by both
 * `position-memory/[id]` and `puzzle/[id]`). Wraps the seven parallel
 * queries the two pages used to inline, plus the post-attachment fetch
 * + map building that always followed them.
 *
 * Why this lives in `_lib`: the two detail pages were 90% identical
 * (same Promise.all shape, same attachment handling, same fork
 * provenance derivation). Lifting the data layer out leaves each page
 * as a thin "load → render variant" module and lets a future detail
 * surface (e.g. a `sequence/[id]` page) reuse the same loader instead
 * of becoming a third copy.
 *
 * @param position The pre-loaded position row. Loaded by the page
 *   itself so the page can `notFound()` based on the lookup before
 *   spending the parallel queries.
 * @param kind Which position type the parent surface is — drives the
 *   `topicType` used for comments / post counts.
 * @param currentUserId The viewer's id (or `undefined` for guests);
 *   forwarded to `getPositionLikeMeta` and `getCommentTreePageForTopic`
 *   so they can carry per-viewer `likedByMe` / `selfDeleted` flags.
 * @param locale Locale forwarded to `getLinkedThemesForPosition` so
 *   theme labels resolve in the viewer's language.
 * @param sortBy Validated comment sort — parsed by the page BEFORE this
 *   loader runs so the first SSR'd comment batch is already in the
 *   viewer's requested order.
 */
export async function loadPositionDetail({
  position,
  kind,
  currentUserId,
  locale,
  sortBy,
}: {
  position: PositionRow;
  kind: PositionKind;
  currentUserId: string | undefined;
  locale: Locale;
  sortBy: SortMode;
}) {
  const topicType = kind === 'memory' ? 'position_memory' : 'position_puzzle';

  const [
    likeMeta,
    relatedChunks,
    relatedThemes,
    commentCount,
    commentsPage,
    forkParentRow,
    forkCount,
  ] = await Promise.all([
    getPositionLikeMeta(position.id, currentUserId),
    getLinkedChunksForPosition(position.id),
    getLinkedThemesForPosition(position.id, locale),
    getPostCountByTopicKey(topicType, position.id),
    getCommentTreePageForTopic(
      topicType,
      position.id,
      { sortBy, offset: 0, limit: COMMENT_TREE_PAGE_SIZE },
      currentUserId
    ),
    position.forkedFromId
      ? getPositionLineageMetaById(position.forkedFromId)
      : Promise.resolve(null),
    // Only the count is needed at this surface — the dedicated /forks
    // page handles the listing (with pagination).
    countPositions({ type: kind, forkedFromId: position.id }),
  ]);

  // Narrow the raw `positions.type` varchar to the union ForkProvenanceNote
  // needs to route the parent's link. A parent whose type doesn't parse to
  // 'memory' | 'puzzle' (not expected in practice — 'sequence' has no
  // detail route yet) is treated the same as "not found": there's no valid
  // link to build for it.
  const forkParentType = forkParentRow ? parsePositionType(forkParentRow.type) : null;
  const forkParent =
    forkParentRow && (forkParentType === 'memory' || forkParentType === 'puzzle')
      ? { ...forkParentRow, type: forkParentType }
      : null;

  // Self-forking is allowed (owners can derive a variation of their own work),
  // so ownership no longer gates the fork entry point — only auth state and the
  // permanent forks-disabled lock do. See validateForkSource in @/lib/positions/fork.
  const canFork = currentUserId != null && position.forksDisabledAt === null;

  // Fetch attachments for every post in the first comment batch — top-level
  // posts AND every reply — so attached PGN/FEN/embed/image cards render
  // under their author regardless of depth. Later batches fetch their own
  // attachments inside the page's `loadMore*Comments` Server Action.
  const comments = commentsPage.posts;
  const commentPostIds = comments.map((c) => c.id);
  const attachments =
    commentPostIds.length > 0 ? await getAttachmentsForPosts(commentPostIds) : new Map();

  return {
    likeMeta,
    relatedChunks,
    relatedThemes,
    commentCount,
    comments,
    hasMoreComments: commentsPage.hasMore,
    forkParent,
    forkCount,
    canFork,
    attachments,
  };
}

export type PositionDetailData = Awaited<ReturnType<typeof loadPositionDetail>>;
