import type { SquareColor } from "./types";

export {
  isValidSquare,
  generateRandomSquare,
  generateSquareSequence,
} from "../common";
import { isValidSquare, computeSquareColor } from "../common";

export function getSquareColor(square: string): SquareColor | null {
  if (!isValidSquare(square)) {
    return null;
  }

  return computeSquareColor(square);
}
