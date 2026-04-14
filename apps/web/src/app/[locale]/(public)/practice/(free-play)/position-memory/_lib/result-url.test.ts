import { describe, expect, it } from 'vitest';

import { buildMultiResultUrl, buildSingleResultUrl } from './result-url';

const sampleResults = [
  {
    f: 'fen1',
    r: 'fen1r',
    b: 0,
    a: 87.5,
    c: 28,
    t: 32,
    i: 2,
    m: 1,
    e: 1,
    o: 0,
    s: 0,
  },
];

const sampleStats = { c: 28, t: 32, i: 2, m: 1, e: 1 };

describe('buildMultiResultUrl', () => {
  it('produces the expected path prefix for the given locale', () => {
    const url = buildMultiResultUrl({
      locale: 'en',
      results: sampleResults,
      stats: sampleStats,
      totalAccuracy: 87.6,
      isCustomFen: false,
      timeLimit: 30,
      shuffle: false,
      problemCount: 5,
    });
    expect(url.startsWith('/en/practice/position-memory/result?')).toBe(true);
  });

  it('serializes the core query-param schema (1-char data keys, retry keys)', () => {
    const url = buildMultiResultUrl({
      locale: 'ja',
      results: sampleResults,
      stats: sampleStats,
      totalAccuracy: 87.6,
      isCustomFen: true,
      timeLimit: 45,
      shuffle: true,
      problemCount: 3,
    });
    const params = new URLSearchParams(url.split('?')[1]);
    // Math.round on totalAccuracy
    expect(params.get('score')).toBe('88');
    expect(params.get('total')).toBe('100');
    expect(params.get('custom')).toBe('true');
    expect(params.get('timeLimit')).toBe('45');
    expect(params.get('shuffle')).toBe('1');
    expect(params.get('count')).toBe('3');
    // data & stats must be present (serde round-trip guard)
    expect(params.get('data')).not.toBeNull();
    expect(params.get('stats')).not.toBeNull();
  });

  it('emits shuffle=0 when shuffle is false and custom=false when not custom FEN', () => {
    const url = buildMultiResultUrl({
      locale: 'en',
      results: sampleResults,
      stats: sampleStats,
      totalAccuracy: 50,
      isCustomFen: false,
      timeLimit: 10,
      shuffle: false,
      problemCount: 1,
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('shuffle')).toBe('0');
    expect(params.get('custom')).toBe('false');
  });

  it('only includes optional pass-through params when provided', () => {
    const withOut = buildMultiResultUrl({
      locale: 'en',
      results: sampleResults,
      stats: sampleStats,
      totalAccuracy: 50,
      isCustomFen: false,
      timeLimit: 10,
      shuffle: false,
      problemCount: 1,
    });
    const withIn = buildMultiResultUrl({
      locale: 'en',
      results: sampleResults,
      stats: sampleStats,
      totalAccuracy: 50,
      isCustomFen: false,
      timeLimit: 10,
      shuffle: false,
      problemCount: 1,
      rawProblemsParam: 'p1,p2',
      sourceParam: 'preset',
      modeParam: 'custom',
    });
    const a = new URLSearchParams(withOut.split('?')[1]);
    const b = new URLSearchParams(withIn.split('?')[1]);
    expect(a.get('problems')).toBeNull();
    expect(a.get('source')).toBeNull();
    expect(a.get('mode')).toBeNull();
    expect(b.get('problems')).toBe('p1,p2');
    expect(b.get('source')).toBe('preset');
    expect(b.get('mode')).toBe('custom');
  });
});

describe('buildSingleResultUrl', () => {
  it('puts positionId in the path and preserves decimal score via toFixed(1)', () => {
    const url = buildSingleResultUrl({
      locale: 'en',
      positionId: 'abc-123',
      timeLimit: 30,
      results: sampleResults,
      stats: sampleStats,
    });
    expect(url.startsWith('/en/practice/position-memory/abc-123/result?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('score')).toBe('87.5');
    expect(params.get('total')).toBe('100');
    expect(params.get('timeLimit')).toBe('30');
    expect(params.get('data')).not.toBeNull();
    expect(params.get('stats')).not.toBeNull();
  });

  it('falls back to score 0.0 when results is empty', () => {
    const url = buildSingleResultUrl({
      locale: 'en',
      positionId: 'abc-123',
      timeLimit: 30,
      results: [],
      stats: sampleStats,
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('score')).toBe('0.0');
  });
});
