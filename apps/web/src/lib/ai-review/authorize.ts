import type { GameRecord } from '@/lib/db/schema';
import { MAX_ANALYSIS_PLIES } from '@/lib/games/analysis/evaluate-positions';

/**
 * Fewer plies than this and there is nothing to coach — refuse rather than
 * pay the LLM to say "the game was too short".
 */
export const MIN_REVIEWABLE_PLIES = 4;

export type CanGenerateResult =
  { ok: true } | { ok: false; reason: 'not_owner' | 'game_not_eligible' };

/**
 * THE single authorization gate for generating (not viewing) an AI review.
 *
 * @design Generation is the author's alone; reading is everyone's
 * A review is stored per (game, locale) and served publicly, and its content
 * is a critique of one person's play addressed to that person. Letting a
 * third party generate it would publish an unsolicited assessment of someone
 * else's game under their name, and would open LLM spend to (public games ×
 * locales × every member) instead of to people reviewing their own play. The
 * generated review stays public once it exists — only the act of spending on
 * it is restricted.
 *
 * @design Authorless games cannot be reviewed
 * A game published anonymously has no `authorId`, so nobody satisfies the
 * ownership test and the tab shows a notice instead of a button. This is
 * deliberate rather than an oversight: the alternative (letting anyone
 * generate for games that happen to lack an author) reopens the same hole for
 * exactly the games with no one to object. The anonymous publisher's route in
 * is the existing account-claim flow (`ClaimGameBanner`), after which they own
 * the game and can generate normally.
 *
 * This function is also the one place a future coin charge plugs its balance
 * check into: add an `'insufficient_balance'` reason here and to
 * `AiReviewError`, and perform the actual debit inside `generateReview`'s save
 * step (see the note there) so a failed generation never consumes coins.
 *
 * @param viewerId the authenticated viewer, or null when signed out.
 */
export function canGenerateAiReview(game: GameRecord, viewerId: string | null): CanGenerateResult {
  if (viewerId == null || game.authorId == null || game.authorId !== viewerId) {
    return { ok: false, reason: 'not_owner' };
  }
  if (game.moves.length < MIN_REVIEWABLE_PLIES || game.moves.length > MAX_ANALYSIS_PLIES) {
    return { ok: false, reason: 'game_not_eligible' };
  }
  return { ok: true };
}
