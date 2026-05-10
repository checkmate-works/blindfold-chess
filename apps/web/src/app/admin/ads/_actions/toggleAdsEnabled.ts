'use server';

import { updateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, siteSettings } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

export async function toggleAdsEnabled(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'ads_enabled'))
    .limit(1);

  const currentEnabled = row ? (row.value as { enabled?: boolean }).enabled === true : false;

  await db
    .insert(siteSettings)
    .values({ key: 'ads_enabled', value: { enabled: !currentEnabled } })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: { enabled: !currentEnabled }, updatedAt: new Date() },
    });

  // Invalidate the unstable_cache-wrapped ads config. Each ISR page picks up
  // the change on its next natural revalidation cycle — a layout-wide
  // revalidatePath here would evict every ISR entry under [locale]/(public),
  // which previously caused a 305x ISR Writes spike on Vercel.
  updateTag('ads-config');

  return { success: true };
}
