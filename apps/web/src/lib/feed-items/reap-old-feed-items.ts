import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import 'server-only';

import { db, feedItems, likes } from '@/lib/db';
import { startRetentionRun } from '@/lib/retention-run';

import {
  MEMBER_JOINED_ENTITY_TYPE,
  MEMBER_JOINED_LIKE_TARGET,
  MEMBER_JOINED_RETENTION_DAYS,
} from './member-joined';

/**
 * Reaper for `feed_items` rows the product promises are temporary.
 *
 * @description
 * Two entity types carry a retention promise. The product tour tells users
 * that leaderboard rank-change entries (`challenge_rank_update`) are kept
 * for one month, and the onboarding step that posts an arrival announcement
 * (`member_joined`) says the same. Each has a reaper here that deletes its
 * rows once `created_at < NOW() - retention`; both run the same batched
 * loop (`reapFeedItemsOfType`) with their own entity-type guard.
 *
 * @design Why Vercel Cron (not pg_cron)
 *
 * All other periodic jobs in this codebase are Vercel Cron Jobs (see
 * `vercel.json`) and share the auth + error funnel at `@/lib/cron`.
 * Adopting pg_cron just for this job would split observability between
 * Vercel and Supabase, mix schedule lifecycle into Drizzle migrations,
 * and require a separate testing approach. The trade-off (a per-request
 * timeout) is absorbed by batching with a wall-clock budget below.
 *
 * @design Strict entity_type guard
 *
 * `topic_post` feed items are NOT eligible for reaping — they reference
 * user-generated posts whose retention is governed by the post itself,
 * not by the feed surface. The WHERE clause therefore always includes
 * BOTH the reaper's own `entity_type` AND the createdAt cutoff; the unit
 * tests assert that mis-typed rows are not removed.
 *
 * @design Batched DELETE with wall-clock budget
 *
 * The initial run after deployment will see a backlog (every rank-change
 * since launch). A single unbounded `DELETE` could exceed Vercel's
 * function timeout, so each tick:
 *   1. Selects up to `BATCH_SIZE` eligible IDs ordered by `created_at`
 *      (oldest first, leveraging `idx_feed_items_created`).
 *   2. DELETEs them by `id` (PK, so the second roundtrip is O(N) on the
 *      btree).
 *   3. Stops when a batch returns fewer rows than `BATCH_SIZE` (drained)
 *      OR when the wall-clock budget is exhausted.
 *
 * `feedItems` is append-only, so there is no race with concurrent
 * UPDATEs; concurrent INSERTs only add rows newer than the cutoff,
 * which are not selected. Two overlapping cron runs would each see a
 * subset of the backlog and both succeed without deadlocks.
 *
 * The function returns a structured report so the route can log
 * progress and so operators can see whether the previous run timed
 * out and a backlog remains.
 *
 * @design Likes go with the rows, in one transaction
 *
 * Arrival announcements take likes, and `likes` has no FK to cascade
 * through (it is polymorphic — see its TSDoc). Each batch therefore deletes
 * the likes that targeted the reaped ids, in the same transaction as the
 * rows: were the two statements separate, a failure between them would
 * leave likes pointing at ids no row has, and nothing would ever find them
 * again. The owner's own delete (`deleteOwnJoinAnnouncement`) makes the same
 * guarantee.
 */

/**
 * Feed items older than this are eligible for reaping. 30 days matches
 * the product tour copy ("kept for one month").
 */
export const RANK_UPDATE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Entity type this reaper targets. Other entity types are never deleted. */
export const RANK_UPDATE_ENTITY_TYPE = 'challenge_rank_update';

/**
 * Number of rows deleted per round-trip. Chosen to balance per-batch
 * overhead against keeping each transaction short enough not to hold
 * locks. Postgres handles 5k-row DELETEs comfortably on an indexed PK.
 */
const BATCH_SIZE = 5000;

/**
 * Wall-clock budget. Leaves headroom under both Vercel Hobby (60s) and
 * Pro (300s) function timeouts so the response can be returned cleanly
 * even when the reaper bails early.
 */
const DEFAULT_BUDGET_MS = 45_000;

export type FeedItemReaperReport = {
  removed: number;
  batches: number;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
};

type ReaperOptions = {
  now?: Date;
  budgetMs?: number;
  batchSize?: number;
};

export function reapOldRankUpdateFeedItems(
  opts: ReaperOptions = {}
): Promise<FeedItemReaperReport> {
  return reapFeedItemsOfType(
    { entityType: RANK_UPDATE_ENTITY_TYPE, retentionMs: RANK_UPDATE_RETENTION_MS },
    opts
  );
}

/** Retention window for arrival announcements, in ms. */
export const MEMBER_JOINED_RETENTION_MS = MEMBER_JOINED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Reaper for arrival announcements older than {@link MEMBER_JOINED_RETENTION_MS}. */
export function reapOldMemberJoinedFeedItems(
  opts: ReaperOptions = {}
): Promise<FeedItemReaperReport> {
  return reapFeedItemsOfType(
    {
      entityType: MEMBER_JOINED_ENTITY_TYPE,
      retentionMs: MEMBER_JOINED_RETENTION_MS,
      likeTargetType: MEMBER_JOINED_LIKE_TARGET,
    },
    opts
  );
}

async function reapFeedItemsOfType(
  target: {
    entityType: string;
    retentionMs: number;
    /** `likes.target_type` whose rows point at the reaped feed ids, if the type is likeable. */
    likeTargetType?: string;
  },
  opts: ReaperOptions
): Promise<FeedItemReaperReport> {
  const batchSize = opts.batchSize ?? BATCH_SIZE;
  const run = startRetentionRun({
    now: opts.now,
    retentionMs: target.retentionMs,
    budgetMs: opts.budgetMs ?? DEFAULT_BUDGET_MS,
  });

  let removed = 0;
  let batches = 0;
  let timedOut = false;

  while (true) {
    if (run.isOverBudget()) {
      timedOut = true;
      break;
    }

    const targets = await db
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(and(eq(feedItems.entityType, target.entityType), lt(feedItems.createdAt, run.cutoff)))
      .orderBy(asc(feedItems.createdAt))
      .limit(batchSize);

    if (targets.length === 0) break;

    const ids = targets.map((t) => t.id);
    await db.transaction(async (tx) => {
      await tx.delete(feedItems).where(inArray(feedItems.id, ids));
      if (target.likeTargetType) {
        await tx
          .delete(likes)
          .where(and(eq(likes.targetType, target.likeTargetType), inArray(likes.targetId, ids)));
      }
    });

    removed += targets.length;
    batches += 1;

    if (targets.length < batchSize) break;
  }

  return {
    removed,
    batches,
    timedOut,
    ...run.stamps(),
  };
}
