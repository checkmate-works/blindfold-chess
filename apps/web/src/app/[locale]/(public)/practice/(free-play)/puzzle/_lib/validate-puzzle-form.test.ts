import { describe, expect, it } from 'vitest';

import { validatePuzzlePosition } from './validate-puzzle-form';

const valid = {
  trimmedFen: '8/8/8/8/4P3/8/8/4K2k w - - 0 1',
  isFenValid: true,
  title: 'Mate in 1',
};

describe('validatePuzzlePosition', () => {
  it('passes a complete position step', () => {
    expect(validatePuzzlePosition(valid)).toBeNull();
  });

  it('blames the position for both an empty and a malformed board', () => {
    expect(validatePuzzlePosition({ ...valid, trimmedFen: '' })).toEqual({
      field: 'fen',
      key: 'positionInvalid',
    });
    expect(validatePuzzlePosition({ ...valid, isFenValid: false })).toEqual({
      field: 'fen',
      key: 'positionInvalid',
    });
  });

  it('blames the title control for a blank title', () => {
    expect(validatePuzzlePosition({ ...valid, title: '  ' })).toEqual({
      field: 'title',
      key: 'titleRequired',
    });
  });

  it('gates the position before the title', () => {
    expect(validatePuzzlePosition({ trimmedFen: '', isFenValid: false, title: '' })?.field).toBe(
      'fen'
    );
  });
});
