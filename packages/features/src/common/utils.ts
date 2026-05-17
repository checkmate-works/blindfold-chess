import type { BoardOrientation, Square } from "@blindfold-chess/types";

import { FILES, RANKS } from "./constants";

/** A source of randomness. Defaults to Math.random when not supplied. */
export type RandomSource = () => number;

/**
 * Resolve a board orientation to a concrete side.
 * If "random", picks "white" or "black" with equal probability.
 */
export function resolveOrientation(
  orientation: BoardOrientation,
  rng: RandomSource = Math.random,
): Exclude<BoardOrientation, "random"> {
  if (orientation === "random") {
    return rng() < 0.5 ? "white" : "black";
  }
  return orientation;
}

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

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function generateRandomSquare(
  rng: RandomSource = Math.random,
  exclude?: ReadonlySet<Square>,
): Square {
  if (exclude && exclude.size >= 64) {
    throw new Error(
      "Cannot generate a random square: all squares are excluded",
    );
  }
  let square: Square;
  do {
    square = (FILES[Math.floor(rng() * FILES.length)] +
      RANKS[Math.floor(rng() * RANKS.length)]) as Square;
  } while (exclude?.has(square));
  return square;
}

export function generateSquareSequence(
  count: number,
  rng: RandomSource = Math.random,
  exclude?: ReadonlySet<Square>,
): Square[] {
  const squares: Square[] = [];
  const usedSquares = new Set<Square>();
  const resetThreshold = Math.floor((64 - (exclude?.size ?? 0)) / 2);

  while (squares.length < count) {
    const square = generateRandomSquare(rng, exclude);
    if (!usedSquares.has(square)) {
      usedSquares.add(square);
      squares.push(square);
    }

    // Reset after using half the eligible squares to allow re-use
    // while maintaining variety in consecutive questions
    if (usedSquares.size >= resetThreshold && squares.length < count) {
      usedSquares.clear();
    }
  }

  return squares;
}

/**
 * Fisher-Yates shuffle. Returns a new array (does not mutate the input).
 */
export function shuffleArray<T>(
  arr: readonly T[],
  rng: RandomSource = Math.random,
): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
