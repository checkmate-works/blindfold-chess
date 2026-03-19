import { sql } from 'drizzle-orm';

import { db } from './index';
import { leaderboardBestScores, leaderboardEntries } from './schema';

export type LeaderboardRecordInput = {
  userId: string;
  sessionId: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Writes leaderboard records after a practice session is saved.
 *
 * Performs two operations:
 * 1. INSERT into leaderboard_entries (append-only log for weekly/monthly rankings)
 * 2. UPSERT into leaderboard_best_scores (all-time best per user/menu/key)
 *
 * The UPSERT only updates the existing row when the new result is strictly
 * better, using tuple comparison: (score DESC, incorrect_answers ASC, time_taken ASC).
 */
export async function saveLeaderboardRecord(input: LeaderboardRecordInput): Promise<void> {
  const { userId, sessionId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  // 1. Append to leaderboard_entries (all results, for period-based rankings)
  await db.insert(leaderboardEntries).values({
    userId,
    sessionId,
    menuType,
    leaderboardKey,
    score,
    incorrectAnswers,
    timeTaken,
  });

  // 2. UPSERT into leaderboard_best_scores (all-time best per user/menu/key)
  //    Only updates when the new result is strictly better:
  //    (higher score, then fewer incorrect answers, then faster time)
  await db
    .insert(leaderboardBestScores)
    .values({
      userId,
      menuType,
      leaderboardKey,
      score,
      incorrectAnswers,
      timeTaken,
      sessionId,
      achievedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        leaderboardBestScores.userId,
        leaderboardBestScores.menuType,
        leaderboardBestScores.leaderboardKey,
      ],
      set: {
        score: sql`EXCLUDED.score`,
        incorrectAnswers: sql`EXCLUDED.incorrect_answers`,
        timeTaken: sql`EXCLUDED.time_taken`,
        sessionId: sql`EXCLUDED.session_id`,
        achievedAt: sql`EXCLUDED.achieved_at`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`(
        EXCLUDED.score,
        -EXCLUDED.incorrect_answers,
        -EXCLUDED.time_taken
      ) > (
        ${leaderboardBestScores.score},
        -${leaderboardBestScores.incorrectAnswers},
        -${leaderboardBestScores.timeTaken}
      )`,
    });
}
