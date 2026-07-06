'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { AD_CREATIVES_CACHE_TAG } from '@/lib/ads/ad';
import { isNativeCardPayload } from '@/lib/ads/payload';
import { adCreatives, db } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

import { requireAdmin } from '../../_lib/auth';
import { AD_CREATIVES_BUCKET, storagePathFromPublicUrl } from '../_lib/storage';

export async function deleteAdCreative(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const [row] = await db.select().from(adCreatives).where(eq(adCreatives.id, id)).limit(1);
  if (!row) return { error: 'not found' };

  // Delete the DB row first (authoritative), then best-effort clean up an
  // uploaded avatar from Storage — same ordering as the article-images flow.
  await db.delete(adCreatives).where(eq(adCreatives.id, id));

  if (isNativeCardPayload(row.payload) && row.payload.avatarImagePath) {
    const storagePath = storagePathFromPublicUrl(row.payload.avatarImagePath);
    if (storagePath) {
      const supabase = createAdminClient();
      const { error } = await supabase.storage.from(AD_CREATIVES_BUCKET).remove([storagePath]);
      if (error) {
        console.warn('ad-creatives: orphan avatar left in storage', storagePath, error);
      }
    }
  }

  revalidatePath('/admin/ads');
  revalidateTag(AD_CREATIVES_CACHE_TAG, { expire: 60 });
  return { success: true };
}
