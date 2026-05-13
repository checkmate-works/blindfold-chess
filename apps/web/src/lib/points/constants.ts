/**
 * Point system constants — categories, sources, amounts, and lifecycle timings.
 *
 * Code is the source of truth for the policy values referenced by the
 * `point_events` / `user_point_balances` tables. DB schema only stores facts
 * (every row carries its concrete `delta` and `category`); changing a value
 * here affects only NEW events.
 */

/**
 * Per-category buckets stored on `point_events.category` and
 * `user_point_balances.category`. The keyed bucket model lets purchased and
 * earned points evolve independently (different refund / redemption / expiry
 * rules) without schema changes.
 */
export const POINT_CATEGORIES = ['earned_pending', 'earned', 'purchased', 'promotional'] as const;
export type PointCategory = (typeof POINT_CATEGORIES)[number];

/**
 * `point_events.source` values. Distinct per UGC trigger so clawback /
 * maturation queries can target a single (source, source_id) pair.
 * Lifecycle stage (created / clawed back / matured) is encoded in the
 * idempotency_key prefix, not in `source` — see `buildIdempotencyKey`.
 */
export const POINT_SOURCES = [
  'puzzle_created',
  'position_memory_created',
  'topic_post_created',
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/**
 * Post entity types that earn points on creation. Map 1:1 with the
 * trigger `applyAutomatedGrant` was previously wired into. `chunk` is
 * intentionally absent: chunk image attach is not user-facing UGC.
 */
export type PointPostEntityType = 'puzzle' | 'position_memory' | 'topic_post';

export type PointPostEntity = {
  type: PointPostEntityType;
  id: string;
};

const ENTITY_TYPE_TO_SOURCE: Record<PointPostEntityType, PointSource> = {
  puzzle: 'puzzle_created',
  position_memory: 'position_memory_created',
  topic_post: 'topic_post_created',
};

export function sourceForEntity(entityType: PointPostEntityType): PointSource {
  return ENTITY_TYPE_TO_SOURCE[entityType];
}

/**
 * Lifecycle stage tag for `idempotency_key`. The DB-level UNIQUE constraint
 * on `point_events.idempotency_key` is the hard backstop against duplicate
 * inserts; these prefixes make the keys human-debuggable.
 */
export const POINT_LIFECYCLE_STAGES = [
  'post_grant',
  'post_clawback',
  'post_mature_pending',
  'post_mature_earned',
] as const;
export type PointLifecycleStage = (typeof POINT_LIFECYCLE_STAGES)[number];

export function buildIdempotencyKey(stage: PointLifecycleStage, entity: PointPostEntity): string {
  return `${stage}:${entity.type}:${entity.id}`;
}

/**
 * Points awarded per UGC post. Replaces the prior 5-day ad_free grant.
 * Redemption is intentionally 1 pt → 1 day of ad_free (set in the
 * redemption flow), so a single post is worth less than the legacy 5-day
 * grant but stacks across the user's whole submission history.
 */
export const POST_CREATION_POINTS = 3;

/**
 * Days that must elapse before an `earned_pending` row matures into
 * `earned` (spendable). Until matured, the points are visible to the user
 * but cannot be redeemed. Deletions during this window are clawed back.
 * After this window, the points are kept even if the source post is later
 * removed — users retain agency over their own content without sacrificing
 * already-earned rewards.
 */
export const POST_MATURATION_DAYS = 7;

/**
 * `topic_posts.topicType` values that earn a point grant on creation.
 *
 * Scoped to the **standalone topic surfaces** (`square`, `opening`) only.
 * `position_memory` / `position_puzzle` posts are excluded because in
 * product language they are "comments on a problem" — the point grant for
 * those flows is earned by *creating the problem* via `createPosition` /
 * `createPuzzle`. `chunk` posts have always been excluded.
 *
 * Single source of truth for:
 *   1. `createPostBase` — gates `grantPendingPointsForPost` on `topicType`.
 *   2. The `/faq` "Ways to earn points" surface.
 *
 * Add a topic type here together with its i18n label in every locale.
 */
export const POINT_ELIGIBLE_TOPIC_TYPES = ['square', 'opening'] as const;
export type PointEligibleTopicType = (typeof POINT_ELIGIBLE_TOPIC_TYPES)[number];

export function isPointEligibleTopicType(v: string): v is PointEligibleTopicType {
  return (POINT_ELIGIBLE_TOPIC_TYPES as readonly string[]).includes(v);
}
