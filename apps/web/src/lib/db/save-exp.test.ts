import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockCalculateExp = vi.fn();
const mockGetLevel = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@blindfold-chess/features/exp', () => ({
  calculateExp: (...args: unknown[]) => mockCalculateExp(...args),
  getLevel: (...args: unknown[]) => mockGetLevel(...args),
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ _tag: 'and', args }),
  eq: (...args: unknown[]) => ({ _tag: 'eq', args }),
  gte: (...args: unknown[]) => ({ _tag: 'gte', args }),
  sql: Object.assign((strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(''), {
    raw: (s: string) => s,
  }),
}));

vi.mock('./index', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock('./schema', () => ({
  expEvents: { userId: 'user_id', source: 'source', createdAt: 'created_at' },
  userExp: { userId: 'user_id', totalExp: 'total_exp' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock tx object that simulates Drizzle query chain.
 * - `insert().values()` for expEvents (grantExp step 1)
 * - `insert().values().onConflictDoUpdate().returning()` for userExp (grantExp step 2)
 * - `select().from().where()` for getDailyChallengeCount
 */
function createMockTx(opts: { dailyChallengeCount: number; totalExpAfterGrant: number }) {
  let insertCallCount = 0;

  return {
    insert: vi.fn().mockImplementation(() => {
      insertCallCount++;
      const callNum = insertCallCount;

      return {
        values: vi.fn().mockImplementation(() => {
          if (callNum === 1) {
            // First insert: expEvents (no return needed)
            return Promise.resolve();
          }
          // Second insert: userExp (needs onConflictDoUpdate chain)
          return {
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ totalExp: opts.totalExpAfterGrant }]),
            }),
          };
        }),
      };
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: opts.dailyChallengeCount }]),
      }),
    }),
  };
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
      streakMultiplier: 1.1,
      totalExp: 53,
    });

    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
  });

  it('should call calculateExp with correct parameters derived from inputs', async () => {
    const tx = createMockTx({ dailyChallengeCount: 2, totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    expect(mockCalculateExp).toHaveBeenCalledWith({
      score: 20,
      totalQuestions: 25, // score + incorrectAnswers
      menuType: 'coordinate_quiz',
      dailyChallengeCount: 2,
    });
  });

  it('should insert into expEvents with correct values', async () => {
    const tx = createMockTx({ dailyChallengeCount: 0, totalExpAfterGrant: 53 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    // First insert call is for expEvents
    expect(tx.insert).toHaveBeenCalledTimes(2);
  });

  it('should return ExpInfo with earnedExp, totalExp, level, and levelUp', async () => {
    const tx = createMockTx({ dailyChallengeCount: 0, totalExpAfterGrant: 200 });
    const { grantChallengeExp } = await import('./save-exp');

    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result).toEqual({
      earnedExp: 53,
      totalExp: 200,
      level: 2, // getLevel(200) = floor(200/100) = 2
      levelUp: true, // getLevel(200)=2 > getLevel(200-53=147)=1
    });
  });

  it('should set levelUp to false when level does not change', async () => {
    mockCalculateExp.mockReturnValue({
      baseExp: 20,
      accuracyMultiplier: 1.0,
      streakMultiplier: 1.0,
      totalExp: 10,
    });
    const tx = createMockTx({ dailyChallengeCount: 0, totalExpAfterGrant: 250 });
    const { grantChallengeExp } = await import('./save-exp');

    // getLevel(250)=2, getLevel(240)=2 → no level up
    const result = await grantChallengeExp(tx as never, baseParams);

    expect(result.levelUp).toBe(false);
    expect(result.level).toBe(2);
  });

  it('should compute totalQuestions as score + incorrectAnswers', async () => {
    const tx = createMockTx({ dailyChallengeCount: 0, totalExpAfterGrant: 100 });
    const { grantChallengeExp } = await import('./save-exp');

    const params = { ...baseParams, score: 10, incorrectAnswers: 0 };
    await grantChallengeExp(tx as never, params);

    expect(mockCalculateExp).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuestions: 10,
      })
    );
  });

  it('should query daily challenge count before calculating exp', async () => {
    const tx = createMockTx({ dailyChallengeCount: 5, totalExpAfterGrant: 300 });
    const { grantChallengeExp } = await import('./save-exp');

    await grantChallengeExp(tx as never, baseParams);

    // getDailyChallengeCount calls tx.select
    expect(tx.select).toHaveBeenCalled();
    // calculateExp receives dailyChallengeCount=5
    expect(mockCalculateExp).toHaveBeenCalledWith(
      expect.objectContaining({ dailyChallengeCount: 5 })
    );
  });
});
