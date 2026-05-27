import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMypageDashboardData } from './getMypageDashboardData';

// ---------------------------------------------------------------------------
// Mock setup
//
// Uses `vi.hoisted` so the shared state is initialized before the hoisted
// `vi.mock(...)` factories run. The mocked `db.select().from(table)` branches
// on sentinel table references to return the appropriate rows per table.
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => {
  const profilesTable = { __table: 'profiles' };
  const likesTable = { __table: 'likes' };
  const topicPostsTable = { __table: 'topic_posts' };
  const userInterviewAnswersTable = { __table: 'user_interview_answers' };
  const userExpTable = { __table: 'user_exp' };

  const state = {
    profileRows: [] as Array<{
      username: string | undefined;
      displayName: string | null;
      avatarUrl: string | null;
    }>,
    likesCountRows: [] as Array<{ value: number }>,
    answeredCountRows: [] as Array<{ value: number }>,
    userExpRows: [] as Array<{ totalExp: number }>,
  };

  return {
    profilesTable,
    likesTable,
    topicPostsTable,
    userInterviewAnswersTable,
    userExpTable,
    state,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => {
  // Track which table is being queried in a chain to return the correct rows.
  const db = {
    select: () => ({
      from: (table: unknown) => {
        const tableName = (table as { __table?: string })?.__table;

        // For profiles: select().from(profiles).where().limit()
        // For likes: select().from(likes).innerJoin().where()
        // For userInterviewAnswers: select().from(userInterviewAnswers).where()
        // For userExp: select().from(userExp).where().limit()

        if (tableName === 'profiles') {
          return {
            where: () => ({
              limit: () => hoisted.state.profileRows,
            }),
          };
        }

        if (tableName === 'likes') {
          return {
            innerJoin: () => ({
              where: () => hoisted.state.likesCountRows,
            }),
          };
        }

        if (tableName === 'user_interview_answers') {
          return {
            where: () => hoisted.state.answeredCountRows,
          };
        }

        if (tableName === 'user_exp') {
          return {
            where: () => ({
              limit: () => hoisted.state.userExpRows,
            }),
          };
        }

        // Fallback
        return {
          where: () => ({
            limit: () => [],
          }),
          innerJoin: () => ({
            where: () => [],
          }),
        };
      },
    }),
  };

  // Table sentinels
  return {
    db,
    profiles: hoisted.profilesTable,
    likes: hoisted.likesTable,
    topicPosts: hoisted.topicPostsTable,
    userInterviewAnswers: hoisted.userInterviewAnswersTable,
    userExp: hoisted.userExpTable,
    // The dashboard data fetch now also reads the user's point balance via
    // `getPointBalanceSummary`, which is mocked below — this sentinel just
    // satisfies the import resolution.
    userPointBalances: { __table: 'user_point_balances' },
  };
});

vi.mock('@/lib/points', () => ({
  getPointBalanceSummary: vi.fn().mockResolvedValue({
    total: 0,
    byCategory: { earned: 0, purchased: 0, promotional: 0 },
  }),
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ __and: args }),
  eq: (column: unknown, value: unknown) => ({ __eq: { column, value } }),
  count: () => ({ __count: true }),
  inArray: (column: unknown, values: unknown[]) => ({ __inArray: { column, values } }),
  isNull: (column: unknown) => ({ __isNull: { column } }),
}));

vi.mock('@/app/[locale]/_lib/interview', () => ({
  INTERVIEW_QUESTION_KEYS: ['favorite_opening'] as const,
}));

// ---------------------------------------------------------------------------
// Shared reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  hoisted.state.profileRows = [];
  hoisted.state.likesCountRows = [];
  hoisted.state.answeredCountRows = [];
  hoisted.state.userExpRows = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getMypageDashboardData', () => {
  const userId = 'user-00000000-0000-0000-0000-000000000001';

  describe('totalExp', () => {
    it('returns the correct totalExp when user_exp record exists', async () => {
      hoisted.state.profileRows = [
        { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      ];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [{ totalExp: 250 }];

      const result = await getMypageDashboardData(userId);

      expect(result.totalExp).toBe(250);
    });

    it('returns totalExp as 0 when user_exp record does not exist', async () => {
      hoisted.state.profileRows = [
        { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      ];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.totalExp).toBe(0);
    });

    it('handles a large totalExp value', async () => {
      hoisted.state.profileRows = [
        { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      ];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [{ totalExp: 999999999 }];

      const result = await getMypageDashboardData(userId);

      expect(result.totalExp).toBe(999999999);
    });

    it('handles totalExp of exactly 0 in the record', async () => {
      hoisted.state.profileRows = [
        { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      ];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [{ totalExp: 0 }];

      const result = await getMypageDashboardData(userId);

      expect(result.totalExp).toBe(0);
    });
  });

  describe('existing fields', () => {
    it('returns correct username, displayName, and avatarUrl from profile', async () => {
      hoisted.state.profileRows = [
        {
          username: 'chessmaster',
          displayName: 'Chess Master',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [{ totalExp: 100 }];

      const result = await getMypageDashboardData(userId);

      expect(result.username).toBe('chessmaster');
      expect(result.displayName).toBe('Chess Master');
      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('returns undefined username and null displayName/avatarUrl when no profile exists', async () => {
      hoisted.state.profileRows = [];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.username).toBeUndefined();
      expect(result.displayName).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it('returns null displayName when profile has null displayName', async () => {
      hoisted.state.profileRows = [{ username: 'testuser', displayName: null, avatarUrl: null }];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.displayName).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it('returns correct likesCount', async () => {
      hoisted.state.profileRows = [{ username: 'testuser', displayName: 'Test', avatarUrl: null }];
      hoisted.state.likesCountRows = [{ value: 42 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.likesCount).toBe(42);
    });

    it('returns 0 likesCount when likes query returns no rows', async () => {
      hoisted.state.profileRows = [{ username: 'testuser', displayName: 'Test', avatarUrl: null }];
      hoisted.state.likesCountRows = [];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.likesCount).toBe(0);
    });

    it('returns correct unansweredInterviewCount (total questions minus answered)', async () => {
      // INTERVIEW_QUESTION_KEYS has 1 item ('favorite_opening')
      hoisted.state.profileRows = [{ username: 'testuser', displayName: 'Test', avatarUrl: null }];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 0 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      // 1 question - 0 answered = 1 unanswered
      expect(result.unansweredInterviewCount).toBe(1);
    });

    it('returns 0 unansweredInterviewCount when all questions are answered', async () => {
      hoisted.state.profileRows = [{ username: 'testuser', displayName: 'Test', avatarUrl: null }];
      hoisted.state.likesCountRows = [{ value: 0 }];
      hoisted.state.answeredCountRows = [{ value: 1 }];
      hoisted.state.userExpRows = [];

      const result = await getMypageDashboardData(userId);

      expect(result.unansweredInterviewCount).toBe(0);
    });
  });

  describe('all fields together', () => {
    it('returns all fields correctly in a single call', async () => {
      hoisted.state.profileRows = [
        {
          username: 'grandmaster',
          displayName: 'Grand Master',
          avatarUrl: 'https://example.com/gm.jpg',
        },
      ];
      hoisted.state.likesCountRows = [{ value: 15 }];
      hoisted.state.answeredCountRows = [{ value: 1 }];
      hoisted.state.userExpRows = [{ totalExp: 5000 }];

      const result = await getMypageDashboardData(userId);

      expect(result).toEqual({
        username: 'grandmaster',
        displayName: 'Grand Master',
        avatarUrl: 'https://example.com/gm.jpg',
        likesCount: 15,
        unansweredInterviewCount: 0,
        totalExp: 5000,
        pointBalance: {
          total: 0,
          byCategory: { earned: 0, purchased: 0, promotional: 0 },
        },
      });
    });
  });
});
