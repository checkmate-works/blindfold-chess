import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockTxUpdateSet = vi.fn();
const mockTxUpdateWhere = vi.fn();
const mockTxDeleteWhere = vi.fn();
const mockTxInsertValues = vi.fn();
const mockTxRevisionInsertValues = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
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
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: () => ({
          set: (values: unknown) => {
            mockTxUpdateSet(values);
            return {
              where: (...args: unknown[]) => mockTxUpdateWhere(...args),
            };
          },
        }),
        delete: () => ({
          where: (...args: unknown[]) => mockTxDeleteWhere(...args),
        }),
        insert: (table: { __tableTag?: string }) => ({
          values: (...args: unknown[]) => {
            if (table?.__tableTag === 'position_content_revisions') {
              return mockTxRevisionInsertValues(...args);
            }
            return mockTxInsertValues(...args);
          },
        }),
      };
      return fn(tx);
    },
  },
  positions: {
    id: 'id',
    userId: 'user_id',
    type: 'type',
    deletedAt: 'deleted_at',
    fen: 'fen',
    title: 'title',
    description: 'description',
  },
  positionThemes: { positionId: 'position_id' },
  positionChunks: { positionId: 'position_id' },
  positionContentRevisions: {
    __tableTag: 'position_content_revisions',
    positionId: 'position_id',
    editorId: 'editor_id',
    changes: 'changes',
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    updatePosition: { action: 'update_position', maxAttempts: 20, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Cuts the request-layer cookie chain (next/headers, billing, grants) that
// the shared position-mutation lib pulls in via its dan-promotion cookie
// refresh; the helper itself is unit-tested in
// `@/lib/ads/ads-hidden-cookie-writer.test.ts`.
vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  refreshAdsHiddenCookieOnDanPromotion: vi.fn(),
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_POSITION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('updatePosition', () => {
  // Warm the heavy server-action module graph once, before any test's
  // `beforeEach` runs. Each test dynamically `await import('./updatePosition')`,
  // and the first cold import pulls in the whole `user-position-mutations`
  // dependency tree (notifications, points, rank-grant-flow, tag writes, …).
  // Under full-suite parallel load that cold import can exceed the default 5s
  // test timeout: the first test is marked timed-out while its async body keeps
  // running, then — after the next test's `beforeEach` reset the auth mock back
  // to a signed-in user — falls through to the `db.select()` spy, polluting the
  // following test's `not.toHaveBeenCalled()` assertion. Warming here keeps the
  // per-test imports cache hits so no individual test pays that cost.
  beforeAll(async () => {
    await import('./updatePosition');
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockTxUpdateWhere.mockResolvedValue(undefined);
  });

  it('returns guard error when authentication fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'New title',
    });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid FEN', async () => {
    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: 'not-a-fen',
      title: 'Title',
    });

    expect(result).toEqual({ error: 'Invalid FEN — must be a legal chess position' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when position does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'Title',
    });

    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when position is not type=memory', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: TEST_USER_ID,
        type: 'puzzle',
        deletedAt: null,
      },
    ]);

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'Title',
    });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when user is not the owner', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: OTHER_USER_ID,
        type: 'memory',
        deletedAt: null,
      },
    ]);

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'Title',
    });

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when position is soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: TEST_USER_ID,
        type: 'memory',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'Title',
    });

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('updates the row when caller owns it', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: TEST_USER_ID,
        type: 'memory',
        deletedAt: null,
      },
    ]);

    const { updatePosition } = await import('./updatePosition');
    const result = await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: '  New title  ',
      description: '  notes  ',
    });

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('coerces empty description to null', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: TEST_USER_ID,
        type: 'memory',
        deletedAt: null,
      },
    ]);

    const { updatePosition } = await import('./updatePosition');
    await updatePosition({
      id: TEST_POSITION_ID,
      fen: VALID_FEN,
      title: 'Title',
      description: '   ',
    });

    expect(mockTxUpdateSet).toHaveBeenCalledTimes(1);
    expect(mockTxUpdateSet.mock.calls[0]![0]).toMatchObject({ description: null });
  });
});
