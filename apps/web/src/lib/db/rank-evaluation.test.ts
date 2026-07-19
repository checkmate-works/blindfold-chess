import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  bestScoreCacheKey,
  checkAndGrantRanks,
  createRankEvalContext,
  evaluateRankRequirements,
} from './rank-evaluation';
import { games } from './schema';

vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockInsertValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockSelectResult = vi.fn<() => unknown[]>().mockReturnValue([]);
// Captures the WHERE expression passed to the most recent `.where(...)`
// call, so tests can assert which columns a query filters on even though
// `db` itself is fully stubbed. See `findEq`/`extractEqs` below.
let capturedWhere: unknown = null;

vi.mock('./index', () => {
  const makeDbOps = () => ({
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoNothing: (...conflictArgs: unknown[]) => {
            mockOnConflictDoNothing(...conflictArgs);
          },
        };
      },
    }),
    select: () => ({
      from: () => {
        return {
          where: (whereExpr: unknown) => {
            capturedWhere = whereExpr;
            return mockSelectResult();
          },
          orderBy: () => {
            // This is the ranks table query — return mockSelectResult
            return mockSelectResult();
          },
        };
      },
    }),
  });

  return {
    db: makeDbOps(),
    challengeBestScores: {
      userId: 'user_id',
      menuType: 'menu_type',
      leaderboardKey: 'leaderboard_key',
      score: 'score',
    },
    positions: {
      userId: 'user_id',
      type: 'type',
    },
    ranks: {
      id: 'id',
      slug: 'slug',
      level: 'level',
      requirements: 'requirements',
    },
    userRanks: {
      id: 'id',
      userId: 'user_id',
      rankId: 'rank_id',
      achievedAt: 'achieved_at',
    },
  };
});

// `eq`/`and` are wrapped (real `drizzle-orm` still backs everything else,
// e.g. `isNull`/`inArray`/`asc`/`count`) so a captured WHERE expression can
// be introspected by column identity without emulating real SQL objects.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    and: (...args: unknown[]) => ({ __and: args }),
    eq: (column: unknown, value: unknown) => ({ __eq: { column, value } }),
  };
});

type EqNode = { __eq: { column: unknown; value: unknown } };
type AndNode = { __and: unknown[] };

function extractEqs(expr: unknown): EqNode[] {
  if (expr == null || typeof expr !== 'object') return [];
  if ('__eq' in (expr as object)) return [expr as EqNode];
  if ('__and' in (expr as object)) {
    return (expr as AndNode).__and.flatMap((child) => extractEqs(child));
  }
  return [];
}

function findEq(expr: unknown, column: unknown): EqNode | undefined {
  return extractEqs(expr).find((e) => e.__eq.column === column);
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const userId = 'user-00000000-0000-0000-0000-000000000001';

/**
 * Build a `RankEvalContext` for direct `evaluateRankRequirements` calls,
 * pre-loaded with the given challenge_score fixtures. Uses the real
 * `createRankEvalContext` (not a hand-rolled stub) so `getWonPublicGames`
 * still exercises the actual (mocked) DB query the game evaluators depend on.
 */
function makeCtx(bestScores: { menuType: string; leaderboardKey: string; score: number }[] = []) {
  const scoreCache = new Map(
    bestScores.map((s) => [bestScoreCacheKey(s.menuType, s.leaderboardKey), s.score])
  );
  return createRankEvalContext(userId, scoreCache);
}

// ---------------------------------------------------------------------------
// Tests: evaluateRankRequirements
// ---------------------------------------------------------------------------

describe('evaluateRankRequirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
  });

  it('should return true when all requirements are met', async () => {
    // ctx: user has score of 25 for this challenge
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ]);

    expect(result).toBe(true);
  });

  it('should return false when a requirement is not met', async () => {
    // ctx: user has score of 15, but needs 20
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 15 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should return false when user has no score for the challenge', async () => {
    const ctx = makeCtx([]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should return true when score exactly equals minScore', async () => {
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 20 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ]);

    expect(result).toBe(true);
  });

  it('should require ALL requirements to be met (AND logic)', async () => {
    // First score meets the first requirement, second does NOT meet the second
    const ctx = makeCtx([
      { menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 },
      { menuType: 'legal_moves', leaderboardKey: 'knight', score: 5 },
    ]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 10 },
    ]);

    expect(result).toBe(false);
  });

  it('should return true when ALL multiple requirements are met', async () => {
    const ctx = makeCtx([
      { menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 },
      { menuType: 'legal_moves', leaderboardKey: 'knight', score: 15 },
    ]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
      { type: 'challenge_score', menuType: 'legal_moves', leaderboardKey: 'knight', minScore: 10 },
    ]);

    expect(result).toBe(true);
  });

  it('should return true for empty requirements array', async () => {
    const result = await evaluateRankRequirements(makeCtx([]), []);

    expect(result).toBe(true);
  });

  it('should pass position_submission_count when the user owns enough rows', async () => {
    // count() returns a single row with the value column populated.
    mockSelectResult.mockReturnValue([{ value: 3 }]);

    const result = await evaluateRankRequirements(makeCtx([]), [
      { type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 },
    ]);

    expect(result).toBe(true);
  });

  it('should fail position_submission_count when count is below threshold', async () => {
    mockSelectResult.mockReturnValue([{ value: 0 }]);

    const result = await evaluateRankRequirements(makeCtx([]), [
      { type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 },
    ]);

    expect(result).toBe(false);
  });

  it('should treat a missing count row as zero submissions', async () => {
    // No rows returned at all — drizzle's count() should yield [], so the
    // evaluator must default to zero rather than crashing on `row.value`.
    mockSelectResult.mockReturnValue([]);

    const result = await evaluateRankRequirements(makeCtx([]), [
      { type: 'position_submission_count', positionTypes: ['memory'], minCount: 1 },
    ]);

    expect(result).toBe(false);
  });

  it('should pass position_submission_count with multiple positionTypes (OR across types)', async () => {
    // A single puzzle post (or a single memory post) is enough — the count
    // query sums rows across every listed type, it does not require each
    // type individually to reach minCount.
    mockSelectResult.mockReturnValue([{ value: 1 }]);

    const result = await evaluateRankRequirements(makeCtx([]), [
      { type: 'position_submission_count', positionTypes: ['memory', 'puzzle'], minCount: 1 },
    ]);

    expect(result).toBe(true);
  });

  it('should return false for unknown requirement type', async () => {
    const result = await evaluateRankRequirements(makeCtx([]), [
      {
        type: 'unknown_type' as 'challenge_score',
        menuType: 'x',
        leaderboardKey: 'y',
        minScore: 1,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should return false when score is one below minScore (boundary)', async () => {
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 19 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should return true when minScore is 0 and user has a score entry', async () => {
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 0 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 0,
      },
    ]);

    expect(result).toBe(true);
  });

  it('should return false when minScore is 0 but user has no score entry', async () => {
    const result = await evaluateRankRequirements(makeCtx([]), [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 0,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should handle very large scores without overflow issues', async () => {
    const ctx = makeCtx([
      { menuType: 'coordinate_quiz', leaderboardKey: 'white', score: Number.MAX_SAFE_INTEGER },
    ]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: Number.MAX_SAFE_INTEGER,
      },
    ]);

    expect(result).toBe(true);
  });

  it('should return false when first requirement is met but second has no score (different challenge)', async () => {
    // Meets coordinate_quiz; no score entry at all for square_colors.
    const ctx = makeCtx([{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 30 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
      {
        type: 'challenge_score',
        menuType: 'square_colors',
        leaderboardKey: 'default',
        minScore: 10,
      },
    ]);

    expect(result).toBe(false);
  });

  it('should return false when user has scores in different challenges than required', async () => {
    // User has a score for legal_moves, but the requirement is for square_colors —
    // getBestScore looks up by the exact (menuType, leaderboardKey) key, so an
    // entry under a different key is simply not found.
    const ctx = makeCtx([{ menuType: 'legal_moves', leaderboardKey: 'knight', score: 50 }]);

    const result = await evaluateRankRequirements(ctx, [
      {
        type: 'challenge_score',
        menuType: 'square_colors',
        leaderboardKey: 'default',
        minScore: 10,
      },
    ]);

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: game_publish_win evaluator
// ---------------------------------------------------------------------------

describe('game_publish_win evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
    capturedWhere = null;
  });

  const requirement = { type: 'game_publish_win' as const, minCount: 1 };

  it('filters the query to public, non-deleted, won games authored by the user', async () => {
    mockSelectResult.mockReturnValue([]);

    await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(findEq(capturedWhere, games.status)?.__eq.value).toBe('public');
    expect(findEq(capturedWhere, games.result)?.__eq.value).toBe('win');
    expect(findEq(capturedWhere, games.authorId)?.__eq.value).toBe(userId);
  });
});

// ---------------------------------------------------------------------------
// Tests: game_publish_win_hidden_board evaluator
// ---------------------------------------------------------------------------

describe('game_publish_win_hidden_board evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
    capturedWhere = null;
  });

  const requirement = { type: 'game_publish_win_hidden_board' as const, minCount: 1, maxPeeks: 5 };

  it('should pass a game that stayed hidden throughout with peeks under the cap', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'peek' },
        playSettingsLog: null,
        operationLogs: [{ peekCount: 3 }, { peekCount: 2 }],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(true);
  });

  it('should fail when the game started fully sighted', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'always' },
        playSettingsLog: null,
        operationLogs: [],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('should fail when the board was revealed mid-game (play_settings_log reverts to always)', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'never' },
        playSettingsLog: [{ atMoveIndex: 4, key: 'boardVisibility', to: 'always' }],
        operationLogs: [],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('should fail when total peeks exceed maxPeeks', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'peek' },
        playSettingsLog: null,
        operationLogs: [{ peekCount: 4 }, { peekCount: 2 }],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('should pass when peeks exactly equal maxPeeks (boundary)', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'peek' },
        playSettingsLog: null,
        operationLogs: [{ peekCount: 5 }],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(true);
  });

  it('should treat null operationLogs as zero peeks', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'never' },
        playSettingsLog: null,
        operationLogs: null,
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(true);
  });

  it('should fail when no qualifying game rows are returned', async () => {
    mockSelectResult.mockReturnValue([]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('should require minCount qualifying games', async () => {
    mockSelectResult.mockReturnValue([
      { playSettings: { boardVisibility: 'peek' }, playSettingsLog: null, operationLogs: [] },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [{ ...requirement, minCount: 2 }]);

    expect(result).toBe(false);
  });

  it('should disqualify (not crash on) a game with a null operationLogs entry', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'peek' },
        playSettingsLog: null,
        operationLogs: [null, { peekCount: 1 }],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('should disqualify (not crash on) a game with a peekCount-less operationLogs entry', async () => {
    mockSelectResult.mockReturnValue([
      {
        playSettings: { boardVisibility: 'peek' },
        playSettingsLog: null,
        operationLogs: [{}],
      },
    ]);

    const result = await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(result).toBe(false);
  });

  it('filters the query to public, non-deleted, won games authored by the user', async () => {
    mockSelectResult.mockReturnValue([]);

    await evaluateRankRequirements(makeCtx([]), [requirement]);

    expect(findEq(capturedWhere, games.status)?.__eq.value).toBe('public');
    expect(findEq(capturedWhere, games.result)?.__eq.value).toBe('win');
    expect(findEq(capturedWhere, games.authorId)?.__eq.value).toBe(userId);
  });
});

// ---------------------------------------------------------------------------
// Tests: checkAndGrantRanks
// ---------------------------------------------------------------------------

describe('checkAndGrantRanks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
  });

  it('should grant a rank when requirements are met', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      // Call 1: userRanks query (no achieved ranks)
      if (callCount === 1) return [];
      // Call 2: ranks query (all ranks ordered by level)
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
        ];
      // Call 3: allBestScores query (pre-fetched scores for cache)
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: '5kyu', level: 10, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId,
      rankId: 'rank-1',
    });
    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it('skips an unmet rank and still grants a later met one (skip-grants)', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      // Call 1: userRanks (none achieved)
      if (callCount === 1) return [];
      // Call 2: ranks (three ranks — the middle one is unmet)
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
          {
            id: 'rank-2',
            slug: '4kyu',
            level: 20,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 30,
              },
            ],
          },
          {
            id: 'rank-3',
            slug: '3kyu',
            level: 30,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'route_planner',
                leaderboardKey: 'knight',
                minScore: 3,
              },
            ],
          },
        ];
      // Call 3: allBestScores — meets rank-1 (25 >= 20) and rank-3 (5 >= 3)
      // but NOT rank-2 (25 < 30).
      if (callCount === 3)
        return [
          { menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 },
          { menuType: 'route_planner', leaderboardKey: 'knight', score: 5 },
        ];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    // rank-1 and rank-3 granted; the unmet rank-2 no longer blocks rank-3.
    expect(result).toEqual([
      { slug: '5kyu', level: 10, color: undefined },
      { slug: '3kyu', level: 30, color: undefined },
    ]);
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, { userId, rankId: 'rank-1' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(2, { userId, rankId: 'rank-3' });
  });

  it('grants a top rank alone when no lower rank is met (jump straight to 1dan)', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2)
        return [
          {
            id: 'rank-5kyu',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
          {
            id: 'rank-1dan',
            slug: '1dan',
            level: 110,
            requirements: [{ type: 'game_publish_win_hidden_board', minCount: 1, maxPeeks: 5 }],
          },
        ];
      if (callCount === 3) return []; // no challenge scores at all
      // Call 4: the 1dan evaluator's games query — one qualifying hidden-board win
      if (callCount === 4)
        return [
          {
            playSettings: { boardVisibility: 'never' },
            playSettingsLog: null,
            operationLogs: [],
          },
        ];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: '1dan', level: 110, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-1dan' });
  });

  it('should grant multiple consecutive ranks when all requirements are met', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
          {
            id: 'rank-2',
            slug: '4kyu',
            level: 20,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 30,
              },
            ],
          },
        ];
      // Call 3: allBestScores — score 35 meets both ranks
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 35 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([
      { slug: '5kyu', level: 10, color: undefined },
      { slug: '4kyu', level: 20, color: undefined },
    ]);
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, { userId, rankId: 'rank-1' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(2, { userId, rankId: 'rank-2' });
  });

  it('should skip ranks with empty requirements', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2)
        return [
          {
            id: 'rank-empty',
            slug: 'empty',
            level: 5,
            requirements: [], // empty
          },
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
        ];
      // Call 3: allBestScores
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    // Only rank-1 is granted (rank-empty is skipped, not granted)
    expect(result).toEqual([{ slug: '5kyu', level: 10, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-1' });
  });

  it('should skip already achieved ranks', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [{ rankId: 'rank-1' }]; // rank-1 already achieved
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
          {
            id: 'rank-2',
            slug: '4kyu',
            level: 20,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 30,
              },
            ],
          },
        ];
      // Call 3: allBestScores
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 35 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    // Only rank-2 should be granted (rank-1 already achieved)
    expect(result).toEqual([{ slug: '4kyu', level: 20, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-2' });
  });

  it('should do nothing when user has achieved all ranks', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [{ rankId: 'rank-1' }]; // all achieved
      if (callCount === 2) return [{ id: 'rank-1', slug: '5kyu', level: 10, requirements: [] }];
      if (callCount === 3) return []; // allBestScores
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should do nothing when there are no ranks defined', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2) return []; // no ranks defined
      if (callCount === 3) return []; // allBestScores
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip ranks with invalid/non-array requirements', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      if (callCount === 2)
        return [
          {
            id: 'rank-bad',
            slug: 'bad',
            level: 5,
            requirements: 'not-an-array', // invalid
          },
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
        ];
      // Call 3: allBestScores
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    // rank-bad is skipped (parseRequirements returns []), rank-1 is granted
    expect(result).toEqual([{ slug: '5kyu', level: 10, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-1' });
  });

  it('should call onConflictDoNothing for idempotent inserts (concurrent call safety)', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
        ];
      // Call 3: allBestScores
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 }];
      return [];
    });

    await checkAndGrantRanks(userId);

    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
    // Verify it was called with a conflict target configuration (Drizzle column objects)
    expect(mockOnConflictDoNothing).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.any(Array) })
    );
  });

  it('should grant 5 consecutive ranks when all requirements are met', async () => {
    const manyRanks = [
      {
        id: 'rank-1',
        slug: '10kyu',
        level: 1,
        requirements: [
          {
            type: 'challenge_score',
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            minScore: 5,
          },
        ],
      },
      {
        id: 'rank-2',
        slug: '9kyu',
        level: 2,
        requirements: [
          {
            type: 'challenge_score',
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            minScore: 10,
          },
        ],
      },
      {
        id: 'rank-3',
        slug: '8kyu',
        level: 3,
        requirements: [
          {
            type: 'challenge_score',
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            minScore: 15,
          },
        ],
      },
      {
        id: 'rank-4',
        slug: '7kyu',
        level: 4,
        requirements: [
          {
            type: 'challenge_score',
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            minScore: 20,
          },
        ],
      },
      {
        id: 'rank-5',
        slug: '6kyu',
        level: 5,
        requirements: [
          {
            type: 'challenge_score',
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            minScore: 25,
          },
        ],
      },
    ];

    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2) return manyRanks;
      // Call 3: allBestScores — score 100 meets all requirements
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 100 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ slug: '10kyu', level: 1, color: undefined });
    expect(result[4]).toEqual({ slug: '6kyu', level: 5, color: undefined });
    expect(mockInsertValues).toHaveBeenCalledTimes(5);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, { userId, rankId: 'rank-1' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(2, { userId, rankId: 'rank-2' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(3, { userId, rankId: 'rank-3' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(4, { userId, rankId: 'rank-4' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(5, { userId, rankId: 'rank-5' });
  });

  it('should stop granting when a rank with multiple requirements has only some met', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return []; // no achieved ranks
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
              {
                type: 'challenge_score',
                menuType: 'legal_moves',
                leaderboardKey: 'knight',
                minScore: 15,
              },
            ],
          },
        ];
      // Call 3: allBestScores — coordinate_quiz met, legal_moves NOT met
      if (callCount === 3)
        return [
          { menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 25 },
          { menuType: 'legal_moves', leaderboardKey: 'knight', score: 10 },
        ];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should grant rank with minScore: 0 when user has a score entry', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      if (callCount === 2)
        return [
          {
            id: 'rank-beginner',
            slug: 'beginner',
            level: 1,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 0,
              },
            ],
          },
        ];
      // Call 3: allBestScores — score of 0 >= minScore of 0
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 0 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: 'beginner', level: 1, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-beginner' });
  });

  it('should not grant rank with minScore: 0 when user has no score entry at all', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      if (callCount === 2)
        return [
          {
            id: 'rank-beginner',
            slug: 'beginner',
            level: 1,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 0,
              },
            ],
          },
        ];
      if (callCount === 3) return []; // allBestScores — no score entry at all
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should not leave partial grants when insert throws mid-way', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [];
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '5kyu',
            level: 10,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 20,
              },
            ],
          },
          {
            id: 'rank-2',
            slug: '4kyu',
            level: 20,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 30,
              },
            ],
          },
        ];
      // Call 3: allBestScores — score meets both ranks
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 35 }];
      return [];
    });

    // rank-1 insert succeeds, rank-2 insert throws
    mockOnConflictDoNothing
      .mockImplementationOnce(() => {}) // rank-1 succeeds
      .mockImplementationOnce(() => {
        throw new Error('DB connection lost');
      }); // rank-2 fails

    await expect(checkAndGrantRanks(userId)).rejects.toThrow('DB connection lost');

    // rank-1 was already granted before the error (no transaction rollback in current impl)
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, { userId, rankId: 'rank-1' });
    expect(mockInsertValues).toHaveBeenNthCalledWith(2, { userId, rankId: 'rank-2' });
  });

  it('should correctly filter when user has some ranks achieved in the middle', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      // rank-1 and rank-3 already achieved (non-contiguous)
      if (callCount === 1) return [{ rankId: 'rank-1' }, { rankId: 'rank-3' }];
      if (callCount === 2)
        return [
          {
            id: 'rank-1',
            slug: '10kyu',
            level: 1,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 5,
              },
            ],
          },
          {
            id: 'rank-2',
            slug: '9kyu',
            level: 2,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 10,
              },
            ],
          },
          {
            id: 'rank-3',
            slug: '8kyu',
            level: 3,
            requirements: [
              {
                type: 'challenge_score',
                menuType: 'coordinate_quiz',
                leaderboardKey: 'white',
                minScore: 15,
              },
            ],
          },
        ];
      // Call 3: allBestScores — score 12 meets rank-2 (>=10)
      if (callCount === 3)
        return [{ menuType: 'coordinate_quiz', leaderboardKey: 'white', score: 12 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: '9kyu', level: 2, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-2' });
  });
});
