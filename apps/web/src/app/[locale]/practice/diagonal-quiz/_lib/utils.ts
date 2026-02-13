import type { DiagonalPair } from './types';

export { generateRandomSquare, generateSquareSequence } from '../../_lib/utils';

function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

function fileIndex(file: string): number {
  return file.charCodeAt(0) - 'a'.charCodeAt(0);
}

function rankIndex(rank: string): number {
  return parseInt(rank, 10) - 1;
}

function squareFromIndices(f: number, r: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + f) + (r + 1);
}

/**
 * Compute both diagonals for a given square.
 *
 * Diagonal (NE-SW, a1-h8 direction):
 *   All squares where (file - rank) is constant.
 *   We find the endpoints by going to the minimum of file and rank indices.
 *
 * Anti-diagonal (NW-SE, h1-a8 direction):
 *   All squares where (file + rank) is constant.
 *   We find the endpoints similarly.
 *
 * Convention: left-to-right (lower file letter first).
 */
export function getDiagonals(square: string): DiagonalPair {
  if (!isValidSquare(square)) {
    throw new Error(`Invalid square: ${square}`);
  }

  const f = fileIndex(square[0]);
  const r = rankIndex(square[1]);

  // Diagonal (a1-h8 direction): file - rank = constant
  const diag = f - r;
  let diagStartF: number, diagStartR: number;
  if (diag >= 0) {
    // starts on rank 1 (r=0)
    diagStartF = diag;
    diagStartR = 0;
  } else {
    // starts on file a (f=0)
    diagStartF = 0;
    diagStartR = -diag;
  }
  // walk from start to the edge of the board
  const diagLength = Math.min(7 - diagStartF, 7 - diagStartR);
  const diagEndF = diagStartF + diagLength;
  const diagEndR = diagStartR + diagLength;

  const diagStart = squareFromIndices(diagStartF, diagStartR);
  const diagEnd = squareFromIndices(diagEndF, diagEndR);
  const diagonal =
    diagStartF === diagEndF && diagStartR === diagEndR ? diagStart : `${diagStart}-${diagEnd}`;

  // Anti-diagonal (h1-a8 direction): file + rank = constant
  const antiDiag = f + r;
  let antiStartF: number, antiStartR: number;
  if (antiDiag <= 7) {
    // starts on rank 1 (r=0)
    antiStartF = antiDiag;
    antiStartR = 0;
  } else {
    // starts on rank = antiDiag - 7, file = 7
    antiStartF = 7;
    antiStartR = antiDiag - 7;
  }
  const antiLength = Math.min(antiStartF, 7 - antiStartR);
  const antiEndF = antiStartF - antiLength;
  const antiEndR = antiStartR + antiLength;

  // For anti-diagonal, left-to-right means lower file first
  // antiEnd has the lower file, antiStart has the higher file
  const antiLeft = squareFromIndices(antiEndF, antiEndR);
  const antiRight = squareFromIndices(antiStartF, antiStartR);
  const antiDiagonal =
    antiEndF === antiStartF && antiEndR === antiStartR ? antiLeft : `${antiLeft}-${antiRight}`;

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
  // Single square or two squares separated by hyphen
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
  const f = fileIndex(square[0]);
  const r = rankIndex(square[1]);

  // Diagonal (a1-h8 direction): file - rank = constant
  const diagonal: string[] = [];
  const diag = f - r;
  const diagStartF = diag >= 0 ? diag : 0;
  const diagStartR = diag >= 0 ? 0 : -diag;
  const diagLength = Math.min(7 - diagStartF, 7 - diagStartR);
  for (let i = 0; i <= diagLength; i++) {
    diagonal.push(squareFromIndices(diagStartF + i, diagStartR + i));
  }

  // Anti-diagonal (h1-a8 direction): file + rank = constant
  const antiDiagonal: string[] = [];
  const antiDiag = f + r;
  const antiStartF = antiDiag <= 7 ? antiDiag : 7;
  const antiStartR = antiDiag <= 7 ? 0 : antiDiag - 7;
  const antiLength = Math.min(antiStartF, 7 - antiStartR);
  for (let i = 0; i <= antiLength; i++) {
    antiDiagonal.push(squareFromIndices(antiStartF - i, antiStartR + i));
  }

  return { diagonal, antiDiagonal };
}
