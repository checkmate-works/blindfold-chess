/**
 * Single source of truth for leaderboard keys per challenge menu type.
 *
 * Shared between the leaderboard UI (types.ts) and the achievement seed data
 * (achievements.ts). Previously duplicated in both locations.
 */
import { BOARD_ORIENTATIONS } from '@blindfold-chess/types';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

export const LEADERBOARD_KEYS = {
  // One leaderboard per orientation the quiz can be played in, so the list is
  // the orientations themselves rather than a copy that could drift from them.
  coordinate_quiz: BOARD_ORIENTATIONS,
  legal_moves: ['king', 'queen', 'rook', 'bishop', 'knight', 'random'],
  square_colors: ['default'],
  diagonal_quiz: ['default'],
  board_symmetry: ['default'],
  route_planner: ['knight', 'bishop'],
} as const satisfies Record<ChallengeMenuType, readonly string[]>;
