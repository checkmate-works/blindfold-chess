import { describe, expect, it } from 'vitest';

import { applyBoardSymmetryBackspace } from './backspace';

describe('applyBoardSymmetryBackspace', () => {
  it('clears the rank first when both file and rank are set', () => {
    expect(applyBoardSymmetryBackspace({ selectedFile: 'd', selectedRank: '4' })).toEqual({
      selectedFile: 'd',
      selectedRank: null,
    });
  });

  it('clears only the rank when only the rank is set', () => {
    expect(applyBoardSymmetryBackspace({ selectedFile: null, selectedRank: '4' })).toEqual({
      selectedFile: null,
      selectedRank: null,
    });
  });

  it('clears the file when only the file is set', () => {
    expect(applyBoardSymmetryBackspace({ selectedFile: 'd', selectedRank: null })).toEqual({
      selectedFile: null,
      selectedRank: null,
    });
  });

  it('is a no-op when nothing is selected', () => {
    const state = { selectedFile: null, selectedRank: null };
    expect(applyBoardSymmetryBackspace(state)).toEqual(state);
  });
});
