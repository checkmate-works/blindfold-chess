/**
 * Step vectors as `[fileDelta, rankDelta]` (file a→h and rank 1→8 are
 * positive). The `*_DIRS` constants are directions for sliding pieces, to be
 * repeated until the board edge; the `*_OFFSETS` constants are single steps.
 * Pawns are intentionally absent: their moves depend on color and capture
 * state.
 */
export const KNIGHT_OFFSETS = [
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [1, 2],
  [1, -2],
  [-1, 2],
  [-1, -2],
] as const;

export const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

export const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS] as const;

export const KING_OFFSETS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;
