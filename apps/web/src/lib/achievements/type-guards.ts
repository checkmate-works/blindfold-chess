import type { AchievementCriteria } from '@blindfold-chess/types';

// ---------------------------------------------------------------------------
// Monthly leaderboard metadata (stored in user_achievements.metadata)
// ---------------------------------------------------------------------------

export type MonthlyLeaderboardMetadata = {
  year: number;
  month: number;
  score?: number;
  placement?: number;
};

export function isMonthlyMetadata(metadata: unknown): metadata is MonthlyLeaderboardMetadata {
  if (typeof metadata !== 'object' || metadata === null) return false;
  const m = metadata as Record<string, unknown>;
  return typeof m.year === 'number' && typeof m.month === 'number';
}

// ---------------------------------------------------------------------------
// Monthly leaderboard criteria (stored in achievements.criteria)
// ---------------------------------------------------------------------------

export function isMonthlyLeaderboardCriteria(
  criteria: unknown
): criteria is Extract<AchievementCriteria, { category: 'monthly_leaderboard' }> {
  return (
    typeof criteria === 'object' &&
    criteria !== null &&
    'category' in criteria &&
    (criteria as Record<string, unknown>).category === 'monthly_leaderboard' &&
    'menuType' in criteria &&
    'leaderboardKey' in criteria &&
    'placement' in criteria
  );
}
