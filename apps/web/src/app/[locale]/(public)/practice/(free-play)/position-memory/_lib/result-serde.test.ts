import { describe, expect, it } from 'vitest';

import { type SerializedStats, parseStats, serializeStats } from './result-serde';

describe('result-serde: stats round-trip', () => {
  it('preserves all fields including mistakes (k) across serialize → parse', () => {
    const stats: SerializedStats = { c: 28, t: 32, i: 2, m: 1, e: 1, k: 4 };
    const parsed = parseStats(serializeStats(stats));

    expect(parsed).toEqual({
      correctPieces: 28,
      totalPieces: 32,
      incorrectPieces: 2,
      missingPieces: 1,
      extraPieces: 1,
      mistakes: 4,
    });
  });

  it('defaults mistakes to 0 when k is absent (legacy payload)', () => {
    // Simulate a pre-mistakes-tracking URL where `k` was not included.
    const legacy = encodeURIComponent(JSON.stringify({ c: 10, t: 12, i: 1, m: 1, e: 0 }));
    const parsed = parseStats(legacy);

    expect(parsed).toEqual({
      correctPieces: 10,
      totalPieces: 12,
      incorrectPieces: 1,
      missingPieces: 1,
      extraPieces: 0,
      mistakes: 0,
    });
  });

  it('returns null on malformed stats payload', () => {
    expect(parseStats('not-json')).toBeNull();
    expect(parseStats(null)).toBeNull();
  });

  it('serializes mistakes=0 explicitly and round-trips correctly', () => {
    const stats: SerializedStats = { c: 32, t: 32, i: 0, m: 0, e: 0, k: 0 };
    const parsed = parseStats(serializeStats(stats));

    expect(parsed?.mistakes).toBe(0);
  });
});
