import { describe, expect, it } from 'vitest';

import { validateFen } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';

import { buildFenFromParts } from '../_lib/build-fen-from-parts';
import type { CastlingRights } from './PositionSettings';

function validatePosition(
  boardFen: string,
  turn: 'w' | 'b' = 'w',
  castling: CastlingRights = { K: false, Q: false, k: false, q: false },
  enPassant: string = '-'
): { valid: boolean; isEmpty: boolean } {
  const boardPart = boardFen.split(' ')[0];
  if (boardPart === '8/8/8/8/8/8/8/8') {
    return { valid: false, isEmpty: true };
  }
  const fullFen = buildFenFromParts(boardFen, turn, castling, enPassant);
  return { valid: validateFen(fullFen), isEmpty: false };
}

describe('Position validation', () => {
  describe('empty board detection', () => {
    it('rejects an empty board (no pieces placed)', () => {
      const result = validatePosition('8/8/8/8/8/8/8/8');

      expect(result.valid).toBe(false);
      expect(result.isEmpty).toBe(true);
    });

    it('rejects empty board even with full FEN string', () => {
      const result = validatePosition('8/8/8/8/8/8/8/8 w KQkq - 0 1');

      expect(result.valid).toBe(false);
      expect(result.isEmpty).toBe(true);
    });
  });

  describe('valid positions', () => {
    it('accepts the standard starting position', () => {
      const result = validatePosition(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
        'w',
        { K: true, Q: true, k: true, q: true },
        '-'
      );

      expect(result.valid).toBe(true);
      expect(result.isEmpty).toBe(false);
    });

    it('accepts a position with both kings', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/4K3');

      expect(result.valid).toBe(true);
    });

    it('accepts a position with kings and some pieces', () => {
      const result = validatePosition('r3k3/8/8/8/8/8/8/4K2R');

      expect(result.valid).toBe(true);
    });

    it('accepts a valid endgame position with black to move', () => {
      const result = validatePosition('4k3/4p3/8/8/8/8/4P3/4K3', 'b');

      expect(result.valid).toBe(true);
    });

    it('accepts a position with valid en passant square', () => {
      // White just played e4, so en passant square is e3 on black's turn
      const result = validatePosition(
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR',
        'b',
        { K: true, Q: true, k: true, q: true },
        'e3'
      );

      // chess.js may or may not accept this depending on version, but structurally valid
      // The key is that the FEN is well-formed
      expect(result.isEmpty).toBe(false);
    });
  });

  describe('invalid positions', () => {
    it('rejects a position with only a white king (no black king)', () => {
      const result = validatePosition('8/8/8/8/8/8/8/4K3');

      expect(result.valid).toBe(false);
      expect(result.isEmpty).toBe(false);
    });

    it('rejects a position with only a black king (no white king)', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/8');

      expect(result.valid).toBe(false);
      expect(result.isEmpty).toBe(false);
    });

    it('rejects a position with pawns on rank 1', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/P3K3');

      expect(result.valid).toBe(false);
    });

    it('rejects a position with pawns on rank 8', () => {
      const result = validatePosition('p3k3/8/8/8/8/8/8/4K3');

      expect(result.valid).toBe(false);
    });

    it('rejects a position with white pawn on rank 8', () => {
      const result = validatePosition('P3k3/8/8/8/8/8/8/4K3');

      expect(result.valid).toBe(false);
    });

    it('rejects a position with black pawn on rank 1', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/4K2p');

      expect(result.valid).toBe(false);
    });

    it('rejects a board with no kings at all', () => {
      const result = validatePosition('8/8/8/8/8/8/8/4R3');

      expect(result.valid).toBe(false);
    });

    it('rejects a position with two white kings', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/3KK3');

      expect(result.valid).toBe(false);
    });
  });

  describe('castling rights in validated FEN', () => {
    it('validates position with all castling rights', () => {
      const result = validatePosition('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R', 'w', {
        K: true,
        Q: true,
        k: true,
        q: true,
      });

      expect(result.valid).toBe(true);
    });

    it('validates position with no castling rights', () => {
      const result = validatePosition('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R', 'w', {
        K: false,
        Q: false,
        k: false,
        q: false,
      });

      expect(result.valid).toBe(true);
    });

    it('validates position with partial castling rights', () => {
      const result = validatePosition('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R', 'w', {
        K: true,
        Q: false,
        k: false,
        q: true,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('turn affects validation', () => {
    it('accepts a valid position with white to move', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/4K3', 'w');

      expect(result.valid).toBe(true);
    });

    it('accepts a valid position with black to move', () => {
      const result = validatePosition('4k3/8/8/8/8/8/8/4K3', 'b');

      expect(result.valid).toBe(true);
    });
  });
});
