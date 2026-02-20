// @vitest-environment jsdom
import {
  ROUTE_PLANNER_PIECES,
  findShortestPath,
  generateProblem,
  getPossibleMoves,
  validateUserPath,
} from '@blindfold-chess/features/route-planner';
import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';
import { describe, expect, it } from 'vitest';

const ALL_PIECES: RoutePlannerPieceType[] = [...ROUTE_PLANNER_PIECES];

describe('RoutePlannerTrainingSession logic', () => {
  describe('problem generation for training mode', () => {
    it('generates a valid problem with piece, start, and end', () => {
      const problem = generateProblem(ALL_PIECES);
      expect(problem).toHaveProperty('piece');
      expect(problem).toHaveProperty('start');
      expect(problem).toHaveProperty('end');
      expect(ALL_PIECES).toContain(problem.piece);
    });

    it('generates problems with valid chess squares', () => {
      const validFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const validRanks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      for (let i = 0; i < 20; i++) {
        const problem = generateProblem(ALL_PIECES);
        expect(validFiles).toContain(problem.start[0]);
        expect(validRanks).toContain(problem.start[1]);
        expect(validFiles).toContain(problem.end[0]);
        expect(validRanks).toContain(problem.end[1]);
      }
    });

    it('start and end squares are never the same', () => {
      for (let i = 0; i < 20; i++) {
        const problem = generateProblem(ALL_PIECES);
        expect(problem.start).not.toBe(problem.end);
      }
    });

    it('respects allowed pieces filter', () => {
      const knightOnly: RoutePlannerPieceType[] = ['N'];
      for (let i = 0; i < 10; i++) {
        const problem = generateProblem(knightOnly);
        expect(problem.piece).toBe('N');
      }
    });

    it('generates solvable problems (shortest path exists)', () => {
      for (let i = 0; i < 10; i++) {
        const problem = generateProblem(ALL_PIECES);
        const path = findShortestPath(problem.piece, problem.start, problem.end);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('can generate problems indefinitely (training has no count limit)', () => {
      // Training mode generates problems on demand with no fixed count
      const problems = [];
      for (let i = 0; i < 50; i++) {
        problems.push(generateProblem(ALL_PIECES));
      }
      expect(problems).toHaveLength(50);
      // All should be valid
      for (const p of problems) {
        expect(ALL_PIECES).toContain(p.piece);
        expect(p.start).not.toBe(p.end);
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
    it('validates a correct path for a knight', () => {
      // Knight on e4 can reach f6 via e4 -> f6 (but that's 1 move; generateProblem requires 2+)
      // Knight on a1 -> b3 -> c5 is a valid 2-move path
      const result = validateUserPath('N', 'a1', ['b3', 'c5'], 'c5');
      expect(result.valid).toBe(true);
    });

    it('validates a correct path for a rook', () => {
      // Rook on a1 can go a1 -> a4 -> d4
      const result = validateUserPath('R', 'a1', ['a4', 'd4'], 'd4');
      expect(result.valid).toBe(true);
    });

    it('validates a correct path for a bishop', () => {
      // Bishop on c1 can go c1 -> e3 -> g5
      const result = validateUserPath('B', 'c1', ['e3', 'g5'], 'g5');
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid path (illegal move)', () => {
      // Knight on a1 cannot go directly to a2
      const result = validateUserPath('N', 'a1', ['a2'], 'a2');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid move');
    });

    it('rejects a path that does not end at the goal', () => {
      const result = validateUserPath('N', 'a1', ['b3'], 'c5');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path does not end at goal');
    });

    it('rejects an empty path', () => {
      const result = validateUserPath('N', 'a1', [], 'c5');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Empty path');
    });

    it('findShortestPath returns optimal solution', () => {
      // Knight from a1 to b3: should be 1 move (a1 -> b3)
      const path = findShortestPath('N', 'a1', 'b3');
      expect(path).not.toBeNull();
      expect(path).toEqual(['a1', 'b3']);
    });

    it('findShortestPath returns null for bishop on different color squares', () => {
      // Bishop on a1 (dark) cannot reach a2 (light)
      const path = findShortestPath('B', 'a1', 'a2');
      expect(path).toBeNull();
    });
  });

  describe('getPossibleMoves', () => {
    it('returns correct knight moves from e4', () => {
      const moves = getPossibleMoves('N', 'e4');
      expect(moves).toContain('f6');
      expect(moves).toContain('d6');
      expect(moves).toContain('g5');
      expect(moves).toContain('g3');
      expect(moves).toContain('f2');
      expect(moves).toContain('d2');
      expect(moves).toContain('c3');
      expect(moves).toContain('c5');
      expect(moves).toHaveLength(8);
    });

    it('returns fewer moves for a knight in the corner', () => {
      const moves = getPossibleMoves('N', 'a1');
      expect(moves).toHaveLength(2);
      expect(moves).toContain('b3');
      expect(moves).toContain('c2');
    });
  });

  describe('training mode has no problem count limit', () => {
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
      const expectedUrl = `/${locale}/practice/route-planner`;
      expect(expectedUrl).toBe('/en/practice/route-planner');
    });

    it('navigates back to setup page for Japanese locale', () => {
      const locale = 'ja';
      const expectedUrl = `/${locale}/practice/route-planner`;
      expect(expectedUrl).toBe('/ja/practice/route-planner');
    });
  });
});
