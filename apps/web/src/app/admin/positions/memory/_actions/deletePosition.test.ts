import { revalidatePath } from 'next/cache';

import { describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deletePosition } from './deletePosition';

const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/security/client-ip');

vi.mock('@/lib/db', () => {
  const makeDbOps = () => ({
    select: () => ({
      from: () => ({
        where: whereThenLimit(mockSelectFromWhere),
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateSetWhere,
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
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
      fen: 'fen',
      title: 'title',
      deletedAt: 'deleted_at',
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

vi.mock('@/lib/points', () => ({
  // Stub clawback to a no-op; this test does not exercise the points ledger.
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const authorUserId = 'author-00000000-0000-0000-0000-000000000001';
const testPositionId = 'pos-00000000-0000-0000-0000-000000000001';

const samplePosition = {
  id: testPositionId,
  userId: authorUserId,
  type: 'memory',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  title: 'Starting Position',
};

function setupAdminWithPosition() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // 1st call: userRoles → admin; 2nd call: positions → sample
  mockSelectFromWhere
    .mockReturnValueOnce([{ role: 'admin' }])
    .mockReturnValueOnce([samplePosition]);
}

describe('deletePosition', () => {
  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deletePosition(testPositionId);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await deletePosition(testPositionId);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when id is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deletePosition('');
    expect(result).toEqual({ error: 'Position ID is required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when position does not exist and NOT insert moderation_actions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await deletePosition(testPositionId);
    expect(result).toEqual({ error: 'Position not found' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should return error when deleting an already soft-deleted record', async () => {
    // existing check filters by `deletedAt IS NULL`, so a soft-deleted row
    // is observed by the Server Action as "not found" (empty result set).
    // This is the idempotency guard — repeated delete attempts must not
    // append additional moderation_actions rows.
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await deletePosition(testPositionId);
    expect(result).toEqual({ error: 'Position not found' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should soft-delete the position and insert a moderation_actions audit row', async () => {
    setupAdminWithPosition();

    const result = await deletePosition(testPositionId);
    expect(result).toEqual({ success: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateSetWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'delete_position',
      targetType: 'position',
      targetId: testPositionId,
      reason: null,
      metadata: {
        positionType: samplePosition.type,
        fen: samplePosition.fen,
        title: samplePosition.title,
        authorId: samplePosition.userId,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('should use db.transaction to wrap update and audit log atomically', async () => {
    setupAdminWithPosition();

    await deletePosition(testPositionId);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('should propagate error when transaction fails (atomicity)', async () => {
    setupAdminWithPosition();

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    (db as unknown as { transaction: unknown }).transaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(deletePosition(testPositionId)).rejects.toThrow('DB transaction failed');
    expect(revalidatePath).not.toHaveBeenCalled();

    (db as unknown as { transaction: unknown }).transaction = originalTransaction;
  });

  it('should revalidate both the list and detail paths after successful deletion', async () => {
    setupAdminWithPosition();

    await deletePosition(testPositionId);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/positions/memory');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/positions/memory/${testPositionId}`);
  });

  it('should not call revalidatePath when position is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await deletePosition(testPositionId);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when user is unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deletePosition(testPositionId);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
