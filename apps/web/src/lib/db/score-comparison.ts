import { and, asc, desc, eq, lte, ne } from 'drizzle-orm';

import type { ChallengeScore } from './challenge-best-score';
import { db } from './index';
import type { ChallengeMenuType } from './practice-menu-types';
import { challengeResults } from './schema';

/**
 * The just-finished challenge run set against the player's own history for
 * the same menu / leaderboard key. Every field is `undefined` when the
 * corresponding row does not exist, so a first-ever run and an anonymous
 * lookup both come back fully empty rather than throwing.
 */
export type ScoreComparison = {
  /**
   * The run identified by `currentResultId`, when it belongs to `userId` and
   * `menuType`. `undefined` when no id was given (direct access, a quit run
   * that was never saved) or when the id does not resolve for this user — a
   * tampered `?grant=` param yields no comparison rather than someone else's.
   */
  current: ChallengeScore | undefined;
  /** Best run before the current one, by the leaderboard's tuple ordering. */
  previousBest: ChallengeScore | undefined;
  /** Most recent run before the current one. */
  previousLast: ChallengeScore | undefined;
};

const scoreColumns = {
  score: challengeResults.score,
  incorrectAnswers: challengeResults.incorrectAnswers,
  timeTaken: challengeResults.timeTaken,
} as const;

/**
 * Read the player's previous best and previous last run for a menu, to show
 * beside the run they just finished.
 *
 * The result page renders after `saveChallengeResult` has already committed
 * the current run, so "previous" cannot mean "everything in the table": the
 * current row is excluded by id, and the history is further cut at the
 * current row's `created_at`. The time cut matters when an old result URL is
 * reopened — without it, runs played since would surface as "last time" for
 * a result that predates them. `challenge_best_scores` is not consulted for
 * the same reason: the UPSERT has already folded the current run into it, so
 * it can no longer say what the best was *before* this run.
 *
 * When `currentResultId` is absent the two history queries run unrestricted,
 * so the section can still show the player's standing on a direct visit.
 *
 * Scoped to `(userId, menuType, leaderboardKey)` — the same triple that keys
 * `challenge_best_scores` — because a white-orientation coordinate run is
 * not comparable with a black-orientation one. When the current row resolves,
 * its own `leaderboard_key` wins over the caller's guess from the URL.
 */
export async function getScoreComparison(
  userId: string,
  menuType: ChallengeMenuType,
  leaderboardKey: string,
  currentResultId?: string
): Promise<ScoreComparison> {
  const current = currentResultId
    ? await fetchCurrentResult(userId, menuType, currentResultId)
    : undefined;

  const scope = [
    eq(challengeResults.userId, userId),
    eq(challengeResults.menuType, menuType),
    eq(challengeResults.leaderboardKey, current?.leaderboardKey ?? leaderboardKey),
    ...(current
      ? [ne(challengeResults.id, current.id), lte(challengeResults.createdAt, current.createdAt)]
      : []),
  ];

  const [[previousBest], [previousLast]] = await Promise.all([
    db
      .select(scoreColumns)
      .from(challengeResults)
      .where(and(...scope))
      .orderBy(
        desc(challengeResults.score),
        asc(challengeResults.incorrectAnswers),
        asc(challengeResults.timeTaken)
      )
      .limit(1),
    db
      .select(scoreColumns)
      .from(challengeResults)
      .where(and(...scope))
      .orderBy(desc(challengeResults.createdAt))
      .limit(1),
  ]);

  return {
    current: current
      ? {
          score: current.score,
          incorrectAnswers: current.incorrectAnswers,
          timeTaken: current.timeTaken,
        }
      : undefined,
    previousBest,
    previousLast,
  };
}

async function fetchCurrentResult(userId: string, menuType: ChallengeMenuType, id: string) {
  const [row] = await db
    .select({
      id: challengeResults.id,
      leaderboardKey: challengeResults.leaderboardKey,
      createdAt: challengeResults.createdAt,
      ...scoreColumns,
    })
    .from(challengeResults)
    .where(
      and(
        eq(challengeResults.id, id),
        eq(challengeResults.userId, userId),
        eq(challengeResults.menuType, menuType)
      )
    )
    .limit(1);
  return row;
}
