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
export function squareToFileIndex(square: Square): number {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}

/** Extract 0-based rank index (1=0, 8=7) from algebraic square name */
export function squareToRankIndex(square: Square): number {
  return parseInt(square[1], 10) - 1;
}

/** Build algebraic square name from 0-based indices */
export function fileRankToSquare(fileIndex: number, rankIndex: number): Square {
  return (String.fromCharCode("a".charCodeAt(0) + fileIndex) +
    (rankIndex + 1)) as Square;
}

/**
 * Whether the square at a board grid cell is a light one.
 *
 * The second index is the row **as drawn**, top-down (`DISPLAY_RANKS`, so
 * `0` = rank 8) — not the rank index `squareToRankIndex` returns (`0` = rank
 * 1). The two run opposite ways, so feeding this a true rank index inverts
 * every square: `isLightSquare(0, 0)` is `true` while `computeSquareColor("a1")`
 * is `"dark"`. Take a square rather than indices if you have one.
 */
export function isLightSquare(fileIndex: number, rowFromTop: number): boolean {
  return (fileIndex + rowFromTop) % 2 === 0;
}

export function isValidSquare(square: string): square is Square {
  return /^[a-h][1-8]$/.test(square);
}

export function computeSquareColor(square: Square): "light" | "dark" {
  const file = squareToFileIndex(square);
  const rank = squareToRankIndex(square);
  return (file + rank) % 2 === 0 ? "dark" : "light";
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * All 64 squares in file-major order (a1, a2, …, a8, b1, …, h8).
 * `generateRandomSquare` / `generateSquareSequence` sample eligible squares
 * from this list, which makes both functions total — one rng draw per
 * square, no rejection loop that a stubbed rng could spin forever.
 */
export const ALL_SQUARES: readonly Square[] = FILES.flatMap((file) =>
  RANKS.map((rank) => `${file}${rank}` as Square),
);

/** Uniformly pick one element; `pool` must be non-empty. */
function pickFrom(pool: readonly Square[], rng: RandomSource): Square {
  return pool[Math.floor(rng() * pool.length)];
}

export function generateRandomSquare(
  rng: RandomSource = Math.random,
  exclude?: ReadonlySet<Square>,
): Square {
  if (!exclude || exclude.size === 0) {
    return (FILES[Math.floor(rng() * FILES.length)] +
      RANKS[Math.floor(rng() * RANKS.length)]) as Square;
  }
  const eligible = ALL_SQUARES.filter((square) => !exclude.has(square));
  if (eligible.length === 0) {
    throw new Error(
      "Cannot generate a random square: all squares are excluded",
    );
  }
  return pickFrom(eligible, rng);
}

export function generateSquareSequence(
  count: number,
  rng: RandomSource = Math.random,
  exclude?: ReadonlySet<Square>,
): Square[] {
  if (count <= 0) return [];

  const eligible = ALL_SQUARES.filter((square) => !exclude?.has(square));
  if (eligible.length === 0) {
    throw new Error(
      "Cannot generate a random square: all squares are excluded",
    );
  }

  // Re-allow re-use once half the eligible squares have been consumed, so
  // consecutive questions stay varied without ever exhausting the pool.
  // Clamped to >= 1 so a single-square pool still terminates.
  const resetThreshold = Math.max(1, Math.floor(eligible.length / 2));

  const squares: Square[] = [];
  const used = new Set<Square>();
  while (squares.length < count) {
    const square = pickFrom(
      eligible.filter((sq) => !used.has(sq)),
      rng,
    );
    used.add(square);
    squares.push(square);
    if (used.size >= resetThreshold) {
      used.clear();
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
