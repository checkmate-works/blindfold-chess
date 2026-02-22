import type { Color, PieceSymbol, Square } from "chess.js";
import { Chess } from "chess.js";

import type { BoardPiece, MoveResult } from "./types";

export class ChessGameManager {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  move(move: string): MoveResult {
    const result = this.chess.move(move);
    return {
      san: result.san,
      from: result.from,
      to: result.to,
      color: result.color,
      piece: result.piece,
      captured: result.captured,
      promotion: result.promotion,
      flags: result.flags,
      before: result.before,
      after: result.after,
    };
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

  moves(): string[];
  moves(options: { verbose: true }): MoveResult[];
  moves(options: { verbose: false }): string[];
  moves(options?: { verbose?: boolean }): string[] | MoveResult[] {
    if (options?.verbose) {
      return this.chess.moves({ verbose: true }).map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,
        piece: m.piece,
        captured: m.captured,
        promotion: m.promotion,
        flags: m.flags,
        before: m.before,
        after: m.after,
      }));
    }
    return this.chess.moves();
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

  history(): string[];
  history(options: { verbose: true }): MoveResult[];
  history(options?: { verbose?: boolean }): string[] | MoveResult[] {
    if (options?.verbose) {
      const moves = this.chess.history({ verbose: true });
      return moves.map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,
        piece: m.piece,
        captured: m.captured,
        promotion: m.promotion,
        flags: m.flags,
        before: m.before,
        after: m.after,
      }));
    }
    return this.chess.history();
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
