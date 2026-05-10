import { unstable_cache } from 'next/cache';

import { addDays } from 'date-fns';
import { and, eq, gt, isNull, lte, max } from 'drizzle-orm';
import 'server-only';

import { db, userGrants } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';
import { type AutomatedGrantType, GRANT_TYPE_DEFAULTS } from '@/lib/db/data/grant-types';
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

/**
 * Apply an automated grant atomically.
 *
 * Looks up the duration policy for the given grantType from
 * GRANT_TYPE_DEFAULTS, computes the additive-stack startsAt by row-locking
 * existing active grants for the same user+benefitType, then inserts a new
 * grant record. Must be called within a db.transaction() to prevent race
 * conditions when the same user triggers concurrent grant flows.
 *
 * @param tx - Drizzle transaction client (from inside db.transaction)
 * @param userId - The user receiving the grant
 * @param grantType - One of the configured AutomatedGrantType values (e.g., 'topic_post')
 * @param source - Optional provenance link: the entity that triggered this grant.
 *   For UGC grants this should always be passed (e.g., {type:'topic_post', id:postId}).
 *   The (sourceType, sourceId) pair enables targeted revocation when the source
 *   entity is later removed — see schema.ts userGrants @design source* tag.
 * @returns The new grant's id and computed expiresAt
 */
export async function applyAutomatedGrant(
  tx: DbTx,
  userId: string,
  grantType: AutomatedGrantType,
  source?: { type: string; id: string }
): Promise<{ grantId: string; expiresAt: Date }> {
  const config = GRANT_TYPE_DEFAULTS[grantType];

  // Capture "now" once so the lock filter and the subsequent stacking
  // calculation observe the exact same moment. Matches the convention
  // used by hasActiveGrant above.
  const now = new Date();

  // Row-lock existing active grants for this user+benefitType to serialize
  // concurrent stacking writes. Expired grants are intentionally NOT locked:
  // they cannot contribute to stacking and their row lock would be pure overhead.
  const existingActive = await tx
    .select({ expiresAt: userGrants.expiresAt })
    .from(userGrants)
    .where(
      and(
        eq(userGrants.userId, userId),
        eq(userGrants.benefitType, config.benefitType),
        isNull(userGrants.revokedAt),
        gt(userGrants.expiresAt, now)
      )
    )
    .for('update');

  const startsAt = existingActive.reduce<Date>(
    (acc, row) => (row.expiresAt > acc ? row.expiresAt : acc),
    now
  );
  const expiresAt = addDays(startsAt, config.durationDays);

  const [inserted] = await tx
    .insert(userGrants)
    .values({
      userId,
      benefitType: config.benefitType,
      grantType,
      sourceType: source?.type ?? null,
      sourceId: source?.id ?? null,
      startsAt,
      expiresAt,
    })
    .returning({ id: userGrants.id });

  return { grantId: inserted.id, expiresAt };
}
