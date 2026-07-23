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

/**
 * Outcome of a creation grant attempt.
 *
 * - `granted` — coins were credited. `cappedDaily` is true when the daily
 *   cap trimmed the award to a partial (but still positive) amount.
 * - `capped` — the daily cap is already exhausted, so nothing was credited
 *   (the user earned 0 today). Kept distinct from `skipped` so callers can
 *   tell the author the CAP — not ineligibility — is why they earned nothing.
 * - `skipped` — no grant for a non-cap reason (an idempotent retry).
 */
export type PointGrantOutcome =
  | { status: 'granted'; pointEventId: string; amount: number; cappedDaily: boolean }
  | { status: 'capped' }
  | { status: 'skipped' };

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
 * at which point this returns `{ status: 'capped' }` (no ledger row). When
 * the award is partial, the ledger row is stamped `metadata.cappedDaily`
 * and `cappedDaily: true` is returned so the caller can warn the author the
 * cap trimmed their reward.
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
): Promise<PointGrantOutcome> {
  const earnedToday = await creationEarnedToday(tx, userId);
  const amount = cappedCreationGrantAmount(earnedToday);
  if (amount <= 0) return { status: 'capped' };

  const cappedDaily = amount < POST_CREATION_POINTS;
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
        ...(cappedDaily ? { cappedDaily: true } : {}),
      },
    },
    { idempotent: true }
  );

  if (!result) return { status: 'skipped' };
  return { status: 'granted', pointEventId: result.pointEventId, amount, cappedDaily };
}

/**
 * Reverse a post's creation point grant when the post is removed. Called
 * by **both** the author's own delete flows (`deletePuzzle` /
 * `deletePosition` / `deletePost`) and moderator / admin removal — a
 * removed contribution loses its grant either way.
 *
 * @design Capped at the live `earned` balance
 *
 * Coins the user has already spent are unrecoverable, and
 * `user_point_balances` must never go negative. So the reversal is
 * `min(grantedNet, currentEarnedBalance)`: if the user already spent the
 * grant this is a best-effort no-op, and a self-deletion can never land
 * the author in a negative balance / debt.
 *
 * Idempotent: the offsetting row carries its own `post_clawback`
 * idempotency key, so a retried removal — or an admin removal of a post
 * the author already self-deleted — is a safe no-op. Also a no-op when
 * the grant was already clawed back (net `earned` for the source is 0).
 *
 * A `null` `userId` (the author was anonymised — account purged, so their
 * ledger is already cascade-removed) is likewise a no-op, so callers that hold
 * a nullable author id do not need to guard the call themselves.
 */
export async function clawbackPointsForPost(
  tx: DbTx,
  userId: string | null,
  entity: PointPostEntity
): Promise<void> {
  if (!userId) return;

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
