'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, moderationActions, userGrants } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
import { getClientIp } from '@/lib/security/client-ip';
import { calcGrantStartsAt } from '@/lib/users/user-grants';

import { validateDurationDays, validateUuid } from '../_lib/validation';

export type BulkGrantParams = {
  userIds: string[];
  durationDays: number;
  reason: string;
};

type BulkGrantResult = { success: true; grantedCount: number } | { error: string };

export async function createBulkGrants(params: BulkGrantParams): Promise<BulkGrantResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  const { userIds, durationDays, reason } = params;

  if (!userIds || userIds.length === 0) {
    return { error: 'No users selected' };
  }

  for (const id of userIds) {
    const uuidError = validateUuid(id);
    if (uuidError) {
      return { error: uuidError };
    }
  }

  const durationError = validateDurationDays(durationDays);
  if (durationError) {
    return { error: durationError };
  }

  if (!reason || !reason.trim()) {
    return { error: 'Reason is required for bulk grants' };
  }

  const benefitType = 'ad_free';
  const grantType = 'admin_manual';
  const trimmedReason = reason.trim();
  const ipAddress = await getClientIp();

  try {
    type GrantCreatedInfo = { userId: string; grantId: string; expiresAt: Date };
    const result = await db.transaction(async (tx) => {
      const created: GrantCreatedInfo[] = [];

      for (const userId of userIds) {
        const startsAt = await calcGrantStartsAt(userId, benefitType, tx);
        const expiresAt = addDays(startsAt, durationDays);

        const [inserted] = await tx
          .insert(userGrants)
          .values({
            userId,
            benefitType,
            grantType,
            reason: trimmedReason,
            startsAt,
            expiresAt,
          })
          .returning({ id: userGrants.id });

        // One audit row per granted user keeps the (action, target_id) lookup
        // fast and lets `/admin/audit-log`'s user-filter find every grant a
        // given user has ever received. The grantId lives in metadata.
        await tx.insert(moderationActions).values({
          actorId: auth.userId,
          action: 'create_grant',
          targetType: 'user',
          targetId: userId,
          reason: trimmedReason,
          metadata: {
            grantId: inserted.id,
            grantType,
            benefitType,
            durationDays,
            expiresAt: expiresAt.toISOString(),
          },
          ipAddress,
        });

        created.push({ userId, grantId: inserted.id, expiresAt });
      }

      return { count: created.length, created };
    });

    revalidateTag('grant-status', { expire: 60 });

    for (const grant of result.created) {
      createNotification({
        userId: grant.userId,
        actorId: auth.userId,
        type: 'benefit_grant',
        targetType: 'user_grant',
        targetId: grant.grantId,
        metadata: {
          grantType: 'admin_manual',
          benefitType,
          durationDays,
          expiresAt: grant.expiresAt.toISOString(),
          reason: trimmedReason,
        },
      });
    }

    return { success: true, grantedCount: result.count };
  } catch (error) {
    console.error('Failed to create bulk grants:', error);
    return { error: 'Failed to create bulk grants' };
  }
}
