import { describe, expect, it } from 'vitest';

import { formatSignedDelta, signedDeltaTone } from './signed-delta';

describe('formatSignedDelta', () => {
  it('writes a positive integer delta with a plus', () => {
    expect(formatSignedDelta(2)).toBe('+2');
  });

  it('writes a negative integer delta with U+2212, not a hyphen', () => {
    expect(formatSignedDelta(-7)).toBe('−7');
    expect(formatSignedDelta(-7)).not.toBe('-7');
  });

  it('writes zero as ±0', () => {
    expect(formatSignedDelta(0)).toBe('±0');
  });

  it('keeps the requested decimals', () => {
    expect(formatSignedDelta(1.5, 1)).toBe('+1.5');
    expect(formatSignedDelta(-2, 1)).toBe('−2.0');
  });

  it('rounds before choosing the sign, so a near-zero delta is ±0', () => {
    expect(formatSignedDelta(0.04, 1)).toBe('±0');
    expect(formatSignedDelta(-0.04, 1)).toBe('±0');
    expect(formatSignedDelta(0.05, 1)).toBe('+0.1');
  });

  it('rounds integers when no decimals are requested', () => {
    expect(formatSignedDelta(0.4)).toBe('±0');
    expect(formatSignedDelta(0.6)).toBe('+1');
  });
});

describe('signedDeltaTone', () => {
  it('agrees with the rounding used for the text', () => {
    expect(signedDeltaTone(3)).toBe('up');
    expect(signedDeltaTone(-1)).toBe('down');
    expect(signedDeltaTone(0)).toBe('flat');
    expect(signedDeltaTone(0.04, 1)).toBe('flat');
    expect(signedDeltaTone(0.4)).toBe('flat');
  });
});
