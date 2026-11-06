/**
 * Free-Play Practice Result Persistence
 *
 * @description
 * Thin wrapper that grants EXP for a completed free-play practice run inside
 * a transaction. Unlike {@link ./save-challenge-result.ts}, this path does
 * NOT touch `challenge_results`, `challenge_best_scores`, or `feed_items` —
 * free-play runs have no leaderboard entry.
 *
 * @see {@link ./save-exp.ts} — `grantPracticeExp` (the underlying EXP writer)
 */
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { db } from './index';
import { grantPracticeExp } from './save-exp';

export type FreePlayResultInput = {
  userId: string;
  menuType: string;
  correctCount: number;
  mistakes: number;
};

export type FreePlayResultOutput = {
  /** The grant's `exp_events.source_id` — despite the name, not `exp_events.id`. */
  expEventId: string;
  exp: ExpInfo;
};

/**
 * Saves a free-play practice result by granting EXP.
 *
 * Returns the fresh UUID that `grantPracticeExp` stored as the grant's
 * `exp_events.source_id` (not the row's own `exp_events.id`), which the
 * caller passes to the result page as `?grant=<id>` so the page can refetch
 * EXP info via `getExpInfoBySource(userId, 'practice_result', id)`.
 *
 * Belt-rank evaluation (`checkAndGrantRanks`) is intentionally NOT invoked
 * here: no current rank requirement type (`challenge_score`,
 * `position_submission_count`, `game_publish_win`,
 * `game_publish_win_hidden_board`) reads anything a free-play run writes, so
 * free-play completions cannot unlock any rank. Re-adding this call is
 * straightforward once a free-play-eligible requirement type is introduced.
 */
export async function saveFreePlayResult(
  input: FreePlayResultInput
): Promise<FreePlayResultOutput> {
  const { userId, menuType, correctCount, mistakes } = input;

  return db.transaction(async (tx) => {
    const { expEventId, expInfo } = await grantPracticeExp(tx, {
      userId,
      menuType,
      correctCount,
      mistakes,
    });

    return { expEventId, exp: expInfo };
  });
}
