import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { logActivityEvent } from '@/lib/users/activity-log';

import { removePostAttachment } from './removePostAttachment';

const mockGetUser = vi.fn();
// Each test queues rows in the order the action reads them: first the
// topic_posts row, then (for images only) the storage_path row.
const mockSelectLimit = vi.fn();
const mockDeleteWhere = vi.fn();
const mockDeleteReturning = vi.fn();
const mockStorageRemove = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      storage: {
        from: () => ({
          remove: (...args: unknown[]) => mockStorageRemove(...args),
        }),
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    delete: () => ({
      where: (...args: unknown[]) => {
        // Tests inspect args via the returning() spy below; the chain
        // is `db.delete(...).where(...).returning(...)`. For image
        // deletes the action does not call `.returning()`, so we return
        // a thenable that supports both shapes.
        mockDeleteWhere(...args);
        const result: PromiseLike<unknown[]> & { returning: () => Promise<unknown[]> } = {
          then: (resolve, reject) => Promise.resolve([]).then(resolve, reject),
          returning: () => mockDeleteReturning(),
        };
        return result;
      },
    }),
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    deletedAt: 'deleted_at',
  },
  postImageAttachments: {
    id: 'id',
    postId: 'post_id',
    storagePath: 'storage_path',
  },
  postGamePgnAttachments: {
    id: 'id',
    postId: 'post_id',
  },
  postFenAttachments: {
    id: 'id',
    postId: 'post_id',
  },
  postVideoAttachments: {
    id: 'id',
    postId: 'post_id',
  },
  postGameEmbedAttachments: {
    id: 'id',
    postId: 'post_id',
  },
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    removePostAttachment: {
      action: 'remove_post_attachment',
      maxAttempts: 30,
      windowMs: 3_600_000,
    },
  },
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';
const testAttachmentId = 'attach-00000000-0000-0000-0000-000000000001';

const ownedPostRow = {
  id: testPostId,
  userId: testUserId,
  topicType: 'opening',
  topicKey: 'sicilian-defense',
  deletedAt: null,
};

describe('removePostAttachment', () => {
  beforeEach(() => {
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  it('returns signInRequired when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('returns banned when user is banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(true);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'banned' });
  });

  it('returns notFound when the post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns unauthorized when the user does not own the post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([{ ...ownedPostRow, userId: otherUserId }]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockDeleteReturning).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when the post is soft-deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([{ ...ownedPostRow, deletedAt: new Date() }]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'alreadyDeleted' });
  });

  it('returns attachmentNotFound when DELETE matches no row (pgn)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
    mockDeleteReturning.mockResolvedValueOnce([]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ error: 'attachmentNotFound' });
  });

  it('removes a pgn attachment successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
    mockDeleteReturning.mockResolvedValueOnce([{ id: testAttachmentId }]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'pgn', 'en');
    expect(result).toEqual({ success: true });
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId: testUserId,
      action: 'remove_post_attachment',
      targetType: 'topic_post',
      targetId: testPostId,
      metadata: {
        topicType: 'opening',
        topicKey: 'sicilian-defense',
        attachmentKind: 'pgn',
        attachmentId: testAttachmentId,
      },
    });
  });

  it('removes fen / video / embed attachments via their respective tables', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);

    for (const kind of ['fen', 'video', 'embed'] as const) {
      mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
      mockDeleteReturning.mockResolvedValueOnce([{ id: testAttachmentId }]);
      const result = await removePostAttachment(testPostId, testAttachmentId, kind, 'en');
      expect(result).toEqual({ success: true });
    }
  });

  it('removes an image attachment and triggers Storage cleanup', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit
      // 1st call: topic_posts row
      .mockResolvedValueOnce([ownedPostRow])
      // 2nd call: postImageAttachments.storagePath lookup
      .mockResolvedValueOnce([{ storagePath: 'user-uploads/foo.webp' }]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'image', 'en');
    expect(result).toEqual({ success: true });
    expect(mockStorageRemove).toHaveBeenCalledWith(['user-uploads/foo.webp']);
  });

  it('returns attachmentNotFound when image row does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit
      .mockResolvedValueOnce([ownedPostRow])
      // 2nd call: storage_path lookup returns empty
      .mockResolvedValueOnce([]);

    const result = await removePostAttachment(testPostId, testAttachmentId, 'image', 'en');
    expect(result).toEqual({ error: 'attachmentNotFound' });
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('does not roll back the DB DELETE when Storage cleanup fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit
      .mockResolvedValueOnce([ownedPostRow])
      .mockResolvedValueOnce([{ storagePath: 'user-uploads/foo.webp' }]);
    mockStorageRemove.mockResolvedValueOnce({ error: { message: 'permission denied' } });

    const result = await removePostAttachment(testPostId, testAttachmentId, 'image', 'en');
    expect(result).toEqual({ success: true });
    // Activity log still fires — the DB row IS gone, only Storage bytes survive.
    expect(logActivityEvent).toHaveBeenCalled();
  });
});
