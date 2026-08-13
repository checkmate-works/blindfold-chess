'use server';

// eslint-disable-next-line no-restricted-imports -- BanButton has no router.refresh(); this revalidate is what re-renders the admin users surface with the new banned state
import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, profiles } from '@/lib/db';
import { logModerationAction } from '@/lib/moderation/audit';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { getClientIp } from '@/lib/security/client-ip';
import { createAdminClient } from '@/lib/supabase/admin';

import { requireAdmin } from '../../_lib/auth';

export async function banUser(targetUserId: string, reason: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  // Prevent admin from banning themselves
  if (targetUserId === auth.userId) {
    return { error: 'cannotBanSelf' };
  }

  const reasonResult = validateModerationReason(reason);
  if ('error' in reasonResult) {
    return reasonResult;
  }
  const trimmedReason = reasonResult.trimmed;

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

      await logModerationAction(tx, {
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
