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
import { getPositionDetailPathForStoredType } from '@/lib/positions/routes';

import { buildTopicPostHref } from '@/app/[locale]/(public)/topics/_lib/topic-paths';

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
 * benefits pages render rows the same way. Deleted source rows — missing
 * from the map, whether the row was soft- or hard-deleted — keep the label
 * but drop the link.
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
      href: pos ? getPositionDetailPathForStoredType(pos.type, pos.id) : null,
    };
  }
  return { labelKey: 'topic_post', href: null };
}
