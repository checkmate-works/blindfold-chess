import type { Side } from "@blindfold-chess/types";
import type { Color, Square } from "chess.js";
import { Chess } from "chess.js";

import { isBlackToMoveFromFen, validateFen } from "./fen";

export type PositionErrorKey =
  | "positionEmpty"
  | "positionInvalid"
  | "positionAlreadyCheckmate"
  | "positionAlreadyStalemate"
  | "positionInsufficientMaterial";

export type PositionValidation =
  /**
   * `correctedColor` is set when the position is only legal with the OTHER
   * side to move (the opponent king is attackable as given); the caller is
   * expected to flip the player color to it.
   */
  | { valid: true; correctedColor?: Side }
  | { valid: false; errorKey: PositionErrorKey };

/**
 * Whether a set-up position can start a game against the engine, as an i18n
 * error key on failure.
 *
 * `boardFen` is only checked for an empty board — the setup UI passes its
 * placement-only FEN there — and every other check runs on `fullFen`.
 *
 * When the side NOT to move is in check, the position is impossible as
 * given but legal with the other side to move; that case is valid with
 * `correctedColor`, and the game-over checks (mate, stalemate, insufficient
 * material) are run on the flipped position instead.
 */
export function validatePosition(
  boardFen: string,
  fullFen: string,
): PositionValidation {
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
    const correctedColor: Side = isBlackToMoveFromFen(fullFen)
      ? "white"
      : "black";
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
