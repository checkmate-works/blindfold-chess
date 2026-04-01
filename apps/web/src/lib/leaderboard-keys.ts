/**
 * Single source of truth for leaderboard keys per challenge menu type.
 *
 * Shared between the leaderboard UI (types.ts) and the achievement seed data
 * (achievements.ts). Previously duplicated in both locations.
 */
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';

export const LEADERBOARD_KEYS = {
  coordinate_quiz: ['white', 'black', 'random'],
  legal_moves: ['king', 'queen', 'rook', 'bishop', 'knight', 'random'],
  square_colors: ['default'],
  diagonal_quiz: ['default'],
  board_symmetry: ['default'],
} as const satisfies Record<ChallengeMenuType, readonly string[]>;
