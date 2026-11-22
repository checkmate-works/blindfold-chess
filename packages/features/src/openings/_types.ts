/**
 * Shared type for chess opening seed entries.
 *
 * Do NOT edit these arrays to reorder or rename items. `openings/index.ts`
 * concatenates the sub-arrays into `CHESS_OPENINGS` in a fixed order, which
 * preserves the exact order that was shipped before the split.
 */
export type ChessOpeningSeed = {
  slug: string;
  name: string;
  ecoCode: string;
  pgn: string;
  firstMoveSquare: string;
  sortOrder: number;
  parentSlug?: string;
};
