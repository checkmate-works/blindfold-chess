'use server';

import { getGameLikeOwner } from '@/lib/db/games-read';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { GAME_LIKE_TARGET } from '@/lib/db/like-queries';
import { handleServerActionError } from '@/lib/server-action-error';

/**
 * Toggle a like on a shared game itself (members-only). Reuses the generic
 * polymorphic like machinery under `target_type = 'game'`, notifying the
 * (registered) author and revalidating the game's detail page. The third
 * `topicKey` argument the topics `LikeButton` passes is ignored — games are
 * not topic-keyed.
 */
export async function toggleGameLikeAction(
  gameId: string,
  locale: string
): Promise<ToggleLikeResult> {
  try {
    return await performEntityToggleLike({
      id: gameId,
      locale,
      fieldName: 'gameId',
      targetType: GAME_LIKE_TARGET,
      fetchOwner: async (id) => {
        const authorId = await getGameLikeOwner(id);
        // `undefined` = missing/deleted → no owner; `null` = anonymous game
        // (no author to notify, but the toggle still counts).
        return authorId === undefined ? null : { userId: authorId, extra: null };
      },
      notificationMeta: () => ({}),
      revalidatePaths: (loc, id) => [`/${loc}/games/shared/${id}`],
    });
  } catch (error) {
    return handleServerActionError(error, '[toggleGameLikeAction]');
  }
}
