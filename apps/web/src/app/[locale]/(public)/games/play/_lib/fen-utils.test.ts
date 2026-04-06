import { describe, expect, it } from 'vitest';

import { countPlayerMoves, parseFenMeta } from './fen-utils';

describe('parseFenMeta', () => {
  describe('startsAsBlack', () => {
    it('should return false for standard starting position (white to move)', () => {
      const result = parseFenMeta('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.startsAsBlack).toBe(false);
    });

    it('should return true when FEN has black to move', () => {
      const result = parseFenMeta('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(result.startsAsBlack).toBe(true);
    });

    it('should return false for undefined FEN', () => {
      const result = parseFenMeta(undefined);
      expect(result.startsAsBlack).toBe(false);
    });

    it('should return false for null FEN', () => {
      const result = parseFenMeta(null);
      expect(result.startsAsBlack).toBe(false);
    });
  });

  describe('startMoveNumber', () => {
    it('should return 1 for standard starting position', () => {
      const result = parseFenMeta('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.startMoveNumber).toBe(1);
    });

    it('should return the correct move number from FEN', () => {
      const result = parseFenMeta('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      expect(result.startMoveNumber).toBe(2);
    });

    it('should handle high move numbers', () => {
      const result = parseFenMeta('8/8/8/4k3/8/8/8/4K3 w - - 0 42');
      expect(result.startMoveNumber).toBe(42);
    });

    it('should return 1 for undefined FEN', () => {
      const result = parseFenMeta(undefined);
      expect(result.startMoveNumber).toBe(1);
    });

    it('should return 1 for null FEN', () => {
      const result = parseFenMeta(null);
      expect(result.startMoveNumber).toBe(1);
    });
  });

  describe('integration with color selection flow', () => {
    it('should identify white opening position (after 1.e4, black to move)', () => {
      // After 1.e4 — player as white, FEN shows black to move
      // startsAsBlack=true means the PGN continues from black's perspective
      const result = parseFenMeta('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(result.startsAsBlack).toBe(true);
      expect(result.startMoveNumber).toBe(1);
    });

    it('should identify black opening position (after 1.e4 e5, white to move)', () => {
      // After 1.e4 e5 — player as black, FEN shows white to move
      // startsAsBlack=false means the PGN continues from white's perspective
      const result = parseFenMeta('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      expect(result.startsAsBlack).toBe(false);
      expect(result.startMoveNumber).toBe(2);
    });
  });
});

describe('countPlayerMoves', () => {
  it('should count white moves in standard position', () => {
    // moves[0]=white, moves[1]=black, moves[2]=white, moves[3]=black
    expect(countPlayerMoves(3, 'white')).toBe(2); // indices 0, 2
  });

  it('should count black moves in standard position', () => {
    expect(countPlayerMoves(3, 'black')).toBe(2); // indices 1, 3
  });

  it('should count white moves up to index 0', () => {
    expect(countPlayerMoves(0, 'white')).toBe(1);
  });

  it('should count black moves up to index 0', () => {
    expect(countPlayerMoves(0, 'black')).toBe(0);
  });

  it('should handle black-to-move starting FEN for white player', () => {
    const blackStartFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    // In this FEN, black moves first: moves[0]=black, moves[1]=white, ...
    expect(countPlayerMoves(3, 'white', blackStartFen)).toBe(2); // indices 1, 3
  });

  it('should handle black-to-move starting FEN for black player', () => {
    const blackStartFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(countPlayerMoves(3, 'black', blackStartFen)).toBe(2); // indices 0, 2
  });

  it('should return 0 for negative index', () => {
    // upToIndex < 0 means no moves to count
    expect(countPlayerMoves(-1, 'white')).toBe(0);
  });
});
