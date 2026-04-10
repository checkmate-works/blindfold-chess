import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExpInfoBySource } from './get-exp-info-by-source';

// ---------------------------------------------------------------------------
// Mock setup
//
// Uses `vi.hoisted` so the shared state is initialized before the hoisted
// `vi.mock(...)` factories run. The mocked `db.select().from(table)` branches
// on sentinel table references to return either exp_events or user_exp rows.
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  const expEventsTable = { __table: 'exp_events' };
  const userExpTable = { __table: 'user_exp' };
  const state = {
    expEventRows: [] as Array<{ amount: number }>,
    userExpRows: [] as Array<{ totalExp: number }>,
    // Captured WHERE-clause args per table on each `.where(...)` call.
    capturedWhere: {
      exp_events: null as unknown,
      user_exp: null as unknown,
    },
    // Differential row provider: if set, overrides row arrays by inspecting
    // the captured WHERE expression. Receives the WHERE expression and the
    // table name; returns the rows that should be yielded by `.limit(1)`.
    rowProvider: null as null | ((tableName: string, whereExpr: unknown) => unknown[]),
  };
  return { expEventsTable, userExpTable, state };
});

vi.mock('server-only', () => ({}));

vi.mock('./index', () => {
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: (whereExpr: unknown) => {
          const tableName = (table as { __table?: string })?.__table;
          if (tableName === 'exp_events') {
            hoisted.state.capturedWhere.exp_events = whereExpr;
          } else if (tableName === 'user_exp') {
            hoisted.state.capturedWhere.user_exp = whereExpr;
          }
          return {
            limit: () => {
              if (hoisted.state.rowProvider && tableName) {
                return hoisted.state.rowProvider(tableName, whereExpr);
              }
              if (tableName === 'exp_events') return hoisted.state.expEventRows;
              if (tableName === 'user_exp') return hoisted.state.userExpRows;
              return [];
            },
          };
        },
      }),
    }),
  };
  return { db };
});

vi.mock('./schema', () => {
  // Each column access returns a distinct sentinel object that records the
  // table + column name, so the captured WHERE clause (built from eq()/and())
  // can be introspected by tests to confirm which columns are filtered on.
  const makeProxy = (sentinel: { __table: string }) =>
    new Proxy(sentinel, {
      get(target, prop) {
        if (prop === '__table') return target.__table;
        if (typeof prop === 'symbol') return (target as never)[prop];
        return { __table: target.__table, __column: String(prop) };
      },
    });
  return {
    expEvents: makeProxy(hoisted.expEventsTable),
    userExp: makeProxy(hoisted.userExpTable),
  };
});

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ __and: args }),
  eq: (column: unknown, value: unknown) => ({ __eq: { column, value } }),
}));

// ---------------------------------------------------------------------------
// Helpers for inspecting captured WHERE expressions
// ---------------------------------------------------------------------------

type EqNode = { __eq: { column: { __table: string; __column: string }; value: unknown } };
type AndNode = { __and: unknown[] };

function extractEqs(expr: unknown): EqNode[] {
  if (expr == null || typeof expr !== 'object') return [];
  if ('__eq' in (expr as object)) return [expr as EqNode];
  if ('__and' in (expr as object)) {
    return (expr as AndNode).__and.flatMap((child) => extractEqs(child));
  }
  return [];
}

function findEq(expr: unknown, table: string, column: string): EqNode | undefined {
  return extractEqs(expr).find(
    (e) => e.__eq.column?.__table === table && e.__eq.column?.__column === column
  );
}

// ---------------------------------------------------------------------------
// Shared reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  hoisted.state.expEventRows = [];
  hoisted.state.userExpRows = [];
  hoisted.state.capturedWhere.exp_events = null;
  hoisted.state.capturedWhere.user_exp = null;
  hoisted.state.rowProvider = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getExpInfoBySource', () => {
  const userId = 'user-00000000-0000-0000-0000-000000000001';
  const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
  const source = 'challenge_result';
  const sourceId = 'cr-00000000-0000-0000-0000-000000000001';

  it('returns null when no matching exp_events row is found', async () => {
    hoisted.state.expEventRows = [];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result).toBeNull();
  });

  it('returns ExpInfo with earnedExp and totalExp when event is found', async () => {
    hoisted.state.expEventRows = [{ amount: 25 }];
    hoisted.state.userExpRows = [{ totalExp: 100 }];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result).not.toBeNull();
    expect(result?.earnedExp).toBe(25);
    expect(result?.totalExp).toBe(100);
    expect(typeof result?.level).toBe('number');
    expect(typeof result?.progressPercent).toBe('number');
  });

  it('returns levelUp: false when the grant does not cross a level boundary', async () => {
    // base=100 exponent=1.5 → getLevel(150)=1, getLevel(140)=1.
    hoisted.state.expEventRows = [{ amount: 10 }];
    hoisted.state.userExpRows = [{ totalExp: 150 }];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result?.levelUp).toBe(false);
  });

  it('returns levelUp: true when the grant crosses a level boundary', async () => {
    // getLevel(100)=1, getLevel(0)=0 → grant of 100 at total 100 crosses.
    hoisted.state.expEventRows = [{ amount: 100 }];
    hoisted.state.userExpRows = [{ totalExp: 100 }];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result?.levelUp).toBe(true);
  });

  it('falls back to event.amount when user_exp row is missing', async () => {
    hoisted.state.expEventRows = [{ amount: 50 }];
    hoisted.state.userExpRows = [];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result?.earnedExp).toBe(50);
    expect(result?.totalExp).toBe(50);
  });

  it('composes WHERE clause filtering exp_events by (userId, source, sourceId) — authz guard', async () => {
    // Approach: inspect the captured WHERE expression to verify that the
    // SELECT from exp_events is bound to eq(expEvents.userId, userId),
    // eq(expEvents.source, source), and eq(expEvents.sourceId, sourceId).
    // A regression that drops the userId filter (or swaps columns) would be
    // caught here — unlike the previous "return [] and assert null" test,
    // which only verified that null propagates when the mock is empty.
    hoisted.state.expEventRows = [{ amount: 25 }];
    hoisted.state.userExpRows = [{ totalExp: 100 }];

    await getExpInfoBySource(userId, source, sourceId);

    const expEventsWhere = hoisted.state.capturedWhere.exp_events;
    const userIdEq = findEq(expEventsWhere, 'exp_events', 'userId');
    const sourceEq = findEq(expEventsWhere, 'exp_events', 'source');
    const sourceIdEq = findEq(expEventsWhere, 'exp_events', 'sourceId');

    expect(userIdEq, 'exp_events WHERE must filter by userId').toBeDefined();
    expect(userIdEq?.__eq.value).toBe(userId);

    expect(sourceEq, 'exp_events WHERE must filter by source').toBeDefined();
    expect(sourceEq?.__eq.value).toBe(source);

    expect(sourceIdEq, 'exp_events WHERE must filter by sourceId').toBeDefined();
    expect(sourceIdEq?.__eq.value).toBe(sourceId);

    // The user_exp lookup must also be filtered by userId (never unscoped).
    const userExpWhere = hoisted.state.capturedWhere.user_exp;
    const userExpUserIdEq = findEq(userExpWhere, 'user_exp', 'userId');
    expect(userExpUserIdEq, 'user_exp WHERE must filter by userId').toBeDefined();
    expect(userExpUserIdEq?.__eq.value).toBe(userId);
  });

  it('authz guard (differential): same sourceId, different userId yields null', async () => {
    // Differential mock: the row provider inspects the captured WHERE and
    // returns the stored exp_event ONLY when userId matches the owner. This
    // simulates the real DB behavior where (userId, source, sourceId) is the
    // effective lookup key. A regression that drops userId from the WHERE
    // clause would cause the provider to still match (because source +
    // sourceId would still be present), and the second call would then
    // incorrectly return data instead of null.
    const ownerId = userId;
    hoisted.state.rowProvider = (tableName, whereExpr) => {
      if (tableName === 'exp_events') {
        const uidEq = findEq(whereExpr, 'exp_events', 'userId');
        const srcEq = findEq(whereExpr, 'exp_events', 'source');
        const sidEq = findEq(whereExpr, 'exp_events', 'sourceId');
        if (
          uidEq?.__eq.value === ownerId &&
          srcEq?.__eq.value === source &&
          sidEq?.__eq.value === sourceId
        ) {
          return [{ amount: 42 }];
        }
        return [];
      }
      if (tableName === 'user_exp') {
        const uidEq = findEq(whereExpr, 'user_exp', 'userId');
        if (uidEq?.__eq.value === ownerId) return [{ totalExp: 200 }];
        return [];
      }
      return [];
    };

    const ownerResult = await getExpInfoBySource(ownerId, source, sourceId);
    const intruderResult = await getExpInfoBySource(otherUserId, source, sourceId);

    expect(ownerResult).not.toBeNull();
    expect(ownerResult?.earnedExp).toBe(42);
    expect(ownerResult?.totalExp).toBe(200);

    expect(intruderResult).toBeNull();
  });

  it('progressPercent is an integer in [0, 100]', async () => {
    // Guards against Math.round edge cases / floating point drift that could
    // produce values like 99.99999... or out-of-range results.
    hoisted.state.expEventRows = [{ amount: 1 }];
    hoisted.state.userExpRows = [{ totalExp: 99 }];

    const result = await getExpInfoBySource(userId, source, sourceId);

    expect(result?.progressPercent).toBeTypeOf('number');
    expect(Number.isInteger(result?.progressPercent)).toBe(true);
    expect(result!.progressPercent).toBeGreaterThanOrEqual(0);
    expect(result!.progressPercent).toBeLessThanOrEqual(100);
  });
});
