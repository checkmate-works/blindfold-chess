import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateChunk } from './updateChunk';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

const testChunkId = 'chk-00000000-0000-0000-0000-000000000001';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@blindfold-chess/features/chess-core', () => ({
  validateFenStructure: (fen: string) => {
    if (typeof fen !== 'string' || fen.trim().length === 0) {
      return { ok: false, error: 'FEN is empty' };
    }
    if (fen === 'invalid-fen') {
      return { ok: false, error: 'FEN must have 6 space-separated fields' };
    }
    return { ok: true };
  },
}));

vi.mock('@/lib/db', () => {
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
      update: () => ({
        set: (values: Record<string, unknown>) => {
          mockUpdateSet(values);
          return {
            where: (...args: unknown[]) => {
              mockUpdateWhere(...args);
              return Promise.resolve(undefined);
            },
          };
        },
      }),
    },
    chunks: {
      id: 'id',
      userId: 'user_id',
      representativeFen: 'representative_fen',
      title: 'title',
      deletedAt: 'deleted_at',
    },
    userRoles: { userId: 'user_id' },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

const validData = {
  representativeFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  title: 'Fianchetto',
  description: 'Bishop developed to a long diagonal',
};

function setupAdminWithExistingChunk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // 1st call: userRoles → admin; 2nd call: chunks existing check → row present
  mockSelectFromWhere
    .mockReturnValueOnce([{ role: 'admin' }])
    .mockReturnValueOnce([{ id: testChunkId }]);
}

describe('updateChunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth guard ---

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  // --- Input guards ---

  it('should return error when id is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateChunk('', validData);
    expect(result).toEqual({ error: 'Chunk ID is required' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  // --- Validation ---

  it('should return error when representative FEN is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateChunk(testChunkId, { ...validData, representativeFen: '' });
    expect(result).toEqual({ error: 'Representative FEN is required' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateChunk(testChunkId, { ...validData, title: '' });
    expect(result).toEqual({ error: 'Title is required' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  // --- Not found / soft-deleted ---

  it('should return error when chunk does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ error: 'Chunk not found' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should return error when chunk is soft-deleted (existing check filters deletedAt IS NULL)', async () => {
    // The `isNull(chunks.deletedAt)` predicate in updateChunk means a
    // soft-deleted row appears as an empty result set to the Server Action.
    // This is the regression guard for updating a logically deleted chunk.
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ error: 'Chunk not found' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // --- Success path ---

  it('should update the chunk with trimmed fields and return success', async () => {
    setupAdminWithExistingChunk();

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ success: true, id: testChunkId });
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
    expect(mockUpdateSet).toHaveBeenCalledWith({
      representativeFen: validData.representativeFen,
      title: validData.title,
      description: validData.description,
    });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('should trim whitespace from representativeFen, title, and description', async () => {
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, {
      ...validData,
      representativeFen: `  ${validData.representativeFen}  `,
      title: '  Trimmed Title  ',
      description: '  Trimmed Desc  ',
    });

    expect(mockUpdateSet).toHaveBeenCalledWith({
      representativeFen: validData.representativeFen,
      title: 'Trimmed Title',
      description: 'Trimmed Desc',
    });
  });

  it('should NOT include userId in the update set (user_id takeover regression)', async () => {
    // updateChunk must never overwrite the original author. Even though the
    // action runs under an admin session, editing a chunk preserves the
    // existing `user_id` (or NULL for orphaned rows). This guards against a
    // silent author takeover on edit.
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, validData);

    const setArgs = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArgs).not.toHaveProperty('userId');
  });

  it('should convert whitespace-only description to null', async () => {
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, { ...validData, description: '   ' });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('should pass null description directly through', async () => {
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, { ...validData, description: null });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  // --- Revalidation ---

  it('should revalidate both the list and edit paths after successful update', async () => {
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, validData);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/chunks');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/chunks/${testChunkId}/edit`);
  });

  it('should not revalidate when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateChunk(testChunkId, validData);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not revalidate when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateChunk(testChunkId, { ...validData, representativeFen: '' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not revalidate when chunk is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await updateChunk(testChunkId, validData);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
