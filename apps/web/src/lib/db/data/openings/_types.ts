/**
 * Shared type for chess opening seed entries.
 *
 * Do NOT edit these arrays to reorder or rename items. The sub-arrays are
 * concatenated by the parent `chess-openings.ts` to preserve the exact same
 * order that was shipped before the split.
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
