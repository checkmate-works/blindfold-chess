'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db, moderationActions, profiles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

import { requireAdmin } from '../../_lib/auth';
import { getClientIp } from './getClientIp';

type BanUserResult = { success: true } | { error: string };

export async function banUser(targetUserId: string, reason: string): Promise<BanUserResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  // Prevent admin from banning themselves
  if (targetUserId === auth.userId) {
    return { error: 'cannotBanSelf' };
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: 'reasonRequired' };
  }

  if (trimmedReason.length > 1000) {
    return { error: 'reasonTooLong' };
  }

  // 1. Ban at Supabase Auth level first (external API, can't be in DB transaction)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: '876000h',
  });

  if (error) {
    return { error: 'failedToBan' };
  }

  // 2. Update profile and record audit log atomically in a DB transaction
  const ipAddress = await getClientIp();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          bannedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, targetUserId));

      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: 'ban',
        targetType: 'user',
        targetId: targetUserId,
        reason: trimmedReason,
        ipAddress,
      });
    });
  } catch {
    // Rollback Supabase Auth ban if DB transaction fails
    await adminClient.auth.admin.updateUserById(targetUserId, {
      ban_duration: 'none',
    });
    return { error: 'failedToBan' };
  }

  revalidatePath('/admin/users');

  return { success: true };
}
