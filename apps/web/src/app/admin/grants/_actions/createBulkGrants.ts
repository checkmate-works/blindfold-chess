'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';

import { db } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';

import type { CreatedAdminGrant } from '../_lib/grant-mutations';
import { insertAdminGrant, notifyAdminGrant } from '../_lib/grant-mutations';
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

  const trimmedReason = reason.trim();
  const ipAddress = await getClientIp();

  try {
    const created = await db.transaction(async (tx) => {
      const grants: CreatedAdminGrant[] = [];
      for (const userId of userIds) {
        grants.push(
          await insertAdminGrant(tx, {
            userId,
            benefitType: 'ad_free',
            durationDays,
            reason: trimmedReason,
            actorId: auth.userId,
            ipAddress,
          })
        );
      }
      return grants;
    });

    revalidateTag('grant-status', { expire: 60 });

    for (const grant of created) {
      notifyAdminGrant(auth.userId, grant);
    }

    return { success: true, grantedCount: created.length };
  } catch (error) {
    console.error('Failed to create bulk grants:', error);
    return { error: 'Failed to create bulk grants' };
  }
}
