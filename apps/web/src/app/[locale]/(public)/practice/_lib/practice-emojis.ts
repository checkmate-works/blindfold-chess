import type { PracticeMenuType } from '@/lib/db/practice-menu-types';

/**
 * Emoji icons for each practice module.
 *
 * Single source of truth for practice module emojis.
 * Used across the practice list page, leaderboard module filter, and individual practice pages.
 */
export const PRACTICE_EMOJIS: Record<PracticeMenuType, string> = {
  coordinate_quiz: '🎯',
  legal_moves: '♟️',
  square_colors: '🎨',
  diagonal_quiz: '↗️',
  board_symmetry: '🦋',
  route_planner: '📍',
  position_memory: '🧠',
  knight_tour: '♞',
  move_sequence: '🥋',
  algebraic_notation: '🔤',
  fen: '📝',
  quadrant_anchors: '⚃',
};
