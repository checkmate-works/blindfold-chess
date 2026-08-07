/**
 * Utility functions for Knight's Tour puzzle
 */
import type { Square } from "@blindfold-chess/types";

import { KNIGHT_OFFSETS } from "../common/piece-moves";
import {
  fileRankToSquare,
  isValidSquare,
  squareToFileIndex,
  squareToRankIndex,
} from "../common/utils";

/**
 * Get all legal knight moves from a given square
 */
export function getKnightMoves(square: string): Square[] {
  if (!isValidSquare(square)) return [];

  const fileIndex = squareToFileIndex(square);
  const rankIndex = squareToRankIndex(square);

  const moves: Square[] = [];
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const newFile = fileIndex + df;
    const newRank = rankIndex + dr;
    if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
      moves.push(fileRankToSquare(newFile, newRank));
    }
  }
  return moves;
}

/**
 * Get available (unvisited) knight moves from a given square
 * @param square - Current square
 * @param visitedSquares - Set or Map of visited squares
 */
export function getAvailableKnightMoves(
  square: string,
  visitedSquares: Set<string> | Map<string, number>,
): string[] {
  return getKnightMoves(square).filter((move) => !visitedSquares.has(move));
}

/**
 * Check if a move is a valid knight move
 */
export function isValidKnightMove(from: string, to: string): boolean {
  const moves: readonly string[] = getKnightMoves(from);
  return moves.includes(to);
}

/**
 * Apply Warnsdorff's rule to sort moves by accessibility
 * (prioritize squares with fewer unvisited neighbors)
 */
export function sortByWarnsdorff(
  moves: readonly string[],
  visitedSquares: Set<string> | Map<string, number>,
): string[] {
  return [...moves].sort((a, b) => {
    const aNeighbors = getAvailableKnightMoves(a, visitedSquares).length;
    const bNeighbors = getAvailableKnightMoves(b, visitedSquares).length;
    return aNeighbors - bNeighbors;
  });
}

/**
 * Check if the tour is complete (all 64 squares visited)
 */
export function isTourComplete(
  visitedSquares: Set<string> | Map<string, number>,
): boolean {
  return visitedSquares.size === 64;
}

/**
 * Check if the tour is stuck (no more valid moves)
 */
export function isTourStuck(
  currentSquare: string,
  visitedSquares: Set<string> | Map<string, number>,
): boolean {
  return getAvailableKnightMoves(currentSquare, visitedSquares).length === 0;
}

/**
 * Check if a closed tour is possible (can return to starting square)
 */
export function isClosedTourPossible(
  currentSquare: string,
  startingSquare: string,
  visitedSquares: Set<string> | Map<string, number>,
): boolean {
  if (visitedSquares.size !== 64) return false;
  return isValidKnightMove(currentSquare, startingSquare);
}
