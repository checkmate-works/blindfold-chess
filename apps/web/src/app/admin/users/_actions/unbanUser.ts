'use server';

// eslint-disable-next-line no-restricted-imports -- UnbanButton has no router.refresh(); this revalidate is what re-renders the admin users surface with the cleared ban
import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { profileCacheTag } from '@/lib/cache-tags';
import { db, profiles } from '@/lib/db';
import { logModerationAction } from '@/lib/moderation/audit';
import { getClientIp } from '@/lib/security/client-ip';
import { handleAdminActionError } from '@/lib/server-action-error';
import { createAdminClient } from '@/lib/supabase/admin';

import type { AdminActionResult } from '../../_lib/action-errors';
import { requireAdmin } from '../../_lib/auth';

type UnbanUserError = 'unauthorized' | 'failedToUnban';

export async function unbanUser(targetUserId: string): Promise<AdminActionResult<UnbanUserError>> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  // 1. Read current bannedAt for rollback
  const [targetProfile] = await db
    .select({ bannedAt: profiles.bannedAt, username: profiles.username })
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
    return handleAdminActionError(
      error,
      `[unbanUser] Supabase Auth unban ${targetUserId}`,
      'failedToUnban'
    );
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

      await logModerationAction(tx, {
        actorId: auth.userId,
        action: 'unban',
        targetType: 'user',
        targetId: targetUserId,
        ipAddress,
      });
    });
  } catch (error) {
    // Report before rolling back, for the reason spelled out in `banUser`:
    // the rollback is itself an external call that can throw.
    const failure = handleAdminActionError(
      error,
      `[unbanUser] cleared ban state for ${targetUserId}`,
      'failedToUnban'
    );
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
    return failure;
  }

  // An unban does not change the cached public-profile projection, but every
  // writer of `profiles` expires that row's tag — see `profileCacheTag`.
  if (targetProfile) {
    revalidateTag(profileCacheTag(targetProfile.username), { expire: 0 });
  }

  revalidatePath('/admin/users');

  return { success: true };
}
