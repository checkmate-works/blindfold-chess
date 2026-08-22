import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import 'server-only';

import { db, gameAiReviewJobs } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { getGameById } from '@/lib/db/games-read';
import type { GameAiReviewJobRecord, GameRecord } from '@/lib/db/schema';
import type { PositionEvaluation } from '@/lib/games/analysis/types';
import { createNotification } from '@/lib/notifications/notification';
import { detectGameOpening } from '@/lib/openings/detect-game-opening';
import { chargeAiReview, refundAiReviewCharge } from '@/lib/points';
import { captureError } from '@/lib/sentry/capture-error';
import { uuidv7 } from '@/lib/uuidv7';

import { generateReview } from './generate-review';
import { createOpenAiClient } from './openai';
import { dbAiReviewStore, getAiReview } from './queries';
import type { AiReviewError, AiReviewJobStatusResponse, PendingAiReviewJob } from './types';

/**
 * The asynchronous half of AI review generation: accept → work → notify.
 *
 * `requestAiReviewAction` validates, charges and enqueues (`enqueueAiReviewJob`),
 * then hands the job id to `after()` so {@link processAiReviewJob} runs once
 * the response is out. The author sees "accepted" immediately and learns the
 * outcome from an in-app notification (and from the page's own polling while
 * they stay on it). Nothing here is on a request's critical path.
 *
 * @design `after()` first, cron second
 * `after()` keeps the function alive for the route's `maxDuration`, which is
 * ample for one LLM call and costs no extra infrastructure — but it is not a
 * durable queue: a deploy, a timeout or a crash can kill the callback with the
 * job left `pending` or `processing`. The every-few-minutes sweeper
 * ({@link sweepAiReviewJobs}, `/api/cron/ai-review-jobs`) is the durability:
 * it re-runs anything stuck past the thresholds below and, past
 * {@link AI_REVIEW_JOB_MAX_ATTEMPTS}, gives up and refunds. Every transition
 * here is therefore written to be safe to repeat: the claim is a conditional
 * UPDATE, the store's save tolerates a duplicate, the refund is idempotent.
 *
 * @design Failure always refunds, and says so without a number
 * A coin-paid job that ends `failed` is refunded BEFORE the row is marked, so
 * a crash between the two leaves the sweeper a job it will fail (and
 * refund, as a no-op) again rather than a refund that never happens. The
 * failure notification states the refund unconditionally instead of quoting
 * the amount — a replayed failure refunds 0, and quoting that would tell the
 * author their coin was kept.
 */

/** Worker claims before the sweeper refunds instead of retrying. */
export const AI_REVIEW_JOB_MAX_ATTEMPTS = 2;

/**
 * A `processing` job untouched this long was killed mid-call (timeout,
 * deploy). Comfortably past the route's `maxDuration`, so a live worker is
 * never mistaken for a dead one.
 */
export const AI_REVIEW_JOB_STALE_PROCESSING_MS = 10 * 60 * 1000;

/** A `pending` job this old lost its `after()` kick and waits for the sweeper. */
export const AI_REVIEW_JOB_STALE_PENDING_MS = 2 * 60 * 1000;

/** Jobs one sweep will touch — each is up to one LLM call, run serially. */
const SWEEP_BATCH_SIZE = 5;

const LIVE_STATUSES = ['pending', 'processing'] as const;

function toPendingJob(row: Pick<GameAiReviewJobRecord, 'id' | 'locale'>): PendingAiReviewJob {
  return { id: row.id, locale: row.locale };
}

/**
 * The game's in-flight job in ANY language, or null. One review per game is
 * what the page shows (see `getAiReviewForViewer`'s fallback), so a job for
 * another locale is still "this game's review is being written" — both to
 * the page, which shows the accepted state, and to the action, which must not
 * charge a second coin for it.
 */
export async function findLiveAiReviewJob(gameId: string): Promise<PendingAiReviewJob | null> {
  const [row] = await db
    .select({ id: gameAiReviewJobs.id, locale: gameAiReviewJobs.locale })
    .from(gameAiReviewJobs)
    .where(
      and(eq(gameAiReviewJobs.gameId, gameId), inArray(gameAiReviewJobs.status, LIVE_STATUSES))
    )
    .limit(1);
  return row ? toPendingJob(row) : null;
}

export type EnqueueAiReviewJobResult =
  | { ok: true; job: PendingAiReviewJob; alreadyQueued: boolean }
  | { ok: false; error: 'insufficient_balance' };

/** Thrown inside the accept transaction to roll the job insert back. */
class InsufficientBalanceError extends Error {}

/**
 * Accept a generation request: insert the job and, for a coin payer, debit the
 * coin — in one transaction. The insert goes first so the live-job unique
 * index rejects a duplicate before any coin moves; a duplicate resolves to
 * the job already in flight (`alreadyQueued`), never to an error the author
 * would read as "try again".
 */
export async function enqueueAiReviewJob(input: {
  game: GameRecord;
  locale: string;
  userId: string;
  evaluations: PositionEvaluation[];
  /** True for a coin payer; false for a subscriber. */
  charge: boolean;
}): Promise<EnqueueAiReviewJobResult> {
  const jobId = uuidv7();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(gameAiReviewJobs).values({
        id: jobId,
        gameId: input.game.id,
        locale: input.locale,
        requestedById: input.userId,
        evaluations: input.evaluations,
      });
      if (input.charge) {
        const charged = await chargeAiReview(tx, input.userId, jobId);
        if (!charged.ok) throw new InsufficientBalanceError();
      }
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { ok: false, error: 'insufficient_balance' };
    }
    if (isUniqueViolation(error)) {
      const live = await findLiveAiReviewJob(input.game.id);
      if (live) return { ok: true, job: live, alreadyQueued: true };
    }
    throw error;
  }
  return { ok: true, job: { id: jobId, locale: input.locale }, alreadyQueued: false };
}

/**
 * Run one job end to end. Claims it with a conditional UPDATE (so two workers
 * — `after()` and the sweeper — can never both run it), generates, and ends it
 * `done` with a notification or `failed` with a refund. A thrown error leaves
 * the row `processing` for the sweeper to judge.
 */
export async function processAiReviewJob(jobId: string): Promise<void> {
  const [job] = await db
    .update(gameAiReviewJobs)
    .set({ status: 'processing', attempts: sql`${gameAiReviewJobs.attempts} + 1` })
    .where(and(eq(gameAiReviewJobs.id, jobId), eq(gameAiReviewJobs.status, 'pending')))
    .returning();
  if (!job) return;

  try {
    const outcome = await runJob(job);
    if (outcome.ok) {
      await db
        .update(gameAiReviewJobs)
        .set({ status: 'done' })
        .where(eq(gameAiReviewJobs.id, job.id));
      createNotification({
        userId: job.requestedById,
        type: 'ai_review_ready',
        targetType: 'game',
        targetId: job.gameId,
        metadata: { locale: job.locale },
      });
    } else {
      await failAiReviewJob(job, outcome.error);
    }
  } catch (error) {
    captureError(error, `[processAiReviewJob] job ${job.id} threw`);
  }
}

async function runJob(
  job: GameAiReviewJobRecord
): Promise<{ ok: true } | { ok: false; error: AiReviewError }> {
  // Re-read rather than trust the accept-time record: the author may have
  // unpublished or deleted the game in the meantime, and a review must not be
  // written for a game nobody can see.
  const detail = await getGameById(job.gameId);
  if (!detail) return { ok: false, error: 'not_found' };
  const { game } = detail;

  const opening = await detectGameOpening({ moves: game.moves, startingFen: game.startingFen });
  const result = await generateReview({
    game,
    locale: job.locale,
    userId: job.requestedById,
    evaluations: job.evaluations,
    openingName: opening?.name ?? null,
    llm: createOpenAiClient(),
    store: dbAiReviewStore,
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Refund, then mark, then tell — see the module TSDoc for the order. */
async function failAiReviewJob(job: GameAiReviewJobRecord, error: AiReviewError): Promise<void> {
  const refunded = await refundAiReviewCharge(job.id);
  await db
    .update(gameAiReviewJobs)
    .set({ status: 'failed', error })
    .where(eq(gameAiReviewJobs.id, job.id));
  createNotification({
    userId: job.requestedById,
    type: 'ai_review_failed',
    targetType: 'game',
    targetId: job.gameId,
    metadata: { locale: job.locale, error, refunded },
  });
}

export type SweepAiReviewJobsResult = {
  /** Stale jobs handed back to the worker. */
  retried: number;
  /** Stale jobs past the attempt limit — failed and refunded. */
  failed: number;
};

/**
 * The cron half: find jobs stuck past their threshold and either re-run them
 * or give up on them. See the module TSDoc for why this exists beside `after()`.
 *
 * @param now injectable for tests; the thresholds are measured against it.
 */
export async function sweepAiReviewJobs(now: Date = new Date()): Promise<SweepAiReviewJobsResult> {
  const stale = await db
    .select()
    .from(gameAiReviewJobs)
    .where(
      or(
        and(
          eq(gameAiReviewJobs.status, 'pending'),
          lt(gameAiReviewJobs.updatedAt, new Date(now.getTime() - AI_REVIEW_JOB_STALE_PENDING_MS))
        ),
        and(
          eq(gameAiReviewJobs.status, 'processing'),
          lt(
            gameAiReviewJobs.updatedAt,
            new Date(now.getTime() - AI_REVIEW_JOB_STALE_PROCESSING_MS)
          )
        )
      )
    )
    .orderBy(gameAiReviewJobs.updatedAt)
    .limit(SWEEP_BATCH_SIZE);

  let retried = 0;
  let failed = 0;
  for (const job of stale) {
    if (job.attempts >= AI_REVIEW_JOB_MAX_ATTEMPTS) {
      await failAiReviewJob(job, 'llm_error');
      failed += 1;
      continue;
    }
    // A dead worker's claim is released so the conditional claim in
    // processAiReviewJob can take the job again.
    if (job.status === 'processing') {
      await db
        .update(gameAiReviewJobs)
        .set({ status: 'pending' })
        .where(and(eq(gameAiReviewJobs.id, job.id), eq(gameAiReviewJobs.status, 'processing')));
    }
    await processAiReviewJob(job.id);
    retried += 1;
  }
  return { retried, failed };
}

/**
 * One poll from the requester. Scoped to `userId` so a job id is not a handle
 * on someone else's generation; a `done` job answers with the stored review.
 */
export async function getAiReviewJobStatus(
  jobId: string,
  userId: string
): Promise<AiReviewJobStatusResponse> {
  const [job] = await db
    .select()
    .from(gameAiReviewJobs)
    .where(and(eq(gameAiReviewJobs.id, jobId), eq(gameAiReviewJobs.requestedById, userId)))
    .limit(1);
  if (!job) return { status: 'not_found' };

  switch (job.status) {
    case 'done': {
      const review = await getAiReview(job.gameId, job.locale);
      // `done` without a row can only mean the review was removed since; the
      // page's next server render shows whatever is true, so report pending
      // rather than invent a failure.
      return review ? { status: 'done', review } : { status: 'pending' };
    }
    case 'failed':
      return { status: 'failed', error: (job.error as AiReviewError | null) ?? 'llm_error' };
    default:
      return { status: 'pending' };
  }
}
