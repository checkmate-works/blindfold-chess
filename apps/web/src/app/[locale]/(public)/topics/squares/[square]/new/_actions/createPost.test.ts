import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPost } from './createPost';

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

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

function makeFormData(content: string): FormData {
  const fd = new FormData();
  fd.set('content', content);
  return fd;
}

describe('createPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('square validation', () => {
    it('should return error for invalid square', async () => {
      const result = await createPost('en', 'z9', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should return error for uppercase square', async () => {
      const result = await createPost('en', 'A1', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
    });

    it('should return error for empty square string', async () => {
      const result = await createPost('en', '', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
    });

    it('should return error for reversed square notation', async () => {
      const result = await createPost('en', '1a', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createPost('en', 'e4', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('content validation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    });

    it('should return contentRequired when content is empty', async () => {
      const result = await createPost('en', 'e4', {}, makeFormData(''));
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content is only whitespace', async () => {
      const result = await createPost('en', 'e4', {}, makeFormData('   '));
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentRequired when content field is missing', async () => {
      const fd = new FormData();
      const result = await createPost('en', 'e4', {}, fd);
      expect(result).toEqual({ error: 'contentRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentTooLong when content exceeds 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);
      const result = await createPost('en', 'e4', {}, makeFormData(longContent));
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept content at exactly 5000 characters', async () => {
      const maxContent = 'a'.repeat(5000);
      await expect(createPost('en', 'e4', {}, makeFormData(maxContent))).rejects.toThrow(
        'NEXT_REDIRECT'
      );
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe('successful post creation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    });

    it('should insert post and redirect on success', async () => {
      await expect(createPost('en', 'e4', {}, makeFormData('My post about e4'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'e4',
        content: 'My post about e4',
      });

      expect(mockRedirect).toHaveBeenCalledWith('/en/topics/squares/e4');
    });

    it('should trim whitespace from content', async () => {
      await expect(createPost('ja', 'a1', {}, makeFormData('  trimmed content  '))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'square',
        topicKey: 'a1',
        content: 'trimmed content',
      });
    });

    it('should redirect to correct locale', async () => {
      await expect(createPost('ja', 'h8', {}, makeFormData('post'))).rejects.toThrow(
        'NEXT_REDIRECT'
      );

      expect(mockRedirect).toHaveBeenCalledWith('/ja/topics/squares/h8');
    });
  });

  describe('validation order', () => {
    it('should validate square before checking auth', async () => {
      const result = await createPost('en', 'invalid', {}, makeFormData('hello'));
      expect(result).toEqual({ error: 'Invalid square' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before validating content', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createPost('en', 'e4', {}, makeFormData(''));
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });
});
