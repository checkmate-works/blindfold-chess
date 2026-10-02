import { describe, expect, it } from 'vitest';

import { parsePieceSelectionSeed } from './query-params';

describe('parsePieceSelectionSeed', () => {
  it('maps a route-planner piece name to its piece type', () => {
    expect(parsePieceSelectionSeed('bishop')).toBe('b');
    expect(parsePieceSelectionSeed('knight')).toBe('n');
  });

  it('names no seed when the param is missing, repeated or not a route-planner piece', () => {
    for (const raw of [undefined, '', 'rook', 'BISHOP', 'constructor', ['bishop']]) {
      expect(parsePieceSelectionSeed(raw)).toBeUndefined();
    }
  });
});
