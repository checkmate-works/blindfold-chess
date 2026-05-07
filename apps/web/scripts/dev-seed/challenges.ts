import { inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { challengeBestScores, challengeResults } from '../../src/lib/db/schema';
import { LEADERBOARD_KEYS } from '../../src/lib/games/leaderboard-keys';

const TIME_WINDOW_DAYS = 30;

/**
 * Reseeds challenge_results + challenge_best_scores for the given seed users.
 *
 * The script wipes prior rows belonging to the seed users (matched by id) and
 * re-inserts a single row per user × (menuType, leaderboardKey) with a
 * createdAt randomized over the past 30 days. That spread guarantees both the
 * weekly and all-time leaderboards have visible entries — exercising the
 * weekly→all-time fallback added to the practice top page.
 *
 * EXP / belt-rank grants and feed_items are intentionally NOT populated here.
 * Reusing saveChallengeResult() would handle them but ignores createdAt, so
 * the time distribution this script exists for would be lost.
 */
export async function reseedChallenges(db: PostgresJsDatabase, userIds: string[]): Promise<number> {
  await db.delete(challengeBestScores).where(inArray(challengeBestScores.userId, userIds));
  await db.delete(challengeResults).where(inArray(challengeResults.userId, userIds));

  const resultRows: (typeof challengeResults.$inferInsert)[] = [];
  const bestRows: (typeof challengeBestScores.$inferInsert)[] = [];

  for (const userId of userIds) {
    for (const [menuType, keys] of Object.entries(LEADERBOARD_KEYS)) {
      for (const leaderboardKey of keys) {
        const score = randInt(5, 30);
        const incorrectAnswers = randInt(0, 4);
        const timeTaken = 60;
        const createdAt = randomDateWithinDays(TIME_WINDOW_DAYS);

        resultRows.push({
          userId,
          menuType,
          leaderboardKey,
          score,
          incorrectAnswers,
          timeTaken,
          createdAt,
        });
        bestRows.push({
          userId,
          menuType,
          leaderboardKey,
          score,
          incorrectAnswers,
          timeTaken,
          achievedAt: createdAt,
        });
      }
    }
  }

  if (resultRows.length > 0) {
    await db.insert(challengeResults).values(resultRows);
    await db.insert(challengeBestScores).values(bestRows);
  }
  return resultRows.length;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(days: number): Date {
  const offsetMs = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - offsetMs);
}
