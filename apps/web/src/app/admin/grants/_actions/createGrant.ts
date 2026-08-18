'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { validateUserId } from '@/app/admin/_lib/validators';

import type { ActionResult } from '@/lib/action-types';
import { GRANT_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db } from '@/lib/db';
import { isBenefitType } from '@/lib/db/data/grant-types';
import { getClientIp } from '@/lib/security/client-ip';

import { insertAdminGrant, notifyAdminGrant } from '../_lib/grant-mutations';
import { validateDurationDays } from '../_lib/validation';

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
  const uuidError = validateUserId(userId.trim());
  if (uuidError) {
    return { error: 'Invalid User ID format (expected UUID)' };
  }
  if (!benefitType || !benefitType.trim()) {
    return { error: 'Benefit type is required' };
  }
  if (!isBenefitType(benefitType.trim())) {
    // Guard against form tampering — the UI dropdown only renders known
    // benefit types, but a hand-crafted POST could supply anything.
    return { error: `Unknown benefit type: ${benefitType}` };
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

  // The grant + audit rows are written in one transaction so the
  // moderation_actions row cannot be lost on a partial failure, and the
  // user-grants stacking calculation is serialized against concurrent
  // admin actions on the same user/benefit pair. See `insertAdminGrant`.
  try {
    const grant = await db.transaction((tx) =>
      insertAdminGrant(tx, {
        userId: trimmedUserId,
        benefitType: trimmedBenefitType,
        durationDays,
        reason: trimmedReason,
        actorId: auth.userId,
        ipAddress,
      })
    );

    revalidateTag(GRANT_STATUS_CACHE_TAG, { expire: 60 });

    // Note: the target user's `bfc_ads_hidden` cookie cannot be updated from
    // this admin action — it runs in the admin's HTTP session, not the
    // target user's. The cookie refreshes on the target user's next visit
    // to `/mypage/subscription` (via the request proxy in
    // `apps/web/src/proxy.ts`), or at most after `ADS_HIDDEN_COOKIE_MAX_AGE_SEC`
    // (7 days). `grant-status` tag revalidation above ensures the next
    // render recomputes entitlement freshly from DB.
    notifyAdminGrant(auth.userId, grant);

    return { success: true };
  } catch (error) {
    console.error('Failed to create grant:', error);
    return { error: 'Failed to create grant' };
  }
}
