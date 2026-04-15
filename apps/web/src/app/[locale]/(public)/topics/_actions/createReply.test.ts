import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotification } from '@/lib/notifications/notification';
import { logActivityEvent } from '@/lib/users/activity-log';

import { createReplyBase } from './createReply';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          return (
            mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ?? []
          );
        },
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => mockInsertReturning(),
        };
      },
    }),
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    parentId: 'parent_id',
    rootPostId: 'root_post_id',
    content: 'content',
    deletedAt: 'deleted_at',
    replyPermission: 'reply_permission',
  },
  userFollows: {
    id: 'id',
    followerId: 'follower_id',
    followingId: 'following_id',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createReply: { action: 'create_reply', maxAttempts: 20, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const validPostId = '00000000-0000-0000-0000-000000000001';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const targetReplyId = '00000000-0000-0000-0000-000000000099';
const targetReplyAuthorId = 'user-00000000-0000-0000-0000-000000000003';

const baseParams = {
  locale: 'en',
  topicIdentifier: 'test-topic',
  postId: validPostId,
  topicType: 'opening' as const,
  topicKey: 'test-topic',
  urlSegment: 'openings',
  validateTopic: vi.fn().mockResolvedValue(true),
  formData: makeFormData('hello'),
};

function makeFormData(content: string, replyToId?: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  if (replyToId) {
    fd.set('replyToId', replyToId);
  }
  return fd;
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ success: true });
}

function setupParentPostExists(overrides: { userId?: string; replyPermission?: string } = {}) {
  mockSelectFromWhere.mockReturnValue([
    {
      id: validPostId,
      userId: overrides.userId ?? otherUserId,
      replyPermission: overrides.replyPermission ?? 'everyone',
    },
  ]);
  mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
}

describe('createReplyBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseParams.validateTopic.mockResolvedValue(true);
  });

  describe('topic validation', () => {
    it('should return error for invalid topic', async () => {
      baseParams.validateTopic.mockResolvedValue(false);

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'Invalid opening' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should proceed for valid topic', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
    });
  });

  describe('postId validation', () => {
    it('should return invalidPostId for a non-UUID string', async () => {
      const result = await createReplyBase({ ...baseParams, postId: 'not-a-uuid' });
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for an empty string', async () => {
      const result = await createReplyBase({ ...baseParams, postId: '' });
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for SQL injection-like input', async () => {
      const result = await createReplyBase({
        ...baseParams,
        postId: "'; DROP TABLE topic_posts; --",
      });
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should not call auth or DB when postId is invalid', async () => {
      await createReplyBase({ ...baseParams, postId: 'not-a-uuid' });
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockSelectFromWhere).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept a valid lowercase UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
    });

    it('should accept a valid uppercase UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(
        createReplyBase({
          ...baseParams,
          postId: 'ABCDEF00-1234-5678-9ABC-DEF012345678',
        })
      ).rejects.toThrow('NEXT_REDIRECT');
    });
  });

  describe('authentication and authorization', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return rateLimited when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('parent post existence check', () => {
    it('should return postNotFound when no matching post exists', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'postNotFound' });
    });

    it('should not insert a reply when parent post is not found', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      await createReplyBase(baseParams);
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should not call revalidatePath when parent post is not found', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      await createReplyBase(baseParams);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('content validation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should return contentRequired when content is empty', async () => {
      const result = await createReplyBase({ ...baseParams, formData: makeFormData('') });
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content is only whitespace', async () => {
      const result = await createReplyBase({
        ...baseParams,
        formData: makeFormData('   \t\n  '),
      });
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content field is missing', async () => {
      const result = await createReplyBase({ ...baseParams, formData: new FormData() });
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentTooLong when content exceeds 5000 characters', async () => {
      const result = await createReplyBase({
        ...baseParams,
        formData: makeFormData('a'.repeat(5001)),
      });
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept content at exactly 5000 characters', async () => {
      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('a'.repeat(5000)) })
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('successful reply creation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should insert reply with correct parentId, topicType, and topicKey', async () => {
      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('My reply') })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'test-topic',
        parentId: validPostId,
        rootPostId: validPostId,
        content: 'My reply',
      });
    });

    it('should trim whitespace from content', async () => {
      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('  trimmed reply  ') })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'trimmed reply' })
      );
    });

    it('should call revalidatePath with correct path after successful reply', async () => {
      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
      expect(revalidatePath).toHaveBeenCalledWith(
        `/en/topics/openings/test-topic/posts/${validPostId}`
      );
    });

    it('should redirect with toast param after successful reply', async () => {
      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith(
        `/en/topics/openings/test-topic/posts/${validPostId}?toast=post_created`
      );
    });
  });

  describe('validation order', () => {
    it('should validate topic before postId', async () => {
      baseParams.validateTopic.mockResolvedValue(false);
      const result = await createReplyBase({ ...baseParams, postId: 'not-a-uuid' });
      expect(result).toEqual({ error: 'Invalid opening' });
    });

    it('should validate postId before auth check', async () => {
      const result = await createReplyBase({ ...baseParams, postId: 'not-a-uuid' });
      expect(result).toEqual({ error: 'invalidPostId' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before validating content', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createReplyBase({ ...baseParams, formData: makeFormData('') });
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should check parent post existence before validating content', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      const result = await createReplyBase({ ...baseParams, formData: makeFormData('') });
      expect(result).toEqual({ error: 'postNotFound' });
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should log create_reply activity event on success', async () => {
      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('My reply') })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'create_reply',
        targetType: 'topic_post',
        targetId: generatedReplyId,
        metadata: { parentId: validPostId, topicKey: 'test-topic' },
      });
    });

    it('should not log activity event when validation fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await createReplyBase(baseParams);
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('reply_permission enforcement', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return repliesDisabled when reply_permission is nobody', async () => {
      setupParentPostExists({ replyPermission: 'nobody' });

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'repliesDisabled' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return followRequired when reply_permission is followers and user is not a follower', async () => {
      mockSelectFromWhere
        .mockReturnValueOnce([
          { id: validPostId, userId: otherUserId, replyPermission: 'followers' },
        ])
        .mockReturnValueOnce([]);

      const result = await createReplyBase(baseParams);
      expect(result).toEqual({ error: 'followRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should allow reply when reply_permission is followers and user is a follower', async () => {
      mockSelectFromWhere
        .mockReturnValueOnce([
          { id: validPostId, userId: otherUserId, replyPermission: 'followers' },
        ])
        .mockReturnValueOnce([{ id: 'follow-1' }]);
      mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should allow the author to reply even when reply_permission is nobody', async () => {
      setupParentPostExists({ userId: testUserId, replyPermission: 'nobody' });

      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('author reply') })
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should allow the author to reply even when reply_permission is followers (bypass follower check)', async () => {
      setupParentPostExists({ userId: testUserId, replyPermission: 'followers' });

      await expect(
        createReplyBase({ ...baseParams, formData: makeFormData('author reply') })
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
      expect(mockSelectFromWhere).toHaveBeenCalledTimes(1);
    });

    it('should allow reply when reply_permission is everyone', async () => {
      setupParentPostExists({ replyPermission: 'everyone' });

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('reply notification', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should create notification for post author when replying to another user post', async () => {
      setupParentPostExists({ userId: otherUserId });

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');

      expect(createNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        actorId: testUserId,
        type: 'reply',
        targetType: 'topic_post',
        targetId: validPostId,
        metadata: {
          topicType: 'opening',
          topicKey: 'test-topic',
          postId: validPostId,
          replyId: generatedReplyId,
        },
      });
    });

    it('should not create notification when replying to own post', async () => {
      setupParentPostExists({ userId: testUserId });

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should pass correct metadata for square topic type', async () => {
      setupParentPostExists({ userId: otherUserId });

      await expect(
        createReplyBase({
          ...baseParams,
          topicType: 'square',
          topicKey: 'e4',
          urlSegment: 'squares',
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(createNotification).toHaveBeenCalledWith({
        userId: otherUserId,
        actorId: testUserId,
        type: 'reply',
        targetType: 'topic_post',
        targetId: validPostId,
        metadata: {
          topicType: 'square',
          topicKey: 'e4',
          postId: validPostId,
          replyId: generatedReplyId,
        },
      });
    });

    it('should not create notification when validation fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await createReplyBase(baseParams);

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should still create the reply even if notification would fail (fire-and-forget)', async () => {
      setupParentPostExists({ userId: otherUserId });

      await expect(createReplyBase(baseParams)).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('reply to a reply (Case B)', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should insert reply with correct parentId and rootPostId when replying to a reply', async () => {
      // First select: look up the target reply
      mockSelectFromWhere.mockReturnValueOnce([
        { id: targetReplyId, userId: targetReplyAuthorId, rootPostId: validPostId },
      ]);
      // Second select: look up the root post for permission check
      mockSelectFromWhere.mockReturnValueOnce([
        { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
      ]);
      mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);

      await expect(
        createReplyBase({
          ...baseParams,
          formData: makeFormData('replying to a reply', targetReplyId),
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'test-topic',
        parentId: targetReplyId,
        rootPostId: validPostId,
        content: 'replying to a reply',
      });
    });

    it('should propagate rootPostId from the target reply', async () => {
      const deepRootPostId = '00000000-0000-0000-0000-000000000050';
      mockSelectFromWhere.mockReturnValueOnce([
        { id: targetReplyId, userId: targetReplyAuthorId, rootPostId: deepRootPostId },
      ]);
      mockSelectFromWhere.mockReturnValueOnce([
        { id: deepRootPostId, userId: otherUserId, replyPermission: 'everyone' },
      ]);
      mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);

      await expect(
        createReplyBase({
          ...baseParams,
          formData: makeFormData('deep reply', targetReplyId),
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ rootPostId: deepRootPostId })
      );
    });

    it('should check reply permission on the root post, not the target reply', async () => {
      // Target reply exists
      mockSelectFromWhere.mockReturnValueOnce([
        { id: targetReplyId, userId: targetReplyAuthorId, rootPostId: validPostId },
      ]);
      // Root post has replies disabled
      mockSelectFromWhere.mockReturnValueOnce([
        { id: validPostId, userId: otherUserId, replyPermission: 'nobody' },
      ]);

      const result = await createReplyBase({
        ...baseParams,
        formData: makeFormData('should be blocked', targetReplyId),
      });

      expect(result).toEqual({ error: 'repliesDisabled' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should notify the target reply author, not the root post author', async () => {
      mockSelectFromWhere.mockReturnValueOnce([
        { id: targetReplyId, userId: targetReplyAuthorId, rootPostId: validPostId },
      ]);
      mockSelectFromWhere.mockReturnValueOnce([
        { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
      ]);
      mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);

      await expect(
        createReplyBase({
          ...baseParams,
          formData: makeFormData('notify target author', targetReplyId),
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetReplyAuthorId,
          actorId: testUserId,
        })
      );
    });

    it('should fall back to Case A when replyToId is not a valid UUID', async () => {
      setupParentPostExists();

      await expect(
        createReplyBase({
          ...baseParams,
          formData: makeFormData('fallback reply', 'not-a-uuid'),
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      // Should use postId as parentId (Case A behavior)
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: validPostId,
          rootPostId: validPostId,
        })
      );
    });
  });
});
