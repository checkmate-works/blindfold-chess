import { describe, expect, it } from 'vitest';

import { EVALUATION_LOSS_THRESHOLDS } from '@/lib/games/evaluation-types';

import { classifyMove } from './classify-move';

describe('classifyMove', () => {
  it('grades losses at each threshold boundary', () => {
    expect(classifyMove(0)).toBe('best');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.best)).toBe('best');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.best + 1)).toBe('good');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.good)).toBe('good');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.good + 1)).toBe('inaccuracy');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.inaccuracy)).toBe('inaccuracy');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.inaccuracy + 1)).toBe('mistake');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.mistake)).toBe('mistake');
    expect(classifyMove(EVALUATION_LOSS_THRESHOLDS.mistake + 1)).toBe('blunder');
    expect(classifyMove(2000)).toBe('blunder');
  });
});
