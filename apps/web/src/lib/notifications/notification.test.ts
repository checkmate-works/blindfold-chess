import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockFollowers: { followerId: string }[] = [];

const mockDbInsertValues = vi.fn();

/**
 * The DB mock needs to handle two distinct query patterns:
 * 1. notifyFollowersOfNewPost: db.select().from(userFollows).where() -> returns followers
 * 2. createNotification (dedup check): db.select().from(notifications).where().limit() -> returns []
 *
 * We track which table is queried via the from() argument.
 */

vi.mock('@/lib/db', () => ({
  db: {
    select: () => {
      return {
        from: (table: unknown) => ({
          where: () => {
            // If this is a userFollows query (the first select), return followers
            if (table === 'userFollows_table') {
              return Promise.resolve(mockFollowers);
            }
            // Otherwise (notifications dedup check), return { limit: () => [] }
            return {
              limit: () => Promise.resolve([]),
            };
          },
        }),
      };
    },
    insert: () => ({
      values: (...args: unknown[]) => {
        mockDbInsertValues(...args);
        return Promise.resolve();
      },
    }),
  },
  notifications: 'notifications_table',
  userFollows: 'userFollows_table',
}));

vi.mock('server-only', () => ({}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (a: unknown, b: unknown) => [a, b],
  gte: (a: unknown, b: unknown) => [a, b],
}));

const { notifyFollowersOfNewPost, createNotification } = await import('./notification');

describe('notifyFollowersOfNewPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowers = [];
  });

  it('should insert a notification for each follower', async () => {
    mockFollowers = [{ followerId: 'follower-1' }, { followerId: 'follower-2' }];

    await notifyFollowersOfNewPostAndFlush({
      actorId: 'author-1',
      postId: 'post-1',
      topicType: 'opening',
      topicKey: 'sicilian-defense',
    });

    expect(mockDbInsertValues).toHaveBeenCalledTimes(2);

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'follower-1',
        actorId: 'author-1',
        type: 'new_post',
        targetType: 'topic_post',
        targetId: 'post-1',
        metadata: {
          topicType: 'opening',
          topicKey: 'sicilian-defense',
          postId: 'post-1',
        },
      })
    );

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'follower-2',
        actorId: 'author-1',
        type: 'new_post',
      })
    );
  });

  it('should not insert notifications when there are no followers', async () => {
    mockFollowers = [];

    await notifyFollowersOfNewPostAndFlush({
      actorId: 'author-1',
      postId: 'post-1',
      topicType: 'square',
      topicKey: 'e4',
    });

    expect(mockDbInsertValues).not.toHaveBeenCalled();
  });

  it('should use type new_post for all notifications', async () => {
    mockFollowers = [{ followerId: 'follower-1' }];

    await notifyFollowersOfNewPostAndFlush({
      actorId: 'author-1',
      postId: 'post-1',
      topicType: 'opening',
      topicKey: 'french-defense',
    });

    expect(mockDbInsertValues).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_post' }));
  });

  it('should include topicType, topicKey, and postId in metadata', async () => {
    mockFollowers = [{ followerId: 'follower-1' }];

    await notifyFollowersOfNewPostAndFlush({
      actorId: 'author-1',
      postId: 'post-42',
      topicType: 'square',
      topicKey: 'd5',
    });

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          topicType: 'square',
          topicKey: 'd5',
          postId: 'post-42',
        },
      })
    );
  });

  it('should not throw when the internal async function fails (fire-and-forget)', () => {
    // notifyFollowersOfNewPost wraps everything in (async () => { ... })().catch(() => {}).
    // Even if it fails internally, it should not propagate the error to the caller.
    expect(() =>
      notifyFollowersOfNewPost({
        actorId: 'author-1',
        postId: 'post-1',
        topicType: 'opening',
        topicKey: 'test',
      })
    ).not.toThrow();
  });
});

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw when called (fire-and-forget)', () => {
    expect(() =>
      createNotification({
        userId: 'user-1',
        type: 'new_post',
        targetType: 'topic_post',
        targetId: 'post-1',
        metadata: { topicType: 'opening', topicKey: 'sicilian', postId: 'post-1' },
      })
    ).not.toThrow();
  });

  it('should insert notification when no duplicate exists', async () => {
    createNotification({
      userId: 'user-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
      metadata: { topicType: 'opening', topicKey: 'sicilian', postId: 'post-1' },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'new_post',
        targetType: 'topic_post',
        targetId: 'post-1',
      })
    );
  });

  // The recipient may be null when its account was anonymised (account purged →
  // user_id NULL). The guard lives here so no caller has to repeat it.
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('no-ops when the recipient userId is %s (anonymised recipient)', async (_label, userId) => {
    createNotification({
      userId,
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).not.toHaveBeenCalled();
  });
});

/**
 * Helper to invoke notifyFollowersOfNewPost and wait for its internal
 * fire-and-forget promise to settle.
 */
async function notifyFollowersOfNewPostAndFlush(params: {
  actorId: string;
  postId: string;
  topicType: string;
  topicKey: string;
}): Promise<void> {
  notifyFollowersOfNewPost(params);
  // The function is fire-and-forget (async IIFE with .catch).
  // Flushing microtasks allows the inner promise to settle.
  await new Promise((r) => setTimeout(r, 0));
}
