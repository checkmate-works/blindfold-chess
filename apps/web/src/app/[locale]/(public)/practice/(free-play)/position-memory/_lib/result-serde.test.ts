import { describe, expect, it } from 'vitest';

import {
  type SerializedResultItem,
  type SerializedStats,
  parseResults,
  parseStats,
  serializeResults,
  serializeStats,
} from './result-serde';

const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

describe('result-serde: results', () => {
  const item: SerializedResultItem = {
    f: '8/8/8/8/8/8/8/K6k w - - 0 1',
    r: '8/8/8/8/8/8/8/K7 w - - 0 1',
    b: 1,
    a: 50,
    c: 1,
    t: 2,
    i: 0,
    m: 1,
    e: 0,
    o: 3,
    s: 0,
  };
  const parsedItem = {
    fen: item.f,
    recreatedFen: item.r,
    isBlackToMove: true,
    accuracy: 50,
    correctPieces: 1,
    totalPieces: 2,
    incorrectPieces: 0,
    missingPieces: 1,
    extraPieces: 0,
    originalIndex: 3,
    skipped: false,
  };

  it('round-trips what the session serializes', () => {
    expect(parseResults(serializeResults([item]))).toEqual([parsedItem]);
  });

  it.each([null, '', 'not-json', '%E0%A4%A'])(
    'is empty for absent or undecodable data: %j',
    (data) => {
      expect(parseResults(data)).toEqual([]);
    }
  );

  it.each([null, 42, 'text', { 0: item }])(
    'is empty when the payload is not an array: %j',
    (value) => {
      expect(parseResults(encode(value))).toEqual([]);
    }
  );

  it('drops entries of the wrong shape and keeps the well-formed ones', () => {
    const { a: _a, ...withoutAccuracy } = item;
    expect(
      parseResults(
        encode([
          null,
          'a1',
          [item],
          {},
          withoutAccuracy,
          { ...item, f: 1 },
          { ...item, r: null },
          { ...item, c: '1' },
          item,
        ])
      )
    ).toEqual([parsedItem]);
  });
});

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

  it.each([
    ['a non-object', null],
    ['an array', [28, 32, 2, 1, 1]],
    ['an empty object', {}],
    ['a missing count', { c: 28, t: 32, i: 2, m: 1 }],
    ['a count that is a string', { c: '28', t: 32, i: 2, m: 1, e: 1 }],
    ['a mistake total that is not a number', { c: 28, t: 32, i: 2, m: 1, e: 1, k: 'x' }],
  ])('returns null for %s', (_label, value) => {
    expect(parseStats(encode(value))).toBeNull();
  });

  it('serializes mistakes=0 explicitly and round-trips correctly', () => {
    const stats: SerializedStats = { c: 32, t: 32, i: 0, m: 0, e: 0, k: 0 };
    const parsed = parseStats(serializeStats(stats));

    expect(parsed?.mistakes).toBe(0);
  });
});
