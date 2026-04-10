import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockCalculateExp = vi.fn();
const mockGetLevel = vi.fn();
const mockGetLevelProgress = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@blindfold-chess/features/exp', () => ({
  calculateExp: (...args: unknown[]) => mockCalculateExp(...args),
  getLevel: (...args: unknown[]) => mockGetLevel(...args),
  getLevelProgress: (...args: unknown[]) => mockGetLevelProgress(...args),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign((strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(''), {
    raw: (s: string) => s,
  }),
  and: (...args: unknown[]) => ({ __and: args }),
  eq: (a: unknown, b: unknown) => ({ __eq: [a, b] }),
}));

vi.mock('./index', () => ({
  db: {
    transaction: vi.fn(),
  },
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock tx object that simulates Drizzle query chain for the
 * idempotent grantExp implementation.
 *
 * Call sequence:
 *  1. `insert(expEvents).values().onConflictDoNothing().returning()`
 *     — returns `insertedRows` (empty array = conflict / already granted)
 *  2a. If fresh insert: `insert(userExp).values().onConflictDoUpdate().returning()`
 *      — returns `[{ totalExp: totalExpAfterGrant }]`
 *  2b. If conflict: `select(expEvents).from().where().limit()` then
 *      `select(userExp).from().where().limit()`
 */
function createMockTx(opts: {
  totalExpAfterGrant: number;
  /** Rows returned by the expEvents insert's `.returning()`. Empty = conflict. */
  insertedRows?: Array<{ id: string }>;
  /** Row returned by the expEvents re-SELECT in the conflict branch. */
  existingEventRow?: { amount: number; metadata: Record<string, unknown> };
  /** Row returned by the userExp re-SELECT in the conflict branch. */
  existingUserExpRow?: { totalExp: number };
}) {
  const insertedRows = opts.insertedRows ?? [{ id: 'new-event-id' }];
  const capturedValues: unknown[] = [];
  const capturedSelects: unknown[] = [];
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
            // First insert: expEvents with onConflictDoNothing().returning()
            return {
              onConflictDoNothing: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue(insertedRows),
              }),
            };
          }
          // Second insert: userExp (fresh insert path)
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
      selectCallCount++;
      const callNum = selectCallCount;
      capturedSelects.push(columns);
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              // callNum === 1 -> expEvents re-SELECT
              // callNum === 2 -> userExp re-SELECT
              if (callNum === 1) {
                return Promise.resolve(opts.existingEventRow ? [opts.existingEventRow] : []);
              }
              return Promise.resolve(opts.existingUserExpRow ? [opts.existingUserExpRow] : []);
            }),
          }),
        }),
      };
    }),
    capturedValues,
    capturedSelects,
    userExpUpsert,
    getInsertCallCount: () => insertCallCount,
  };

  return tx;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const baseParams = {
  userId: 'user-001',
  challengeResultId: 'result-001',
  menuType: 'coordinate_quiz',
  score: 20,
  incorrectAnswers: 5,
  timeTaken: 30,
  leaderboardKey: 'white',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('grantChallengeExp', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCalculateExp.mockReturnValue({
      baseExp: 40,
      accuracyMultiplier: 1.2,
      totalExp: 48,
    });

    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      currentLevel: Math.floor(exp / 100),
      currentExp: exp % 100,
      requiredExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it('should call calculateExp with correct parameters derived from inputs', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    expect(mockCalculateExp).toHaveBeenCalledWith({
      score: 20,
      incorrectAnswers: 5,
      menuType: 'coordinate_quiz',
    });
  });

  it('should insert into expEvents with correct values', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 48 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    // Two inserts: expEvents and userExp
    expect(tx.insert).toHaveBeenCalledTimes(2);
  });

  it('should return ExpInfo with earnedExp, totalExp, level, and levelUp', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result).toEqual({
      earnedExp: 48,
      totalExp: 200,
      level: 2, // getLevel(200) = floor(200/100) = 2
      levelUp: true, // getLevel(200)=2 > getLevel(200-48=152)=1
      progressPercent: 0, // Math.round((200 % 100) / 100 * 100) = 0
    });
  });

  it('should set levelUp to false when level does not change', async () => {
    mockCalculateExp.mockReturnValue({
      baseExp: 20,
      accuracyMultiplier: 1.0,
      totalExp: 10,
    });
    const tx = createMockTx({ totalExpAfterGrant: 250 });
    const { grantChallengeExp } = await import('./save-exp');

    // getLevel(250)=2, getLevel(240)=2 → no level up
    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result.levelUp).toBe(false);
    expect(result.level).toBe(2);
  });

  it('should write metadata without streakMultiplier (regression guard for removed streak bonus)', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    // First insert is expEvents — its values payload carries `metadata`
    const expEventsValue = tx.capturedValues[0] as { metadata: Record<string, unknown> };
    expect(expEventsValue.metadata).toBeDefined();
    expect(expEventsValue.metadata).not.toHaveProperty('streakMultiplier');
    expect(expEventsValue.metadata).not.toHaveProperty('dailyChallengeCount');
    // Positively verify the expected metadata shape — locks the contract
    expect(expEventsValue.metadata).toEqual({
      score: baseParams.score,
      incorrectAnswers: baseParams.incorrectAnswers,
      timeTaken: baseParams.timeTaken,
      leaderboardKey: baseParams.leaderboardKey,
      baseExp: 40,
      accuracyMultiplier: 1.2,
    });
  });

  it('should pass incorrectAnswers directly to calculateExp', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 100 });
    const { grantChallengeExp } = await import('./save-exp');

    const params = { ...baseParams, score: 10, incorrectAnswers: 0 };
    await grantChallengeExp(tx as never, params);

    expect(mockCalculateExp).toHaveBeenCalledWith(
      expect.objectContaining({
        incorrectAnswers: 0,
      })
    );
  });
});

describe('grantChallengeExp idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCalculateExp.mockReturnValue({
      baseExp: 40,
      accuracyMultiplier: 1.2,
      totalExp: 48,
    });

    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      currentLevel: Math.floor(exp / 100),
      currentExp: exp % 100,
      requiredExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it('first call inserts exp_events and upserts user_exp normally', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 48 });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    expect(tx.insert).toHaveBeenCalledTimes(2); // expEvents + userExp
    expect(tx.userExpUpsert).toHaveBeenCalledTimes(1);
    expect(result.earnedExp).toBe(48);
    expect(result.totalExp).toBe(48);
  });

  it('second call with same sourceId returns first grant amount and does NOT re-upsert user_exp', async () => {
    // Simulate conflict: `.returning()` yields empty array.
    // The re-SELECT finds the existing exp_event (amount 48 from the first call)
    // and the user_exp row is still at 48 (unchanged).
    const tx = createMockTx({
      totalExpAfterGrant: 9999, // would only be used if fresh upsert happened
      insertedRows: [],
      existingEventRow: {
        amount: 48,
        metadata: {
          score: baseParams.score,
          incorrectAnswers: baseParams.incorrectAnswers,
          timeTaken: baseParams.timeTaken,
          leaderboardKey: baseParams.leaderboardKey,
          baseExp: 40,
          accuracyMultiplier: 1.2,
        },
      },
      existingUserExpRow: { totalExp: 48 },
    });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    // Only one insert attempt (expEvents) — user_exp insert should NOT happen
    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(tx.userExpUpsert).not.toHaveBeenCalled();

    // Two selects: exp_events existing row + user_exp current total
    expect(tx.select).toHaveBeenCalledTimes(2);

    // ExpInfo reflects the first grant, not a doubled total, and no level up.
    expect(result).toEqual({
      earnedExp: 48, // matches first call's granted amount
      totalExp: 48, // NOT 96 — not doubled
      level: 0, // getLevel(48) = 0
      levelUp: false, // MUST be false on idempotent replay
      progressPercent: 48, // Math.round(48/100 * 100)
    });
  });

  it('idempotent replay that crosses a level boundary still reports levelUp=false', async () => {
    // Strong bug guard: construct a scenario where, IF the Coder had
    // forgotten to force `levelUp = false` on the alreadyGranted branch and
    // instead fallen through to the default `levelAfter > levelBefore` check,
    // the result WOULD have reported `levelUp = true`.
    //
    // The default `calculateExp` mock (beforeEach) returns totalExp=48.
    // So the naive computation would be:
    //   levelBefore = getLevel(110 - 48) = getLevel(62) = 0
    //   levelAfter  = getLevel(110)      = 1
    //   levelUp     = 1 > 0 = TRUE  ← bug path
    //
    // The correct forced behavior must produce `levelUp = false` regardless.
    const tx = createMockTx({
      totalExpAfterGrant: 0,
      insertedRows: [],
      existingEventRow: {
        amount: 60, // deliberately differs from mocked calculateExp.totalExp (48)
        metadata: {
          score: baseParams.score,
          incorrectAnswers: baseParams.incorrectAnswers,
          timeTaken: baseParams.timeTaken,
          leaderboardKey: baseParams.leaderboardKey,
          baseExp: 50,
          accuracyMultiplier: 1.2,
        },
      },
      existingUserExpRow: { totalExp: 110 },
    });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    // earnedExp MUST be the stored amount (60), NOT the recomputed
    // calculateExp.totalExp (48). This proves idempotent replay is
    // "store-and-return", not "recompute".
    expect(result.earnedExp).toBe(60);
    expect(result.totalExp).toBe(110);
    expect(result.level).toBe(1);
    expect(result.levelUp).toBe(false);
    expect(tx.userExpUpsert).not.toHaveBeenCalled();
  });

  it('replay returns stored amount even when calculateExp would yield a different value (older formula lock-in)', async () => {
    // Simulates: the original grant was recorded under an older formula
    // (e.g. 75 Exp), but today's `calculateExp` returns a different value
    // (48, from the default mock). The replay must surface the STORED 75,
    // not today's 48. This guards against accidental "recompute on replay".
    const tx = createMockTx({
      totalExpAfterGrant: 0,
      insertedRows: [],
      existingEventRow: {
        amount: 75,
        metadata: {
          score: baseParams.score,
          incorrectAnswers: baseParams.incorrectAnswers,
          timeTaken: baseParams.timeTaken,
          leaderboardKey: baseParams.leaderboardKey,
          baseExp: 60,
          accuracyMultiplier: 1.25,
        },
      },
      existingUserExpRow: { totalExp: 225 },
    });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result.earnedExp).toBe(75); // stored, NOT 48 from current calculateExp
    expect(result.totalExp).toBe(225);
    expect(result.level).toBe(2); // getLevel(225) = 2
    expect(result.levelUp).toBe(false);
    // progressPercent derived from returned totalExp (225), not (225 + 75):
    // getLevelProgress(225) = { progress: 0.25 } → round(25) = 25
    expect(result.progressPercent).toBe(25);
    expect(tx.userExpUpsert).not.toHaveBeenCalled();
  });
});
