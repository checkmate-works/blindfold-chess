/**
 * Challenge-related type definitions.
 *
 * These types define the menu types that support challenge mode (with leaderboard).
 * The CHALLENGE_MENU_TYPES list is the subset of practice modules that have
 * challenge mode and store results in the challenge_results table.
 */

// ---------------------------------------------------------------------------
// Practice Menu Type (all modules, used for leaderboard key derivation)
// ---------------------------------------------------------------------------

export const PRACTICE_MENU_TYPES = [
  'coordinate_quiz',
  'legal_moves',
  'square_colors',
  'board_symmetry',
  'route_planner',
  'diagonal_quiz',
  'position_memory',
  'knight_tour',
  'algebraic_notation',
  'fen',
  'quadrant_anchors',
  'puzzle',
] as const;

export type PracticeMenuType = (typeof PRACTICE_MENU_TYPES)[number];

// ---------------------------------------------------------------------------
// Challenge Menu Types (modules that support challenge mode + leaderboard)
// ---------------------------------------------------------------------------

export const CHALLENGE_MENU_TYPES = [
  'square_colors',
  'legal_moves',
  'coordinate_quiz',
  'diagonal_quiz',
  'board_symmetry',
  'route_planner',
] as const;

export type ChallengeMenuType = (typeof CHALLENGE_MENU_TYPES)[number];
