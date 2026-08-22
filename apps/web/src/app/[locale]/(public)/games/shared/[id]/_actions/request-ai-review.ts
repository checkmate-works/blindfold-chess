'use server';

import { after } from 'next/server';

import { SUPPORTED_LOCALES } from '@/config';
import { z } from 'zod';

import { resolveAiReviewGenerationState } from '@/lib/ai-review/entitlement';
import { enqueueAiReviewJob, findLiveAiReviewJob, processAiReviewJob } from '@/lib/ai-review/jobs';
import { isLlmConfigured } from '@/lib/ai-review/openai';
import { dbAiReviewStore } from '@/lib/ai-review/queries';
// Response and error types live in @/lib/ai-review/types — a "use server"
// file must not re-export types (see the Server Actions convention).
import type { RequestAiReviewResponse } from '@/lib/ai-review/types';
import { authenticateAndCheckBan } from '@/lib/auth';
import { getGameById } from '@/lib/db/games-read';
import { EVAL_SCORE_LIMIT } from '@/lib/games/analysis/types';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/** Shape guard for the client-reported engine sweep (semantics re-derived server-side). */
const evaluationSchema = z.object({
  score: z
    .number()
    .finite()
    .min(-EVAL_SCORE_LIMIT * 2)
    .max(EVAL_SCORE_LIMIT * 2),
  mate: z.number().int().min(-200).max(200).optional(),
  bestMoveUci: z.string().regex(UCI_RE).optional(),
});

const inputSchema = z.object({
  gameId: z.string().regex(UUID_RE),
  locale: z.string().refine((l) => (SUPPORTED_LOCALES as readonly string[]).includes(l)),
  evaluations: z.array(evaluationSchema).max(500),
});

export type RequestAiReviewInput = z.infer<typeof inputSchema>;

/**
 * Request the AI coach review for a shared game: return it when it is already
 * cached, otherwise accept the request — charging the author's coin unless a
 * subscription covers it — and hand the generation to a background job whose
 * result arrives by notification. Restricted to the game's author (see
 * `resolveAiReviewGenerationState`) and rate-limited on top. See
 * `@/lib/ai-review/jobs` for the job lifecycle and `@/lib/ai-review` for the
 * pipeline and the engine/LLM authorship split.
 */
export async function requestAiReviewAction(
  input: RequestAiReviewInput
): Promise<RequestAiReviewResponse> {
  try {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'invalid_input' };
    }
    const { gameId, locale, evaluations } = parsed.data;

    const auth = await authenticateAndCheckBan();
    if ('error' in auth) {
      return { success: false, error: 'not_authenticated' };
    }

    const detail = await getGameById(gameId);
    if (!detail) {
      return { success: false, error: 'not_found' };
    }
    const { game } = detail;

    const access = await resolveAiReviewGenerationState(game, auth.user.id);
    if (access.kind === 'blocked') {
      return { success: false, error: access.reason };
    }
    if (evaluations.length !== game.moves.length + 1) {
      return { success: false, error: 'invalid_input' };
    }

    // Cache check BEFORE the entitlement refusal and the rate limit: fetching
    // an existing review is free, must not consume (or be blocked by) the
    // generation budget, and must not stop working for an author who can no
    // longer pay — the review is already published.
    const cached = await dbAiReviewStore.find(game.id, locale);
    if (cached) {
      return { success: true, status: 'ready', review: cached };
    }

    // Likewise a job already in flight (a double click, a second tab): report
    // it as accepted rather than charging again or refusing.
    const live = await findLiveAiReviewJob(game.id);
    if (live) {
      return { success: true, status: 'queued', job: live };
    }

    // Everything below spends. Only `allowed` (subscription) and `payable`
    // (enough coins) may proceed; the advisory balance check here is
    // re-asserted under a row lock by the charge itself.
    if (access.kind === 'insufficient_balance') {
      return { success: false, error: 'insufficient_balance' };
    }

    // The UI hides the tab when no key is configured, but a stale page (or a
    // direct POST) can still land here. Refuse BEFORE the rate limit so a
    // deployment-side misconfiguration cannot eat the caller's daily budget.
    if (!isLlmConfigured()) {
      console.error('[requestAiReviewAction] OPENAI_API_KEY is not set');
      return { success: false, error: 'llm_error' };
    }

    const rate = await checkRateLimit(auth.user.id, RATE_LIMITS.generateAiReview);
    if ('error' in rate) {
      return { success: false, error: 'rate_limited' };
    }

    const enqueued = await enqueueAiReviewJob({
      game,
      locale,
      userId: auth.user.id,
      evaluations,
      charge: access.kind === 'payable',
    });
    if (!enqueued.ok) {
      return { success: false, error: enqueued.error };
    }

    // The work itself runs once this response is out (see the jobs module for
    // why `after()` is enough here and what the cron sweeper covers). A job
    // that was already queued has its own worker.
    if (!enqueued.alreadyQueued) {
      after(() => processAiReviewJob(enqueued.job.id));
    }
    return { success: true, status: 'queued', job: enqueued.job };
  } catch (error) {
    handleServerActionError(error, '[requestAiReviewAction]');
    return { success: false, error: 'unexpected_error' };
  }
}
