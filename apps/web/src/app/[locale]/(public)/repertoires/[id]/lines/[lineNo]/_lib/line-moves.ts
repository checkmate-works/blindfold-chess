import { toPositionKey } from '@blindfold-chess/features/chess-core';
import {
  computeMoveNumber,
  formatMoveAnchor,
} from '@blindfold-chess/features/chess-core/move-numbering';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import type { BoardAnnotations } from '@/lib/board-annotations/types';

/** Per-move view data for the line detail board: its annotation key, label, note, markup. */
export type LineMove = {
  /** Normalised FEN of the position this move reaches (annotation key). */
  positionKey: string;
  /** Display label for the move, e.g. "3. d4" / "3... Nf6". */
  label: string;
  /** Owner's "why this move" note, or null. */
  annotation: string | null;
  /** Owner's arrows / circles for the position; empty when none were drawn. */
  shapes: BoardAnnotations;
};

/** Full-move number + side label for the i-th half-move (1-based). */
function moveLabel(
  san: string,
  ply: number,
  startsAsBlack: boolean,
  startMoveNumber: number
): string {
  const { moveNumber, isWhiteMove } = computeMoveNumber(ply - 1, startsAsBlack, startMoveNumber);
  return `${formatMoveAnchor(moveNumber, isWhiteMove)} ${san}`;
}

/**
 * Shape a replayed line into one `LineMove` per ply — pairing each move with the
 * position it reaches (the annotation key), a numbered label, and the owner's
 * note for that position. `positions[i]` is the position after move i.
 */
export function buildLineMoves(params: {
  sans: AlgebraicNotation[];
  positions: { fen: string }[];
  startsAsBlack: boolean;
  startMoveNumber: number;
  annotations: ReadonlyMap<string, { text: string; shapes: BoardAnnotations }>;
}): LineMove[] {
  const { sans, positions, startsAsBlack, startMoveNumber, annotations } = params;
  return sans.map((san, idx) => {
    const ply = idx + 1;
    const positionKey = toPositionKey(positions[ply].fen);
    const annotation = annotations.get(positionKey);
    return {
      positionKey,
      label: moveLabel(san, ply, startsAsBlack, startMoveNumber),
      // A row can exist for the markup alone, so an empty note means "no note".
      annotation: annotation?.text || null,
      shapes: annotation?.shapes ?? EMPTY_BOARD_ANNOTATIONS,
    };
  });
}
