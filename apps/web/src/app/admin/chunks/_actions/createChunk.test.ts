import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunk } from './createChunk';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertChunks = vi.fn();

const generatedChunkId = 'chk-00000000-0000-0000-0000-000000000001';

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
  const chunksTable = { id: 'id' };

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
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (table === chunksTable) {
            mockInsertChunks(values);
          }
          return {
            returning: () =>
              mockInsertChunks.mock.results[mockInsertChunks.mock.calls.length - 1]?.value ?? [
                { id: generatedChunkId },
              ],
          };
        },
      }),
    },
    chunks: chunksTable,
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

function setupAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
  mockInsertChunks.mockReturnValue([{ id: generatedChunkId }]);
}

describe('createChunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth guard ---

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createChunk(validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await createChunk(validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  // --- Validation ---

  it('should return error when representative FEN is missing', async () => {
    setupAdmin();

    const result = await createChunk({ ...validData, representativeFen: '' });
    expect(result).toEqual({ error: 'Representative FEN is required' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  it('should return error when representative FEN is structurally invalid', async () => {
    setupAdmin();

    const result = await createChunk({ ...validData, representativeFen: 'invalid-fen' });
    expect(result).toEqual({
      error: 'Invalid FEN structure: FEN must have 6 space-separated fields',
    });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  it('should accept a kingless representative FEN (chunks are piece patterns)', async () => {
    setupAdmin();

    // This is the user-reported regression case: a kingless rook-pair
    // pattern must be accepted because chunks represent piece-coordination
    // patterns, not full legal chess positions.
    const result = await createChunk({
      ...validData,
      representativeFen: '8/4R1R1/8/8/8/8/8/8 w - - 0 1',
    });
    expect(result).toEqual({ success: true, id: generatedChunkId });
    expect(mockInsertChunks).toHaveBeenCalledWith(
      expect.objectContaining({ representativeFen: '8/4R1R1/8/8/8/8/8/8 w - - 0 1' })
    );
  });

  it('should return error when title is missing', async () => {
    setupAdmin();

    const result = await createChunk({ ...validData, title: '' });
    expect(result).toEqual({ error: 'Title is required' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  it('should return error when title exceeds 255 characters', async () => {
    setupAdmin();

    const result = await createChunk({
      ...validData,
      title: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'Title must be 255 characters or fewer' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  it('should return error when description exceeds 5000 characters', async () => {
    setupAdmin();

    const result = await createChunk({
      ...validData,
      description: 'a'.repeat(5001),
    });
    expect(result).toEqual({ error: 'Description must be 5000 characters or fewer' });
    expect(mockInsertChunks).not.toHaveBeenCalled();
  });

  // --- Success path ---

  it('should insert chunk with admin userId as author', async () => {
    setupAdmin();

    const result = await createChunk(validData);
    expect(result).toEqual({ success: true, id: generatedChunkId });
    expect(mockInsertChunks).toHaveBeenCalledWith({
      representativeFen: validData.representativeFen,
      title: validData.title,
      description: validData.description,
      userId: adminUserId,
    });
  });

  it('should trim whitespace from representativeFen, title, and description', async () => {
    setupAdmin();

    await createChunk({
      ...validData,
      representativeFen: `  ${validData.representativeFen}  `,
      title: '  Trimmed Title  ',
      description: '  Trimmed Desc  ',
    });

    expect(mockInsertChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        representativeFen: validData.representativeFen,
        title: 'Trimmed Title',
        description: 'Trimmed Desc',
      })
    );
  });

  it('should convert empty description to null', async () => {
    setupAdmin();

    await createChunk({ ...validData, description: '   ' });
    expect(mockInsertChunks).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('should pass null description directly through', async () => {
    setupAdmin();

    await createChunk({ ...validData, description: null });
    expect(mockInsertChunks).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('should revalidate the admin chunks list path on success', async () => {
    setupAdmin();

    await createChunk(validData);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/chunks');
  });

  it('should not revalidate when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createChunk(validData);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should not revalidate when validation fails', async () => {
    setupAdmin();

    await createChunk({ ...validData, representativeFen: '' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
