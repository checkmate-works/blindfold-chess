import type { GameRecord } from '@/lib/db/schema';
import { MAX_ANALYSIS_PLIES } from '@/lib/games/analysis/evaluate-positions';

/**
 * Fewer plies than this and there is nothing to coach — refuse rather than
 * pay the LLM to say "the game was too short".
 */
export const MIN_REVIEWABLE_PLIES = 4;

export type CanGenerateResult = { ok: true } | { ok: false; reason: 'game_not_eligible' };

/**
 * THE single authorization gate for generating (not viewing) an AI review.
 *
 * Currently checks only game eligibility — any signed-in, non-banned member
 * may generate (the caller has already authenticated). This function is the
 * one place a future coin charge plugs its balance check into: add an
 * `'insufficient_balance'` reason here and to `AiReviewError`, and perform
 * the actual debit inside `generateReview`'s save step (see the note there)
 * so a failed generation never consumes coins.
 */
export function canGenerateAiReview(game: GameRecord): CanGenerateResult {
  if (game.moves.length < MIN_REVIEWABLE_PLIES || game.moves.length > MAX_ANALYSIS_PLIES) {
    return { ok: false, reason: 'game_not_eligible' };
  }
  return { ok: true };
}
