'use server';

import { inArray } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { adCreatives, db } from '@/lib/db';
import { handleAdminActionError } from '@/lib/server-action-error';

import { requireAdmin } from '../../_lib/auth';
import { creativeIdsWithEnglishTitle } from '../_lib/creatives-by-title';
import { revalidateAdCreatives } from '../_lib/revalidate';
import { validateBulkActivation } from '../_lib/validation';

/**
 * Switch every creative whose English title is `title` on or off — one
 * book's rows across all the slots it runs in, the active-flag twin of
 * `setAdCreativeHrefByTitle`. Only `is_active` changes.
 *
 * Switching on is refused while any of the rows is still on the placeholder
 * link (see `validateBulkActivation`). Switching off is never refused:
 * whatever state the rows are in, stopping a book must always be available.
 */
export async function setAdCreativeActiveByTitle(
  title: string,
  isActive: boolean
): Promise<ActionResult<{ updated: number }>> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;
  if (typeof title !== 'string' || title.length === 0) return { error: 'invalid title' };
  if (typeof isActive !== 'boolean') return { error: 'invalid isActive' };

  try {
    const matching = creativeIdsWithEnglishTitle(title);
    if (isActive) {
      const rows = await db
        .select({ href: adCreatives.href })
        .from(adCreatives)
        .where(inArray(adCreatives.id, matching));
      const activationError = validateBulkActivation(rows.map((row) => row.href));
      if (activationError) return { error: activationError };
    }

    const updated = await db
      .update(adCreatives)
      .set({ isActive, updatedAt: new Date() })
      .where(inArray(adCreatives.id, matching))
      .returning({ id: adCreatives.id });
    if (updated.length === 0) return { error: 'not found' };

    revalidateAdCreatives();
    return { success: true, updated: updated.length };
  } catch (error) {
    return handleAdminActionError(
      error,
      '[setAdCreativeActiveByTitle]',
      'Failed to update ad creatives'
    );
  }
}
