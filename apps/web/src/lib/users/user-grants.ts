import { and, eq, gt, isNull, lte, max } from 'drizzle-orm';
import 'server-only';

import { GRANT_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db, userGrants } from '@/lib/db';
import { cachedExistenceCheck } from '@/lib/db/cached-existence-check';
import type { DbTx } from '@/lib/db/types';

/**
 * Check if the user has an active (non-revoked, currently valid) grant
 * for the given benefit type.
 */
export const hasActiveGrant = cachedExistenceCheck(
  {
    keyParts: ['has-active-grant'],
    tag: GRANT_STATUS_CACHE_TAG,
    warning: 'Failed to check grant status:',
  },
  (userId: string, benefitType: string) => {
    const now = new Date();
    return db
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
      .limit(1);
  }
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

/** Where a grant's validity window sits relative to `now`. */
export type GrantPeriodStatus = 'active' | 'upcoming' | 'expired';

/**
 * Classify a grant's validity window against `now`.
 *
 * The boundaries are the point: `expiresAt` is exclusive (a grant expiring
 * exactly now is over) and `startsAt` is inclusive (one starting exactly now
 * has begun), matching `hasActiveGrant`'s SQL — `startsAt <= now AND expiresAt
 * > now`. The two `/mypage/benefits` loaders each re-derived that from the
 * comparison operators, so a correction to either boundary would have had to
 * be made in three places to keep the list view, the history view, and the
 * entitlement check telling the user the same thing.
 *
 * Revocation is deliberately not handled here — a revoked grant still has a
 * window, and only the history view distinguishes the two.
 */
export function classifyGrantPeriod(now: Date, startsAt: Date, expiresAt: Date): GrantPeriodStatus {
  if (expiresAt <= now) return 'expired';
  if (startsAt > now) return 'upcoming';
  return 'active';
}
