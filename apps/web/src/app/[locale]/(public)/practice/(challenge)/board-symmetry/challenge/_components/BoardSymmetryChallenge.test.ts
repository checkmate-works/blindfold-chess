// @vitest-environment jsdom
import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import { describe, expect, it } from 'vitest';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

describe('BoardSymmetryChallenge timed mode logic', () => {
  describe('problem generation', () => {
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
      const problem = { square: 'a1' as const, type: 'horizontal' as const };
      const result = checkSymmetryAnswer('a', '1', problem);
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe('h1');
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
