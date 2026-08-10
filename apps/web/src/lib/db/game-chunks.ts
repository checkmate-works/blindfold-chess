/**
 * Game chunks — community-suggested chunk (pattern) links on a shared game's
 * moves. Any signed-in member can link a published chunk to a move (`ply`);
 * the link asserts "this known pattern applies to this position". Reads expose
 * the chunk (title / slug / board) plus the suggester's public profile.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import 'server-only';

import { linkableChunkPredicate } from '@/lib/chunks/linkability';

import { CHUNK_LINK_COLUMNS, type ChunkLink, mapChunkLinkRow } from './chunk-link-row';
import { db } from './index';
import { liveProfileJoinOn } from './profile-select';
import { chunks, gameChunks, games, profiles } from './schema';

/** A chunk link anchored to a move. */
export type GameChunkItem = ChunkLink & { ply: number };

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
      createdAt: gameChunks.createdAt,
      suggestedById: gameChunks.suggestedById,
      ...CHUNK_LINK_COLUMNS,
    })
    .from(gameChunks)
    .innerJoin(chunks, eq(chunks.id, gameChunks.chunkId))
    .leftJoin(profiles, liveProfileJoinOn(gameChunks.suggestedById))
    .where(and(eq(gameChunks.gameId, gameId), isNull(chunks.deletedAt)))
    .orderBy(asc(gameChunks.ply), asc(gameChunks.createdAt));

  return rows.map((r) => ({ ...mapChunkLinkRow(r), ply: r.ply }));
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

/** The slice of the Drizzle client this module's tx-aware writer needs. */
type GameChunkWriteTx = Pick<typeof db, 'select' | 'insert'>;

/**
 * Link a just-created chunk to a game move from inside the creating
 * transaction ("create a chunk from this position"). Returns whether a link
 * row landed.
 *
 * @design why this validates instead of leaning on the FK
 * `insertGameChunk` lets the `game_id` foreign key reject a bad game,
 * because there the failed insert is the whole operation. Here the insert
 * shares a transaction with the chunk itself, so a raised FK would roll the
 * chunk back too — losing the thing the author actually came to write over
 * a stale or hand-edited `?game=`. The existence check moves the failure
 * from "abort" to "skip".
 *
 * The ply is bounds-checked against the game's move list for the same
 * reason a link needs a target at all: `game_chunks.ply` has no DB
 * constraint, so an out-of-range value would persist a row that renders on
 * no move and can never be found to remove. The manual picker path needs no
 * such check — it is only mounted on a real move.
 *
 * Chunk-side eligibility is NOT re-checked: the chunk was created moments
 * ago in this same transaction by `suggestedById`, so it is by construction
 * the caller's own — always linkable under `linkableChunkPredicate`.
 */
export async function linkNewChunkToGameMove(
  tx: GameChunkWriteTx,
  params: { gameId: string; ply: number; chunkId: string; suggestedById: string }
): Promise<boolean> {
  const [game] = await tx
    .select({ moveCount: sql<number>`coalesce(jsonb_array_length(${games.moves}), 0)` })
    .from(games)
    .where(eq(games.id, params.gameId))
    .limit(1);
  if (!game || params.ply < 0 || params.ply >= game.moveCount) return false;

  const [row] = await tx
    .insert(gameChunks)
    .values({
      gameId: params.gameId,
      ply: params.ply,
      chunkId: params.chunkId,
      suggestedById: params.suggestedById,
    })
    .onConflictDoNothing()
    .returning({ id: gameChunks.id });
  return row !== undefined;
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
