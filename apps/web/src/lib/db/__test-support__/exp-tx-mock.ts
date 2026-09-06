import { vi } from 'vitest';

/**
 * The mock scaffolding the three EXP grant suites share.
 *
 * `grantChallengeExp`, `grantPracticeExp` and `grantGameExp` are separate
 * tests for good reasons — each installs its own calculator stubs, and the
 * game path needs the real formula plus a UTC-day boundary — but the parts
 * below are not those reasons. Each file had carried its own copy of the
 * Drizzle operator stubs, the `expEvents` / `userExp` column stubs, the
 * `buildExpInfo` re-implementation, and a `createMockTx` of seventy-odd
 * lines; `grant-practice-exp.test.ts` opened by saying it "mirrors the
 * mocking strategy used by save-exp.test.ts", which is the whole problem
 * stated as a comment.
 *
 * These stand in for the writer's collaborators, not for the writer. What
 * each suite proves about its own grant path stays in its own file.
 *
 * Call them from inside the factory -- `vi.mock('./schema', () =>
 * expSchemaMock())`, not `vi.mock('./schema', expSchemaMock)`. `vi.mock` is
 * hoisted above the imports, so handing it the binding reads it before this
 * module has been evaluated and the suite dies with `Cannot access
 * '__vi_import_0__' before initialization`. Inside an arrow the read happens
 * when the mocked module is first imported, which is long after.
 */

type ExpInfo = {
  earnedExp: number | undefined;
  totalExp: number;
  level: number;
  levelUp: boolean;
  progressPercent: number;
};

type GrantResult = { totalExp: number; alreadyGranted: boolean; existingAmount?: number };

/**
 * `drizzle-orm`'s operators as inspectable markers, so a test can assert on
 * the predicate a query was built with. `gte` is only reached by the game
 * path's daily-cap read; the others ignore it.
 */
export function drizzleOperatorMocks() {
  return {
    sql: Object.assign((strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(''), {
      raw: (s: string) => s,
    }),
    and: (...args: unknown[]) => ({ __and: args }),
    eq: (a: unknown, b: unknown) => ({ __eq: [a, b] }),
    gte: (a: unknown, b: unknown) => ({ __gte: [a, b] }),
  };
}

/** The two tables a grant writes, as column-name stubs. */
export function expSchemaMock() {
  return {
    expEvents: {
      id: 'id',
      userId: 'user_id',
      source: 'source',
      sourceId: 'source_id',
      amount: 'amount',
      metadata: 'metadata',
      createdAt: 'created_at',
    },
    userExp: { userId: 'user_id', totalExp: 'total_exp' },
  };
}

/**
 * `@/lib/db` reduced to the one thing a grant touches. The writers take their
 * `tx` as an argument, so the transaction runner is never actually invoked —
 * this exists to keep the module from opening a real connection on import.
 */
export function expDbMock() {
  return { db: { transaction: vi.fn() } };
}

/**
 * The real `buildExpInfo`, re-expressed over the suite's level stubs so a test
 * keeps deciding when a grant crosses a level.
 *
 * It is duplicated logic on purpose: routing it through the mocked curve is
 * what makes `levelUp` assertable, and running the real one would answer from
 * the production curve instead.
 */
export function buildExpInfoWith(
  getLevel: (exp: number) => number,
  getLevelProgress: (exp: number) => { progress: number }
) {
  return (grantResult: GrantResult, grantedAmount: number): ExpInfo => {
    const totalExp = grantResult.totalExp;
    const level = getLevel(totalExp);
    const progressPercent = Math.round(getLevelProgress(totalExp).progress * 100);
    if (grantResult.alreadyGranted) {
      return {
        earnedExp: grantResult.existingAmount,
        totalExp,
        level,
        levelUp: false,
        progressPercent,
      };
    }
    return {
      earnedExp: grantedAmount,
      totalExp,
      level,
      levelUp: level > getLevel(totalExp - grantedAmount),
      progressPercent,
    };
  };
}

export type ExpMockTxOptions = {
  /** What the `user_exp` upsert reports back as the new total. */
  totalExpAfterGrant: number;
  /** The game path's daily-cap SUM. Left out, the cap reads as zero earned. */
  earnedToday?: number;
  /** Rows from the `exp_events` insert's `.returning()`. Empty = conflict. */
  insertedRows?: Array<{ id: string }>;
  /** Row found by the `exp_events` re-SELECT on the conflict branch. */
  existingEventRow?: { amount: number; metadata: Record<string, unknown> };
  /** Row found by the `user_exp` re-SELECT on the conflict branch. */
  existingUserExpRow?: { totalExp: number };
};

/**
 * A `tx` double for the idempotent grant implementation.
 *
 * Inserts are ordered — `exp_events` first with
 * `onConflictDoNothing().returning()`, then the `user_exp` upsert, which the
 * conflict branch skips.
 *
 * Selects are told apart by how the caller consumes them rather than by
 * position: awaiting `where()` directly is the daily-cap SUM (only the game
 * path does this), while `where().limit()` is a conflict re-SELECT — the
 * first for `exp_events`, the second for `user_exp`. Reading the shape rather
 * than counting calls is what lets one double serve a path with the cap read
 * and two without it; the per-file copies each hard-coded their own select
 * indices, which is precisely the part that could not be shared.
 */
export function createExpMockTx(opts: ExpMockTxOptions) {
  const insertedRows = opts.insertedRows ?? [{ id: 'new-event-id' }];
  const capturedValues: unknown[] = [];
  const capturedSelects: unknown[] = [];
  const capturedOnConflictDoNothing: unknown[] = [];
  const userExpUpsert = vi.fn();

  let insertCallCount = 0;
  let limitCallCount = 0;

  return {
    insert: vi.fn().mockImplementation(() => {
      insertCallCount++;
      const isExpEventsInsert = insertCallCount === 1;

      return {
        values: vi.fn().mockImplementation((value: unknown) => {
          capturedValues.push(value);
          if (isExpEventsInsert) {
            return {
              onConflictDoNothing: vi.fn().mockImplementation((config: unknown) => {
                capturedOnConflictDoNothing.push(config);
                return { returning: vi.fn().mockResolvedValue(insertedRows) };
              }),
            };
          }
          userExpUpsert(value);
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ totalExp: opts.totalExpAfterGrant }]),
            }),
          };
        }),
      };
    }),
    select: vi.fn().mockImplementation((columns: unknown) => {
      capturedSelects.push(columns);
      const whereResult = {
        then: (resolve: (rows: unknown) => void) => resolve([{ total: opts.earnedToday ?? 0 }]),
        limit: vi.fn().mockImplementation(() => {
          limitCallCount++;
          return Promise.resolve(
            limitCallCount === 1
              ? opts.existingEventRow
                ? [opts.existingEventRow]
                : []
              : opts.existingUserExpRow
                ? [opts.existingUserExpRow]
                : []
          );
        }),
      };
      return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(whereResult) }) };
    }),
    capturedValues,
    capturedSelects,
    capturedOnConflictDoNothing,
    userExpUpsert,
    getInsertCallCount: () => insertCallCount,
  };
}
