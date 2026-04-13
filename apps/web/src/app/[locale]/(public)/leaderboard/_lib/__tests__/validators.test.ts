import { describe, expect, it } from 'vitest';

import {
  isValidKey,
  isValidModule,
  isValidModuleSlug,
  isValidPage,
  isValidPeriod,
  parseModuleFilter,
  parseModuleSlugFilter,
  parsePeriod,
} from '../validators';

describe('isValidModule', () => {
  it('accepts valid modules', () => {
    expect(isValidModule('coordinate_quiz')).toBe(true);
    expect(isValidModule('legal_moves')).toBe(true);
    expect(isValidModule('square_colors')).toBe(true);
  });

  it('rejects invalid modules', () => {
    expect(isValidModule('invalid')).toBe(false);
    expect(isValidModule('')).toBe(false);
    expect(isValidModule('coordinate-quiz')).toBe(false);
  });

  it('rejects slug-format module names', () => {
    expect(isValidModule('coordinate-quiz')).toBe(false);
    expect(isValidModule('legal-moves')).toBe(false);
    expect(isValidModule('square-colors')).toBe(false);
  });

  it('rejects case-sensitive mismatches', () => {
    expect(isValidModule('COORDINATE_QUIZ')).toBe(false);
    expect(isValidModule('Coordinate_Quiz')).toBe(false);
  });

  it('rejects whitespace-padded strings', () => {
    expect(isValidModule(' coordinate_quiz')).toBe(false);
    expect(isValidModule('coordinate_quiz ')).toBe(false);
  });
});

describe('isValidPeriod', () => {
  it('accepts valid periods', () => {
    expect(isValidPeriod('all-time')).toBe(true);
    expect(isValidPeriod('weekly')).toBe(true);
    expect(isValidPeriod('monthly')).toBe(true);
  });

  it('rejects invalid periods', () => {
    expect(isValidPeriod('daily')).toBe(false);
    expect(isValidPeriod('')).toBe(false);
    expect(isValidPeriod('alltime')).toBe(false);
  });

  it('rejects underscore variants', () => {
    expect(isValidPeriod('all_time')).toBe(false);
  });

  it('rejects case-sensitive mismatches', () => {
    expect(isValidPeriod('ALL-TIME')).toBe(false);
    expect(isValidPeriod('Weekly')).toBe(false);
    expect(isValidPeriod('MONTHLY')).toBe(false);
  });
});

describe('isValidKey', () => {
  it('accepts valid keys for coordinate_quiz', () => {
    expect(isValidKey('coordinate_quiz', 'white')).toBe(true);
    expect(isValidKey('coordinate_quiz', 'black')).toBe(true);
    expect(isValidKey('coordinate_quiz', 'random')).toBe(true);
  });

  it('rejects invalid keys for coordinate_quiz', () => {
    expect(isValidKey('coordinate_quiz', 'king')).toBe(false);
    expect(isValidKey('coordinate_quiz', '')).toBe(false);
  });

  it('accepts all valid keys for legal_moves', () => {
    expect(isValidKey('legal_moves', 'king')).toBe(true);
    expect(isValidKey('legal_moves', 'queen')).toBe(true);
    expect(isValidKey('legal_moves', 'rook')).toBe(true);
    expect(isValidKey('legal_moves', 'bishop')).toBe(true);
    expect(isValidKey('legal_moves', 'knight')).toBe(true);
    expect(isValidKey('legal_moves', 'random')).toBe(true);
  });

  it('rejects invalid keys for legal_moves', () => {
    expect(isValidKey('legal_moves', 'pawn')).toBe(false);
    expect(isValidKey('legal_moves', 'white')).toBe(false);
    expect(isValidKey('legal_moves', '')).toBe(false);
  });

  it('accepts valid keys for square_colors', () => {
    expect(isValidKey('square_colors', 'default')).toBe(true);
  });

  it('rejects invalid keys for square_colors', () => {
    expect(isValidKey('square_colors', 'white')).toBe(false);
  });

  it('rejects keys that belong to a different module', () => {
    // 'default' is a square_colors key, not coordinate_quiz
    expect(isValidKey('coordinate_quiz', 'default')).toBe(false);
    // 'king' is a legal_moves key, not square_colors
    expect(isValidKey('square_colors', 'king')).toBe(false);
  });
});

describe('isValidPage', () => {
  it('accepts valid page numbers', () => {
    expect(isValidPage(1)).toBe(true);
    expect(isValidPage(100)).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidPage(0)).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(isValidPage(-1)).toBe(false);
  });

  it('rejects non-integer numbers', () => {
    expect(isValidPage(1.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidPage(NaN)).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(isValidPage(Infinity)).toBe(false);
  });

  it('rejects -Infinity', () => {
    expect(isValidPage(-Infinity)).toBe(false);
  });

  it('accepts MAX_SAFE_INTEGER', () => {
    expect(isValidPage(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it('rejects very small negative number', () => {
    expect(isValidPage(-Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe('parsePeriod', () => {
  it('returns valid values as-is', () => {
    expect(parsePeriod('all-time')).toBe('all-time');
    expect(parsePeriod('weekly')).toBe('weekly');
    expect(parsePeriod('monthly')).toBe('monthly');
  });

  it('falls back to "all-time" by default for undefined', () => {
    expect(parsePeriod(undefined)).toBe('all-time');
  });

  it('falls back to "all-time" by default for invalid values', () => {
    expect(parsePeriod('daily')).toBe('all-time');
    expect(parsePeriod('')).toBe('all-time');
    expect(parsePeriod('ALL-TIME')).toBe('all-time');
  });

  it('uses the provided fallback when value is invalid', () => {
    expect(parsePeriod(undefined, 'weekly')).toBe('weekly');
    expect(parsePeriod('nope', 'monthly')).toBe('monthly');
  });

  it('prefers the valid value over the fallback', () => {
    expect(parsePeriod('monthly', 'weekly')).toBe('monthly');
  });
});

describe('isValidModuleSlug', () => {
  it('accepts all six hyphenated module slugs', () => {
    expect(isValidModuleSlug('coordinate-quiz')).toBe(true);
    expect(isValidModuleSlug('legal-moves')).toBe(true);
    expect(isValidModuleSlug('square-colors')).toBe(true);
    expect(isValidModuleSlug('diagonal-quiz')).toBe(true);
    expect(isValidModuleSlug('board-symmetry')).toBe(true);
    expect(isValidModuleSlug('route-planner')).toBe(true);
  });

  it('rejects underscore-form module names', () => {
    expect(isValidModuleSlug('coordinate_quiz')).toBe(false);
    expect(isValidModuleSlug('legal_moves')).toBe(false);
  });

  it('rejects the "all" sentinel (that belongs to ModuleFilterValue, not slugs)', () => {
    expect(isValidModuleSlug('all')).toBe(false);
  });

  it('rejects unknown slugs', () => {
    expect(isValidModuleSlug('')).toBe(false);
    expect(isValidModuleSlug('unknown-module')).toBe(false);
    expect(isValidModuleSlug('Coordinate-Quiz')).toBe(false);
  });
});

describe('parseModuleFilter', () => {
  it('returns the valid underscore-form value as-is', () => {
    expect(parseModuleFilter('coordinate_quiz')).toBe('coordinate_quiz');
    expect(parseModuleFilter('legal_moves')).toBe('legal_moves');
  });

  it('passes through the "all" sentinel', () => {
    expect(parseModuleFilter('all')).toBe('all');
  });

  it('returns "all" for undefined / empty / invalid inputs', () => {
    expect(parseModuleFilter(undefined)).toBe('all');
    expect(parseModuleFilter('')).toBe('all');
    expect(parseModuleFilter('coordinate-quiz')).toBe('all'); // slug form rejected
    expect(parseModuleFilter('not-a-module')).toBe('all');
  });

  it('extracts the first element when given an array', () => {
    expect(parseModuleFilter(['legal_moves', 'square_colors'])).toBe('legal_moves');
  });

  it('falls back to "all" for an empty array', () => {
    expect(parseModuleFilter([])).toBe('all');
  });
});

describe('parseModuleSlugFilter', () => {
  it('returns the valid slug as-is', () => {
    expect(parseModuleSlugFilter('coordinate-quiz')).toBe('coordinate-quiz');
    expect(parseModuleSlugFilter('legal-moves')).toBe('legal-moves');
  });

  it('returns null for undefined / empty / invalid inputs', () => {
    expect(parseModuleSlugFilter(undefined)).toBeNull();
    expect(parseModuleSlugFilter('')).toBeNull();
    expect(parseModuleSlugFilter('coordinate_quiz')).toBeNull(); // underscore rejected
    expect(parseModuleSlugFilter('unknown-slug')).toBeNull();
    expect(parseModuleSlugFilter('all')).toBeNull();
  });

  it('extracts the first element when given an array', () => {
    expect(parseModuleSlugFilter(['legal-moves', 'square-colors'])).toBe('legal-moves');
  });
});
