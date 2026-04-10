import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPosition } from './createPosition';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertPositions = vi.fn();
const mockInsertFeedItems = vi.fn();
const mockTransaction = vi.fn();

const generatedPositionId = 'pos-00000000-0000-0000-0000-000000000001';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@blindfold-chess/features/chess-core', () => ({
  validateFen: (fen: string) =>
    typeof fen === 'string' && fen.trim().length > 0 && fen !== 'invalid-fen',
}));

vi.mock('@/lib/db', () => {
  const positionsTable = { id: 'id' };

  const makeTxOps = () => ({
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        if (table === positionsTable) {
          mockInsertPositions(values);
          return {
            returning: () =>
              mockInsertPositions.mock.results[mockInsertPositions.mock.calls.length - 1]
                ?.value ?? [{ id: generatedPositionId }],
          };
        }
        // feedItems insert
        mockInsertFeedItems(values);
        return Promise.resolve(undefined);
      },
    }),
  });

  return {
    db: {
      select: () => ({
        from: () => ({
          where: (...args: unknown[]) => {
            mockSelectFromWhere(...args);
            return {
              limit: () =>
                mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]
                  ?.value ?? [],
            };
          },
        }),
      }),
      transaction: async (fn: (tx: ReturnType<typeof makeTxOps>) => Promise<unknown>) => {
        mockTransaction();
        return fn(makeTxOps());
      },
    },
    positions: positionsTable,
    feedItems: {
      entityType: 'entity_type',
      entityId: 'entity_id',
      actorId: 'actor_id',
      metadata: 'metadata',
    },
    userRoles: { userId: 'user_id' },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const authorUserId = '11111111-2222-3333-4444-555555555555';

const validData = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  title: 'Starting Position',
  description: 'Initial chess board setup',
  userId: authorUserId,
};

function setupAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
  mockInsertPositions.mockReturnValue([{ id: generatedPositionId }]);
}

describe('createPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth guard ---

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createPosition(validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await createPosition(validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // --- Validation ---

  it('should return error when FEN is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createPosition({ ...validData, fen: '' });
    expect(result).toEqual({ error: 'FEN is required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when FEN is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createPosition({ ...validData, fen: 'invalid-fen' });
    expect(result).toEqual({ error: 'Invalid FEN — must be a legal chess position' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createPosition({ ...validData, title: '' });
    expect(result).toEqual({ error: 'Title is required' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('should return error when userId is not a valid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createPosition({ ...validData, userId: 'not-a-uuid' });
    expect(result).toEqual({ error: 'User ID must be a valid UUID' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // --- Success path (transactional) ---

  it('should insert position inside db.transaction', async () => {
    setupAdmin();

    const result = await createPosition(validData);
    expect(result).toEqual({ success: true, id: generatedPositionId });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertPositions).toHaveBeenCalledWith({
      fen: validData.fen,
      title: validData.title,
      description: validData.description,
      userId: authorUserId,
      type: 'memory',
    });
  });

  it('should insert a feed_items row inside the same transaction', async () => {
    setupAdmin();

    await createPosition(validData);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsertFeedItems).toHaveBeenCalledTimes(1);
    expect(mockInsertFeedItems).toHaveBeenCalledWith({
      entityType: 'position',
      entityId: generatedPositionId,
      actorId: authorUserId,
      metadata: { type: 'memory' },
    });
  });

  it('should insert positions BEFORE feed_items (ordering inside tx)', async () => {
    setupAdmin();

    await createPosition(validData);

    const positionsOrder = mockInsertPositions.mock.invocationCallOrder[0];
    const feedItemsOrder = mockInsertFeedItems.mock.invocationCallOrder[0];
    expect(positionsOrder).toBeLessThan(feedItemsOrder);
  });

  it('should use the created position.id (not userId) as feed_items.entityId', async () => {
    setupAdmin();

    await createPosition(validData);
    const feedArgs = mockInsertFeedItems.mock.calls[0][0];
    expect(feedArgs.entityId).toBe(generatedPositionId);
    expect(feedArgs.entityId).not.toBe(authorUserId);
  });

  it('should use trimmed userId as feed_items.actorId', async () => {
    setupAdmin();

    await createPosition({ ...validData, userId: `  ${authorUserId}  ` });
    const feedArgs = mockInsertFeedItems.mock.calls[0][0];
    expect(feedArgs.actorId).toBe(authorUserId);
  });

  it('should trim whitespace from fen, title, and description', async () => {
    setupAdmin();

    await createPosition({
      ...validData,
      fen: `  ${validData.fen}  `,
      title: '  Trimmed Title  ',
      description: '  Trimmed Desc  ',
    });

    expect(mockInsertPositions).toHaveBeenCalledWith(
      expect.objectContaining({
        fen: validData.fen,
        title: 'Trimmed Title',
        description: 'Trimmed Desc',
      })
    );
  });

  it('should convert empty description to null', async () => {
    setupAdmin();

    await createPosition({ ...validData, description: '   ' });
    expect(mockInsertPositions).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should pass null description directly through', async () => {
    setupAdmin();

    await createPosition({ ...validData, description: null });
    expect(mockInsertPositions).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should always set type: "memory" on inserted position', async () => {
    setupAdmin();

    await createPosition(validData);
    expect(mockInsertPositions).toHaveBeenCalledWith(expect.objectContaining({ type: 'memory' }));
  });

  it('should revalidate the admin positions list path on success', async () => {
    setupAdmin();

    await createPosition(validData);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/positions/memory');
  });

  // --- Transaction rollback / atomicity ---

  it('should propagate error when transaction fails (atomicity: both rows roll back)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const { db } = await import('@/lib/db');
    const originalTransaction = db.transaction;
    // Simulate commit failure
    (db as unknown as { transaction: unknown }).transaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('tx commit failed'));

    await expect(createPosition(validData)).rejects.toThrow('tx commit failed');
    expect(revalidatePath).not.toHaveBeenCalled();

    (db as unknown as { transaction: unknown }).transaction = originalTransaction;
  });

  it('should propagate error when feed_items insert throws inside tx', async () => {
    setupAdmin();
    mockInsertFeedItems.mockImplementationOnce(() => {
      throw new Error('feed_items insert failed');
    });

    await expect(createPosition(validData)).rejects.toThrow('feed_items insert failed');
    // transaction was entered
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // positions insert was attempted before the failure
    expect(mockInsertPositions).toHaveBeenCalledTimes(1);
    // revalidate must NOT be called when tx throws (simulated rollback)
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should propagate error when positions insert throws inside tx', async () => {
    setupAdmin();
    mockInsertPositions.mockImplementationOnce(() => {
      throw new Error('positions insert failed');
    });

    await expect(createPosition(validData)).rejects.toThrow('positions insert failed');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // feed_items MUST NOT be inserted if positions insert failed first
    expect(mockInsertFeedItems).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not revalidate when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createPosition(validData);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not revalidate when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createPosition({ ...validData, fen: '' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
