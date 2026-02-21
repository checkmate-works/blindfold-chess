import type { Side } from '@blindfold-chess/types';
import type { Color, Square } from 'chess.js';
import { Chess } from 'chess.js';

import { validateFen } from '@/app/[locale]/play/_lib/pgn-parser';

export type PositionValidationResult = {
  valid: boolean;
  errorKey?: string;
  correctedColor?: Side;
};

function findKingSquare(chess: Chess, color: Color): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

function isOpponentKingInCheck(chess: Chess): boolean {
  const turn = chess.turn();
  const opponentColor: Color = turn === 'w' ? 'b' : 'w';
  const kingSquare = findKingSquare(chess, opponentColor);
  if (!kingSquare) return false;
  return chess.isAttacked(kingSquare, turn);
}

function swapTurn(fen: string): string {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
}

export function validatePosition(boardFen: string, fullFen: string): PositionValidationResult {
  const boardPart = boardFen.split(' ')[0];
  if (boardPart === '8/8/8/8/8/8/8/8') {
    return { valid: false, errorKey: 'positionEmpty' };
  }

  if (!validateFen(fullFen)) {
    return { valid: false, errorKey: 'positionInvalid' };
  }

  let chess: Chess;
  try {
    chess = new Chess(fullFen);
  } catch {
    return { valid: false, errorKey: 'positionInvalid' };
  }

  // Check if the non-moving side's king is in check (invalid FEN state).
  // chess.js loads it but the position is illegal — the turn should be flipped.
  if (isOpponentKingInCheck(chess)) {
    const flippedFen = swapTurn(fullFen);
    try {
      const flippedChess = new Chess(flippedFen);
      // Both kings in check = illegal position (unreachable in a real game)
      if (isOpponentKingInCheck(flippedChess)) {
        return { valid: false, errorKey: 'positionInvalid' };
      }
      if (flippedChess.isCheckmate()) {
        return { valid: false, errorKey: 'positionAlreadyCheckmate' };
      }
      if (flippedChess.isStalemate()) {
        return { valid: false, errorKey: 'positionAlreadyStalemate' };
      }
      if (flippedChess.isInsufficientMaterial()) {
        return { valid: false, errorKey: 'positionInsufficientMaterial' };
      }
    } catch {
      return { valid: false, errorKey: 'positionInvalid' };
    }
    const turn = fullFen.split(' ')[1];
    const correctedColor: Side = turn === 'w' ? 'black' : 'white';
    return { valid: true, correctedColor };
  }

  if (chess.isCheckmate()) {
    return { valid: false, errorKey: 'positionAlreadyCheckmate' };
  }
  if (chess.isStalemate()) {
    return { valid: false, errorKey: 'positionAlreadyStalemate' };
  }
  if (chess.isInsufficientMaterial()) {
    return { valid: false, errorKey: 'positionInsufficientMaterial' };
  }

  return { valid: true };
}
