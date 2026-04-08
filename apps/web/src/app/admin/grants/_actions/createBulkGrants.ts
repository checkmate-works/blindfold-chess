'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, userGrants } from '@/lib/db';
import { calcGrantStartsAt } from '@/lib/user-grants';

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

  try {
    const grantedCount = await db.transaction(async (tx) => {
      let count = 0;

      for (const userId of userIds) {
        const startsAt = await calcGrantStartsAt(userId, benefitType, tx);
        const expiresAt = addDays(startsAt, durationDays);

        await tx.insert(userGrants).values({
          userId,
          benefitType,
          grantType,
          reason: reason.trim(),
          startsAt,
          expiresAt,
        });

        count++;
      }

      return count;
    });

    revalidateTag('grant-status', { expire: 60 });
    return { success: true, grantedCount };
  } catch (error) {
    console.error('Failed to create bulk grants:', error);
    return { error: 'Failed to create bulk grants' };
  }
}
