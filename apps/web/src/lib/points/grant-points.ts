import 'server-only';

import type { DbTx } from '@/lib/db/types';

import {
  POST_CREATION_POINTS,
  type PointPostEntity,
  buildIdempotencyKey,
  cappedCreationGrantAmount,
  sourceForEntity,
} from './constants';
import { creationEarnedToday } from './daily-cap';
import {
  readEarnedBalanceForUpdate,
  readEarnedTotalForEntity,
  recordPointMovement,
} from './internal-ledger';

export type PointGrantResult = {
  pointEventId: string;
  amount: number;
};

/**
 * Grant points for a newly created UGC post — immediately spendable.
 *
 * Points are credited directly to `category='earned'`; there is no
 * maturation hold. The caller MUST be inside `db.transaction()` so the
 * entity row and the ledger row commit atomically.
 *
 * @design Daily creation cap
 *
 * The award is clamped to the user's remaining `DAILY_CREATION_POINT_CAP`
 * headroom for the current UTC day (`cappedCreationGrantAmount`). A
 * normal contributor earns the full `POST_CREATION_POINTS`; once the cap
 * is reached the grant shrinks to a partial amount and finally to `0`,
 * at which point this returns `null` (no ledger row, no `/thanks`
 * detour). When the award is partial, the ledger row is stamped
 * `metadata.cappedDaily` so `/thanks` can explain the smaller number.
 *
 * The cap read is not locked, so two creates racing at the cap boundary
 * may together exceed it by at most one `POST_CREATION_POINTS`. That is
 * acceptable — creation is rate-limited and the cap is an economic
 * guard, not a hard financial limit; locking the whole ledger per create
 * would not be worth it.
 *
 * Idempotency is enforced at the DB layer by the UNIQUE constraint on
 * `point_events.idempotency_key` — a retried call for the same entity is a
 * safe no-op (the conflict is swallowed and `null` is returned).
 */
export async function grantPointsForPost(
  tx: DbTx,
  userId: string,
  entity: PointPostEntity
): Promise<PointGrantResult | null> {
  const earnedToday = await creationEarnedToday(tx, userId);
  const amount = cappedCreationGrantAmount(earnedToday);
  // Daily cap already reached — no grant, no ledger row.
  if (amount <= 0) return null;

  const result = await recordPointMovement(
    tx,
    {
      userId,
      delta: amount,
      category: 'earned',
      source: sourceForEntity(entity.type),
      sourceId: entity.id,
      idempotencyKey: buildIdempotencyKey('post_grant', entity),
      metadata: {
        entityType: entity.type,
        ...(amount < POST_CREATION_POINTS ? { cappedDaily: true } : {}),
      },
    },
    { idempotent: true }
  );

  if (!result) return null;
  return { pointEventId: result.pointEventId, amount };
}

/**
 * Reverse a post's point grant when a **moderator / admin** removes the
 * post. This is NOT called for user self-deletion — users keep the coins
 * they earned for their own contributions even if they later delete them.
 *
 * @design Capped at the live `earned` balance
 *
 * Coins the user has already spent are unrecoverable, and
 * `user_point_balances` must never go negative. So the reversal is
 * `min(grantedNet, currentEarnedBalance)`: if the user already spent the
 * grant, this is a best-effort no-op.
 *
 * Idempotent: the offsetting row carries its own `post_clawback`
 * idempotency key, so a retried removal is a safe no-op. Also a no-op when
 * the grant was already clawed back (net `earned` for the source is 0).
 */
export async function clawbackPointsForPost(
  tx: DbTx,
  userId: string,
  entity: PointPostEntity
): Promise<void> {
  const source = sourceForEntity(entity.type);

  const grantedNet = await readEarnedTotalForEntity(tx, userId, source, entity.id);
  if (grantedNet <= 0) return;

  const earnedBalance = await readEarnedBalanceForUpdate(tx, userId);
  const clawAmount = Math.min(grantedNet, Math.max(0, earnedBalance));
  if (clawAmount <= 0) return;

  await recordPointMovement(
    tx,
    {
      userId,
      delta: -clawAmount,
      category: 'earned',
      source,
      sourceId: entity.id,
      idempotencyKey: buildIdempotencyKey('post_clawback', entity),
      metadata: { entityType: entity.type, reason: 'post_removed' },
    },
    { idempotent: true }
  );
}
