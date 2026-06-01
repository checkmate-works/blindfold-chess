import { describe, expect, it } from 'vitest';

import { uuidv7 } from './uuidv7';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  it('produces a canonical UUID string', () => {
    expect(uuidv7()).toMatch(UUID_RE);
  });

  it('sets the version nibble to 7', () => {
    // The 13th hex digit (version) must be '7'.
    expect(uuidv7()[14]).toBe('7');
  });

  it('sets the RFC variant (0b10 → 8/9/a/b)', () => {
    // The 17th hex digit (variant) must be one of 8,9,a,b.
    expect(uuidv7()[19]).toMatch(/[89ab]/);
  });

  it('encodes the timestamp in the leading 48 bits (big-endian)', () => {
    const now = 0x0123456789ab; // arbitrary 48-bit ms value
    const id = uuidv7(now);
    const tsHex = id.replace(/-/g, '').slice(0, 12);
    expect(tsHex).toBe('0123456789ab');
  });

  it('is time-ordered: later timestamps sort lexicographically after earlier', () => {
    const earlier = uuidv7(1_000_000_000_000);
    const later = uuidv7(2_000_000_000_000);
    expect(later > earlier).toBe(true);
  });

  it('generates distinct ids within the same millisecond', () => {
    const now = 1_700_000_000_000;
    const ids = new Set(Array.from({ length: 100 }, () => uuidv7(now)));
    expect(ids.size).toBe(100);
  });
});
