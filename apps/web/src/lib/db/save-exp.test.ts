import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildExpInfoWith,
  createExpMockTx,
  drizzleOperatorMocks,
  expDbMock,
  expSchemaMock,
} from '@/lib/db/__test-support__/exp-tx-mock';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockCalculateExp = vi.fn();
const mockGetLevel = vi.fn();
const mockGetLevelProgress = vi.fn();

vi.mock('@blindfold-chess/features/exp', () => ({
  calculateExp: (...args: unknown[]) => mockCalculateExp(...args),
  getLevel: (...args: unknown[]) => mockGetLevel(...args),
  getLevelProgress: (...args: unknown[]) => mockGetLevelProgress(...args),
  buildExpInfo: buildExpInfoWith(
    (exp) => mockGetLevel(exp) as number,
    (exp) => mockGetLevelProgress(exp) as { progress: number }
  ),
}));

vi.mock('drizzle-orm', () => drizzleOperatorMocks());

vi.mock('./index', () => expDbMock());

vi.mock('./schema', () => expSchemaMock());

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
    const tx = createExpMockTx({ totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    expect(mockCalculateExp).toHaveBeenCalledWith({
      score: 20,
      incorrectAnswers: 5,
      menuType: 'coordinate_quiz',
    });
  });

  it('should insert into expEvents with correct values', async () => {
    const tx = createExpMockTx({ totalExpAfterGrant: 48 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    // Two inserts: expEvents and userExp
    expect(tx.insert).toHaveBeenCalledTimes(2);
  });

  it('should return ExpInfo with earnedExp, totalExp, level, and levelUp', async () => {
    const tx = createExpMockTx({ totalExpAfterGrant: 200 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 250 });
    const { grantChallengeExp } = await import('./save-exp');

    // getLevel(250)=2, getLevel(240)=2 → no level up
    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result.levelUp).toBe(false);
    expect(result.level).toBe(2);
  });

  it('should write metadata without streakMultiplier (regression guard for removed streak bonus)', async () => {
    const tx = createExpMockTx({ totalExpAfterGrant: 200 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 100 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 48 });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    expect(tx.insert).toHaveBeenCalledTimes(2); // expEvents + userExp
    expect(tx.userExpUpsert).toHaveBeenCalledTimes(1);
    expect(result.earnedExp).toBe(48);
    expect(result.totalExp).toBe(48);
  });

  it('onConflictDoNothing is invoked with the partial index predicate (regression guard)', async () => {
    // Postgres cannot infer a partial unique index as the ON CONFLICT target
    // unless the partial predicate is repeated in the ON CONFLICT clause.
    // In drizzle-orm 0.45.x, `onConflictDoNothing({ target, where })` emits
    // `ON CONFLICT (target...) WHERE <where> DO NOTHING`, which is exactly
    // the index_predicate form Postgres needs for partial index inference.
    //
    // Dropping the `where` option raises
    //   "there is no unique or exclusion constraint matching the
    //    ON CONFLICT specification"
    // at runtime against a real DB — a failure that slipped past the
    // original mock-only tests in this file. Locking the API call shape
    // here guards against future regressions of the same class without
    // needing a real Postgres connection.
    const tx = createExpMockTx({ totalExpAfterGrant: 48 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    expect(tx.capturedOnConflictDoNothing).toHaveLength(1);
    const config = tx.capturedOnConflictDoNothing[0] as {
      target: unknown[];
      where?: unknown;
    };
    expect(config).toBeDefined();
    expect(config.target).toBeDefined();
    expect(config.where).toBeDefined();
    // The mocked `sql` tag from the drizzle-orm mock concatenates template
    // strings into a plain string, so we can assert the predicate text.
    expect(String(config.where)).toContain('source_id IS NOT NULL');
  });

  it('second call with same sourceId returns first grant amount and does NOT re-upsert user_exp', async () => {
    // Simulate conflict: `.returning()` yields empty array.
    // The re-SELECT finds the existing exp_event (amount 48 from the first call)
    // and the user_exp row is still at 48 (unchanged).
    const tx = createExpMockTx({
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
    const tx = createExpMockTx({
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
    const tx = createExpMockTx({
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
