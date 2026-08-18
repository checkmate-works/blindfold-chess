import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPage, RankedLeaderboardRow } from '@/lib/db/challenge-queries';

import type { LeaderboardModule, LeaderboardPeriod } from '../../_lib/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockGetAllTimeRanking = vi.fn();
const mockGetWeeklyRanking = vi.fn();
const mockGetMonthlyRanking = vi.fn();
const mockGetUserAllTimeRankedRow = vi.fn();
const mockGetUserWeeklyRankedRow = vi.fn();
const mockGetUserMonthlyRankedRow = vi.fn();
const mockGetUserAllTimeRank = vi.fn();
const mockGetUserWeeklyRank = vi.fn();
const mockGetUserMonthlyRank = vi.fn();

vi.mock('@/lib/db/challenge-queries', () => ({
  getAllTimeRanking: (...args: unknown[]) => mockGetAllTimeRanking(...args),
  getWeeklyRanking: (...args: unknown[]) => mockGetWeeklyRanking(...args),
  getMonthlyRanking: (...args: unknown[]) => mockGetMonthlyRanking(...args),
  getUserAllTimeRankedRow: (...args: unknown[]) => mockGetUserAllTimeRankedRow(...args),
  getUserWeeklyRankedRow: (...args: unknown[]) => mockGetUserWeeklyRankedRow(...args),
  getUserMonthlyRankedRow: (...args: unknown[]) => mockGetUserMonthlyRankedRow(...args),
  getUserAllTimeRank: (...args: unknown[]) => mockGetUserAllTimeRank(...args),
  getUserWeeklyRank: (...args: unknown[]) => mockGetUserWeeklyRank(...args),
  getUserMonthlyRank: (...args: unknown[]) => mockGetUserMonthlyRank(...args),
}));

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
    }),
}));

// The viewer's hidden_from_leaderboard flag read. The action only runs
// `db.select(...).from(...).where(...).limit(1)` against profiles, so the
// chain is stubbed down to this single resolver.
const mockProfilesFlagQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockProfilesFlagQuery(),
        }),
      }),
    }),
  },
  profiles: {},
}));

// `eq(profiles.id, ...)` receives the stubbed (empty) profiles table above;
// real drizzle eq would choke on the missing column objects.
vi.mock('drizzle-orm', () => ({
  eq: () => ({}),
}));

const { getLeaderboard } = await import('../getLeaderboard');

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeLeaderboardRow(overrides: Partial<RankedLeaderboardRow> = {}): RankedLeaderboardRow {
  return {
    userId: 'user-1',
    username: 'player1',
    score: 100,
    incorrectAnswers: 2,
    timeTaken: 30,
    displayName: 'Player One',
    avatarUrl: null,
    country: null,
    flair: null,
    rank: 1,
    ...overrides,
  };
}

function makeLeaderboardPage(
  rows: RankedLeaderboardRow[] = [],
  total = rows.length
): LeaderboardPage {
  return { rows, total };
}

function setupAuthUser(userId: string | null) {
  if (userId) {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  } else {
    mockGetUser.mockResolvedValue({ data: { user: null } });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getLeaderboard', () => {
  beforeEach(() => {
    setupAuthUser(null); // Default: not logged in
    // Default: empty results
    mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage());
    mockGetWeeklyRanking.mockResolvedValue(makeLeaderboardPage());
    mockGetMonthlyRanking.mockResolvedValue(makeLeaderboardPage());
    mockGetUserAllTimeRankedRow.mockResolvedValue(null);
    mockGetUserWeeklyRankedRow.mockResolvedValue(null);
    mockGetUserMonthlyRankedRow.mockResolvedValue(null);
    // Default: the viewer has not opted out of leaderboards
    mockProfilesFlagQuery.mockResolvedValue([{ hiddenFromLeaderboard: false }]);
  });

  // -----------------------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------------------

  describe('input validation', () => {
    it('returns empty result for invalid module', async () => {
      const result = await getLeaderboard(
        'invalid_module' as LeaderboardModule,
        'white',
        'all-time',
        1
      );
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
      expect(mockGetAllTimeRanking).not.toHaveBeenCalled();
    });

    it('returns empty result for invalid period', async () => {
      const result = await getLeaderboard(
        'coordinate_quiz',
        'white',
        'invalid-period' as LeaderboardPeriod,
        1
      );
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for invalid key for given module', async () => {
      // 'king' is not a valid key for coordinate_quiz
      const result = await getLeaderboard('coordinate_quiz', 'king', 'all-time', 1);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for page 0', async () => {
      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 0);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for negative page', async () => {
      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', -1);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for non-integer page', async () => {
      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1.5);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('accepts valid coordinate_quiz keys', async () => {
      for (const key of ['white', 'black', 'random']) {
        await getLeaderboard('coordinate_quiz', key, 'all-time', 1);
      }
      expect(mockGetAllTimeRanking).toHaveBeenCalledTimes(3);
    });

    it('accepts valid legal_moves keys', async () => {
      for (const key of ['king', 'queen', 'rook', 'bishop', 'knight', 'random']) {
        await getLeaderboard('legal_moves', key, 'all-time', 1);
      }
      expect(mockGetAllTimeRanking).toHaveBeenCalledTimes(6);
    });

    it('accepts valid square_colors key', async () => {
      await getLeaderboard('square_colors', 'default', 'all-time', 1);
      expect(mockGetAllTimeRanking).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Period routing
  // -----------------------------------------------------------------------

  describe('period routing', () => {
    it('calls getAllTimeRanking for all-time period', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);
      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 0, 20);
    });

    it('calls getWeeklyRanking for weekly period', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'weekly', 1);
      expect(mockGetWeeklyRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 0, 20);
    });

    it('calls getMonthlyRanking for monthly period', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'monthly', 1);
      expect(mockGetMonthlyRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 0, 20);
    });
  });

  // -----------------------------------------------------------------------
  // Pagination offset
  // -----------------------------------------------------------------------

  describe('pagination', () => {
    it('passes offset 0 for page 1', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);
      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 0, 20);
    });

    it('passes offset 20 for page 2', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'all-time', 2);
      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 20, 20);
    });

    it('passes offset 40 for page 3', async () => {
      await getLeaderboard('coordinate_quiz', 'white', 'all-time', 3);
      expect(mockGetAllTimeRanking).toHaveBeenCalledWith('coordinate_quiz', 'white', 40, 20);
    });
  });

  // -----------------------------------------------------------------------
  // Rank assignment
  // -----------------------------------------------------------------------

  describe('rank assignment', () => {
    it('assigns rank starting from 1 for page 1', async () => {
      const rows = [
        makeLeaderboardRow({ userId: 'u1', score: 100 }),
        makeLeaderboardRow({ userId: 'u2', score: 90 }),
        makeLeaderboardRow({ userId: 'u3', score: 80 }),
      ];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 3));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.rows[0]!.rank).toBe(1);
      expect(result.rows[1]!.rank).toBe(2);
      expect(result.rows[2]!.rank).toBe(3);
    });

    it('assigns rank starting from 21 for page 2', async () => {
      const rows = [
        makeLeaderboardRow({ userId: 'u21', score: 50 }),
        makeLeaderboardRow({ userId: 'u22', score: 49 }),
      ];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 22));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 2);

      expect(result.rows[0]!.rank).toBe(21);
      expect(result.rows[1]!.rank).toBe(22);
    });
  });

  // -----------------------------------------------------------------------
  // Current user rank
  // -----------------------------------------------------------------------

  describe('current user rank', () => {
    it('does not fetch user rank when not logged in', async () => {
      setupAuthUser(null);
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage([], 0));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.currentUserRank).toBeNull();
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
    });

    it('does not fetch user rank when user is already on the current page', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: currentUserId, score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 1));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.currentUserRank).toBeNull();
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
    });

    it('fetches user rank when user is not on the current page', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: 'other-user', score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 100));

      const rankedRow: RankedLeaderboardRow = makeLeaderboardRow({
        userId: currentUserId,
        rank: 55,
      });
      mockGetUserAllTimeRankedRow.mockResolvedValue(rankedRow);

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.currentUserRank).toEqual(rankedRow);
      expect(mockGetUserAllTimeRankedRow).toHaveBeenCalledWith(
        currentUserId,
        'coordinate_quiz',
        'white'
      );
    });

    it('returns null currentUserRank when user has no entry', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: 'other-user', score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 1));
      mockGetUserAllTimeRankedRow.mockResolvedValue(null);

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.currentUserRank).toBeNull();
    });

    it('skips the ranked-row lookup and reports viewerHidden for an opted-out viewer', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);
      mockProfilesFlagQuery.mockResolvedValue([{ hiddenFromLeaderboard: true }]);

      const rows = [makeLeaderboardRow({ userId: 'other-user', score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 100));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.viewerHidden).toBe(true);
      expect(result.currentUserRank).toBeNull();
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
      // The public ranking itself is untouched by the viewer's own setting.
      expect(result.rows).toHaveLength(1);
    });

    it('reports viewerHidden false for a visible signed-in viewer', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: 'other-user', score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 100));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.viewerHidden).toBe(false);
    });

    it('uses correct user ranked row function per period', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: 'other-user' })];

      // weekly
      mockGetWeeklyRanking.mockResolvedValue(makeLeaderboardPage(rows, 1));
      await getLeaderboard('coordinate_quiz', 'white', 'weekly', 1);
      expect(mockGetUserWeeklyRankedRow).toHaveBeenCalledWith(
        currentUserId,
        'coordinate_quiz',
        'white'
      );

      // monthly
      mockGetMonthlyRanking.mockResolvedValue(makeLeaderboardPage(rows, 1));
      await getLeaderboard('coordinate_quiz', 'white', 'monthly', 1);
      expect(mockGetUserMonthlyRankedRow).toHaveBeenCalledWith(
        currentUserId,
        'coordinate_quiz',
        'white'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Empty data
  // -----------------------------------------------------------------------

  describe('empty data', () => {
    it('returns empty rows and totalCount 0 when no data exists', async () => {
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage([], 0));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.rows).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.currentUserRank).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Auth error handling
  // -----------------------------------------------------------------------

  describe('auth error handling', () => {
    it('treats auth errors as unauthenticated (currentUserRank is null)', async () => {
      mockGetUser.mockRejectedValue(new Error('Auth service unavailable'));
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage([makeLeaderboardRow()], 1));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.rows).toHaveLength(1);
      expect(result.currentUserRank).toBeNull();
      expect(mockGetUserAllTimeRankedRow).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // totalCount
  // -----------------------------------------------------------------------

  describe('totalCount', () => {
    it('returns total from ranking function', async () => {
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage([], 500));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result.totalCount).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // DB error handling
  // -----------------------------------------------------------------------

  describe('DB error handling', () => {
    it('returns empty result when ranking query throws', async () => {
      mockGetAllTimeRanking.mockRejectedValue(new Error('DB connection failed'));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('keeps the public rows when only the user ranked row query throws', async () => {
      const currentUserId = 'current-user';
      setupAuthUser(currentUserId);

      const rows = [makeLeaderboardRow({ userId: 'other-user', score: 100 })];
      mockGetAllTimeRanking.mockResolvedValue(makeLeaderboardPage(rows, 100));
      mockGetUserAllTimeRankedRow.mockRejectedValue(new Error('DB timeout'));

      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', 1);

      // A failed per-viewer lookup degrades to "no own-rank row" instead of
      // discarding the already-fetched public ranking (which the pre-split
      // implementation did as a side effect of one enclosing try-catch).
      expect(result.rows).toHaveLength(1);
      expect(result.totalCount).toBe(100);
      expect(result.currentUserRank).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Additional input validation edge cases
  // -----------------------------------------------------------------------

  describe('additional input validation', () => {
    it('returns empty result for NaN page', async () => {
      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', NaN);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for Infinity page', async () => {
      const result = await getLeaderboard('coordinate_quiz', 'white', 'all-time', Infinity);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });

    it('returns empty result for empty key string', async () => {
      const result = await getLeaderboard('coordinate_quiz', '', 'all-time', 1);
      expect(result).toEqual({
        rows: [],
        totalCount: 0,
        currentUserRank: null,
        viewerHidden: false,
      });
    });
  });
});
