import { parsePositionType } from '@/lib/positions/types';
import type { PositionType } from '@/lib/positions/types';

export type PostMetadata = { topicType: string; topicKey: string; postId: string };
export type ReplyMetadata = PostMetadata & { replyId: string };
export type AnnouncementMetadata = { slug: string; title: string };
export type PositionMetadata = { positionId: string; positionType?: PositionType };

/**
 * Metadata persisted with every `chunk_edit_request_*` notification.
 * `slug` is captured at notification time so the link target survives
 * even if the chunk is later renamed (the slug is immutable after
 * creation, but we still snapshot it for parity with the post metadata
 * shape, and to avoid an extra DB lookup at render time).
 */
export type ChunkEditRequestMetadata = { chunkId: string; slug: string };

export function isChunkEditRequestMetadata(m: unknown): m is ChunkEditRequestMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.chunkId === 'string' && typeof r.slug === 'string';
}

/**
 * Metadata persisted with `new_chunk_draft` / `chunk_published` notifications.
 * Mirrors the position-creation metadata shape: `slug` is snapshotted so the
 * notification's link target survives even if the chunk is later renamed, and
 * `kind` records whether the event was a draft submission (calls for edit
 * requests) or a publish promotion (canonical state reached).
 */
export type ChunkLifecycleMetadata = {
  chunkId: string;
  slug: string;
  kind: 'created' | 'published';
};

export function isChunkLifecycleMetadata(m: unknown): m is ChunkLifecycleMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.chunkId === 'string' &&
    typeof r.slug === 'string' &&
    (r.kind === 'created' || r.kind === 'published')
  );
}

/**
 * Metadata persisted with a `like` notification whose target is a chunk
 * entity itself (`targetType = 'chunk'`) — i.e. someone liked the chunk,
 * not a comment in its thread (that is `targetType = 'topic_post'` with
 * `topicType = 'chunk'`). `slug` is snapshotted at notification time so
 * the link target survives a later rename and renders without a DB lookup.
 *
 * Shares the `{ chunkId, slug }` shape with `ChunkEditRequestMetadata`,
 * but is kept distinct so the like branch in `buildNotificationLink`
 * reads by intent rather than borrowing an edit-request guard.
 */
export type ChunkLikeMetadata = { chunkId: string; slug: string };

export function isChunkLikeMetadata(m: unknown): m is ChunkLikeMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.chunkId === 'string' && typeof r.slug === 'string';
}

export function isPositionMetadata(m: unknown): m is PositionMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.positionId === 'string';
}

/**
 * Narrow `metadata.positionType` (if present) to the typed `PositionType`
 * union using the shared `parsePositionType` parser. Returns `null` when
 * `positionType` is missing or outside the known set — callers can then
 * fall back to a default route.
 */
export function getPositionTypeFromMetadata(m: PositionMetadata): PositionType | null {
  if (typeof m.positionType !== 'string') return null;
  return parsePositionType(m.positionType);
}

export function isPostMetadata(m: unknown): m is PostMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.topicType === 'string' &&
    typeof r.topicKey === 'string' &&
    typeof r.postId === 'string'
  );
}

export function isReplyMetadata(m: unknown): m is ReplyMetadata {
  return (
    isPostMetadata(m) &&
    'replyId' in m &&
    typeof (m as Record<string, unknown>).replyId === 'string'
  );
}

/**
 * Metadata persisted with a `like` notification whose target is a shared-game
 * comment (`targetType = 'game_comment'`). `gameId` is the game the comment
 * belongs to; the comment id itself is the notification's `targetId`. Together
 * they build the deep link `/games/shared/{gameId}?comment={commentId}`.
 */
export type GameCommentLikeMetadata = { gameId: string };

export function isGameCommentLikeMetadata(m: unknown): m is GameCommentLikeMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.gameId === 'string';
}

export function isAnnouncementMetadata(m: unknown): m is AnnouncementMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.slug === 'string' && typeof r.title === 'string';
}

type AchievementBadge = {
  slug: string;
  menuType: string;
  leaderboardKey: string;
  placement: number;
};

export type AchievementGrantedMetadata = {
  badges: AchievementBadge[];
  year: number;
  month: number;
};

export function isAchievementGrantedMetadata(m: unknown): m is AchievementGrantedMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    Array.isArray(r.badges) &&
    r.badges.length > 0 &&
    typeof r.year === 'number' &&
    typeof r.month === 'number'
  );
}

export type BenefitGrantMetadata = {
  grantType: string;
  benefitType: string;
  durationDays: number;
  expiresAt: string;
  reason: string | null;
};

export function isBenefitGrantMetadata(m: unknown): m is BenefitGrantMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.grantType === 'string' &&
    typeof r.benefitType === 'string' &&
    typeof r.durationDays === 'number' &&
    typeof r.expiresAt === 'string' &&
    (r.reason === null || typeof r.reason === 'string')
  );
}

/**
 * Metadata persisted with a `point_grant` notification. Issued today only
 * from the admin /admin/coins → createPointGrant flow; future system
 * grants (campaigns, etc.) can reuse this shape by widening `category`.
 */
export type PointGrantMetadata = {
  amount: number;
  category: string;
  reason: string | null;
};

export function isPointGrantMetadata(m: unknown): m is PointGrantMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.amount === 'number' &&
    typeof r.category === 'string' &&
    (r.reason === null || typeof r.reason === 'string')
  );
}

/**
 * Metadata persisted with a `like_coin_grant` notification — emitted by the
 * daily like-coin batch (`grantLikeCoins`). `count` is the number of coins
 * minted for the recipient in that single batch run (direct grants and
 * fork-propagation grants combined).
 */
export type LikeCoinGrantMetadata = {
  count: number;
};

export function isLikeCoinGrantMetadata(m: unknown): m is LikeCoinGrantMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.count === 'number';
}
