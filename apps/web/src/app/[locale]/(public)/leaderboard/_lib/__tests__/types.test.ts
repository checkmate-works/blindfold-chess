import { describe, expect, it } from 'vitest';

import {
  ALL_LEADERBOARD_ENTRIES,
  type LeaderboardModule,
  MODULES,
  MODULE_KEYS,
  MODULE_TO_SLUG,
  PAGE_SIZE,
  SLUG_TO_MODULE,
  VALID_MODULE_SLUGS,
  VALID_PERIODS,
  buildChallengePath,
  buildDetailPath,
  moduleToSlug,
  slugToModule,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('MODULES', () => {
  it('contains exactly six modules', () => {
    expect(MODULES).toHaveLength(6);
    expect(MODULES).toEqual([
      'coordinate_quiz',
      'legal_moves',
      'square_colors',
      'diagonal_quiz',
      'board_symmetry',
      'route_planner',
    ]);
  });
});

describe('MODULE_KEYS', () => {
  it('coordinate_quiz has white, black, random', () => {
    expect(MODULE_KEYS.coordinate_quiz).toEqual(['white', 'black', 'random']);
  });

  it('legal_moves has six piece types', () => {
    expect(MODULE_KEYS.legal_moves).toEqual([
      'king',
      'queen',
      'rook',
      'bishop',
      'knight',
      'random',
    ]);
  });

  it('square_colors has only default', () => {
    expect(MODULE_KEYS.square_colors).toEqual(['default']);
  });

  it('diagonal_quiz has only default', () => {
    expect(MODULE_KEYS.diagonal_quiz).toEqual(['default']);
  });

  it('board_symmetry has only default', () => {
    expect(MODULE_KEYS.board_symmetry).toEqual(['default']);
  });

  it('route_planner has knight and bishop', () => {
    expect(MODULE_KEYS.route_planner).toEqual(['knight', 'bishop']);
  });
});

describe('VALID_PERIODS', () => {
  it('contains all-time, weekly, monthly', () => {
    expect(VALID_PERIODS).toEqual(['all-time', 'weekly', 'monthly']);
  });

  // Regression guard: `score` and `exp` must never be added as periods, since
  // they are reserved as category segments in the canonical URL hierarchy
  // (`/leaderboard/score/[period]`, `/leaderboard/exp/[period]`). Next.js
  // routes static segments before dynamic, so the legacy `[period]` shim
  // would never receive these as inputs — but if precedence ever flipped,
  // the shim's `notFound()` branch would still close the gap, and this test
  // codifies the invariant at the data-model level.
  it('does not contain the reserved category segments "score" or "exp"', () => {
    expect(VALID_PERIODS).not.toContain('score' as never);
    expect(VALID_PERIODS).not.toContain('exp' as never);
  });
});

describe('VALID_MODULE_SLUGS', () => {
  it('contains exactly six hyphenated slugs parallel to MODULES', () => {
    expect(VALID_MODULE_SLUGS).toEqual([
      'coordinate-quiz',
      'legal-moves',
      'square-colors',
      'diagonal-quiz',
      'board-symmetry',
      'route-planner',
    ]);
  });
});

describe('MODULE_TO_SLUG / SLUG_TO_MODULE', () => {
  it('is bijective across MODULES and VALID_MODULE_SLUGS', () => {
    for (const mod of MODULES) {
      const slug = MODULE_TO_SLUG[mod];
      expect(VALID_MODULE_SLUGS).toContain(slug);
      expect(SLUG_TO_MODULE[slug]).toBe(mod);
    }
    for (const slug of VALID_MODULE_SLUGS) {
      const mod = SLUG_TO_MODULE[slug];
      expect(MODULES).toContain(mod);
      expect(MODULE_TO_SLUG[mod]).toBe(slug);
    }
  });
});

describe('PAGE_SIZE', () => {
  it('is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// ALL_LEADERBOARD_ENTRIES
// ---------------------------------------------------------------------------

describe('ALL_LEADERBOARD_ENTRIES', () => {
  it('has 14 entries total (3 + 6 + 1 + 1 + 1 + 2)', () => {
    expect(ALL_LEADERBOARD_ENTRIES).toHaveLength(14);
  });

  it('contains all coordinate_quiz keys', () => {
    const coordinateEntries = ALL_LEADERBOARD_ENTRIES.filter((e) => e.module === 'coordinate_quiz');
    expect(coordinateEntries).toEqual([
      { module: 'coordinate_quiz', key: 'white' },
      { module: 'coordinate_quiz', key: 'black' },
      { module: 'coordinate_quiz', key: 'random' },
    ]);
  });

  it('contains all legal_moves keys', () => {
    const legalMovesEntries = ALL_LEADERBOARD_ENTRIES.filter((e) => e.module === 'legal_moves');
    expect(legalMovesEntries).toEqual([
      { module: 'legal_moves', key: 'king' },
      { module: 'legal_moves', key: 'queen' },
      { module: 'legal_moves', key: 'rook' },
      { module: 'legal_moves', key: 'bishop' },
      { module: 'legal_moves', key: 'knight' },
      { module: 'legal_moves', key: 'random' },
    ]);
  });

  it('contains square_colors default', () => {
    const squareColorsEntries = ALL_LEADERBOARD_ENTRIES.filter((e) => e.module === 'square_colors');
    expect(squareColorsEntries).toEqual([{ module: 'square_colors', key: 'default' }]);
  });

  it('contains diagonal_quiz default', () => {
    const diagonalQuizEntries = ALL_LEADERBOARD_ENTRIES.filter((e) => e.module === 'diagonal_quiz');
    expect(diagonalQuizEntries).toEqual([{ module: 'diagonal_quiz', key: 'default' }]);
  });

  it('contains board_symmetry default', () => {
    const boardSymmetryEntries = ALL_LEADERBOARD_ENTRIES.filter(
      (e) => e.module === 'board_symmetry'
    );
    expect(boardSymmetryEntries).toEqual([{ module: 'board_symmetry', key: 'default' }]);
  });

  it('contains all route_planner keys', () => {
    const routePlannerEntries = ALL_LEADERBOARD_ENTRIES.filter((e) => e.module === 'route_planner');
    expect(routePlannerEntries).toEqual([
      { module: 'route_planner', key: 'knight' },
      { module: 'route_planner', key: 'bishop' },
    ]);
  });

  it('entries are in module order: coordinate_quiz, legal_moves, square_colors, diagonal_quiz, board_symmetry, route_planner', () => {
    const modules = ALL_LEADERBOARD_ENTRIES.map((e) => e.module);
    const firstLegalMoves = modules.indexOf('legal_moves');
    const lastCoordinateQuiz = modules.lastIndexOf('coordinate_quiz');
    const firstSquareColors = modules.indexOf('square_colors');
    const lastLegalMoves = modules.lastIndexOf('legal_moves');
    const firstDiagonalQuiz = modules.indexOf('diagonal_quiz');
    const lastSquareColors = modules.lastIndexOf('square_colors');

    expect(lastCoordinateQuiz).toBeLessThan(firstLegalMoves);
    expect(lastLegalMoves).toBeLessThan(firstSquareColors);
    expect(lastSquareColors).toBeLessThan(firstDiagonalQuiz);

    const firstBoardSymmetry = modules.indexOf('board_symmetry');
    const lastDiagonalQuiz = modules.lastIndexOf('diagonal_quiz');
    expect(lastDiagonalQuiz).toBeLessThan(firstBoardSymmetry);

    const firstRoutePlanner = modules.indexOf('route_planner');
    const lastBoardSymmetry = modules.lastIndexOf('board_symmetry');
    expect(lastBoardSymmetry).toBeLessThan(firstRoutePlanner);
  });
});

// ---------------------------------------------------------------------------
// moduleToSlug
// ---------------------------------------------------------------------------

describe('moduleToSlug', () => {
  it('converts coordinate_quiz to coordinate-quiz', () => {
    expect(moduleToSlug('coordinate_quiz')).toBe('coordinate-quiz');
  });

  it('converts legal_moves to legal-moves', () => {
    expect(moduleToSlug('legal_moves')).toBe('legal-moves');
  });

  it('converts square_colors to square-colors', () => {
    expect(moduleToSlug('square_colors')).toBe('square-colors');
  });

  it('converts diagonal_quiz to diagonal-quiz', () => {
    expect(moduleToSlug('diagonal_quiz')).toBe('diagonal-quiz');
  });

  it('converts board_symmetry to board-symmetry', () => {
    expect(moduleToSlug('board_symmetry')).toBe('board-symmetry');
  });

  it('converts route_planner to route-planner', () => {
    expect(moduleToSlug('route_planner')).toBe('route-planner');
  });
});

// ---------------------------------------------------------------------------
// slugToModule
// ---------------------------------------------------------------------------

describe('slugToModule', () => {
  it('converts coordinate-quiz to coordinate_quiz', () => {
    expect(slugToModule('coordinate-quiz')).toBe('coordinate_quiz');
  });

  it('converts legal-moves to legal_moves', () => {
    expect(slugToModule('legal-moves')).toBe('legal_moves');
  });

  it('converts square-colors to square_colors', () => {
    expect(slugToModule('square-colors')).toBe('square_colors');
  });

  it('converts diagonal-quiz to diagonal_quiz', () => {
    expect(slugToModule('diagonal-quiz')).toBe('diagonal_quiz');
  });

  it('converts board-symmetry to board_symmetry', () => {
    expect(slugToModule('board-symmetry')).toBe('board_symmetry');
  });

  it('converts route-planner to route_planner', () => {
    expect(slugToModule('route-planner')).toBe('route_planner');
  });

  it('returns null for invalid slug', () => {
    expect(slugToModule('invalid-slug')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(slugToModule('')).toBeNull();
  });

  it('returns null for underscore-style module names (not slugs)', () => {
    expect(slugToModule('coordinate_quiz')).toBeNull();
    expect(slugToModule('legal_moves')).toBeNull();
    expect(slugToModule('square_colors')).toBeNull();
  });

  it('returns null for partial matches', () => {
    expect(slugToModule('coordinate')).toBeNull();
    expect(slugToModule('legal')).toBeNull();
    expect(slugToModule('square')).toBeNull();
  });

  it('returns null for case-sensitive mismatches', () => {
    expect(slugToModule('Coordinate-Quiz')).toBeNull();
    expect(slugToModule('LEGAL-MOVES')).toBeNull();
  });

  it('returns null for slugs with extra segments', () => {
    expect(slugToModule('coordinate-quiz-extra')).toBeNull();
    expect(slugToModule('legal-moves-test')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(slugToModule(' ')).toBeNull();
    expect(slugToModule('  ')).toBeNull();
  });

  it('returns null for whitespace-padded valid slugs', () => {
    expect(slugToModule(' coordinate-quiz')).toBeNull();
    expect(slugToModule('legal-moves ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildDetailPath
// ---------------------------------------------------------------------------

describe('buildDetailPath', () => {
  it('builds correct path for all-time coordinate_quiz white', () => {
    expect(buildDetailPath('all-time', 'coordinate_quiz', 'white')).toBe(
      '/leaderboard/score/all-time/coordinate-quiz/white'
    );
  });

  it('builds correct path for weekly legal_moves knight', () => {
    expect(buildDetailPath('weekly', 'legal_moves', 'knight')).toBe(
      '/leaderboard/score/weekly/legal-moves/knight'
    );
  });

  it('builds correct path for monthly square_colors default', () => {
    expect(buildDetailPath('monthly', 'square_colors', 'default')).toBe(
      '/leaderboard/score/monthly/square-colors/default'
    );
  });

  it('builds correct path for all-time diagonal_quiz default', () => {
    expect(buildDetailPath('all-time', 'diagonal_quiz', 'default')).toBe(
      '/leaderboard/score/all-time/diagonal-quiz/default'
    );
  });

  it('uses slug format for module in the URL path', () => {
    const path = buildDetailPath('all-time', 'legal_moves', 'random');
    expect(path).toContain('legal-moves');
    expect(path).not.toContain('legal_moves');
  });

  it('always starts with the /leaderboard/score/ category prefix', () => {
    for (const mod of MODULES) {
      const key = MODULE_KEYS[mod][0];
      expect(buildDetailPath('weekly', mod, key)).toMatch(/^\/leaderboard\/score\//);
    }
  });
});

// ---------------------------------------------------------------------------
// Round-trip: moduleToSlug <-> slugToModule
// ---------------------------------------------------------------------------

describe('moduleToSlug / slugToModule round-trip', () => {
  it('round-trips all modules correctly', () => {
    for (const mod of MODULES) {
      const slug = moduleToSlug(mod);
      const result = slugToModule(slug);
      expect(result).toBe(mod);
    }
  });
});

// ---------------------------------------------------------------------------
// buildChallengePath
// ---------------------------------------------------------------------------

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
