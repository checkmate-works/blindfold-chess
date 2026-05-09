import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockTxUpdateWhere = vi.fn();
const mockTxDeleteWhere = vi.fn();
const mockTxInsertValues = vi.fn();

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
          set: () => ({
            where: (...args: unknown[]) => mockTxUpdateWhere(...args),
          }),
        }),
        delete: () => ({
          where: (...args: unknown[]) => mockTxDeleteWhere(...args),
        }),
        insert: () => ({
          values: (...args: unknown[]) => mockTxInsertValues(...args),
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
  },
  puzzleSolutions: {
    positionId: 'position_id',
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

const VALID_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const VALID_SOLUTION = [{ san: 'Nc3', note: null }];

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_PUZZLE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('updatePuzzle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockTxUpdateWhere.mockResolvedValue(undefined);
    mockTxDeleteWhere.mockResolvedValue(undefined);
    mockTxInsertValues.mockResolvedValue(undefined);
  });

  it('returns guard error when authentication fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'New title',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns validation error when title is empty', async () => {
    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: '   ',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'Title is required' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid FEN', async () => {
    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: 'not-a-fen',
      title: 'Title',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'Invalid FEN — must be a legal chess position' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns validation error when solution is empty', async () => {
    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'Title',
      solutionMoves: [],
    });

    expect(result).toEqual({ error: 'Solution is required' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when puzzle does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updatePuzzle } = await import('./updatePuzzle');
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'Title',
      solutionMoves: VALID_SOLUTION,
    });

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
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'Title',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
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
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'Title',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
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
    const result = await updatePuzzle({
      id: TEST_PUZZLE_ID,
      fen: VALID_FEN,
      title: 'Title',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('updates the row + replaces solution_moves when caller owns it', async () => {
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
      fen: VALID_FEN,
      title: '  New title  ',
      description: '  notes  ',
      solutionMoves: VALID_SOLUTION,
    });

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockTxDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockTxInsertValues).toHaveBeenCalledTimes(1);
    expect(mockTxInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        positionId: TEST_PUZZLE_ID,
        solutionMoves: [{ san: 'Nc3', note: null }],
      })
    );
  });
});
