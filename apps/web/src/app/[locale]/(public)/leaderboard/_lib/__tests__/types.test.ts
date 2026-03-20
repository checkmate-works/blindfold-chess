import { describe, expect, it } from 'vitest';

import {
  ALL_LEADERBOARD_ENTRIES,
  MODULES,
  MODULE_KEYS,
  PAGE_SIZE,
  TOP_RANK_THRESHOLD,
  VALID_PERIODS,
  buildDetailPath,
  moduleToSlug,
  slugToModule,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('MODULES', () => {
  it('contains exactly three modules', () => {
    expect(MODULES).toHaveLength(3);
    expect(MODULES).toEqual(['coordinate_quiz', 'legal_moves', 'square_colors']);
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
});

describe('VALID_PERIODS', () => {
  it('contains all-time, weekly, monthly', () => {
    expect(VALID_PERIODS).toEqual(['all-time', 'weekly', 'monthly']);
  });
});

describe('PAGE_SIZE', () => {
  it('is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe('TOP_RANK_THRESHOLD', () => {
  it('is 100', () => {
    expect(TOP_RANK_THRESHOLD).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// ALL_LEADERBOARD_ENTRIES
// ---------------------------------------------------------------------------

describe('ALL_LEADERBOARD_ENTRIES', () => {
  it('has 10 entries total (3 + 6 + 1)', () => {
    expect(ALL_LEADERBOARD_ENTRIES).toHaveLength(10);
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

  it('entries are in module order: coordinate_quiz, legal_moves, square_colors', () => {
    const modules = ALL_LEADERBOARD_ENTRIES.map((e) => e.module);
    const firstLegalMoves = modules.indexOf('legal_moves');
    const lastCoordinateQuiz = modules.lastIndexOf('coordinate_quiz');
    const firstSquareColors = modules.indexOf('square_colors');
    const lastLegalMoves = modules.lastIndexOf('legal_moves');

    expect(lastCoordinateQuiz).toBeLessThan(firstLegalMoves);
    expect(lastLegalMoves).toBeLessThan(firstSquareColors);
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
      '/leaderboard/all-time/coordinate-quiz/white'
    );
  });

  it('builds correct path for weekly legal_moves knight', () => {
    expect(buildDetailPath('weekly', 'legal_moves', 'knight')).toBe(
      '/leaderboard/weekly/legal-moves/knight'
    );
  });

  it('builds correct path for monthly square_colors default', () => {
    expect(buildDetailPath('monthly', 'square_colors', 'default')).toBe(
      '/leaderboard/monthly/square-colors/default'
    );
  });

  it('uses slug format for module in the URL path', () => {
    const path = buildDetailPath('all-time', 'legal_moves', 'random');
    expect(path).toContain('legal-moves');
    expect(path).not.toContain('legal_moves');
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
