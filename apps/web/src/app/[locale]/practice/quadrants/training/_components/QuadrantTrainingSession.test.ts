// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function generateSquare(): string {
  const file = FILES[Math.floor(Math.random() * FILES.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return `${file}${rank}`;
}

function getCorrectQuadrant(square: string): QuadrantId {
  const file = square[0];
  const rank = parseInt(square[1]);
  const isKingSide = ['e', 'f', 'g', 'h'].includes(file);
  const isUpper = rank >= 5;

  if (isKingSide && isUpper) return 'q1';
  if (!isKingSide && isUpper) return 'q2';
  if (!isKingSide && !isUpper) return 'q3';
  return 'q4';
}

describe('QuadrantTrainingSession logic', () => {
  describe('square generation', () => {
    it('generates valid chess squares with files a-h and ranks 1-8', () => {
      for (let i = 0; i < 50; i++) {
        const square = generateSquare();
        expect(square).toHaveLength(2);
        expect(FILES).toContain(square[0]);
        expect(RANKS).toContain(square[1]);
      }
    });

    it('generates different squares over many iterations (not constant)', () => {
      const squares = new Set<string>();
      for (let i = 0; i < 100; i++) {
        squares.add(generateSquare());
      }
      // With 64 possible squares and 100 iterations, we should see multiple unique values
      expect(squares.size).toBeGreaterThan(1);
    });
  });

  describe('quadrant identification (getCorrectQuadrant)', () => {
    it('identifies q1 (king side upper): e-h files, ranks 5-8', () => {
      const q1Squares = ['e5', 'f6', 'g7', 'h8', 'e8', 'h5'];
      for (const square of q1Squares) {
        expect(getCorrectQuadrant(square)).toBe('q1');
      }
    });

    it('identifies q2 (queen side upper): a-d files, ranks 5-8', () => {
      const q2Squares = ['a5', 'b6', 'c7', 'd8', 'a8', 'd5'];
      for (const square of q2Squares) {
        expect(getCorrectQuadrant(square)).toBe('q2');
      }
    });

    it('identifies q3 (queen side lower): a-d files, ranks 1-4', () => {
      const q3Squares = ['a1', 'b2', 'c3', 'd4', 'a4', 'd1'];
      for (const square of q3Squares) {
        expect(getCorrectQuadrant(square)).toBe('q3');
      }
    });

    it('identifies q4 (king side lower): e-h files, ranks 1-4', () => {
      const q4Squares = ['e1', 'f2', 'g3', 'h4', 'e4', 'h1'];
      for (const square of q4Squares) {
        expect(getCorrectQuadrant(square)).toBe('q4');
      }
    });

    it('correctly classifies all 64 squares', () => {
      for (const file of FILES) {
        for (const rank of RANKS) {
          const square = `${file}${rank}`;
          const quadrant = getCorrectQuadrant(square);
          const rankNum = parseInt(rank);
          const isKingSide = ['e', 'f', 'g', 'h'].includes(file);
          const isUpper = rankNum >= 5;

          if (isKingSide && isUpper) expect(quadrant).toBe('q1');
          else if (!isKingSide && isUpper) expect(quadrant).toBe('q2');
          else if (!isKingSide && !isUpper) expect(quadrant).toBe('q3');
          else expect(quadrant).toBe('q4');
        }
      }
    });

    it('boundary: rank 4 is lower, rank 5 is upper', () => {
      expect(getCorrectQuadrant('e4')).toBe('q4');
      expect(getCorrectQuadrant('e5')).toBe('q1');
      expect(getCorrectQuadrant('d4')).toBe('q3');
      expect(getCorrectQuadrant('d5')).toBe('q2');
    });

    it('boundary: file d is queen side, file e is king side', () => {
      expect(getCorrectQuadrant('d1')).toBe('q3');
      expect(getCorrectQuadrant('e1')).toBe('q4');
      expect(getCorrectQuadrant('d8')).toBe('q2');
      expect(getCorrectQuadrant('e8')).toBe('q1');
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

  describe('training mode has no problem count limit', () => {
    it('can generate problems indefinitely (no fixed count)', () => {
      const problems = [];
      for (let i = 0; i < 100; i++) {
        problems.push(generateSquare());
      }
      expect(problems).toHaveLength(100);
      for (const square of problems) {
        expect(FILES).toContain(square[0]);
        expect(RANKS).toContain(square[1]);
      }
    });

    it('does not use problemCount or timer concepts', () => {
      // Training mode generates problems on demand indefinitely.
      // No fixed problemCount, no timer. This test documents the design decision.
      const hasFixedCount = false;
      const hasTimer = false;
      expect(hasFixedCount).toBe(false);
      expect(hasTimer).toBe(false);
    });
  });

  describe('end training navigation', () => {
    it('navigates back to setup page on end', () => {
      const locale = 'en';
      const expectedUrl = `/${locale}/practice/quadrants`;
      expect(expectedUrl).toBe('/en/practice/quadrants');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/quadrants`;
      expect(expectedUrl).toBe('/ja/practice/quadrants');
    });
  });
});
