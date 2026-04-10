import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fillDateRange, getNewUsersPerDay, getPostsPerDay } from './queries';

// --- Mocks ---

const mockListUsers = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
      },
    },
  }),
}));

/**
 * Hoisted shared state between the `vi.mock` factory (hoisted to the top of
 * the file) and the individual tests.
 *
 * - `dbResultsQueue`: per-call queue of result rows for the Drizzle chain
 *   terminal (`orderBy`). `getPostsPerDay` now issues one query per entry in
 *   `UGC_SOURCES` (topicPosts, positions, ...) via `Promise.all`. Each test
 *   enqueues one result array per source, in `UGC_SOURCES` declaration order.
 * - `whereCalls`: records the `where` predicates that each query passed in.
 *   Used to assert that soft-delete (`isNull(deletedAt)`) filters are applied
 *   to every UGC source.
 * - `selectSpy`: tracks how many times `db.select()` was invoked.
 */
const { dbResultsQueue, whereCalls, selectSpy } = vi.hoisted(() => ({
  dbResultsQueue: [] as Array<Array<{ date: string; count: number }>>,
  whereCalls: [] as unknown[][],
  selectSpy: vi.fn(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    // Tag the return values so tests can inspect what was passed to `.where()`
    // without relying on Drizzle's internal SQL AST.
    isNull: (col: unknown) => ({ __kind: 'isNull', col }),
    gte: (col: unknown, val: unknown) => ({ __kind: 'gte', col, val }),
    lte: (col: unknown, val: unknown) => ({ __kind: 'lte', col, val }),
    and: (...conds: unknown[]) => ({ __kind: 'and', conds }),
    count: () => ({ __kind: 'count' }),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        __kind: 'sql',
        strings,
        values,
        as: (alias: string) => ({ __kind: 'sql-as', alias, strings, values }),
      }),
      {
        raw: (s: string) => ({ __kind: 'sql-raw', s }),
      }
    ),
  };
});

vi.mock('@/lib/db', () => {
  const makeChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      from: vi.fn(),
      where: vi.fn(),
      groupBy: vi.fn(),
      orderBy: vi.fn(),
    };
    chain.from.mockReturnValue(chain);
    chain.where.mockImplementation((predicate: unknown) => {
      whereCalls.push([predicate]);
      return chain;
    });
    chain.groupBy.mockReturnValue(chain);
    chain.orderBy.mockImplementation(() => {
      // Dequeue the next result set. If the queue is empty, default to [].
      const next = dbResultsQueue.shift() ?? [];
      return Promise.resolve(next);
    });
    return chain;
  };

  selectSpy.mockImplementation(() => makeChain());

  return {
    db: {
      select: selectSpy,
    },
    topicPosts: {
      createdAt: { __col: 'topic_posts.created_at' },
      deletedAt: { __col: 'topic_posts.deleted_at' },
    },
    positions: {
      createdAt: { __col: 'positions.created_at' },
      deletedAt: { __col: 'positions.deleted_at' },
    },
  };
});

/** Helper: inspect the predicate recorded for a given `db.select()` invocation. */
function getWherePredicateAt(index: number): {
  __kind: 'and';
  conds: Array<{ __kind: string; col?: unknown }>;
} {
  return whereCalls[index][0] as {
    __kind: 'and';
    conds: Array<{ __kind: string; col?: unknown }>;
  };
}

// --- Tests ---

describe('fillDateRange', () => {
  it('should return a single entry for same start and end date', () => {
    const result = fillDateRange('2026-03-16', '2026-03-16', new Map());
    expect(result).toEqual([{ date: '2026-03-16', count: 0 }]);
  });

  it('should fill all dates in range with zero counts', () => {
    const result = fillDateRange('2026-03-14', '2026-03-16', new Map());
    expect(result).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should use counts from the map when available', () => {
    const counts = new Map([
      ['2026-03-14', 3],
      ['2026-03-16', 5],
    ]);
    const result = fillDateRange('2026-03-14', '2026-03-16', counts);
    expect(result).toEqual([
      { date: '2026-03-14', count: 3 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 5 },
    ]);
  });

  it('should handle month boundary crossing', () => {
    const counts = new Map([['2026-03-01', 2]]);
    const result = fillDateRange('2026-02-28', '2026-03-02', counts);
    expect(result).toEqual([
      { date: '2026-02-28', count: 0 },
      { date: '2026-03-01', count: 2 },
      { date: '2026-03-02', count: 0 },
    ]);
  });

  it('should handle leap year boundary (Feb 28 to Mar 1 in 2024)', () => {
    const result = fillDateRange('2024-02-28', '2024-03-01', new Map());
    expect(result).toEqual([
      { date: '2024-02-28', count: 0 },
      { date: '2024-02-29', count: 0 },
      { date: '2024-03-01', count: 0 },
    ]);
  });

  it('should handle non-leap year boundary (Feb 28 to Mar 1 in 2025)', () => {
    const result = fillDateRange('2025-02-28', '2025-03-01', new Map());
    expect(result).toEqual([
      { date: '2025-02-28', count: 0 },
      { date: '2025-03-01', count: 0 },
    ]);
  });

  it('should return empty array when start date is after end date', () => {
    const result = fillDateRange('2026-03-16', '2026-03-14', new Map());
    expect(result).toEqual([]);
  });

  it('should handle a long range (90 days)', () => {
    const result = fillDateRange('2026-01-01', '2026-03-31', new Map());
    expect(result).toHaveLength(90);
    expect(result[0].date).toBe('2026-01-01');
    expect(result[89].date).toBe('2026-03-31');
  });

  it('should ignore extra keys in the map outside the range', () => {
    const counts = new Map([
      ['2026-03-13', 10],
      ['2026-03-14', 2],
      ['2026-03-17', 10],
    ]);
    const result = fillDateRange('2026-03-14', '2026-03-16', counts);
    expect(result).toEqual([
      { date: '2026-03-14', count: 2 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should handle year boundary crossing (Dec to Jan)', () => {
    const counts = new Map([['2026-01-01', 5]]);
    const result = fillDateRange('2025-12-30', '2026-01-02', counts);
    expect(result).toEqual([
      { date: '2025-12-30', count: 0 },
      { date: '2025-12-31', count: 0 },
      { date: '2026-01-01', count: 5 },
      { date: '2026-01-02', count: 0 },
    ]);
  });

  it('should handle a very long range (365 days)', () => {
    const result = fillDateRange('2025-01-01', '2025-12-31', new Map());
    expect(result).toHaveLength(365);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[364].date).toBe('2025-12-31');
  });

  it('should handle a very long range in leap year (366 days)', () => {
    const result = fillDateRange('2024-01-01', '2024-12-31', new Map());
    expect(result).toHaveLength(366);
    expect(result[59].date).toBe('2024-02-29');
  });

  it('should handle large count values', () => {
    const counts = new Map([['2026-03-14', 999999]]);
    const result = fillDateRange('2026-03-14', '2026-03-14', counts);
    expect(result).toEqual([{ date: '2026-03-14', count: 999999 }]);
  });

  it('should return all dates with count=0 when countsByDate is empty', () => {
    const result = fillDateRange('2026-03-14', '2026-03-16', new Map());
    expect(result.every((d) => d.count === 0)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('should produce correct consecutive date sequence without gaps', () => {
    const result = fillDateRange('2026-03-01', '2026-03-10', new Map());
    for (let i = 1; i < result.length; i++) {
      const prevDate = new Date(`${result[i - 1].date}T00:00:00Z`);
      const currDate = new Date(`${result[i].date}T00:00:00Z`);
      const diffMs = currDate.getTime() - prevDate.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe('getNewUsersPerDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return daily counts and total for users in range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-14T10:00:00Z' },
          { created_at: '2026-03-14T15:00:00Z' },
          { created_at: '2026-03-16T08:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(3);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 2 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 1 },
    ]);
  });

  it('should exclude users outside the date range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-13T23:59:59Z' },
          { created_at: '2026-03-14T00:00:00Z' },
          { created_at: '2026-03-16T23:59:59Z' },
          { created_at: '2026-03-17T00:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(2);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 1 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 1 },
    ]);
  });

  it('should return all zeros when no users exist', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [] },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should return all zeros when users exist but none in range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-01-01T00:00:00Z' }, { created_at: '2026-01-02T00:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.every((d) => d.count === 0)).toBe(true);
  });

  it('should paginate when first page returns perPage users', async () => {
    // First page returns 1000 users (full page)
    const page1Users = Array.from({ length: 1000 }, (_, i) => ({
      created_at: `2026-03-14T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
    }));
    // Second page returns fewer users (last page)
    const page2Users = [{ created_at: '2026-03-15T10:00:00Z' }];

    mockListUsers
      .mockResolvedValueOnce({ data: { users: page1Users } })
      .mockResolvedValueOnce({ data: { users: page2Users } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(mockListUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(mockListUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
    expect(result.total).toBe(1001);
  });

  it('should handle single-day range', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T10:00:00Z' }, { created_at: '2026-03-14T20:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(2);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 2 }]);
  });

  it('should handle null data from API gracefully', async () => {
    mockListUsers.mockResolvedValueOnce({ data: null });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.length).toBe(3);
  });

  it('should include user created at exactly start boundary (T00:00:00Z)', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T00:00:00.000Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(1);
    expect(result.daily[0]).toEqual({ date: '2026-03-14', count: 1 });
  });

  it('should include user created at exactly end boundary (T23:59:59.999Z)', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-16T23:59:59.999Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(1);
    expect(result.daily[2]).toEqual({ date: '2026-03-16', count: 1 });
  });

  it('should correctly aggregate multiple users with identical timestamps', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { created_at: '2026-03-15T12:00:00Z' },
          { created_at: '2026-03-15T12:00:00Z' },
          { created_at: '2026-03-15T12:00:00Z' },
        ],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(3);
    expect(result.daily[1]).toEqual({ date: '2026-03-15', count: 3 });
  });

  it('should not paginate when first page returns fewer than perPage users', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ created_at: '2026-03-14T10:00:00Z' }],
      },
    });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
  });

  it('should stop paginating when a page returns empty users array', async () => {
    const page1Users = Array.from({ length: 1000 }, () => ({
      created_at: '2026-03-14T10:00:00Z',
    }));

    mockListUsers
      .mockResolvedValueOnce({ data: { users: page1Users } })
      .mockResolvedValueOnce({ data: { users: [] } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(1000);
  });

  it('should handle data with undefined users property', async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: undefined } });

    const result = await getNewUsersPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily.length).toBe(3);
  });
});

describe('getPostsPerDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResultsQueue.length = 0;
    whereCalls.length = 0;
  });

  /** Enqueue per-source results in `UGC_SOURCES` order (topicPosts, positions). */
  function enqueueSourceResults(...perSource: Array<Array<{ date: string; count: number }>>): void {
    for (const rows of perSource) dbResultsQueue.push(rows);
  }

  it('should return daily counts and total from a single source (topicPosts only)', async () => {
    enqueueSourceResults(
      [
        { date: '2026-03-14', count: 5 },
        { date: '2026-03-16', count: 3 },
      ],
      [] // positions: no rows
    );

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(8);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 5 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 3 },
    ]);
  });

  it('should return all zeros when no posts exist in any source', async () => {
    enqueueSourceResults([], []);

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(0);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 0 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 0 },
    ]);
  });

  it('should handle single-day range summing across sources', async () => {
    enqueueSourceResults([{ date: '2026-03-14', count: 7 }], [{ date: '2026-03-14', count: 2 }]);

    const result = await getPostsPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(9);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 9 }]);
  });

  it('should sum counts per day across topicPosts and positions', async () => {
    enqueueSourceResults(
      [
        { date: '2026-03-14', count: 10 },
        { date: '2026-03-15', count: 20 },
        { date: '2026-03-16', count: 30 },
      ],
      [
        { date: '2026-03-14', count: 1 },
        { date: '2026-03-15', count: 2 },
        { date: '2026-03-16', count: 3 },
      ]
    );

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(66);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 11 },
      { date: '2026-03-15', count: 22 },
      { date: '2026-03-16', count: 33 },
    ]);
  });

  it('should merge distinct dates from each source without collisions', async () => {
    enqueueSourceResults(
      [{ date: '2026-03-14', count: 4 }], // topicPosts
      [{ date: '2026-03-16', count: 6 }] // positions
    );

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');

    expect(result.total).toBe(10);
    expect(result.daily).toEqual([
      { date: '2026-03-14', count: 4 },
      { date: '2026-03-15', count: 0 },
      { date: '2026-03-16', count: 6 },
    ]);
  });

  it('should fill gaps between non-consecutive combined results', async () => {
    enqueueSourceResults(
      [
        { date: '2026-03-10', count: 1 },
        { date: '2026-03-14', count: 2 },
      ],
      [] // positions empty
    );

    const result = await getPostsPerDay('2026-03-10', '2026-03-14');

    expect(result.total).toBe(3);
    expect(result.daily).toHaveLength(5);
    expect(result.daily[0]).toEqual({ date: '2026-03-10', count: 1 });
    expect(result.daily[1]).toEqual({ date: '2026-03-11', count: 0 });
    expect(result.daily[2]).toEqual({ date: '2026-03-12', count: 0 });
    expect(result.daily[3]).toEqual({ date: '2026-03-13', count: 0 });
    expect(result.daily[4]).toEqual({ date: '2026-03-14', count: 2 });
  });

  it('should handle large count values summed across sources', async () => {
    enqueueSourceResults(
      [{ date: '2026-03-14', count: 100000 }],
      [{ date: '2026-03-14', count: 50000 }]
    );

    const result = await getPostsPerDay('2026-03-14', '2026-03-14');

    expect(result.total).toBe(150000);
    expect(result.daily).toEqual([{ date: '2026-03-14', count: 150000 }]);
  });

  it('should return correct daily length for long range with sparse data', async () => {
    enqueueSourceResults([{ date: '2026-01-15', count: 3 }], []);

    const result = await getPostsPerDay('2026-01-01', '2026-03-31');

    expect(result.total).toBe(3);
    expect(result.daily).toHaveLength(90);
    const jan15 = result.daily.find((d) => d.date === '2026-01-15');
    expect(jan15?.count).toBe(3);
    expect(result.daily.filter((d) => d.count === 0)).toHaveLength(89);
  });

  it('should issue one db.select() per UGC source in parallel', async () => {
    enqueueSourceResults([], []);

    await getPostsPerDay('2026-03-14', '2026-03-16');

    // One query for topicPosts, one for positions.
    expect(selectSpy).toHaveBeenCalledTimes(2);
  });

  it('should apply an isNull(deletedAt) filter to every UGC source', async () => {
    enqueueSourceResults([], []);

    await getPostsPerDay('2026-03-14', '2026-03-16');

    // Two `where` calls — one per source — each with an `and(...)` predicate
    // that must include an `isNull` conjunct.
    expect(whereCalls).toHaveLength(2);

    for (let i = 0; i < 2; i++) {
      const predicate = getWherePredicateAt(i);
      expect(predicate.__kind).toBe('and');
      const hasIsNull = predicate.conds.some((c) => c.__kind === 'isNull');
      expect(hasIsNull).toBe(true);
    }
  });

  it('should have total equal to the sum of daily counts', async () => {
    enqueueSourceResults(
      [
        { date: '2026-03-14', count: 2 },
        { date: '2026-03-15', count: 4 },
      ],
      [
        { date: '2026-03-14', count: 1 },
        { date: '2026-03-16', count: 7 },
      ]
    );

    const result = await getPostsPerDay('2026-03-14', '2026-03-16');
    const sum = result.daily.reduce((acc, d) => acc + d.count, 0);
    expect(result.total).toBe(sum);
    expect(result.total).toBe(14);
  });
});
