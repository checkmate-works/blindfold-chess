import { describe, expect, it } from 'vitest';

import { type LeaderboardModule, buildChallengePath } from './types';

describe('buildChallengePath', () => {
  describe('coordinate_quiz', () => {
    it.each(['white', 'black', 'random'] as const)(
      'returns path with orientation=%s for coordinate_quiz',
      (key) => {
        expect(buildChallengePath('coordinate_quiz', key)).toBe(
          `/practice/coordinate-quiz/challenge?orientation=${key}`
        );
      }
    );
  });

  describe('legal_moves', () => {
    it.each(['king', 'queen', 'rook', 'bishop', 'knight', 'random'] as const)(
      'returns path with piece=%s for legal_moves',
      (key) => {
        expect(buildChallengePath('legal_moves', key)).toBe(
          `/practice/legal-moves/challenge?piece=${key}`
        );
      }
    );
  });

  describe('square_colors', () => {
    it('returns path without query parameters for square_colors', () => {
      expect(buildChallengePath('square_colors', 'default')).toBe(
        '/practice/square-colors/challenge'
      );
    });
  });

  describe('diagonal_quiz', () => {
    it('returns path without query parameters for diagonal_quiz', () => {
      expect(buildChallengePath('diagonal_quiz', 'default')).toBe(
        '/practice/diagonal-quiz/challenge'
      );
    });

    it('ignores key value (no query param emitted)', () => {
      expect(buildChallengePath('diagonal_quiz', 'anything')).toBe(
        '/practice/diagonal-quiz/challenge'
      );
      expect(buildChallengePath('diagonal_quiz', '')).toBe('/practice/diagonal-quiz/challenge');
    });
  });

  describe('route_planner', () => {
    it.each(['knight', 'bishop'] as const)(
      'returns path with piece=%s for route_planner',
      (key) => {
        expect(buildChallengePath('route_planner', key)).toBe(
          `/practice/route-planner/challenge?piece=${key}`
        );
      }
    );
  });

  // -----------------------------------------------------------------------
  // Path structure validation
  // -----------------------------------------------------------------------

  describe('path structure', () => {
    it('always starts with /practice/', () => {
      const modules: LeaderboardModule[] = [
        'coordinate_quiz',
        'legal_moves',
        'square_colors',
        'diagonal_quiz',
        'route_planner',
      ];
      for (const mod of modules) {
        const path = buildChallengePath(mod, 'any-key');
        expect(path).toMatch(/^\/practice\//);
      }
    });

    it('uses slug format (hyphens) not underscore format in the URL path', () => {
      expect(buildChallengePath('coordinate_quiz', 'white')).toContain('coordinate-quiz');
      expect(buildChallengePath('coordinate_quiz', 'white')).not.toContain('coordinate_quiz');
      expect(buildChallengePath('legal_moves', 'king')).toContain('legal-moves');
      expect(buildChallengePath('legal_moves', 'king')).not.toContain('legal_moves');
      expect(buildChallengePath('square_colors', 'default')).toContain('square-colors');
      expect(buildChallengePath('square_colors', 'default')).not.toContain('square_colors');
      expect(buildChallengePath('diagonal_quiz', 'default')).toContain('diagonal-quiz');
      expect(buildChallengePath('diagonal_quiz', 'default')).not.toContain('diagonal_quiz');
      expect(buildChallengePath('route_planner', 'knight')).toContain('route-planner');
      expect(buildChallengePath('route_planner', 'knight')).not.toContain('route_planner');
    });

    it('always includes /challenge in the path', () => {
      const modules: LeaderboardModule[] = [
        'coordinate_quiz',
        'legal_moves',
        'square_colors',
        'diagonal_quiz',
        'route_planner',
      ];
      for (const mod of modules) {
        const path = buildChallengePath(mod, 'some-key');
        expect(path).toContain('/challenge');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Query parameter naming consistency
  // -----------------------------------------------------------------------

  describe('query parameter naming', () => {
    it('coordinate_quiz uses "orientation" (not "boardOrientation") as query param', () => {
      const path = buildChallengePath('coordinate_quiz', 'white');
      expect(path).toContain('orientation=');
      expect(path).not.toContain('boardOrientation=');
    });

    it('legal_moves uses "piece" as query param', () => {
      const path = buildChallengePath('legal_moves', 'knight');
      expect(path).toContain('piece=');
    });

    it('square_colors has no query string', () => {
      const path = buildChallengePath('square_colors', 'default');
      expect(path).not.toContain('?');
    });

    it('diagonal_quiz has no query string', () => {
      const path = buildChallengePath('diagonal_quiz', 'default');
      expect(path).not.toContain('?');
    });

    it('route_planner uses "piece" as query param', () => {
      const path = buildChallengePath('route_planner', 'knight');
      expect(path).toContain('piece=');
    });
  });

  // -----------------------------------------------------------------------
  // Edge case: key value is passed through as-is
  // -----------------------------------------------------------------------

  describe('key passthrough', () => {
    it('passes arbitrary key values as-is for coordinate_quiz', () => {
      // Even non-standard keys should be passed through without validation
      expect(buildChallengePath('coordinate_quiz', 'custom-value')).toBe(
        '/practice/coordinate-quiz/challenge?orientation=custom-value'
      );
    });

    it('passes arbitrary key values as-is for legal_moves', () => {
      expect(buildChallengePath('legal_moves', 'custom-value')).toBe(
        '/practice/legal-moves/challenge?piece=custom-value'
      );
    });

    it('passes arbitrary key values as-is for route_planner', () => {
      expect(buildChallengePath('route_planner', 'custom-value')).toBe(
        '/practice/route-planner/challenge?piece=custom-value'
      );
    });

    it('ignores key value for square_colors (no query param emitted)', () => {
      expect(buildChallengePath('square_colors', 'anything')).toBe(
        '/practice/square-colors/challenge'
      );
      expect(buildChallengePath('square_colors', '')).toBe('/practice/square-colors/challenge');
    });
  });
});
