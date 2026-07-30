import { describe, expect, it } from 'vitest';

import { BELT_COLOR_HEX, RANK_COLORS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from './belt-colors';

// ---------------------------------------------------------------------------
// getBeltColorHex
// ---------------------------------------------------------------------------

describe('getBeltColorHex', () => {
  it('should return the correct hex for each known rank slug', () => {
    const expected: Record<RankSlug, string> = {
      mukyu: BELT_COLOR_HEX[RANK_COLORS['mukyu']],
      '5kyu': BELT_COLOR_HEX[RANK_COLORS['5kyu']],
      '4kyu': BELT_COLOR_HEX[RANK_COLORS['4kyu']],
      '3kyu': BELT_COLOR_HEX[RANK_COLORS['3kyu']],
      '2kyu': BELT_COLOR_HEX[RANK_COLORS['2kyu']],
      '1kyu': BELT_COLOR_HEX[RANK_COLORS['1kyu']],
      '1dan': BELT_COLOR_HEX[RANK_COLORS['1dan']],
    };
    for (const [slug, hex] of Object.entries(expected)) {
      expect(getBeltColorHex(slug as RankSlug)).toBe(hex);
    }
  });

  it('should return #ffffff for mukyu (white belt)', () => {
    expect(getBeltColorHex('mukyu')).toBe('#ffffff');
  });

  it('should return fallback gray for an unknown slug', () => {
    // Force an unknown slug that has no matching color name
    const unknownSlug = 'unknown_rank' as RankSlug;
    // RANK_COLORS won't have this key, so colorName is undefined
    // BELT_COLOR_HEX[undefined] is undefined, so fallback '#6b7280' is returned
    expect(getBeltColorHex(unknownSlug)).toBe('#6b7280');
  });
});

// ---------------------------------------------------------------------------
// isWhiteBelt
// ---------------------------------------------------------------------------

describe('isWhiteBelt', () => {
  it('returns true for #ffffff (mukyu belt color)', () => {
    expect(isWhiteBelt('#ffffff')).toBe(true);
  });

  it('returns false for any non-white belt color', () => {
    expect(isWhiteBelt('#f97316')).toBe(false);
  });
});
