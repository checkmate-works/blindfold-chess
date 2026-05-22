import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
const mockTxUpdateWhere = vi.fn();
const mockFindChunkBySlug = vi.fn();
const mockGrantPointsForPost = vi.fn();
const mockClawbackPointsForPost = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockRevalidatePath = vi.fn();
const mockIsUniqueViolation = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/points', () => ({
  grantPointsForPost: (...args: unknown[]) => mockGrantPointsForPost(...args),
  clawbackPointsForPost: (...args: unknown[]) => mockClawbackPointsForPost(...args),
}));

vi.mock('@/lib/db/extract-pg-error-code', () => ({
  isUniqueViolation: (err: unknown) => mockIsUniqueViolation(err),
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

vi.mock('./queries', () => ({
  findChunkBySlug: (slug: string) => mockFindChunkBySlug(slug),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: (...args: unknown[]) => mockUpdateWhere({ values, where: args }),
      }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: () => ({
          values: (values: unknown) => {
            mockInsertValues(values);
            return { returning: () => mockInsertReturning() };
          },
        }),
        update: () => ({
          set: (values: unknown) => ({
            where: (...args: unknown[]) => mockTxUpdateWhere({ values, where: args }),
          }),
        }),
      };
      return fn(tx);
    },
  },
  chunks: {
    id: 'id',
    userId: 'user_id',
    slug: 'slug',
    title: 'title',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    createChunk: { action: 'create_chunk', maxAttempts: 10, windowMs: 3_600_000 },
    updateChunk: { action: 'update_chunk', maxAttempts: 20, windowMs: 3_600_000 },
    deleteChunk: { action: 'delete_chunk', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_CHUNK_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TEST_SLUG = 'rook-battery';

const baseCreateInput = {
  representativeFen: VALID_FEN,
  title: 'Rook Battery',
  slug: TEST_SLUG,
  description: 'Doubled rooks on an open file',
  userId: '', // ignored — server overrides with authenticated user
};

describe('createChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockFindChunkBySlug.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({ pointEventId: 'pe-1', amount: 3 });
    mockIsUniqueViolation.mockReturnValue(false);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockFindChunkBySlug).not.toHaveBeenCalled();
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('propagates rateLimited from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'rateLimited' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns validation error when FEN is empty', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, representativeFen: '' });

    expect(result).toEqual({ error: 'Representative FEN is required' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns validation error when slug is empty', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, slug: '' });

    expect(result).toEqual({ error: 'Slug is required' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns slugTaken when preflight finds an existing chunk with that slug', async () => {
    mockFindChunkBySlug.mockResolvedValue({ id: 'other', slug: TEST_SLUG, deletedAt: null });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns slugTaken even when the existing chunk is soft-deleted (DB unique includes deleted rows)', async () => {
    mockFindChunkBySlug.mockResolvedValue({
      id: 'other',
      slug: TEST_SLUG,
      deletedAt: new Date('2025-01-01'),
    });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
  });

  it('wraps a PG unique violation from INSERT as slugTaken (race window)', async () => {
    mockInsertReturning.mockRejectedValue(new Error('duplicate'));
    mockIsUniqueViolation.mockReturnValue(true);

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
  });

  it('rethrows non-unique-violation errors from INSERT', async () => {
    mockInsertReturning.mockRejectedValue(new Error('disk full'));
    mockIsUniqueViolation.mockReturnValue(false);

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await expect(createChunkEntry(baseCreateInput)).rejects.toThrow('disk full');
  });

  it('inserts with the authenticated userId (ignoring any client-supplied userId)', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({
      ...baseCreateInput,
      userId: OTHER_USER_ID, // attempt to spoof author
    });

    expect(result).toMatchObject({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
    expect(mockGrantPointsForPost).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID, // server-resolved id, not OTHER_USER_ID
      { type: 'chunk', id: TEST_CHUNK_ID }
    );
  });

  it('logs a create_chunk activity event and revalidates listing + detail paths', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry(baseCreateInput);

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      action: 'create_chunk',
      targetType: 'chunk',
      targetId: TEST_CHUNK_ID,
      metadata: { slug: TEST_SLUG },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/chunks');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/chunks/${TEST_SLUG}`);
  });

  it('returns the point grant amount when grantPointsForPost succeeds', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toMatchObject({
      success: true,
      pointGrant: { pointEventId: 'pe-1', amount: 3 },
    });
  });

  it('omits pointGrant when the grant was capped out (null)', async () => {
    mockGrantPointsForPost.mockResolvedValue(null);

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
  });
});

describe('updateChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when chunk id is missing', async () => {
    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry('', {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when chunk does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when caller is not the chunk owner', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: OTHER_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when chunk is soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('omits slug from the UPDATE set and overwrites userId with the authenticated user', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      slug: 'attempted-rename', // should be ignored — slug is immutable
      description: 'updated description',
      userId: 'attempted-spoof', // should be overwritten with the authenticated user
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values).not.toHaveProperty('slug');
    // userId is rewritten — but the helper trims, and the UGC layer
    // overwrites the field with `user.id` BEFORE the helper sees it, so
    // a spoofed value from the client never reaches the DB.
    expect(updateCall.values).toMatchObject({
      title: 'New title',
      description: 'updated description',
      userId: TEST_USER_ID,
    });
  });

  it('logs an update_chunk activity event and revalidates paths on success', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      action: 'update_chunk',
      targetType: 'chunk',
      targetId: TEST_CHUNK_ID,
      metadata: { slug: TEST_SLUG },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/chunks');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/chunks/${TEST_SLUG}`);
  });
});

describe('deleteChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockTxUpdateWhere.mockResolvedValue(undefined);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when chunk id is empty', async () => {
    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry('');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when chunk does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when caller is not the chunk owner', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: OTHER_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when chunk is already soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('soft-deletes the chunk and runs point clawback inside the transaction', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values).toHaveProperty('deletedAt');
    expect(mockClawbackPointsForPost).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      type: 'chunk',
      id: TEST_CHUNK_ID,
    });
  });

  it('logs a delete_chunk activity event with slug + title metadata', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    await deleteChunkEntry(TEST_CHUNK_ID);

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      action: 'delete_chunk',
      targetType: 'chunk',
      targetId: TEST_CHUNK_ID,
      metadata: { slug: TEST_SLUG, title: 'Rook Battery' },
    });
  });
});

describe('createChunkEntry — status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockFindChunkBySlug.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue(null);
    mockIsUniqueViolation.mockReturnValue(false);
  });

  it('persists an explicit status="draft" through to the INSERT', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, status: 'draft' });

    expect(result).toMatchObject({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('defaults to "published" when the caller omits status', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry(baseCreateInput);

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  });
});

describe('updateChunkEntry — published lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('returns cannotEditPublished when the chunk is already published', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'published',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ error: 'cannotEditPublished' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('accepts updates when the chunk is still a draft', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});

describe('publishChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('transitions a draft chunk with a description to published', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'Doubled rooks on an open file',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    const args = mockUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(args.values).toEqual({ status: 'published' });
    expect(mockLogActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'publish_chunk',
        metadata: expect.objectContaining({ from: 'draft', to: 'published' }),
      })
    );
  });

  it('idempotent when already published (no write, no log)', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'Doubled rooks',
        status: 'published',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
  });

  it('returns descriptionRequired when the draft has no description', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: null,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'descriptionRequired' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns descriptionRequired when the draft description is whitespace-only', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: '   \n  ',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'descriptionRequired' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects publishing for non-owners', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: OTHER_USER_ID,
        slug: TEST_SLUG,
        description: 'X',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects publishing for soft-deleted chunks', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'X',
        status: 'draft',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    expect(await publishChunkEntry(TEST_CHUNK_ID)).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });
});
