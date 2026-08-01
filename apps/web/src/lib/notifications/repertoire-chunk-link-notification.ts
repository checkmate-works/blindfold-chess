import { eq } from 'drizzle-orm';
import 'server-only';

import { db, repertoires } from '../db';
import { createNotification } from './notification';

/**
 * Notify a repertoire's owner that a member linked a chunk to one of its
 * positions. Direct 1:1 to the owner, not a follower fan-out — mirrors
 * `notifyGameOwnerOfChunkLink` (see its TSDoc for why the target is the
 * repertoire, not the link row: a burst of links in one sitting collapses
 * into a single notification via the 5-minute dedup in `createNotification`).
 *
 * The owner is resolved here (one query on `repertoires`) rather than by the
 * caller, and a soft-deleted or account-less (owner `NULL`) repertoire, or
 * the owner linking a chunk to their own course, both mean "nobody to notify".
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
    const [row] = await db
      .select({ userId: repertoires.userId, deletedAt: repertoires.deletedAt })
      .from(repertoires)
      .where(eq(repertoires.id, params.repertoireId))
      .limit(1);
    if (!row || row.deletedAt !== null) return;
    const ownerId = row.userId;
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
