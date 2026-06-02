import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db, games, profiles } from '@/lib/db';
import { GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';

import type { GameFeedData } from '../types';

/**
 * Bulk-load the `game` entities referenced by a slice of feed rows, plus their
 * per-viewer like meta (`target_type = 'game'`) and comment meta (`game_comments`
 * keyed by `game_id`). The thumbnail FEN is the opening position (`startingFen`,
 * or the standard start). Only `public`, non-deleted games are returned — a game
 * the author later unlisted or removed silently drops out of the feed, matching
 * the deleted-entity handling the other loaders use.
 */
export async function loadGamesForFeed(
  gameIds: string[],
  currentUserId: string | undefined
): Promise<Map<string, GameFeedData>> {
  const map = new Map<string, GameFeedData>();
  if (gameIds.length === 0) return map;

  const rows = await db
    .select({
      id: games.id,
      title: games.title,
      startingFen: games.startingFen,
      result: games.result,
      createdAt: games.createdAt,
      author: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        country: profiles.country,
        flair: profiles.flair,
      },
    })
    .from(games)
    .leftJoin(profiles, eq(games.authorId, profiles.id))
    .where(and(inArray(games.id, gameIds), isNull(games.deletedAt), eq(games.status, 'public')));

  const foundIds = rows.map((r) => r.id);
  const [likeMetaMap, commentMetaMap] = await Promise.all([
    getLikeMetaMap(GAME_LIKE_TARGET, foundIds, currentUserId),
    getGameCommentMetaMap(foundIds),
  ]);

  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      title: row.title,
      fen: row.startingFen ?? getStartingFen(),
      result: row.result,
      createdAt: row.createdAt.toISOString(),
      author: row.author?.username
        ? {
            username: row.author.username,
            displayName: row.author.displayName,
            avatarUrl: row.author.avatarUrl,
            country: row.author.country,
            flair: row.author.flair,
          }
        : null,
      likeMeta: likeMetaMap.get(row.id) ?? { likeCount: 0, likedByMe: false },
      replyMeta: commentMetaMap.get(row.id) ?? EMPTY_REPLY_META,
    });
  }

  return map;
}
