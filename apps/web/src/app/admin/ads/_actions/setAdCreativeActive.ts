'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { adCreatives, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import { revalidateAdCreatives } from '../_lib/revalidate';

/**
 * Flip a creative's active flag directly from the slot list (no full edit).
 * Deactivated creatives stay in the pool but are filtered out of the live
 * `getActiveCreatives` query.
 */
export async function setAdCreativeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  const result = await db
    .update(adCreatives)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(adCreatives.id, id))
    .returning({ id: adCreatives.id });
  if (result.length === 0) return { error: 'not found' };

  revalidateAdCreatives();
  return { success: true };
}
