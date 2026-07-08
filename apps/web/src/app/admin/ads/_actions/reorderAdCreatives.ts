'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { isAdSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import { revalidateAdCreatives } from '../_lib/revalidate';

/**
 * Persist a new display order for a slot's creatives (set by drag-and-drop on
 * the slot page). `orderedIds` must be exactly the slot's creative ids, in the
 * desired order; each row's `sort_order` becomes its index. Rejected if the id
 * set doesn't match the slot's rows, so a stale client can't drop or duplicate
 * a creative.
 */
export async function reorderAdCreatives(
  slot: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;
  if (!isAdSlot(slot)) return { error: 'invalid slot' };

  const rows = await db
    .select({ id: adCreatives.id })
    .from(adCreatives)
    .where(eq(adCreatives.slot, slot));
  const slotIds = new Set(rows.map((r) => r.id));
  const uniqueOrdered = new Set(orderedIds);
  if (uniqueOrdered.size !== orderedIds.length) return { error: 'duplicate id' };
  if (orderedIds.length !== slotIds.size || !orderedIds.every((id) => slotIds.has(id))) {
    return { error: 'invalid order' };
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(adCreatives)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(adCreatives.id, orderedIds[i]));
    }
  });

  revalidateAdCreatives();
  return { success: true };
}
