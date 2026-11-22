import { describe, expect, it } from 'vitest';

import { DEFAULT_ENGINE } from '@/lib/engines';
import { MAIA_UNLOCK_LEVEL } from '@/lib/users/maia-unlock-level';

import { deriveMaiaCardMode, initialEngineKind } from './maia-launch';

describe('deriveMaiaCardMode', () => {
  it('is unlocked from the unlock level', () => {
    expect(deriveMaiaCardMode({ level: MAIA_UNLOCK_LEVEL })).toBe('unlocked');
  });

  it('is locked below the unlock level', () => {
    expect(deriveMaiaCardMode({ level: MAIA_UNLOCK_LEVEL - 1 })).toBe('locked');
    expect(deriveMaiaCardMode({ level: 0 })).toBe('locked');
  });
});

describe('initialEngineKind', () => {
  it('honours ?engine=maia when the card is unlocked', () => {
    expect(initialEngineKind('maia', 'unlocked')).toBe('maia');
  });

  it('falls back to the default engine when the Maia card is locked', () => {
    expect(initialEngineKind('maia', 'locked')).toBe(DEFAULT_ENGINE);
  });

  it('falls back to the default engine without the param', () => {
    expect(initialEngineKind(null, 'unlocked')).toBe(DEFAULT_ENGINE);
    expect(initialEngineKind('stockfish', 'unlocked')).toBe(DEFAULT_ENGINE);
  });
});
