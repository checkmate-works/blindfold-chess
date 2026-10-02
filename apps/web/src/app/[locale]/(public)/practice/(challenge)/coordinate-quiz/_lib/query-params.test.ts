import { describe, expect, it } from 'vitest';

import { parseOrientationSeed } from './query-params';

describe('parseOrientationSeed', () => {
  it('accepts every board orientation', () => {
    expect(parseOrientationSeed('white')).toBe('white');
    expect(parseOrientationSeed('black')).toBe('black');
    expect(parseOrientationSeed('random')).toBe('random');
  });

  it('names no seed when the param is missing, repeated or unknown', () => {
    for (const raw of [undefined, '', 'Black', 'red', ['black']]) {
      expect(parseOrientationSeed(raw)).toBeUndefined();
    }
  });
});
