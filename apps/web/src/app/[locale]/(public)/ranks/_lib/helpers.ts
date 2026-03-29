import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';

export type RankCardState = 'achieved' | 'next' | 'locked' | 'coming-soon';

export function buildChallengeNameKey(req: ChallengeScoreRequirement): string {
  if (req.leaderboardKey === 'default') {
    return req.menuType;
  }
  return `${req.menuType}_${req.leaderboardKey}`;
}

export function getBeltColorHex(slug: RankSlug): string {
  const colorName = RANK_COLORS[slug];
  return BELT_COLOR_HEX[colorName] ?? '#6b7280';
}

export function getRankCardState(
  inDb: boolean,
  requirements: ChallengeScoreRequirement[],
  isAchieved: boolean,
  previousAchieved: boolean,
  isLoggedIn: boolean,
  isFirstRank: boolean
): RankCardState {
  // Not in DB = Coming Soon
  if (!inDb) return 'coming-soon';

  // Has empty requirements = coming soon (conditions not yet defined)
  if (requirements.length === 0) return 'coming-soon';

  // Logged in: check achievement
  if (isLoggedIn) {
    if (isAchieved) return 'achieved';
    if (isFirstRank || previousAchieved) return 'next';
    return 'locked';
  }

  // Not logged in: first rank is visible, rest are locked
  if (isFirstRank) return 'next';
  return 'locked';
}
