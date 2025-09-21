import { Square } from 'chess.js';

export type BoardOrientation = 'white' | 'black' | 'random';

export interface CoordinateQuestion {
  targetSquare: Square;
  orientation: 'white' | 'black';
}

const allSquares: Square[] = [
  'a8',
  'b8',
  'c8',
  'd8',
  'e8',
  'f8',
  'g8',
  'h8',
  'a7',
  'b7',
  'c7',
  'd7',
  'e7',
  'f7',
  'g7',
  'h7',
  'a6',
  'b6',
  'c6',
  'd6',
  'e6',
  'f6',
  'g6',
  'h6',
  'a5',
  'b5',
  'c5',
  'd5',
  'e5',
  'f5',
  'g5',
  'h5',
  'a4',
  'b4',
  'c4',
  'd4',
  'e4',
  'f4',
  'g4',
  'h4',
  'a3',
  'b3',
  'c3',
  'd3',
  'e3',
  'f3',
  'g3',
  'h3',
  'a2',
  'b2',
  'c2',
  'd2',
  'e2',
  'f2',
  'g2',
  'h2',
  'a1',
  'b1',
  'c1',
  'd1',
  'e1',
  'f1',
  'g1',
  'h1',
];

/**
 * Generate a single coordinate quiz question
 * @param orientation Board orientation preference
 * @param excludeSquares Squares to exclude (recently used)
 * @returns A coordinate question
 */
export function generateSingleQuestion(
  orientation: BoardOrientation,
  excludeSquares: Square[] = []
): CoordinateQuestion {
  // Get available squares (excluding recent ones)
  const availableSquares = allSquares.filter((sq) => !excludeSquares.includes(sq));

  // If all squares have been used, reset
  const squaresToChooseFrom = availableSquares.length > 0 ? availableSquares : allSquares;

  const randomIndex = Math.floor(Math.random() * squaresToChooseFrom.length);
  const targetSquare = squaresToChooseFrom[randomIndex];

  // Determine orientation for this question
  let questionOrientation: 'white' | 'black';
  if (orientation === 'random') {
    questionOrientation = Math.random() < 0.5 ? 'white' : 'black';
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
 * @param clickedSquare The square that was clicked
 * @param targetSquare The correct square
 * @returns Whether the answer is correct
 */
export function checkAnswer(clickedSquare: Square, targetSquare: Square): boolean {
  return clickedSquare === targetSquare;
}

/**
 * Convert square to board coordinates based on orientation
 * @param square The square in algebraic notation
 * @param orientation Board orientation
 * @returns Object with file (0-7) and rank (0-7) from perspective
 */
export function squareToCoordinates(
  square: Square,
  orientation: 'white' | 'black'
): { file: number; rank: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
  const rank = parseInt(square[1]) - 1; // 0-7

  if (orientation === 'white') {
    return { file, rank: 7 - rank }; // Flip rank for white perspective
  } else {
    return { file: 7 - file, rank }; // Flip file for black perspective
  }
}

/**
 * Convert board coordinates to square based on orientation
 * @param file File index (0-7) from perspective
 * @param rank Rank index (0-7) from perspective
 * @param orientation Board orientation
 * @returns Square in algebraic notation
 */
export function coordinatesToSquare(
  file: number,
  rank: number,
  orientation: 'white' | 'black'
): Square {
  let actualFile: number;
  let actualRank: number;

  if (orientation === 'white') {
    actualFile = file;
    actualRank = 7 - rank; // Flip rank back
  } else {
    actualFile = 7 - file; // Flip file back
    actualRank = rank;
  }

  const fileChar = String.fromCharCode('a'.charCodeAt(0) + actualFile);
  const rankChar = (actualRank + 1).toString();

  return `${fileChar}${rankChar}` as Square;
}

/**
 * Format time in seconds to MM:SS
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate score based on correct answers and time taken
 * @param correct Number of correct answers
 * @param total Total number of questions
 * @param timeTaken Time taken in seconds
 * @param timeLimit Time limit in seconds
 * @returns Score object with points and accuracy
 */
export function calculateScore(
  correct: number,
  total: number,
  timeTaken: number,
  timeLimit: number
): { points: number; accuracy: number; averageTime: number } {
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const averageTime = correct > 0 ? timeTaken / correct : 0;

  // Base points for correct answers
  let points = correct * 100;

  // Bonus points for speed (if within time limit)
  if (timeTaken < timeLimit && correct > 0) {
    const timeBonus = Math.floor(((timeLimit - timeTaken) / timeLimit) * 50 * correct);
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
