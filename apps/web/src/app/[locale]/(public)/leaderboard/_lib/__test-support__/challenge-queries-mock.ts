import { vi } from 'vitest';

/**
 * The nine `@/lib/db/challenge-queries` readers a leaderboard test stands in
 * for: the three period rankings, and each period's ranked-row and rank-only
 * lookup for one user.
 *
 * They come as a set because the code under test dispatches over the set —
 * `getQueriesForPeriod` picks a trio, `getLeaderboard` calls whichever the
 * period selects — so stubbing eight of the nine leaves one period silently
 * unmocked. Two suites had declared all nine, twice, in the same order.
 *
 * The spies are this module's own, so a test can assert on them directly:
 *
 * ```ts
 * vi.mock('@/lib/db/challenge-queries', () => challengeQueriesMock());
 * const { getWeeklyRanking: mockGetWeeklyRanking } = challengeQueryMocks;
 * ```
 *
 * Call it inside the factory, never as the factory: `vi.mock` is hoisted above
 * the imports, so handing it the binding reads it before this module has been
 * evaluated.
 */
export const challengeQueryMocks = {
  getAllTimeRanking: vi.fn(),
  getWeeklyRanking: vi.fn(),
  getMonthlyRanking: vi.fn(),
  getUserAllTimeRankedRow: vi.fn(),
  getUserWeeklyRankedRow: vi.fn(),
  getUserMonthlyRankedRow: vi.fn(),
  getUserAllTimeRank: vi.fn(),
  getUserWeeklyRank: vi.fn(),
  getUserMonthlyRank: vi.fn(),
};

export function challengeQueriesMock() {
  return challengeQueryMocks;
}
