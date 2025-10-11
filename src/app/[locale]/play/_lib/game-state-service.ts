import { Chess } from 'chess.js';

import type { AlgebraicNotation, Side } from '@/lib/types';

export type GameStatus = 'in_progress' | 'checkmate' | 'stalemate' | 'draw';

export class GameStateService {
  private chess: Chess;
  private playerSide: Side;

  constructor(moves: AlgebraicNotation[] = [], playerSide: Side = 'white') {
    this.chess = new Chess();
    this.playerSide = playerSide;

    // Replay all moves to get current position
    for (const move of moves) {
      try {
        const result = this.chess.move(move);
        if (!result) {
          console.warn(`Invalid move skipped in GameStateService: ${move}`);
          break;
        }
      } catch (error) {
        console.warn(`Error processing move in GameStateService: ${move}`, error);
        break;
      }
    }
  }

  validateMove(move: AlgebraicNotation): boolean {
    try {
      // Test the move without actually making it
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
      (this.playerSide === 'white' && currentTurn === 'w') ||
      (this.playerSide === 'black' && currentTurn === 'b')
    );
  }

  getGameStatus(): GameStatus {
    if (this.chess.isCheckmate()) {
      return 'checkmate';
    } else if (this.chess.isStalemate()) {
      return 'stalemate';
    } else if (this.chess.isDraw()) {
      return 'draw';
    }
    return 'in_progress';
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

  getCurrentTurn(): 'white' | 'black' {
    return this.chess.turn() === 'w' ? 'white' : 'black';
  }

  // Determine win/loss/draw from player's perspective
  getPlayerResult(): 'win' | 'loss' | 'draw' | null {
    const status = this.getGameStatus();

    if (status === 'draw' || status === 'stalemate') {
      return 'draw';
    }

    if (status === 'checkmate') {
      // If it's player's turn and checkmate, player loses
      // If it's opponent's turn and checkmate, player wins
      return this.isPlayerTurn() ? 'loss' : 'win';
    }

    return null;
  }
}
