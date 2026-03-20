import {
  getAllTimeRanking,
  getMonthlyRanking,
  getUserAllTimeRank,
  getUserAllTimeRankedRow,
  getUserMonthlyRank,
  getUserMonthlyRankedRow,
  getUserWeeklyRank,
  getUserWeeklyRankedRow,
  getWeeklyRanking,
} from '@/lib/db/challenge-queries';
import type { LeaderboardPage, RankedLeaderboardRow } from '@/lib/db/challenge-queries';

import type { LeaderboardPeriod } from './types';

export type RankingFn = (
  menuType: string,
  leaderboardKey: string,
  offset: number,
  limit: number
) => Promise<LeaderboardPage>;

export type UserRankedRowFn = (
  userId: string,
  menuType: string,
  leaderboardKey: string
) => Promise<RankedLeaderboardRow | null>;

export type UserRankFn = (
  userId: string,
  menuType: string,
  leaderboardKey: string
) => Promise<{ rank: number } | null>;

type PeriodQueries = {
  getRanking: RankingFn;
  getUserRankedRow: UserRankedRowFn;
  getUserRank: UserRankFn;
};

const PERIOD_QUERIES: Record<LeaderboardPeriod, PeriodQueries> = {
  'all-time': {
    getRanking: getAllTimeRanking,
    getUserRankedRow: getUserAllTimeRankedRow,
    getUserRank: getUserAllTimeRank,
  },
  weekly: {
    getRanking: getWeeklyRanking,
    getUserRankedRow: getUserWeeklyRankedRow,
    getUserRank: getUserWeeklyRank,
  },
  monthly: {
    getRanking: getMonthlyRanking,
    getUserRankedRow: getUserMonthlyRankedRow,
    getUserRank: getUserMonthlyRank,
  },
};

export function getQueriesForPeriod(period: LeaderboardPeriod): PeriodQueries {
  return PERIOD_QUERIES[period];
}
