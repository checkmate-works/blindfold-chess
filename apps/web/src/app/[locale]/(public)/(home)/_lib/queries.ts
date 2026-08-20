import { and, desc, eq, inArray, lt } from 'drizzle-orm';

import { db, feedItems } from '@/lib/db';

import { liveFeedRow } from './feed-liveness';
import { loadChunksForFeed } from './feed-queries/load-chunks';
import { loadGamesForFeed } from './feed-queries/load-games';
import { loadPositionsForFeed } from './feed-queries/load-positions';
import { loadRankUpdateActors } from './feed-queries/load-rank-update-actors';
import { loadTopicPostsForFeed } from './feed-queries/load-topic-posts';
import type { ChallengeRankUpdateData, FeedItem, FeedResponse } from './types';

/**
 * Entity types surfaced by the `/topics` list feed. The topics list reuses the
 * home feed machinery but scopes it to discussion topics: square/opening
 * top-level posts (`topic_post` — chunk/position *comments* never emit a feed
 * item, so these rows are always square/opening) plus chunk entities
 * (`chunk`). Practice-scoped entities (`position`, `challenge_rank_update`)
 * are deliberately excluded — they are not "topics".
 */
export const TOPICS_FEED_ENTITY_TYPES = ['topic_post', 'chunk'] as const;

/**
 * Fetch a page of feed items with their full entity data.
 *
 * @design Cursor-based pagination
 * The cursor is the ISO 8601 `createdAt` timestamp of the last item on
 * the previous page. The query uses
 * `WHERE created_at < cursor ORDER BY created_at DESC LIMIT N+1` (the
 * `+1` detects whether a next page exists).
 *
 * @design A page of `limit` rows is `limit` renderable items
 * The `WHERE` carries {@link liveFeedRow}, so rows whose subject has been
 * deleted (or made private) never reach the page in the first place. Before
 * that filter existed they were fetched, counted against the limit, and then
 * dropped by the loaders — so a page could come back with a live cursor and
 * nothing on it, which every caller then had to work around. Callers can now
 * read an empty result as "the feed is exhausted".
 *
 * @design Per-entity-type loaders
 * After fetching the `feed_items` rows, the four entity loaders run in
 * parallel — one per `entityType`. Each loader returns a
 * `Map<entityId, data>`. Splitting one loader per type makes each loader read
 * like a focused query helper instead of a branch inside a 200-line IIFE
 * chain. They still skip a missing entity rather than assuming one, so a row
 * deleted between this query and the loader's own is a dropped item, not a
 * crash — that race is the only way a page can now come up short.
 *
 * @design Options object
 * Both filters below narrow the same query and are optional, and a positional
 * signature had already reached four parameters with two of them optional —
 * every new caller had to pad with `undefined`. Naming them at the call site
 * also makes `actorId` (a *scope*) hard to confuse with `currentUserId` (the
 * *viewer*, used for like/reply meta); those two are different users whenever
 * someone views another member's profile.
 */
export async function getFeedData({
  cursor,
  limit,
  currentUserId,
  entityTypes,
  actorId,
}: {
  cursor?: string;
  limit: number;
  /** The viewer, for `likedByMe` and other per-viewer meta. */
  currentUserId?: string;
  /**
   * Optional whitelist of `feed_items.entityType` values to include. Omit (the
   * home feed) to fetch every entity type; pass a subset (e.g.
   * `TOPICS_FEED_ENTITY_TYPES`) to scope the feed. The filter is applied in SQL
   * so pagination/cursor math stays correct.
   */
  entityTypes?: readonly string[];
  /**
   * Optional author scope — restricts the feed to one member's own activity
   * (the public profile timeline). Backed by `idx_feed_items_actor_created`,
   * which covers this filter together with the cursor's ORDER BY.
   */
  actorId?: string;
}): Promise<FeedResponse> {
  const feedRows = await db
    .select()
    .from(feedItems)
    .where(
      and(
        cursor ? lt(feedItems.createdAt, new Date(cursor)) : undefined,
        entityTypes ? inArray(feedItems.entityType, [...entityTypes]) : undefined,
        actorId ? eq(feedItems.actorId, actorId) : undefined,
        liveFeedRow()
      )
    )
    .orderBy(desc(feedItems.createdAt))
    .limit(limit + 1);

  const { rows, nextCursor } = splitFeedPage(feedRows, limit);

  const topicPostIds = rows.filter((r) => r.entityType === 'topic_post').map((r) => r.entityId);
  const positionIds = rows.filter((r) => r.entityType === 'position').map((r) => r.entityId);
  const chunkIds = rows.filter((r) => r.entityType === 'chunk').map((r) => r.entityId);
  const gameIds = rows.filter((r) => r.entityType === 'game').map((r) => r.entityId);
  const rankUpdateActorIds = [
    ...new Set(rows.filter((r) => r.entityType === 'challenge_rank_update').map((r) => r.actorId)),
  ];

  const [topicPostMap, positionMap, chunkMap, gameMap, rankUpdateActorMap] = await Promise.all([
    loadTopicPostsForFeed(topicPostIds, currentUserId),
    loadPositionsForFeed(positionIds, currentUserId),
    loadChunksForFeed(chunkIds, currentUserId),
    loadGamesForFeed(gameIds, currentUserId),
    loadRankUpdateActors(rankUpdateActorIds),
  ]);

  const items = assembleFeedItems(rows, {
    topicPostMap,
    positionMap,
    chunkMap,
    gameMap,
    rankUpdateActorMap,
  });

  return { items, nextCursor };
}

/** One `feed_items` row as selected above. */
export type FeedRow = {
  id: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: Date;
  metadata: unknown;
};

/**
 * Split the over-fetched page (`limit + 1` rows) into the page proper and the
 * cursor for the next one.
 *
 * The extra row is the has-more probe and must never be returned: the feed's
 * contract is that a page of `limit` rows is `limit` renderable items, and
 * the cursor is the timestamp of the last row actually returned.
 */
export function splitFeedPage<T extends { createdAt: Date }>(
  feedRows: readonly T[],
  limit: number
): { rows: T[]; nextCursor: string | null } {
  const hasMore = feedRows.length > limit;
  const rows = hasMore ? feedRows.slice(0, limit) : [...feedRows];
  return {
    rows,
    nextCursor: hasMore ? rows[rows.length - 1].createdAt.toISOString() : null,
  };
}

/**
 * The per-entity-type lookups the assembly joins each row against, derived
 * from the loaders that produce them so the shapes cannot drift apart.
 */
export type FeedEntityMaps = {
  topicPostMap: Awaited<ReturnType<typeof loadTopicPostsForFeed>>;
  positionMap: Awaited<ReturnType<typeof loadPositionsForFeed>>;
  chunkMap: Awaited<ReturnType<typeof loadChunksForFeed>>;
  gameMap: Awaited<ReturnType<typeof loadGamesForFeed>>;
  rankUpdateActorMap: Awaited<ReturnType<typeof loadRankUpdateActors>>;
};

/**
 * Join each feed row to its entity payload, dropping rows whose entity is
 * gone — the entity can be deleted between the feed-item write and this read,
 * and a feed item with no entity has nothing to render.
 *
 * Pure, and separate from the fetch: this is where the page's invariants
 * actually live (the drop-when-missing rule, the chunk metadata's
 * created/published coercion, the unvalidated `challenge_rank_update`
 * metadata casts), and inline they could only be exercised through a
 * hand-built chainable `db` stub.
 */
export function assembleFeedItems(rows: readonly FeedRow[], maps: FeedEntityMaps): FeedItem[] {
  const items: FeedItem[] = [];

  for (const row of rows) {
    const base = {
      id: row.id,
      entityId: row.entityId,
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.entityType === 'topic_post') {
      const data = maps.topicPostMap.get(row.entityId);
      if (data) items.push({ ...base, entityType: 'topic_post', data });
    } else if (row.entityType === 'position') {
      const data = maps.positionMap.get(row.entityId);
      if (data) items.push({ ...base, entityType: 'position', data });
    } else if (row.entityType === 'chunk') {
      const data = maps.chunkMap.get(row.entityId);
      if (data) {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        const kind = metadata.kind === 'published' ? 'published' : 'created';
        items.push({ ...base, entityType: 'chunk', data: { ...data, kind } });
      }
    } else if (row.entityType === 'game') {
      const data = maps.gameMap.get(row.entityId);
      if (data) items.push({ ...base, entityType: 'game', data });
    } else if (row.entityType === 'challenge_rank_update') {
      const actor = maps.rankUpdateActorMap.get(row.actorId);
      if (actor) {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        // The rank threshold is applied in SQL (see `liveFeedRow`), not here.
        // Dropping a fetched row would put a hole back in the page and undo
        // the guarantee that a page of `limit` rows is `limit` items.
        const data: ChallengeRankUpdateData = {
          menuType: metadata.menuType as string,
          leaderboardKey: metadata.leaderboardKey as string,
          score: metadata.score as number,
          incorrectAnswers: metadata.incorrectAnswers as number,
          timeTaken: metadata.timeTaken as number,
          rank: metadata.rank as number,
          isNewEntry: metadata.isNewEntry as boolean,
          actor,
        };
        items.push({ ...base, entityType: 'challenge_rank_update', data });
      }
    }
  }

  return items;
}
