import {
  generatePgn as chessCoreGeneratePgn,
  parsePgn as chessCoreParsePgn,
  parsePgnWithFen as chessCoreParsePgnWithFen,
  validateFen as chessCoreValidateFen,
  validatePgn as chessCoreValidatePgn,
  validatePgnWithDetails as chessCoreValidatePgnWithDetails,
  getStartingFen,
} from '@blindfold-chess/features/chess-core';

/**
 * Type representing a formatted PGN move pair
 */
export type FormattedPgnMove = {
  moveNumber: number;
  whiteMove?: string;
  whiteMoveIndex?: number;
  blackMove?: string;
  blackMoveIndex?: number;
};

/**
 * Type representing formatted PGN as an array of move pairs
 */
export type FormattedPgn = FormattedPgnMove[];

// Standard starting position FEN
export const STANDARD_START_FEN = getStartingFen();

export function validatePgn(pgn: string): boolean {
  return chessCoreValidatePgn(pgn);
}

export function parsePgn(pgn: string): string[] {
  return chessCoreParsePgn(pgn);
}

/**
 * Parse PGN and extract both moves and starting FEN (if present)
 * Returns the starting FEN from the PGN header, or undefined if using standard position
 */
export function parsePgnWithFen(pgn: string): { moves: string[]; startingFen?: string } {
  return chessCoreParsePgnWithFen(pgn);
}

/**
 * Validate FEN string
 */
export function validateFen(fen: string): boolean {
  return chessCoreValidateFen(fen);
}

export function generatePgn(moves: string[]): string {
  return chessCoreGeneratePgn(moves);
}

export function validatePgnWithDetails(pgn: string): {
  isValid: boolean;
  error?: string;
  moveCount?: number;
} {
  return chessCoreValidatePgnWithDetails(pgn);
}

/**
 * Format PGN moves array to text string
 * Converts formatted move pairs to standard PGN notation
 * Optionally includes FEN header for custom starting positions
 */
export function formatPgnToText(formattedPgn: FormattedPgn, startingFen?: string): string {
  const movesText = formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
      if (!move.whiteMove && move.blackMove) {
        return `${moveNumber}.. ${move.blackMove}`;
      }
      const movePair = move.blackMove
        ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
        : `${moveNumber} ${move.whiteMove}`;
      return movePair;
    })
    .join(' ');

  // Include FEN header if custom starting position is provided
  if (startingFen) {
    return `[SetUp "1"]\n[FEN "${startingFen}"]\n\n${movesText}`;
  }

  return movesText;
}

/**
 * Get PGN auto-completion suggestion based on current input
 * Returns the next move number only when both moves in a pair are complete
 * Uses pattern matching instead of parsing, so it works with any starting position
 */
export function getPgnSuggestion(pgn: string): string | null {
  if (!pgn) return '1. ';

  // Remove trailing whitespace for analysis
  const trimmed = pgn.trimEnd();
  if (!trimmed) return '1. ';

  // If input doesn't start with move number, suggest it
  if (!trimmed.match(/\d+\./)) {
    return '1. ';
  }

  // Pattern matching to find the last complete move pair
  // Match: "N. white black" where N is move number, white and black are moves
  const movePattern = /(\d+)\.\s*(\S+)(?:\s+(\S+))?/g;
  let lastMoveNumber = 0;
  let hasWhiteMove = false;
  let hasBlackMove = false;

  let match;
  while ((match = movePattern.exec(trimmed)) !== null) {
    lastMoveNumber = parseInt(match[1], 10);
    hasWhiteMove = !!match[2];
    hasBlackMove = !!match[3];
  }

  // Only suggest next move number when both white and black have played
  if (lastMoveNumber > 0 && hasWhiteMove && hasBlackMove) {
    return ` ${lastMoveNumber + 1}. `;
  }

  return null;
}
