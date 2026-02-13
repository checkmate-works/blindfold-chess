import type { AlgebraicNotation } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

import type { ParsedMove, ParsedMoveSequence } from './types';

/**
 * Parse PGN move text into structured moves
 * Format: "1. Kb3 Kc5 2. Kc3 Kd5 3. Kd3 Ke5"
 */
export function parsePgnMoves(pgn: string): ParsedMove[] {
  const moves: ParsedMove[] = [];

  // Remove extra whitespace and normalize
  const normalized = pgn.trim().replace(/\s+/g, ' ');

  // Match move patterns: "1. e4 e5" or "1. e4" or "1... e5"
  // Pattern: move number, optional dot(s), white move (optional), black move (optional)
  const movePattern = /(\d+)\.\s*(\S+)?(?:\s+(\S+))?/g;

  let match;
  while ((match = movePattern.exec(normalized)) !== null) {
    const moveNumber = parseInt(match[1], 10);
    const firstMove = match[2] || null;
    const secondMove = match[3] || null;

    // Handle "1..." notation (black's move only)
    if (firstMove && firstMove.startsWith('.')) {
      moves.push({
        moveNumber,
        white: null,
        black: firstMove.replace(/^\.+/, '') as AlgebraicNotation,
      });
    } else {
      moves.push({
        moveNumber,
        white: firstMove as AlgebraicNotation | null,
        black: secondMove as AlgebraicNotation | null,
      });
    }
  }

  return moves;
}

/**
 * Convert parsed moves to a flat array of moves
 */
export function flattenMoves(parsedMoves: ParsedMove[]): AlgebraicNotation[] {
  const moves: AlgebraicNotation[] = [];

  for (const move of parsedMoves) {
    if (move.white) {
      moves.push(move.white);
    }
    if (move.black) {
      moves.push(move.black);
    }
  }

  return moves;
}

/**
 * Validate that all moves are legal from the given FEN
 */
export function validateMoves(
  fen: string,
  moves: AlgebraicNotation[]
): { valid: boolean; error?: string; validMoves: AlgebraicNotation[] } {
  try {
    const chess = new Chess(fen);
    const validMoves: AlgebraicNotation[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      try {
        const result = chess.move(move);
        if (!result) {
          return {
            valid: false,
            error: `Move ${i + 1} "${move}" is invalid`,
            validMoves,
          };
        }
        validMoves.push(move);
      } catch {
        return {
          valid: false,
          error: `Move ${i + 1} "${move}" is invalid`,
          validMoves,
        };
      }
    }

    return { valid: true, validMoves };
  } catch {
    return {
      valid: false,
      error: 'Invalid FEN position',
      validMoves: [],
    };
  }
}

/**
 * Parse and validate FEN and PGN, returning structured data
 */
export function parseMoveSequence(
  fen: string,
  pgn: string
): { success: true; data: ParsedMoveSequence } | { success: false; error: string } {
  // Validate FEN
  try {
    const chess = new Chess(fen);
    const turn = chess.turn(); // 'w' or 'b'

    // Parse PGN
    const parsedMoves = parsePgnMoves(pgn);
    if (parsedMoves.length === 0) {
      return { success: false, error: 'No moves found in PGN' };
    }

    // Flatten moves
    const moves = flattenMoves(parsedMoves);
    if (moves.length === 0) {
      return { success: false, error: 'No valid moves found in PGN' };
    }

    // Validate moves
    const validation = validateMoves(fen, moves);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid moves' };
    }

    return {
      success: true,
      data: {
        fen,
        moves: validation.validMoves,
        playerColor: turn,
      },
    };
  } catch {
    return { success: false, error: 'Invalid FEN position' };
  }
}

/**
 * Get the player's moves from the sequence (every other move based on color)
 */
export function getPlayerMoves(
  moves: AlgebraicNotation[],
  playerColor: 'w' | 'b'
): AlgebraicNotation[] {
  // If player is white, they play moves at indices 0, 2, 4, ...
  // If player is black, they play moves at indices 1, 3, 5, ...
  const startIndex = playerColor === 'w' ? 0 : 1;
  const playerMoves: AlgebraicNotation[] = [];

  for (let i = startIndex; i < moves.length; i += 2) {
    playerMoves.push(moves[i]);
  }

  return playerMoves;
}

/**
 * Get the FEN after applying a certain number of moves
 */
export function getFenAfterMoves(initialFen: string, moves: AlgebraicNotation[]): string {
  const chess = new Chess(initialFen);
  for (const move of moves) {
    chess.move(move);
  }
  return chess.fen();
}
