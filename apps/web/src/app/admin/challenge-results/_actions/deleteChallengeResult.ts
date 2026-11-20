'use server';

// eslint-disable-next-line ban/revalidate-path -- the challenge result delete button has no router.refresh(); revalidating /admin/challenge-results is what drops the removed row from the admin list
import { revalidatePath, revalidateTag } from 'next/cache';

import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { removeChallengeResult } from '@/lib/challenge/remove-result';
import { db } from '@/lib/db';
import { logModerationAction } from '@/lib/moderation/audit';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { getClientIp } from '@/lib/security/client-ip';
import { UUID_RE } from '@/lib/validations/uuid';

import type { AdminActionResult } from '../../_lib/action-errors';
import { requireAdmin } from '../../_lib/auth';

type DeleteChallengeResultError =
  | 'unauthorized'
  | 'reasonRequired'
  | 'reasonTooLong'
  | 'invalidChallengeResultId'
  | 'challengeResultNotFound';

/**
 * Removes one challenge result from every ranking and records why.
 *
 * The removal and its audit entry commit together. The entry's metadata keeps
 * the removed score, the player, the recording attempt, the all-time best
 * before and after and the Exp taken back: the result row survives
 * soft-deleted, but the best and the Exp total are overwritten, so the entry
 * is the only record of what they were. A reason is required, as for every
 * moderation that acts on a player's content.
 *
 * A result that is unknown or already removed answers `challengeResultNotFound`
 * without writing an entry, so a repeated click does not log the removal twice.
 */
export async function deleteChallengeResult(
  resultId: string,
  reason: string
): Promise<AdminActionResult<DeleteChallengeResultError>> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!UUID_RE.test(resultId)) {
    return { error: 'invalidChallengeResultId' };
  }

  const reasonResult = validateModerationReason(reason);
  if ('error' in reasonResult) {
    return reasonResult;
  }
  const trimmedReason = reasonResult.trimmed;

  const ipAddress = await getClientIp();

  const removed = await db.transaction(async (tx) => {
    const result = await removeChallengeResult(tx, resultId, new Date());
    if (!result) return null;

    await logModerationAction(tx, {
      actorId: auth.userId,
      action: 'delete_challenge_result',
      targetType: 'challenge_result',
      targetId: result.id,
      reason: trimmedReason,
      metadata: {
        playerId: result.userId,
        menuType: result.menuType,
        leaderboardKey: result.leaderboardKey,
        score: result.score,
        incorrectAnswers: result.incorrectAnswers,
        timeTaken: result.timeTaken,
        recordedAt: result.createdAt.toISOString(),
        attemptId: result.attemptId,
        bestBefore: result.bestBefore,
        bestAfter: result.bestAfter,
        expReversed: result.expReversed,
      },
      ipAddress,
    });
    return result;
  });

  if (!removed) {
    return { error: 'challengeResultNotFound' };
  }

  // The public rankings are tag-cached; expire them the way recording a
  // result does, so the removed score disappears on the next read.
  revalidateTag(LEADERBOARD_CACHE_TAG, { expire: 0 });
  revalidateTag(EXP_LEADERBOARD_CACHE_TAG, { expire: 0 });
  revalidatePath('/admin/challenge-results');

  return { success: true };
}
