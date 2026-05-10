import type { SideToMove } from './puzzle-form-constants';

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
 */
export function readSideToMove(fen: string): SideToMove {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}
