import { describe, expect, it } from 'vitest';

import { MAIA_UNLOCK_LEVEL, isMaiaUnlockedAtLevel } from './maia-unlock-level';

describe('isMaiaUnlockedAtLevel', () => {
  it('is free from the threshold level upwards', () => {
    expect(isMaiaUnlockedAtLevel(MAIA_UNLOCK_LEVEL)).toBe(true);
    expect(isMaiaUnlockedAtLevel(MAIA_UNLOCK_LEVEL + 40)).toBe(true);
  });

  it('is not free below the threshold, including Lv0', () => {
    expect(isMaiaUnlockedAtLevel(MAIA_UNLOCK_LEVEL - 1)).toBe(false);
    expect(isMaiaUnlockedAtLevel(0)).toBe(false);
  });
});
