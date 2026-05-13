import { sql } from 'drizzle-orm';
import 'server-only';

import { userPointBalances } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import type { PointCategory } from './constants';

/**
 * Apply a signed delta to `user_point_balances` for `(userId, category)`.
 * Creates the row on first touch; subsequent calls update in place. The
 * UPDATE path uses `balance + delta` so concurrent inserts compose
 * additively.
 *
 * Exported only for use within `@/lib/points` — callers outside this module
 * should write ledger rows via `grantPendingPointsForPost`, the maturation
 * job, or the redemption flow, all of which keep the cache in sync.
 */
export async function upsertBalance(
  tx: DbTx,
  userId: string,
  category: PointCategory,
  delta: number
): Promise<void> {
  await tx
    .insert(userPointBalances)
    .values({
      userId,
      category,
      balance: delta,
      version: 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userPointBalances.userId, userPointBalances.category],
      set: {
        balance: sql`${userPointBalances.balance} + ${delta}`,
        version: sql`${userPointBalances.version} + 1`,
        updatedAt: new Date(),
      },
    });
}
