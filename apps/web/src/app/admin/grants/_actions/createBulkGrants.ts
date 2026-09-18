'use server';

import { revalidateTag } from 'next/cache';

import type { AdminActionResult } from '@/app/admin/_lib/action-errors';
import { requireAdmin } from '@/app/admin/_lib/auth';
import { validateUserId } from '@/app/admin/_lib/validators';

import { GRANT_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';
import { handleAdminActionError } from '@/lib/server-action-error';

import type { CreatedAdminGrant } from '../_lib/grant-mutations';
import { insertAdminGrant, notifyAdminGrant } from '../_lib/grant-mutations';
import { validateDurationDays } from '../_lib/validation';

export type BulkGrantParams = {
  userIds: string[];
  durationDays: number;
  reason: string;
};

type BulkGrantError =
  | 'unauthorized'
  | 'noUsersSelected'
  | 'invalidUserId'
  | 'invalidDuration'
  | 'durationTooLong'
  | 'reasonRequired'
  | 'failedToCreateBulkGrants';

type BulkGrantResult = AdminActionResult<BulkGrantError, { grantedCount: number }>;

export async function createBulkGrants(params: BulkGrantParams): Promise<BulkGrantResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  const { userIds, durationDays, reason } = params;

  if (!userIds || userIds.length === 0) {
    return { error: 'noUsersSelected' };
  }

  for (const id of userIds) {
    if (validateUserId(id)) {
      return { error: 'invalidUserId' };
    }
  }

  const durationError = validateDurationDays(durationDays);
  if (durationError) {
    return { error: durationError };
  }

  if (!reason || !reason.trim()) {
    return { error: 'reasonRequired' };
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

    revalidateTag(GRANT_STATUS_CACHE_TAG, { expire: 60 });

    for (const grant of created) {
      notifyAdminGrant(auth.userId, grant);
    }

    return { success: true, grantedCount: created.length };
  } catch (error) {
    return handleAdminActionError(error, '[createBulkGrants]', 'failedToCreateBulkGrants');
  }
}
