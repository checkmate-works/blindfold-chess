'use server';

import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { addDays } from 'date-fns';

import { db, userGrants } from '@/lib/db';
import { calcGrantStartsAt } from '@/lib/user-grants';

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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId.trim())) {
    return { error: 'Invalid User ID format (expected UUID)' };
  }
  if (!benefitType || !benefitType.trim()) {
    return { error: 'Benefit type is required' };
  }
  const durationDays = Number(durationDaysStr);
  if (!durationDays || durationDays <= 0) {
    return { error: 'Duration must be a positive number' };
  }
  if (durationDays > 3650) {
    return { error: 'Duration must not exceed 3650 days (10 years)' };
  }

  // NOTE: calcGrantStartsAt read + insert are not wrapped in a transaction.
  // Concurrent calls for the same user+benefitType could produce overlapping
  // grants instead of stacking. Acceptable for admin_manual (low-frequency,
  // single operator), but should be wrapped in a transaction if automated
  // grant types (topic_post, campaign) are added.
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
