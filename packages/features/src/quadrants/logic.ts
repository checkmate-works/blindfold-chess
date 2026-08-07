import {
  type RandomSource,
  generateRandomSquare,
  resolveOrientation,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_SIZE } from "../common/constants";
import type { BoardOrientation, QuadrantId, QuadrantQuestion } from "./types";

/**
 * Determine which quadrant a square belongs to (from white's perspective).
 *
 * Quadrant layout (white orientation):
 *   q2 (Queen-side / Opponent) | q1 (King-side / Opponent)
 *   q3 (Queen-side / You)      | q4 (King-side / You)
 *
 * Files a-d = Queen-side, Files e-h = King-side
 * Ranks 1-4 = Your side, Ranks 5-8 = Opponent side
 */
export function getCorrectQuadrant(square: string): QuadrantId {
  // BOARD_SIZE / 2 partitions the 8 files into two 4-file halves
  // (a-d = queen-side, e-h = king-side) and the 8 ranks into two 4-rank halves.
  const halfBoard = BOARD_SIZE / 2;
  const isKingSide = squareToFileIndex(square) >= halfBoard;
  const isUpper = squareToRankIndex(square) >= halfBoard;

  if (isKingSide && isUpper) return "q1";
  if (!isKingSide && isUpper) return "q2";
  if (!isKingSide && !isUpper) return "q3";
  return "q4";
}

/**
 * Generate a single quadrant question with a random square and resolved orientation.
 *
 * @param rng Random number source for deterministic testing
 */
export function generateQuadrantQuestion(
  orientation: BoardOrientation,
  rng: RandomSource = Math.random,
): QuadrantQuestion {
  return {
    square: generateRandomSquare(rng),
    orientation: resolveOrientation(orientation, rng),
  };
}

/**
 * Generate a batch of quadrant questions.
 *
 * @param rng Random number source for deterministic testing
 */
export function generateQuadrantQuestionBatch(
  size: number,
  orientation: BoardOrientation,
  rng: RandomSource = Math.random,
): QuadrantQuestion[] {
  return Array.from({ length: size }, () =>
    generateQuadrantQuestion(orientation, rng),
  );
}

/**
 * Check if the user's answer is correct.
 */
export function checkQuadrantAnswer(
  square: string,
  selectedQuadrant: QuadrantId,
): boolean {
  return getCorrectQuadrant(square) === selectedQuadrant;
}
