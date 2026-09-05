import type { PracticeMenuType } from '@/lib/db/practice-menu-types';

/**
 * Emoji icons for each practice module.
 *
 * Single source of truth for practice module emojis.
 * Used across the practice list page, leaderboard module filter, and individual practice pages.
 *
 * Every entry is a colour emoji, not a text symbol. The set used to mix the
 * two — ♟️ for legal moves, ♞ for the knight's tour, ⚃ for quadrants — and
 * on the practice list, where thirteen of these sit in a column, the three
 * black-and-white glyphs read as a different kind of thing from the ten
 * pictures beside them. Those three are now a picture of what the module is
 * about: judging a move (⚖️), a horse on a tour (🐎), which region (🧭).
 */
export const PRACTICE_EMOJIS: Record<PracticeMenuType, string> = {
  coordinate_quiz: '🎯',
  legal_moves: '⚖️',
  square_colors: '🎨',
  diagonal_quiz: '↗️',
  board_symmetry: '🦋',
  route_planner: '📍',
  position_memory: '🧠',
  knight_tour: '🐎',
  algebraic_notation: '🔤',
  fen: '📝',
  quadrant_anchors: '🧭',
  puzzle: '🧩',
  recall: '🔁',
};
