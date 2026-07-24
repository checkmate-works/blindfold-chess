import { and, eq, inArray, sql } from 'drizzle-orm';
import 'server-only';

import { pointEvents, userPointBalances } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import { type PointCategory, SPENDABLE_CONSUME_ORDER } from './constants';

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

export type DebitSpendableInput = {
  userId: string;
  /** Total coins to consume. Must be a positive integer; the caller checks that. */
  amount: number;
  source: string;
  sourceId: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Build the `idempotency_key` for a given debited bucket. For a spend fully
   * covered by ONE category (e.g. cost 1) the returned key may ignore
   * `category` — the function is called exactly once. For a spend that spans
   * several buckets the key MUST vary by category, or the per-bucket rows
   * collide on the UNIQUE `idempotency_key` index.
   */
  idempotencyKey: (category: PointCategory) => string;
  /**
   * Route each per-bucket insert through the idempotency-aware path (a UNIQUE
   * conflict is swallowed and does not re-debit). Set for retry-safe spends
   * (Maia per-game charge, repertoire visibility). Leave false for spends
   * whose caller asserts a fresh key (ad_free redemption keys off a freshly
   * inserted redemption row id).
   */
  idempotent?: boolean;
};

export type DebitSpendableResult =
  | {
      ok: true;
      /** The requested `amount` (echoed for convenience). */
      charged: number;
      /** Ledger rows actually written this call (empty when every bucket no-oped). */
      pointEventIds: string[];
      /**
       * True when `idempotent` was set and EVERY bucket insert hit an existing
       * key (nothing was written / debited). Callers use it to report an
       * idempotent replay — e.g. Maia's `alreadyCharged`.
       */
      noop: boolean;
    }
  | { ok: false; error: 'insufficient_balance' };

/**
 * Consume `amount` spendable coins for one `userId`, walking
 * `SPENDABLE_CONSUME_ORDER` (`earned` → `promotional` → `purchased`) and
 * debiting each bucket in turn until the amount is covered, writing one
 * `point_events` row per bucket drawn from.
 *
 * The single shared "lock → confirm → walk-and-debit" mechanic behind every
 * consumption path — `redeemPointsForAdFree`, `consumeMaiaGamePoint`, and the
 * repertoire-visibility charge all differ only in the idempotency key they
 * build and how they interpret the result, not in how coins leave the wallet.
 *
 * MUST be called inside a `db.transaction()`: it takes `SELECT ... FOR UPDATE`
 * on the spendable balance rows (via {@link lockSpendableBalances}) so a
 * concurrent spend against the same user is serialized and no over-debit is
 * possible. The lock releases only when the caller's transaction commits.
 */
export async function debitSpendable(
  tx: DbTx,
  input: DebitSpendableInput
): Promise<DebitSpendableResult> {
  const { byCategory, totalAvailable } = await lockSpendableBalances(tx, input.userId);
  if (totalAvailable < input.amount) {
    return { ok: false, error: 'insufficient_balance' };
  }

  let remaining = input.amount;
  const pointEventIds: string[] = [];
  let anyInserted = false;

  for (const category of SPENDABLE_CONSUME_ORDER) {
    if (remaining === 0) break;
    const available = byCategory.get(category) ?? 0;
    if (available <= 0) continue;
    const take = Math.min(remaining, available);

    const movement = {
      userId: input.userId,
      delta: -take,
      category,
      source: input.source,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey(category),
      metadata: input.metadata,
    };
    const result = input.idempotent
      ? await recordPointMovement(tx, movement, { idempotent: true })
      : await recordPointMovement(tx, movement);

    if (result) {
      pointEventIds.push(result.pointEventId);
      anyInserted = true;
    }
    remaining -= take;
  }

  return { ok: true, charged: input.amount, pointEventIds, noop: !anyInserted };
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
 * clawback / admin-grant primitive in this package — those
 * primitives differ only in which arguments they build, not in how the
 * write hits the ledger.
 *
 * @design Idempotency-aware variant
 *
 * When called with `{ idempotent: true }`, a conflict on the UNIQUE
 * `idempotency_key` index is swallowed via `onConflictDoNothing` and the
 * function returns `null`. The balance upsert is *skipped* in that case
 * because the existing row already contributed its delta on the original
 * insert. Callers use this for retry-safe operations (UGC post grants
 * and clawbacks).
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
 * Sum the net `earned` points one `(user, source, sourceId)` triple has
 * produced — the original grant minus any clawback already applied (the
 * clawback row carries the same source/sourceId, so a second read after a
 * clawback returns 0). Used by `clawbackPointsForPost` to decide how much
 * to reverse.
 *
 * Returns `0` if the user has no `earned` rows for that source — never null.
 */
export async function readEarnedTotalForEntity(
  tx: DbTx,
  userId: string,
  source: string,
  sourceId: string
): Promise<number> {
  const [agg] = await tx
    .select({
      earnedTotal: sql<number>`COALESCE(SUM(${pointEvents.delta}), 0)::int`,
    })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        eq(pointEvents.source, source),
        eq(pointEvents.sourceId, sourceId),
        eq(pointEvents.category, 'earned')
      )
    );
  return agg?.earnedTotal ?? 0;
}

/**
 * Read the user's current `earned` balance under a row lock. The clawback
 * path uses this to cap a reversal at the coins still available — coins the
 * user has already spent are unrecoverable and the balance must not go
 * negative.
 *
 * Returns `0` when the user has no `earned` balance row yet.
 */
export async function readEarnedBalanceForUpdate(tx: DbTx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ balance: userPointBalances.balance })
    .from(userPointBalances)
    .where(and(eq(userPointBalances.userId, userId), eq(userPointBalances.category, 'earned')))
    .for('update');
  return row?.balance ?? 0;
}

/**
 * Lock the user's spendable balance rows (`SELECT ... FOR UPDATE` over
 * `SPENDABLE_CONSUME_ORDER`) and return them keyed by category alongside
 * the total. Shared by every consumption path (`redeemPointsForAdFree`,
 * `consumeMaiaGamePoint`) so the lock-and-sum lives in one place: the
 * `FOR UPDATE` serializes concurrent spends against the same user, after
 * which the caller walks `SPENDABLE_CONSUME_ORDER` to debit each bucket.
 *
 * Missing categories are simply absent from the map — `user_point_balances`
 * is sparse, a row exists only after the first nonzero delta.
 */
export async function lockSpendableBalances(
  tx: DbTx,
  userId: string
): Promise<{ byCategory: Map<PointCategory, number>; totalAvailable: number }> {
  const rows = await tx
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

  const byCategory = new Map<PointCategory, number>();
  for (const row of rows) {
    byCategory.set(row.category as PointCategory, row.balance);
  }
  const totalAvailable = SPENDABLE_CONSUME_ORDER.reduce(
    (sum, cat) => sum + (byCategory.get(cat) ?? 0),
    0
  );
  return { byCategory, totalAvailable };
}
