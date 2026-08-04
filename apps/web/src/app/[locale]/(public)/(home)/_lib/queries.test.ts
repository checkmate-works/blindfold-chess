import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFeedData } from './queries';

// --- Mocks ---

const mockDbSelectResult = vi.fn();
const mockDbSelectJoinResult = vi.fn();
const mockAttachProfilePostMeta = vi.fn();
const mockEq = vi.fn();

// The db mock swallows the WHERE clause, so the only way to assert that a
// filter reaches SQL is to spy on the operator that builds it. `eq` is used
// exactly once in `queries.ts` — for the actor scope — and the tests that
// assert on it use a feed row whose entity type matches no loader, so no
// loader's own `eq` calls can leak into the spy. `liveFeedRow` is stubbed
// below for the same reason: it builds five more `eq`s of its own, and its
// SQL is asserted directly in `feed-liveness.test.ts`.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (...args: Parameters<typeof actual.eq>) => {
      mockEq(...args);
      return actual.eq(...args);
    },
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => mockDbSelectResult(),
          }),
        }),
        leftJoin: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => mockDbSelectJoinResult(),
            }),
          }),
        }),
      }),
    }),
  },
  feedItems: {
    id: 'id',
    entityType: 'entity_type',
    entityId: 'entity_id',
    actorId: 'actor_id',
    createdAt: 'created_at',
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    deletedAt: 'deleted_at',
    topicKey: 'topic_key',
  },
  profiles: { id: 'id' },
  topicPostRatings: { postId: 'post_id' },
  chessOpenings: { slug: 'slug', name: 'name', fen: 'fen' },
  AUTHOR_PROFILE_COLUMNS: {
    username: 'username',
    displayName: 'display_name',
    avatarUrl: 'avatar_url',
  },
  liveProfileJoinOn: (ownerColumn: unknown) => ['liveProfileJoinOn', ownerColumn],
}));

// Stubbed to a sentinel: what it compiles to is `feed-liveness.test.ts`'s
// job; here we only need it not to build real subqueries against the db mock.
const mockLiveFeedRow = vi.fn(() => 'LIVE_FEED_ROW');
vi.mock('./feed-liveness', () => ({
  liveFeedRow: () => mockLiveFeedRow(),
}));

vi.mock('@/app/[locale]/(public)/topics/_lib/post-meta', () => ({
  attachProfilePostMeta: (...args: unknown[]) => mockAttachProfilePostMeta(...args),
}));

vi.mock('@/app/[locale]/(public)/topics/_lib/shared', () => ({
  authorSelect: {},
  ratingSelect: {},
}));

// --- Helpers ---

function createFeedRow(
  overrides: Partial<{
    id: string;
    entityType: string;
    entityId: string;
    actorId: string;
    createdAt: Date;
  }> = {}
) {
  return {
    id: overrides.id ?? 'feed-1',
    entityType: overrides.entityType ?? 'topic_post',
    entityId: overrides.entityId ?? 'post-1',
    actorId: overrides.actorId ?? 'user-1',
    createdAt: overrides.createdAt ?? new Date('2025-01-15T10:00:00.000Z'),
  };
}

function createPostWithMeta(id: string) {
  return {
    id,
    content: 'Test content',
    topicType: 'opening',
    topicKey: 'sicilian-defense',
    createdAt: new Date('2025-01-15T10:00:00.000Z'),
    author: {
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      flair: null,
      country: null,
    },
    replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
    likeMeta: { likeCount: 0, likedByMe: false },
    rating: null,
    openingName: 'Sicilian Defense',
    openingFen: null,
  };
}

// --- Tests ---

describe('getFeedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty results', () => {
    it('should return empty items and null nextCursor when no feed items exist', async () => {
      mockDbSelectResult.mockResolvedValue([]);

      const result = await getFeedData({ limit: 10 });

      expect(result).toEqual({ items: [], nextCursor: null });
    });
  });

  describe('pagination', () => {
    it('should return nextCursor as null when items count is at or below limit', async () => {
      const feedRow = createFeedRow();
      const postMeta = createPostWithMeta('post-1');

      mockDbSelectResult.mockResolvedValue([feedRow]);
      mockDbSelectJoinResult.mockResolvedValue([]);
      mockAttachProfilePostMeta.mockResolvedValue([postMeta]);

      const result = await getFeedData({ limit: 10 });

      expect(result.nextCursor).toBeNull();
    });

    it('should return nextCursor when there are more items', async () => {
      // Simulate limit+1 rows returned (has more)
      const rows = [
        createFeedRow({
          id: 'feed-1',
          entityId: 'post-1',
          createdAt: new Date('2025-01-15T10:00:00.000Z'),
        }),
        createFeedRow({
          id: 'feed-2',
          entityId: 'post-2',
          createdAt: new Date('2025-01-15T09:00:00.000Z'),
        }),
        createFeedRow({
          id: 'feed-3',
          entityId: 'post-3',
          createdAt: new Date('2025-01-15T08:00:00.000Z'),
        }),
      ];

      mockDbSelectResult.mockResolvedValue(rows);

      const post1 = createPostWithMeta('post-1');
      const post2 = createPostWithMeta('post-2');
      mockDbSelectJoinResult.mockResolvedValue([]);
      mockAttachProfilePostMeta.mockResolvedValue([post1, post2]);

      // limit=2, so 3 rows means hasMore=true
      const result = await getFeedData({ limit: 2 });

      expect(result.nextCursor).toBe('2025-01-15T09:00:00.000Z');
      expect(result.items).toHaveLength(2);
    });
  });

  describe('entity data filtering', () => {
    it('should filter out items whose topic_post data was not found (deleted posts)', async () => {
      const feedRow1 = createFeedRow({ id: 'feed-1', entityId: 'post-1' });
      const feedRow2 = createFeedRow({ id: 'feed-2', entityId: 'post-2-deleted' });

      mockDbSelectResult.mockResolvedValue([feedRow1, feedRow2]);

      // Only post-1 is returned from DB (post-2-deleted was filtered by deletedAt IS NULL)
      const post1 = createPostWithMeta('post-1');
      mockDbSelectJoinResult.mockResolvedValue([]);
      mockAttachProfilePostMeta.mockResolvedValue([post1]);

      const result = await getFeedData({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].entityId).toBe('post-1');
    });
  });

  describe('FeedItem construction', () => {
    it('should construct FeedItem with correct fields for topic_post type', async () => {
      const createdAt = new Date('2025-01-15T10:00:00.000Z');
      const feedRow = createFeedRow({
        id: 'feed-1',
        entityType: 'topic_post',
        entityId: 'post-1',
        actorId: 'user-1',
        createdAt,
      });

      mockDbSelectResult.mockResolvedValue([feedRow]);

      const postMeta = createPostWithMeta('post-1');
      mockDbSelectJoinResult.mockResolvedValue([]);
      mockAttachProfilePostMeta.mockResolvedValue([postMeta]);

      const result = await getFeedData({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'feed-1',
        entityType: 'topic_post',
        entityId: 'post-1',
        actorId: 'user-1',
        createdAt: '2025-01-15T10:00:00.000Z',
        data: postMeta,
      });
    });

    it('should skip rows with unknown entity types', async () => {
      const feedRow = createFeedRow({ entityType: 'unknown_type' });

      mockDbSelectResult.mockResolvedValue([feedRow]);

      const result = await getFeedData({ limit: 10 });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('batch fetching', () => {
    it('should not query topic_posts when there are no topic_post feed items', async () => {
      // Simulate a scenario with no topic_post items (all unknown types)
      const feedRow = createFeedRow({ entityType: 'some_future_type' });
      mockDbSelectResult.mockResolvedValue([feedRow]);

      const result = await getFeedData({ limit: 10 });

      expect(mockDbSelectJoinResult).not.toHaveBeenCalled();
      expect(mockAttachProfilePostMeta).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(0);
    });

    it('should restrict the page to rows whose subject can still be rendered', async () => {
      // Without this predicate in the WHERE, a dead row consumes one of the
      // `limit` slots and the page comes back short — or empty behind a live
      // cursor, which is what made the timeline loop.
      mockDbSelectResult.mockResolvedValue([createFeedRow({ entityType: 'some_future_type' })]);

      await getFeedData({ limit: 10 });

      expect(mockLiveFeedRow).toHaveBeenCalled();
    });

    it('should not apply an actor filter when actorId is omitted', async () => {
      mockDbSelectResult.mockResolvedValue([createFeedRow({ entityType: 'some_future_type' })]);

      await getFeedData({ limit: 10 });

      expect(mockEq).not.toHaveBeenCalled();
    });

    it('should apply an actor filter when actorId is provided', async () => {
      mockDbSelectResult.mockResolvedValue([createFeedRow({ entityType: 'some_future_type' })]);

      await getFeedData({ limit: 10, actorId: 'actor-1' });

      expect(mockEq).toHaveBeenCalledWith('actor_id', 'actor-1');
    });

    it('should pass currentUserId to attachProfilePostMeta', async () => {
      const feedRow = createFeedRow();
      mockDbSelectResult.mockResolvedValue([feedRow]);

      const postMeta = createPostWithMeta('post-1');
      mockDbSelectJoinResult.mockResolvedValue([]);
      mockAttachProfilePostMeta.mockResolvedValue([postMeta]);

      const userId = 'user-00000000-0000-0000-0000-000000000001';
      await getFeedData({ limit: 10, currentUserId: userId });

      expect(mockAttachProfilePostMeta).toHaveBeenCalledWith(expect.anything(), userId);
    });
  });
});
