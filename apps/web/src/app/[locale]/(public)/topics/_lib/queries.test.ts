import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getPostByIdAndTopicKey } from './queries';

const eqMock = vi.fn((column: unknown, value: unknown) => ({ __op: 'eq', column, value }));
const isNullMock = vi.fn((column: unknown) => ({ __op: 'isNull', column }));
const andMock = vi.fn((...predicates: unknown[]) => ({ __op: 'and', predicates }));

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => eqMock(column, value),
    isNull: (column: unknown) => isNullMock(column),
    and: (...predicates: unknown[]) => andMock(...predicates),
  };
});

vi.mock('./post-meta', () => ({
  attachPostMeta: vi.fn(async (posts: unknown[]) => posts),
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
    topicPostRatings: {
      postId: 'topic_post_ratings.post_id',
      preferenceRating: 'topic_post_ratings.preference_rating',
      proficiencyRating: 'topic_post_ratings.proficiency_rating',
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

function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'leftJoin', 'where', 'limit', 'orderBy', 'innerJoin'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const SQUARE_POST_ID = '11111111-1111-1111-1111-111111111111';

describe('getPostByIdAndTopicKey — cross-topic isolation', () => {
  it('issues an eq() predicate that pins topicType to the requested value', async () => {
    // Empty result is fine — we are auditing the WHERE clause that was built,
    // not the row mapping. This is the exact predicate that protects the
    // opening post detail page from accidentally rendering a square post when
    // someone hits /topics/openings/{slug}/posts/{squarePostId}.
    const chain = makeChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    await getPostByIdAndTopicKey(SQUARE_POST_ID, 'opening', 'sicilian-defense');

    expect(eqMock).toHaveBeenCalledWith('topic_posts.topic_type', 'opening');
    expect(eqMock).toHaveBeenCalledWith('topic_posts.topic_key', 'sicilian-defense');
    expect(eqMock).toHaveBeenCalledWith('topic_posts.id', SQUARE_POST_ID);
    expect(isNullMock).toHaveBeenCalledWith('topic_posts.deleted_at');
  });

  it('returns null when the underlying query returns no rows (cross-topic mismatch case)', async () => {
    // Simulates the security-critical case the Reviewer flagged:
    //   topicType='opening' + a postId that exists only as a 'square' post.
    // The DB filter on topicType ensures the join returns 0 rows even though
    // the postId is otherwise valid in the table.
    const chain = makeChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostByIdAndTopicKey(SQUARE_POST_ID, 'opening', 'sicilian-defense');

    expect(result).toBeNull();
  });

  it('returns the row when topicType matches', async () => {
    // Sanity check: when the row genuinely belongs to the requested topicType,
    // we get it back. Confirms the negative test above is not just "always null".
    const fakePost = {
      id: SQUARE_POST_ID,
      userId: 'u1',
      topicType: 'opening',
      topicKey: 'sicilian-defense',
      content: 'hi',
      replyPermission: 'everyone',
      parentId: null,
      rootPostId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const chain = makeChain([{ post: fakePost, author: null }]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostByIdAndTopicKey(SQUARE_POST_ID, 'opening', 'sicilian-defense');

    expect(result).not.toBeNull();
    expect(result?.id).toBe(SQUARE_POST_ID);
    expect(result?.topicType).toBe('opening');
  });

  it('returns null without hitting the DB when postId is not a UUID', async () => {
    // Defends against a 500 when users hand-craft URLs like /posts/1 — the raw
    // string would otherwise reach Postgres and throw
    // `invalid input syntax for type uuid`. Callers treat null as 404.
    const chain = makeChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    for (const bogus of ['1', 'abc', 'not-a-uuid', '', '1111-1111']) {
      const result = await getPostByIdAndTopicKey(bogus, 'square', 'h8');
      expect(result).toBeNull();
    }

    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('filters out soft-deleted rows via isNull(deletedAt)', async () => {
    // The query embeds isNull(topicPosts.deletedAt). If the DB row has
    // deletedAt set, it must not appear in results. We exercise this by
    // confirming the predicate is passed in.
    const chain = makeChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    await getPostByIdAndTopicKey(SQUARE_POST_ID, 'opening', 'sicilian-defense');

    expect(isNullMock).toHaveBeenCalledWith('topic_posts.deleted_at');
  });
});
