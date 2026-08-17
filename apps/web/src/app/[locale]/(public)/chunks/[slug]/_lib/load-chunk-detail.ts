import { notFound } from 'next/navigation';

import { getReviewedGameIdSet } from '@/lib/ai-review/queries';
import {
  countPendingEditRequestsForChunk,
  getViewerPendingEditRequestForChunk,
} from '@/lib/chunk-edit-requests/queries';
import { getChunkLikeMeta } from '@/lib/chunks/like-queries';
import {
  getChunkBySlugWithProfile,
  getFeedbackTopicsForChunk,
  getLinkedPositionsForChunk,
} from '@/lib/chunks/queries';
import { listGamesLinkingChunk } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import type { LikeMeta } from '@/lib/db/like-queries';
import {
  EMPTY_REPLY_META,
  getGameCommentMetaMap,
  getReplyMetaMap,
} from '@/lib/db/reply-meta-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import { listRepertoiresLinkingChunk } from '@/lib/repertoires/chunk-links';

import { COMMENT_TREE_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getCommentTreePageForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import type { SortMode } from '@/app/[locale]/(public)/topics/_lib/shared';

type LinkedPositions = Awaited<ReturnType<typeof getLinkedPositionsForChunk>>;
type CommentTreeRows = Awaited<ReturnType<typeof getCommentTreePageForTopic>>['posts'];
type AttachmentMap = Awaited<ReturnType<typeof getAttachmentsForPosts>>;

/**
 * Single-pass data load for `/chunks/[slug]`. Pulls every read-side query
 * the page renders into one place and aggregates the cross-position reply
 * / like meta the way the page consumes it (`Map<positionId, …>`).
 *
 * Splits the page.tsx data layer from its presentation layer:
 *
 *  - The 13-promise `Promise.all` block was the page's heaviest cognitive
 *    load — half a dozen unrelated read queries interleaved with seven
 *    `getTranslations` calls. Translations stay in the page (each is one
 *    line and they only matter to the JSX); the queries collect here.
 *
 *  - Linked-position reply meta has to be fetched per `topicType`
 *    (`'position_puzzle'` vs `'position_memory'`). Doing that split + the
 *    merge in the page meant a future "add another position type"
 *    required reading three sites; doing it here keeps the page unaware
 *    of how the union resolves.
 *
 *  - `notFound()` is called inline so the page can `const { chunk } =
 *    await loadChunkDetail(...)` without a second `if (!chunk) notFound()`
 *    branch.
 *
 * Translations and the help-steps / callout-state derivations stay in
 * the page module — see `./resolve-chunk-display-state.ts` for the pure
 * derivation that *does* live here.
 */
export async function loadChunkDetail(slug: string, userId: string | undefined, sortBy: SortMode) {
  const row = await getChunkBySlugWithProfile(slug);
  if (!row) {
    notFound();
  }

  const { chunk, profile } = row;

  const [
    linkedPositions,
    commentCount,
    commentsPage,
    pendingEditRequestCount,
    requestedFeedbackTopics,
    viewerPendingRequestId,
    chunkLikeMeta,
    relatedGames,
    relatedRepertoires,
  ] = await Promise.all([
    getLinkedPositionsForChunk(chunk.id),
    getPostCountByTopicKey('chunk', slug),
    getCommentTreePageForTopic(
      'chunk',
      slug,
      { sortBy, offset: 0, limit: COMMENT_TREE_PAGE_SIZE },
      userId
    ),
    countPendingEditRequestsForChunk(chunk.id),
    getFeedbackTopicsForChunk(chunk.id),
    getViewerPendingEditRequestForChunk(chunk.id, userId ?? null),
    getChunkLikeMeta(chunk.id, userId),
    listGamesLinkingChunk(chunk.id),
    listRepertoiresLinkingChunk(chunk.id),
  ]);

  // Linked positions can mix puzzle and memory types. Reply meta is keyed by
  // `(topicType, topicKey)` so the two types are fetched in parallel and merged
  // into a single `Map<positionId, ReplyMeta>` — same shape as the public
  // profile page (`u/[username]`).
  const linkedPositionIds = linkedPositions.map((r) => r.position.id);
  const puzzlePositionIds = linkedPositions
    .filter((r) => r.position.type === 'puzzle')
    .map((r) => r.position.id);
  const memoryPositionIds = linkedPositions
    .filter((r) => r.position.type === 'memory')
    .map((r) => r.position.id);

  // Related games render the same CatalogListCard the gallery / profile use, so
  // they need the same per-game like + comment meta (keyed by game id).
  const relatedGameIds = relatedGames.map((g) => g.id);

  const [
    linkedLikeMetaMap,
    puzzleReplyMetaMap,
    memoryReplyMetaMap,
    relatedGamesLikeMetaMap,
    relatedGamesReplyMetaMap,
    relatedGamesReviewedIds,
    // Same story for the kata cards (RepertoireListCard footer counters).
    relatedRepertoiresCardMeta,
  ] = await Promise.all([
    linkedPositionIds.length > 0
      ? getPositionLikeMetaMap(linkedPositionIds, userId)
      : Promise.resolve(new Map<string, LikeMeta>()),
    puzzlePositionIds.length > 0
      ? getReplyMetaMap('position_puzzle', puzzlePositionIds)
      : Promise.resolve(new Map<string, ReplyMeta>()),
    memoryPositionIds.length > 0
      ? getReplyMetaMap('position_memory', memoryPositionIds)
      : Promise.resolve(new Map<string, ReplyMeta>()),
    relatedGameIds.length > 0
      ? getLikeMetaMap(GAME_LIKE_TARGET, relatedGameIds, userId)
      : Promise.resolve(new Map<string, LikeMeta>()),
    relatedGameIds.length > 0
      ? getGameCommentMetaMap(relatedGameIds)
      : Promise.resolve(new Map<string, ReplyMeta>()),
    getReviewedGameIdSet(relatedGameIds),
    getRepertoireCardMeta(
      relatedRepertoires.map((r) => r.repertoire.id),
      userId
    ),
  ]);
  const linkedReplyMetaMap = new Map<string, ReplyMeta>([
    ...puzzleReplyMetaMap,
    ...memoryReplyMetaMap,
  ]);

  // Fetch attachments for every post in the first comment batch — top-level
  // posts AND every reply — so an attached PGN/FEN/embed/image card renders
  // under its author regardless of depth. Later batches fetch their own
  // attachments inside `loadMoreChunkComments`.
  const comments = commentsPage.posts;
  const commentPostIds = comments.map((c) => c.id);
  const attachments: AttachmentMap =
    commentPostIds.length > 0 ? await getAttachmentsForPosts(commentPostIds) : new Map();

  return {
    chunk,
    profile,
    linkedPositions,
    commentCount,
    comments,
    hasMoreComments: commentsPage.hasMore,
    pendingEditRequestCount,
    requestedFeedbackTopics,
    viewerPendingRequestId,
    chunkLikeMeta,
    linkedLikeMetaMap,
    linkedReplyMetaMap,
    attachments,
    relatedGames,
    relatedGamesLikeMetaMap,
    relatedGamesReplyMetaMap,
    relatedGamesReviewedIds,
    relatedRepertoires,
    relatedRepertoiresCardMeta,
  };
}

export type ChunkDetailData = Awaited<ReturnType<typeof loadChunkDetail>>;

// Re-export the empty-reply-meta sentinel and the linked-positions row
// shape so the page only needs to import one module from `_lib`.
export { EMPTY_REPLY_META };
export type ChunkLinkedPositions = LinkedPositions;
export type ChunkComments = CommentTreeRows;
