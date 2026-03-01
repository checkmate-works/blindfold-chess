import type { Square } from "@blindfold-chess/types";
import { FILES, RANKS } from "@blindfold-chess/types";

// Generate all 64 squares in rank-descending order (a8, b8, ..., h1)
// to match visual board layout from top-left to bottom-right.
export const allSquares: Square[] = [...RANKS]
  .reverse()
  .flatMap((rank) => FILES.map((file) => `${file}${rank}` as Square));
