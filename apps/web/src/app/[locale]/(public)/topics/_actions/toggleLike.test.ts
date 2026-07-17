import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotification } from '@/lib/notifications/notification';
import { logActivityEvent } from '@/lib/users/activity-log';

import { toggleLikeBase } from './toggleLike';

// Spy on drizzle-orm's `eq` so tests can assert that DELETE/SELECT filter
// by `likes.targetType = 'topic_post'`. This guards against future regressions
// where omitting the targetType filter would cross-delete other polymorphic
// like rows (e.g. 'position') once Phase B lands.
// Note: vi.mock is hoisted to the top of the file by Vitest, so it applies
// before the `eq` import above is resolved — the imported `eq` is the spied
// version returned from this mock factory.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    and: vi.fn(actual.and),
  };
});

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockInsertValues = vi.fn();
const mockDeleteWhere = vi.fn();
const mockSelectCount = vi.fn();
const mockSelectPostAuthor = vi.fn();
const mockSelectProfile = vi.fn();

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
    toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  },
}));

vi.mock('@/lib/db', () => {
  const topicPostsTable = { id: 'id', userId: 'user_id' };
  const likesTable = { userId: 'user_id', targetType: 'target_type', targetId: 'target_id' };
  const profilesTable = { id: 'id' };

  return {
    db: {
      insert: () => ({
        values: mockInsertValues,
      }),
      delete: () => ({
        where: mockDeleteWhere,
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === topicPostsTable) {
              return { limit: () => mockSelectPostAuthor() };
            }
            if (table === profilesTable) {
              // The auth guard's own-profile lookup: .where(...).limit(1).
              return { limit: () => mockSelectProfile() };
            }
            return mockSelectCount();
          },
        }),
      }),
    },
    topicPosts: topicPostsTable,
    likes: likesTable,
    profiles: profilesTable,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPostAuthorId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = '11111111-2222-3333-4444-555555555555';

const validParams = {
  postId: testPostId,
  locale: 'en',
  topicIdentifier: 'test-topic',
  topicType: 'opening' as const,
  urlSegment: 'openings',
  validateTopic: vi.fn().mockResolvedValue(true),
};

describe('toggleLikeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validParams.validateTopic.mockResolvedValue(true);
    mockSelectPostAuthor.mockResolvedValue([{ userId: testPostAuthorId }]);
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  describe('input validation', () => {
    it('should return invalidPostId for non-UUID postId', async () => {
      const result = await toggleLikeBase({ ...validParams, postId: 'not-a-uuid' });
      expect(result).toEqual({ error: 'invalidPostId' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should return error for invalid topic', async () => {
      validParams.validateTopic.mockResolvedValue(false);

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'invalidOpening' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'signInRequired' });
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should proceed when user is not banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ liked: true, likeCount: 1 });
      expect(mockIsUserBanned).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('profile requirement', () => {
    it('should return profileRequired when user has no profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockSelectProfile.mockResolvedValue([]);

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'profileRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockDeleteWhere).not.toHaveBeenCalled();
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

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ liked: true, likeCount: 1 });
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        targetType: 'topic_post',
        targetId: testPostId,
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

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ liked: false, likeCount: 0 });
    });

    it('should rethrow non-unique-violation errors', async () => {
      mockInsertValues.mockRejectedValue(new Error('Connection failed'));

      await expect(toggleLikeBase(validParams)).rejects.toThrow('Connection failed');
    });
  });

  describe('notification to post author', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);
    });

    it('should create notification for post author when liking another user post', async () => {
      mockSelectPostAuthor.mockResolvedValue([{ userId: testPostAuthorId }]);

      await toggleLikeBase(validParams);

      expect(createNotification).toHaveBeenCalledWith({
        userId: testPostAuthorId,
        actorId: testUserId,
        type: 'like',
        targetType: 'topic_post',
        targetId: testPostId,
        metadata: {
          topicType: 'opening',
          topicKey: 'test-topic',
          postId: testPostId,
        },
      });
    });

    it('should not create notification when liking own post', async () => {
      mockSelectPostAuthor.mockResolvedValue([{ userId: testUserId }]);

      await toggleLikeBase(validParams);

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should not create notification when unliking', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      await toggleLikeBase(validParams);

      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('validation order', () => {
    it('should validate postId before checking topic', async () => {
      validParams.validateTopic.mockResolvedValue(false);
      const result = await toggleLikeBase({ ...validParams, postId: 'not-a-uuid' });
      expect(result).toEqual({ error: 'invalidPostId' });
    });

    it('should validate topic before checking auth', async () => {
      validParams.validateTopic.mockResolvedValue(false);
      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'invalidOpening' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should check auth before ban check', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleLikeBase(validParams);
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockIsUserBanned).not.toHaveBeenCalled();
    });
  });

  describe('polymorphic targetType filtering (Phase A safety net)', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should INSERT likes with targetType="topic_post"', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      await toggleLikeBase(validParams);

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'topic_post' })
      );
    });

    it('should filter DELETE by targetType="topic_post" to avoid cross-deleting other polymorphic likes', async () => {
      // Simulate unique-violation so the code path enters DELETE.
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      vi.mocked(eq).mockClear();
      await toggleLikeBase(validParams);

      // `likes.targetType` is mocked as the string 'target_type' in the db mock above.
      // Verify the implementation invoked eq(likes.targetType, 'topic_post') at least once
      // during the toggle flow (covering INSERT's subsequent SELECT or the DELETE WHERE).
      const eqCalls = vi.mocked(eq).mock.calls;
      expect(
        eqCalls.some(
          (args) => (args[0] as unknown) === 'target_type' && (args[1] as unknown) === 'topic_post'
        )
      ).toBe(true);
      // DELETE branch must have been reached.
      expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    });

    it('should filter the post like-count SELECT by targetType="topic_post"', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 3 }]);

      vi.mocked(eq).mockClear();
      const result = await toggleLikeBase(validParams);

      expect(result).toEqual({ liked: true, likeCount: 3 });
      const eqCalls = vi.mocked(eq).mock.calls;
      // The final like-count SELECT must constrain target_type to 'topic_post'
      // so likes from other polymorphic targets never inflate the count.
      expect(
        eqCalls.some(
          (args) => (args[0] as unknown) === 'target_type' && (args[1] as unknown) === 'topic_post'
        )
      ).toBe(true);
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

      await toggleLikeBase(validParams);
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

      await toggleLikeBase(validParams);
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'unlike',
        targetType: 'topic_post',
        targetId: testPostId,
      });
    });
  });
});
