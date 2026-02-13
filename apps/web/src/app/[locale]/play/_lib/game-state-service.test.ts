import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it } from 'vitest';

import { GameStateService } from './game-state-service';

describe('GameStateService', () => {
  describe('constructor', () => {
    it('should initialize with standard starting position when no args', () => {
      const service = new GameStateService();
      expect(service.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should initialize with empty moves array', () => {
      const service = new GameStateService([]);
      expect(service.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should replay moves on initialization', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      expect(service.getCurrentTurn()).toBe('black');
      // After e4, e5, Nf3 - the FEN should show the knight on f3 and pawns on e4/e5
      expect(service.getFen()).toContain('5N2'); // Knight on f3 (rank 3)
    });

    it('should initialize with custom starting FEN', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const service = new GameStateService([], 'white', customFen);
      expect(service.getStartingFen()).toBe(customFen);
      // Verify the position matches what we set
      expect(service.getCurrentTurn()).toBe('black');
    });

    it('should handle invalid moves gracefully by stopping at invalid move', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'InvalidMove', 'Nf3'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      // Should have applied e4 and e5, then stopped at InvalidMove
      expect(service.getCurrentTurn()).toBe('white');
    });

    it('should return undefined for startingFen when using standard position', () => {
      const service = new GameStateService();
      expect(service.getStartingFen()).toBeUndefined();
    });
  });

  describe('validateMove', () => {
    it('should return true for legal moves', () => {
      const service = new GameStateService();
      expect(service.validateMove('e4' as AlgebraicNotation)).toBe(true);
      expect(service.validateMove('d4' as AlgebraicNotation)).toBe(true);
      expect(service.validateMove('Nf3' as AlgebraicNotation)).toBe(true);
    });

    it('should return false for illegal moves', () => {
      const service = new GameStateService();
      expect(service.validateMove('e5' as AlgebraicNotation)).toBe(false); // Can't move black pawn on white's turn
      expect(service.validateMove('Ke2' as AlgebraicNotation)).toBe(false); // Can't move king through pawn
      expect(service.validateMove('Qh5' as AlgebraicNotation)).toBe(false); // Can't move queen through pawns
    });

    it('should return false for invalid notation', () => {
      const service = new GameStateService();
      expect(service.validateMove('xyz' as AlgebraicNotation)).toBe(false);
      expect(service.validateMove('e9' as AlgebraicNotation)).toBe(false);
    });

    it('should not change game state when validating', () => {
      const service = new GameStateService();
      const fenBefore = service.getFen();
      service.validateMove('e4' as AlgebraicNotation);
      expect(service.getFen()).toBe(fenBefore);
    });
  });

  describe('makeMove', () => {
    it('should apply legal moves and return true', () => {
      const service = new GameStateService();
      expect(service.makeMove('e4' as AlgebraicNotation)).toBe(true);
      expect(service.getCurrentTurn()).toBe('black');
    });

    it('should reject illegal moves and return false', () => {
      const service = new GameStateService();
      expect(service.makeMove('e5' as AlgebraicNotation)).toBe(false);
      expect(service.getCurrentTurn()).toBe('white');
    });

    it('should update game state after successful move', () => {
      const service = new GameStateService();
      service.makeMove('e4' as AlgebraicNotation);
      const fen = service.getFen();
      expect(fen).toContain('4P3'); // e4 pawn on e4
    });
  });

  describe('isPlayerTurn', () => {
    it('should return true for white player on white turn', () => {
      const service = new GameStateService([], 'white');
      expect(service.isPlayerTurn()).toBe(true);
    });

    it('should return false for white player on black turn', () => {
      const service = new GameStateService(['e4'] as AlgebraicNotation[], 'white');
      expect(service.isPlayerTurn()).toBe(false);
    });

    it('should return true for black player on black turn', () => {
      const service = new GameStateService(['e4'] as AlgebraicNotation[], 'black');
      expect(service.isPlayerTurn()).toBe(true);
    });

    it('should return false for black player on white turn', () => {
      const service = new GameStateService([], 'black');
      expect(service.isPlayerTurn()).toBe(false);
    });

    it('should work correctly with custom FEN', () => {
      // FEN with black to move
      const fenBlackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const serviceWhite = new GameStateService([], 'white', fenBlackToMove);
      expect(serviceWhite.isPlayerTurn()).toBe(false);

      const serviceBlack = new GameStateService([], 'black', fenBlackToMove);
      expect(serviceBlack.isPlayerTurn()).toBe(true);
    });
  });

  describe('getGameStatus', () => {
    it('should return in_progress for new game', () => {
      const service = new GameStateService();
      expect(service.getGameStatus()).toBe('in_progress');
    });

    it('should return in_progress for ongoing game', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      expect(service.getGameStatus()).toBe('in_progress');
    });

    it('should return checkmate when king is mated', () => {
      // Fool's mate
      const moves: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      expect(service.getGameStatus()).toBe('checkmate');
    });

    it('should return stalemate when no legal moves but not in check', () => {
      // Classic stalemate: black king on h8, white king on h6, white queen on g6
      // Black king is trapped with no legal moves and not in check
      const stalemateFen = '7k/8/6QK/8/8/8/8/8 b - - 0 1';
      const service = new GameStateService([], 'white', stalemateFen);
      // Verify it's actually stalemate
      expect(service.getLegalMoves().length).toBe(0);
      expect(service.isCheck()).toBe(false);
      expect(service.getGameStatus()).toBe('stalemate');
    });

    it('should return draw for insufficient material', () => {
      // King vs King - this is detected as insufficient material by chess.js
      const drawFen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
      const service = new GameStateService([], 'white', drawFen);
      // chess.js detects insufficient material as draw
      expect(service.getGameStatus()).toBe('draw');
    });
  });

  describe('isCheck', () => {
    it('should return false when not in check', () => {
      const service = new GameStateService();
      expect(service.isCheck()).toBe(false);
    });

    it('should return true when in check', () => {
      // Simple check position: white queen checking black king
      const checkFen = 'rnbqkbnr/ppppp1pp/5p2/7Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
      const service = new GameStateService([], 'white', checkFen);
      expect(service.isCheck()).toBe(true);
    });
  });

  describe('isGameOver', () => {
    it('should return false for ongoing game', () => {
      const service = new GameStateService();
      expect(service.isGameOver()).toBe(false);
    });

    it('should return true for checkmate', () => {
      const moves: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      expect(service.isGameOver()).toBe(true);
    });

    it('should return true for stalemate', () => {
      // Use the same stalemate position as getGameStatus test
      const stalemateFen = '7k/8/6QK/8/8/8/8/8 b - - 0 1';
      const service = new GameStateService([], 'white', stalemateFen);
      expect(service.isGameOver()).toBe(true);
    });
  });

  describe('getLegalMoves', () => {
    it('should return all legal moves for starting position', () => {
      const service = new GameStateService();
      const legalMoves = service.getLegalMoves();
      expect(legalMoves.length).toBe(20); // 16 pawn moves + 4 knight moves
      expect(legalMoves).toContain('e4');
      expect(legalMoves).toContain('Nf3');
    });

    it('should return empty array for checkmate position', () => {
      const moves: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'] as AlgebraicNotation[];
      const service = new GameStateService(moves);
      expect(service.getLegalMoves().length).toBe(0);
    });
  });

  describe('getFen', () => {
    it('should return current FEN', () => {
      const service = new GameStateService();
      expect(service.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should return updated FEN after moves', () => {
      const service = new GameStateService(['e4'] as AlgebraicNotation[]);
      // After e4, black is to move and pawn is on e4
      expect(service.getFen()).toContain('4P3'); // e4 pawn
      expect(service.getCurrentTurn()).toBe('black');
    });
  });

  describe('getCurrentTurn', () => {
    it('should return white for new game', () => {
      const service = new GameStateService();
      expect(service.getCurrentTurn()).toBe('white');
    });

    it('should return black after white moves', () => {
      const service = new GameStateService(['e4'] as AlgebraicNotation[]);
      expect(service.getCurrentTurn()).toBe('black');
    });

    it('should return white after black moves', () => {
      const service = new GameStateService(['e4', 'e5'] as AlgebraicNotation[]);
      expect(service.getCurrentTurn()).toBe('white');
    });
  });

  describe('getPlayerResult', () => {
    it('should return null for in-progress game', () => {
      const service = new GameStateService();
      expect(service.getPlayerResult()).toBeNull();
    });

    it('should return loss for white player when white is checkmated', () => {
      // Fool's mate - white loses
      const moves: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'] as AlgebraicNotation[];
      const service = new GameStateService(moves, 'white');
      expect(service.getPlayerResult()).toBe('loss');
    });

    it('should return win for black player when white is checkmated', () => {
      // Fool's mate - black wins
      const moves: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'] as AlgebraicNotation[];
      const service = new GameStateService(moves, 'black');
      expect(service.getPlayerResult()).toBe('win');
    });

    it('should return win for white player when black is checkmated', () => {
      // Scholar's mate - white wins
      const moves: AlgebraicNotation[] = [
        'e4',
        'e5',
        'Bc4',
        'Nc6',
        'Qh5',
        'Nf6',
        'Qxf7#',
      ] as AlgebraicNotation[];
      const service = new GameStateService(moves, 'white');
      expect(service.getPlayerResult()).toBe('win');
    });

    it('should return loss for black player when black is checkmated', () => {
      // Scholar's mate - black loses
      const moves: AlgebraicNotation[] = [
        'e4',
        'e5',
        'Bc4',
        'Nc6',
        'Qh5',
        'Nf6',
        'Qxf7#',
      ] as AlgebraicNotation[];
      const service = new GameStateService(moves, 'black');
      expect(service.getPlayerResult()).toBe('loss');
    });

    it('should return draw for stalemate', () => {
      // Use the same stalemate position as getGameStatus test
      const stalemateFen = '7k/8/6QK/8/8/8/8/8 b - - 0 1';
      const service = new GameStateService([], 'white', stalemateFen);
      expect(service.getPlayerResult()).toBe('draw');
    });

    it('should return draw for insufficient material', () => {
      const drawFen = '8/8/8/4k3/8/8/8/4K3 w - - 0 1';
      const service = new GameStateService([], 'white', drawFen);
      expect(service.getPlayerResult()).toBe('draw');
    });
  });
});
