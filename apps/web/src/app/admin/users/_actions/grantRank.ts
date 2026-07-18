'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, moderationActions, ranks, userRanks } from '@/lib/db';
import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';
import { validateModerationReason } from '@/lib/moderation/validate-reason';

import { requireAdmin } from '../../_lib/auth';
import { getClientIp } from './getClientIp';

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

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(userRanks)
        .values({ userId: targetUserId, rankId: rank.id })
        .onConflictDoNothing({ target: [userRanks.userId, userRanks.rankId] })
        .returning({ id: userRanks.id });

      if (!inserted) {
        throw new RankAlreadyGrantedError();
      }

      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: 'grant_rank',
        targetType: 'user',
        targetId: targetUserId,
        reason: trimmedReason,
        metadata: { rankSlug: rank.slug, rankLevel: rank.level },
        ipAddress,
      });
    });
  } catch (error) {
    if (error instanceof RankAlreadyGrantedError) {
      return { error: 'alreadyGranted' };
    }
    console.error('Failed to grant rank:', error);
    return { error: 'failedToGrantRank' };
  }

  revalidatePath(`/admin/users/${targetUserId}`);

  return { success: true };
}
