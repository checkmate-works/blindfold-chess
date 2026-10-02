import { describe, expect, it } from 'vitest';

import { parsePieceParam, parsePieceSelectionSeed } from './query-params';

describe('parsePieceParam', () => {
  it('narrows the session to the named piece', () => {
    expect(parsePieceParam('rook')).toEqual({ selectedPiece: 'rook', selectedPieces: ['r'] });
    expect(parsePieceParam('king')).toEqual({ selectedPiece: 'king', selectedPieces: ['k'] });
  });

  it('drills every piece for random', () => {
    expect(parsePieceParam('random')).toEqual({
      selectedPiece: 'random',
      selectedPieces: ['k', 'q', 'r', 'b', 'n'],
    });
  });

  it('falls back to random when the param is missing or unknown', () => {
    for (const raw of [undefined, '', 'pawn', 'KNIGHT']) {
      expect(parsePieceParam(raw)).toEqual({
        selectedPiece: 'random',
        selectedPieces: ['k', 'q', 'r', 'b', 'n'],
      });
    }
  });
});

describe('parsePieceSelectionSeed', () => {
  it('maps a piece name to its piece type, and keeps random', () => {
    expect(parsePieceSelectionSeed('rook')).toBe('r');
    expect(parsePieceSelectionSeed('knight')).toBe('n');
    expect(parsePieceSelectionSeed('random')).toBe('random');
  });

  it('names no seed when the param is missing, repeated or unknown', () => {
    for (const raw of [undefined, '', 'pawn', 'KNIGHT', 'constructor', ['rook']]) {
      expect(parsePieceSelectionSeed(raw)).toBeUndefined();
    }
  });
});
