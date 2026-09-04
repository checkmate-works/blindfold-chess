import type { Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  generateRandomSquare,
  resolveOrientation,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { BOARD_SIZE } from "../common/constants";
import type {
  BoardOrientation,
  QuadrantId,
  QuadrantQuestion,
  VisualQuadrant,
} from "./types";

const QUADRANT_ID_BY_VISUAL_QUADRANT: Record<VisualQuadrant, QuadrantId> = {
  "top-left": "q2",
  "top-right": "q1",
  "bottom-left": "q3",
  "bottom-right": "q4",
};

/** Classify zero-based board indices whose origin is the visual top-left. */
export function getVisualQuadrant(
  fileIndex: number,
  rankIndex: number,
): VisualQuadrant {
  const halfBoard = BOARD_SIZE / 2;
  const vertical = rankIndex < halfBoard ? "top" : "bottom";
  const horizontal = fileIndex < halfBoard ? "left" : "right";
  return `${vertical}-${horizontal}`;
}

export function visualQuadrantToId(quadrant: VisualQuadrant): QuadrantId {
  return QUADRANT_ID_BY_VISUAL_QUADRANT[quadrant];
}

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
export function getCorrectQuadrant(square: Square): QuadrantId {
  const fileIndex = squareToFileIndex(square);
  const topOriginRankIndex = BOARD_SIZE - 1 - squareToRankIndex(square);
  return visualQuadrantToId(getVisualQuadrant(fileIndex, topOriginRankIndex));
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
  square: Square,
  selectedQuadrant: QuadrantId,
): boolean {
  return getCorrectQuadrant(square) === selectedQuadrant;
}
