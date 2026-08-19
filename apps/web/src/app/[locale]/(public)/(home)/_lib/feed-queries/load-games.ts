import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { and, inArray } from 'drizzle-orm';

import { getReviewedGameIdSet } from '@/lib/ai-review/queries';
import { AUTHOR_PROFILE_COLUMNS, db, games, liveProfileJoinOn, profiles } from '@/lib/db';
import { publiclyVisible } from '@/lib/db/games-visibility';
import { EMPTY_LIKE_META, GAME_LIKE_TARGET, getLikeMetaMap } from '@/lib/db/like-queries';
import { EMPTY_REPLY_META, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';
import { playSettingsToThumbnailDisplay } from '@/lib/games/play-settings-thumbnail';

import type { GameFeedData } from '../types';

/**
 * Bulk-load the `game` entities referenced by a slice of feed rows, plus their
 * per-viewer like meta (`target_type = 'game'`) and comment meta (`game_comments`
 * keyed by `game_id`). The thumbnail FEN is the opening position (`startingFen`,
 * or the standard start), with the game's start-of-game blindfold settings folded
 * into `thumbnailDisplay` so the card previews how it was played (ghosts / stones
 * / single colour) rather than an identical opening board. Only `public`,
 * non-deleted games are returned — a game
 * the author later set private (planned) or soft-deleted silently drops out of
 * the feed, matching the deleted-entity handling the other loaders use.
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
      playSettings: games.playSettings,
      playerColor: games.playerColor,
      result: games.result,
      createdAt: games.createdAt,
      author: {
        ...AUTHOR_PROFILE_COLUMNS,
        country: profiles.country,
        flair: profiles.flair,
      },
    })
    .from(games)
    .leftJoin(profiles, liveProfileJoinOn(games.authorId))
    .where(and(inArray(games.id, gameIds), publiclyVisible()));

  const foundIds = rows.map((r) => r.id);
  const [likeMetaMap, commentMetaMap, reviewedIds] = await Promise.all([
    getLikeMetaMap(GAME_LIKE_TARGET, foundIds, currentUserId),
    getGameCommentMetaMap(foundIds),
    getReviewedGameIdSet(foundIds),
  ]);

  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      title: row.title,
      fen: row.startingFen ?? getStartingFen(),
      thumbnailDisplay: playSettingsToThumbnailDisplay(row.playSettings, row.playerColor),
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
      likeMeta: likeMetaMap.get(row.id) ?? EMPTY_LIKE_META,
      replyMeta: commentMetaMap.get(row.id) ?? EMPTY_REPLY_META,
      aiReviewed: reviewedIds.has(row.id),
    });
  }

  return map;
}
