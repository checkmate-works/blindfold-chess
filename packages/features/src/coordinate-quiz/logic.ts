import type { Square } from "@blindfold-chess/types";

import {
  type RandomSource,
  fileRankToSquare,
  mirrorSquare,
  resolveOrientation,
  squareToFileIndex,
  squareToRankIndex,
} from "../common";
import { allSquares } from "./squares";
import type { BoardOrientation, CoordinateQuestion } from "./types";

export { formatTime } from "../common";

/**
 * Generate a single coordinate quiz question
 */
export function generateSingleQuestion(
  orientation: BoardOrientation,
  excludeSquares: Square[] = [],
  rng: RandomSource = Math.random,
): CoordinateQuestion {
  // Get available squares (excluding recent ones)
  const availableSquares = allSquares.filter(
    (sq) => !excludeSquares.includes(sq),
  );

  // If all squares have been used, reset
  const squaresToChooseFrom =
    availableSquares.length > 0 ? availableSquares : allSquares;

  const randomIndex = Math.floor(rng() * squaresToChooseFrom.length);
  const targetSquare = squaresToChooseFrom[randomIndex];

  return {
    targetSquare,
    orientation: resolveOrientation(orientation, rng),
  };
}

/**
 * Check if the clicked square is correct
 */
export function checkAnswer(
  clickedSquare: Square,
  targetSquare: Square,
): boolean {
  return clickedSquare === targetSquare;
}

/**
 * Convert square to board coordinates based on orientation.
 *
 * The board is rendered as an 8x8 grid where row 0 is the top row on screen.
 * For white perspective, rank 8 is on top (so screen row = `BOARD_LAST_INDEX - rank`).
 * For black perspective, file h is on the left of the screen (so screen col =
 * `BOARD_LAST_INDEX - file`). The two perspectives flip across different axes,
 * which is why this is not a simple `flipForOrientation` of both indices.
 */
export function squareToCoordinates(
  square: Square,
  orientation: "white" | "black",
): { file: number; rank: number } {
  // For each orientation, mirror across the axis that turns chess coordinates
  // into screen coordinates: white flips rank, black flips file.
  const screenAxis = orientation === "white" ? "rank" : "file";
  const mirrored = mirrorSquare(square, screenAxis);
  return {
    file: squareToFileIndex(mirrored),
    rank: squareToRankIndex(mirrored),
  };
}

/**
 * Convert board coordinates to square based on orientation.
 * Inverse of {@link squareToCoordinates}; reflection is its own inverse,
 * so the same axis is used.
 */
export function coordinatesToSquare(
  file: number,
  rank: number,
  orientation: "white" | "black",
): Square {
  const screenSquare = fileRankToSquare(file, rank);
  const screenAxis = orientation === "white" ? "rank" : "file";
  return mirrorSquare(screenSquare, screenAxis);
}

/**
 * Calculate score based on correct answers and time taken
 */
export function calculateScore(
  correct: number,
  total: number,
  timeTaken: number,
  timeLimit: number,
): { points: number; accuracy: number; averageTime: number } {
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const averageTime = correct > 0 ? timeTaken / correct : 0;

  // Base points for correct answers
  let points = correct * 100;

  // Bonus points for speed (if within time limit)
  if (timeTaken < timeLimit && correct > 0) {
    const timeBonus = Math.floor(
      ((timeLimit - timeTaken) / timeLimit) * 50 * correct,
    );
    points += timeBonus;
  }

  // Accuracy bonus
  if (accuracy >= 90) {
    points = Math.floor(points * 1.2);
  } else if (accuracy >= 80) {
    points = Math.floor(points * 1.1);
  }

  return {
    points,
    accuracy,
    averageTime,
  };
}
