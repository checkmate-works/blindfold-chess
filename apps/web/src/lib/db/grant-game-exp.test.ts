/**
 * Unit tests for `grantGameExp` — the AI-game Exp writer.
 *
 * Kept separate from `save-exp.test.ts` / `grant-practice-exp.test.ts` so the
 * extra daily-cap SUM read (which the other grant paths don't perform) gets a
 * tailored mock tx without disturbing their setups.
 *
 * The real `calculateGameExp` and `applyDailyCap` from `@blindfold-chess/
 * features/exp` are used (only `getLevel` / `getLevelProgress` are stubbed), so
 * these tests genuinely exercise the formula + cap clamp. The only fakes are
 * the DB tx, the level curve, and the UTC-day boundary.
 *
 * Invariants verified:
 * - `exp_events.source` is 'ai_game_result', `source_id` is the game id
 * - `menu_type` carries the engine kind; metadata records the breakdown
 * - The grant is clamped to the remaining daily budget
 * - At/over the cap the grant is 0 and `dailyCapped` is flagged
 * - Idempotent replay returns the STORED amount, `levelUp: false`, no re-upsert
 * - The partial-index predicate is passed to onConflictDoNothing
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetLevel = vi.fn();
const mockGetLevelProgress = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@blindfold-chess/features/exp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@blindfold-chess/features/exp')>();
  return {
    ...actual,
    getLevel: (...args: unknown[]) => mockGetLevel(...args),
    getLevelProgress: (...args: unknown[]) => mockGetLevelProgress(...args),
  };
});

vi.mock('drizzle-orm', () => ({
  sql: Object.assign((strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(''), {
    raw: (s: string) => s,
  }),
  and: (...args: unknown[]) => ({ __and: args }),
  eq: (a: unknown, b: unknown) => ({ __eq: [a, b] }),
  gte: (a: unknown, b: unknown) => ({ __gte: [a, b] }),
}));

vi.mock('./index', () => ({
  db: { transaction: vi.fn() },
}));

vi.mock('./period-range', () => ({
  startOfUtcDay: () => new Date('2026-05-31T00:00:00.000Z'),
}));

vi.mock('./schema', () => ({
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
}));

/**
 * Mock tx for grantGameExp. Select call sequence:
 *  1. daily-cap SUM — `select().from().where()` awaited directly (no .limit())
 *  2. (conflict only) expEvents re-SELECT — `...where().limit()`
 *  3. (conflict only) userExp re-SELECT — `...where().limit()`
 *
 * `where()` returns an object that is both awaitable (resolves to the cap rows
 * for call #1) and exposes `.limit()` (for the conflict re-selects).
 */
function createMockTx(opts: {
  earnedToday?: number;
  totalExpAfterGrant: number;
  insertedRows?: Array<{ id: string }>;
  existingEventRow?: { amount: number; metadata: Record<string, unknown> };
  existingUserExpRow?: { totalExp: number };
}) {
  const insertedRows = opts.insertedRows ?? [{ id: 'new-event-id' }];
  const capturedValues: unknown[] = [];
  const capturedOnConflictDoNothing: unknown[] = [];
  const userExpUpsert = vi.fn();

  let insertCallCount = 0;
  let selectCallCount = 0;

  const tx = {
    insert: vi.fn().mockImplementation(() => {
      insertCallCount++;
      const callNum = insertCallCount;
      return {
        values: vi.fn().mockImplementation((value: unknown) => {
          capturedValues.push(value);
          if (callNum === 1) {
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
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      const callNum = selectCallCount;
      const whereResult = {
        // Awaitable: the cap SUM (call #1) awaits where() directly.
        then: (resolve: (rows: unknown) => void) =>
          resolve(callNum === 1 ? [{ total: opts.earnedToday ?? 0 }] : []),
        // The conflict branch (calls #2/#3) chains .limit() instead.
        limit: vi.fn().mockImplementation(() => {
          if (callNum === 2) {
            return Promise.resolve(opts.existingEventRow ? [opts.existingEventRow] : []);
          }
          return Promise.resolve(opts.existingUserExpRow ? [opts.existingUserExpRow] : []);
        }),
      };
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(whereResult),
        }),
      };
    }),
    capturedValues,
    capturedOnConflictDoNothing,
    userExpUpsert,
  };

  return tx;
}

const baseParams = {
  userId: 'user-001',
  gameId: 'game-abc',
  result: 'win' as const,
  engine: { kind: 'maia' as const, rating: 2600 },
  playerMoveCount: 30,
  aidedMoveCount: 0,
};

describe('grantGameExp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      level: Math.floor(exp / 100),
      currentLevelExp: 0,
      nextLevelExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it("writes exp_events with source='ai_game_result', game id, and the breakdown metadata", async () => {
    const tx = createMockTx({ earnedToday: 0, totalExpAfterGrant: 180 });
    const { grantGameExp } = await import('./save-exp');

    // clean win vs Maia 2600 → base 120 × 1.0 × 1.5 = 180
    await grantGameExp(tx as never, baseParams);

    const value = tx.capturedValues[0] as {
      source: string;
      sourceId: string;
      menuType: string;
      amount: number;
      metadata: Record<string, unknown>;
    };
    expect(value.source).toBe('ai_game_result');
    expect(value.sourceId).toBe('game-abc');
    expect(value.menuType).toBe('maia');
    expect(value.amount).toBe(180);
    expect(value.metadata).toMatchObject({
      result: 'win',
      engine: { kind: 'maia', rating: 2600 },
      playerMoveCount: 30,
      aidedMoveCount: 0,
      difficultyBase: 120,
      resultMultiplier: 1.0,
      purityMultiplier: 1.5,
      earnedExp: 180,
      dailyCapped: false,
    });
  });

  it('reports the granted amount and a level-up on the fresh path', async () => {
    const tx = createMockTx({ earnedToday: 0, totalExpAfterGrant: 180 });
    const { grantGameExp } = await import('./save-exp');

    const exp = await grantGameExp(tx as never, baseParams);

    // levelBefore = getLevel(180-180)=0, levelAfter = getLevel(180)=1
    expect(exp.earnedExp).toBe(180);
    expect(exp.totalExp).toBe(180);
    expect(exp.levelUp).toBe(true);
    expect(exp.level).toBe(1);
  });

  it('clamps the grant to the remaining daily budget', async () => {
    // earnedToday 480, cap 500 → only 20 of the 180 earned may be granted
    const tx = createMockTx({ earnedToday: 480, totalExpAfterGrant: 500 });
    const { grantGameExp } = await import('./save-exp');

    const exp = await grantGameExp(tx as never, baseParams);

    const value = tx.capturedValues[0] as { amount: number; metadata: Record<string, unknown> };
    expect(value.amount).toBe(20);
    expect(value.metadata).toMatchObject({ earnedExp: 180, dailyCapped: true });
    expect(exp.earnedExp).toBe(20);
  });

  it('grants nothing once the daily cap is reached', async () => {
    const tx = createMockTx({ earnedToday: 500, totalExpAfterGrant: 500 });
    const { grantGameExp } = await import('./save-exp');

    const exp = await grantGameExp(tx as never, baseParams);

    const value = tx.capturedValues[0] as { amount: number; metadata: Record<string, unknown> };
    expect(value.amount).toBe(0);
    expect(value.metadata).toMatchObject({ dailyCapped: true });
    expect(exp.earnedExp).toBe(0);
  });

  it('passes the partial-index predicate to onConflictDoNothing (regression guard)', async () => {
    const tx = createMockTx({ earnedToday: 0, totalExpAfterGrant: 180 });
    const { grantGameExp } = await import('./save-exp');

    await grantGameExp(tx as never, baseParams);

    expect(tx.capturedOnConflictDoNothing).toHaveLength(1);
    const config = tx.capturedOnConflictDoNothing[0] as { target: unknown[]; where?: unknown };
    expect(config.target).toBeDefined();
    expect(String(config.where)).toContain('source_id IS NOT NULL');
  });
});

describe('grantGameExp idempotent replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      level: Math.floor(exp / 100),
      currentLevelExp: 0,
      nextLevelExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it('returns the stored amount and does NOT re-upsert user_exp on replay', async () => {
    const tx = createMockTx({
      earnedToday: 180,
      totalExpAfterGrant: 9999, // only touched on a fresh insert
      insertedRows: [], // force conflict
      existingEventRow: { amount: 180, metadata: { earnedExp: 180 } },
      existingUserExpRow: { totalExp: 180 },
    });
    const { grantGameExp } = await import('./save-exp');

    const exp = await grantGameExp(tx as never, baseParams);

    expect(tx.insert).toHaveBeenCalledTimes(1); // expEvents only, no user_exp upsert
    expect(tx.userExpUpsert).not.toHaveBeenCalled();
    expect(exp.earnedExp).toBe(180); // stored, not recomputed
    expect(exp.totalExp).toBe(180);
    expect(exp.levelUp).toBe(false); // MUST be false on replay
  });
});
