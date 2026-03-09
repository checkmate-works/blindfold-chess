import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReply } from './createReply';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

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
      values: mockInsertValues,
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

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const validPostId = '00000000-0000-0000-0000-000000000001';
const prevState = {};

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ success: true });
}

function setupParentPostExists() {
  mockSelectFromWhere.mockReturnValue([{ id: validPostId }]);
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

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).not.toEqual(expect.objectContaining({ error: 'invalidPostId' }));
    });

    it('should accept a valid uppercase UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      const result = await createReply(
        'en',
        'e4',
        'ABCDEF00-1234-5678-9ABC-DEF012345678',
        prevState,
        makeFormData('hello')
      );
      expect(result).not.toEqual(expect.objectContaining({ error: 'invalidPostId' }));
    });

    it('should accept a valid mixed-case UUID', async () => {
      setupAuthenticatedUser();
      setupParentPostExists();

      const result = await createReply(
        'en',
        'e4',
        'AbCdEf00-1234-5678-9aBc-DeF012345678',
        prevState,
        makeFormData('hello')
      );
      expect(result).not.toEqual(expect.objectContaining({ error: 'invalidPostId' }));
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

      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({});
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
      const result = await createReply(
        'en',
        'e4',
        validPostId,
        prevState,
        makeFormData(maxContent)
      );
      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('successful reply creation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupParentPostExists();
    });

    it('should insert reply with correct parentId, topicType, and topicKey', async () => {
      const result = await createReply(
        'en',
        'e4',
        validPostId,
        prevState,
        makeFormData('My reply about e4')
      );

      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'e4',
        parentId: validPostId,
        content: 'My reply about e4',
      });
    });

    it('should trim whitespace from content', async () => {
      const result = await createReply(
        'ja',
        'a1',
        validPostId,
        prevState,
        makeFormData('  trimmed reply  ')
      );

      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'a1',
        parentId: validPostId,
        content: 'trimmed reply',
      });
    });

    it('should call revalidatePath with correct path after successful reply', async () => {
      await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(revalidatePath).toHaveBeenCalledWith(`/en/topics/squares/e4/posts/${validPostId}`);
    });

    it('should return empty object on success', async () => {
      const result = await createReply('en', 'e4', validPostId, prevState, makeFormData('hello'));
      expect(result).toEqual({});
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
});
