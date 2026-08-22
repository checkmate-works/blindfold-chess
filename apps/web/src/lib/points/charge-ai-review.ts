import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import type { PointCategory } from './constants';
import { AI_REVIEW_POINT_COST, AI_REVIEW_REFUND_SOURCE, AI_REVIEW_SOURCE } from './constants';
import { debitSpendable, recordPointMovement } from './internal-ledger';

export type ChargeAiReviewResult = { ok: true } | { ok: false; error: 'insufficient_balance' };

/**
 * Debit `AI_REVIEW_POINT_COST` for one review job.
 *
 * MUST run inside the transaction that inserts the job row, so "charged but
 * never queued" (or the reverse) is unrepresentable: the two commit together
 * or not at all. The job id is server-minted per accepted request, so the
 * `ai_review:<jobId>` key exists for the ledger's own consistency (and for the
 * refund to find), not to absorb client retries — those are stopped upstream
 * by the live-job unique index before this is reached.
 *
 * Cost is 1, so exactly one bucket is debited and the key needs no category
 * suffix (the `() =>` builder ignores its argument) — same reasoning as
 * `consumeMaiaGamePoint`.
 */
export async function chargeAiReview(
  tx: DbTx,
  userId: string,
  jobId: string
): Promise<ChargeAiReviewResult> {
  const debit = await debitSpendable(tx, {
    userId,
    amount: AI_REVIEW_POINT_COST,
    source: AI_REVIEW_SOURCE,
    sourceId: jobId,
    metadata: { reason: 'ai_review' },
    idempotencyKey: () => `${AI_REVIEW_SOURCE}:${jobId}`,
    idempotent: true,
  });
  return debit.ok ? { ok: true } : debit;
}

/**
 * Return whatever `chargeAiReview` took for `jobId`: one credit per debited
 * bucket, back into the same bucket, keyed `ai_review_refund:<jobId>:<category>`.
 *
 * Reads the debit rows rather than assuming the cost, so a price change
 * between charge and refund still returns what was actually paid. A
 * subscriber's job has no debit rows and refunds nothing; a repeated call
 * (the sweeper failing a job twice) finds its keys taken and writes nothing.
 *
 * @returns coins returned by THIS call — 0 on a replay or for an uncharged job.
 */
export async function refundAiReviewCharge(jobId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const debits = await tx
      .select({
        userId: pointEvents.userId,
        delta: pointEvents.delta,
        category: pointEvents.category,
      })
      .from(pointEvents)
      .where(and(eq(pointEvents.source, AI_REVIEW_SOURCE), eq(pointEvents.sourceId, jobId)));

    let refunded = 0;
    for (const debit of debits) {
      const result = await recordPointMovement(
        tx,
        {
          userId: debit.userId,
          delta: -debit.delta,
          category: debit.category as PointCategory,
          source: AI_REVIEW_REFUND_SOURCE,
          sourceId: jobId,
          idempotencyKey: `${AI_REVIEW_REFUND_SOURCE}:${jobId}:${debit.category}`,
          metadata: { reason: 'ai_review_failed' },
        },
        { idempotent: true }
      );
      if (result !== null) refunded += -debit.delta;
    }
    return refunded;
  });
}
