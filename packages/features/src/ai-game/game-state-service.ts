import type { AlgebraicNotation, Side } from "@blindfold-chess/types";
// TODO: Replace direct chess.js import with chess-core module to align with
// the project's design principle of isolating chess.js behind a single API.
import { Chess } from "chess.js";

import type { GameStatus, PlayerResult } from "./types";

export class GameStateService {
  private chess: Chess;
  private playerSide: Side;
  private startingFen?: string;

  constructor(
    moves: AlgebraicNotation[] = [],
    playerSide: Side = "white",
    startingFen?: string,
  ) {
    this.chess = startingFen ? new Chess(startingFen) : new Chess();
    this.playerSide = playerSide;
    this.startingFen = startingFen;

    for (const move of moves) {
      try {
        const result = this.chess.move(move);
        if (!result) {
          break;
        }
      } catch {
        break;
      }
    }
  }

  getStartingFen(): string | undefined {
    return this.startingFen;
  }

  validateMove(move: AlgebraicNotation): boolean {
    try {
      const testChess = new Chess(this.chess.fen());
      const result = testChess.move(move);
      return result !== null;
    } catch {
      return false;
    }
  }

  makeMove(move: AlgebraicNotation): boolean {
    try {
      const result = this.chess.move(move);
      return result !== null;
    } catch {
      return false;
    }
  }

  isPlayerTurn(): boolean {
    const currentTurn = this.chess.turn();
    return (
      (this.playerSide === "white" && currentTurn === "w") ||
      (this.playerSide === "black" && currentTurn === "b")
    );
  }

  getGameStatus(): GameStatus {
    if (this.chess.isCheckmate()) {
      return "checkmate";
    } else if (this.chess.isStalemate()) {
      return "stalemate";
    } else if (this.chess.isDraw()) {
      return "draw";
    }
    return "in_progress";
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getLegalMoves(): AlgebraicNotation[] {
    return this.chess.moves() as AlgebraicNotation[];
  }

  getFen(): string {
    return this.chess.fen();
  }

  getCurrentTurn(): Side {
    return this.chess.turn() === "w" ? "white" : "black";
  }

  getPlayerResult(): PlayerResult | null {
    const status = this.getGameStatus();

    if (status === "draw" || status === "stalemate") {
      return "draw";
    }

    if (status === "checkmate") {
      return this.isPlayerTurn() ? "loss" : "win";
    }

    return null;
  }
}
