import { and, eq, sql } from 'drizzle-orm';
import 'server-only';

import { pointEvents } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import {
  POST_CREATION_POINTS,
  type PointPostEntity,
  buildIdempotencyKey,
  sourceForEntity,
} from './constants';
import { upsertBalance } from './internal-balance';

export type PointGrantResult = {
  pointEventId: string;
  amount: number;
};

/**
 * Insert a pending point grant for a newly created UGC post within an
 * ongoing transaction. The caller MUST be inside `db.transaction()` so the
 * entity row and ledger row commit atomically.
 *
 * Idempotency is enforced at the DB layer by the UNIQUE constraint on
 * `point_events.idempotency_key` — a retried call for the same entity is a
 * safe no-op (the conflict is swallowed and the existing row is returned).
 *
 * The materialized `user_point_balances` row is upserted in the same
 * transaction. Concurrent grants for the same user/category are serialized
 * by the row-level conflict path (`ON CONFLICT ... DO UPDATE`), which takes
 * a per-row exclusive lock.
 */
export async function grantPendingPointsForPost(
  tx: DbTx,
  userId: string,
  entity: PointPostEntity
): Promise<PointGrantResult | null> {
  const idempotencyKey = buildIdempotencyKey('post_grant', entity);
  const source = sourceForEntity(entity.type);

  const inserted = await tx
    .insert(pointEvents)
    .values({
      userId,
      delta: POST_CREATION_POINTS,
      category: 'earned_pending',
      source,
      sourceId: entity.id,
      idempotencyKey,
      metadata: { entityType: entity.type },
    })
    .onConflictDoNothing({ target: pointEvents.idempotencyKey })
    .returning({ id: pointEvents.id });

  // Conflict path: an idempotent retry. Treat as a no-op rather than
  // double-incrementing the balance.
  if (inserted.length === 0) {
    return null;
  }

  await upsertBalance(tx, userId, 'earned_pending', POST_CREATION_POINTS);

  return { pointEventId: inserted[0].id, amount: POST_CREATION_POINTS };
}

/**
 * Reverse a pending grant when the source entity is deleted before
 * maturation. Computes the live pending net for `(source, sourceId)` and,
 * if positive, inserts an offsetting negative row plus updates the cache.
 *
 * Idempotent: the offsetting row has its own UNIQUE idempotency key, so a
 * retried delete is a safe no-op. Also no-op when the original grant
 * already matured (pending net = 0) — confirmed points are intentionally
 * preserved past the maturation window even on later deletion.
 */
export async function clawbackPendingPointsForPost(
  tx: DbTx,
  userId: string,
  entity: PointPostEntity
): Promise<void> {
  const source = sourceForEntity(entity.type);

  const [agg] = await tx
    .select({
      pendingTotal: sql<number>`COALESCE(SUM(${pointEvents.delta}), 0)::int`,
    })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.userId, userId),
        eq(pointEvents.source, source),
        eq(pointEvents.sourceId, entity.id),
        eq(pointEvents.category, 'earned_pending')
      )
    );

  const pendingTotal = agg?.pendingTotal ?? 0;
  if (pendingTotal <= 0) {
    return;
  }

  const idempotencyKey = buildIdempotencyKey('post_clawback', entity);

  const inserted = await tx
    .insert(pointEvents)
    .values({
      userId,
      delta: -pendingTotal,
      category: 'earned_pending',
      source,
      sourceId: entity.id,
      idempotencyKey,
      metadata: { entityType: entity.type, reason: 'post_deleted' },
    })
    .onConflictDoNothing({ target: pointEvents.idempotencyKey })
    .returning({ id: pointEvents.id });

  if (inserted.length === 0) {
    return;
  }

  await upsertBalance(tx, userId, 'earned_pending', -pendingTotal);
}
