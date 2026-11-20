/**
 * Removing one challenge result by moderation, with everything derived from it
 * brought back into line in the caller's transaction.
 *
 * `challenge_results` is the record of every score; the result is soft-deleted
 * (`deleted_at`) and every read of the table composes
 * {@link liveChallengeResult}, so the period rankings, the history and the
 * comparisons stop showing it on their own. Two things are not read from the
 * live rows and have to be rewritten here: the all-time best in
 * `challenge_best_scores`, and the Exp the result granted.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import 'server-only';

import type { ChallengeScore } from '@/lib/db/challenge-best-score';
import { liveChallengeResult } from '@/lib/db/challenge-results-visibility';
import { reverseChallengeExp } from '@/lib/db/save-exp';
import { challengeAttempts, challengeBestScores, challengeResults } from '@/lib/db/schema';
import type { DbTx } from '@/lib/db/types';

/**
 * What a removal changed, as of the moment it ran.
 *
 * The removed row itself survives with `deleted_at` set, but `bestBefore` and
 * `expReversed` describe state that the removal overwrote, so the audit log
 * entry built from this is the only place they remain.
 */
export type RemovedChallengeResult = {
  id: string;
  userId: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  createdAt: Date;
  /** The attempt that recorded it; null for a result recorded before attempts existed. */
  attemptId: string | null;
  /** The (user, menu, key) all-time best before the removal; null when there was no row. */
  bestBefore: ChallengeScore | null;
  /** The best rebuilt from the results still live; null when none remain. */
  bestAfter: ChallengeScore | null;
  /** Exp taken back from the player; 0 when there was no grant to reverse. */
  expReversed: number;
};

/**
 * Soft-deletes one live challenge result, rebuilds the player's all-time best
 * for its (menu, leaderboard key) from the results still live, and reverses
 * the Exp it granted — all inside `tx`, so the caller can commit the audit
 * entry with it.
 *
 * Steps, in this order:
 * 1. Lock the result (`FOR UPDATE`, live rows only).
 * 2. Lock the `challenge_best_scores` row for its (user, menu, key) and read it.
 * 3. Set `deleted_at`.
 * 4. Read the best live result left for that (user, menu, key).
 * 5. Rewrite the best row from it, insert one if there was none, or delete the
 *    row when no live result remains.
 * 6. Reverse the Exp grant.
 * 7. Read the id of the attempt that recorded the result.
 *
 * Why the best row is locked before anything is written: a result recorded
 * concurrently for the same (user, menu, key) UPSERTs this row. Under READ
 * COMMITTED the rebuild in step 4 cannot see that uncommitted result, so
 * without the lock the rebuild could land after the UPSERT and overwrite the
 * new best with an older one. Holding the lock makes the writer's UPSERT wait
 * for this commit and then re-evaluate its strictly-better condition against
 * the rebuilt row. The result row is locked first because the recording path
 * also touches the result table before the best row, so both paths take their
 * locks in the same order.
 *
 * Why the best is always rebuilt rather than only when the removed result was
 * the best: one query decides it either way, it needs no comparison logic of
 * its own, and it also repairs a best row that had drifted from the results
 * for any other reason.
 *
 * Deliberately not done here:
 * - Belt ranks and monthly badges already granted are not taken away. A rank
 *   once earned is never revoked by design (`user_ranks`), and taking one back
 *   is a separate decision; an abusive player has the ban. The audit entry
 *   keeps `bestBefore` / `bestAfter`, so a rank earned on the removed score
 *   can be traced afterwards. Ranks are not re-evaluated after the removal
 *   either, for the same reason.
 * - Feed rows are not touched. The player's own rank-update item (keyed by the
 *   result id) is hidden at read time by the feed's liveness check, and other
 *   players' rank-change items are left as they were, matching how the feed
 *   decides liveness when it is read rather than by rewriting rows.
 * - The attempt row keeps its `challenge_result_id`. It holds the answer log,
 *   the only evidence of how the score was played, and the link is what the
 *   admin list reads its signals (such as the average thinking time) through.
 *
 * @returns The removed result and what changed, or null when no live result
 *   has this id. Unknown ids and already-removed results are not told apart:
 *   either way nothing is written, which is what keeps a repeated removal from
 *   appending a second audit entry.
 */
export async function removeChallengeResult(
  tx: DbTx,
  resultId: string,
  now: Date
): Promise<RemovedChallengeResult | null> {
  // 1. The result, live only.
  const [result] = await tx
    .select({
      id: challengeResults.id,
      userId: challengeResults.userId,
      menuType: challengeResults.menuType,
      leaderboardKey: challengeResults.leaderboardKey,
      score: challengeResults.score,
      incorrectAnswers: challengeResults.incorrectAnswers,
      timeTaken: challengeResults.timeTaken,
      createdAt: challengeResults.createdAt,
    })
    .from(challengeResults)
    .where(and(eq(challengeResults.id, resultId), liveChallengeResult()))
    .for('update');

  if (!result) return null;

  const { userId, menuType, leaderboardKey } = result;
  const bestScope = and(
    eq(challengeBestScores.userId, userId),
    eq(challengeBestScores.menuType, menuType),
    eq(challengeBestScores.leaderboardKey, leaderboardKey)
  );

  // 2. Lock the best row before writing anything (see the TSDoc).
  const [bestRow] = await tx
    .select({
      score: challengeBestScores.score,
      incorrectAnswers: challengeBestScores.incorrectAnswers,
      timeTaken: challengeBestScores.timeTaken,
    })
    .from(challengeBestScores)
    .where(bestScope)
    .for('update');
  const bestBefore: ChallengeScore | null = bestRow ?? null;

  // 3. Soft-delete.
  await tx
    .update(challengeResults)
    .set({ deletedAt: now })
    .where(eq(challengeResults.id, resultId));

  // 4. The best live result left, in the ranking's own order. The earliest
  //    of equal results wins, as it did when the best was first recorded.
  const [next] = await tx
    .select({
      score: challengeResults.score,
      incorrectAnswers: challengeResults.incorrectAnswers,
      timeTaken: challengeResults.timeTaken,
      createdAt: challengeResults.createdAt,
    })
    .from(challengeResults)
    .where(
      and(
        eq(challengeResults.userId, userId),
        eq(challengeResults.menuType, menuType),
        eq(challengeResults.leaderboardKey, leaderboardKey),
        liveChallengeResult()
      )
    )
    .orderBy(
      desc(challengeResults.score),
      asc(challengeResults.incorrectAnswers),
      asc(challengeResults.timeTaken),
      asc(challengeResults.createdAt)
    )
    .limit(1);

  // 5. Rewrite the best row.
  let bestAfter: ChallengeScore | null = null;
  if (next) {
    bestAfter = {
      score: next.score,
      incorrectAnswers: next.incorrectAnswers,
      timeTaken: next.timeTaken,
    };
    if (bestRow) {
      await tx
        .update(challengeBestScores)
        .set({ ...bestAfter, achievedAt: next.createdAt, updatedAt: sql`now()` })
        .where(bestScope);
    } else {
      // No row to lock means a concurrent first recording for this key can
      // insert one before this does. Resolve that the way the recording path
      // does — keep whichever is strictly better — instead of failing on the
      // primary key.
      await tx
        .insert(challengeBestScores)
        .values({ userId, menuType, leaderboardKey, ...bestAfter, achievedAt: next.createdAt })
        .onConflictDoUpdate({
          target: [
            challengeBestScores.userId,
            challengeBestScores.menuType,
            challengeBestScores.leaderboardKey,
          ],
          set: {
            score: sql`EXCLUDED.score`,
            incorrectAnswers: sql`EXCLUDED.incorrect_answers`,
            timeTaken: sql`EXCLUDED.time_taken`,
            achievedAt: sql`EXCLUDED.achieved_at`,
            updatedAt: sql`now()`,
          },
          setWhere: sql`(
            EXCLUDED.score,
            -EXCLUDED.incorrect_answers,
            -EXCLUDED.time_taken
          ) > (
            ${challengeBestScores.score},
            -${challengeBestScores.incorrectAnswers},
            -${challengeBestScores.timeTaken}
          )`,
        });
    }
  } else if (bestRow) {
    await tx.delete(challengeBestScores).where(bestScope);
  }

  // 6. Exp.
  const expReversed = await reverseChallengeExp(tx, { userId, challengeResultId: resultId });

  // 7. The attempt, read only — its link to the result stays (see the TSDoc).
  const [attempt] = await tx
    .select({ id: challengeAttempts.id })
    .from(challengeAttempts)
    .where(eq(challengeAttempts.challengeResultId, resultId))
    .limit(1);

  return {
    ...result,
    attemptId: attempt?.id ?? null,
    bestBefore,
    bestAfter,
    expReversed,
  };
}
