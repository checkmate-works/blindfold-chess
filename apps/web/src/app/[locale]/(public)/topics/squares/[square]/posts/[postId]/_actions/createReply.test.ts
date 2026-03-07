import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReply } from './createReply';

const mockGetUser = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);

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
    insert: () => ({
      values: mockInsertValues,
    }),
  },
  topicPosts: {},
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

describe('createReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('square validation', () => {
    it('should return error for invalid square', async () => {
      const result = await createReply('en', 'z9', testPostId, {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createReply('en', 'e4', testPostId, {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('content validation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    });

    it('should return contentRequired when content is empty', async () => {
      const result = await createReply('en', 'e4', testPostId, {}, makeFormData(''));
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content is only whitespace', async () => {
      const result = await createReply('en', 'e4', testPostId, {}, makeFormData('   '));
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content field is missing', async () => {
      const fd = new FormData();
      const result = await createReply('en', 'e4', testPostId, {}, fd);
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentTooLong when content exceeds 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);
      const result = await createReply('en', 'e4', testPostId, {}, makeFormData(longContent));
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept content at exactly 5000 characters', async () => {
      const maxContent = 'a'.repeat(5000);
      const result = await createReply('en', 'e4', testPostId, {}, makeFormData(maxContent));
      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('successful reply creation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    });

    it('should insert reply with correct parentId, topicType, and topicKey', async () => {
      const result = await createReply(
        'en',
        'e4',
        testPostId,
        {},
        makeFormData('My reply about e4')
      );

      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'e4',
        parentId: testPostId,
        content: 'My reply about e4',
      });
    });

    it('should trim whitespace from content', async () => {
      const result = await createReply(
        'ja',
        'a1',
        testPostId,
        {},
        makeFormData('  trimmed reply  ')
      );

      expect(result).toEqual({});
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'a1',
        parentId: testPostId,
        content: 'trimmed reply',
      });
    });
  });

  describe('validation order', () => {
    it('should validate square before checking auth', async () => {
      const result = await createReply('en', 'invalid', testPostId, {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before validating content', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createReply('en', 'e4', testPostId, {}, makeFormData(''));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });
});
