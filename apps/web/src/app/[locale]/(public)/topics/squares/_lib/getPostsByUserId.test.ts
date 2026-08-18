import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import type { ProfilePostWithReplyMeta } from './queries';
import { getPostsByUserId } from './queries';

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
    likes: {
      id: 'likes.id',
      userId: 'likes.user_id',
      targetType: 'likes.target_type',
      targetId: 'likes.target_id',
      createdAt: 'likes.created_at',
    },
    topicPostRatings: {
      postId: 'topic_post_ratings.post_id',
      preferenceRating: 'topic_post_ratings.preference_rating',
      proficiencyRating: 'topic_post_ratings.proficiency_rating',
    },
    chessOpenings: {
      slug: 'chess_openings.slug',
      name: 'chess_openings.name',
    },
    // Same fake column ids as the `profiles` mock above so select shapes built
    // from the shared columns stay consistent.
    AUTHOR_PROFILE_COLUMNS: {
      username: 'profiles.username',
      displayName: 'profiles.display_name',
      avatarUrl: 'profiles.avatar_url',
    },
    SOCIAL_AUTHOR_COLUMNS: {
      username: 'username',
      displayName: 'display_name',
      avatarUrl: 'avatar_url',
      flair: 'flair',
      country: 'country',
    },
    liveProfileJoinOn: vi.fn((ownerColumn: unknown) => ['liveProfileJoinOn', ownerColumn]),
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
    'offset',
    '$dynamic',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const userId = 'user-00000000-0000-0000-0000-000000000001';
const currentUserId = 'viewer-00000000-0000-0000-0000-000000000001';

const defaultAuthor = {
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/alice.png',
  flair: null,
  country: null,
};

/**
 * Helper: configure sequential db.select calls for getPostsByUserId.
 * Call 1: main query (posts + profiles + ratings)
 * Call 2: replyStats (attachPostMeta)
 * Call 3: repliesWithAuthors (attachPostMeta)
 * Call 4: likeCounts (attachPostMeta)
 * Call 5 (optional): userLikes (attachPostMeta, only when currentUserId is provided)
 */
function setupMocks(
  mainRows: unknown[],
  statsRows: unknown[] = [],
  avatarRows: unknown[] = [],
  likeRows: unknown[] = [],
  userLikeRows?: unknown[]
) {
  const mainChain = mockChain(mainRows);
  const statsChain = mockChain(statsRows);
  const avatarsChain = mockChain(avatarRows);
  const likesChain = mockChain(likeRows);

  mockDb.select
    .mockReturnValueOnce(mainChain as unknown as ReturnType<typeof mockDb.select>)
    .mockReturnValueOnce(statsChain as unknown as ReturnType<typeof mockDb.select>)
    .mockReturnValueOnce(avatarsChain as unknown as ReturnType<typeof mockDb.select>)
    .mockReturnValueOnce(likesChain as unknown as ReturnType<typeof mockDb.select>);

  if (userLikeRows !== undefined) {
    const userLikesChain = mockChain(userLikeRows);
    mockDb.select.mockReturnValueOnce(
      userLikesChain as unknown as ReturnType<typeof mockDb.select>
    );
  }
}

function makePostRow(
  id: string,
  topicType: 'square' | 'opening',
  topicKey: string,
  createdAt: Date,
  rating: { preferenceRating: number | null; proficiencyRating: number | null } | null = null,
  openingName: string | null = null
) {
  return {
    post: {
      id,
      userId,
      topicType,
      topicKey,
      parentId: null,
      content: `Post ${id}`,
      createdAt,
      deletedAt: null,
    },
    author: defaultAuthor,
    rating: rating ?? { preferenceRating: null, proficiencyRating: null },
    openingName,
  };
}

describe('getPostsByUserId', () => {
  it('should return empty array when user has no posts', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostsByUserId(userId);

    expect(result).toEqual([]);
  });

  it('should return only square type posts when only square posts exist', async () => {
    const mainRows = [
      makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z')),
      makePostRow('post-sq-2', 'square', 'd4', new Date('2025-05-01T00:00:00Z')),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.topicType === 'square')).toBe(true);
    expect(result[0].topicKey).toBe('e4');
    expect(result[1].topicKey).toBe('d4');
  });

  it('should return only opening type posts when only opening posts exist', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian-defense', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
      makePostRow('post-op-2', 'opening', 'french-defense', new Date('2025-05-01T00:00:00Z'), {
        preferenceRating: 5,
        proficiencyRating: null,
      }),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.topicType === 'opening')).toBe(true);
  });

  it('should return both square and opening posts, sorted by createdAt DESC', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian', new Date('2025-06-03T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
      makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-02T00:00:00Z')),
      makePostRow('post-op-2', 'opening', 'french', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: 5,
        proficiencyRating: null,
      }),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id)).toEqual(['post-op-1', 'post-sq-1', 'post-op-2']);
    expect(result[0].topicType).toBe('opening');
    expect(result[1].topicType).toBe('square');
    expect(result[2].topicType).toBe('opening');
  });

  it('should correctly attach rating for opening posts with both ratings', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toEqual({
      preferenceRating: 4,
      proficiencyRating: 3,
    });
  });

  it('should correctly attach rating when only preferenceRating is set', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'french', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: 5,
        proficiencyRating: null,
      }),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toEqual({
      preferenceRating: 5,
      proficiencyRating: null,
    });
  });

  it('should correctly attach rating when only proficiencyRating is set', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'caro-kann', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: null,
        proficiencyRating: 2,
      }),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toEqual({
      preferenceRating: null,
      proficiencyRating: 2,
    });
  });

  it('should return null rating for square posts', async () => {
    const mainRows = [makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z'))];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toBeNull();
  });

  it('should return null rating for opening posts without a rating record', async () => {
    // When LEFT JOIN returns null for both rating fields
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'queens-gambit', new Date('2025-06-01T00:00:00Z')),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toBeNull();
  });

  it('should correctly differentiate ratings across mixed posts', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian', new Date('2025-06-03T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
      makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-02T00:00:00Z')),
      makePostRow('post-op-2', 'opening', 'french', new Date('2025-06-01T00:00:00Z')),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(3);
    // Opening with rating
    expect(result[0].rating).toEqual({ preferenceRating: 4, proficiencyRating: 3 });
    // Square post - always null
    expect(result[1].rating).toBeNull();
    // Opening without rating
    expect(result[2].rating).toBeNull();
  });

  it('should include topicKey for all returned posts', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian', new Date('2025-06-02T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
      makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z')),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result[0].topicKey).toBe('sicilian');
    expect(result[1].topicKey).toBe('e4');
  });

  it('should include replyMeta and likeMeta from attachPostMeta', async () => {
    const mainRows = [makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z'))];
    const statsRows = [
      {
        rootPostId: 'post-sq-1',
        replyCount: 3,
        latestReplyAt: new Date('2025-06-05T00:00:00Z'),
      },
    ];
    const likeRows = [{ postId: 'post-sq-1', likeCount: 5 }];

    setupMocks(mainRows, statsRows, [], likeRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].replyMeta.replyCount).toBe(3);
    expect(result[0].likeMeta.likeCount).toBe(5);
    expect(result[0].likeMeta.likedByMe).toBe(false);
  });

  it('should pass currentUserId to attachPostMeta for likedByMe tracking', async () => {
    const mainRows = [makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z'))];
    const userLikeRows = [{ postId: 'post-sq-1' }];

    setupMocks(mainRows, [], [], [], userLikeRows);

    const result = await getPostsByUserId(userId, currentUserId);

    expect(result).toHaveLength(1);
    expect(result[0].likeMeta.likedByMe).toBe(true);
  });

  it('should satisfy ProfilePostWithReplyMeta type shape', async () => {
    const mainRows = [
      makePostRow('post-op-1', 'opening', 'sicilian', new Date('2025-06-01T00:00:00Z'), {
        preferenceRating: 4,
        proficiencyRating: 3,
      }),
    ];

    setupMocks(mainRows);

    const result: ProfilePostWithReplyMeta[] = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    const post = result[0];
    // Verify all required fields from ProfilePostWithReplyMeta exist
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('topicType');
    expect(post).toHaveProperty('topicKey');
    expect(post).toHaveProperty('content');
    expect(post).toHaveProperty('author');
    expect(post).toHaveProperty('replyMeta');
    expect(post).toHaveProperty('likeMeta');
    expect(post).toHaveProperty('rating');
    expect(post).toHaveProperty('openingName');
  });

  it('should return openingName when opening exists in chessOpenings table', async () => {
    const mainRows = [
      makePostRow(
        'post-op-1',
        'opening',
        'sicilian-defense',
        new Date('2025-06-01T00:00:00Z'),
        { preferenceRating: 4, proficiencyRating: 3 },
        'Sicilian Defense'
      ),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].openingName).toBe('Sicilian Defense');
    expect(result[0].topicType).toBe('opening');
  });

  it('should return null openingName when opening does not exist in chessOpenings table', async () => {
    const mainRows = [
      makePostRow(
        'post-op-1',
        'opening',
        'unknown-opening',
        new Date('2025-06-01T00:00:00Z'),
        { preferenceRating: 3, proficiencyRating: null },
        null
      ),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].openingName).toBeNull();
    expect(result[0].topicType).toBe('opening');
  });

  it('should return null openingName for square posts', async () => {
    const mainRows = [makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-01T00:00:00Z'))];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0].openingName).toBeNull();
    expect(result[0].topicType).toBe('square');
  });

  it('should correctly differentiate openingName across mixed posts', async () => {
    const mainRows = [
      makePostRow(
        'post-op-1',
        'opening',
        'french-defense',
        new Date('2025-06-03T00:00:00Z'),
        { preferenceRating: 5, proficiencyRating: 4 },
        'French Defense'
      ),
      makePostRow('post-sq-1', 'square', 'e4', new Date('2025-06-02T00:00:00Z')),
      makePostRow(
        'post-op-2',
        'opening',
        'unknown-opening',
        new Date('2025-06-01T00:00:00Z'),
        { preferenceRating: 2, proficiencyRating: null },
        null
      ),
    ];

    setupMocks(mainRows);

    const result = await getPostsByUserId(userId);

    expect(result).toHaveLength(3);
    // Opening with known name in chessOpenings
    expect(result[0].openingName).toBe('French Defense');
    // Square post - always null
    expect(result[1].openingName).toBeNull();
    // Opening not found in chessOpenings
    expect(result[2].openingName).toBeNull();
  });
});
