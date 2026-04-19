'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import { db, userGrants } from '@/lib/db';

type ActionResult = { success: true } | { error: string };

export async function revokeGrant(grantId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  if (!grantId) {
    return { error: 'Grant ID is required' };
  }

  try {
    await db.update(userGrants).set({ revokedAt: new Date() }).where(eq(userGrants.id, grantId));

    revalidateTag('grant-status', { expire: 60 });
    // See `createGrant.ts` — the target user's `bfc_ads_hidden` cookie
    // cannot be updated from an admin action; it self-corrects on their
    // next authenticated page load or when the cookie TTL expires.
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke grant:', error);
    return { error: 'Failed to revoke grant' };
  }
}
