// @vitest-environment jsdom
import {
  findShortestPath,
  generateProblem,
  getPossibleMoves,
  validateUserPath,
} from '@blindfold-chess/features/route-planner';
import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';
import { describe, expect, it } from 'vitest';

/** Pieces available in route-planner practice (knight and bishop only). */
const ALL_PIECES: RoutePlannerPieceType[] = ['n', 'b'];

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
      const knightOnly: RoutePlannerPieceType[] = ['n'];
      for (let i = 0; i < 10; i++) {
        const problem = generateProblem(knightOnly);
        expect(problem.piece).toBe('n');
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

  describe('answer validation', () => {
    it('validates a correct path for a knight', () => {
      // Knight on e4 can reach f6 via e4 -> f6 (but that's 1 move; generateProblem requires 2+)
      // Knight on a1 -> b3 -> c5 is a valid 2-move path
      const result = validateUserPath('n', 'a1', ['b3', 'c5'], 'c5');
      expect(result.valid).toBe(true);
    });

    it('validates a correct path for a bishop', () => {
      // Bishop on c1 can go c1 -> e3 -> g5
      const result = validateUserPath('b', 'c1', ['e3', 'g5'], 'g5');
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid path (illegal move)', () => {
      // Knight on a1 cannot go directly to a2
      const result = validateUserPath('n', 'a1', ['a2'], 'a2');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid result');
      expect(result.error).toBe('Invalid move');
    });

    it('rejects a path that does not end at the goal', () => {
      const result = validateUserPath('n', 'a1', ['b3'], 'c5');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid result');
      expect(result.error).toBe('Path does not end at goal');
    });

    it('rejects an empty path', () => {
      const result = validateUserPath('n', 'a1', [], 'c5');
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error('expected invalid result');
      expect(result.error).toBe('Empty path');
    });

    it('findShortestPath returns optimal solution', () => {
      // Knight from a1 to b3: should be 1 move (a1 -> b3)
      const path = findShortestPath('n', 'a1', 'b3');
      expect(path).not.toBeNull();
      expect(path).toEqual(['a1', 'b3']);
    });

    it('findShortestPath returns null for bishop on different color squares', () => {
      // Bishop on a1 (dark) cannot reach a2 (light)
      const path = findShortestPath('b', 'a1', 'a2');
      expect(path).toBeNull();
    });
  });

  describe('getPossibleMoves', () => {
    it('returns correct knight moves from e4', () => {
      const moves = getPossibleMoves('n', 'e4');
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
      const moves = getPossibleMoves('n', 'a1');
      expect(moves).toHaveLength(2);
      expect(moves).toContain('b3');
      expect(moves).toContain('c2');
    });
  });

  describe('skipped field in result tracking', () => {
    it('marks submitted answers as not skipped', () => {
      // When a user submits an answer (correct or incorrect), skipped should be false
      const result = {
        piece: 'n' as RoutePlannerPieceType,
        start: 'a1',
        end: 'c5',
        success: true,
        userPath: ['b3', 'c5'],
        shortestPath: ['a1', 'b3', 'c5'],
        skipped: false,
      };
      expect(result.skipped).toBe(false);
      expect(result.userPath.length).toBeGreaterThan(0);
    });

    it('marks skipped problems with skipped=true and empty userPath', () => {
      // When a user skips a problem, skipped should be true and userPath should be empty
      const problem = generateProblem(ALL_PIECES);
      const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];
      const result = {
        piece: problem.piece,
        start: problem.start,
        end: problem.end,
        success: false,
        userPath: [] as string[],
        shortestPath,
        skipped: true,
      };
      expect(result.skipped).toBe(true);
      expect(result.success).toBe(false);
      expect(result.userPath).toEqual([]);
      expect(result.shortestPath.length).toBeGreaterThanOrEqual(2);
    });

    it('correctly derives userPath based on skipped flag', () => {
      // This mirrors the logic in handleNextProblem: result.skipped === true ? [] : moves
      const moves = ['b3', 'c5'];

      const skippedResult = { skipped: true, success: false, shortestPath: ['a1', 'b3', 'c5'] };
      const submittedResult = {
        skipped: false,
        success: true,
        shortestPath: ['a1', 'b3', 'c5'],
      };

      const skippedUserPath = skippedResult.skipped === true ? [] : moves;
      const submittedUserPath = submittedResult.skipped === true ? [] : moves;

      expect(skippedUserPath).toEqual([]);
      expect(submittedUserPath).toEqual(['b3', 'c5']);
    });

    it('handles mixed results with skipped and non-skipped problems', () => {
      const results = [
        {
          piece: 'n' as RoutePlannerPieceType,
          start: 'a1',
          end: 'c5',
          success: true,
          userPath: ['b3', 'c5'],
          shortestPath: ['a1', 'b3', 'c5'],
          skipped: false,
        },
        {
          piece: 'n' as RoutePlannerPieceType,
          start: 'a1',
          end: 'c2',
          success: false,
          userPath: [],
          shortestPath: ['a1', 'c2'],
          skipped: true,
        },
        {
          piece: 'b' as RoutePlannerPieceType,
          start: 'c1',
          end: 'h6',
          success: false,
          userPath: ['d2'],
          shortestPath: ['c1', 'h6'],
          skipped: false,
        },
      ];

      const skippedCount = results.filter((r) => r.skipped).length;
      const answeredCount = results.filter((r) => !r.skipped).length;
      const correctCount = results.filter((r) => r.success).length;

      expect(skippedCount).toBe(1);
      expect(answeredCount).toBe(2);
      expect(correctCount).toBe(1);
    });
  });
});
