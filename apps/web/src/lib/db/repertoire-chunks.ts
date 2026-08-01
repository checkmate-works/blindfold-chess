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

import { type ChunkStatus, isChunkStatus } from '@/lib/chunks/validation';

import { isLinkableChunkForViewer } from './game-chunks';
import { db } from './index';
import { liveProfileJoinOn } from './profile-select';
import { chunks, profiles, repertoireChunks, repertoires } from './schema';

// Chunk-side link eligibility has no dependency on the parent (game vs.
// repertoire), so it is not re-implemented here — see `game-chunks.ts`'s
// `isLinkableChunkForViewer` (and `linkableChunkPredicate` behind it) for
// the rule itself.
export { isLinkableChunkForViewer };

export type RepertoireChunkItem = {
  id: string;
  positionKey: string;
  chunkId: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  /**
   * Lifecycle state of the linked chunk. A link may point at a draft (the
   * author's own — see `linkableChunkPredicate`), whose title is still
   * open to renegotiation, so the UI marks those rows rather than letting
   * them read as settled catalog entries.
   */
  status: ChunkStatus;
  createdAt: Date;
  suggestedById: string | null;
  suggester: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

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
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
      status: chunks.status,
      createdAt: repertoireChunks.createdAt,
      suggestedById: repertoireChunks.suggestedById,
      suggesterUsername: profiles.username,
      suggesterDisplayName: profiles.displayName,
      suggesterAvatarUrl: profiles.avatarUrl,
    })
    .from(repertoireChunks)
    .innerJoin(chunks, eq(chunks.id, repertoireChunks.chunkId))
    .leftJoin(profiles, liveProfileJoinOn(repertoireChunks.suggestedById))
    .where(and(eq(repertoireChunks.repertoireId, repertoireId), isNull(chunks.deletedAt)))
    .orderBy(asc(repertoireChunks.positionKey), asc(repertoireChunks.createdAt));

  return rows.map((r) => ({
    id: r.id,
    positionKey: r.positionKey,
    chunkId: r.chunkId,
    slug: r.slug,
    title: r.title,
    description: r.description,
    representativeFen: r.representativeFen,
    // Unknown values fall back to 'published' — an unrecognized lifecycle
    // state must not render as "still being workshopped".
    status: isChunkStatus(r.status) ? r.status : 'published',
    createdAt: r.createdAt,
    suggestedById: r.suggestedById,
    suggester: r.suggesterUsername
      ? {
          username: r.suggesterUsername,
          displayName: r.suggesterDisplayName,
          avatarUrl: r.suggesterAvatarUrl,
        }
      : null,
  }));
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
