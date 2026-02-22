import type { Color, Square } from "chess.js";
import { Chess } from "chess.js";

import { validateFen } from "./fen";

export function isCheckmate(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheckmate();
}

export function isStalemate(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isStalemate();
}

export function isCheck(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheck();
}

export function isDraw(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isDraw();
}

export function isInsufficientMaterial(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isInsufficientMaterial();
}

export function isGameOver(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isGameOver();
}

export function isSquareAttacked(
  fen: string,
  square: string,
  byColor: "w" | "b",
): boolean {
  const chess = new Chess(fen);
  return chess.isAttacked(square as Square, byColor);
}

export function findKingSquare(fen: string, color: "w" | "b"): string | null {
  const chess = new Chess(fen);
  return findKingSquareFromChess(chess, color);
}

// Ported from apps/web/src/app/[locale]/games/new/_lib/validate-position.ts
export function validatePosition(
  boardFen: string,
  fullFen: string,
): { valid: boolean; errorKey?: string; correctedColor?: string } {
  const boardPart = boardFen.split(" ")[0];
  if (boardPart === "8/8/8/8/8/8/8/8") {
    return { valid: false, errorKey: "positionEmpty" };
  }

  if (!validateFen(fullFen)) {
    return { valid: false, errorKey: "positionInvalid" };
  }

  let chess: Chess;
  try {
    chess = new Chess(fullFen);
  } catch {
    return { valid: false, errorKey: "positionInvalid" };
  }

  if (isOpponentKingInCheck(chess)) {
    const flippedFen = swapTurn(fullFen);
    try {
      const flippedChess = new Chess(flippedFen);
      if (isOpponentKingInCheck(flippedChess)) {
        return { valid: false, errorKey: "positionInvalid" };
      }
      if (flippedChess.isCheckmate()) {
        return { valid: false, errorKey: "positionAlreadyCheckmate" };
      }
      if (flippedChess.isStalemate()) {
        return { valid: false, errorKey: "positionAlreadyStalemate" };
      }
      if (flippedChess.isInsufficientMaterial()) {
        return { valid: false, errorKey: "positionInsufficientMaterial" };
      }
    } catch {
      return { valid: false, errorKey: "positionInvalid" };
    }
    const turn = fullFen.split(" ")[1];
    const correctedColor = turn === "w" ? "black" : "white";
    return { valid: true, correctedColor };
  }

  if (chess.isCheckmate()) {
    return { valid: false, errorKey: "positionAlreadyCheckmate" };
  }
  if (chess.isStalemate()) {
    return { valid: false, errorKey: "positionAlreadyStalemate" };
  }
  if (chess.isInsufficientMaterial()) {
    return { valid: false, errorKey: "positionInsufficientMaterial" };
  }

  return { valid: true };
}

function findKingSquareFromChess(chess: Chess, color: Color): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

function isOpponentKingInCheck(chess: Chess): boolean {
  const turn = chess.turn();
  const opponentColor: Color = turn === "w" ? "b" : "w";
  const kingSquare = findKingSquareFromChess(chess, opponentColor);
  if (!kingSquare) return false;
  return chess.isAttacked(kingSquare, turn);
}

function swapTurn(fen: string): string {
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  return parts.join(" ");
}
