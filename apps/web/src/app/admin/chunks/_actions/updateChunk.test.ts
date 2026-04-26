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
    profiles: { id: 'profiles_id' },
    userRoles: { userId: 'user_id' },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const targetUserId = '00000000-1111-2222-3333-444444444444';

const validData = {
  representativeFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  title: 'Fianchetto',
  slug: 'fianchetto',
  description: 'Bishop developed to a long diagonal',
  userId: targetUserId,
};

function setupAdminWithExistingChunk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // 1st call: userRoles → admin; 2nd call: chunks existing check → row present;
  // 3rd call: profiles → user exists
  mockSelectFromWhere
    .mockReturnValueOnce([{ role: 'admin' }])
    .mockReturnValueOnce([{ id: testChunkId }])
    .mockReturnValueOnce([{ id: targetUserId }]);
}

describe('updateChunk', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('should return error when userId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateChunk(testChunkId, { ...validData, userId: '' });
    expect(result).toEqual({ error: 'User ID is required' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should return error when userId is not a valid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateChunk(testChunkId, { ...validData, userId: 'not-a-uuid' });
    expect(result).toEqual({ error: 'Invalid User ID format (expected UUID)' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should return error when userId refers to a non-existent user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    // 1st call: userRoles → admin; 2nd call: chunks existing → found; 3rd call: profiles → not found
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ id: testChunkId }])
      .mockReturnValueOnce([]);

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ error: 'User not found' });
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

  it('should update the chunk with trimmed fields including userId and return success', async () => {
    setupAdminWithExistingChunk();

    const result = await updateChunk(testChunkId, validData);
    expect(result).toEqual({ success: true, id: testChunkId });
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
    expect(mockUpdateSet).toHaveBeenCalledWith({
      representativeFen: validData.representativeFen,
      title: validData.title,
      slug: validData.slug,
      description: validData.description,
      userId: targetUserId,
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
      slug: validData.slug,
      description: 'Trimmed Desc',
      userId: targetUserId,
    });
  });

  it('should include userId in the update set (admin can reassign author)', async () => {
    setupAdminWithExistingChunk();

    await updateChunk(testChunkId, validData);

    const setArgs = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArgs).toHaveProperty('userId', targetUserId);
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
