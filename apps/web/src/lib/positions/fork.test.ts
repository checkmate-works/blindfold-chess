import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POSITION_FORK_SOURCE_TYPES, PUZZLE_FORK_SOURCE_TYPES, validateForkSource } from './fork';

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
      sourceTypes: ['puzzle'],
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_uuid' });
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('returns not_found when no row matches the predicate (e.g. soft-deleted or wrong type)', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_B,
      sourceTypes: ['puzzle'],
    });
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('allows self-forking (source owned by the current user) so authors can derive variations of their own work', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'My Puzzle',
        type: 'puzzle',
        forksDisabledAt: null,
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_B,
      sourceTypes: ['puzzle'],
    });
    expect(result).toEqual({
      ok: true,
      source: { id: VALID_UUID_A, userId: VALID_UUID_B, title: 'My Puzzle', type: 'puzzle' },
    });
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
      sourceTypes: ['puzzle'],
    });
    expect(result).toEqual({ ok: false, reason: 'forks_disabled' });
  });

  it('returns ok with source metadata for valid non-self, non-locked sources', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Forkable Puzzle',
        type: 'puzzle',
        forksDisabledAt: null,
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_C,
      sourceTypes: ['puzzle'],
    });
    expect(result).toEqual({
      ok: true,
      source: {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Forkable Puzzle',
        type: 'puzzle',
      },
    });
  });

  it('returns the source type on the result so callers can tell a cross-type source apart', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: VALID_UUID_A,
        userId: VALID_UUID_B,
        title: 'Memory position used as a puzzle source',
        type: 'memory',
        forksDisabledAt: null,
      },
    ]);
    const result = await validateForkSource({
      forkedFromId: VALID_UUID_A,
      currentUserId: VALID_UUID_C,
      sourceTypes: PUZZLE_FORK_SOURCE_TYPES,
    });
    expect(result).toMatchObject({ ok: true, source: { type: 'memory' } });
  });
});

describe('source-type allowlists', () => {
  it('lets a puzzle be created from either a puzzle or a position-memory source', () => {
    expect(PUZZLE_FORK_SOURCE_TYPES).toEqual(['puzzle', 'memory']);
  });

  it('lets a position-memory entry be created from a position-memory source only (no reverse path)', () => {
    expect(POSITION_FORK_SOURCE_TYPES).toEqual(['memory']);
  });
});
