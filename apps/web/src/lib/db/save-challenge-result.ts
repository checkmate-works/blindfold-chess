import { and, eq, sql } from 'drizzle-orm';

import { getUserAllTimeRank } from './challenge-queries';
import { db } from './index';
import { challengeBestScores, challengeResults, feedItems } from './schema';

/** Only insert feed items for ranks at or above this threshold. */
const FEED_RANK_THRESHOLD = 10;

export type ChallengeResultInput = {
  userId: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Writes challenge result records after a challenge session completes.
 *
 * Performs three operations:
 * 1. INSERT into challenge_results (append-only log for weekly/monthly rankings)
 * 2. UPSERT into challenge_best_scores (all-time best per user/menu/key)
 * 3. INSERT into feed_items when a new best score is achieved
 *
 * The UPSERT only updates the existing row when the new result is strictly
 * better, using tuple comparison: (score DESC, incorrect_answers ASC, time_taken ASC).
 */
export async function saveChallengeResult(input: ChallengeResultInput): Promise<void> {
  const { userId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  await db.transaction(async (tx) => {
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

    const isNewEntry = !currentBest;

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

    // 4. Insert feed item if this is a new entry or an improvement
    const isImprovement =
      !isNewEntry &&
      (score > currentBest.score ||
        (score === currentBest.score && incorrectAnswers < currentBest.incorrectAnswers) ||
        (score === currentBest.score &&
          incorrectAnswers === currentBest.incorrectAnswers &&
          timeTaken < currentBest.timeTaken));

    if (isNewEntry || isImprovement) {
      const rankResult = await getUserAllTimeRank(userId, menuType, leaderboardKey);
      const rank = rankResult?.rank ?? 1;

      if (rank <= FEED_RANK_THRESHOLD) {
        await tx.insert(feedItems).values({
          entityType: 'challenge_rank_update',
          entityId: challengeResult.id,
          actorId: userId,
          metadata: {
            menuType,
            leaderboardKey,
            score,
            incorrectAnswers,
            timeTaken,
            rank,
            isNewEntry,
          },
        });
      }
    }
  });
}
