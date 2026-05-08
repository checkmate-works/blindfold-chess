import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
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
      set: () => ({
        where: (...args: unknown[]) => mockUpdateWhere(...args),
      }),
    }),
  },
  positions: {
    id: 'id',
    userId: 'user_id',
    type: 'type',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    updatePuzzle: { action: 'update_puzzle', maxAttempts: 20, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_PUZZLE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('updatePuzzle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('returns guard error when authentication fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: 'New title' });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns validation error when title is empty', async () => {
    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: '   ' });

    expect(result).toEqual({ error: 'Title is required' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when puzzle does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: 'Title' });

    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when position is not type=puzzle', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_PUZZLE_ID,
        userId: TEST_USER_ID,
        type: 'memory',
        deletedAt: null,
      },
    ]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: 'Title' });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when user is not the owner', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_PUZZLE_ID,
        userId: OTHER_USER_ID,
        type: 'puzzle',
        deletedAt: null,
      },
    ]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: 'Title' });

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when puzzle is soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_PUZZLE_ID,
        userId: TEST_USER_ID,
        type: 'puzzle',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({ id: TEST_PUZZLE_ID, title: 'Title' });

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('updates the row when caller owns it', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_PUZZLE_ID,
        userId: TEST_USER_ID,
        type: 'puzzle',
        deletedAt: null,
      },
    ]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      title: '  New title  ',
      description: '  notes  ',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('does not include fen in the update payload', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_PUZZLE_ID,
        userId: TEST_USER_ID,
        type: 'puzzle',
        deletedAt: null,
      },
    ]);

    let capturedSet: Record<string, unknown> | null = null;
    const dbModule = await import('@/lib/db');
    const setSpy = vi.fn((values: Record<string, unknown>) => {
      capturedSet = values;
      return { where: mockUpdateWhere };
    });
    (dbModule.db as unknown as { update: () => unknown }).update = () => ({ set: setSpy });

    const { updatePuzzle } = await import('./updatePuzzle');
    await updatePuzzle({
      id: TEST_PUZZLE_ID,
      title: 'Title',
      description: 'desc',
    });

    expect(capturedSet).not.toBeNull();
    expect(Object.keys(capturedSet!)).toEqual(['title', 'description']);
  });
});
