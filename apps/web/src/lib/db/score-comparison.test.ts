import { describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getScoreComparison } from './score-comparison';

const columns = vi.hoisted(() => ({
  id: 'challenge_results.id',
  userId: 'challenge_results.user_id',
  menuType: 'challenge_results.menu_type',
  leaderboardKey: 'challenge_results.leaderboard_key',
  score: 'challenge_results.score',
  incorrectAnswers: 'challenge_results.incorrect_answers',
  timeTaken: 'challenge_results.time_taken',
  createdAt: 'challenge_results.created_at',
}));

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }));
vi.mock('@/lib/db/schema', () => ({ challengeResults: columns }));

// Operators are stubbed to plain descriptors so the assertions below can read
// which columns each query was scoped by, without a SQL dialect in the loop.
vi.mock('drizzle-orm', () => {
  const op =
    (name: string) =>
    (...args: unknown[]) => ({ op: name, args });
  return {
    and: op('and'),
    asc: op('asc'),
    desc: op('desc'),
    eq: op('eq'),
    lte: op('lte'),
    ne: op('ne'),
  };
});

const mockDb = vi.mocked(db);

/** Chainable Drizzle-style mock resolving to `rows`; records the `where` arg. */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'orderBy', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

function whereOps(chain: Record<string, unknown>): string[] {
  const where = chain.where as ReturnType<typeof vi.fn>;
  const arg = where.mock.calls[0][0] as { args: { op: string; args: unknown[] }[] };
  return arg.args.map((c) => `${c.op}:${c.args[0]}`);
}

const currentRow = {
  id: 'run-3',
  leaderboardKey: 'black',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  score: 12,
  incorrectAnswers: 1,
  timeTaken: 60,
};
const bestRow = { score: 15, incorrectAnswers: 0, timeTaken: 60 };
const lastRow = { score: 10, incorrectAnswers: 2, timeTaken: 60 };

describe('getScoreComparison', () => {
  it('excludes the current run by id and time cut, and keys history by the run’s own leaderboard key', async () => {
    const currentChain = mockChain([currentRow]);
    const bestChain = mockChain([bestRow]);
    const lastChain = mockChain([lastRow]);
    mockDb.select
      .mockReturnValueOnce(currentChain as never)
      .mockReturnValueOnce(bestChain as never)
      .mockReturnValueOnce(lastChain as never);

    const result = await getScoreComparison('user-1', 'coordinate_quiz', 'white', 'run-3');

    expect(result).toEqual({
      current: { score: 12, incorrectAnswers: 1, timeTaken: 60 },
      previousBest: bestRow,
      previousLast: lastRow,
    });

    const currentWhere = (currentChain.where as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      args: { op: string; args: unknown[] }[];
    };
    expect(currentWhere.args.map((c) => c.args)).toEqual([
      [columns.id, 'run-3'],
      [columns.userId, 'user-1'],
      [columns.menuType, 'coordinate_quiz'],
    ]);

    for (const chain of [bestChain, lastChain]) {
      expect(whereOps(chain)).toEqual([
        `eq:${columns.userId}`,
        `eq:${columns.menuType}`,
        `eq:${columns.leaderboardKey}`,
        `ne:${columns.id}`,
        `lte:${columns.createdAt}`,
      ]);
      const where = (chain.where as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        args: { args: unknown[] }[];
      };
      // The row's own key ('black') wins over the URL-derived guess ('white').
      expect(where.args[2].args[1]).toBe('black');
    }
  });

  it('orders "best" by the leaderboard tuple and "last" by recency', async () => {
    const bestChain = mockChain([bestRow]);
    const lastChain = mockChain([lastRow]);
    mockDb.select
      .mockReturnValueOnce(mockChain([currentRow]) as never)
      .mockReturnValueOnce(bestChain as never)
      .mockReturnValueOnce(lastChain as never);

    await getScoreComparison('user-1', 'coordinate_quiz', 'white', 'run-3');

    const orderOf = (chain: Record<string, unknown>) =>
      (
        (chain.orderBy as ReturnType<typeof vi.fn>).mock.calls[0] as {
          op: string;
          args: unknown[];
        }[]
      ).map((o) => `${o.op}:${o.args[0]}`);
    expect(orderOf(bestChain)).toEqual([
      `desc:${columns.score}`,
      `asc:${columns.incorrectAnswers}`,
      `asc:${columns.timeTaken}`,
    ]);
    expect(orderOf(lastChain)).toEqual([`desc:${columns.createdAt}`]);
  });

  it('runs the history queries unrestricted when no current id is given', async () => {
    const bestChain = mockChain([bestRow]);
    const lastChain = mockChain([lastRow]);
    mockDb.select.mockReturnValueOnce(bestChain as never).mockReturnValueOnce(lastChain as never);

    const result = await getScoreComparison('user-1', 'legal_moves', 'knight');

    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(result.current).toBeUndefined();
    expect(result.previousBest).toEqual(bestRow);
    expect(whereOps(bestChain)).toEqual([
      `eq:${columns.userId}`,
      `eq:${columns.menuType}`,
      `eq:${columns.leaderboardKey}`,
    ]);
  });

  it('treats an id that does not resolve for this user as no current run', async () => {
    mockDb.select
      .mockReturnValueOnce(mockChain([]) as never)
      .mockReturnValueOnce(mockChain([]) as never)
      .mockReturnValueOnce(mockChain([]) as never);

    const result = await getScoreComparison('user-1', 'legal_moves', 'knight', 'someone-elses-run');

    expect(result).toEqual({
      current: undefined,
      previousBest: undefined,
      previousLast: undefined,
    });
  });
});
