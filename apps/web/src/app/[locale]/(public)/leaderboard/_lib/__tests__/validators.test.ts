import { describe, expect, it } from 'vitest';

import { isValidKey, isValidModule, isValidPage, isValidPeriod } from '../validators';

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
