/**
 * Repertoire chunks — community-suggested chunk (pattern) links on a
 * repertoire's positions. Any signed-in member can link a published chunk to
 * a position reached by one of the repertoire's lines; the link asserts
 * "this known pattern applies here". Keyed by `position_key` (not a ply, see
 * `repertoire_chunks`'s TSDoc), so one link surfaces on every line that
 * reaches the position. Reads expose the chunk (title / slug / board) plus
 * the suggester's public profile.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { CHUNK_LINK_COLUMNS, type ChunkLink, mapChunkLinkRow } from './chunk-link-row';
import { isLinkableChunkForViewer } from './game-chunks';
import { db } from './index';
import { liveProfileJoinOn } from './profile-select';
import { chunks, profiles, repertoireChunks, repertoires } from './schema';

// Chunk-side link eligibility has no dependency on the parent (game vs.
// repertoire), so it is not re-implemented here — see `game-chunks.ts`'s
// `isLinkableChunkForViewer` (and `linkableChunkPredicate` behind it) for
// the rule itself.
export { isLinkableChunkForViewer };

/** A chunk link anchored to a position rather than a single ply. */
export type RepertoireChunkItem = ChunkLink & { positionKey: string };

/**
 * All chunk links for a repertoire (across every position), joined to the
 * live chunk (soft-deleted chunks are dropped) and the suggester's profile.
 * The caller groups these by `positionKey`.
 */
export async function listRepertoireChunks(repertoireId: string): Promise<RepertoireChunkItem[]> {
  const rows = await db
    .select({
      id: repertoireChunks.id,
      positionKey: repertoireChunks.positionKey,
      chunkId: repertoireChunks.chunkId,
      createdAt: repertoireChunks.createdAt,
      suggestedById: repertoireChunks.suggestedById,
      ...CHUNK_LINK_COLUMNS,
    })
    .from(repertoireChunks)
    .innerJoin(chunks, eq(chunks.id, repertoireChunks.chunkId))
    .leftJoin(profiles, liveProfileJoinOn(repertoireChunks.suggestedById))
    .where(and(eq(repertoireChunks.repertoireId, repertoireId), isNull(chunks.deletedAt)))
    .orderBy(asc(repertoireChunks.positionKey), asc(repertoireChunks.createdAt));

  return rows.map((r) => ({ ...mapChunkLinkRow(r), positionKey: r.positionKey }));
}

/**
 * Link a chunk to a position. Idempotent via the (repertoire, position,
 * chunk) unique constraint — a duplicate link is a no-op that returns `null`.
 */
export async function insertRepertoireChunk(params: {
  repertoireId: string;
  positionKey: string;
  chunkId: string;
  suggestedById: string;
}): Promise<{ id: string; createdAt: Date } | null> {
  const [row] = await db
    .insert(repertoireChunks)
    .values({
      repertoireId: params.repertoireId,
      positionKey: params.positionKey,
      chunkId: params.chunkId,
      suggestedById: params.suggestedById,
    })
    .onConflictDoNothing()
    .returning({ id: repertoireChunks.id, createdAt: repertoireChunks.createdAt });
  return row ?? null;
}

/**
 * The link's suggester + the repertoire's (registered) owner, for delete
 * authorization — a link can be removed by whoever added it OR the
 * repertoire's owner. Undefined if the link is missing.
 */
export async function getRepertoireChunkForDelete(
  id: string
): Promise<{ suggestedById: string | null; repertoireOwnerId: string | null } | undefined> {
  const [row] = await db
    .select({
      suggestedById: repertoireChunks.suggestedById,
      repertoireOwnerId: repertoires.userId,
    })
    .from(repertoireChunks)
    .innerJoin(repertoires, eq(repertoires.id, repertoireChunks.repertoireId))
    .where(eq(repertoireChunks.id, id))
    .limit(1);
  return row ?? undefined;
}

/** Remove a chunk link (hard delete — it is a join row, not content). */
export async function deleteRepertoireChunk(id: string): Promise<void> {
  await db.delete(repertoireChunks).where(eq(repertoireChunks.id, id));
}
