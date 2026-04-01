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
import type { AchievementCriteria } from '../achievement-criteria-types';
import { CHALLENGE_MENU_TYPES, type ChallengeMenuType } from '../practice-menu-types';

// ---------------------------------------------------------------------------
// Leaderboard keys per challenge menu type
// (mirrors MODULE_KEYS from leaderboard/_lib/types.ts, kept here to avoid
//  importing from app-layer code into data-layer seed files)
// ---------------------------------------------------------------------------

export const LEADERBOARD_KEYS: Record<ChallengeMenuType, readonly string[]> = {
  coordinate_quiz: ['white', 'black', 'random'],
  legal_moves: ['king', 'queen', 'rook', 'bishop', 'knight', 'random'],
  square_colors: ['default'],
  diagonal_quiz: ['default'],
  board_symmetry: ['default'],
};

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
// Generate seed data
// ---------------------------------------------------------------------------

function generateMonthlyLeaderboardSeeds(): AchievementSeed[] {
  const seeds: AchievementSeed[] = [];
  let displayOrder = 0;

  for (const menuType of CHALLENGE_MENU_TYPES) {
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
