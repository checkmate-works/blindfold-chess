import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateForkSource } from './fork';

const mockLimit = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockLimit(),
        }),
      }),
    }),
  },
  positions: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    type: 'type',
    deletedAt: 'deleted_at',
    forksDisabledAt: 'forks_disabled_at',
  },
}));

const VALID_UUID_A = '11111111-1111-1111-1111-111111111111';
const VALID_UUID_B = '22222222-2222-2222-2222-222222222222';
const VALID_UUID_C = '33333333-3333-3333-3333-333333333333';

describe('validateForkSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-uuid forkedFromId before querying the database', async () => {
    const result = await validateForkSource({
      forkedFromId: 'not-a-uuid',
      currentUserId: VALID_UUID_A,
      type: 'puzzle',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_uuid' });
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('returns not_found when no row matches the predicate (e.g. soft-deleted or wrong type)', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_B,
      type: 'puzzle',
    });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns self_fork when the source row is owned by the current user', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'My Puzzle',
        forksDisabledAt: null,
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_B,
      type: 'puzzle',
    });
    expect(result).toEqual({ ok: false, reason: 'self_fork' });
  });

  it('returns forks_disabled when forks_disabled_at is set, even on a non-owned row', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Locked Puzzle',
        forksDisabledAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_C,
      type: 'puzzle',
    });
    expect(result).toEqual({ ok: false, reason: 'forks_disabled' });
  });

  it('returns ok with source metadata for valid non-self, non-locked sources', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Forkable Puzzle',
        forksDisabledAt: null,
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_C,
      type: 'puzzle',
    });
    expect(result).toEqual({
      ok: true,
      source: {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Forkable Puzzle',
      },
    });
  });
});
