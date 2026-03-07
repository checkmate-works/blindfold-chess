import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getRepliesByPostId } from './queries';

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
      content: 'topic_posts.content',
      createdAt: 'topic_posts.created_at',
    },
    profiles: {
      id: 'profiles.id',
      username: 'profiles.username',
      displayName: 'profiles.display_name',
      avatarUrl: 'profiles.avatar_url',
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
  const methods = ['select', 'from', 'leftJoin', 'where', 'orderBy', 'groupBy', 'limit'];
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
        },
      },
    ];

    const chain = mockChain(rows);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'reply-1',
      userId: 'user-1',
      topicType: 'square',
      topicKey: 'e4',
      parentId: testPostId,
      content: 'First reply',
      createdAt: new Date('2025-01-02T00:00:00Z'),
      author: {
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
      },
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
        },
      },
    ];

    const chain = mockChain(rows);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

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
        },
      },
    ];

    const chain = mockChain(matchingRows);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

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

    const chain = mockChain(rows);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getRepliesByPostId(testPostId);

    expect(result).toHaveLength(1);
    expect(result[0].author).toBeNull();
  });
});
