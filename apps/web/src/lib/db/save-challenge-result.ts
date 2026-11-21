import type { ExpInfo } from '@blindfold-chess/features/exp';
import { and, eq, sql } from 'drizzle-orm';

import type { GrantedRank } from '@/lib/db/data/ranks';

import { detectScoreImprovement } from './challenge-best-score';
import { getUserAllTimeRank } from './challenge-queries';
import { decideChallengeRankFeedItem } from './challenge-rank-feed';
import { evaluateRanksAndRefreshEntitlements } from './rank-grant-flow';
import { grantChallengeExp } from './save-exp';
import { challengeBestScores, challengeResults, feedItems } from './schema';
import type { DbTx } from './types';

export type ChallengeResultInput = {
  userId: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  /** Whole seconds; stored as-is in an integer column, so round before passing. */
  timeTaken: number;
};

/**
 * Insert a rank-update feed item for a challenge result when the new
 * all-time rank warrants one. Reads the post-UPSERT rank inside the
 * transaction, so callers must pass the pre-UPSERT `oldRank` they captured
 * earlier (rank shifts once the best score lands).
 */
async function insertChallengeRankFeedItem(
  tx: DbTx,
  params: {
    userId: string;
    menuType: string;
    leaderboardKey: string;
    score: number;
    incorrectAnswers: number;
    timeTaken: number;
    challengeResultId: string;
    isNewEntry: boolean;
    oldRank: number | null;
  }
): Promise<void> {
  const newRankResult = await getUserAllTimeRank(
    params.userId,
    params.menuType,
    params.leaderboardKey,
    tx
  );
  const feedMetadata = decideChallengeRankFeedItem({
    isNewEntry: params.isNewEntry,
    oldRank: params.oldRank,
    newRank: newRankResult?.rank ?? null,
    menuType: params.menuType,
    leaderboardKey: params.leaderboardKey,
    score: params.score,
    incorrectAnswers: params.incorrectAnswers,
    timeTaken: params.timeTaken,
  });

  if (feedMetadata) {
    await tx.insert(feedItems).values({
      entityType: 'challenge_rank_update',
      entityId: params.challengeResultId,
      actorId: params.userId,
      metadata: feedMetadata,
    });
  }
}

/**
 * Writes the records of one completed challenge inside the caller's
 * transaction:
 * 1. INSERT into challenge_results (append-only log for weekly/monthly rankings)
 * 2. UPSERT into challenge_best_scores (all-time best per user/menu/key)
 * 3. INSERT into feed_items when a new entry or improvement moves the rank
 *    enough to warrant one (`decideChallengeRankFeedItem`)
 * 4. Grant EXP keyed by the new `challenge_results.id`
 *
 * Takes the transaction instead of opening one so a caller can make the
 * result part of a larger atomic change: finishing a server-run attempt marks
 * the attempt row consumed in the same transaction that holds its row lock,
 * so a result is written exactly once per attempt. Belt ranks are not
 * evaluated here — call {@link evaluateRanksAfterChallenge} after the commit.
 *
 * The UPSERT only updates the existing row when the new result is strictly
 * better, using tuple comparison: (score DESC, incorrect_answers ASC, time_taken ASC).
 */
export async function writeChallengeResult(
  tx: DbTx,
  input: ChallengeResultInput
): Promise<{ exp: ExpInfo; challengeResultId: string }> {
  const { userId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  // 1. Append to challenge_results (all results, for period-based rankings)
  const [challengeResult] = await tx
    .insert(challengeResults)
    .values({
      userId,
      menuType,
      leaderboardKey,
      score,
      incorrectAnswers,
      timeTaken,
    })
    .returning({ id: challengeResults.id });

  // 2. Check the current best score before the UPSERT
  const [currentBest] = await tx
    .select({
      score: challengeBestScores.score,
      incorrectAnswers: challengeBestScores.incorrectAnswers,
      timeTaken: challengeBestScores.timeTaken,
    })
    .from(challengeBestScores)
    .where(
      and(
        eq(challengeBestScores.userId, userId),
        eq(challengeBestScores.menuType, menuType),
        eq(challengeBestScores.leaderboardKey, leaderboardKey)
      )
    );

  const { isNewEntry, isImprovement } = detectScoreImprovement(
    { score, incorrectAnswers, timeTaken },
    currentBest
  );

  // 2.5. For improvements, capture the old rank BEFORE the UPSERT
  let oldRank: number | null = null;
  if (isImprovement) {
    const oldRankResult = await getUserAllTimeRank(userId, menuType, leaderboardKey, tx);
    oldRank = oldRankResult?.rank ?? null;
  }

  // 3. UPSERT into challenge_best_scores (all-time best per user/menu/key)
  //    Only updates when the new result is strictly better:
  //    (higher score, then fewer incorrect answers, then faster time)
  await tx
    .insert(challengeBestScores)
    .values({
      userId,
      menuType,
      leaderboardKey,
      score,
      incorrectAnswers,
      timeTaken,
      achievedAt: now,
    })
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

  // 4. Insert a rank-update feed item when the new rank warrants one.
  if (isNewEntry || isImprovement) {
    await insertChallengeRankFeedItem(tx, {
      userId,
      menuType,
      leaderboardKey,
      score,
      incorrectAnswers,
      timeTaken,
      challengeResultId: challengeResult.id,
      isNewEntry,
      oldRank,
    });
  }

  // 5. Exp grant — calculate and persist Exp for this challenge completion
  const exp = await grantChallengeExp(tx, {
    userId,
    challengeResultId: challengeResult.id,
    menuType,
    score,
    incorrectAnswers,
    timeTaken,
    leaderboardKey,
  });

  return { exp, challengeResultId: challengeResult.id };
}

/**
 * Checks and grants any newly achievable belt ranks after a challenge result
 * was committed, then refreshes the ad-free cookie if a dan promotion just
 * happened.
 *
 * Must run after the transaction that wrote the result has committed, so the
 * evaluation reads the updated `challenge_best_scores`. Best-effort — a
 * failure here never undoes or fails the committed save.
 */
export async function evaluateRanksAfterChallenge(userId: string): Promise<GrantedRank[]> {
  return evaluateRanksAndRefreshEntitlements(userId, 'challenge completion');
}
