import { Chess } from 'chess.js';

export function validatePgn(pgn: string): boolean {
  if (!pgn.trim()) return false;

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return true;
  } catch {
    return false;
  }
}

export function parsePgn(pgn: string): string[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history();
  } catch {
    throw new Error('Invalid PGN format');
  }
}

export function generatePgn(moves: string[]): string {
  try {
    const chess = new Chess();
    for (const move of moves) {
      chess.move(move);
    }
    return chess.pgn();
  } catch {
    throw new Error('Invalid moves sequence');
  }
}

export function validatePgnWithDetails(pgn: string): {
  isValid: boolean;
  error?: string;
  moveCount?: number;
} {
  if (!pgn.trim()) {
    return { isValid: false, error: 'PGN cannot be empty' };
  }

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history();
    return {
      isValid: true,
      moveCount: history.length,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid PGN format',
    };
  }
}

/**
 * Format PGN moves array to text string
 * Converts formatted move pairs to standard PGN notation
 */
export function formatPgnToText(
  formattedPgn: { moveNumber: number; whiteMove: string; blackMove?: string }[]
): string {
  return formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
      const movePair = move.blackMove
        ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
        : `${moveNumber} ${move.whiteMove}`;
      return movePair;
    })
    .join(' ');
}

/**
 * Get PGN auto-completion suggestion based on current input
 * Returns the next move number only when both moves in a pair are complete
 * Does not suggest single spaces as they are easy to type manually
 * Only suggests when the current PGN is valid
 */
export function getPgnSuggestion(pgn: string): string | null {
  if (!pgn) return '1. ';

  // Remove trailing whitespace for analysis
  const trimmed = pgn.trimEnd();
  if (!trimmed) return '1. ';

  // Try to parse the PGN to get move count
  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const moveCount = chess.history().length;

    // Only suggest next move number when both white and black have played
    // moveCount % 2 === 0 means even number of moves (full move pair completed)
    if (moveCount > 0 && moveCount % 2 === 0) {
      // Even number of moves means black just played, suggest next move number
      const nextMoveNumber = Math.floor(moveCount / 2) + 1;
      return ` ${nextMoveNumber}. `;
    }
  } catch {
    // If parsing fails, the PGN is invalid, don't suggest anything
    // This prevents suggesting completion for invalid input like "1. d4 e"
  }

  // If no pattern detected and input doesn't start with move number, suggest it
  if (!trimmed.match(/\d+\./)) {
    return '1. ';
  }

  return null;
}
