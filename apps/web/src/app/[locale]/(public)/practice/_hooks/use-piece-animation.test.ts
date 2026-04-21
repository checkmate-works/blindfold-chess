import { describe, expect, it } from 'vitest';

import { getSquarePixelOffset } from './use-piece-animation';

/**
 * Regression tests for the puzzle-result board flip bug (2026-04-20):
 * with `flipped=true`, `getSquarePosition` was returning the pixel offset of
 * the point-symmetric square (a1↔h8 rotation), so the replay animation on
 * black-side puzzles played the wrong move visually — e.g. the solution `Kf5`
 * was animated to where `c4` appears on the flipped board.
 */
describe('getSquarePixelOffset', () => {
  const BOARD_WIDTH = 800; // => squareSize = 100

  describe('flipped=false (White perspective)', () => {
    it('a8 is the top-left cell', () => {
      expect(getSquarePixelOffset('a8', BOARD_WIDTH, false)).toEqual({
        left: 0,
        top: 0,
      });
    });

    it('h1 is the bottom-right cell', () => {
      expect(getSquarePixelOffset('h1', BOARD_WIDTH, false)).toEqual({
        left: 700,
        top: 700,
      });
    });

    it('a1 is the bottom-left cell', () => {
      expect(getSquarePixelOffset('a1', BOARD_WIDTH, false)).toEqual({
        left: 0,
        top: 700,
      });
    });

    it('h8 is the top-right cell', () => {
      expect(getSquarePixelOffset('h8', BOARD_WIDTH, false)).toEqual({
        left: 700,
        top: 0,
      });
    });

    it('e4 is at column 4 (file e), row 4 (from top)', () => {
      expect(getSquarePixelOffset('e4', BOARD_WIDTH, false)).toEqual({
        left: 400,
        top: 400,
      });
    });

    it('f5 is at column 5 (file f), row 3 (from top)', () => {
      expect(getSquarePixelOffset('f5', BOARD_WIDTH, false)).toEqual({
        left: 500,
        top: 300,
      });
    });
  });

  describe('flipped=true (Black perspective)', () => {
    it('h1 is the top-left cell', () => {
      expect(getSquarePixelOffset('h1', BOARD_WIDTH, true)).toEqual({
        left: 0,
        top: 0,
      });
    });

    it('a8 is the bottom-right cell', () => {
      expect(getSquarePixelOffset('a8', BOARD_WIDTH, true)).toEqual({
        left: 700,
        top: 700,
      });
    });

    it('a1 is the top-right cell (flipped)', () => {
      expect(getSquarePixelOffset('a1', BOARD_WIDTH, true)).toEqual({
        left: 700,
        top: 0,
      });
    });

    it('h8 is the bottom-left cell (flipped)', () => {
      expect(getSquarePixelOffset('h8', BOARD_WIDTH, true)).toEqual({
        left: 0,
        top: 700,
      });
    });

    it('f5 lands at visual column 2, row 4 — NOT at the point-symmetric c4 cell', () => {
      // Regression: before the fix this returned {left: 500, top: 300},
      // which on a flipped board is the visual cell for c4.
      expect(getSquarePixelOffset('f5', BOARD_WIDTH, true)).toEqual({
        left: 200,
        top: 400,
      });
    });

    it('e4 lands at visual column 3, row 3', () => {
      expect(getSquarePixelOffset('e4', BOARD_WIDTH, true)).toEqual({
        left: 300,
        top: 300,
      });
    });
  });

  describe('specific bug repro: FEN "8/8/8/8/4kp1K/6pP/6P1/8 b" with Kf5', () => {
    // The reported bug: on a black-side puzzle, the correct move Kf5 was
    // animating to the square where c4 appears (the a1↔h8 point-symmetric
    // rotation). The fix ensures the target pixel cell is where f5 actually
    // is drawn on the flipped board — which, by the point-symmetric property,
    // must equal the pixel cell c4 occupies on the unflipped (white-side) board.
    it('flipped f5 pixel cell equals unflipped c4 pixel cell (point-symmetric pair)', () => {
      expect(getSquarePixelOffset('f5', BOARD_WIDTH, true)).toEqual(
        getSquarePixelOffset('c4', BOARD_WIDTH, false)
      );
    });

    it('flipped f5 pixel cell does NOT equal unflipped f5 pixel cell (sanity: orientations differ)', () => {
      expect(getSquarePixelOffset('f5', BOARD_WIDTH, true)).not.toEqual(
        getSquarePixelOffset('f5', BOARD_WIDTH, false)
      );
    });
  });

  it('point-symmetric invariant: flipped(sq) === non-flipped(mirrored sq)', () => {
    // For any square, drawing it on the flipped board at position P must
    // equal drawing its point-symmetric counterpart on the non-flipped
    // board at the same pixel P. This is what ensures the SAME visual
    // cell lights up regardless of orientation.
    const mirror = (sq: string): string => {
      const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parseInt(sq[1], 10) - 1;
      const mFile = String.fromCharCode('a'.charCodeAt(0) + (7 - file));
      const mRank = String(7 - rank + 1);
      return mFile + mRank;
    };

    for (const sq of ['a1', 'h8', 'e4', 'f5', 'd4', 'g2', 'b7']) {
      expect(getSquarePixelOffset(sq, BOARD_WIDTH, true)).toEqual(
        getSquarePixelOffset(mirror(sq), BOARD_WIDTH, false)
      );
    }
  });
});
