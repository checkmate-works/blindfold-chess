import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Import the function under test (after all mocks are set up)
// ---------------------------------------------------------------------------

import { getExpLeaderboard } from './getExpLeaderboard';

// ---------------------------------------------------------------------------
// Mock setup
//
// Uses `vi.hoisted` so the shared state is initialized before the hoisted
// `vi.mock(...)` factories run. The DB mock intercepts the chained Drizzle
// query builder pattern and returns controlled rows.
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  const state = {
    /** Rows returned by the all-time query (db.select().from(userExp)...) */
    allTimeRows: [] as Array<{
      userId: string;
      totalExp: number;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    }>,
    /** Rows returned by the period query (db.select().from(expEvents)...) */
    periodRows: [] as Array<{
      userId: string;
      totalExp: number;
      cumulativeTotalExp: number | null;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    }>,
    /** Track which table was queried */
    queriedTable: null as string | null,
    /** Whether the DB query should throw */
    shouldThrow: false,
  };
  return { state };
});

// Mock server-only (imported transitively)
vi.mock('server-only', () => ({}));

// Mock next/cache — unstable_cache should just call the function directly
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown, _keys?: string[], _opts?: object) => fn,
}));

// Mock @sentry/nextjs (used by handleServerActionError)
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock @blindfold-chess/features/exp — use a simplified getLevel
vi.mock('@blindfold-chess/features/exp', () => ({
  getLevel: (totalExp: number) => Math.floor(totalExp / 100),
}));

// Mock cache-tags
vi.mock('@/lib/cache-tags', () => ({
  EXP_LEADERBOARD_CACHE_TAG: 'exp-leaderboard',
}));

// Mock handleServerActionError
vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock DB — intercept the chained query builder
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => {
  // Sentinel table objects to identify which table is being queried
  const userExpTable = { __table: 'user_exp' };
  const expEventsTable = { __table: 'exp_events' };
  const profilesTable = { __table: 'profiles' };

  // Build a chainable query builder that ultimately returns mock rows
  const buildChain = (fromTable: string | null) => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    const _self = () => chain;

    chain.innerJoin = () => chain;
    chain.leftJoin = () => chain;
    chain.where = () => chain;
    chain.groupBy = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => {
      if (hoisted.state.shouldThrow) {
        throw new Error('DB connection failed');
      }
      if (fromTable === 'user_exp') {
        return Promise.resolve(hoisted.state.allTimeRows);
      }
      if (fromTable === 'exp_events') {
        return Promise.resolve(hoisted.state.periodRows);
      }
      return Promise.resolve([]);
    };

    // limit is the terminal — make the chain thenable as well
    return chain;
  };

  const db = {
    select: (_fields?: object) => ({
      from: (table: unknown) => {
        const tableName = (table as { __table?: string })?.__table ?? null;
        hoisted.state.queriedTable = tableName;
        return buildChain(tableName);
      },
    }),
  };

  return {
    db,
    userExp: userExpTable,
    expEvents: expEventsTable,
    profiles: profilesTable,
  };
});

// Mock drizzle-orm operators (used in query construction)
vi.mock('drizzle-orm', () => ({
  desc: (col: unknown) => ({ __desc: col }),
  eq: (a: unknown, b: unknown) => ({ __eq: { a, b } }),
  gte: (a: unknown, b: unknown) => ({ __gte: { a, b } }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    __sql: true,
    strings,
    values,
  }),
  sum: (col: unknown) => ({ __sum: col }),
}));

// ---------------------------------------------------------------------------
// Shared reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  hoisted.state.allTimeRows = [];
  hoisted.state.periodRows = [];
  hoisted.state.queriedTable = null;
  hoisted.state.shouldThrow = false;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getExpLeaderboard', () => {
  const mockAllTimeRows = [
    {
      userId: 'user-1',
      totalExp: 500,
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/alice.png',
    },
    {
      userId: 'user-2',
      totalExp: 300,
      username: 'bob',
      displayName: null,
      avatarUrl: null,
    },
  ];

  const mockPeriodRows = [
    {
      userId: 'user-3',
      totalExp: 120, // period EXP
      cumulativeTotalExp: 800, // cumulative EXP for level calc
      username: 'charlie',
      displayName: 'Charlie',
      avatarUrl: 'https://example.com/charlie.png',
    },
    {
      userId: 'user-4',
      totalExp: 50, // period EXP
      cumulativeTotalExp: 250, // cumulative EXP for level calc
      username: 'dave',
      displayName: 'Dave',
      avatarUrl: null,
    },
  ];

  // -----------------------------------------------------------------------
  // 1. All-time mode
  // -----------------------------------------------------------------------

  describe('all-time mode', () => {
    it('returns rows from user_exp table with correct structure', async () => {
      hoisted.state.allTimeRows = mockAllTimeRows;

      const result = await getExpLeaderboard('all-time');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        userId: 'user-1',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
        totalExp: 500,
        level: 5, // floor(500/100)
        rank: 1,
      });
      expect(result.rows[1]).toEqual({
        userId: 'user-2',
        username: 'bob',
        displayName: null,
        avatarUrl: null,
        totalExp: 300,
        level: 3, // floor(300/100)
        rank: 2,
      });
    });

    it('queries the user_exp table', async () => {
      hoisted.state.allTimeRows = mockAllTimeRows;

      await getExpLeaderboard('all-time');

      expect(hoisted.state.queriedTable).toBe('user_exp');
    });
  });

  // -----------------------------------------------------------------------
  // 2. Weekly mode
  // -----------------------------------------------------------------------

  describe('weekly mode', () => {
    it('returns rows from exp_events table with period EXP as totalExp', async () => {
      hoisted.state.periodRows = mockPeriodRows;

      const result = await getExpLeaderboard('weekly');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]!.totalExp).toBe(120);
      expect(result.rows[1]!.totalExp).toBe(50);
    });

    it('queries the exp_events table', async () => {
      hoisted.state.periodRows = mockPeriodRows;

      await getExpLeaderboard('weekly');

      expect(hoisted.state.queriedTable).toBe('exp_events');
    });

    it('assigns sequential ranks starting from 1', async () => {
      hoisted.state.periodRows = mockPeriodRows;

      const result = await getExpLeaderboard('weekly');

      expect(result.rows[0]!.rank).toBe(1);
      expect(result.rows[1]!.rank).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Monthly mode
  // -----------------------------------------------------------------------

  describe('monthly mode', () => {
    it('returns rows from exp_events table', async () => {
      hoisted.state.periodRows = mockPeriodRows;

      const result = await getExpLeaderboard('monthly');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]!.userId).toBe('user-3');
      expect(result.rows[1]!.userId).toBe('user-4');
    });

    it('queries the exp_events table', async () => {
      hoisted.state.periodRows = mockPeriodRows;

      await getExpLeaderboard('monthly');

      expect(hoisted.state.queriedTable).toBe('exp_events');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Default period
  // -----------------------------------------------------------------------

  describe('default period', () => {
    it('defaults to all-time when no argument is provided', async () => {
      hoisted.state.allTimeRows = mockAllTimeRows;

      const result = await getExpLeaderboard();

      expect(hoisted.state.queriedTable).toBe('user_exp');
      expect(result.rows).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Empty data
  // -----------------------------------------------------------------------

  describe('empty data', () => {
    it('returns empty rows for all-time when no data exists', async () => {
      hoisted.state.allTimeRows = [];

      const result = await getExpLeaderboard('all-time');

      expect(result.rows).toEqual([]);
    });

    it('returns empty rows for weekly when no data exists', async () => {
      hoisted.state.periodRows = [];

      const result = await getExpLeaderboard('weekly');

      expect(result.rows).toEqual([]);
    });

    it('returns empty rows for monthly when no data exists', async () => {
      hoisted.state.periodRows = [];

      const result = await getExpLeaderboard('monthly');

      expect(result.rows).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Level calculation
  // -----------------------------------------------------------------------

  describe('level calculation', () => {
    it('calculates level from totalExp for all-time mode', async () => {
      hoisted.state.allTimeRows = [
        {
          userId: 'user-1',
          totalExp: 350,
          username: 'alice',
          displayName: null,
          avatarUrl: null,
        },
      ];

      const result = await getExpLeaderboard('all-time');

      // getLevel mock: floor(350/100) = 3
      expect(result.rows[0]!.level).toBe(3);
    });

    it('calculates level from cumulative EXP (not period EXP) for weekly mode', async () => {
      hoisted.state.periodRows = [
        {
          userId: 'user-1',
          totalExp: 50, // period EXP — should NOT be used for level
          cumulativeTotalExp: 800, // cumulative EXP — should be used for level
          username: 'alice',
          displayName: null,
          avatarUrl: null,
        },
      ];

      const result = await getExpLeaderboard('weekly');

      // getLevel mock: floor(800/100) = 8 (uses cumulative, not period EXP)
      expect(result.rows[0]!.level).toBe(8);
      // totalExp in the result should be the period EXP
      expect(result.rows[0]!.totalExp).toBe(50);
    });

    it('calculates level from cumulative EXP (not period EXP) for monthly mode', async () => {
      hoisted.state.periodRows = [
        {
          userId: 'user-1',
          totalExp: 30,
          cumulativeTotalExp: 450,
          username: 'alice',
          displayName: null,
          avatarUrl: null,
        },
      ];

      const result = await getExpLeaderboard('monthly');

      // getLevel mock: floor(450/100) = 4
      expect(result.rows[0]!.level).toBe(4);
    });

    it('uses 0 for level when cumulativeTotalExp is null (no user_exp row)', async () => {
      hoisted.state.periodRows = [
        {
          userId: 'user-1',
          totalExp: 75,
          cumulativeTotalExp: null, // user_exp row missing (LEFT JOIN)
          username: 'alice',
          displayName: null,
          avatarUrl: null,
        },
      ];

      const result = await getExpLeaderboard('weekly');

      // getLevel mock: floor(0/100) = 0
      expect(result.rows[0]!.level).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('returns empty result when an error occurs', async () => {
      hoisted.state.shouldThrow = true;

      const result = await getExpLeaderboard('all-time');

      expect(result).toEqual({ rows: [] });
    });

    it('returns empty result when weekly query fails', async () => {
      hoisted.state.shouldThrow = true;

      const result = await getExpLeaderboard('weekly');

      expect(result).toEqual({ rows: [] });
    });

    it('returns empty result when monthly query fails', async () => {
      hoisted.state.shouldThrow = true;

      const result = await getExpLeaderboard('monthly');

      expect(result).toEqual({ rows: [] });
    });
  });
});
