import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';
import { createNotification } from '@/lib/notification';

import { togglePositionLike as toggleLike } from './like-actions';

// Spy on drizzle-orm's `eq`/`and` so tests can assert that SELECT/DELETE filter
// by `likes.targetType = 'position'`. This is the positions-side safety net
// matching the one in topics/_actions/toggleLike.test.ts.
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
const mockSelectPositionAuthor = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/notification', () => ({
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

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    toggleLike: { action: 'toggle_like', maxAttempts: 50, windowMs: 86_400_000 },
  },
}));

vi.mock('@/lib/db', () => {
  const positionsTable = { id: 'id', userId: 'user_id' };
  const likesTable = { userId: 'user_id', targetType: 'target_type', targetId: 'target_id' };

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
            if (table === positionsTable) {
              return { limit: () => mockSelectPositionAuthor() };
            }
            return mockSelectCount();
          },
        }),
      }),
    },
    positions: positionsTable,
    likes: likesTable,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testPositionAuthorId = 'user-00000000-0000-0000-0000-000000000002';
const testPositionId = '11111111-2222-3333-4444-555555555555';
const testLocale = 'en';

describe('toggleLike (position-memory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectPositionAuthor.mockResolvedValue([{ userId: testPositionAuthorId }]);
  });

  describe('input validation', () => {
    it('should return invalidPositionId for non-UUID positionId', async () => {
      const result = await toggleLike('not-a-uuid', testLocale);
      expect(result).toEqual({ error: 'invalidPositionId' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleLike(testPositionId, testLocale);
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return banned when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const result = await toggleLike(testPositionId, testLocale);
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('like toggle', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should insert like with targetType="position" and return liked=true', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      const result = await toggleLike(testPositionId, testLocale);

      expect(result).toEqual({ liked: true, likeCount: 1 });
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        targetType: 'position',
        targetId: testPositionId,
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

      const result = await toggleLike(testPositionId, testLocale);
      expect(result).toEqual({ liked: false, likeCount: 0 });
      expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    });

    it('should rethrow non-unique-violation errors', async () => {
      mockInsertValues.mockRejectedValue(new Error('Connection failed'));

      await expect(toggleLike(testPositionId, testLocale)).rejects.toThrow('Connection failed');
    });
  });

  describe('notification to position author', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);
    });

    it('should create notification for position author when liking another user position', async () => {
      mockSelectPositionAuthor.mockResolvedValue([{ userId: testPositionAuthorId }]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).toHaveBeenCalledWith({
        userId: testPositionAuthorId,
        actorId: testUserId,
        type: 'like',
        targetType: 'position',
        targetId: testPositionId,
        metadata: { positionId: testPositionId },
      });
    });

    it('should NOT create notification when liking own position (self-like suppression)', async () => {
      mockSelectPositionAuthor.mockResolvedValue([{ userId: testUserId }]);

      await toggleLike(testPositionId, testLocale);

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

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should not create notification when position row is missing', async () => {
      mockSelectPositionAuthor.mockResolvedValue([]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('polymorphic targetType filtering (Phase B safety net)', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should INSERT likes with targetType="position"', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);

      await toggleLike(testPositionId, testLocale);

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'position' })
      );
    });

    it('should filter DELETE by targetType="position" to avoid cross-deleting other polymorphic likes', async () => {
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      vi.mocked(eq).mockClear();
      await toggleLike(testPositionId, testLocale);

      const eqCalls = vi.mocked(eq).mock.calls;
      expect(
        eqCalls.some(
          (args) => (args[0] as unknown) === 'target_type' && (args[1] as unknown) === 'position'
        )
      ).toBe(true);
      expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    });

    it('should filter the like-count SELECT by targetType="position"', async () => {
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 3 }]);

      vi.mocked(eq).mockClear();
      const result = await toggleLike(testPositionId, testLocale);

      expect(result).toEqual({ liked: true, likeCount: 3 });
      const eqCalls = vi.mocked(eq).mock.calls;
      expect(
        eqCalls.some(
          (args) => (args[0] as unknown) === 'target_type' && (args[1] as unknown) === 'position'
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

      await toggleLike(testPositionId, testLocale);
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'like',
        targetType: 'position',
        targetId: testPositionId,
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

      await toggleLike(testPositionId, testLocale);
      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'unlike',
        targetType: 'position',
        targetId: testPositionId,
      });
    });
  });

  describe('revalidation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);
    });

    it('should revalidate the position list and detail paths', async () => {
      await toggleLike(testPositionId, testLocale);

      expect(mockRevalidatePath).toHaveBeenCalledWith(`/${testLocale}/practice/position-memory`);
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/${testLocale}/practice/position-memory/${testPositionId}`
      );
    });
  });
});
