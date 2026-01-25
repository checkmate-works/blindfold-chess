import { Chess } from 'chess.js';

// Standard starting position FEN
export const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

/**
 * Parse PGN and extract both moves and starting FEN (if present)
 * Returns the starting FEN from the PGN header, or undefined if using standard position
 */
export function parsePgnWithFen(pgn: string): { moves: string[]; startingFen?: string } {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const headers = chess.header();
    const startingFen = headers.FEN;

    // Only return startingFen if it's different from standard position
    const isCustomPosition = startingFen && startingFen !== STANDARD_START_FEN;

    return {
      moves: chess.history(),
      startingFen: isCustomPosition ? startingFen : undefined,
    };
  } catch {
    throw new Error('Invalid PGN format');
  }
}

/**
 * Validate FEN string
 */
export function validateFen(fen: string): boolean {
  if (!fen.trim()) return false;

  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
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
 * Optionally includes FEN header for custom starting positions
 */
export function formatPgnToText(
  formattedPgn: { moveNumber: number; whiteMove: string; blackMove?: string }[],
  startingFen?: string
): string {
  const movesText = formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
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
