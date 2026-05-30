'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';

import type { ActionResult } from '@/lib/action-types';
import { db, moderationActions } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
import { grantAdminPoints } from '@/lib/points';
import { getClientIp } from '@/lib/security/client-ip';

import { validateAmount, validateUuid } from '../_lib/validation';

/**
 * Issue a point grant from the admin surface.
 *
 * Companion to /admin/grants's `createGrant` (which issues ad_free
 * user_grants directly). This action writes a `point_events` row in
 * `category='promotional'` so the points are immediately spendable.
 *
 * The point grant + audit log row commit together in a single transaction.
 * Granted_by provenance lives in `moderation_actions.actor_id` per the
 * same design as the ad_free admin grant flow.
 */
export async function createPointGrant(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: 'unauthorized' };

  const userId = (formData.get('userId') as string | null)?.trim();
  const amountStr = (formData.get('amount') as string | null)?.trim();
  const reasonRaw = (formData.get('reason') as string | null)?.trim();

  if (!userId) return { error: 'User ID is required' };
  const uuidError = validateUuid(userId);
  if (uuidError) return { error: 'Invalid User ID format (expected UUID)' };

  const amount = Number(amountStr);
  const amountError = validateAmount(amount);
  if (amountError) return { error: amountError };

  const reason = reasonRaw || null;
  const ipAddress = await getClientIp();

  try {
    const grant = await db.transaction(async (tx) => {
      const inserted = await grantAdminPoints(tx, userId, amount, {
        actorId: auth.userId,
        reason,
      });

      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: 'create_point_grant',
        targetType: 'user',
        targetId: userId,
        reason,
        metadata: {
          pointEventId: inserted.pointEventId,
          grantId: inserted.grantId,
          amount,
          category: 'promotional',
        },
        ipAddress,
      });

      return inserted;
    });

    // Notify the recipient that they got points. The notification is
    // fire-and-forget — its failure must not roll back the transaction
    // above, so we only invoke it once the transaction has committed.
    createNotification({
      userId,
      actorId: auth.userId,
      type: 'point_grant',
      targetType: 'point_event',
      targetId: grant.pointEventId,
      metadata: {
        amount,
        category: 'promotional',
        reason,
      },
    });

    revalidatePath('/admin/coins');
    return { success: true };
  } catch (error) {
    console.error('Failed to create point grant:', error);
    return { error: 'Failed to create point grant' };
  }
}
