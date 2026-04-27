'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, userGrants } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
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

  // NOTE: calcGrantStartsAt read + insert are not wrapped in a transaction.
  // Concurrent calls for the same user+benefitType could produce overlapping
  // grants instead of stacking. Acceptable here because admin_manual is a
  // low-frequency single-operator flow. Automated grant types (topic_post,
  // etc.) use the separate `applyAutomatedGrant` helper in src/lib/user-grants.ts
  // which performs the read + insert inside a db.transaction with row-level
  // locking.
  try {
    const startsAt = await calcGrantStartsAt(userId.trim(), benefitType.trim());
    const expiresAt = addDays(startsAt, durationDays);

    const [inserted] = await db
      .insert(userGrants)
      .values({
        userId: userId.trim(),
        benefitType: benefitType.trim(),
        grantType: 'admin_manual',
        reason: reason?.trim() || null,
        startsAt,
        expiresAt,
      })
      .returning({ id: userGrants.id });

    revalidateTag('grant-status', { expire: 60 });

    // Note: the target user's `bfc_ads_hidden` cookie cannot be updated from
    // this admin action — it runs in the admin's HTTP session, not the
    // target user's. The cookie refreshes on the target user's next visit
    // to `/mypage/subscription` (via the request proxy in
    // `apps/web/src/proxy.ts`), or at most after `ADS_HIDDEN_COOKIE_MAX_AGE_SEC`
    // (7 days). `grant-status` tag revalidation above ensures the next
    // render recomputes entitlement freshly from DB.
    createNotification({
      userId: userId.trim(),
      actorId: auth.userId,
      type: 'benefit_grant',
      targetType: 'user_grant',
      targetId: inserted.id,
      metadata: {
        grantType: 'admin_manual',
        benefitType: benefitType.trim(),
        durationDays,
        expiresAt: expiresAt.toISOString(),
        reason: reason?.trim() || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create grant:', error);
    return { error: 'Failed to create grant' };
  }
}
