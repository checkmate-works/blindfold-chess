'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { AD_CREATIVES_CACHE_TAG } from '@/lib/ads/ad';
import { isAdKind } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
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

  // Kind is immutable and drives payload validation — read it from the row
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

  await db
    .update(adCreatives)
    .set({
      href: data.href,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      targetCountry: data.targetCountry,
      payload: data.payload,
      updatedAt: new Date(),
    })
    .where(eq(adCreatives.id, id));

  revalidatePath('/admin/ads');
  revalidateTag(AD_CREATIVES_CACHE_TAG, { expire: 60 });
  return { success: true };
}
