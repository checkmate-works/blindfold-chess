import 'server-only';

import type { DbTx } from '@/lib/db/types';

import { type PointPostEntity, buildIdempotencyKey, sourceForEntity } from './constants';
import {
  readEarnedBalanceForUpdate,
  readEarnedTotalForEntity,
  recordPointMovement,
} from './internal-ledger';

/**
 * Reverse a post's creation point grant when the post is removed. Called
 * by **both** the author's own delete flows (`deletePuzzle` /
 * `deletePosition` / `deletePost`) and moderator / admin removal — a
 * removed contribution loses its grant either way.
 *
 * The grants themselves were retired in 2026-08 (likes are the only
 * self-serve faucet now — see `POINT_SOURCES`), so for anything created
 * since, this finds no grant and returns at the first read. It stays because
 * the grants already paid out are still spendable, and deleting the content
 * that earned one must still take it back.
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
