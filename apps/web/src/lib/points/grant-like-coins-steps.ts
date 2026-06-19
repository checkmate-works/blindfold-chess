import { and, gt, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import 'server-only';

import { db, likes, positions, profiles, topicPosts } from '@/lib/db';

import { LIKE_GRANT_TARGET_TYPES } from './constants';
import type { ContentRow, GrantIntent, LikeRow, PositionRow } from './grant-like-coins-intents';

/**
 * Step helpers for the `grantLikeCoins` daily batch.
 *
 * The orchestrator was an eight-step pipeline interleaving DB scans
 * with pure derivations at the same indent level. Splitting the steps
 * out (without re-flattening them into a class) lets each step's
 * intent show up in the name — "load likes in window", "resolve grant
 * targets", "filter to live recipients" — so the orchestrator reads
 * top-to-bottom as the pipeline it always was, not as 200 lines of
 * mechanics. The helpers stay in this single module so the pipeline
 * does not become a directory of micro-files.
 */

/**
 * Scan the `likes` table for rows in the half-open window
 * `(watermark, scanStartedAt]`. Bounding the upper edge keeps the
 * next watermark a clean cut: likes that land mid-run fall into the
 * next run's window.
 *
 * Filtered to target types that participate in the like-coin program
 * (currently `position` and `topic_post`); excludes likes on entities
 * — e.g. chunks — that are not part of the coin grant.
 *
 * Also excludes anonymised likes (`user_id IS NULL`): once a liker's account
 * is physically purged the FK sets their likes' `user_id` to NULL, and such a
 * like has no liker to seed an idempotency key or to self-like-check against —
 * it must not mint a fresh coin grant. (In practice these are far outside any
 * live scan window, since the watermark passed their `created_at` long before
 * the purge; the filter is the correctness guarantee, not an optimisation.)
 */
export async function loadLikesForBatch(watermark: Date, scanStartedAt: Date): Promise<LikeRow[]> {
  const rows = await db
    .select({
      likerId: likes.userId,
      targetType: likes.targetType,
      targetId: likes.targetId,
    })
    .from(likes)
    .where(
      and(
        gt(likes.createdAt, watermark),
        lte(likes.createdAt, scanStartedAt),
        inArray(likes.targetType, LIKE_GRANT_TARGET_TYPES as readonly string[]),
        isNotNull(likes.userId)
      )
    );
  // `isNotNull` guarantees `likerId` is non-null; reflect that in the type.
  return rows as LikeRow[];
}

/**
 * Resolve the liked content rows and the fork parents the
 * intent-builder needs. Issues two parallel queries (positions +
 * topic_posts) and a follow-up fork-parent lookup. Returns three
 * `Map`s keyed by id — the shape `buildGrantIntents` expects.
 *
 * @design Fork lookup is one level only
 * Position-on-position likes pay both the direct owner and the
 * fork parent's owner — see `buildGrantIntents` for the rule.
 * Multi-level lineage is out of scope (matches what the position
 * detail page surfaces).
 */
export async function resolveGrantTargets(likeRows: LikeRow[]): Promise<{
  positionById: Map<string, PositionRow>;
  topicPostById: Map<string, ContentRow>;
  forkParentById: Map<string, ContentRow>;
}> {
  const positionIds = [
    ...new Set(likeRows.filter((l) => l.targetType === 'position').map((l) => l.targetId)),
  ];
  const topicPostIds = [
    ...new Set(likeRows.filter((l) => l.targetType === 'topic_post').map((l) => l.targetId)),
  ];

  const [positionRows, topicPostRows] = await Promise.all([
    positionIds.length
      ? db
          .select({
            id: positions.id,
            ownerId: positions.userId,
            forkedFromId: positions.forkedFromId,
            deletedAt: positions.deletedAt,
          })
          .from(positions)
          .where(inArray(positions.id, positionIds))
      : [],
    topicPostIds.length
      ? db
          .select({
            id: topicPosts.id,
            ownerId: topicPosts.userId,
            deletedAt: topicPosts.deletedAt,
          })
          .from(topicPosts)
          .where(inArray(topicPosts.id, topicPostIds))
      : [],
  ]);

  const positionById = new Map<string, PositionRow>(
    positionRows.map((r) => [
      r.id,
      { ownerId: r.ownerId, forkedFromId: r.forkedFromId, deletedAt: r.deletedAt },
    ])
  );
  const topicPostById = new Map<string, ContentRow>(
    topicPostRows.map((r) => [r.id, { ownerId: r.ownerId, deletedAt: r.deletedAt }])
  );

  const forkParentIds = [
    ...new Set(
      positionRows
        .filter((r) => r.deletedAt === null && r.forkedFromId !== null)
        .map((r) => r.forkedFromId as string)
    ),
  ];
  const forkParentRows = forkParentIds.length
    ? await db
        .select({
          id: positions.id,
          ownerId: positions.userId,
          deletedAt: positions.deletedAt,
        })
        .from(positions)
        .where(inArray(positions.id, forkParentIds))
    : [];
  const forkParentById = new Map<string, ContentRow>(
    forkParentRows.map((r) => [r.id, { ownerId: r.ownerId, deletedAt: r.deletedAt }])
  );

  return { positionById, topicPostById, forkParentById };
}

/**
 * Drop intents whose recipient profile has been withdrawn or
 * soft-deleted. Without this filter the per-recipient transaction
 * would still emit a `point_events` row pointed at a dead profile;
 * the row would never be consumed but it would still occupy space
 * and confuse the ledger. Done after intent building (rather than
 * before) so the intent shape stays purely structural and this
 * filter is a separate, explicit concern.
 */
export async function filterLiveIntents(intents: GrantIntent[]): Promise<GrantIntent[]> {
  const recipientIds = [...new Set(intents.map((i) => i.recipientId))];
  if (recipientIds.length === 0) return [];

  const activeRows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(inArray(profiles.id, recipientIds), isNull(profiles.deletedAt)));
  const activeRecipients = new Set(activeRows.map((r) => r.id));
  return intents.filter((i) => activeRecipients.has(i.recipientId));
}

/**
 * Group intents by recipient — one transaction (coins + notification)
 * runs per group. Returns a Map for stable iteration order and `.size`
 * access in the orchestrator's run-summary fields.
 */
export function groupIntentsByRecipient(intents: GrantIntent[]): Map<string, GrantIntent[]> {
  const byRecipient = new Map<string, GrantIntent[]>();
  for (const intent of intents) {
    const list = byRecipient.get(intent.recipientId) ?? [];
    list.push(intent);
    byRecipient.set(intent.recipientId, list);
  }
  return byRecipient;
}
