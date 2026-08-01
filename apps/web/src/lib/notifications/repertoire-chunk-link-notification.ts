import 'server-only';

import { getRepertoireById } from '../repertoires/queries';
import { createNotification } from './notification';

/**
 * Notify a repertoire's owner that a member linked a chunk to one of its
 * positions. Direct 1:1 to the owner, not a follower fan-out — mirrors
 * `notifyGameOwnerOfChunkLink` (see its TSDoc for why the target is the
 * repertoire, not the link row: a burst of links in one sitting collapses
 * into a single notification via the 5-minute dedup in `createNotification`).
 *
 * The owner is resolved via `getRepertoireById` (already filters soft-deleted
 * rows) rather than by the caller, so a deleted or account-less (owner
 * `NULL`) repertoire, or the owner linking a chunk to their own course, both
 * mean "nobody to notify".
 *
 * `lineNo` / `ply` / `positionKey` are a snapshot at link time, kept only to
 * build the deep link `/repertoires/{id}/lines/{lineNo}?move={ply}` — see
 * `notification-link.ts`. They may drift if the line is edited afterwards,
 * which is accepted (the link still lands on the repertoire, not a 404).
 */
export function notifyRepertoireOwnerOfChunkLink(params: {
  actorId: string;
  repertoireId: string;
  lineNo: number;
  ply: number;
  chunkId: string;
  positionKey: string;
}): void {
  (async () => {
    const repertoire = await getRepertoireById(params.repertoireId);
    if (!repertoire) return;
    const ownerId = repertoire.userId;
    if (!ownerId || ownerId === params.actorId) return;

    createNotification({
      userId: ownerId,
      actorId: params.actorId,
      type: 'repertoire_chunk_linked',
      targetType: 'repertoire',
      targetId: params.repertoireId,
      metadata: {
        repertoireId: params.repertoireId,
        lineNo: params.lineNo,
        ply: params.ply,
        chunkId: params.chunkId,
        positionKey: params.positionKey,
      },
    });
  })().catch((error) => {
    console.error('[notifyRepertoireOwnerOfChunkLink] failed:', error);
  });
}
