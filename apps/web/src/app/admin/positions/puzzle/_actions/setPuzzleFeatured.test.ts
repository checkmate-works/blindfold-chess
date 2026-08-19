import { revalidatePath, revalidateTag } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DAILY_PUZZLE_CACHE_TAG } from '@/lib/cache-tags';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { setPuzzleFeatured } from './setPuzzleFeatured';

const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockFeaturedInsertReturning = vi.fn();
const mockDeleteWhere = vi.fn();
const mockDeleteReturning = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/security/client-ip');

vi.mock('@/lib/db', () => {
  const makeDbOps = () => ({
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          return {
            limit: () =>
              mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ??
              [],
          };
        },
      }),
    }),
    // The featured-pool insert chains `.onConflictDoNothing().returning()`;
    // the moderation-audit insert terminates at `.values()` (awaiting the
    // returned plain object resolves to itself, mimicking Drizzle's thenable
    // query builder).
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoNothing: () => ({
            returning: () => mockFeaturedInsertReturning(),
          }),
        };
      },
    }),
    delete: () => ({
      where: (...args: unknown[]) => {
        mockDeleteWhere(...args);
        return { returning: () => mockDeleteReturning() };
      },
    }),
  });

  return {
    db: {
      ...makeDbOps(),
      transaction: async (fn: (tx: ReturnType<typeof makeDbOps>) => Promise<void>) => {
        mockTransaction();
        return fn(makeDbOps());
      },
    },
    positions: {
      id: 'id',
      userId: 'user_id',
      type: 'type',
      title: 'title',
      deletedAt: 'deleted_at',
    },
    featuredPuzzles: {
      positionId: 'position_id',
    },
    userRoles: { userId: 'user_id' },
    moderationActions: {
      actorId: 'actor_id',
      action: 'action',
      targetType: 'target_type',
      targetId: 'target_id',
      reason: 'reason',
      metadata: 'metadata',
      ipAddress: 'ip_address',
    },
  };
});

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const authorUserId = 'author-00000000-0000-0000-0000-000000000001';
const testPositionId = 'pos-00000000-0000-0000-0000-000000000001';

const samplePuzzle = {
  id: testPositionId,
  title: 'Mate in Two',
  userId: authorUserId,
};

function setupAdminWithPuzzle() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // 1st call: userRoles → admin; 2nd call: positions → sample puzzle
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([samplePuzzle]);
}

describe('setPuzzleFeatured', () => {
  beforeEach(() => {
    // Happy-path defaults: the pool write reports one changed row. Idempotency
    // tests override these with [] to simulate "already in requested state".
    mockFeaturedInsertReturning.mockReturnValue([{ positionId: testPositionId }]);
    mockDeleteReturning.mockReturnValue([{ positionId: testPositionId }]);
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await setPuzzleFeatured(testPositionId, true);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await setPuzzleFeatured(testPositionId, true);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when id is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await setPuzzleFeatured('', true);
    expect(result).toEqual({ error: 'Position ID is required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when the puzzle does not exist and NOT write anything', async () => {
    // The lookup filters by type='puzzle' (and deletedAt IS NULL when
    // featuring), so non-puzzle ids and soft-deleted puzzles surface here as
    // "not found" — an empty result set.
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await setPuzzleFeatured(testPositionId, true);
    expect(result).toEqual({ error: 'Puzzle not found' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('should add the puzzle to the pool and insert a feature_puzzle audit row', async () => {
    setupAdminWithPuzzle();

    const result = await setPuzzleFeatured(testPositionId, true);
    expect(result).toEqual({ success: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, { positionId: testPositionId });
    expect(mockInsertValues).toHaveBeenNthCalledWith(2, {
      actorId: adminUserId,
      action: 'feature_puzzle',
      targetType: 'position',
      targetId: testPositionId,
      reason: null,
      metadata: {
        title: samplePuzzle.title,
        authorId: samplePuzzle.userId,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('should remove the puzzle from the pool and insert an unfeature_puzzle audit row', async () => {
    setupAdminWithPuzzle();

    const result = await setPuzzleFeatured(testPositionId, false);
    expect(result).toEqual({ success: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'unfeature_puzzle',
      targetType: 'position',
      targetId: testPositionId,
      reason: null,
      metadata: {
        title: samplePuzzle.title,
        authorId: samplePuzzle.userId,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('should NOT insert an audit row when featuring an already-featured puzzle (idempotency)', async () => {
    setupAdminWithPuzzle();
    // onConflictDoNothing hit the existing row: zero rows returned
    mockFeaturedInsertReturning.mockReturnValue([]);

    const result = await setPuzzleFeatured(testPositionId, true);
    expect(result).toEqual({ success: true });

    // Only the pool insert attempt — no moderation_actions row
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ positionId: testPositionId });
  });

  it('should NOT insert an audit row when unfeaturing a puzzle not in the pool (idempotency)', async () => {
    setupAdminWithPuzzle();
    mockDeleteReturning.mockReturnValue([]);

    const result = await setPuzzleFeatured(testPositionId, false);
    expect(result).toEqual({ success: true });

    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should revalidate the daily puzzle tag and the admin list path on success', async () => {
    setupAdminWithPuzzle();

    await setPuzzleFeatured(testPositionId, true);
    expect(revalidateTag).toHaveBeenCalledWith(DAILY_PUZZLE_CACHE_TAG, { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/positions/puzzle');
  });

  it('should propagate error when transaction fails and skip revalidation (atomicity)', async () => {
    setupAdminWithPuzzle();

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    (db as unknown as { transaction: unknown }).transaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(setPuzzleFeatured(testPositionId, true)).rejects.toThrow('DB transaction failed');
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();

    (db as unknown as { transaction: unknown }).transaction = originalTransaction;
  });
});
