import { and, eq, sql } from 'drizzle-orm';
import 'server-only';

import { pointEvents, userPointBalances } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import type { PointCategory } from './constants';

/**
 * Apply a signed delta to `user_point_balances` for `(userId, category)`.
 * Creates the row on first touch; subsequent calls update in place. The
 * UPDATE path uses `balance + delta` so concurrent inserts compose
 * additively.
 *
 * Exported only for use within `@/lib/points`. External callers should
 * write ledger rows via `recordPointMovement` (or one of the higher-level
 * primitives that wraps it), which keeps the cache in sync automatically.
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

export type RecordPointMovementInput = {
  userId: string;
  delta: number;
  category: PointCategory;
  source: string;
  sourceId: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

/**
 * Append one `point_events` row and, on success, fold its delta into the
 * materialized `user_point_balances` cache for the same
 * `(userId, category)`. The single unit of work shared by every grant /
 * clawback / maturation / admin-grant primitive in this package — those
 * primitives differ only in which arguments they build, not in how the
 * write hits the ledger.
 *
 * @design Idempotency-aware variant
 *
 * When called with `{ idempotent: true }`, a conflict on the UNIQUE
 * `idempotency_key` index is swallowed via `onConflictDoNothing` and the
 * function returns `null`. The balance upsert is *skipped* in that case
 * because the existing row already contributed its delta on the original
 * insert. Callers use this for retry-safe operations (UGC post grants,
 * clawbacks, maturation runs).
 *
 * When called without that option (the default), a UNIQUE conflict is
 * unexpected and propagates — the caller is asserting that the
 * idempotency key is fresh (admin grants, the consuming ledger rows in a
 * redemption). The return type is non-nullable in this branch via the
 * TypeScript overload.
 */
export async function recordPointMovement(
  tx: DbTx,
  input: RecordPointMovementInput,
  opts: { idempotent: true }
): Promise<{ pointEventId: string } | null>;
export async function recordPointMovement(
  tx: DbTx,
  input: RecordPointMovementInput,
  opts?: { idempotent?: false }
): Promise<{ pointEventId: string }>;
export async function recordPointMovement(
  tx: DbTx,
  input: RecordPointMovementInput,
  opts: { idempotent?: boolean } = {}
): Promise<{ pointEventId: string } | null> {
  const values = {
    userId: input.userId,
    delta: input.delta,
    category: input.category,
    source: input.source,
    sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata ?? {},
  };

  const insert = opts.idempotent
    ? tx.insert(pointEvents).values(values).onConflictDoNothing({
        target: pointEvents.idempotencyKey,
      })
    : tx.insert(pointEvents).values(values);

  const inserted = await insert.returning({ id: pointEvents.id });

  if (inserted.length === 0) {
    // Idempotent conflict — the original row already moved the balance, so
    // we must NOT upsert again. Caller treats `null` as a safe no-op.
    return null;
  }

  await upsertBalance(tx, input.userId, input.category, input.delta);
  return { pointEventId: inserted[0].id };
}

/**
 * Sum the live `earned_pending` balance for one `(user, source, sourceId)`
 * triple. Shared by the clawback path (decide whether to write an
 * offsetting row) and the maturation path (decide how much to vest), both
 * of which need the post-clawback live total rather than the original
 * grant amount.
 *
 * Returns `0` if the user has no pending rows for that source — never
 * negative, never null.
 */
export async function readPendingTotalForEntity(
  tx: DbTx,
  userId: string,
  source: string,
  sourceId: string
): Promise<number> {
  const [agg] = await tx
    .select({
      pendingTotal: sql<number>`COALESCE(SUM(${pointEvents.delta}), 0)::int`,
    })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        eq(pointEvents.source, source),
        eq(pointEvents.sourceId, sourceId),
        eq(pointEvents.category, 'earned_pending')
      )
    );
  return agg?.pendingTotal ?? 0;
}
