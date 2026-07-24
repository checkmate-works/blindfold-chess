import { and, eq, sql } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import type { DbTx, DbTxOrDb } from '@/lib/db/types';

import { REPERTOIRE_VISIBILITY_SOURCE } from './constants';
import { debitSpendable } from './internal-ledger';
import {
  REPERTOIRE_VISIBILITY_COST,
  type RepertoireVisibility,
  repertoireVisibilityCharge,
} from './spend-catalog';

export type ChargeRepertoireVisibilityResult =
  { ok: true; charged: number } | { ok: false; error: 'insufficient_balance' };

/**
 * Coins already spent unlocking one repertoire's visibility — the sum of its
 * `repertoire_visibility` debits (stored negative, returned as a positive
 * total). By construction this equals the highest tier price ever reached for
 * the repertoire: the charge on each change is only the increment above the
 * prior max (see {@link repertoireVisibilityCharge}), so the debits telescope
 * to that max. Read under the caller's transaction so it reflects the same
 * locked state the debit writes against.
 */
async function readVisibilityPaid(
  tx: DbTxOrDb,
  userId: string,
  repertoireId: string
): Promise<number> {
  const [agg] = await tx
    .select({
      // deltas are negative debits; negate the sum to get coins spent.
      paid: sql<number>`COALESCE(-SUM(${pointEvents.delta}), 0)::int`,
    })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        eq(pointEvents.source, REPERTOIRE_VISIBILITY_SOURCE),
        eq(pointEvents.sourceId, repertoireId)
      )
    );
  return agg?.paid ?? 0;
}

/**
 * Charge the coins needed to set `repertoireId` to `target` visibility, for
 * `userId` (the owner). Only the INCREMENT above the coins already spent on
 * this repertoire's visibility is charged, so re-selecting a tier already paid
 * for is free (`charged: 0`, no ledger row). MUST run inside the same
 * `db.transaction()` as the `repertoires.status` update so the charge and the
 * state change commit atomically.
 *
 * The idempotency key encodes the target tier's FULL price, not the increment,
 * so two paths to the same max tier (e.g. public→private vs
 * public→followers→private) never write a duplicate row for the tier, and a
 * retry of the same change is absorbed by the UNIQUE index.
 */
export async function chargeRepertoireVisibility(
  tx: DbTx,
  params: { userId: string; repertoireId: string; target: RepertoireVisibility }
): Promise<ChargeRepertoireVisibilityResult> {
  const { userId, repertoireId, target } = params;

  const alreadyPaid = await readVisibilityPaid(tx, userId, repertoireId);
  const amount = repertoireVisibilityCharge(target, alreadyPaid);
  if (amount === 0) {
    return { ok: true, charged: 0 };
  }

  const tierPrice = REPERTOIRE_VISIBILITY_COST[target];
  const debit = await debitSpendable(tx, {
    userId,
    amount,
    source: REPERTOIRE_VISIBILITY_SOURCE,
    sourceId: repertoireId,
    metadata: { target, tierPrice },
    idempotencyKey: (category) =>
      `${REPERTOIRE_VISIBILITY_SOURCE}:${repertoireId}:${tierPrice}:${category}`,
    idempotent: true,
  });
  if (!debit.ok) {
    return { ok: false, error: 'insufficient_balance' };
  }
  return { ok: true, charged: amount };
}

/**
 * Coins the user has already spent unlocking `repertoireId`'s visibility (its
 * highest tier price reached) — for the owner-facing "change visibility" UI to
 * show the true incremental cost of each tier (`repertoireVisibilityCharge`).
 * Reads on the app `db` connection (no surrounding transaction needed for a
 * read the UI only displays).
 */
export function getRepertoireVisibilityPaid(userId: string, repertoireId: string): Promise<number> {
  return readVisibilityPaid(db, userId, repertoireId);
}
