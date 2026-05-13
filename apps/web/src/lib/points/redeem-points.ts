import { addDays } from 'date-fns';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents, pointRedemptions, userGrants, userPointBalances } from '@/lib/db';

/**
 * Exchange rate set by product: each spendable point buys one day of
 * `ad_free`. Lives in code (not DB) so it can change without a data
 * migration — already-issued grants carry their concrete `expiresAt` and
 * are unaffected by future rate changes.
 */
export const AD_FREE_DAYS_PER_POINT = 1;

/**
 * `product_code` value persisted to `point_redemptions.product_code` for
 * ad_free redemptions. Distinct from `benefitType='ad_free'` (on
 * `user_grants`) because future "ad_free" SKUs may differ (e.g., a 90-day
 * promo bundle redeemable for fewer-than-1 pt/day).
 */
export const AD_FREE_PRODUCT_CODE = 'ad_free_per_point';

export type RedeemResult =
  | {
      ok: true;
      redemptionId: string;
      pointEventId: string;
      userGrantId: string;
      cost: number;
      durationDays: number;
      expiresAt: Date;
    }
  | { ok: false; error: 'insufficient_balance' | 'invalid_amount' };

/**
 * Sentinel thrown from inside the transaction to roll back when the user
 * does not have enough points. Caught outside and mapped to the discrete
 * `insufficient_balance` result branch so callers never see the throw.
 */
class InsufficientBalanceError extends Error {
  constructor() {
    super('insufficient_balance');
  }
}

/**
 * Atomically consume `cost` confirmed points and issue an ad_free grant
 * for `cost * AD_FREE_DAYS_PER_POINT` days.
 *
 * @design Atomic ledger + balance + grant + redemption
 *
 * Everything happens in one `db.transaction()`:
 *   1. Insert the `point_redemptions` row in `pending`. The redemption id
 *      becomes the deterministic idempotency anchor for the ledger row.
 *   2. Decrement `user_point_balances.earned` via WHERE balance >= cost.
 *      If 0 rows update, throw `InsufficientBalanceError` so the
 *      transaction rolls back — the pending redemption row vanishes with
 *      it.
 *   3. Insert the consuming `point_events` row with
 *      `idempotency_key = redemption:<redemption.id>`. The UNIQUE
 *      constraint is the hard backstop against double-debit retries.
 *   4. Stack and issue the additive `user_grants` row.
 *   5. Finalize the redemption row (link point_event + user_grant, mark
 *      `completed`, stamp `completed_at`).
 *
 * @design Race protection
 *
 * The conditional UPDATE on `user_point_balances` is the linearization
 * point. Two parallel requests race on the same row; only one decrements,
 * the other observes `0` rows updated and rolls back via the throw. No
 * explicit `SELECT ... FOR UPDATE` is needed because the UPDATE itself
 * holds the row lock for the rest of the transaction.
 *
 * @design Currently only consumes `earned`
 *
 * Purchased / promotional points are not yet wired through. When they
 * are, this function should consume `earned` first and only fall through
 * to purchased points once earned is exhausted (typical FIFO loyalty
 * pattern).
 */
export async function redeemPointsForAdFree(userId: string, cost: number): Promise<RedeemResult> {
  if (!Number.isInteger(cost) || cost <= 0) {
    return { ok: false, error: 'invalid_amount' };
  }

  try {
    return await db.transaction(async (tx) => {
      const now = new Date();
      const durationDays = cost * AD_FREE_DAYS_PER_POINT;

      // (1) Reserve the redemption id up front; it anchors the ledger
      //     row's idempotency key. If anything below throws, the TX
      //     rollback also removes this row.
      const [redemptionRow] = await tx
        .insert(pointRedemptions)
        .values({
          userId,
          productCode: AD_FREE_PRODUCT_CODE,
          cost,
          status: 'pending',
          metadata: { durationDays },
        })
        .returning({ id: pointRedemptions.id });

      // (2) Conditional debit — the linearization point.
      const debitedRows = await tx
        .update(userPointBalances)
        .set({
          balance: sql`${userPointBalances.balance} - ${cost}`,
          version: sql`${userPointBalances.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userPointBalances.userId, userId),
            eq(userPointBalances.category, 'earned'),
            sql`${userPointBalances.balance} >= ${cost}`
          )
        )
        .returning({ balance: userPointBalances.balance });

      if (debitedRows.length === 0) {
        throw new InsufficientBalanceError();
      }

      // (3) Consuming ledger row, idempotent on retry via redemption.id.
      const [ledgerRow] = await tx
        .insert(pointEvents)
        .values({
          userId,
          delta: -cost,
          category: 'earned',
          source: 'redemption',
          sourceId: redemptionRow.id,
          idempotencyKey: `redemption:${redemptionRow.id}`,
          metadata: { productCode: AD_FREE_PRODUCT_CODE, durationDays },
        })
        .returning({ id: pointEvents.id });

      // (4) Stack the new grant on top of the latest active ad_free.
      const [latest] = await tx
        .select({ expiresAt: userGrants.expiresAt })
        .from(userGrants)
        .where(
          and(
            eq(userGrants.userId, userId),
            eq(userGrants.benefitType, 'ad_free'),
            isNull(userGrants.revokedAt),
            gt(userGrants.expiresAt, now)
          )
        )
        .orderBy(sql`${userGrants.expiresAt} DESC`)
        .limit(1)
        .for('update');

      const startsAt = latest && latest.expiresAt > now ? latest.expiresAt : now;
      const expiresAt = addDays(startsAt, durationDays);

      const [grantRow] = await tx
        .insert(userGrants)
        .values({
          userId,
          benefitType: 'ad_free',
          grantType: 'point_redemption',
          sourceType: 'point_redemption',
          sourceId: redemptionRow.id,
          startsAt,
          expiresAt,
        })
        .returning({ id: userGrants.id });

      // (5) Finalize the redemption row.
      await tx
        .update(pointRedemptions)
        .set({
          status: 'completed',
          pointEventId: ledgerRow.id,
          userGrantId: grantRow.id,
          completedAt: now,
        })
        .where(eq(pointRedemptions.id, redemptionRow.id));

      return {
        ok: true,
        redemptionId: redemptionRow.id,
        pointEventId: ledgerRow.id,
        userGrantId: grantRow.id,
        cost,
        durationDays,
        expiresAt,
      };
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return { ok: false, error: 'insufficient_balance' };
    }
    throw e;
  }
}
