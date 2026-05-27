import { computeSquareColor, isValidSquare } from "../common";

import type { SquareColor } from "./types";

export { isValidSquare } from "../common";

export function getSquareColor(square: string): SquareColor | null {
  if (!isValidSquare(square)) {
    return null;
  }

  return computeSquareColor(square);
}
