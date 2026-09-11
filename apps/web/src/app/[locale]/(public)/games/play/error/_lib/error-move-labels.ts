import {
  computeMoveNumber,
  formatMoveAnchor,
} from '@blindfold-chess/features/chess-core/move-numbering';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

export type LabeledMove = {
  move: AlgebraicNotation;
  /**
   * The move-number prefix to draw before the SAN, or null when the move
   * reads as the second half of the pair drawn before it.
   */
  label: string | null;
};

/**
 * Number a move list the way a PGN movetext does: every White move carries
 * its "N.", a Black move carries nothing — the reader pairs it with the
 * "N." to its left. The one exception is a list that opens on a Black move
 * (a game started from a Black-to-move FEN): there is no White half to pair
 * with, so that first move gets the "N..." form instead of going unlabeled.
 *
 * The starting FEN decides both the first move's side and the number it
 * starts counting from; `Math.floor(idx / 2) + 1` is only right for a game
 * that starts from the initial position, and this list must name each move
 * with the same number every other surface (replay, comments, change log)
 * gives it.
 */
export function labelMoveList(
  moves: readonly AlgebraicNotation[],
  startingFen: string | null | undefined
): LabeledMove[] {
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

  return moves.map((move, idx) => {
    const { moveNumber, isWhiteMove } = computeMoveNumber(idx, startsAsBlack, startMoveNumber);
    const label = isWhiteMove || idx === 0 ? formatMoveAnchor(moveNumber, isWhiteMove) : null;
    return { move, label };
  });
}

/**
 * The "N." / "N..." anchor for the half-move at `index` (0-based) — used to
 * name the one move that failed validation, so it carries the same number the
 * valid-move list above it would have given it.
 */
export function labelMoveAt(index: number, startingFen: string | null | undefined): string {
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  const { moveNumber, isWhiteMove } = computeMoveNumber(index, startsAsBlack, startMoveNumber);
  return formatMoveAnchor(moveNumber, isWhiteMove);
}
