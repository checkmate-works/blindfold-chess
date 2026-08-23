import { revalidatePath } from 'next/cache';

import { describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deleteChunk } from './deleteChunk';

const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/security/client-ip');

vi.mock('@/lib/db', async () => {
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
    chunks: {
      ...(await actualDbSchema()),
      id: 'id',
      userId: 'user_id',
      representativeFen: 'representative_fen',
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

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const authorUserId = 'author-00000000-0000-0000-0000-000000000001';
const testChunkId = 'chk-00000000-0000-0000-0000-000000000001';

const sampleChunk = {
  id: testChunkId,
  userId: authorUserId,
  representativeFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  title: 'Fianchetto',
};

function setupAdminWithChunk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // 1st call: userRoles → admin; 2nd call: chunks → sample
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([sampleChunk]);
}

describe('deleteChunk', () => {
  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deleteChunk(testChunkId);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await deleteChunk(testChunkId);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when id is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deleteChunk('');
    expect(result).toEqual({ error: 'Chunk ID is required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when chunk does not exist and NOT insert moderation_actions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await deleteChunk(testChunkId);
    expect(result).toEqual({ error: 'Chunk not found' });
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

    const result = await deleteChunk(testChunkId);
    expect(result).toEqual({ error: 'Chunk not found' });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should soft-delete the chunk and insert a moderation_actions audit row', async () => {
    setupAdminWithChunk();

    const result = await deleteChunk(testChunkId);
    expect(result).toEqual({ success: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateSetWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({
      actorId: adminUserId,
      action: 'delete_chunk',
      targetType: 'chunk',
      targetId: testChunkId,
      reason: null,
      metadata: {
        representativeFen: sampleChunk.representativeFen,
        title: sampleChunk.title,
        authorId: sampleChunk.userId,
      },
      ipAddress: '127.0.0.1',
    });
  });

  it('should use db.transaction to wrap update and audit log atomically', async () => {
    setupAdminWithChunk();

    await deleteChunk(testChunkId);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('should propagate error when transaction fails (atomicity)', async () => {
    setupAdminWithChunk();

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    (db as unknown as { transaction: unknown }).transaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB transaction failed'));

    await expect(deleteChunk(testChunkId)).rejects.toThrow('DB transaction failed');
    expect(revalidatePath).not.toHaveBeenCalled();

    (db as unknown as { transaction: unknown }).transaction = originalTransaction;
  });

  it('should revalidate the list path after successful deletion', async () => {
    setupAdminWithChunk();

    await deleteChunk(testChunkId);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/chunks');
  });

  it('should not call revalidatePath when chunk is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await deleteChunk(testChunkId);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when user is unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deleteChunk(testChunkId);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
