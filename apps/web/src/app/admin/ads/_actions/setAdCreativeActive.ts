'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { isPlaceholderAdHref } from '@/lib/ads/placeholder';
import { adCreatives, db } from '@/lib/db';
import { handleAdminActionError } from '@/lib/server-action-error';

import { requireAdmin } from '../../_lib/auth';
import { revalidateAdCreatives } from '../_lib/revalidate';

/**
 * Flip a creative's active flag directly from the slot list (no full edit).
 * Deactivated creatives stay in the pool but are filtered out of the live
 * `getActiveCreatives` query.
 *
 * Turning one on is refused while its href is still a seeded placeholder —
 * see `@/lib/ads/placeholder` for why that is a write-time rule and not a
 * read-time filter. Turning one off is never refused: whatever state a row is
 * in, stopping it must always be available.
 */
export async function setAdCreativeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  try {
    if (isActive) {
      const [row] = await db
        .select({ href: adCreatives.href })
        .from(adCreatives)
        .where(eq(adCreatives.id, id))
        .limit(1);
      if (!row) return { error: 'not found' };
      if (isPlaceholderAdHref(row.href)) return { error: 'href is still the placeholder' };
    }

    const result = await db
      .update(adCreatives)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(adCreatives.id, id))
      .returning({ id: adCreatives.id });
    if (result.length === 0) return { error: 'not found' };

    revalidateAdCreatives();
    return { success: true };
  } catch (error) {
    return handleAdminActionError(error, '[setAdCreativeActive]', 'Failed to update ad creative');
  }
}
