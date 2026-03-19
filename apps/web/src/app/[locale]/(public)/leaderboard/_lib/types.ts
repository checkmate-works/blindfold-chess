import type { RankedLeaderboardRow } from '@/lib/db/leaderboard-queries';

export type LeaderboardPeriod = 'all-time' | 'weekly' | 'monthly';

export type LeaderboardModule = 'coordinate_quiz' | 'legal_moves' | 'square_colors';

export type LeaderboardRow = RankedLeaderboardRow;

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  totalCount: number;
  currentUserRank: LeaderboardRow | null;
};

export const MODULES: LeaderboardModule[] = ['coordinate_quiz', 'legal_moves', 'square_colors'];

export const MODULE_KEYS: Record<LeaderboardModule, string[]> = {
  coordinate_quiz: ['white', 'black', 'random'],
  legal_moves: ['king', 'queen', 'rook', 'bishop', 'knight', 'random'],
  square_colors: ['default'],
};

export const VALID_PERIODS: LeaderboardPeriod[] = ['all-time', 'weekly', 'monthly'];

export const PAGE_SIZE = 20;
