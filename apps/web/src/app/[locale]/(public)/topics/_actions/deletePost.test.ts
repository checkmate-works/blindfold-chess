import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { deletePost } from './deletePost';

const mockGetUser = vi.fn();
const mockSelectFromWhereLimit = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockTxUpdateSetWhere = vi.fn();
const mockIsUserBanned = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      storage: {
        from: () => ({
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        // The post-fetch chain is `select().from().where().limit(1)` and the
        // image-attachment-fetch chain is `select().from().where()` (no
        // limit). Both share the same mock here; we hand them distinct
        // call paths via the `where()` thenable + limit branch.
        where: (..._args: unknown[]) => {
          const result: PromiseLike<unknown[]> & {
            limit: (n?: number) => Promise<unknown[]>;
          } = {
            then: (resolve, reject) => Promise.resolve([]).then(resolve, reject),
            limit: () => mockSelectFromWhereLimit(),
          };
          return result;
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateSetWhere,
      }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: () => ({
          set: () => ({
            where: mockTxUpdateSetWhere,
          }),
        }),
      };
      return fn(tx);
    },
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    deletedAt: 'deleted_at',
  },
  postImageAttachments: {
    postId: 'post_id',
    storagePath: 'storage_path',
  },
  userGrants: {
    sourceType: 'source_type',
    sourceId: 'source_id',
    revokedAt: 'revoked_at',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    deletePost: { action: 'delete_post', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';

describe('deletePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return signInRequired when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('should return banned when user is banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(true);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'banned' });
    expect(mockSelectFromWhereLimit).not.toHaveBeenCalled();
  });

  it('should return notFound when post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('should return unauthorized when user is not the post owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: otherUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return alreadyDeleted when post is already soft-deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should successfully soft-delete own post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    const result = await deletePost(testPostId, 'en');
    expect(result).toEqual({ success: true });
    expect(mockTxUpdateSetWhere).toHaveBeenCalled();
  });

  it('should log activity event on successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([
      {
        id: testPostId,
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        deletedAt: null,
      },
    ]);

    await deletePost(testPostId, 'en');
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'delete_post',
      targetType: 'topic_post',
      targetId: testPostId,
      metadata: { topicType: 'opening', topicKey: 'sicilian-defense' },
    });
  });

  it('should not log activity event when deletion fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectFromWhereLimit.mockResolvedValue([]);

    await deletePost(testPostId, 'en');
    expect(logActivityEvent).not.toHaveBeenCalled();
  });
});
