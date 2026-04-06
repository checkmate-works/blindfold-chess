import { generateRandomSquare } from "../common";
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
  const file = square[0];
  const rank = parseInt(square[1]);
  const isKingSide = ["e", "f", "g", "h"].includes(file);
  const isUpper = rank >= 5;

  if (isKingSide && isUpper) return "q1";
  if (!isKingSide && isUpper) return "q2";
  if (!isKingSide && !isUpper) return "q3";
  return "q4";
}

/**
 * Resolve the effective board orientation for a single problem.
 * If "random", randomly picks "white" or "black".
 */
function resolveOrientation(orientation: BoardOrientation): "white" | "black" {
  if (orientation === "random") {
    return Math.random() < 0.5 ? "white" : "black";
  }
  return orientation;
}

/**
 * Generate a single quadrant question with a random square and resolved orientation.
 */
export function generateQuadrantQuestion(
  orientation: BoardOrientation,
): QuadrantQuestion {
  return {
    square: generateRandomSquare(),
    orientation: resolveOrientation(orientation),
  };
}

/**
 * Generate a batch of quadrant questions.
 */
export function generateQuadrantQuestionBatch(
  size: number,
  orientation: BoardOrientation,
): QuadrantQuestion[] {
  return Array.from({ length: size }, () =>
    generateQuadrantQuestion(orientation),
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
