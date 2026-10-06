import { describe, expect, it } from 'vitest';

import { MAIA_FREE_LEVEL, isMaiaFreeAtLevel } from './maia-free-level';

describe('isMaiaFreeAtLevel', () => {
  it('is free from the threshold level upwards', () => {
    expect(isMaiaFreeAtLevel(MAIA_FREE_LEVEL)).toBe(true);
    expect(isMaiaFreeAtLevel(MAIA_FREE_LEVEL + 40)).toBe(true);
  });

  it('is not free below the threshold, including Lv0', () => {
    expect(isMaiaFreeAtLevel(MAIA_FREE_LEVEL - 1)).toBe(false);
    expect(isMaiaFreeAtLevel(0)).toBe(false);
  });
});
