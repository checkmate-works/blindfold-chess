import { and, eq, gte, sql } from 'drizzle-orm';

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
