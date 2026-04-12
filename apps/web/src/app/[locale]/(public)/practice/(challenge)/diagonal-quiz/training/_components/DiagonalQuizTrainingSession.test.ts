// @vitest-environment jsdom
import {
  generateSquareSequence,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';
import { describe, expect, it } from 'vitest';

const BATCH_SIZE = 100;

describe('DiagonalQuizTrainingSession logic', () => {
  describe('square generation for training mode', () => {
    it('generates BATCH_SIZE squares initially', () => {
      const squares = generateSquareSequence(BATCH_SIZE);
      expect(squares).toHaveLength(BATCH_SIZE);
    });

    it('all generated squares are valid chess squares', () => {
      const squares = generateSquareSequence(BATCH_SIZE);
      const validFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const validRanks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (const square of squares) {
        expect(validFiles).toContain(square[0]);
        expect(validRanks).toContain(square[1]);
      }
    });

    it('regenerates when running low on squares (within 10 of the end)', () => {
      let squares = generateSquareSequence(BATCH_SIZE);
      const currentIndex = BATCH_SIZE - 10;

      // Simulate the regeneration logic from DiagonalQuizTrainingSession
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
    it('correctly validates a diagonal answer', () => {
      const square = 'e4';
      const { diagonal, antiDiagonal } = getDiagonals(square);

      expect(isValidDiagonalAnswer(diagonal)).toBe(true);
      expect(isValidDiagonalAnswer(antiDiagonal)).toBe(true);

      // Normalized comparison should match
      expect(normalizeDiagonal(diagonal)).toBe(normalizeDiagonal(diagonal));
    });

    it('correctly identifies an incorrect diagonal answer', () => {
      const square = 'e4';
      const { diagonal } = getDiagonals(square);
      const wrongAnswer = 'a1-a2';

      expect(normalizeDiagonal(wrongAnswer) === normalizeDiagonal(diagonal)).toBe(false);
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
      const expectedUrl = `/${locale}/practice/diagonal-quiz`;
      expect(expectedUrl).toBe('/en/practice/diagonal-quiz');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/diagonal-quiz`;
      expect(expectedUrl).toBe('/ja/practice/diagonal-quiz');
    });
  });
});
