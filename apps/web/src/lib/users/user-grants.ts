import { and, eq, gt, isNull, lte, max } from 'drizzle-orm';
import 'server-only';

import { grantStatusTag } from '@/lib/cache-tags';
import { db, userGrants } from '@/lib/db';
import { cachedExistenceCheck } from '@/lib/db/cached-existence-check';
import type { DbTx } from '@/lib/db/types';

import { stackGrantStart } from './grant-stacking';

/**
 * Check if the user has an active (non-revoked, currently valid) grant
 * for the given benefit type.
 *
 * This module is the core of the user grants system (権限付与): time-limited
 * benefits such as ad-free access or paywall content access, stored in the
 * single `user_grants` table (`@design` TSDoc on the table in
 * `lib/db/schema/grants.ts`), issued and revoked from `/admin/grants`
 * (`app/admin/grants/`), and shown to the user on `/mypage/benefits`.
 *
 * Adding a benefit type: append the value to `BENEFIT_TYPES` in
 * `lib/db/data/grant-types.ts` (no schema change — `benefitType` is varchar),
 * check it with `hasActiveGrant(userId, '<type>')` at the gate that needs it,
 * and for a scoped benefit also filter by `resourceType` / `resourceId`.
 *
 * Adding a grant trigger: call {@link calcGrantStartsAt} for the stacking
 * start, insert into `user_grants` with the trigger's `grantType`, wrap the
 * read + insert in `db.transaction()` when the trigger is automated (the
 * admin flow omits it on purpose, being low-frequency), and call
 * `revalidateTag(grantStatusTag(userId))` afterwards.
 *
 * Ad-free is not only grants: `hasAdFreeEntitlement` in
 * `lib/ads/ad-free-entitlement.ts` ORs an active grant with an active Stripe
 * subscription and a dan-tier belt rank (derived from `user_ranks`, never
 * materialised as a grant row). New ad-free sources go there, nowhere else.
 */
export const hasActiveGrant = cachedExistenceCheck(
  {
    keyParts: ['has-active-grant'],
    tag: (userId) => grantStatusTag(userId),
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
 * @param now - The instant the grant is being created; injectable for tests.
 */
export async function calcGrantStartsAt(
  userId: string,
  benefitType: string,
  executor: DbTx | typeof db = db,
  now: Date = new Date()
): Promise<Date> {
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

  return stackGrantStart(latest?.maxExpires, now);
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
