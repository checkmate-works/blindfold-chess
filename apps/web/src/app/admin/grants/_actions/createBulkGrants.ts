'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';
import { and, eq, isNull, max } from 'drizzle-orm';

import { db, userGrants } from '@/lib/db';

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

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of userIds) {
    if (!uuidRegex.test(id)) {
      return { error: `Invalid User ID format: ${id}` };
    }
  }

  if (!durationDays || durationDays <= 0) {
    return { error: 'Duration must be a positive number' };
  }
  if (durationDays > 3650) {
    return { error: 'Duration must not exceed 3650 days (10 years)' };
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
        // Inline calcGrantStartsAt logic using tx instead of db
        const now = new Date();
        const [latest] = await tx
          .select({ maxExpires: max(userGrants.expiresAt) })
          .from(userGrants)
          .where(
            and(
              eq(userGrants.userId, userId),
              eq(userGrants.benefitType, benefitType),
              isNull(userGrants.revokedAt)
            )
          );
        const latestExpires = latest?.maxExpires;
        const startsAt = latestExpires && latestExpires > now ? latestExpires : now;
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
