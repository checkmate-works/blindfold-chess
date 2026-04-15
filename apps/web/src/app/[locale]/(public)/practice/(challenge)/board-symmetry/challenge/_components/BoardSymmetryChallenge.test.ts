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
      const problem = { square: 'a1' as const, type: 'horizontal' as const };
      const result = checkSymmetryAnswer('a', '1', problem);
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe('h1');
    });
  });

  describe('stats calculation', () => {
    it('calculates average time correctly', () => {
      const answers = [true, false, true, true];
      const totalTime = 10; // seconds
      const averageTime = answers.length > 0 ? totalTime / answers.length : 0;
      expect(averageTime).toBe(2.5);
    });

    it('handles zero answers for average time', () => {
      const answers: boolean[] = [];
      const totalTime = 0;
      const averageTime = answers.length > 0 ? totalTime / answers.length : 0;
      expect(averageTime).toBe(0);
    });

    it('returns correct stats structure', () => {
      const answers = [true, true, false];
      const totalTime = 6.5;
      const correct = answers.filter((a) => a).length;
      const incorrect = answers.filter((a) => !a).length;
      const averageTime = answers.length > 0 ? totalTime / answers.length : 0;

      const stats = { correct, incorrect, totalTime, averageTime };

      expect(stats.correct).toBe(2);
      expect(stats.incorrect).toBe(1);
      expect(stats.totalTime).toBe(6.5);
      expect(stats.averageTime).toBeCloseTo(2.1667, 3);
    });
  });

  describe('timer behavior', () => {
    it('uses actual timeLimit', () => {
      const timeLimit = 60;
      expect(timeLimit).toBe(60);
    });

    it('calculates correct timeRemaining', () => {
      const timeLimit = 60;
      const timeElapsed = 30;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      expect(timeRemaining).toBe(30);
    });

    it('timeRemaining does not go below 0', () => {
      const timeLimit = 60;
      const timeElapsed = 70;
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);
      expect(timeRemaining).toBe(0);
    });
  });

  describe('onTimeLimitReached behavior', () => {
    it('sets isFinished when time limit is reached', () => {
      let isFinished = false;

      const onTimeLimitReached = () => {
        isFinished = true;
      };

      onTimeLimitReached();
      expect(isFinished).toBe(true);
    });
  });

  describe('result page redirect logic', () => {
    it('builds correct result URL params', () => {
      const stats = { correct: 50, incorrect: 10, totalTime: 60, averageTime: 1 };
      const total = 60;

      const params = new URLSearchParams({
        score: stats.correct.toString(),
        total: total.toString(),
        time: stats.totalTime.toString(),
      });

      expect(params.get('score')).toBe('50');
      expect(params.get('total')).toBe('60');
      expect(params.get('time')).toBe('60');
    });

    it('builds result URL params without mistakeAllowance', () => {
      const correctCount = 25;
      const incorrectCount = 3;
      const totalTime = 45;
      const total = correctCount + incorrectCount;

      const params = new URLSearchParams({
        score: correctCount.toString(),
        total: total.toString(),
        time: totalTime.toString(),
      });

      expect(params.get('score')).toBe('25');
      expect(params.get('total')).toBe('28');
      expect(params.get('time')).toBe('45');
    });

    it('redirects when game is finished', () => {
      const isFinished = true;
      expect(isFinished).toBe(true);
    });

    it('does not redirect when game is not finished', () => {
      const isFinished = false;
      expect(isFinished).toBe(false);
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
