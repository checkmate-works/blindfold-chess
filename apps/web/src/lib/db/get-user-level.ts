import { getLevel } from '@blindfold-chess/features/exp';
import { eq } from 'drizzle-orm';

import { db } from './index';
import { userExp } from './schema';

/**
 * The user's current level, derived from the `user_exp` running total via
 * the shared level curve. A user who has never saved a result has no
 * `user_exp` row and is Lv0 — the same level the Exp UI shows them.
 *
 * Levels are read here rather than stored: `user_exp.total_exp` is the one
 * fact the ledger keeps, and the curve (`getLevel`) is code, so a change to
 * the curve re-levels everyone consistently with no backfill.
 */
export async function getUserLevel(userId: string): Promise<number> {
  const [row] = await db
    .select({ totalExp: userExp.totalExp })
    .from(userExp)
    .where(eq(userExp.userId, userId))
    .limit(1);
  return getLevel(row?.totalExp ?? 0);
}
