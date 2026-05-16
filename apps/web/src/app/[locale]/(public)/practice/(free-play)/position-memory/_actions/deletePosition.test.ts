import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/db', () => {
  const updateChain = {
    set: () => ({
      where: (...args: unknown[]) => mockUpdateWhere(...args),
    }),
  };
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => mockSelectLimit(),
          }),
        }),
      }),
      update: () => updateChain,
      transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ update: () => updateChain }),
    },
    positions: {
      id: 'id',
      userId: 'user_id',
      type: 'type',
      deletedAt: 'deleted_at',
    },
  };
});

vi.mock('@/lib/points', () => ({
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    deletePosition: { action: 'delete_position', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_POSITION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('deletePosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('returns guard error when authentication fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when position does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

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

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

    expect(result).toEqual({ error: 'notFound' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
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

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
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

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('soft-deletes when caller owns it', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_POSITION_ID,
        userId: TEST_USER_ID,
        type: 'memory',
        deletedAt: null,
      },
    ]);

    const { deletePosition } = await import('./deletePosition');
    const result = await deletePosition(TEST_POSITION_ID, 'en');

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});
