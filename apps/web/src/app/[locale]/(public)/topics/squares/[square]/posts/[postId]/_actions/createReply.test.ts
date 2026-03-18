import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { createReply } from './createReply';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
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

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
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
const prevState = {};

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000001';

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ success: true });
}

const otherUserId = 'user-00000000-0000-0000-0000-000000000002';

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

describe('createReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('postId validation', () => {
    it('should return invalidPostId for a non-UUID string', async () => {
      const result = await createReply('en', 'e4', 'not-a-uuid', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for an empty string', async () => {
      const result = await createReply('en', 'e4', '', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a UUID missing one character', async () => {
      const result = await createReply(
        'en',
        'e4',
        '0000000-0000-0000-0000-000000000001',
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a UUID with extra characters', async () => {
      const result = await createReply(
        'en',
        'e4',
        '000000000-0000-0000-0000-000000000001',
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a UUID with invalid hex characters', async () => {
      const result = await createReply(
        'en',
        'e4',
        'g0000000-0000-0000-0000-000000000001',
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for SQL injection-like input', async () => {
      const result = await createReply(
        'en',
        'e4',
        "'; DROP TABLE topic_posts; --",
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a UUID without hyphens', async () => {
      const result = await createReply(
        'en',
        'e4',
        '00000000000000000000000000000001',
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should not call auth or DB when postId is invalid', async () => {
      await createReply('en', 'e4', 'not-a-uuid', prevState, makeFormData('hello'));
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockSelectFromWhere).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept a valid lowercase UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
    });

    it('should accept a valid uppercase UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(
        createReply(
          'en',
          'e4',
          'ABCDEF00-1234-5678-9ABC-DEF012345678',
          prevState,
          makeFormData('hello')
        )
      ).rejects.toThrow('NEXT_REDIRECT');
    });

    it('should accept a valid mixed-case UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(
        createReply(
          'en',
          'e4',
          'AbCdEf00-1234-5678-9aBc-DeF012345678',
          prevState,
          makeFormData('hello')
        )
      ).rejects.toThrow('NEXT_REDIRECT');
    });
  });

  describe('parent post existence check', () => {
    it('should return postNotFound when no matching post exists (valid UUID but not in DB)', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'postNotFound' });
    });

    it('should return postNotFound for a deleted parent post (query with isNull filters it out)', async () => {
      setupAuthenticatedUser();
      // The implementation uses isNull(topicPosts.deletedAt) in the WHERE clause,
      // so a soft-deleted post will not appear in results
      mockSelectFromWhere.mockReturnValue([]);

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'postNotFound' });
    });

    it('should not insert a reply when parent post is not found', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should not call revalidatePath when parent post is not found', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should proceed when parent post exists and is not deleted', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('square validation', () => {
    it('should return error for invalid square', async () => {
      const result = await createReply('en', 'z9', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication and authorization', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return rateLimited when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('content validation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should return contentRequired when content is empty', async () => {
      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData(''));
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content is only whitespace', async () => {
      const result = await createReply(
        'en',
        'e4',
        validPostId,
        prevState,
        makeFormData('   \t\n  ')
      );
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content field is missing', async () => {
      const fd = new FormData();
      const result = await createReply('en', 'e4', validPostId, prevState, fd);
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentTooLong when content exceeds 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);
      const result = await createReply(
        'en',
        'e4',
        validPostId,
        prevState,
        makeFormData(longContent)
      );
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept content at exactly 5000 characters', async () => {
      const maxContent = 'a'.repeat(5000);
      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData(maxContent))
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
        createReply('en', 'e4', validPostId, prevState, makeFormData('My reply about e4'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'e4',
        parentId: validPostId,
        content: 'My reply about e4',
      });
    });

    it('should trim whitespace from content', async () => {
      await expect(
        createReply('ja', 'a1', validPostId, prevState, makeFormData('  trimmed reply  '))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'a1',
        parentId: validPostId,
        content: 'trimmed reply',
      });
    });

    it('should call revalidatePath with correct path after successful reply', async () => {
      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(revalidatePath).toHaveBeenCalledWith(`/en/topics/squares/e4/posts/${validPostId}`);
    });

    it('should redirect with toast param after successful reply', async () => {
      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith(
        `/en/topics/squares/e4/posts/${validPostId}?toast=post_created`
      );
    });
  });

  describe('validation order', () => {
    it('should validate square before postId', async () => {
      const result = await createReply('en', 'z9', 'not-a-uuid', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
    });

    it('should validate postId before auth check', async () => {
      const result = await createReply('en', 'e4', 'not-a-uuid', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'invalidPostId' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before validating content', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData(''));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should check parent post existence before validating content', async () => {
      setupAuthenticatedUser();
      mockSelectFromWhere.mockReturnValue([]);

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData(''));
      expect(result).toEqual({ error: 'postNotFound' });
    });
  });

  describe('edge cases', () => {
    it('should return invalidPostId for a string containing only spaces', async () => {
      const result = await createReply('en', 'e4', '   ', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a string with newlines', async () => {
      const result = await createReply('en', 'e4', '\n\t', prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a very long string', async () => {
      const result = await createReply(
        'en',
        'e4',
        'a'.repeat(10000),
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for a UUID with surrounding whitespace', async () => {
      const result = await createReply(
        'en',
        'e4',
        ` ${validPostId} `,
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should return invalidPostId for HTML/script injection in postId', async () => {
      const result = await createReply(
        'en',
        'e4',
        '<script>alert(1)</script>',
        prevState,
        makeFormData('hello')
      );
      expect(result).toEqual({ error: 'invalidPostId' });
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should log create_reply activity event on success', async () => {
      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('My reply'))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'create_reply',
        targetType: 'topic_post',
        targetId: generatedReplyId,
        metadata: { parentId: validPostId, topicKey: 'e4' },
      });
    });

    it('should not log activity event when validation fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });

  describe('reply_permission enforcement', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return repliesDisabled when reply_permission is nobody', async () => {
      setupParentPostExists({ replyPermission: 'nobody' });

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'repliesDisabled' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return followRequired when reply_permission is followers and user is not a follower', async () => {
      setupParentPostExists({ replyPermission: 'followers' });
      // The second mockSelectFromWhere call (for user_follows) returns empty
      mockSelectFromWhere
        .mockReturnValueOnce([
          { id: validPostId, userId: otherUserId, replyPermission: 'followers' },
        ])
        .mockReturnValueOnce([]);

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({ error: 'followRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should allow reply when reply_permission is followers and user is a follower', async () => {
      // The first mockSelectFromWhere call returns the parent post, the second returns a follow record
      mockSelectFromWhere
        .mockReturnValueOnce([
          { id: validPostId, userId: otherUserId, replyPermission: 'followers' },
        ])
        .mockReturnValueOnce([{ id: 'follow-1' }]);
      mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should allow the author to reply even when reply_permission is nobody', async () => {
      setupParentPostExists({ userId: testUserId, replyPermission: 'nobody' });

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('author reply'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });

    it('should allow the author to reply even when reply_permission is followers (bypass follower check)', async () => {
      setupParentPostExists({ userId: testUserId, replyPermission: 'followers' });

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('author reply'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
      // Should not have made a second select (follower check) since author bypasses
      expect(mockSelectFromWhere).toHaveBeenCalledTimes(1);
    });

    it('should allow reply when reply_permission is everyone', async () => {
      setupParentPostExists({ replyPermission: 'everyone' });

      await expect(
        createReply('en', 'e4', validPostId, prevState, makeFormData('hello'))
      ).rejects.toThrow('NEXT_REDIRECT');
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });
});
