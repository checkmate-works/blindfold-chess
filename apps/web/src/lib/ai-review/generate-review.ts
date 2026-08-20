import type { GameRecord } from '@/lib/db/schema';
import { deriveMoveAnalyses } from '@/lib/games/analysis/derive-move-analyses';
import type { PositionEvaluation } from '@/lib/games/analysis/types';

import { buildReviewInput } from './input';
import type { LlmClient } from './llm-client';
import { isRetryableLlmError } from './llm-client';
import { LOCALE_LANGUAGE, buildMovetext, buildSystemPrompt, buildUserPrompt } from './prompt';
import type { AiReviewStore } from './queries';
import { buildAiReviewContentSchema, buildAiReviewJsonSchema } from './schema';
import type { AiReview, AiReviewError } from './types';

/**
 * Output budget per completion. Roomy on purpose: on reasoning models the
 * budget also covers hidden reasoning tokens, and an exhausted budget
 * truncates the JSON mid-object.
 */
const MAX_OUTPUT_TOKENS = 8000;

/** LLM attempts per generation: one call plus one retry on invalid output. */
const MAX_LLM_ATTEMPTS = 2;

export type GenerateReviewParams = {
  /** The trusted game record (already visibility-checked by the caller). */
  game: GameRecord;
  /** Validated `SUPPORTED_LOCALES` member. */
  locale: string;
  /** Who triggered the generation (audit column). */
  userId: string;
  /** Client-reported engine sweep, length-validated by the caller. */
  evaluations: PositionEvaluation[];
  /** Detected opening name for prompt context, or null. */
  openingName: string | null;
  llm: LlmClient;
  store: AiReviewStore;
};

export type GenerateReviewResult =
  | { ok: true; review: AiReview }
  | { ok: false; error: Extract<AiReviewError, 'invalid_input' | 'llm_error'> };

/**
 * The generation core: derive verdicts from the engine sweep, have the LLM
 * narrate them, validate, persist. Orchestration only — every step is a pure
 * function or an injected port, so tests drive this with fakes and never
 * touch a Worker, the network, or the database.
 *
 * Cache-or-generate: an existing (game, locale) review short-circuits before
 * any LLM spend, and the store's conflict-tolerant `save` resolves the
 * concurrent-generation race in favor of whichever request persisted first
 * (both callers get the same stored review back).
 */
export async function generateReview({
  game,
  locale,
  userId,
  evaluations,
  openingName,
  llm,
  store,
}: GenerateReviewParams): Promise<GenerateReviewResult> {
  const cached = await store.find(game.id, locale);
  if (cached) return { ok: true, review: cached };

  const derived = deriveMoveAnalyses(game.moves, game.startingFen ?? undefined, evaluations);
  if (!derived.ok) {
    // Both map to `invalid_input` for the client — the codes are part of that
    // contract — but they are different incidents: a length mismatch is a bad
    // (or tampered) request, while a replay failure means the stored game
    // record is corrupt and needs looking at.
    console.error('[ai-review] could not derive move analyses', derived.error);
    return { ok: false, error: 'invalid_input' };
  }

  const input = buildReviewInput(derived.value, game.playerColor);
  const allowedPlies = input.moments.map((m) => m.ply);

  const system = buildSystemPrompt(LOCALE_LANGUAGE[locale] ?? 'English');
  const user = buildUserPrompt(
    {
      playerColor: game.playerColor,
      result: game.result,
      engineKind: game.engineKind,
      engineElo: game.engineElo,
      openingName,
      language: LOCALE_LANGUAGE[locale] ?? 'English',
    },
    buildMovetext(game.moves, game.startingFen),
    input
  );

  const jsonSchema = buildAiReviewJsonSchema(allowedPlies);
  const contentSchema = buildAiReviewContentSchema(allowedPlies);

  let content = null;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS && content === null; attempt++) {
    const completion = await llm.complete({
      system,
      user,
      schemaName: 'ai_game_review',
      schema: jsonSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    if (!completion.ok) {
      // Every failed attempt is logged, not just the last: a 429 storm used
      // to be invisible because only the final attempt reached the console.
      console.error('[ai-review] LLM completion failed', completion.error);
      // A bad key or a rejected schema will fail identically next time, so
      // spending another full-cost attempt on it is pure waste.
      if (!isRetryableLlmError(completion.error)) break;
      continue;
    }

    try {
      const parsed = contentSchema.safeParse(JSON.parse(completion.value));
      if (parsed.success) {
        content = parsed.data;
      } else if (attempt === MAX_LLM_ATTEMPTS) {
        console.error('[ai-review] LLM output failed validation', parsed.error.issues.slice(0, 5));
      }
    } catch (error) {
      // JSON.parse on a non-JSON body — the provider answered, so retrying
      // is worthwhile (a second sampling usually produces valid output).
      if (attempt === MAX_LLM_ATTEMPTS) {
        console.error('[ai-review] LLM output was not JSON', error);
      }
    }
  }
  if (content === null) {
    return { ok: false, error: 'llm_error' };
  }

  const review = await store.save({
    gameId: game.id,
    locale,
    content,
    moments: input.moments,
    summaryStats: input.summaryStats,
    model: llm.model,
    generatedById: userId,
  });

  return { ok: true, review };
}
