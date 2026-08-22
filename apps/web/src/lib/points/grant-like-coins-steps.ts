import { and, gt, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import 'server-only';

import { chunks, db, games, likes, positions, profiles, repertoires, topicPosts } from '@/lib/db';

import { LIKE_GRANT_TARGET_TYPES } from './constants';
import type { LikeGrantTargetType } from './constants';
import type { ContentRow, GrantIntent, LikeRow, PositionRow } from './grant-like-coins-intents';
import { contentKey } from './grant-like-coins-intents';

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
 * (`LIKE_GRANT_TARGET_TYPES`); excludes likes on entities — articles, game
 * comments — that are not part of the coin grant.
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
 * intent-builder needs. Issues one query per target table in parallel,
 * then a follow-up fork-parent lookup. Returns the content rows in a
 * single map keyed by `(targetType, targetId)` — the shape
 * `buildGrantIntents` expects — so a new likeable kind is one more entry
 * in `CONTENT_LOADERS`, with the intent rules untouched.
 *
 * Every loader reads the same two facts: who owns the row (null once the
 * author's account is purged — no payee) and whether it is soft-deleted.
 * Visibility is deliberately NOT consulted: a like could only have been
 * placed on content its liker could see, and a course later moved to
 * `private` still earned that like.
 *
 * @design Fork lookup is one level only
 * Position-on-position likes pay both the direct owner and the
 * fork parent's owner — see `buildGrantIntents` for the rule.
 * Multi-level lineage is out of scope (matches what the position
 * detail page surfaces).
 */
export async function resolveGrantTargets(likeRows: LikeRow[]): Promise<{
  contentByKey: Map<string, ContentRow | PositionRow>;
  forkParentById: Map<string, ContentRow>;
}> {
  const idsByType = new Map<LikeGrantTargetType, Set<string>>();
  for (const like of likeRows) {
    if (!isGrantTargetType(like.targetType)) continue;
    const ids = idsByType.get(like.targetType) ?? new Set<string>();
    ids.add(like.targetId);
    idsByType.set(like.targetType, ids);
  }

  const loaded = await Promise.all(
    LIKE_GRANT_TARGET_TYPES.map(async (type) => {
      const ids = [...(idsByType.get(type) ?? [])];
      const rows = ids.length ? await CONTENT_LOADERS[type](ids) : [];
      return rows.map((row) => [contentKey(type, row.id), row] as const);
    })
  );
  const contentByKey = new Map<string, ContentRow | PositionRow>(loaded.flat());

  const forkParentIds = [
    ...new Set(
      [...contentByKey.values()]
        .filter((r): r is PositionRow => 'forkedFromId' in r)
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

  return { contentByKey, forkParentById };
}

function isGrantTargetType(value: string): value is LikeGrantTargetType {
  return (LIKE_GRANT_TARGET_TYPES as readonly string[]).includes(value);
}

type LoadedContent = (ContentRow | PositionRow) & { id: string };

/**
 * One owner/soft-delete lookup per likeable table. `satisfies` closes the
 * set against `LIKE_GRANT_TARGET_TYPES`: adding a type there without a
 * loader here is a compile error, not a silently unpaid like.
 */
const CONTENT_LOADERS = {
  position: (ids) =>
    db
      .select({
        id: positions.id,
        ownerId: positions.userId,
        forkedFromId: positions.forkedFromId,
        deletedAt: positions.deletedAt,
      })
      .from(positions)
      .where(inArray(positions.id, ids)),
  topic_post: (ids) =>
    db
      .select({ id: topicPosts.id, ownerId: topicPosts.userId, deletedAt: topicPosts.deletedAt })
      .from(topicPosts)
      .where(inArray(topicPosts.id, ids)),
  game: (ids) =>
    db
      .select({ id: games.id, ownerId: games.authorId, deletedAt: games.deletedAt })
      .from(games)
      .where(inArray(games.id, ids)),
  chunk: (ids) =>
    db
      .select({ id: chunks.id, ownerId: chunks.userId, deletedAt: chunks.deletedAt })
      .from(chunks)
      .where(inArray(chunks.id, ids)),
  repertoire: (ids) =>
    db
      .select({ id: repertoires.id, ownerId: repertoires.userId, deletedAt: repertoires.deletedAt })
      .from(repertoires)
      .where(inArray(repertoires.id, ids)),
} as const satisfies Record<LikeGrantTargetType, (ids: string[]) => Promise<LoadedContent[]>>;

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
