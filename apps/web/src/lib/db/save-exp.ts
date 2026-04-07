import { calculateExp, getLevel } from '@blindfold-chess/features/exp';
import { and, eq, gte, sql } from 'drizzle-orm';

import type { ExpInfo } from '@/lib/exp-types';

import { db } from './index';
import { expEvents, userExp } from './schema';

/** Transaction client type — matches the callback parameter of `db.transaction()`. */
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Inserts an exp_event and upserts user_exp within the given transaction.
 *
 * @returns The user's new cumulative totalExp after the grant.
 */
export async function grantExp(
  tx: TransactionClient,
  params: {
    userId: string;
    source: string;
    sourceId: string;
    menuType: string;
    amount: number;
    metadata: Record<string, unknown>;
  }
): Promise<{ totalExp: number }> {
  const { userId, source, sourceId, menuType, amount, metadata } = params;

  // 1. Append to exp_events (immutable log)
  await tx.insert(expEvents).values({
    userId,
    source,
    sourceId,
    menuType,
    amount,
    metadata,
  });

  // 2. Upsert user_exp — increment if exists, insert otherwise
  const [row] = await tx
    .insert(userExp)
    .values({
      userId,
      totalExp: amount,
    })
    .onConflictDoUpdate({
      target: userExp.userId,
      set: {
        totalExp: sql`${userExp.totalExp} + ${amount}`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ totalExp: userExp.totalExp });

  return { totalExp: row.totalExp };
}

/**
 * Returns the number of challenge completions recorded today (UTC) for the user.
 * Used to calculate the streak multiplier for Exp grants.
 *
 * The count does NOT include the current (not-yet-inserted) challenge.
 */
export async function getDailyChallengeCount(
  tx: TransactionClient,
  userId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(expEvents)
    .where(
      and(
        eq(expEvents.userId, userId),
        eq(expEvents.source, 'challenge_result'),
        gte(expEvents.createdAt, todayStart)
      )
    );

  return result?.count ?? 0;
}

/**
 * Calculates and grants Exp for a completed challenge within a transaction.
 *
 * Orchestrates: dailyChallengeCount lookup → calculateExp → grantExp → level determination.
 * Extracted from saveChallengeResult to keep that function focused on challenge record persistence.
 */
export async function grantChallengeExp(
  tx: TransactionClient,
  params: {
    userId: string;
    challengeResultId: string;
    menuType: string;
    score: number;
    incorrectAnswers: number;
    timeTaken: number;
    leaderboardKey: string;
  }
): Promise<ExpInfo> {
  const {
    userId,
    challengeResultId,
    menuType,
    score,
    incorrectAnswers,
    timeTaken,
    leaderboardKey,
  } = params;

  const dailyChallengeCount = await getDailyChallengeCount(tx, userId);
  const totalQuestions = score + incorrectAnswers;
  const expResult = calculateExp({
    score,
    totalQuestions,
    menuType,
    dailyChallengeCount,
  });

  const { totalExp } = await grantExp(tx, {
    userId,
    source: 'challenge_result',
    sourceId: challengeResultId,
    menuType,
    amount: expResult.totalExp,
    metadata: {
      score,
      incorrectAnswers,
      timeTaken,
      leaderboardKey,
      baseExp: expResult.baseExp,
      accuracyMultiplier: expResult.accuracyMultiplier,
      streakMultiplier: expResult.streakMultiplier,
    },
  });

  const levelAfter = getLevel(totalExp);
  const levelBefore = getLevel(totalExp - expResult.totalExp);

  return {
    earnedExp: expResult.totalExp,
    totalExp,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
  };
}
