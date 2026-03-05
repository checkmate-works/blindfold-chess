import { describe, expect, test } from 'vitest';

import { computeMoveNumber } from './compute-move-number';

describe('computeMoveNumber', () => {
  describe('when starting as white', () => {
    test('index=0, startMoveNumber=1 returns moveNumber=1, isWhiteMove=true', () => {
      const result = computeMoveNumber(0, false, 1);
      expect(result).toEqual({ moveNumber: 1, isWhiteMove: true });
    });

    test('index=1, startMoveNumber=1 returns moveNumber=1, isWhiteMove=false', () => {
      const result = computeMoveNumber(1, false, 1);
      expect(result).toEqual({ moveNumber: 1, isWhiteMove: false });
    });

    test('index=2, startMoveNumber=1 returns moveNumber=2, isWhiteMove=true', () => {
      const result = computeMoveNumber(2, false, 1);
      expect(result).toEqual({ moveNumber: 2, isWhiteMove: true });
    });

    test('index=3, startMoveNumber=1 returns moveNumber=2, isWhiteMove=false', () => {
      const result = computeMoveNumber(3, false, 1);
      expect(result).toEqual({ moveNumber: 2, isWhiteMove: false });
    });

    test('index=0, startMoveNumber=5 returns moveNumber=5, isWhiteMove=true', () => {
      const result = computeMoveNumber(0, false, 5);
      expect(result).toEqual({ moveNumber: 5, isWhiteMove: true });
    });

    test('index=1, startMoveNumber=5 returns moveNumber=5, isWhiteMove=false', () => {
      const result = computeMoveNumber(1, false, 5);
      expect(result).toEqual({ moveNumber: 5, isWhiteMove: false });
    });

    test('index=4, startMoveNumber=3 returns moveNumber=5, isWhiteMove=true', () => {
      const result = computeMoveNumber(4, false, 3);
      expect(result).toEqual({ moveNumber: 5, isWhiteMove: true });
    });

    test('alternates white/black correctly for consecutive indices', () => {
      const results = Array.from({ length: 6 }, (_, i) => computeMoveNumber(i, false, 1));
      expect(results.map((r) => r.isWhiteMove)).toEqual([true, false, true, false, true, false]);
      expect(results.map((r) => r.moveNumber)).toEqual([1, 1, 2, 2, 3, 3]);
    });
  });

  describe('when starting as black', () => {
    test('index=0, startMoveNumber=1 returns moveNumber=1, isWhiteMove=false', () => {
      const result = computeMoveNumber(0, true, 1);
      expect(result).toEqual({ moveNumber: 1, isWhiteMove: false });
    });

    test('index=1, startMoveNumber=1 returns moveNumber=2, isWhiteMove=true', () => {
      const result = computeMoveNumber(1, true, 1);
      expect(result).toEqual({ moveNumber: 2, isWhiteMove: true });
    });

    test('index=2, startMoveNumber=1 returns moveNumber=2, isWhiteMove=false', () => {
      const result = computeMoveNumber(2, true, 1);
      expect(result).toEqual({ moveNumber: 2, isWhiteMove: false });
    });

    test('index=3, startMoveNumber=1 returns moveNumber=3, isWhiteMove=true', () => {
      const result = computeMoveNumber(3, true, 1);
      expect(result).toEqual({ moveNumber: 3, isWhiteMove: true });
    });

    test('index=0, startMoveNumber=5 returns moveNumber=5, isWhiteMove=false', () => {
      const result = computeMoveNumber(0, true, 5);
      expect(result).toEqual({ moveNumber: 5, isWhiteMove: false });
    });

    test('index=1, startMoveNumber=5 returns moveNumber=6, isWhiteMove=true', () => {
      const result = computeMoveNumber(1, true, 5);
      expect(result).toEqual({ moveNumber: 6, isWhiteMove: true });
    });

    test('alternates black/white correctly for consecutive indices', () => {
      const results = Array.from({ length: 6 }, (_, i) => computeMoveNumber(i, true, 1));
      expect(results.map((r) => r.isWhiteMove)).toEqual([false, true, false, true, false, true]);
      expect(results.map((r) => r.moveNumber)).toEqual([1, 2, 2, 3, 3, 4]);
    });
  });

  describe('edge cases', () => {
    test('index=0 with startMoveNumber=0', () => {
      const result = computeMoveNumber(0, false, 0);
      expect(result).toEqual({ moveNumber: 0, isWhiteMove: true });
    });

    test('large index values', () => {
      const result = computeMoveNumber(100, false, 1);
      expect(result).toEqual({ moveNumber: 51, isWhiteMove: true });
    });

    test('large startMoveNumber', () => {
      const result = computeMoveNumber(0, false, 100);
      expect(result).toEqual({ moveNumber: 100, isWhiteMove: true });
    });
  });
});
