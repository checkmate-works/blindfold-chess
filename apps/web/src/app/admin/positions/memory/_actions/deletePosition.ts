'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import { db, positions } from '@/lib/db';

export async function deletePosition(id: string): Promise<DeleteResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Position ID is required' };
  }

  await db.update(positions).set({ deletedAt: new Date() }).where(eq(positions.id, id));

  revalidatePath('/admin/positions/memory');
  return { success: true };
}
