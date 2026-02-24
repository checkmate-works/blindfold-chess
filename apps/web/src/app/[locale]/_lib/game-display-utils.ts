import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { GameOutcome } from '@/lib/types';

export function getStatusStyles(status: GameOutcome): string {
  switch (status) {
    case 'win':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    case 'loss':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    case 'draw':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    default:
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  }
}

export function getStatusIcon(status: GameOutcome): string {
  switch (status) {
    case 'win':
      return '✓';
    case 'loss':
      return '✗';
    case 'draw':
      return '=';
    default:
      return '⏸';
  }
}

/**
 * Format the last move(s) for display in game list based on player color
 *
 * For white player:
 * - Last move is white: "4. Ng5" (white's move only)
 * - Last move is black: "3. Bc4 Nf6" (white-black pair)
 *
 * For black player:
 * - Last move is black: "3...Nf6" (black's move only)
 * - Last move is white: "3...Nf6 4. Ng5" (black's move + next white move)
 *
 * @param moves - Array of all moves in the game
 * @param playerColor - The color the player is playing as
 * @returns Formatted string of the last move(s)
 */
export function formatLastMove(moves: AlgebraicNotation[], playerColor: Side): string {
  if (moves.length === 0) {
    return '-';
  }

  const lastMove = moves[moves.length - 1];
  const lastMoveIsWhite = moves.length % 2 === 1;
  const lastMoveNumber = Math.ceil(moves.length / 2);

  if (playerColor === 'white') {
    // White player's perspective
    if (lastMoveIsWhite) {
      // Last move is white's: show only white's move
      return `${lastMoveNumber}. ${lastMove}`;
    } else {
      // Last move is black's: show white-black pair
      const whiteMove = moves[moves.length - 2];
      return `${lastMoveNumber}. ${whiteMove} ${lastMove}`;
    }
  } else {
    // Black player's perspective
    if (lastMoveIsWhite) {
      // Last move is white's: show previous black move + white move
      if (moves.length >= 2) {
        const blackMove = moves[moves.length - 2];
        const blackMoveNumber = Math.ceil((moves.length - 1) / 2);
        return `${blackMoveNumber}...${blackMove} ${lastMoveNumber}. ${lastMove}`;
      } else {
        // Only one move (white's first move)
        return `${lastMoveNumber}. ${lastMove}`;
      }
    } else {
      // Last move is black's: show only black's move
      return `${lastMoveNumber}...${lastMove}`;
    }
  }
}
