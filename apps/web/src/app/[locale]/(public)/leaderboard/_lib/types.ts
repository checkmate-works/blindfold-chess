import type { RankedLeaderboardRow } from '@/lib/db/challenge-queries';

export type LeaderboardPeriod = 'all-time' | 'weekly' | 'monthly';

export type LeaderboardModule = 'coordinate_quiz' | 'legal_moves' | 'square_colors';

export type LeaderboardModuleSlug = 'coordinate-quiz' | 'legal-moves' | 'square-colors';

export type LeaderboardRow = RankedLeaderboardRow;

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  totalCount: number;
  currentUserRank: LeaderboardRow | null;
};

export type LeaderboardEntry = {
  module: LeaderboardModule;
  key: string;
};

export type UserRankInfo = {
  module: LeaderboardModule;
  key: string;
  rank: number;
};

export const MODULES = [
  'coordinate_quiz',
  'legal_moves',
  'square_colors',
] as const satisfies readonly LeaderboardModule[];

export const MODULE_KEYS = {
  coordinate_quiz: ['white', 'black', 'random'],
  legal_moves: ['king', 'queen', 'rook', 'bishop', 'knight', 'random'],
  square_colors: ['default'],
} as const satisfies Record<LeaderboardModule, readonly string[]>;

export const VALID_PERIODS = [
  'all-time',
  'weekly',
  'monthly',
] as const satisfies readonly LeaderboardPeriod[];

export const PAGE_SIZE = 20;

export const TOP_RANK_THRESHOLD = 100;

/** All 10 leaderboard entries in display order */
export const ALL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = MODULES.flatMap((module) =>
  MODULE_KEYS[module].map((key) => ({ module, key }))
);

// ---------------------------------------------------------------------------
// URL slug <-> DB module name conversion
// ---------------------------------------------------------------------------

const MODULE_TO_SLUG: Record<LeaderboardModule, LeaderboardModuleSlug> = {
  coordinate_quiz: 'coordinate-quiz',
  legal_moves: 'legal-moves',
  square_colors: 'square-colors',
};

const SLUG_TO_MODULE: Record<LeaderboardModuleSlug, LeaderboardModule> = {
  'coordinate-quiz': 'coordinate_quiz',
  'legal-moves': 'legal_moves',
  'square-colors': 'square_colors',
};

export function moduleToSlug(module: LeaderboardModule): LeaderboardModuleSlug {
  return MODULE_TO_SLUG[module];
}

export function slugToModule(slug: string): LeaderboardModule | null {
  return (SLUG_TO_MODULE as Record<string, LeaderboardModule>)[slug] ?? null;
}

export function buildDetailPath(
  period: LeaderboardPeriod,
  module: LeaderboardModule,
  key: string
): string {
  return `/leaderboard/${period}/${moduleToSlug(module)}/${key}`;
}
