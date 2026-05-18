import type { ExpInfo } from '@blindfold-chess/features/exp';
import * as Sentry from '@sentry/nextjs';
import { and, eq, sql } from 'drizzle-orm';

import { getUserAllTimeRank } from './challenge-queries';
import { decideChallengeRankFeedItem } from './challenge-rank-feed';
import { db } from './index';
import type { GrantedRank } from './rank-evaluation';
import { checkAndGrantRanks } from './rank-evaluation';
import { grantChallengeExp } from './save-exp';
import { challengeBestScores, challengeResults, feedItems } from './schema';

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
): Promise<{ grantedRanks: GrantedRank[]; exp: ExpInfo; challengeResultId: string }> {
  const { userId, menuType, leaderboardKey, score, incorrectAnswers, timeTaken } = input;
  const now = new Date();

  // Captured inside the transaction so the caller can return it (used by
  // result pages to refetch EXP via ?grant=<id>).
  let challengeResultId = '';

  // Exp info populated inside the transaction
  let expInfo: ExpInfo = {
    earnedExp: 0,
    totalExp: 0,
    level: 0,
    levelUp: false,
    progressPercent: 0,
  };

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

    challengeResultId = challengeResult.id;

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

    // 4. Insert a rank-update feed item when the new rank warrants one.
    if (isNewEntry || isImprovement) {
      const newRankResult = await getUserAllTimeRank(userId, menuType, leaderboardKey, tx);
      const feedMetadata = decideChallengeRankFeedItem({
        isNewEntry,
        oldRank,
        newRank: newRankResult?.rank ?? null,
        menuType,
        leaderboardKey,
        score,
        incorrectAnswers,
        timeTaken,
      });

      if (feedMetadata) {
        await tx.insert(feedItems).values({
          entityType: 'challenge_rank_update',
          entityId: challengeResult.id,
          actorId: userId,
          metadata: feedMetadata,
        });
      }
    }

    // 5. Exp grant — calculate and persist Exp for this challenge completion
    expInfo = await grantChallengeExp(tx, {
      userId,
      challengeResultId: challengeResult.id,
      menuType,
      score,
      incorrectAnswers,
      timeTaken,
      leaderboardKey,
    });
  });

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

  return { grantedRanks, exp: expInfo, challengeResultId };
}
