import { describe, expect, it } from 'vitest';

import type { RevealableAxes } from './reveal-preferences';
import { hidesAnyPiece, revealPieces } from './reveal-preferences';

const sighted: RevealableAxes = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

describe('revealPieces', () => {
  it('turns every blindfold axis off', () => {
    expect(
      revealPieces({
        boardVisibility: 'never',
        showOwnPieces: false,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-all',
        pieceColors: 'white-only',
        pawnHideMode: 'all',
      })
    ).toEqual(sighted);
  });

  it('passes unrelated display preferences through', () => {
    const revealed = revealPieces({
      ...sighted,
      showOwnPieces: false,
      boardTheme: 'walnut',
      showCoordinates: false,
      highlightLastMove: false,
    });

    expect(revealed.boardTheme).toBe('walnut');
    expect(revealed.showCoordinates).toBe(false);
    expect(revealed.highlightLastMove).toBe(false);
    expect(revealed.showOwnPieces).toBe(true);
  });

  it('does not mutate its input', () => {
    const input = { ...sighted, showOwnPieces: false };
    revealPieces(input);
    expect(input.showOwnPieces).toBe(false);
  });
});

describe('hidesAnyPiece', () => {
  it('is false for a fully sighted game', () => {
    expect(hidesAnyPiece(sighted)).toBe(false);
  });

  it('is true for a masked board even when both sides are flagged visible', () => {
    expect(hidesAnyPiece({ ...sighted, boardVisibility: 'peek' })).toBe(true);
    expect(hidesAnyPiece({ ...sighted, boardVisibility: 'never' })).toBe(true);
  });

  it.each([
    ['own pieces hidden', { showOwnPieces: false }],
    ['opponent pieces hidden', { showOpponentPieces: false }],
    ['pawns hidden', { pawnHideMode: 'own' as const }],
    ['pieces drawn as circles', { pieceShapeMode: 'circles-opponent' as const }],
    ['pieces in one colour', { pieceColors: 'black-only' as const }],
  ])('is true when %s', (_label, override) => {
    expect(hidesAnyPiece({ ...sighted, ...override })).toBe(true);
  });
});
