import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the admin achievements queries module.
 *
 * Strategy: mock `@/lib/db` and `drizzle-orm` so we can assert the shape of
 * the query chain (which columns are selected, which tables are joined, which
 * ordering / limit / offset are applied) and feed back fake rows.
 *
 * This follows the pattern used by `src/app/admin/users/_lib/queries.test.ts`
 * — we cannot run Drizzle against a real Postgres in the unit-test suite, so
 * we validate the query builder is invoked with the expected operators.
 */

// --- Hoisted mock state ---------------------------------------------------

const {
  lastSelectColumns,
  lastFrom,
  lastLeftJoin,
  lastWhere,
  lastGroupBy,
  lastOrderBy,
  lastLimit,
  lastOffset,
  dbResultQueue,
} = vi.hoisted(() => ({
  lastSelectColumns: { value: undefined as unknown },
  lastFrom: { value: undefined as unknown },
  lastLeftJoin: { value: undefined as unknown[] | undefined },
  lastWhere: { value: undefined as unknown },
  lastGroupBy: { value: undefined as unknown },
  lastOrderBy: { value: undefined as unknown[] | undefined },
  lastLimit: { value: undefined as number | undefined },
  lastOffset: { value: undefined as number | undefined },
  dbResultQueue: [] as unknown[][],
}));

vi.mock('drizzle-orm', () => ({
  asc: (col: unknown) => ({ __kind: 'asc', col }),
  desc: (col: unknown) => ({ __kind: 'desc', col }),
  eq: (a: unknown, b: unknown) => ({ __kind: 'eq', a, b }),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      __kind: 'sql',
      strings: Array.from(strings),
      values,
    }),
    {
      raw: (s: string) => ({ __kind: 'sql-raw', s }),
    }
  ),
}));

vi.mock('@/lib/db', () => {
  const makeChain = () => {
    const dequeue = () => dbResultQueue.shift() ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    chain.from = vi.fn((tbl: unknown) => {
      lastFrom.value = tbl;
      return chain;
    });
    chain.leftJoin = vi.fn((tbl: unknown, on: unknown) => {
      lastLeftJoin.value = [tbl, on];
      return chain;
    });
    chain.where = vi.fn((w: unknown) => {
      lastWhere.value = w;
      return chain;
    });
    chain.groupBy = vi.fn((g: unknown) => {
      lastGroupBy.value = g;
      return chain;
    });
    chain.orderBy = vi.fn((...args: unknown[]) => {
      lastOrderBy.value = args;
      return chain;
    });
    chain.limit = vi.fn((n: number) => {
      lastLimit.value = n;
      return chain;
    });
    chain.offset = vi.fn((n: number) => {
      lastOffset.value = n;
      return chain;
    });
    chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (r: unknown) => unknown) =>
      Promise.resolve(dequeue()).then(onFulfilled, onRejected);
    return chain;
  };

  const select = vi.fn((cols?: unknown) => {
    lastSelectColumns.value = cols;
    return makeChain();
  });

  return {
    db: { select },
    achievements: {
      id: { __col: 'achievements.id' },
      slug: { __col: 'achievements.slug' },
      category: { __col: 'achievements.category' },
      iconKey: { __col: 'achievements.icon_key' },
      displayOrder: { __col: 'achievements.display_order' },
      repeatable: { __col: 'achievements.repeatable' },
      createdAt: { __col: 'achievements.created_at' },
    },
    userAchievements: {
      id: { __col: 'user_achievements.id' },
      userId: { __col: 'user_achievements.user_id' },
      achievementId: { __col: 'user_achievements.achievement_id' },
      achievedAt: { __col: 'user_achievements.achieved_at' },
      metadata: { __col: 'user_achievements.metadata' },
    },
    profiles: {
      id: { __col: 'profiles.id' },
      username: { __col: 'profiles.username' },
    },
  };
});

// --- Helpers --------------------------------------------------------------

function resetMockState() {
  lastSelectColumns.value = undefined;
  lastFrom.value = undefined;
  lastLeftJoin.value = undefined;
  lastWhere.value = undefined;
  lastGroupBy.value = undefined;
  lastOrderBy.value = undefined;
  lastLimit.value = undefined;
  lastOffset.value = undefined;
  dbResultQueue.length = 0;
}

// --- Tests ----------------------------------------------------------------

describe('listAchievementsWithHolderCount', () => {
  beforeEach(resetMockState);

  it('selects all achievement columns plus a holderCount aggregate and joins user_achievements', async () => {
    dbResultQueue.push([
      {
        id: 'ach-1',
        slug: 'first_win',
        category: 'play',
        iconKey: 'trophy',
        displayOrder: 10,
        repeatable: false,
        createdAt: new Date('2026-01-01'),
        holderCount: 5,
      },
    ]);

    const { listAchievementsWithHolderCount } = await import('./queries');
    const rows = await listAchievementsWithHolderCount({ limit: 20, offset: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'ach-1', holderCount: 5 });

    // Select columns must include every achievement master field + holderCount
    const cols = lastSelectColumns.value as Record<string, unknown>;
    expect(Object.keys(cols).sort()).toEqual(
      [
        'id',
        'slug',
        'category',
        'iconKey',
        'displayOrder',
        'repeatable',
        'createdAt',
        'holderCount',
      ].sort()
    );

    // holderCount must be produced via a count(user_achievements.id) aggregate,
    // not an inline integer, so admins see the live number.
    const holderCountExpr = cols.holderCount as { __kind?: string; strings?: string[] };
    expect(holderCountExpr.__kind).toBe('sql');
    expect(holderCountExpr.strings?.join(' ')).toMatch(/count\(/);
    expect(holderCountExpr.strings?.join(' ')).toMatch(/::int/);

    // LEFT JOIN is required (not inner) so zero-holder achievements still appear.
    const join = lastLeftJoin.value as [unknown, { __kind: string; a: unknown; b: unknown }];
    expect(join).toBeDefined();
    const [joinTable, joinOn] = join;
    expect(joinTable).toMatchObject({ id: { __col: 'user_achievements.id' } });
    expect(joinOn.__kind).toBe('eq');
    expect(joinOn.a).toEqual({ __col: 'user_achievements.achievement_id' });
    expect(joinOn.b).toEqual({ __col: 'achievements.id' });

    // groupBy must be on achievements.id (so each achievement = one row)
    expect(lastGroupBy.value).toEqual({ __col: 'achievements.id' });

    // Sort: (displayOrder ASC, slug ASC)
    const orderBy = lastOrderBy.value as Array<{ __kind: string; col: { __col: string } }>;
    expect(orderBy).toHaveLength(2);
    expect(orderBy[0]).toEqual({ __kind: 'asc', col: { __col: 'achievements.display_order' } });
    expect(orderBy[1]).toEqual({ __kind: 'asc', col: { __col: 'achievements.slug' } });

    // Pagination
    expect(lastLimit.value).toBe(20);
    expect(lastOffset.value).toBe(0);
  });

  it('returns a zero-holder achievement row unchanged (left join semantics)', async () => {
    dbResultQueue.push([
      {
        id: 'ach-empty',
        slug: 'never_won',
        category: 'play',
        iconKey: 'star',
        displayOrder: 99,
        repeatable: false,
        createdAt: new Date('2026-01-01'),
        holderCount: 0,
      },
    ]);

    const { listAchievementsWithHolderCount } = await import('./queries');
    const rows = await listAchievementsWithHolderCount({ limit: 50, offset: 0 });

    expect(rows[0].holderCount).toBe(0);
    expect(typeof rows[0].holderCount).toBe('number');
  });

  it('forwards limit and offset for pagination windows', async () => {
    dbResultQueue.push([]);
    const { listAchievementsWithHolderCount } = await import('./queries');
    await listAchievementsWithHolderCount({ limit: 7, offset: 42 });

    expect(lastLimit.value).toBe(7);
    expect(lastOffset.value).toBe(42);
  });
});

describe('countAchievements', () => {
  beforeEach(resetMockState);

  it('returns the count value from the first row', async () => {
    dbResultQueue.push([{ count: 13 }]);
    const { countAchievements } = await import('./queries');
    await expect(countAchievements()).resolves.toBe(13);

    // Must be FROM achievements
    expect(lastFrom.value).toMatchObject({ id: { __col: 'achievements.id' } });
    // The selected value must be a count(*) SQL expression
    const cols = lastSelectColumns.value as Record<string, { __kind?: string; strings?: string[] }>;
    expect(cols.count.__kind).toBe('sql');
    expect(cols.count.strings?.join(' ')).toMatch(/count\(\*\)/);
  });

  it('returns 0 when the underlying query returns no rows', async () => {
    dbResultQueue.push([]);
    const { countAchievements } = await import('./queries');
    await expect(countAchievements()).resolves.toBe(0);
  });
});

describe('getAchievementById', () => {
  beforeEach(resetMockState);

  it('returns the single row for the matching id', async () => {
    const row = {
      id: 'ach-42',
      slug: 'first_win',
      category: 'play',
      iconKey: 'trophy',
      displayOrder: 1,
      repeatable: false,
      createdAt: new Date('2026-01-01'),
    };
    dbResultQueue.push([row]);

    const { getAchievementById } = await import('./queries');
    const result = await getAchievementById('ach-42');

    expect(result).toEqual(row);
    // Must filter via eq(achievements.id, passed id)
    const where = lastWhere.value as { __kind: string; a: unknown; b: unknown };
    expect(where.__kind).toBe('eq');
    expect(where.a).toEqual({ __col: 'achievements.id' });
    expect(where.b).toBe('ach-42');
    expect(lastLimit.value).toBe(1);
  });

  it('returns null when no row matches', async () => {
    dbResultQueue.push([]);
    const { getAchievementById } = await import('./queries');
    await expect(getAchievementById('missing')).resolves.toBeNull();
  });
});

describe('listAchievementHolders', () => {
  beforeEach(resetMockState);

  it('joins profiles, filters by achievement id, sorts by achievedAt desc, respects limit/offset', async () => {
    const at1 = new Date('2026-03-01T12:00:00Z');
    const at2 = new Date('2026-03-02T12:00:00Z');
    dbResultQueue.push([
      { id: 'ua-2', userId: 'u-1', achievedAt: at2, metadata: { streak: 3 }, username: 'alice' },
      { id: 'ua-1', userId: 'u-2', achievedAt: at1, metadata: null, username: null },
    ]);

    const { listAchievementHolders } = await import('./queries');
    const rows = await listAchievementHolders('ach-1', { limit: 10, offset: 5 });

    expect(rows).toHaveLength(2);
    // Username null fallback preserved for display layer
    expect(rows[1].username).toBeNull();
    expect(rows[0]).toMatchObject({
      id: 'ua-2',
      userId: 'u-1',
      metadata: { streak: 3 },
      username: 'alice',
    });

    // Selected columns
    const cols = lastSelectColumns.value as Record<string, unknown>;
    expect(Object.keys(cols).sort()).toEqual(
      ['id', 'userId', 'achievedAt', 'metadata', 'username'].sort()
    );
    expect(cols.username).toEqual({ __col: 'profiles.username' });

    // FROM user_achievements
    expect(lastFrom.value).toMatchObject({ id: { __col: 'user_achievements.id' } });

    // LEFT JOIN profiles ON profiles.id = user_achievements.user_id
    const join = lastLeftJoin.value as [unknown, { __kind: string; a: unknown; b: unknown }];
    expect(join).toBeDefined();
    const [joinTable, joinOn] = join;
    expect(joinTable).toMatchObject({ id: { __col: 'profiles.id' } });
    expect(joinOn.__kind).toBe('eq');
    expect(joinOn.a).toEqual({ __col: 'profiles.id' });
    expect(joinOn.b).toEqual({ __col: 'user_achievements.user_id' });

    // WHERE user_achievements.achievement_id = <id>
    const where = lastWhere.value as { __kind: string; a: unknown; b: unknown };
    expect(where.__kind).toBe('eq');
    expect(where.a).toEqual({ __col: 'user_achievements.achievement_id' });
    expect(where.b).toBe('ach-1');

    // ORDER BY achievedAt DESC
    const orderBy = lastOrderBy.value as Array<{ __kind: string; col: { __col: string } }>;
    expect(orderBy).toHaveLength(1);
    expect(orderBy[0]).toEqual({
      __kind: 'desc',
      col: { __col: 'user_achievements.achieved_at' },
    });

    expect(lastLimit.value).toBe(10);
    expect(lastOffset.value).toBe(5);
  });

  it('does not dedupe repeatable-badge holders (same user appears multiple times)', async () => {
    // Repeatable achievements can legitimately have multiple user_achievements
    // rows per user; the query must NOT use SELECT DISTINCT or collapse them.
    dbResultQueue.push([
      {
        id: 'ua-3',
        userId: 'u-1',
        achievedAt: new Date('2026-03-03'),
        metadata: { month: '2026-03' },
        username: 'alice',
      },
      {
        id: 'ua-2',
        userId: 'u-1',
        achievedAt: new Date('2026-02-03'),
        metadata: { month: '2026-02' },
        username: 'alice',
      },
      {
        id: 'ua-1',
        userId: 'u-1',
        achievedAt: new Date('2026-01-03'),
        metadata: { month: '2026-01' },
        username: 'alice',
      },
    ]);

    const { listAchievementHolders } = await import('./queries');
    const rows = await listAchievementHolders('ach-monthly', { limit: 100, offset: 0 });

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.userId)).toEqual(['u-1', 'u-1', 'u-1']);
    expect(rows.map((r) => r.id)).toEqual(['ua-3', 'ua-2', 'ua-1']);
  });
});

describe('countAchievementHolders', () => {
  beforeEach(resetMockState);

  it('returns the count value (including duplicates for repeatable badges)', async () => {
    dbResultQueue.push([{ count: 12 }]);
    const { countAchievementHolders } = await import('./queries');
    await expect(countAchievementHolders('ach-monthly')).resolves.toBe(12);

    // FROM user_achievements
    expect(lastFrom.value).toMatchObject({ id: { __col: 'user_achievements.id' } });

    // WHERE on user_achievements.achievement_id (no DISTINCT or user dedup)
    const where = lastWhere.value as { __kind: string; a: unknown; b: unknown };
    expect(where.__kind).toBe('eq');
    expect(where.a).toEqual({ __col: 'user_achievements.achievement_id' });
    expect(where.b).toBe('ach-monthly');

    // count(*) — the total row count, NOT count(DISTINCT user_id)
    const cols = lastSelectColumns.value as Record<string, { __kind?: string; strings?: string[] }>;
    expect(cols.count.__kind).toBe('sql');
    expect(cols.count.strings?.join(' ')).toMatch(/count\(\*\)/);
    expect(cols.count.strings?.join(' ')).not.toMatch(/distinct/i);
  });

  it('returns 0 when the query returns no rows', async () => {
    dbResultQueue.push([]);
    const { countAchievementHolders } = await import('./queries');
    await expect(countAchievementHolders('ach-x')).resolves.toBe(0);
  });
});
