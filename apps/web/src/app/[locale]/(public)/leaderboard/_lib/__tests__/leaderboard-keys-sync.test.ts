import { describe, expect, it } from 'vitest';

import { LEADERBOARD_KEYS } from '@/lib/db/data/achievements';

import { MODULE_KEYS } from '../types';

// ---------------------------------------------------------------------------
// LEADERBOARD_KEYS (achievements seed) ↔ MODULE_KEYS (leaderboard UI) sync
// ---------------------------------------------------------------------------

describe('LEADERBOARD_KEYS and MODULE_KEYS sync', () => {
  it('have the same set of menu type keys', () => {
    const leaderboardMenuTypes = Object.keys(LEADERBOARD_KEYS).sort();
    const moduleMenuTypes = Object.keys(MODULE_KEYS).sort();
    expect(leaderboardMenuTypes).toEqual(moduleMenuTypes);
  });

  it.each(Object.keys(MODULE_KEYS) as (keyof typeof MODULE_KEYS)[])(
    '%s has identical keys in both maps',
    (menuType) => {
      expect([...LEADERBOARD_KEYS[menuType]]).toEqual([...MODULE_KEYS[menuType]]);
    }
  );
});
