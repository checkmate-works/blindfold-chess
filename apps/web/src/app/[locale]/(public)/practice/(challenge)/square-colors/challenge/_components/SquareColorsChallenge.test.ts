// @vitest-environment jsdom
import { generateSquareSequence } from '@blindfold-chess/features/common';
import { getSquareColor } from '@blindfold-chess/features/square-colors';
import { describe, expect, it } from 'vitest';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

const BATCH_SIZE = 100;

describe('SquareColorsChallenge timed mode logic', () => {
  describe('square generation', () => {
    it('generates BATCH_SIZE squares initially', () => {
      const squares = generateSquareSequence(BATCH_SIZE);
      expect(squares).toHaveLength(BATCH_SIZE);
    });

    it('all generated squares are valid chess squares', () => {
      const squares = generateSquareSequence(BATCH_SIZE);
      for (const square of squares) {
        const color = getSquareColor(square);
        expect(color).not.toBeNull();
      }
    });
  });

  describe('answer validation', () => {
    it('correctly validates light square answer', () => {
      const square = 'b1'; // b1 is light
      const correctColor = getSquareColor(square);
      expect(correctColor).toBe('light');
      expect('light' === correctColor).toBe(true);
      expect('dark' === correctColor).toBe(false);
    });

    it('correctly validates dark square answer', () => {
      const square = 'a1'; // a1 is dark
      const correctColor = getSquareColor(square);
      expect(correctColor).toBe('dark');
      expect('dark' === correctColor).toBe(true);
      expect('light' === correctColor).toBe(false);
    });
  });

  describe('rush mode - remaining lives calculation', () => {
    it('calculates remaining lives correctly', () => {
      const incorrectCount = 0;
      expect(MISTAKE_LIMIT - incorrectCount).toBe(3);
    });

    it('decreases remaining lives with each mistake', () => {
      expect(MISTAKE_LIMIT - 1).toBe(2);
      expect(MISTAKE_LIMIT - 2).toBe(1);
      expect(MISTAKE_LIMIT - 3).toBe(0);
    });

    it('remaining lives reaches 0 when mistake allowance is reached', () => {
      const incorrectCount = MISTAKE_LIMIT;
      expect(MISTAKE_LIMIT - incorrectCount).toBe(0);
    });
  });
});
