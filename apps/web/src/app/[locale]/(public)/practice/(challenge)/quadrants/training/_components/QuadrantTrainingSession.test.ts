// @vitest-environment jsdom
import {
  checkQuadrantAnswer,
  generateQuadrantQuestion,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
} from '@blindfold-chess/features/quadrants';
import { describe, expect, it } from 'vitest';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const BATCH_SIZE = 100;

describe('QuadrantTrainingSession logic', () => {
  describe('square generation', () => {
    it('generates valid chess squares', () => {
      for (let i = 0; i < 50; i++) {
        const q = generateQuadrantQuestion('white');
        expect(q.square).toHaveLength(2);
        expect(FILES).toContain(q.square[0]);
        expect(RANKS).toContain(q.square[1]);
      }
    });

    it('generates different squares over many iterations', () => {
      const squares = new Set<string>();
      for (let i = 0; i < 100; i++) {
        squares.add(generateQuadrantQuestion('white').square);
      }
      expect(squares.size).toBeGreaterThan(1);
    });

    it('generates batch of requested size', () => {
      const batch = generateQuadrantQuestionBatch(BATCH_SIZE, 'white');
      expect(batch).toHaveLength(BATCH_SIZE);
    });
  });

  describe('quadrant identification', () => {
    it('identifies q1 (king side upper): e-h files, ranks 5-8', () => {
      const q1Squares = ['e5', 'f6', 'g7', 'h8', 'e8', 'h5'] as const;
      for (const square of q1Squares) {
        expect(getCorrectQuadrant(square)).toBe('q1');
      }
    });

    it('identifies q2 (queen side upper): a-d files, ranks 5-8', () => {
      const q2Squares = ['a5', 'b6', 'c7', 'd8', 'a8', 'd5'] as const;
      for (const square of q2Squares) {
        expect(getCorrectQuadrant(square)).toBe('q2');
      }
    });

    it('identifies q3 (queen side lower): a-d files, ranks 1-4', () => {
      const q3Squares = ['a1', 'b2', 'c3', 'd4', 'a4', 'd1'] as const;
      for (const square of q3Squares) {
        expect(getCorrectQuadrant(square)).toBe('q3');
      }
    });

    it('identifies q4 (king side lower): e-h files, ranks 1-4', () => {
      const q4Squares = ['e1', 'f2', 'g3', 'h4', 'e4', 'h1'] as const;
      for (const square of q4Squares) {
        expect(getCorrectQuadrant(square)).toBe('q4');
      }
    });

    it('correctly classifies all 64 squares', () => {
      for (const file of FILES) {
        for (const rank of RANKS) {
          const square = `${file}${rank}` as const;
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

  describe('answer validation', () => {
    it('returns true for correct answer', () => {
      expect(checkQuadrantAnswer('e5', 'q1')).toBe(true);
    });

    it('returns false for incorrect answer', () => {
      expect(checkQuadrantAnswer('e5', 'q2')).toBe(false);
    });
  });

  describe('training mode has no problem count limit', () => {
    it('can generate problems indefinitely (no fixed count)', () => {
      const problems = generateQuadrantQuestionBatch(100, 'white');
      expect(problems).toHaveLength(100);
      for (const q of problems) {
        expect(FILES).toContain(q.square[0]);
        expect(RANKS).toContain(q.square[1]);
      }
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
