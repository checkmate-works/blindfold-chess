import { asc, desc } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { challengeAttempts, challengeBestScores, challengeResults } from '@/lib/db/schema';

import { removeChallengeResult } from './remove-result';

const mockReverseChallengeExp = vi.fn();

vi.mock('@/lib/db/save-exp', () => ({
  reverseChallengeExp: (...args: unknown[]) => mockReverseChallengeExp(...args),
}));

type Op = {
  kind: 'select' | 'update' | 'insert' | 'delete';
  table?: unknown;
  lock?: string;
  orderBy?: unknown[];
  set?: Record<string, unknown>;
  values?: Record<string, unknown>;
  conflict?: unknown;
};

type Rows = {
  /** The live result the locking SELECT finds; absent = unknown or already removed. */
  result?: Record<string, unknown>;
  best?: Record<string, unknown>;
  remaining?: Record<string, unknown>;
  attempt?: { id: string };
};

/**
 * A `tx` double that logs every statement in order and answers each SELECT by
 * the table it reads: the locked read of `challenge_results` is the target,
 * the unlocked one is the rebuild query.
 */
function createTx(rows: Rows) {
  const ops: Op[] = [];

  function respond(op: Op): unknown[] {
    if (op.kind !== 'select') return [];
    if (op.table === challengeResults) {
      const row = op.lock ? rows.result : rows.remaining;
      return row ? [row] : [];
    }
    if (op.table === challengeBestScores) return rows.best ? [rows.best] : [];
    if (op.table === challengeAttempts) return rows.attempt ? [rows.attempt] : [];
    return [];
  }

  function chain(kind: Op['kind'], table?: unknown) {
    const op: Op = { kind, table };
    ops.push(op);
    const builder = {
      from: (table: unknown) => ((op.table = table), builder),
      where: () => builder,
      for: (mode: string) => ((op.lock = mode), builder),
      orderBy: (...args: unknown[]) => ((op.orderBy = args), builder),
      limit: () => builder,
      set: (value: Record<string, unknown>) => ((op.set = value), builder),
      values: (value: Record<string, unknown>) => ((op.values = value), builder),
      onConflictDoUpdate: (config: unknown) => ((op.conflict = config), builder),
      then: (resolve: (rows: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(respond(op)).then(resolve, reject),
    };
    return builder;
  }

  return {
    ops,
    select: vi.fn(() => chain('select')),
    update: vi.fn((table: unknown) => chain('update', table)),
    insert: vi.fn((table: unknown) => chain('insert', table)),
    delete: vi.fn((table: unknown) => chain('delete', table)),
  };
}

const now = new Date('2026-11-21T09:00:00.000Z');
const resultId = '11111111-1111-4111-8111-111111111111';
const recordedAt = new Date('2026-11-20T08:00:00.000Z');
const earlierAt = new Date('2026-11-01T08:00:00.000Z');

const removedRow = {
  id: resultId,
  userId: 'player-1',
  menuType: 'coordinate_quiz',
  leaderboardKey: 'white',
  score: 99,
  incorrectAnswers: 0,
  timeTaken: 30,
  createdAt: recordedAt,
};

const bestOfRemoved = { score: 99, incorrectAnswers: 0, timeTaken: 30 };
const remainingRow = { score: 40, incorrectAnswers: 2, timeTaken: 60, createdAt: earlierAt };

describe('removeChallengeResult', () => {
  beforeEach(() => {
    mockReverseChallengeExp.mockResolvedValue(48);
  });

  it('returns null and writes nothing when no live result has the id', async () => {
    const tx = createTx({});

    const removed = await removeChallengeResult(tx as never, resultId, now);

    expect(removed).toBeNull();
    expect(tx.ops).toHaveLength(1);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
    expect(mockReverseChallengeExp).not.toHaveBeenCalled();
  });

  it('locks the result first and the best row before the soft-delete UPDATE', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved, remaining: remainingRow });

    await removeChallengeResult(tx as never, resultId, now);

    expect(tx.ops[0]).toMatchObject({ kind: 'select', table: challengeResults, lock: 'update' });
    const bestLock = tx.ops.findIndex(
      (op) => op.kind === 'select' && op.table === challengeBestScores && op.lock === 'update'
    );
    const softDelete = tx.ops.findIndex(
      (op) => op.kind === 'update' && op.table === challengeResults
    );
    expect(bestLock).toBeGreaterThan(0);
    expect(softDelete).toBeGreaterThan(bestLock);
    expect(tx.ops[softDelete].set).toEqual({ deletedAt: now });
  });

  it('rebuilds the best from the best live result left, dated when that result was recorded', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved, remaining: remainingRow });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    const bestUpdate = tx.ops.find(
      (op) => op.kind === 'update' && op.table === challengeBestScores
    );
    expect(bestUpdate?.set).toMatchObject({
      score: 40,
      incorrectAnswers: 2,
      timeTaken: 60,
      achievedAt: earlierAt,
    });
    expect(removed?.bestBefore).toEqual(bestOfRemoved);
    expect(removed?.bestAfter).toEqual({ score: 40, incorrectAnswers: 2, timeTaken: 60 });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('reads the rebuild candidate in ranking order with the earliest of equals first', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved, remaining: remainingRow });

    await removeChallengeResult(tx as never, resultId, now);

    const rebuild = tx.ops.find(
      (op) => op.kind === 'select' && op.table === challengeResults && !op.lock
    );
    expect(rebuild?.orderBy).toEqual([
      desc(challengeResults.score),
      asc(challengeResults.incorrectAnswers),
      asc(challengeResults.timeTaken),
      asc(challengeResults.createdAt),
    ]);
    expect(rebuild?.orderBy).not.toEqual([
      asc(challengeResults.score),
      asc(challengeResults.incorrectAnswers),
      asc(challengeResults.timeTaken),
      asc(challengeResults.createdAt),
    ]);
  });

  it('inserts a best row when none existed but live results remain', async () => {
    const tx = createTx({ result: removedRow, remaining: remainingRow });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    const bestInsert = tx.ops.find(
      (op) => op.kind === 'insert' && op.table === challengeBestScores
    );
    expect(bestInsert?.values).toMatchObject({
      userId: 'player-1',
      menuType: 'coordinate_quiz',
      leaderboardKey: 'white',
      score: 40,
      achievedAt: earlierAt,
    });
    expect(removed?.bestBefore).toBeNull();
  });

  it('deletes the best row when no live result remains', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    expect(tx.ops.some((op) => op.kind === 'delete' && op.table === challengeBestScores)).toBe(
      true
    );
    expect(tx.ops.some((op) => op.kind === 'update' && op.table === challengeBestScores)).toBe(
      false
    );
    expect(removed?.bestAfter).toBeNull();
  });

  it('reverses the Exp grant of the removed result and reports the amount', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    expect(mockReverseChallengeExp).toHaveBeenCalledWith(tx, {
      userId: 'player-1',
      challengeResultId: resultId,
    });
    expect(removed?.expReversed).toBe(48);
  });

  it('reports the recording attempt without unlinking it', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved, attempt: { id: 'attempt-1' } });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    expect(removed).toMatchObject({ ...removedRow, attemptId: 'attempt-1' });
    expect(tx.ops.some((op) => op.kind === 'update' && op.table === challengeAttempts)).toBe(false);
  });

  it('reports a null attempt for a result recorded before attempts existed', async () => {
    const tx = createTx({ result: removedRow, best: bestOfRemoved });

    const removed = await removeChallengeResult(tx as never, resultId, now);

    expect(removed?.attemptId).toBeNull();
  });
});
