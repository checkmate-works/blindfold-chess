/**
 * Shared-game reads: the by-id detail fetch and every gallery/profile/chunk
 * list projection (including the opening derivation each card carries).
 * Writes live in `./games-write`, mutation authorization in `./games-auth`.
 */
import { cache } from 'react';

import { type SQL, and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import 'server-only';

import { type DetectedOpening, detectGameOpening } from '@/lib/openings/detect-game-opening';

import { db } from './index';
import { countRows } from './list-query';
import { liveProfileJoinOn } from './profile-select';
import type { GameRecord } from './schema';
import { gameChunks, games, profiles } from './schema';

/**
 * Statuses a published game is publicly viewable in. Currently just `public`;
 * the planned owner-only `private` tier is deliberately excluded here (a future
 * owner-scoped read path will handle it). Kept as a list so adding such a path
 * is a one-line change, not a query rewrite.
 */
const VISIBLE_STATUSES = ['public'] as const;

/** Public author profile for attribution (avatar + name + profile link). */
export type SharedGameAuthor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type SharedGameDetail = {
  game: GameRecord;
  /** Author profile, or null for account-less / hard-deleted authors. */
  author: SharedGameAuthor | null;
};

/**
 * Fetch a publicly-visible shared game by id with its author's public profile
 * (for avatar + name + profile-link attribution). Returns null when the id
 * does not exist or the game is hidden / removed / soft-deleted (the privileged
 * `db` connection bypasses RLS, so visibility is filtered here). Admin / owner
 * views of non-public games are a separate path.
 */
export const getGameById = cache(async (id: string): Promise<SharedGameDetail | null> => {
  const [row] = await db
    .select({
      game: games,
      authorUsername: profiles.username,
      authorDisplayName: profiles.displayName,
      authorAvatarUrl: profiles.avatarUrl,
    })
    .from(games)
    .leftJoin(profiles, liveProfileJoinOn(games.authorId))
    .where(
      and(eq(games.id, id), isNull(games.deletedAt), inArray(games.status, [...VISIBLE_STATUSES]))
    )
    .limit(1);

  if (!row) return null;

  // username is NOT NULL on profiles, so its presence means the join matched a
  // real author; null means an account-less (anonymous) game.
  const author: SharedGameAuthor | null = row.authorUsername
    ? {
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      }
    : null;

  return { game: row.game, author };
});

/** Compact projection for gallery cards (no JSONB move/log payloads). */
export type SharedGameListItem = {
  id: string;
  title: string;
  /** Body excerpt for the card; null when the author left it blank. */
  description: string | null;
  /** Opening position rendered as the card thumbnail; null = standard start. */
  startingFen: string | null;
  createdAt: Date;
  engineKind: 'stockfish' | 'maia';
  engineElo: number;
  result: 'win' | 'loss' | 'draw';
  /** Side the author played — shown with a colour icon on the card. */
  playerColor: 'white' | 'black';
  moveCount: number;
  cleanRate: number | null;
  /** Author profile for the card avatar; null for an account-less author. */
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  /**
   * The deepest named opening the game played, derived from its moves against
   * the opening master; null for custom-start games or unrecognised lines. The
   * move list itself is fetched only to compute this and is not exposed here.
   */
  opening: DetectedOpening | null;
};

/** Gallery sort modes (kept in sync with the page's sort control). */
export type SharedGamesSort = 'new' | 'clean' | 'strong';

/**
 * Base list query shared by every gallery/profile list path: the column
 * projection for a {@link SharedGameListItem} joined to the author profile.
 * Callers chain `.where()` / `.orderBy()` / `.limit()` etc. `moves` is fetched
 * only to derive the opening in {@link mapGameRowsToListItems} and is dropped
 * before the item is returned.
 */
function gameListQuery() {
  return db
    .select({
      id: games.id,
      title: games.title,
      description: games.description,
      startingFen: games.startingFen,
      createdAt: games.createdAt,
      engineKind: games.engineKind,
      engineElo: games.engineElo,
      result: games.result,
      playerColor: games.playerColor,
      moveCount: games.moveCount,
      cleanRate: games.cleanRate,
      moves: games.moves,
      authorUsername: profiles.username,
      authorDisplayName: profiles.displayName,
      authorAvatarUrl: profiles.avatarUrl,
    })
    .from(games)
    .leftJoin(profiles, liveProfileJoinOn(games.authorId));
}

type GameListRow = Awaited<ReturnType<typeof gameListQuery>>[number];

/**
 * Map raw rows from {@link gameListQuery} into gallery items, deriving each
 * game's opening from its moves. Opening detection shares one position index
 * across the request (React.cache), and each game is only replayed through its
 * opening phase, so this stays cheap.
 */
function mapGameRowsToListItems(rows: GameListRow[]): Promise<SharedGameListItem[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      startingFen: r.startingFen,
      createdAt: r.createdAt,
      engineKind: r.engineKind,
      engineElo: r.engineElo,
      result: r.result,
      playerColor: r.playerColor,
      moveCount: r.moveCount,
      cleanRate: r.cleanRate,
      author: r.authorUsername
        ? {
            username: r.authorUsername,
            displayName: r.authorDisplayName,
            avatarUrl: r.authorAvatarUrl,
          }
        : null,
      opening: await detectGameOpening({ moves: r.moves, startingFen: r.startingFen }),
    }))
  );
}

/**
 * Publicly-listed games for the gallery. Only `public`, non-deleted games
 * appear here (the planned `private` tier and soft-deleted rows are excluded).
 * Sort:
 * - 'new' (default): newest first via the time-ordered UUIDv7 id.
 * - 'clean': highest blindfold clean-rate first (nulls last).
 * - 'strong': strongest opponent first (unified Elo).
 * Every mode tie-breaks on id desc so paging stays stable.
 */
export async function listSharedGames(
  sort: SharedGamesSort = 'new',
  limit = 30
): Promise<SharedGameListItem[]> {
  const orderBy: SQL[] =
    sort === 'clean'
      ? [sql`${games.cleanRate} DESC NULLS LAST`, desc(games.id)]
      : sort === 'strong'
        ? [desc(games.engineElo), desc(games.id)]
        : [desc(games.id)];

  const rows = await gameListQuery()
    .where(and(isNull(games.deletedAt), eq(games.status, 'public')))
    .orderBy(...orderBy)
    .limit(limit);

  return mapGameRowsToListItems(rows);
}

/**
 * Publicly-visible games authored by a single registered user, newest first —
 * the data behind the Games tab on a public profile. Matches the gallery's
 * visibility rule (`public`, non-deleted) so the profile never leaks a game the
 * gallery hides. Paginated via `limit`/`offset`; tie-breaks on the time-ordered
 * UUIDv7 id so paging stays stable.
 */
export async function listGamesByAuthorId(
  authorId: string,
  limit: number,
  offset: number
): Promise<SharedGameListItem[]> {
  const rows = await gameListQuery()
    .where(and(eq(games.authorId, authorId), isNull(games.deletedAt), eq(games.status, 'public')))
    .orderBy(desc(games.id))
    .limit(limit)
    .offset(offset);

  return mapGameRowsToListItems(rows);
}

/**
 * A {@link SharedGameListItem} plus the moves at which it links a given chunk.
 * `plies` are 0-based and sorted ascending; a game that links the chunk at
 * several moves still appears once, with one entry per move in `plies`.
 */
export type ChunkLinkedGame = SharedGameListItem & { plies: number[] };

/**
 * Publicly-visible games that link a given chunk (the reverse of the per-game
 * chunk list), newest link first, deduped to one entry per game with its linked
 * moves aggregated into `plies`. Returns the same {@link SharedGameListItem}
 * shape the gallery / profile games tab render, so the chunk page can reuse the
 * exact same `CatalogListCard`. Matches the gallery's visibility rule
 * (`public`, non-deleted).
 */
export async function listGamesLinkingChunk(
  chunkId: string,
  limit = 50
): Promise<ChunkLinkedGame[]> {
  // 1. Which public games link this chunk, and at which moves. Newest link
  //    first so the most recently-tagged games lead the list.
  const linkRows = await db
    .select({ gameId: gameChunks.gameId, ply: gameChunks.ply })
    .from(gameChunks)
    .innerJoin(games, eq(games.id, gameChunks.gameId))
    .where(
      and(eq(gameChunks.chunkId, chunkId), isNull(games.deletedAt), eq(games.status, 'public'))
    )
    .orderBy(desc(gameChunks.createdAt), desc(gameChunks.id));

  // 2. Group by game, preserving first-seen (newest-link) order; collect a
  //    sorted, de-duplicated move list per game.
  const pliesByGame = new Map<string, Set<number>>();
  const order: string[] = [];
  for (const r of linkRows) {
    let set = pliesByGame.get(r.gameId);
    if (!set) {
      set = new Set<number>();
      pliesByGame.set(r.gameId, set);
      order.push(r.gameId);
    }
    set.add(r.ply);
  }
  const gameIds = order.slice(0, limit);
  if (gameIds.length === 0) return [];

  // 3. Hydrate the full card projection (incl. opening detection) for those
  //    games, then restore the newest-link order and attach the moves.
  const rows = await gameListQuery().where(inArray(games.id, gameIds));
  const items = await mapGameRowsToListItems(rows);
  const byId = new Map(items.map((it) => [it.id, it]));

  return gameIds.flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    const plies = [...(pliesByGame.get(id) ?? [])].sort((a, b) => a - b);
    return [{ ...item, plies }];
  });
}

/** Count an author's publicly-visible games (matches {@link listGamesByAuthorId}). */
export async function countGamesByAuthorId(authorId: string): Promise<number> {
  return countRows(
    games,
    and(eq(games.authorId, authorId), isNull(games.deletedAt), eq(games.status, 'public'))
  );
}

/**
 * Author id of a live game — used for the like notification. `null` for an
 * account-less (anonymous) game; `undefined` if the game is missing or deleted.
 */
export async function getGameLikeOwner(gameId: string): Promise<string | null | undefined> {
  const [row] = await db
    .select({ authorId: games.authorId, deletedAt: games.deletedAt })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!row || row.deletedAt !== null) return undefined;
  return row.authorId;
}
