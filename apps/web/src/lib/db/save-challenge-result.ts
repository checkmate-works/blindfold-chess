import { revalidateTag } from 'next/cache';

import * as Sentry from '@sentry/nextjs';
import { and, eq, sql } from 'drizzle-orm';

import { getUserAllTimeRank } from './challenge-queries';
import { db } from './index';
import type { GrantedRank } from './rank-evaluation';
import { checkAndGrantRanks } from './rank-evaluation';
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
export async function saveChallengeResult(
  input: ChallengeResultInput
): Promise<{ grantedRanks: GrantedRank[] }> {
  const { userId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  // Track whether rankings changed so we can invalidate the cache after commit
  let rankingsChanged = false;

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

    const isImprovement =
      !isNewEntry &&
      (score > currentBest.score ||
        (score === currentBest.score && incorrectAnswers < currentBest.incorrectAnswers) ||
        (score === currentBest.score &&
          incorrectAnswers === currentBest.incorrectAnswers &&
          timeTaken < currentBest.timeTaken));

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

    // Rankings change whenever a new entry or improvement occurs
    if (isNewEntry || isImprovement) {
      rankingsChanged = true;
    }

    // 4. Insert feed item based on rank conditions
    if (isNewEntry) {
      const newRankResult = await getUserAllTimeRank(userId, menuType, leaderboardKey, tx);
      const newRank = newRankResult?.rank ?? null;

      if (newRank != null && newRank <= FEED_RANK_THRESHOLD) {
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
            rank: newRank,
            isNewEntry,
          },
        });
      }
    } else if (isImprovement) {
      const newRankResult = await getUserAllTimeRank(userId, menuType, leaderboardKey, tx);
      const newRank = newRankResult?.rank ?? null;

      if (
        newRank != null &&
        newRank <= FEED_RANK_THRESHOLD &&
        oldRank != null &&
        oldRank > newRank
      ) {
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
            rank: newRank,
            isNewEntry,
            previousRank: oldRank,
          },
        });
      }
    }
  });

  // 5. Invalidate leaderboard cache after transaction commits so the next
  //    page visit fetches fresh ranking data.
  if (rankingsChanged) {
    revalidateTag('leaderboard', { expire: 60 });
  }

  // 6. Check and grant any newly achievable belt ranks.
  // Called outside the transaction so challenge_best_scores reflects the latest data.
  // Uses onConflictDoNothing for idempotency — safe to call on every challenge completion.
  // Wrapped in try-catch: rank evaluation is supplementary — a failure here must not
  // break the challenge result flow that has already committed successfully.
  let grantedRanks: GrantedRank[] = [];
  try {
    grantedRanks = await checkAndGrantRanks(userId);
  } catch (error) {
    console.error('Failed to check/grant ranks:', error);
    Sentry.captureException(error);
  }

  return { grantedRanks };
}
