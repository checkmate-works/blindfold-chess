import { describe, expect, it } from 'vitest';

import { PRACTICE_CATALOG, relatedPractices } from './practice-catalog';
import { PRACTICE_LEVELS } from './practice-levels';

describe('PRACTICE_CATALOG', () => {
  it('lists the bands in PRACTICE_LEVELS order', () => {
    const bands = [...new Set(PRACTICE_CATALOG.map((entry) => entry.level))];
    expect(bands).toEqual([...PRACTICE_LEVELS]);
  });

  it('keeps every route segment unique', () => {
    const ids = PRACTICE_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('relatedPractices', () => {
  it('returns the other modules in the same band, in list order', () => {
    expect(relatedPractices('diagonal-quiz').map((entry) => entry.id)).toEqual([
      'board-symmetry',
      'route-planner',
    ]);
  });

  it('never includes the module itself', () => {
    for (const { id } of PRACTICE_CATALOG) {
      expect(relatedPractices(id).map((entry) => entry.id)).not.toContain(id);
    }
  });

  it('is empty for an unknown module', () => {
    expect(relatedPractices('no-such-module')).toEqual([]);
  });
});
