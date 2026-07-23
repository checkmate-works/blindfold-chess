import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/users/activity-log';

import { toggleFollow } from './toggleFollow';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();
const mockIsBlockedBetween = vi.fn();

vi.mock('@/lib/moderation/block', () => ({
  isBlockedBetween: (...args: unknown[]) => mockIsBlockedBetween(...args),
  hasBlocked: () => Promise.resolve(false),
}));

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

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
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
          // Both the auth guard's own-profile lookup and the target user
          // lookup select from `profiles` with `.where(...).limit(1)`, so
          // table identity cannot tell them apart. The guard always runs
          // first, so the first select resolves via mockSelectProfile and
          // every later select via mockSelectFromWhere.
          limit: () =>
            mockSelectProfile.mock.calls.length === 0 ? mockSelectProfile() : mockSelectFromWhere(),
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
  userFollows: {
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
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
    mockIsBlockedBetween.mockResolvedValue(false);
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

  describe('profile requirement', () => {
    it('should return profileRequired when user has no profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectProfile.mockResolvedValue([]);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'profileRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockDeleteWhere).not.toHaveBeenCalled();
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

    it('should delete follow and return following=false on unique violation (code on error)', async () => {
      const pgError = new Error('duplicate key value violates unique constraint "uq_follow"');
      (pgError as unknown as Record<string, string>).code = '23505';
      pgError.name = 'PostgresError';
      mockInsertValues.mockRejectedValue(pgError);
      mockDeleteWhere.mockResolvedValue(undefined);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ following: false });
    });

    it('should delete follow and return following=false on unique violation (code on cause)', async () => {
      const cause = new Error('duplicate key value violates unique constraint "uq_follow"');
      (cause as unknown as Record<string, string>).code = '23505';
      cause.name = 'PostgresError';
      const wrappedError = new Error('Failed query: insert into "follows"...', { cause });
      mockInsertValues.mockRejectedValue(wrappedError);
      mockDeleteWhere.mockResolvedValue(undefined);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ following: false });
    });

    it('should rethrow non-unique-violation errors', async () => {
      mockInsertValues.mockRejectedValue(new Error('Connection failed'));

      await expect(toggleFollow('validuser', 'en')).rejects.toThrow('Connection failed');
    });
  });

  describe('block enforcement', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectFromWhere.mockResolvedValue([{ id: targetProfileId }]);
    });

    it('rejects the follow with "blocked" when a block exists in either direction', async () => {
      mockIsBlockedBetween.mockResolvedValue(true);

      const result = await toggleFollow('validuser', 'en');
      expect(result).toEqual({ error: 'blocked' });
      expect(mockIsBlockedBetween).toHaveBeenCalledWith(testUserId, targetProfileId);
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockDeleteWhere).not.toHaveBeenCalled();
    });
  });

  describe('validation order', () => {
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
      const pgError = new Error('duplicate key value violates unique constraint "uq_follow"');
      (pgError as unknown as Record<string, string>).code = '23505';
      pgError.name = 'PostgresError';
      mockInsertValues.mockRejectedValue(pgError);
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
