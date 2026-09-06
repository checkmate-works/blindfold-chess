/**
 * Unit tests for `grantPracticeExp` — the free-play practice EXP writer
 * introduced alongside the position-memory EXP feature.
 *
 * Kept separate from the challenge-flow suite so `calculatePracticeExp` and
 * `getModuleWeight` can be stubbed without disturbing its setup. The
 * scaffolding both suites need -- the tx double, the schema and operator
 * stubs, `buildExpInfo` over the mocked level curve -- comes from
 * `__test-support__/exp-tx-mock`.
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
  buildExpInfo: buildExpInfoWith(
    (exp) => mockGetLevel(exp) as number,
    (exp) => mockGetLevelProgress(exp) as { progress: number }
  ),
}));

vi.mock('drizzle-orm', () => drizzleOperatorMocks());

vi.mock('./index', () => expDbMock());

vi.mock('./schema', () => expSchemaMock());

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
    const tx = createExpMockTx({ totalExpAfterGrant: 75 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 75 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 75 });
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
    const tx = createExpMockTx({ totalExpAfterGrant: 120 });
    const { grantPracticeExp } = await import('./save-exp');

    const result = await grantPracticeExp(tx as never, baseParams);

    // levelBefore = getLevel(120 - 60) = getLevel(60) = 0
    // levelAfter  = getLevel(120) = 1
    expect(result.expInfo.levelUp).toBe(true);
    expect(result.expInfo.level).toBe(1);
  });

  it('passes the partial-index predicate to onConflictDoNothing (regression guard)', async () => {
    const tx = createExpMockTx({ totalExpAfterGrant: 75 });
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
    const tx = createExpMockTx({
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
    const tx = createExpMockTx({
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
