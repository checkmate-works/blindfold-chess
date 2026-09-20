'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { copyToTranslationRows } from '@/lib/ads/copy';
import { isAdKind } from '@/lib/ads/registry';
import { adCreativeTranslations, adCreatives, db } from '@/lib/db';
import { handleAdminActionError } from '@/lib/server-action-error';

import { requireAdmin } from '../../_lib/auth';
import { toAdCreativeColumns } from '../_lib/creative-columns';
import { revalidateAdCreatives } from '../_lib/revalidate';
import type { UpdateAdCreativeData } from '../_lib/validation';
import { validateUpdateAdCreative } from '../_lib/validation';

export async function updateAdCreative(
  id: string,
  data: UpdateAdCreativeData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  // Kind is immutable and drives field validation — read it from the row
  // rather than trusting the client (the slot/kind can't be changed on edit).
  const [row] = await db
    .select({ kind: adCreatives.kind })
    .from(adCreatives)
    .where(eq(adCreatives.id, id))
    .limit(1);
  if (!row) return { error: 'not found' };
  if (!isAdKind(row.kind)) return { error: 'invalid kind' };

  const validationError = validateUpdateAdCreative(row.kind, data);
  if (validationError) return { error: validationError };

  // `kind` comes back as the row's own, so the spread below cannot change it.
  const columns = toAdCreativeColumns(row.kind, data);

  try {
    // The form is the whole truth about the copy, so the translation rows
    // are replaced rather than merged: a locale the admin blanked out must
    // lose its row, or it would keep overriding `en`.
    await db.transaction(async (tx) => {
      await tx
        .update(adCreatives)
        .set({ ...columns, updatedAt: new Date() })
        .where(eq(adCreatives.id, id));
      await tx.delete(adCreativeTranslations).where(eq(adCreativeTranslations.creativeId, id));
      const copyRows = copyToTranslationRows(id, data);
      if (copyRows.length > 0) await tx.insert(adCreativeTranslations).values(copyRows);
    });

    revalidateAdCreatives();
    return { success: true };
  } catch (error) {
    return handleAdminActionError(error, '[updateAdCreative]', 'Failed to update ad creative');
  }
}
