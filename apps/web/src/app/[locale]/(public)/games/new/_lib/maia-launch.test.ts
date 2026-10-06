import { describe, expect, it } from 'vitest';

import { DEFAULT_ENGINE } from '@/lib/engines';
import { MAIA_FREE_LEVEL } from '@/lib/users/maia-free-level';

import { deriveMaiaCardMode, initialEngineKind } from './maia-launch';

const COST = 1;

describe('deriveMaiaCardMode', () => {
  it('is free from the free level regardless of balance', () => {
    expect(deriveMaiaCardMode({ level: MAIA_FREE_LEVEL, spendableBalance: 0 }, COST)).toBe('free');
  });

  it('is payable below the free level when the balance covers one game', () => {
    expect(deriveMaiaCardMode({ level: MAIA_FREE_LEVEL - 1, spendableBalance: COST }, COST)).toBe(
      'payable'
    );
  });

  it('is locked below the free level when the balance does not cover one game', () => {
    expect(deriveMaiaCardMode({ level: 0, spendableBalance: COST - 1 }, COST)).toBe('locked');
  });
});

describe('initialEngineKind', () => {
  it('honours ?engine=maia when the card is free or payable', () => {
    expect(initialEngineKind('maia', 'free')).toBe('maia');
    expect(initialEngineKind('maia', 'payable')).toBe('maia');
  });

  it('falls back to the default engine when the Maia card is locked', () => {
    expect(initialEngineKind('maia', 'locked')).toBe(DEFAULT_ENGINE);
  });

  it('falls back to the default engine without the param', () => {
    expect(initialEngineKind(null, 'free')).toBe(DEFAULT_ENGINE);
    expect(initialEngineKind('stockfish', 'free')).toBe(DEFAULT_ENGINE);
  });
});
