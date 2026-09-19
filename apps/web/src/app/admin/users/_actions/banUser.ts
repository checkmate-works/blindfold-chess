'use server';

// eslint-disable-next-line no-restricted-imports -- BanButton has no router.refresh(); this revalidate is what re-renders the admin users surface with the new banned state
import { revalidatePath, revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { cancelAllActiveSubscriptions } from '@/lib/billing/cancel-subscriptions';
import { profileCacheTag } from '@/lib/cache-tags';
import { db, profiles } from '@/lib/db';
import { logModerationAction } from '@/lib/moderation/audit';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { getClientIp } from '@/lib/security/client-ip';
import { handleAdminActionError } from '@/lib/server-action-error';
import { createAdminClient } from '@/lib/supabase/admin';

import type { AdminActionResult } from '../../_lib/action-errors';
import { requireAdmin } from '../../_lib/auth';

type BanUserError =
  | 'unauthorized'
  | 'cannotBanSelf'
  | 'reasonRequired'
  | 'reasonTooLong'
  | 'failedToBan'
  | 'bannedButSubscriptionNotCanceled';

/**
 * Ban a user: block them at Supabase Auth, flag the profile, record the audit
 * entry, then cancel any Stripe subscription they hold.
 *
 * The subscription is canceled **immediately** and **after** the ban has
 * committed, in that order on purpose. A banned user cannot reach the
 * subscription page (the `(protected)` layout sends them to `/banned`) and the
 * billing actions reject them, so a subscription left running would keep
 * charging for a service they can no longer use, with no self-service way to
 * stop it. Canceling first would risk the opposite failure: a Stripe call that
 * succeeds followed by a ban that does not, leaving a paying user unbanned
 * with their plan revoked. So the ban lands first, and a Stripe failure is
 * reported as `bannedButSubscriptionNotCanceled` rather than rolled back: the
 * moderation outcome stands, and the operator is told to finish the
 * cancellation in the Stripe dashboard. Unbanning does not restore the plan;
 * the user subscribes again if they wish.
 */
export async function banUser(
  targetUserId: string,
  reason: string
): Promise<AdminActionResult<BanUserError>> {
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
    return handleAdminActionError(
      error,
      `[banUser] Supabase Auth ban ${targetUserId}`,
      'failedToBan'
    );
  }

  // 2. Update profile and record audit log atomically in a DB transaction
  const ipAddress = await getClientIp();
  let bannedUsername: string | undefined;
  try {
    bannedUsername = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(profiles)
        .set({
          bannedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, targetUserId))
        .returning({ username: profiles.username });

      await logModerationAction(tx, {
        actorId: auth.userId,
        action: 'ban',
        targetType: 'user',
        targetId: targetUserId,
        reason: trimmedReason,
        ipAddress,
      });

      return updated?.username;
    });
  } catch (error) {
    // Report before rolling back: the rollback is itself an external call
    // that can throw, and losing the original cause would leave a user banned
    // at the auth level with no profile row or audit entry explaining it.
    const failure = handleAdminActionError(
      error,
      `[banUser] ban state for ${targetUserId}`,
      'failedToBan'
    );
    // Rollback Supabase Auth ban if DB transaction fails
    await adminClient.auth.admin.updateUserById(targetUserId, {
      ban_duration: 'none',
    });
    return failure;
  }

  // A ban does not change the cached public-profile projection, but every
  // writer of `profiles` expires that row's tag — see `profileCacheTag`.
  if (bannedUsername) {
    revalidateTag(profileCacheTag(bannedUsername), { expire: 0 });
  }

  revalidatePath('/admin/users');

  try {
    await cancelAllActiveSubscriptions(targetUserId);
  } catch (error) {
    return handleAdminActionError(
      error,
      `[banUser] cancel subscriptions for ${targetUserId}`,
      'bannedButSubscriptionNotCanceled'
    );
  }

  return { success: true };
}
