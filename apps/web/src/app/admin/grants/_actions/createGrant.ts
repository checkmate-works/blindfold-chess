'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, userGrants } from '@/lib/db';
import { calcGrantStartsAt } from '@/lib/user-grants';

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

    await db.insert(userGrants).values({
      userId: userId.trim(),
      benefitType: benefitType.trim(),
      grantType: 'admin_manual',
      reason: reason?.trim() || null,
      startsAt,
      expiresAt,
    });

    revalidateTag('grant-status', { expire: 60 });
    return { success: true };
  } catch (error) {
    console.error('Failed to create grant:', error);
    return { error: 'Failed to create grant' };
  }
}
