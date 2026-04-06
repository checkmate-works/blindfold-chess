import { describe, expect, it } from 'vitest';

import { isGameFinished } from './game-utils';

describe('isGameFinished', () => {
  it('should return true for win', () => {
    expect(isGameFinished('win')).toBe(true);
  });

  it('should return true for loss', () => {
    expect(isGameFinished('loss')).toBe(true);
  });

  it('should return true for draw', () => {
    expect(isGameFinished('draw')).toBe(true);
  });

  it('should return false for in_progress', () => {
    expect(isGameFinished('in_progress')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isGameFinished('')).toBe(false);
  });
});
