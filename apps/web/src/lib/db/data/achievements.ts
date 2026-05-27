/**
 * Achievement seed data — monthly leaderboard badges.
 *
 * Each entry defines a badge awarded to top-3 finishers in a monthly
 * leaderboard. Generated from all menu_type x leaderboard_key combinations
 * defined in the leaderboard system.
 *
 * These are repeatable achievements: a user can earn the same badge every
 * month they place in the top 3.
 */
import type { AchievementCriteria } from '@blindfold-chess/types';

import { LEADERBOARD_KEYS } from '@/lib/games/leaderboard-keys';

import { CHALLENGE_MENU_TYPES, type ChallengeMenuType } from '../practice-menu-types';

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------

const PLACEMENTS = [1, 2, 3] as const;
type Placement = (typeof PLACEMENTS)[number];

const PLACEMENT_SUFFIX: Record<Placement, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
};

const PLACEMENT_ICON: Record<Placement, string> = {
  1: 'trophy-gold',
  2: 'trophy-silver',
  3: 'trophy-bronze',
};

// ---------------------------------------------------------------------------
// Seed data type
// ---------------------------------------------------------------------------

type AchievementSeed = {
  slug: string;
  category: string;
  iconKey: string;
  criteria: AchievementCriteria;
  displayOrder: number;
  repeatable: boolean;
};

// ---------------------------------------------------------------------------
// Display order for monthly leaderboard achievements
// ---------------------------------------------------------------------------

/**
 * Display order for monthly leaderboard achievements.
 *
 * NOTE: This is intentionally hard-coded rather than derived from
 * CHALLENGE_MENU_TYPES so that the displayOrder remains stable when
 * the registry order changes. Existing prod DB rows are protected by
 * onConflictDoNothing(target: slug), but new environments (CI / local
 * fresh setups) would otherwise drift from prod.
 *
 * Order matches the pre-PRACTICE_MODULE_REGISTRY order of
 * CHALLENGE_MENU_TYPES (commit 4c4a651b~1).
 */
const ACHIEVEMENT_DISPLAY_ORDER: readonly ChallengeMenuType[] = [
  'square_colors',
  'legal_moves',
  'coordinate_quiz',
  'diagonal_quiz',
  'board_symmetry',
  'route_planner',
] as const;

// ---------------------------------------------------------------------------
// Generate seed data
// ---------------------------------------------------------------------------

function generateMonthlyLeaderboardSeeds(): AchievementSeed[] {
  // Compile-time guarantee: ACHIEVEMENT_DISPLAY_ORDER must contain the same
  // set as CHALLENGE_MENU_TYPES. This guards against silent drift if a new
  // challenge menu type is added to the registry without being added here.
  const expected: ReadonlySet<ChallengeMenuType> = new Set(ACHIEVEMENT_DISPLAY_ORDER);
  if (expected.size !== CHALLENGE_MENU_TYPES.length) {
    throw new Error('ACHIEVEMENT_DISPLAY_ORDER is out of sync with CHALLENGE_MENU_TYPES');
  }

  const seeds: AchievementSeed[] = [];
  let displayOrder = 0;

  for (const menuType of ACHIEVEMENT_DISPLAY_ORDER) {
    const keys = LEADERBOARD_KEYS[menuType];
    for (const leaderboardKey of keys) {
      for (const placement of PLACEMENTS) {
        displayOrder += 1;
        seeds.push({
          slug: `monthly-${menuType}-${leaderboardKey}-${PLACEMENT_SUFFIX[placement]}`,
          category: 'monthly_leaderboard',
          iconKey: PLACEMENT_ICON[placement],
          criteria: {
            category: 'monthly_leaderboard',
            menuType,
            leaderboardKey,
            placement,
          },
          displayOrder,
          repeatable: true,
        });
      }
    }
  }

  return seeds;
}

export const achievementsSeedData: AchievementSeed[] = generateMonthlyLeaderboardSeeds();
