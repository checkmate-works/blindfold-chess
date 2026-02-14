import type { SquareColor } from "./types";

export function isValidSquare(square: string): boolean {
  const regex = /^[a-h][1-8]$/;
  return regex.test(square);
}

export function getSquareColor(square: string): SquareColor | null {
  if (!isValidSquare(square)) {
    return null;
  }

  const file = square.charCodeAt(0) - 97; // a=0, b=1, ..., h=7
  const rank = parseInt(square[1]) - 1; // 1=0, 2=1, ..., 8=7

  return (file + rank) % 2 === 0 ? "dark" : "light";
}

export { generateRandomSquare, generateSquareSequence } from "../common";
