'use server';

import { inArray } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { adCreatives, db } from '@/lib/db';
import { handleAdminActionError } from '@/lib/server-action-error';

import { requireAdmin } from '../../_lib/auth';
import { creativeIdsWithEnglishTitle } from '../_lib/creatives-by-title';
import { revalidateAdCreatives } from '../_lib/revalidate';
import { validateBulkCreativeHref } from '../_lib/validation';

/**
 * Set the link of every creative whose English title is `title` — one book's
 * rows across all the slots it runs in (see `groupCreativesByTitle` for why
 * the title is the key). Only `href` changes: whether each row is active, and
 * everything else about it, stays as it was.
 */
export async function setAdCreativeHrefByTitle(
  title: string,
  href: string
): Promise<ActionResult<{ updated: number }>> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;
  if (typeof title !== 'string' || title.length === 0) return { error: 'invalid title' };
  const hrefError = validateBulkCreativeHref(href);
  if (hrefError) return { error: hrefError };

  try {
    const updated = await db
      .update(adCreatives)
      .set({ href, updatedAt: new Date() })
      .where(inArray(adCreatives.id, creativeIdsWithEnglishTitle(title)))
      .returning({ id: adCreatives.id });
    if (updated.length === 0) return { error: 'not found' };

    revalidateAdCreatives();
    return { success: true, updated: updated.length };
  } catch (error) {
    return handleAdminActionError(
      error,
      '[setAdCreativeHrefByTitle]',
      'Failed to update ad creative links'
    );
  }
}
