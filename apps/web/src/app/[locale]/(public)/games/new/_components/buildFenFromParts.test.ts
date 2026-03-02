import { describe, expect, it } from 'vitest';

import { buildFenFromParts } from '../_lib/build-fen-from-parts';

describe('buildFenFromParts', () => {
  const startingBoardPart = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const emptyBoard = '8/8/8/8/8/8/8/8';

  describe('basic FEN assembly', () => {
    it('assembles a correct FEN string from all parts', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('uses only the board part when given a full FEN string', () => {
      const fullFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = buildFenFromParts(
        fullFen,
        'b',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1');
    });

    it('works with an empty board', () => {
      const result = buildFenFromParts(
        emptyBoard,
        'w',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
    });
  });

  describe('turn handling', () => {
    it('sets white turn correctly', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toContain(' w ');
    });

    it('sets black turn correctly', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'b',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toContain(' b ');
    });
  });

  describe('castling rights', () => {
    it('outputs "KQkq" when all castling rights are enabled', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('outputs "-" when no castling rights are enabled', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
    });

    it('outputs only "K" for white kingside only', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toContain(' K ');
    });

    it('outputs only "Q" for white queenside only', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: true, k: false, q: false },
        '-'
      );
      expect(result).toContain(' Q ');
    });

    it('outputs only "k" for black kingside only', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: true, q: false },
        '-'
      );
      expect(result).toContain(' k ');
    });

    it('outputs only "q" for black queenside only', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: false, q: true },
        '-'
      );
      expect(result).toContain(' q ');
    });

    it('outputs "Kq" for white kingside and black queenside', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: false, k: false, q: true },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kq - 0 1');
    });

    it('outputs "Qk" for white queenside and black kingside', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: true, k: true, q: false },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Qk - 0 1');
    });

    it('outputs "KQ" for both white castling rights', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: true, k: false, q: false },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1');
    });

    it('outputs "kq" for both black castling rights', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: true, q: true },
        '-'
      );
      expect(result).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kq - 0 1');
    });

    it('maintains correct order (K, Q, k, q) regardless of input', () => {
      // Even if all are true, the order should always be KQkq
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );
      const castlingPart = result.split(' ')[2];
      expect(castlingPart).toBe('KQkq');
    });
  });

  describe('en passant handling', () => {
    it('sets en passant to "-" (none)', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      const enPassantPart = result.split(' ')[3];
      expect(enPassantPart).toBe('-');
    });

    it('sets en passant to a specific square for white turn (rank 6)', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: false, Q: false, k: false, q: false },
        'e6'
      );
      const enPassantPart = result.split(' ')[3];
      expect(enPassantPart).toBe('e6');
    });

    it('sets en passant to a specific square for black turn (rank 3)', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'b',
        { K: false, Q: false, k: false, q: false },
        'd3'
      );
      const enPassantPart = result.split(' ')[3];
      expect(enPassantPart).toBe('d3');
    });

    it('handles all files for en passant (a-h)', () => {
      for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        const result = buildFenFromParts(
          startingBoardPart,
          'w',
          { K: false, Q: false, k: false, q: false },
          `${file}6`
        );
        const enPassantPart = result.split(' ')[3];
        expect(enPassantPart).toBe(`${file}6`);
      }
    });
  });

  describe('half-move clock and full-move number', () => {
    it('always appends "0 1" for half-move clock and full-move number', () => {
      const result = buildFenFromParts(
        startingBoardPart,
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );
      const parts = result.split(' ');
      expect(parts[4]).toBe('0');
      expect(parts[5]).toBe('1');
    });
  });

  describe('realistic position FENs', () => {
    it('handles a mid-game position', () => {
      const midGameBoard = 'r1bqkb1r/pppppppp/2n2n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R';
      const result = buildFenFromParts(
        midGameBoard,
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );
      expect(result).toBe('r1bqkb1r/pppppppp/2n2n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1');
    });

    it('handles an endgame position with limited castling', () => {
      const endGameBoard = '8/8/4k3/8/8/4K3/8/8';
      const result = buildFenFromParts(
        endGameBoard,
        'b',
        { K: false, Q: false, k: false, q: false },
        '-'
      );
      expect(result).toBe('8/8/4k3/8/8/4K3/8/8 b - - 0 1');
    });
  });
});
