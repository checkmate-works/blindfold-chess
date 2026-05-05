'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, moderationActions, userGrants } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
import { getClientIp } from '@/lib/security/client-ip';
import { calcGrantStartsAt } from '@/lib/users/user-grants';

import { validateDurationDays, validateUuid } from '../_lib/validation';

type ActionResult = { success: true } | { error: string };

export async function createGrant(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  const userId = formData.get('userId') as string | null;
  const benefitType = formData.get('benefitType') as string | null;
  const durationDaysStr = formData.get('durationDays') as string | null;
  const reason = formData.get('reason') as string | null;

  if (!userId || !userId.trim()) {
    return { error: 'User ID is required' };
  }
  const uuidError = validateUuid(userId.trim());
  if (uuidError) {
    return { error: 'Invalid User ID format (expected UUID)' };
  }
  if (!benefitType || !benefitType.trim()) {
    return { error: 'Benefit type is required' };
  }
  const durationDays = Number(durationDaysStr);
  const durationError = validateDurationDays(durationDays);
  if (durationError) {
    return { error: durationError };
  }

  const trimmedUserId = userId.trim();
  const trimmedBenefitType = benefitType.trim();
  const trimmedReason = reason?.trim() || null;
  const ipAddress = await getClientIp();

  // calcGrantStartsAt + userGrants insert + moderation_actions insert run in a
  // single transaction so the audit-log row cannot be lost if the grant insert
  // fails after a partial write — and the user-grants stacking calculation is
  // serialized against concurrent admin actions on the same user/benefit pair.
  // Granted_by provenance lives in `moderation_actions` per the design note on
  // `userGrants` (`schema.ts` @design revokedAt for logical deletion).
  try {
    const result = await db.transaction(async (tx) => {
      const startsAt = await calcGrantStartsAt(trimmedUserId, trimmedBenefitType, tx);
      const expiresAt = addDays(startsAt, durationDays);

      const [inserted] = await tx
        .insert(userGrants)
        .values({
          userId: trimmedUserId,
          benefitType: trimmedBenefitType,
          grantType: 'admin_manual',
          reason: trimmedReason,
          startsAt,
          expiresAt,
        })
        .returning({ id: userGrants.id });

      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: 'create_grant',
        targetType: 'user',
        targetId: trimmedUserId,
        reason: trimmedReason,
        metadata: {
          grantId: inserted.id,
          grantType: 'admin_manual',
          benefitType: trimmedBenefitType,
          durationDays,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress,
      });

      return { grantId: inserted.id, expiresAt };
    });

    revalidateTag('grant-status', { expire: 60 });

    // Note: the target user's `bfc_ads_hidden` cookie cannot be updated from
    // this admin action — it runs in the admin's HTTP session, not the
    // target user's. The cookie refreshes on the target user's next visit
    // to `/mypage/subscription` (via the request proxy in
    // `apps/web/src/proxy.ts`), or at most after `ADS_HIDDEN_COOKIE_MAX_AGE_SEC`
    // (7 days). `grant-status` tag revalidation above ensures the next
    // render recomputes entitlement freshly from DB.
    createNotification({
      userId: trimmedUserId,
      actorId: auth.userId,
      type: 'benefit_grant',
      targetType: 'user_grant',
      targetId: result.grantId,
      metadata: {
        grantType: 'admin_manual',
        benefitType: trimmedBenefitType,
        durationDays,
        expiresAt: result.expiresAt.toISOString(),
        reason: trimmedReason,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create grant:', error);
    return { error: 'Failed to create grant' };
  }
}
