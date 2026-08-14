/**
 * Unit tests for `grantPracticeExp` — the free-play practice EXP writer
 * introduced alongside the position-memory EXP feature.
 *
 * These tests mirror the mocking strategy used by `save-exp.test.ts`
 * (`grantChallengeExp`) but are kept in a separate file so we can install
 * dedicated mocks for `calculatePracticeExp` and `getModuleWeight` without
 * interfering with the existing challenge-flow test setup.
 *
 * Invariants verified:
 * - Calculator is called with `getModuleWeight(menuType)`
 * - `exp_events.source` is 'practice_result' (per spec)
 * - A UUID `source_id` is generated per call
 * - Metadata shape includes correctCount / mistakes / baseExp / accuracyMultiplier
 * - Fresh-insert path returns the calculated grant amount
 * - Idempotent-replay path returns the STORED amount, `levelUp: false`, and
 *   does NOT re-upsert `user_exp` (matches challenge behavior)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockCalculatePracticeExp = vi.fn();
const mockGetModuleWeight = vi.fn();
const mockGetLevel = vi.fn();
const mockGetLevelProgress = vi.fn();

vi.mock('@blindfold-chess/features/exp', () => ({
  // Challenge-path imports kept as no-op stubs so the real module can load.
  calculateExp: vi.fn(),
  calculatePracticeExp: (...args: unknown[]) => mockCalculatePracticeExp(...args),
  getModuleWeight: (...args: unknown[]) => mockGetModuleWeight(...args),
  getLevel: (...args: unknown[]) => mockGetLevel(...args),
  getLevelProgress: (...args: unknown[]) => mockGetLevelProgress(...args),
  buildExpInfo: (
    grantResult: { totalExp: number; alreadyGranted: boolean; existingAmount?: number },
    grantedAmount: number
  ) => {
    // Mirrors the real buildExpInfo but routed through the mocked level
    // functions so the tests keep controlling level-up behaviour.
    const totalExp = grantResult.totalExp;
    const level = mockGetLevel(totalExp) as number;
    const progressPercent = Math.round(
      (mockGetLevelProgress(totalExp) as { progress: number }).progress * 100
    );
    if (grantResult.alreadyGranted) {
      return {
        earnedExp: grantResult.existingAmount,
        totalExp,
        level,
        levelUp: false,
        progressPercent,
      };
    }
    const levelBefore = mockGetLevel(totalExp - grantedAmount) as number;
    return {
      earnedExp: grantedAmount,
      totalExp,
      level,
      levelUp: level > levelBefore,
      progressPercent,
    };
  },
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign((strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(''), {
    raw: (s: string) => s,
  }),
  and: (...args: unknown[]) => ({ __and: args }),
  eq: (a: unknown, b: unknown) => ({ __eq: [a, b] }),
}));

vi.mock('./index', () => ({
  db: { transaction: vi.fn() },
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

// Stable UUID so we can assert on source_id propagation without a real RNG.
// Must expose both the named export AND a default (node built-in module
// interop) so Vitest's mocker resolves `import { randomUUID } from 'node:crypto'`.
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  const stub = () => 'mock-uuid-0000-0000-0000-000000000000';
  return {
    ...actual,
    default: { ...actual, randomUUID: stub },
    randomUUID: stub,
  };
});

// ---------------------------------------------------------------------------
// Mock tx builder (mirrors save-exp.test.ts helper)
// ---------------------------------------------------------------------------

function createMockTx(opts: {
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
                return {
                  returning: vi.fn().mockResolvedValue(insertedRows),
                };
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
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
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
    capturedOnConflictDoNothing,
    userExpUpsert,
  };

  return tx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const baseParams = {
  userId: 'user-001',
  menuType: 'position_memory',
  correctCount: 10,
  mistakes: 0,
};

describe('grantPracticeExp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModuleWeight.mockReturnValue(5);
    mockCalculatePracticeExp.mockReturnValue({
      baseExp: 50,
      accuracyMultiplier: 1.5,
      totalExp: 75,
    });
    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      currentLevel: Math.floor(exp / 100),
      currentExp: exp % 100,
      requiredExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it('resolves the module weight via getModuleWeight and passes it to calculatePracticeExp', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 75 });
    const { grantPracticeExp } = await import('./save-exp');

    await grantPracticeExp(tx as never, baseParams);

    expect(mockGetModuleWeight).toHaveBeenCalledWith('position_memory');
    expect(mockCalculatePracticeExp).toHaveBeenCalledWith({
      correctCount: 10,
      mistakes: 0,
      weight: 5,
    });
  });

  it("writes exp_events with source='practice_result' and the expected metadata shape", async () => {
    const tx = createMockTx({ totalExpAfterGrant: 75 });
    const { grantPracticeExp } = await import('./save-exp');

    await grantPracticeExp(tx as never, baseParams);

    const expEventsValue = tx.capturedValues[0] as {
      source: string;
      sourceId: string;
      menuType: string;
      amount: number;
      metadata: Record<string, unknown>;
    };
    expect(expEventsValue.source).toBe('practice_result');
    expect(expEventsValue.menuType).toBe('position_memory');
    expect(expEventsValue.amount).toBe(75);
    expect(expEventsValue.sourceId).toBe('mock-uuid-0000-0000-0000-000000000000');
    expect(expEventsValue.metadata).toEqual({
      correctCount: 10,
      mistakes: 0,
      baseExp: 50,
      accuracyMultiplier: 1.5,
    });
  });

  it('returns the generated expEventId for grant refetch propagation', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 75 });
    const { grantPracticeExp } = await import('./save-exp');

    const result = await grantPracticeExp(tx as never, baseParams);

    expect(result.expEventId).toBe('mock-uuid-0000-0000-0000-000000000000');
    expect(result.grantedExp).toBe(75);
    expect(result.expInfo).toEqual({
      earnedExp: 75,
      totalExp: 75,
      level: 0,
      levelUp: false,
      progressPercent: 75,
    });
  });

  it('reports levelUp=true on the fresh-insert path when the grant crosses a level boundary', async () => {
    mockCalculatePracticeExp.mockReturnValue({
      baseExp: 50,
      accuracyMultiplier: 1.5,
      totalExp: 60,
    });
    const tx = createMockTx({ totalExpAfterGrant: 120 });
    const { grantPracticeExp } = await import('./save-exp');

    const result = await grantPracticeExp(tx as never, baseParams);

    // levelBefore = getLevel(120 - 60) = getLevel(60) = 0
    // levelAfter  = getLevel(120) = 1
    expect(result.expInfo.levelUp).toBe(true);
    expect(result.expInfo.level).toBe(1);
  });

  it('passes the partial-index predicate to onConflictDoNothing (regression guard)', async () => {
    const tx = createMockTx({ totalExpAfterGrant: 75 });
    const { grantPracticeExp } = await import('./save-exp');

    await grantPracticeExp(tx as never, baseParams);

    expect(tx.capturedOnConflictDoNothing).toHaveLength(1);
    const config = tx.capturedOnConflictDoNothing[0] as { target: unknown[]; where?: unknown };
    expect(config.target).toBeDefined();
    expect(String(config.where)).toContain('source_id IS NOT NULL');
  });
});

describe('grantPracticeExp idempotent replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModuleWeight.mockReturnValue(5);
    mockCalculatePracticeExp.mockReturnValue({
      baseExp: 50,
      accuracyMultiplier: 1.5,
      totalExp: 75,
    });
    mockGetLevel.mockImplementation((exp: number) => Math.floor(exp / 100));
    mockGetLevelProgress.mockImplementation((exp: number) => ({
      currentLevel: Math.floor(exp / 100),
      currentExp: exp % 100,
      requiredExp: 100,
      progress: (exp % 100) / 100,
    }));
  });

  it('returns the stored amount and does NOT re-upsert user_exp on replay', async () => {
    // Because `grantPracticeExp` generates a new UUID per call, true replay
    // only happens if the caller re-uses a known source_id — but the
    // grant-path idempotent branch is still exercised here by forcing an
    // insert conflict at the mock level. This guards the shared
    // `grantExp → alreadyGranted` branch for the practice flow specifically.
    const tx = createMockTx({
      totalExpAfterGrant: 9999, // would only be touched on a fresh insert
      insertedRows: [],
      existingEventRow: {
        amount: 75,
        metadata: {
          correctCount: 10,
          mistakes: 0,
          baseExp: 50,
          accuracyMultiplier: 1.5,
        },
      },
      existingUserExpRow: { totalExp: 75 },
    });
    const { grantPracticeExp } = await import('./save-exp');

    const result = await grantPracticeExp(tx as never, baseParams);

    expect(tx.insert).toHaveBeenCalledTimes(1); // only expEvents, no user_exp upsert
    expect(tx.userExpUpsert).not.toHaveBeenCalled();

    expect(result.grantedExp).toBe(75); // from existingEventRow, not recomputed
    expect(result.expInfo).toEqual({
      earnedExp: 75,
      totalExp: 75,
      level: 0,
      levelUp: false, // MUST be false on idempotent replay
      progressPercent: 75,
    });
  });

  it('replay locks in the originally-stored amount even if calculator output changed', async () => {
    // Simulate a historical grant recorded under a different calculation
    // (e.g. legacy 90 EXP). The replay must surface the stored 90, not the
    // current mock's 75. Guards against accidental "recompute on replay".
    const tx = createMockTx({
      totalExpAfterGrant: 0,
      insertedRows: [],
      existingEventRow: {
        amount: 90,
        metadata: {
          correctCount: 12,
          mistakes: 0,
          baseExp: 60,
          accuracyMultiplier: 1.5,
        },
      },
      existingUserExpRow: { totalExp: 180 },
    });
    const { grantPracticeExp } = await import('./save-exp');

    const result = await grantPracticeExp(tx as never, baseParams);

    expect(result.grantedExp).toBe(90);
    expect(result.expInfo.earnedExp).toBe(90);
    expect(result.expInfo.totalExp).toBe(180);
    expect(result.expInfo.levelUp).toBe(false);
  });
});
