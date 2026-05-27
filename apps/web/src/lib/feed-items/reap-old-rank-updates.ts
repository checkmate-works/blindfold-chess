import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import 'server-only';

import { db, feedItems } from '@/lib/db';

/**
 * Reaper for old `feed_items` rows of type `challenge_rank_update`.
 *
 * @description
 * The product tour tells users that leaderboard rank-change feed entries
 * are kept for one month. This reaper enforces that contract by deleting
 * `feed_items` rows where `entity_type = 'challenge_rank_update'` and
 * `created_at < NOW() - INTERVAL '30 days'`.
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
 * BOTH `entity_type = 'challenge_rank_update'` AND the createdAt cutoff;
 * the unit tests assert that mis-typed rows are not removed.
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

export type RankUpdateReaperReport = {
  removed: number;
  batches: number;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
};

export async function reapOldRankUpdateFeedItems(
  opts: {
    now?: Date;
    budgetMs?: number;
    batchSize?: number;
  } = {}
): Promise<RankUpdateReaperReport> {
  const now = opts.now ?? new Date();
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const batchSize = opts.batchSize ?? BATCH_SIZE;

  const startedAt = new Date(now);
  const cutoff = new Date(now.getTime() - RANK_UPDATE_RETENTION_MS);
  const deadline = Date.now() + budgetMs;

  let removed = 0;
  let batches = 0;
  let timedOut = false;

  while (true) {
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }

    const targets = await db
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(
        and(eq(feedItems.entityType, RANK_UPDATE_ENTITY_TYPE), lt(feedItems.createdAt, cutoff))
      )
      .orderBy(asc(feedItems.createdAt))
      .limit(batchSize);

    if (targets.length === 0) break;

    await db.delete(feedItems).where(
      inArray(
        feedItems.id,
        targets.map((t) => t.id)
      )
    );

    removed += targets.length;
    batches += 1;

    if (targets.length < batchSize) break;
  }

  const finishedAt = new Date();
  return {
    removed,
    batches,
    timedOut,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  };
}
