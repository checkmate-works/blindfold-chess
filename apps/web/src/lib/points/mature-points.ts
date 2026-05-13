import { subDays } from 'date-fns';
import { and, eq, gt, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import {
  POINT_SOURCES,
  POST_MATURATION_DAYS,
  type PointPostEntityType,
  buildIdempotencyKey,
} from './constants';
import { upsertBalance } from './internal-balance';

const SOURCE_TO_ENTITY_TYPE: Record<string, PointPostEntityType> = {
  puzzle_created: 'puzzle',
  position_memory_created: 'position_memory',
  topic_post_created: 'topic_post',
};

export type MaturationReport = {
  /** Candidate rows considered in this run (before dedup / age check). */
  candidates: number;
  /** Distinct `(user, source, source_id)` triples whose pending balance moved into `earned`. */
  matured: number;
  /** Triples that were considered but produced no change (already matured, clawed back, or no longer pending). */
  skipped: number;
};

/**
 * Convert `earned_pending` rows into spendable `earned` for any UGC grant
 * whose first grant row is at least `POST_MATURATION_DAYS` days old. Runs
 * out of band from the per-request flow (Vercel Cron daily) so the read
 * path never has to do maturation work itself.
 *
 * @design Per-row clawback safety
 *
 * Reads the current pending sum for each `(user, source, source_id)` triple
 * inside the per-row transaction, so a clawback that landed between the
 * candidate scan and the write phase is observed; the function then writes
 * zero (effectively skipping) instead of double-spending.
 *
 * @design Idempotency
 *
 * Each maturation writes two ledger rows keyed by
 * `post_mature_pending:<type>:<id>` and `post_mature_earned:<type>:<id>`.
 * The UNIQUE constraint on `point_events.idempotency_key` makes re-runs
 * safe — a retried call sees `onConflictDoNothing` swallow the insert and
 * bails out before the second insert / balance update.
 *
 * @param batchSize - Soft cap on candidates fetched per invocation. Daily
 *   cron with 500 should cover normal traffic; raise if backlog builds.
 */
export async function maturePendingPoints(
  batchSize: number = 500,
  now: Date = new Date()
): Promise<MaturationReport> {
  const cutoff = subDays(now, POST_MATURATION_DAYS);

  const candidates = await db
    .select({
      userId: pointEvents.userId,
      source: pointEvents.source,
      sourceId: pointEvents.sourceId,
    })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.category, 'earned_pending'),
        gt(pointEvents.delta, 0),
        inArray(pointEvents.source, POINT_SOURCES as readonly string[]),
        isNotNull(pointEvents.sourceId),
        lte(pointEvents.createdAt, cutoff)
      )
    )
    .limit(batchSize);

  let matured = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const cand of candidates) {
    if (!cand.sourceId) {
      skipped++;
      continue;
    }
    const key = `${cand.userId}:${cand.source}:${cand.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const entityType = SOURCE_TO_ENTITY_TYPE[cand.source];
    if (!entityType) {
      skipped++;
      continue;
    }

    const moved = await db.transaction(async (tx) => {
      // Recompute pending net under the row's serialization. A clawback
      // landing between the scan and this read is reflected here.
      const [agg] = await tx
        .select({
          net: sql<number>`COALESCE(SUM(${pointEvents.delta}), 0)::int`,
        })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.userId, cand.userId),
            eq(pointEvents.source, cand.source),
            eq(pointEvents.sourceId, cand.sourceId!),
            eq(pointEvents.category, 'earned_pending')
          )
        );

      const pendingNet = agg?.net ?? 0;
      if (pendingNet <= 0) return false;

      const entity = { type: entityType, id: cand.sourceId! };
      const pendingKey = buildIdempotencyKey('post_mature_pending', entity);
      const earnedKey = buildIdempotencyKey('post_mature_earned', entity);

      const insertedPending = await tx
        .insert(pointEvents)
        .values({
          userId: cand.userId,
          delta: -pendingNet,
          category: 'earned_pending',
          source: cand.source,
          sourceId: cand.sourceId,
          idempotencyKey: pendingKey,
          metadata: { reason: 'maturation' },
        })
        .onConflictDoNothing({ target: pointEvents.idempotencyKey })
        .returning({ id: pointEvents.id });

      if (insertedPending.length === 0) {
        // Already matured by a prior run.
        return false;
      }

      await tx.insert(pointEvents).values({
        userId: cand.userId,
        delta: pendingNet,
        category: 'earned',
        source: cand.source,
        sourceId: cand.sourceId,
        idempotencyKey: earnedKey,
        metadata: { reason: 'maturation' },
      });

      await upsertBalance(tx, cand.userId, 'earned_pending', -pendingNet);
      await upsertBalance(tx, cand.userId, 'earned', pendingNet);

      return true;
    });

    if (moved) matured++;
    else skipped++;
  }

  return { candidates: candidates.length, matured, skipped };
}
