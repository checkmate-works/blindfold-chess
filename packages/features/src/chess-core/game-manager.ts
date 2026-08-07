import type { AlgebraicNotation } from "@blindfold-chess/types";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Chess } from "chess.js";

import type { BoardPiece, MoveResult } from "./types";
import { asEngineSan, toMoveResult } from "./types";

export class ChessGameManager {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  move(move: string): MoveResult {
    return toMoveResult(this.chess.move(move));
  }

  undo(): void {
    this.chess.undo();
  }

  fen(): string {
    return this.chess.fen();
  }

  turn(): "w" | "b" {
    return this.chess.turn();
  }

  moves(): AlgebraicNotation[];
  moves(options: { verbose: true }): MoveResult[];
  moves(options: { verbose: false }): AlgebraicNotation[];
  moves(options?: { verbose?: boolean }): AlgebraicNotation[] | MoveResult[] {
    if (options?.verbose) {
      return this.chess.moves({ verbose: true }).map(toMoveResult);
    }
    return this.chess.moves().map(asEngineSan);
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  isDraw(): boolean {
    return this.chess.isDraw();
  }

  board(): BoardPiece[][] {
    return this.chess.board();
  }

  loadPgn(pgn: string): void {
    this.chess.loadPgn(pgn);
  }

  pgn(): string {
    return this.chess.pgn();
  }

  history(): AlgebraicNotation[];
  history(options: { verbose: true }): MoveResult[];
  history(options?: { verbose?: boolean }): AlgebraicNotation[] | MoveResult[] {
    if (options?.verbose) {
      return this.chess.history({ verbose: true }).map(toMoveResult);
    }
    return this.chess.history().map(asEngineSan);
  }

  header(): Record<string, string> {
    return this.chess.getHeaders();
  }

  clear(): void {
    this.chess.clear();
  }

  put(piece: { type: PieceSymbol; color: Color }, square: Square): void {
    this.chess.put(piece, square);
  }
}
