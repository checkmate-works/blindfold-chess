import { computeSquareColor, isValidSquare } from "../common";

import type { SquareColor } from "./types";

export { isValidSquare } from "../common";

/** The colour of `square`, or `null` when the string is not a valid square. */
export function getSquareColor(square: string): SquareColor | null {
  if (!isValidSquare(square)) {
    return null;
  }

  return computeSquareColor(square);
}
