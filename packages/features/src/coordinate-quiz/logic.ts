import type { Square } from "@blindfold-chess/types";

import {
  squareToFileIndex,
  squareToRankIndex,
  fileRankToSquare,
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
): CoordinateQuestion {
  // Get available squares (excluding recent ones)
  const availableSquares = allSquares.filter(
    (sq) => !excludeSquares.includes(sq),
  );

  // If all squares have been used, reset
  const squaresToChooseFrom =
    availableSquares.length > 0 ? availableSquares : allSquares;

  const randomIndex = Math.floor(Math.random() * squaresToChooseFrom.length);
  const targetSquare = squaresToChooseFrom[randomIndex];

  // Determine orientation for this question
  let questionOrientation: "white" | "black";
  if (orientation === "random") {
    questionOrientation = Math.random() < 0.5 ? "white" : "black";
  } else {
    questionOrientation = orientation;
  }

  return {
    targetSquare,
    orientation: questionOrientation,
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
 * Convert square to board coordinates based on orientation
 */
export function squareToCoordinates(
  square: Square,
  orientation: "white" | "black",
): { file: number; rank: number } {
  const file = squareToFileIndex(square);
  const rank = squareToRankIndex(square);

  if (orientation === "white") {
    return { file, rank: 7 - rank }; // Flip rank for white perspective
  } else {
    return { file: 7 - file, rank }; // Flip file for black perspective
  }
}

/**
 * Convert board coordinates to square based on orientation
 */
export function coordinatesToSquare(
  file: number,
  rank: number,
  orientation: "white" | "black",
): Square {
  let actualFile: number;
  let actualRank: number;

  if (orientation === "white") {
    actualFile = file;
    actualRank = 7 - rank; // Flip rank back
  } else {
    actualFile = 7 - file; // Flip file back
    actualRank = rank;
  }

  return fileRankToSquare(actualFile, actualRank) as Square;
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
