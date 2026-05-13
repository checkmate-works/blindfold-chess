import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';

import { type PointPostEntity, buildIdempotencyKey } from './constants';

/**
 * Look up the `point_events` row created by a successful UGC post grant.
 * Used by the Thanks page to confirm the grant exists and is owned by the
 * caller before rendering celebration copy.
 *
 * Returns `null` if the row does not exist or belongs to a different user.
 */
export async function getPostGrantForEntity(
  userId: string,
  entity: PointPostEntity
): Promise<{ id: string; amount: number; createdAt: Date } | null> {
  const idempotencyKey = buildIdempotencyKey('post_grant', entity);

  const [row] = await db
    .select({
      id: pointEvents.id,
      userId: pointEvents.userId,
      amount: pointEvents.delta,
      createdAt: pointEvents.createdAt,
    })
    .from(pointEvents)
    .where(and(eq(pointEvents.idempotencyKey, idempotencyKey), eq(pointEvents.userId, userId)))
    .limit(1);

  if (!row) {
    return null;
  }

  return { id: row.id, amount: row.amount, createdAt: row.createdAt };
}
