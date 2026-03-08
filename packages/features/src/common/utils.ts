import type { Square } from "@blindfold-chess/types";

import { FILES, RANKS } from "./constants";

/** Extract 0-based file index (a=0, h=7) from algebraic square name */
export function squareToFileIndex(square: string): number {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}

/** Extract 0-based rank index (1=0, 8=7) from algebraic square name */
export function squareToRankIndex(square: string): number {
  return parseInt(square[1], 10) - 1;
}

/** Build algebraic square name from 0-based indices */
export function fileRankToSquare(fileIndex: number, rankIndex: number): Square {
  return (String.fromCharCode("a".charCodeAt(0) + fileIndex) +
    (rankIndex + 1)) as Square;
}

export function isLightSquare(fileIndex: number, rankIndex: number): boolean {
  return (fileIndex + rankIndex) % 2 === 0;
}

export function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

export function computeSquareColor(square: string): "light" | "dark" {
  const file = squareToFileIndex(square);
  const rank = squareToRankIndex(square);
  return (file + rank) % 2 === 0 ? "dark" : "light";
}

export function generateRandomSquare(): Square {
  return (FILES[Math.floor(Math.random() * FILES.length)] +
    RANKS[Math.floor(Math.random() * RANKS.length)]) as Square;
}

export function generateSquareSequence(count: number): Square[] {
  const squares: Square[] = [];
  const usedSquares = new Set<Square>();

  while (squares.length < count) {
    const square = generateRandomSquare();
    if (!usedSquares.has(square)) {
      usedSquares.add(square);
      squares.push(square);
    }

    // Reset after using half the board (32/64 squares) to allow re-use
    // while maintaining variety in consecutive questions
    if (usedSquares.size >= 32 && squares.length < count) {
      usedSquares.clear();
    }
  }

  return squares;
}
