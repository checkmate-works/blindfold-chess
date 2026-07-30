import 'server-only';

import { getLiveGameAuthorId } from '../db/games-read';
import { createNotification } from './notification';

/**
 * Notify a shared game's owner that a member linked a chunk to one of its
 * moves. Direct 1:1 to the owner, not a follower fan-out — the link is a
 * claim about their game (see `broadcastToFollowers` in `notification.ts`
 * for what earns a fan-out).
 *
 * The owner is resolved here rather than by the caller: both call sites (the
 * per-move picker and "create a chunk from this position") would otherwise
 * pay an awaited query on their write path for a fire-and-forget side
 * effect. `getLiveGameAuthorId` returns `null` for an account-less game and
 * `undefined` for a missing / deleted one — both mean "nobody to notify",
 * as does the owner linking a chunk to their own game.
 *
 * @design why the target is the game, not the link row
 * `targetId` is the game id so that `createNotification`'s 5-minute dedup
 * collapses a burst of links by the same member into one notification.
 * Reviewing a game and tagging several moves in one sitting is the normal
 * way this action gets used, and one row per link would flood the owner's
 * list. The cost is that the deep link points at the FIRST move of such a
 * burst — a move that does have a linked chunk, with the rest one click away
 * in the same game.
 *
 * @design why this is not in `notification.ts`
 * Resolving the owner needs `db/games-read`, which transitively pulls
 * opening detection and `unstable_cache` (next/cache). `notification.ts` is
 * imported by nearly every Server Action that notifies, so parking that
 * dependency there would put it in all of their module graphs. Keeping the
 * emitter in its own leaf module confines it to the two call sites that
 * already deal in games.
 */
export function notifyGameOwnerOfChunkLink(params: {
  actorId: string;
  gameId: string;
  ply: number;
  chunkId: string;
}): void {
  (async () => {
    const ownerId = await getLiveGameAuthorId(params.gameId);
    if (!ownerId || ownerId === params.actorId) return;

    createNotification({
      userId: ownerId,
      actorId: params.actorId,
      type: 'game_chunk_linked',
      targetType: 'game',
      targetId: params.gameId,
      // `ply` builds the `#<half-move>` deep link; `chunkId` records what was
      // linked, which outlives the link row itself (either side may remove it).
      metadata: { gameId: params.gameId, ply: params.ply, chunkId: params.chunkId },
    });
  })().catch((error) => {
    console.error('[notifyGameOwnerOfChunkLink] failed:', error);
  });
}
