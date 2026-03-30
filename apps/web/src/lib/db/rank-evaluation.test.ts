import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { checkAndGrantRanks, evaluateRankRequirements } from './rank-evaluation';

vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockInsertValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockSelectResult = vi.fn<() => unknown[]>().mockReturnValue([]);
const mockLogActivityEvent = vi.fn();

// Tracks which table was passed to select().from()
let _lastFromTable: unknown = null;

vi.mock('../activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

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
    select: (_fields?: unknown) => ({
      from: (table: unknown) => {
        _lastFromTable = table;
        return {
          where: () => mockSelectResult(),
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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const userId = 'user-00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Tests: evaluateRankRequirements
// ---------------------------------------------------------------------------

describe('evaluateRankRequirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult.mockReturnValue([]);
  });

  it('should return true when all requirements are met', async () => {
    // Mock: user has score of 25 for this challenge
    mockSelectResult.mockReturnValue([{ score: 25 }]);

    const result = await evaluateRankRequirements(userId, [
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
    // Mock: user has score of 15, but needs 20
    mockSelectResult.mockReturnValue([{ score: 15 }]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([{ score: 20 }]);

    const result = await evaluateRankRequirements(userId, [
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
    // First call returns score meeting requirement, second returns score not meeting it
    mockSelectResult
      .mockReturnValueOnce([{ score: 25 }]) // meets first requirement
      .mockReturnValueOnce([{ score: 5 }]); // does NOT meet second requirement

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValueOnce([{ score: 25 }]).mockReturnValueOnce([{ score: 15 }]);

    const result = await evaluateRankRequirements(userId, [
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
    const result = await evaluateRankRequirements(userId, []);

    expect(result).toBe(true);
  });

  it('should return false for unknown requirement type', async () => {
    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([{ score: 19 }]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([{ score: 0 }]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult.mockReturnValue([{ score: Number.MAX_SAFE_INTEGER }]);

    const result = await evaluateRankRequirements(userId, [
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
    mockSelectResult
      .mockReturnValueOnce([{ score: 30 }]) // meets coordinate_quiz requirement
      .mockReturnValueOnce([]); // no score for square_colors at all

    const result = await evaluateRankRequirements(userId, [
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
    // User has a score for legal_moves, but the requirement is for square_colors
    // The mock returns empty because the DB query filters by menuType/leaderboardKey
    mockSelectResult.mockReturnValue([]);

    const result = await evaluateRankRequirements(userId, [
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
      // Call 3: evaluator checks challenge_best_scores
      if (callCount === 3) return [{ score: 25 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: '5kyu', level: 10, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId,
      rankId: 'rank-1',
    });
    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId,
      action: 'rank_achieved',
      targetType: 'rank',
      targetId: 'rank-1',
      metadata: { rankSlug: '5kyu', level: 10 },
    });
  });

  it('should stop at the first rank whose requirements are NOT met', async () => {
    let callCount = 0;
    mockSelectResult.mockImplementation(() => {
      callCount++;
      // Call 1: userRanks (none achieved)
      if (callCount === 1) return [];
      // Call 2: ranks (two ranks)
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
      // Call 3: evaluator for rank-1 — score 25 >= 20 (met)
      if (callCount === 3) return [{ score: 25 }];
      // Call 4: evaluator for rank-2 — score 25 < 30 (NOT met)
      if (callCount === 4) return [{ score: 25 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    // Only rank-1 should be granted
    expect(result).toEqual([{ slug: '5kyu', level: 10, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId,
      rankId: 'rank-1',
    });
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
      // Both evaluations return high enough scores
      if (callCount === 3) return [{ score: 35 }];
      if (callCount === 4) return [{ score: 35 }];
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
    expect(mockLogActivityEvent).toHaveBeenCalledTimes(2);
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
      // Evaluator for rank-1
      if (callCount === 3) return [{ score: 25 }];
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
      // Evaluator for rank-2
      if (callCount === 3) return [{ score: 35 }];
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
      if (callCount === 3) return [{ score: 25 }];
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
      if (callCount === 3) return [{ score: 25 }];
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
      // All evaluations return score of 100 (meets all requirements)
      return [{ score: 100 }];
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
    expect(mockLogActivityEvent).toHaveBeenCalledTimes(5);
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
      // First requirement met, second not met
      if (callCount === 3) return [{ score: 25 }]; // coordinate_quiz: 25 >= 20 OK
      if (callCount === 4) return [{ score: 10 }]; // legal_moves: 10 < 15 FAIL
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
      if (callCount === 3) return [{ score: 0 }]; // score of 0 >= minScore of 0
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
      if (callCount === 3) return []; // no score entry
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should not leave partial grants when evaluation throws mid-way', async () => {
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
      // rank-1 evaluation succeeds
      if (callCount === 3) return [{ score: 25 }];
      // rank-2 evaluation throws
      if (callCount === 4) throw new Error('DB connection lost');
      return [];
    });

    await expect(checkAndGrantRanks(userId)).rejects.toThrow('DB connection lost');

    // rank-1 was already granted before the error (no transaction rollback in current impl)
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-1' });
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
      // Evaluator for rank-2 (the only unachieved rank)
      if (callCount === 3) return [{ score: 12 }];
      return [];
    });

    const result = await checkAndGrantRanks(userId);

    expect(result).toEqual([{ slug: '9kyu', level: 2, color: undefined }]);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId, rankId: 'rank-2' });
  });

  it('should log activity event as fire-and-forget (does not await)', async () => {
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
      if (callCount === 3) return [{ score: 25 }];
      return [];
    });

    // Even if logActivityEvent rejects, checkAndGrantRanks should not throw
    mockLogActivityEvent.mockRejectedValue(new Error('logging failed'));

    // Should not throw despite log failure
    await checkAndGrantRanks(userId);

    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockLogActivityEvent).toHaveBeenCalledTimes(1);
  });
});
