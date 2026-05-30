import { desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';

import { ADMIN_GRANT_SOURCE } from './constants';
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
    source: ADMIN_GRANT_SOURCE,
    sourceId: grantId,
    idempotencyKey: `${ADMIN_GRANT_SOURCE}:${grantId}`,
    metadata,
  });

  return { pointEventId, grantId };
}

/** One admin-issued point grant as listed on `/admin/coins`. */
export type AdminPointGrantRow = {
  id: string;
  userId: string;
  delta: number;
  /** Moderator memo from `metadata.reason`, or `null` when none was given. */
  reason: string | null;
  createdAt: Date;
};

/** Count of admin-issued point grants — drives `/admin/coins` pagination. */
export async function countAdminPointGrants(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pointEvents)
    .where(eq(pointEvents.source, ADMIN_GRANT_SOURCE));
  return row?.count ?? 0;
}

/**
 * List admin-issued point grants, newest first. Keeps the `point_events`
 * schema encapsulated within `@/lib/points` — `/admin/coins` renders the
 * returned rows without reaching into the ledger table itself.
 */
export async function listAdminPointGrants(
  limit: number,
  offset: number
): Promise<AdminPointGrantRow[]> {
  const rows = await db
    .select({
      id: pointEvents.id,
      userId: pointEvents.userId,
      delta: pointEvents.delta,
      metadata: pointEvents.metadata,
      createdAt: pointEvents.createdAt,
    })
    .from(pointEvents)
    .where(eq(pointEvents.source, ADMIN_GRANT_SOURCE))
    .orderBy(desc(pointEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    delta: r.delta,
    reason: (r.metadata as { reason?: string | null } | null)?.reason ?? null,
    createdAt: r.createdAt,
  }));
}
