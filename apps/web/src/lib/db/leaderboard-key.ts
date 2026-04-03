import type { PracticeMenuType } from './practice-menu-types';

/**
 * Derives the leaderboard segmentation key from module settings.
 *
 * Each practice module segments its leaderboard by a specific setting:
 *
 * - coordinate_quiz: boardOrientation — 'white', 'black', or 'random'.
 *   'random' means the board orientation is randomly chosen (white or black)
 *   for each question within a single session.
 *
 * - legal_moves: selectedPiece — 'king', 'queen', 'rook', 'bishop', 'knight', or 'random'.
 *   'random' means all piece types are randomly chosen for each question
 *   within a single session.
 *
 * - square_colors: always 'default' — this module has no configurable
 *   variant, so all sessions share a single leaderboard.
 *
 * - diagonal_quiz: always 'default' — no configurable variant.
 *
 * - board_symmetry: always 'default' — no configurable variant.
 */
export function deriveLeaderboardKey(
  menuType: PracticeMenuType,
  settings: Record<string, unknown>
): string | null {
  switch (menuType) {
    case 'coordinate_quiz':
      return typeof settings.boardOrientation === 'string' ? settings.boardOrientation : null;
    case 'legal_moves':
      return typeof settings.selectedPiece === 'string' ? settings.selectedPiece : null;
    case 'square_colors':
      return 'default';
    case 'diagonal_quiz':
      return 'default';
    case 'board_symmetry':
      return 'default';
    case 'route_planner':
      return typeof settings.selectedPiece === 'string' ? settings.selectedPiece : null;
    default:
      return null;
  }
}
