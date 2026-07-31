'use client';

import { useCallback, useMemo, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

import type { CastlingRights } from '../_components/PositionSettings';
import { buildFenFromParts } from '../_lib/build-fen-from-parts';
import { getCastlingAvailability } from '../_lib/get-castling-availability';
import { getEnPassantAvailability } from '../_lib/get-en-passant-availability';
import { validatePosition } from '../_lib/validate-position';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

const EMPTY_CASTLING: CastlingRights = { K: false, Q: false, k: false, q: false };

/**
 * Manages the FEN-by-parts state for the custom-position new-game form.
 *
 * A FEN string has four mutable parts the user touches independently:
 * the board layout (rank-by-rank piece placement), the side to move
 * (derived here from the player's chosen color), castling rights (a
 * four-bool record), and an optional en-passant target square. Keeping
 * those parts as separate state slots is what the parent UI needs — the
 * `EditableChessBoard` writes only the board, the `PositionSettings`
 * accordion writes castling + en-passant, and the side-to-move comes
 * from the ColorSelector — so the hook owns them as parallel pieces and
 * exposes the composed `fullFen` derivation for the URL builder.
 *
 * The hook also owns three auto-sync rules that previously lived as
 * standalone `useEffect`s in the form. They are applied by *adjusting
 * state during render* (React's documented pattern for state that must
 * track other state/props), not in effects: the effect version committed
 * one frame in which `fullFen` still contained an en-passant target or
 * castling right the rule was about to remove, so anything reading
 * `fullFen` in that frame captured a FEN the UI never intended. The
 * render-phase adjustment converges before commit, so no such frame
 * exists. Co-locating them with the state keeps the rules and the data
 * they protect in one module:
 *
 *  1. En-passant resets on a color change. A pawn double-push that
 *     would create an en-passant target is invalidated the moment the
 *     side-to-move flips. The `skipNextColorReset()` escape hatch
 *     suppresses this once when the parent is *also* setting color from
 *     a URL parameter (so the URL-supplied en-passant survives the
 *     same-tick color set).
 *  2. En-passant clears when the current selection no longer lines up
 *     with the pawn positions on the board. Without this rule, the
 *     accordion would keep showing (and the URL would carry) a target
 *     square that contradicts the board.
 *  3. Castling rights un-check when the relevant rook + king positions
 *     no longer support that side of castling. Same intent: keep what
 *     the user sees consistent with what the board contains.
 *
 * Validation (`validatePosition`) is also folded in so the parent can
 * read `validity.valid` / `validity.errorKey` / `validity.correctedColor`
 * without re-running `useMemo` on the same inputs.
 */
export function usePositionState({ color }: { color: Side }) {
  const [positionFen, setPositionFen] = useState(EMPTY_BOARD_FEN);
  const [positionCastling, setPositionCastling] = useState<CastlingRights>(EMPTY_CASTLING);
  const [positionEnPassant, setPositionEnPassant] = useState('-');
  // State (not a ref) so that consuming the one-shot flag during render is
  // discarded together with the render if React throws the pass away.
  const [skipColorReset, setSkipColorReset] = useState(false);

  // Derive turn from color selection.
  const positionTurn = useMemo<'w' | 'b'>(() => (color === 'white' ? 'w' : 'b'), [color]);

  // Auto-sync 1: reset en passant when color changes (unless the parent
  // explicitly suppressed this for a URL-init color set). Render-phase
  // adjustment with the previous color tracked in state — the standard
  // "reset some state when a prop changes" form.
  const [prevColor, setPrevColor] = useState(color);
  if (color !== prevColor) {
    setPrevColor(color);
    if (skipColorReset) {
      setSkipColorReset(false);
    } else {
      setPositionEnPassant('-');
    }
  }

  // Compute availability for the accordion's checkboxes & dropdown.
  const castlingAvailability = useMemo(() => getCastlingAvailability(positionFen), [positionFen]);
  const enPassantAvailability = useMemo(
    () => getEnPassantAvailability(positionFen, positionTurn),
    [positionFen, positionTurn]
  );

  // Auto-sync 2: clear en passant if the current selection is no longer
  // a valid target given the pawns on the board. Persistent clear (not a
  // pure derivation): a selection that momentarily became invalid must not
  // resurrect if a later board edit makes that square available again.
  if (positionEnPassant !== '-' && !enPassantAvailability[positionEnPassant[0]]) {
    setPositionEnPassant('-');
  }

  // Auto-sync 3: un-check castling rights that no longer match the
  // king/rook layout. Same persistent-clear rationale as auto-sync 2.
  const clampedCastling = { ...positionCastling };
  let castlingChanged = false;
  for (const key of ['K', 'Q', 'k', 'q'] as const) {
    if (clampedCastling[key] && !castlingAvailability[key]) {
      clampedCastling[key] = false;
      castlingChanged = true;
    }
  }
  if (castlingChanged) {
    setPositionCastling(clampedCastling);
  }

  // Full FEN built from parts. Computed AFTER the render-phase adjustments
  // above so a just-cleared en-passant/castling value can never leak into
  // the composed FEN — under the old effect-based sync it could, for one
  // frame. (When an adjustment fires, React re-renders before committing,
  // so this line only ever emits the converged value.)
  const fullFen = useMemo(
    () => buildFenFromParts(positionFen, positionTurn, positionCastling, positionEnPassant),
    [positionFen, positionTurn, positionCastling, positionEnPassant]
  );

  // Validation — surfaces both the boolean validity and the corrected
  // color when the king-in-check rule contradicts the chosen side.
  const validity = useMemo(() => validatePosition(positionFen, fullFen), [positionFen, fullFen]);

  /**
   * Suppress the next color-change → en-passant reset. Use when setting
   * color in the same tick as restoring an en-passant target from a URL
   * parameter — without this the freshly-restored target would be wiped
   * by auto-sync 1 on the same render.
   */
  const skipNextColorReset = useCallback(() => {
    setSkipColorReset(true);
  }, []);

  return {
    positionFen,
    setPositionFen,
    positionCastling,
    setPositionCastling,
    positionEnPassant,
    setPositionEnPassant,
    positionTurn,
    fullFen,
    validity,
    castlingAvailability,
    enPassantAvailability,
    skipNextColorReset,
  };
}
