import 'server-only';

import type { DbTx } from '@/lib/db/types';

import {
  POST_CREATION_POINTS,
  type PointPostEntity,
  buildIdempotencyKey,
  sourceForEntity,
} from './constants';
import { readPendingTotalForEntity, recordPointMovement } from './internal-ledger';

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
 * safe no-op (the conflict is swallowed and `null` is returned).
 */
export async function grantPendingPointsForPost(
  tx: DbTx,
  userId: string,
  entity: PointPostEntity
): Promise<PointGrantResult | null> {
  const result = await recordPointMovement(
    tx,
    {
      userId,
      delta: POST_CREATION_POINTS,
      category: 'earned_pending',
      source: sourceForEntity(entity.type),
      sourceId: entity.id,
      idempotencyKey: buildIdempotencyKey('post_grant', entity),
      metadata: { entityType: entity.type },
    },
    { idempotent: true }
  );

  if (!result) return null;
  return { pointEventId: result.pointEventId, amount: POST_CREATION_POINTS };
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

  const pendingTotal = await readPendingTotalForEntity(tx, userId, source, entity.id);
  if (pendingTotal <= 0) return;

  await recordPointMovement(
    tx,
    {
      userId,
      delta: -pendingTotal,
      category: 'earned_pending',
      source,
      sourceId: entity.id,
      idempotencyKey: buildIdempotencyKey('post_clawback', entity),
      metadata: { entityType: entity.type, reason: 'post_deleted' },
    },
    { idempotent: true }
  );
}
