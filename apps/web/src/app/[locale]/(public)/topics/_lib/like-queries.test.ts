import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getLikedPostCountByUser, getLikedPostsByUser } from './like-queries';

const inArrayMock = vi.fn((column: unknown, values: unknown) => ({
  __op: 'inArray',
  column,
  values,
}));

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    inArray: (column: unknown, values: unknown) => inArrayMock(column, values),
  };
});

vi.mock('@/lib/db/like-queries', () => ({
  getLikeMeta: vi.fn(),
}));

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
      fen: 'chess_openings.fen',
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

describe('getLikedPostsByUser', () => {
  it('filters topicType to square and opening only (excluding chunk)', async () => {
    const mainChain = mockChain([]);
    mockDb.select.mockReturnValue(mainChain as unknown as ReturnType<typeof mockDb.select>);

    await getLikedPostsByUser(userId);

    // The inArray call must restrict topicPosts.topicType to ['square', 'opening'],
    // so that any chunk likes existing in the same likes/topic_posts tables are
    // excluded from the result. Without this filter, /mypage/likes would render
    // chunk comments with the square card and produce broken hrefs (404s) and
    // i18n fallbacks.
    expect(inArrayMock).toHaveBeenCalledWith('topic_posts.topic_type', ['square', 'opening']);
  });

  it('returns rows produced by the underlying query', async () => {
    const mainChain = mockChain([]);
    mockDb.select.mockReturnValue(mainChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getLikedPostsByUser(userId);

    expect(result).toEqual([]);
  });
});

describe('getLikedPostCountByUser', () => {
  it('filters topicType to square and opening only (excluding chunk)', async () => {
    const chain = mockChain([{ count: 0 }]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    await getLikedPostCountByUser(userId);

    expect(inArrayMock).toHaveBeenCalledWith('topic_posts.topic_type', ['square', 'opening']);
  });

  it('returns the count from the underlying query', async () => {
    const chain = mockChain([{ count: 7 }]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getLikedPostCountByUser(userId);

    expect(result).toBe(7);
  });
});
