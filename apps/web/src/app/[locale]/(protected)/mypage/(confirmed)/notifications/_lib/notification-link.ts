import { getPositionKindForTopicType, getPositionPostAnchorPath } from '@/lib/positions/kind';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';

import { buildTopicPostPath } from '@/app/[locale]/(public)/topics/_lib/topic-paths';

import type { NotificationWithActor } from './queries';
import type { PositionMetadata } from './type-guards';
import {
  getPositionTypeFromMetadata,
  isAnnouncementMetadata,
  isChunkEditRequestMetadata,
  isChunkLifecycleMetadata,
  isChunkLikeMetadata,
  isGameChunkLinkMetadata,
  isGameCommentLikeMetadata,
  isPositionMetadata,
  isPostMetadata,
  isRankGrantMetadata,
  isRepertoireChunkLinkMetadata,
  isReplyMetadata,
} from './type-guards';

/**
 * Resolve a notification link for a position-targeted notification.
 *
 * Uses the stored `positionType` in `metadata` to route to the correct
 * detail page (`/practice/puzzle/:id` for puzzles,
 * `/practice/position-memory/:id` for memory).
 *
 * Return values:
 *   - A path string — route to the correct detail page when `positionType`
 *     is known and a detail page exists.
 *   - `null` — `positionType` is a known value that has no detail page
 *     (currently `'sequence'`). Callers should degrade to a non-link
 *     button rather than producing an inevitable 404.
 *   - `/practice/position-memory/:id` fallback — `positionType` is missing
 *     (legacy notifications persisted before the field was introduced) or
 *     outside the known set. Legacy rows are overwhelmingly memory-typed,
 *     so the memory URL preserves pre-fix behavior.
 */
function resolvePositionLinkFromMetadata(id: string, metadata: PositionMetadata): string | null {
  const positionType = getPositionTypeFromMetadata(metadata);
  if (positionType !== null) {
    // Known type: trust `getPositionDetailPath`, including its `null` for
    // `sequence`. Do NOT fall back to the memory URL here — that would
    // just 404 for sequence positions.
    return getPositionDetailPath(positionType, id);
  }
  // Unknown / missing positionType — preserve legacy behavior.
  return `/practice/position-memory/${id}`;
}

/**
 * Resolve the chunk-suggestions page path for a position notification.
 *
 * Mirrors `resolvePositionLinkFromMetadata` but points at the position's
 * `/suggestions` sub-page (renamed from `/edit-requests` — that path name
 * collided with the unrelated `/history` edit-history page once it shipped).
 * Returns `null` when the position type has no detail page (currently
 * `'sequence'`), since it has no suggestions page either — callers degrade
 * to a non-link button.
 */
function resolvePositionEditRequestsLinkFromMetadata(
  id: string,
  metadata: PositionMetadata
): string | null {
  const detailPath = resolvePositionLinkFromMetadata(id, metadata);
  return detailPath === null ? null : `${detailPath}/suggestions`;
}

/**
 * Build the post-detail URL for a notification keyed off `topicType`.
 *
 * `topic_posts` is polymorphic, but the routes that render those posts
 * are not:
 *   - `square` / `opening` → `/topics/{segment}/{key}/posts/{postId}`
 *     detail page. The page renders the OP and every reply as a single-root
 *     `CommentNode` tree, where every node has `id="post-{id}"` — same
 *     anchor scheme as the position pages, so reply deep-links use
 *     `#post-{replyId}`.
 *   - `chunk` / `position_memory` / `position_puzzle` → no detail page; the
 *     parent page (the chunk detail page, or the puzzle / position page)
 *     renders the same inline tree. Both top-level and reply notifications
 *     point at `parent#post-{targetId}` (replyId for replies, postId for
 *     top-level).
 */
function buildPostDetailUrl(
  topicType: string,
  topicKey: string,
  postId: string,
  replyId?: string
): string {
  const positionKind = getPositionKindForTopicType(topicType);
  if (positionKind) {
    return getPositionPostAnchorPath(positionKind, topicKey, replyId ?? postId);
  }
  if (topicType === 'repertoire') {
    // The repertoire detail page renders the inline comment tree (like puzzles),
    // so both top-level and reply notifications deep-link to it.
    const targetId = replyId ?? postId;
    return `/repertoires/${topicKey}#post-${targetId}`;
  }
  if (topicType === 'repertoire_move') {
    // topicKey packs `${repertoireId}_${positionHash}`; the hash isn't reversible
    // to a line here, so deep-link to the position resolver route, which finds a
    // line + ply reaching it and redirects to that move's thread.
    const targetId = replyId ?? postId;
    const parsed = parseMoveTopicKey(topicKey);
    if (parsed) {
      // `post` rides as a query (not a #fragment): the resolver redirects
      // server-side, and fragments are not sent to / preserved by the server.
      return `/repertoires/${parsed.repertoireId}/position/${parsed.positionHash}?post=${targetId}`;
    }
    return `/repertoires#post-${targetId}`;
  }
  if (topicType === 'chunk') {
    // Chunks have no per-post detail page: the chunk detail page
    // (/chunks/{slug}) renders the full inline comment tree, where every
    // node has `id="post-{id}"`. Deep-link to that anchor — same scheme as
    // the position pages — for both top-level posts and replies.
    // The comment tree only renders under `?tab=comments`; without it the
    // page opens on Positions (or the first non-empty tab) and the
    // `#post-{id}` anchor has no target, so the param is required.
    const targetId = replyId ?? postId;
    return `/chunks/${topicKey}?tab=comments#post-${targetId}`;
  }
  const baseUrl = buildTopicPostPath(topicType, topicKey, postId);
  return replyId ? `${baseUrl}#post-${replyId}` : baseUrl;
}

/**
 * Resolve the destination URL for a notification, or `null` when the
 * notification should render as a non-link button (no meaningful target).
 *
 * Pure routing logic extracted from `NotificationItem` so it can be unit
 * tested without rendering the component.
 *
 * Dispatch is an exhaustive `switch` over {@link NotificationWithActor.type}:
 * adding a `NotificationType` without deciding its link now fails the build
 * (previously an unrouted type silently fell through to `null` and rendered
 * as a dead row). Runtime stays tolerant of stale rows whose type has been
 * retired from the union.
 */
export function buildNotificationLink(
  notification: NotificationWithActor,
  opts: { currentUsername?: string }
): string | null {
  const { currentUsername } = opts;
  const actor = notification.actor;

  switch (notification.type) {
    case 'follow':
      return actor ? `/u/${actor.username}` : null;

    case 'like':
    case 'reply':
    case 'new_post':
    case 'new_comment_on_topic':
      return buildEngagementLink(notification);

    case 'new_position':
      if (notification.targetId) {
        if (isPositionMetadata(notification.metadata)) {
          return resolvePositionLinkFromMetadata(notification.targetId, notification.metadata);
        }
        return `/practice/position-memory/${notification.targetId}`;
      }
      return null;

    case 'puzzle_forked':
    case 'memory_forked':
      if (notification.targetId) {
        // The target is always the newly created entry (never the fork source,
        // whose kind may differ). Route via the stored `positionType` so
        // `memory_forked` lands on the memory URL and `puzzle_forked` on the
        // puzzle URL; legacy `puzzle_forked` rows always carried `positionType:
        // 'puzzle'`, so the puzzle fallback preserves their prior behavior.
        if (isPositionMetadata(notification.metadata)) {
          return resolvePositionLinkFromMetadata(notification.targetId, notification.metadata);
        }
        return `/practice/puzzle/${notification.targetId}`;
      }
      return null;

    case 'new_game':
      // A followed author published a game; the target is the game id.
      return notification.targetId ? `/games/shared/${notification.targetId}` : null;

    case 'game_chunk_linked':
      if (isGameChunkLinkMetadata(notification.metadata)) {
        // Open the replay at the tagged move, where that move's chunk links are
        // listed. The replay parses `#<half-move>` client-side as 1-based (see
        // `useReplayDeepLink`), hence the +1; an out-of-range value there simply
        // degrades to the overview board rather than 404ing.
        return `/games/shared/${notification.metadata.gameId}#${notification.metadata.ply + 1}`;
      }
      return null;

    case 'repertoire_chunk_linked':
      if (isRepertoireChunkLinkMetadata(notification.metadata)) {
        // lineNo / ply are the 1-based values the line page itself uses (`?move=`
        // query param, not a #fragment — see `RepertoireLineDetailPage`), so no
        // +1 adjustment is needed here (unlike the game_chunk_linked branch).
        const { repertoireId, lineNo, ply } = notification.metadata;
        return `/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}`;
      }
      return null;

    case 'announcement':
      return isAnnouncementMetadata(notification.metadata)
        ? `/announcements/${notification.metadata.slug}`
        : null;

    case 'chunk_edit_request_submitted':
    case 'chunk_edit_request_accepted':
      if (isChunkEditRequestMetadata(notification.metadata)) {
        // Route to the chunk's edit-requests page rather than the
        // individual request — the page already shows the full per-request
        // list with the current chunk values for comparison, which is the
        // context both notification types ask for.
        return `/chunks/${notification.metadata.slug}/edit-requests`;
      }
      return null;

    case 'position_edit_request_submitted':
      if (isPositionMetadata(notification.metadata)) {
        // Route the owner to the position's suggestions page — the full
        // per-request list with the current position values for comparison,
        // which is the context this notification asks the owner to review
        // (mirrors the chunk edit-request routing above).
        return resolvePositionEditRequestsLinkFromMetadata(
          notification.metadata.positionId,
          notification.metadata
        );
      }
      return null;

    case 'position_edit_request_accepted':
      if (isPositionMetadata(notification.metadata)) {
        // The accepted proposer lands on the position detail page, where the
        // applied change is now visible. `positionType` in metadata selects
        // memory vs. puzzle; a missing type falls back to the memory URL.
        return resolvePositionLinkFromMetadata(
          notification.metadata.positionId,
          notification.metadata
        );
      }
      return null;

    case 'new_chunk_draft':
    case 'chunk_published':
      if (isChunkLifecycleMetadata(notification.metadata)) {
        // Drafts land on the edit-requests page since the call-to-action
        // is to review the draft and propose changes. Published chunks
        // route to the chunk's main page — the canonical post.
        if (notification.type === 'new_chunk_draft') {
          return `/chunks/${notification.metadata.slug}/edit-requests`;
        }
        return `/chunks/${notification.metadata.slug}`;
      }
      return null;

    case 'achievement_granted':
      return currentUsername ? `/u/${currentUsername}/achievements` : null;

    case 'benefit_grant':
      return '/mypage/benefits';

    case 'rank_grant':
      return isRankGrantMetadata(notification.metadata)
        ? `/dojo/ranks/${notification.metadata.rankSlug}`
        : null;

    case 'point_grant':
    case 'like_coin_grant':
      return '/mypage/coins';

    default: {
      // Compile-time exhaustiveness: a NotificationType with no case above
      // fails the build. Runtime stays tolerant — a stale row whose type was
      // retired renders as a non-link button.
      const _exhaustive: never = notification.type;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Routing for the engagement family (`like` / `reply` / `new_post` /
 * `new_comment_on_topic`), whose branches key off target/metadata shape and
 * are shared across the four types — a like may point at a position, a post
 * thread, a whole game, a game comment, or a chunk. The conditions keep the
 * priority order of the original if-chain, including each branch's own type
 * guards, so per-type behavior is unchanged.
 */
function buildEngagementLink(notification: NotificationWithActor): string | null {
  if (notification.type === 'like' && notification.targetType === 'position') {
    if (isPositionMetadata(notification.metadata)) {
      // Prefer the stored `positionType` so puzzle likes route to
      // `/practice/puzzle/:id` (the memory URL 404s for puzzles).
      // May return `null` for types without a detail page (e.g.
      // `sequence`); in that case the item degrades to a non-link
      // button rather than producing a 404. Legacy notifications
      // without `positionType` still fall back to the memory URL.
      return resolvePositionLinkFromMetadata(
        notification.metadata.positionId,
        notification.metadata
      );
    }
    if (notification.targetId) {
      return `/practice/position-memory/${notification.targetId}`;
    }
  }
  if (isPostMetadata(notification.metadata)) {
    // Both thread-derived types carry the concrete comment's id as replyId
    // ('new_comment_on_topic' rows written by notifyTopicAuthorOfNewComment
    // have no replyId — the post itself is the comment — and fall through
    // to the post anchor).
    const replyId =
      (notification.type === 'reply' || notification.type === 'new_comment_on_topic') &&
      isReplyMetadata(notification.metadata)
        ? notification.metadata.replyId
        : undefined;
    return buildPostDetailUrl(
      notification.metadata.topicType,
      notification.metadata.topicKey,
      notification.metadata.postId,
      replyId
    );
  }
  if (notification.type === 'like' && notification.targetType === 'game' && notification.targetId) {
    // The game id is the like target itself.
    return `/games/shared/${notification.targetId}`;
  }
  if (
    notification.type !== 'new_post' &&
    notification.targetType === 'game_comment' &&
    notification.targetId &&
    isGameCommentLikeMetadata(notification.metadata)
  ) {
    // Deep-link to the comment (the liked one, the reply, or the new
    // top-level comment — targetId is always the comment to show): the
    // detail page opens that comment's move and scrolls to it (the threads
    // are per-move).
    return `/games/shared/${notification.metadata.gameId}?comment=${notification.targetId}`;
  }
  if (
    notification.type === 'like' &&
    notification.targetType === 'chunk' &&
    isChunkLikeMetadata(notification.metadata)
  ) {
    // Direct like on a chunk entity. Route to the chunk's canonical page
    // via the snapshotted slug — `targetId` holds the chunk id, but the
    // route is keyed by slug (`/chunks/[slug]`), so the id would 404.
    // (A like on a comment in the chunk thread is `targetType: 'topic_post'`
    // with `topicType: 'chunk'`, handled above by `buildPostDetailUrl`.)
    return `/chunks/${notification.metadata.slug}`;
  }
  return null;
}
