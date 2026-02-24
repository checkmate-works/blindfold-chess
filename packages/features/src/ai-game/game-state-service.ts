import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

import { ChessGameManager } from "../chess-core/game-manager";
import type { Square } from "../chess-core/types";

import type { GameStatus, PlayerResult } from "./types";

export class GameStateService {
  private manager: ChessGameManager;
  private playerSide: Side;
  private startingFen?: string;

  constructor(
    moves: AlgebraicNotation[] = [],
    playerSide: Side = "white",
    startingFen?: string,
  ) {
    this.manager = startingFen
      ? new ChessGameManager(startingFen)
      : new ChessGameManager();
    this.playerSide = playerSide;
    this.startingFen = startingFen;

    for (const move of moves) {
      try {
        this.manager.move(move);
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
      const testManager = new ChessGameManager(this.manager.fen());
      testManager.move(move);
      return true;
    } catch {
      return false;
    }
  }

  makeMove(move: AlgebraicNotation): boolean {
    try {
      this.manager.move(move);
      return true;
    } catch {
      return false;
    }
  }

  isPlayerTurn(): boolean {
    const currentTurn = this.manager.turn();
    return (
      (this.playerSide === "white" && currentTurn === "w") ||
      (this.playerSide === "black" && currentTurn === "b")
    );
  }

  getGameStatus(): GameStatus {
    if (this.manager.isCheckmate()) {
      return "checkmate";
    } else if (this.manager.isStalemate()) {
      return "stalemate";
    } else if (this.manager.isDraw()) {
      return "draw";
    }
    return "in_progress";
  }

  isCheck(): boolean {
    return this.manager.isCheck();
  }

  isGameOver(): boolean {
    return this.manager.isGameOver();
  }

  getLegalMoves(): AlgebraicNotation[] {
    return this.manager.moves() as AlgebraicNotation[];
  }

  getFen(): string {
    return this.manager.fen();
  }

  getCurrentTurn(): Side {
    return this.manager.turn() === "w" ? "white" : "black";
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

  getLastMoveDetails(): { from: Square; to: Square } | null {
    const history = this.manager.history({ verbose: true });
    if (history.length === 0) return null;
    const lastMove = history[history.length - 1];
    return { from: lastMove.from, to: lastMove.to };
  }
}
