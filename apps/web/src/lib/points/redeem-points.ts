import { addDays } from 'date-fns';
import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import 'server-only';

import { db, pointRedemptions, userGrants, userPointBalances } from '@/lib/db';

import { REDEMPTION_SOURCE, SPENDABLE_CONSUME_ORDER } from './constants';
import { recordPointMovement } from './internal-ledger';

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
      pointEventIds: string[];
      userGrantId: string;
      cost: number;
      durationDays: number;
      expiresAt: Date;
    }
  | { ok: false; error: 'insufficient_balance' | 'invalid_amount' };

class InsufficientBalanceError extends Error {
  constructor() {
    super('insufficient_balance');
  }
}

/**
 * Atomically consume `cost` confirmed points (across `earned` /
 * `promotional` / `purchased`, in that priority order) and issue an
 * ad_free grant for `cost * AD_FREE_DAYS_PER_POINT` days.
 *
 * @design Multi-category consumption
 *
 * The user's spendable balance is split across categories so the platform
 * can keep distinct rules for refund / expiry per origin (purchased money
 * vs. promotional gift vs. UGC-earned). At redemption time we lock all
 * three balance rows under `SELECT ... FOR UPDATE`, then walk
 * `SPENDABLE_CONSUME_ORDER` and debit each row in turn until covered.
 * One `point_events` row is written per debited category so the ledger
 * audit clearly shows which buckets the spend came out of.
 *
 * @design Atomicity
 *
 * Everything happens in one `db.transaction()`:
 *   1. Insert the `point_redemptions` row (status=pending). Its UUID
 *      anchors the ledger rows' idempotency keys.
 *   2. `SELECT ... FOR UPDATE` the relevant balance rows; throw
 *      `InsufficientBalanceError` if the sum cannot cover `cost`
 *      (transaction rolls back, the pending redemption vanishes).
 *   3. For each category drawn from, debit that bucket and append a
 *      `point_events` row (idempotency key includes the category so
 *      multi-row redemptions don't collide).
 *   4. Stack and issue the additive `user_grants` row.
 *   5. Finalize the redemption row (link grant, mark completed).
 *
 * @design Race protection
 *
 * `.for('update')` on each balance row blocks any concurrent redemption
 * attempt against the same user until this transaction commits, then the
 * second attempt reads the post-debit balances and either succeeds with
 * the remaining points or rolls back with `insufficient_balance`. No
 * over-debit is possible.
 */
export async function redeemPointsForAdFree(userId: string, cost: number): Promise<RedeemResult> {
  if (!Number.isInteger(cost) || cost <= 0) {
    return { ok: false, error: 'invalid_amount' };
  }

  try {
    return await db.transaction(async (tx) => {
      const now = new Date();
      const durationDays = cost * AD_FREE_DAYS_PER_POINT;

      // (1) Reserve the redemption id.
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

      // (2) Lock and read the spendable balances.
      const balanceRows = await tx
        .select({
          category: userPointBalances.category,
          balance: userPointBalances.balance,
        })
        .from(userPointBalances)
        .where(
          and(
            eq(userPointBalances.userId, userId),
            inArray(userPointBalances.category, SPENDABLE_CONSUME_ORDER as readonly string[])
          )
        )
        .for('update');

      const byCategory = new Map<string, number>();
      for (const row of balanceRows) {
        byCategory.set(row.category, row.balance);
      }
      const totalAvailable = SPENDABLE_CONSUME_ORDER.reduce(
        (sum, cat) => sum + (byCategory.get(cat) ?? 0),
        0
      );
      if (totalAvailable < cost) {
        throw new InsufficientBalanceError();
      }

      // (3) Walk SPENDABLE_CONSUME_ORDER, debit each bucket and append a row.
      //
      // `recordPointMovement`'s INSERT + upsertBalance produces the same end
      // state as a hand-rolled UPDATE + INSERT pair: the balance row was
      // locked by the SELECT FOR UPDATE above so the upsert path always
      // takes the ON CONFLICT UPDATE branch, applying `balance + delta`
      // (delta < 0 here) to the existing row. Keeping the ledger writes
      // routed through the shared primitive avoids drifting copies of the
      // "insert + balance" pattern across the package.
      let remaining = cost;
      const pointEventIds: string[] = [];
      for (const category of SPENDABLE_CONSUME_ORDER) {
        if (remaining === 0) break;
        const available = byCategory.get(category) ?? 0;
        if (available <= 0) continue;
        const take = Math.min(remaining, available);

        const { pointEventId } = await recordPointMovement(tx, {
          userId,
          delta: -take,
          category,
          source: REDEMPTION_SOURCE,
          sourceId: redemptionRow.id,
          idempotencyKey: `${REDEMPTION_SOURCE}:${redemptionRow.id}:${category}`,
          metadata: { productCode: AD_FREE_PRODUCT_CODE, durationDays },
        });

        pointEventIds.push(pointEventId);
        remaining -= take;
      }

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

      // (5) Finalize the redemption row. We persist the first ledger row's
      //     id (the primary debit) into point_event_id; the rest of the
      //     chain is recoverable via `point_events.source_id = redemption.id`.
      await tx
        .update(pointRedemptions)
        .set({
          status: 'completed',
          pointEventId: pointEventIds[0],
          userGrantId: grantRow.id,
          completedAt: now,
        })
        .where(eq(pointRedemptions.id, redemptionRow.id));

      return {
        ok: true,
        redemptionId: redemptionRow.id,
        pointEventIds,
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
