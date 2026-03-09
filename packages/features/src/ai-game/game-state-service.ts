import type { AlgebraicNotation, Side, Square } from "@blindfold-chess/types";

import { ChessGameManager } from "../chess-core/game-manager";

import type { GameStatus, PlayerResult } from "./types";

export interface GameState {
  status: GameStatus;
  playerResult: PlayerResult | null;
  isPlayerTurn: boolean;
  currentFen: string;
  isCheck: boolean;
  isGameOver: boolean;
  legalMoves: AlgebraicNotation[];
  currentTurn: Side;
  lastMoveDetails: { from: Square; to: Square } | null;
}

/**
 * Pure function to compute the derived game state from a sequence of moves.
 */
export function computeGameState(
  moves: AlgebraicNotation[] = [],
  playerSide: Side = "white",
  startingFen?: string,
): GameState {
  const manager = startingFen
    ? new ChessGameManager(startingFen)
    : new ChessGameManager();

  for (const move of moves) {
    try {
      manager.move(move);
    } catch {
      break;
    }
  }

  const currentTurn = manager.turn();
  const isPlayerTurn =
    (playerSide === "white" && currentTurn === "w") ||
    (playerSide === "black" && currentTurn === "b");

  let status: GameStatus = "in_progress";
  if (manager.isCheckmate()) {
    status = "checkmate";
  } else if (manager.isStalemate()) {
    status = "stalemate";
  } else if (manager.isDraw()) {
    status = "draw";
  }

  let playerResult: PlayerResult | null = null;
  if (status === "draw" || status === "stalemate") {
    playerResult = "draw";
  } else if (status === "checkmate") {
    playerResult = isPlayerTurn ? "loss" : "win";
  }

  const history = manager.history({ verbose: true });
  const lastMoveDetails =
    history.length > 0
      ? {
          from: history[history.length - 1].from,
          to: history[history.length - 1].to,
        }
      : null;

  return {
    status,
    playerResult,
    isPlayerTurn,
    currentFen: manager.fen(),
    isCheck: manager.isCheck(),
    isGameOver: manager.isGameOver(),
    legalMoves: manager.moves() as AlgebraicNotation[],
    currentTurn: currentTurn === "w" ? "white" : "black",
    lastMoveDetails,
  };
}

/**
 * Pure function to validate a candidate move given the previous moves sequence.
 */
export function validateGameMove(
  moves: AlgebraicNotation[],
  candidateMove: AlgebraicNotation,
  startingFen?: string,
): boolean {
  const manager = startingFen
    ? new ChessGameManager(startingFen)
    : new ChessGameManager();

  for (const move of moves) {
    try {
      manager.move(move);
    } catch {
      return false; // Invalid base sequence
    }
  }

  try {
    manager.move(candidateMove);
    return true;
  } catch {
    return false;
  }
}
