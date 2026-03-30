import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';

import type { RequirementItem } from '../_components/RequirementsList';

export type RankCardState = 'achieved' | 'next' | 'locked' | 'coming-soon';

export function buildChallengeNameKey(req: ChallengeScoreRequirement): string {
  if (req.leaderboardKey === 'default') {
    return req.menuType;
  }
  return `${req.menuType}_${req.leaderboardKey}`;
}

/**
 * Convert a challenge menuType (snake_case) to a practice route slug (kebab-case).
 *
 * Assumes that the resulting slug corresponds to an existing practice route
 * (e.g. `square_colors` → `/practice/square-colors`).
 */
export function menuTypeToPracticeSlug(menuType: string): string {
  return menuType.replace(/_/g, '-');
}

/**
 * Build RequirementItem[] from rank requirements for use with RequirementsList.
 *
 * Shared by rank detail page and guide last page to avoid duplicating the
 * label formatting and href construction logic.
 */
export function buildRequirementItems(
  requirements: ChallengeScoreRequirement[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): RequirementItem[] {
  return requirements.map((req) => {
    const challengeKey = buildChallengeNameKey(req);
    return {
      label: t('challengeScore', {
        minScore: req.minScore,
        challengeName: t(`challengeNames.${challengeKey}`),
      }),
      href: `/${locale}/practice/${menuTypeToPracticeSlug(req.menuType)}`,
    };
  });
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
