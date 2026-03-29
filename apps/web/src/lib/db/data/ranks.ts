/**
 * Rank (級・段位) seed data.
 *
 * Each entry defines a rank in the belt system. Requirements are expressed
 * as an array of conditions that must ALL be met (implicit AND).
 *
 * Requirement types:
 * - challenge_score: user's best score in a specific challenge must meet minScore.
 *   menuType / leaderboardKey correspond to challenge_results columns.
 *
 * Level values use gaps (10, 20, ...) to allow future intermediate ranks
 * without renumbering.
 */

export type ChallengeScoreRequirement = {
  type: 'challenge_score';
  menuType: string;
  leaderboardKey: string;
  minScore: number;
};

export type RankRequirement = ChallengeScoreRequirement;

type RankSeed = {
  slug: string;
  level: number;
  color: string;
  requirements: RankRequirement[];
};

/**
 * All rank slugs in progression order (lowest to highest).
 * Used by the ranks page to determine which ranks are "Coming Soon".
 */
export const ALL_RANK_SLUGS = ['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan'] as const;

export type RankSlug = (typeof ALL_RANK_SLUGS)[number];

/** Belt colors for each rank. */
export const RANK_COLORS: Record<RankSlug, string> = {
  '5kyu': 'orange',
  '4kyu': 'blue',
  '3kyu': 'yellow',
  '2kyu': 'green',
  '1kyu': 'brown',
  '1dan': 'black',
};

export const ranksSeedData: RankSeed[] = [
  {
    slug: '5kyu',
    level: 10,
    color: RANK_COLORS['5kyu'],
    requirements: [
      {
        type: 'challenge_score',
        menuType: 'square_colors',
        leaderboardKey: 'default',
        minScore: 15,
      },
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ],
  },
  { slug: '4kyu', level: 20, color: RANK_COLORS['4kyu'], requirements: [] },
  { slug: '3kyu', level: 30, color: RANK_COLORS['3kyu'], requirements: [] },
  { slug: '2kyu', level: 40, color: RANK_COLORS['2kyu'], requirements: [] },
  { slug: '1kyu', level: 50, color: RANK_COLORS['1kyu'], requirements: [] },
  // Gap between 1kyu (50) and 1dan (110) is intentionally large to reserve
  // space for future intermediate ranks between kyū and dan tiers.
  { slug: '1dan', level: 110, color: RANK_COLORS['1dan'], requirements: [] },
];
