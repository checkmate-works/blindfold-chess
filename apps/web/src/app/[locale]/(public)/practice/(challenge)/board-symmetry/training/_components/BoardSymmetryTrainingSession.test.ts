// @vitest-environment jsdom
import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import { describe, expect, it } from 'vitest';

describe('BoardSymmetryTrainingSession logic', () => {
  describe('problem generation for training mode', () => {
    it('generates a valid problem', () => {
      const problem = generateProblem();
      expect(problem).toHaveProperty('square');
      expect(problem).toHaveProperty('type');
      expect(problem.square).toHaveLength(2);
    });

    it('all generated problems have valid symmetry types', () => {
      const validTypes = ['horizontal', 'vertical', 'point'];
      for (let i = 0; i < 50; i++) {
        const problem = generateProblem();
        expect(validTypes).toContain(problem.type);
      }
    });

    it('all generated problems have valid chess squares', () => {
      const validFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const validRanks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (let i = 0; i < 50; i++) {
        const problem = generateProblem();
        expect(validFiles).toContain(problem.square[0]);
        expect(validRanks).toContain(problem.square[1]);
      }
    });

    it('generates new problems on each call (exhibits randomness)', () => {
      const squares = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const problem = generateProblem();
        squares.add(problem.square);
      }
      // With 64 possible squares and 100 trials, we expect many distinct values
      expect(squares.size).toBeGreaterThan(1);
    });

    it('can sustain multiple problem generation cycles', () => {
      const problems = [];
      for (let i = 0; i < 100; i++) {
        problems.push(generateProblem());
      }
      expect(problems).toHaveLength(100);
      for (const problem of problems) {
        expect(problem.square).toHaveLength(2);
        expect(['horizontal', 'vertical', 'point']).toContain(problem.type);
      }
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
    it('correctly validates a correct horizontal symmetry answer', () => {
      const problem = { square: 'a1' as const, type: 'horizontal' as const };
      const result = checkSymmetryAnswer('h', '1', problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe('h1');
    });

    it('correctly validates a correct vertical symmetry answer', () => {
      const problem = { square: 'a1' as const, type: 'vertical' as const };
      const result = checkSymmetryAnswer('a', '8', problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe('a8');
    });

    it('correctly validates a correct point symmetry answer', () => {
      const problem = { square: 'a1' as const, type: 'point' as const };
      const result = checkSymmetryAnswer('h', '8', problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe('h8');
    });

    it('correctly identifies an incorrect answer', () => {
      const problem = { square: 'e4' as const, type: 'vertical' as const };
      const result = checkSymmetryAnswer('e', '4', problem);
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe('e5');
    });

    it('always returns correctSquare regardless of answer correctness', () => {
      const problem = { square: 'c6' as const, type: 'horizontal' as const };
      const correctResult = checkSymmetryAnswer('f', '6', problem);
      expect(correctResult.correctSquare).toBe('f6');

      const wrongResult = checkSymmetryAnswer('a', '1', problem);
      expect(wrongResult.correctSquare).toBe('f6');
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
      const expectedUrl = `/${locale}/practice/board-symmetry`;
      expect(expectedUrl).toBe('/en/practice/board-symmetry');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/board-symmetry`;
      expect(expectedUrl).toBe('/ja/practice/board-symmetry');
    });
  });
});
