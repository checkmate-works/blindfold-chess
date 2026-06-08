import { toPositionKey } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

/** Per-move view data for the line detail board: its annotation key, label, note. */
export type LineMove = {
  /** Normalised FEN of the position this move reaches (annotation key). */
  positionKey: string;
  /** Display label for the move, e.g. "3. d4" / "3... Nf6". */
  label: string;
  /** Owner's "why this move" note, or null. */
  annotation: string | null;
};

/** Full-move number + side label for the i-th half-move (1-based). */
function moveLabel(
  san: string,
  ply: number,
  startsAsBlack: boolean,
  startMoveNumber: number
): string {
  const blackToMove = startsAsBlack ? ply % 2 === 1 : ply % 2 === 0;
  const fullMove = startsAsBlack
    ? startMoveNumber + Math.floor(ply / 2)
    : startMoveNumber + Math.floor((ply - 1) / 2);
  return blackToMove ? `${fullMove}... ${san}` : `${fullMove}. ${san}`;
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
  annotations: ReadonlyMap<string, { text: string }>;
}): LineMove[] {
  const { sans, positions, startsAsBlack, startMoveNumber, annotations } = params;
  return sans.map((san, idx) => {
    const ply = idx + 1;
    const positionKey = toPositionKey(positions[ply].fen);
    return {
      positionKey,
      label: moveLabel(san, ply, startsAsBlack, startMoveNumber),
      annotation: annotations.get(positionKey)?.text ?? null,
    };
  });
}
