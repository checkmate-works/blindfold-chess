import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockFollowers: { followerId: string }[] = [];
let mockMutedRows: { id: string }[] = [];
/**
 * Rows returned by successive `select().from(notifications)` calls, in order:
 * the pre-insert dedup check, then (for supersede-class types) the
 * post-insert re-check. Missing entries default to "no rows".
 */
let mockNotificationSelects: { id: string }[][] = [];
let notificationSelectCall = 0;

const mockDbInsertValues = vi.fn();
const mockDbSelectWhere = vi.fn();
const mockDbDeleteWhere = vi.fn();
/** When set, the next insert().values() rejects with this value. */
let mockInsertRejection: unknown = null;

/**
 * The DB mock needs to handle these distinct query patterns:
 * 1. notifyFollowersOfNewPost: db.select().from(userFollows).where() -> returns followers
 * 2. createNotification (block check): db.select().from(userBlocks).where().limit() -> returns [] (not blocked)
 * 3. createNotification (mute check): db.select().from(notificationMutes).where().limit() -> returns mockMutedRows
 * 4. createNotification (dedup + post-insert checks): db.select().from(notifications).where().limit()
 * 5. createNotification (supersede cleanup): db.delete(notifications).where()
 *
 * We track which table is queried via the from() argument.
 */

vi.mock('@/lib/db', () => ({
  db: {
    select: () => {
      return {
        from: (table: unknown) => ({
          where: (condition: unknown) => {
            // If this is a userFollows query (the first select), return followers
            if (table === 'userFollows_table') {
              return Promise.resolve(mockFollowers);
            }
            if (table === 'notificationMutes_table') {
              return { limit: () => Promise.resolve(mockMutedRows) };
            }
            if (table === 'notifications_table') {
              mockDbSelectWhere(condition);
              const rows = mockNotificationSelects[notificationSelectCall] ?? [];
              notificationSelectCall += 1;
              return { limit: () => Promise.resolve(rows) };
            }
            // userBlocks (block check) returns an empty result.
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
        if (mockInsertRejection !== null) {
          const rejection = mockInsertRejection;
          mockInsertRejection = null;
          return Promise.reject(rejection);
        }
        return Promise.resolve();
      },
    }),
    delete: () => ({
      where: (...args: unknown[]) => {
        mockDbDeleteWhere(...args);
        return Promise.resolve();
      },
    }),
  },
  notifications: 'notifications_table',
  userFollows: 'userFollows_table',
  userBlocks: 'userBlocks_table',
  notificationMutes: 'notificationMutes_table',
}));

const mockCaptureError = vi.fn();
vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
  eq: (a: unknown, b: unknown) => [a, b],
  gte: (a: unknown, b: unknown) => [a, b],
  // Tagged so the supersede assertions below can pull the type list back out
  // of the condition tree the mocked `and()` builds.
  inArray: (_column: unknown, values: unknown) => ({ __inArray: values }),
}));

/**
 * Collect every `inArray(...)` value list nested in a mocked where()
 * condition, flattened. Returns `[]` when the condition has none — which is
 * itself the assertion for "this type takes the plain exact-type dedup path".
 */
function inArrayValues(condition: unknown): string[] {
  if (Array.isArray(condition)) {
    return condition.flatMap(inArrayValues);
  }
  if (condition !== null && typeof condition === 'object' && '__inArray' in condition) {
    return (condition as { __inArray: string[] }).__inArray;
  }
  return [];
}

const { notifyFollowersOfNewPost, notifyPositionForked, createNotification } =
  await import('./notification');

describe('notifyFollowersOfNewPost', () => {
  beforeEach(() => {
    mockFollowers = [];
    mockMutedRows = [];
    mockNotificationSelects = [];
    notificationSelectCall = 0;
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
    // createNotification catches internally (reporting via captureError), so
    // an internal failure never propagates to the caller.
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
    mockCaptureError.mockClear();
    mockInsertRejection = null;
    mockMutedRows = [];
    mockNotificationSelects = [];
    notificationSelectCall = 0;
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

  it('skips the insert when the recipient has muted a mutable notification type', async () => {
    mockMutedRows = [{ id: 'mute-1' }];

    createNotification({
      userId: 'user-1',
      type: 'new_position',
      targetType: 'position',
      targetId: 'position-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).not.toHaveBeenCalled();
  });

  it('delivers new_post despite a stale mute row (type removed from the mutable set)', async () => {
    // new_post toggles were removed from the settings UI in 2026-07, but rows
    // created before then may still exist in notification_mutes. The fallback
    // is to notify: mutes are only consulted for currently-mutable types.
    mockMutedRows = [{ id: 'stale-mute-1' }];

    createNotification({
      userId: 'user-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });

  it('does not consult mutes for a non-mutable notification type', async () => {
    // If the mutability check were missing, this row would incorrectly
    // suppress the insert below.
    mockMutedRows = [{ id: 'mute-1' }];

    createNotification({ userId: 'user-1', type: 'follow', actorId: 'actor-1' });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });
});

describe('notifyPositionForked', () => {
  beforeEach(() => {
    mockMutedRows = [];
    mockNotificationSelects = [];
    notificationSelectCall = 0;
  });

  it('notifies the owner with type "puzzle_forked" for a same-type puzzle fork', async () => {
    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-puzzle-1',
      outputType: 'puzzle',
      sourceType: 'puzzle',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        actorId: 'forker-1',
        type: 'puzzle_forked',
        targetType: 'position',
        targetId: 'new-puzzle-1',
        metadata: {
          positionId: 'new-puzzle-1',
          positionType: 'puzzle',
          sourceType: 'puzzle',
        },
      })
    );
  });

  it('notifies the owner with sourceType "memory" for the cross-type Create Puzzle action', async () => {
    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-puzzle-2',
      outputType: 'puzzle',
      sourceType: 'memory',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ sourceType: 'memory' }),
      })
    );
  });

  it('notifies the owner with type "memory_forked" for a same-type position-memory fork', async () => {
    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-memory-1',
      outputType: 'memory',
      sourceType: 'memory',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'memory_forked',
        targetId: 'new-memory-1',
        metadata: {
          positionId: 'new-memory-1',
          positionType: 'memory',
          sourceType: 'memory',
        },
      })
    );
  });

  it('is not consulted against mutes (puzzle_forked is a non-mutable type)', async () => {
    mockMutedRows = [{ id: 'mute-1' }];

    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-puzzle-3',
      outputType: 'puzzle',
      sourceType: 'puzzle',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });

  it('is not consulted against mutes (memory_forked is a non-mutable type)', async () => {
    mockMutedRows = [{ id: 'mute-1' }];

    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-memory-3',
      outputType: 'memory',
      sourceType: 'memory',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });
});

/**
 * One action can emit both a follower fan-out and a direct notification to
 * the person it targets. A recipient who is in both audiences used to get two
 * rows, because the dedup key included `type` and that was the only column
 * that differed. See `supersede.ts` for the collision classes.
 */
describe('createNotification — supersede', () => {
  beforeEach(() => {
    mockMutedRows = [];
    mockNotificationSelects = [];
    notificationSelectCall = 0;
  });

  it('removes the new_post fan-out row after inserting new_comment_on_topic', async () => {
    createNotification({
      userId: 'owner-1',
      actorId: 'commenter-1',
      type: 'new_comment_on_topic',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteWhere).toHaveBeenCalledTimes(1);
    expect(inArrayValues(mockDbDeleteWhere.mock.calls[0][0])).toEqual(['new_post']);
  });

  it('checks new_post against the whole class and deletes nothing', async () => {
    // Nothing ranks below new_post, so the fan-out never removes another row —
    // it is the one that yields.
    createNotification({
      userId: 'owner-1',
      actorId: 'commenter-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(inArrayValues(mockDbSelectWhere.mock.calls[0][0])).toEqual([
      'new_comment_on_topic',
      'new_post',
    ]);
    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteWhere).not.toHaveBeenCalled();
  });

  it('skips the new_post fan-out when the direct comment notification landed first', async () => {
    // The two emitters race; this is the branch where the more specific row
    // already exists. (The mock returns rows for any dedup query — the
    // type-awareness of the query itself is asserted in the test above.)
    mockNotificationSelects = [[{ id: 'existing-comment-notification' }]];

    createNotification({
      userId: 'owner-1',
      actorId: 'commenter-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).not.toHaveBeenCalled();
    expect(mockDbDeleteWhere).not.toHaveBeenCalled();
  });

  it('removes its own new_post row when the comment notification lands mid-write', async () => {
    // The pre-insert check (1st select) sees an empty group, but the direct
    // comment notification is written before the post-insert re-check (2nd
    // select) runs. Without that second look both rows would survive — this
    // is the interleaving the pre-insert check alone cannot cover.
    mockNotificationSelects = [[], [{ id: 'late-comment-notification' }]];

    createNotification({
      userId: 'owner-1',
      actorId: 'commenter-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    // The re-check looks only at types that outrank new_post.
    expect(inArrayValues(mockDbSelectWhere.mock.calls[1][0])).toEqual(['new_comment_on_topic']);
    // new_post has nothing below it, so this delete can only be the self-removal.
    expect(mockDbDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it('removes the new_position fan-out row after inserting puzzle_forked', async () => {
    notifyPositionForked({
      actorId: 'forker-1',
      ownerId: 'owner-1',
      newPositionId: 'new-puzzle-1',
      outputType: 'puzzle',
      sourceType: 'puzzle',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    expect(inArrayValues(mockDbDeleteWhere.mock.calls[0][0])).toEqual(['new_position']);
  });

  it('leaves unrelated types on the exact-type dedup path', async () => {
    // A like and a reply from the same actor on the same post share a group
    // but are separate events — collapsing them would lose a notification.
    createNotification({
      userId: 'owner-1',
      actorId: 'actor-1',
      type: 'like',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(inArrayValues(mockDbSelectWhere.mock.calls[0][0])).toEqual([]);
    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteWhere).not.toHaveBeenCalled();
  });

  it('falls back to exact-type dedup when the event has no actor', async () => {
    // Without an actor there is no (recipient, actor, target) group to
    // collapse against, so a class type still takes the plain path.
    createNotification({
      userId: 'owner-1',
      type: 'new_post',
      targetType: 'topic_post',
      targetId: 'post-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(inArrayValues(mockDbSelectWhere.mock.calls[0][0])).toEqual([]);
    expect(mockDbDeleteWhere).not.toHaveBeenCalled();
  });

  it('reports an insert failure via captureError without throwing', async () => {
    const failure = new Error('insert failed');
    mockInsertRejection = failure;

    expect(() =>
      createNotification({
        userId: 'user-1',
        actorId: 'actor-1',
        type: 'rank_granted',
        targetType: 'rank',
        targetId: 'rank-1',
      })
    ).not.toThrow();

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCaptureError).toHaveBeenCalledWith(failure, expect.stringContaining('rank_granted'));
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
