'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { RANK_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db, ranks, userRanks } from '@/lib/db';
import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';
import { logModerationAction } from '@/lib/moderation/audit';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { createNotification } from '@/lib/notifications/notification';
import { getClientIp } from '@/lib/security/client-ip';

import { requireAdmin } from '../../_lib/auth';

function isGrantableRankSlug(value: string): value is RankSlug {
  return (ALL_RANK_SLUGS as readonly string[]).includes(value) && !isMukyuSlug(value);
}

/**
 * Signals the target already holds this rank. Not a real failure — the
 * `onConflictDoNothing` insert is the natural place to detect it, but the
 * admin should see a distinct "already granted" message rather than a
 * silent success or a generic error.
 */
class RankAlreadyGrantedError extends Error {}

/**
 * Manually grant a rank to a user, bypassing the normal requirement
 * evaluation in `checkAndGrantRanks`. This is a support-escalation tool:
 * when a user genuinely met a rank's requirements but was never promoted
 * (a missed trigger, a bug, a pre-launch backfill gap), an admin can grant
 * the rank directly instead of waiting for the next natural trigger.
 *
 * Writes the same `user_ranks` row `checkAndGrantRanks` would have written
 * (idempotent via the `uq_user_rank` constraint), plus a `moderation_actions`
 * audit row recording who granted it, to whom, and why — mirroring the
 * `insertAdminGrant` pattern used by `/admin/grants`.
 */
export async function grantRank(
  targetUserId: string,
  rankSlug: string,
  reason: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isGrantableRankSlug(rankSlug)) {
    return { error: 'invalidRank' };
  }

  const reasonResult = validateModerationReason(reason);
  if ('error' in reasonResult) return reasonResult;
  const trimmedReason = reasonResult.trimmed;

  const [rank] = await db.select().from(ranks).where(eq(ranks.slug, rankSlug)).limit(1);
  if (!rank) {
    return { error: 'rankNotFound' };
  }

  const ipAddress = await getClientIp();
  let userRankId: string;

  try {
    userRankId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(userRanks)
        .values({ userId: targetUserId, rankId: rank.id })
        .onConflictDoNothing({ target: [userRanks.userId, userRanks.rankId] })
        .returning({ id: userRanks.id });

      if (!inserted) {
        throw new RankAlreadyGrantedError();
      }

      await logModerationAction(tx, {
        actorId: auth.userId,
        action: 'grant_rank',
        targetType: 'user',
        targetId: targetUserId,
        reason: trimmedReason,
        metadata: { rankSlug: rank.slug, rankLevel: rank.level },
        ipAddress,
      });

      return inserted.id;
    });
  } catch (error) {
    if (error instanceof RankAlreadyGrantedError) {
      return { error: 'alreadyGranted' };
    }
    console.error('Failed to grant rank:', error);
    return { error: 'failedToGrantRank' };
  }

  // No revalidatePath: the admin user page is dynamic, and `GrantRankButton`
  // calls `router.refresh()` on success.
  revalidateTag(RANK_STATUS_CACHE_TAG, { expire: 60 });

  // The recipient has no way to notice a manually-granted rank otherwise —
  // it doesn't go through the normal challenge/game-publish flow that shows
  // the RankAchievementModal. Fire-and-forget, after the transaction commits.
  createNotification({
    userId: targetUserId,
    actorId: auth.userId,
    type: 'rank_grant',
    targetType: 'user_rank',
    targetId: userRankId,
    metadata: {
      rankSlug: rank.slug,
      rankLevel: rank.level,
      reason: trimmedReason,
    },
  });

  return { success: true };
}
