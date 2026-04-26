import type { Fen, UciMove } from '@blindfold-chess/types';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChessEngine } from './chess-engine';

describe('ChessEngine', () => {
  describe('convertUciToAlgebraic', () => {
    // We can test this method without initializing the Worker
    // because it only uses chess.js for conversion
    let engine: ChessEngine;

    // Create engine instance but don't trigger init. The convertUciToAlgebraic
    // method is a pure chess.js-backed transform; it does not touch the engine
    // channel, so the factory below is never actually invoked.
    beforeEach(() => {
      engine = new ChessEngine(() => {
        throw new Error('channel factory should not be called in convertUciToAlgebraic tests');
      });
    });

    const startingFen: Fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;

    describe('pawn moves', () => {
      it('should convert simple pawn advance', () => {
        const result = engine.convertUciToAlgebraic('e2e4' as UciMove, startingFen);
        expect(result).toBe('e4');
      });

      it('should convert pawn capture', () => {
        const fen: Fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2' as Fen;
        const result = engine.convertUciToAlgebraic('e4d5' as UciMove, fen);
        expect(result).toBe('exd5');
      });

      it('should convert pawn promotion', () => {
        // Position where promotion doesn't give check
        const fen: Fen = '8/P7/8/8/8/8/7k/4K3 w - - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('a7a8q' as UciMove, fen);
        expect(result).toBe('a8=Q');
      });

      it('should convert pawn capture with promotion', () => {
        const fen: Fen = '1n6/P7/8/8/8/8/8/4K2k w - - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('a7b8n' as UciMove, fen);
        expect(result).toBe('axb8=N');
      });
    });

    describe('piece moves', () => {
      it('should convert knight move', () => {
        const result = engine.convertUciToAlgebraic('g1f3' as UciMove, startingFen);
        expect(result).toBe('Nf3');
      });

      it('should convert bishop move', () => {
        const fen: Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' as Fen;
        const result = engine.convertUciToAlgebraic('f1c4' as UciMove, fen);
        expect(result).toBe('Bc4');
      });

      it('should convert rook move', () => {
        const fen: Fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('a1d1' as UciMove, fen);
        expect(result).toBe('Rd1');
      });

      it('should convert queen move', () => {
        const fen: Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' as Fen;
        const result = engine.convertUciToAlgebraic('d1h5' as UciMove, fen);
        expect(result).toBe('Qh5');
      });

      it('should convert king move', () => {
        const fen: Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' as Fen;
        const result = engine.convertUciToAlgebraic('e1e2' as UciMove, fen);
        expect(result).toBe('Ke2');
      });
    });

    describe('captures', () => {
      it('should convert piece capture', () => {
        const fen: Fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' as Fen;
        const result = engine.convertUciToAlgebraic('f3e5' as UciMove, fen);
        expect(result).toBe('Nxe5');
      });
    });

    describe('castling', () => {
      it('should convert kingside castling', () => {
        const fen: Fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('e1g1' as UciMove, fen);
        expect(result).toBe('O-O');
      });

      it('should convert queenside castling', () => {
        const fen: Fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('e1c1' as UciMove, fen);
        expect(result).toBe('O-O-O');
      });
    });

    describe('check and checkmate', () => {
      it('should convert move that gives check', () => {
        // Scholar's mate setup - queen checking from f7
        const fen: Fen =
          'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4' as Fen;
        const result = engine.convertUciToAlgebraic('f3f7' as UciMove, fen);
        expect(result).toBe('Qxf7#');
      });
    });

    describe('disambiguation', () => {
      it('should disambiguate by file when two knights can reach same square', () => {
        // Two knights on b1 and f1 that can both reach d2
        const fen: Fen = '6k1/8/8/8/8/8/8/KN3N2 w - - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('b1d2' as UciMove, fen);
        expect(result).toBe('Nbd2');
      });

      it('should disambiguate by rank when needed', () => {
        // Two rooks on same file, king away from check path
        const fen: Fen = 'R7/8/8/8/8/8/6k1/R3K3 w - - 0 1' as Fen;
        const result = engine.convertUciToAlgebraic('a1a4' as UciMove, fen);
        expect(result).toBe('R1a4');
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid UCI move', () => {
        expect(() => {
          engine.convertUciToAlgebraic('invalid' as UciMove, startingFen);
        }).toThrow('Invalid UCI move');
      });

      it('should throw error for illegal move', () => {
        expect(() => {
          engine.convertUciToAlgebraic('e1e8' as UciMove, startingFen);
        }).toThrow('Invalid UCI move');
      });
    });
  });
});
