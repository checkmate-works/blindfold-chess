import { describe, expect, test } from 'vitest';

import { moveNavDisabledState } from './move-nav-disabled-state';

describe('moveNavDisabledState', () => {
  test('disables both buttons at the start of an empty game', () => {
    expect(moveNavDisabledState(-1, 0)).toEqual({
      isPreviousDisabled: true,
      isNextDisabled: true,
    });
  });

  test('disables previous but not next once moves exist at latest', () => {
    expect(moveNavDisabledState(-1, 5)).toEqual({
      isPreviousDisabled: false,
      isNextDisabled: true,
    });
  });

  test('disables previous, enables next at the explicit start position', () => {
    expect(moveNavDisabledState(-2, 5)).toEqual({
      isPreviousDisabled: true,
      isNextDisabled: false,
    });
  });

  test('enables both buttons at a mid-game position', () => {
    expect(moveNavDisabledState(2, 5)).toEqual({
      isPreviousDisabled: false,
      isNextDisabled: false,
    });
  });
});
