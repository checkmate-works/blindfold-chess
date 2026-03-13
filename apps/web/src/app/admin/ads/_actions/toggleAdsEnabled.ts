'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db, siteSettings, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type ToggleResult = { success: true } | { error: string };

export async function toggleAdsEnabled(): Promise<ToggleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'unauthorized' };
  }

  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!userRole || userRole.role !== 'admin') {
    return { error: 'unauthorized' };
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

  revalidateTag('ads-config', 'max');

  return { success: true };
}
