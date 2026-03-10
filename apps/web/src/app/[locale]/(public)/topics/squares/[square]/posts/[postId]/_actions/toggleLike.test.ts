import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { toggleLike } from './toggleLike';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();
const mockSelectCount = vi.fn();

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

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: mockInsertValues,
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
    select: () => ({
      from: () => ({
        where: () => mockSelectCount(),
      }),
    }),
  },
  topicPostLikes: {
    userId: 'user_id',
    postId: 'post_id',
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPostId = '11111111-2222-3333-4444-555555555555';

describe('toggleLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should return invalidPostId for non-UUID postId', async () => {
      const result = await toggleLike('not-a-uuid', 'en', 'e4');
      expect(result).toEqual({ error: 'invalidPostId' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should return invalidSquare for invalid square', async () => {
      const result = await toggleLike(testPostId, 'en', 'z9');
      expect(result).toEqual({ error: 'invalidSquare' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ error: 'signInRequired' });
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should proceed when user is not banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ liked: true, likeCount: 1 });
      expect(mockIsUserBanned).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('like toggle', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should insert like and return liked=true when not previously liked', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ liked: true, likeCount: 1 });
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        postId: testPostId,
      });
    });

    it('should delete like and return liked=false on unique violation (already liked)', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ liked: false, likeCount: 0 });
    });

    it('should rethrow non-unique-violation errors', async () => {
      mockInsertValues.mockRejectedValue(new Error('Connection failed'));

      await expect(toggleLike(testPostId, 'en', 'e4')).rejects.toThrow('Connection failed');
    });
  });

  describe('validation order', () => {
    it('should validate postId before checking square', async () => {
      const result = await toggleLike('not-a-uuid', 'en', 'z9');
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should validate square before checking auth', async () => {
      const result = await toggleLike(testPostId, 'en', 'z9');
      expect(result).toEqual({ error: 'invalidSquare' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before ban check', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleLike(testPostId, 'en', 'e4');
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockIsUserBanned).not.toHaveBeenCalled();
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should log "like" activity event when liking', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      await toggleLike(testPostId, 'en', 'e4');
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'like',
        targetType: 'topic_post',
        targetId: testPostId,
      });
    });

    it('should log "unlike" activity event when unliking', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      await toggleLike(testPostId, 'en', 'e4');
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'unlike',
        targetType: 'topic_post',
        targetId: testPostId,
      });
    });
  });
});
