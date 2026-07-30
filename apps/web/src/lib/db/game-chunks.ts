/**
 * Game chunks — community-suggested chunk (pattern) links on a shared game's
 * moves. Any signed-in member can link a published chunk to a move (`ply`);
 * the link asserts "this known pattern applies to this position". Reads expose
 * the chunk (title / slug / board) plus the suggester's public profile.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { linkableChunkPredicate } from '@/lib/chunks/linkability';
import { type ChunkStatus, isChunkStatus } from '@/lib/chunks/validation';

import { db } from './index';
import { liveProfileJoinOn } from './profile-select';
import { chunks, gameChunks, games, profiles } from './schema';

export type GameChunkItem = {
  id: string;
  ply: number;
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
 * All chunk links for a game (across moves), oldest first per move, joined to
 * the live chunk (soft-deleted chunks are dropped) and the suggester's profile.
 * The client groups these by `ply`.
 */
export async function listGameChunks(gameId: string): Promise<GameChunkItem[]> {
  const rows = await db
    .select({
      id: gameChunks.id,
      ply: gameChunks.ply,
      chunkId: gameChunks.chunkId,
      slug: chunks.slug,
      title: chunks.title,
      description: chunks.description,
      representativeFen: chunks.representativeFen,
      status: chunks.status,
      createdAt: gameChunks.createdAt,
      suggestedById: gameChunks.suggestedById,
      suggesterUsername: profiles.username,
      suggesterDisplayName: profiles.displayName,
      suggesterAvatarUrl: profiles.avatarUrl,
    })
    .from(gameChunks)
    .innerJoin(chunks, eq(chunks.id, gameChunks.chunkId))
    .leftJoin(profiles, liveProfileJoinOn(gameChunks.suggestedById))
    .where(and(eq(gameChunks.gameId, gameId), isNull(chunks.deletedAt)))
    .orderBy(asc(gameChunks.ply), asc(gameChunks.createdAt));

  return rows.map((r) => ({
    id: r.id,
    ply: r.ply,
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
 * True if `viewerId` may link this chunk to a game move: the chunk exists,
 * is not soft-deleted, and is either published or a draft the viewer owns.
 *
 * The draft allowance is the server-side half of
 * `getLinkableChunkOptionsForViewer` — both sides share
 * `linkableChunkPredicate` so the picker's contents and this gate cannot
 * drift. See that query's TSDoc for why own drafts are eligible.
 */
export async function isLinkableChunkForViewer(
  chunkId: string,
  viewerId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: chunks.id })
    .from(chunks)
    .where(and(eq(chunks.id, chunkId), isNull(chunks.deletedAt), linkableChunkPredicate(viewerId)))
    .limit(1);
  return row !== undefined;
}

/**
 * Link a chunk to a move. Idempotent via the (game, ply, chunk) unique
 * constraint — a duplicate link is a no-op that returns `null`.
 */
export async function insertGameChunk(params: {
  gameId: string;
  ply: number;
  chunkId: string;
  suggestedById: string;
}): Promise<{ id: string; createdAt: Date } | null> {
  const [row] = await db
    .insert(gameChunks)
    .values({
      gameId: params.gameId,
      ply: params.ply,
      chunkId: params.chunkId,
      suggestedById: params.suggestedById,
    })
    .onConflictDoNothing()
    .returning({ id: gameChunks.id, createdAt: gameChunks.createdAt });
  return row ?? null;
}

/**
 * The link's suggester + the game's (registered) author, for delete
 * authorization — a link can be removed by whoever added it OR the game's
 * owner. Undefined if the link is missing.
 */
export async function getGameChunkForDelete(
  id: string
): Promise<{ suggestedById: string | null; gameAuthorId: string | null } | undefined> {
  const [row] = await db
    .select({ suggestedById: gameChunks.suggestedById, gameAuthorId: games.authorId })
    .from(gameChunks)
    .innerJoin(games, eq(games.id, gameChunks.gameId))
    .where(eq(gameChunks.id, id))
    .limit(1);
  return row ?? undefined;
}

/** Remove a chunk link (hard delete — it is a join row, not content). */
export async function deleteGameChunk(id: string): Promise<void> {
  await db.delete(gameChunks).where(eq(gameChunks.id, id));
}
