import { randomUUID } from 'node:crypto';
import 'server-only';

import type { DbTx } from '@/lib/db/types';

import { recordPointMovement } from './internal-ledger';

export type AdminGrantResult = {
  pointEventId: string;
  /** UUID used to anchor the ledger row's idempotency key. Surface this in
   *  the `moderation_actions.metadata.grantId` field so the audit log can
   *  point back at the originating `point_events` row in either direction. */
  grantId: string;
};

/**
 * Issue a point grant from the admin surface — immediately spendable.
 * Writes directly to `category='promotional'`; promotional points spend on
 * the same footing as `earned`, the category just preserves provenance (an
 * admin / campaign grant rather than a UGC contribution).
 *
 * The caller MUST be inside `db.transaction()` so the ledger insert,
 * balance upsert, and admin-side audit-log row commit atomically.
 *
 * @param tx       Drizzle transaction client.
 * @param userId   The user receiving the points.
 * @param amount   Strictly positive integer. Caller is responsible for the
 *                 sign check — this primitive accepts only positive deltas
 *                 (negative admin adjustments would be a separate action).
 * @param metadata Free-form context persisted on the ledger row (admin's
 *                 reason memo, campaign id, etc.). The shape is open by
 *                 design so admin tooling can evolve without a schema
 *                 migration.
 */
export async function grantAdminPoints(
  tx: DbTx,
  userId: string,
  amount: number,
  metadata: Record<string, unknown> = {}
): Promise<AdminGrantResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`grantAdminPoints: amount must be a positive integer (got ${amount})`);
  }

  const grantId = randomUUID();

  // Non-idempotent variant: the idempotency key is anchored on a freshly
  // generated UUID so a UNIQUE conflict here would indicate a serious bug
  // (UUID collision or programmer error) — let it throw rather than
  // silently swallow the insert.
  const { pointEventId } = await recordPointMovement(tx, {
    userId,
    delta: amount,
    category: 'promotional',
    source: 'admin_grant',
    sourceId: grantId,
    idempotencyKey: `admin_grant:${grantId}`,
    metadata,
  });

  return { pointEventId, grantId };
}
