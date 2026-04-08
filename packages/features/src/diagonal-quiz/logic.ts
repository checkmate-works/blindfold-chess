import type { Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
  fileRankToSquare,
  generateRandomSquare as generateRandomSquareBase,
  generateSquareSequence as generateSquareSequenceBase,
} from "../common";

import type { DiagonalPair } from "./types";

/** Corner squares whose diagonal or anti-diagonal is a single point. */
const CORNER_SQUARES: ReadonlySet<Square> = new Set<Square>([
  "a1",
  "a8",
  "h1",
  "h8",
]);

/**
 * Compute the start position and length of both diagonals for a square.
 *
 * Diagonal (a1-h8 direction): file - rank = constant.
 * Anti-diagonal (h1-a8 direction): file + rank = constant.
 */
function computeDiagonalParams(f: number, r: number) {
  const diag = f - r;
  const diagStartF = diag >= 0 ? diag : 0;
  const diagStartR = diag >= 0 ? 0 : -diag;
  const diagLength = Math.min(7 - diagStartF, 7 - diagStartR);

  const antiDiag = f + r;
  const antiStartF = antiDiag <= 7 ? antiDiag : 7;
  const antiStartR = antiDiag <= 7 ? 0 : antiDiag - 7;
  const antiLength = Math.min(antiStartF, 7 - antiStartR);

  return {
    diagStartF,
    diagStartR,
    diagLength,
    antiStartF,
    antiStartR,
    antiLength,
  };
}

/**
 * Compute both diagonals for a given square.
 *
 * Diagonal (NE-SW, a1-h8 direction):
 *   All squares where (file - rank) is constant.
 *
 * Anti-diagonal (NW-SE, h1-a8 direction):
 *   All squares where (file + rank) is constant.
 *
 * Convention: left-to-right (lower file letter first).
 */
export function getDiagonals(square: string): DiagonalPair {
  if (!isValidSquare(square)) {
    throw new Error(`Invalid square: ${square}`);
  }

  const f = squareToFileIndex(square);
  const r = squareToRankIndex(square);
  const {
    diagStartF,
    diagStartR,
    diagLength,
    antiStartF,
    antiStartR,
    antiLength,
  } = computeDiagonalParams(f, r);

  const diagEndF = diagStartF + diagLength;
  const diagEndR = diagStartR + diagLength;

  const diagStart = fileRankToSquare(diagStartF, diagStartR);
  const diagEnd = fileRankToSquare(diagEndF, diagEndR);
  const diagonal =
    diagStartF === diagEndF && diagStartR === diagEndR
      ? diagStart
      : `${diagStart}-${diagEnd}`;

  const antiEndF = antiStartF - antiLength;
  const antiEndR = antiStartR + antiLength;

  // For anti-diagonal, left-to-right means lower file first
  const antiLeft = fileRankToSquare(antiEndF, antiEndR);
  const antiRight = fileRankToSquare(antiStartF, antiStartR);
  const antiDiagonal =
    antiEndF === antiStartF && antiEndR === antiStartR
      ? antiLeft
      : `${antiLeft}-${antiRight}`;

  return { diagonal, antiDiagonal };
}

/**
 * Normalize a diagonal answer to canonical form (left-to-right, lower file first).
 * Accepts formats like "b1-h7", "h7-b1", or single squares like "a1".
 */
export function normalizeDiagonal(answer: string): string {
  const trimmed = answer.trim().toLowerCase();

  // Single square
  if (/^[a-h][1-8]$/.test(trimmed)) {
    return trimmed;
  }

  // Two squares separated by hyphen
  const match = trimmed.match(/^([a-h][1-8])-([a-h][1-8])$/);
  if (!match) return trimmed;

  const [, sq1, sq2] = match;
  // Sort left-to-right (by file, then by rank)
  if (sq1.charCodeAt(0) < sq2.charCodeAt(0)) {
    return `${sq1}-${sq2}`;
  }
  if (sq1.charCodeAt(0) > sq2.charCodeAt(0)) {
    return `${sq2}-${sq1}`;
  }
  // Same file, sort by rank
  if (sq1[1] < sq2[1]) {
    return `${sq1}-${sq2}`;
  }
  return `${sq2}-${sq1}`;
}

/**
 * Validate whether an answer string is in valid diagonal format.
 */
export function isValidDiagonalAnswer(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  return /^[a-h][1-8](-[a-h][1-8])?$/.test(trimmed);
}

/**
 * Get all squares on both diagonals passing through a given square.
 * Diagonal: a1-h8 direction (file - rank = constant)
 * Anti-diagonal: h1-a8 direction (file + rank = constant)
 */
export function getDiagonalSquares(square: string): {
  diagonal: string[];
  antiDiagonal: string[];
} {
  const f = squareToFileIndex(square);
  const r = squareToRankIndex(square);
  const {
    diagStartF,
    diagStartR,
    diagLength,
    antiStartF,
    antiStartR,
    antiLength,
  } = computeDiagonalParams(f, r);

  const diagonal: string[] = [];
  for (let i = 0; i <= diagLength; i++) {
    diagonal.push(fileRankToSquare(diagStartF + i, diagStartR + i));
  }

  const antiDiagonal: string[] = [];
  for (let i = 0; i <= antiLength; i++) {
    antiDiagonal.push(fileRankToSquare(antiStartF - i, antiStartR + i));
  }

  return { diagonal, antiDiagonal };
}

/**
 * Check if a square has a single-square diagonal or anti-diagonal.
 * Corner squares (a1, a8, h1, h8) have one single-square diagonal.
 */
export function getCornerInfo(square: string): {
  singleDiagonal: boolean;
  singleAntiDiagonal: boolean;
} {
  const f = squareToFileIndex(square);
  const r = squareToRankIndex(square);
  const { diagLength, antiLength } = computeDiagonalParams(f, r);

  return {
    singleDiagonal: diagLength === 0,
    singleAntiDiagonal: antiLength === 0,
  };
}

/**
 * Generate a random square excluding the four corner squares.
 * Corners are excluded because they have a single-square diagonal
 * (start == end), which is incompatible with the quiz UI.
 */
export function generateRandomSquare(rng: RandomSource = Math.random): Square {
  return generateRandomSquareBase(rng, CORNER_SQUARES);
}

/**
 * Generate a sequence of unique random squares excluding corner squares.
 */
export function generateSquareSequence(
  count: number,
  rng: RandomSource = Math.random,
): Square[] {
  return generateSquareSequenceBase(count, rng, CORNER_SQUARES);
}
