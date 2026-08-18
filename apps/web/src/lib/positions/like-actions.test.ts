import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotification } from '@/lib/notifications/notification';
import { logActivityEvent } from '@/lib/users/activity-log';

import { togglePositionLike as toggleLike } from './like-actions';

// Spy on drizzle-orm's `eq`/`and` so tests can assert that SELECT/DELETE filter
// by `likes.targetType = 'position'`. This is the positions-side safety net
// matching the one in topics/_actions/toggleLike.test.ts.
vi.mock('@/lib/moderation/block', () => ({
  isBlockedBetween: () => Promise.resolve(false),
  hasBlocked: () => Promise.resolve(false),
}));

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

vi.mock('@/lib/users/activity-log');

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
  const positionsTable = { id: 'id', userId: 'user_id', type: 'type' };
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
    mockSelectPositionAuthor.mockResolvedValue([{ userId: testPositionAuthorId, type: 'memory' }]);
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
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'memory' },
      ]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).toHaveBeenCalledWith({
        userId: testPositionAuthorId,
        actorId: testUserId,
        type: 'like',
        targetType: 'position',
        targetId: testPositionId,
        metadata: { positionId: testPositionId, positionType: 'memory' },
      });
    });

    it('should include positionType="puzzle" in notification metadata for a puzzle-type position', async () => {
      // Regression for the 404 bug: puzzle likes must include
      // `positionType` so the recipient's notification link can route
      // to /practice/puzzle/{id} instead of /practice/position-memory/{id}.
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'puzzle' },
      ]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'like',
          targetType: 'position',
          targetId: testPositionId,
          metadata: { positionId: testPositionId, positionType: 'puzzle' },
        })
      );
    });

    it('should include positionType="sequence" in notification metadata for a sequence-type position', async () => {
      // Sequence-typed positions currently have no detail page — the
      // notification UI degrades to a non-link button on the recipient
      // side. Still, the metadata must carry `positionType: 'sequence'`
      // so the UI can make that decision instead of falling back to the
      // (404-prone) memory URL.
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'sequence' },
      ]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'like',
          targetType: 'position',
          targetId: testPositionId,
          metadata: { positionId: testPositionId, positionType: 'sequence' },
        })
      );
    });

    it('should omit positionType from metadata when the DB value is outside the known set', async () => {
      // Defensive: if a legacy or unexpected `type` ever reached the DB
      // (migration bug, etc.), we should still create the notification
      // without propagating the bad value downstream.
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'unknown_type' },
      ]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { positionId: testPositionId },
        })
      );
    });

    it('should NOT create notification when liking own position (self-like suppression)', async () => {
      mockSelectPositionAuthor.mockResolvedValue([{ userId: testUserId, type: 'memory' }]);

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

  describe('polymorphic targetType filtering (safety net)', () => {
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

  // Liking deliberately performs no `revalidatePath`: every page showing a
  // like count is uncached, and calling it makes Next.js re-render and ship
  // the caller's whole current page with the action result (256 KB per like
  // on the home feed). See the `@design` note on `performEntityToggleLike`.
  describe('no revalidation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
      mockInsertValues.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 1 }]);
    });

    it('should not revalidate any path when liking a position', async () => {
      await toggleLike(testPositionId, testLocale);

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should not revalidate any path for a puzzle-type position either', async () => {
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'puzzle' },
      ]);

      await toggleLike(testPositionId, testLocale);

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should not revalidate when unliking a puzzle (toggle-off)', async () => {
      mockSelectPositionAuthor.mockResolvedValue([
        { userId: testPositionAuthorId, type: 'puzzle' },
      ]);
      const uniqueError = new Error('Failed query');
      const pgError = new Error('duplicate key');
      (pgError as unknown as Record<string, string>).code = '23505';
      uniqueError.cause = pgError;
      mockInsertValues.mockRejectedValue(uniqueError);
      mockDeleteWhere.mockResolvedValue(undefined);
      mockSelectCount.mockResolvedValue([{ count: 0 }]);

      await expect(toggleLike(testPositionId, testLocale)).resolves.toEqual({
        liked: false,
        likeCount: 0,
      });

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should not revalidate when the author likes their own puzzle (no notification)', async () => {
      mockSelectPositionAuthor.mockResolvedValue([{ userId: testUserId, type: 'puzzle' }]);

      await toggleLike(testPositionId, testLocale);

      expect(createNotification).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should still resolve when the position lookup returns null', async () => {
      // Defensive: if the row disappears between the like insert and the
      // position-type lookup, the code should not throw.
      mockSelectPositionAuthor.mockResolvedValue([]);

      await expect(toggleLike(testPositionId, testLocale)).resolves.toEqual({
        liked: true,
        likeCount: 1,
      });

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});
