'use server';

import { SUPPORTED_LOCALES } from '@/config';
import { z } from 'zod';

import { canGenerateAiReview } from '@/lib/ai-review/authorize';
import { generateReview } from '@/lib/ai-review/generate-review';
import { createOpenAiClient, isLlmConfigured } from '@/lib/ai-review/openai';
import { dbAiReviewStore } from '@/lib/ai-review/queries';
// Response and error types live in @/lib/ai-review/types — a "use server"
// file must not re-export types (see the Server Actions convention).
import type { GenerateAiReviewResponse } from '@/lib/ai-review/types';
import { authenticateAndCheckBan } from '@/lib/auth';
import { getGameById } from '@/lib/db/games-read';
import { EVAL_SCORE_LIMIT } from '@/lib/games/analysis/types';
import { detectGameOpening } from '@/lib/openings/detect-game-opening';
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

export type GenerateAiReviewInput = z.infer<typeof inputSchema>;

/**
 * Generate (or fetch, when already cached) the AI coach review for a shared
 * game. Members-only, tightly rate-limited — this is the only path that can
 * spend LLM tokens. See `@/lib/ai-review` for the pipeline and the
 * engine/LLM authorship split.
 */
export async function generateAiReviewAction(
  input: GenerateAiReviewInput
): Promise<GenerateAiReviewResponse> {
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

    const eligible = canGenerateAiReview(game, auth.user.id);
    if (!eligible.ok) {
      return { success: false, error: eligible.reason };
    }
    if (evaluations.length !== game.moves.length + 1) {
      return { success: false, error: 'invalid_input' };
    }

    // Cache check BEFORE the rate limit: fetching an existing review is free
    // and must not consume (or be blocked by) the generation budget.
    const cached = await dbAiReviewStore.find(game.id, locale);
    if (cached) {
      return { success: true, review: cached };
    }

    // The UI hides the tab when no key is configured, but a stale page (or a
    // direct POST) can still land here. Refuse BEFORE the rate limit so a
    // deployment-side misconfiguration cannot eat the caller's daily budget.
    if (!isLlmConfigured()) {
      console.error('[generateAiReviewAction] OPENAI_API_KEY is not set');
      return { success: false, error: 'llm_error' };
    }

    const rate = await checkRateLimit(auth.user.id, RATE_LIMITS.generateAiReview);
    if ('error' in rate) {
      return { success: false, error: 'rate_limited' };
    }

    const opening = await detectGameOpening({
      moves: game.moves,
      startingFen: game.startingFen,
    });

    const result = await generateReview({
      game,
      locale,
      userId: auth.user.id,
      evaluations,
      openingName: opening?.name ?? null,
      llm: createOpenAiClient(),
      store: dbAiReviewStore,
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }
    return { success: true, review: result.review };
  } catch (error) {
    handleServerActionError(error, '[generateAiReviewAction]');
    return { success: false, error: 'unexpected_error' };
  }
}
