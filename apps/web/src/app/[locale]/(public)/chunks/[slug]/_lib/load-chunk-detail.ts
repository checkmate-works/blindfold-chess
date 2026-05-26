import { notFound } from 'next/navigation';

import {
  countPendingEditRequestsForChunk,
  getViewerPendingEditRequestForChunk,
} from '@/lib/chunk-edit-requests/queries';
import {
  getChunkBySlugWithProfile,
  getFeedbackTopicsForChunk,
  getLinkedPositionsForChunk,
} from '@/lib/chunks/queries';
import type { LikeMeta } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';

import {
  getCommentTreeForTopic,
  getPostCountByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';

type LinkedPositions = Awaited<ReturnType<typeof getLinkedPositionsForChunk>>;
type CommentTreeRows = Awaited<ReturnType<typeof getCommentTreeForTopic>>;
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
export async function loadChunkDetail(slug: string, userId: string | undefined) {
  const row = await getChunkBySlugWithProfile(slug);
  if (!row) {
    notFound();
  }

  const { chunk, profile } = row;

  const [
    linkedPositions,
    commentCount,
    allComments,
    pendingEditRequestCount,
    requestedFeedbackTopics,
    viewerPendingRequestId,
  ] = await Promise.all([
    getLinkedPositionsForChunk(chunk.id),
    getPostCountByTopicKey('chunk', slug),
    getCommentTreeForTopic('chunk', slug, userId),
    countPendingEditRequestsForChunk(chunk.id),
    getFeedbackTopicsForChunk(chunk.id),
    getViewerPendingEditRequestForChunk(chunk.id, userId ?? null),
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

  const [linkedLikeMetaMap, puzzleReplyMetaMap, memoryReplyMetaMap] = await Promise.all([
    linkedPositionIds.length > 0
      ? getPositionLikeMetaMap(linkedPositionIds, userId)
      : Promise.resolve(new Map<string, LikeMeta>()),
    puzzlePositionIds.length > 0
      ? getReplyMetaMap('position_puzzle', puzzlePositionIds)
      : Promise.resolve(new Map<string, ReplyMeta>()),
    memoryPositionIds.length > 0
      ? getReplyMetaMap('position_memory', memoryPositionIds)
      : Promise.resolve(new Map<string, ReplyMeta>()),
  ]);
  const linkedReplyMetaMap = new Map<string, ReplyMeta>([
    ...puzzleReplyMetaMap,
    ...memoryReplyMetaMap,
  ]);

  // Fetch attachments for every post in the topic — top-level posts AND
  // every reply — so an attached PGN/FEN/embed/image card renders under
  // its author regardless of depth. The page threads the resulting Map
  // through to every CommentNode it spawns.
  const allPostIds = allComments.map((c) => c.id);
  const attachments: AttachmentMap =
    allPostIds.length > 0 ? await getAttachmentsForPosts(allPostIds) : new Map();

  return {
    chunk,
    profile,
    linkedPositions,
    commentCount,
    allComments,
    pendingEditRequestCount,
    requestedFeedbackTopics,
    viewerPendingRequestId,
    linkedLikeMetaMap,
    linkedReplyMetaMap,
    attachments,
  };
}

export type ChunkDetailData = Awaited<ReturnType<typeof loadChunkDetail>>;

// Re-export the empty-reply-meta sentinel and the linked-positions row
// shape so the page only needs to import one module from `_lib`.
export { EMPTY_REPLY_META };
export type ChunkLinkedPositions = LinkedPositions;
export type ChunkComments = CommentTreeRows;
