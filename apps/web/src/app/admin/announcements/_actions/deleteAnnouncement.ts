'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { announcements, db, userRoles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type DeleteResult = { success: true } | { error: string };

export async function deleteAnnouncement(id: string): Promise<DeleteResult> {
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

  await db.delete(announcements).where(eq(announcements.id, id));

  revalidatePath('/admin/announcements');

  return { success: true };
}
