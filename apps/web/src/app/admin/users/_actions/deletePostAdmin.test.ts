import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deletePostAdmin } from './deletePostAdmin';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
}));

vi.mock('@/lib/db', () => {
  const makeDbOps = () => ({
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          // Two chain shapes share this mock:
          //   (a) post lookup: select().from().where().limit(1) → single-row array
          //   (b) image-attachment lookup: select().from().where() (no .limit) → array
          // To support (b), the returned object is itself a thenable so a bare
          // `await db.select()...where(...)` resolves to an empty array.
          const lastResult =
            mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ??
            [];
          const chain: PromiseLike<unknown> & { limit: (n?: number) => Promise<unknown> } = {
            then: (resolve, reject) => Promise.resolve(lastResult).then(resolve, reject),
            limit: () => Promise.resolve(lastResult),
          };
          return chain;
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateSetWhere,
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  });

  return {
    db: {
      ...makeDbOps(),
      transaction: async (fn: (tx: ReturnType<typeof makeDbOps>) => Promise<void>) => {
        mockTransaction();
        return fn(makeDbOps());
      },
    },
    topicPosts: {
      id: 'id',
      userId: 'user_id',
      topicType: 'topic_type',
      topicKey: 'topic_key',
      content: 'content',
      deletedAt: 'deleted_at',
    },
    postImageAttachments: {
      postId: 'post_id',
      storagePath: 'storage_path',
    },
    userRoles: { userId: 'user_id' },
    moderationActions: {
      actorId: 'actor_id',
      action: 'action',
      targetType: 'target_type',
      targetId: 'target_id',
      reason: 'reason',
      metadata: 'metadata',
      ipAddress: 'ip_address',
    },
    userGrants: {
      id: 'id',
      sourceType: 'source_type',
      sourceId: 'source_id',
      revokedAt: 'revoked_at',
    },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/points', () => ({
  // Stub point clawback to a no-op; this test does not exercise the ledger.
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/security/client-ip', () => ({
  getClientIp: () => Promise.resolve('127.0.0.1'),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const authorUserId = 'author-00000000-0000-0000-0000-000000000001';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';

function setupAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // First call: userRoles query returns admin
  // Second call: topicPosts query returns post
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
    {
      id: testPostId,
      userId: authorUserId,
      topicType: 'square',
      topicKey: 'e4',
      content: 'Test post content',
    },
  ]);
}

describe('deletePostAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deletePostAdmin(testPostId, 'Spam content');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await deletePostAdmin(testPostId, 'Spam content');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await deletePostAdmin(testPostId, 'Spam content');
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return reasonRequired when reason is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deletePostAdmin(testPostId, '');
    expect(result).toEqual({ error: 'reasonRequired' });
  });

  it('should return reasonRequired when reason is only whitespace', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deletePostAdmin(testPostId, '   \t\n  ');
    expect(result).toEqual({ error: 'reasonRequired' });
  });

  it('should return reasonTooLong when reason exceeds 1000 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const longReason = 'a'.repeat(1001);
    const result = await deletePostAdmin(testPostId, longReason);
    expect(result).toEqual({ error: 'reasonTooLong' });
  });

  it('should accept reason at exactly 1000 characters', async () => {
    setupAdmin();

    const maxReason = 'a'.repeat(1000);
    const result = await deletePostAdmin(testPostId, maxReason);
    expect(result).toEqual({ success: true });
  });

  it('should return notFound when post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await deletePostAdmin(testPostId, 'Spam content');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('should successfully delete post and create moderation_actions record', async () => {
    setupAdmin();

    const result = await deletePostAdmin(testPostId, 'Spam content');
    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateSetWhere).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'delete_post',
      targetType: 'topic_post',
      targetId: testPostId,
      reason: 'Spam content',
      metadata: {
        content: 'Test post content',
        topicType: 'square',
        topicKey: 'e4',
        authorId: authorUserId,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('should trim reason before storing', async () => {
    setupAdmin();

    await deletePostAdmin(testPostId, '  Spam content  ');
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Spam content',
      })
    );
  });

  it('should use db.transaction to wrap update and audit log atomically', async () => {
    setupAdmin();

    await deletePostAdmin(testPostId, 'Spam content');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('should propagate error when transaction fails (atomicity)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
      {
        id: testPostId,
        userId: authorUserId,
        topicType: 'square',
        topicKey: 'e4',
        content: 'Test post content',
      },
    ]);

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(deletePostAdmin(testPostId, 'Spam content')).rejects.toThrow(
      'DB transaction failed'
    );

    db.transaction = originalTransaction;
  });

  it('should allow admin to delete an already soft-deleted post (re-delete scenario)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
      {
        id: testPostId,
        userId: authorUserId,
        topicType: 'square',
        topicKey: 'e4',
        content: 'Test post content',
      },
    ]);

    const result = await deletePostAdmin(testPostId, 'Admin override deletion');
    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it('should call revalidatePath after successful deletion', async () => {
    setupAdmin();

    await deletePostAdmin(testPostId, 'Spam content');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
  });

  it('should not call revalidatePath when post is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await deletePostAdmin(testPostId, 'Spam content');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when user is unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deletePostAdmin(testPostId, 'Spam content');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should allow admin to delete their own post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
      {
        id: testPostId,
        userId: adminUserId, // admin is the author
        topicType: 'square',
        topicKey: 'e4',
        content: 'My own post',
      },
    ]);

    const result = await deletePostAdmin(testPostId, 'Removing my own post');
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          authorId: adminUserId,
        }),
      })
    );
  });

  it('should handle reason with special characters safely', async () => {
    setupAdmin();

    const result = await deletePostAdmin(
      testPostId,
      'Contains <script>alert("xss")</script> & special "chars"'
    );
    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Contains <script>alert("xss")</script> & special "chars"',
      })
    );
  });

  it('should not reject reason at 999 characters (just under max)', async () => {
    setupAdmin();

    const reason = 'b'.repeat(999);
    const result = await deletePostAdmin(testPostId, reason);
    expect(result).toEqual({ success: true });
  });

  it('should reject reason that is exactly 1001 characters after trimming', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const reason = ' ' + 'a'.repeat(1001) + ' ';
    const result = await deletePostAdmin(testPostId, reason);
    expect(result).toEqual({ error: 'reasonTooLong' });
  });
});
