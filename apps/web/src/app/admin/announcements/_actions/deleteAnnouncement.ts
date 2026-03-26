'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { announcements, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  await db.delete(announcements).where(eq(announcements.id, id));

  revalidatePath('/admin/announcements');

  return { success: true };
}
