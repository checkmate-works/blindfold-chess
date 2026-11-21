'use server';

import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { RANK_UPDATE_LIKE_TARGET } from '@/lib/feed-items/rank-update';
import { handleServerActionError } from '@/lib/server-action-error';

import { getLiveRankUpdateOwner } from '../_lib/rank-update-owner';

/**
 * Toggle a like on a leaderboard rank-update card. The like targets the feed
 * row's id and notifies the player, with the leaderboard the card links to in
 * the notification's metadata. The third `topicKey` argument the shared
 * `LikeButton` passes is ignored.
 *
 * A card that is reaped or hidden from the feed is refused rather than liked
 * (`missingTarget: 'reject'`): a like on a reaped id would never be cleaned
 * up, and one on a hidden card could not be seen. The lookup runs inside the
 * factory, after its auth / ban / rate-limit guard, so a caller the guard
 * turns away costs no query.
 */
export async function toggleRankUpdateLikeAction(
  feedItemId: string,
  _locale: string
): Promise<ToggleLikeResult> {
  try {
    return await performEntityToggleLike({
      id: feedItemId,
      fieldName: 'feedItemId',
      targetType: RANK_UPDATE_LIKE_TARGET,
      fetchOwner: async (id) => {
        const owner = await getLiveRankUpdateOwner(id);
        return owner
          ? {
              userId: owner.actorId,
              extra: { menuType: owner.menuType, leaderboardKey: owner.leaderboardKey },
            }
          : null;
      },
      notificationMeta: (_id, extra) => extra,
      missingTarget: 'reject',
    });
  } catch (error) {
    return handleServerActionError(error, '[toggleRankUpdateLikeAction]');
  }
}
