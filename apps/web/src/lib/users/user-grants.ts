import { unstable_cache } from 'next/cache';

import { and, eq, gt, isNull, lte, max } from 'drizzle-orm';
import 'server-only';

import { db, userGrants } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';
import type { DbTx } from '@/lib/db/types';

/**
 * Check if the user has an active (non-revoked, currently valid) grant
 * for the given benefit type.
 */
export const hasActiveGrant = unstable_cache(
  async (userId: string, benefitType: string): Promise<boolean> => {
    try {
      const now = new Date();
      const [row] = await withTimeout(
        db
          .select({ id: userGrants.id })
          .from(userGrants)
          .where(
            and(
              eq(userGrants.userId, userId),
              eq(userGrants.benefitType, benefitType),
              lte(userGrants.startsAt, now),
              gt(userGrants.expiresAt, now),
              isNull(userGrants.revokedAt)
            )
          )
          .limit(1)
      );
      return !!row;
    } catch (error) {
      console.warn('Failed to check grant status:', error);
      return false;
    }
  },
  ['has-active-grant'],
  { tags: ['grant-status'], revalidate: 60 }
);

/**
 * Calculate the start time for a new additive grant.
 * If the user has an existing active grant that expires in the future,
 * the new grant starts from that expiration time (stacking).
 * Otherwise, it starts from now.
 *
 * @param executor - Optional Drizzle query executor (db or tx). Defaults to `db`.
 *   Pass a transaction client when calling within `db.transaction()`.
 */
export async function calcGrantStartsAt(
  userId: string,
  benefitType: string,
  executor: DbTx | typeof db = db
): Promise<Date> {
  const now = new Date();

  const [latest] = await executor
    .select({ maxExpires: max(userGrants.expiresAt) })
    .from(userGrants)
    .where(
      and(
        eq(userGrants.userId, userId),
        eq(userGrants.benefitType, benefitType),
        isNull(userGrants.revokedAt)
      )
    );

  const latestExpires = latest?.maxExpires;
  return latestExpires && latestExpires > now ? latestExpires : now;
}
