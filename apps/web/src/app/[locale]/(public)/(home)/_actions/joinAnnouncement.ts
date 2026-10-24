'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { MEMBER_JOINED_LIKE_TARGET } from '@/lib/feed-items/member-joined';
import {
  deleteOwnJoinAnnouncement,
  getJoinAnnouncementOwnerId,
} from '@/lib/feed-items/member-joined-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { isValidUUID } from '@/lib/validations/uuid';

/**
 * Toggle a like on an arrival announcement (`member_joined` feed card). The
 * like targets the feed row's id and notifies the member who joined. The
 * third `topicKey` argument the shared `LikeButton` passes is ignored.
 *
 * A card that is gone (deleted by its owner, or reaped after 30 days) is
 * refused rather than liked (`missingTarget: 'reject'`): a like on a missing
 * row would never be cleaned up. The lookup runs inside the factory, after
 * its auth / ban / rate-limit guard, so a caller the guard turns away costs
 * no query.
 */
export async function toggleJoinAnnouncementLikeAction(
  feedItemId: string,
  _locale: string
): Promise<ToggleLikeResult> {
  try {
    return await performEntityToggleLike({
      id: feedItemId,
      fieldName: 'feedItemId',
      targetType: MEMBER_JOINED_LIKE_TARGET,
      fetchOwner: async (id) => {
        const ownerId = await getJoinAnnouncementOwnerId(id);
        return ownerId ? { userId: ownerId, extra: null } : null;
      },
      notificationMeta: () => ({}),
      missingTarget: 'reject',
    });
  } catch (error) {
    return handleServerActionError(error, '[toggleJoinAnnouncementLikeAction]');
  }
}

/**
 * Delete the caller's own arrival announcement (the card's "⋯" menu). There
 * is no way to post it again afterwards — the onboarding answer stays
 * recorded.
 *
 * No revalidation: the card removes itself from the client feed list on
 * success, and the home feed re-queries on the next visit.
 */
export async function deleteJoinAnnouncementAction(
  feedItemId: string
): Promise<ActionResult<Record<never, never>, string>> {
  try {
    if (!isValidUUID(feedItemId)) return { error: 'invalidFeedItemId' };

    const guard = await authenticateAndGuard(RATE_LIMITS.deletePost);
    if ('error' in guard) return { error: guard.error };

    const deleted = await deleteOwnJoinAnnouncement(guard.user.id, feedItemId);
    return deleted ? { success: true } : { error: 'notFound' };
  } catch (error) {
    return { error: handleServerActionError(error, '[deleteJoinAnnouncementAction]').error };
  }
}
