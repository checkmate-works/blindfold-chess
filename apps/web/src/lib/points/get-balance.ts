import { eq } from 'drizzle-orm';
import 'server-only';

import { db, userPointBalances } from '@/lib/db';

import { POINT_CATEGORIES, type PointCategory } from './constants';

export type PointBalanceSummary = {
  /** Net spendable points (`earned + purchased + promotional`). */
  confirmed: number;
  /** Points awaiting maturation; not yet spendable. */
  pending: number;
  /** `confirmed + pending` — for the dashboard chip headline. */
  total: number;
  /** Per-category breakdown, useful for future redemption-rule splits. */
  byCategory: Record<PointCategory, number>;
};

/**
 * Read all `(user_id, category)` balance rows for the user and roll them up
 * into the summary the UI surfaces consume. Missing rows are treated as zero
 * — `user_point_balances` is sparse (rows are written on first nonzero delta).
 *
 * Reads only from the materialized cache — never from `point_events`. The
 * cache is kept honest by a future drift-detection job that recomputes from
 * the ledger and surfaces discrepancies.
 */
export async function getPointBalanceSummary(userId: string): Promise<PointBalanceSummary> {
  const rows = await db
    .select({
      category: userPointBalances.category,
      balance: userPointBalances.balance,
    })
    .from(userPointBalances)
    .where(eq(userPointBalances.userId, userId));

  const byCategory: Record<PointCategory, number> = {
    earned_pending: 0,
    earned: 0,
    purchased: 0,
    promotional: 0,
  };

  for (const row of rows) {
    if (isPointCategory(row.category)) {
      byCategory[row.category] = row.balance;
    }
  }

  const confirmed = byCategory.earned + byCategory.purchased + byCategory.promotional;
  const pending = byCategory.earned_pending;

  return {
    confirmed,
    pending,
    total: confirmed + pending,
    byCategory,
  };
}

function isPointCategory(v: string): v is PointCategory {
  return (POINT_CATEGORIES as readonly string[]).includes(v);
}
