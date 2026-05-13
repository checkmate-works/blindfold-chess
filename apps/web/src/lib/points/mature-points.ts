import { subDays } from 'date-fns';
import { and, eq, gt, inArray, isNotNull, lte } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import {
  POINT_SOURCES,
  POST_MATURATION_DAYS,
  type PointSource,
  buildIdempotencyKey,
  entityTypeForSource,
} from './constants';
import { readPendingTotalForEntity, recordPointMovement } from './internal-ledger';

export type MaturationReport = {
  /** Candidate rows considered in this run (before dedup / age check). */
  candidates: number;
  /** Distinct `(user, source, source_id)` triples whose pending balance moved into `earned`. */
  matured: number;
  /** Triples that were considered but produced no change (already matured, clawed back, or no longer pending). */
  skipped: number;
};

function isPointSource(s: string): s is PointSource {
  return (POINT_SOURCES as readonly string[]).includes(s);
}

/**
 * Promote one `(user, source, sourceId)` triple's pending balance into
 * `earned`. Runs inside its own transaction so a single bad row in a
 * batch run cannot poison the others.
 *
 * Returns `true` when the maturation row was actually written, `false`
 * when nothing changed — either because the pending net is already zero
 * (post was clawed back between the scan and the write), or because a
 * prior run already wrote the maturation row.
 */
async function matureOnePending(
  userId: string,
  source: PointSource,
  sourceId: string
): Promise<boolean> {
  const entity = { type: entityTypeForSource(source), id: sourceId };

  return db.transaction(async (tx) => {
    // Recompute pending net under transactional read — a clawback landing
    // between the candidate scan and here is observed and the write phase
    // is skipped.
    const pendingNet = await readPendingTotalForEntity(tx, userId, source, sourceId);
    if (pendingNet <= 0) return false;

    // First leg: zero out the pending bucket. Idempotent — if a prior run
    // already wrote this row the conflict swallows the insert and we bail
    // out before the second leg / balance updates run.
    const pendingResult = await recordPointMovement(
      tx,
      {
        userId,
        delta: -pendingNet,
        category: 'earned_pending',
        source,
        sourceId,
        idempotencyKey: buildIdempotencyKey('post_mature_pending', entity),
        metadata: { reason: 'maturation' },
      },
      { idempotent: true }
    );
    if (!pendingResult) return false;

    // Second leg: credit the same amount to `earned`. Non-idempotent because
    // the pair commits in one TX — if the first row went in, the second
    // must also be fresh.
    await recordPointMovement(tx, {
      userId,
      delta: pendingNet,
      category: 'earned',
      source,
      sourceId,
      idempotencyKey: buildIdempotencyKey('post_mature_earned', entity),
      metadata: { reason: 'maturation' },
    });

    return true;
  });
}

/**
 * Convert `earned_pending` rows into spendable `earned` for any UGC grant
 * whose first grant row is at least `POST_MATURATION_DAYS` days old. Runs
 * out of band from the per-request flow (Vercel Cron daily) so the read
 * path never has to do maturation work itself.
 *
 * @design Per-row clawback safety
 *
 * `matureOnePending` recomputes the pending sum under the row's own
 * transaction, so a clawback that landed between the scan and the write
 * is observed and the write phase becomes a no-op.
 *
 * @design Idempotency
 *
 * Each maturation writes two ledger rows keyed by
 * `post_mature_pending:<type>:<id>` and `post_mature_earned:<type>:<id>`.
 * The UNIQUE constraint on `point_events.idempotency_key` makes re-runs
 * safe — a retried call sees `onConflictDoNothing` swallow the first
 * insert and bails out before the second insert / balance update.
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
    if (!cand.sourceId || !isPointSource(cand.source)) {
      skipped++;
      continue;
    }
    const dedupKey = `${cand.userId}:${cand.source}:${cand.sourceId}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const moved = await matureOnePending(cand.userId, cand.source, cand.sourceId);
    if (moved) matured++;
    else skipped++;
  }

  return { candidates: candidates.length, matured, skipped };
}
