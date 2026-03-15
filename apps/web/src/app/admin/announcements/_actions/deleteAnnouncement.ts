'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

type DeleteResult = { success: true } | { error: string };

export async function deleteAnnouncement(id: string): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  await db.delete(announcements).where(eq(announcements.id, id));

  revalidatePath('/admin/announcements');

  return { success: true };
}
