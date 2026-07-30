import { describe, expect, it } from 'vitest';

import { validatePositionForm } from './position-form-validation';

const valid = {
  trimmedFen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
  isFenValid: true,
  title: 'Pawn on e4',
};

describe('validatePositionForm', () => {
  it('passes a complete form', () => {
    expect(validatePositionForm(valid)).toBeNull();
  });

  it('separates an empty position from a malformed one — the fix differs', () => {
    expect(validatePositionForm({ ...valid, trimmedFen: '', isFenValid: false })).toEqual({
      field: 'fen',
      key: 'fenRequired',
    });
    expect(validatePositionForm({ ...valid, isFenValid: false })).toEqual({
      field: 'fen',
      key: 'positionInvalid',
    });
  });

  it('reports a blank title against the title control', () => {
    expect(validatePositionForm({ ...valid, title: '   ' })).toEqual({
      field: 'title',
      key: 'titleRequired',
    });
  });

  it('gates the position before the title', () => {
    expect(validatePositionForm({ trimmedFen: '', isFenValid: false, title: '' })?.field).toBe(
      'fen'
    );
  });
});
