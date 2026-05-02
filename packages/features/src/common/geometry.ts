import type { Square } from "@blindfold-chess/types";

import { BOARD_LAST_INDEX } from "./constants";
import {
  fileRankToSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "./utils";

/**
 * Axes of reflection on the 8x8 chess board.
 *
 * - `"file"`: file (horizontal) reflection — `a8 ↔ h8`, `c5 ↔ f5`. The rank
 *   stays the same; the file index becomes `BOARD_LAST_INDEX - file`.
 * - `"rank"`: rank (vertical) reflection — `a1 ↔ a8`, `c5 ↔ c4`. The file
 *   stays the same; the rank index becomes `BOARD_LAST_INDEX - rank`.
 * - `"point"`: point reflection (180° rotation about the board center) —
 *   `a1 ↔ h8`, `c5 ↔ f4`. Both file and rank are mirrored.
 */
export type MirrorAxis = "file" | "rank" | "point";

/**
 * Reflect a square across the given axis. Pure: does not mutate.
 *
 * The naming follows board geometry: `"file"` mirrors across the file axis
 * (i.e. left-right swap, files reflected, ranks preserved), and `"rank"`
 * mirrors across the rank axis (i.e. top-bottom swap, ranks reflected,
 * files preserved).
 */
export function mirrorSquare(square: Square, axis: MirrorAxis): Square {
  const file = squareToFileIndex(square);
  const rank = squareToRankIndex(square);

  switch (axis) {
    case "file":
      return fileRankToSquare(BOARD_LAST_INDEX - file, rank);
    case "rank":
      return fileRankToSquare(file, BOARD_LAST_INDEX - rank);
    case "point":
      return fileRankToSquare(BOARD_LAST_INDEX - file, BOARD_LAST_INDEX - rank);
  }
}

/**
 * Flip 0-based `(file, rank)` indices for board orientation.
 *
 * - `"white"`: returned as-is (white plays from rank 1, files a..h left-to-right).
 * - `"black"`: both axes are reflected, equivalent to `mirrorSquare(.., "point")`.
 *
 * This helper exists so call sites do not have to spell out
 * `(BOARD_LAST_INDEX - file, BOARD_LAST_INDEX - rank)` arithmetic.
 */
export function flipForOrientation(
  file: number,
  rank: number,
  orientation: "white" | "black",
): { file: number; rank: number } {
  if (orientation === "white") {
    return { file, rank };
  }
  return {
    file: BOARD_LAST_INDEX - file,
    rank: BOARD_LAST_INDEX - rank,
  };
}
