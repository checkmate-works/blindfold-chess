/**
 * URL helpers for resolving a `user_grants` row back to its public source
 * page (the topic_post or position that triggered the grant). Shared by
 * `/mypage/benefits` and `/mypage/benefits/[benefitType]` so both surfaces
 * resolve and link sources the same way.
 *
 * Returned paths are locale-less — callers pass them to the next-intl
 * `Link` which prepends the active locale.
 */
import type { GrantType } from '@/lib/db/data/grant-types';

/**
 * Convert a `topic_posts.topic_type` into the URL segment the public route
 * uses. Mirrors `getTopicSegment` in NotificationItem for consistency.
 */
function topicTypeToSegment(topicType: string): string {
  if (topicType === 'opening') return 'openings';
  return `${topicType}s`;
}

/**
 * Build a public detail path for a topic_post (no locale prefix). The
 * position_memory / position_puzzle topic types live under
 * `/practice/...#post-...` (matching NotificationItem's anchor scheme); all
 * others route to `/topics/...`. position_memory / position_puzzle no
 * longer earn grants today (see TOPIC_POST_GRANT_TOPIC_TYPES) — the
 * branches are kept so historical rows whose grants were issued before the
 * scope change still resolve to a usable link.
 */
function buildTopicPostHref(topicType: string, topicKey: string, postId: string): string {
  if (topicType === 'position_memory') {
    return `/practice/position-memory/${topicKey}#post-${postId}`;
  }
  if (topicType === 'position_puzzle') {
    return `/practice/puzzle/${topicKey}#post-${postId}`;
  }
  return `/topics/${topicTypeToSegment(topicType)}/${topicKey}/posts/${postId}`;
}

/**
 * Build a public detail path for a `positions` row (no locale prefix).
 * Returns `null` for position types without a dedicated detail page (e.g.,
 * `'sequence'`); callers render the row without a link in that case.
 */
function buildPositionHref(positionType: string, positionId: string): string | null {
  if (positionType === 'puzzle') return `/practice/puzzle/${positionId}`;
  if (positionType === 'memory') return `/practice/position-memory/${positionId}`;
  return null;
}

type TopicPostMeta = { id: string; topicType: string; topicKey: string };
type PositionMeta = { id: string; type: string };

type GrantLike = {
  grantType: GrantType;
  sourceType: string | null;
  sourceId: string | null;
};

export type GrantSourceMeta = {
  /**
   * The label key under `MypageBenefits.grantTypeLabel.*`. Distinguishes
   * `topic_post` grants by source surface so labels can read "topic post"
   * vs "position submission" without exposing the (grantType, sourceType)
   * pair to the JSX layer.
   */
  labelKey: 'admin_manual' | 'topic_post' | 'position_creation';
  /** Public detail path (no locale prefix) or null if there is no link. */
  href: string | null;
};

/**
 * Resolve the display label key and optional deep-link for a single grant
 * given pre-fetched maps of its possible source rows. Centralizes the
 * (grantType, sourceType, sourceRow) → (label, href) decision so the two
 * benefits pages render rows the same way. Hard-deleted source rows
 * (missing from the map) keep the label but drop the link.
 */
export function resolveGrantSourceMeta(
  grant: GrantLike,
  topicPostMap: Map<string, TopicPostMeta>,
  positionMap: Map<string, PositionMeta>
): GrantSourceMeta {
  if (grant.grantType !== 'topic_post') {
    return { labelKey: 'admin_manual', href: null };
  }
  if (grant.sourceType === 'topic_post' && grant.sourceId) {
    const post = topicPostMap.get(grant.sourceId);
    return {
      labelKey: 'topic_post',
      href: post ? buildTopicPostHref(post.topicType, post.topicKey, post.id) : null,
    };
  }
  if (grant.sourceType === 'position' && grant.sourceId) {
    const pos = positionMap.get(grant.sourceId);
    return {
      labelKey: 'position_creation',
      href: pos ? buildPositionHref(pos.type, pos.id) : null,
    };
  }
  return { labelKey: 'topic_post', href: null };
}
