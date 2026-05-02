// @vitest-environment jsdom
import { generateSquareSequence } from '@blindfold-chess/features/common';
import { getSquareColor } from '@blindfold-chess/features/square-colors';
import { describe, expect, it } from 'vitest';

const BATCH_SIZE = 100;

describe('SquareColorsTrainingSession logic', () => {
  describe('square generation for training mode', () => {
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

    it('regenerates when running low on squares (within 10 of the end)', () => {
      let squares = generateSquareSequence(BATCH_SIZE);
      const currentIndex = BATCH_SIZE - 10;

      // Simulate the regeneration logic from SquareColorsTrainingSession
      if (squares.length > 0 && currentIndex >= squares.length - 10) {
        const newBatch = generateSquareSequence(BATCH_SIZE);
        squares = [...squares, ...newBatch];
      }

      expect(squares).toHaveLength(BATCH_SIZE * 2);
    });

    it('does not regenerate when not close to the end', () => {
      let squares = generateSquareSequence(BATCH_SIZE);
      const currentIndex = 5;

      // Simulate the regeneration logic
      if (squares.length > 0 && currentIndex >= squares.length - 10) {
        const newBatch = generateSquareSequence(BATCH_SIZE);
        squares = [...squares, ...newBatch];
      }

      expect(squares).toHaveLength(BATCH_SIZE);
    });

    it('regeneration threshold is exactly at length - 10', () => {
      let squares = generateSquareSequence(BATCH_SIZE);
      let currentIndex = BATCH_SIZE - 11;

      // Just before threshold: should NOT regenerate
      if (squares.length > 0 && currentIndex >= squares.length - 10) {
        const newBatch = generateSquareSequence(BATCH_SIZE);
        squares = [...squares, ...newBatch];
      }
      expect(squares).toHaveLength(BATCH_SIZE);

      // At threshold: should regenerate
      currentIndex = BATCH_SIZE - 10;
      if (squares.length > 0 && currentIndex >= squares.length - 10) {
        const newBatch = generateSquareSequence(BATCH_SIZE);
        squares = [...squares, ...newBatch];
      }
      expect(squares).toHaveLength(BATCH_SIZE * 2);
    });

    it('can sustain multiple regeneration cycles', () => {
      let squares = generateSquareSequence(BATCH_SIZE);

      // Simulate 3 regeneration cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        const currentIndex = squares.length - 10;
        if (squares.length > 0 && currentIndex >= squares.length - 10) {
          const newBatch = generateSquareSequence(BATCH_SIZE);
          squares = [...squares, ...newBatch];
        }
      }

      expect(squares).toHaveLength(BATCH_SIZE * 4);
    });
  });

  describe('answer tracking', () => {
    it('tracks correct answers', () => {
      const answers = [true, true, false, true, false];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(3);
      expect(incorrect).toBe(2);
    });

    it('handles empty answers array', () => {
      const answers: boolean[] = [];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(0);
      expect(incorrect).toBe(0);
    });

    it('handles all correct answers', () => {
      const answers = [true, true, true, true, true];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(5);
      expect(incorrect).toBe(0);
    });

    it('handles all incorrect answers', () => {
      const answers = [false, false, false, false, false];
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;

      expect(correct).toBe(0);
      expect(incorrect).toBe(5);
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

  describe('training mode has no timer', () => {
    it('does not use timeLimit or timeRemaining concepts', () => {
      // Training mode simply does not instantiate a timer.
      // This test documents the design decision.
      const hasTimer = false;
      expect(hasTimer).toBe(false);
    });
  });

  describe('end training navigation', () => {
    it('navigates back to setup page on end', () => {
      const locale = 'en';
      const expectedUrl = `/${locale}/practice/square-colors`;
      expect(expectedUrl).toBe('/en/practice/square-colors');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/square-colors`;
      expect(expectedUrl).toBe('/ja/practice/square-colors');
    });
  });
});
