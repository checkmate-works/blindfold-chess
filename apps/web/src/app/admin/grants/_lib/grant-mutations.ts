import { addDays } from 'date-fns';

import { userGrants } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { logModerationAction } from '@/lib/moderation/audit';
import { createNotification } from '@/lib/notifications/notification';
import { calcGrantStartsAt } from '@/lib/users/user-grants';

/** Every admin-created grant carries this `grantType`. */
const ADMIN_GRANT_TYPE = 'admin_manual';

export type AdminGrantInput = {
  userId: string;
  benefitType: string;
  durationDays: number;
  reason: string | null;
  /** The acting admin's user id (for the moderation_actions audit row). */
  actorId: string;
  ipAddress: string | null;
};

export type CreatedAdminGrant = {
  userId: string;
  grantId: string;
  durationDays: number;
  benefitType: string;
  reason: string | null;
  expiresAt: Date;
};

/**
 * Insert one admin grant inside an open transaction: compute the
 * stacking `startsAt`, write the `user_grants` row, and append the
 * `moderation_actions` audit row (grant provenance lives in the audit
 * log per the `userGrants` design note). Shared by the single-user and
 * bulk admin grant actions.
 */
export async function insertAdminGrant(
  tx: DbTx,
  input: AdminGrantInput
): Promise<CreatedAdminGrant> {
  const startsAt = await calcGrantStartsAt(input.userId, input.benefitType, tx);
  const expiresAt = addDays(startsAt, input.durationDays);

  const [inserted] = await tx
    .insert(userGrants)
    .values({
      userId: input.userId,
      benefitType: input.benefitType,
      grantType: ADMIN_GRANT_TYPE,
      reason: input.reason,
      startsAt,
      expiresAt,
    })
    .returning({ id: userGrants.id });

  await logModerationAction(tx, {
    actorId: input.actorId,
    action: 'create_grant',
    targetType: 'user',
    targetId: input.userId,
    reason: input.reason,
    metadata: {
      grantId: inserted.id,
      grantType: ADMIN_GRANT_TYPE,
      benefitType: input.benefitType,
      durationDays: input.durationDays,
      expiresAt: expiresAt.toISOString(),
    },
    ipAddress: input.ipAddress,
  });

  return {
    userId: input.userId,
    grantId: inserted.id,
    durationDays: input.durationDays,
    benefitType: input.benefitType,
    reason: input.reason,
    expiresAt,
  };
}

/**
 * Send the `benefit_grant` notification for a committed admin grant.
 * Fire-and-forget — call after the grant transaction commits.
 */
export function notifyAdminGrant(actorId: string, grant: CreatedAdminGrant): void {
  createNotification({
    userId: grant.userId,
    actorId,
    type: 'benefit_grant',
    targetType: 'user_grant',
    targetId: grant.grantId,
    metadata: {
      grantType: ADMIN_GRANT_TYPE,
      benefitType: grant.benefitType,
      durationDays: grant.durationDays,
      expiresAt: grant.expiresAt.toISOString(),
      reason: grant.reason,
    },
  });
}
