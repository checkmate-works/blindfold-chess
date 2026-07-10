import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import { MAIA_GAME_POINT_COST, MAIA_GAME_SOURCE, SPENDABLE_CONSUME_ORDER } from './constants';
import { lockSpendableBalances, recordPointMovement } from './internal-ledger';

export type ConsumeMaiaGamePointResult =
  | { ok: true; alreadyCharged: boolean }
  | { ok: false; error: 'insufficient_balance' };

/**
 * Charge `MAIA_GAME_POINT_COST` confirmed points for one Maia game
 * (per-game billing — model B). Called at game-creation time for every
 * viewer — there is no subscription exemption.
 *
 * @design `clientGameId` anchors idempotency
 *
 * There is no `games` table — Maia games are not persisted — so the charge
 * cannot key off a server-side game id. The caller (client) generates a
 * UUID per game-start attempt and passes it here; the ledger row is keyed
 * `maia_game:<userId>:<clientGameId>`. The `userId` is part of the key on
 * purpose: `clientGameId` is fully client-controlled and
 * `point_events.idempotency_key` is globally UNIQUE, so a key of just
 * `maia_game:<clientGameId>` let one user replay another user's game id —
 * the pre-check (and the UNIQUE insert) would match the other user's row and
 * report `alreadyCharged`, so the second user played for free. Namespacing by
 * `userId` makes each (user, game) pair its own key and removes that
 * cross-user collision. A retried call (lost response, double click) reuses
 * the same UUID and is absorbed:
 *   1. An explicit pre-check on `idempotency_key` lets a retry succeed even
 *      when the balance has since dropped below the cost.
 *   2. The idempotent `recordPointMovement` insert closes the concurrent
 *      race (two requests, same UUID, neither committed yet) — the loser
 *      sees the UNIQUE conflict swallowed and reports `alreadyCharged`.
 *
 * @design Single-row debit
 *
 * `MAIA_GAME_POINT_COST` is 1, so exactly one bucket is debited: the first
 * non-empty category in `SPENDABLE_CONSUME_ORDER`. The balance rows are
 * locked `FOR UPDATE` so a concurrent redemption / Maia charge against the
 * same user is serialized and no over-debit is possible.
 */
export async function consumeMaiaGamePoint(
  userId: string,
  clientGameId: string
): Promise<ConsumeMaiaGamePointResult> {
  const idempotencyKey = `${MAIA_GAME_SOURCE}:${userId}:${clientGameId}`;

  return db.transaction(async (tx) => {
    // (1) Idempotency short-circuit — a retry of the same clientGameId must
    //     not re-charge, and must succeed regardless of the current balance.
    //     The key already embeds `userId`, so this only ever matches the
    //     caller's own prior charge.
    const existing = await tx
      .select({ id: pointEvents.id })
      .from(pointEvents)
      .where(eq(pointEvents.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing.length > 0) {
      return { ok: true, alreadyCharged: true };
    }

    // (2) Lock the spendable balance rows and confirm the user can cover it.
    const { byCategory, totalAvailable } = await lockSpendableBalances(tx, userId);
    if (totalAvailable < MAIA_GAME_POINT_COST) {
      return { ok: false, error: 'insufficient_balance' };
    }

    // (3) Debit the first non-empty bucket in priority order. Cost is 1, so
    //     a single ledger row covers it.
    const category = SPENDABLE_CONSUME_ORDER.find((cat) => (byCategory.get(cat) ?? 0) > 0);
    if (!category) {
      // Unreachable given the totalAvailable check above, but keeps the
      // type narrow without a non-null assertion.
      return { ok: false, error: 'insufficient_balance' };
    }

    const result = await recordPointMovement(
      tx,
      {
        userId,
        delta: -MAIA_GAME_POINT_COST,
        category,
        source: MAIA_GAME_SOURCE,
        sourceId: clientGameId,
        idempotencyKey,
        metadata: { reason: 'maia_game' },
      },
      { idempotent: true }
    );

    // `null` means a concurrent request with the same clientGameId won the
    // race and already charged — treat as an idempotent success.
    return { ok: true, alreadyCharged: result === null };
  });
}

/**
 * Whether the user has ever been charged a coin for a Maia game — i.e.
 * holds at least one `maia_game` ledger row. The Maia model-download
 * gate (`canUseMaia`) keys off this single fact; keeping the query here
 * keeps `point_events` access inside `@/lib/points`.
 */
export async function hasMaiaGameCharge(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: pointEvents.id })
    .from(pointEvents)
    .where(and(eq(pointEvents.userId, userId), eq(pointEvents.source, MAIA_GAME_SOURCE)))
    .limit(1);
  return rows.length > 0;
}
