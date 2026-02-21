import { describe, expect, it } from 'vitest';

import { validatePosition } from './validate-position';

describe('validatePosition', () => {
  describe('empty board', () => {
    it('returns errorKey positionEmpty for an empty board', () => {
      const result = validatePosition('8/8/8/8/8/8/8/8', '8/8/8/8/8/8/8/8 w - - 0 1');

      expect(result).toEqual({ valid: false, errorKey: 'positionEmpty' });
    });

    it('returns errorKey positionEmpty even when boardFen includes extra FEN parts', () => {
      const result = validatePosition(
        '8/8/8/8/8/8/8/8 w KQkq - 0 1',
        '8/8/8/8/8/8/8/8 w KQkq - 0 1'
      );

      expect(result).toEqual({ valid: false, errorKey: 'positionEmpty' });
    });
  });

  describe('insufficient material', () => {
    it('returns errorKey positionInsufficientMaterial for kings only', () => {
      const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/8/8/4K3', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInsufficientMaterial' });
    });
  });

  describe('valid positions', () => {
    it('accepts the standard starting position', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = validatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', fen);

      expect(result).toEqual({ valid: true });
    });

    it('accepts a valid position with pieces', () => {
      const fen = 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const result = validatePosition('r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR', fen);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('checkmate', () => {
    it('returns errorKey positionAlreadyCheckmate for a checkmate position', () => {
      // Scholar's mate: white queen on f7 checkmates black king
      const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
      const result = validatePosition('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionAlreadyCheckmate' });
    });
  });

  describe('stalemate', () => {
    it('returns errorKey positionAlreadyStalemate for a stalemate position', () => {
      // Black king on a8, white queen on b6, white king on c8 — black to move, stalemate
      const fen = 'k7/8/1Q6/8/8/8/8/2K5 b - - 0 1';
      const result = validatePosition('k7/8/1Q6/8/8/8/8/2K5', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionAlreadyStalemate' });
    });
  });

  describe('invalid position', () => {
    it('returns errorKey positionInvalid for a position with no kings', () => {
      const fen = '8/8/8/8/8/8/8/4R3 w - - 0 1';
      const result = validatePosition('8/8/8/8/8/8/8/4R3', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInvalid' });
    });
  });

  describe('check auto-correction', () => {
    it('corrects to black when white checks black king and white is set to move', () => {
      // White queen on e7 gives check to black king on e8 — should be black's turn
      const fen = '4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1';
      const result = validatePosition('4k3/4Q3/8/8/8/8/8/4K3', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBe('black');
    });

    it('corrects to white when black checks white king and black is set to move', () => {
      // Black queen on e2 gives check to white king on e1 — should be white's turn
      const fen = '4k3/8/8/8/8/8/4q3/4K3 b - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/8/4q3/4K3', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBe('white');
    });

    it('does not correct when black is in check and it is already black turn', () => {
      // White queen on e7, black king on e8 — black to move (correct, black is in check)
      const fen = '4k3/4Q3/8/8/8/8/8/4K3 b - - 0 1';
      const result = validatePosition('4k3/4Q3/8/8/8/8/8/4K3', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBeUndefined();
    });

    it('does not correct a position with no check regardless of turn', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const result = validatePosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBeUndefined();
    });

    it('returns checkmate when corrected position is checkmate', () => {
      // Scholar's mate but with wrong turn: white's turn instead of black's
      // After correction to black's turn, it's checkmate
      const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
      const result = validatePosition('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionAlreadyCheckmate' });
    });

    it('does not correct when white is in check and it is already white turn', () => {
      // Black rook on e8 checks white king on e1 — white to move (correct)
      const fen = 'k3r3/8/8/8/8/8/8/4K3 w - - 0 1';
      const result = validatePosition('k3r3/8/8/8/8/8/8/4K3', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBeUndefined();
    });

    it('corrects to white when black rook checks white king and black is set to move', () => {
      // Black rook on e8 checks white king on e1, but black to move (wrong turn)
      const fen = 'k3r3/8/8/8/8/8/8/4K3 b - - 0 1';
      const result = validatePosition('k3r3/8/8/8/8/8/8/4K3', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBe('white');
    });
  });

  describe('double check', () => {
    it('accepts a valid double check position with correct turn', () => {
      // White rook on e1 and bishop on b5 both check black king on e8 — black to move
      const fen = '4k3/8/8/1B6/8/8/8/4R1K1 b - - 0 1';
      const result = validatePosition('4k3/8/8/1B6/8/8/8/4R1K1', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBeUndefined();
    });

    it('corrects turn for double check position with wrong turn', () => {
      // White rook on e1 and bishop on b5 both check black king on e8, but white to move
      const fen = '4k3/8/8/1B6/8/8/8/4R1K1 w - - 0 1';
      const result = validatePosition('4k3/8/8/1B6/8/8/8/4R1K1', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBe('black');
    });

    it('returns checkmate when double check correction results in checkmate', () => {
      // White rook on e1 and queen on e7 double-check black king on e8, white to move
      // After correction to black's turn, it's checkmate
      const fen = '4k3/4Q3/8/8/8/8/8/4R1K1 w - - 0 1';
      const result = validatePosition('4k3/4Q3/8/8/8/8/8/4R1K1', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionAlreadyCheckmate' });
    });
  });

  describe('discovered check', () => {
    it('accepts a discovered check position with correct turn', () => {
      // White rook on e1 checks black king on e8 through e-file (bishop on d3 moved away)
      const fen = '4k3/8/8/8/8/3B4/8/4R1K1 b - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/3B4/8/4R1K1', fen);

      expect(result.valid).toBe(true);
      expect(result.correctedColor).toBeUndefined();
    });
  });

  describe('both kings in check', () => {
    it('returns positionInvalid when both kings are in check', () => {
      // White queen on d4 checks black king on h8 (diagonal), black bishop on b2 checks white king on a1
      // White to move: opponent (black) king is in check -> correction triggers
      const fen = '7k/8/8/8/3Q4/8/1b6/K7 w - - 0 1';
      const result = validatePosition('7k/8/8/8/3Q4/8/1b6/K7', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInvalid' });
    });
  });

  describe('invalid FEN', () => {
    it('returns positionInvalid for a position with only white king', () => {
      const fen = '8/8/8/8/8/8/8/4K3 w - - 0 1';
      const result = validatePosition('8/8/8/8/8/8/8/4K3', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInvalid' });
    });

    it('returns positionInvalid for a position with only black king', () => {
      const fen = '4k3/8/8/8/8/8/8/8 b - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/8/8/8', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInvalid' });
    });
  });

  describe('insufficient material after correction', () => {
    it('returns positionInsufficientMaterial when correction reveals insufficient material', () => {
      // White bishop on g6 checks black king on h7, white king on a1
      // White to move but opponent (black) is in check -> correction triggers
      // After flip: king + bishop vs king = insufficient material
      const fen = '8/7k/6B1/8/8/8/8/K7 w - - 0 1';
      const result = validatePosition('8/7k/6B1/8/8/8/8/K7', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInsufficientMaterial' });
    });
  });

  describe('insufficient material edge cases', () => {
    it('returns positionInsufficientMaterial for king and bishop vs king', () => {
      const fen = '4k3/8/8/8/8/8/8/4KB2 w - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/8/8/4KB2', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInsufficientMaterial' });
    });

    it('returns positionInsufficientMaterial for king and knight vs king', () => {
      const fen = '4k3/8/8/8/8/8/8/4KN2 w - - 0 1';
      const result = validatePosition('4k3/8/8/8/8/8/8/4KN2', fen);

      expect(result).toEqual({ valid: false, errorKey: 'positionInsufficientMaterial' });
    });
  });
});
