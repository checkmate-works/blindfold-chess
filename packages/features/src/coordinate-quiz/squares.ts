import type { Square } from "@blindfold-chess/types";
import { DISPLAY_RANKS, FILES } from "@blindfold-chess/types";

/**
 * All 64 squares in reading order (a8, b8, …, h1), matching the board as
 * drawn from top-left to bottom-right.
 *
 * Deliberately a different order from `ALL_SQUARES` in `common/utils`, which
 * is file-major for sampling — neither can be derived from the other without
 * a sort, so both exist. What is shared is the descending rank axis:
 * `DISPLAY_RANKS` is the constant for exactly this, and this file used to
 * re-derive it with a local `[...RANKS].reverse()`.
 */
export const allSquares: readonly Square[] = DISPLAY_RANKS.flatMap((rank) =>
  FILES.map((file) => `${file}${rank}` as Square),
);
