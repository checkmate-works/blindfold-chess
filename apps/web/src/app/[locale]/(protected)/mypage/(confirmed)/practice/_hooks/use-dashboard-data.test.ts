import { describe, expect, it } from 'vitest';

import { ORIENTATION_FILTER_MENUS, PIECE_FILTER_MENUS, PIECE_TYPES } from './use-dashboard-data';

describe('PIECE_TYPES', () => {
  it('contains exactly king, queen, rook, bishop, and knight', () => {
    expect([...PIECE_TYPES]).toEqual(['k', 'q', 'r', 'b', 'n']);
  });

  it('has 5 entries', () => {
    expect(PIECE_TYPES).toHaveLength(5);
  });
});

describe('ORIENTATION_FILTER_MENUS', () => {
  it('contains coordinate_quiz', () => {
    expect(ORIENTATION_FILTER_MENUS.has('coordinate_quiz')).toBe(true);
  });

  it('does not contain legal_moves', () => {
    expect(ORIENTATION_FILTER_MENUS.has('legal_moves')).toBe(false);
  });

  it('does not contain square_colors', () => {
    expect(ORIENTATION_FILTER_MENUS.has('square_colors')).toBe(false);
  });

  it('has exactly 1 entry', () => {
    expect(ORIENTATION_FILTER_MENUS.size).toBe(1);
  });
});

describe('PIECE_FILTER_MENUS', () => {
  it('contains legal_moves', () => {
    expect(PIECE_FILTER_MENUS.has('legal_moves')).toBe(true);
  });

  it('does not contain coordinate_quiz', () => {
    expect(PIECE_FILTER_MENUS.has('coordinate_quiz')).toBe(false);
  });

  it('does not contain square_colors', () => {
    expect(PIECE_FILTER_MENUS.has('square_colors')).toBe(false);
  });

  it('has exactly 1 entry', () => {
    expect(PIECE_FILTER_MENUS.size).toBe(1);
  });
});
