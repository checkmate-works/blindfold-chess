import type { Square } from "@blindfold-chess/types";

import { BOARD_SIZE } from "./constants";
import {
  BISHOP_DIRS,
  KING_OFFSETS,
  KNIGHT_OFFSETS,
  QUEEN_DIRS,
  ROOK_DIRS,
} from "./piece-moves";
import { fileRankToSquare } from "./utils";

/**
 * Piece types this helper supports. Pawns are deliberately excluded — pawn
 * moves depend on color, capture state, en passant, promotion, and starting
 * rank, none of which are appropriate to bake into a pure mobility helper.
 * Both `legal-moves` and `route-planner` already exclude pawns from their
 * piece sets for the same reason.
 */
export type MobilityPiece = "b" | "r" | "n" | "q" | "k";

const SLIDING_DIRS: Partial<
  Record<MobilityPiece, readonly (readonly number[])[]>
> = {
  b: BISHOP_DIRS,
  r: ROOK_DIRS,
  q: QUEEN_DIRS,
};

const FIXED_OFFSETS: Partial<
  Record<MobilityPiece, readonly (readonly number[])[]>
> = {
  n: KNIGHT_OFFSETS,
  k: KING_OFFSETS,
};

function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;
}

function slidingMoves(
  file: number,
  rank: number,
  dirs: readonly (readonly number[])[],
): Square[] {
  const moves: Square[] = [];
  for (const d of dirs) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const nf = file + d[0] * i;
      const nr = rank + d[1] * i;
      if (!isOnBoard(nf, nr)) break;
      moves.push(fileRankToSquare(nf, nr));
    }
  }
  return moves;
}

function fixedOffsetMoves(
  file: number,
  rank: number,
  offsets: readonly (readonly number[])[],
): Square[] {
  const moves: Square[] = [];
  for (const d of offsets) {
    const nf = file + d[0];
    const nr = rank + d[1];
    if (!isOnBoard(nf, nr)) continue;
    moves.push(fileRankToSquare(nf, nr));
  }
  return moves;
}

/**
 * Pure mobility: every square reachable from `(file, rank)` by a single
 * legal move of the given piece, ignoring blockers and game state.
 *
 * - Sliding pieces (`b`, `r`, `q`) emit every square along each ray until
 *   the edge of the board. Blockers are NOT considered — callers that need
 *   blocker-aware movement (e.g., `route-planner` shortest-path search)
 *   handle that separately.
 * - Leaping pieces (`n`, `k`) emit each offset target that is on the board.
 *
 * The `(file, rank)` origin is never included in the returned list. Pawns
 * are not supported; see {@link MobilityPiece}.
 */
export function getMovesForPiece(
  piece: MobilityPiece,
  file: number,
  rank: number,
): Square[] {
  const sliding = SLIDING_DIRS[piece];
  if (sliding) return slidingMoves(file, rank, sliding);
  const offsets = FIXED_OFFSETS[piece];
  if (offsets) return fixedOffsetMoves(file, rank, offsets);
  // Unreachable for the typed union, but defensive for runtime callers.
  return [];
}
