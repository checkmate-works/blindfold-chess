import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import type { SideToMove } from './board-editor-constants';

/**
 * Swap the side-to-move byte in a FEN string. Returns the input
 * unchanged when the FEN has fewer than the two leading whitespace-
 * separated fields (placement + side) needed to perform the swap.
 */
export function replaceSideToMove(fen: string, side: SideToMove): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) return fen;
  parts[1] = side;
  return parts.join(' ');
}

/**
 * Read the side-to-move byte from a FEN string. Defaults to white
 * when the field is missing or malformed.
 *
 * Whitespace is normalized first because the board editor hands this
 * user-typed FENs, which arrive padded and irregularly spaced; the shared
 * accessor assumes the single-space form a canonical FEN uses.
 */
export function readSideToMove(fen: string): SideToMove {
  return isBlackToMoveFromFen(fen.trim().replace(/\s+/g, ' ')) ? 'b' : 'w';
}
