/**
 * Exp Persistence (経験値の永続化)
 *
 * @description
 * Database operations for granting Exp from challenge completions.
 * Orchestrates the full flow: calculation → persistence → level check.
 *
 * @see {@link @blindfold-chess/features/exp} for calculation logic (calculateExp, getLevel)
 * @see {@link ./save-challenge-result.ts} for the caller that invokes grantChallengeExp
 */
import { calculateExp, getLevel, getLevelProgress } from '@blindfold-chess/features/exp';
import { and, eq, sql } from 'drizzle-orm';

import type { ExpInfo } from '@/lib/exp-types';

import type { db } from './index';
import { expEvents, userExp } from './schema';

/** Transaction client type — matches the callback parameter of `db.transaction()`. */
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Result of a {@link grantExp} call.
 *
 * When `alreadyGranted` is `true`, the grant was a no-op because an
 * `exp_events` row for `(source, source_id)` already existed. In that case,
 * `existingAmount` / `existingMetadata` describe the row from the first
 * (successful) grant, and `totalExp` is the current `user_exp.total_exp`
 * value — unchanged by this call.
 */
type GrantExpResult =
  | { totalExp: number; alreadyGranted: false }
  | {
      totalExp: number;
      alreadyGranted: true;
      existingAmount: number;
      existingMetadata: Record<string, unknown>;
    };

/**
 * Inserts an exp_event and upserts user_exp within the given transaction.
 *
 * Idempotent with respect to `(source, source_id)`: a partial unique index
 * `uq_exp_events_source_pair` prevents duplicate inserts when `source_id`
 * is non-null. On conflict, this function returns the existing event's
 * amount/metadata and the user's current totalExp WITHOUT incrementing
 * `user_exp` a second time.
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
): Promise<GrantExpResult> {
  const { userId, source, sourceId, menuType, amount, metadata } = params;

  // 1. Append to exp_events (immutable log) with idempotency guard.
  //    The partial unique index `uq_exp_events_source_pair` matches when
  //    source_id IS NOT NULL. `onConflictDoNothing` with the target columns
  //    will use that index.
  const inserted = await tx
    .insert(expEvents)
    .values({
      userId,
      source,
      sourceId,
      menuType,
      amount,
      metadata,
    })
    .onConflictDoNothing({ target: [expEvents.source, expEvents.sourceId] })
    .returning({ id: expEvents.id });

  if (inserted.length === 0) {
    // Idempotent path: a row already existed for (source, source_id).
    // Recover the original grant's amount/metadata and the current totalExp.
    const [existing] = await tx
      .select({ amount: expEvents.amount, metadata: expEvents.metadata })
      .from(expEvents)
      .where(and(eq(expEvents.source, source), eq(expEvents.sourceId, sourceId)))
      .limit(1);

    const [userExpRow] = await tx
      .select({ totalExp: userExp.totalExp })
      .from(userExp)
      .where(eq(userExp.userId, userId))
      .limit(1);

    return {
      totalExp: userExpRow?.totalExp ?? 0,
      alreadyGranted: true,
      existingAmount: existing?.amount ?? amount,
      existingMetadata: (existing?.metadata as Record<string, unknown> | null) ?? metadata,
    };
  }

  // 2. Fresh insert: upsert user_exp — increment if exists, insert otherwise
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

  return { totalExp: row.totalExp, alreadyGranted: false };
}

/**
 * Calculates and grants Exp for a completed challenge within a transaction.
 *
 * Orchestrates: calculateExp → grantExp → level determination.
 * Extracted from saveChallengeResult to keep that function focused on challenge record persistence.
 *
 * Idempotent: if the same `challengeResultId` has already received an Exp grant,
 * the previously-granted amount is returned and `levelUp` is forced to `false`
 * (no state transition is happening on this call).
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

  const expResult = calculateExp({
    score,
    incorrectAnswers,
    menuType,
  });

  const grantResult = await grantExp(tx, {
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
    },
  });

  const { totalExp } = grantResult;
  const levelAfter = getLevel(totalExp);
  const levelProgress = getLevelProgress(totalExp);
  const progressPercent = Math.round(levelProgress.progress * 100);

  if (grantResult.alreadyGranted) {
    // Idempotent branch: use the originally-granted amount and do not
    // signal a level-up (the transition, if any, happened on the first call).
    return {
      earnedExp: grantResult.existingAmount,
      totalExp,
      level: levelAfter,
      levelUp: false,
      progressPercent,
    };
  }

  const levelBefore = getLevel(totalExp - expResult.totalExp);

  return {
    earnedExp: expResult.totalExp,
    totalExp,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
    progressPercent,
  };
}
