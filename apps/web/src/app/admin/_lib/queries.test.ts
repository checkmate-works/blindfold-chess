import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fillDateRange, getKpiSummary, getNewUsersPerDay, getPostsPerDay } from './queries';

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
 * - `dbResultsQueue`: per-call queue of result rows for each Drizzle query.
 *   The chain's terminal method (`orderBy`, `groupBy`, or `where` depending
 *   on the query shape) dequeues the next entry. Each test enqueues one
 *   result array per `db.select()`/`db.selectDistinct()` call, in
 *   invocation order.
 * - `whereCalls`: records the `where` predicates each query passed in.
 * - `selectSpy` / `selectDistinctSpy`: track how many times `db.select()` /
 *   `db.selectDistinct()` were invoked.
 */
const { dbResultsQueue, whereCalls, selectSpy, selectDistinctSpy } = vi.hoisted(() => ({
  dbResultsQueue: [] as Array<unknown[]>,
  whereCalls: [] as unknown[][],
  selectSpy: vi.fn(),
  selectDistinctSpy: vi.fn(),
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
  /**
   * Builds a Drizzle-like chain where every terminal-ish method (`where`,
   * `groupBy`, `orderBy`) is thenable: if the caller awaits directly after
   * that method, the next entry in `dbResultsQueue` is resolved. If the
   * caller chains another method, the chain continues and the subsequent
   * method becomes the new thenable.
   *
   * This lets a single mock support all four query shapes used by
   * `queries.ts`:
   *   - `.from().where().groupBy().orderBy()`  (getUgcSourceCountsByDate)
   *   - `.from().where().groupBy()`            (getUgcSourceBreakdown)
   *   - `.from().where()`                      (countLikesInPeriod, selectDistinct in countActivePosters)
   */
  const makeChain = () => {
    const dequeue = () => dbResultsQueue.shift() ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      from: vi.fn(),
      where: vi.fn(),
      groupBy: vi.fn(),
      orderBy: vi.fn(),
    };
    chain.from.mockImplementation(() => chain);
    chain.where.mockImplementation((predicate: unknown) => {
      whereCalls.push([predicate]);
      return chain;
    });
    chain.groupBy.mockImplementation(() => chain);
    chain.orderBy.mockImplementation(() => chain);

    // Make the chain itself a thenable, so awaiting at any point (after
    // where / groupBy / orderBy) resolves with the next queued result.
    chain.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(dequeue()).then(onFulfilled, onRejected);

    return chain;
  };

  selectSpy.mockImplementation(() => makeChain());
  selectDistinctSpy.mockImplementation(() => makeChain());

  return {
    db: {
      select: selectSpy,
      selectDistinct: selectDistinctSpy,
    },
    topicPosts: {
      createdAt: { __col: 'topic_posts.created_at' },
      deletedAt: { __col: 'topic_posts.deleted_at' },
      userId: { __col: 'topic_posts.user_id' },
      topicType: { __col: 'topic_posts.topic_type' },
    },
    positions: {
      createdAt: { __col: 'positions.created_at' },
      deletedAt: { __col: 'positions.deleted_at' },
      userId: { __col: 'positions.user_id' },
      type: { __col: 'positions.type' },
    },
    likes: {
      createdAt: { __col: 'likes.created_at' },
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

describe('getKpiSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResultsQueue.length = 0;
    whereCalls.length = 0;
  });

  /**
   * Enqueue results for every DB query issued by `getKpiSummary`, in
   * invocation order:
   *
   *   1. countActivePosters → selectDistinct on topicPosts
   *   2. countActivePosters → selectDistinct on positions
   *   3. getUgcSourceBreakdown → select on topicPosts
   *   4. getUgcSourceBreakdown → select on positions
   *   5. countLikesInPeriod → select on likes
   */
  function enqueueKpiResults(opts: {
    activePostersTopic?: Array<{ userId: string }>;
    activePostersPosition?: Array<{ userId: string }>;
    breakdownTopic?: Array<{ key: string; count: number }>;
    breakdownPosition?: Array<{ key: string; count: number }>;
    likes?: Array<{ total: number }>;
  }): void {
    dbResultsQueue.push(opts.activePostersTopic ?? []);
    dbResultsQueue.push(opts.activePostersPosition ?? []);
    dbResultsQueue.push(opts.breakdownTopic ?? []);
    dbResultsQueue.push(opts.breakdownPosition ?? []);
    dbResultsQueue.push(opts.likes ?? [{ total: 0 }]);
  }

  it('should return the KpiSummary shape with users / ugcPosts / likes blocks', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('ugcPosts');
    expect(result).toHaveProperty('likes');
    expect(result.period).toEqual({ startDate: '2026-03-14', endDate: '2026-03-16', days: 3 });
  });

  it('should compute users.avgPerDay as usersTotalInPeriod / days', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16', // 3 days
      usersTotalInPeriod: 9,
      ugcTotalInPeriod: 0,
    });

    expect(result.users.total).toBe(9);
    expect(result.users.avgPerDay).toBe(3);
  });

  it('should compute ugcPosts.avgPerDay as ugcTotalInPeriod / days', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-20', // 7 days
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 14,
    });

    expect(result.ugcPosts.total).toBe(14);
    expect(result.ugcPosts.avgPerDay).toBe(2);
  });

  it('should compute ugcPosts.avgPerActivePoster as ugcTotalInPeriod / activePosters', async () => {
    enqueueKpiResults({
      activePostersTopic: [{ userId: 'u1' }, { userId: 'u2' }],
      activePostersPosition: [{ userId: 'u3' }],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 12,
    });

    expect(result.ugcPosts.activePosters).toBe(3);
    expect(result.ugcPosts.avgPerActivePoster).toBe(4);
  });

  it('should return avgPerActivePoster = 0 when there are no active posters', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 5,
    });

    expect(result.ugcPosts.activePosters).toBe(0);
    expect(result.ugcPosts.avgPerActivePoster).toBe(0);
  });

  it('should deduplicate a user who posted in BOTH topic_posts and positions', async () => {
    enqueueKpiResults({
      activePostersTopic: [{ userId: 'shared-user' }],
      activePostersPosition: [{ userId: 'shared-user' }],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 2,
    });

    // Union via Set → 1 unique user.
    expect(result.ugcPosts.activePosters).toBe(1);
    expect(result.ugcPosts.avgPerActivePoster).toBe(2);
  });

  it('should count two distinct users from different sources as 2 active posters', async () => {
    enqueueKpiResults({
      activePostersTopic: [{ userId: 'user-a' }],
      activePostersPosition: [{ userId: 'user-b' }],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 10,
    });

    expect(result.ugcPosts.activePosters).toBe(2);
    expect(result.ugcPosts.avgPerActivePoster).toBe(5);
  });

  it('should treat the same user appearing twice in one source as a single poster', async () => {
    // `selectDistinct` in production would already return a single row, but
    // the mock is agnostic; if duplicates slip through, the Set must still
    // collapse them to 1.
    enqueueKpiResults({
      activePostersTopic: [{ userId: 'u1' }, { userId: 'u1' }],
      activePostersPosition: [],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 2,
    });

    expect(result.ugcPosts.activePosters).toBe(1);
  });

  it('should return zero active posters when both sources are empty', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.ugcPosts.activePosters).toBe(0);
  });

  it('should include a breakdown row for each (source, key) pair from both sources', async () => {
    enqueueKpiResults({
      breakdownTopic: [
        { key: 'discussion', count: 4 },
        { key: 'question', count: 2 },
      ],
      breakdownPosition: [{ key: 'opening', count: 5 }],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 11,
    });

    expect(result.ugcPosts.breakdown).toHaveLength(3);
    expect(result.ugcPosts.breakdown).toContainEqual({
      source: 'topic_posts',
      key: 'discussion',
      count: 4,
    });
    expect(result.ugcPosts.breakdown).toContainEqual({
      source: 'topic_posts',
      key: 'question',
      count: 2,
    });
    expect(result.ugcPosts.breakdown).toContainEqual({
      source: 'positions',
      key: 'opening',
      count: 5,
    });
  });

  it('should tag every breakdown row with the source that produced it', async () => {
    enqueueKpiResults({
      breakdownTopic: [{ key: 'a', count: 1 }],
      breakdownPosition: [{ key: 'b', count: 1 }],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 2,
    });

    const bySource: Record<string, string[]> = {};
    for (const row of result.ugcPosts.breakdown) {
      bySource[row.source] ??= [];
      bySource[row.source].push(row.key);
    }
    expect(bySource.topic_posts).toEqual(['a']);
    expect(bySource.positions).toEqual(['b']);
  });

  it('should return an empty breakdown array when no breakdown rows exist', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.ugcPosts.breakdown).toEqual([]);
  });

  it('should sort breakdown rows per source by key name ascending', async () => {
    // The implementation sorts within each source before flat().
    enqueueKpiResults({
      breakdownTopic: [
        { key: 'zeta', count: 1 },
        { key: 'alpha', count: 1 },
        { key: 'mu', count: 1 },
      ],
      breakdownPosition: [],
    });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 3,
    });

    const topicKeys = result.ugcPosts.breakdown
      .filter((r) => r.source === 'topic_posts')
      .map((r) => r.key);
    expect(topicKeys).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('should surface likes.total from the likes query', async () => {
    enqueueKpiResults({ likes: [{ total: 42 }] });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.likes.total).toBe(42);
  });

  it('should compute likes.avgPerDay as likes.total / days', async () => {
    enqueueKpiResults({ likes: [{ total: 30 }] });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16', // 3 days
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.likes.total).toBe(30);
    expect(result.likes.avgPerDay).toBe(10);
  });

  it('should treat an empty likes result set as 0', async () => {
    enqueueKpiResults({ likes: [] });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.likes.total).toBe(0);
    expect(result.likes.avgPerDay).toBe(0);
  });

  it('should NOT apply an isNull(deletedAt) filter to the likes query', async () => {
    enqueueKpiResults({});

    await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    // Query order:
    //   0: activePosters topicPosts (has isNull)
    //   1: activePosters positions  (has isNull)
    //   2: breakdown topicPosts     (has isNull)
    //   3: breakdown positions      (has isNull)
    //   4: likes                    (NO isNull)
    const likesPredicate = getWherePredicateAt(4);
    expect(likesPredicate.__kind).toBe('and');
    const hasIsNull = likesPredicate.conds.some((c) => c.__kind === 'isNull');
    expect(hasIsNull).toBe(false);
  });

  it('should apply an isNull(deletedAt) filter to every UGC query (active posters + breakdown)', async () => {
    enqueueKpiResults({});

    await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    // First four queries (2 active-posters + 2 breakdowns) must each include
    // an `isNull(deletedAt)` conjunct in their `and(...)` predicate.
    for (let i = 0; i < 4; i++) {
      const predicate = getWherePredicateAt(i);
      expect(predicate.__kind).toBe('and');
      const hasIsNull = predicate.conds.some((c) => c.__kind === 'isNull');
      expect(hasIsNull).toBe(true);
    }
  });

  it('should issue selectDistinct for active posters and select for breakdown + likes', async () => {
    enqueueKpiResults({});

    await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    // 2 selectDistinct calls (one per UGC source for active posters).
    expect(selectDistinctSpy).toHaveBeenCalledTimes(2);
    // 2 breakdown selects + 1 likes select = 3 select calls.
    expect(selectSpy).toHaveBeenCalledTimes(3);
  });

  it('should return all zeros (and empty breakdown) for a fully empty period', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 0,
      ugcTotalInPeriod: 0,
    });

    expect(result.users.total).toBe(0);
    expect(result.users.avgPerDay).toBe(0);
    expect(result.ugcPosts.total).toBe(0);
    expect(result.ugcPosts.avgPerDay).toBe(0);
    expect(result.ugcPosts.activePosters).toBe(0);
    expect(result.ugcPosts.avgPerActivePoster).toBe(0);
    expect(result.ugcPosts.breakdown).toEqual([]);
    expect(result.likes.total).toBe(0);
    expect(result.likes.avgPerDay).toBe(0);
  });

  it('should NOT call getNewUsersPerDay or getPostsPerDay internally (Fix 6 regression guard)', async () => {
    // Spy on the Supabase Auth listUsers — the ONLY side effect of
    // getNewUsersPerDay. If getKpiSummary were to internally delegate to
    // getNewUsersPerDay, this mock would be called.
    mockListUsers.mockClear();
    enqueueKpiResults({});

    await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      usersTotalInPeriod: 5,
      ugcTotalInPeriod: 5,
    });

    expect(mockListUsers).not.toHaveBeenCalled();

    // getPostsPerDay would issue `.orderBy()`-terminated queries per source.
    // getKpiSummary should NOT issue that shape — it issues `groupBy`
    // (breakdown), `where` (likes), and `selectDistinct` (active posters).
    // We already asserted the exact call counts above. As a stronger
    // regression guard, assert that the TOTAL number of drizzle queries is
    // exactly 5 (2 selectDistinct + 3 select), i.e. no duplicate per-day
    // aggregation queries leaked in.
    expect(selectDistinctSpy).toHaveBeenCalledTimes(2);
    expect(selectSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle a single-day period (days = 1)', async () => {
    enqueueKpiResults({ likes: [{ total: 5 }] });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-14',
      usersTotalInPeriod: 3,
      ugcTotalInPeriod: 7,
    });

    expect(result.period.days).toBe(1);
    expect(result.users.avgPerDay).toBe(3);
    expect(result.ugcPosts.avgPerDay).toBe(7);
    expect(result.likes.avgPerDay).toBe(5);
  });

  it('should handle a one-week period (days = 7)', async () => {
    enqueueKpiResults({ likes: [{ total: 14 }] });

    const result = await getKpiSummary({
      startDate: '2026-03-14',
      endDate: '2026-03-20',
      usersTotalInPeriod: 7,
      ugcTotalInPeriod: 21,
    });

    expect(result.period.days).toBe(7);
    expect(result.users.avgPerDay).toBe(1);
    expect(result.ugcPosts.avgPerDay).toBe(3);
    expect(result.likes.avgPerDay).toBe(2);
  });

  it('should handle a month-boundary-crossing period', async () => {
    enqueueKpiResults({});

    const result = await getKpiSummary({
      startDate: '2026-02-28',
      endDate: '2026-03-02',
      usersTotalInPeriod: 4,
      ugcTotalInPeriod: 0,
    });

    // 2026 is not a leap year: Feb 28, Mar 1, Mar 2 = 3 days.
    expect(result.period.days).toBe(3);
  });

  it('should return days = 0 and avgPerDay = 0 when endDate is before startDate', async () => {
    enqueueKpiResults({ likes: [{ total: 10 }] });

    const result = await getKpiSummary({
      startDate: '2026-03-16',
      endDate: '2026-03-14',
      usersTotalInPeriod: 10,
      ugcTotalInPeriod: 10,
    });

    expect(result.period.days).toBe(0);
    expect(result.users.avgPerDay).toBe(0);
    expect(result.ugcPosts.avgPerDay).toBe(0);
    expect(result.likes.avgPerDay).toBe(0);
  });
});
