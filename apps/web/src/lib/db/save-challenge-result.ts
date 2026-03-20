import { sql } from 'drizzle-orm';

import { db } from './index';
import { challengeBestScores, challengeResults } from './schema';

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
 * Performs two operations:
 * 1. INSERT into challenge_results (append-only log for weekly/monthly rankings)
 * 2. UPSERT into challenge_best_scores (all-time best per user/menu/key)
 *
 * The UPSERT only updates the existing row when the new result is strictly
 * better, using tuple comparison: (score DESC, incorrect_answers ASC, time_taken ASC).
 */
export async function saveChallengeResult(input: ChallengeResultInput): Promise<void> {
  const { userId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Append to challenge_results (all results, for period-based rankings)
    await tx.insert(challengeResults).values({
      userId,
      menuType,
      leaderboardKey,
      score,
      incorrectAnswers,
      timeTaken,
    });

    // 2. UPSERT into challenge_best_scores (all-time best per user/menu/key)
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
  });
}
