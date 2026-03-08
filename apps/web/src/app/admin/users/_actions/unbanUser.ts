'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db, moderationActions, profiles, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { getClientIp } from './getClientIp';

type UnbanUserResult = { success: true } | { error: string };

export async function unbanUser(targetUserId: string): Promise<UnbanUserResult> {
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

  // 1. Read current bannedAt for rollback
  const [targetProfile] = await db
    .select({ bannedAt: profiles.bannedAt })
    .from(profiles)
    .where(eq(profiles.id, targetUserId))
    .limit(1);
  const originalBannedAt = targetProfile?.bannedAt ?? null;

  // 2. Unban at Supabase Auth level first (external API, can't be in DB transaction)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: 'none',
  });

  if (error) {
    console.error(`Failed to unban user ${targetUserId} at Supabase Auth level:`, error);
    return { error: 'failedToUnban' };
  }

  // 3. Clear ban info and record audit log atomically in a DB transaction
  const ipAddress = await getClientIp();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          bannedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, targetUserId));

      await tx.insert(moderationActions).values({
        actorId: user.id,
        action: 'unban',
        targetType: 'user',
        targetId: targetUserId,
        ipAddress,
      });
    });
  } catch {
    // Rollback Supabase Auth: re-ban the user, restoring original bannedAt
    await adminClient.auth.admin.updateUserById(targetUserId, {
      ban_duration: '876000h',
    });
    await db
      .update(profiles)
      .set({
        bannedAt: originalBannedAt,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, targetUserId));
    return { error: 'failedToUnban' };
  }

  revalidatePath('/admin/users');

  return { success: true };
}
