import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { toggleFollow } from './toggleFollow';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();

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
    toggleFollow: { action: 'toggle_follow', maxAttempts: 100, windowMs: 86_400_000 },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectFromWhere(),
        }),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
  },
  profiles: {
    id: 'id',
    username: 'username',
    deletedAt: 'deleted_at',
  },
  follows: {
    followerId: 'follower_id',
    followingId: 'following_id',
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const targetProfileId = 'target-00000000-0000-0000-0000-000000000001';

describe('toggleFollow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should return invalidUsername for invalid username', async () => {
      const result = await toggleFollow('', 'en');
      expect(result).toEqual({ error: 'invalidUsername' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'signInRequired' });
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should proceed when user is not banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhere.mockResolvedValue([{ id: targetProfileId }]);
      mockInsertValues.mockResolvedValue(undefined);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ following: true });
      expect(mockIsUserBanned).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('target user lookup', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should return userNotFound when target profile does not exist', async () => {
      mockSelectFromWhere.mockResolvedValue([]);

      const result = await toggleFollow('nonexistent', 'en');
      expect(result).toEqual({ error: 'userNotFound' });
    });

    it('should return cannotFollowSelf when following own profile', async () => {
      mockSelectFromWhere.mockResolvedValue([{ id: testUserId }]);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'cannotFollowSelf' });
    });
  });

  describe('follow toggle', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhere.mockResolvedValue([{ id: targetProfileId }]);
    });

    it('should insert follow and return following=true when not previously following', async () => {
      mockInsertValues.mockResolvedValue(undefined);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ following: true });
      expect(mockInsertValues).toHaveBeenCalledWith({
        followerId: testUserId,
        followingId: targetProfileId,
      });
    });

    it('should delete follow and return following=false on unique violation (already following)', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ following: false });
    });

    it('should rethrow non-unique-violation errors', async () => {
      mockInsertValues.mockRejectedValue(new Error('Connection failed'));

      await expect(toggleFollow('validuser', 'en')).rejects.toThrow('Connection failed');
    });
  });

  describe('validation order', () => {
    it('should validate username before checking auth', async () => {
      const result = await toggleFollow('', 'en');
      expect(result).toEqual({ error: 'invalidUsername' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before ban check', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockIsUserBanned).not.toHaveBeenCalled();
    });
  });

  describe('activity logging', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhere.mockResolvedValue([{ id: targetProfileId }]);
    });

    it('should log "follow" activity event when following', async () => {
      mockInsertValues.mockResolvedValue(undefined);

      await toggleFollow('validuser', 'en');
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'follow',
        targetType: 'user',
        targetId: targetProfileId,
      });
    });

    it('should log "unfollow" activity event when unfollowing', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);

      await toggleFollow('validuser', 'en');
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'unfollow',
        targetType: 'user',
        targetId: targetProfileId,
      });
    });
  });
});
