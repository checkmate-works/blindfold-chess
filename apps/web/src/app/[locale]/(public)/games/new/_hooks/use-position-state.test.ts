import type { Side } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePositionState } from './use-position-state';

/**
 * Locks in the auto-sync semantics after the migration from `useEffect`s to
 * render-phase state adjustments. The rules themselves are behavioral
 * contracts of the custom-position form:
 *
 *  1. Color change wipes the en-passant selection (once suppressible via
 *     `skipNextColorReset` for URL restores).
 *  2. An en-passant selection that stops matching the pawns on the board is
 *     cleared PERSISTENTLY — it must not resurrect when the board becomes
 *     compatible again.
 *  3. Castling rights un-check when the king/rook layout stops supporting
 *     them, same persistence rule.
 *
 * Plus the property the migration adds: `fullFen` never exposes a value an
 * auto-sync rule is about to remove (the effect version leaked it for one
 * frame).
 */

// Black pawn on e5 → for white to move, en-passant target on the e-file is
// plausible. Kings/rooks on their home squares so castling stays available.
const BOARD_WITH_E5_BLACK_PAWN = 'r3k2r/8/8/4p3/8/8/8/R3K2R';
// Same board without the e5 pawn.
const BOARD_WITHOUT_E5_PAWN = 'r3k2r/8/8/8/8/8/8/R3K2R';
// White rook moved off h1 → kingside castling (K) no longer available.
const BOARD_ROOK_OFF_H1 = 'r3k2r/8/8/4p3/8/8/7R/R3K3';

function setup(initialColor: Side = 'white') {
  return renderHook(({ color }: { color: Side }) => usePositionState({ color }), {
    initialProps: { color: initialColor },
  });
}

describe('usePositionState auto-sync rules', () => {
  it('resets en passant when the color changes', () => {
    const { result, rerender } = setup('white');
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
      result.current.setPositionEnPassant('e6');
    });
    expect(result.current.positionEnPassant).toBe('e6');

    rerender({ color: 'black' });
    expect(result.current.positionEnPassant).toBe('-');
  });

  it('skipNextColorReset lets a same-tick URL-restored target survive the color change', () => {
    // Mirrors the URL-restore flow in PositionGameForm: flag + color + board
    // + target are all applied in one batch (`?fen=... b - e3` with a white
    // pawn on e4 — a target that is only valid for black).
    const BOARD_WITH_E4_WHITE_PAWN = 'r3k2r/8/8/8/4P3/8/8/R3K2R';
    const { result, rerender } = setup('white');
    act(() => {
      result.current.skipNextColorReset();
      result.current.setPositionFen(BOARD_WITH_E4_WHITE_PAWN);
      result.current.setPositionEnPassant('e3');
      rerender({ color: 'black' });
    });
    expect(result.current.positionEnPassant).toBe('e3');

    // The one-shot flag was consumed: the next color change resets again.
    rerender({ color: 'white' });
    expect(result.current.positionEnPassant).toBe('-');
  });

  it('without the skip flag, the same batched restore is wiped by the color reset', () => {
    // Control for the test above: identical flow minus `skipNextColorReset`
    // proves the assertion actually detects a missing suppression.
    const BOARD_WITH_E4_WHITE_PAWN = 'r3k2r/8/8/8/4P3/8/8/R3K2R';
    const { result, rerender } = setup('white');
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E4_WHITE_PAWN);
      result.current.setPositionEnPassant('e3');
      rerender({ color: 'black' });
    });
    expect(result.current.positionEnPassant).toBe('-');
  });

  it('clears an en-passant selection the board no longer supports, permanently', () => {
    const { result } = setup('white');
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
      result.current.setPositionEnPassant('e6');
    });
    expect(result.current.positionEnPassant).toBe('e6');

    // Remove the e5 pawn → selection invalid → cleared.
    act(() => {
      result.current.setPositionFen(BOARD_WITHOUT_E5_PAWN);
    });
    expect(result.current.positionEnPassant).toBe('-');

    // Put the pawn back: the cleared selection must NOT resurrect.
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
    });
    expect(result.current.positionEnPassant).toBe('-');
  });

  it('un-checks castling rights the king/rook layout stops supporting', () => {
    const { result } = setup('white');
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
      result.current.setPositionCastling({ K: true, Q: true, k: true, q: true });
    });
    expect(result.current.positionCastling).toEqual({ K: true, Q: true, k: true, q: true });

    act(() => {
      result.current.setPositionFen(BOARD_ROOK_OFF_H1);
    });
    expect(result.current.positionCastling).toEqual({ K: false, Q: true, k: true, q: true });

    // Restoring the rook must not resurrect the right.
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
    });
    expect(result.current.positionCastling).toEqual({ K: false, Q: true, k: true, q: true });
  });

  it('fullFen never exposes a value an auto-sync rule removes', () => {
    const { result } = setup('white');
    act(() => {
      result.current.setPositionFen(BOARD_WITH_E5_BLACK_PAWN);
      result.current.setPositionCastling({ K: true, Q: true, k: true, q: true });
      result.current.setPositionEnPassant('e6');
    });
    // Invalidate both the en-passant target and kingside castling in one
    // board edit; the observable fullFen must already be converged.
    act(() => {
      result.current.setPositionFen(BOARD_ROOK_OFF_H1.replace('4p3', '8'));
    });
    const [, , castlingField, enPassantField] = result.current.fullFen.split(' ');
    expect(enPassantField).toBe('-');
    expect(castlingField).not.toContain('K');
    expect(castlingField).toContain('Q');
  });
});
