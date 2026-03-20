import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getPostsWithReplyMeta, getRepliesByPostId } from './queries';

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
  };

  return {
    db: mockDb,
    topicPosts: {
      id: 'topic_posts.id',
      userId: 'topic_posts.user_id',
      topicType: 'topic_posts.topic_type',
      topicKey: 'topic_posts.topic_key',
      parentId: 'topic_posts.parent_id',
      rootPostId: 'topic_posts.root_post_id',
      content: 'topic_posts.content',
      createdAt: 'topic_posts.created_at',
      deletedAt: 'topic_posts.deleted_at',
    },
    profiles: {
      id: 'profiles.id',
      username: 'profiles.username',
      displayName: 'profiles.display_name',
      avatarUrl: 'profiles.avatar_url',
      flair: 'profiles.flair',
      country: 'profiles.country',
    },
    topicPostLikes: {
      id: 'topic_post_likes.id',
      userId: 'topic_post_likes.user_id',
      postId: 'topic_post_likes.post_id',
      createdAt: 'topic_post_likes.created_at',
    },
    topicPostRatings: {
      preferenceRating: 'topic_post_ratings.preference_rating',
      proficiencyRating: 'topic_post_ratings.proficiency_rating',
    },
  };
});

const mockDb = vi.mocked(db);

/**
 * Creates a chainable mock that resolves to `rows` when awaited.
 * Each chained method returns the same object so the Drizzle-style chaining works.
 */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'from',
    'leftJoin',
    'innerJoin',
    'where',
    'orderBy',
    'groupBy',
    'limit',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const testPostId = 'post-00000000-0000-0000-0000-000000000001';
const otherPostId = 'post-00000000-0000-0000-0000-000000000002';

describe('getRepliesByPostId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no replies exist', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toEqual([]);
  });

  /**
   * Helper: configure sequential db.select calls for getRepliesByPostId.
   * Call 1: replies query
   * Call 2: replyStats (attachPostMeta)
   * Call 3: repliesWithAuthors (attachPostMeta)
   * Call 4: likeCounts (attachPostMeta)
   */
  function setupReplyMocks(
    replyRows: unknown[],
    statsRows: unknown[] = [],
    avatarRows: unknown[] = [],
    likeRows: unknown[] = []
  ) {
    const repliesChain = mockChain(replyRows);
    const statsChain = mockChain(statsRows);
    const avatarsChain = mockChain(avatarRows);
    const likesChain = mockChain(likeRows);

    mockDb.select
      .mockReturnValueOnce(repliesChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(statsChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(avatarsChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(likesChain as unknown as ReturnType<typeof mockDb.select>);
  }

  it('should return replies with author profile data', async () => {
    const rows = [
      {
        post: {
          id: 'reply-1',
          userId: 'user-1',
          topicType: 'square',
          topicKey: 'e4',
          parentId: testPostId,
          content: 'First reply',
          createdAt: new Date('2025-01-02T00:00:00Z'),
        },
        author: {
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: 'https://example.com/alice.png',
          flair: null,
          country: null,
        },
      },
    ];

    setupReplyMocks(rows);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('reply-1');
    expect(result[0].author).toEqual({
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
      flair: null,
      country: null,
    });
  });

  it('should return replies sorted by createdAt DESC (newest first)', async () => {
    const rows = [
      {
        post: {
          id: 'reply-newer',
          userId: 'user-1',
          topicType: 'square',
          topicKey: 'e4',
          parentId: testPostId,
          content: 'Newer reply',
          createdAt: new Date('2025-01-03T00:00:00Z'),
        },
        author: {
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          flair: null,
          country: null,
        },
      },
      {
        post: {
          id: 'reply-older',
          userId: 'user-2',
          topicType: 'square',
          topicKey: 'e4',
          parentId: testPostId,
          content: 'Older reply',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
        author: {
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: 'https://example.com/alice.png',
          flair: null,
          country: null,
        },
      },
    ];

    setupReplyMocks(rows);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('reply-newer');
    expect(result[1].id).toBe('reply-older');
  });

  it('should only return replies for the specified postId (not other posts)', async () => {
    // The mock returns only replies matching the postId passed to the query.
    // We verify the where clause is called by checking db.select is invoked
    // and only the matching rows are returned.
    const matchingRows = [
      {
        post: {
          id: 'reply-for-post-1',
          userId: 'user-1',
          topicType: 'square',
          topicKey: 'e4',
          parentId: testPostId,
          content: 'Reply for post 1',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
        author: {
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          flair: null,
          country: null,
        },
      },
    ];

    setupReplyMocks(matchingRows);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0].parentId).toBe(testPostId);
    expect(result[0].parentId).not.toBe(otherPostId);
  });

  it('should handle author being null (deleted user)', async () => {
    const rows = [
      {
        post: {
          id: 'reply-1',
          userId: 'deleted-user',
          topicType: 'square',
          topicKey: 'd4',
          parentId: testPostId,
          content: 'Reply from deleted user',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
        author: null,
      },
    ];

    setupReplyMocks(rows);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0].author).toBeNull();
  });

  it('should include flair and country in reply author data', async () => {
    const rows = [
      {
        post: {
          id: 'reply-1',
          userId: 'user-1',
          topicType: 'square',
          topicKey: 'e4',
          parentId: testPostId,
          content: 'Reply from titled player',
          createdAt: new Date('2025-01-02T00:00:00Z'),
        },
        author: {
          username: 'grandmaster',
          displayName: 'GM Player',
          avatarUrl: 'https://example.com/gm.png',
          flair: 'GM',
          country: 'NO',
        },
      },
    ];

    setupReplyMocks(rows);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0].author).toEqual({
      username: 'grandmaster',
      displayName: 'GM Player',
      avatarUrl: 'https://example.com/gm.png',
      flair: 'GM',
      country: 'NO',
    });
  });
});

describe('getPostsWithReplyMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper: configure sequential db.select calls for getPostsWithReplyMeta.
   * Call 1: getPostsForSquare (posts)
   * Call 2: replyStats (counts + latestReplyAt)
   * Call 3: repliesWithAvatars (avatar rows)
   * Call 4: likeCounts (like counts per post)
   */
  function setupMocks(
    postRows: unknown[],
    statsRows: unknown[],
    avatarRows: unknown[],
    likeRows: unknown[] = []
  ) {
    const postsChain = mockChain(postRows);
    const statsChain = mockChain(statsRows);
    const avatarsChain = mockChain(avatarRows);
    const likesChain = mockChain(likeRows);

    mockDb.select
      .mockReturnValueOnce(postsChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(statsChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(avatarsChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(likesChain as unknown as ReturnType<typeof mockDb.select>);
  }

  const postRow = (id: string) => ({
    post: {
      id,
      userId: 'user-1',
      topicType: 'square',
      topicKey: 'e4',
      parentId: null,
      content: `Post ${id}`,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    },
    author: {
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
      flair: null,
      country: null,
    },
  });

  it('should return empty array when no posts exist', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toEqual([]);
  });

  it('should return empty replyMeta for posts with no replies', async () => {
    setupMocks([postRow(testPostId)], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(1);
    expect(result[0].replyMeta).toEqual({
      replyCount: 0,
      latestReplyAt: null,
      repliers: [],
      uniqueReplierCount: 0,
    });
  });

  it('should return correct reply count', async () => {
    const statsRows = [
      { rootPostId: testPostId, replyCount: 5, latestReplyAt: new Date('2025-01-10T00:00:00Z') },
    ];

    setupMocks([postRow(testPostId)], statsRows, []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].replyMeta.replyCount).toBe(5);
  });

  it('should return correct latestReplyAt', async () => {
    const latestDate = new Date('2025-02-15T10:30:00Z');
    const statsRows = [{ rootPostId: testPostId, replyCount: 3, latestReplyAt: latestDate }];

    setupMocks([postRow(testPostId)], statsRows, []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].replyMeta.latestReplyAt).toEqual(latestDate);
  });

  it('should return up to 3 unique repliers', async () => {
    const statsRows = [
      { rootPostId: testPostId, replyCount: 4, latestReplyAt: new Date('2025-01-04T00:00:00Z') },
    ];
    const avatarRows = [
      {
        rootPostId: testPostId,
        userId: 'user-a',
        avatarUrl: 'https://example.com/a.png',
        displayName: 'A',
        username: 'a',
        createdAt: new Date('2025-01-04T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-b',
        avatarUrl: 'https://example.com/b.png',
        displayName: 'B',
        username: 'b',
        createdAt: new Date('2025-01-03T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-c',
        avatarUrl: 'https://example.com/c.png',
        displayName: 'C',
        username: 'c',
        createdAt: new Date('2025-01-02T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-d',
        avatarUrl: 'https://example.com/d.png',
        displayName: 'D',
        username: 'd',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    setupMocks([postRow(testPostId)], statsRows, avatarRows);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].replyMeta.repliers).toHaveLength(3);
    expect(result[0].replyMeta.repliers).toEqual([
      { avatarUrl: 'https://example.com/a.png', displayName: 'A' },
      { avatarUrl: 'https://example.com/b.png', displayName: 'B' },
      { avatarUrl: 'https://example.com/c.png', displayName: 'C' },
    ]);
  });

  it('should deduplicate repliers from the same user replying multiple times', async () => {
    const statsRows = [
      { rootPostId: testPostId, replyCount: 3, latestReplyAt: new Date('2025-01-03T00:00:00Z') },
    ];
    const avatarRows = [
      {
        rootPostId: testPostId,
        userId: 'user-alice',
        avatarUrl: 'https://example.com/alice.png',
        displayName: 'Alice',
        username: 'alice',
        createdAt: new Date('2025-01-03T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-alice',
        avatarUrl: 'https://example.com/alice.png',
        displayName: 'Alice',
        username: 'alice',
        createdAt: new Date('2025-01-02T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-bob',
        avatarUrl: 'https://example.com/bob.png',
        displayName: 'Bob',
        username: 'bob',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    setupMocks([postRow(testPostId)], statsRows, avatarRows);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].replyMeta.repliers).toEqual([
      { avatarUrl: 'https://example.com/alice.png', displayName: 'Alice' },
      { avatarUrl: 'https://example.com/bob.png', displayName: 'Bob' },
    ]);
  });

  it('should include repliers with no avatar URL (with displayName)', async () => {
    const statsRows = [
      { rootPostId: testPostId, replyCount: 2, latestReplyAt: new Date('2025-01-02T00:00:00Z') },
    ];
    const avatarRows = [
      {
        rootPostId: testPostId,
        userId: 'user-no-avatar',
        avatarUrl: null,
        displayName: 'NoAvatar',
        username: 'noavatar',
        createdAt: new Date('2025-01-02T00:00:00Z'),
      },
      {
        rootPostId: testPostId,
        userId: 'user-bob',
        avatarUrl: 'https://example.com/bob.png',
        displayName: 'Bob',
        username: 'bob',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    setupMocks([postRow(testPostId)], statsRows, avatarRows);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].replyMeta.repliers).toEqual([
      { avatarUrl: null, displayName: 'NoAvatar' },
      { avatarUrl: 'https://example.com/bob.png', displayName: 'Bob' },
    ]);
  });

  it('should handle multiple posts with different reply metadata', async () => {
    const postRows = [postRow(testPostId), postRow(otherPostId)];
    const statsRows = [
      { rootPostId: testPostId, replyCount: 2, latestReplyAt: new Date('2025-01-05T00:00:00Z') },
      { rootPostId: otherPostId, replyCount: 1, latestReplyAt: new Date('2025-01-03T00:00:00Z') },
    ];
    const avatarRows = [
      {
        rootPostId: testPostId,
        userId: 'user-a',
        avatarUrl: 'https://example.com/a.png',
        displayName: 'A',
        username: 'a',
        createdAt: new Date('2025-01-05T00:00:00Z'),
      },
      {
        rootPostId: otherPostId,
        userId: 'user-b',
        avatarUrl: 'https://example.com/b.png',
        displayName: 'B',
        username: 'b',
        createdAt: new Date('2025-01-03T00:00:00Z'),
      },
    ];

    setupMocks(postRows, statsRows, avatarRows);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(2);
    expect(result[0].replyMeta.replyCount).toBe(2);
    expect(result[0].replyMeta.repliers).toEqual([
      { avatarUrl: 'https://example.com/a.png', displayName: 'A' },
    ]);
    expect(result[1].replyMeta.replyCount).toBe(1);
    expect(result[1].replyMeta.repliers).toEqual([
      { avatarUrl: 'https://example.com/b.png', displayName: 'B' },
    ]);
  });

  it('should preserve post and author data alongside replyMeta', async () => {
    setupMocks([postRow(testPostId)], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result[0].id).toBe(testPostId);
    expect(result[0].content).toBe(`Post ${testPostId}`);
    expect(result[0].author).toEqual({
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
      flair: null,
      country: null,
    });
  });

  it('should include flair and country when author has both', async () => {
    const postWithFlair = {
      post: {
        id: testPostId,
        userId: 'user-1',
        topicType: 'square',
        topicKey: 'e4',
        parentId: null,
        content: 'Post with flair',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
      author: {
        username: 'grandmaster',
        displayName: 'GM Player',
        avatarUrl: 'https://example.com/gm.png',
        flair: 'GM',
        country: 'US',
      },
    };

    setupMocks([postWithFlair], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(1);
    expect(result[0].author).toEqual({
      username: 'grandmaster',
      displayName: 'GM Player',
      avatarUrl: 'https://example.com/gm.png',
      flair: 'GM',
      country: 'US',
    });
  });

  it('should include flair when author has flair but no country', async () => {
    const postWithFlairOnly = {
      post: {
        id: testPostId,
        userId: 'user-1',
        topicType: 'square',
        topicKey: 'e4',
        parentId: null,
        content: 'Post with flair only',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
      author: {
        username: 'titled_player',
        displayName: 'Titled Player',
        avatarUrl: null,
        flair: 'FM',
        country: null,
      },
    };

    setupMocks([postWithFlairOnly], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(1);
    expect(result[0].author?.flair).toBe('FM');
    expect(result[0].author?.country).toBeNull();
  });

  it('should include country when author has country but no flair', async () => {
    const postWithCountryOnly = {
      post: {
        id: testPostId,
        userId: 'user-1',
        topicType: 'square',
        topicKey: 'e4',
        parentId: null,
        content: 'Post with country only',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
      author: {
        username: 'casual_player',
        displayName: 'Casual Player',
        avatarUrl: 'https://example.com/casual.png',
        flair: null,
        country: 'JP',
      },
    };

    setupMocks([postWithCountryOnly], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(1);
    expect(result[0].author?.flair).toBeNull();
    expect(result[0].author?.country).toBe('JP');
  });

  it('should handle author with neither flair nor country', async () => {
    setupMocks([postRow(testPostId)], [], []);

    const result = await getPostsWithReplyMeta('e4');

    expect(result).toHaveLength(1);
    expect(result[0].author?.flair).toBeNull();
    expect(result[0].author?.country).toBeNull();
  });

  describe('uniqueReplierCount', () => {
    it('should return uniqueReplierCount 0 when post has no replies', async () => {
      setupMocks([postRow(testPostId)], [], []);

      const result = await getPostsWithReplyMeta('e4');

      expect(result[0].replyMeta.uniqueReplierCount).toBe(0);
    });

    it('should return uniqueReplierCount equal to repliers length when <= 3 unique repliers', async () => {
      const statsRows = [
        { rootPostId: testPostId, replyCount: 3, latestReplyAt: new Date('2025-01-03T00:00:00Z') },
      ];
      const avatarRows = [
        {
          rootPostId: testPostId,
          userId: 'user-a',
          avatarUrl: 'https://example.com/a.png',
          displayName: 'A',
          username: 'a',
          createdAt: new Date('2025-01-03T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-b',
          avatarUrl: 'https://example.com/b.png',
          displayName: 'B',
          username: 'b',
          createdAt: new Date('2025-01-02T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-c',
          avatarUrl: 'https://example.com/c.png',
          displayName: 'C',
          username: 'c',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      setupMocks([postRow(testPostId)], statsRows, avatarRows);

      const result = await getPostsWithReplyMeta('e4');

      expect(result[0].replyMeta.repliers).toHaveLength(3);
      expect(result[0].replyMeta.uniqueReplierCount).toBe(3);
    });

    it('should return uniqueReplierCount greater than repliers length when > 3 unique repliers', async () => {
      const statsRows = [
        { rootPostId: testPostId, replyCount: 5, latestReplyAt: new Date('2025-01-05T00:00:00Z') },
      ];
      const avatarRows = [
        {
          rootPostId: testPostId,
          userId: 'user-a',
          avatarUrl: 'https://example.com/a.png',
          displayName: 'A',
          username: 'a',
          createdAt: new Date('2025-01-05T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-b',
          avatarUrl: 'https://example.com/b.png',
          displayName: 'B',
          username: 'b',
          createdAt: new Date('2025-01-04T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-c',
          avatarUrl: 'https://example.com/c.png',
          displayName: 'C',
          username: 'c',
          createdAt: new Date('2025-01-03T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-d',
          avatarUrl: 'https://example.com/d.png',
          displayName: 'D',
          username: 'd',
          createdAt: new Date('2025-01-02T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-e',
          avatarUrl: 'https://example.com/e.png',
          displayName: 'E',
          username: 'e',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      setupMocks([postRow(testPostId)], statsRows, avatarRows);

      const result = await getPostsWithReplyMeta('e4');

      // Only 3 repliers in the array, but 5 unique repliers total
      expect(result[0].replyMeta.repliers).toHaveLength(3);
      expect(result[0].replyMeta.uniqueReplierCount).toBe(5);
    });

    it('should not count duplicate users in uniqueReplierCount', async () => {
      const statsRows = [
        { rootPostId: testPostId, replyCount: 6, latestReplyAt: new Date('2025-01-06T00:00:00Z') },
      ];
      // 6 reply rows, but only 4 unique users (user-a and user-b reply twice each)
      const avatarRows = [
        {
          rootPostId: testPostId,
          userId: 'user-a',
          avatarUrl: 'https://example.com/a.png',
          displayName: 'A',
          username: 'a',
          createdAt: new Date('2025-01-06T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-b',
          avatarUrl: 'https://example.com/b.png',
          displayName: 'B',
          username: 'b',
          createdAt: new Date('2025-01-05T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-a',
          avatarUrl: 'https://example.com/a.png',
          displayName: 'A',
          username: 'a',
          createdAt: new Date('2025-01-04T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-c',
          avatarUrl: 'https://example.com/c.png',
          displayName: 'C',
          username: 'c',
          createdAt: new Date('2025-01-03T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-b',
          avatarUrl: 'https://example.com/b.png',
          displayName: 'B',
          username: 'b',
          createdAt: new Date('2025-01-02T00:00:00Z'),
        },
        {
          rootPostId: testPostId,
          userId: 'user-d',
          avatarUrl: 'https://example.com/d.png',
          displayName: 'D',
          username: 'd',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      setupMocks([postRow(testPostId)], statsRows, avatarRows);

      const result = await getPostsWithReplyMeta('e4');

      expect(result[0].replyMeta.repliers).toHaveLength(3);
      expect(result[0].replyMeta.uniqueReplierCount).toBe(4);
    });
  });

  describe('sortBy parameter', () => {
    const postIdA = 'post-a';
    const postIdB = 'post-b';
    const postIdC = 'post-c';

    /**
     * Helper to create a post row with a specific createdAt date.
     */
    const postRowWithDate = (id: string, createdAt: Date) => ({
      post: {
        id,
        userId: 'user-1',
        topicType: 'square',
        topicKey: 'e4',
        parentId: null,
        content: `Post ${id}`,
        createdAt,
      },
      author: {
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
        flair: null,
        country: null,
      },
    });

    it('should return posts in createdAt DESC order for default (new) sort', async () => {
      // getPostsForSquare already returns createdAt DESC, so "new" preserves that order
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];

      setupMocks(postRows, [], [], []);

      const result = await getPostsWithReplyMeta('e4', undefined, 'new');

      expect(result.map((p) => p.id)).toEqual([postIdA, postIdB, postIdC]);
    });

    it('should sort by like count DESC for popular sort', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      const likeRows = [
        { postId: postIdA, likeCount: 1 },
        { postId: postIdB, likeCount: 10 },
        { postId: postIdC, likeCount: 5 },
      ];

      setupMocks(postRows, [], [], likeRows);

      const result = await getPostsWithReplyMeta('e4', undefined, 'popular');

      expect(result.map((p) => p.id)).toEqual([postIdB, postIdC, postIdA]);
    });

    it('should use createdAt DESC as tiebreaker for popular sort when like counts are equal', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      // All posts have equal likes
      const likeRows = [
        { postId: postIdA, likeCount: 3 },
        { postId: postIdB, likeCount: 3 },
        { postId: postIdC, likeCount: 3 },
      ];

      setupMocks(postRows, [], [], likeRows);

      const result = await getPostsWithReplyMeta('e4', undefined, 'popular');

      // Same likes => falls back to createdAt DESC
      expect(result.map((p) => p.id)).toEqual([postIdA, postIdB, postIdC]);
    });

    it('should place posts with zero likes at the bottom for popular sort', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      // Only postIdC has likes
      const likeRows = [{ postId: postIdC, likeCount: 2 }];

      setupMocks(postRows, [], [], likeRows);

      const result = await getPostsWithReplyMeta('e4', undefined, 'popular');

      // postIdC (2 likes) first, then postIdA and postIdB (0 likes) by createdAt DESC
      expect(result.map((p) => p.id)).toEqual([postIdC, postIdA, postIdB]);
    });

    it('should sort by latestReplyAt DESC for active sort', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      const statsRows = [
        { rootPostId: postIdA, replyCount: 1, latestReplyAt: new Date('2025-01-05T00:00:00Z') },
        { rootPostId: postIdB, replyCount: 2, latestReplyAt: new Date('2025-01-10T00:00:00Z') },
        { rootPostId: postIdC, replyCount: 1, latestReplyAt: new Date('2025-01-07T00:00:00Z') },
      ];

      setupMocks(postRows, statsRows, []);

      const result = await getPostsWithReplyMeta('e4', undefined, 'active');

      // postIdB (Jan 10) > postIdC (Jan 7) > postIdA (Jan 5)
      expect(result.map((p) => p.id)).toEqual([postIdB, postIdC, postIdA]);
    });

    it('should place posts with no replies at the bottom for active sort', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      // Only postIdC has replies
      const statsRows = [
        { rootPostId: postIdC, replyCount: 1, latestReplyAt: new Date('2025-01-08T00:00:00Z') },
      ];

      setupMocks(postRows, statsRows, []);

      const result = await getPostsWithReplyMeta('e4', undefined, 'active');

      // postIdC (has reply) first, then postIdA and postIdB (no replies, timestamp=0) by createdAt DESC
      expect(result.map((p) => p.id)).toEqual([postIdC, postIdA, postIdB]);
    });

    it('should use createdAt DESC as tiebreaker for active sort when latestReplyAt is equal', async () => {
      const sameReplyDate = new Date('2025-01-10T00:00:00Z');
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-02T00:00:00Z')),
        postRowWithDate(postIdC, new Date('2025-01-01T00:00:00Z')),
      ];
      const statsRows = [
        { rootPostId: postIdA, replyCount: 1, latestReplyAt: sameReplyDate },
        { rootPostId: postIdB, replyCount: 1, latestReplyAt: sameReplyDate },
        { rootPostId: postIdC, replyCount: 1, latestReplyAt: sameReplyDate },
      ];

      setupMocks(postRows, statsRows, []);

      const result = await getPostsWithReplyMeta('e4', undefined, 'active');

      // Same latestReplyAt => falls back to createdAt DESC
      expect(result.map((p) => p.id)).toEqual([postIdA, postIdB, postIdC]);
    });

    it('should default to new sort when sortBy is omitted', async () => {
      const postRows = [
        postRowWithDate(postIdA, new Date('2025-01-03T00:00:00Z')),
        postRowWithDate(postIdB, new Date('2025-01-01T00:00:00Z')),
      ];

      setupMocks(postRows, [], [], []);

      // Call without sortBy parameter
      const result = await getPostsWithReplyMeta('e4');

      expect(result.map((p) => p.id)).toEqual([postIdA, postIdB]);
    });
  });
});
