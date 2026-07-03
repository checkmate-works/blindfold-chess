import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, test } from 'vitest';

import { formatMovesToPgn } from './format-moves-to-pgn';

describe('formatMovesToPgn', () => {
  test('returns empty array for empty moves', () => {
    expect(formatMovesToPgn([], false, 1)).toEqual([]);
  });

  test('returns empty array for empty moves starting as black', () => {
    expect(formatMovesToPgn([], true, 1)).toEqual([]);
  });

  describe('starting as white', () => {
    test('single white move', () => {
      const moves: AlgebraicNotation[] = ['e4'];
      expect(formatMovesToPgn(moves, false, 1)).toEqual([
        {
          moveNumber: 1,
          whiteMove: 'e4',
          whiteMoveIndex: 0,
          blackMove: undefined,
          blackMoveIndex: undefined,
        },
      ]);
    });

    test('white + black move pair', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5'];
      expect(formatMovesToPgn(moves, false, 1)).toEqual([
        {
          moveNumber: 1,
          whiteMove: 'e4',
          whiteMoveIndex: 0,
          blackMove: 'e5',
          blackMoveIndex: 1,
        },
      ]);
    });

    test('multiple full move pairs', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6'];
      expect(formatMovesToPgn(moves, false, 1)).toEqual([
        {
          moveNumber: 1,
          whiteMove: 'e4',
          whiteMoveIndex: 0,
          blackMove: 'e5',
          blackMoveIndex: 1,
        },
        {
          moveNumber: 2,
          whiteMove: 'Nf3',
          whiteMoveIndex: 2,
          blackMove: 'Nc6',
          blackMoveIndex: 3,
        },
      ]);
    });

    test('odd number of moves (last pair incomplete)', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3'];
      expect(formatMovesToPgn(moves, false, 1)).toEqual([
        {
          moveNumber: 1,
          whiteMove: 'e4',
          whiteMoveIndex: 0,
          blackMove: 'e5',
          blackMoveIndex: 1,
        },
        {
          moveNumber: 2,
          whiteMove: 'Nf3',
          whiteMoveIndex: 2,
          blackMove: undefined,
          blackMoveIndex: undefined,
        },
      ]);
    });

    test('custom startMoveNumber', () => {
      const moves: AlgebraicNotation[] = ['Bxf7+', 'Ke7'];
      expect(formatMovesToPgn(moves, false, 5)).toEqual([
        {
          moveNumber: 5,
          whiteMove: 'Bxf7+',
          whiteMoveIndex: 0,
          blackMove: 'Ke7',
          blackMoveIndex: 1,
        },
      ]);
    });

    test('custom startMoveNumber with multiple pairs', () => {
      const moves: AlgebraicNotation[] = ['Nf3', 'Nc6', 'Bc4', 'e5'];
      expect(formatMovesToPgn(moves, false, 10)).toEqual([
        {
          moveNumber: 10,
          whiteMove: 'Nf3',
          whiteMoveIndex: 0,
          blackMove: 'Nc6',
          blackMoveIndex: 1,
        },
        {
          moveNumber: 11,
          whiteMove: 'Bc4',
          whiteMoveIndex: 2,
          blackMove: 'e5',
          blackMoveIndex: 3,
        },
      ]);
    });
  });

  describe('starting as black', () => {
    test('single black move', () => {
      const moves: AlgebraicNotation[] = ['e5'];
      expect(formatMovesToPgn(moves, true, 1)).toEqual([
        {
          moveNumber: 1,
          blackMove: 'e5',
          blackMoveIndex: 0,
        },
      ]);
    });

    test('black move followed by white+black pair', () => {
      const moves: AlgebraicNotation[] = ['e5', 'Nf3', 'Nc6'];
      expect(formatMovesToPgn(moves, true, 1)).toEqual([
        {
          moveNumber: 1,
          blackMove: 'e5',
          blackMoveIndex: 0,
        },
        {
          moveNumber: 2,
          whiteMove: 'Nf3',
          whiteMoveIndex: 1,
          blackMove: 'Nc6',
          blackMoveIndex: 2,
        },
      ]);
    });

    test('black move followed by incomplete white move', () => {
      const moves: AlgebraicNotation[] = ['e5', 'Nf3'];
      expect(formatMovesToPgn(moves, true, 1)).toEqual([
        {
          moveNumber: 1,
          blackMove: 'e5',
          blackMoveIndex: 0,
        },
        {
          moveNumber: 2,
          whiteMove: 'Nf3',
          whiteMoveIndex: 1,
          blackMove: undefined,
          blackMoveIndex: undefined,
        },
      ]);
    });

    test('custom startMoveNumber starting as black', () => {
      const moves: AlgebraicNotation[] = ['d5', 'c4', 'e6'];
      expect(formatMovesToPgn(moves, true, 3)).toEqual([
        {
          moveNumber: 3,
          blackMove: 'd5',
          blackMoveIndex: 0,
        },
        {
          moveNumber: 4,
          whiteMove: 'c4',
          whiteMoveIndex: 1,
          blackMove: 'e6',
          blackMoveIndex: 2,
        },
      ]);
    });

    test('multiple complete pairs after initial black move', () => {
      const moves: AlgebraicNotation[] = ['e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
      expect(formatMovesToPgn(moves, true, 1)).toEqual([
        {
          moveNumber: 1,
          blackMove: 'e5',
          blackMoveIndex: 0,
        },
        {
          moveNumber: 2,
          whiteMove: 'Nf3',
          whiteMoveIndex: 1,
          blackMove: 'Nc6',
          blackMoveIndex: 2,
        },
        {
          moveNumber: 3,
          whiteMove: 'Bc4',
          whiteMoveIndex: 3,
          blackMove: 'Nf6',
          blackMoveIndex: 4,
        },
      ]);
    });
  });
});
