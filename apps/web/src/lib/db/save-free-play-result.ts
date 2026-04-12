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
  expEventId: string;
  exp: ExpInfo;
};

/**
 * Saves a free-play practice result by granting EXP.
 *
 * Returns the `exp_events.id` used as the grant's `source_id`, which the
 * caller passes to the result page as `?grant=<id>` so the page can refetch
 * EXP info via {@link getExpInfoBySource}.
 *
 * Belt-rank evaluation (`checkAndGrantRanks`) is intentionally NOT invoked
 * here: the current rank requirements are all of type `challenge_score`, so
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
