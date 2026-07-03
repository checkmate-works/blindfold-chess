import { describe, expect, it } from 'vitest';

import {
  derivePawnHideOn,
  derivePieceVisibilityMode,
  deriveStonesState,
  getAvailableShapeOptions,
  getSideColorSamples,
  realignShapeMode,
} from './piece-appearance-model';

describe('derivePieceVisibilityMode', () => {
  it('maps the boolean pair onto the 3-way radio', () => {
    expect(derivePieceVisibilityMode({ showOwnPieces: true, showOpponentPieces: true })).toBe(
      'all'
    );
    expect(derivePieceVisibilityMode({ showOwnPieces: true, showOpponentPieces: false })).toBe(
      'own'
    );
    expect(derivePieceVisibilityMode({ showOwnPieces: false, showOpponentPieces: true })).toBe(
      'opponent'
    );
  });

  it('falls back for the unreachable neither-shown combination', () => {
    expect(derivePieceVisibilityMode({ showOwnPieces: false, showOpponentPieces: false })).toBe(
      'opponent'
    );
  });
});

describe('deriveStonesState', () => {
  it('derives the toggle, side, and default shape when both sides are visible', () => {
    expect(
      deriveStonesState({
        showOwnPieces: true,
        showOpponentPieces: true,
        pieceShapeMode: 'circles-own',
      })
    ).toEqual({
      stonesOn: true,
      bothVisible: true,
      stonesDefaultShape: 'circles-all',
      stonesSide: 'own',
    });
  });

  it('defaults the shape to the visible side when one side is hidden', () => {
    expect(
      deriveStonesState({
        showOwnPieces: false,
        showOpponentPieces: true,
        pieceShapeMode: 'normal',
      })
    ).toEqual({
      stonesOn: false,
      bothVisible: false,
      stonesDefaultShape: 'circles-opponent',
      stonesSide: 'all',
    });
  });
});

describe('derivePawnHideOn', () => {
  it('is on for any non-none mode', () => {
    expect(derivePawnHideOn({ pawnHideMode: 'none' })).toBe(false);
    expect(derivePawnHideOn({ pawnHideMode: 'own' })).toBe(true);
  });
});

describe('getAvailableShapeOptions', () => {
  it('offers every option while both sides are visible', () => {
    expect(getAvailableShapeOptions({ showOwnPieces: true, showOpponentPieces: true })).toEqual([
      'normal',
      'circles-all',
      'circles-own',
      'circles-opponent',
    ]);
  });

  it('drops the options that reference a hidden side', () => {
    expect(getAvailableShapeOptions({ showOwnPieces: true, showOpponentPieces: false })).toEqual([
      'normal',
      'circles-own',
    ]);
  });
});

describe('realignShapeMode', () => {
  it('returns null while the current shape is still valid', () => {
    expect(
      realignShapeMode({
        showOwnPieces: true,
        showOpponentPieces: true,
        pieceShapeMode: 'circles-all',
      })
    ).toBeNull();
    expect(
      realignShapeMode({
        showOwnPieces: false,
        showOpponentPieces: true,
        pieceShapeMode: 'normal',
      })
    ).toBeNull();
  });

  it('repairs an out-of-range shape to the visible-side stones mode', () => {
    // Hiding the opponent invalidates 'circles-all' → realign to own-side stones,
    // keeping the stones toggle on.
    expect(
      realignShapeMode({
        showOwnPieces: true,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-all',
      })
    ).toBe('circles-own');
    expect(
      realignShapeMode({
        showOwnPieces: false,
        showOpponentPieces: true,
        pieceShapeMode: 'circles-own',
      })
    ).toBe('circles-opponent');
  });
});

describe('getSideColorSamples', () => {
  it('anchors "own" to the player side', () => {
    expect(getSideColorSamples('white')).toEqual({
      ownColor: 'w',
      oppColor: 'b',
      sideSamples: { all: ['w', 'b'], own: ['w'], opponent: ['b'] },
    });
    expect(getSideColorSamples('black').sideSamples).toEqual({
      all: ['b', 'w'],
      own: ['b'],
      opponent: ['w'],
    });
  });
});
