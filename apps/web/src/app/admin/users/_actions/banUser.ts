'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db, moderationActions, profiles, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { getClientIp } from './getClientIp';

type BanUserResult = { success: true } | { error: string };

export async function banUser(targetUserId: string, reason: string): Promise<BanUserResult> {
  // Verify the requesting user is an admin
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

  // Prevent admin from banning themselves
  if (targetUserId === user.id) {
    return { error: 'cannotBanSelf' };
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: 'reasonRequired' };
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
        actorId: user.id,
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
