import type { Square } from "@blindfold-chess/types";

import {
  FILES,
  RANKS,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
  fileRankToSquare,
} from "../common";
import { BOARD_LAST_INDEX } from "../common/constants";

import type { DiagonalPair } from "./types";

/**
 * Squares that are unsuitable as diagonal-quiz questions because either
 * their diagonal or anti-diagonal has length 1 (i.e. is just the square
 * itself). Answering such a square only requires naming a single real
 * diagonal, which is half the cognitive cost of every other square.
 *
 * This rule is expressed generally rather than as a hardcoded corner list
 * so the intent is explicit at the call site. On an 8x8 board the resulting
 * set is always {a1, a8, h1, h8}, but the rule is the source of truth.
 */
const SINGLE_DIAGONAL_SQUARES: ReadonlySet<Square> = new Set(
  FILES.flatMap((_, f) =>
    RANKS.flatMap((_, r) => {
      const { diagLength, antiLength } = computeDiagonalParams(f, r);
      return diagLength === 0 || antiLength === 0
        ? [fileRankToSquare(f, r)]
        : [];
    }),
  ),
);

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
  const diagLength = Math.min(
    BOARD_LAST_INDEX - diagStartF,
    BOARD_LAST_INDEX - diagStartR,
  );

  const antiDiag = f + r;
  const antiStartF = antiDiag <= BOARD_LAST_INDEX ? antiDiag : BOARD_LAST_INDEX;
  const antiStartR =
    antiDiag <= BOARD_LAST_INDEX ? 0 : antiDiag - BOARD_LAST_INDEX;
  const antiLength = Math.min(antiStartF, BOARD_LAST_INDEX - antiStartR);

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
export function getDiagonalSquares(square: Square): {
  diagonal: Square[];
  antiDiagonal: Square[];
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

  const diagonal: Square[] = [];
  for (let i = 0; i <= diagLength; i++) {
    diagonal.push(fileRankToSquare(diagStartF + i, diagStartR + i));
  }

  const antiDiagonal: Square[] = [];
  for (let i = 0; i <= antiLength; i++) {
    antiDiagonal.push(fileRankToSquare(antiStartF - i, antiStartR + i));
  }

  return { diagonal, antiDiagonal };
}

/**
 * Check if a square has a single-square diagonal or anti-diagonal.
 * Corner squares (a1, a8, h1, h8) have one single-square diagonal.
 */
export function getCornerInfo(square: Square): {
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
 * Squares that are excluded from the diagonal-quiz question pool because
 * either their diagonal or anti-diagonal has length 1. See
 * {@link SINGLE_DIAGONAL_SQUARES} for the full rationale.
 *
 * Pass this set to the common `generateRandomSquare` / `generateSquareSequence`
 * helpers (from `@blindfold-chess/features/common`) when generating diagonal
 * quiz questions. Exposed publicly so callers (and tests) can assert the
 * generalized rule directly without going through a wrapper function.
 */
export const EXCLUDED_QUIZ_SQUARES: ReadonlySet<Square> =
  SINGLE_DIAGONAL_SQUARES;
